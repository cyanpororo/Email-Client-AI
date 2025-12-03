import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { GoogleOAuthProvider } from "@react-oauth/google";
import "./index.css";
import App from "./App.tsx";
import { registerServiceWorker } from "./lib/serviceWorker";

// Register service worker for offline support
// Enable in both dev and prod for testing; remove `import.meta.env.PROD` check if you want dev testing
if (import.meta.env.PROD || import.meta.env.VITE_ENABLE_SW === "true") {
  registerServiceWorker();
}

// Configure QueryClient with stale-while-revalidate pattern
// This works alongside IndexedDB for comprehensive offline support
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Stale-while-revalidate pattern: use cached data while fetching fresh data
      staleTime: 5 * 60 * 1000, // Data is fresh for 5 minutes
      gcTime: 30 * 60 * 1000, // Keep unused data in cache for 30 minutes (extended for offline)
      refetchOnWindowFocus: true, // Refetch when window regains focus
      refetchOnReconnect: true, // Refetch when network reconnects
      retry: (failureCount, error: any) => {
        // Don't retry on 4xx errors (except 408 Request Timeout)
        if (
          error?.response?.status >= 400 &&
          error?.response?.status < 500 &&
          error?.response?.status !== 408
        ) {
          return false;
        }
        // Retry up to 3 times for network errors
        return failureCount < 3;
      },
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000), // Exponential backoff
      networkMode: "offlineFirst", // Try cache first, then network
    },
    mutations: {
      retry: 1,
      networkMode: "offlineFirst",
    },
  },
});

// Get Google Client ID from environment variable
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || "";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </QueryClientProvider>
    </GoogleOAuthProvider>
  </StrictMode>
);
