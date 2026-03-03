# LexaGuide Flutter API Guide

## Base URL
- Local: http://localhost:3000/api
- Production: https://<your-vercel-backend>.vercel.app/api

## Auth Storage (Flutter)
Store these securely (recommended: flutter_secure_storage):
- accessToken
- refreshToken
- user (optional as JSON)

Keys example:
- accessToken
- refreshToken
- userJson

---

# Auth Flow (Recommended)

## 1) Register / Login
- POST /auth/register
- POST /auth/login

Response:
{
  "user": { "id": "...", "fullName": "...", "email": "...", "role": "user|lawyer|admin" },
  "accessToken": "...",
  "refreshToken": "..."
}

✅ Save:
- accessToken
- refreshToken
- user

---

## 2) Access Token Usage
For any protected endpoint, send:
Authorization: Bearer <accessToken>

Example headers:
- Content-Type: application/json
- Authorization: Bearer eyJ...

---

## 3) Auto Refresh (When 401 happens)
If any protected request returns 401:
1) Call POST /auth/refresh
2) Send refreshToken in body (mobile)
3) If refresh success -> update stored tokens
4) Retry the original request once

Refresh request:
POST /auth/refresh
Body:
{ "refreshToken": "<refreshToken>" }

Response:
{ "accessToken": "...", "refreshToken": "..." }

✅ Update stored accessToken + refreshToken

If refresh returns 401/403:
- Logout locally
- Redirect to login

---

## 4) Logout
POST /auth/logout
Body (optional):
{ "refreshToken": "<refreshToken>" }

Then clear tokens locally.

---

# Endpoints List

## Auth
- POST  /auth/register
- POST  /auth/login
- GET   /auth/me                (protected)
- POST  /auth/refresh
- POST  /auth/logout
- POST  /auth/logout-all        (protected)
- POST  /auth/change-password   (protected)
- POST  /auth/forgot-password
- POST  /auth/reset-password

Notes:
- Disabled account:
  - login -> 403 { "message": "Account disabled" }
  - refresh -> 403 { "message": "Account disabled" }

---

## Profile (Protected)
- GET   /profile
- PATCH /profile
- POST  /profile/avatar         (multipart/form-data, key: avatar)

---

## Procedures
- GET /procedures
- GET /procedures/:id

---

## Docs (Protected)
- POST   /docs/upload           (multipart/form-data, key: file)
- GET    /docs/my
- DELETE /docs/:id

---

## Templates
Complaints:
- GET /templates/complaints?page=1&limit=20&q=...
- GET /templates/complaints/:id

Contracts:
- GET /templates/contracts?page=1&limit=20&q=...
- GET /templates/contracts/:id

---

## Generated (Protected)
- POST  /generated
Body:
{
  "templateKind": "complaint|contract",
  "templateId": "...",
  "userInputs": { "key": "value" }
}

Response includes:
- document
- missingFields

History:
- GET   /generated/my?page=1&limit=20
- GET   /generated/:id
- PATCH /generated/:id/finalize

---

## Chatbot (Protected)
- POST /chatbot/sessions
- GET  /chatbot/sessions
- GET  /chatbot/sessions/:id
- POST /chatbot/sessions/:id/messages

---

## Consultations
(Depending on your existing backend routes)
- POST /consultations          (protected)
- GET  /consultations/my       (protected)

---

## Admin (Admin Role Required)
- GET   /admin/stats
- GET   /admin/users?page=1&limit=20&q=...
- PATCH /admin/users/:id/toggle-active
- GET   /admin/consultations?page=1&limit=20

---

# Suggested Flutter Implementation Notes

## Recommended packages
- dio (HTTP client)
- flutter_secure_storage (token storage)

## Dio Interceptor strategy
- Attach accessToken to requests
- On 401: try refresh once
- Retry original request
- On refresh failure: clear storage + go login