export function registerServiceWorker() {
  if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
      navigator.serviceWorker
        .register("/service-worker.js")
        .then((registration) => {
          console.log("✅ Service Worker registered:", registration.scope);

          // Check for updates periodically
          setInterval(() => {
            registration.update();
          }, 60000); // Check every minute

          // Handle updates
          registration.addEventListener("updatefound", () => {
            const newWorker = registration.installing;
            if (newWorker) {
              newWorker.addEventListener("statechange", () => {
                if (
                  newWorker.state === "installed" &&
                  navigator.serviceWorker.controller
                ) {
                  // New service worker available, prompt user to refresh
                  if (confirm("New version available! Reload to update?")) {
                    newWorker.postMessage({ type: "SKIP_WAITING" });
                  }
                }
              });
            }
          });
        })
        .catch((error) => {
          console.error("❌ Service Worker registration failed:", error);
        });

      // Handle controller change (new SW activated)
      navigator.serviceWorker.addEventListener("controllerchange", () => {
        window.location.reload();
      });

      // Listen for messages from service worker
      navigator.serviceWorker.addEventListener("message", (event) => {
        if (event.data && event.data.type === "SYNC_EMAILS") {
          // Trigger email sync in the app
          window.dispatchEvent(new CustomEvent("sw-sync-emails"));
        }
        if (event.data && event.data.type === "BACKGROUND_SYNC") {
          // Trigger background sync
          window.dispatchEvent(new CustomEvent("sw-background-sync"));
        }
      });
    });
  } else {
    console.log("⚠️ Service Workers not supported in this browser");
  }
}

export function unregisterServiceWorker() {
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.ready
      .then((registration) => {
        return registration.unregister();
      })
      .then(() => {
        console.log("✅ Service Worker unregistered");
      })
      .catch((error) => {
        console.error("❌ Service Worker unregistration failed:", error);
      });
  }
}

export function clearCache() {
  if ("caches" in window) {
    caches
      .keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => caches.delete(cacheName))
        );
      })
      .then(() => {
        console.log("✅ All caches cleared");
      });
  }
}

/**
 * Clear only the API cache
 */
export function clearApiCache() {
  if ("serviceWorker" in navigator && navigator.serviceWorker.controller) {
    navigator.serviceWorker.controller.postMessage({ type: "CLEAR_API_CACHE" });
    console.log("📤 Requested API cache clear");
  }
}

/**
 * Prefetch URLs into the service worker cache
 */
export function prefetchUrls(urls: string[]) {
  if ("serviceWorker" in navigator && navigator.serviceWorker.controller) {
    navigator.serviceWorker.controller.postMessage({
      type: "PREFETCH",
      urls,
    });
    console.log("📤 Requested prefetch for:", urls.length, "URLs");
  }
}

/**
 * Request a background sync
 */
export async function requestSync(tag: string = "sync-emails") {
  if (
    "serviceWorker" in navigator &&
    "sync" in window.ServiceWorkerRegistration.prototype
  ) {
    try {
      const registration = await navigator.serviceWorker.ready;
      // @ts-ignore - sync API not fully typed
      await registration.sync.register(tag);
      console.log("📤 Background sync registered:", tag);
    } catch (error) {
      console.error("❌ Background sync registration failed:", error);
    }
  } else {
    console.log("⚠️ Background sync not supported");
  }
}

/**
 * Check if service worker is active
 */
export function isServiceWorkerActive(): boolean {
  return !!("serviceWorker" in navigator && navigator.serviceWorker.controller);
}

/**
 * Get service worker registration status
 */
export async function getServiceWorkerStatus(): Promise<{
  registered: boolean;
  active: boolean;
  waiting: boolean;
}> {
  if (!("serviceWorker" in navigator)) {
    return { registered: false, active: false, waiting: false };
  }

  try {
    const registration = await navigator.serviceWorker.getRegistration();
    return {
      registered: !!registration,
      active: !!registration?.active,
      waiting: !!registration?.waiting,
    };
  } catch {
    return { registered: false, active: false, waiting: false };
  }
}
