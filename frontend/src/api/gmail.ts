// Gmail API Client - Real Gmail integration via backend
import { api, getAccessToken } from './client';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

// Use the shared api instance which handles auth and token refresh
const gmailApi = api;

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
    similarity?: number;
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
 * Move email to a specific label/folder
 */
export async function moveGmailToLabel(emailId: string, labelId: string): Promise<void> {
    await gmailApi.post(`/api/gmail/emails/${emailId}/modify`, {
        addLabelIds: [labelId],
        removeLabelIds: ['INBOX'], // Remove from inbox when moving to custom folder
    });
}

/**
 * Get attachment download URL
 */
export function getGmailAttachmentUrl(messageId: string, attachmentId: string): string {
    const token = getAccessToken();
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
    // Map standard Gmail label IDs to user-friendly names
    const nameMap: Record<string, string> = {
        INBOX: 'Inbox',
        STARRED: 'Starred',
        SENT: 'Sent',
        DRAFT: 'Drafts',
        TRASH: 'Trash',
        SPAM: 'Spam',
        IMPORTANT: 'Important',
    };

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
        name: nameMap[label.id] || label.name,
        unreadCount: label.messagesUnread,
        icon: iconMap[label.id] || '📁',
    };
}

/**
 * Map Gmail email to Email format for UI compatibility
 */
export function mapGmailEmailToEmail(gmailEmail: GmailEmail): {
    id: string;
    threadId?: string;
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
    similarity?: number;
} {
    return {
        id: gmailEmail.id,
        threadId: gmailEmail.threadId,
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
        similarity: gmailEmail.similarity,
    };
}

/**
 * Get Gmail URL for viewing an email in Gmail
 */
export function getGmailUrl(messageId: string, threadId?: string): string {
    // Use threadId if available, otherwise use messageId
    const id = threadId || messageId;
    return `https://mail.google.com/mail/u/0/#inbox/${id}`;
}

/**
 * Search emails with fuzzy matching
 */
export async function searchGmailEmails(
    query: string,
    limit: number = 50
): Promise<{ emails: GmailEmail[]; query: string; totalResults?: number }> {
    const params = new URLSearchParams();
    params.append('q', query);
    params.append('limit', limit.toString());

    const response = await gmailApi.get(
        `/api/gmail/search?${params.toString()}`
    );
    return response.data;
}

/**
 * Search emails with semantic/vector search
 */
export async function searchGmailEmailsSemantic(
    query: string,
    limit: number = 50,
    threshold: number = 0.5
): Promise<{ emails: GmailEmail[]; query: string; totalResults?: number; searchType?: string }> {
    const params = new URLSearchParams();
    params.append('q', query);
    params.append('limit', limit.toString());
    params.append('threshold', threshold.toString());

    const response = await gmailApi.get(
        `/api/gmail/search/semantic?${params.toString()}`
    );
    return response.data;
}

/**
 * Get search suggestions for autocomplete
 */
export async function getSearchSuggestions(query: string = ''): Promise<string[]> {
    const params = new URLSearchParams();
    if (query) {
        params.append('q', query);
    }

    const response = await gmailApi.get(
        `/api/gmail/search/suggestions?${params.toString()}`
    );
    return response.data.suggestions || [];
}

// ===== Kanban Column Management =====

export type KanbanColumn = {
    id: string;
    user_id: string;
    name: string;
    gmail_label: string | null;
    position: number;
    is_default: boolean;
    created_at: string;
    updated_at: string;
};

export type CreateColumnRequest = {
    name: string;
    gmailLabel?: string;
    isDefault?: boolean;
};

export type UpdateColumnRequest = {
    name?: string;
    gmailLabel?: string;
    isDefault?: boolean;
};

/**
 * Get all Kanban columns for the current user
 */
export async function getKanbanColumns(): Promise<KanbanColumn[]> {
    const response = await gmailApi.get('/api/gmail/kanban/columns');
    return response.data;
}

/**
 * Create a new Kanban column
 */
export async function createKanbanColumn(data: CreateColumnRequest): Promise<KanbanColumn> {
    const response = await gmailApi.post('/api/gmail/kanban/columns', data);
    return response.data;
}

/**
 * Update a Kanban column
 */
export async function updateKanbanColumn(columnId: string, data: UpdateColumnRequest): Promise<KanbanColumn> {
    const response = await gmailApi.post(`/api/gmail/kanban/columns/${columnId}`, data);
    return response.data;
}

/**
 * Delete a Kanban column
 */
export async function deleteKanbanColumn(columnId: string): Promise<void> {
    await gmailApi.post(`/api/gmail/kanban/columns/${columnId}/delete`);
}

/**
 * Reorder Kanban columns
 */
export async function reorderKanbanColumns(columnIds: string[]): Promise<KanbanColumn[]> {
    const response = await gmailApi.post('/api/gmail/kanban/columns/reorder', { columnIds });
    return response.data;
}