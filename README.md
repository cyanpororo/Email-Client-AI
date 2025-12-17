# Email Client AI – Advanced Web Application Development – Final Project

## Deployment
- **Frontend:** https://email-client-ai-awad.onrender.com 
- **Backend:** https://backend-email-client-ai-awad.onrender.com

---

## Project Summary
A modern **React-based Email Client** integrated with **Gmail** and enhanced by **AI-powered features**.  
The application focuses on productivity and user experience through a **Kanban-style email workflow**, **AI summarization**, and **semantic search**, enabling users to efficiently manage, organize, and understand their emails.

---

## Feature Summary

### 1. Core Application & Architecture
- User-centered UI with Kanban-based email management
- Three-column responsive layout (mailboxes, email list, email details)
- React SPA with clean frontend–backend separation
- Secure OAuth2 authentication flow
- Cross-browser compatibility and stable performance
- Comprehensive documentation and demo video
- Public deployment for frontend and backend
- Development progress tracked via GitHub

### 2. Authentication & Security
- Google OAuth 2.0 login with Gmail permissions
- Authorization Code flow handled by backend
- Secure token storage (refresh tokens server-side only)
- Automatic access token refresh
- Concurrency-safe token refresh handling
- Forced logout on invalid tokens
- Proper logout and token cleanup

### 3. Email Synchronization & Display
- Gmail API integration for inbox synchronization
- Paginated and efficient email list rendering
- Full email content display (HTML and plain text)
- Gmail labels and mailboxes sidebar
- Direct “Open in Gmail” functionality

### 4. Kanban Board Email Management
- Kanban board with customizable columns (Inbox, To Do, Done, etc.)
- Email cards displaying sender, subject, and snippet
- Drag-and-drop email movement between columns
- Persistent email status storage
- Dynamic Kanban configuration (create, rename, delete columns)
- Gmail label synchronization with Kanban columns

### 5. Snooze Functionality
- Snooze emails with preset or custom times
- Automatically hide snoozed emails
- Auto-return emails to the board when snooze expires

### 6. AI-Powered Features
- AI-generated email summaries via backend LLM integration
- Short summaries displayed on email cards
- Text embedding generation for emails
- Vector database storage for semantic operations

### 7. Search Capabilities
- Backend fuzzy search with typo tolerance and relevance ranking
- Frontend search UI with loading, empty, and error states
- Semantic search for conceptual relevance
- Search auto-suggestions from contacts and keywords
- Seamless navigation back to the Kanban view

### 8. Filtering & Sorting
- Sort emails by date (newest/oldest)
- Filter unread emails
- Filter emails with attachments
- Real-time filter updates without page reload

### 9. Email Actions
- Mark emails as read or unread
- Compose new emails in a modal
- Reply and forward existing emails
- Send emails via Gmail API
- View and download attachments
- Delete emails (move to trash)

### 10. Advanced Enhancements
- Real-time Gmail push notifications
- Multi-tab logout synchronization
- Offline caching with IndexedDB
- Keyboard navigation shortcuts
- Dockerized frontend and backend
- CI/CD pipeline for testing and deployment
