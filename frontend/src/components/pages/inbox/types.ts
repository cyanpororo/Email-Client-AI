// Type for mapped email (UI-compatible format)
export type Email = {
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
};

export type ComposeMode = "new" | "reply" | "forward";
export type MobileView = "folders" | "list" | "detail";
