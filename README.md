# G04-React-Email-Client — Gmail API Integration

A full-stack email client application with React frontend and NestJS backend, featuring real Gmail integration via OAuth2 and the Gmail API.

---

## 🚀 Features

- **Real Gmail Integration**: Connect your Gmail account via OAuth2
- **Full Email Management**: Read, send, reply, archive, delete emails
- **3-Column Responsive UI**: Modern email client interface
- **Secure Authentication**: JWT-based auth with Google Sign-In
- **Token Management**: Automatic refresh token handling
- **Attachment Support**: View and download email attachments
- **Label/Folder Management**: Access all Gmail labels and folders
- **Keyboard Navigation**: Full keyboard shortcuts support

---

## 📋 Prerequisites

- Node.js 18+ and npm
- Supabase account (for user database)
- Google Cloud Platform account (for Gmail API)

---

## 🛠️ Local Setup

### 1. Clone the Repository

```powershell
git clone https://github.com/cyanpororo/G04-React-Email-Client.git
cd G04-React-Email-Client
```

### 2. Database Setup (Supabase)

1. Create a Supabase project at [supabase.com](https://supabase.com)
2. Run this SQL in the Supabase SQL editor:

```sql
-- Create users table
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  password TEXT,
  google_id TEXT UNIQUE,
  gmail_refresh_token TEXT,
  role TEXT DEFAULT 'user',
  created_at TIMESTAMP DEFAULT NOW()
);

-- Add indexes
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_google_id ON users(google_id);
```

3. Copy your Supabase URL and anon key

### 3. Google Cloud Setup

#### Enable Gmail API

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Enable the Gmail API:
   - Navigate to "APIs & Services" > "Library"
   - Search for "Gmail API"
   - Click "Enable"

#### Create OAuth 2.0 Credentials

1. Go to "APIs & Services" > "Credentials"
2. Click "Create Credentials" > "OAuth client ID"
3. Configure OAuth consent screen (if not done):
   - User Type: External (for testing) or Internal (for organization)
   - App name: "G04 Email Client"
   - User support email: your email
   - Developer contact: your email
   - Scopes: Add these Gmail scopes:
     - `https://www.googleapis.com/auth/gmail.readonly`
     - `https://www.googleapis.com/auth/gmail.modify`
     - `https://www.googleapis.com/auth/gmail.send`
     - `https://www.googleapis.com/auth/gmail.labels`
4. Create OAuth Client ID:
   - Application type: Web application
   - Name: "G04 Email Client"
   - Authorized redirect URIs:
     - `http://localhost:3000/api/gmail/callback`
     - `http://localhost:5173` (for frontend)
5. Copy Client ID and Client Secret

#### Add Test Users (Development)

1. In OAuth consent screen settings
2. Add test users (your Gmail accounts for testing)

### 4. Backend Setup

```powershell
cd backend
copy .env.example .env
```

Edit `backend/.env`:

```env
# Supabase Configuration
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-supabase-anon-key

# JWT Configuration
JWT_ACCESS_SECRET=your-random-secret-key-min-32-chars
JWT_REFRESH_SECRET=your-random-refresh-secret-min-32-chars

# Application Configuration
PORT=3000
NODE_ENV=development

# Frontend URL for CORS
FRONTEND_URL=http://localhost:5173

# Google OAuth Configuration (for app authentication)
GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com

# Gmail API OAuth2 Configuration (for email access)
GMAIL_CLIENT_ID=your-gmail-oauth-client-id.apps.googleusercontent.com
GMAIL_CLIENT_SECRET=your-gmail-oauth-client-secret
GMAIL_REDIRECT_URI=http://localhost:3000/api/gmail/callback
```

Install and run:

```powershell
npm install
npm run start:dev
```

Backend will run on `http://localhost:3000`

### 5. Frontend Setup

```powershell
cd ../frontend
copy .env.example .env
```

Edit `frontend/.env`:

```env
VITE_API_URL=http://localhost:3000
VITE_GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
```

Install and run:

```powershell
npm install
npm run dev
```

Frontend will run on `http://localhost:5173`

---

## 🔐 How to Use

### 1. Sign Up / Login

- **Email & Password**: Create account with email/password
- **Google Sign-In**: Sign in with Google account

### 2. Connect Gmail

1. After logging in, click "Connect Gmail" button
2. You'll be redirected to Google OAuth consent screen
3. Grant permissions to access your Gmail
4. You'll be redirected back to the app
5. Your Gmail emails will now be displayed

### 3. Use the Email Client

- **Read Emails**: Click on any email to view details
- **Send Email**: Click "Compose" button
- **Reply**: Open an email and click "Reply"
- **Archive/Delete**: Use action buttons in email detail
- **Search**: Use search bar to filter emails
- **Labels**: Click on labels in sidebar to filter

---

## 🏗️ Architecture

### Backend (NestJS)

```
backend/src/
├── auth/              # Authentication (JWT, Google OAuth)
├── gmail/             # Gmail API integration
│   ├── dto/           # Data transfer objects
│   ├── gmail.controller.ts
│   ├── gmail.service.ts
│   └── gmail.module.ts
├── user/              # User management
├── supabase/          # Supabase client
└── main.ts            # Application entry
```

### Frontend (React + Vite)

```
frontend/src/
├── api/               # API client (axios)
├── components/        # React components
├── contexts/          # React contexts (Auth)
├── lib/               # Utilities
└── App.tsx            # Main application
```

---

## 🔒 Security & Token Storage

### Token Storage Strategy

**Access Tokens** (Short-lived, 15 minutes):
- Stored in-memory on frontend
- Sent with every API request
- Never persisted to localStorage

**Refresh Tokens** (Long-lived, 7 days):
- Stored in localStorage for app refresh tokens
- **Gmail refresh tokens**: Stored server-side in database only
- Used to obtain new access tokens

**Gmail OAuth Tokens**:
- Refresh token stored encrypted in database
- Never exposed to frontend
- Automatically refreshed by backend when needed

### Why This Approach?

✅ **Pros**:
- Gmail refresh tokens never leave the server
- Reduced XSS attack surface (access tokens in-memory)
- Automatic token refresh
- Works across browser tabs

⚠️ **Tradeoffs**:
- App refresh tokens in localStorage vulnerable to XSS
- Alternative: HttpOnly cookies (requires CSRF protection)

### Production Recommendations

1. Use HTTPS only
2. Implement Content Security Policy (CSP)
3. Add rate limiting
4. Enable CORS properly
5. Use HttpOnly cookies for refresh tokens
6. Implement CSRF tokens
7. Add audit logging

---

## 📡 API Endpoints

### Authentication
- `POST /api/auth/login` - Email/password login
- `POST /api/auth/google` - Google Sign-In
- `POST /api/auth/refresh` - Refresh access token
- `GET /api/auth/profile` - Get user profile

### Gmail Integration
- `GET /api/gmail/auth` - Get Gmail OAuth URL
- `GET /api/gmail/callback` - OAuth callback
- `POST /api/gmail/connect` - Connect Gmail account
- `POST /api/gmail/disconnect` - Disconnect Gmail
- `GET /api/gmail/mailboxes` - Get labels/folders
- `GET /api/gmail/mailboxes/:id/emails` - Get emails
- `GET /api/gmail/emails/:id` - Get email details
- `POST /api/gmail/emails/send` - Send email
- `POST /api/gmail/emails/:id/reply` - Reply to email
- `POST /api/gmail/emails/:id/read` - Mark as read
- `POST /api/gmail/emails/:id/star` - Toggle star
- `POST /api/gmail/emails/:id/archive` - Archive email
- `POST /api/gmail/emails/:id/delete` - Delete email
- `GET /api/gmail/emails/:msgId/attachments/:attId` - Get attachment

---

## 🚢 Deployment

### Backend Deployment (Render/Railway/Heroku)

1. Create new web service
2. Connect GitHub repository
3. Set environment variables (all from `.env`)
4. Update `GMAIL_REDIRECT_URI` to production URL
5. Deploy

### Frontend Deployment (Vercel/Netlify)

1. Create new site from GitHub
2. Set build command: `npm run build`
3. Set publish directory: `dist`
4. Add environment variables:
   - `VITE_API_URL`: Your backend URL
   - `VITE_GOOGLE_CLIENT_ID`: Google Client ID
5. Deploy

### Post-Deployment

1. Update Google OAuth redirect URIs:
   - Add `https://your-backend.com/api/gmail/callback`
   - Add `https://your-frontend.com`
2. Update CORS settings in backend
3. Test OAuth flow end-to-end

---

## 🧪 Testing

### Test Gmail Connection

1. Login to the app
2. Click "Connect Gmail"
3. Grant permissions
4. Verify emails load from your Gmail account

### Test Token Refresh

The backend automatically refreshes Gmail tokens when they expire. To test:

1. Wait for access token to expire (15 minutes)
2. Try to fetch emails
3. Should work seamlessly (backend refreshes token)

### Simulate Token Expiry

For development, you can manually revoke access:

1. Go to [Google Account Permissions](https://myaccount.google.com/permissions)
2. Remove "G04 Email Client" access
3. Try to use the app
4. Should show error and prompt to reconnect

---

## 📝 Environment Variables Reference

### Backend

| Variable | Description | Example |
|----------|-------------|---------|
| `SUPABASE_URL` | Supabase project URL | `https://xxx.supabase.co` |
| `SUPABASE_ANON_KEY` | Supabase anon key | `eyJhbG...` |
| `JWT_ACCESS_SECRET` | JWT access token secret | Random 32+ chars |
| `JWT_REFRESH_SECRET` | JWT refresh token secret | Random 32+ chars |
| `PORT` | Backend port | `3000` |
| `NODE_ENV` | Environment | `development` or `production` |
| `FRONTEND_URL` | Frontend URL for CORS | `http://localhost:5173` |
| `GOOGLE_CLIENT_ID` | Google OAuth client ID (app auth) | `xxx.apps.googleusercontent.com` |
| `GMAIL_CLIENT_ID` | Gmail OAuth client ID | `xxx.apps.googleusercontent.com` |
| `GMAIL_CLIENT_SECRET` | Gmail OAuth client secret | `GOCSPX-xxx` |
| `GMAIL_REDIRECT_URI` | Gmail OAuth redirect URI | `http://localhost:3000/api/gmail/callback` |

### Frontend

| Variable | Description | Example |
|----------|-------------|---------|
| `VITE_API_URL` | Backend API URL | `http://localhost:3000` |
| `VITE_GOOGLE_CLIENT_ID` | Google OAuth client ID | `xxx.apps.googleusercontent.com` |

---

## 🐛 Troubleshooting

### "Gmail not connected" Error

- Make sure you clicked "Connect Gmail" after logging in
- Check that OAuth callback completed successfully
- Verify `gmail_refresh_token` is stored in database

### OAuth Redirect Mismatch

- Ensure redirect URI in Google Cloud Console matches exactly
- Check `GMAIL_REDIRECT_URI` in backend `.env`
- Include protocol (`http://` or `https://`)

### CORS Errors

- Verify `FRONTEND_URL` in backend `.env`
- Check browser console for specific CORS error
- Ensure backend is running

### Token Refresh Fails

- Check that refresh token is valid in database
- Verify Gmail API is enabled in Google Cloud
- Check backend logs for specific error

---

## 📚 Technologies Used

### Frontend
- React 19
- TypeScript
- Vite
- TailwindCSS
- React Router
- React Query (TanStack Query)
- Axios
- React Hook Form

### Backend
- NestJS
- TypeScript
- Passport JWT
- Google APIs (googleapis)
- Supabase
- bcrypt

---

## 📄 License

UNLICENSED - Educational Project

---

## 👥 Contributors

- Your Name (@cyanpororo)

---

## 🙏 Acknowledgments

- Google Gmail API Documentation
- NestJS Documentation
- React Documentation
- Supabase Team

---

## 📞 Support

For issues and questions:
- Create an issue on GitHub
- Email: your-email@example.com

---

**Note**: This is an educational project. For production use, implement additional security measures, error handling, and testing.