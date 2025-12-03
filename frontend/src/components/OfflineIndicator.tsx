import { useEffect, useState, useCallback } from "react";
import { getCacheStats, clearAllCache } from "../lib/emailCache";

export function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== "undefined" ? navigator.onLine : true
  );

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  return isOnline;
}

interface CacheStats {
  labelsCount: number;
  emailListsCount: number;
  emailDetailsCount: number;
  lastSync: number | null;
}

export function useCacheInfo() {
  const [stats, setStats] = useState<CacheStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refreshStats = useCallback(async () => {
    try {
      const cacheStats = await getCacheStats();
      setStats(cacheStats);
    } catch (error) {
      console.error("Error getting cache stats:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshStats();
    // Refresh stats every 30 seconds
    const interval = setInterval(refreshStats, 30000);
    return () => clearInterval(interval);
  }, [refreshStats]);

  const clearCache = useCallback(async () => {
    await clearAllCache();
    await refreshStats();
  }, [refreshStats]);

  return { stats, isLoading, refreshStats, clearCache };
}

export function OfflineIndicator() {
  const isOnline = useOnlineStatus();
  const { stats } = useCacheInfo();

  if (isOnline) return null;

  const hasCachedData =
    stats && (stats.labelsCount > 0 || stats.emailDetailsCount > 0);

  return (
    <div className="fixed top-0 left-0 right-0 bg-amber-500 text-white py-2 px-4 text-center z-50 shadow-lg">
      <div className="flex items-center justify-center gap-2">
        <span className="text-lg">📡</span>
        <span className="font-medium">
          You're offline.{" "}
          {hasCachedData ? (
            <>
              Showing cached data
              {stats.emailDetailsCount > 0 && (
                <span className="text-amber-100 text-sm ml-2">
                  ({stats.emailDetailsCount} emails available)
                </span>
              )}
            </>
          ) : (
            "No cached data available."
          )}
        </span>
      </div>
    </div>
  );
}

/**
 * Enhanced offline banner with more details and actions
 */
export function OfflineBanner({
  showDetails = false,
  onClearCache,
}: {
  showDetails?: boolean;
  onClearCache?: () => void;
}) {
  const isOnline = useOnlineStatus();
  const { stats, clearCache } = useCacheInfo();
  const [showCacheInfo, setShowCacheInfo] = useState(false);

  if (isOnline) return null;

  const hasCachedData =
    stats && (stats.labelsCount > 0 || stats.emailDetailsCount > 0);
  const lastSyncText = stats?.lastSync
    ? `Last synced: ${new Date(stats.lastSync).toLocaleString()}`
    : "Never synced";

  const handleClearCache = async () => {
    await clearCache();
    onClearCache?.();
  };

  return (
    <div className="fixed top-0 left-0 right-0 bg-gradient-to-r from-amber-500 to-orange-500 text-white py-3 px-4 z-50 shadow-lg">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl animate-pulse">📡</span>
            <div>
              <span className="font-semibold block">You're offline</span>
              <span className="text-amber-100 text-sm">
                {hasCachedData
                  ? "Viewing cached emails"
                  : "No cached data available"}
              </span>
            </div>
          </div>

          {showDetails && hasCachedData && (
            <div className="flex items-center gap-4">
              <button
                onClick={() => setShowCacheInfo(!showCacheInfo)}
                className="text-sm text-amber-100 hover:text-white underline"
              >
                {showCacheInfo ? "Hide details" : "Show details"}
              </button>
              <button
                onClick={handleClearCache}
                className="text-sm bg-amber-600 hover:bg-amber-700 px-3 py-1 rounded transition-colors"
              >
                Clear Cache
              </button>
            </div>
          )}
        </div>

        {showCacheInfo && stats && (
          <div className="mt-3 pt-3 border-t border-amber-400/30 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <span className="text-amber-200">Labels:</span>{" "}
              <span className="font-medium">{stats.labelsCount}</span>
            </div>
            <div>
              <span className="text-amber-200">Email Lists:</span>{" "}
              <span className="font-medium">{stats.emailListsCount}</span>
            </div>
            <div>
              <span className="text-amber-200">Cached Emails:</span>{" "}
              <span className="font-medium">{stats.emailDetailsCount}</span>
            </div>
            <div>
              <span className="text-amber-200">{lastSyncText}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
