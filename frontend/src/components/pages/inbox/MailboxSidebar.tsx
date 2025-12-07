import { Button } from "../../ui/button";

interface Mailbox {
    id: string;
    name: string;
    icon: string;
    unreadCount: number;
}

interface MailboxSidebarProps {
    standardMailboxes: Mailbox[];
    customMailboxes: Mailbox[];
    selectedMailboxId: string;
    onMailboxClick: (mailboxId: string) => void;
    onCompose: () => void;
}

export function MailboxSidebar({
    standardMailboxes,
    customMailboxes,
    selectedMailboxId,
    onMailboxClick,
    onCompose,
}: MailboxSidebarProps) {
    return (
        <div className="w-full lg:w-64 bg-white border-r border-gray-200 flex flex-col">
            <div className="p-3 md:p-4 border-b border-gray-200">
                <Button
                    onClick={onCompose}
                    className="w-full text-sm md:text-base"
                    aria-label="Compose new email"
                >
                    ✏️ Compose
                </Button>
            </div>

            <div className="flex-1 overflow-y-auto">
                <nav className="p-2" role="navigation" aria-label="Mailbox folders">
                    {/* Standard folders */}
                    {standardMailboxes.map((mailbox) => (
                        <button
                            key={mailbox.id}
                            onClick={() => onMailboxClick(mailbox.id)}
                            className={`w-full text-left px-3 md:px-4 py-2.5 md:py-3 rounded-lg mb-1 transition-colors text-sm md:text-base ${selectedMailboxId === mailbox.id
                                    ? "bg-blue-50 text-blue-700 font-medium"
                                    : "hover:bg-gray-100 text-gray-700"
                                }`}
                            aria-current={
                                selectedMailboxId === mailbox.id ? "page" : undefined
                            }
                        >
                            <div className="flex items-center justify-between">
                                <span className="flex items-center gap-2">
                                    <span aria-hidden="true">{mailbox.icon}</span>
                                    <span>{mailbox.name}</span>
                                </span>
                                {mailbox.unreadCount > 0 && (
                                    <span
                                        className="bg-blue-600 text-white text-xs rounded-full px-2 py-0.5 min-w-[20px] text-center"
                                        aria-label={`${mailbox.unreadCount} unread emails`}
                                    >
                                        {mailbox.unreadCount}
                                    </span>
                                )}
                            </div>
                        </button>
                    ))}

                    {/* Divider between standard and custom folders */}
                    {customMailboxes.length > 0 && (
                        <div className="border-t border-gray-200 my-2 mx-2"></div>
                    )}

                    {/* Custom folders */}
                    {customMailboxes.map((mailbox) => (
                        <button
                            key={mailbox.id}
                            onClick={() => onMailboxClick(mailbox.id)}
                            className={`w-full text-left px-3 md:px-4 py-2.5 md:py-3 rounded-lg mb-1 transition-colors text-sm md:text-base ${selectedMailboxId === mailbox.id
                                    ? "bg-blue-50 text-blue-700 font-medium"
                                    : "hover:bg-gray-100 text-gray-700"
                                }`}
                            aria-current={
                                selectedMailboxId === mailbox.id ? "page" : undefined
                            }
                        >
                            <div className="flex items-center justify-between">
                                <span className="flex items-center gap-2">
                                    <span aria-hidden="true">{mailbox.icon}</span>
                                    <span>{mailbox.name}</span>
                                </span>
                                {mailbox.unreadCount > 0 && (
                                    <span
                                        className="bg-blue-600 text-white text-xs rounded-full px-2 py-0.5 min-w-[20px] text-center"
                                        aria-label={`${mailbox.unreadCount} unread emails`}
                                    >
                                        {mailbox.unreadCount}
                                    </span>
                                )}
                            </div>
                        </button>
                    ))}
                </nav>
            </div>

            <div className="hidden lg:block p-4 border-t border-gray-200 text-xs text-gray-500">
                <p>Keyboard shortcuts:</p>
                <ul className="mt-2 space-y-1">
                    <li>↑/k: Previous email</li>
                    <li>↓/j: Next email</li>
                    <li>c: Compose</li>
                    <li>r: Reply</li>
                    <li>s: Star</li>
                </ul>
            </div>
        </div>
    );
}
