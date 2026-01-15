# Email Client AI – Advanced Web Application Development – Final Project

## 📋 Table of Contents
- [Deployment](#deployment)
- [Project Summary](#project-summary)
- [Setup Guide](#-setup-guide)
- [Google OAuth Setup](#-google-oauth-setup)
- [API Endpoints](#-api-endpoints)
- [Token Storage & Authentication](#-token-storage--authentication)
- [Security Considerations](#-security-considerations)

---

## 🌐 Deployment
- **Frontend:** https://email-client-ai-awad.onrender.com 
- **Backend:** https://backend-email-client-ai-awad.onrender.com

---

## 📖 Project Summary

A modern **React-based Email Client** integrated with **Gmail** and enhanced by **AI-powered features** including Kanban-style email workflow, AI summarization, and semantic search.

**Key Features:**
- 🔐 Google OAuth 2.0 authentication & Gmail API integration
- 📊 Kanban board with drag-and-drop email management
- 🤖 AI-powered email summaries and semantic search
- ⏰ Email snooze functionality with auto-return
- 🔍 Fuzzy search with typo tolerance
- 📎 Full email operations (compose, reply, forward, attachments)
- 🎨 Three-column responsive UI (mailboxes, list, details)
- 🔄 Real-time synchronization and offline caching

---

## 🚀 Setup Guide

### Prerequisites
- Node.js v18+
- Supabase account (PostgreSQL with pgvector)
- Google Cloud Console account
- Mistral AI API key

### Backend Setup

```bash
cd backend
npm install
cp .env.example .env
```

Update `.env` with your credentials:
```env
SUPABASE_URL=your_supabase_project_url
SUPABASE_ANON_KEY=your_supabase_anon_key
JWT_ACCESS_SECRET=generate-with-crypto
JWT_REFRESH_SECRET=generate-with-crypto
GOOGLE_CLIENT_ID=your-google-client-id
GMAIL_CLIENT_ID=same-as-above
GMAIL_CLIENT_SECRET=your-client-secret
GMAIL_REDIRECT_URI=http://localhost:3000/api/gmail/callback
MISTRAL_API_KEY=your-mistral-api-key
FRONTEND_URL=http://localhost:5173
```

Enable pgvector in Supabase:
```sql
CREATE EXTENSION IF NOT EXISTS vector;
```

Run backend:
```bash
npm run start:dev  # Development
npm run start:prod # Production
```

Access: http://localhost:3000 (API), http://localhost:3000/api (Swagger)

### Frontend Setup

```bash
cd frontend
npm install
cp .env.example .env
```

Update `.env`:
```env
VITE_API_URL=http://localhost:3000
VITE_GOOGLE_CLIENT_ID=your-google-client-id
```

Run frontend:
```bash
npm run dev   # Development
npm run build # Production
```

Access: http://localhost:5173

---

## 🔐 Google OAuth Setup

### Quick Setup Steps

1. **Create Project**: [Google Cloud Console](https://console.cloud.google.com/) → Create Project

2. **Enable APIs**: APIs & Services → Library → Enable:
   - Gmail API
   - Google+ API

3. **OAuth Consent**: APIs & Services → OAuth consent screen → External
   - Add scopes: `gmail.readonly`, `gmail.send`, `gmail.modify`, `gmail.labels`, `userinfo.email`, `userinfo.profile`
   - Add test users (development mode)

4. **Create Credentials**: APIs & Services → Credentials → Create OAuth 2.0 Client ID → Web application
   - **Authorized JavaScript origins**: `http://localhost:5173`, `https://your-frontend.com`
   - **Redirect URIs**: `http://localhost:3000/api/gmail/callback`, `https://your-backend.com/api/gmail/callback`

5. **Update `.env` files** with Client ID and Secret

### Troubleshooting
- **redirect_uri_mismatch**: Match redirect URI exactly in Google Console
- **access_denied**: Add required scopes, add test users
- **invalid_client**: Verify Client ID/Secret in `.env`

---

## 📡 API Endpoints

Base URL: `http://localhost:3000/api`

### Authentication
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/auth/login` | Email/password login | No |
| POST | `/auth/google` | Google OAuth login | No |
| POST | `/auth/refresh` | Refresh access token | No |
| GET | `/auth/profile` | Get user profile | Yes |
| POST | `/auth/logout` | Logout | No |
| POST | `/user/register` | Register user | No |

### Gmail OAuth
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/gmail/auth` | Get OAuth URL | Yes |
| GET | `/gmail/callback` | OAuth callback | No |
| POST | `/gmail/connect` | Connect account | Yes |
| POST | `/gmail/disconnect` | Disconnect account | Yes |

### Email Operations
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/gmail/mailboxes` | List mailboxes | Yes |
| GET | `/gmail/mailboxes/:id/emails` | Get emails | Yes |
| GET | `/gmail/emails/:id` | Get email details | Yes |
| POST | `/gmail/emails/send` | Send email | Yes |
| POST | `/gmail/emails/:id/reply` | Reply to email | Yes |
| POST | `/gmail/emails/:id/read` | Mark as read | Yes |
| POST | `/gmail/emails/:id/unread` | Mark as unread | Yes |
| POST | `/gmail/emails/:id/star` | Toggle star | Yes |
| POST | `/gmail/emails/:id/archive` | Archive email | Yes |
| POST | `/gmail/emails/:id/delete` | Delete email | Yes |
| GET | `/gmail/emails/:msgId/attachments/:attId` | Download attachment | Yes |

### Search & AI
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/gmail/search?q=query` | Fuzzy search | Yes |
| GET | `/gmail/search/semantic?q=query` | Semantic search | Yes |
| GET | `/gmail/search/suggestions?q=query` | Search suggestions | Yes |
| POST | `/gmail/emails/:id/embedding` | Generate embedding | Yes |
| POST | `/gmail/mailboxes/:id/embeddings` | Batch embeddings | Yes |
| GET | `/gmail/embeddings/stats` | Embedding stats | Yes |

### Kanban & Workflow
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/gmail/kanban/columns` | Get columns | Yes |
| POST | `/gmail/kanban/columns` | Create column | Yes |
| POST | `/gmail/kanban/columns/:id` | Update column | Yes |
| POST | `/gmail/kanban/columns/:id/delete` | Delete column | Yes |
| POST | `/gmail/kanban/columns/reorder` | Reorder columns | Yes |
| POST | `/workflow/batch` | Get workflows (batch) | Yes |
| GET | `/workflow/:msgId` | Get workflow | Yes |
| PUT | `/workflow/:msgId` | Update workflow | Yes |
| POST | `/workflow/:msgId/summary` | Generate AI summary | Yes |

---

## 🔑 Token Storage & Authentication

### Token Strategy

| Token | Storage | Lifetime | Transmission | XSS Safe | CSRF Safe |
|-------|---------|----------|--------------|----------|-----------|
| **Access Token** | Frontend memory | 15 min | Authorization header | ⚠️ Vulnerable | ✅ Yes |
| **Refresh Token** | HttpOnly cookie | 7 days | Cookie (auto) | ✅ Yes | ⚠️ Mitigated |

### Cookie Configuration
```typescript
res.cookie('refreshToken', token, {
  httpOnly: true,    // No JS access
  secure: true,      // HTTPS only
  sameSite: 'lax',   // CSRF protection
  maxAge: 604800000  // 7 days
});
```

### Gmail Tokens
| Token | Storage | Purpose |
|-------|---------|---------|
| Gmail Refresh Token | Supabase (encrypted) | Long-term access |
| Gmail Access Token | Backend memory | Current session |

### Authentication Flow
1. User logs in → Backend verifies credentials
2. Backend issues Access Token (15min) + Refresh Token (7d, HttpOnly cookie)
3. Frontend stores Access Token in memory
4. Frontend sends Access Token in `Authorization: Bearer <token>` header
5. When Access Token expires → POST `/auth/refresh` → Get new Access Token
6. Gmail tokens managed separately by backend

---

## 🛡️ Security Considerations

### Implemented Protections
- ✅ JWT with 15-min expiration
- ✅ HttpOnly cookies for refresh tokens
- ✅ bcrypt password hashing
- ✅ OAuth 2.0 for Gmail
- ✅ CORS with specific origins
- ✅ Input validation (class-validator)
- ✅ SQL injection prevention (Supabase SDK)
- ✅ XSS protection (DOMPurify)

### Best Practices

**Token Security:**
```typescript
// ✅ GOOD: Refresh token in HttpOnly cookie
res.cookie('refreshToken', token, { httpOnly: true });

// ❌ BAD: Never use localStorage
localStorage.setItem('refreshToken', token);
```

**Input Validation:**
```typescript
export class SendEmailDto {
  @IsEmail() to: string;
  @IsString() @MinLength(1) subject: string;
  @IsString() body: string;
}
```

**XSS Prevention:**
```typescript
import DOMPurify from 'dompurify';
const clean = DOMPurify.sanitize(emailBody);
```

### Recommendations
- [ ] Add rate limiting (`@nestjs/throttler`)
- [ ] Implement CSP headers
- [ ] Enable API request logging
- [ ] Use secret management in production (AWS Secrets Manager)
- [ ] Enforce HTTPS only
- [ ] Enable Supabase Row Level Security

### Generate Secure Secrets
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

---

## 📚 Resources
- [NestJS Docs](https://docs.nestjs.com/)
- [Gmail API](https://developers.google.com/gmail/api)
- [Google OAuth 2.0](https://developers.google.com/identity/protocols/oauth2)
- [Supabase](https://supabase.com/docs)
- [JWT Best Practices](https://tools.ietf.org/html/rfc8725)

---

**License:** Educational use - Advanced Web Application Development course
