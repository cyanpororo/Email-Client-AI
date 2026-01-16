import { Button } from "../../ui/button";
import type { Email } from "./types";
import { EmailListItem } from "./EmailListItem";
import { EmailActionBar } from "./EmailActionBar";
import { useQueryClient } from "@tanstack/react-query";

interface EmailListViewProps {
    emails: Email[];
    selectedEmailId: string | null;
    selectedEmails: Set<string>;
    selectedMailboxId: string;
    isLoading: boolean;
    isError: boolean;
    isFetching: boolean;
    isFromCache: boolean;
    isStale: boolean;
    isOnline: boolean;
    isSyncing: boolean;
    lastSyncTime: number | null;
    onEmailClick: (email: Email) => void;
    onToggleSelection: (emailId: string) => void;
    onSelectAll: () => void;
    onToggleStar: (emailId: string, starred: boolean) => void;
    onSync: () => void;
    onMarkAsRead: () => void;
    onDelete: () => void;
    isMarkingAsRead: boolean;
    isDeleting: boolean;
    hasNextPage?: boolean;
    hasPreviousPage?: boolean;
    onNextPage?: () => void;
    onPreviousPage?: () => void;
    page?: number;
}

export function EmailListView({
    emails,
    selectedEmailId,
    selectedEmails,
    selectedMailboxId,
    isLoading,
    isError,
    isFetching,
    isFromCache,
    isStale,
    isOnline,
    isSyncing,
    lastSyncTime,
    onEmailClick,
    onToggleSelection,
    onSelectAll,
    onToggleStar,
    onSync,
    onMarkAsRead,
    onDelete,
    isMarkingAsRead,
    isDeleting,
    hasNextPage,
    hasPreviousPage,
    onNextPage,
    onPreviousPage,
    page,
}: EmailListViewProps) {
    const queryClient = useQueryClient();

    return (
        <div className="w-full lg:w-2/5 bg-white border-r border-gray-200 flex flex-col h-full">
            {/* Action bar */}
            <EmailActionBar
                selectedCount={selectedEmails.size}
                totalCount={emails.length}
                isOnline={isOnline}
                isSyncing={isSyncing}
                emailsFetching={isFetching}
                emailsFromCache={isFromCache}
                emailsStale={isStale}
                lastSyncTime={lastSyncTime}
                onSelectAll={onSelectAll}
                onSync={onSync}
                onMarkAsRead={onMarkAsRead}
                onDelete={onDelete}
                isMarkingAsRead={isMarkingAsRead}
                isDeleting={isDeleting}
                page={page}
                hasNextPage={hasNextPage}
                hasPreviousPage={hasPreviousPage}
                onNextPage={onNextPage}
                onPreviousPage={onPreviousPage}
            />

            {/* Email list */}
            <div className="flex-1 overflow-y-auto" role="list" aria-label="Email list">
                {isLoading ? (
                    <div className="p-8 text-center text-gray-500">Loading emails...</div>
                ) : isError ? (
                    <div className="p-8 text-center text-red-500">
                        <div className="text-4xl mb-2">⚠️</div>
                        <p>Failed to load emails</p>
                        <Button
                            onClick={() =>
                                queryClient.invalidateQueries({
                                    queryKey: ["gmailEmails", selectedMailboxId],
                                })
                            }
                            className="mt-4"
                        >
                            Retry
                        </Button>
                    </div>
                ) : emails.length === 0 ? (
                    <div className="p-8 text-center text-gray-500">
                        <div className="text-4xl mb-2">📭</div>
                        <p>No emails in this folder</p>
                    </div>
                ) : (
                    emails.map((email) => (
                        <EmailListItem
                            key={email.id}
                            email={email}
                            isSelected={selectedEmailId === email.id}
                            isChecked={selectedEmails.has(email.id)}
                            onEmailClick={onEmailClick}
                            onToggleSelection={onToggleSelection}
                            onToggleStar={onToggleStar}
                        />
                    ))
                )}
            </div>
        </div>
    );
}
