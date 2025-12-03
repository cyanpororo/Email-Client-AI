import type { GmailLabel, GmailEmail } from "../api/gmail";

const DB_NAME = "email-client-cache";
const DB_VERSION = 1;

// Store names
const STORES = {
  LABELS: "labels",
  EMAILS: "emails",
  EMAIL_DETAILS: "email-details",
  METADATA: "metadata",
} as const;

// Cache expiration times (in milliseconds)
const CACHE_TTL = {
  LABELS: 10 * 60 * 1000, // 10 minutes
  EMAILS: 5 * 60 * 1000, // 5 minutes
  EMAIL_DETAILS: 30 * 60 * 1000, // 30 minutes
} as const;

// Metadata keys
const META_KEYS = {
  LABELS_TIMESTAMP: "labels_timestamp",
  LAST_SYNC: "last_sync",
} as const;

type EmailListCacheEntry = {
  labelId: string;
  emails: GmailEmail[];
  nextPageToken?: string;
  timestamp: number;
};

type EmailDetailCacheEntry = {
  id: string;
  email: GmailEmail;
  timestamp: number;
};

type MetadataEntry = {
  key: string;
  value: string | number;
};

let dbInstance: IDBDatabase | null = null;

/**
 * Initialize and get the IndexedDB instance
 */
export async function getDB(): Promise<IDBDatabase> {
  if (dbInstance) {
    return dbInstance;
  }

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      console.error("❌ Failed to open IndexedDB:", request.error);
      reject(request.error);
    };

    request.onsuccess = () => {
      dbInstance = request.result;
      console.log("✅ IndexedDB opened successfully");
      resolve(dbInstance);
    };

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      console.log("📦 Upgrading IndexedDB schema...");

      // Create labels store
      if (!db.objectStoreNames.contains(STORES.LABELS)) {
        db.createObjectStore(STORES.LABELS, { keyPath: "id" });
      }

      // Create emails store with labelId index
      if (!db.objectStoreNames.contains(STORES.EMAILS)) {
        const emailsStore = db.createObjectStore(STORES.EMAILS, {
          keyPath: "labelId",
        });
        emailsStore.createIndex("timestamp", "timestamp", { unique: false });
      }

      // Create email details store
      if (!db.objectStoreNames.contains(STORES.EMAIL_DETAILS)) {
        const detailsStore = db.createObjectStore(STORES.EMAIL_DETAILS, {
          keyPath: "id",
        });
        detailsStore.createIndex("timestamp", "timestamp", { unique: false });
      }

      // Create metadata store
      if (!db.objectStoreNames.contains(STORES.METADATA)) {
        db.createObjectStore(STORES.METADATA, { keyPath: "key" });
      }

      console.log("✅ IndexedDB schema upgraded");
    };
  });
}

/**
 * Generic transaction helper
 */
async function withTransaction<T>(
  storeName: string,
  mode: IDBTransactionMode,
  callback: (store: IDBObjectStore) => IDBRequest<T>
): Promise<T> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, mode);
    const store = transaction.objectStore(storeName);
    const request = callback(store);

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

// ============ Labels Cache ============

/**
 * Cache Gmail labels
 */
export async function cacheLabels(labels: GmailLabel[]): Promise<void> {
  const db = await getDB();
  const transaction = db.transaction(
    [STORES.LABELS, STORES.METADATA],
    "readwrite"
  );
  const labelsStore = transaction.objectStore(STORES.LABELS);
  const metaStore = transaction.objectStore(STORES.METADATA);

  // Clear existing labels and add new ones
  labelsStore.clear();
  labels.forEach((label) => labelsStore.add(label));

  // Update timestamp
  metaStore.put({ key: META_KEYS.LABELS_TIMESTAMP, value: Date.now() });

  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => {
      console.log("📦 Labels cached:", labels.length);
      resolve();
    };
    transaction.onerror = () => reject(transaction.error);
  });
}

/**
 * Get cached labels
 */
export async function getCachedLabels(): Promise<{
  labels: GmailLabel[];
  isStale: boolean;
} | null> {
  try {
    const db = await getDB();
    const transaction = db.transaction(
      [STORES.LABELS, STORES.METADATA],
      "readonly"
    );
    const labelsStore = transaction.objectStore(STORES.LABELS);
    const metaStore = transaction.objectStore(STORES.METADATA);

    const [labels, timestampEntry] = await Promise.all([
      new Promise<GmailLabel[]>((resolve, reject) => {
        const request = labelsStore.getAll();
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      }),
      new Promise<MetadataEntry | undefined>((resolve, reject) => {
        const request = metaStore.get(META_KEYS.LABELS_TIMESTAMP);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      }),
    ]);

    if (!labels || labels.length === 0) {
      return null;
    }

    const timestamp = (timestampEntry?.value as number) || 0;
    const isStale = Date.now() - timestamp > CACHE_TTL.LABELS;

    return { labels, isStale };
  } catch (error) {
    console.error("❌ Error getting cached labels:", error);
    return null;
  }
}

// ============ Email List Cache ============

/**
 * Cache emails for a specific label/mailbox
 */
export async function cacheEmails(
  labelId: string,
  emails: GmailEmail[],
  nextPageToken?: string
): Promise<void> {
  const entry: EmailListCacheEntry = {
    labelId,
    emails,
    nextPageToken,
    timestamp: Date.now(),
  };

  await withTransaction(STORES.EMAILS, "readwrite", (store) =>
    store.put(entry)
  );
  console.log(`📦 Cached ${emails.length} emails for ${labelId}`);
}

/**
 * Get cached emails for a label
 */
export async function getCachedEmails(labelId: string): Promise<{
  emails: GmailEmail[];
  nextPageToken?: string;
  isStale: boolean;
} | null> {
  try {
    const entry = await withTransaction<EmailListCacheEntry | undefined>(
      STORES.EMAILS,
      "readonly",
      (store) => store.get(labelId)
    );

    if (!entry || !entry.emails) {
      return null;
    }

    const isStale = Date.now() - entry.timestamp > CACHE_TTL.EMAILS;
    return {
      emails: entry.emails,
      nextPageToken: entry.nextPageToken,
      isStale,
    };
  } catch (error) {
    console.error("❌ Error getting cached emails:", error);
    return null;
  }
}

/**
 * Update a single email in the cache (for optimistic updates)
 */
export async function updateCachedEmail(
  labelId: string,
  emailId: string,
  updates: Partial<GmailEmail>
): Promise<void> {
  try {
    const cached = await getCachedEmails(labelId);
    if (!cached) return;

    const updatedEmails = cached.emails.map((email) =>
      email.id === emailId ? { ...email, ...updates } : email
    );

    await cacheEmails(labelId, updatedEmails, cached.nextPageToken);
  } catch (error) {
    console.error("❌ Error updating cached email:", error);
  }
}

/**
 * Remove an email from the cache
 */
export async function removeCachedEmail(
  labelId: string,
  emailId: string
): Promise<void> {
  try {
    const cached = await getCachedEmails(labelId);
    if (!cached) return;

    const filteredEmails = cached.emails.filter(
      (email) => email.id !== emailId
    );
    await cacheEmails(labelId, filteredEmails, cached.nextPageToken);
  } catch (error) {
    console.error("❌ Error removing cached email:", error);
  }
}

// ============ Email Details Cache ============

/**
 * Cache email details
 */
export async function cacheEmailDetail(email: GmailEmail): Promise<void> {
  const entry: EmailDetailCacheEntry = {
    id: email.id,
    email,
    timestamp: Date.now(),
  };

  await withTransaction(STORES.EMAIL_DETAILS, "readwrite", (store) =>
    store.put(entry)
  );
  console.log(`📦 Cached email detail: ${email.id}`);
}

/**
 * Get cached email details
 */
export async function getCachedEmailDetail(
  emailId: string
): Promise<{ email: GmailEmail; isStale: boolean } | null> {
  try {
    const entry = await withTransaction<EmailDetailCacheEntry | undefined>(
      STORES.EMAIL_DETAILS,
      "readonly",
      (store) => store.get(emailId)
    );

    if (!entry || !entry.email) {
      return null;
    }

    const isStale = Date.now() - entry.timestamp > CACHE_TTL.EMAIL_DETAILS;
    return { email: entry.email, isStale };
  } catch (error) {
    console.error("❌ Error getting cached email detail:", error);
    return null;
  }
}

/**
 * Update cached email detail
 */
export async function updateCachedEmailDetail(
  emailId: string,
  updates: Partial<GmailEmail>
): Promise<void> {
  try {
    const cached = await getCachedEmailDetail(emailId);
    if (!cached) return;

    const updatedEmail = { ...cached.email, ...updates };
    await cacheEmailDetail(updatedEmail);
  } catch (error) {
    console.error("❌ Error updating cached email detail:", error);
  }
}

// ============ Metadata & Utility Functions ============

/**
 * Set metadata value
 */
export async function setMetadata(
  key: string,
  value: string | number
): Promise<void> {
  await withTransaction(STORES.METADATA, "readwrite", (store) =>
    store.put({ key, value })
  );
}

/**
 * Get metadata value
 */
export async function getMetadata(
  key: string
): Promise<string | number | null> {
  try {
    const entry = await withTransaction<MetadataEntry | undefined>(
      STORES.METADATA,
      "readonly",
      (store) => store.get(key)
    );
    return entry?.value ?? null;
  } catch {
    return null;
  }
}

/**
 * Get last sync timestamp
 */
export async function getLastSyncTime(): Promise<number | null> {
  const value = await getMetadata(META_KEYS.LAST_SYNC);
  return typeof value === "number" ? value : null;
}

/**
 * Update last sync timestamp
 */
export async function updateLastSyncTime(): Promise<void> {
  await setMetadata(META_KEYS.LAST_SYNC, Date.now());
}

/**
 * Clear all cached data
 */
export async function clearAllCache(): Promise<void> {
  const db = await getDB();
  const transaction = db.transaction(
    [STORES.LABELS, STORES.EMAILS, STORES.EMAIL_DETAILS, STORES.METADATA],
    "readwrite"
  );

  transaction.objectStore(STORES.LABELS).clear();
  transaction.objectStore(STORES.EMAILS).clear();
  transaction.objectStore(STORES.EMAIL_DETAILS).clear();
  transaction.objectStore(STORES.METADATA).clear();

  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => {
      console.log("🗑️ All cache cleared");
      resolve();
    };
    transaction.onerror = () => reject(transaction.error);
  });
}

/**
 * Get cache statistics
 */
export async function getCacheStats(): Promise<{
  labelsCount: number;
  emailListsCount: number;
  emailDetailsCount: number;
  lastSync: number | null;
}> {
  const db = await getDB();
  const transaction = db.transaction(
    [STORES.LABELS, STORES.EMAILS, STORES.EMAIL_DETAILS, STORES.METADATA],
    "readonly"
  );

  const [labelsCount, emailListsCount, emailDetailsCount, lastSync] =
    await Promise.all([
      new Promise<number>((resolve) => {
        const request = transaction.objectStore(STORES.LABELS).count();
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => resolve(0);
      }),
      new Promise<number>((resolve) => {
        const request = transaction.objectStore(STORES.EMAILS).count();
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => resolve(0);
      }),
      new Promise<number>((resolve) => {
        const request = transaction.objectStore(STORES.EMAIL_DETAILS).count();
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => resolve(0);
      }),
      new Promise<number | null>((resolve) => {
        const request = transaction
          .objectStore(STORES.METADATA)
          .get(META_KEYS.LAST_SYNC);
        request.onsuccess = () => resolve(request.result?.value ?? null);
        request.onerror = () => resolve(null);
      }),
    ]);

  return {
    labelsCount,
    emailListsCount,
    emailDetailsCount,
    lastSync,
  };
}

/**
 * Cleanup old cache entries
 */
export async function cleanupOldCache(): Promise<void> {
  const db = await getDB();
  const now = Date.now();
  const maxAge = 24 * 60 * 60 * 1000; // 24 hours

  // Cleanup old email details
  const transaction = db.transaction(STORES.EMAIL_DETAILS, "readwrite");
  const store = transaction.objectStore(STORES.EMAIL_DETAILS);
  const index = store.index("timestamp");

  const request = index.openCursor(IDBKeyRange.upperBound(now - maxAge));

  request.onsuccess = (event) => {
    const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result;
    if (cursor) {
      cursor.delete();
      cursor.continue();
    }
  };

  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => {
      console.log("🧹 Old cache entries cleaned up");
      resolve();
    };
    transaction.onerror = () => reject(transaction.error);
  });
}

// Initialize cleanup on load
export function initEmailCacheCleanup(delayMs: number = 5000) {
  if (typeof window !== "undefined") {
    setTimeout(() => {
      cleanupOldCache().catch(console.error);
    }, delayMs);
  }
}
