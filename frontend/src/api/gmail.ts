// Gmail API Client - Real Gmail integration via backend
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

// Create axios instance with auth interceptor
const gmailApi = axios.create({
    baseURL: API_URL,
    withCredentials: true,
});

// Add auth token to requests
gmailApi.interceptors.request.use((config) => {
    const token = localStorage.getItem('token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

// Concurrency protection: Track in-flight refresh request
let refreshPromise: Promise<string | null> | null = null;

/**
 * Refresh access token using refresh token
 * Implements concurrency guard: only one refresh request at a time
 */
async function refreshAccessToken(): Promise<string | null> {
    try {
        const refreshToken = localStorage.getItem('refreshToken');
        if (!refreshToken) {
            return null;
        }

        const response = await axios.post(`${API_URL}/auth/refresh`, {
            refreshToken,
        });

        const newAccessToken = response.data.accessToken;
        localStorage.setItem('token', newAccessToken);

        // Update refresh token if provided
        if (response.data.refreshToken) {
            localStorage.setItem('refreshToken', response.data.refreshToken);
        }

        return newAccessToken;
    } catch (error) {
        // Refresh failed, clear tokens
        localStorage.removeItem('token');
        localStorage.removeItem('refreshToken');
        return null;
    }
}

// Handle token refresh on 401 with concurrency protection
gmailApi.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error.config;

        // Check if this is a 401 and we haven't already retried
        if (error.response?.status === 401 && !originalRequest._retry) {
            originalRequest._retry = true;

            // If a refresh is already in progress, wait for it
            if (refreshPromise) {
                const newToken = await refreshPromise;
                if (newToken) {
                    originalRequest.headers.Authorization = `Bearer ${newToken}`;
                    return gmailApi(originalRequest);
                } else {
                    // Refresh failed, redirect to login
                    window.location.href = '/login';
                    return Promise.reject(error);
                }
            }

            // Start a new refresh request
            refreshPromise = refreshAccessToken();

            try {
                const newToken = await refreshPromise;

                if (newToken) {
                    // Retry the original request with new token
                    originalRequest.headers.Authorization = `Bearer ${newToken}`;
                    return gmailApi(originalRequest);
                } else {
                    // Refresh failed, redirect to login
                    window.location.href = '/login';
                    return Promise.reject(error);
                }
            } finally {
                // Clear the refresh promise
                refreshPromise = null;
            }
        }

        return Promise.reject(error);
    }
);

// Types matching backend responses
export type GmailLabel = {
    id: string;
    name: string;
    type?: string;
    messagesTotal: number;
    messagesUnread: number;
};

export type GmailEmail = {
    id: string;
    threadId: string;
    labelIds: string[];
    from: {
        name: string;
        email: string;
    };
    to: Array<{
        name: string;
        email: string;
    }>;
    cc?: Array<{
        name: string;
        email: string;
    }>;
    subject: string;
    snippet: string;
    body: string;
    timestamp: string;
    isRead: boolean;
    isStarred: boolean;
    hasAttachments: boolean;
    attachments?: Array<{
        id: string;
        name: string;
        size: number;
        type: string;
    }>;
};

export type GmailEmailsResponse = {
    emails: GmailEmail[];
    nextPageToken?: string;
};

export type SendEmailRequest = {
    to: string[];
    cc?: string[];
    bcc?: string[];
    subject: string;
    body: string;
    inReplyTo?: string;
    references?: string;
};

// API Functions

/**
 * Get Gmail OAuth authorization URL
 */
export async function getGmailAuthUrl(): Promise<string> {
    const response = await gmailApi.get('/api/gmail/auth');
    return response.data.authUrl;
}

/**
 * Connect Gmail account with authorization code
 */
export async function connectGmail(code: string): Promise<void> {
    await gmailApi.post('/api/gmail/connect', { code });
}

/**
 * Disconnect Gmail account
 */
export async function disconnectGmail(): Promise<void> {
    await gmailApi.post('/api/gmail/disconnect');
}

/**
 * Get all Gmail labels (mailboxes)
 */
export async function getGmailLabels(): Promise<GmailLabel[]> {
    const response = await gmailApi.get('/api/gmail/mailboxes');
    return response.data;
}

/**
 * Get emails from a specific label/mailbox
 */
export async function getGmailEmails(
    labelId: string = 'INBOX',
    limit: number = 50,
    pageToken?: string
): Promise<GmailEmailsResponse> {
    const params = new URLSearchParams();
    params.append('limit', limit.toString());
    if (pageToken) {
        params.append('pageToken', pageToken);
    }

    const response = await gmailApi.get(
        `/api/gmail/mailboxes/${labelId}/emails?${params.toString()}`
    );
    return response.data;
}

/**
 * Get a single email by ID
 */
export async function getGmailEmailById(emailId: string): Promise<GmailEmail> {
    const response = await gmailApi.get(`/api/gmail/emails/${emailId}`);
    return response.data;
}

/**
 * Send an email
 */
export async function sendGmailEmail(email: SendEmailRequest): Promise<{ id: string; threadId: string }> {
    const response = await gmailApi.post('/api/gmail/emails/send', email);
    return response.data;
}

/**
 * Reply to an email
 */
export async function replyToGmailEmail(
    emailId: string,
    email: SendEmailRequest
): Promise<{ id: string; threadId: string }> {
    const response = await gmailApi.post(`/api/gmail/emails/${emailId}/reply`, email);
    return response.data;
}

/**
 * Mark email as read
 */
export async function markGmailAsRead(emailId: string): Promise<void> {
    await gmailApi.post(`/api/gmail/emails/${emailId}/read`);
}

/**
 * Mark email as unread
 */
export async function markGmailAsUnread(emailId: string): Promise<void> {
    await gmailApi.post(`/api/gmail/emails/${emailId}/unread`);
}

/**
 * Toggle star on email
 */
export async function toggleGmailStar(emailId: string, starred: boolean): Promise<void> {
    await gmailApi.post(`/api/gmail/emails/${emailId}/star`, { starred });
}

/**
 * Archive email
 */
export async function archiveGmailEmail(emailId: string): Promise<void> {
    await gmailApi.post(`/api/gmail/emails/${emailId}/archive`);
}

/**
 * Delete email (move to trash)
 */
export async function deleteGmailEmail(emailId: string): Promise<void> {
    await gmailApi.post(`/api/gmail/emails/${emailId}/delete`);
}

/**
 * Get attachment download URL
 */
export function getGmailAttachmentUrl(messageId: string, attachmentId: string): string {
    const token = localStorage.getItem('token');
    return `${API_URL}/api/gmail/emails/${messageId}/attachments/${attachmentId}?token=${token}`;
}

/**
 * Download attachment
 */
export async function downloadGmailAttachment(
    messageId: string,
    attachmentId: string,
    filename: string
): Promise<void> {
    const response = await gmailApi.get(
        `/api/gmail/emails/${messageId}/attachments/${attachmentId}`,
        {
            responseType: 'blob',
        }
    );

    // Create download link
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
}

/**
 * Format file size helper
 */
export function formatFileSize(bytes: number): string {
    const kb = bytes / 1024;
    if (kb < 1) return bytes + ' B';
    const mb = kb / 1024;
    if (mb < 1) return kb.toFixed(1) + ' KB';
    return mb.toFixed(1) + ' MB';
}

/**
 * Map Gmail label to mailbox format for UI compatibility
 */
export function mapLabelToMailbox(label: GmailLabel): {
    id: string;
    name: string;
    unreadCount: number;
    icon: string;
} {
    const iconMap: Record<string, string> = {
        INBOX: '📥',
        STARRED: '⭐',
        SENT: '📤',
        DRAFT: '📝',
        TRASH: '🗑️',
        SPAM: '🚫',
        IMPORTANT: '❗',
        CATEGORY_PERSONAL: '👤',
        CATEGORY_SOCIAL: '👥',
        CATEGORY_PROMOTIONS: '🏷️',
        CATEGORY_UPDATES: '🔔',
        CATEGORY_FORUMS: '💬',
    };

    return {
        id: label.id,
        name: label.name,
        unreadCount: label.messagesUnread,
        icon: iconMap[label.id] || '📁',
    };
}

/**
 * Map Gmail email to Email format for UI compatibility
 */
export function mapGmailEmailToEmail(gmailEmail: GmailEmail): {
    id: string;
    mailboxId: string;
    from: { name: string; email: string };
    to: Array<{ name: string; email: string }>;
    cc?: Array<{ name: string; email: string }>;
    subject: string;
    preview: string;
    body: string;
    timestamp: string;
    isRead: boolean;
    isStarred: boolean;
    hasAttachments: boolean;
    attachments?: Array<{ id: string; name: string; size: number; type: string }>;
} {
    return {
        id: gmailEmail.id,
        mailboxId: gmailEmail.labelIds[0] || 'INBOX',
        from: gmailEmail.from,
        to: gmailEmail.to,
        cc: gmailEmail.cc,
        subject: gmailEmail.subject,
        preview: gmailEmail.snippet,
        body: gmailEmail.body,
        timestamp: gmailEmail.timestamp,
        isRead: gmailEmail.isRead,
        isStarred: gmailEmail.isStarred,
        hasAttachments: gmailEmail.hasAttachments,
        attachments: gmailEmail.attachments,
    };
}
