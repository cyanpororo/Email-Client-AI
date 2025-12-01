# React Email Client with Gmail API Integration

A full-stack email client application built with React and NestJS that integrates with Gmail API for real email functionality.

## Features

✅ **Gmail API Integration** - Real email access via Google OAuth2
✅ **Secure Authentication** - JWT-based auth with refresh token storage in database
✅ **3-Column Responsive UI** - Mailboxes, email list, and email detail views
✅ **Email Operations** - Read, send, reply, delete, star, and manage labels
✅ **Attachment Support** - Download and view email attachments
✅ **Keyboard Navigation** - Vim-style shortcuts (j/k, r, s, c, etc.)
✅ **Offline Support** - Cached data with stale-while-revalidate strategy
✅ **Token Management** - Automatic token refresh with concurrency protection
✅ **Mobile Responsive** - Optimized for all screen sizes

## Architecture

### Backend (NestJS)
- **Gmail Service**: Handles OAuth2 flow and Gmail API operations
- **Auth Service**: JWT-based authentication with Supabase
- **Token Storage**: Refresh tokens stored securely in Supabase database
- **API Endpoints**: RESTful API for frontend consumption

### Frontend (React + Vite)
- **Gmail API Client**: Axios-based client with automatic token refresh
- **React Query**: Data fetching with caching and background updates
- **Responsive Design**: Mobile-first with 3-column desktop layout
- **Offline-First**: IndexedDB caching via React Query

## Prerequisites

- Node.js 18+ and npm
- Google Cloud Platform account
- Supabase account (for database)
- Gmail account for testing

## Setup Instructions

### 1. Google Cloud Platform Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Enable Gmail API:
   - Navigate to "APIs & Services" > "Library"
   - Search for "Gmail API" and click "Enable"
4. Create OAuth 2.0 credentials:
   - Go to "APIs & Services" > "Credentials"
   - Click "Create Credentials" > "OAuth client ID"
   - Choose "Web application"
   - Add authorized redirect URIs:
     - `http://localhost:3000/api/gmail/callback` (development)
     - `https://your-backend-domain.com/api/gmail/callback` (production)
   - Save the Client ID and Client Secret

### 2. Supabase Database Setup

1. Create a Supabase project at [supabase.com](https://supabase.com)
2. Add `gmail_refresh_token` column to users table:

```sql
ALTER TABLE users 
ADD COLUMN gmail_refresh_token TEXT;
```

3. Get your Supabase URL and anon key from project settings

### 3. Backend Setup

1. Navigate to backend directory:
```bash
cd backend
```

2. Install dependencies:
```bash
npm install
```

3. Create `.env` file:
```env
# Server
PORT=3000
NODE_ENV=development

# Frontend URL (for CORS)
FRONTEND_URL=http://localhost:5173

# JWT Secret
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production

# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your-supabase-anon-key

# Gmail OAuth2
GMAIL_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
GMAIL_CLIENT_SECRET=your-google-client-secret
GMAIL_REDIRECT_URI=http://localhost:3000/api/gmail/callback
```

4. Start development server:
```bash
npm run start:dev
```

Backend will run on `http://localhost:3000`

### 4. Frontend Setup

1. Navigate to frontend directory:
```bash
cd frontend
```

2. Install dependencies:
```bash
npm install
```

3. Create `.env` file:
```env
VITE_API_URL=http://localhost:3000
VITE_GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
```

4. Start development server:
```bash
npm run dev
```

Frontend will run on `http://localhost:5173`

## Usage

### First Time Setup

1. Open `http://localhost:5173` in your browser
2. Sign up for an account or log in
3. Click "Connect Gmail Account"
4. Authorize the application to access your Gmail
5. You'll be redirected back to the inbox with your real emails!

### Email Operations

- **Navigate**: Use ↑/↓ arrow keys or j/k (Vim-style)
- **Compose**: Press 'c' or click "Compose" button
- **Reply**: Press 'r' or click "Reply" button
- **Star**: Press 's' or click the star icon
- **Delete**: Press Delete key or click "Delete" button
- **Mark Read/Unread**: Click the action button in email detail

## API Endpoints

### Authentication
- `POST /api/auth/signup` - Create new account
- `POST /api/auth/login` - Login with email/password
- `POST /api/auth/google` - Login with Google
- `POST /api/auth/logout` - Logout

### Gmail
- `GET /api/gmail/auth` - Get OAuth authorization URL
- `GET /api/gmail/callback` - OAuth callback handler
- `POST /api/gmail/connect` - Connect Gmail with auth code
- `POST /api/gmail/disconnect` - Disconnect Gmail
- `GET /api/gmail/mailboxes` - Get all labels/mailboxes
- `GET /api/gmail/mailboxes/:id/emails` - Get emails from mailbox
- `GET /api/gmail/emails/:id` - Get single email
- `POST /api/gmail/emails/send` - Send new email
- `POST /api/gmail/emails/:id/reply` - Reply to email
- `POST /api/gmail/emails/:id/read` - Mark as read
- `POST /api/gmail/emails/:id/unread` - Mark as unread
- `POST /api/gmail/emails/:id/star` - Toggle star
- `POST /api/gmail/emails/:id/delete` - Delete email
- `GET /api/gmail/emails/:messageId/attachments/:attachmentId` - Download attachment

## Security Considerations

### Token Storage
- **Access Tokens**: Stored in-memory on frontend (never in localStorage)
- **Refresh Tokens**: Stored server-side in Supabase database
- **Gmail Refresh Tokens**: Stored encrypted in database, never sent to frontend

### OAuth2 Flow
1. Frontend requests auth URL from backend
2. User authorizes on Google's servers
3. Google redirects to backend callback with authorization code
4. Backend exchanges code for tokens
5. Backend stores refresh token in database
6. Frontend receives session token only

### CORS & Security Headers
- CORS configured to allow only frontend origin
- Helmet.js for security headers
- Rate limiting on authentication endpoints
- JWT tokens with short expiration (15 minutes)

## Deployment

### Backend Deployment (Railway/Render/Heroku)

1. Set environment variables in platform dashboard
2. Update `GMAIL_REDIRECT_URI` to production URL
3. Add production URL to Google OAuth allowed redirect URIs
4. Deploy:

```bash
# Build
npm run build

# Start
npm run start:prod
```

### Frontend Deployment (Vercel/Netlify)

1. Set environment variables:
   - `VITE_API_URL=https://your-backend-url.com`
   - `VITE_GOOGLE_CLIENT_ID=your-client-id`

2. Build and deploy:

```bash
npm run build
```

3. Configure redirects for SPA routing (Vercel example):

```json
{
  "rewrites": [
    { "source": "/(.*)", "destination": "/index.html" }
  ]
}
```

## Testing

### Simulating Token Expiry

To test token refresh logic:

1. Set short JWT expiration in backend `.env`:
```env
JWT_EXPIRATION=1m
```

2. Make API calls after 1 minute
3. Observe automatic token refresh in Network tab

### Testing Gmail Connection

1. Use a real Gmail account for testing
2. Revoke access in [Google Account Settings](https://myaccount.google.com/permissions)
3. Reconnect to test OAuth flow
4. Check that refresh token is stored in database

## Troubleshooting

### "Gmail not connected" Error
- Check that Gmail API is enabled in Google Cloud Console
- Verify OAuth credentials are correct in `.env`
- Ensure redirect URI matches exactly (including http/https)
- Check database for stored refresh token

### Token Refresh Fails
- Verify refresh token exists in database
- Check that token hasn't been revoked in Google Account
- Ensure OAuth scopes haven't changed
- Try disconnecting and reconnecting Gmail

### CORS Errors
- Verify `FRONTEND_URL` in backend `.env` matches frontend URL
- Check that CORS is enabled in `main.ts`
- Ensure credentials are included in frontend requests

## Tech Stack

### Backend
- NestJS - Node.js framework
- TypeScript - Type safety
- Supabase - PostgreSQL database
- Passport JWT - Authentication
- Google APIs - Gmail integration

### Frontend
- React 18 - UI library
- TypeScript - Type safety
- Vite - Build tool
- React Query - Data fetching
- Axios - HTTP client
- React Router - Routing
- Tailwind CSS - Styling

## License

MIT

## Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

## Support

For issues and questions:
- Open an issue on GitHub
- Check existing issues for solutions
- Review Google Gmail API documentation

## Acknowledgments

- Gmail API documentation
- NestJS documentation
- React Query documentation
- Supabase community