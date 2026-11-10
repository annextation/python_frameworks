import json

from django.http import HttpResponse, JsonResponse
from django.urls import path
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods, require_safe

import cinema


def respond(result):
    if isinstance(result, tuple):
        payload, status = result
        return HttpResponse(status=204) if status == 204 else JsonResponse(payload, status=status)
    return JsonResponse(result, safe=isinstance(result, dict))


@require_safe
def health(request):
    return respond(cinema.health())


@require_safe
def movies(request):
    return respond(cinema.get_movies())


@require_safe
def movie(request, movie_id):
    return respond(cinema.get_movie(movie_id))


@require_safe
def session(request, movie_id, session_id):
    return respond(cinema.get_booking_details(movie_id, session_id))


@require_safe
def occupied_seats(request, session_id):
    return respond(cinema.get_occupied_seats(session_id))


@csrf_exempt
@require_http_methods(["GET", "HEAD", "POST"])
def bookings(request):
    if request.method != "POST":
        return respond(cinema.list_bookings())
    try:
        data = json.loads(request.body) if request.content_type == "application/json" else None
    except ValueError:
        data = None
    return respond(cinema.create_bookings(data))


@csrf_exempt
@require_http_methods(["DELETE"])
def delete_booking(request, booking_id):
    return respond(cinema.delete_booking(booking_id))


urlpatterns = [
    path("api/health", health),
    path("api/movies", movies),
    path("api/movies/<str:movie_id>", movie),
    path("api/movies/<str:movie_id>/sessions/<str:session_id>", session),
    path("api/sessions/<str:session_id>/occupied-seats", occupied_seats),
    path("api/bookings", bookings),
    path("api/bookings/<str:booking_id>", delete_booking),
]
