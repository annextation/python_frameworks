import json
from decimal import Decimal, ROUND_HALF_UP
from uuid import uuid4

from django.db import IntegrityError, transaction
from django.db.models import F
from django.utils import timezone

from booking.models import Movie, Session, Booking, BookedSeat


MOVIE_FIELDS = ("id", "title", "poster", "backdrop", "overview", "rating",
                "genres", "ageRating", "duration", "releaseDate")


def movie_payload(movie, detailed=False):
    fields = MOVIE_FIELDS + (("director", "cast") if detailed else ())
    return {field: getattr(movie, field) for field in fields}


def session_payload(session):
    return {"id": session.id, "movieId": session.movie_id, "hallId": session.hall_id,
            "date": session.date, "time": session.time, "format": session.format,
            "price": float(session.price)}


def cinema_payload(cinema):
    return {field: getattr(cinema, field) for field in
            ("id", "name", "address", "phone", "metro", "workingHours")}


def health():
    return {"status": "ok"}


def get_movies():
    movies = Movie.objects.order_by("-created", "id")
    return [movie_payload(movie) for movie in movies]


def get_movie(movie_id):
    try:
        movie = Movie.objects.get(pk=movie_id)
    except Movie.DoesNotExist:
        return {"error": "Фильм не найден"}, 404
    sessions = Session.objects.filter(movie=movie).select_related("hall__cinema").order_by("date", "time", "id")
    return {"movie": movie_payload(movie, detailed=True), "sessions": [
        {**session_payload(session), "cinema": cinema_payload(session.hall.cinema)}
        for session in sessions
    ]}


def get_booking_details(movie_id, session_id):
    try:
        session = Session.objects.select_related("movie", "hall__cinema").get(
            pk=session_id, movie_id=movie_id)
    except Session.DoesNotExist:
        return {"error": "Сеанс этого фильма не найден"}, 404
    hall = session.hall
    cinema = hall.cinema
    return {
        "movie": {"id": session.movie_id, "title": session.movie.title, "poster": session.movie.poster},
        "session": session_payload(session),
        "hall": {"id": hall.id, "name": hall.name, "cinemaId": hall.cinema_id,
                 "rows": hall.rows, "seatsPerRow": hall.seatsPerRow, "vipRows": hall.vipRows},
        "cinema": {field: getattr(cinema, field) for field in ("id", "name", "address", "metro")},
    }


class SessionNotFound(Exception):
    pass


def get_occupied_seats(session_id):
    return list(BookedSeat.objects.filter(session_id=session_id).values(
        row=F("row_number"), seat=F("seat_number")))


def seat_positions(seats, session):
    if not isinstance(seats, list) or not seats:
        raise ValueError("Выбери хотя бы одно место")
    positions = []
    for seat in seats:
        if not isinstance(seat, dict):
            raise ValueError("Некорректное место")
        row, number = seat.get("row"), seat.get("seat")
        if (type(row) is not int or type(number) is not int
                or not 1 <= row <= (session.hall.rows or 8)
                or not 1 <= number <= (session.hall.seatsPerRow or 12)):
            raise ValueError("Место находится за пределами зала")
        positions.append((row, number))
    if len(set(positions)) != len(positions):
        raise ValueError("Одно место выбрано дважды")
    return positions


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

    purchased = timezone.now()
    ids = []
    try:
        with transaction.atomic():
            for item in items:
                if not isinstance(item, dict) or not isinstance(item.get("sessionId"), str):
                    raise ValueError("Некорректный сеанс")
                session = Session.objects.select_related("hall").filter(pk=item["sessionId"]).first()
                if session is None:
                    raise SessionNotFound
                positions = seat_positions(item.get("seats"), session)
                vip_rows = set(session.hall.vipRows or [])
                total = session.price * len(positions)
                total += 200 * sum(row in vip_rows for row, _ in positions)
                total *= Decimal(100 - discounts[promo]) / 100
                total = total.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
                booking_id = uuid4().hex
                booking = Booking.objects.create(
                    id=booking_id, session=session, customer_name=name.strip(),
                    customer_email=email.strip(), customer_phone=data.get("customerPhone") or "",
                    total_price=total, purchase_date=purchased,
                )
                BookedSeat.objects.bulk_create([
                    BookedSeat(booking=booking, session=session, row_number=row, seat_number=seat)
                    for row, seat in positions
                ])
                ids.append(booking_id)
    except SessionNotFound:
        return {"error": "Сеанс не найден"}, 404
    except ValueError as error:
        return {"error": str(error)}, 400
    except IntegrityError as error:
        if "booking_bookedseat.session_id" not in str(error):
            raise
        return {"error": "Одно из выбранных мест уже занято"}, 409
    return {"ids": ids}, 201


def list_bookings():
    bookings = Booking.objects.select_related("session__movie", "session__hall").prefetch_related("seats").order_by("-purchase_date", "id")
    return [{
        "id": booking.id, "movieTitle": booking.session.movie.title,
        "sessionDate": booking.session.date, "sessionTime": booking.session.time,
        "sessionFormat": booking.session.format, "hallName": booking.session.hall.name,
        "totalPrice": float(booking.total_price), "customerName": booking.customer_name,
        "customerEmail": booking.customer_email, "purchaseDate": booking.purchase_date.isoformat(),
        # Keep the existing frontend contract: seats is a JSON string.
        "seats": json.dumps([{"row": s.row_number, "seat": s.seat_number} for s in booking.seats.all()]),
    } for booking in bookings]


def delete_booking(booking_id):
    with transaction.atomic():
        deleted, _ = Booking.objects.filter(pk=booking_id).delete()
        if not deleted:
            return {"error": "Билет не найден"}, 404
    return "", 204
