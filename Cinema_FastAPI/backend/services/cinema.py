import json
import sqlite3
from contextlib import closing
from pathlib import Path
from datetime import datetime, timezone
from decimal import Decimal, ROUND_HALF_UP
from uuid import uuid4

DATABASE = Path(__file__).resolve().parents[1] / "data" / "cinema.db"


def open_database():
    connection = sqlite3.connect(DATABASE)
    connection.row_factory = sqlite3.Row
    connection.execute("PRAGMA foreign_keys = ON")
    return connection


SESSION_COLUMNS = ("id", "movieId", "hallId", "date", "time", "format", "price")


def movie_payload(row):
    movie = dict(row)
    movie["genres"] = json.loads(movie["genres"])
    if "cast" in movie:
        movie["cast"] = json.loads(movie["cast"])
    return movie


def health():
    return {"status": "ok"}


def get_movies():
    with closing(open_database()) as connection:
        rows = connection.execute("""
            SELECT id, title, poster, backdrop, overview, rating,
                   genres, ageRating, duration, releaseDate
            FROM movies
            ORDER BY created DESC, id
        """).fetchall()
    return [movie_payload(row) for row in rows]


def get_movie(movie_id):
    with closing(open_database()) as connection:
        row = connection.execute("""
            SELECT id, title, poster, backdrop, overview, rating,
                   genres, ageRating, duration, releaseDate, director, "cast"
            FROM movies
            WHERE id = ?
        """, (movie_id,)).fetchone()
        if row is None:
            return {"error": "Фильм не найден"}, 404

        sessions = connection.execute("""
            SELECT s.id, s.movieId, s.hallId, s.date, s.time, s.format, s.price,
                   c.id AS cinema_id, c.name AS cinema_name,
                   c.address, c.phone, c.metro, c.workingHours
            FROM sessions AS s
            JOIN halls AS h ON h.id = s.hallId
            JOIN cinemas AS c ON c.id = h.cinemaId
            WHERE s.movieId = ?
            ORDER BY s.date, s.time, s.id
        """, (movie_id,)).fetchall()

    return {
        "movie": movie_payload(row),
        "sessions": [
            {
                **{field: session[field] for field in SESSION_COLUMNS},
                "cinema": {
                    "id": session["cinema_id"], "name": session["cinema_name"],
                    "address": session["address"], "phone": session["phone"],
                    "metro": session["metro"], "workingHours": session["workingHours"],
                },
            }
            for session in sessions
        ],
    }


def get_booking_details(movie_id, session_id):
    with closing(open_database()) as connection:
        row = connection.execute("""
            SELECT m.title, m.poster,
                   s.id, s.movieId, s.hallId, s.date, s.time, s.format, s.price,
                   h.name AS hall_name, h.rows, h.seatsPerRow, h.vipRows,
                   c.id AS cinema_id, c.name AS cinema_name, c.address, c.metro
            FROM sessions AS s
            JOIN movies AS m ON m.id = s.movieId
            JOIN halls AS h ON h.id = s.hallId
            JOIN cinemas AS c ON c.id = h.cinemaId
            WHERE s.id = ? AND s.movieId = ?
        """, (session_id, movie_id)).fetchone()

    if row is None:
        return {"error": "Сеанс этого фильма не найден"}, 404

    return {
        "movie": {"id": row["movieId"], "title": row["title"], "poster": row["poster"]},
        "session": {field: row[field] for field in SESSION_COLUMNS},
        "hall": {
            "id": row["hallId"], "name": row["hall_name"], "cinemaId": row["cinema_id"],
            "rows": row["rows"], "seatsPerRow": row["seatsPerRow"],
            "vipRows": json.loads(row["vipRows"] or "[]"),
        },
        "cinema": {
            "id": row["cinema_id"], "name": row["cinema_name"],
            "address": row["address"], "metro": row["metro"],
        },
    }


def ensure_booking_tables(db):
    db.execute("""
        CREATE TABLE IF NOT EXISTS bookings (
            id TEXT PRIMARY KEY NOT NULL,
            session_id TEXT NOT NULL REFERENCES sessions(id),
            customer_name TEXT NOT NULL,
            customer_email TEXT NOT NULL,
            customer_phone TEXT NOT NULL,
            total_price REAL NOT NULL,
            purchase_date TEXT NOT NULL,
            UNIQUE (id, session_id)
        )
    """)
    db.execute("""
        CREATE TABLE IF NOT EXISTS booked_seats (
            booking_id TEXT NOT NULL,
            session_id TEXT NOT NULL,
            row_number INTEGER NOT NULL,
            seat_number INTEGER NOT NULL,
            PRIMARY KEY (session_id, row_number, seat_number),
            FOREIGN KEY (booking_id, session_id)
                REFERENCES bookings(id, session_id) ON DELETE CASCADE
        )
    """)


class SessionNotFound(Exception):
    pass


def booking_session(db, session_id):
    return db.execute("""
        SELECT s.id, s.price, h.rows, h.seatsPerRow, h.vipRows
        FROM sessions s JOIN halls h ON h.id = s.hallId
        WHERE s.id = ?
    """, (session_id,)).fetchone()


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
    db.execute("INSERT INTO bookings VALUES (?, ?, ?, ?, ?, ?, ?)",
               (booking_id, session_id, name, email, phone, total, purchased))
    db.executemany("INSERT INTO booked_seats VALUES (?, ?, ?, ?)",
                   [(booking_id, session_id, row, seat) for row, seat in positions])


def get_occupied_seats(session_id):
    with closing(open_database()) as db:
        ensure_booking_tables(db)
        rows = db.execute("""
            SELECT row_number AS row, seat_number AS seat
            FROM booked_seats WHERE session_id = ?
        """, (session_id,)).fetchall()
    return [dict(row) for row in rows]


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
        with closing(open_database()) as db, db:
            db.execute("BEGIN IMMEDIATE")
            ensure_booking_tables(db)
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
    except sqlite3.IntegrityError as error:
        if "booked_seats.session_id" not in str(error):
            raise
        return {"error": "Одно из выбранных мест уже занято"}, 409
    return {"ids": ids}, 201


def list_bookings():
    with closing(open_database()) as db:
        ensure_booking_tables(db)
        rows = db.execute("""
            SELECT b.id, m.title AS movieTitle, s.date AS sessionDate,
                   s.time AS sessionTime, s.format AS sessionFormat,
                   h.name AS hallName, b.total_price AS totalPrice,
                   b.customer_name AS customerName, b.customer_email AS customerEmail,
                   b.purchase_date AS purchaseDate
            FROM bookings b JOIN sessions s ON s.id = b.session_id
            JOIN halls h ON h.id = s.hallId JOIN movies m ON m.id = s.movieId
            ORDER BY b.purchase_date DESC, b.id
        """).fetchall()
        result = []
        for row in rows:
            booking = dict(row)
            seats = db.execute("""
                SELECT row_number AS row, seat_number AS seat FROM booked_seats
                WHERE booking_id = ? ORDER BY row_number, seat_number
            """, (row["id"],)).fetchall()
            booking["seats"] = json.dumps([dict(seat) for seat in seats])
            result.append(booking)
    return result


def delete_booking(booking_id):
    with closing(open_database()) as db, db:
        ensure_booking_tables(db)
        deleted = db.execute("DELETE FROM bookings WHERE id = ?", (booking_id,))
        if not deleted.rowcount:
            return {"error": "Билет не найден"}, 404
    return "", 204
