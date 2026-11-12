from sqlalchemy import Column, Float, ForeignKey, ForeignKeyConstraint, Integer, String, Text, UniqueConstraint
from sqlalchemy.orm import DeclarativeBase


class Base(DeclarativeBase):
    pass


class Movie(Base):
    __tablename__ = "movies"

    id = Column(String, primary_key=True)
    title = Column(Text, nullable=False)
    poster = Column(Text, nullable=False)
    backdrop = Column(Text, nullable=False)
    overview = Column(Text, nullable=False)
    rating = Column(Float, nullable=False)
    genres = Column(Text, nullable=False)
    ageRating = Column(Text, nullable=False)
    duration = Column(Integer, nullable=False)
    releaseDate = Column(Text, nullable=False)
    created = Column(Text, nullable=False)
    director = Column(Text, nullable=False, default="", server_default="")
    cast = Column(Text, nullable=False, default="[]", server_default="[]")


class Cinema(Base):
    __tablename__ = "cinemas"

    id = Column(String, primary_key=True)
    name = Column(Text, nullable=False)
    address = Column(Text, nullable=False)
    phone = Column(Text, nullable=False)
    metro = Column(Text, nullable=False)
    workingHours = Column(Text, nullable=False)


class Hall(Base):
    __tablename__ = "halls"

    id = Column(String, primary_key=True)
    name = Column(Text, nullable=False)
    cinemaId = Column(String, ForeignKey("cinemas.id"), nullable=False)
    rows = Column(Integer)
    seatsPerRow = Column(Integer)
    vipRows = Column(Text)


class Screening(Base):
    __tablename__ = "sessions"

    id = Column(String, primary_key=True)
    movieId = Column(String, ForeignKey("movies.id"), nullable=False)
    hallId = Column(String, ForeignKey("halls.id"), nullable=False)
    date = Column(Text, nullable=False)
    time = Column(Text, nullable=False)
    format = Column(Text, nullable=False)
    price = Column(Float, nullable=False)


class Booking(Base):
    __tablename__ = "bookings"
    __table_args__ = (UniqueConstraint("id", "session_id"),)

    id = Column(String, primary_key=True)
    session_id = Column(String, ForeignKey("sessions.id"), nullable=False)
    customer_name = Column(Text, nullable=False)
    customer_email = Column(Text, nullable=False)
    customer_phone = Column(Text, nullable=False)
    total_price = Column(Float, nullable=False)
    purchase_date = Column(Text, nullable=False)


class BookedSeat(Base):
    __tablename__ = "booked_seats"
    __table_args__ = (
        ForeignKeyConstraint(
            ["booking_id", "session_id"],
            ["bookings.id", "bookings.session_id"],
            ondelete="CASCADE",
        ),
    )

    booking_id = Column(String, nullable=False)
    session_id = Column(String, primary_key=True)
    row_number = Column(Integer, primary_key=True)
    seat_number = Column(Integer, primary_key=True)
