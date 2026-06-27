import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

// ============================================================================
// PWA / offline strategy notes:
// - Precaches the app shell (HTML/JS/CSS) so the app boots even with zero
//   connectivity.
// - Runtime-caches GET /api/courses* responses with a NetworkFirst strategy:
//   try the network (to get fresh data), but fall back to cache if offline.
//   This complements (does not replace) the Dexie cache in db.ts — Dexie is
//   used for the structured, query-able lesson/quiz/progress data the app
//   logic depends on; the service worker cache is a coarser HTTP-level
//   safety net for the raw API responses themselves.
// - We deliberately do NOT cache POST/PATCH requests — writes always go
//   through the Dexie syncQueue (see db/syncManager.ts) instead, since a
//   cached POST response would be meaningless for a write whose body
//   changes every time.
// ============================================================================
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      manifest: {
        name: "ElimuPopote",
        short_name: "ElimuPopote",
        description: "Education Everywhere — offline-capable corporate training",
        theme_color: "#1864ab",
        background_color: "#ffffff",
        display: "standalone",
        start_url: "/",
        icons: [
          { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
          { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
        ],
      },
      workbox: {
        runtimeCaching: [
          {
            urlPattern: ({ url, request }) =>
              request.method === "GET" && url.pathname.startsWith("/api/courses"),
            handler: "NetworkFirst",
            options: {
              cacheName: "api-courses-cache",
              networkTimeoutSeconds: 4,
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            urlPattern: ({ url, request }) =>
              request.method === "GET" && url.pathname.startsWith("/api/analytics"),
            handler: "NetworkFirst",
            options: { cacheName: "api-analytics-cache", networkTimeoutSeconds: 4 },
          },
        ],
        navigateFallback: "/index.html",
      },
      devOptions: { enabled: true },
    }),
  ],
  server: { port: 5173 },
});
