# Final project Self-assessment report

Team: 21120410 - 22120098

GitHub repo URL: https://github.com/cyanpororo/Email-Client-AI

# **TEAM INFORMATION**

| Student ID | Full name | Git account | Contribution | Contribution percentage | Expected total points | Final total points |
| :---- | :---- | :---- | :---- | :---- | :---- | :---- |
| 21120410 | Nguyen Tuan Anh | ntanh0901 | • Kanban column management<br>• Fuzzy search implementation<br>• AI-powered email summarization service<br>• Offline support implementation (IndexedDB & service worker)<br>• Email client UI components (mailbox & compose modal)<br>• Responsive design enhancements<br>• Rate limiting & API error handling | 50% | 10.75 |  |
| 22120098 | Phan Anh Hao | cyanpororo | • Semantic search with vector embeddings<br>• Intelligent auto-suggestion system<br>• Kanban drag-and-drop, sorting & filtering<br>• Gmail API integration & OAuth configuration<br>• Attachment handling (viewing & downloading)<br>• Authentication & token management<br>• Documentation & deployment setup | 50% | 10.75 |  |

# **FEATURE LIST**

**Project:** React Email Client with Gmail Integration & AI-Powered Kanban

Students must input minus points to every uncompleted feature in the SE column.

\*SE: Self-evaluation

\*TR: Teacher review

| ID | Features | Grade |  |  | Notes |
| ----- | :---- | ----- | :---- | :---- | :---- |
|  |  | **Point** | **SE\*** | **TR\*** |  |
| **1** | **Overall requirements** |  |  |  |  |
|  | User-centered design | \-5 | \-0 |  | Built with user experience in mind. Kanban-style email management, AI summarization, semantic search for efficient email workflow |
|  | Database design | \-1 | \-0 |  | Database with tables: users, emails, email_vectors, kanban_columns, snooze_schedules, labels |
|  | Database mock data | \-1 | \-0 |  | Sample emails, kanban configurations, and test data |
|  | Website layout | \-2 | \-0 |  | 3-column layout: mailbox list, email list, email detail. Kanban board view |
|  | Website architect | \-3 | \-0 |  | React SPA with backend API. Clear separation of concerns. OAuth2 flow, token handling |
|  | Website stability and compatibility | \-4 | \-0 |  | Responsive design, tested on Chrome, Safari, Firefox, and Edge |
|  | Document | \-2 | \-0 |  | README with setup guide, API endpoints, Google OAuth setup, token storage explanation, security considerations |
|  | Demo video | \-5 | \-0 |  | Video demonstrating: Gmail login, inbox sync, Kanban board, AI summarization, semantic search, drag-drop |
|  | Publish to public hosts | \-1 | \-0 |  | Frontend deployed (Netlify/Vercel), Backend deployed (Render/Railway/Cloud Run) |
|  | Development progress is recorded in Github | \-7 | \-0 |  | Git history with meaningful commits, branches for features, pull requests |
| **2** | **Authentication & Token Management** |  |  |  |  |
|  | Google OAuth 2.0 integration | \-0.5 | \-0 |  | Login with Google, grant Gmail access permissions |
|  | Authorization Code flow | \-0.5 | \-0 |  | Backend exchanges code for tokens, stores refresh token securely |
|  | Token storage & security | \-0.5 | \-0 |  | Access token in-memory (frontend), refresh token server-side only |
|  | Automatic token refresh | \-0.5 | \-0 |  | Backend refreshes expired access tokens automatically |
|  | Concurrency handling | \-0.25 | \-0 |  | Single refresh request when multiple 401s occur |
|  | Forced logout on invalid refresh | \-0.25 | \-0 |  | Clear tokens and logout if refresh token fails |
|  | Logout & token cleanup | \-0.25 | \-0 |  | Clear all tokens server-side and client-side on logout |
| **3** | **Email Synchronization & Display** |  |  |  |  |
|  | Fetch emails from Gmail | \-0.5 | \-0 |  | Use Gmail API to fetch inbox emails |
|  | Email list with pagination | \-0.25 | \-0 |  | Paginated/virtualized email list |
|  | Email detail view | \-0.25 | \-0 |  | Full email content with HTML/plain text support |
|  | Mailbox/Labels list | \-0.25 | \-0 |  | Display Gmail labels/folders in sidebar |
|  | Open in Gmail link | \-0.25 | \-0 |  | Button/icon to open email in Gmail |
| **4** | **Kanban Board Interface** |  |  |  |  |
|  | Kanban board layout | \-0.5 | \-0 |  | Board with columns: Inbox, To Do, Done, etc. |
|  | Email cards display | \-0.25 | \-0 |  | Cards showing sender, subject, snippet |
|  | Drag-and-drop between columns | \-0.5 | \-0 |  | Drag cards to change email status |
|  | Status persistence | \-0.25 | \-0 |  | Status changes saved and persisted |
|  | Dynamic Kanban Configuration |  |  |  |  |
|  | › Settings interface | \-0.25 | \-0 |  | Modal/page to create, rename, delete columns |
|  | › Configuration persistence | \-0.25 | \-0 |  | Custom columns saved and restored after reload |
|  | › Gmail label mapping | \-0.5 | \-0 |  | Columns map to Gmail labels, moving cards syncs labels |
| **5** | **Snooze Mechanism** |  |  |  |  |
|  | Select snooze time | \-0.25 | \-0 |  | Choose snooze duration (Tomorrow, Next week, custom) |
|  | Hide snoozed emails | \-0.25 | \-0 |  | Email disappears from Kanban after snooze |
|  | Auto-return on schedule | \-0.5 | \-0 |  | Email automatically returns to board at scheduled time |
| **6** | **AI Features** |  |  |  |  |
|  | AI Summarization |  |  |  |  |
|  | › Backend summarization API | \-0.5 | \-0 |  | LLM integration (OpenAI/Gemini) to summarize email content |
|  | › Summary UI on cards | \-0.25 | \-0 |  | Display 2-3 line summary on email cards |
|  | Text Embedding |  |  |  |  |
|  | › Embedding generation | \-0.5 | \-0 |  | Generate vector embeddings for emails using embedding model |
|  | › Vector database storage | \-0.5 | \-0 |  | Store embeddings in vector database (pgvector, etc.) |
| **7** | **Search Features** |  |  |  |  |
|  | Fuzzy Search (Backend) |  |  |  |  |
|  | › Typo tolerance | \-0.5 | \-0 |  | "marketng" finds "marketing" |
|  | › Partial matches | \-0.5 | \-0 |  | "Nguy" finds "Nguyen Van A" |
|  | › Relevance ranking | \-0.25 | \-0 |  | Best matches ranked first |
|  | Fuzzy Search UI (Frontend) |  |  |  |  |
|  | › Search bar integration | \-0.25 | \-0 |  | Search bar in header/main UI |
|  | › Search results as cards | \-0.25 | \-0 |  | Results displayed as email cards with sender, subject, snippet |
|  | › Loading/empty/error states | \-0.25 | \-0 |  | Handle UX states properly |
|  | › Navigation back to main view | \-0.25 | \-0 |  | Clear way to return to Kanban view |
|  | Semantic Search |  |  |  |  |
|  | › Conceptual relevance search | \-0.5 | \-0 |  | Query "money" finds "invoice", "price", "salary" |
|  | › Semantic search API endpoint | \-0.25 | \-0 |  | POST /api/search/semantic endpoint |
|  | Search Auto-Suggestion |  |  |  |  |
|  | › Type-ahead dropdown | \-0.25 | \-0 |  | Dropdown appears while typing with 3-5 suggestions |
|  | › Suggestions from contacts/keywords | \-0.25 | \-0 |  | Suggestions populated from sender names, subject keywords |
|  | › Trigger search on selection | \-0.25 | \-0 |  | Clicking suggestion triggers semantic search |
| **8** | **Filtering & Sorting** |  |  |  |  |
|  | Sort by date (newest/oldest) | \-0.25 | \-0 |  | At least two sorting options |
|  | Filter by unread | \-0.25 | \-0 |  | Show only unread emails |
|  | Filter by attachments | \-0.25 | \-0 |  | Show only emails with attachments |
|  | Real-time filter updates | \-0.25 | \-0 |  | Changes apply immediately without page reload |
| **9** | **Email Actions** |  |  |  |  |
|  | Mark as read/unread | \-0.25 | \-0 |  | Toggle read status via Gmail API |
|  | Compose modal | \-0.25 | \-0 |  | Modal to compose new email |
|  | Reply/Forward flow | \-0.25 | \-0 |  | Reply to and forward emails |
|  | Send via Gmail API | \-0.25 | \-0 |  | Send emails through Gmail API |
|  | View attachments | \-0.25 | \-0 |  | Display attachments in email detail |
|  | Download attachments | \-0.25 | \-0 |  | Download attachment files |
|  | Delete emails | \-0.25 | \-0 |  | Move to trash via Gmail API |
| **10** | **Advanced features** |  |  |  |  |
|  | Gmail Push Notifications | 0.25 | 0 |  | Real-time inbox updates via Gmail watch + Pub/Sub |
|  | Multi-tab logout sync | 0.25 | 0.25 |  | BroadcastChannel for logout sync across tabs |
|  | Offline caching | 0.25 | 0.25 |  | IndexedDB + stale-while-revalidate for emails |
|  | Keyboard navigation | 0.25 | 0.25 |  | Navigate emails with keyboard shortcuts |
|  | Dockerize your project | 0.25 | 0 |  | Docker containers for backend, frontend |
|  | CI/CD | 0.25 | 0 |  | Automated testing and deployment pipeline |

# **GIT HISTORY**

## **Significant Commits**

**Note:** For the complete commit history with all details, please refer to the **Teamwork Report**. Below are the most significant feature commits:

| Date | Author | Commit Message | Feature Area |
| :---- | :---- | :---- | :---- |
| 2026-01-17 | ntanh0901 | feat: integrate rate limiting with throttler for API endpoints and enhance error handling | Backend Infrastructure |
| 2026-01-15 | cyanpororo | feat: add attachment handling to the compose modal | Email Actions |
| 2025-12-23 | ntanh0901 | feat: implement Kanban column management functionality | Kanban Configuration |
| 2025-12-19 | cyanpororo | feat: implement intelligent auto-suggestion for email search | Search Features |
| 2025-12-19 | cyanpororo | feat: implement semantic search with embeddings on backend | AI & Search |
| 2025-12-16 | ntanh0901 | feat: add fuzzy email search functionality and integrate with inbox view | Search Features |
| 2025-12-09 | ntanh0901 | feat: add email summarization service and integrate with workflow for AI-generated summaries | AI Features |
| 2025-12-07 | cyanpororo | feat: implement kanban view and card drag-drop function | Kanban Core |
| 2025-12-03 | ntanh0901 | feat: Implement IndexedDB caching for offline support | Advanced Features |
| 2025-11-29 | cyanpororo | feat: store refresh tokens in HttpOnly Secure cookies | Authentication |
| 2025-11-29 | cyanpororo | feat: implement email client with gmail integration | Core Infrastructure |

---

# **PROJECT SUMMARY**

## System Overview
**React Email Client with Gmail Integration** is a web-based email client that transforms Gmail into a Kanban-style productivity tool:
- Gmail OAuth2 authentication with secure token handling
- Kanban board interface for email workflow management (Inbox, To Do, Done)
- AI-powered email summarization using LLM (OpenAI/Gemini)
- Snooze mechanism to temporarily hide and auto-return emails
- Fuzzy search with typo tolerance and partial matching
- Semantic search using vector embeddings for conceptual relevance
- Dynamic Kanban configuration with Gmail label mapping
- Full email actions: compose, reply, forward, delete, attachments

## Technology Stack
- **Architecture:** React SPA + Backend API (Node.js)
- **Frontend:** React, react-window (virtualization), drag-and-drop library
- **Backend:** Node.js with Express
- **Database:** PostgreSQL with pgvector for embeddings
- **Authentication:** Google OAuth2 (Authorization Code flow)
- **AI/ML:** OpenAI API or Gemini API for summarization and embeddings
- **Email:** Gmail REST API
- **Vector Search:** pgvector or similar vector database
- **Deployment:** Frontend (Netlify/Vercel), Backend (Render/Railway/Cloud Run)

## API Endpoints
| Endpoint | Description |
| :---- | :---- |
| POST /api/auth/google/callback | Exchange Google auth code for tokens |
| POST /api/auth/logout | Clear all tokens and logout |
| GET /api/mailboxes | List Gmail labels/folders |
| GET /api/mailboxes/:id/emails | List emails in mailbox with pagination |
| GET /api/emails/:id | Get email detail |
| POST /api/emails/send | Send new email |
| POST /api/emails/:id/reply | Reply to email |
| POST /api/emails/:id/modify | Mark read/unread, star, delete |
| GET /api/attachments/:id | Stream attachment |
| POST /api/search/fuzzy | Fuzzy search emails |
| POST /api/search/semantic | Semantic search with embeddings |
| GET /api/kanban/columns | Get Kanban column configuration |
| POST /api/kanban/columns | Create/update columns |
| POST /api/emails/:id/snooze | Snooze email |

## Key User Flows
1. **Authentication:** Google Sign-In → Backend token exchange → Session created → Redirect to Kanban
2. **Email Sync:** Login → Fetch Gmail inbox → Display as Kanban cards → Real-time updates
3. **Kanban Workflow:** View cards → Drag to columns → Status synced → Gmail labels updated
4. **AI Summary:** Email synced → LLM summarizes → Summary displayed on card
5. **Semantic Search:** User types query → Embedding generated → Vector search → Related emails returned
6. **Snooze:** Select email → Choose snooze time → Email hidden → Auto-returns at scheduled time

## Development Timeline
| Week | Focus | Key Deliverables |
| :---- | :---- | :---- |
| Week 1 | Basic Application | Gmail OAuth, email sync, Kanban interface with cards |
| Week 2 | Core Workflow & AI | Drag-and-drop, snooze mechanism, AI summarization |
| Week 3 | Fuzzy Search & Filtering | Fuzzy search (BE+FE), sorting, filtering on Kanban |
| Week 4 | Semantic Search & Config | Vector embeddings, semantic search, dynamic Kanban config |
| Week 5 | Deployment & Deliverables | Testing, deployment, demo video |

## Security Considerations
- **Access Token:** Stored in-memory on frontend only
- **Refresh Token:** Stored server-side in secure datastore (never exposed to frontend)
- **OAuth Flow:** Authorization Code flow (not implicit) for security
- **Token Refresh:** Handled server-side with concurrency protection
- **Logout:** Clears all tokens and optionally revokes OAuth refresh token

---

# **EVIDENCE & PROOF**

**Note:** For visualized evidence of all features in action, please refer to the **Demo Video**. This section provides summarized code-based evidence from the codebase.

---

## **1. Overall Requirements**

- **User-centered design:** Kanban UI (`KanbanBoard.tsx`, 406 lines), AI-powered features, 3-column responsive layout
- **Database:** PostgreSQL with 6 tables (`users`, `emails`, `email_vectors`, `kanban_columns`, `snooze_schedules`, `labels`), pgvector extension
- **Layout:** 3-column interface (`Inbox.tsx`, `MailboxSidebar.tsx`, `EmailListView.tsx`, `EmailDetail.tsx`)
- **Architecture:** React SPA (34+ components, 10 custom hooks) + NestJS backend (modular: auth, gmail, workflow modules)
- **Stability:** Error handling (`errorHandler.ts`), offline support, cross-browser tested, responsive design
- **Documentation:** Comprehensive README.md (290 lines): setup, OAuth config, API endpoints, security
- **Deployment:** Frontend & Backend deployed on Render
- **Git History:** 50+ commits, 10 feature branches with PRs, conventional commits, 2 active contributors

## **2. Authentication & Token Management**


- **OAuth 2.0:** Gmail OAuth endpoints (`gmail.controller.ts`), Authorization Code flow, scopes configured
- **Token Security:** Access token in-memory (`AuthContext.tsx`), refresh token in httpOnly cookie (`auth.controller.ts`)
- **Auto-refresh:** Endpoint `/api/auth/refresh`, handles expired tokens, concurrency protection
- **Logout:** Clears cookies, invalidates session, syncs across tabs via BroadcastChannel

## **3. Email Synchronization & Display**

- **Gmail Integration:** Gmail API v1 (`gmail.service.ts`), endpoint `/api/gmail/mailboxes/:id/emails`
- **Pagination:** PageToken support, virtual scrolling with react-window
- **Email Detail:** Full view (`EmailDetail.tsx`, 10.5KB), DOMPurify sanitization, metadata display
- **Mailbox List:** Sidebar (`MailboxSidebar.tsx`), label sync with counts
- **Open in Gmail:** Direct link to Gmail web interface

## **4. Kanban Board Interface**

- **Board Layout:** `KanbanBoard.tsx` (406 lines), default columns (Inbox, To Do, In Progress, Done)
- **Email Cards:** `KanbanCard.tsx` (6.8KB), displays sender, subject, snippet, AI summary, status indicators
- **Drag-and-Drop:** `@dnd-kit` library, `handleDragEnd()` handler
- **Persistence:** Workflow service (`workflow.service.ts`), endpoint `/api/workflow/:msgId`
- **Dynamic Config:** Settings modal (`KanbanSettings.tsx`, 19.6KB), column CRUD operations (`kanban-column.service.ts`, 297 lines), 5 API endpoints
- **Gmail Label Sync:** Columns map to Gmail labels, updates sync via API

## **5. Snooze Mechanism**

- **Snooze UI:** Modal (`SnoozeModal.tsx`, 5.9KB), presets (Tomorrow, Next week), custom date/time picker, timezone handling
- **Hide Logic:** Workflow filtering in `KanbanBoard.tsx`, backend checks `snoozed_until`
- **Auto-Return:** Scheduler service (`workflow.service.ts`), timestamp storage, frontend polling

## **6. AI Features**

- **AI Summarization:** Perplexity API service (`summarization.service.ts`, 84 lines), endpoint `/api/workflow/:msgId/summary`, 2-3 bullet points format, UI in `KanbanCard.tsx`
- **Embeddings:** Mistral AI model (`embedding.service.ts`), combines subject+body, batch support
- **Vector Storage:** pgvector extension, `email_vectors` table, semantic search service (`semantic-search.service.ts`, 467 lines), duplicate prevention

## **7. Search Features**

- **Fuzzy Search:** Fuse.js integration (`gmail.service.ts`), typo tolerance (threshold 0.4), partial matches, score ranking
- **Fuzzy UI:** Search bar (`InboxHeader.tsx`, 13.7KB), search hook (`useInboxSearch.ts`), results component (`SearchResults.tsx`, 7.9KB), loading/empty/error states
- **Semantic Search:** Vector similarity (`semantic-search.service.ts`), pgvector cosine matching, threshold 0.5, endpoint `/api/gmail/search/semantic`, fuzzy fallback
- **Auto-Suggestions:** Dropdown component (`SearchSuggestions.tsx`), backend `getSearchSuggestions()`, hook (`useSearchSuggestions.ts`, 3.9KB), keyboard navigation

## **8. Filtering & Sorting**

- **Sort:** Controls in `InboxHeader.tsx`, by `internalDate` (newest/oldest)
- **Filters:** Unread (`labelIds` check), attachments (payload.parts), real-time React state updates

## **9. Email Actions**

- **Read/Unread:** Endpoints `/api/gmail/emails/:id/read|unread`, mutations (`useOfflineEmails.ts`), optimistic updates
- **Compose:** Modal (`ComposeModal.tsx`, 10.7KB), rich text editor, To/Cc/Bcc fields, attachment support
- **Reply/Forward:** Flow hook (`useComposeFlow.ts`, 6.7KB), pre-filled fields
- **Send:** Gmail API endpoint `/api/gmail/emails/send`, MIME construction, Base64 encoding
- **Attachments:** View in `EmailDetail.tsx`, download endpoint `/api/gmail/emails/:msgId/attachments/:attId`
- **Delete:** Endpoint `/api/gmail/emails/:id/delete`, optimistic UI updates
