from fastapi import FastAPI
from app.routes.recommendation import router as recommendation_router

app = FastAPI(
    title="Egail Lawyer Recommendation API (MongoDB)"
)

app.include_router(recommendation_router)