import { Button } from "../../ui/button";
import { formatRelativeTime } from "./utils";

interface EmailActionBarProps {
    selectedCount: number;
    totalCount: number;
    isOnline: boolean;
    isSyncing: boolean;
    emailsFetching: boolean;
    emailsFromCache: boolean;
    emailsStale: boolean;
    lastSyncTime: number | null;
    onSelectAll: () => void;
    onSync: () => void;
    onMarkAsRead: () => void;
    onDelete: () => void;
    isMarkingAsRead: boolean;
    isDeleting: boolean;
    page?: number;
    hasNextPage?: boolean;
    hasPreviousPage?: boolean;
    onNextPage?: () => void;
    onPreviousPage?: () => void;
}

export function EmailActionBar({
    selectedCount,
    totalCount,
    isOnline,
    isSyncing,
    emailsFetching,
    emailsFromCache,
    emailsStale,
    lastSyncTime,
    onSelectAll,
    onSync,
    onMarkAsRead,
    onDelete,
    isMarkingAsRead,
    isDeleting,
    page = 1,
    hasNextPage,
    hasPreviousPage,
    onNextPage,
    onPreviousPage,
}: EmailActionBarProps) {
    const start = (page - 1) * 50 + 1;
    const end = (page - 1) * 50 + totalCount;

    return (
        <div className="p-2 md:p-4 border-b border-gray-200 flex items-center gap-1.5 md:gap-2 flex-wrap">
            <input
                type="checkbox"
                checked={selectedCount === totalCount && totalCount > 0}
                onChange={onSelectAll}
                className="rounded"
                aria-label="Select all emails"
            />
            <Button
                variant="ghost"
                size="sm"
                onClick={onSync}
                aria-label="Sync emails"
                disabled={!isOnline || isSyncing}
                className={`h-7 md:h-8 px-2 ${isSyncing ? "animate-spin" : ""}`}
            >
                🔄
            </Button>
            {isSyncing && (
                <span className="text-xs text-blue-600 animate-pulse hidden md:inline">
                    Syncing...
                </span>
            )}
            {!isSyncing && emailsFetching && (
                <span className="text-xs text-blue-600 animate-pulse hidden md:inline">
                    Updating...
                </span>
            )}

            {selectedCount > 0 ? (
                <>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={onMarkAsRead}
                        disabled={isMarkingAsRead}
                        className="h-7 md:h-8 px-2 text-xs md:text-sm"
                    >
                        ✓ <span className="hidden sm:inline">Mark Read</span>
                    </Button>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={onDelete}
                        disabled={isDeleting}
                        className="h-7 md:h-8 px-2 text-xs md:text-sm"
                    >
                        🗑️ <span className="hidden sm:inline">Delete</span>
                    </Button>
                    <span className="text-xs md:text-sm text-gray-600">
                        {selectedCount} <span className="hidden sm:inline">selected</span>
                    </span>
                </>
            ) : (
                /* Only show meta info if nothing selected, to save space, or keep it always? 
                   Gmail hides meta info when actions are available mostly, but let's keep it simple. */
                <div className="flex items-center gap-2">
                    {/* Cache status indicators */}
                    {emailsFromCache && (
                        <span
                            className="text-xs text-amber-600"
                            title={
                                emailsStale
                                    ? "Cached data may be outdated"
                                    : "Using cached data"
                            }
                        >
                            📦{" "}
                            <span className="hidden sm:inline">
                                {emailsStale ? "Stale Cache" : "Cached"}
                            </span>
                        </span>
                    )}
                    {!isOnline && totalCount > 0 && (
                        <span className="text-xs text-gray-500 hidden md:inline">
                            • Offline Mode
                        </span>
                    )}
                    {lastSyncTime && (
                        <span
                            className="text-xs text-gray-400 hidden lg:inline"
                            title={`Last synced: ${new Date(lastSyncTime).toLocaleString()}`}
                        >
                            • Synced {formatRelativeTime(lastSyncTime)}
                        </span>
                    )}
                </div>
            )}

            {/* Spacer to push pagination to right */}
            <div className="ml-auto flex items-center gap-2">
                {totalCount > 0 && (
                    <span className="text-xs text-gray-500 mr-2">
                        {start}-{end}
                    </span>
                )}

                <Button
                    variant="ghost"
                    size="sm"
                    onClick={onPreviousPage}
                    disabled={!hasPreviousPage || emailsFetching}
                    className="h-8 w-8 p-0"
                    aria-label="Previous page"
                >
                    ‹
                </Button>
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={onNextPage}
                    disabled={!hasNextPage || emailsFetching}
                    className="h-8 w-8 p-0"
                    aria-label="Next page"
                >
                    ›
                </Button>
            </div>
        </div>
    );
}
