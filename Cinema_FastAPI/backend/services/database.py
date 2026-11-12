from contextlib import contextmanager
from pathlib import Path

from sqlalchemy import create_engine, event
from sqlalchemy.orm import sessionmaker

from .models import Base, Booking, BookedSeat

DATABASE = Path(__file__).resolve().parents[1] / "data" / "cinema.db"
engine = create_engine(
    "sqlite:///" + DATABASE.as_posix(),
    connect_args={"check_same_thread": False},
)


@event.listens_for(engine, "connect")
def enable_foreign_keys(connection, _):
    cursor = connection.cursor()
    cursor.execute("PRAGMA foreign_keys = ON")
    cursor.close()



Base.metadata.create_all(engine, tables=[Booking.__table__, BookedSeat.__table__])
SessionLocal = sessionmaker(bind=engine)


@contextmanager
def write_session():
    with SessionLocal() as db:
        try:
            db.connection().exec_driver_sql("BEGIN IMMEDIATE")
            yield db
            db.commit()
        except Exception:
            db.rollback()
            raise
