from app.database import db


def calculate_score(lawyer, budget):
    rating_score = lawyer.get("ratingAvg", 0) / 5
    reviews_score = min(lawyer.get("ratingCount", 0) / 100, 1)
    success_score = lawyer.get("successRate", 0) / 100

    price = lawyer.get("pricePerSession", 0)
    if price <= budget:
        price_score = 1
    else:
        diff = price - budget
        price_score = max(0, 1 - (diff / budget))

    verified_score = 1 if lawyer.get("isVerified") else 0

    score = (
        0.35 * rating_score
        + 0.20 * reviews_score
        + 0.20 * success_score
        + 0.15 * price_score
        + 0.10 * verified_score
    )
    return score


async def recommend_lawyers(request):
    # Node.js: communicationMethods: "chat", "video_call", "both"
    # request: consultation_type: "chat", "video", "both"
    # We should match them. If user wants "video", they can accept "video_call" or "both".
    
    query = {
        "specialties": request.case_type,
        "isAvailable": True,
        "isActive": True,
        "isVerified": True
    }

    if request.city:
        query["governorate"] = request.city # In the app, city usually refers to governorate

    lawyers_cursor = db.lawyers.find(query)
    lawyers = await lawyers_cursor.to_list(length=100)

    scored = []

    for lawyer in lawyers:

        score = calculate_score(lawyer, request.budget)

        scored.append((lawyer, score))

    ranked = sorted(scored, key=lambda x: x[1], reverse=True)

    return ranked[:10]