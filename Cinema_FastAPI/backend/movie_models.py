from datetime import date

from pydantic import BaseModel, ConfigDict, Field


class MovieCreate(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)

    title: str = Field(min_length=1, max_length=200)
    overview: str = Field(min_length=1, max_length=4000)
    duration: int = Field(gt=0, le=600)
    releaseDate: date
    rating: float = Field(default=0, ge=0, le=10)
    ageRating: str = Field(default="0+", max_length=10)
    genres: list[str] = Field(default_factory=list, max_length=15)
    poster: str = Field(default="", max_length=1000)
