import asyncio
from datetime import datetime
from app.database import db

async def seed_lawyers():
    lawyers = [
        {
            "fullName": "Mahmoud Adel",
            "email": "mahmoud@lexaguide.com",
            "passwordHash": "$2b$10$dummyHash",
            "specialties": ["family", "civil"],
            "governorate": "Cairo",
            "city": "Maadi",
            "pricePerSession": 350,
            "ratingAvg": 4.7,
            "ratingCount": 85,
            "successRate": 90,
            "isAvailable": True,
            "isVerified": True,
            "isActive": True,
            "createdAt": datetime.utcnow()
        },
        {
            "fullName": "Hany Tarek",
            "email": "hany@lexaguide.com",
            "passwordHash": "$2b$10$dummyHash",
            "specialties": ["criminal", "corporate"],
            "governorate": "Alexandria",
            "city": "Smouha",
            "pricePerSession": 500,
            "ratingAvg": 4.9,
            "ratingCount": 120,
            "successRate": 95,
            "isAvailable": True,
            "isVerified": True,
            "isActive": True,
            "createdAt": datetime.utcnow()
        },
        {
            "fullName": "Sarah Ahmed",
            "email": "sarah@lexaguide.com",
            "passwordHash": "$2b$10$dummyHash",
            "specialties": ["family", "labor"],
            "governorate": "Giza",
            "city": "6th of October",
            "pricePerSession": 400,
            "ratingAvg": 4.8,
            "ratingCount": 65,
            "successRate": 92,
            "isAvailable": True,
            "isVerified": True,
            "isActive": True,
            "createdAt": datetime.utcnow()
        }
    ]

    for lawyer in lawyers:
        await db.lawyers.update_one(
            {"email": lawyer["email"]},
            {"$set": lawyer},
            upsert=True
        )

    print("Seed lawyers upserted successfully")

if __name__ == "__main__":
    asyncio.run(seed_lawyers())
