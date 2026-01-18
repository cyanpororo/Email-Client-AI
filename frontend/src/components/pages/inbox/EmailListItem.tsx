import type { Email } from "./types";
import { formatTimestamp } from "./utils";

interface EmailListItemProps {
    email: Email;
    isSelected: boolean;
    isChecked: boolean;
    onEmailClick: (email: Email) => void;
    onToggleSelection: (emailId: string) => void;
    onToggleStar: (emailId: string, starred: boolean) => void;
}

export function EmailListItem({
    email,
    isSelected,
    isChecked,
    onEmailClick,
    onToggleSelection,
    onToggleStar,
}: EmailListItemProps) {
    return (
        <div
            role="listitem"
            className={`border-b border-gray-100 p-2.5 md:p-4 cursor-pointer transition-colors ${isSelected
                ? "bg-blue-50 border-l-4 border-l-blue-600"
                : "hover:bg-gray-50"
                } ${!email.isRead ? "bg-blue-50 border-l-4 border-l-blue-500 font-semibold" : ""}`}
            onClick={() => onEmailClick(email)}
        >
            <div className="flex items-start gap-2 md:gap-3">
                {!email.isRead && <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0" aria-hidden="true" />}
                <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={(e) => {
                        e.stopPropagation();
                        onToggleSelection(email.id);
                    }}
                    className="mt-1 rounded"
                    aria-label={`Select email: ${email.subject}`}
                />
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        onToggleStar(email.id, !email.isStarred);
                    }}
                    className="mt-1 text-lg"
                    aria-label={email.isStarred ? "Unstar email" : "Star email"}
                >
                    {email.isStarred ? "⭐" : "☆"}
                </button>
                <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-0.5 md:mb-1">
                        <span
                            className={`text-sm md:text-base truncate ${!email.isRead ? "font-bold text-gray-900" : "font-medium text-gray-700"
                                }`}
                        >
                            {email.from.name || email.from.email}
                        </span>
                        <span className="text-[10px] md:text-xs text-gray-500 ml-1 md:ml-2 flex-shrink-0">
                            {formatTimestamp(email.timestamp)}
                        </span>
                    </div>
                    <div
                        className={`text-xs md:text-sm truncate mb-0.5 md:mb-1 ${!email.isRead
                            ? "font-bold text-gray-900"
                            : "text-gray-600"
                            }`}
                    >
                        {email.subject}
                    </div>
                    <div className="text-xs md:text-sm text-gray-500 truncate">
                        {email.preview}
                    </div>
                    {email.hasAttachments && (
                        <div className="text-[10px] md:text-xs text-gray-400 mt-0.5 md:mt-1">
                            📎 <span className="hidden sm:inline">Has attachments</span>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
