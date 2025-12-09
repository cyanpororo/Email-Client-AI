export const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = diffMs / (1000 * 60 * 60);
    const diffDays = diffMs / (1000 * 60 * 60 * 24);

    if (diffHours < 24) {
        return date.toLocaleTimeString("en-US", {
            hour: "numeric",
            minute: "2-digit",
        });
    } else if (diffDays < 7) {
        return date.toLocaleDateString("en-US", { weekday: "short" });
    } else {
        return date.toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
        });
    }
};

// Format relative time for last sync
export const formatRelativeTime = (timestamp: number) => {
    const now = Date.now();
    const diffMs = now - timestamp;
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));

    if (diffMinutes < 1) return "just now";
    if (diffMinutes < 60) return `${diffMinutes}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return new Date(timestamp).toLocaleDateString();
};
