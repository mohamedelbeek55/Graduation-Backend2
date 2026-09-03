# ⚖️ LexaGuide — Backend API

![Node.js](https://img.shields.io/badge/Node.js-18%2B-339933?logo=node.js&logoColor=white)
![Express](https://img.shields.io/badge/Express-5.x-000000?logo=express)
![MongoDB](https://img.shields.io/badge/MongoDB-Mongoose-47A248?logo=mongodb&logoColor=white)
![JWT](https://img.shields.io/badge/Auth-JWT%20Rotation-orange)
![Cloudinary](https://img.shields.io/badge/Storage-Cloudinary-3448C5)
![Vercel](https://img.shields.io/badge/Deploy-Vercel-black?logo=vercel)

> REST API backend for **LexaGuide** — Egypt's legal assistance platform connecting clients with lawyers, providing AI-powered recommendations, contract analysis, and automated document generation.

---

## ✨ Features

- 🔐 **Role-Based Auth** — User / Lawyer / Admin with JWT access + refresh token rotation
- 👨‍⚖️ **Lawyer Directory** — Searchable, filterable, with admin verification workflow
- 💬 **Consultation System** — Full lifecycle (pending → accepted → completed) with chat API
- 📄 **Legal Templates** — Contracts & complaints library with pagination and full-text search
- 🖨️ **Document Generation** — Auto-fills legal documents from user-provided inputs
- 🏛️ **Government Procedures** — Public database of legal/administrative procedures
- ☁️ **File Uploads** — Avatars and documents via Cloudinary
- 🤖 **Chatbot** — Session-based legal chatbot API
- 🛡️ **Admin Dashboard** — Stats, user management, consultation oversight

---

## 🚀 Quick Start

### Prerequisites
- Node.js **v18+**
- MongoDB running locally on port `27017` (or an Atlas URI)

### Setup

```bash
# 1. Install dependencies
npm install

# 2. Configure environment
cp .env.example .env
# Edit .env — set MONGODB_URI, JWT secrets, Cloudinary credentials

# 3. (Optional) Seed admin account
node scripts/seed-admin.js

# 4. Start development server
npm run dev
```

The server starts on **http://localhost:3000**

**Health check**: `GET http://localhost:3000/health` → `{ "ok": true }`

---

## ⚙️ Environment Variables

| Variable | Required | Description |
|---|---|---|
| `PORT` | No (default: 3000) | Server port |
| `MONGODB_URI` | ✅ | MongoDB connection string |
| `JWT_ACCESS_SECRET` | ✅ | Secret for access tokens |
| `JWT_ACCESS_EXPIRES` | No (default: 15m) | Access token TTL |
| `JWT_REFRESH_SECRET` | ✅ | Secret for refresh tokens |
| `JWT_REFRESH_EXPIRES` | No (default: 30d) | Refresh token TTL |
| `CLOUDINARY_CLOUD_NAME` | ✅ | Cloudinary cloud name |
| `CLOUDINARY_API_KEY` | ✅ | Cloudinary API key |
| `CLOUDINARY_API_SECRET` | ✅ | Cloudinary API secret |
| `FRONTEND_ORIGINS` | ✅ | Comma-separated allowed CORS origins |
| `APP_ENV` | No | `development` or `production` |

---

## 📡 API Reference

Base URL: `http://localhost:3000/api`

### 🔑 Auth
```
POST   /api/auth/register        Register new user
POST   /api/auth/login           Login → accessToken + refreshToken
GET    /api/auth/me              Get current user (Bearer required)
POST   /api/auth/refresh         Rotate refresh token
POST   /api/auth/logout          Revoke current session
POST   /api/auth/logout-all      Revoke all sessions
POST   /api/auth/change-password Change password (Bearer required)
POST   /api/auth/forgot-password Request password reset
POST   /api/auth/reset-password  Complete password reset
```

### 👤 Profile
```
GET    /api/profile              Get my profile (Bearer)
PATCH  /api/profile              Update name, phone, bio (Bearer)
POST   /api/profile/avatar       Upload avatar — multipart key: avatar (Bearer)
```

### 👨‍⚖️ Lawyers
```
GET    /api/lawyers              List/search lawyers (public)
GET    /api/lawyers/pending      Pending verification (Admin)
GET    /api/lawyers/:id          Lawyer detail (public)
PATCH  /api/lawyers/:id/verify   Approve lawyer (Admin)
```

### 💬 Consultations
```
POST   /api/consultations                    Create consultation (User)
GET    /api/consultations/my                 My consultations (User)
GET    /api/consultations/lawyer/me          My consultations (Lawyer)
GET    /api/consultations/:id                Consultation detail (Bearer)
GET    /api/consultations/:id/messages       Chat messages (Bearer)
POST   /api/consultations/:id/messages       Send message (Bearer)
PATCH  /api/consultations/:id/status         Update status (Lawyer)
```

### 📄 Templates & Documents
```
GET    /api/templates/complaints             Complaint templates (paginated, searchable)
GET    /api/templates/complaints/:id         Complaint detail
GET    /api/templates/contracts              Contract templates (paginated, searchable)
GET    /api/templates/contracts/:id          Contract detail
POST   /api/generated                        Generate document from template (Bearer)
GET    /api/generated/my                     My generated documents (Bearer)
GET    /api/generated/:id                    Single document (Bearer)
PATCH  /api/generated/:id/finalize           Finalize document (Bearer)
```

### 🏛️ Procedures
```
GET    /api/procedures           List procedures (public)
GET    /api/procedures/:id       Procedure detail (public)
```

### 📎 Docs (User Uploads)
```
POST   /api/docs/upload          Upload file to Cloudinary (Bearer)
GET    /api/docs/my              My uploaded files (Bearer)
DELETE /api/docs/:id             Delete file (Bearer)
```

### 🤖 Chatbot
```
POST   /api/chatbot/sessions             New chat session (Bearer)
GET    /api/chatbot/sessions             List sessions (Bearer)
GET    /api/chatbot/sessions/:id         Session + messages (Bearer)
POST   /api/chatbot/sessions/:id/messages Send message (Bearer)
```

### 📬 Contact & Admin
```
POST   /api/contact                          Submit contact form (public)
GET    /api/admin/stats                      Platform stats (Admin)
GET    /api/admin/users                      User list — supports ?q= search (Admin)
PATCH  /api/admin/users/:id/toggle-active    Enable/disable user (Admin)
GET    /api/admin/consultations              All consultations (Admin)
```

---

## 🗂️ Project Structure

```
Graduation-Backend2/
├── src/
│   ├── config/           # DB + Cloudinary setup
│   ├── middlewares/      # Auth, role guards, error handler, upload
│   ├── modules/          # Feature modules (auth, lawyers, consultations, ...)
│   ├── utils/            # asyncHandler wrapper
│   ├── app.js            # Express app, middleware stack, route mounting
│   └── server.js         # Entry point + Vercel export
├── scripts/              # Seeding & data import utilities
├── Data/                 # CSV data files for template import
├── .env.example          # Environment variable template
├── vercel.json           # Vercel deployment config
└── package.json
```

---

## 🛠️ Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start with nodemon (auto-reload) |
| `npm start` | Production start |
| `node scripts/seed-admin.js` | Create default admin account |
| `node scripts/seed-lawyer.js` | Seed sample lawyers |
| `node scripts/import-complaints.js` | Import complaint templates from CSV |
| `node scripts/import-contracts.js` | Import contract templates from CSV |
| `node scripts/import-procedures.js` | Import government procedures |

---

## 🔐 Roles

| Role | Description |
|---|---|
| `user` | Regular client — can create consultations, generate docs |
| `lawyer` | Verified legal professional — manages their consultations |
| `admin` | Platform administrator — full access, approves lawyers |

---

## 🧪 Demo / Test Accounts

For quick evaluation without registering, the following demo accounts are already seeded in the live database. All data is fake and used for testing/demo purposes only — no real personal information.

| Role   | Email                        | Password           |
|--------|-------------------------------|---------------------|
| Admin  | `admin.demo@lexaguide.com`   | `DemoAdmin#2025`    |
| User   | `user.demo@lexaguide.com`    | `DemoUser#7391`     |
| Lawyer | `lawyer.demo@lexaguide.com`  | `DemoLawyer#4820`   |

> ⚠️ These are shared demo accounts for reviewers/testers — please don't change their passwords.

---

## 🌐 Deployment (Vercel)

The project is pre-configured for Vercel serverless deployment via `vercel.json`.

```bash
vercel --prod
```

Set all environment variables in the Vercel dashboard before deploying.

---

## 🔗 Related Repositories

| Repo | Stack | Description |
|---|---|---|
| `lexaguide-frontend` | Vanilla JS / HTML / CSS | Web frontend |
| `egail-lawyer-recommendation` | Python / FastAPI | AI lawyer matching microservice |