from os import getenv
from pathlib import Path
from secrets import compare_digest

from dotenv import load_dotenv
from fastapi import Depends, FastAPI, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from fastapi.responses import JSONResponse, Response
from starlette.concurrency import run_in_threadpool

from booking_models import BookingRequest
from movie_models import MovieCreate
from services import cinema

load_dotenv(Path(__file__).with_name(".env"))

app = FastAPI(title="Cinema Booking")
admin_bearer = HTTPBearer(auto_error=False)


def require_admin(credentials: HTTPAuthorizationCredentials | None = Depends(admin_bearer)):
    token = getenv("CINEMA_ADMIN_TOKEN")
    if not token: 
        raise HTTPException(status_code=503, detail="Ключ администратора не настроен на сервере.")
    if credentials is None or not compare_digest(credentials.credentials.encode(), token.encode()):
        raise HTTPException(status_code=401, detail="Неверный ключ администратора.",
                            headers={"WWW-Authenticate": "Bearer"})


@app.get("/api/admin/check", dependencies=[Depends(require_admin)])
def check_admin():
    return {"status": "ok"}


@app.post("/api/admin/movies", status_code=201, dependencies=[Depends(require_admin)])
def create_movie(movie: MovieCreate):
    return {"id": cinema.create_movie(movie.model_dump(mode="json"))}


@app.delete("/api/admin/movies/{movie_id}", status_code=204, dependencies=[Depends(require_admin)])
def delete_movie(movie_id: str):
    return respond(cinema.delete_movie(movie_id))


def respond(result):
    if isinstance(result, tuple):
        payload, status = result
        return Response(status_code=status) if status == 204 else JSONResponse(payload, status_code=status)
    return JSONResponse(result)


@app.get("/api/health")
def health():
    return respond(cinema.health())


@app.get("/api/movies")
def movies():
    return respond(cinema.get_movies())


@app.get("/api/movies/{movie_id}")
def movie(movie_id: str):
    return respond(cinema.get_movie(movie_id))


@app.get("/api/movies/{movie_id}/sessions/{session_id}")
def session(movie_id: str, session_id: str):
    return respond(cinema.get_booking_details(movie_id, session_id))


@app.get("/api/sessions/{session_id}/occupied-seats")
def occupied_seats(session_id: str):
    return respond(cinema.get_occupied_seats(session_id))


@app.get("/api/bookings")
def list_bookings():
    return respond(cinema.list_bookings())


@app.post("/api/bookings", status_code=201)
async def create_bookings(booking: BookingRequest):
    return respond(await run_in_threadpool(cinema.create_bookings, booking.model_dump()))

@app.delete("/api/bookings/{booking_id}")
def delete_booking(booking_id: str):
    return respond(cinema.delete_booking(booking_id))
