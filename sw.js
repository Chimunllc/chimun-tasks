/*
 * Service Worker — Чимун ХХК Дотоод даалгавар
 *
 * Strategy:
 *  - Static shell (HTML/CSS/JS/icons) → cache-first, so the app opens instantly and works offline.
 *  - n8n webhook calls → network-first with timeout, fall through to "queue" idea (todo: bg sync).
 *
 * Bump CACHE_VERSION whenever index.html or assets change so phones pick up new code.
 */

const CACHE_VERSION = 'chimun-tasks-v23-conversational-2026-05-17';
const SHELL_FILES = [
  './',
  './index.html',
  './manifest.json',
  './icon.svg',
];

self.addEventListener('install', (event) => {
  // Pre-cache the app shell on first install / update
  event.waitUntil(
    caches.open(CACHE_VERSION).then((cache) => cache.addAll(SHELL_FILES))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  // Clean up old caches when a new SW takes over
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_VERSION).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // Don't try to cache POSTs or non-http(s) schemes
  if (req.method !== 'GET' || !url.protocol.startsWith('http')) return;

  // Network-first for n8n / API calls so users always get fresh task data when online
  if (url.hostname.endsWith('.n8n.cloud') || url.pathname.includes('/webhook/')) {
    event.respondWith(
      fetch(req)
        .then((res) => res)
        .catch(() => caches.match(req)) // graceful fallback if cached
    );
    return;
  }

  // Cache-first for everything else (the app shell)
  event.respondWith(
    caches.match(req).then((cached) => {
      if (cached) return cached;
      return fetch(req).then((res) => {
        // Stash same-origin successful responses for offline use
        if (res.ok && url.origin === self.location.origin) {
          const copy = res.clone();
          caches.open(CACHE_VERSION).then((cache) => cache.put(req, copy));
        }
        return res;
      });
    })
  );
});
