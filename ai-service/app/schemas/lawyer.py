from pydantic import BaseModel
from typing import List, Optional


class LawyerResponse(BaseModel):
    id: str
    fullName: str
    specialties: List[str]
    governorate: str
    city: Optional[str] = ""
    pricePerSession: float
    ratingAvg: float
    ratingCount: int
    successRate: float
    isVerified: bool
    isAvailable: bool
    score: float