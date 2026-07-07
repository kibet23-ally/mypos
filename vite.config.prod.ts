import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import svgr from "vite-plugin-svgr";
import { VitePWA } from "vite-plugin-pwa";
import path from "path";

// Production build config for Vercel — no Miaoda dev-only plugins
export default defineConfig({
  plugins: [
    react(),
    svgr({
      svgrOptions: {
        icon: true,
        exportType: "named",
        namedExport: "ReactComponent",
      },
    }),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["favicon.png", "icon-192.png", "icon-512.png"],
      manifest: {
        name: "PosifyPro",
        short_name: "PosifyPro",
        description: "Point-of-sale platform for modern retail businesses",
        theme_color: "#2563EB",
        background_color: "#ffffff",
        display: "standalone",
        start_url: "/",
        scope: "/",
        icons: [
          { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
          { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
          { src: "/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
        ],
      },
      workbox: {
        // New SW takes over immediately so we never keep serving stale chunks.
        skipWaiting: true,
        clientsClaim: true,
        // Stable cacheId — required for cleanupOutdatedCaches to actually find
        // and delete precaches from previous deploys. (Date.now() created a
        // brand-new bucket per build, so old precaches were never cleaned up
        // and kept serving stale index.html → blank page after redeploy.)
        cacheId: "posifypro",
        cleanupOutdatedCaches: true,
        // Only precache non-versioned static assets (fonts, icons).
        // DO NOT precache hashed JS/CSS chunks — they change on every deploy
        // and a stale precache pointing to old hash filenames is the #1 cause
        // of blank pages after redeployment. Chunks are served by the
        // StaleWhileRevalidate runtime route below so they still load fast.
        // DO NOT include index.html — it must always come from the network
        // so the browser gets the latest hashed chunk references.
        globPatterns: ["*.{ico,png,svg,webmanifest}"],
        // No navigation fallback — navigations are handled by the runtime
        // NetworkFirst route below.
        navigateFallback: null,
        runtimeCaching: [
          {
            // App navigations (HTML) — always try the network first so a fresh
            // index.html with the latest hashed chunk URLs is used. Falls back
            // to the last cached copy only when offline / network times out.
            urlPattern: ({ request }) => request.mode === "navigate",
            handler: "NetworkFirst",
            options: {
              cacheName: "html-shell",
              networkTimeoutSeconds: 3,
              expiration: { maxEntries: 4 },
            },
          },
          {
            // Hashed JS/CSS chunks from /assets/ — StaleWhileRevalidate so
            // the browser loads fast from cache while refreshing in the
            // background. The immutable Vercel Cache-Control header means the
            // CDN serves the correct file; the SW layer adds a redundant
            // offline fallback. Old cache entries for superseded hashes are
            // cleaned up automatically by cleanupOutdatedCaches.
            urlPattern: ({ url }) =>
              url.pathname.startsWith("/assets/") &&
              (url.pathname.endsWith(".js") || url.pathname.endsWith(".css")),
            handler: "StaleWhileRevalidate",
            options: {
              cacheName: "js-css-chunks",
              expiration: {
                maxEntries: 120,
                maxAgeSeconds: 60 * 60 * 24 * 30, // 30 days
              },
            },
          },
          {
            // Supabase calls: always go to network — offline handled via IndexedDB.
            urlPattern: ({ url }) => url.hostname.endsWith(".supabase.co"),
            handler: "NetworkOnly",
          },
          {
            // Google Fonts: cache for 1 year.
            urlPattern: ({ url }) =>
              url.hostname === "fonts.googleapis.com" || url.hostname === "fonts.gstatic.com",
            handler: "CacheFirst",
            options: {
              cacheName: "google-fonts",
              expiration: { maxAgeSeconds: 60 * 60 * 24 * 365 },
            },
          },
        ],
      },
      devOptions: { enabled: false },
    }),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    outDir: "dist",
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          if (id.includes("node_modules/@supabase")) return "supabase";
          if (id.includes("node_modules/react") || id.includes("node_modules/react-dom")) return "vendor-react";
          if (id.includes("node_modules/react-router")) return "vendor-router";
          if (id.includes("node_modules/@radix-ui")) return "vendor-ui";
          if (id.includes("node_modules/recharts")) return "vendor-charts";
        },
      },
    },
  },
});
