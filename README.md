# LexaGuide API

## Overview

LexaGuide is a legal assistance platform (Web + Mobile) designed for Egypt.

It provides:

- Legal contract & complaint templates
- Document generation engine
- Government procedures database
- Legal chatbot
- Lawyer consultations
- User profiles
- Admin dashboard

---

## Base URLs

Local:
http://localhost:3000

Production:
https://<your-vercel-backend>.vercel.app

All API routes are under:
BASE_URL/api/*

---

## Health Check

GET /health

Response:
{
  "ok": true,
  "service": "LexaGuide API"
}

---

# Authentication

## Register
POST /api/auth/register

Body:
{
  "fullName": "Ahmed Ali",
  "email": "ahmed@email.com",
  "password": "123456"
}

Response:
{
  "user": {
    "id": "...",
    "fullName": "Ahmed Ali",
    "email": "ahmed@email.com",
    "role": "user"
  },
  "accessToken": "...",
  "refreshToken": "..."
}

---

## Login
POST /api/auth/login

Body:
{
  "email": "ahmed@email.com",
  "password": "123456"
}

---

## Me (Protected)
GET /api/auth/me

Header:
Authorization: Bearer <accessToken>

---

## Refresh Token
POST /api/auth/refresh

---

## Logout
POST /api/auth/logout

---

## Change Password
POST /api/auth/change-password

Body:
{
  "oldPassword": "123456",
  "newPassword": "654321"
}

---

# Profile (Protected)

## Get Profile
GET /api/profile

## Update Profile
PATCH /api/profile

Body:
{
  "fullName": "New Name",
  "phone": "0100000000",
  "bio": "Short bio"
}

## Upload Avatar
POST /api/profile/avatar
Content-Type: multipart/form-data
Key: avatar

---

# Procedures

## List Procedures
GET /api/procedures

## Procedure Details
GET /api/procedures/:id

---

# Templates

## Complaints

### List
GET /api/templates/complaints?page=1&limit=20&q=...

### Details
GET /api/templates/complaints/:id

---

## Contracts

### List
GET /api/templates/contracts?page=1&limit=20&q=...

### Details
GET /api/templates/contracts/:id

---

# Generated Documents (Protected)

## Create Generated
POST /api/generated

Body:
{
  "templateKind": "contract",
  "templateId": "...",
  "userInputs": {
    "party1": "Ahmed"
  }
}

Response:
{
  "document": { ... },
  "missingFields": ["party2"]
}

---

## My History
GET /api/generated/my?page=1&limit=20

## Get One
GET /api/generated/:id

## Finalize
PATCH /api/generated/:id/finalize

---

# Chatbot (Protected)

POST /api/chatbot/sessions
GET /api/chatbot/sessions
GET /api/chatbot/sessions/:id
POST /api/chatbot/sessions/:id/messages

---

# Consultations

POST /api/consultations
GET /api/consultations/my

---

# Admin (Admin Role Required)

## Stats
GET /api/admin/stats

Response:
{
  "stats": {
    "users": 120,
    "lawyers": 5,
    "procedures": 24,
    "docs": 40,
    "consultations": 18
  }
}

---

## Users Management
GET /api/admin/users?page=1&limit=20&q=...
PATCH /api/admin/users/:id/toggle-active

---

## Admin Consultations
GET /api/admin/consultations?page=1&limit=20

---

# Import Templates (CSV)

Place files inside:

Data/complaints/
Data/contracts/

Then run:

node scripts/import-templates-complaints.js
node scripts/import-templates-contracts.js

---

# Environment Variables

Required:

MONGODB_URI
JWT_ACCESS_SECRET
JWT_REFRESH_SECRET
CLOUDINARY_CLOUD_NAME
CLOUDINARY_API_KEY
CLOUDINARY_API_SECRET
FRONTEND_ORIGINS
APP_ENV=production

---

# Tech Stack

- Node.js + Express (ES Modules)
- MongoDB + Mongoose
- JWT Access + Refresh Tokens (Rotation)
- Cloudinary file storage
- Role-based authorization
- Pagination + Search support
- Deployed on Vercel

---

# Roles

- user
- lawyer
- admin

---

# Project Status

Auth ✔
Profile ✔
Procedures ✔
Templates ✔
Generated Engine ✔
Docs Upload ✔
Chatbot API ✔
Admin API ✔

---

# Next Steps

- Frontend integration
- Flutter mobile app
- AI integration
- Payments & video consultations