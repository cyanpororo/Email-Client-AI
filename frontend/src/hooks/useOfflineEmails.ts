/**
 * Custom hooks for offline-first email data fetching
 * Implements stale-while-revalidate with IndexedDB persistence
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useState } from "react";
import * as gmailApi from "../api/gmail";
import type { GmailLabel, GmailEmail, GmailEmailsResponse } from "../api/gmail";
import * as emailCache from "../lib/emailCache";
import { useOnlineStatus } from "../components/OfflineIndicator";

// ============ Labels Hook ============

export interface UseGmailLabelsResult {
  labels: GmailLabel[];
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  isFromCache: boolean;
  isStale: boolean;
  refetch: () => void;
}

export function useGmailLabels(): UseGmailLabelsResult {
  const queryClient = useQueryClient();
  const isOnline = useOnlineStatus();
  const [isFromCache, setIsFromCache] = useState(false);
  const [isStale, setIsStale] = useState(false);

  // Main query with stale-while-revalidate
  const query = useQuery({
    queryKey: ["gmailLabels"],
    queryFn: async (): Promise<GmailLabel[]> => {
      // Try to get from IndexedDB first for instant response
      const cached = await emailCache.getCachedLabels();

      if (cached) {
        setIsFromCache(true);
        setIsStale(cached.isStale);

        // If online and cache is stale, fetch fresh data in background
        if (isOnline && cached.isStale) {
          // Don't await - let it update in background
          gmailApi
            .getGmailLabels()
            .then((freshLabels) => {
              emailCache.cacheLabels(freshLabels);
              queryClient.setQueryData(["gmailLabels"], freshLabels);
              setIsFromCache(false);
              setIsStale(false);
            })
            .catch(console.error);
        }

        return cached.labels;
      }

      // No cache - fetch from network
      if (!isOnline) {
        throw new Error("No cached data available and device is offline");
      }

      const labels = await gmailApi.getGmailLabels();
      await emailCache.cacheLabels(labels);
      setIsFromCache(false);
      setIsStale(false);
      return labels;
    },
    staleTime: 10 * 60 * 1000, // 10 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes
    retry: isOnline ? 1 : 0,
    refetchOnWindowFocus: isOnline,
    refetchOnReconnect: true,
  });

  // Update cache when fresh data is fetched
  useEffect(() => {
    if (query.data && !isFromCache) {
      emailCache.cacheLabels(query.data).catch(console.error);
    }
  }, [query.data, isFromCache]);

  return {
    labels: query.data || [],
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error as Error | null,
    isFromCache,
    isStale,
    refetch: query.refetch,
  };
}

// ============ Emails List Hook ============

export interface UseGmailEmailsResult {
  emails: GmailEmail[];
  nextPageToken?: string;
  isLoading: boolean;
  isFetching: boolean;
  isError: boolean;
  error: Error | null;
  isFromCache: boolean;
  isStale: boolean;
  refetch: () => void;
}

export function useGmailEmails(
  labelId: string,
  limit: number = 50,
  enabled: boolean = true
): UseGmailEmailsResult {
  const queryClient = useQueryClient();
  const isOnline = useOnlineStatus();
  const [isFromCache, setIsFromCache] = useState(false);
  const [isStale, setIsStale] = useState(false);

  const query = useQuery({
    queryKey: ["gmailEmails", labelId],
    queryFn: async (): Promise<GmailEmailsResponse> => {
      // Try IndexedDB cache first
      const cached = await emailCache.getCachedEmails(labelId);

      if (cached) {
        setIsFromCache(true);
        setIsStale(cached.isStale);

        // Background refresh if online and stale
        if (isOnline && cached.isStale) {
          gmailApi
            .getGmailEmails(labelId, limit)
            .then((response) => {
              emailCache.cacheEmails(
                labelId,
                response.emails,
                response.nextPageToken
              );
              queryClient.setQueryData(["gmailEmails", labelId], response);
              setIsFromCache(false);
              setIsStale(false);
              emailCache.updateLastSyncTime();
            })
            .catch(console.error);
        }

        return {
          emails: cached.emails,
          nextPageToken: cached.nextPageToken,
        };
      }

      // No cache - must fetch from network
      if (!isOnline) {
        throw new Error("No cached emails available and device is offline");
      }

      const response = await gmailApi.getGmailEmails(labelId, limit);
      await emailCache.cacheEmails(
        labelId,
        response.emails,
        response.nextPageToken
      );
      await emailCache.updateLastSyncTime();
      setIsFromCache(false);
      setIsStale(false);
      return response;
    },
    enabled,
    staleTime: 3 * 60 * 1000, // 3 minutes
    gcTime: 15 * 60 * 1000, // 15 minutes
    retry: isOnline ? 1 : 0,
    refetchOnWindowFocus: isOnline,
    refetchOnReconnect: true,
  });

  // Cache fresh data
  useEffect(() => {
    if (query.data && !isFromCache) {
      emailCache
        .cacheEmails(labelId, query.data.emails, query.data.nextPageToken)
        .catch(console.error);
    }
  }, [query.data, labelId, isFromCache]);

  return {
    emails: query.data?.emails || [],
    nextPageToken: query.data?.nextPageToken,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    isError: query.isError,
    error: query.error as Error | null,
    isFromCache,
    isStale,
    refetch: query.refetch,
  };
}

// ============ Email Detail Hook ============

export interface UseGmailEmailDetailResult {
  email: GmailEmail | null;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  isFromCache: boolean;
  isStale: boolean;
  refetch: () => void;
}

export function useGmailEmailDetail(
  emailId: string | null,
  enabled: boolean = true
): UseGmailEmailDetailResult {
  const queryClient = useQueryClient();
  const isOnline = useOnlineStatus();
  const [isFromCache, setIsFromCache] = useState(false);
  const [isStale, setIsStale] = useState(false);

  const query = useQuery({
    queryKey: ["gmailEmail", emailId],
    queryFn: async (): Promise<GmailEmail | null> => {
      if (!emailId) return null;

      // Try cache first
      const cached = await emailCache.getCachedEmailDetail(emailId);

      if (cached) {
        setIsFromCache(true);
        setIsStale(cached.isStale);

        // Background refresh
        if (isOnline && cached.isStale) {
          gmailApi
            .getGmailEmailById(emailId)
            .then((email) => {
              emailCache.cacheEmailDetail(email);
              queryClient.setQueryData(["gmailEmail", emailId], email);
              setIsFromCache(false);
              setIsStale(false);
            })
            .catch(console.error);
        }

        return cached.email;
      }

      // No cache
      if (!isOnline) {
        throw new Error("Email not cached and device is offline");
      }

      const email = await gmailApi.getGmailEmailById(emailId);
      await emailCache.cacheEmailDetail(email);
      setIsFromCache(false);
      setIsStale(false);
      return email;
    },
    enabled: enabled && !!emailId,
    staleTime: 5 * 60 * 1000,
    gcTime: 20 * 60 * 1000,
    retry: isOnline ? 1 : 0,
  });

  // Cache fresh data
  useEffect(() => {
    if (query.data && !isFromCache) {
      emailCache.cacheEmailDetail(query.data).catch(console.error);
    }
  }, [query.data, isFromCache]);

  return {
    email: query.data || null,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error as Error | null,
    isFromCache,
    isStale,
    refetch: query.refetch,
  };
}

// ============ Optimistic Update Mutations ============

/**
 * Mark as read mutation with optimistic updates
 */
export function useMarkAsReadMutation(labelId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: gmailApi.markGmailAsRead,
    onMutate: async (emailId: string) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ["gmailEmails", labelId] });

      // Snapshot previous value
      const previousEmails = queryClient.getQueryData<GmailEmailsResponse>([
        "gmailEmails",
        labelId,
      ]);

      // Optimistically update React Query cache
      queryClient.setQueryData<GmailEmailsResponse>(
        ["gmailEmails", labelId],
        (old) => {
          if (!old) return old;
          return {
            ...old,
            emails: old.emails.map((e) =>
              e.id === emailId ? { ...e, isRead: true } : e
            ),
          };
        }
      );

      // Also update IndexedDB cache
      emailCache.updateCachedEmail(labelId, emailId, { isRead: true });
      emailCache.updateCachedEmailDetail(emailId, { isRead: true });

      return { previousEmails };
    },
    onError: (_err, _emailId, context) => {
      // Rollback on error
      if (context?.previousEmails) {
        queryClient.setQueryData(
          ["gmailEmails", labelId],
          context.previousEmails
        );
      }
    },
    onSettled: () => {
      // Refetch to ensure sync
      queryClient.invalidateQueries({ queryKey: ["gmailEmails", labelId] });
      queryClient.invalidateQueries({ queryKey: ["gmailLabels"] });
    },
  });
}

/**
 * Mark as unread mutation with optimistic updates
 */
export function useMarkAsUnreadMutation(labelId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: gmailApi.markGmailAsUnread,
    onMutate: async (emailId: string) => {
      await queryClient.cancelQueries({ queryKey: ["gmailEmails", labelId] });

      const previousEmails = queryClient.getQueryData<GmailEmailsResponse>([
        "gmailEmails",
        labelId,
      ]);

      queryClient.setQueryData<GmailEmailsResponse>(
        ["gmailEmails", labelId],
        (old) => {
          if (!old) return old;
          return {
            ...old,
            emails: old.emails.map((e) =>
              e.id === emailId ? { ...e, isRead: false } : e
            ),
          };
        }
      );

      emailCache.updateCachedEmail(labelId, emailId, { isRead: false });
      emailCache.updateCachedEmailDetail(emailId, { isRead: false });

      return { previousEmails };
    },
    onError: (_err, _emailId, context) => {
      if (context?.previousEmails) {
        queryClient.setQueryData(
          ["gmailEmails", labelId],
          context.previousEmails
        );
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["gmailEmails", labelId] });
      queryClient.invalidateQueries({ queryKey: ["gmailLabels"] });
    },
  });
}

/**
 * Toggle star mutation with optimistic updates
 */
export function useToggleStarMutation(labelId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ emailId, starred }: { emailId: string; starred: boolean }) =>
      gmailApi.toggleGmailStar(emailId, starred),
    onMutate: async ({ emailId, starred }) => {
      await queryClient.cancelQueries({ queryKey: ["gmailEmails", labelId] });

      const previousEmails = queryClient.getQueryData<GmailEmailsResponse>([
        "gmailEmails",
        labelId,
      ]);

      queryClient.setQueryData<GmailEmailsResponse>(
        ["gmailEmails", labelId],
        (old) => {
          if (!old) return old;
          return {
            ...old,
            emails: old.emails.map((e) =>
              e.id === emailId ? { ...e, isStarred: starred } : e
            ),
          };
        }
      );

      emailCache.updateCachedEmail(labelId, emailId, { isStarred: starred });
      emailCache.updateCachedEmailDetail(emailId, { isStarred: starred });

      return { previousEmails };
    },
    onError: (_err, _vars, context) => {
      if (context?.previousEmails) {
        queryClient.setQueryData(
          ["gmailEmails", labelId],
          context.previousEmails
        );
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["gmailEmails", labelId] });
      queryClient.invalidateQueries({ queryKey: ["gmailEmail"] });
    },
  });
}

/**
 * Delete mutation with optimistic updates
 */
export function useDeleteEmailMutation(labelId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: gmailApi.deleteGmailEmail,
    onMutate: async (emailId: string) => {
      await queryClient.cancelQueries({ queryKey: ["gmailEmails", labelId] });

      const previousEmails = queryClient.getQueryData<GmailEmailsResponse>([
        "gmailEmails",
        labelId,
      ]);

      queryClient.setQueryData<GmailEmailsResponse>(
        ["gmailEmails", labelId],
        (old) => {
          if (!old) return old;
          return {
            ...old,
            emails: old.emails.filter((e) => e.id !== emailId),
          };
        }
      );

      // Remove from IndexedDB cache
      emailCache.removeCachedEmail(labelId, emailId);

      return { previousEmails };
    },
    onError: (_err, _emailId, context) => {
      if (context?.previousEmails) {
        queryClient.setQueryData(
          ["gmailEmails", labelId],
          context.previousEmails
        );
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["gmailEmails", labelId] });
      queryClient.invalidateQueries({ queryKey: ["gmailLabels"] });
    },
  });
}

// ============ Cache Management Hook ============

export interface CacheStats {
  labelsCount: number;
  emailListsCount: number;
  emailDetailsCount: number;
  lastSync: number | null;
}

export function useCacheStats() {
  const [stats, setStats] = useState<CacheStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const cacheStats = await emailCache.getCacheStats();
      setStats(cacheStats);
    } catch (error) {
      console.error("Error getting cache stats:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
    // Refresh stats every minute
    const interval = setInterval(refresh, 60000);
    return () => clearInterval(interval);
  }, [refresh]);

  const clearCache = useCallback(async () => {
    await emailCache.clearAllCache();
    await refresh();
  }, [refresh]);

  return { stats, isLoading, refresh, clearCache };
}

// ============ Sync Hook ============

export function useEmailSync() {
  const queryClient = useQueryClient();
  const isOnline = useOnlineStatus();
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<number | null>(null);

  // Load last sync time on mount
  useEffect(() => {
    emailCache.getLastSyncTime().then(setLastSyncTime);
  }, []);

  const sync = useCallback(async () => {
    if (!isOnline || isSyncing) return;

    setIsSyncing(true);
    try {
      // Invalidate all queries to trigger fresh fetches
      await queryClient.invalidateQueries({ queryKey: ["gmailLabels"] });
      await queryClient.invalidateQueries({ queryKey: ["gmailEmails"] });

      // Update sync time
      await emailCache.updateLastSyncTime();
      const newSyncTime = Date.now();
      setLastSyncTime(newSyncTime);

      console.log("✅ Email sync completed");
    } catch (error) {
      console.error("❌ Email sync failed:", error);
    } finally {
      setIsSyncing(false);
    }
  }, [isOnline, isSyncing, queryClient]);

  return {
    isSyncing,
    lastSyncTime,
    sync,
    isOnline,
  };
}
