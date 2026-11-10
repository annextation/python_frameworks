from pydantic import BaseModel, Field, StrictInt


class Seat(BaseModel):
    row: StrictInt
    seat: StrictInt


class BookingItem(BaseModel):
    sessionId: str
    seats: list[Seat] = Field(min_length=1)


class BookingRequest(BaseModel):
    customerName: str
    customerEmail: str
    customerPhone: str = ""
    promoCode: str = ""
    items: list[BookingItem] = Field(min_length=1)
