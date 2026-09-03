# LexaGuide Backend — LLM Context File

> **Purpose**: This file gives AI coding assistants full context about the backend codebase.
> Keep this file updated whenever you add/change modules, routes, or architecture decisions.

---

## 📝 Project Overview

**LexaGuide** is a legal assistance platform for Egypt. This repository is the **Node.js + Express REST API** backend only.

### What This Backend Does
- Role-based authentication (User / Lawyer / Admin) with JWT access + refresh token rotation
- Lawyer directory with filters (specialty, governorate, availability)
- Admin approval workflow for lawyer verification
- Consultation lifecycle management (pending → accepted → completed) with real-time-like chat (polling)
- Legal template library (contracts + complaints) with pagination & search
- Document generation engine (fills template fields from user input)
- Government procedures database
- User document uploads via Cloudinary
- Legal chatbot session management
- Admin dashboard (stats, user management, consultation oversight)
- Contact form submission storage

### Related Repos
| Repo | Description |
|---|---|
| `lexaguide-frontend` | Vanilla JS + HTML/CSS Glassmorphism frontend |
| `egail-lawyer-recommendation` | Python FastAPI AI recommendation microservice |

---

## 🏗️ Architecture

### Tech Stack
| Layer | Technology |
|---|---|
| Runtime | Node.js v18+ (ES Modules — `"type": "module"`) |
| Framework | Express.js v5.x |
| Database | MongoDB with Mongoose ODM |
| Auth | JWT (Access Token 15min + Refresh Token 30d with rotation) |
| File Storage | Cloudinary (avatars, uploaded documents) |
| Validation | Zod schema validation |
| Security | Helmet, CORS, Express Rate Limit, bcryptjs |
| Logging | Morgan (dev) |
| File Upload | Multer + multer-storage-cloudinary |
| Deployment | Vercel (serverless — `src/server.js` exports handler) |

### Module Structure

```
src/
├── config/
│   ├── db.js                  # MongoDB connection (connectDB)
│   └── cloudinary.js          # Cloudinary SDK initialization
├── middlewares/
│   ├── auth.middleware.js      # JWT verification → sets req.user
│   ├── admin.middleware.js     # requireRole("admin") guard
│   ├── lawyerAuth.middleware.js# Lawyer/Admin role guard
│   ├── error.middleware.js     # Global error handler (last middleware)
│   ├── avatarUpload.middleware.js  # Multer+Cloudinary for avatars
│   └── upload.middleware.js    # General file upload (docs)
├── modules/                   # Feature modules (route + controller + model)
│   ├── auth/
│   │   ├── auth.routes.js
│   │   ├── auth.controller.js  # register, login, me, refresh, logout, forgot/reset pw, change-pw
│   │   ├── auth.tokens.js      # JWT generation & verification helpers
│   │   └── auth.refresh.js     # Refresh token rotation logic
│   ├── users/
│   │   ├── user.model.js       # User schema (role: user|admin)
│   │   ├── notification.model.js
│   │   └── notifications.routes.js
│   ├── lawyers/
│   │   ├── lawyer.model.js     # Lawyer schema (specialties, rating, isVerified, etc.)
│   │   ├── lawyers.controller.js
│   │   └── lawyers.routes.js   # ⚠️ /pending MUST come BEFORE /:id
│   ├── profile/
│   │   ├── profile.controller.js
│   │   └── profile.routes.js
│   ├── consultations/
│   │   ├── consultation.model.js   # status: pending|accepted|rejected|completed
│   │   ├── message.model.js        # Chat messages within a consultation
│   │   ├── consultations.controller.js
│   │   └── consultations.routes.js
│   ├── templates/
│   │   ├── complaintTemplate.model.js
│   │   ├── contractTemplate.model.js
│   │   ├── templates.controller.js
│   │   └── templates.routes.js     # Supports pagination & full-text search
│   ├── generated/
│   │   ├── generated.model.js
│   │   ├── generated.controller.js # Template fill engine
│   │   └── generated.routes.js
│   ├── procedures/
│   │   ├── procedure.model.js
│   │   ├── procedures.controller.js
│   │   └── procedures.routes.js
│   ├── docs/                       # User document uploads
│   │   ├── uploadedDoc.model.js
│   │   ├── docs.controller.js
│   │   └── docs.routes.js
│   ├── documents/                  # Alias routes for document endpoints
│   │   ├── documents.controller.js
│   │   └── documents.routes.js
│   ├── chatbot/
│   │   ├── chatSession.model.js
│   │   ├── chatMessage.model.js
│   │   ├── chatbot.controller.js
│   │   └── chatbot.routes.js
│   ├── admin/
│   │   ├── admin.controller.js
│   │   └── admin.routes.js
│   └── contact/
│       ├── contact.model.js
│       ├── contact.controller.js
│       └── contact.routes.js
├── utils/
│   └── asyncHandler.js            # try/catch wrapper for async controllers
├── app.js                         # Express setup, middleware stack, route mounting
└── server.js                      # Entry point: connectDB + listen + Vercel export
```

---

## ⚙️ Environment Variables

Copy `.env.example` to `.env` and fill in the values:

```env
PORT=3000
MONGODB_URI=mongodb://localhost:27017/Lexa
JWT_ACCESS_SECRET=<strong-random-secret>
JWT_ACCESS_EXPIRES=15m
JWT_REFRESH_SECRET=<different-strong-secret>
JWT_REFRESH_EXPIRES=30d
CLOUDINARY_CLOUD_NAME=<your-cloud-name>
CLOUDINARY_API_KEY=<your-api-key>
CLOUDINARY_API_SECRET=<your-api-secret>
SEED_ADMIN_EMAIL=admin@lexaguide.com
SEED_ADMIN_PASSWORD=Admin12345
FRONTEND_ORIGINS=http://localhost:5500,http://localhost:3000
APP_ENV=development
```

---

## 🔌 API Endpoints Reference

**Base URL**: `http://localhost:3000/api`

### Auth — `/api/auth`
| Method | Path | Auth Required | Description |
|---|---|---|---|
| POST | `/register` | No | Register (fullName, email, password) |
| POST | `/login` | No | Login → accessToken + refreshToken + user |
| GET  | `/me` | Bearer | Current user info ⚠️ Must check BOTH collections |
| POST | `/refresh` | No | Rotate refresh token |
| POST | `/logout` | Bearer | Revoke current session |
| POST | `/logout-all` | Bearer | Revoke all sessions |
| POST | `/change-password` | Bearer | oldPassword + newPassword |
| POST | `/forgot-password` | No | ⚠️ BUG: returns token in response (see Known Bugs) |
| POST | `/reset-password` | No | resetToken + newPassword |

### Profile — `/api/profile`
| Method | Path | Auth | Description |
|---|---|---|---|
| GET  | `/` | Bearer | Get my profile |
| PATCH| `/` | Bearer | Update fullName, phone, bio |
| POST | `/avatar` | Bearer | Multipart (key: `avatar`) → Cloudinary |

### Lawyers — `/api/lawyers`
| Method | Path | Auth | Description |
|---|---|---|---|
| GET  | `/` | No | List/search (filters: specialties, governorate) |
| GET  | `/pending` | Admin | Pending verification list |
| GET  | `/:id` | No | Lawyer by ID |
| PATCH| `/:id/verify` | Admin | Approve lawyer registration |

### Consultations — `/api/consultations`
| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/` | User/Lawyer | Create (lawyerId, caseType, budget, description) |
| GET  | `/my` | Bearer | Client's consultations |
| GET  | `/lawyer/me` | Lawyer | Lawyer's consultations |
| GET  | `/:id` | Bearer | Consultation detail |
| GET  | `/:id/messages` | Bearer | Chat messages |
| POST | `/:id/messages` | Bearer | Send chat message |
| PATCH| `/:id/status` | Lawyer | Update status (accepted/rejected/completed) |

### Templates — `/api/templates`
| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/complaints?page=&limit=&q=` | No | Paginated complaints list |
| GET | `/complaints/:id` | No | Complaint template detail |
| GET | `/contracts?page=&limit=&q=` | No | Paginated contracts list |
| GET | `/contracts/:id` | No | Contract template detail |

### Generated Documents — `/api/generated`
| Method | Path | Auth | Description |
|---|---|---|---|
| POST  | `/` | Bearer | `{ templateKind, templateId, userInputs }` → fills template |
| GET   | `/my?page=&limit=` | Bearer | My document history |
| GET   | `/:id` | Bearer | Single document |
| PATCH | `/:id/finalize` | Bearer | Mark as finalized |

### Procedures — `/api/procedures`
| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/` | No | List all government procedures |
| GET | `/:id` | No | Procedure detail |

### Docs — `/api/docs`
| Method | Path | Auth | Description |
|---|---|---|---|
| POST   | `/upload` | Bearer | Multipart (key: `file`) → Cloudinary |
| GET    | `/my` | Bearer | My uploaded documents |
| DELETE | `/:id` | Bearer | Delete document |

### Chatbot — `/api/chatbot`
| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/sessions` | Bearer | Create new chat session |
| GET  | `/sessions` | Bearer | List sessions |
| GET  | `/sessions/:id` | Bearer | Session with messages |
| POST | `/sessions/:id/messages` | Bearer | Send message to bot |

### Contact — `/api/contact`
| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/` | No | Submit contact form (name, email, message, subject) |

### Admin — `/api/admin`
| Method | Path | Auth | Description |
|---|---|---|---|
| GET  | `/stats` | Admin | Platform statistics |
| GET  | `/users?page=&limit=&q=` | Admin | User list with search |
| PATCH| `/users/:id/toggle-active` | Admin | Enable/disable user |
| GET  | `/consultations?page=&limit=` | Admin | All consultations |

---

## 📊 Data Models

### User
```
users collection:
  fullName (string, required)
  email (string, unique, lowercase)
  passwordHash (string, bcrypt)
  role (enum: "user" | "admin", default: "user")
  refreshTokens[] → { tokenHash, jti, createdAt, expiresAt, revokedAt, userAgent, ip }
  phone, bio, avatarUrl, avatarPublicId
  isActive (boolean, default: true)
  passwordResetTokenHash, passwordResetExpiresAt
  timestamps
```

### Lawyer
```
lawyers collection:
  fullName, email (unique), phone, passwordHash
  role (fixed: "lawyer")
  bio, governorate, city, address
  specialties[] (e.g. ["أحوال شخصية", "مدني"])
  pricePerSession, sessionDurationMins
  communicationMethods: "chat" | "video_call" | "both"
  ratingAvg (0–5), ratingCount, successRate (0–100)
  isVerified (default: false — requires admin approval)
  isActive, isAvailable
  → Compound text index on: fullName, specialties, governorate
```

### Consultation
```
lawyerId (ref: Lawyer), userId (ref: User)
caseType, description, budget
status: "pending" | "accepted" | "rejected" | "completed"
startTime, endTime, timestamps
```

### Message
```
consultationId, senderId, senderRole ("user" | "lawyer")
text, readAt, timestamps
```

---

## 🚨 Known Bugs (Fix Before Production)

| # | Location | Issue | Fix |
|---|---|---|---|
| 1 | `lawyers.routes.js` | `/:id` defined BEFORE `/pending` → route shadowing | Move all literal routes ABOVE `/:id` |
| 2 | `auth.controller.js → me()` | Only queries `User.findById()` — lawyers get `null` | Add `Lawyer.findById()` fallback |
| 3 | `consultations.routes.js` | No handler for `GET /:id` | Add `getConsultationById` controller |
| 4 | `auth.controller.js → forgotPassword()` | Returns raw `resetToken` in JSON — critical security hole | Log only, or email the token |

---

## 📜 Scripts (`/scripts`)

| Script | Command | Purpose |
|---|---|---|
| `seed-admin.js` | `npm run seed-admin` | Create admin@lexaguide.com / Admin12345 |
| `seed-lawyer.js` | `node scripts/seed-lawyer.js` | Seed sample lawyers |
| `import-complaints.js` | `node scripts/import-complaints.js` | Bulk import complaint templates from CSV |
| `import-contracts.js` | `node scripts/import-contracts.js` | Bulk import contract templates from CSV |
| `import-procedures.js` | `node scripts/import-procedures.js` | Import government procedures |
| `migrate-to-atlas.js` | `node scripts/migrate-to-atlas.js` | Migrate local → Atlas |
| `verify-lawyer.js` | `node scripts/verify-lawyer.js` | Force-set a lawyer's isVerified=true |

---

## 🧑‍💻 Coding Conventions (Must Follow)

1. **Module-Based**: All new features go in `src/modules/<feature>/` (model + controller + routes)
2. **asyncHandler**: Wrap ALL async controller functions with `asyncHandler(...)` — no bare try/catch
3. **Zod Validation**: Validate all incoming request bodies at the TOP of each controller function
4. **Route Ordering**: Literal routes (`/pending`, `/my`, `/stats`) MUST come BEFORE `/:id` in every router file
5. **Error Handling**: Throw descriptive `Error` objects — let `error.middleware.js` handle the response
6. **Dual-Model Auth**: Any "current user" lookup MUST check both `User` and `Lawyer` collections
7. **No Hardcoded IDs**: Never hardcode ObjectIds or env values directly in source code

---

## 🔐 Roles & Permissions Matrix

| Action | User (Client) | Lawyer | Admin |
|---|---|---|---|
| Register / Login | ✅ | ✅ | ✅ |
| Browse lawyers, templates, procedures | ✅ | ✅ | ✅ |
| Create consultation | ✅ | ❌ | ✅ |
| Accept / reject / complete consultation | ❌ | ✅ (own) | ✅ |
| Chat in consultation | ✅ (own) | ✅ (own) | ✅ |
| Update own profile / avatar | ✅ | ✅ | ✅ |
| Upload documents | ✅ | ✅ | ✅ |
| Generate documents from templates | ✅ | ✅ | ✅ |
| Verify lawyer accounts | ❌ | ❌ | ✅ |
| Toggle user active/disabled | ❌ | ❌ | ✅ |
| View system stats | ❌ | ❌ | ✅ |
| View all consultations | ❌ | ❌ | ✅ |

---

**Last Updated**: 2026-09-03
**Scope**: Backend repo only (`Graduation-Backend2`)
