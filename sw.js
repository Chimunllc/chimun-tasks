/*
 * Service Worker — Чимун ХХК Дотоод даалгавар
 *
 * Strategy (v37+):
 *  - HTML navigation (index.html) → NETWORK-FIRST. Онлайн үед үргэлж шинэ код татна,
 *    офлайн үед cache-аас өгнө. Энэ нь шинэчлэлт шууд хүрдэг болгоно.
 *  - Бусад статик (CSS/JS/icons) → cache-first (хурдан + офлайн).
 *  - n8n webhook calls → network-first.
 *
 * CACHE_VERSION хэзээ бөглөх вэ:
 *   NETWORK_FIRST файлууд (index.html, styles.css, app.js) — БӨГЛӨХ ШААРДЛАГАГҮЙ.
 *     Тэдгээрийг доорх fetch handler `cache:'reload'`-оор сүлжээнээс үргэлж шинээр
 *     татдаг тул шинэчлэл хувилбараас үл хамааран шууд хүрнэ.
 *   Үлдсэн shell файл (manifest.json, icon.svg) — cache-first тул БӨГЛӨНӨ.
 * (2026-09-04: PR бүр гараар бөглөж байсан нь нэг мөр дээр байнга зөрчил үүсгэж,
 *  зэрэг ажилладаг агентуудыг удаашруулж байв. Шаардлагагүй байсныг тогтоов.)
 */

const CACHE_VERSION = 'chimun-tasks-v854-warehouse-capital-2026-09-07';
// Сүлжээнээс ҮРГЭЛЖ шинээр татдаг файлууд. Энэ жагсаалт нь fetch handler-т
// ашиглагдана (чимэг биш) бөгөөс CI шалгалт ч үүнээс уншина — нэг эх сурвалж.
const NETWORK_FIRST = ['index.html', 'styles.css', 'app.js'];
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

/* -------------------- WEB PUSH -------------------- */
// Sheet өөрчлөгдөх бүрд n8n /push-broadcast endpoint бүх subscribe-чдад push илгээнэ.
// Payload: { kind: 'tasks'|'finance'|'staff', title, body, url }
// SW push авангуутаа client-уудад postMessage хийж refreshFromServer дуудуулна.
self.addEventListener('push', (event) => {
  let data = {};
  try { data = event.data ? event.data.json() : {}; } catch(e) { data = { body: event.data ? event.data.text() : '' }; }
  const kind = data.kind || 'tasks';
  const title = data.title || 'Чимун ХХК — шинэчлэлт';
  const body  = data.body  || 'Шинэ өөрчлөлт ирлээ';
  const url   = data.url   || './';

  event.waitUntil((async () => {
    // 1) Бүх нээлттэй client-д postMessage илгээж UI шууд refresh хийлгэнэ
    const clients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    clients.forEach(c => c.postMessage({ type: 'push-refresh', kind }));
    // 2) Хэрэв ямар ч таб идэвхтэй биш бол notification харуулна (push зөвшөөрөл өгсөн бол)
    const anyVisible = clients.some(c => c.visibilityState === 'visible');
    if (!anyVisible) {
      // tag — мэдэгдэл бүрд ӨӨР байх ёстой. Өмнө нь бүгд tag:'tasks' байсан тул
      // шинэ ажлын мэдэгдэл хуучныг ЧИМЭЭГҮЙ орлож, дуу/чичиргээ гардаггүй байв.
      // renotify:true нь ижил tag дахин ашиглагдсан ч дахин сануулна.
      const tag = data.tag || (kind + ':' + (data.id || Date.now()));
      await self.registration.showNotification(title, {
        body, icon: './icon-192.png', badge: './icon-192.png',
        tag,
        renotify: true,
        requireInteraction: kind === 'tasks',   // ажлын мэдэгдэл дарах хүртэл дэлгэцэнд үлдэнэ
        vibrate: [200, 100, 200],
        data: { url },
      });
    }
  })());
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || './';
  event.waitUntil((async () => {
    const clients = await self.clients.matchAll({ type: 'window' });
    if (clients.length) { clients[0].focus(); return; }
    await self.clients.openWindow(targetUrl);
  })());
});

// App shell-ийн кэшлэгдсэн хувилбарыг олох. Сүлжээ унасан ч, 404/503 буцаасан ч
// ижил замаар уналт хийнэ. `ignoreSearch` — `app.js?v=123` хэлбэрийн хүсэлт
// precache-тай (`./app.js`) таарахгүй байхаас сэргийлнэ.
function shellFallback(req, isHTML) {
  return caches.match(req)
    .then((c) => c || caches.match(req, { ignoreSearch: true }))
    .then((c) => c || (isHTML ? caches.match('./index.html') : undefined))
    .catch(() => undefined);
}

// respondWith нь reject болвол эсвэл undefined авбал хуудсанд «FetchEvent.respondWith
// received an error» гэсэн ойлгомжгүй алдаа очдог. Тиймээс бүх салаа Response буцаана.
function offlineResponse() {
  return new Response('', { status: 504, statusText: 'Offline' });
}

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
        // ⛔ `caches.match` нь олдохгүй бол undefined буцаана. respondWith(undefined)
        // = «FetchEvent.respondWith received an error» → хуудсанд ойлгомжгүй алдаа.
        // ҮРГЭЛЖ Response буцаана.
        .catch(() => caches.match(req).then((c) => c || offlineResponse()))
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
    && NETWORK_FIRST.some((f) => url.pathname.endsWith('/' + f));
  if (isHTML || isAppShell) {
    event.respondWith(
      // cache:'reload' — браузерын HTTP кэшийг ТОЙРЧ сүлжээнээс шинэ код авна (GitHub Pages
      // ~10мин кэшээс болж хуучин app.js хүрэхээс сэргийлнэ). Офлайн бол catch → cache.
      fetch(req, { cache: 'reload' })
        .then((res) => {
          // Шинэ HTML-г cache-д хадгалж офлайн fallback болгоно
          if (res.ok && url.origin === self.location.origin) {
            const copy = res.clone();
            caches.open(CACHE_VERSION).then((cache) => cache.put(req, copy));
            return res;
          }
          // ⛔ ЯМАР Ч БАЙСАН 404/503-ыг хуудсанд БҮҮ ӨГ (2026-09-11).
          // fetch нь 503-д reject ХИЙДЭГГҮЙ — resolve болно. Тиймээс доорх catch
          // хүрэхгүй, хуудас app.js-ийн оронд алдааны HTML хуудас авдаг байв:
          // апп бүтнээрээ ХАРАГДАНА (index.html кэшээс) ч JS ачаалагдаагүй тул
          // ЮУ Ч ДАРАГДАХГҮЙ, алдаа ч бүртгэгдэхгүй (бүртгэгч нь app.js дотор).
          // GitHub Pages deploy бүрд ийм цонх үүсдэг. Кэшлэгдсэн бүтэн хувилбар
          // байвал ТҮҮНИЙГ өгнө — хуучин код байхаас апп үхсэн нь дор.
          return shellFallback(req, isHTML).then((c) => c || res);
        })
        .catch(() => shellFallback(req, isHTML))
    );
    return;
  }

  // ⛔ ГАДНЫ (cross-origin) хүсэлтийг ОГТ БҮҮ БАРЬ (2026-09-12).
  // DB API (n8n.nomaadcamp.com/db/rest/v1/…), зураг, гуравдагч сан — эдгээрийг
  // кэшлэдэггүй тул барих нь ямар ч ашиггүй, харин сүлжээ тасрахад доорх fetch
  // reject болж «FetchEvent.respondWith received an error» гарган хуудсанд
  // ойлгомжгүй алдаа өгдөг байв. «Миний ирц» дэлгэц яг ингэж 10 удаа унасан.
  if (url.origin !== self.location.origin) return;

  // Cache-first for everything else (статик asset — icon, manifest г.м.)
  event.respondWith(
    caches.match(req).then((cached) => {
      if (cached) return cached;
      return fetch(req).then((res) => {
        if (res.ok) {
          const copy = res.clone();
          caches.open(CACHE_VERSION).then((cache) => cache.put(req, copy));
        }
        return res;
      }).catch(() => offlineResponse());
    })
  );
});
