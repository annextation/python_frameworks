from django.db import models
from django.utils import timezone


class Movie(models.Model):
    id = models.CharField(primary_key=True, max_length=64)
    title = models.CharField(max_length=255)
    poster = models.TextField()
    backdrop = models.TextField()
    overview = models.TextField()
    rating = models.FloatField()
    genres = models.JSONField(default=list)
    ageRating = models.CharField(max_length=16)
    duration = models.PositiveIntegerField()
    releaseDate = models.CharField(max_length=32)
    created = models.CharField(max_length=64)
    director = models.CharField(max_length=255, blank=True)
    cast = models.JSONField(default=list)


class Cinema(models.Model):
    id = models.CharField(primary_key=True, max_length=64)
    name = models.CharField(max_length=255)
    address = models.TextField()
    phone = models.CharField(max_length=64)
    metro = models.CharField(max_length=255)
    workingHours = models.CharField(max_length=128)


class Hall(models.Model):
    id = models.CharField(primary_key=True, max_length=64)
    name = models.CharField(max_length=255)
    cinema = models.ForeignKey(Cinema, on_delete=models.PROTECT)
    rows = models.PositiveIntegerField(default=8)
    seatsPerRow = models.PositiveIntegerField(default=12)
    vipRows = models.JSONField(default=list)


class Session(models.Model):
    id = models.CharField(primary_key=True, max_length=64)
    movie = models.ForeignKey(Movie, on_delete=models.PROTECT)
    hall = models.ForeignKey(Hall, on_delete=models.PROTECT)
    date = models.CharField(max_length=32)
    time = models.CharField(max_length=16)
    format = models.CharField(max_length=32)
    price = models.DecimalField(max_digits=12, decimal_places=2)


class Booking(models.Model):
    id = models.CharField(primary_key=True, max_length=32)
    session = models.ForeignKey(Session, on_delete=models.PROTECT)
    customer_name = models.CharField(max_length=255)
    customer_email = models.EmailField()
    customer_phone = models.CharField(max_length=64, blank=True)
    total_price = models.DecimalField(max_digits=12, decimal_places=2)
    purchase_date = models.DateTimeField(default=timezone.now)


class BookedSeat(models.Model):
    booking = models.ForeignKey(Booking, on_delete=models.CASCADE, related_name='seats')
    session = models.ForeignKey(Session, on_delete=models.PROTECT)
    row_number = models.PositiveIntegerField()
    seat_number = models.PositiveIntegerField()

    class Meta:
        ordering = ['row_number', 'seat_number']
        constraints = [models.UniqueConstraint(
            fields=['session', 'row_number', 'seat_number'], name='unique_session_seat',
        )]
