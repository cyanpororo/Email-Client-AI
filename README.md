# React Email Client

A full-stack email client application built with React and NestJS that integrates with Gmail API, featuring Google OAuth2 authentication, real-time email management, and a responsive 3-column UI.

## 🚀 Features

- **Gmail Integration**: Full Gmail API integration for reading, sending, and managing emails
- **Google OAuth2 Authentication**: Secure OAuth2 flow with refresh token support
- **Responsive UI**: 3-column layout (mailboxes, email list, email detail) with mobile support
- **Email Operations**: Read, send, reply, delete, star/unstar, mark read/unread
- **Attachment Support**: View and download email attachments
- **Search & Filter**: Search emails and filter by mailbox
- **Secure Token Storage**: HttpOnly secure cookies for refresh tokens

## 📋 Table of Contents

- [Setup & Run Locally](#setup--run-locally)
- [Deployed Public URLs](#deployed-public-urls)
- [Google OAuth Credentials Setup](#google-oauth-credentials-setup)
- [Token Storage & Security](#token-storage--security)
- [Token Expiry Simulation](#token-expiry-simulation)
- [Project Structure](#project-structure)
- [API Endpoints](#api-endpoints)
- [Environment Variables](#environment-variables)

---

## 🛠️ Setup & Run Locally

### Prerequisites

- Node.js (v18 or higher)
- npm or yarn
- A Supabase account (for user database)
- A Google Cloud Console account (for Gmail API)

### 1. Clone the Repository

```bash
git clone https://github.com/cyanpororo/G04-React-Email-Client.git
cd G04-React-Email-Client
```

### 2. Backend Setup

#### Install Dependencies

```bash
cd backend
npm install
```

#### Configure Environment Variables

Create a `.env` file in the `backend` directory.

**Important:** Change the JWT secrets to strong, random strings in production.

#### Start the Backend Server

```bash
npm run start:dev
```

The backend will run on `http://localhost:3000`

### 3. Frontend Setup

#### Install Dependencies

```bash
cd frontend
npm install
```

#### Configure Environment Variables

Create a `.env` file in the `frontend` directory.

#### Start the Frontend Development Server

```bash
npm run dev
```

The frontend will run on `http://localhost:5173`

### 4. Database Setup

#### Create Supabase Tables

Run the given SQL in your Supabase SQL editor.

---

## 🌐 Deployed Public URLs

### Frontend
- **Production URL**: `https://react-email-client-awad.onrender.com`

### Backend
- **Production API**: `https://react-email-client-awad.up.railway.app`

---

## 🔑 Google OAuth Credentials Setup

### Step 1: Create a Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Click **Select a project** → **New Project**
3. Enter project name (e.g., "React Email Client")
4. Click **Create**

### Step 2: Enable Gmail API

1. In your project, go to **APIs & Services** → **Library**
2. Search for "Gmail API"
3. Click on it and press **Enable**

### Step 3: Configure OAuth Consent Screen

1. Go to **APIs & Services** → **OAuth consent screen**
2. Select **External** user type (or Internal if using Google Workspace)
3. Click **Create**
4. Fill in the required fields:
   - **App name**: React Email Client
   - **User support email**: Your email
   - **Developer contact information**: Your email
5. Click **Save and Continue**
6. On the **Scopes** page, click **Add or Remove Scopes**
7. Add the following scopes:
   - `https://www.googleapis.com/auth/gmail.readonly` (Read emails)
   - `https://www.googleapis.com/auth/gmail.send` (Send emails)
   - `https://www.googleapis.com/auth/gmail.modify` (Modify emails - star, read/unread)
   - `https://www.googleapis.com/auth/userinfo.email` (User email)
   - `https://www.googleapis.com/auth/userinfo.profile` (User profile)
8. Click **Save and Continue**
9. Add test users (your Gmail account) if using External user type
10. Click **Save and Continue**

### Step 4: Create OAuth2 Credentials

1. Go to **APIs & Services** → **Credentials**
2. Click **Create Credentials** → **OAuth client ID**
3. Select **Application type**: Web application
4. Enter a name (e.g., "React Email Client Web")
5. Add **Authorized JavaScript origins**:
   - `http://localhost:5173` (for local development)
   - `https://your-frontend-url.vercel.app` (for production)
6. Add **Authorized redirect URIs**:
   - `http://localhost:5173/oauth/callback` (for local development)
   - `https://your-frontend-url.vercel.app/oauth/callback` (for production)
7. Click **Create**
8. Copy the **Client ID** and **Client Secret**
9. Add them to your `.env` files (both frontend and backend)

### Step 5: Configure Redirect URIs

The application uses the following redirect URI flow:

1. User clicks "Connect Gmail" in the frontend
2. Backend generates an OAuth URL with the redirect URI: `GOOGLE_REDIRECT_URI`
3. User authorizes the app on Google's consent screen
4. Google redirects back to: `http://localhost:5173/oauth/callback` (or your production URL)
5. Frontend captures the authorization code and sends it to the backend
6. Backend exchanges the code for access & refresh tokens
7. Refresh token is stored securely (see [Token Storage](#token-storage--security))

**Important:** Make sure the `GOOGLE_REDIRECT_URI` in your backend `.env` matches exactly one of the authorized redirect URIs in Google Cloud Console.

---

## 🔒 Token Storage & Security

### Overview

This application implements a secure token storage strategy using a combination of **HttpOnly cookies** and **in-memory storage** to balance security with functionality.

### Token Types

1. **Access Token** (JWT)
   - **Lifespan**: 15 minutes
   - **Purpose**: Authenticates API requests
   - **Storage**: Frontend memory (React state/context)
   - **Security**: Short-lived, reduces impact of token theft

2. **Refresh Token** (JWT)
   - **Lifespan**: 7 days
   - **Purpose**: Obtains new access tokens without re-authentication
   - **Storage**: HttpOnly Secure cookie
   - **Security**: Cannot be accessed by JavaScript (XSS protection)

3. **Gmail Refresh Token** (OAuth2)
   - **Lifespan**: Long-lived (until revoked)
   - **Purpose**: Accesses Gmail API without re-authorization
   - **Storage**: Supabase database (encrypted in transit)
   - **Security**: Stored server-side, never exposed to client

### Security Considerations

#### ✅ Implemented Protections

1. **XSS Protection**
   - Refresh tokens stored in HttpOnly cookies (inaccessible to scripts)
   - Access tokens short-lived (15 minutes)
   - CSP headers can be added

2. **CSRF Protection**
   - `sameSite: 'strict'` cookie attribute
   - CORS configured to allow only frontend origin

3. **Token Rotation**
   - Access tokens refreshed automatically when expired
   - Refresh endpoint validates old refresh token

4. **Secure Transmission**
   - All tokens transmitted over HTTPS in production
   - `secure: true` flag on cookies ensures HTTPS-only

5. **Database Security**
   - Gmail refresh tokens stored server-side only
   - User passwords hashed with bcrypt
   - Environment variables for sensitive data

#### ⚠️ Trade-offs

1. **HttpOnly Cookies vs LocalStorage**
   - **LocalStorage**: Vulnerable to XSS attacks (JavaScript can access)
   - **HttpOnly Cookies**: Immune to XSS but requires proper CSRF protection

2. **Access Token in Memory**
   - Lost on page refresh (requires refresh flow)
   - More secure than persistent storage

3. **Gmail Token Storage**
   - Stored in database for persistence (user doesn't need to re-authorize)
   - Could be encrypted at rest for additional security (not implemented)

### Token Refresh Flow

```
1. Frontend makes API request with access token
2. Backend returns 401 if token expired
3. Frontend calls /auth/refresh with HttpOnly cookie
4. Backend validates refresh token
5. Backend returns new access token
6. Frontend retries original request with new token
```

---

## ⏱️ Token Expiry Simulation

To demonstrate token refresh functionality and test the authentication flow, this application uses **short-lived access tokens** that expire quickly.

### How to Simulate Token Expiry for Demo

#### Method 1: Reduce Access Token Expiry (Recommended for Demo)

Modify `auth.constants.ts` to make access tokens expire very quickly.

**Testing Steps:**
1. Login to the application
2. Wait 30 seconds
3. Perform any action (e.g., fetch emails, send email)
4. Observe the token refresh flow in browser DevTools Network tab
5. You should see:
   - Initial request fails with 401
   - Automatic call to `/auth/refresh`
   - Original request retried with new token
   - Action completes successfully

#### Method 2: Manual Token Expiry (For Testing Error Handling)

You can also test expired token handling by:

1. **Clear Refresh Token Cookie**:
   This simulates a scenario where the refresh token is missing.

2. **Wait for Access Token to Expire**:
   - Login and wait 15+ minutes (or 30 seconds if using Method 1)
   - Try to perform an action
   - Should trigger refresh → fail → redirect to login

3. **Use Invalid Token**:
   - Manually modify the stored access token in memory (using React DevTools)
   - Try to perform an action
   - Should trigger token refresh flow

### Observable Behaviors

When testing token expiry, you should observe:

1. **Successful Refresh** (when refresh token is valid):
   ```
   → GET /gmail/emails (401 Unauthorized)
   → POST /auth/refresh (200 OK) - returns new access token
   → GET /gmail/emails (200 OK) - retries with new token
   ```

2. **Failed Refresh** (when refresh token is invalid/expired):
   ```
   → GET /gmail/emails (401 Unauthorized)
   → POST /auth/refresh (401 Unauthorized)
   → Redirect to /login
   ```

3. **Network Tab Evidence**:
   - Check "Authorization" header in request headers
   - Compare token values before and after refresh
   - Verify new access token is used after refresh

### Production Recommendations

For production deployment:

- **Access Token**: 15-30 minutes (balance between security and UX)
- **Refresh Token**: 7-30 days (or longer for "remember me" functionality)
- **Implement Token Rotation**: Issue new refresh token on each refresh (optional)
- **Add Monitoring**: Log token refresh events for security analysis

---

## 📄 License

This project is for educational purposes.

---

## 👨‍💻 Author

Built as part of Web Advanced coursework (GA04).

---

## 🙏 Acknowledgements

- [NestJS](https://nestjs.com/) - Backend framework
- [React](https://react.dev/) - Frontend library
- [Gmail API](https://developers.google.com/gmail/api) - Email integration
- [Supabase](https://supabase.com/) - Database
- [Vite](https://vitejs.dev/) - Build tool
