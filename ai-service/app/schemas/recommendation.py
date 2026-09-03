from pydantic import BaseModel
from typing import Optional


class RecommendationRequest(BaseModel):
    user_id: Optional[str] = None
    case_type: str
    consultation_type: str
    city: str
    budget: float