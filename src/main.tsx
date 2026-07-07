import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.tsx";
import { AppWrapper } from "./components/common/PageMeta.tsx";
<<<<<<< HEAD

createRoot(document.getElementById("root")!).render(
  <AppWrapper>
    <App />
  </AppWrapper>
);
=======
import { ErrorBoundary } from "./components/common/ErrorBoundary.tsx";

console.log('[PosifyPro] Application started — build env:', import.meta.env.MODE);

// ── ChunkLoadError recovery ─────────────────────────────────────────────────
window.addEventListener('error', (event) => {
  const msg = event.message ?? '';
  if (
    msg.includes('Loading chunk') ||
    msg.includes('Failed to fetch dynamically imported module') ||
    msg.includes('error loading dynamically imported module') ||
    msg.includes('Importing a module script failed')
  ) {
    console.warn('[PosifyPro] ChunkLoadError detected — clearing caches and reloading…', msg);
    if ('caches' in window) {
      caches.keys()
        .then(keys => Promise.all(keys.map(k => caches.delete(k))))
        .finally(() => window.location.reload());
    } else {
      window.location.reload();
    }
  }
});

window.addEventListener('unhandledrejection', (event) => {
  const reason = String(event.reason ?? '');
  if (
    reason.includes('Loading chunk') ||
    reason.includes('Failed to fetch dynamically imported module') ||
    reason.includes('error loading dynamically imported module')
  ) {
    console.warn('[PosifyPro] ChunkLoadError (unhandled rejection) — reloading…', reason);
    event.preventDefault();
    if ('caches' in window) {
      caches.keys()
        .then(keys => Promise.all(keys.map(k => caches.delete(k))))
        .finally(() => window.location.reload());
    } else {
      window.location.reload();
    }
  }
});

// ── Mount ────────────────────────────────────────────────────────────────────
const rootEl = document.getElementById("root");
if (!rootEl) {
  console.error('[PosifyPro] FATAL: #root element not found in DOM');
  document.body.innerHTML = `
    <div style="min-height:100vh;display:flex;align-items:center;justify-content:center;font-family:sans-serif;background:#f8fafc">
      <div style="text-align:center;padding:2rem">
        <h1 style="font-size:1.25rem;font-weight:700;color:#0f172a">Failed to start</h1>
        <p style="color:#64748b;margin-top:.5rem">Root element not found. Please reload.</p>
        <button onclick="window.location.reload()" style="margin-top:1rem;padding:.5rem 1.5rem;background:#2563EB;color:#fff;border:none;border-radius:.5rem;cursor:pointer">Reload</button>
      </div>
    </div>`;
} else {
  console.log('[PosifyPro] Mounting React into #root…');
  createRoot(rootEl).render(
    <ErrorBoundary>
      <AppWrapper>
        <App />
      </AppWrapper>
    </ErrorBoundary>
  );
  console.log('[PosifyPro] React mounted successfully');
}
>>>>>>> b72e8c4 (feat: dynamic multi-currency support, edge function fixes)
