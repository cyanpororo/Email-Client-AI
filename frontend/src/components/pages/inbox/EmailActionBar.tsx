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
}: EmailActionBarProps) {
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
            {emailsFetching && !isSyncing && (
                <span className="text-xs text-blue-600 animate-pulse hidden md:inline">
                    Updating...
                </span>
            )}
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
            {selectedCount > 0 && (
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
            )}
        </div>
    );
}
