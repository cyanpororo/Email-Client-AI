import { Button } from "../../ui/button";
import { EmailFrame } from "../../EmailFrame";
import type { Email } from "./types";
import * as gmailApi from "../../../api/gmail";

interface Mailbox {
    id: string;
    name: string;
    icon: string;
    unreadCount: number;
}

interface EmailDetailProps {
    email: Email | null;
    customMailboxes: Mailbox[];
    showMoveMenu: boolean;
    moveEmailId: string | null;
    onReply: (email: Email) => void;
    onReplyAll: (email: Email) => void;
    onForward: (email: Email) => void;
    onDelete: (emailId: string) => void;
    onToggleStar: (emailId: string, starred: boolean) => void;
    onToggleRead: (emailId: string, isRead: boolean) => void;
    onMoveToFolder: (emailId: string, labelId: string) => void;
    onShowMoveMenu: (show: boolean, emailId: string | null) => void;
    isDeleting: boolean;
    isMoving: boolean;
}

export function EmailDetail({
    email,
    customMailboxes,
    showMoveMenu,
    moveEmailId,
    onReply,
    onReplyAll,
    onForward,
    onDelete,
    onToggleStar,
    onToggleRead,
    onMoveToFolder,
    onShowMoveMenu,
    isDeleting,
    isMoving,
}: EmailDetailProps) {
    if (!email) {
        return (
            <div className="flex-1 bg-white flex flex-col">
                <div className="flex-1 flex items-center justify-center text-gray-400">
                    <div className="text-center">
                        <div className="text-6xl mb-4">📧</div>
                        <p className="text-lg">Select an email to view details</p>
                        <p className="text-sm mt-2">Use ↑/↓ or j/k to navigate</p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="flex-1 bg-white flex flex-col">
            {/* Email header */}
            <div className="border-b border-gray-200 p-3 md:p-6">
                <div className="flex items-start justify-between mb-3 md:mb-4">
                    <h1 className="text-lg md:text-2xl font-bold text-gray-900 flex-1 pr-2">
                        {email.subject}
                    </h1>
                    <button
                        onClick={() => onToggleStar(email.id, !email.isStarred)}
                        className="text-2xl ml-4"
                        aria-label={email.isStarred ? "Unstar email" : "Star email"}
                    >
                        {email.isStarred ? "⭐" : "☆"}
                    </button>
                </div>

                <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2">
                        <span className="font-medium text-gray-700">From:</span>
                        <span className="text-gray-900">
                            {email.from.name} &lt;{email.from.email}&gt;
                        </span>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="font-medium text-gray-700">To:</span>
                        <span className="text-gray-900">
                            {email.to.map((t) => `${t.name} <${t.email}>`).join(", ")}
                        </span>
                    </div>
                    {email.cc && email.cc.length > 0 && (
                        <div className="flex items-center gap-2">
                            <span className="font-medium text-gray-700">Cc:</span>
                            <span className="text-gray-900">
                                {email.cc.map((c) => `${c.name} <${c.email}>`).join(", ")}
                            </span>
                        </div>
                    )}
                    <div className="flex items-center gap-2">
                        <span className="font-medium text-gray-700">Date:</span>
                        <span className="text-gray-900">
                            {new Date(email.timestamp).toLocaleString("en-US", {
                                dateStyle: "full",
                                timeStyle: "short",
                            })}
                        </span>
                    </div>
                </div>

                {/* Action buttons */}
                <div className="flex flex-wrap gap-1.5 md:gap-2 mt-3 md:mt-4">
                    <Button
                        onClick={() => onReply(email)}
                        className="text-xs md:text-sm h-8 md:h-9"
                    >
                        Reply
                    </Button>
                    <Button
                        variant="outline"
                        onClick={() => onReplyAll(email)}
                        className="text-xs md:text-sm h-8 md:h-9"
                    >
                        Reply All
                    </Button>
                    <Button
                        variant="outline"
                        onClick={() => onForward(email)}
                        className="text-xs md:text-sm h-8 md:h-9"
                    >
                        Forward
                    </Button>

                    {/* Move to Folder dropdown */}
                    {customMailboxes.length > 0 && (
                        <div className="relative move-menu-container">
                            <Button
                                variant="outline"
                                onClick={() => onShowMoveMenu(!showMoveMenu, email.id)}
                                className="text-xs md:text-sm h-8 md:h-9"
                            >
                                📁 Move to...
                            </Button>

                            {showMoveMenu && moveEmailId === email.id && (
                                <div className="absolute z-50 mt-1 w-48 bg-white border border-gray-200 rounded-lg shadow-lg">
                                    <div className="py-1 max-h-64 overflow-y-auto">
                                        {customMailboxes.map((mailbox) => (
                                            <button
                                                key={mailbox.id}
                                                onClick={() => onMoveToFolder(email.id, mailbox.id)}
                                                className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100 flex items-center gap-2"
                                                disabled={isMoving}
                                            >
                                                <span>{mailbox.icon}</span>
                                                <span>{mailbox.name}</span>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    <Button
                        variant="outline"
                        onClick={() => onDelete(email.id)}
                        disabled={isDeleting}
                        className="text-xs md:text-sm h-8 md:h-9"
                    >
                        Delete
                    </Button>
                    <Button
                        variant="outline"
                        onClick={() => onToggleRead(email.id, email.isRead)}
                        className="text-xs md:text-sm h-8 md:h-9"
                    >
                        Mark as {email.isRead ? "Unread" : "Read"}
                    </Button>
                </div>
            </div>

            {/* Email body */}
            <div className="flex-1 overflow-y-auto p-3 md:p-6">
                <EmailFrame content={email.body} />

                {/* Attachments */}
                {email.attachments && email.attachments.length > 0 && (
                    <div className="mt-6 pt-6 border-t border-gray-200">
                        <h3 className="font-medium text-gray-900 mb-3">
                            Attachments ({email.attachments.length})
                        </h3>
                        <div className="space-y-2">
                            {email.attachments.map((attachment) => (
                                <div
                                    key={attachment.id}
                                    className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200"
                                >
                                    <span className="text-2xl">📎</span>
                                    <div className="flex-1">
                                        <div className="font-medium text-sm text-gray-900">
                                            {attachment.name}
                                        </div>
                                        <div className="text-xs text-gray-500">
                                            {gmailApi.formatFileSize(attachment.size)}
                                        </div>
                                    </div>
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() =>
                                            gmailApi.downloadGmailAttachment(
                                                email.id,
                                                attachment.id,
                                                attachment.name
                                            )
                                        }
                                    >
                                        Download
                                    </Button>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
