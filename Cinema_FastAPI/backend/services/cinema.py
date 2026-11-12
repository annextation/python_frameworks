import json
from datetime import datetime, timezone
from decimal import Decimal, ROUND_HALF_UP
from uuid import uuid4

from sqlalchemy import select
from sqlalchemy.exc import IntegrityError

from .database import SessionLocal, write_session
from .models import BookedSeat, Booking, Cinema, Hall, Movie, Screening

SESSION_COLUMNS = ("id", "movieId", "hallId", "date", "time", "format", "price")
MOVIE_COLUMNS = (
    "id", "title", "poster", "backdrop", "overview", "rating",
    "genres", "ageRating", "duration", "releaseDate",
)


def fields(entity, names):
    return {name: getattr(entity, name) for name in names}


def movie_payload(movie, details=False):
    result = fields(movie, MOVIE_COLUMNS)
    result["genres"] = json.loads(movie.genres)
    if details:
        result["director"] = movie.director
        result["cast"] = json.loads(movie.cast)
    return result


def health():
    return {"status": "ok"}


def create_movie(movie):
    movie_id = uuid4().hex
    poster = movie["poster"] or "/movie-placeholder.svg"
    with write_session() as db:
        db.add(Movie(
            id=movie_id, title=movie["title"], poster=poster, backdrop=poster,
            overview=movie["overview"], rating=movie["rating"],
            genres=json.dumps(movie["genres"], ensure_ascii=False),
            ageRating=movie["ageRating"], duration=movie["duration"],
            releaseDate=movie["releaseDate"],
            created=datetime.now(timezone.utc).isoformat(),
        ))
    return movie_id


def delete_movie(movie_id):
    with write_session() as db:
        movie = db.get(Movie, movie_id)
        if movie is None:
            return {"error": "Фильм не найден"}, 404
        booked = db.scalar(
            select(Booking.id).join(Screening, Screening.id == Booking.session_id)
            .where(Screening.movieId == movie_id).limit(1)
        )
        if booked is not None:
            return {"error": "Нельзя удалить фильм с оформленными билетами. Сначала отмените бронирования."}, 409
        for screening in db.scalars(select(Screening).where(Screening.movieId == movie_id)):
            db.delete(screening)
        db.flush()
        db.delete(movie)
    return "", 204


def get_movies():
    with SessionLocal() as db:
        movies = db.scalars(select(Movie).order_by(Movie.created.desc(), Movie.id))
        return [movie_payload(movie) for movie in movies]


def get_movie(movie_id):
    with SessionLocal() as db:
        movie = db.get(Movie, movie_id)
        if movie is None:
            return {"error": "Фильм не найден"}, 404
        sessions = db.execute(
            select(Screening, Cinema)
            .join(Hall, Hall.id == Screening.hallId)
            .join(Cinema, Cinema.id == Hall.cinemaId)
            .where(Screening.movieId == movie_id)
            .order_by(Screening.date, Screening.time, Screening.id)
        )
        return {
            "movie": movie_payload(movie, details=True),
            "sessions": [
                {
                    **fields(screening, SESSION_COLUMNS),
                    "cinema": fields(cinema, ("id", "name", "address", "phone", "metro", "workingHours")),
                }
                for screening, cinema in sessions
            ],
        }


def get_booking_details(movie_id, session_id):
    with SessionLocal() as db:
        row = db.execute(
            select(Screening, Movie, Hall, Cinema)
            .join(Movie, Movie.id == Screening.movieId)
            .join(Hall, Hall.id == Screening.hallId)
            .join(Cinema, Cinema.id == Hall.cinemaId)
            .where(Screening.id == session_id, Screening.movieId == movie_id)
        ).first()
        if row is None:
            return {"error": "Сеанс этого фильма не найден"}, 404
        screening, movie, hall, cinema = row
        return {
            "movie": fields(movie, ("id", "title", "poster")),
            "session": fields(screening, SESSION_COLUMNS),
            "hall": {
                **fields(hall, ("id", "name", "cinemaId", "rows", "seatsPerRow")),
                "vipRows": json.loads(hall.vipRows or "[]"),
            },
            "cinema": fields(cinema, ("id", "name", "address", "metro")),
        }


class SessionNotFound(Exception):
    pass


def booking_session(db, session_id):
    row = db.execute(
        select(Screening, Hall).join(Hall, Hall.id == Screening.hallId)
        .where(Screening.id == session_id)
    ).first()
    if row is None:
        return None
    screening, hall = row
    return {
        "id": screening.id, "price": screening.price,
        **fields(hall, ("rows", "seatsPerRow", "vipRows")),
    }


def seat_positions(seats, session):
    if not isinstance(seats, list) or not seats:
        raise ValueError("Выбери хотя бы одно место")
    positions = []
    for seat in seats:
        if not isinstance(seat, dict):
            raise ValueError("Некорректное место")
        row, number = seat.get("row"), seat.get("seat")
        if (type(row) is not int or type(number) is not int
                or not 1 <= row <= (session["rows"] or 8)
                or not 1 <= number <= (session["seatsPerRow"] or 12)):
            raise ValueError("Место находится за пределами зала")
        positions.append((row, number))
    if len(set(positions)) != len(positions):
        raise ValueError("Одно место выбрано дважды")
    return positions


def insert_booking(db, booking_id, session_id, name, email, phone, total, purchased, positions):
    db.add(Booking(
        id=booking_id, session_id=session_id, customer_name=name,
        customer_email=email, customer_phone=phone,
        total_price=total, purchase_date=purchased,
    ))
    db.flush()
    db.add_all([
        BookedSeat(booking_id=booking_id, session_id=session_id, row_number=row, seat_number=seat)
        for row, seat in positions
    ])
    db.flush()


def get_occupied_seats(session_id):
    with SessionLocal() as db:
        seats = db.scalars(select(BookedSeat).where(BookedSeat.session_id == session_id))
        return [{"row": seat.row_number, "seat": seat.seat_number} for seat in seats]


def create_bookings(data):
    if not isinstance(data, dict):
        return {"error": "Нужен JSON с данными бронирования"}, 400
    name, email, items = data.get("customerName"), data.get("customerEmail"), data.get("items")
    if (not isinstance(name, str) or not name.strip()
            or not isinstance(email, str) or "@" not in email
            or not isinstance(items, list) or not items):
        return {"error": "Укажи имя, email и места"}, 400
    if not isinstance(data.get("customerPhone", ""), str):
        return {"error": "Некорректный телефон"}, 400
    promo = data.get("promoCode", "")
    discounts = {"": 0, "CINEMA10": 10, "WELCOME": 15}
    if not isinstance(promo, str) or promo not in discounts:
        return {"error": "Промокод недействителен"}, 400
    purchased = datetime.now(timezone.utc).isoformat()
    ids = []
    try:
        with write_session() as db:
            for item in items:
                if not isinstance(item, dict) or not isinstance(item.get("sessionId"), str):
                    raise ValueError("Некорректный сеанс")
                session = booking_session(db, item["sessionId"])
                if session is None:
                    raise SessionNotFound
                positions = seat_positions(item.get("seats"), session)
                vip_rows = set(json.loads(session["vipRows"] or "[]"))
                total = Decimal(str(session["price"])) * len(positions)
                total += 200 * sum(row in vip_rows for row, _ in positions)
                total *= Decimal(100 - discounts[promo]) / 100
                total = total.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
                booking_id = uuid4().hex
                insert_booking(db, booking_id, session["id"], name.strip(), email.strip(),
                               data.get("customerPhone") or "", float(total), purchased, positions)
                ids.append(booking_id)
    except SessionNotFound:
        return {"error": "Сеанс не найден"}, 404
    except ValueError as error:
        return {"error": str(error)}, 400
    except IntegrityError as error:
        if "booked_seats.session_id" not in str(error.orig):
            raise
        return {"error": "Одно из выбранных мест уже занято"}, 409
    return {"ids": ids}, 201


def list_bookings():
    with SessionLocal() as db:
        rows = db.execute(
            select(Booking, Screening, Hall, Movie)
            .join(Screening, Screening.id == Booking.session_id)
            .join(Hall, Hall.id == Screening.hallId)
            .join(Movie, Movie.id == Screening.movieId)
            .order_by(Booking.purchase_date.desc(), Booking.id)
        )
        result = []
        for booking, screening, hall, movie in rows:
            seats = db.scalars(
                select(BookedSeat).where(BookedSeat.booking_id == booking.id)
                .order_by(BookedSeat.row_number, BookedSeat.seat_number)
            )
            result.append({
                "id": booking.id, "movieTitle": movie.title,
                "sessionDate": screening.date, "sessionTime": screening.time,
                "sessionFormat": screening.format, "hallName": hall.name,
                "totalPrice": booking.total_price, "customerName": booking.customer_name,
                "customerEmail": booking.customer_email, "purchaseDate": booking.purchase_date,
                "seats": json.dumps([{"row": seat.row_number, "seat": seat.seat_number} for seat in seats]),
            })
        return result


def delete_booking(booking_id):
    with write_session() as db:
        booking = db.get(Booking, booking_id)
        if booking is None:
            return {"error": "Билет не найден"}, 404
        db.delete(booking)
    return "", 204
