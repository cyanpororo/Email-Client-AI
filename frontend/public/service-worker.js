const CACHE_NAME = "g04-email-cache-v2";
const RUNTIME_CACHE = "g04-runtime-cache-v2";
const API_CACHE = "g04-api-cache-v1";

// Resources to cache on install (static assets)
const PRECACHE_URLS = ["/", "/index.html", "/manifest.json"];

// API paths that should use stale-while-revalidate
const CACHEABLE_API_PATHS = ["/api/gmail/mailboxes", "/api/gmail/emails"];

// API paths that should never be cached (mutations, auth)
const NON_CACHEABLE_API_PATHS = [
  "/api/auth/",
  "/api/gmail/send",
  "/api/gmail/reply",
  "/api/gmail/star",
  "/api/gmail/read",
  "/api/gmail/unread",
  "/api/gmail/delete",
  "/api/gmail/archive",
  "/api/gmail/modify",
  "/api/gmail/connect",
  "/api/gmail/disconnect",
];

// Install event - cache static resources
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log("📦 Service Worker: Caching static assets");
      return cache.addAll(PRECACHE_URLS);
    })
  );
  // Force the waiting service worker to become the active service worker
  self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener("activate", (event) => {
  const currentCaches = [CACHE_NAME, RUNTIME_CACHE, API_CACHE];
  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) => {
        return cacheNames.filter(
          (cacheName) => !currentCaches.includes(cacheName)
        );
      })
      .then((cachesToDelete) => {
        return Promise.all(
          cachesToDelete.map((cacheToDelete) => {
            console.log(
              "🗑️ Service Worker: Deleting old cache:",
              cacheToDelete
            );
            return caches.delete(cacheToDelete);
          })
        );
      })
      .then(() => self.clients.claim())
  );
});

// Check if URL should never be cached
function isNonCacheable(url) {
  return NON_CACHEABLE_API_PATHS.some((path) => url.includes(path));
}

// Check if URL is a cacheable API request
function isCacheableApi(url) {
  return CACHEABLE_API_PATHS.some((path) => url.includes(path));
}

// Check if request is an API request
function isApiRequest(url) {
  return url.includes("/api/");
}

// Fetch event - stale-while-revalidate strategy with smart caching
self.addEventListener("fetch", (event) => {
  const url = event.request.url;

  // Skip cross-origin requests
  if (!url.startsWith(self.location.origin)) {
    return;
  }

  // Never cache mutation/auth requests - always go to network
  if (isNonCacheable(url)) {
    return;
  }

  // For API requests that are cacheable, use stale-while-revalidate
  if (
    isApiRequest(url) &&
    isCacheableApi(url) &&
    event.request.method === "GET"
  ) {
    event.respondWith(
      caches.open(API_CACHE).then((cache) => {
        return cache.match(event.request).then((cachedResponse) => {
          // Create fetch promise
          const fetchPromise = fetch(event.request)
            .then((networkResponse) => {
              // Only cache successful GET responses
              if (networkResponse && networkResponse.status === 200) {
                // Clone the response before caching
                const responseToCache = networkResponse.clone();
                cache.put(event.request, responseToCache);
                console.log("📥 Service Worker: Cached API response:", url);
              }
              return networkResponse;
            })
            .catch((error) => {
              console.log(
                "⚠️ Service Worker: Network failed, using cache:",
                url
              );
              // If we have a cached response, return it on network failure
              if (cachedResponse) {
                return cachedResponse;
              }
              throw error;
            });

          // Return cached response immediately (stale), update in background (revalidate)
          if (cachedResponse) {
            console.log(
              "📦 Service Worker: Returning cached API response:",
              url
            );
            // Trigger background update
            fetchPromise.catch((error) => {
              console.error("Service Worker: Background update failed:", error);
            }); // Ignore errors for background update
            return cachedResponse;
          }

          // No cache, wait for network
          return fetchPromise;
        });
      })
    );
    return;
  }

  // For static assets, use cache-first strategy
  if (!isApiRequest(url)) {
    event.respondWith(
      caches.open(RUNTIME_CACHE).then((cache) => {
        return cache.match(event.request).then((cachedResponse) => {
          if (cachedResponse) {
            // Update cache in background for static assets
            fetch(event.request)
              .then((networkResponse) => {
                if (networkResponse && networkResponse.status === 200) {
                  cache.put(event.request, networkResponse.clone());
                }
              })
              .catch((err) => {
                console.error("Background update of static asset failed:", err);
              });
            return cachedResponse;
          }

          return fetch(event.request)
            .then((networkResponse) => {
              if (networkResponse && networkResponse.status === 200) {
                cache.put(event.request, networkResponse.clone());
              }
              return networkResponse;
            })
            .catch(() => {
              // Return offline page or placeholder for navigation requests
              if (event.request.mode === "navigate") {
                return caches.match("/index.html");
              }
              throw new Error("Network unavailable and no cache");
            });
        });
      })
    );
    return;
  }

  // For other API requests (not explicitly cacheable), network-first
  event.respondWith(
    fetch(event.request).catch(() => {
      // Try cache as fallback
      return caches.match(event.request);
    })
  );
});

// Message event - for cache management from client
self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }

  if (event.data && event.data.type === "CLEAR_CACHE") {
    event.waitUntil(
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            console.log("🗑️ Service Worker: Clearing cache:", cacheName);
            return caches.delete(cacheName);
          })
        );
      })
    );
  }

  if (event.data && event.data.type === "CLEAR_API_CACHE") {
    event.waitUntil(
      caches.delete(API_CACHE).then(() => {
        console.log("🗑️ Service Worker: API cache cleared");
      })
    );
  }

  // Prefetch specific URLs
  if (event.data && event.data.type === "PREFETCH") {
    const urls = event.data.urls || [];
    event.waitUntil(
      caches.open(API_CACHE).then((cache) => {
        return Promise.all(
          urls.map((url) =>
            fetch(url)
              .then((response) => {
                if (response.status === 200) {
                  cache.put(url, response);
                  console.log("📥 Service Worker: Prefetched:", url);
                }
              })
              .catch((err) => {
                console.log(
                  "⚠️ Service Worker: Prefetch failed for:",
                  url,
                  err
                );
              })
          )
        );
      })
    );
  }
});

// Background sync for offline actions (if supported)
self.addEventListener("sync", (event) => {
  if (event.tag === "sync-emails") {
    event.waitUntil(
      // Notify all clients to sync
      self.clients.matchAll().then((clients) => {
        clients.forEach((client) => {
          client.postMessage({ type: "SYNC_EMAILS" });
        });
      })
    );
  }
});

// Periodic background sync (if supported)
self.addEventListener("periodicsync", (event) => {
  if (event.tag === "update-emails") {
    event.waitUntil(
      self.clients.matchAll().then((clients) => {
        clients.forEach((client) => {
          client.postMessage({ type: "BACKGROUND_SYNC" });
        });
      })
    );
  }
});

console.log("✅ Service Worker: Loaded with offline caching support");
