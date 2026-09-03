from fastapi import APIRouter
from app.schemas.recommendation import RecommendationRequest
from app.schemas.lawyer import LawyerResponse
from app.services.recommendation_service import recommend_lawyers

router = APIRouter()


@router.post("/recommend-lawyers", response_model=list[LawyerResponse])
async def recommend(request: RecommendationRequest):

    results = await recommend_lawyers(request)

    response = []

    for lawyer, score in results:
        response.append(
            LawyerResponse(
                id=str(lawyer["_id"]),
                fullName=lawyer.get("fullName", ""),
                specialties=lawyer.get("specialties", []),
                governorate=lawyer.get("governorate", ""),
                city=lawyer.get("city", ""),
                pricePerSession=lawyer.get("pricePerSession", 0),
                ratingAvg=lawyer.get("ratingAvg", 0),
                ratingCount=lawyer.get("ratingCount", 0),
                successRate=lawyer.get("successRate", 0),
                isVerified=lawyer.get("isVerified", False),
                isAvailable=lawyer.get("isAvailable", True),
                score=round(score, 4)
            )
        )

    return response