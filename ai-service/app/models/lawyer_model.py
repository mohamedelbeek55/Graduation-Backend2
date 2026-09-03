from pydantic import BaseModel
from datetime import datetime


class Lawyer(BaseModel):

    full_name: str
    specialization: str
    city: str
    years_experience: int

    consultation_type: str

    price: float

    avg_rating: float
    reviews_count: int
    success_rate: float

    is_available: bool
    is_verified: bool

    created_at: datetime = datetime.utcnow()