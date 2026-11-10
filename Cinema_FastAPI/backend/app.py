from fastapi import FastAPI
from fastapi.responses import JSONResponse, Response
from starlette.concurrency import run_in_threadpool

from booking_models import BookingRequest
from services import cinema

app = FastAPI(title="Cinema Booking")


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
