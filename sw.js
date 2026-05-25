/*
 * Service Worker — Чимун ХХК Дотоод даалгавар
 *
 * Strategy (v37+):
 *  - HTML navigation (index.html) → NETWORK-FIRST. Онлайн үед үргэлж шинэ код татна,
 *    офлайн үед cache-аас өгнө. Энэ нь шинэчлэлт шууд хүрдэг болгоно.
 *  - Бусад статик (CSS/JS/icons) → cache-first (хурдан + офлайн).
 *  - n8n webhook calls → network-first.
 *
 * Bump CACHE_VERSION whenever index.html or assets change so phones pick up new code.
 */

const CACHE_VERSION = 'chimun-tasks-v110-level-from-role-2026-05-25';
const SHELL_FILES = [
  './',
  './index.html',
  './styles.css',
  './app.js',
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

  // NETWORK-FIRST for HTML navigation + app shell (index.html, styles.css, app.js)
  // — ингэснээр шинэчилсэн код шууд хүрнэ. CSS/JS-ийг HTML-тэй хамт fresh байлгасан нь
  //   хувилбар таарахгүй (HTML шинэ, JS хуучин) асуудлаас сэргийлнэ.
  const isHTML = req.mode === 'navigate'
    || url.pathname.endsWith('/')
    || url.pathname.endsWith('/index.html');
  const isAppShell = url.origin === self.location.origin
    && (url.pathname.endsWith('/styles.css') || url.pathname.endsWith('/app.js'));
  if (isHTML || isAppShell) {
    event.respondWith(
      fetch(req)
        .then((res) => {
          // Шинэ HTML-г cache-д хадгалж офлайн fallback болгоно
          if (res.ok && url.origin === self.location.origin) {
            const copy = res.clone();
            caches.open(CACHE_VERSION).then((cache) => cache.put(req, copy));
          }
          return res;
        })
        .catch(() => caches.match(req).then(c => c || (isHTML ? caches.match('./index.html') : undefined)))
    );
    return;
  }

  // Cache-first for everything else (статик asset — icon, manifest г.м.)
  event.respondWith(
    caches.match(req).then((cached) => {
      if (cached) return cached;
      return fetch(req).then((res) => {
        if (res.ok && url.origin === self.location.origin) {
          const copy = res.clone();
          caches.open(CACHE_VERSION).then((cache) => cache.put(req, copy));
        }
        return res;
      });
    })
  );
});
