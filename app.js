/* -------------------- CONSTANTS -------------------- */
// Branches — 3 ажлын чиглэл: M Event, NOMAAD Camp, Удирдлага.
//   Production салбар 2026-05-25-нд M Event-д нэгтгэгдсэн.
// Store branch removed 2026-05-16: CEO no longer manages the store (Wise Brothers).
// SVG icons — emoji-г орлуулсан Lucide-маяг icons. `currentColor` ашигладаг.
const ICONS = {
  inbox:     '<svg class="lcd-icon" viewBox="0 0 24 24"><polyline points="22 12 16 12 14 15 10 15 8 12 2 12"/><path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/></svg>',
  send:      '<svg class="lcd-icon" viewBox="0 0 24 24"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>',
  wallet:    '<svg class="lcd-icon" viewBox="0 0 24 24"><rect x="2" y="6" width="20" height="12" rx="2"/><circle cx="12" cy="12" r="3"/><path d="M6 12h.01M18 12h.01"/></svg>',
  tent:      '<svg class="lcd-icon" viewBox="0 0 24 24"><path d="M3.5 21 12 8l8.5 13"/><path d="M12 8 7 21M12 8l5 13M3.5 21h17"/></svg>',
  mountain:  '<svg class="lcd-icon" viewBox="0 0 24 24"><path d="m8 3 4 8 5-5 5 15H2L8 3z"/></svg>',
  building:  '<svg class="lcd-icon" viewBox="0 0 24 24"><rect x="4" y="2" width="16" height="20" rx="2"/><path d="M9 22v-4h6v4M8 6h.01M16 6h.01M12 6h.01M12 10h.01M12 14h.01M16 10h.01M16 14h.01M8 10h.01M8 14h.01"/></svg>',
  star:      '<svg class="lcd-icon" viewBox="0 0 24 24"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>',
  layers:    '<svg class="lcd-icon" viewBox="0 0 24 24"><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></svg>',
  alertTri:  '<svg class="lcd-icon" viewBox="0 0 24 24"><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>',
  sun:       '<svg class="lcd-icon" viewBox="0 0 24 24"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>',
  check:     '<svg class="lcd-icon" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>',
  target:    '<svg class="lcd-icon" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>',
};

const BRANCHES = [
  { id: 'm-event',    name: 'M Event',     icon: ICONS.tent },
  { id: 'camp',       name: 'NOMAAD Camp', icon: ICONS.mountain },
  { id: 'shared',     name: 'Удирдлага',   icon: ICONS.building },
  // 'production' салбар хасагдсан 2026-05-25 — M Event-д нэгтгэгдсэн.
];

// 13-staff roster — Master Sheet-ээс runtime-д ачаалагдана:
// https://docs.google.com/spreadsheets/d/1so0IBwfok7_Tss3y25a-40qybGe9SGHimkuXrihuWvM/edit
//
// 2026-05-25 — `id` талбар хасагдсан. Эргэн дурдсан түлхүүр нь EMAIL.
// Email Sheet-д бүх ажилтанд бөглөгдсөн учраас runtime sync бүх ажилтны email-ийг
// авч ирнэ. Hardcoded fallback зөвхөн email бүхий ажилтнуудыг агуулна — Sheet
// холбогдоогүй үед хязгаарлагдмал ажиллана.
//
// `email` нь түлхүүр (assignee, createdBy, forUser, state.me бүгд email-ээр хадгална).
// `pin` — нэвтрэх. `level` — 100=CEO, 80=executive, 60=manager, 40=staff.
//
// `let` (not const) — loadTeamFromAPI in-place солино.
// TEAM нь хоосон array-аар эхлээд /staff endpoint амжилттай хариулмагц Master Sheet-ийн
// бодит ажилтнуудаар дүүргэгдэнэ. Хуучин кодонд hardcoded fallback TEAM (PIN='1111')
// байсан ч бодит PIN-ууд өөр учраас login-д хэрэг болохгүй байсан тул устгасан.
let TEAM = [];

// n8n webhook URL — hardcoded so staff never have to configure anything.
// Change here + push when the backend moves. Settings panel still lets the user
// override locally for testing.
//
// BACKEND (2026-06-19): өгөгдөл одоо **Postgres (Supabase)** дээр — n8n workflow бүр
// Google Sheets node-ийг Postgres node-оор сольсон (push-subscriptions л Sheets дээр
// үлдсэн). Доорх "Sheet" гэсэн комментууд нь түүхэн нэр + ХАДГАЛСАН дамжуулах формат
// (код↔монгол, массив→CSV)-ыг хэлнэ — энэ форматыг Postgres workflow-ууд хэвээр буцаадаг
// тул `toWire/fromWire` хувиргалтыг БҮҮ устга (устгавал апп эвдэрнэ).
const DEFAULT_API_URL     = 'https://chimunllc.app.n8n.cloud/webhook/checklist';
// Staff roster sync — read-only GET endpoint that returns { team: [...] } from Master Sheet.
// If reachable, replaces the hardcoded TEAM constant below at startup.
const DEFAULT_STAFF_URL   = 'https://chimunllc.app.n8n.cloud/webhook/staff';
// Finance request sync — separate Sheet for audit/reporting cleanliness.
// GET returns { requests: [...] }; POST { action: 'upsert'|'delete', request } saves.
const DEFAULT_FINANCE_URL = 'https://chimunllc.app.n8n.cloud/webhook/finance';
// Receipt upload — POST { filename, contentType, base64, request_id, kind } → returns Drive URL.
const DEFAULT_UPLOAD_URL  = 'https://chimunllc.app.n8n.cloud/webhook/upload-receipt';
// Шинэ ажилтан бүртгэл — POST { name, role, group, phone, email, pin } → Master Sheet append → { id }
const DEFAULT_REGISTER_URL = 'https://chimunllc.app.n8n.cloud/webhook/staff-register';
// Web Push — Sheet өөрчлөгдөх бүрд n8n /push-broadcast bütee push-аар client-уудад мэдэгдэнэ.
// Subscribe хийсэн endpoint-ийг хадгалах URL.
const DEFAULT_PUSH_SUBSCRIBE_URL = 'https://chimunllc.app.n8n.cloud/webhook/push-subscribe';
// Push broadcast — даалгавар үүсгэх/санхүүгийн хүсэлтийн дараа хариуцагч руу нэн даруй push илгээнэ.
const DEFAULT_PUSH_BROADCAST_URL = 'https://chimunllc.app.n8n.cloud/webhook/push-broadcast';
// Bootstrap — tasks + finance-ийг нэг хариунд татаж execution-ийг 2 → 1 болгож хэмнэнэ.
const DEFAULT_BOOTSTRAP_URL = 'https://chimunllc.app.n8n.cloud/webhook/bootstrap';
// M-Event захиалга — GET { orders:[...] } унших, POST { order_no, status, assigned_to, task_id } → шинэчлэх.
// Сайт (chimunllc.github.io/m-event-website-ready) → /webhook/m-event-site-order руу захиалга илгээж
// MEVENT_Orders_DB Sheet-д хадгалагдана. Энэ нь тэр Sheet-ийг уншиж/шинэчилнэ.
const DEFAULT_ORDERS_URL = 'https://chimunllc.app.n8n.cloud/webhook/mevent-orders';
// M-Event бараа — GET бараа жагсаалт унших, POST { product | products:[...] } → нэмэх/засах.
// Эх сурвалж: MEVENT_Orders_DB Sheet `products` tab. Сайт мөн эндээс уншина.
const DEFAULT_PRODUCTS_URL = 'https://chimunllc.app.n8n.cloud/webhook/mevent-products';
// 360° гүйцэтгэлийн үнэлгээ — GET { evaluations:[...] }, POST нэг үнэлгээ (upsert id-аар).
const DEFAULT_EVAL_URL = 'https://chimunllc.app.n8n.cloud/webhook/evaluations';
const DEFAULT_FIN_CATEGORIES_URL = 'https://chimunllc.app.n8n.cloud/webhook/fin-categories';
// NOMAAD кемпийн батлагдсан гэрээ (Quote Log/Quote Items) — орлого бүртгэх backoffice.
const DEFAULT_NOMAAD_ORDERS_URL = 'https://chimunllc.app.n8n.cloud/webhook/nomaad-orders';
const DEFAULT_NOMAAD_QUOTE_SEND_URL = 'https://chimunllc.app.n8n.cloud/webhook/nomaad-quote-send';
// Илгээсэн үнийн саналыг дахин үзэх — HTML болгож буцаана (имэйл явуулахгүй). Менежер аппаас харна.
const DEFAULT_NOMAAD_QUOTE_VIEW_URL = 'https://chimunllc.app.n8n.cloud/webhook/nomaad-quote-view';
// Цагийн ажилтны үнэлгээ (од + тэмдэглэл) — GET жагсаалт, POST нэмэх
const DEFAULT_HOURLY_RATING_URL = 'https://chimunllc.app.n8n.cloud/webhook/hourly-rating';

// n8n webhook API key — front-end-д ил үлдэх тул "real" auth биш, гэхдээ random curl/bot
// дайралтаас хамгаална. Бодит security шаардлагатай бол сервер тал PIN/session token check
// хийх ёстой (одоохондоо төлөвлөгөөнд байгаа).
const N8N_API_KEY = '1YP4RCfL_DMiBhDfkCkX6AesQHd5p2lZ';
// URL рүү ?key= эсвэл &key= нэмж буцаана. n8n workflow эхэнд IF node-оор тулгаж шалгана.
function withKey(url) {
  if (!url) return url;
  const sep = url.includes('?') ? '&' : '?';
  return `${url}${sep}key=${encodeURIComponent(N8N_API_KEY)}`;
}

// fetch timeout wrapper — кемп/3G гэх мэт сул сүлжээ үед fetch 60-120 сек ширж байж
// аппыг "гацсан" гэж мэдрүүлдэг. AbortController-аар хугацаа тавьж хурдан буцах.
// Default 15s ердийн дуудлагад; upload-д заавал тусдаа удаан хугацаа өг.
function fetchWithTimeout(url, opts = {}, timeoutMs = 15000) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  return fetch(url, { ...opts, signal: ctrl.signal })
    .finally(() => clearTimeout(timer));
}

// Modal save товчинд хурдан 2 удаа дарахад давтан POST явахаас сэргийлнэ.
// async ажиллах хугацаанд товч disabled байж, дууссаны дараа (success/error аль аль)
// автомат буцаана. Хэрэв opts.successText өгсөн бол амжилт-н дараа товч 800мс ✓ текстээр
// flash хийгээд эх HTML рүү буцана — хэрэглэгчид click → action бэлэн боллоо гэдгийг
// шууд харуулна.
async function withBusy(btn, asyncFn, opts = {}) {
  if (!btn) return asyncFn();
  if (btn.disabled) return; // өмнөх дуудалт хараахан дуусаагүй
  btn.disabled = true;
  const origHTML = btn.innerHTML;
  let success = false;
  try {
    const result = await asyncFn();
    success = true;
    return result;
  } finally {
    if (success && opts.successText) {
      btn.innerHTML = `<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-2px;margin-right:4px;"><polyline points="20 6 9 17 4 12"/></svg>${opts.successText}`;
      await new Promise(r => setTimeout(r, 800));
    }
    btn.disabled = false;
    btn.innerHTML = origHTML;
  }
}
// VAPID public key — push шифрлэлтийн нийтийн түлхүүр (private түлхүүр n8n credentials-д үлдэнэ).
const VAPID_PUBLIC_KEY = 'BEWEze0XzdKChNxs6DrsnyivUfBN7xgxL6T219i6W-Gt808fzAadxW3REWnNjQb2v3GVSlnpF4oDM_F0uF6SRfY';

// Default projects per branch. Saved to localStorage on first load; user can add more.
// Default projects — зөвхөн "Сезоны өмнөх бэлтгэл" үлдээсэн (2026-05-25 хэрэглэгчийн хүсэлтээр).
// Хэрэглэгч өөрөө шинэ төслүүдээ бичиж нэмнэ.
const PROJECTS_BY_BRANCH = {
  'shared': [
    { id: 'pre-season', name: 'Сезоны өмнөх бэлтгэл' },
  ],
};

// Хуучин default project ID-ууд — localStorage-аас цэвэрлэх зорилгоор хадгалсан.
/* -------------------- STATE -------------------- */
const state = {
  tasks: [],
  financeRequests: [],   // Финансын хүсэлт — тусдаа Sheet-аас sync хийгдэнэ
  projectsByBranch: {},  // { 'm-event': [...], 'camp': [...], ... }
  branch: localStorage.getItem('branch') || 'm-event',
  branchLens: localStorage.getItem('branchLens') || '',  // '' = автомат (хэрэглэгчийн салбар) | all | m-event | camp
  view: 'mine',          // mine | delegated | finance | all | overdue | today | done | project:<id>
  statusFilter: 'all',   // all | open | done
  financeSort: 'smart',  // smart | date | amount | requester (зөвхөн Санхүү view)
  search: '',
  // Auth state — PIN нэвтрэлтээр populate хийгдэнэ (Google OAuth 2026-05-17-нд хасагдсан).
  user: null,            // { name, role, email, picture, branches }
  me: null,              // user.email — task assignee, createdBy, forUser түлхүүр
  isCEO: false,          // whether this user has full access
  config: (() => {
    return {
      apiUrl:      localStorage.getItem('apiUrl')      || DEFAULT_API_URL      || '',
      staffUrl:    localStorage.getItem('staffUrl')    || DEFAULT_STAFF_URL    || '',
      financeUrl:  localStorage.getItem('financeUrl')  || DEFAULT_FINANCE_URL  || '',
      uploadUrl:   localStorage.getItem('uploadUrl')   || DEFAULT_UPLOAD_URL   || '',
      registerUrl: localStorage.getItem('registerUrl') || DEFAULT_REGISTER_URL || '',
      pushSubscribeUrl: localStorage.getItem('pushSubscribeUrl') || DEFAULT_PUSH_SUBSCRIBE_URL || '',
      pushBroadcastUrl: localStorage.getItem('pushBroadcastUrl') || DEFAULT_PUSH_BROADCAST_URL || '',
      bootstrapUrl:     localStorage.getItem('bootstrapUrl')     || DEFAULT_BOOTSTRAP_URL     || '',
      ordersUrl:        localStorage.getItem('ordersUrl')        || DEFAULT_ORDERS_URL        || '',
      productsUrl:      localStorage.getItem('productsUrl')      || DEFAULT_PRODUCTS_URL      || '',
      nomaadOrdersUrl:  localStorage.getItem('nomaadOrdersUrl')  || DEFAULT_NOMAAD_ORDERS_URL || '',
      nomaadQuoteSendUrl: localStorage.getItem('nomaadQuoteSendUrl') || DEFAULT_NOMAAD_QUOTE_SEND_URL || '',
      nomaadQuoteViewUrl: localStorage.getItem('nomaadQuoteViewUrl') || DEFAULT_NOMAAD_QUOTE_VIEW_URL || '',
      hourlyRatingUrl:  localStorage.getItem('hourlyRatingUrl')  || DEFAULT_HOURLY_RATING_URL || '',
      evalUrl:          localStorage.getItem('evalUrl')          || DEFAULT_EVAL_URL          || '',
      finCategoriesUrl: localStorage.getItem('finCategoriesUrl') || DEFAULT_FIN_CATEGORIES_URL || '',
    };
  })(),
  // Кэшээс шууд ачаална (3 сек хүлээхгүй) — ард нь loadOrders/loadProductsCatalog шинэчилнэ.
  orders: (() => { try { return JSON.parse(localStorage.getItem('orders') || '[]'); } catch(e) { return []; } })(),
  products: (() => { try { return JSON.parse(localStorage.getItem('mevProducts') || '[]'); } catch(e) { return []; } })(),
  nomaadOrders: (() => { try { return JSON.parse(localStorage.getItem('nomaadOrders') || '[]'); } catch(e) { return []; } })(),
  hourlyRatings: (() => { try { return JSON.parse(localStorage.getItem('hourlyRatings') || '[]'); } catch(e) { return []; } })(),
  evaluations: (() => { try { return JSON.parse(localStorage.getItem('evaluations') || '[]'); } catch(e) { return []; } })(),
  productSearch: '',     // Бараа view-ийн хайлт
  perfMonth: new Date().toISOString().slice(0, 7),   // Гүйцэтгэл view-ийн сар (YYYY-MM)
  perfTab: 'me',         // Гүйцэтгэл view tab: me | all | rate
  editingId: null,
  notifications: [], // {id, type, taskId, msg, ts, read}
};

/* -------------------- TOAST / CONFIRM (alert/confirm орлуулсан) --------------------
   showToast(msg, type)            — fire-and-forget banner. Type: '', 'success', 'error', 'warn'.
   showConfirm(msg, opts)          — Returns Promise<boolean>. opts: {title, okText, cancelText}.
   App-н бүх alert/confirm-ийг эдгээрээр сольсон. Mobile-д native popup-ын оронд in-app drawer. */
function showToast(msg, type = '', timeoutMs = 3500) {
  const stack = document.getElementById('toast-stack');
  if (!stack) return console.log('[toast]', msg);
  const el = document.createElement('div');
  el.className = 'toast toast-enter' + (type ? ' ' + type : '');
  // SVG icon — emoji биш, илүү тод
  const ICONS_T = {
    success: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>',
    error:   '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>',
    warn:    '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>',
    info:    '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>',
  };
  const icon = ICONS_T[type] || ICONS_T.info;
  el.innerHTML = `<span class="toast-icon">${icon}</span><span class="toast-msg">${escapeHtml(msg)}</span><button class="toast-close" aria-label="Хаах">×</button>`;
  stack.appendChild(el);
  el.querySelector('.toast-close').onclick = () => dismiss();
  const dismiss = () => {
    el.classList.add('toast-leave');
    setTimeout(() => el.remove(), 200);
  };
  setTimeout(dismiss, timeoutMs);
}
function showConfirm(msg, opts = {}) {
  return new Promise((resolve) => {
    const modal = document.getElementById('confirm-modal');
    document.getElementById('confirm-title').textContent = opts.title || 'Баталгаажуул';
    document.getElementById('confirm-msg').textContent = msg;
    const okBtn = document.getElementById('confirm-ok');
    const cancelBtn = document.getElementById('confirm-cancel');
    okBtn.textContent = opts.okText || 'Тийм';
    cancelBtn.textContent = opts.cancelText || 'Болих';
    okBtn.className = 'btn ' + (opts.danger ? 'btn-danger' : 'btn-primary');
    function cleanup(result) {
      modal.classList.remove('open');
      okBtn.onclick = null;
      cancelBtn.onclick = null;
      resolve(result);
    }
    okBtn.onclick = () => cleanup(true);
    cancelBtn.onclick = () => cleanup(false);
    modal.classList.add('open');
    setTimeout(() => okBtn.focus(), 50);
  });
}

/* showPrompt — текст оруулдаг in-app dialog. Промис буцаана: текст эсвэл null (Болих).
   Native window.prompt iOS standalone PWA-д блоклогддог тул өөрсдийн modal ашиглана.
   opts: { title, placeholder, okText, cancelText, defaultValue } */
function showPrompt(msg, opts = {}) {
  return new Promise((resolve) => {
    const modal = document.getElementById('prompt-modal');
    const input = document.getElementById('prompt-input');
    const msgEl = document.getElementById('prompt-msg');
    const okBtn = document.getElementById('prompt-ok');
    const cancelBtn = document.getElementById('prompt-cancel');
    document.getElementById('prompt-title').textContent = opts.title || 'Оролт';
    msgEl.textContent = msg || '';
    msgEl.style.display = msg ? '' : 'none';
    input.value = opts.defaultValue || '';
    input.placeholder = opts.placeholder || '';
    okBtn.textContent = opts.okText || 'Илгээх';
    cancelBtn.textContent = opts.cancelText || 'Болих';
    function cleanup(result) {
      modal.classList.remove('open');
      okBtn.onclick = null;
      cancelBtn.onclick = null;
      input.onkeydown = null;
      resolve(result);
    }
    okBtn.onclick = () => cleanup(input.value);
    cancelBtn.onclick = () => cleanup(null);
    // Cmd/Ctrl+Enter → илгээх
    input.onkeydown = (e) => {
      if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); cleanup(input.value); }
    };
    modal.classList.add('open');
    setTimeout(() => input.focus(), 50);
  });
}

/* ─── COMMAND PALETTE (⌘K) ─── */
function openCommandPalette() {
  const bg = document.getElementById('cmd-palette-bg');
  const input = document.getElementById('cmd-input');
  bg.classList.add('open');
  input.value = '';
  renderCommandResults('');
  setTimeout(() => input.focus(), 50);
}
function closeCommandPalette() {
  document.getElementById('cmd-palette-bg')?.classList.remove('open');
}
function renderCommandResults(query) {
  const results = document.getElementById('cmd-results');
  const q = (query || '').toLowerCase().trim();

  // 1. Үйлдэл (actions)
  const actions = [
    { icon: '➕', label: 'Шинэ даалгавар', hint: 'N',  run: () => { closeCommandPalette(); openTaskModal(); } },
    { icon: '💸', label: 'Шинэ санхүүгийн хүсэлт', hint: 'F', run: () => { closeCommandPalette(); openFinanceModal(); } },
    { icon: '📥', label: 'Ирсэн ажил',  hint: '', run: () => { closeCommandPalette(); state.view='mine'; render(); } },
    { icon: '📤', label: 'Илгээсэн ажил', hint: '', run: () => { closeCommandPalette(); state.view='delegated'; render(); } },
    { icon: '💸', label: 'Санхүү',      hint: '', run: () => { closeCommandPalette(); state.view='finance'; render(); } },
    { icon: '🌓', label: 'Theme солих (Light/Dark)', hint: '', run: () => { closeCommandPalette(); toggleTheme(); } },
    { icon: '⚙️', label: 'Тохиргоо',    hint: '', run: () => { closeCommandPalette(); document.getElementById('settings-modal')?.classList.add('open'); } },
  ];

  // 2. Tasks хайлт
  const taskMatches = q ? state.tasks.filter(t =>
    (t.title||'').toLowerCase().includes(q) || (t.desc||'').toLowerCase().includes(q)
  ).slice(0, 10) : [];

  let html = '';
  const filteredActions = q ? actions.filter(a => a.label.toLowerCase().includes(q)) : actions;
  if (filteredActions.length) {
    html += `<div class="cmd-result-section">Үйлдэл</div>`;
    html += filteredActions.map((a, i) => `
      <div class="cmd-result ${i===0 && !taskMatches.length ? 'active' : ''}" data-cmd-idx="action-${actions.indexOf(a)}">
        <span class="icon">${a.icon}</span>
        <span>${escapeHtml(a.label)}</span>
        ${a.hint ? `<span class="hint">${escapeHtml(a.hint)}</span>` : ''}
      </div>
    `).join('');
  }
  if (taskMatches.length) {
    html += `<div class="cmd-result-section">Даалгавар (${taskMatches.length})</div>`;
    html += taskMatches.map((t, i) => `
      <div class="cmd-result ${i===0 && !filteredActions.length ? 'active' : ''}" data-cmd-idx="task-${t.id}">
        <span class="icon">${t.status === 'done' ? '✓' : '○'}</span>
        <span>${escapeHtml(t.title || '(гарчиггүй)')}</span>
        <span class="hint">${escapeHtml(memberName(t.assignee))}</span>
      </div>
    `).join('');
  }
  if (!html) {
    html = `<div style="padding:24px;text-align:center;color:var(--muted);font-size:13px;">"${escapeHtml(query)}" гэх зүйл олдсонгүй</div>`;
  }
  results.innerHTML = html;
  // Listeners
  results.querySelectorAll('.cmd-result').forEach(el => {
    el.onclick = () => {
      const key = el.dataset.cmdIdx;
      if (!key) return;
      if (key.startsWith('action-')) {
        const idx = Number(key.slice(7));
        actions[idx]?.run();
      } else if (key.startsWith('task-')) {
        const tid = key.slice(5);
        closeCommandPalette();
        openTaskModal(tid);
      }
    };
  });
}

/* ─── DARK MODE / THEME ─── */
function toggleTheme() {
  const html = document.documentElement;
  const cur = html.getAttribute('data-theme');
  const next = cur === 'dark' ? 'light' : 'dark';
  html.setAttribute('data-theme', next);
  localStorage.setItem('theme', next);
  showToast(next === 'dark' ? '🌙 Харанхуй горим' : '☀️ Гэрэлтэй горим', 'info', 1500);
}
function initTheme() {
  const saved = localStorage.getItem('theme');
  if (saved === 'dark') document.documentElement.setAttribute('data-theme', 'dark');
  else if (saved === 'light') document.documentElement.setAttribute('data-theme', 'light');
  // Тохируулаагүй бол system preference
  else if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
    document.documentElement.setAttribute('data-theme', 'dark');
  }
  updateThemeIcon();
}
function updateThemeIcon() {
  const dark = document.documentElement.getAttribute('data-theme') === 'dark';
  const lightIcon = document.getElementById('theme-icon-light');
  const darkIcon = document.getElementById('theme-icon-dark');
  if (lightIcon) lightIcon.style.display = dark ? 'none' : 'block';
  if (darkIcon) darkIcon.style.display = dark ? 'block' : 'none';
}

/* -------------------- IN-APP NOTIFICATIONS --------------------
   Client-side generated from task data. 4 төрөл:
     - assigned     — шинэ task надад оноогдсон
     - overdue      — миний task хоцорсон
     - due_today    — миний task өнөөдөр дуусах
     - stage_unlock — өмнөх дамжлага дуусаад миний дамжлага идэвхжсэн
   Дахин давтан гаргахгүйн тулд localStorage-д "seen" set хадгална. */
function loadNotifications() {
  try {
    const raw = localStorage.getItem('notifications');
    state.notifications = raw ? JSON.parse(raw) : [];
  } catch(e) { state.notifications = []; }
}
function saveNotifications() {
  // Keep only the most recent 50 to avoid localStorage bloat
  state.notifications = state.notifications.slice(0, 50);
  localStorage.setItem('notifications', JSON.stringify(state.notifications));
}
function generateNotifications() {
  if (!state.me) return;
  const today = todayStr();
  const seen = new Set(state.notifications.map(n => n.id));
  const myTasks = state.tasks.filter(t => t.assignee === state.me && t.status !== 'deleted');
  const newOnes = [];

  // 1. ASSIGNED — өмнө хараагүй байсан, надад оноогдсон шинэ task
  const seenAssignedKey = `notif-seen-assigned-${state.me}`;
  let prevAssigned;
  try { prevAssigned = new Set(JSON.parse(localStorage.getItem(seenAssignedKey) || '[]')); }
  catch(e) { prevAssigned = new Set(); }
  // First run for this user: don't blast notifications for everything that already exists.
  // Instead just record current state silently.
  const isFirstRun = prevAssigned.size === 0;
  myTasks.forEach(t => {
    if (t.status === 'done') return;
    if (!prevAssigned.has(t.id)) {
      if (!isFirstRun) {
        newOnes.push({
          id: `assigned-${t.id}`,
          type: 'assigned',
          taskId: t.id,
          msg: `Шинэ даалгавар: ${t.title}`,
          ts: Date.now(),
          read: false,
        });
      }
      prevAssigned.add(t.id);
    }
  });
  localStorage.setItem(seenAssignedKey, JSON.stringify([...prevAssigned]));

  // 2. OVERDUE — өдөрт нэг л удаа сануулга
  myTasks.forEach(t => {
    if (t.status === 'done') return;
    if (t.due && t.due < today) {
      const nid = `overdue-${t.id}-${today}`;
      if (!seen.has(nid)) {
        newOnes.push({
          id: nid,
          type: 'overdue',
          taskId: t.id,
          msg: `Хоцорсон: ${t.title}`,
          ts: Date.now(),
          read: false,
        });
      }
    }
  });

  // 3. DUE TODAY — өдөрт нэг л удаа
  myTasks.forEach(t => {
    if (t.status === 'done') return;
    if (t.due === today) {
      const nid = `today-${t.id}-${today}`;
      if (!seen.has(nid)) {
        newOnes.push({
          id: nid,
          type: 'due_today',
          taskId: t.id,
          msg: `Өнөөдөр дуусах: ${t.title}`,
          ts: Date.now(),
          read: false,
        });
      }
    }
  });

  // 4. DELEGATED TASK — status өөрчлөгдсөн (start, done, declined, reopen)
  const lastSeenKey = `notif-last-seen-${state.me}`;
  let lastSeen = {};
  try { lastSeen = JSON.parse(localStorage.getItem(lastSeenKey) || '{}'); } catch { lastSeen = {}; }
  const nowSeen = { ...lastSeen };

  state.tasks.forEach(t => {
    if (t.status === 'deleted') return;
    const isCreator  = (t.createdBy === state.me);
    const isAssignee = (t.assignee === state.me);
    const involved   = isCreator || isAssignee;
    // Activity log scan — status_changed, declined үед мэдэгдэх (зөвхөн оролцогч хүнд)
    if (involved && Array.isArray(t.activity)) {
      for (const a of t.activity) {
        if (a.actor === state.me) continue; // өөрийнхөө үйлдэлд мэдэгдэхгүй
        const aid = `${t.id}-act-${a.id}`;
        const lastTs = lastSeen[`act-${t.id}`] || 0;
        if (a.timestamp <= lastTs) continue;
        if (a.action === 'status_changed') {
          const statusNames = { open:'дахин нээгдсэн', in_progress:'эхлэсэн', done:'дуусгасан', declined:'татгалзсан' };
          const verb = statusNames[a.details?.to] || a.details?.to || 'өөрчилсөн';
          const reason = a.details?.reason ? ` (${a.details.reason})` : '';
          if (!seen.has(aid)) {
            newOnes.push({
              id: aid,
              type: a.details?.to === 'declined' ? 'overdue' : (a.details?.to === 'done' ? 'stage_unlock' : 'assigned'),
              taskId: t.id,
              msg: `${memberName(a.actor)} ${verb}: ${t.title}${reason}`,
              ts: a.timestamp,
              read: false,
            });
          }
        } else if (a.action === 'clarification_requested') {
          if (!seen.has(aid) && isCreator) {
            newOnes.push({
              id: aid,
              type: 'assigned',
              taskId: t.id,
              msg: `❓ ${memberName(a.actor)} тодруулга асуусан: ${t.title}`,
              ts: a.timestamp,
              read: false,
            });
          }
        }
      }
      nowSeen[`act-${t.id}`] = Math.max(nowSeen[`act-${t.id}`] || 0, ...t.activity.map(a => a.timestamp || 0));
    }
  });
  localStorage.setItem(lastSeenKey, JSON.stringify(nowSeen));

  // 5. FINANCE — миний илгээсэн хүсэлтийн төлөв өөрчлөгдсөн (approved/rejected/deferred/executed)
  state.financeRequests.filter(t => t.requested_by === state.me && t.status !== 'deleted').forEach(t => {
    const stages = [
      { key: 'approved', cond: t.decision === 'approved' && t.status !== 'done', msg: `✓ Зөвшөөрөгдсөн: ${t.beneficiary} — ${Number(t.amount).toLocaleString('mn-MN')}₮` },
      { key: 'rejected', cond: t.decision === 'rejected', msg: `✗ Татгалзсан: ${t.beneficiary} — ${Number(t.amount).toLocaleString('mn-MN')}₮` },
      { key: 'deferred', cond: t.decision === 'deferred', msg: `🕐 Хойшлогдсон: ${t.beneficiary} — ${Number(t.amount).toLocaleString('mn-MN')}₮` },
      { key: 'executed', cond: t.status === 'done' && t.decision === 'approved' && t.executed_at, msg: `💵 Гүйлгээ хийгдсэн: ${t.beneficiary} — ${Number(t.amount).toLocaleString('mn-MN')}₮` },
    ];
    stages.forEach(s => {
      if (!s.cond) return;
      const nid = `finance-${s.key}-${t.id}`;
      if (!seen.has(nid)) {
        newOnes.push({ id: nid, type: 'stage_unlock', taskId: t.id, msg: s.msg, ts: Date.now(), read: false });
      }
    });
  });

  // 5b. FINANCE — CEO-д ирсэн pending хүсэлт + S03-д ирсэн approved хүсэлт
  if (state.isCEO) {
    state.financeRequests.filter(r => (r.decision || 'pending') === 'pending' && r.status !== 'done' && r.status !== 'deleted').forEach(r => {
      const nid = `finance-pending-${r.id}`;
      if (!seen.has(nid)) {
        newOnes.push({ id: nid, type: 'assigned', taskId: r.id,
          msg: `💸 Хүсэлт: ${memberName(r.requested_by)} — ${Number(r.amount).toLocaleString('mn-MN')}₮ (${r.beneficiary})`,
          ts: Date.now(), read: false });
      }
    });
  }
  if (state.me === getFinanceExecutorEmail()) {
    state.financeRequests.filter(r => r.decision === 'approved' && r.status !== 'done' && r.status !== 'deleted').forEach(r => {
      const nid = `finance-execute-${r.id}`;
      if (!seen.has(nid)) {
        newOnes.push({ id: nid, type: 'assigned', taskId: r.id,
          msg: `💸 Гүйлгээ хийх: ${r.beneficiary} — ${Number(r.amount).toLocaleString('mn-MN')}₮`,
          ts: Date.now(), read: false });
      }
    });
  }

  // 6. STAGE UNLOCK — миний sub-task lock-оос гарсан
  myTasks.filter(t => t.kind === 'act_stage' && t.parent_id && Number(t.stage) > 1).forEach(t => {
    if (t.status !== 'open') return;
    const prev = state.tasks.find(x =>
      x.parent_id === t.parent_id && Number(x.stage) === Number(t.stage) - 1
    );
    if (prev && prev.status === 'done') {
      const nid = `unlock-${t.id}`;
      if (!seen.has(nid)) {
        newOnes.push({
          id: nid,
          type: 'stage_unlock',
          taskId: t.id,
          msg: `Дамжлага идэвхжсэн: ${t.title}`,
          ts: Date.now(),
          read: false,
        });
      }
    }
  });

  if (newOnes.length) {
    state.notifications = [...newOnes, ...state.notifications];
    saveNotifications();
    renderNotifications();
    // Browser native push notification — assigned + overdue-д л явуулна
    if (window._chimunNotify) {
      newOnes.slice(0, 3).forEach(n => { // максимум 3 нэг дор
        if (n.type === 'assigned' || n.type === 'overdue') {
          const title = n.type === 'assigned' ? 'Шинэ ажил оноогдсон' : 'Ажил хоцорсон';
          window._chimunNotify(title, n.msg, { taskId: n.taskId, tag: n.id });
        }
      });
    }
  }
}
function unreadCount() {
  return state.notifications.filter(n => !n.read).length;
}
function markAllNotificationsRead() {
  state.notifications.forEach(n => n.read = true);
  saveNotifications();
  renderNotifications();
}
function renderNotifications() {
  const count = unreadCount();
  const badge = document.getElementById('notif-badge');
  const bell = document.getElementById('notif-btn');
  if (badge) {
    badge.textContent = count > 99 ? '99+' : count;
    badge.style.display = count > 0 ? '' : 'none';
  }
  if (bell) bell.classList.toggle('has-unread', count > 0);

  const list = document.getElementById('notif-list');
  if (!list) return;
  if (!state.notifications.length) {
    list.innerHTML = `
      <div class="notif-empty">
        <div class="icon">🔕</div>
        <div class="title">Мэдэгдэл алга байна</div>
        <div class="sub">Шинэ ажил оноогдох эсвэл хугацаа дөхөхөд энд харагдана.</div>
      </div>`;
    return;
  }
  // SVG icons per notification type (inline so they inherit currentColor)
  const ICON_SVG = {
    assigned:     '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="22 12 16 12 14 15 10 15 8 12 2 12"/><path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11Z"/></svg>',
    overdue:      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" x2="12" y1="9" y2="13"/><line x1="12" x2="12.01" y1="17" y2="17"/></svg>',
    due_today:    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="18" x="3" y="4" rx="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/></svg>',
    stage_unlock: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>',
  };
  // Notification-уудыг 3 категори болгож бүлэглэх:
  //   active   — миний шийдвэр/анхаарал шаардах (unread + overdue/assigned)
  //   info     — мэдээллийн (read эсвэл due_today/stage_unlock)
  //   archive  — read + 24 цагаас өмнөх
  const NOW = Date.now();
  const DAY_MS = 24 * 60 * 60 * 1000;
  const groupOf = (n) => {
    if (!n.read) return 'active';
    if (NOW - n.ts > DAY_MS) return 'archive';
    return 'info';
  };
  const groups = { active: [], info: [], archive: [] };
  state.notifications.forEach(n => groups[groupOf(n)].push(n));

  const groupLabels = {
    active:  { name: 'Идэвхтэй',  count: groups.active.length },
    info:    { name: 'Мэдээлэл',  count: groups.info.length },
    archive: { name: 'Архив',     count: groups.archive.length },
  };
  const renderItem = (n) => {
    const ago = notifTimeAgo(n.ts);
    const icon = ICON_SVG[n.type] || ICON_SVG.assigned;
    return `
      <div class="notif-item ${n.read ? '' : 'unread'}" data-task-id="${escapeHtml(n.taskId)}" data-notif-id="${escapeHtml(n.id)}">
        <div class="notif-icon ${escapeHtml(n.type)}">${icon}</div>
        <div class="notif-body">
          <div class="notif-msg">${escapeHtml(n.msg)}</div>
          <div class="notif-time">${ago}</div>
        </div>
      </div>
    `;
  };
  list.innerHTML = ['active','info','archive'].filter(k => groups[k].length).map(k => `
    <div class="notif-group notif-group-${k}">
      <div class="notif-group-header">${groupLabels[k].name} <span class="notif-group-count">${groupLabels[k].count}</span></div>
      ${groups[k].map(renderItem).join('')}
    </div>
  `).join('');
  list.querySelectorAll('.notif-item').forEach(el => {
    el.onclick = () => {
      const taskId = el.dataset.taskId;
      const notifId = el.dataset.notifId;
      const n = state.notifications.find(x => x.id === notifId);
      if (n) { n.read = true; saveNotifications(); }
      closeNotifDrawer();
      if (taskId === 'staff-management') {
        // Шинэ бүртгэлийн хүсэлт → Staff Management modal
        openStaffManagement();
      } else if (taskId) {
        // Finance request эсэхийг шалгая (state.financeRequests дотроос)
        const isFinance = state.financeRequests.some(r => r.id === taskId);
        if (isFinance) openFinanceModal(taskId);
        else openTaskModal(taskId);
      }
      renderNotifications();
    };
  });
}

function openNotifDrawer() {
  document.getElementById('notif-backdrop').classList.add('open');
  const panel = document.getElementById('notif-panel');
  panel.hidden = false;
  // CSS дүрэм хоорондын зөрчилдөөнөөс зайлсхийхийн тулд background-ыг JS-ээр inline style-аар тогтоох.
  // Энэ нь дотроос дамжуулан гарч ирэх контентыг хаах.
  const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  panel.style.background = isDark ? '#2f2f2f' : '#ffffff';
  panel.style.zIndex = '99999';
  panel.style.isolation = 'isolate';
  renderNotifications();
  // Vibration cue on mobile when opening — gentle feedback
  if ('vibrate' in navigator) try { navigator.vibrate(15); } catch(e) {}
}
function closeNotifDrawer() {
  document.getElementById('notif-backdrop').classList.remove('open');
  document.getElementById('notif-panel').hidden = true;
}
function notifTimeAgo(ts) {
  const diff = Date.now() - ts;
  const min = Math.floor(diff / 60000);
  if (min < 1) return 'сая';
  if (min < 60) return `${min} мин өмнө`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr} цаг өмнө`;
  const day = Math.floor(hr / 24);
  if (day < 7) return `${day} өдөр өмнө`;
  return new Date(ts).toLocaleDateString('mn-MN');
}

/* -------------------- STAFF SYNC --------------------
   TEAM (above) is the hardcoded fallback. At startup we load fresher data from:
     1) localStorage cache (sync, instant)
     2) n8n /staff endpoint backed by Master Sheet (async, ~200ms)
   Both update TEAM in-place via `TEAM.length=0; push(...)` so all existing
   references (`memberName`, `fillAssigneeSelect`, etc.) keep working without
   reassignment. */
// Cache version — bump-лэх үед утсууд хуучин teamCache-ыг хаяна.
// 2026-05-25-strip нь sensitive талбаруудыг хассан тул хуучин cache (PIN-тэй) хүчингүй болгоно.
const TEAM_CACHE_VERSION = '2026-05-25-strip';

// localStorage-д хадгалахаас өмнө sensitive талбаруудыг хасна — PIN, цалин, РД, хаяг,
// яаралтай үед холбоо барих утас/нэр. PIN зөвхөн in-memory TEAM-д үлдэж нэвтрэх сессид ажиллана
// (хуудас refresh-д /staff endpoint дахин дуудаж шинээр татна). DevTools-оор localStorage-ийг
// уншсан ч энэ мэдээллүүд ил гарахгүй.
const SENSITIVE_TEAM_FIELDS = ['pin', 'salary', 'rd', 'address', 'emergency_phone', 'emergency_name'];
function sanitizeTeamForCache(member) {
  const c = { ...member };
  for (const k of SENSITIVE_TEAM_FIELDS) delete c[k];
  return c;
}
function loadTeamFromCache() {
  try {
    const ver = localStorage.getItem('teamCacheVersion');
    if (ver !== TEAM_CACHE_VERSION) {
      // Cache хуучирсан — устгаад hardcoded TEAM-аар явна
      localStorage.removeItem('teamCache');
      localStorage.removeItem('teamCacheAt');
      localStorage.setItem('teamCacheVersion', TEAM_CACHE_VERSION);
      return false;
    }
    const cached = localStorage.getItem('teamCache');
    if (!cached) return false;
    const parsed = JSON.parse(cached);
    if (!Array.isArray(parsed) || !parsed.length) return false;
    TEAM.length = 0;
    parsed.forEach(m => TEAM.push(m));
    return true;
  } catch(e) { return false; }
}
async function loadTeamFromAPI() {
  const url = state.config.staffUrl;
  if (!url) return false;
  try {
    // Cache-bust query — n8n response 5-минут CDN кэштэй тул фреш PIN авахын тулд хэрэгтэй
    const sep = url.includes('?') ? '&' : '?';
    const bustUrl = withKey(`${url}${sep}t=${Date.now()}`);
    const r = await fetchWithTimeout(bustUrl, {
      method: 'GET',
      cache: 'no-store',
      headers: { 'Cache-Control': 'no-cache' },
    });
    if (!r.ok) throw new Error('HTTP ' + r.status);
    const data = await r.json();
    const fresh = Array.isArray(data?.team) ? data.team : null;
    if (!fresh || !fresh.length) throw new Error('empty team response');
    TEAM.length = 0;
    fresh.forEach(m => TEAM.push(m));
    localStorage.setItem('teamCache', JSON.stringify(TEAM.map(sanitizeTeamForCache)));
    localStorage.setItem('teamCacheAt', String(Date.now()));
    console.log(`Staff sync OK: ${fresh.length} members from Master Sheet`);
    // Шинэ ажилтан бүртгүүлсэн үед CEO-д мэдэгдэх
    notifyCEOOfPendingRegistrations();
    return true;
  } catch(e) {
    console.warn('Staff sync failed, using cached/hardcoded TEAM:', e);
    return false;
  }
}
function currentProjects() {
  // Бүх салбарын төслийг нэг жагсаалт болгож нэгтгэнэ — салбарын систем дотоод л үлдсэн.
  const seen = new Set();
  const merged = [];
  Object.values(state.projectsByBranch || {}).forEach(arr => {
    (arr || []).forEach(p => {
      if (seen.has(p.id)) return;
      seen.add(p.id);
      merged.push(p);
    });
  });
  return merged;
}

/* -------------------- STORAGE -------------------- */
// Google Sheets returns string-typed columns as numbers when the value looks numeric
// (e.g. assignee "001" → 1). Normalize so render code can rely on consistent types.
/* ─── Хариуцагч EMAIL ↔ нэр хөрвүүлэх ──────────────────────────────────
   Google Sheet-д НЭР хадгална (хүн уншиж ойлгомжтой).
   Аппын дотоод төлөв (state) EMAIL-ээр түлхүүрлэгдэнэ — зөвхөн n8n руу явахаас
   өмнө + ирэхэд хөрвүүлнэ. Хоёр чигт idempotent. */
// Дотоод түлхүүр (утас/email/нэр) → дэлгэцийн нэр (Sheet-д нэр хадгална)
function emailToName(val) {
  if (!val) return val;
  const m = findMember(val);
  return m ? m.name : val;
}
// Нэр (эсвэл аливаа таних утга) → давтагдашгүй түлхүүр = утасны дугаар (idempotent)
function nameToEmail(val) {
  if (!val) return val;
  const m = findMember(val);
  return m ? personKey(m) : val;
}
/* Код ↔ монгол текст хөрвүүлэх maps (Sheet нь зөвхөн монголоор) */
const _BRANCH_E2M = { 'm-event':'M Event', 'camp':'NOMAAD Camp', 'shared':'Нэгдсэн', 'production':'Бэлтгэл' };
const _PRIORITY_E2M = { 'low':'Чөлөөтэй', 'med':'Энгийн', 'high':'Яаралтай', 'none':'' };
const _STATUS_E2M = { 'open':'Идэвхтэй', 'done':'Дууссан', 'deleted':'Устгасан', 'locked':'Түгжээтэй' };
const _KIND_E2M = { 'act_parent':'Эх захиалга', 'act_stage':'Дамжлага' };
const _DECISION_E2M = { 'pending':'Хүлээгдэж буй', 'approved':'Зөвшөөрсөн', 'rejected':'Татгалзсан', 'deferred':'Хойшлуулсан' };
const _flip = (m) => Object.fromEntries(Object.entries(m).map(([k,v])=>[v,k]));
const _BRANCH_M2E = _flip(_BRANCH_E2M);
const _PRIORITY_M2E = _flip(_PRIORITY_E2M);
const _STATUS_M2E = _flip(_STATUS_E2M);
const _KIND_M2E = _flip(_KIND_E2M);
const _DECISION_M2E = _flip(_DECISION_E2M);
const _xlate = (val, m) => (val && m[val] != null) ? m[val] : val;

function taskToWire(task) {
  if (!task || typeof task !== 'object') return task;
  const out = { ...task };
  if (out.assignee) out.assignee = emailToName(out.assignee);
  if (out.createdBy) out.createdBy = emailToName(out.createdBy);
  if (Array.isArray(out.co_assignees)) out.co_assignees = out.co_assignees.map(emailToName);
  // completion_photos array → CSV string (Sheet single cell)
  if (Array.isArray(out.completion_photos)) {
    out.completion_photos_csv = out.completion_photos.join(' | ');
  }
  // task_images array → CSV string (Sheet "Даалгаврын зураг" багана)
  if (Array.isArray(out.task_images)) {
    out.task_images_csv = out.task_images.join(' | ');
  }
  // Boolean flag → Тийм/Үгүй (Sheet хүн уншихад)
  out.requires_photo_label = out.requires_photo ? 'Тийм' : 'Үгүй';
  // Код → монгол
  out.branch    = _xlate(out.branch, _BRANCH_E2M);
  out.priority  = _xlate(out.priority, _PRIORITY_E2M);
  out.status    = _xlate(out.status, _STATUS_E2M);
  out.kind      = _xlate(out.kind, _KIND_E2M);
  out.decision  = _xlate(out.decision, _DECISION_E2M);
  // Timestamp (ms) → ISO string (Sheet дээр унших боломжтой)
  if (typeof out.created === 'number') out.created = new Date(out.created).toISOString();
  if (typeof out.updated === 'number') out.updated = new Date(out.updated).toISOString();
  return out;
}
function taskFromWire(task) {
  if (!task || typeof task !== 'object') return task;
  const out = { ...task };
  if (out.assignee) out.assignee = nameToEmail(out.assignee);
  if (out.createdBy) out.createdBy = nameToEmail(out.createdBy);
  if (typeof out.co_assignees === 'string') {
    out.co_assignees = out.co_assignees ? out.co_assignees.split(',').map(s=>s.trim()).filter(Boolean) : [];
  }
  if (Array.isArray(out.co_assignees)) out.co_assignees = out.co_assignees.map(nameToEmail);
  // completion_photos CSV → array
  if (typeof out.completion_photos === 'string') {
    out.completion_photos = out.completion_photos ? out.completion_photos.split(/\s*\|\s*/).filter(Boolean) : [];
  }
  // task_images CSV → array
  if (typeof out.task_images === 'string') {
    out.task_images = out.task_images ? out.task_images.split(/\s*\|\s*/).filter(Boolean) : [];
  }
  // requires_photo Mongolian label → bool
  if (typeof out.requires_photo === 'string') {
    out.requires_photo = /тийм|true|yes|1/i.test(out.requires_photo);
  }
  // Монгол → код
  out.branch    = _xlate(out.branch, _BRANCH_M2E);
  out.priority  = _xlate(out.priority, _PRIORITY_M2E);
  out.status    = _xlate(out.status, _STATUS_M2E);
  out.kind      = _xlate(out.kind, _KIND_M2E);
  out.decision  = _xlate(out.decision, _DECISION_M2E);
  return out;
}

function normalizeTask(t) {
  if (!t || typeof t !== 'object') return t;
  // Эхлээд нэр → ID хөрвүүлэх (Sheet-ээс ирсэн бол)
  t = taskFromWire(t);
  const stringFields = ['id','title','desc','branch','project','assignee','due','priority','status','kpi_code','createdBy','parent_id','kind',
    'completion_photo_url',
    'decision','decision_at','decision_by','executed_at','executed_by','purpose','beneficiary','justification','decline_reason'];
  const out = { ...t };
  for (const f of stringFields) {
    if (out[f] != null) out[f] = String(out[f]);
  }
  // `stage` is numeric (1-5). Google Sheets may return it as string.
  if (out.stage != null && out.stage !== '') out.stage = Number(out.stage) || null;
  // `amount` is numeric (₮). Sheets may return as string.
  if (out.amount != null && out.amount !== '') out.amount = Number(out.amount) || 0;
  // Comments & activity log — массив байх ёстой. Sheet/localStorage-аас JSON string ирж болно.
  if (typeof out.comments === 'string') {
    try { out.comments = JSON.parse(out.comments); } catch { out.comments = []; }
  }
  if (typeof out.activity === 'string') {
    try { out.activity = JSON.parse(out.activity); } catch { out.activity = []; }
  }
  if (!Array.isArray(out.comments)) out.comments = [];
  if (!Array.isArray(out.activity)) out.activity = [];
  return out;
}

/* ─── Activity log helpers ─────────────────────────────
   Tier 2 task system: бүх үйлдэл бичигдсэн audit trail.
   Activity — статус өөрчлөгдсөн, баримт нэмэгдсэн г.м. system log. */

function uidShort() {
  return Math.random().toString(36).slice(2, 8);
}

// Activity log нэмэх (тайлбар нь дотоод, UI дээр харагдана)
function logTaskActivity(task, action, details = {}) {
  if (!Array.isArray(task.activity)) task.activity = [];
  task.activity.push({
    id: uidShort(),
    actor: state.me,
    action, // 'created', 'status_changed', 'comment_added', 'declined', 'reassigned', 'edited', 'clarification_requested'
    timestamp: Date.now(),
    details,
  });
}

// Статус өөрчлөх + activity log
async function changeTaskStatus(taskId, newStatus, reason = '') {
  const task = state.tasks.find(t => t.id === taskId);
  if (!task) return;
  const oldStatus = task.status || 'open';
  if (oldStatus === newStatus) return;
  // Дуусгахдаа биелэлтийн зураг modal — үргэлж нээгдэнэ.
  // requires_photo=true үед заавал, эс бөгөөс заавал биш.
  if (newStatus === 'done' && !(task.completion_photos || []).length) {
    const photos = await promptCompletionPhoto(task, { required: !!task.requires_photo });
    if (photos === null) return; // Болих дарсан
    // Заавал зурагтай үед хоосон бол done болгохгүй (хатуу шалгалт)
    if (task.requires_photo && !photos.length) {
      showToast('⚠ Энэ даалгаврыг дуусгахын тулд зураг хавсаргах ёстой', 'warn', 3500);
      return;
    }
    if (photos.length) task.completion_photos = photos;
  }
  task.status = newStatus;
  if (newStatus === 'in_progress') task.started_at = Date.now();
  if (newStatus === 'done') task.completed_at = Date.now();
  if (newStatus === 'declined') task.decline_reason = reason || '';
  logTaskActivity(task, 'status_changed', { from: oldStatus, to: newStatus, reason });
  await saveTask(task);
}

/* Bootstrap fetch — tasks + finance-ийг нэг webhook-аас зэрэг татна. n8n execution тоог
   2 → 1 болгож сард ~30% буурна. Алдаатай эсвэл endpoint тохируулагдаагүй бол false
   буцаагаад caller хуучин 2 тусдаа endpoint-ыг ашиглах fallback-ыг идэвхжүүлнэ. */
async function loadBootstrap() {
  const url = state.config.bootstrapUrl;
  if (!url) return false;
  try {
    const r = await fetchWithTimeout(withKey(url + '?t=' + Date.now()), {
      cache: 'no-store',
      headers: { 'Cache-Control': 'no-cache' },
    });
    if (!r.ok) return false;
    const data = await r.json();
    const tasksRaw  = (data.tasks   && data.tasks.tasks)      || [];
    const finRaw    = (data.finance && data.finance.requests) || [];
    if (!Array.isArray(tasksRaw) || !Array.isArray(finRaw)) return false;
    if (!Object.keys(state.projectsByBranch).length) {
      Object.keys(PROJECTS_BY_BRANCH).forEach(b => {
        state.projectsByBranch[b] = [...PROJECTS_BY_BRANCH[b]];
      });
    }
    state.tasks = tasksRaw.map(normalizeTask).filter(t => !isRecentlyDeleted(t.id));
    state.financeRequests = finRaw.map(normalizeFinance);
    applyPendingTaskWrites();
    applyPendingFinanceWrites();
    updatePendingConn();
    saveLocal();
    try { localStorage.setItem('financeRequests', JSON.stringify(state.financeRequests)); } catch(e) {}
    return true;
  } catch (e) {
    console.warn('Bootstrap load failed, falling back to per-endpoint:', e);
    return false;
  }
}

async function loadData() {
  // Always seed the per-branch projects map first so the sidebar has something
  // to render even if n8n returns only tasks.
  if (!Object.keys(state.projectsByBranch).length) {
    Object.keys(PROJECTS_BY_BRANCH).forEach(b => {
      state.projectsByBranch[b] = [...PROJECTS_BY_BRANCH[b]];
    });
  }
  if (state.config.apiUrl) {
    try {
      // Cache-bust — n8n Cloud GET-ийг ~5 мин кэшилдэг тул Sheet дээр шууд хийсэн өөрчлөлт
      // (мөр устгах/засах) тусахгүй байдаг. t=Date.now() + no-store-р фреш дата авна.
      const r = await fetchWithTimeout(withKey(state.config.apiUrl + '?action=list&t=' + Date.now()), {
        cache: 'no-store',
        headers: { 'Cache-Control': 'no-cache' },
      });
      if (!r.ok) throw new Error('HTTP ' + r.status);
      const data = await r.json();
      const raw = Array.isArray(data) ? data : (data.tasks || []);
      state.tasks = raw.map(normalizeTask).filter(t => !isRecentlyDeleted(t.id));
      if (data.projectsByBranch) state.projectsByBranch = data.projectsByBranch;
      applyPendingTaskWrites();   // офлайн хийсэн, хараахан sync болоогүй өөрчлөлтийг хадгална
      updatePendingConn();
      saveLocal();   // cache
      return;
    } catch (e) {
      console.warn('API load failed, falling back to local:', e);
      setConn('offline', 'Локал режим (n8n холбогдсонгүй)');
    }
  }
  loadLocal();
}
function loadLocal() {
  // Tasks — localStorage кэшээс уншина. Backend холбогдоогүй үед энэ нь сүүлийн sync-ийн хуулбар.
  try {
    const raw = localStorage.getItem('tasks');
    state.tasks = raw ? JSON.parse(raw) : [];
  } catch(e) { state.tasks = []; }
  // Projects per branch — initialize from defaults, override with anything saved
  state.projectsByBranch = {};
  Object.keys(PROJECTS_BY_BRANCH).forEach(b => {
    state.projectsByBranch[b] = [...PROJECTS_BY_BRANCH[b]];
  });
  try {
    const pRaw = localStorage.getItem('projectsByBranch');
    if (pRaw) {
      const saved = JSON.parse(pRaw);
      Object.keys(saved).forEach(b => { state.projectsByBranch[b] = saved[b]; });
    }
  } catch(e) { /* keep defaults */ }
  setConn('offline', 'Локал режим');
}
function saveLocal() {
  localStorage.setItem('tasks', JSON.stringify(state.tasks));
  localStorage.setItem('projectsByBranch', JSON.stringify(state.projectsByBranch));
  localStorage.setItem('branch', state.branch);
}
// Хуучин кодны 5 газар (project устгах, recurring spawn, swipe delete/done) `saveData()` гэж
// дуудсан байсан ч ийм функц огт тодорхойлогдоогүй байсан тул silently throw хийдэг байсан.
// saveLocal-ын alias болгож засав — call sites энэ нэрийг ашигладгийг тодорхойлж байгаа нь.
const saveData = saveLocal;
/* -------------------- OFFLINE WRITE QUEUE --------------------
   Кемпэд интернэт тогтворгүй. Сервер рүү бичих оролдлого амжилтгүй болбол өөрчлөлтийг
   localStorage-д "pendingWrites" дараалалд хадгална. Холболт сэргэх бүрд (poll, online
   event, апп нээх) дахин илгээнэ. Ингэснээр офлайн хийсэн өөрчлөлт алдагдахгүй.
   loadData/loadFinanceRequests серверээс дата татахдаа эдгээр pending бичлэгийг ДЭЭР нь
   давхарлаж (merge) тавьдаг тул сервер дээр хараахан очоогүй өөрчлөлт ч UI-д хадгалагдана. */
function loadPendingWrites() {
  try { return JSON.parse(localStorage.getItem('pendingWrites') || '[]'); } catch(e) { return []; }
}
function savePendingWrites(q) {
  try { localStorage.setItem('pendingWrites', JSON.stringify(q)); } catch(e) {}
}
function enqueueWrite(write) {
  const q = loadPendingWrites();
  const id = write.payload && write.payload.id;
  // Нэг бичлэгийн өмнөх pending-ийг хасна (хамгийн сүүлийн өөрчлөлт давамгайлна)
  const filtered = q.filter(w => !(w.kind === write.kind && w.payload && w.payload.id === id));
  filtered.push(write);
  savePendingWrites(filtered);
  updatePendingConn();
}
async function postWrite(url, body) {
  if (!url) return false;
  try {
    const r = await fetchWithTimeout(withKey(url), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    return r.ok; // 500/4xx-ийг ялагдал гэж тооцно (throw хийдэггүй)
  } catch(e) { return false; }
}
let _flushing = false;
async function flushPendingWrites() {
  if (_flushing) return;
  let queue = loadPendingWrites();
  if (!queue.length) { updatePendingConn(); return; }
  _flushing = true;
  const remaining = [];
  for (const w of queue) {
    const url = w.kind === 'finance' ? state.config.financeUrl : state.config.apiUrl;
    const body = w.kind === 'finance'
      ? { action: w.action, request: requestToWire(w.payload) }
      : { action: w.action, task: taskToWire(w.payload) };
    const ok = await postWrite(url, body);
    if (!ok) remaining.push(w);
  }
  savePendingWrites(remaining);
  _flushing = false;
  updatePendingConn();
}
function updatePendingConn() {
  const n = loadPendingWrites().length;
  if (n > 0) setConn('offline', `${n} өөрчлөлт sync хүлээж буй`);
  else setConn('online', 'n8n холбогдсон');
}
// Серверээс татсан жагсаалт дээр pending бичлэгүүдийг давхарлаж тавих (merge).
function applyPendingTaskWrites() {
  for (const w of loadPendingWrites()) {
    if (w.kind !== 'task' || !w.payload) continue;
    if (w.action === 'delete') {
      state.tasks = state.tasks.filter(t => t.id !== w.payload.id);
    } else {
      const idx = state.tasks.findIndex(t => t.id === w.payload.id);
      if (idx >= 0) state.tasks[idx] = normalizeTask(w.payload);
      else state.tasks.unshift(normalizeTask(w.payload));
    }
  }
}
function applyPendingFinanceWrites() {
  for (const w of loadPendingWrites()) {
    if (w.kind !== 'finance' || !w.payload) continue;
    if (w.action === 'delete') {
      state.financeRequests = state.financeRequests.filter(r => r.id !== w.payload.id);
    } else {
      const idx = state.financeRequests.findIndex(r => r.id === w.payload.id);
      if (idx >= 0) state.financeRequests[idx] = normalizeFinance(w.payload);
      else state.financeRequests.unshift(normalizeFinance(w.payload));
    }
  }
}
let _taskWriteChain = Promise.resolve();
async function saveTask(task, deleted=false, hardDelete=false, skipLocal=false) {
  if (!skipLocal) saveLocal(); // багц үүсгэхэд (30+ ажил) skipLocal=true — saveLocal-г нэг л удаа дуудна
  if (!state.config.apiUrl) return; // backend тохируулаагүй — зөвхөн локал
  // ID-г нэр болгож хувиргаж Sheet рүү явуулна
  const wire = taskToWire(task);
  const action = hardDelete ? 'hard_delete' : (deleted ? 'delete' : 'upsert');
  // БҮХ task Sheet-бичилтийг ДАРААЛУУЛЖ (сериал) ажиллуулна. Олон ажлыг зэрэг
  // устгахад hard_delete нь Sheet-ийн мөрийн дугаараар устгадаг тул мөрийн дугаар
  // шилжиж зарим устгал "мөр олдсонгүй" болж тусдаггүй (буцаж гарч ирдэг). Нэг
  // бичилт дуустал дараагийнх хүлээснээр уг уралдааныг арилгана.
  _taskWriteChain = _taskWriteChain.then(async () => {
    const ok = await postWrite(state.config.apiUrl, { action, task: wire });
    if (ok) { flushPendingWrites(); }            // амжилттай — backlog-оо бас илгээх
    else { enqueueWrite({ kind: 'task', action, payload: task, ts: Date.now() }); }
  }).catch(() => { enqueueWrite({ kind: 'task', action, payload: task, ts: Date.now() }); });
  return _taskWriteChain;
}

/* Push broadcast — хариуцагч руу нэн даруй мэдэгдэл илгээнэ. Fire-and-forget;
   амжилтгүй бол ердөө сайлент үлдэнэ (Sheet sync дараа нь шинэчлэгдэх үед бас давтахгүй). */
function pushBroadcast(email, payload) {
  const url = state.config.pushBroadcastUrl;
  if (!url || !email) return;
  if (email === state.me) return; // өөртөө илгээхгүй
  fetchWithTimeout(withKey(url), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, ...payload }),
    keepalive: true,
  }).catch(() => {});
}
function uid() { return 't_' + Math.random().toString(36).slice(2,10) + Date.now().toString(36); }

// Саяхан устгасан task id-ууд — backend-д бүрэн тусах хүртэл (chain хүлээж байх үед)
// refresh нь Sheet-ээс буцааж нэмэхээс сэргийлнэ (устгал "буцаж ирэх" алдааг арилгана).
const _recentlyDeleted = new Map();
function markDeleted(id) { if (id) _recentlyDeleted.set(id, Date.now()); }
function isRecentlyDeleted(id) {
  const ts = _recentlyDeleted.get(id);
  if (!ts) return false;
  if (Date.now() - ts > 120000) { _recentlyDeleted.delete(id); return false; }
  return true;
}

// Return TODAY as a LOCAL YYYY-MM-DD string.
// ⚠ `new Date().toISOString().slice(0,10)` буцаадаг нь UTC огноо — Монгол (UTC+8)-д
//   өглөө 08:00-аас өмнө өчигдрийн огноог буцааж, "Өнөөдөр"/"Хоцорсон" тооллогыг
//   нэг өдрөөр буруу болгодог. Энэ helper локал огноог зөв буцаана.
function todayStr() {
  const d = new Date();
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
}

// Add `days` (can be negative) to a YYYY-MM-DD string. Returns YYYY-MM-DD.
function addDays(yyyymmdd, days) {
  if (!yyyymmdd) return '';
  const d = new Date(yyyymmdd + 'T00:00:00');
  if (isNaN(d)) return '';
  d.setDate(d.getDate() + Number(days || 0));
  return d.toISOString().slice(0,10);
}

/* Create a 5-stage act for an M Event order. Returns the parent task.
   Side-effect: pushes parent + 5 sub-tasks into state.tasks, persists via saveTask. */
/* Финансын request-ийг task-уудтай адил render хийхэд адаптер хэлбэрт оруулах */
// Жижиг дүн (300,000₮-аас доош) → салбарын менежер баталдаг. Эрхгүй бол CEO.
//  ИВЕНТ — И.Алтансүх ·  КЕМП — Дэлгэрбат ·  ЗАХ — Анужин
function getFinanceApprover(r) {
  const amt = Number(r?.amount) || 0;
  if (amt > 0 && amt < 300000) {
    const branch = String(r?.dept_branch || '').toUpperCase();
    let needle = null;
    if (branch === 'ИВЕНТ') needle = 'алтансүх';
    else if (branch === 'КЕМП') needle = 'дэлгэрбат';
    else if (branch === 'ЗАХ' || branch === 'ЗАХИРГАА') needle = 'анужин';
    if (needle) {
      const found = (TEAM || []).find(m => String(m.name || '').toLowerCase().includes(needle));
      if (found) {
        const approverKey = personKey(found);
        // Өөрөө өөрийнхөө хүсэлтийг батлахаас сэргийлнэ — батлагч нь илгээгч мөн бол
        // шийдвэрийг нэг шат дээш (CEO) руу ахиулна.
        if (approverKey && approverKey === r?.requested_by) return getCEOEmail();
        return approverKey;
      }
    }
  }
  return getCEOEmail();
}

function financeAsTask(r) {
  const executorId = r.executor || getFinanceExecutorEmail();
  // Assignee logic:
  //  - pending: salbar manager эсвэл CEO (getFinanceApprover)
  //  - approved + хаагдаагүй: executor (нягтлан хийнэ)
  //  - done + approved: executor (хаасан түүх тэр хүний дээр үлдэнэ)
  //  - rejected: salbar manager эсвэл CEO (тэр шийдсэн)
  let assignee;
  if (r.decision === 'approved') assignee = executorId;
  else assignee = getFinanceApprover(r);
  return {
    id: r.id,
    title: `💸 ${r.beneficiary || 'Хүсэлт'} — ${Number(r.amount || 0).toLocaleString('mn-MN')}₮`,
    desc: (r.purpose ? `Зорилго: ${r.purpose}\n` : '') + (r.justification || ''),
    branch: 'shared',
    project: 'finance',
    assignee,
    due: r.due_date || '',
    priority: r.priority || 'med',
    status: r.status || 'open',
    kind: 'finance_request',
    amount: r.amount,
    decision: r.decision,
    executed_at: r.executed_at,
    createdBy: r.requested_by,
    created: r.requested_at ? new Date(r.requested_at).getTime() : 0,
    purpose: r.purpose || '',          // зарцуулалт тайлбар — мөрөнд харуулна
    requested_at: r.requested_at || '', // илгээсэн цаг (UB-аар форматлана)
    dept_branch: r.dept_branch || '',  // салбар (ИВЕНТ/КЕМП/ЗАХ) — салбараар бүлэглэхэд
    category: r.category || '',        // ангилал (код+нэр) — үндсэн/дэд ангиллаар бүлэглэхэд
    beneficiary: r.beneficiary || '',
    close_type: r.close_type || '',    // хаасан хэлбэр (баримттай/дутуу/баримтгүй) — аудитад
    close_note: r.close_note || '',    // баримтгүй/дутуу хаасан шалтгаан
    has_receipt: Array.isArray(r.purchase_receipt_urls)  // хүлээн авалтын баримт хавсаргасан эсэх
      ? r.purchase_receipt_urls.length > 0 : !!r.purchase_receipt_url,
    _isFinance: true, // marker
  };
}
// Ангилалын код задлах ("1400 Урлагийн..." эсвэл "1400" → {main:'1000', sub:'1400'})
function finCatCodes(category) {
  const m = String(category || '').match(/(\d{4})/);
  const sub = m ? m[1] : '';
  return { main: sub ? sub[0] + '000' : '', sub };
}
function finMainName(category) {
  const { main } = finCatCodes(category);
  const c = FINANCE_MAIN_CATEGORIES.find(x => x.code === main);
  return c ? `${c.code} ${c.name}` : 'Ангилалгүй';
}
function finSubName(category) {
  const { main, sub } = finCatCodes(category);
  if (!sub) return 'Ангилалгүй';
  const c = (FINANCE_SUB_CATEGORIES[main] || []).find(x => x.code === sub);
  return c ? `${c.code} ${c.name}` : sub;
}

/* -------------------- ФИНАНСЫН ХҮСЭЛТ (Finance request) --------------------
   Workflow:
     Ажилтан → submit → CEO (assignee автомат CEO) → CEO decision:
       Зөвшөөрөх  → assignee = S03 (Туслах нягтлан) → S03 гүйлгээ хийгээд ✓ done
       Татгалзах  → decision=rejected, status=done (хаагдсан)
       Хойшлуулах → due += 7 хоног, CEO дээр үлдэнэ */

// Туслах нягтлан — зөвшөөрсөн хүсэлтийг гүйцэтгэнэ. Hardcoded ID биш role-аар хайна
// (Master Sheet-д ID солигдсон ч role-аар хадгалагдсан хүн олдох ёстой).
function getFinanceExecutorEmail() {
  return findMemberEmailByRole('нягтлан', getCEOEmail());
}

/* Зардлын стандарт ангилал — 2-түвшинт (Үндсэн → Дэд)
   CEO-аас 2026-05-18-нд баталсан стандарт. МНББС-тэй нийцсэн.
   Canonical Sheet: Чимун_ХХК_Зардлын_Ангилал_Стандарт.xlsx
   Дэлгэрэнгүйг гүйлгээний утга дээр чөлөөт текстээр бичнэ. */
// let — Sheet-ээс татвал орлоно (доорх нь default/fallback). loadFinanceCategories() харна уу.
let FINANCE_MAIN_CATEGORIES = [
  { code: '1000', name: 'Үйл ажиллагаа — Шууд' },
  { code: '2000', name: 'Тогтмол зардал' },
  { code: '3000', name: 'Захиргаа' },
  { code: '4000', name: 'Маркетинг' },
  { code: '5000', name: 'Санхүү ба татвар' },
  { code: '6000', name: 'Хөрөнгийн зардал' },
  { code: '7000', name: 'Цалин' },
  { code: '9000', name: 'Бусад ба тусгай' },
];

let FINANCE_SUB_CATEGORIES = {
  '1000': [
    { code: '1100', name: 'Гаднаас авсан нэмэлт үйлчилгээ' },
    { code: '1200', name: 'Зочны хэрэглээний материал' },
    { code: '1300', name: 'Зочны хоолны материал' },
    { code: '1400', name: 'Гадаа аж ахуйн хангамж' },
    { code: '1500', name: 'Гал тогооны хангамж' },
    { code: '1600', name: 'Ажилтны хоол, халамж' },
    { code: '1700', name: 'Тоног төхөөрөмжийн засвар, сэлбэг' },
    { code: '1800', name: 'Шатахуун, түлш (бензин, газ)' },
    { code: '1900', name: 'Бусад шууд зардал' },
  ],
  '2000': [
    { code: '2100', name: 'Түрээс (агуулах, оффис)' },
    { code: '2200', name: 'Цахилгаан, ус, дулаан' },
    { code: '2300', name: 'Утас, интернэт' },
    { code: '2400', name: 'Онлайн програм, апп төлбөр' },
    { code: '2900', name: 'Бусад тогтмол зардал' },
  ],
  '3000': [
    { code: '3100', name: 'Оффисын хангамж' },
    { code: '3500', name: 'Хууль зүйн зардал' },
    { code: '3600', name: 'Сургалт, семинар, багийн уур амьсгал' },
    { code: '3700', name: 'Бусад захиргаа' },
  ],
  '4000': [
    { code: '4100', name: 'Цахим зар сурталчилгаа' },
    { code: '4200', name: 'Видео, гэрэл зургийн найруулга' },
    { code: '4300', name: 'Хэвлэлийн материал' },
    { code: '4400', name: 'Спонсор, нөлөөлөгч, түнш' },
    { code: '4500', name: 'Веб хуудас, домэйн, хост' },
    { code: '4600', name: 'Бусдын арга хэмжээний спонсорчлол' },
    { code: '4900', name: 'Бусад маркетинг' },
  ],
  '5000': [
    { code: '5100', name: 'НӨАТ' },
    { code: '5200', name: 'ААНОАТ' },
    { code: '5300', name: 'Ажил олгогчийн НДШ (12.5%)' },
    { code: '5400', name: 'Ажилтны НДШ (11.5%)' },
    { code: '5500', name: 'ХХОАТ' },
    { code: '5600', name: 'Зээлийн хүү (ЗӨВХӨН хүү)' },
    { code: '5700', name: 'Банкны шимтгэл' },
    { code: '5800', name: 'Үйлчлүүлэгчид буцаасан, торгууль' },
    { code: '5900', name: 'Бусад татвар, санхүү' },
  ],
  '6000': [
    { code: '6100', name: 'Шинэ тоног төхөөрөмж' },
    { code: '6200', name: 'Машин, тээврийн хэрэгсэл' },
    { code: '6300', name: 'Компьютер, утас, гаджет' },
    { code: '6400', name: 'Программын байнгын лиценз' },
    { code: '6500', name: 'Барилга, дэд бүтэц' },
    { code: '6600', name: 'Бусад хөрөнгө' },
  ],
  '7000': [
    { code: '7100', name: 'Үндсэн ажилтны цалин' },
    { code: '7200', name: 'Цагийн / улирлын ажилтны цалин' },
    { code: '7300', name: 'Гэрээт ажилтны цалин' },
    { code: '7400', name: 'Урамшуулал / бонус' },
    { code: '7500', name: 'Илүү цаг, нэмэгдэл хөлс' },
    { code: '7600', name: 'Бусад цалин, тэтгэмж' },
  ],
  '9000': [
    { code: '9100', name: 'Засгийн газрын торгууль' },
    { code: '9200', name: 'Хандив, нийгмийн хариуцлага' },
    { code: '9300', name: 'Гэнэтийн, онцгой нөхцөл' },
    { code: '9400', name: 'Алдагдал' },
    { code: '9500', name: 'Тодорхой бус (түр)' },
  ],
};

/* Салбарын жагсаалт — хүсэлт ХААНА харъялагдсаныг заана */
const FINANCE_BRANCHES = [
  { code: 'ИВЕНТ', name: 'Эм Ивент' },
  { code: 'КЕМП',  name: 'Номаад кемп' },
  { code: 'ЗАХ',   name: 'Захиргаа' },
  { code: 'ХАМТ',  name: 'Хамтын зардал' },
  { code: 'ХХК',   name: 'Чимун ХХК (хөрөнгө)' },
];

const FINANCE_FREQUENCIES = ['Нэг удаагийн', 'Тогтмол сар бүр', 'Урт хугацаат гэрээ'];

/* Бүх ажилтанд ИЖИЛ нэг универсал санхүүгийн маягт.
   Role-аар customization хийхгүй — энгийн ярианы хэлбэрийн асуулт. */

/* Монголын арилжааны банкуудын жагсаалт (хэрэглээнд түгээмэл) */
const MONGOLIAN_BANKS = [
  'Хаан банк',
  'Голомт банк',
  'Худалдаа хөгжлийн банк',
  'Хас банк',
  'Төрийн банк',
  'Капитрон банк',
  'Богд банк',
  'М банк',
  'Чингис хаан банк',
  'Ариг банк',
  'Үндэсний хөрөнгө оруулалтын банк',
  'Транс банк',
  'Бусад',
];

/* Файл (зураг/PDF) -> Drive folder руу upload хийгээд URL буцаах helper.
   kind: 'purchase' (худалдан авсан баримт) эсвэл 'payment' (төлбөрийн баримт) */
async function uploadReceipt(file, requestId, kind, taskTitle = '') {
  if (!file) return null;
  if (!state.config.uploadUrl) {
    showToast('Upload endpoint тохируулагдаагүй. Settings шалгана уу.', 'error');
    return null;
  }
  // Зураг бол клиент талд ШАХНА (resize + JPEG) — сул сүлжээнд том зураг (4-8MB)
  // орж өгдөггүй асуудлыг шийднэ. PDF/бусад файлыг хэвээр илгээнэ.
  let base64, filename = file.name || 'file', contentType = file.type || 'application/octet-stream';
  if (/^image\//i.test(file.type)) {
    const maxSize = kind === 'completion' ? 1280 : 1600; // биелэлтийн зураг арай илүү шахна
    const quality = kind === 'completion' ? 0.6 : 0.72;
    try {
      base64 = await resizeImageToBase64(file, maxSize, quality);
      contentType = 'image/jpeg';
      filename = filename.replace(/\.[^.]+$/, '') + '.jpg';
    } catch (e) { base64 = null; /* шахалт амжилтгүй → доор эх файлаар */ }
  }
  if (!base64) {
    base64 = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }
  try {
    const r = await fetchWithTimeout(withKey(state.config.uploadUrl), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        filename,
        contentType,
        base64,
        request_id: requestId,
        kind,
        task_title: taskTitle,
      })
    }, 60000); // сул сүлжээнд 15с-д тасардаг тул upload-д 60с өгнө
    if (!r.ok) throw new Error('HTTP ' + r.status + ' — ' + (await r.text()).slice(0, 100));
    // Try parse JSON; if empty body, give specific error
    const text = await r.text();
    if (!text.trim()) {
      throw new Error('Хариу хоосон — n8n workflow буцаах node холбогдоогүй байж магадгүй');
    }
    let data;
    try { data = JSON.parse(text); }
    catch (e) { throw new Error('Хариу JSON биш: ' + text.slice(0, 100)); }
    if (!data.url) throw new Error('URL буцаагүй: ' + JSON.stringify(data).slice(0, 100));
    return data.url;
  } catch (e) {
    console.warn('Upload failed:', e);
    showToast('Файл upload амжилтгүй: ' + e.message, 'error', 6000);
    return null;
  }
}

/* Финансын хүсэлт нь Tasks-ээс ТУСДАА Sheet-д хадгалагдана (Чимун_Финанс_Хүсэлт).
   App-н state дотор хадгалахдаа state.financeRequests array-д байх ба
   UI rendering нь tasks-той хамт нэгтгэн харагдана (sidebar Хүсэлт view-р шүүгдэнэ). */

async function saveFinanceRequest(r, deleted = false) {
  // localStorage кэш
  try { localStorage.setItem('financeRequests', JSON.stringify(state.financeRequests)); } catch(e) {}
  if (!state.config.financeUrl) return;
  // Sheet рүү явуулахын өмнө: ID → нэр, код → монгол
  const wire = requestToWire(r);
  const ok = await postWrite(state.config.financeUrl, { action: deleted ? 'delete' : 'upsert', request: wire });
  if (ok) { flushPendingWrites(); }
  else { enqueueWrite({ kind: 'finance', action: deleted ? 'delete' : 'upsert', payload: r, ts: Date.now() }); }
}

// Санхүүгийн ангилалыг Google Sheet (fin_categories tab)-аас татна. Амжилтгүй бол default/кэш хэвээр.
async function loadFinanceCategories() {
  const url = state.config.finCategoriesUrl;
  if (!url) return;
  try {
    const r = await fetchWithTimeout(withKey(url + '?t=' + Date.now()), { headers: { 'Accept': 'application/json' } }, 15000);
    if (!r.ok) throw new Error('HTTP ' + r.status);
    const data = await r.json();
    const rows = Array.isArray(data) ? data : (data.categories || []);
    const mains = [], subs = {}, perms = new Set();
    rows.forEach(rw => {
      const active = String(rw.active == null ? '1' : rw.active).trim().toLowerCase();
      if (active === '0' || active === 'false' || active === 'үгүй') return;
      const code = String(rw.code || '').trim();
      if (!code) return;
      // Санхүү салбар-засах эрх — мөн энэ tab-д type='fin_branch_perm', code=personKey-ээр хадгална.
      if (rw.type === 'fin_branch_perm') { perms.add(code); return; }
      const name = String(rw.name || '').trim();
      if (!name) return;
      if (rw.type === 'main') mains.push({ code, name });
      else { const p = String(rw.parent || '').trim(); (subs[p] = subs[p] || []).push({ code, name }); }
    });
    state.finBranchPerms = perms;
    if (!mains.length) return; // хоосон ирвэл default-аа хадгална
    mains.sort((a, b) => a.code.localeCompare(b.code));
    Object.keys(subs).forEach(k => subs[k].sort((a, b) => a.code.localeCompare(b.code)));
    FINANCE_MAIN_CATEGORIES = mains;
    FINANCE_SUB_CATEGORIES = subs;
    try { localStorage.setItem('finCategories', JSON.stringify({ mains, subs })); } catch (e) {}
    if (typeof render === 'function') render();
  } catch (e) {
    // Сүүлд амжилттай татсан кэш байвал түүгээр (default дээр давхарлана)
    try { const c = JSON.parse(localStorage.getItem('finCategories') || 'null'); if (c && c.mains && c.mains.length) { FINANCE_MAIN_CATEGORIES = c.mains; FINANCE_SUB_CATEGORIES = c.subs; } } catch (_) {}
    console.warn('loadFinanceCategories fail', e);
  }
}

/* Санхүүгийн "салбар засах" эрх — CEO эсвэл тусгайлан зөвшөөрсөн ажилтан.
   Эдгээр хүн бүх санхүүгийн гүйлгээг ХАРАХ + зөвхөн САЛБАРЫГ нь засна (бусад нь read-only). */
function isFinanceBranchEditor(key = state.me) {
  if (state.isCEO) return true;
  return !!(key && state.finBranchPerms && state.finBranchPerms.has(key));
}
/* Туслах нягтлан мөн эсэх — role-аар (/нягтлан/) таньна (хэд хэдэн нягтлан байж болно). */
function isFinanceAccountant(key = state.me) {
  if (!key) return false;
  if (key === getFinanceExecutorEmail()) return true;
  const m = findMember(key);
  return !!(m && /нягтлан/i.test(m.role || ''));
}
/* Бүх салбарын санхүүгийн хүсэлтийг харах эрх — CEO / нягтлан / салбар-засагч. */
function canSeeAllFinance(key = state.me) {
  return isFinanceBranchEditor(key) || isFinanceAccountant(key);
}
/* CEO ажилтанд салбар-засах эрх олгох/хураах. fin_categories tab-д type='fin_branch_perm'
   мөрөөр (code=personKey, active=1/0) хадгална — Master Sheet schema хөндөхгүй. */
async function saveFinanceBranchPerm(key, name, grant) {
  if (!state.finBranchPerms) state.finBranchPerms = new Set();
  if (grant) state.finBranchPerms.add(key); else state.finBranchPerms.delete(key);
  const url = state.config.finCategoriesUrl;
  if (!url) { showToast('Endpoint тохируулагдаагүй', 'error'); return false; }
  try {
    const r = await fetchWithTimeout(url, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key: N8N_API_KEY, rows: [{ type: 'fin_branch_perm', code: key, name: name || '', parent: '', active: grant ? '1' : '0' }] }),
    }, 15000);
    if (!r.ok) throw new Error('HTTP ' + r.status);
    showToast(grant ? `${name}: санхүүгийн салбар засах эрх олгов` : `${name}: эрх хураав`, 'success', 2500);
    return true;
  } catch (e) {
    showToast('Хадгалахад алдаа: ' + e.message, 'error', 4000);
    return false;
  }
}

async function loadFinanceRequests() {
  if (state.config.financeUrl) {
    try {
      // Cache-bust — Sheet дээр шууд устгасан/засварласан хүсэлт нэн даруй тусахын тулд
      const res = await fetchWithTimeout(withKey(state.config.financeUrl + '?action=list&t=' + Date.now()), {
        cache: 'no-store',
        headers: { 'Cache-Control': 'no-cache' },
      });
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const data = await res.json();
      const raw = Array.isArray(data?.requests) ? data.requests : [];
      state.financeRequests = raw.map(normalizeFinance);
      applyPendingFinanceWrites();   // офлайн хийсэн өөрчлөлтийг хадгална
      try { localStorage.setItem('financeRequests', JSON.stringify(state.financeRequests)); } catch(e) {}
      return;
    } catch (e) { console.warn('Finance load failed, fallback to cache:', e); }
  }
  // Fallback: localStorage
  try {
    const raw = localStorage.getItem('financeRequests');
    state.financeRequests = raw ? JSON.parse(raw) : [];
  } catch(e) { state.financeRequests = []; }
}

/* Финансын хүсэлт: ID ↔ нэр + код ↔ монгол текст хөрвүүлэх (Sheet нь хүн уншихад зориулсан) */
const _FIN_STATUS_E2M = { 'open':'Идэвхтэй', 'done':'Дууссан', 'deleted':'Устгасан' };
const _FIN_STATUS_M2E = _flip(_FIN_STATUS_E2M);
const _FIN_DEC_E2M    = { 'pending':'Хүлээгдэж буй', 'approved':'Зөвшөөрсөн', 'rejected':'Татгалзсан', 'deferred':'Хойшлуулсан' };
const _FIN_DEC_M2E    = _flip(_FIN_DEC_E2M);

function requestToWire(r) {
  if (!r || typeof r !== 'object') return r;
  const out = { ...r };
  // email → нэр (Sheet нь нэр хадгална, хүн уншихад зориулагдсан)
  if (out.requested_by) out.requested_by = emailToName(out.requested_by);
  if (out.executor)     out.executor     = emailToName(out.executor);
  if (out.executed_by)  out.executed_by  = emailToName(out.executed_by);
  if (out.received_by)  out.received_by  = emailToName(out.received_by);
  if (out.decision_by)  out.decision_by  = emailToName(out.decision_by);
  // Олон URL талбаруудыг CSV ("|") болгож хадгална
  if (Array.isArray(out.purchase_proof_urls)) out.purchase_proof_urls = out.purchase_proof_urls.join(' | ');
  if (Array.isArray(out.purchase_receipt_urls)) out.purchase_receipt_urls = out.purchase_receipt_urls.join(' | ');
  // N8n Sheet upsert нь singular талбараар map хийдэг тул plural CSV-г singular-д бас оноох
  if (out.purchase_proof_urls && !out.purchase_proof_url) out.purchase_proof_url = out.purchase_proof_urls;
  if (out.purchase_receipt_urls && !out.purchase_receipt_url) out.purchase_receipt_url = out.purchase_receipt_urls;
  // Код → монгол
  out.status   = _xlate(out.status, _FIN_STATUS_E2M);
  out.decision = _xlate(out.decision, _FIN_DEC_E2M);
  return out;
}
function requestFromWire(r) {
  if (!r || typeof r !== 'object') return r;
  const out = { ...r };
  // нэр → email (app дотор email-ээр түлхүүрлэдэг)
  if (out.requested_by) out.requested_by = nameToEmail(out.requested_by);
  if (out.executor)     out.executor     = nameToEmail(out.executor);
  if (out.executed_by)  out.executed_by  = nameToEmail(out.executed_by);
  if (out.received_by)  out.received_by  = nameToEmail(out.received_by);
  if (out.decision_by)  out.decision_by  = nameToEmail(out.decision_by);
  // CSV → массив
  if (typeof out.purchase_proof_urls === 'string') {
    out.purchase_proof_urls = out.purchase_proof_urls ? out.purchase_proof_urls.split(/\s*\|\s*/).filter(Boolean) : [];
  }
  if (typeof out.purchase_receipt_urls === 'string') {
    out.purchase_receipt_urls = out.purchase_receipt_urls ? out.purchase_receipt_urls.split(/\s*\|\s*/).filter(Boolean) : [];
  }
  // Backward compat — singular талбарт CSV эсвэл нэг URL ирэхэд array-руу хувиргах
  if ((!out.purchase_proof_urls || !out.purchase_proof_urls.length) && out.purchase_proof_url) {
    out.purchase_proof_urls = String(out.purchase_proof_url).split(/\s*\|\s*/).filter(Boolean);
  }
  if ((!out.purchase_receipt_urls || !out.purchase_receipt_urls.length) && out.purchase_receipt_url) {
    out.purchase_receipt_urls = String(out.purchase_receipt_url).split(/\s*\|\s*/).filter(Boolean);
  }
  // монгол → код
  out.status   = _xlate(out.status, _FIN_STATUS_M2E);
  out.decision = _xlate(out.decision, _FIN_DEC_M2E);
  return out;
}

function normalizeFinance(r) {
  if (!r || typeof r !== 'object') return r;
  // Sheet-ээс ирсэн бол нэр/монгол текстийг код руу буцаах
  r = requestFromWire(r);
  const stringFields = ['id','requested_by','beneficiary','purpose','justification','due_date',
    'status','decision','decision_at','decision_by','decision_reason',
    'executed_at','executed_by','executor','received_at','received_by',
    'purchase_proof_url','payment_proof_url','purchase_receipt_url',
    'category','dept_branch','frequency','bank','account_number','priority'];
  const out = { ...r };
  for (const f of stringFields) if (out[f] != null) out[f] = String(out[f]);
  if (out.amount != null && out.amount !== '') out.amount = Number(out.amount) || 0;
  return out;
}

async function createFinanceRequest({ amount, purpose, beneficiary, justification, dueDate, category, deptBranch, frequency, bank, accountNumber, priority }) {
  // Илгээгчийг нэвтэрсэн хэрэглэгчийн identity-гээр тогтооно. ХЭЗЭЭ Ч CEO рүү
  // автоматаар бүү оноо — өмнө нь и-мэйлгүй ажилтан (state.me='') хүсэлт үүсгэхэд
  // буруугаар CEO-д бичигддэг алдаа байсан.
  const owner = state.me || (state.user && state.user.name) || '';
  if (!owner) {
    showToast('Нэвтрэлт тодорхойгүй байна. Дахин нэвтэрнэ үү.', 'error');
    return;
  }
  const r = {
    id: uid(),
    requested_by: owner,
    requested_at: new Date().toISOString(),
    amount: Number(amount) || 0,
    beneficiary: beneficiary || '',
    bank: bank || '',
    account_number: accountNumber || '',
    purpose: purpose || '',
    justification: justification || '',
    due_date: dueDate || '',
    category: category || '',       // Нягтлан гараар сонгох
    // dept_branch: АЖИЛТАН өөрөө илгээвэл АВТО өөрийн салбар (форм сонголтыг үл хэрэгсэнэ).
    // Нягтлан/CEO өмнөөс оруулбал формоор сонгосон салбар (эс бөгөөс өөрийн default).
    dept_branch: (function(){
      const me = (TEAM || []).find(m => personKey(m) === owner || (m.email && m.email === owner));
      const auto = (bs) => (bs || []).includes('m-event') ? 'ИВЕНТ' : (bs || []).includes('camp') ? 'КЕМП' : 'ЗАХ';
      const isAcct = me && (/нягтлан/i.test(me.role || '') || (Number(me.level) || 0) >= 100);
      if (me && !isAcct) return auto(me.branches);   // ажилтан → өөрийн салбар (автомат)
      return deptBranch || auto(me && me.branches);  // нягтлан/CEO → сонгосон, эс бөгөөс default
    })(),
    frequency: frequency || 'Нэг удаагийн',
    priority: priority || 'med',
    status: 'open',
    decision: 'pending',
    decision_at: '',
    decision_by: '',
    decision_reason: '',
    executed_at: '',
    executed_by: '',
    executor: getFinanceExecutorEmail(), // Role-аар хайна, hardcoded ID биш
    received_at: '',
    received_by: '',
    purchase_proof_url: '',
    payment_proof_url: '',
    purchase_receipt_url: '',
    purchase_proof_urls: [],     // Stage 1 — олон бараа зураг / нэхэмжлэх
    purchase_receipt_urls: [],   // Stage 4 — олон НӨАТ / хүлээн авалтын баримт
  };
  state.financeRequests.unshift(r);
  await saveFinanceRequest(r);
  return r;
}

async function decideFinanceRequest(id, decision, reason = '') {
  const r = state.financeRequests.find(x => x.id === id);
  if (!r) return;
  // Approver: CEO эсвэл салбарын менежер (жижиг дүн дээр)
  const approverEmail = getFinanceApprover(r);
  if (!state.isCEO && state.me !== approverEmail) {
    showToast('Зөвхөн томилогдсон approver шийдвэр гаргах эрхтэй', 'error'); return;
  }
  r.decision = decision;
  r.decision_at = new Date().toISOString();
  r.decision_by = state.me;
  if (reason) r.decision_reason = reason;
  if (decision === 'approved') {
    // Approved үед executor-г динамикаар шинэчилнэ (Master Sheet-д нягтлан солигдсон бол шинэ хүн)
    r.executor = getFinanceExecutorEmail();
    showToast('Зөвшөөрсөн. Туслах нягтланд илгээгдсэн.', 'success');
  } else if (decision === 'rejected') {
    r.status = 'done';
    showToast('Татгалзсан.', 'warn');
  } else if (decision === 'deferred') {
    r.due_date = addDays(r.due_date || todayStr(), 7);
    showToast('7 хоног хойшлуулсан.', 'warn');
  }
  await saveFinanceRequest(r);
  render();
}

// Finance modal-ийн dropdown-уудыг популят + cascading логик хамруулсан helper
function fillFinanceSelects() {
  const main = document.getElementById('f-main-category');
  const sub  = document.getElementById('f-category');
  const br   = document.getElementById('f-dept-branch');
  const fr   = document.getElementById('f-frequency');
  const bk   = document.getElementById('f-bank');

  // Үндсэн ангилал (7) — нэг л удаа популятлана
  if (main && !main.children.length) {
    main.innerHTML = '<option value="" disabled selected>— Сонгох —</option>' +
      FINANCE_MAIN_CATEGORIES.map(c =>
        `<option value="${c.code}">${escapeHtml(`${c.code} ${c.name}`)}</option>`).join('');
    // Үндсэн солих үед дэдийг шинэчлэх
    main.addEventListener('change', () => {
      const code = main.value;
      const subs = FINANCE_SUB_CATEGORIES[code] || [];
      sub.innerHTML = '<option value="" disabled selected>— Сонгох —</option>' +
        subs.map(s => `<option value="${s.code}">${escapeHtml(`${s.code} ${s.name}`)}</option>`).join('');
      sub.disabled = subs.length === 0;
    });
  }

  // Салбар (4) — Эм Ивент / Кемп / Захиргаа / Хамтын
  if (br && !br.children.length) {
    br.innerHTML = '<option value="" disabled selected>— Сонгох —</option>' +
      FINANCE_BRANCHES.map(b => `<option value="${b.code}">${escapeHtml(b.name)}</option>`).join('');
  }
  if (fr && !fr.children.length) {
    fr.innerHTML = FINANCE_FREQUENCIES.map(f => `<option value="${escapeHtml(f)}">${escapeHtml(f)}</option>`).join('');
  }
  if (bk && !bk.children.length) {
    bk.innerHTML = '<option value="" disabled>— Сонгох —</option>' +
      MONGOLIAN_BANKS.map(b => `<option value="${escapeHtml(b)}">${escapeHtml(b)}</option>`).join('');
  }
}

function toggleFinanceFileInput(inputId, show) {
  const input = document.getElementById(inputId);
  if (!input) return;
  // Native <input> үргэлж нуугдсан байх (бид styled <label for> товч ашигладаг).
  // Тиймээс зөвхөн ОЙРОЛЦООХ label/preview-г нуух/харуулна.
  input.style.display = 'none';
  // Styled button label (for=<inputId>) олж нуух/харуулах
  const styledBtn = document.querySelector(`label[for="${inputId}"]`);
  if (styledBtn) styledBtn.style.display = show ? '' : 'none';
  // input-ээс өмнөх label + description div-ыг нуух/харуулах
  let prev = input.previousElementSibling;
  while (prev) {
    if (prev.tagName === 'LABEL') { prev.style.display = show ? '' : 'none'; break; }
    if (prev.tagName === 'DIV') prev.style.display = show ? '' : 'none';
    prev = prev.previousElementSibling;
  }
}

function renderProofPreview(elId, url, label) {
  const el = document.getElementById(elId);
  if (!el) return;
  if (!url) {
    el.innerHTML = `<span style="color:var(--muted);font-size:11px;">${label} баримт хавсаргаагүй</span>`;
    return;
  }
  const m = String(url).match(/[?&]id=([\w-]+)|\/d\/([\w-]+)/);
  const id = m ? (m[1] || m[2]) : null;
  const thumb = id ? `https://lh3.googleusercontent.com/d/${id}=w800` : url;
  const isImage = id || /\.(jpe?g|png|gif|webp|heic|bmp)(\?|$)/i.test(url);
  if (isImage) {
    const full = id ? `https://lh3.googleusercontent.com/d/${id}=w1600` : url;
    el.innerHTML = `<button type="button" data-lightbox="${escapeHtml(full)}" data-fallback="${escapeHtml(url)}" title="${escapeHtml(label)} баримт" style="display:inline-block;width:180px;height:180px;border-radius:8px;overflow:hidden;border:1px solid var(--border);background:var(--panel-hover);padding:0;cursor:zoom-in;"><img src="${escapeHtml(thumb)}" alt="${escapeHtml(label)}" loading="lazy" style="width:100%;height:100%;object-fit:cover;display:block;" /></button>`;
  } else {
    el.innerHTML = `<a href="${escapeHtml(url)}" target="_blank" rel="noopener" style="color:var(--primary);text-decoration:underline;"><svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="#dc2626" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-2px;margin-right:4px;"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg>${escapeHtml(label)} баримтыг харах</a>`;
  }
}

function closeFinanceModal() {
  document.getElementById('finance-modal').classList.remove('open');
  state.editingId = null;
  state._financeViewMode = null;
  // Болих/X дарвал хойшлогдсон файлуудыг хаяна — Drive-руу илгээгдэхгүй
  state._fPurchasePendingFiles = [];
  state._fReceiptPending = [];
  state._fPaymentPending = null;
}

/* ─── Санхүүгийн ШИНЭ хүсэлтийн ноорог — даалгаврынхтай адил localStorage-д түр хадгална.
   Зөвхөн шинэ хүсэлт (editingId хоосон) үед. Хальт хаагдвал/Болих дарвал алдагдахгүй,
   дараагийн "Шинэ хүсэлт" нээхэд сэргэнэ. Амжилттай илгээмэгц цэвэрлэгдэнэ.
   Зураг (File объект) болон нягтлан бөглөх ангилал/салбар орохгүй — зөвхөн бичсэн талбарууд. */
function saveFinanceDraft() {
  if (state.editingId) return; // зөвхөн шинэ
  const modal = document.getElementById('finance-modal');
  if (!modal || !modal.classList.contains('open')) return;
  const g = id => document.getElementById(id);
  const draft = {
    purpose:     g('f-purpose')?.value || '',
    amount:      g('f-amount')?.value || '',
    beneficiary: g('f-beneficiary')?.value || '',
    bank:        g('f-bank')?.value || '',
    account:     g('f-account')?.value || '',
    priority:    g('f-priority')?.value || '',
    due:         g('f-due')?.value || '',
  };
  // Утга оруулсан үед л хадгална (хоосон форм ноорог болохгүй)
  if (!(draft.purpose || draft.amount || draft.beneficiary || draft.account || draft.due)) { clearFinanceDraft(); return; }
  try { localStorage.setItem('financeDraft', JSON.stringify(draft)); } catch (e) {}
}
function clearFinanceDraft() { try { localStorage.removeItem('financeDraft'); } catch (e) {} }
function restoreFinanceDraft() {
  let draft = null;
  try { draft = JSON.parse(localStorage.getItem('financeDraft') || 'null'); } catch (e) {}
  if (!draft || !(draft.purpose || draft.amount || draft.beneficiary || draft.account || draft.due)) return;
  const g = id => document.getElementById(id);
  if (g('f-purpose'))     g('f-purpose').value     = draft.purpose || '';
  if (g('f-amount'))      g('f-amount').value      = draft.amount || '';
  if (g('f-beneficiary')) g('f-beneficiary').value = draft.beneficiary || '';
  if (draft.bank && g('f-bank'))         g('f-bank').value     = draft.bank;
  if (g('f-account'))     g('f-account').value     = draft.account || '';
  if (draft.priority && g('f-priority')) g('f-priority').value = draft.priority;
  if (g('f-due'))         g('f-due').value         = draft.due || '';
  showToast('Хадгалаагүй ноорог сэргээгдлээ', 'info', 2500);
}

// Салбарын нэрийг 3 цэвэр ангилалд хөрвүүлнэ (хуучин дата: m-event/CAMP/ХАМТ/SHARED г.м зөрүүтэй).
function finBranchLabel(b) {
  const s = String(b || '').toLowerCase();
  if (/event|ивент/.test(s)) return 'ИВЕНТ';
  if (/camp|кемп|номаад|nomaad/.test(s)) return 'КЕМП';
  if (/ххк|хөрөнг|chimun|компани/.test(s)) return 'Чимун ХХК'; // компанийн хөрөнгө (CAPEX)
  return 'ЗАХ'; // зах/хамт/shared/бусад → захиргаа
}
// Гүйлгээний утгад зориулсан салбарын нэр (банкны утганд бичих хэлбэр)
function finMemoBranch(deptBranch) {
  const b = finBranchLabel(deptBranch);
  return b === 'ИВЕНТ' ? 'Mevent' : b === 'КЕМП' ? 'Camp' : b === 'Чимун ХХК' ? 'Чимун' : 'Захиргаа';
}
// Үр дүнгийн салбар: хөрөнгийн зардал (6000) ҮРГЭЛЖ "Чимун ХХК"-д (салбарын OPEX-ээс хасна).
function finEffBranch(t) {
  if (finCatCodes(t && t.category).main === '6000') return 'Чимун ХХК';
  return finBranchLabel(t && t.dept_branch);
}
// Салбар ленз → санхүүгийн finEffBranch шүүлтийн утга (null = бүгд)
function finLensBranch(lens) {
  return lens === 'm-event' ? 'ИВЕНТ' : lens === 'camp' ? 'КЕМП' : lens === 'capital' ? 'Чимун ХХК' : null;
}
// Тайлан/жагсаалтад салбарын бүлгийн харагдах нэр (хөрөнгийг тодотгоно)
function finBranchDisplay(b) {
  return b === 'Чимун ХХК' ? '🏗 Хөрөнгө (CAPEX)' : b;
}
// Текст хуулах helper (clipboard API + fallback).
async function copyText(text, okMsg = 'Хуулагдлаа') {
  text = String(text || '');
  try { await navigator.clipboard.writeText(text); showToast(okMsg, 'success', 1500); return; }
  catch (e) { /* fallback доор */ }
  try {
    const ta = document.createElement('textarea');
    ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0';
    document.body.appendChild(ta); ta.focus(); ta.select();
    document.execCommand('copy'); ta.remove();
    showToast(okMsg, 'success', 1500);
  } catch (e2) { showToast('Хуулж чадсангүй', 'error'); }
}

function openFinanceModal(id = null) {
  const t = id ? state.financeRequests.find(x => x.id === id) : null;
  state.editingId = id || null;
  const modal = document.getElementById('finance-modal');
  const submitActions = document.getElementById('f-submit-actions');
  const decisionActions = document.getElementById('f-decision-actions');
  const executeActions = document.getElementById('f-execute-actions');
  const receiptActions = document.getElementById('f-receipt-actions');
  const decisionInfo = document.getElementById('f-decision-info');
  const title = document.getElementById('finance-modal-title');

  // View mode (хадгалагдсан хүсэлтэд анхдагч): зөвхөн харах + "Засах" товч. Edit mode
  // (Засах товч дарсны дараа): бөглөх + шийдвэрийн товчнууд. Шинэ хүсэлт шууд edit mode.
  if (!t) state._financeViewMode = false;
  else if (state._financeViewMode == null) state._financeViewMode = true;
  const inViewMode = !!(t && state._financeViewMode);

  // Default reset — БҮХ action section-ийг хааж эхэлнэ. CSS .modal-actions нь `display:flex
  // !important`-тэй тул JS-ээс хаахдаа `setProperty(..., 'important')` ашиглах ёстой
  // (өмнө style.display='none' тавихад !important override болж бүх товч харагдаж байсан bug).
  submitActions.style.setProperty('display', 'none', 'important');
  decisionActions.style.setProperty('display', 'none', 'important');
  executeActions.style.setProperty('display', 'none', 'important');
  receiptActions.style.setProperty('display', 'none', 'important');
  decisionInfo.style.display = 'none';
  const fDeleteBtn = document.getElementById('f-delete');
  if (fDeleteBtn) fDeleteBtn.style.display = 'none';

  // Dropdown options-уудыг шинэчилэх (modal нээх бүрд)
  fillFinanceSelects();

  if (!t) {
    // NEW request — submit mode
    title.innerHTML = ICONS.wallet + ' Санхүүгийн хүсэлт';
    document.getElementById('f-amount').value = '';
    document.getElementById('f-beneficiary').value = '';
    document.getElementById('f-bank').value = '';
    document.getElementById('f-account').value = '';
    document.getElementById('f-purpose').value = '';
    document.getElementById('f-justification').value = '';
    document.getElementById('f-due').value = '';
    document.getElementById('f-main-category').value = '';
    document.getElementById('f-category').innerHTML = '<option value="">— Эхлээд үндсэн ангилал сонго —</option>';
    document.getElementById('f-category').disabled = true;
    // Салбарын default — state.branch-аас оноох (m-event → ИВЕНТ, camp → КЕМП, бусад → ХАМТ)
    const defaultBranch = state.branch === 'm-event' ? 'ИВЕНТ' : (state.branch === 'camp' ? 'КЕМП' : 'ХАМТ');
    document.getElementById('f-dept-branch').value = defaultBranch;
    document.getElementById('f-frequency').value = 'Нэг удаагийн';
    const fpNew = document.getElementById('f-priority'); if (fpNew) fpNew.value = 'med';
    document.getElementById('f-purchase-file').value = '';
    document.getElementById('f-payment-file').value = '';
    document.getElementById('f-receipt-file').value = '';
    document.getElementById('f-purchase-preview').innerHTML = '';
    document.getElementById('f-payment-preview').innerHTML = '';
    document.getElementById('f-receipt-preview').innerHTML = '';
    // Шинэ хүсэлт үед payment + receipt picker-ийг нуух
    toggleFinanceFileInput('f-payment-file', false);
    toggleFinanceFileInput('f-receipt-file', false);
    [...modal.querySelectorAll('input, textarea')].forEach(el => el.removeAttribute('readonly'));
    // NEW request — submitActions visible, f-save = "Илгээх". Multi-file picker анхдагч хоосон.
    state._fPurchaseUrls = [];
    state._fReceiptUrls = [];
    state._fPurchasePendingFiles = [];  // Илгээх дармагц upload хийгдэнэ
    // New request — input харуулна, display нуунa
    const amountDispNew = document.getElementById('f-amount-display');
    const amountInputNew = document.getElementById('f-amount');
    if (amountDispNew) amountDispNew.style.display = 'none';
    if (amountInputNew) amountInputNew.style.display = '';
    renderFinanceFileList('f-purchase-list', [], true);
    renderFinanceFileList('f-receipt-list', [], true);
    toggleFinanceFileInput('f-purchase-file', true);
    document.getElementById('f-purchase-label').style.display = '';
    submitActions.style.setProperty('display', '', 'important');
    // ШИНЭ хүсэлт үед — CEO ч бусад ажилтантай адил энгийн форм.
    // Зөвхөн нягтлан өөрөө хүсэлт гаргаж байвал ангилал/Stage 3-4 харагдана.
    const isAccountantNew = (state.me === getFinanceExecutorEmail());
    const acctSection = document.getElementById('f-accountant-only');
    if (acctSection) acctSection.style.display = isAccountantNew ? '' : 'none';
    const acctStages = document.getElementById('f-accountant-stages');
    if (acctStages) acctStages.style.display = isAccountantNew ? '' : 'none';
    const fSaveNew = document.getElementById('f-save');
    fSaveNew.style.display = '';
    fSaveNew.textContent = 'Илгээх';
    // Хадгалаагүй ноорог байвал сэргээнэ (хоосон reset-ийн дараа)
    restoreFinanceDraft();
  } else {
    // VIEW existing — populate read-only
    title.innerHTML = ICONS.wallet + ' Хүсэлт #' + escapeHtml(t.id.slice(-5));
    document.getElementById('f-amount').value = t.amount || '';
    // View mode-д үнийг "113,000₮" хэлбэрээр тод харуулна (raw input биш)
    const amountDisp = document.getElementById('f-amount-display');
    const amountInput = document.getElementById('f-amount');
    if (amountDisp && amountInput) {
      const n = Number(t.amount) || 0;
      amountDisp.textContent = n > 0 ? `${n.toLocaleString('mn-MN')}₮` : '—';
      amountDisp.style.display = '';
      amountInput.style.display = 'none';
    }
    document.getElementById('f-beneficiary').value = t.beneficiary || '';
    document.getElementById('f-bank').value = t.bank || '';
    document.getElementById('f-account').value = t.account_number || '';
    document.getElementById('f-purpose').value = t.purpose || '';
    // Гүйлгээ хийхэд хуулах товчнууд (нягтлан банкны апп руу) — данс + "дугаар зорилго" утга
    (function setupFinCopy() {
      const block = document.getElementById('f-copy-block');
      const preview = document.getElementById('f-memo-preview');
      // Гүйлгээний утга = "Зарлага: {салбар} {дэд ангилал} · {зорилго}"
      const sub = finSubName(t.category);
      const catPart = (sub && sub !== 'Ангилалгүй') ? ' ' + sub : '';
      const purpPart = t.purpose ? ' · ' + t.purpose : (t.beneficiary ? ' · ' + t.beneficiary : '');
      const memoBr = finEffBranch(t) === 'Чимун ХХК' ? 'Чимун' : finMemoBranch(t.dept_branch);
      const memo = `Зарлага: ${memoBr}${catPart}${purpPart}`.trim();
      const acct = String(t.account_number || '').trim();
      if (block) block.style.display = (acct || t.purpose) ? 'flex' : 'none';
      if (preview) preview.textContent = memo || '';
      const ba = document.getElementById('f-copy-account');
      if (ba) ba.onclick = () => acct ? copyText(acct, 'Данс хуулагдлаа') : showToast('Данс хоосон', 'warn', 1500);
      const bm = document.getElementById('f-copy-memo');
      if (bm) bm.onclick = () => copyText(memo, 'Гүйлгээний утга хуулагдлаа');
    })();
    document.getElementById('f-justification').value = t.justification || '';
    document.getElementById('f-due').value = t.due_date || '';
    // category талбарт "1400 Урлагийн үйлчилгээ" эсвэл хуучин "1400" эсвэл хуучин чөлөөт текст байж болно
    // Дэд код нь '1100' хэлбэртэй 4 оронтой тоо
    const catRaw = String(t.category || '');
    const subMatch = catRaw.match(/^(\d{4})/);
    const subCode = subMatch ? subMatch[1] : '';
    const mainCode = subCode ? subCode[0] + '000' : '';
    document.getElementById('f-main-category').value = mainCode;
    // Дэд dropdown-ийг үндсэнд тааруулж популятлах
    if (mainCode && FINANCE_SUB_CATEGORIES[mainCode]) {
      const subs = FINANCE_SUB_CATEGORIES[mainCode];
      document.getElementById('f-category').innerHTML =
        '<option value="">— Сонгох —</option>' +
        subs.map(s => `<option value="${s.code}">${escapeHtml(`${s.code} ${s.name}`)}</option>`).join('');
      document.getElementById('f-category').disabled = false;
      document.getElementById('f-category').value = subCode;
    }
    document.getElementById('f-dept-branch').value = t.dept_branch || '';
    // Ангилал/салбар + Stage 3/4 — view/edit үед нягтлан/CEO харна. Энгийн ажилтанд нуугдана.
    const isAccountantOrCEOview = state.isCEO || (state.me === getFinanceExecutorEmail());
    // Санхүү салбар-засагч (CEO/нягтлан биш) — ЗӨВХӨН салбарыг засна, ангилал read-only.
    const branchOnly = !isAccountantOrCEOview && isFinanceBranchEditor();
    if (isAccountantOrCEOview || branchOnly) {
      const mainSel = document.getElementById('f-main-category');
      const subSel = document.getElementById('f-category');
      const brSel = document.getElementById('f-dept-branch');
      // Салбар — хоёуланд засагдана (АВТО ХАДГАЛНА).
      if (brSel) {
        brSel.disabled = false;
        brSel.onchange = () => {
          t.dept_branch = brSel.value; saveFinanceRequest(t);
          showToast('Салбар хадгалагдлаа', 'success', 1400);
        };
      }
      if (isAccountantOrCEOview) {
        // CEO/нягтлан — ангилал бас засна.
        if (mainSel) mainSel.disabled = false;
        if (subSel) subSel.onchange = () => {
          if (!subSel.value) return;
          t.category = subSel.value; saveFinanceRequest(t);
          showToast('Ангилал хадгалагдлаа', 'success', 1400);
        };
      } else {
        // branchOnly — ангилал зөвхөн харах (засагдахгүй).
        if (mainSel) { mainSel.disabled = true; mainSel.onchange = null; }
        if (subSel) { subSel.disabled = true; subSel.onchange = null; }
      }
    }
    const acctSectionView = document.getElementById('f-accountant-only');
    if (acctSectionView) acctSectionView.style.display = (isAccountantOrCEOview || branchOnly) ? '' : 'none';
    // Хаах шатанд (зөвшөөрсөн + гүйлгээ хийгдсэн + хаагдаагүй) хүсэлт гаргагч ч баримтын хэсгийг
    // хараад баримт хавсаргаж хаах боломжтой байх ёстой.
    const atCloseStage = (t.decision === 'approved' && t.executed_at && t.status !== 'done');
    const showAcctStages = isAccountantOrCEOview || (atCloseStage && state.me === t.requested_by);
    const acctStagesView = document.getElementById('f-accountant-stages');
    if (acctStagesView) acctStagesView.style.display = showAcctStages ? '' : 'none';
    document.getElementById('f-frequency').value = t.frequency || 'Нэг удаагийн';
    const fpView = document.getElementById('f-priority'); if (fpView) fpView.value = t.priority || 'med';
    // Multi-file жагсаалт — Stage 1 болон Stage 4-ийн хувьд массивыг харуулна.
    const purchaseUrls = Array.isArray(t.purchase_proof_urls) ? t.purchase_proof_urls
                       : (t.purchase_proof_url ? [t.purchase_proof_url] : []);
    const receiptUrls  = Array.isArray(t.purchase_receipt_urls) ? t.purchase_receipt_urls
                       : (t.purchase_receipt_url ? [t.purchase_receipt_url] : []);
    state._fPurchaseUrls = [...purchaseUrls];
    state._fReceiptUrls = [...receiptUrls];
    const isRequester = (state.me === t.requested_by);
    const isExecutor = (state.me === getFinanceExecutorEmail());
    const dec0 = t.decision || 'pending';
    // Stage 1 picker — илгээгч pending үед нэмэх боломжтой; бусдад read-only thumbs.
    // Хавсралтгүй ч label-ыг үргэлж харуулна — CEO юу дутууг шууд харах
    const canEditPurchase = isRequester && dec0 === 'pending';
    renderFinanceFileList('f-purchase-list', purchaseUrls, canEditPurchase);
    toggleFinanceFileInput('f-purchase-file', canEditPurchase);
    document.getElementById('f-purchase-label').style.display = '';
    // Stage 4 picker — executor БА хүсэлт гаргагч баримт хавсаргаж болно (гаргагч баримтаа
    // оруулж, нягтлан хянаж хаана). Бусдад read-only thumbs.
    const canEditReceipt = (isExecutor || state.me === t.requested_by) && t.executed_at && t.status !== 'done';
    renderFinanceFileList('f-receipt-list', receiptUrls, canEditReceipt);
    toggleFinanceFileInput('f-receipt-file', canEditReceipt);
    // Stage 4 label — executed эсвэл done төлөвт л харагдана (өмнө нь утгагүй)
    const showReceiptSection = (t.executed_at || t.status === 'done' || receiptUrls.length || canEditReceipt);
    document.getElementById('f-receipt-label').style.display = showReceiptSection ? '' : 'none';
    // Stage 3 (transfer) preview
    renderProofPreview('f-payment-preview', t.payment_proof_url, 'Төлбөрийн');
    document.getElementById('f-purchase-file').value = '';
    document.getElementById('f-payment-file').value = '';
    document.getElementById('f-receipt-file').value = '';
    [...modal.querySelectorAll('input, textarea')].forEach(el => el.setAttribute('readonly','readonly'));
    // File picker нь readonly биш — upload боломжтой
    document.getElementById('f-purchase-file').removeAttribute('readonly');
    document.getElementById('f-payment-file').removeAttribute('readonly');
    // CEO pending хүсэлт дээр БҮХ талбарыг засах боломжтой болгох
    // (Дүн + банк + данс + бусад зүйлсийг бөглөж дуусгаж болно — цэвэрлэгч мэдэхгүй талбаруудыг)
    const isPendingForCEO = ((t.decision || 'pending') === 'pending' && state.isCEO);
    if (isPendingForCEO) {
      ['f-amount','f-beneficiary','f-account','f-purpose','f-justification','f-due','f-decision-reason']
        .forEach(id => document.getElementById(id)?.removeAttribute('readonly'));
      ['f-bank','f-main-category','f-category','f-frequency','f-dept-branch']
        .forEach(id => document.getElementById(id)?.removeAttribute('disabled'));
      document.getElementById('f-decision-reason').value = t.decision_reason || '';
      document.getElementById('f-decision-reason').style.display = '';
      document.getElementById('f-decision-reason-label').style.display = '';
    } else {
      // Read-only үед дүгнэлтийг харах
      if (t.decision_reason) {
        document.getElementById('f-decision-reason').value = t.decision_reason;
        document.getElementById('f-decision-reason').style.display = '';
        document.getElementById('f-decision-reason-label').style.display = '';
      } else {
        document.getElementById('f-decision-reason').style.display = 'none';
        document.getElementById('f-decision-reason-label').style.display = 'none';
      }
    }
    // Payment file picker — Stage 3: approved + НЭ гүйцэтгэгдээгүй + туслах нягтлан.
    // executed_at тогтоогдсон бол Stage 3 дууссан, товчийг нуунa (давхар харагдвал
    // хэрэглэгч Stage 4-ийн оронд буруу газар файл хавсаргадаг).
    const showPayment = (t.decision === 'approved' && !t.executed_at && state.me === getFinanceExecutorEmail());
    toggleFinanceFileInput('f-payment-file', showPayment);
    // Stage 4 receipt picker — gүйцэтгэгдсэн + хаагдаагүй + туслах нягтлан (canEditReceipt
    // дээр аль хэдийн зөв тогтоосон). showReceipt-ийг устгана — давхардсан логик.
    document.getElementById('f-save').style.display = 'none';

    // Stage-specific banner — одоо хаана байгаа, дараагийн алхам хэн дээр байгааг тодорхойлно
    const dec = t.decision || 'pending';
    const requester = memberName(t.requested_by);
    const accountantName = memberName(getFinanceExecutorEmail()) || 'нягтлан';
    let stage, bg, col, icon, headline, nextLine = '';
    if (dec === 'pending') {
      stage = 'Stage 2'; bg = 'var(--warn-soft)'; col = 'var(--warn)'; icon = '🕐';
      const approverNm = memberName(getFinanceApprover(t)) || 'CEO';
      headline = `${approverNm} шийдвэр гаргахыг хүлээж байна`;
    } else if (dec === 'rejected') {
      stage = 'Татгалзсан'; bg = 'var(--danger-soft)'; col = 'var(--danger)'; icon = '✗';
      headline = 'CEO энэ хүсэлтийг татгалзсан';
      if (t.decision_reason) nextLine = `Шалтгаан: ${escapeHtml(t.decision_reason)}`;
    } else if (dec === 'deferred') {
      stage = 'Хойшлогдсон'; bg = 'var(--primary-soft)'; col = 'var(--primary)'; icon = '🕐';
      headline = 'CEO хойшлуулсан';
    } else if (dec === 'approved' && !t.executed_at) {
      stage = 'Stage 3'; bg = 'var(--ok-soft)'; col = 'var(--ok)'; icon = '✓';
      headline = 'CEO зөвшөөрсөн · нягтлан гүйлгээ хийнэ';
      nextLine = `Яаралтай бол ${escapeHtml(accountantName)}-тай шууд холбогдоно уу.`;
    } else if (dec === 'approved' && t.executed_at && t.status !== 'done') {
      stage = 'Stage 4'; bg = 'var(--primary-soft)'; col = 'var(--primary)'; icon = '💵';
      headline = 'Гүйлгээ хийгдсэн · бараа хүлээн авч хаахыг хүлээж байна';
      nextLine = `${escapeHtml(accountantName)} НӨАТ/баримтаар хаана.`;
    } else if (t.status === 'done') {
      stage = 'Дууссан'; bg = 'var(--ok-soft)'; col = 'var(--ok)'; icon = '✓';
      if (t.close_type === 'дутуу') {
        bg = 'var(--warn-soft)'; col = 'var(--warn)'; icon = '⚠';
        headline = 'Хаагдсан · дутуу (тайлбартай)';
        if (t.close_note) nextLine = `Тайлбар: ${escapeHtml(t.close_note)}`;
      } else if (t.close_type === 'баримтгүй') {
        icon = '📝'; headline = 'Хаагдсан · баримтгүй (тайлбараар)';
        if (t.close_note) nextLine = `Тайлбар: ${escapeHtml(t.close_note)}`;
      } else if (t.close_type === 'баримттай') {
        headline = 'Хаагдсан · баримт таарсан';
      } else {
        headline = 'Бүх шат дууссан · хүсэлт хаагдсан';
      }
    } else {
      stage = ''; bg = 'var(--panel-hover)'; col = 'var(--text)'; icon = '•'; headline = '—';
    }
    let info = `<div style="background:${bg};color:${col};padding:10px 12px;border-radius:8px;font-weight:600;font-size:13px;">${icon} ${escapeHtml(headline)}`;
    if (nextLine) info += `<div style="font-weight:400;font-size:12px;margin-top:4px;opacity:0.9;">${nextLine}</div>`;
    info += `</div>`;
    info += `<div style="margin-top:6px;color:var(--muted);font-size:11px;">Илгээгч: <strong>${escapeHtml(requester)}</strong>`;
    if (t.decision_by) info += ` · CEO: <strong>${escapeHtml(memberName(t.decision_by))}</strong>`;
    if (t.executed_by) info += ` · Гүйлгэсэн: <strong>${escapeHtml(memberName(t.executed_by))}</strong>`;
    info += `</div>`;
    decisionInfo.innerHTML = info;
    decisionInfo.style.display = 'block';

    // Хэн юу хийж болох вэ:
    //  - Field-үүдийг ЗАСАХ: зөвхөн status=pending + (хүсэлт гаргагч өөрөө эсвэл CEO).
    //    CEO зөвшөөрсний дараа дүн/банк/данс бүхэлдээ түгжигдэнэ (аудит).
    //  - Стадиа шилжүүлэх action товч (decision/execute/receipt): тухайн стадийн ажилтанд.
    //  - Хүсэлт гаргагч pending үед өөрийн хүсэлтийг л өөрчилнө, бусдын товч нь огт харагдахгүй.
    const fSave = document.getElementById('f-save');
    const canEditFields = (dec === 'pending') && (state.me === t.requested_by || state.isCEO);
    const isReqOrCEO = (state.me === t.requested_by) || state.isCEO;
    // Гүйлгээ хийгдсэн гэж тэмдэглэх нь зөвхөн туслах нягтлангийн үүрэг. CEO тэр үүрэгт оролцохгүй —
    // ажил үүргийн зааг ялгана. isExecutor дээр populate секцэд тодорхойлогдсон.
    // Хүсэлт гаргагч өөрөө бол шийдвэрийн/гүйцэтгэлийн товчнууд харагдахгүй (isRequester
    // populate секцэд тодорхойлогдсон).
    if (inViewMode) {
      // Засах товч — зөвхөн pending + edit эрхтэй үед
      if (canEditFields) {
        submitActions.style.setProperty('display', '', 'important');
        fSave.style.display = '';
        fSave.textContent = '✎ Засах';
      }
      // Стадийн action товчнууд:
      //  - CEO pending хүсэлт → Decision (хүсэлт гаргагч өөрөө шийдэх боломжгүй)
      //  - Туслах нягтлан approved + !executed_at → Шилжүүлсэн (өөрийн хүсэлт ч гүйлгэх ёстой)
      //  - Туслах нягтлан executed_at + !done → Бараа хүлээн авч хаах
      const approverEmail = getFinanceApprover(t);
      const isApprover = (state.me === approverEmail);
      // Зөвхөн томилогдсон approver товч хардаг. Өөрийн хүсэлтийг өөрөө батлахыг
      // хориглоно — цорын ганц онцгой тохиолдол нь CEO (дээд эрх, дээш ахиулах хүн алга).
      if (dec === 'pending' && isApprover && (!isRequester || state.isCEO)) {
        decisionActions.style.setProperty('display', 'flex', 'important');
      } else if (dec === 'approved' && !t.executed_at && isExecutor) {
        executeActions.style.setProperty('display', 'flex', 'important');
      } else if (dec === 'approved' && t.executed_at && t.status !== 'done' && (isExecutor || state.me === t.requested_by)) {
        receiptActions.style.setProperty('display', 'flex', 'important');
      }
      // Устгах — зөвхөн өөрийн илгээсэн хүсэлт, гүйлгээ хийгдэхээс ӨМНӨ (CEO ч устгаж болно)
      const fDelete = document.getElementById('f-delete');
      if (fDelete) {
        const canDelete = !t.executed_at && t.status !== 'done'
          && (state.me === t.requested_by || state.isCEO);
        if (canDelete) {
          submitActions.style.setProperty('display', '', 'important');
          fDelete.style.display = '';
        }
      }
    } else if (canEditFields) {
      // EDIT mode — field-үүдийг unlock + Хадгалах товч
      ['f-amount','f-beneficiary','f-account','f-purpose','f-justification','f-due']
        .forEach(id => document.getElementById(id)?.removeAttribute('readonly'));
      // Үнийн display-г нуугаад input буцааж харуулна
      const amtDispE = document.getElementById('f-amount-display');
      const amtInputE = document.getElementById('f-amount');
      if (amtDispE) amtDispE.style.display = 'none';
      if (amtInputE) amtInputE.style.display = '';
      ['f-bank','f-main-category','f-category','f-frequency','f-dept-branch']
        .forEach(id => document.getElementById(id)?.removeAttribute('disabled'));
      submitActions.style.setProperty('display', '', 'important');
      fSave.style.display = '';
      fSave.textContent = '💾 Хадгалах';
      // CEO өөрийн биш хүсэлт засаж байгаа бол шийдвэрийн товч хэвээр (нэг дор засаад зөвшөөрөх)
      if (state.isCEO && state.me !== t.requested_by) decisionActions.style.setProperty('display', 'flex', 'important');
    }
  }
  modal.classList.add('open');
}

/* Multi-file picker — finance modal-ийн Stage 1/4-д ашиглана. urls массивыг харуулж,
   X товчоор хасах боломжтой. state дотор тухайн request-ийн temp массивыг хадгална. */
function renderFinanceFileList(containerId, urls, removable) {
  const el = document.getElementById(containerId);
  if (!el) return;
  if (!urls || !urls.length) { el.innerHTML = '<div style="color:var(--muted);font-size:11px;">Хавсралт алга</div>'; return; }
  const icon = '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="#dc2626" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-2px;margin-right:4px;"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg>';
  // Google Drive view link → шууд thumbnail (lh3 нь CORS зөвшөөрөгдсөн)
  const toThumb = (u) => {
    const m = String(u||'').match(/[?&]id=([\w-]+)|\/d\/([\w-]+)/);
    const id = m ? (m[1] || m[2]) : null;
    if (id) return `https://lh3.googleusercontent.com/d/${id}=w800`;
    return u;
  };
  const isImage = (u) => /\.(jpe?g|png|gif|webp|heic|bmp)(\?|$)/i.test(u) || /drive\.google\.com/.test(u);
  el.innerHTML = `<div style="display:flex;flex-wrap:wrap;gap:10px;">` + urls.map((u, i) => {
    const safe = escapeHtml(u);
    if (isImage(u)) {
      const fullThumb = `https://lh3.googleusercontent.com/d/${(String(u).match(/[?&]id=([\w-]+)|\/d\/([\w-]+)/)||[])[1]||(String(u).match(/[?&]id=([\w-]+)|\/d\/([\w-]+)/)||[])[2]||''}=w1600`;
      return `
        <div style="position:relative;width:180px;">
          <button type="button" data-lightbox="${escapeHtml(fullThumb)}" data-fallback="${safe}" style="display:block;width:180px;height:180px;border-radius:8px;overflow:hidden;border:1px solid var(--border);background:var(--panel-hover);padding:0;cursor:zoom-in;">
            <img src="${escapeHtml(toThumb(u))}" alt="Хавсралт ${i+1}" loading="lazy" style="width:100%;height:100%;object-fit:cover;display:block;" />
          </button>
          ${removable ? `<button type="button" data-rm-idx="${i}" data-rm-container="${containerId}" style="position:absolute;top:-6px;right:-6px;width:22px;height:22px;border-radius:50%;background:var(--danger);color:#fff;border:2px solid var(--panel);cursor:pointer;font-size:14px;line-height:1;padding:0;display:flex;align-items:center;justify-content:center;">×</button>` : ''}
        </div>
      `;
    }
    return `
      <div style="display:flex;align-items:center;gap:8px;padding:6px 8px;background:var(--panel-hover);border-radius:6px;font-size:13px;width:100%;">
        <a href="${safe}" target="_blank" rel="noopener" style="flex:1;color:var(--primary);text-decoration:underline;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${icon}Файл ${i+1}</a>
        ${removable ? `<button type="button" data-rm-idx="${i}" data-rm-container="${containerId}" style="background:none;border:none;color:var(--danger);cursor:pointer;font-size:18px;line-height:1;">×</button>` : ''}
      </div>
    `;
  }).join('') + `</div>`;
}

/* ─── Нийтлэг зургийн thumbnail + lightbox helper ───
   Google Drive view link → lh3 thumbnail (CORS зөвшөөрөгдсөн). Дарвал аппын дотор
   томроод харагдана (#lightbox handler, app.js доор). Даалгаврын зураг + биелэлтийн
   зураг + бусад газар нийтлэг ашиглана. Санхүүгийн хүсэлттэй ижил зан төлөв. */
function driveThumbUrl(u, size) {
  const m = String(u || '').match(/[?&]id=([\w-]+)|\/d\/([\w-]+)/);
  const id = m ? (m[1] || m[2]) : null;
  return id ? `https://lh3.googleusercontent.com/d/${id}=w${size || 800}` : u;
}
function imageThumbsHtml(urls, opts = {}) {
  const size = opts.size || 100;
  const label = opts.label || 'Зураг';
  if (!urls || !urls.length) return '';
  return urls.map((u, i) => {
    const safe = escapeHtml(u);
    return `<button type="button" data-lightbox="${escapeHtml(driveThumbUrl(u, 1600))}" data-fallback="${safe}" title="${escapeHtml(label)} ${i + 1}" style="width:${size}px;height:${size}px;border-radius:6px;overflow:hidden;border:1px solid var(--border);background:var(--panel-hover);padding:0;cursor:zoom-in;display:block;"><img src="${escapeHtml(driveThumbUrl(u, 800))}" alt="${escapeHtml(label)} ${i + 1}" loading="lazy" style="width:100%;height:100%;object-fit:cover;display:block;" /></button>`;
  }).join('');
}

/* Stage 4 — Туслах нягтлан хүлээн авч хаах: олон файл шаардана, дараа нь received_at/status=done. */
// mode: 'match' (баримт таарсан·хаах) | 'short' (дутуу·тайлбараар) | 'noreceipt' (баримтгүй·тайлбараар)
// Дүн оруулах механизм байхгүй — дутуу/баримтгүй хоёул зөвхөн тайлбар шаардаж хаана.
async function closeFinanceRequest(id, mode = 'match') {
  const r = state.financeRequests.find(x => x.id === id);
  if (!r) return;
  const executorId = r.executor || getFinanceExecutorEmail();
  // Хаах эрх: туслах нягтлан, хүсэлт гаргагч (бараагаа хүлээн авсан хүн), эсвэл CEO.
  if (state.me !== executorId && state.me !== r.requested_by && !state.isCEO) {
    showToast('Зөвхөн туслах нягтлан эсвэл хүсэлт гаргагч хаах эрхтэй', 'error'); return;
  }
  if (!r.executed_at) {
    showToast('Эхлээд шилжүүлгийн баримт хавсаргана', 'warn'); return;
  }
  // Шинэ сонгосон баримтыг upload-аад одоогийн жагсаалтад нэмнэ
  const fileInput = document.getElementById('f-receipt-file');
  const inputFiles = fileInput && fileInput.files ? [...fileInput.files] : [];
  const pendingFiles = Array.isArray(state._fReceiptPending) ? state._fReceiptPending : [];
  const newFiles = inputFiles.length >= pendingFiles.length ? inputFiles : pendingFiles;
  const existing = Array.isArray(r.purchase_receipt_urls) ? [...r.purchase_receipt_urls] : [];
  if (newFiles.length) {
    showToast(`${newFiles.length} баримт upload хийж байна...`, '', 3000);
    for (const f of newFiles) {
      const url = await uploadReceipt(f, r.id, 'receipt');
      if (url) existing.push(url);
    }
    if (fileInput) fileInput.value = '';
    state._fReceiptPending = [];
  }
  if (mode === 'noreceipt') {
    const note = await showPrompt('Баримтгүй хаах — тодруулга/шалтгаан заавал бичнэ үү:', { placeholder: 'Жишээ: жижиг зардал, баримт аваагүй...', okText: 'Хаах' });
    if (!note || !note.trim()) { showToast('Тодруулга заавал', 'warn'); return; }
    r.close_type = 'баримтгүй';
    r.close_note = note.trim();
  } else if (mode === 'short') {
    const note = await showPrompt('Дутуу хаах — юу дутсан / шалтгааныг заавал бичнэ үү:', { placeholder: 'Жишээ: 1 ширхэг дутуу ирсэн...', okText: 'Хаах' });
    if (!note || !note.trim()) { showToast('Тайлбар заавал', 'warn'); return; }
    r.close_type = 'дутуу';
    r.close_note = note.trim();
  } else {
    // match — баримт хавсаргасан байх ёстой
    if (!existing.length) { showToast('Хүлээн авалтын баримт хавсаргана уу', 'warn', 4000); return; }
    r.close_type = 'баримттай';
    r.close_note = '';
  }
  r.receipt_amount = 0;
  r.variance = 0;
  r.purchase_receipt_urls = existing;
  r.received_at = new Date().toISOString();
  r.received_by = state.me;
  r.status = 'done';
  await saveFinanceRequest(r);
  const msg = r.close_type === 'дутуу' ? 'Дутуу · тайлбараар хаагдлаа.'
            : r.close_type === 'баримтгүй' ? 'Баримтгүй · тайлбараар хаагдлаа.'
            : 'Баримт таарсан · хаагдлаа.';
  showToast(msg, 'success', 3500);
  closeFinanceModal();
  render();
}

// Өөрийн илгээсэн санхүүгийн хүсэлтийг гүйлгээ хийгдэхээс ӨМНӨ устгана (soft delete).
async function deleteFinanceRequest(id) {
  const r = state.financeRequests.find(x => x.id === id);
  if (!r) return;
  if (state.me !== r.requested_by && !state.isCEO) {
    showToast('Зөвхөн өөрийн илгээсэн хүсэлтийг устгана', 'error'); return;
  }
  if (r.executed_at || r.status === 'done') {
    showToast('Гүйлгээ хийгдсэн хүсэлтийг устгах боломжгүй', 'warn', 4000); return;
  }
  const ok = await showConfirm(
    `${r.beneficiary || 'Хүсэлт'} — ${Number(r.amount || 0).toLocaleString('mn-MN')}₮\nЭнэ хүсэлтийг устгах уу?`,
    { title: 'Хүсэлт устгах', okText: 'Устгах', danger: true });
  if (!ok) return;
  r.status = 'deleted';
  await saveFinanceRequest(r, true);
  state.financeRequests = state.financeRequests.filter(x => x.id !== id);
  try { localStorage.setItem('financeRequests', JSON.stringify(state.financeRequests)); } catch(e) {}
  showToast('Хүсэлт устгагдлаа', 'success');
  closeFinanceModal();
  render();
}

async function executeFinanceRequest(id) {
  const r = state.financeRequests.find(x => x.id === id);
  if (!r) return;
  if (r.decision !== 'approved') { showToast('Зөвхөн зөвшөөрсөн хүсэлтийг гүйцэтгэх боломжтой', 'warn'); return; }
  const executorId = r.executor || getFinanceExecutorEmail();
  if (state.me !== executorId && !state.isCEO) {
    showToast('Зөвхөн Туслах нягтлан гүйлгээ хийх эрхтэй', 'error'); return;
  }
  // Ангилал + салбар нягтлан гараар сонгох ёстой — гүйлгээ хийхийн өмнө шалгана
  const catSel = document.getElementById('f-category');
  const branchSel = document.getElementById('f-dept-branch');
  const catValue = catSel?.value || '';
  const branchValue = branchSel?.value || '';
  if (!catValue) {
    showToast('⚠ Дэд ангилал сонгоно уу — гүйлгээ хийхийн өмнө', 'warn', 4000);
    catSel?.focus();
    return;
  }
  if (!branchValue) {
    showToast('⚠ Аль салбарт хамаарахыг сонгоно уу', 'warn', 4000);
    branchSel?.focus();
    return;
  }
  // Шинэ утга байвал хадгална (нягтлан сонгосон утга)
  if (catValue !== r.category) r.category = catValue;
  if (branchValue !== r.dept_branch) r.dept_branch = branchValue;

  // Шилжүүлгийн баримт заавал хавсаргасан байх ёстой — input.files эсвэл pending state эсвэл өмнө upload-сан URL
  const paymentInput = document.getElementById('f-payment-file');
  const inputFile = paymentInput && paymentInput.files && paymentInput.files[0];
  const pendingFile = state._fPaymentPending;
  const newFile = inputFile || pendingFile;
  if (!r.payment_proof_url && !newFile) {
    showToast('Шилжүүлгийн баримт заавал хавсаргана уу', 'warn', 4000);
    return;
  }
  // Шинээр сонгосон бол upload хийгээд URL-ыг хадгална
  if (newFile) {
    showToast('Баримт upload хийж байна...', '', 2000);
    const url = await uploadReceipt(newFile, r.id, 'payment');
    if (!url) { showToast('Баримт upload амжилтгүй', 'error'); return; }
    r.payment_proof_url = url;
    state._fPaymentPending = null;
    if (paymentInput) paymentInput.value = '';
  }
  // Шилжүүлэг хийгдсэн — status=done БҮҮ тогтоо. Status open хэвээр үлдэж, дараа нь
  // closeFinanceRequest (Бараа хүлээн авч хаах) дуудагдмагц л status=done болно.
  r.executed_at = new Date().toISOString();
  r.executed_by = state.me;
  await saveFinanceRequest(r);
  showToast('Шилжүүлэг хийгдсэн гэж тэмдэглэгдлээ. Бараа ирмэгц хүлээн авч хаа.', 'success', 4000);
  closeFinanceModal();
  render();
}

// Given a sub-task, find the previous stage in the same parent.
// Returns null if t is not a sub-task or stage <= 1.
function prevStageOf(t) {
  if (!t || t.kind !== 'act_stage' || !t.parent_id || !t.stage || Number(t.stage) <= 1) return null;
  const target = Number(t.stage) - 1;
  return state.tasks.find(x => x.parent_id === t.parent_id && Number(x.stage) === target) || null;
}

// Check if a sub-task can be completed (i.e. its previous stage is done).
function canCompleteSubtask(t) {
  const prev = prevStageOf(t);
  if (prev && prev.status !== 'done') return { ok: false, prev };
  return { ok: true };
}

// Aggregate progress for an act_parent — returns { done, total } across its sub-tasks.
function actProgress(parentId) {
  const subs = state.tasks.filter(t => t.parent_id === parentId);
  return { done: subs.filter(s => s.status === 'done').length, total: subs.length };
}

/* -------------------- HELPERS -------------------- */
// Ажилтны давтагдашгүй ТҮЛХҮҮР — утасны дугаар (бүгдэд бий, давхцахгүй).
// Утасгүй бол email, эс бөгөөс нэр рүү уналт хийнэ.
function personKey(m) {
  if (!m) return '';
  return String(m.phone || '').replace(/\D/g, '') || String(m.email || '').toLowerCase() || m.name || '';
}
// Ажилтныг утас / email / нэрийн аль нэгээр олох (resilient).
function findMember(key) {
  if (!key) return null;
  const k = String(key).trim().toLowerCase();
  const d = String(key).replace(/\D/g, '');
  return TEAM.find(x =>
    (x.email && String(x.email).trim().toLowerCase() === k) ||
    (d && String(x.phone || '').replace(/\D/g, '') === d) ||
    (String(x.name || '').trim().toLowerCase() === k)  // нэрийг үсгийн том/жижиг ялгахгүй тааруулна
  ) || null;
}
function memberName(key) {
  if (!key) return '(сонгох)';
  if (String(key).toUpperCase() === 'SYSTEM') return 'Автомат';
  const m = findMember(key);
  if (m) return m.name;
  return `(${key} — алга)`;
}
function memberInitials(key) {
  if (!key) return '?';
  if (String(key).toUpperCase() === 'SYSTEM') return '⚙';
  const m = findMember(key);
  if (!m) return '⚠';
  return m.name.replace(/\./g,'').slice(0,2);
}

/* Role-аар хайх — түлхүүрээс үл хамаарсан resilient lookup. */
function findMemberByRole(rolePattern) {
  const re = new RegExp(rolePattern, 'i');
  return TEAM.find(t => re.test(t.role || ''));
}
function findMemberEmailByRole(rolePattern, fallback = '') {
  const m = findMemberByRole(rolePattern);
  return m ? personKey(m) : fallback;
}
// CEO-ийн түлхүүрийг (утас) динамикаар олох (level === 100).
function getCEOEmail() {
  const m = TEAM.find(t => (t.level || 0) >= 100);
  return m ? personKey(m) : '';
}
// M-Event захиалга удирдах эрх — CEO эсвэл эвент/захиалгын менежер (role-д "эвент"/"захиалг").
function canManageOrders() {
  if (state.isCEO) return true;
  const m = findMember(state.me);
  return /эвент|захиалг/i.test(String(m?.role || ''));
}
// M-Event захиалга ХАРАХ эрх — менежер + M Event салбарын бүх хүн (нярав, агуулах, цэвэрлэгээ г.м.).
// Удирдах биш, харах/филтер хийх зорилгоор өргөн нээлттэй.
function canSeeOrders() {
  if (canManageOrders()) return true;
  // Дамжлагын аль нэг шатыг хариуцдаг role-тэй бол (нягтлан, агуулах, цэвэрлэгээ, нярав...) харна.
  const role = String(findMember(state.me)?.role || '');
  const hasStageRole = (typeof ORDER_FLOW !== 'undefined') &&
    Object.values(ORDER_FLOW).some(s => s.role !== 'manager' && s.role.test(role));
  if (hasStageRole) return true;
  const branches = (state.user?.branches) || (findMember(state.me)?.branches) || [];
  return Array.isArray(branches) && branches.includes('m-event');
}
function projectName(id) {
  // Look up across all branches so cross-branch tasks still show project name correctly.
  for (const branch of Object.keys(state.projectsByBranch)) {
    const p = state.projectsByBranch[branch].find(x => x.id === id);
    if (p) return p.name;
  }
  return '—';
}
function dueClass(due, status) {
  if (status === 'done' || !due) return '';
  const today = new Date(); today.setHours(0,0,0,0);
  const d = new Date(due); d.setHours(0,0,0,0);
  const diff = (d - today) / 86400000;
  if (diff < 0) return 'overdue';
  if (diff <= 1) return 'soon';
  return '';
}
function fmtDate(s) {
  if (!s) return '';
  const d = new Date(s);
  const today = new Date(); today.setHours(0,0,0,0);
  const dd = new Date(d); dd.setHours(0,0,0,0);
  const diff = (dd - today) / 86400000;
  if (diff === 0) return 'Өнөөдөр';
  if (diff === 1) return 'Маргааш';
  if (diff === -1) return 'Өчигдөр';
  if (diff > 1 && diff <= 7) return `${Math.round(diff)} хоног дараа`;
  if (diff < -1 && diff >= -7) return `${Math.abs(Math.round(diff))} хоног өмнө`;
  return d.toLocaleDateString('mn-MN', { month: 'short', day: 'numeric' });
}
// Огноо + цаг — Улаанбаатарын цагаар (MM-DD HH:MM)
function fmtDateTimeUB(val) {
  if (!val) return '';
  const d = new Date(val);
  if (isNaN(d.getTime())) return '';
  try {
    return d.toLocaleString('sv-SE', { timeZone: 'Asia/Ulaanbaatar', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
  } catch (e) {
    return d.toISOString().slice(5, 16).replace('T', ' ');
  }
}
function setConn(cls, text) {
  const el = document.getElementById('conn');
  el.className = 'conn-status ' + cls;
  document.getElementById('conn-text').textContent = text;
}

/* -------------------- FILTERING -------------------- */
function taskBranch(t) {
  // Tasks from before the multi-branch upgrade have no branch field. Treat them
  // as M Event so existing data stays visible.
  return t.branch || 'm-event';
}
/* Хэрэглэгч ямар салбарын лензийг ХАРЖ болох вэ:
   - CEO эсвэл хоёр салбартай → ['all','m-event','camp'] (бүгдийг, солих эрхтэй)
   - Нэг салбартай → зөвхөн өөрийн салбар (түгжээтэй — бусад салбар харахгүй)
   - Салбаргүй → ['all'] */
function allowedLenses() {
  if (state.isCEO) return ['all', 'm-event', 'camp', 'capital'];
  const m = findMember(state.me);
  const bs = (m && Array.isArray(m.branches)) ? m.branches.filter(b => b === 'm-event' || b === 'camp') : [];
  if (bs.length >= 2) return ['all', 'm-event', 'camp'];
  if (bs.length === 1) return [bs[0]];
  return ['all'];
}
/* Идэвхтэй ленз — зөвшөөрөгдсөнд хязгаарлана. Сонгосон утга зөвшөөрөгдөөгүй бол
   нэг салбартай хүнд → түүний салбар, бусдад → 'all'. */
function effectiveBranchLens() {
  const allowed = allowedLenses();
  if (state.branchLens && allowed.includes(state.branchLens)) return state.branchLens;
  return allowed.length === 1 ? allowed[0] : 'all';
}
function setBranchLens(v) {
  if (!allowedLenses().includes(v)) return; // зөвшөөрөгдөөгүй салбар руу шилжихгүй
  state.branchLens = v;
  try { localStorage.setItem('branchLens', v); } catch (e) {}
  render();
}
// "Гарсан" статустай ажилтны email-ийг хурдан хайхад зориулсан Set.
// Active task жагсаалтаас тэдгээрийн оноосон ажлуудыг хасахад ашиглана —
// гэхдээ "Дууссан" болон "Илгээсэн ажил" view-д үлдээж history алдагдахгүй.
function leftStaffEmails() {
  return new Set(
    TEAM.filter(m => (m.status || 'идэвхтэй') === 'гарсан')
        .map(m => personKey(m))
        .filter(Boolean)
  );
}

function filteredTasks() {
  // Архив view-аас БУСАД бүх view-д устгасан task-уудыг хасна. Bootstrap нь deleted
  // task-уудыг ч буцаадаг тул CEO Архивлуулсан жагсаалт үзэх боломжтой болгосон.
  const includeDeleted = state.view === 'archive';
  let list = state.tasks.filter(t => includeDeleted ? t.status === 'deleted' : t.status !== 'deleted');
  // ACCESS CONTROL — non-CEO users see:
  //   (1) tasks assigned to themselves (өөрийн хариуцах ажил),
  //   (2) tasks they created and assigned to others (өөрийн үүргэсэн ажил),
  //   (3) parent of any 5-stage act sub-task they're on (context).
  // CEO sees everything.
  if (!state.isCEO && state.me) {
    const allowed = new Set();
    state.tasks.forEach(t => {
      if (t.assignee === state.me || t.createdBy === state.me) allowed.add(t.id);
    });
    // Include parent of any allowed sub-task
    state.tasks.forEach(t => {
      if (t.parent_id && allowed.has(t.id)) allowed.add(t.parent_id);
    });
    list = list.filter(t => allowed.has(t.id));
  }
  // BRANCH filter disabled — Чимун ХХК нь нэг компани, бүгд нэг task list-д харагдана.
  // (Branch талбар datastructure-д үлдсэн — ирээдүйд буцаахаар үлдээсэн.)
  // view
  const today = todayStr();
  if (state.view === 'mine') list = list.filter(t => t.assignee === state.me);
  else if (state.view === 'delegated') list = list.filter(t => t.createdBy === state.me && t.assignee !== state.me);
  else if (state.view === 'finance') {
    // Финансын хүсэлтийг task-loga adapter-аар render хийнэ (устгасныг хасна)
    list = state.financeRequests.filter(r => r.status !== 'deleted').map(financeAsTask);
    // CEO / нягтлан / салбар-засагч → бүх салбар. Бусад → зөвхөн өөрийн хүсэлт.
    if (!canSeeAllFinance() && state.me) {
      list = list.filter(r => r.assignee === state.me || r.createdBy === state.me);
    }
    // Салбар ленз: сонгосон салбарыг л харуулна. Хөрөнгө (CAPEX) нь тусдаа '🏗 Хөрөнгө'
    // лензтэй тул M-Event/Camp дотор НЭГТГЭХГҮЙ — эс бөгөөс салбарын нийт зардал хөөрөгдөнө.
    const fWB = finLensBranch(effectiveBranchLens());
    if (fWB) list = list.filter(t => finEffBranch(t) === fWB);
  }
  else if (state.view === 'overdue') list = list.filter(t => t.status === 'open' && t.due && t.due < today);
  else if (state.view === 'today') list = list.filter(t => t.due === today);
  else if (state.view === 'done') list = list.filter(t => t.status === 'done');
  else if (state.view === 'archive') {
    // Архив: deleted task-уудыг сүүлд устгасан нь дээр харагдахаар буцаан эрэмбэлнэ
    list.sort((a,b) => {
      const au = new Date(a.updated || a.created || 0).getTime();
      const bu = new Date(b.updated || b.created || 0).getTime();
      return bu - au;
    });
  }
  else if (state.view.startsWith('project:')) {
    const pid = state.view.split(':')[1];
    list = list.filter(t => t.project === pid);
  }
  else if (state.view.startsWith('staff:')) {
    // Тухайн ажилтны бүх ажил (Тойм самбараас мөр дээр дарахад) — гарсан хүний ажлыг ч харна
    const em = state.view.slice(6);
    list = list.filter(t => t.assignee === em);
  }
  // "Гарсан" ажилтны идэвхтэй task-уудыг ажлын жагсаалтаас хасна — KPI болон тойм муудах
  // эх үүсвэр. "Дууссан" tab дотор үлдээж history тэвэрнэ. Илгээсэн ажил болон finance
  // адил тэр хүний өмнөх төлөвлөгөөг харах боломжтой. (staff: view-д тухайн хүнийг харуулна.)
  if (state.view !== 'done' && state.view !== 'delegated' && state.view !== 'finance' && !state.view.startsWith('staff:')) {
    const left = leftStaffEmails();
    if (left.size) list = list.filter(t => !left.has(String(t.assignee || '').toLowerCase()));
  }
  // ─── Глобал салбар ленз — тухайн салбар + нэгдсэн (shared) ажлыг харуулна ───
  // (Санхүү нь dept_branch-аар тусдаа бүлэглэгддэг тул энд хасахгүй.)
  const lens = effectiveBranchLens();
  if (lens !== 'all' && state.view !== 'finance') {
    list = list.filter(t => { const b = taskBranch(t); return b === lens || b === 'shared'; });
  }
  // ─── Filter — санхүүгийн view нь үе шатны filter, бусад нь ерөнхий ажлын filter ───
  if (state.view === 'finance') {
    // Санхүүгийн үе шат: Хүлээгдэж буй / Гүйлгээ хүлээж буй / Хаахыг хүлээж буй / Дууссан
    const f = state.statusFilter;
    if (f === 'f-pending')          list = list.filter(t => (t.decision || 'pending') === 'pending');
    else if (f === 'f-await-txn')   list = list.filter(t => t.decision === 'approved' && !t.executed_at && t.status !== 'done');
    else if (f === 'f-await-close') list = list.filter(t => t.decision === 'approved' && t.executed_at && t.status !== 'done');
    else if (f === 'f-done')        list = list.filter(t => t.status === 'done');
    // 'all' эсвэл бусад → бүгд (татгалзсан/хойшлогдсон ч энд харагдана)
  } else {
    // status filter (Бүгд / Идэвхтэй / Хоцорсон / Өнөөдөр / Дууссан)
    if (state.statusFilter === 'open') list = list.filter(t => t.status !== 'done');
    else if (state.statusFilter === 'done') list = list.filter(t => t.status === 'done');
    else if (state.statusFilter === 'overdue') list = list.filter(t => t.status !== 'done' && t.due && t.due < today);
    else if (state.statusFilter === 'today') list = list.filter(t => t.status !== 'done' && t.due === today);
    else if (state.statusFilter === 'week') {
      // Энэ долоо хоног — даваа гарагаас ням гараг хүртэл
      const now = new Date();
      const dow = now.getDay() || 7; // Mon=1..Sun=7
      const monday = new Date(now);
      monday.setDate(now.getDate() - (dow - 1));
      const sunday = new Date(monday);
      sunday.setDate(monday.getDate() + 6);
      const weekStart = monday.toISOString().slice(0, 10);
      const weekEnd = sunday.toISOString().slice(0, 10);
      list = list.filter(t => t.due && t.due >= weekStart && t.due <= weekEnd);
    }
    else if (state.statusFilter === 'month') {
      // Энэ сар
      const now = new Date();
      const y = now.getFullYear();
      const m = String(now.getMonth() + 1).padStart(2, '0');
      const prefix = `${y}-${m}`;
      list = list.filter(t => t.due && t.due.startsWith(prefix));
    }
  }
  // ─── Авто-архив: 14 хоногоос өмнө дууссан ажлыг идэвхтэй жагсаалтаас нуух ───
  // Дата ӨӨРЧЛӨХГҮЙ — зөвхөн харагдацын filter. "Дууссан" шүүлт, хайлт, Архив, Дууссан
  // view-д бүрэн хэвээр харагдана. Дуусгасан огноог t.updated-аар тооцно.
  if (!state.search
      && state.view !== 'done' && state.view !== 'archive' && state.view !== 'finance'
      && state.statusFilter !== 'done') {
    const cutoff = Date.now() - 14 * 86400000;
    list = list.filter(t => {
      if (t.status !== 'done') return true;
      const doneTs = new Date(t.updated || t.created || 0).getTime();
      return !doneTs || doneTs >= cutoff; // огноогүй бол үлдээнэ
    });
  }
  // search
  if (state.search) {
    // Search syntax — "from:Бат", "due:today" / "due:2026-05-30", "priority:high|med|low",
    // "status:open|done", "branch:m-event" гэх мэт. Бусад үлдсэн текст нь title+desc-д хайгдана.
    // Жишээ: "from:Бат due:today" → Бат-д оноосон, өнөөдөр дуустай.
    const tokens = state.search.trim().match(/(\w+:[^\s]+|"[^"]+"|\S+)/g) || [];
    const today = todayStr();
    const filters = [];
    const textBits = [];
    for (const tok of tokens) {
      const colonIdx = tok.indexOf(':');
      if (colonIdx > 0 && !tok.startsWith('"')) {
        const key = tok.slice(0, colonIdx).toLowerCase();
        let val = tok.slice(colonIdx + 1).toLowerCase().replace(/^"|"$/g, '');
        if (key === 'from' || key === 'хариуцагч' || key === 'assignee') {
          filters.push(t => {
            const name = (memberName(t.assignee) || '').toLowerCase();
            return name.includes(val) || String(t.assignee || '').toLowerCase().includes(val);
          });
        } else if (key === 'by' || key === 'үүсгэгч' || key === 'creator') {
          filters.push(t => {
            const name = (memberName(t.createdBy) || '').toLowerCase();
            return name.includes(val) || String(t.createdBy || '').toLowerCase().includes(val);
          });
        } else if (key === 'due' || key === 'хугацаа') {
          if (val === 'today' || val === 'өнөөдөр') filters.push(t => t.due === today);
          else if (val === 'overdue' || val === 'хоцорсон') filters.push(t => t.due && t.due < today && t.status !== 'done');
          else if (val === 'week' || val === 'долоохоног') {
            const w = new Date(); w.setDate(w.getDate() + 7); const wkStr = w.toISOString().slice(0, 10);
            filters.push(t => t.due && t.due >= today && t.due <= wkStr);
          } else filters.push(t => t.due === val);
        } else if (key === 'priority' || key === 'зэрэглэл') {
          const norm = { 'high':'high', 'өндөр':'high', 'med':'med', 'medium':'med', 'дунд':'med', 'low':'low', 'бага':'low' };
          const wanted = norm[val] || val;
          filters.push(t => t.priority === wanted);
        } else if (key === 'status' || key === 'төлөв') {
          const norm = { 'open':'open', 'идэвхтэй':'open', 'done':'done', 'дууссан':'done',
                         'declined':'declined', 'татгалзсан':'declined', 'in_progress':'in_progress', 'хийгдэж':'in_progress' };
          const wanted = norm[val] || val;
          filters.push(t => (t.status || 'open') === wanted);
        } else if (key === 'branch' || key === 'салбар') {
          const norm = { 'm-event':'m-event', 'mevent':'m-event', 'mэвент':'m-event',
                         'camp':'camp', 'кемп':'camp', 'shared':'shared', 'нэгдсэн':'shared' };
          const wanted = norm[val] || val;
          filters.push(t => (t.branch || '') === wanted);
        } else {
          // Тодорхойгүй prefix — title-д орох гэж тооцно
          textBits.push(tok);
        }
      } else {
        textBits.push(tok.replace(/^"|"$/g, ''));
      }
    }
    if (filters.length) list = list.filter(t => filters.every(f => f(t)));
    if (textBits.length) {
      const q = textBits.join(' ').toLowerCase();
      list = list.filter(t => (t.title||'').toLowerCase().includes(q) || (t.desc||'').toLowerCase().includes(q));
    }
  }
  // ─── Sort ───
  if (state.view === 'finance') {
    const sortMode = state.financeSort || 'smart';
    if (sortMode === 'date') {
      list.sort((a,b) => (b.created||0) - (a.created||0)); // шинэ нь дээр
    } else if (sortMode === 'amount') {
      list.sort((a,b) => (Number(b.amount)||0) - (Number(a.amount)||0)); // их дүн дээр
    } else if (sortMode === 'requester') {
      list.sort((a,b) => {
        const c = (memberName(a.createdBy)||'').localeCompare(memberName(b.createdBy)||'', 'mn');
        return c !== 0 ? c : (b.created||0) - (a.created||0);
      });
    } else {
      // smart — ач холбогдлоор: ТАНД хамаатай (одоо таны үйлдэл хүлээж буй) нь эхэнд.
      //   Дараа нь үе шатаар (хүлээгдэж буй → гүйлгээ → хаах → хойшлогдсон), эцэст нь дууссан.
      const finRank = (t) => {
        const dec = t.decision || 'pending';
        if (t.status === 'done' || dec === 'rejected') return 5; // дууссан/татгалзсан — доор
        let stage;
        if (dec === 'pending') stage = 1;
        else if (dec === 'approved' && !t.executed_at) stage = 2; // гүйлгээ хүлээж буй
        else if (dec === 'approved' && t.executed_at) stage = 3;  // хаахыг хүлээж буй
        else stage = 4;                                            // хойшлогдсон г.м.
        return (t.assignee === state.me) ? 0 : stage; // миний үйлдэл хүлээж буй нь дээр
      };
      list.sort((a,b) => {
        const ra = finRank(a), rb = finRank(b);
        if (ra !== rb) return ra - rb;
        if (ra === 5) return (b.created||0) - (a.created||0); // дууссан — шинэ нь дээр
        return (a.created||0) - (b.created||0);               // идэвхтэй — удаан хүлээсэн нь дээр
      });
    }
  } else {
    // sort: open first, then by due asc, then created desc
    list.sort((a,b) => {
      if ((a.status==='done') !== (b.status==='done')) return a.status==='done' ? 1 : -1;
      const ad = a.due || '9999-12-31', bd = b.due || '9999-12-31';
      if (ad !== bd) return ad < bd ? -1 : 1;
      return (b.created||0) - (a.created||0);
    });
  }
  // REGROUP — keep 5-stage act sub-tasks right under their parent.
  // Sub-tasks within a parent are ordered by stage 1→5 regardless of due date.
  const placed = new Set();
  const subsByParent = {};
  list.forEach(t => {
    if (t.parent_id) (subsByParent[t.parent_id] = subsByParent[t.parent_id] || []).push(t);
  });
  Object.values(subsByParent).forEach(arr =>
    arr.sort((a,b) => (Number(a.stage)||0) - (Number(b.stage)||0))
  );
  const grouped = [];
  list.forEach(t => {
    if (placed.has(t.id)) return;
    if (t.kind === 'act_parent') {
      grouped.push(t); placed.add(t.id);
      (subsByParent[t.id] || []).forEach(s => {
        if (!placed.has(s.id)) { grouped.push(s); placed.add(s.id); }
      });
    }
  });
  // Remaining tasks (non-act, or orphaned sub-tasks whose parent was filtered out)
  list.forEach(t => { if (!placed.has(t.id)) grouped.push(t); });
  return grouped;
}

/* Цагийн ажилтан (worker_type='daily') — хязгаарлагдмал хандалт. Зөвхөн өөрийн
   "Ирсэн ажил"-ыг хардаг: санхүү, тойм, илгээсэн, календарь, бусад ажилтан харагдахгүй. */
function isDailyWorker() {
  return (state.user && state.user.worker_type === 'daily');
}
// Үндсэн ажилтан (өдрийн/цагийн биш) — гүйцэтгэлийн үнэлгээ зөвхөн эдгээрт хамаарна.
function isPermanentStaff(m) {
  return m && String(m.worker_type || 'permanent') !== 'daily';
}

/* -------------------- RENDER -------------------- */
function render() {
  // Цагийн ажилтныг зөвшөөрөлгүй view-аас "Ирсэн ажил" руу буцаана (UI нууснаас гадна бат)
  if (isDailyWorker()) {
    const blocked = ['dashboard','finance','delegated','calendar','archive','performance'];
    if (blocked.includes(state.view) || state.view.startsWith('staff:') || state.view.startsWith('project:')) {
      state.view = 'mine';
    }
  }
  // Захиалга / Бараа view — зөвхөн CEO. Бусдыг "Ирсэн ажил" руу буцаана.
  if (state.view === 'orders' && !canSeeOrders()) state.view = 'mine';
  if (state.view === 'products' && !state.isCEO) state.view = 'mine';
  if (state.view === 'hourly' && !canSeeHourlyPayroll()) state.view = 'mine';
  if (state.view === 'nomaad' && !canSeeNomaadOrders()) state.view = 'mine';
  if (state.view === 'archive') state.view = 'mine';  // Архив view устгагдсан
  if (state.view.startsWith('project:')) state.view = 'mine';  // Төсөл view устгагдсан (2026-06-06)
  const blSel = document.getElementById('branch-lens');
  if (blSel) {
    const allowed = allowedLenses();
    const labels = { all: '🏢 Бүгд', 'm-event': '⛺ M-Event', camp: '🏔 NOMAAD Camp', capital: '🏗 Хөрөнгө' };
    const key = allowed.join(',');
    if (blSel._builtFor !== key) {
      blSel.innerHTML = allowed.map(v => `<option value="${v}">${labels[v] || v}</option>`).join('');
      blSel._builtFor = key;
    }
    blSel.value = effectiveBranchLens();
    blSel.style.display = allowed.length <= 1 ? 'none' : '';  // нэг л салбартай хүнд сонгогч хэрэггүй
  }
  renderSidebar();
  renderTitle();
  syncFilterPills();
  renderTaskList();
  renderCounts();
  renderNotifications();
}
// Санхүүгийн view-д үе шатны filter, бусад view-д ажлын ерөнхий filter харуулна.
// Идэвхтэй pill-ийг state.statusFilter-тэй тааруулна.
function syncFilterPills() {
  const isFin = state.view === 'finance';
  const taskG = document.getElementById('task-filters');
  const finG  = document.getElementById('fin-filters');
  if (taskG) taskG.style.display = isFin ? 'none' : '';
  if (finG)  finG.style.display  = isFin ? '' : 'none';
  const finSort = document.getElementById('fin-sort');
  if (finSort) { finSort.style.display = isFin ? '' : 'none'; finSort.value = state.financeSort || 'smart'; }
  const grp = isFin ? finG : taskG;
  if (!grp) return;
  let matched = false;
  grp.querySelectorAll('.filter-pill').forEach(p => {
    const on = p.dataset.status === state.statusFilter;
    p.classList.toggle('active', on);
    if (on) matched = true;
  });
  // Идэвхтэй filter энэ бүлэгт байхгүй бол (view сольсон) → Бүгд болгоно
  if (!matched) {
    state.statusFilter = 'all';
    grp.querySelectorAll('.filter-pill').forEach(p => p.classList.toggle('active', p.dataset.status === 'all'));
  }
}
function renderSidebar() {
  // active nav
  document.querySelectorAll('.nav-item').forEach(el => {
    el.classList.toggle('active', el.dataset.view === state.view);
  });
  // Тойм — бүгдэд харагдана. CEO бол company-wide, бусад нь хувийн.
  const dashNav = document.getElementById('nav-dashboard');
  if (dashNav) {
    dashNav.style.display = '';
    const lbl = document.getElementById('nav-dashboard-label');
    if (lbl) lbl.textContent = state.isCEO ? 'Тойм' : 'Миний тойм';
  }
  // Захиалга — зөвхөн CEO-д харагдана. Badge нь "Шинэ" захиалгын тоо.
  const ordersNav = document.getElementById('nav-orders');
  if (ordersNav) {
    ordersNav.style.display = canSeeOrders() ? '' : 'none';
    const oCnt = document.getElementById('cnt-orders');
    if (oCnt) {
      const list = state.orders || [];
      // Менежер — шинэ захиалгын тоо. Бусад — өөрийн шатанд хүлээж буй захиалгын тоо.
      oCnt.textContent = String(canManageOrders()
        ? list.filter(o => (o.status || 'Шинэ') === 'Шинэ').length
        : list.filter(canSeeOrder).length);
    }
  }
  // Гүйцэтгэл — зөвхөн үндсэн ажилтанд (өдрийн ажилтанд хамаарахгүй).
  const perfNav = document.getElementById('nav-performance');
  if (perfNav) perfNav.style.display = isDailyWorker() ? 'none' : '';
  // Бараа — зөвхөн CEO. Badge нь нийт барааны тоо.
  const prodNav = document.getElementById('nav-products');
  if (prodNav) {
    prodNav.style.display = state.isCEO ? '' : 'none';
    const pCnt = document.getElementById('cnt-products');
    if (pCnt) pCnt.textContent = String((state.products || []).length);
  }
  // Цагийн цалин — CEO/нягтлан/менежер. Badge нь төлбөргүй цагийн ажилтны тоо.
  const hrNav = document.getElementById('nav-hourly');
  if (hrNav) {
    hrNav.style.display = canSeeHourlyPayroll() ? '' : 'none';
    const hrCnt = document.getElementById('cnt-hourly');
    if (hrCnt) hrCnt.textContent = String(hourlyWorkers().length);
  }
  // NOMAAD захиалга — CEO/нягтлан. Badge нь орлого бүртгээгүй гэрээний тоо.
  const noNav = document.getElementById('nav-nomaad');
  if (noNav) {
    noNav.style.display = canSeeNomaadOrders() ? '' : 'none';
    const noCnt = document.getElementById('cnt-nomaad');
    if (noCnt) noCnt.textContent = String((state.nomaadOrders || []).filter(o => !(Number(o.income_amount) > 0) && !nomaadIsCancelled(o)).length);
  }
  // Brand нэг ширхэг "Чимун ХХК" — салбарын систем дотроос л үлдсэн
  const brandEl = document.getElementById('brand-text');
  // Sidebar brand: компанийн лого (icon.svg) + нэр. Орчин үеийн корпорат харагдалт.
  if (brandEl) brandEl.innerHTML = '<img src="icon.svg" alt="" style="width:22px;height:22px;border-radius:5px;vertical-align:-5px;margin-right:8px;" /> Чимун ХХК';
  // Төслийн жагсаалт UI-аас бүрэн хасагдсан (2026-06-06). project-list element байхгүй.
}
function renderTitle() {
  // [icon SVG, title text, subtitle]
  const titles = {
    dashboard: [ICONS.layers, 'Тойм', 'Гүйцэтгэлийн тойм болон график'],
    calendar:  ['<svg class="lcd-icon" viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>', 'Календарь', 'Эцсийн хугацаагаар task-уудыг харах'],
    mine:      [ICONS.inbox, 'Ирсэн ажил', 'Танд оноосон ажлууд'],
    delegated: [ICONS.send, 'Илгээсэн ажил', 'Та өөр хүнд оноосон ажлууд'],
    finance:   [ICONS.wallet, 'Санхүүгийн хүсэлт', 'Зөвшөөрөл хүлээж буй болон гүйцэтгэгдсэн'],
    performance: ['<svg class="lcd-icon" viewBox="0 0 24 24"><path d="M3 3v18h18"/><path d="M18 17V9"/><path d="M13 17V5"/><path d="M8 17v-3"/></svg>', 'Гүйцэтгэл', 'Сарын объектив гүйцэтгэлийн үнэлгээ'],
    orders:    ['<svg class="lcd-icon" viewBox="0 0 24 24"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>', 'Захиалга', 'M Event сайтаас ирсэн түрээсийн захиалгууд'],
    products:  ['<svg class="lcd-icon" viewBox="0 0 24 24"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></svg>', 'Бараа', 'M Event барааны үнэ, нөөц — сайт шууд шинэчлэгдэнэ'],
    hourly:    ['<svg class="lcd-icon" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>', 'Цагийн цалин', 'Цагийн ажилчдын цалин — урьдчилгаа авч, ажил дуусахад шилжүүлнэ'],
    nomaad:    ['<svg class="lcd-icon" viewBox="0 0 24 24"><path d="M3 21h18M5 21V7l8-4v18M19 21V11l-6-4"/></svg>', 'NOMAAD захиалга', 'Батлагдсан гэрээ — Quote Items дэлгэрэнгүй, орлого гараар бүртгэх'],
    all:       ['', 'Бүгд','Бүх checklist'],
    overdue:   [ICONS.alertTri, 'Хоцорсон','Эцсийн хугацаа өнгөрсөн'],
    today:     [ICONS.sun, 'Өнөөдөр','Өнөөдөр дуусах ёстой'],
    done:      [ICONS.check, 'Дууссан','Биелсэн даалгаврууд'],
  };
  let t = titles[state.view];
  if (!t && state.view.startsWith('project:')) {
    const pid = state.view.split(':')[1];
    t = ['', projectName(pid), 'Төсөл'];
  }
  if (!t && state.view.startsWith('staff:')) {
    const em = state.view.slice(6);
    t = [ICONS.inbox, memberName(em), 'Энэ ажилтны бүх ажил — буцахдаа зүүн талаас цэс сонгоно уу'];
  }
  const [icon, title, sub] = t || ['', 'Бүгд', 'Бүх'];
  document.getElementById('view-title').innerHTML = (icon || '') + escapeHtml(title);
  document.getElementById('view-sub').textContent = sub || '';
}
function renderTaskList() {
  const wrap = document.getElementById('task-list');
  // CEO dashboard view — task жагсаалт биш, харин тойм статистик.
  // Table head, toolbar-уудыг нуунa
  const tableHead = document.querySelector('.table-head');
  const toolbar = document.querySelector('.toolbar');
  if (state.view === 'dashboard') {
    if (tableHead) tableHead.style.display = 'none';
    if (toolbar) toolbar.style.display = 'none';
    wrap.innerHTML = renderDashboard();
    // Dashboard action товчнууд
    document.getElementById('dash-export-csv')?.addEventListener('click', exportTasksReport);
    document.getElementById('dash-export-ics')?.addEventListener('click', () => exportTasksAsICS());
    document.getElementById('dash-print')?.addEventListener('click', () => window.print());
    document.getElementById('dash-permissions')?.addEventListener('click', openPermissionsModal);
    document.getElementById('dash-email-digest')?.addEventListener('click', sendWeeklyDigest);
    document.getElementById('dash-staff')?.addEventListener('click', openStaffManagement);
    document.getElementById('dash-pending-reg-card')?.addEventListener('click', openStaffManagement);
    // Ажилтны ачаалал — мөр дээр дарж тухайн хүний ажлуудыг жагсаалтаар харах
    wrap.querySelectorAll('.dash-staff-clickable').forEach(row => {
      row.addEventListener('click', () => {
        const email = row.dataset.staffEmail;
        if (!email) return;
        state.view = 'staff:' + email;
        state.statusFilter = 'all';
        state._taskListLimit = null;
        render();
      });
    });
    // CEO бус хэрэглэгчид permissions/staff/email digest нуух
    if (!state.isCEO) {
      document.getElementById('dash-permissions')?.style.setProperty('display', 'none');
      document.getElementById('dash-email-digest')?.style.setProperty('display', 'none');
      document.getElementById('dash-staff')?.style.setProperty('display', 'none');
    }
    return;
  } else if (state.view === 'calendar') {
    if (tableHead) tableHead.style.display = 'none';
    if (toolbar) toolbar.style.display = 'none';
    wrap.innerHTML = renderCalendar();
    attachCalendarHandlers();
    return;
  } else if (state.view === 'orders') {
    if (tableHead) tableHead.style.display = 'none';
    if (toolbar) toolbar.style.display = 'none';
    wrap.innerHTML = renderOrders();
    attachOrdersHandlers();
    return;
  } else if (state.view === 'products') {
    if (tableHead) tableHead.style.display = 'none';
    if (toolbar) toolbar.style.display = 'none';
    wrap.innerHTML = renderProducts();
    attachProductsHandlers();
    return;
  } else if (state.view === 'performance') {
    if (tableHead) tableHead.style.display = 'none';
    if (toolbar) toolbar.style.display = 'none';
    wrap.innerHTML = renderPerformance();
    attachPerformanceHandlers();
    return;
  } else if (state.view === 'hourly') {
    if (tableHead) tableHead.style.display = 'none';
    if (toolbar) toolbar.style.display = 'none';
    wrap.innerHTML = renderHourly();
    attachHourlyHandlers();
    return;
  } else if (state.view === 'nomaad') {
    if (tableHead) tableHead.style.display = 'none';
    if (toolbar) toolbar.style.display = 'none';
    wrap.innerHTML = renderNomaadToggle() + (nomaadViewMode === 'calendar' ? renderNomaadCalendar() : renderNomaadPipeline());
    attachNomaadHandlers();
    return;
  } else if (state.view === 'finance') {
    // Зөвхөн Тайлан — салбар/ангилалаар цэгцтэй задаргаа (жагсаалт нэгтгэгдсэн).
    if (tableHead) tableHead.style.display = 'none';
    if (toolbar) toolbar.style.display = 'none';
    wrap.innerHTML = '';
    renderFinanceReport(wrap);
    return;
  } else {
    if (tableHead) tableHead.style.display = '';
    if (toolbar) toolbar.style.display = '';
  }
  const tasks = filteredTasks();
  wrap.innerHTML = '';
  if (!tasks.length) {
    // Анхны ачаалал (cache хоосон + сервер хариу хүлээж буй) — "алга" биш skeleton.
    wrap.innerHTML = state._initialLoading ? listSkeletonHtml() : emptyStateHtml();
    return;
  }
  // Virtual scroll — 80+ task үед эхний 80-ыг харуулна,
  // дараа нь "Бусдыг харуулах" товч дарж дараагийн 80-ыг ачаална.
  const PAGE_SIZE = 80;
  const visibleCount = state._taskListLimit || PAGE_SIZE;
  const visible = tasks.slice(0, visibleCount);
  visible.forEach(t => wrap.appendChild(renderRow(t)));
  if (tasks.length > visibleCount) {
    const remaining = tasks.length - visibleCount;
    const moreBtn = document.createElement('button');
    moreBtn.className = 'task-list-more';
    moreBtn.textContent = `Бусдыг харуулах (${remaining} ажил)`;
    moreBtn.addEventListener('click', () => {
      state._taskListLimit = visibleCount + PAGE_SIZE;
      render();
    });
    wrap.appendChild(moreBtn);
  } else if (state._taskListLimit && state._taskListLimit > PAGE_SIZE) {
    // Цөөрсөн — reset back to default
    state._taskListLimit = PAGE_SIZE;
  }
}

/* ─── M-Event Захиалга ─────────────────────────────────────
   Сайтаас ирсэн түрээсийн захиалгыг харах + статус удирдах.
   Backend: n8n /webhook/mevent-orders (GET унших, POST шинэчлэх) → MEVENT_Orders_DB Sheet.
   Зөвхөн CEO. */
// Захиалгын дамжлага (queue). Шат бүр тодорхой role/хүнд хамаарна.
const ORDER_STATUSES = ['Шинэ', 'Баталсан', 'Төлбөр авсан', 'Цэвэрлэгээ', 'Түрээс бэлдсэн', 'Гаргасан', 'Хүргэсэн', 'Буцаан ирсэн', 'Дууссан', 'Цуцалсан'];

// Дамжлагын чиглүүлэлт: захиалга тухайн статустай байх үед ХЭН харж, ХӨГ үйлдэл хийх вэ.
//   role: 'manager' = зөвхөн менежер/CEO. Бусад нь ажилтны role-д тааруулах regex.
//   next: дараагийн статус (тухайн хүн "дуусгах" товч дармагц). label: товчны бичиг.
// Загвар: статус = өмнөх шат ДУУССАН гэсэн утга → дараагийн хүн авч ажиллана.
const ORDER_FLOW = {
  'Шинэ':           { role: 'manager',                          next: 'Баталсан',       label: '✓ Батлах' },
  'Баталсан':       { role: /нягтлан/i,                         next: 'Төлбөр авсан',   label: '✓ Төлбөр авсан' },
  'Төлбөр авсан':   { role: /цэвэрлэгээ|цэврэлгээ|үйлчилгээ/i,  next: 'Цэвэрлэгээ',     label: '✓ Цэвэрлэсэн' },
  'Цэвэрлэгээ':     { role: /агуулахын ажилтан/i,               next: 'Түрээс бэлдсэн', label: '✓ Түрээс бэлдсэн' },
  'Түрээс бэлдсэн': { role: /нярав|агуулахын ахлах/i,           next: 'Гаргасан',       label: '✓ Гаргасан' },
  'Гаргасан':       { role: /агуулахын ажилтан|жолооч/i,        next: 'Хүргэсэн',       label: '✓ Хүргэсэн' },
  'Хүргэсэн':       { role: /нярав|агуулахын ахлах/i,           next: 'Буцаан ирсэн',   label: '✓ Буцаан ирсэн' },
  'Буцаан ирсэн':   { role: /нягтлан/i,                         next: 'Дууссан',        label: '✓ Дуусгах' },
  'Дууссан':        { role: 'manager',                          next: null,             label: null },
  'Цуцалсан':       { role: 'manager',                          next: null,             label: null },
};
function orderStage(status) { return ORDER_FLOW[status || 'Шинэ'] || ORDER_FLOW['Шинэ']; }
// Тухайн захиалгыг би харах эрхтэй юу — менежер бүгдийг, бусад нь зөвхөн өөрийн шатных.
function canSeeOrder(o) {
  if (canManageOrders()) return true;
  const stage = orderStage(o.status);
  if (!stage || stage.role === 'manager') return false;
  const role = String(findMember(state.me)?.role || '');
  return stage.role.test(role);
}

function normalizeOrder(o) {
  let items = [];
  try { items = JSON.parse(o.items_json || '[]'); } catch(e) { items = []; }
  return {
    order_no: o.order_no || '',
    created_at: o.created_at || '',
    status: o.status || 'Шинэ',
    customer_name: o.customer_name || '',
    phone: String(o.phone || ''),
    address: o.address || '',
    email: o.email || '',
    company: o.company || '',
    register: String(o.register || ''),
    date_start: o.date_start || '',
    date_end: o.date_end || '',
    days: o.days || '',
    items,
    subtotal: Number(o.subtotal) || 0,
    deposit: Number(o.deposit) || 0,
    total: Number(o.total) || 0,
    note: o.note || '',
    source: o.source || '',
    assigned_to: o.assigned_to || '',
    task_id: o.task_id || '',
  };
}

async function loadOrders() {
  if (!canSeeOrders()) return;
  const url = state.config.ordersUrl;
  if (!url) return;
  try {
    const r = await fetchWithTimeout(withKey(url + '?t=' + Date.now()), { headers: { 'Accept': 'application/json' } }, 15000);
    if (!r.ok) throw new Error('HTTP ' + r.status);
    const data = await r.json();
    state.orders = (data.orders || []).map(normalizeOrder)
      .sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''));
    try { localStorage.setItem('orders', JSON.stringify(state.orders)); } catch(e) {}
    if (typeof render === 'function') render();   // badge + view шинэчлэх
  } catch(e) { console.warn('loadOrders fail', e); }
}

// Захиалгын объектыг sheet-ийн 21 баганы бүтцэд хөрвүүлнэ. appendOrUpdate нь бүх
// баганыг бичдэг тул update бүрд БҮРЭН мөр илгээх ёстой (эс бөгөөс талбар хоосрох).
function orderToWire(o) {
  return {
    order_no: o.order_no || '', id: o.id || o.order_no || '', created_at: o.created_at || '',
    status: o.status || 'Шинэ', customer_name: o.customer_name || '', phone: o.phone || '',
    address: o.address || '', email: o.email || '', company: o.company || '', register: o.register || '',
    date_start: o.date_start || '', date_end: o.date_end || '', days: o.days || '',
    items_json: JSON.stringify(o.items || []), subtotal: Number(o.subtotal) || 0,
    deposit: Number(o.deposit) || 0, total: Number(o.total) || 0, note: o.note || '',
    source: o.source || '', assigned_to: o.assigned_to || '', task_id: o.task_id || '',
  };
}

async function updateOrderStatus(order_no, fields) {
  const o = state.orders.find(x => x.order_no === order_no);
  if (o) Object.assign(o, fields);
  render();
  const url = state.config.ordersUrl;
  if (!url || !o) return;
  try {
    const r = await fetchWithTimeout(withKey(url), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(orderToWire(o)),   // бүрэн мөр
    }, 15000);
    if (!r.ok) throw new Error('HTTP ' + r.status);
    showToast('Захиалга шинэчлэгдлээ', 'success', 1500);
  } catch(e) { showToast('Алдаа: ' + e.message, 'error'); }
}

// Туслах нягтлан "Гүйлгээ амжилттай" дарахад: захиалгыг баталгаажуулж, 3 даалгавар
// (Түрээс бэлдэх, Цэвэрлэгээ, Хүргэлт) автоматаар үүсгэнэ. Эвент менежерт оноогдоно
// → тэр тус бүрд ажилтан хуваарилна (даалгаврын reassign-аар).
async function confirmOrderPayment(order_no) {
  const o = state.orders.find(x => x.order_no === order_no);
  if (!o) return;
  if (state.me !== getFinanceExecutorEmail() && !state.isCEO) {
    showToast('Зөвхөн Туслах нягтлан төлбөр баталгаажуулна', 'error'); return;
  }
  if ((o.status || 'Шинэ') !== 'Шинэ') { showToast('Аль хэдийн баталгаажсан', 'warn'); return; }
  const ok = await showConfirm(
    `${o.customer_name || o.order_no} — ${fmtMoney(o.total)}\nГүйлгээ амжилттай гэж баталгаажуулах уу?\n(Түрээс бэлдэх, Цэвэрлэгээ, Хүргэлт даалгавар үүснэ)`,
    { title: 'Төлбөр баталгаажуулах', okText: 'Тийм, баталгаажуулах' });
  if (!ok) return;
  // Эвент менежер даалгаврын эзэн (creator) → тэр тус бүрд ажилтан хуваарилна.
  const owner = findMemberEmailByRole('эвент', '') || state.me;
  const cust = o.customer_name || o.order_no;
  const due = o.date_start ? String(o.date_start).slice(0, 10) : '';
  const baseDesc = `Захиалга ${o.order_no} · ${cust}`
    + (o.date_start ? `\n📅 ${o.date_start} → ${o.date_end}` : '')
    + `\n📍 ${o.address || '—'} · ☎ ${o.phone || '—'}`;
  const defs = [
    { title: `Түрээс бэлдэх — ${cust}`, priority: 'high' },
    { title: `Цэвэрлэгээ — ${cust}`, priority: 'med' },
    { title: `Хүргэлт — ${cust}`, priority: 'high' },
  ];
  const ids = [];
  for (let i = 0; i < defs.length; i++) {
    const t = {
      id: uid(), title: defs[i].title, desc: baseDesc, branch: 'm-event', project: 'event',
      assignee: owner, due, priority: defs[i].priority, status: 'open',
      order_no: o.order_no, createdBy: owner, created: Date.now() + i, comments: [], activity: [],
    };
    state.tasks.unshift(t);
    ids.push(t.id);
    await saveTask(t);
  }
  o.status = 'Баталсан';
  o.task_id = ids.join(',');
  const idx = state.orders.findIndex(x => x.order_no === order_no);
  if (idx >= 0) state.orders[idx] = o;
  render();
  try {
    const r = await fetchWithTimeout(withKey(state.config.ordersUrl || DEFAULT_ORDERS_URL), {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(orderToWire(o)),
    }, 15000);
    if (!r.ok) throw new Error('HTTP ' + r.status);
  } catch (e) { showToast('Захиалга sheet-д хадгалагдсангүй: ' + e.message, 'warn', 4000); }
  showToast('Баталгаажлаа · 3 даалгавар үүслээ. Эвент менежер ажилтан хуваарилна.', 'success', 4000);
}

function orderStatusClass(s) {
  return ({
    'Шинэ': 'os-new',
    'Баталсан': 'os-ok',
    'Төлбөр авсан': 'os-ok',
    'Цэвэрлэгээ': 'os-prep',
    'Түрээс бэлдсэн': 'os-prep',
    'Гаргасан': 'os-prep',
    'Хүргэсэн': 'os-ok',
    'Буцаан ирсэн': 'os-prep',
    'Дууссан': 'os-done',
    'Цуцалсан': 'os-cancel',
  })[s] || 'os-new';
}

// Note-оос автомат хямдрал/НӨАТ мөрийг арилгаж зөвхөн хүний бичсэнийг үлдээнэ.
function cleanOrderNote(note) {
  return String(note || '')
    .replace(/·?\s*\d+\s*хоногийн хямдрал[^·]*/g, '')
    .replace(/·?\s*НӨАТ хасав[^·]*/g, '')
    .replace(/·?\s*Хямдрал \(гар\):[^·]*/g, '')
    .replace(/^\s*·\s*/, '').replace(/\s*·\s*$/, '').trim();
}
// Захиалгын үнийг items + хоногоор ДАХИН тооцоолно (хадгалагдсан дүн хуучин/буруу байж болзошгүй тул).
// Түрээс = (үнэ×тоо)×хоног, дараа нь 2+ хоног −20%, НӨАТ (note-д байвал) −5%, дээр нь барьцаа.
function computeOrderPricing(o) {
  const days = Math.max(1, Number(o.days) || 1);
  const daily = (o.items || []).reduce((s, it) => s + (Number(it.price) || 0) * (Number(it.qty) || 0), 0);
  const rental = daily * days;
  const multiDayDiscount = days >= 2 ? Math.round(rental * 0.20) : 0;
  const afterMd = rental - multiDayDiscount;
  const hasVat = /НӨАТ/i.test(String(o.note || ''));
  const vatDiscount = hasVat ? Math.round(afterMd * 0.05) : 0;
  const dm = String(o.note || '').match(/Хямдрал \(гар\):\s*−?\s*([\d,]+)/);
  const manualDiscount = dm ? (parseInt(dm[1].replace(/\D/g, ''), 10) || 0) : 0;
  const deposit = Number(o.deposit) || 0;
  const total = Math.max(0, afterMd - vatDiscount - manualDiscount) + deposit;
  return { days, rental, multiDayDiscount, vatDiscount, manualDiscount, hasVat, deposit, total };
}

function renderOrders() {
  const canManage = canManageOrders();   // менежер — бүгдийг хараад бүрэн хяналт. Бусад — зөвхөн өөрийн шат.
  const all = state.orders || [];
  const orders = canManage ? all : all.filter(canSeeOrder);   // дамжлагын чиглүүлэлт
  const topbar = canManage ? `<div class="orders-topbar" style="display:flex;justify-content:flex-end;margin-bottom:14px;">
    <button class="btn btn-primary" id="new-mevent-order">+ Шинэ захиалга</button>
  </div>` : '';
  if (!orders.length) {
    if (state._initialLoading && !all.length) {
      return topbar + `<div class="orders-empty"><div class="icon">⏳</div><div>Ачаалж байна…</div></div>`;
    }
    return topbar + `<div class="orders-empty"><div class="icon">🛒</div>
      <div>${all.length ? 'Танд хамаарах захиалга одоогоор алга.' : 'Захиалга алга байна.'}</div>
      <div class="sub">${canManage ? 'Сайтаас ирэх эсвэл "+ Шинэ захиалга" товчоор гараар үүсгэнэ.' : 'Таны шатанд захиалга ирэхэд энд харагдана.'}</div></div>`;
  }
  const canConfirm = state.isCEO || state.me === getFinanceExecutorEmail();
  const cards = orders.map(o => {
    const pr = computeOrderPricing(o);   // хоногоор зөв дахин тооцсон үнэ
    const itemsRows = (o.items || []).map(it =>
      `<tr><td>${escapeHtml(it.name || '')}</td><td class="num">${it.qty || 0}</td><td class="num">${fmtMoney(it.price || 0)}</td><td class="num">${fmtMoney((it.price || 0) * (it.qty || 0) * pr.days)}</td></tr>`
    ).join('');
    const humanNote = cleanOrderNote(o.note);
    const opts = ORDER_STATUSES.map(s => `<option value="${s}"${s === o.status ? ' selected' : ''}>${s}</option>`).join('');
    return `<div class="order-card" data-order="${escapeHtml(o.order_no)}">
      <div class="order-head">
        <div>
          <span class="order-no">${escapeHtml(o.order_no)}</span>
          <span class="order-badge ${orderStatusClass(o.status)}">${escapeHtml(o.status)}</span>
        </div>
        <div class="order-total">${fmtMoney(pr.total)}</div>
      </div>
      <div class="order-cust">
        <b>${escapeHtml(o.customer_name)}</b>${o.company ? ' · ' + escapeHtml(o.company) : ''}
        · <a href="tel:${escapeHtml(o.phone)}">${escapeHtml(o.phone)}</a>
      </div>
      <div class="order-meta">📍 ${escapeHtml(o.address || '—')}</div>
      <div class="order-meta">📅 ${escapeHtml(o.date_start)} → ${escapeHtml(o.date_end)}${pr.days ? ' (' + pr.days + ' хоног)' : ''}</div>
      ${humanNote ? `<div class="order-meta">📝 ${escapeHtml(humanNote)}</div>` : ''}
      <table class="order-items"><thead><tr><th>Бараа</th><th class="num">Тоо</th><th class="num">Үнэ</th><th class="num">Дүн</th></tr></thead><tbody>${itemsRows}</tbody></table>
      ${pr.multiDayDiscount ? `<div class="order-meta">${pr.days} хоногийн хямдрал (−20%): −${fmtMoney(pr.multiDayDiscount)}</div>` : ''}
      ${pr.vatDiscount ? `<div class="order-meta">НӨАТ хасалт (−5%): −${fmtMoney(pr.vatDiscount)}</div>` : ''}
      ${pr.manualDiscount ? `<div class="order-meta">Нэмэлт хямдрал: −${fmtMoney(pr.manualDiscount)}</div>` : ''}
      <div class="order-foot">
        <span class="order-sub">Түрээс: ${fmtMoney(pr.rental)} · Барьцаа: ${fmtMoney(pr.deposit)}</span>
        <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;justify-content:flex-end;">
          ${canManage ? `
            ${(o.status || 'Шинэ') === 'Шинэ' && canConfirm ? `<button class="btn btn-primary" data-order-confirm="${escapeHtml(o.order_no)}" style="padding:4px 12px;font-size:12px;">✓ Гүйлгээ амжилттай</button>` : ''}
            ${(o.status || 'Шинэ') === 'Шинэ' ? `<button class="btn" data-order-edit="${escapeHtml(o.order_no)}" style="padding:4px 12px;font-size:12px;">✎ Засах</button>` : ''}
            <label class="order-status-sel">Статус:
              <select data-order-status="${escapeHtml(o.order_no)}">${opts}</select>
            </label>
          ` : (orderStage(o.status).next ? `<button class="btn btn-primary" data-order-advance="${escapeHtml(o.order_no)}" data-next="${escapeHtml(orderStage(o.status).next)}" style="padding:6px 16px;">${orderStage(o.status).label}</button>` : '<span class="order-sub">—</span>')}
        </div>
      </div>
    </div>`;
  }).join('');
  return topbar + `<div class="orders-wrap">${cards}</div>`;
}

function attachOrdersHandlers() {
  document.querySelectorAll('select[data-order-status]').forEach(sel => {
    sel.onchange = (e) => {
      const order_no = e.currentTarget.dataset.orderStatus;
      updateOrderStatus(order_no, { status: e.currentTarget.value });
    };
  });
  document.getElementById('new-mevent-order')?.addEventListener('click', () => openNewMeventOrder());
  document.querySelectorAll('button[data-order-edit]').forEach(btn => {
    btn.addEventListener('click', () => {
      const o = state.orders.find(x => x.order_no === btn.dataset.orderEdit);
      if (o) openNewMeventOrder(o);
    });
  });
  document.querySelectorAll('button[data-order-confirm]').forEach(btn => {
    btn.addEventListener('click', () => confirmOrderPayment(btn.dataset.orderConfirm));
  });
  // Дараагийн шат руу шилжүүлэх (ажилтан зөвхөн өөрийн алхмаа дарна)
  document.querySelectorAll('button[data-order-advance]').forEach(btn => {
    btn.addEventListener('click', () => {
      const next = btn.dataset.next;
      withBusy(btn, () => updateOrderStatus(btn.dataset.orderAdvance, { status: next }), { successText: next });
    });
  });
}

/* Монгол хэлтэй огнооны календар — readonly input дээр дарахад inline panel нээгдэнэ.
   hiddenEl.value = YYYY-MM-DD (логикт), displayEl нь монголоор харуулна. */
function mountCalendar(displayEl, hiddenEl, popEl, onChange, initial) {
  const WD = ['Да', 'Мя', 'Лх', 'Пү', 'Ба', 'Бя', 'Ня'];
  const today = new Date();
  let view = new Date(today.getFullYear(), today.getMonth(), 1);
  let selected = null;
  const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const human = (d) => `${d.getFullYear()} оны ${d.getMonth() + 1}-р сарын ${d.getDate()}`;
  if (initial && /^\d{4}-\d{2}-\d{2}/.test(initial)) {
    const p = initial.slice(0, 10).split('-').map(Number);
    selected = new Date(p[0], p[1] - 1, p[2]);
    view = new Date(p[0], p[1] - 1, 1);
    hiddenEl.value = iso(selected);
    displayEl.value = human(selected);
  }
  function render() {
    const y = view.getFullYear(), mo = view.getMonth();
    const startOff = (new Date(y, mo, 1).getDay() + 6) % 7; // Даваа = 0
    const days = new Date(y, mo + 1, 0).getDate();
    let cells = '';
    for (let i = 0; i < startOff; i++) cells += '<div class="mc-cell empty"></div>';
    for (let d = 1; d <= days; d++) {
      const cur = new Date(y, mo, d);
      const wknd = [0, 6].includes(cur.getDay());
      const cls = ['mc-cell', 'day', wknd ? 'weekend' : '', iso(cur) === iso(today) ? 'today' : '', selected && iso(cur) === iso(selected) ? 'sel' : ''].filter(Boolean).join(' ');
      cells += `<div class="${cls}" data-d="${d}">${d}</div>`;
    }
    popEl.innerHTML = `
      <div class="mc-head">
        <button type="button" class="mc-nav" data-nav="-1">‹</button>
        <span class="mc-title">${y} оны ${mo + 1}-р сар</span>
        <button type="button" class="mc-nav" data-nav="1">›</button>
      </div>
      <div class="mc-grid">${WD.map(w => `<div class="mc-cell wd">${w}</div>`).join('')}</div>
      <div class="mc-grid">${cells}</div>`;
  }
  displayEl.addEventListener('click', () => {
    const open = popEl.style.display !== 'none';
    document.querySelectorAll('.mc-pop').forEach(p => { p.style.display = 'none'; });
    if (!open) { render(); popEl.style.display = 'block'; }
  });
  popEl.addEventListener('click', (e) => {
    const nav = e.target.closest('.mc-nav');
    if (nav) { view.setMonth(view.getMonth() + Number(nav.dataset.nav)); render(); return; }
    const cell = e.target.closest('.mc-cell.day');
    if (cell) {
      selected = new Date(view.getFullYear(), view.getMonth(), Number(cell.dataset.d));
      hiddenEl.value = iso(selected);
      displayEl.value = human(selected);
      popEl.style.display = 'none';
      if (typeof onChange === 'function') onChange();
    }
  });
  document.addEventListener('mousedown', (e) => {
    if (!popEl.parentElement) return; // modal хаагдсан
    if (popEl.style.display === 'none') return;
    if (!e.target.closest('.mcal')) popEl.style.display = 'none';
  });
}

/* Вэбсайт шиг бүрэн захиалга гараар үүсгэх (үйлчлүүлэгч + бараа + дүн) →
   /webhook/m-event-site-order руу илгээж MEVENT_Orders_DB-д "Шинэ" төлөвтэй нэмнэ. */
function openNewMeventOrder(editOrder) {
  const isEdit = !!editOrder;
  const products = state.products || [];
  let items = isEdit && Array.isArray(editOrder.items) && editOrder.items.length
    ? editOrder.items.map(it => ({ name: it.name || '', qty: Number(it.qty) || 1, price: Number(it.price) || 0, deposit: Number(it.deposit) || 0 }))
    : [{ name: '', qty: 1, price: 0, deposit: 0 }];
  let manualDeposit = isEdit ? true : null; // edit үед барьцааг хадгалсан утгаар нь авна
  const hourOpts = Array.from({ length: 24 }, (_, h) => {
    const hh = String(h).padStart(2, '0');
    return `<option value="${hh}">${hh}:00</option>`;
  }).join('');
  // edit үед огноо/цаг задлах ("2026-06-03 09:00")
  const parseDT = (s) => { const m = String(s || '').match(/(\d{4}-\d{2}-\d{2})(?:[ T](\d{2}))?/); return { date: m ? m[1] : '', hour: m && m[2] ? m[2] : '' }; };
  const sDT = parseDT(editOrder?.date_start), eDT = parseDT(editOrder?.date_end);

  const old = document.getElementById('mev-order-modal');
  if (old) old.remove();
  const modal = document.createElement('div');
  modal.className = 'modal-bg';
  modal.id = 'mev-order-modal';
  modal.innerHTML = `
    <div class="modal" style="max-width:560px;">
      <h2>${isEdit ? 'Захиалга засах · ' + escapeHtml(editOrder.order_no) : 'Шинэ захиалга'}</h2>
      <p style="font-size:12px;color:var(--muted);margin:0 0 14px;">${isEdit ? 'Зөвхөн "Шинэ" төлөвт засах боломжтой.' : 'Сайтын захиалга шиг — үйлчлүүлэгч, бараа, дүн. "Шинэ" төлөвтэй бүртгэгдэнэ.'}</p>
      <label>Үйлчлүүлэгчийн нэр *</label>
      <input id="mo-name" placeholder="Жишээ: Анхил Group" />
      <div style="display:flex;gap:8px;">
        <div style="flex:1;"><label>Утас</label><input id="mo-phone" inputmode="tel" placeholder="99112233" /></div>
        <div style="flex:1;"><label>Байгууллага</label><input id="mo-company" placeholder="ХХК нэр" /></div>
      </div>
      <div style="display:flex;gap:8px;">
        <div style="flex:1;"><label>Регистр</label><input id="mo-register" placeholder="РД" /></div>
        <div style="flex:1;"><label>И-мэйл</label><input id="mo-email" placeholder="имэйл" /></div>
      </div>
      <label>Хаяг / газар</label>
      <input id="mo-address" placeholder="Хан-Уул, Restaurant XYZ" />
      <div style="display:flex;gap:8px;">
        <div style="flex:1;min-width:0;"><label>Эхлэх</label>
          <div style="display:flex;gap:4px;align-items:flex-start;">
            <div class="mcal" style="flex:1;min-width:0;position:relative;">
              <input type="text" class="mcal-display" id="mo-start-disp" readonly placeholder="Огноо сонгох" style="width:100%;cursor:pointer;" />
              <input type="hidden" id="mo-start-date" />
              <div class="mc-pop" id="mo-start-pop" style="display:none;"></div>
            </div>
            <select id="mo-start-hour" style="width:80px;flex:none;">${hourOpts}</select>
          </div>
        </div>
        <div style="flex:1;min-width:0;"><label>Дуусах</label>
          <div style="display:flex;gap:4px;align-items:flex-start;">
            <div class="mcal" style="flex:1;min-width:0;position:relative;">
              <input type="text" class="mcal-display" id="mo-end-disp" readonly placeholder="Огноо сонгох" style="width:100%;cursor:pointer;" />
              <input type="hidden" id="mo-end-date" />
              <div class="mc-pop" id="mo-end-pop" style="display:none;"></div>
            </div>
            <select id="mo-end-hour" style="width:80px;flex:none;">${hourOpts}</select>
          </div>
        </div>
      </div>
      <label style="margin-top:10px;">Бараа</label>
      <div id="mo-items"></div>
      <datalist id="mo-prod-list"></datalist>
      <button class="btn" id="mo-add-item" style="margin-top:6px;">+ Бараа нэмэх</button>
      <label style="margin-top:12px;">Нийт барьцаа (₮)</label>
      <input id="mo-deposit" type="number" min="0" placeholder="0" />
      <label style="margin-top:10px;">Нэмэлт хямдрал (₮)</label>
      <input id="mo-discount" type="number" min="0" placeholder="0" />
      <p style="font-size:11px;color:var(--muted);margin:8px 0 0;">Бүх үнэ НӨАТ-тэй. Барааны үнэ каталогоос автомат (захиалга дотор засагдахгүй).</p>
      <label style="display:flex;align-items:center;gap:8px;margin-top:6px;font-weight:400;cursor:pointer;">
        <input type="checkbox" id="mo-vat" style="width:18px;height:18px;" /> НӨАТ хасах (түрээсийн үнээс −5%)
      </label>
      <label style="margin-top:12px;">Тэмдэглэл</label>
      <textarea id="mo-note" placeholder="Хүргэлт, тоног, нэмэлт..."></textarea>
      <div id="mo-totals" style="margin-top:12px;padding:10px 12px;background:var(--panel-hover);border-radius:8px;font-size:13px;"></div>
      <div class="modal-actions" style="margin-top:16px;">
        <button class="btn" id="mo-cancel">Болих</button>
        <button class="btn btn-primary" id="mo-save">${isEdit ? '💾 Хадгалах' : 'Захиалга үүсгэх'}</button>
      </div>
    </div>`;
  document.body.appendChild(modal);
  modal.querySelector('#mo-start-hour').value = (isEdit && sDT.hour) ? sDT.hour : '09';
  modal.querySelector('#mo-end-hour').value = (isEdit && eDT.hour) ? eDT.hour : '17';
  if (isEdit) {
    const set = (id, v) => { const el = modal.querySelector(id); if (el) el.value = v || ''; };
    set('#mo-name', editOrder.customer_name); set('#mo-phone', editOrder.phone);
    set('#mo-company', editOrder.company); set('#mo-register', editOrder.register);
    set('#mo-email', editOrder.email); set('#mo-address', editOrder.address);
    set('#mo-deposit', editOrder.deposit || '');
    // Note-оос гар хямдрал + цэвэр тэмдэглэлийг салгаж буцаан дүүргэнэ.
    const dm = String(editOrder.note || '').match(/Хямдрал \(гар\):\s*−?\s*([\d,]+)/);
    set('#mo-discount', dm ? dm[1].replace(/\D/g, '') : '');
    set('#mo-note', cleanOrderNote(editOrder.note));
    if (/НӨАТ/i.test(String(editOrder.note || ''))) { const v = modal.querySelector('#mo-vat'); if (v) v.checked = true; }
  }
  mountCalendar(modal.querySelector('#mo-start-disp'), modal.querySelector('#mo-start-date'), modal.querySelector('#mo-start-pop'), () => renderTotals(), isEdit ? sDT.date : '');
  mountCalendar(modal.querySelector('#mo-end-disp'), modal.querySelector('#mo-end-date'), modal.querySelector('#mo-end-pop'), () => renderTotals(), isEdit ? eDT.date : '');

  const itemsEl = modal.querySelector('#mo-items');
  const totalsEl = modal.querySelector('#mo-totals');
  const depositEl = modal.querySelector('#mo-deposit');
  const findProd = (name) => products.find(p => (p.name || '') === name);

  const autoDeposit = () => items.reduce((s, it) => s + (Number(it.deposit) || 0) * (Number(it.qty) || 0), 0);
  function syncAutoDeposit() { if (!manualDeposit) depositEl.value = autoDeposit() || ''; }
  const vatEl = modal.querySelector('#mo-vat');
  const startDateEl = modal.querySelector('#mo-start-date');
  const endDateEl = modal.querySelector('#mo-end-date');
  function orderDays() {
    // Түрээс эхэлсэн цагаас хойш 24 цаг = 1 хоног. Огноо + цагийг нийлүүлж бодно.
    const sd = startDateEl.value, ed = endDateEl.value;
    if (!sd || !ed) return 1;
    const sh = parseInt(modal.querySelector('#mo-start-hour')?.value, 10) || 0;
    const eh = parseInt(modal.querySelector('#mo-end-hour')?.value, 10) || 0;
    const start = new Date(`${sd}T${String(sh).padStart(2, '0')}:00:00`);
    const end = new Date(`${ed}T${String(eh).padStart(2, '0')}:00:00`);
    const diffMs = end - start;
    if (!(diffMs > 0)) return 1;
    return Math.max(1, Math.ceil(diffMs / 86400000 - 1e-9));   // 24ц=1, 35ц=2, 48ц=2
  }
  const discountEl = modal.querySelector('#mo-discount');
  function computeTotals() {
    const days = orderDays();
    // Түрээс = (барааны үнэ × тоо) × хоног
    const subtotal = items.reduce((s, it) => s + (Number(it.price) || 0) * (Number(it.qty) || 0), 0) * days;
    const deposit = Number(depositEl.value) || 0;
    // 2+ хоног түрээслэвэл түрээсийн үнээс 20% хямдрал
    const multiDayDiscount = days >= 2 ? Math.round(subtotal * 0.20) : 0;
    const afterMd = subtotal - multiDayDiscount;
    // НӨАТ хасалт — хямдарсан түрээсийн үнээс 5% (барьцаанаас хасагдахгүй)
    const vatDiscount = vatEl.checked ? Math.round(afterMd * 0.05) : 0;
    // Гар (нэмэлт) хямдрал — менежер тавина
    const manualDiscount = Math.max(0, Number(discountEl.value) || 0);
    const grand = Math.max(0, afterMd - vatDiscount - manualDiscount) + deposit;
    return { subtotal, deposit, days, multiDayDiscount, vatDiscount, manualDiscount, grand };
  }
  depositEl.addEventListener('input', () => { manualDeposit = depositEl.value.trim() !== ''; renderTotals(); });
  vatEl.addEventListener('change', () => renderTotals());
  discountEl.addEventListener('input', () => renderTotals());
  function renderItems() {
    itemsEl.innerHTML = items.map((it, i) => `
      <div class="mo-item-row" data-idx="${i}" style="display:flex;gap:6px;align-items:flex-start;margin-bottom:6px;">
        <div class="mo-name-wrap" style="flex:1;min-width:0;">
          <input class="mo-it-name" list="mo-prod-list" autocomplete="off" value="${escapeHtml(it.name || '')}" placeholder="Бараа хайх/бичих" style="width:100%;" />
        </div>
        <input class="mo-it-qty" type="number" min="1" value="${it.qty || 1}" style="width:56px;" title="Тоо" />
        <input class="mo-it-price" type="number" value="${it.price || 0}" style="width:104px;background:var(--panel-hover);color:var(--muted);cursor:not-allowed;" title="Каталогийн үнэ (засагдахгүй)" readonly tabindex="-1" />
        <button class="mo-it-rm" title="Хасах" style="background:none;border:none;color:var(--danger);font-size:18px;cursor:pointer;">×</button>
      </div>`).join('');
    syncAutoDeposit();
    renderTotals();
  }
  function renderTotals() {
    const t = computeTotals();
    totalsEl.innerHTML = `Түрээс: <b>${fmtMoney(t.subtotal)}</b> · Барьцаа: <b>${fmtMoney(t.deposit)}</b>`
      + (t.multiDayDiscount ? `<br>${t.days} хоногийн хямдрал (20%): <b style="color:var(--ok);">−${fmtMoney(t.multiDayDiscount)}</b>` : '')
      + (t.vatDiscount ? `<br>НӨАТ хасалт (5%): <b style="color:var(--danger);">−${fmtMoney(t.vatDiscount)}</b>` : '')
      + (t.manualDiscount ? `<br>Нэмэлт хямдрал: <b style="color:var(--ok);">−${fmtMoney(t.manualDiscount)}</b>` : '')
      + `<br>Нийт: <b style="color:var(--primary);">${fmtMoney(t.grand)}</b>`;
  }
  // Барааны жагсаалт — native <datalist> (утсан дээр найдвартай, бичсэн утга алга болохгүй).
  function fillProdList() {
    const dl = modal.querySelector('#mo-prod-list');
    if (!dl) return;
    dl.innerHTML = (products || []).map(p =>
      `<option value="${escapeHtml(p.name || '')}" label="${fmtMoney(Number(p.price) || 0)}"></option>`
    ).join('');
  }
  fillProdList();
  renderItems();

  itemsEl.addEventListener('input', (e) => {
    const row = e.target.closest('.mo-item-row'); if (!row) return;
    const i = +row.dataset.idx;
    if (e.target.classList.contains('mo-it-name')) {
      items[i].name = e.target.value;
      const p = findProd(e.target.value);
      if (p) { items[i].price = Number(p.price) || 0; items[i].deposit = Number(p.deposit) || 0;
        row.querySelector('.mo-it-price').value = items[i].price; }
    } else if (e.target.classList.contains('mo-it-qty')) {
      items[i].qty = Math.max(1, Number(e.target.value) || 1);
    } else if (e.target.classList.contains('mo-it-price')) {
      items[i].price = Number(e.target.value) || 0;
    }
    syncAutoDeposit();
    renderTotals();
  });
  itemsEl.addEventListener('click', (e) => {
    if (!e.target.classList.contains('mo-it-rm')) return;
    const i = +e.target.closest('.mo-item-row').dataset.idx;
    items.splice(i, 1);
    if (!items.length) items.push({ name: '', qty: 1, price: 0, deposit: 0 });
    renderItems();
  });
  // datalist-аас сонгоход 'change' мөн биелнэ — үнэ/барьцааг шинэчилнэ.
  itemsEl.addEventListener('change', (e) => {
    if (!e.target.classList.contains('mo-it-name')) return;
    const row = e.target.closest('.mo-item-row'); if (!row) return;
    const i = +row.dataset.idx;
    items[i].name = e.target.value;
    const p = findProd(e.target.value);
    if (p) { items[i].price = Number(p.price) || 0; items[i].deposit = Number(p.deposit) || 0;
      row.querySelector('.mo-it-price').value = items[i].price; }
    syncAutoDeposit();
    renderTotals();
  });
  modal.querySelector('#mo-add-item').addEventListener('click', () => {
    items.push({ name: '', qty: 1, price: 0, deposit: 0 });
    renderItems();
  });
  const close = () => modal.remove();
  modal.querySelector('#mo-cancel').addEventListener('click', close);
  modal.addEventListener('click', (e) => { if (e.target === modal) close(); });
  modal.querySelector('#mo-save').addEventListener('click', (e) => {
    submitNewMeventOrder(modal, items, computeTotals(), e.currentTarget, editOrder);
  });

  modal.classList.add('open');
  setTimeout(() => modal.querySelector('#mo-name')?.focus(), 50);
}

async function submitNewMeventOrder(modal, items, totals, btn, editOrder) {
  const val = (id) => (modal.querySelector(id)?.value || '').trim();
  const name = val('#mo-name');
  if (!name) { showToast('Үйлчлүүлэгчийн нэр шаардлагатай', 'warn'); return; }
  const cleanItems = items.filter(it => (it.name || '').trim() && (Number(it.qty) || 0) > 0);
  if (!cleanItems.length) { showToast('Дор хаяж нэг бараа нэмнэ үү', 'warn'); return; }
  const sd = val('#mo-start-date'), ed = val('#mo-end-date');
  const sh = val('#mo-start-hour') || '09', eh = val('#mo-end-hour') || '17';
  const start = sd ? `${sd} ${sh}:00` : '';
  const end = ed ? `${ed} ${eh}:00` : '';
  // Хоногийг computeTotals-тэй ижил 24ц логикоор (totals.days) авна — давхар буруу тооцоо хийхгүй.
  const days = (sd && ed) ? (totals.days || '') : '';
  const vatOff = !!modal.querySelector('#mo-vat')?.checked;
  // Хэрэглэгчийн note-оос өмнө автоматаар нэмсэн хямдрал/НӨАТ мөрийг арилгаад (давхардахаас сэргийлж) дахин нэмнэ.
  let note = cleanOrderNote(val('#mo-note'));
  if (totals.multiDayDiscount) note = (note ? note + ' · ' : '') + `${totals.days} хоногийн хямдрал (−20% = ${fmtMoney(totals.multiDayDiscount)})`;
  if (vatOff) note = (note ? note + ' · ' : '') + `НӨАТ хасав (−5% = ${fmtMoney(totals.vatDiscount || 0)})`;
  if (totals.manualDiscount) note = (note ? note + ' · ' : '') + `Хямдрал (гар): −${fmtMoney(totals.manualDiscount)}`;
  btn.disabled = true;

  // ── EDIT — бүрэн мөрийг /webhook/mevent-orders руу update хийнэ ──
  if (editOrder) {
    const updated = {
      ...editOrder,
      customer_name: name, phone: val('#mo-phone'), address: val('#mo-address'),
      email: val('#mo-email'), company: val('#mo-company'), register: val('#mo-register'),
      date_start: start, date_end: end, days,
      items: cleanItems, subtotal: totals.subtotal, deposit: totals.deposit, total: totals.grand,
      note,
    };
    const idx = state.orders.findIndex(x => x.order_no === editOrder.order_no);
    if (idx >= 0) state.orders[idx] = updated;
    try {
      const r = await fetchWithTimeout(withKey(state.config.ordersUrl || DEFAULT_ORDERS_URL), {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orderToWire(updated)),
      }, 15000);
      if (!r.ok) throw new Error('HTTP ' + r.status);
      showToast('Захиалга шинэчлэгдлээ', 'success', 2500);
      modal.remove();
      render();
      loadOrders();
    } catch (e) { showToast('Алдаа: ' + e.message, 'error', 4000); btn.disabled = false; }
    return;
  }

  // ── NEW — сайттай ижил capture webhook ──
  const payload = {
    customer: { name, phone: val('#mo-phone'), address: val('#mo-address'), email: val('#mo-email'), company: val('#mo-company'), register: val('#mo-register') },
    dates: { start, end },
    totals: { days, subtotal: totals.subtotal, deposit: totals.deposit, grand: totals.grand },
    items: cleanItems,
    note,
    source: 'app',
  };
  const base = state.config.ordersUrl || DEFAULT_ORDERS_URL;
  const captureUrl = base.replace(/\/[^/]+$/, '/m-event-site-order');
  try {
    const r = await fetchWithTimeout(withKey(captureUrl), {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }, 15000);
    if (!r.ok) throw new Error('HTTP ' + r.status);
    showToast('Захиалга үүсгэгдлээ', 'success', 2500);
    modal.remove();
    loadOrders();
  } catch (e) {
    showToast('Алдаа: ' + e.message, 'error', 4000);
    btn.disabled = false;
  }
}

// Мөнгөн дүн форматлагч (₮). fmt-тэй давхцахгүй, орон тусгаарлана.
function fmtMoney(n) {
  return new Intl.NumberFormat('mn-MN').format(Math.round(Number(n) || 0)) + '₮';
}

/* ─── M-Event Бараа (backoffice) ────────────────────────────
   Барааны үнэ/нөөц/нэр засах + шинэ бараа нэмэх. Эх сурвалж: MEVENT_Orders_DB `products` tab.
   Засвар нь n8n-ээр Sheet-д хадгалагдаж, сайт (m-event-website) шууд тэр өгөгдлийг уншина.
   Зөвхөн CEO. */
async function loadProductsCatalog() {
  if (!canManageOrders()) return;   // order manager-д бараа сонгох форм хэрэгтэй
  const url = state.config.productsUrl;
  if (!url) return;
  try {
    const r = await fetchWithTimeout(withKey(url + '?t=' + Date.now()), { headers: { 'Accept': 'application/json' } }, 15000);
    if (!r.ok) throw new Error('HTTP ' + r.status);
    const data = await r.json();
    state.products = Array.isArray(data) ? data : (data.products || []);
    try { localStorage.setItem('mevProducts', JSON.stringify(state.products)); } catch(e) {}
    if (typeof render === 'function') render();
  } catch(e) { console.warn('loadProductsCatalog fail', e); }
}

async function saveProduct(product) {
  const url = state.config.productsUrl;
  const idx = state.products.findIndex(p => p.id === product.id);
  if (idx >= 0) state.products[idx] = { ...state.products[idx], ...product };
  else state.products.unshift(product);
  render();
  if (!url) return;
  try {
    const r = await fetchWithTimeout(withKey(url), {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ product }),
    }, 15000);
    if (!r.ok) throw new Error('HTTP ' + r.status);
    showToast('Бараа хадгалагдлаа', 'success', 1500);
    loadProductsCatalog();
  } catch(e) { showToast('Алдаа: ' + e.message, 'error'); }
}

function productRowHtml(p) {
  const img = p.photo
    ? `<img src="${escapeHtml(p.photo)}" loading="lazy" onerror="this.style.visibility='hidden'">`
    : '<div class="ph">📦</div>';
  const search = `${p.name || ''} ${p.category || ''} ${p.sku || ''}`.toLowerCase();
  return `<div class="prod-row" data-id="${escapeHtml(p.id)}" data-search="${escapeHtml(search)}">
    <div class="prod-img">${img}</div>
    <div class="prod-main">
      <input class="prod-name" data-f="name" value="${escapeHtml(p.name || '')}">
      <div class="prod-sub">${escapeHtml(p.category || '—')} · SKU ${escapeHtml(p.sku || '—')}</div>
    </div>
    <label class="prod-fld">Үнэ<input type="number" data-f="price" value="${Number(p.price) || 0}"></label>
    <label class="prod-fld">Барьцаа<input type="number" data-f="deposit" value="${Number(p.deposit) || 0}"></label>
    <label class="prod-fld sm">Нөөц<input type="number" data-f="stock" value="${Number(p.stock) || 0}"></label>
    <button class="btn prod-save" data-id="${escapeHtml(p.id)}">Хадгалах</button>
  </div>`;
}

/* ===================== ЦАГИЙН ЦАЛИН (hourly payroll) =====================
   Цагийн ажилчдын цалинг менежер ажил дуусахад өдрийн хөлс × хоногоор ГАРААР
   оруулж, компанийн Хаан банкны тусдаа "цагийн ажилтны данс"-наас шилжүүлнэ.
   Бүртгэлд хугацаа/хөлс шаардахгүй. Энэ view хэнд хэдэн төгрөг шилжүүлснийг
   (хэн/хэзээ) бүртгэж хянана. Бичилт — одоо байгаа finance webhook руу
   (нэмэлт schema хэрэггүй): purpose "Цагийн цалин · <нэр> · <огноо>". */
const HOURLY_FUND_LABEL = 'Цагийн ажилтны данс · Хаан банк';

// Цагийн цалин харах эрхтэй утаснууд (+ CEO үргэлж). Утсаар тааруулна.
const HOURLY_VIEWERS = ['86657676','88028216','99337760','88394636','99179417','80535220','99285468','89904109'];
function canSeeHourlyPayroll() {
  if (isDailyWorker()) return false;
  if (state.isCEO) return true;
  if (isFinanceAccountant()) return true;  // туслах нягтлан — цагийн цалин гүйцэтгэдэг тул заавал харна
  const myPhone = String((state.user && state.user.phone) || state.me || '').replace(/\D/g, '');
  return !!myPhone && HOURLY_VIEWERS.some(p => myPhone.endsWith(p));
}
function hourlyWorkers() {
  // Бүх цагийн ажилтан — салбар/идэвхтэй эсэхээс үл хамаарна (ad-hoc дуудаж ажиллуулдаг).
  return (TEAM || []).filter(m => m.worker_type === 'daily');
}
// Тухайн ажилтанд хийсэн БҮХ цагийн цалингийн шилжүүлэг (нэрээр, шинэ нь эхэнд).
function hourlyPayouts(m) {
  const nm = (m.name || '').trim();
  return (state.financeRequests || []).filter(r =>
    r.status !== 'deleted' &&
    /^Цагийн цалин ·/.test(r.purpose || '') &&
    (r.beneficiary || '').trim() === nm
  );
}

// Цагийн ажилтны салбар (M Event / NOMAAD / Бусад) — group/branches талбараас.
function hourlyBranchLabel(m) {
  const g = String((m.branches && m.branches[0]) || m.group || m.branch || '').toLowerCase().trim();
  if (g === 'm-event' || g === 'mevent' || g.includes('event') || g.includes('ивент') || g.includes('эвент')) return 'M Event';
  if (g === 'camp' || g.includes('camp') || g.includes('кемп') || g.includes('номаад') || g.includes('nomaad')) return 'NOMAAD';
  return 'Бусад';
}

function renderHourly() {
  const workers = hourlyWorkers();
  if (!workers.length) {
    return `<div class="orders-empty"><div class="icon">👷</div>
      <div>Цагийн ажилтан алга.</div>
      <div class="sub">Цагийн ажилтан "+ Шинэ ажилтан"-аар бүртгэгдэхэд энд харагдана.</div></div>`;
  }
  const sortMode = state.hourlySort || 'recent';
  // Ажилтан бүрийн цалингийн статистик — цалин авсан огноо = "хэзээ ажилласны" прокси
  // (тусгай ажилласан огноо хадгалагддаггүй тул шилжүүлгийн огноог ашиглана).
  const payDate = (p) => p.executed_at || p.requested_at || '';
  const statOf = (m) => {
    const ps = hourlyPayouts(m);
    const sum = ps.reduce((s, r) => s + (Number(r.amount) || 0), 0);
    const dates = ps.map(payDate).filter(Boolean).sort();
    const last = dates[dates.length - 1] || '';
    return { ps, sum, count: ps.length, first: dates[0] || '', last, lastTs: last ? new Date(last).getTime() : 0 };
  };
  const stats = new Map(workers.map(m => [personKey(m), statOf(m)]));
  let totalPaid = 0;
  workers.forEach(m => { totalPaid += stats.get(personKey(m)).sum; });
  const rowHtml = (m) => {
    const key = personKey(m);
    const st = stats.get(key) || { ps: [], sum: 0, count: 0, first: '', last: '' };
    const payouts = st.ps;
    const sum = st.sum;
    // Initials default; зураг ачаалагдвал дээр нь харагдана, алдвал (onerror) initials үлдэнэ.
    const avatar = `<span style="position:relative;width:42px;height:42px;border-radius:50%;background:var(--panel-hover);display:inline-flex;align-items:center;justify-content:center;font-size:14px;font-weight:700;color:var(--muted);flex-shrink:0;overflow:hidden;">${escapeHtml(memberInitials(key))}${m.photo ? `<img src="${escapeHtml(driveThumbUrl(m.photo, 96))}" alt="" loading="lazy" decoding="async" onerror="this.style.display='none'" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover;">` : ''}</span>`;
    const bankLine = (m.bank || m.bank_account)
      ? `${escapeHtml(m.bank || '')}${m.bank_account ? ' · ' + escapeHtml(m.bank_account) : ''}`
      : '<span style="color:var(--danger)">банк бүртгэгдээгүй</span>';
    // Авсан нийт цалин + шилжүүлэг бүрийг (дүн · огноо) тусдаа мөрөөр доош
    const paidLine = sum > 0
      ? `<div style="margin-top:4px;">
           <div style="font-size:12px;font-weight:600;color:var(--ok);">Авсан нийт: ${fmtMoney(sum)}</div>
           ${payouts.map(p => `<div style="font-size:11px;color:var(--muted);margin-top:1px;">· ${fmtMoney(Number(p.amount) || 0)} · ${escapeHtml(fmtDateTimeUB(p.executed_at || p.requested_at || ''))}</div>`).join('')}
         </div>`
      : '';
    const rlist = ratingsForWorker(m);
    const ratingLine = `<div style="margin-top:4px;">${starsRow(avgStars(rlist), rlist.length)}</div>`;
    const lastNote = rlist.slice().sort((a, b) => String(b.ts).localeCompare(String(a.ts))).find(r => (r.note || '').trim());
    const noteLine = lastNote
      ? `<div style="font-size:11.5px;color:var(--text-soft);margin-top:2px;font-style:italic;">“${escapeHtml(lastNote.note)}” — ${escapeHtml(lastNote.rater_name || '')}</div>`
      : '';
    // Ажилласан хугацаа (цалингийн идэвхээр) — анх/сүүлд цалин авсан огноо
    const spanLine = st.count
      ? `<div style="font-size:11.5px;color:var(--text-soft);margin-top:3px;">🕒 ${st.count > 1 ? 'Анх ' + escapeHtml(String(st.first).slice(0, 10)) + ' · ' : ''}Сүүлд <b>${escapeHtml(String(st.last).slice(0, 10))}</b> · ${st.count} удаа</div>`
      : `<div style="font-size:11.5px;color:var(--muted);margin-top:3px;">🕒 Цалин аваагүй</div>`;
    const nameKey = escapeHtml(String(m.name || '').toLowerCase());
    const phoneKey = escapeHtml(String(m.phone || '').replace(/\D/g, ''));
    return `<div data-hourly-name="${nameKey}" data-hourly-phone="${phoneKey}" style="display:flex;justify-content:space-between;align-items:center;gap:12px;padding:12px 14px;border:1px solid var(--border);border-radius:10px;margin-bottom:8px;background:var(--card);">
      <div style="display:flex;align-items:center;gap:12px;min-width:0;">
        ${avatar}
        <div style="min-width:0;">
          <div><b>${escapeHtml(m.name || '')}</b> <span style="font-size:11px;color:var(--muted);">${escapeHtml(m.role || 'цагийн ажилтан')}</span></div>
          <div style="font-size:12px;color:var(--text-soft);margin-top:3px;">📞 ${escapeHtml(m.phone || '-')} · ${bankLine}</div>
          ${spanLine}
          ${ratingLine}
          ${noteLine}
          ${paidLine}
        </div>
      </div>
      <div style="flex-shrink:0;display:flex;flex-direction:column;gap:6px;">
        <button class="btn btn-primary" data-hourly-pay="${escapeHtml(key)}" style="padding:5px 14px;font-size:12px;">Цалин шилжүүлэх</button>
        <button class="btn" data-hourly-rate="${escapeHtml(key)}" style="padding:5px 14px;font-size:12px;">★ Үнэлгээ өгөх</button>
      </div>
    </div>`;
  };
  // Сонгосон эрэмбийн comparator (бүлэг тус бүрд хэрэглэнэ)
  const cmp = {
    recent: (a, b) => (stats.get(personKey(b)).lastTs - stats.get(personKey(a)).lastTs) || String(a.name || '').localeCompare(String(b.name || ''), 'mn'),
    name:   (a, b) => String(a.name || '').localeCompare(String(b.name || ''), 'mn'),
    paid:   (a, b) => (stats.get(personKey(b)).sum - stats.get(personKey(a)).sum) || String(a.name || '').localeCompare(String(b.name || ''), 'mn'),
  }[sortMode] || ((a, b) => 0);
  // Салбараар бүлэглэх — M Event / NOMAAD / Бусад (бүлэг бүрийг сонгосон эрэмбээр)
  const groups = { 'M Event': [], 'NOMAAD': [], 'Бусад': [] };
  workers.forEach(m => { (groups[hourlyBranchLabel(m)] || groups['Бусад']).push(m); });
  const sections = ['M Event', 'NOMAAD', 'Бусад']
    .filter(k => groups[k].length)
    .map(k => {
      groups[k].sort(cmp);
      return `<div data-hourly-group="${escapeHtml(k)}" style="font-size:12px;font-weight:700;color:var(--text-soft);text-transform:uppercase;letter-spacing:.04em;margin:16px 0 8px;">${k} · ${groups[k].length}</div>` + groups[k].map(rowHtml).join('');
    })
    .join('');
  const header = `<div style="margin-bottom:8px;padding:14px;border:1px solid var(--border);border-radius:10px;background:var(--bg-soft,var(--card));">
    <div style="font-size:13px;">Нийт шилжүүлсэн: <b style="color:var(--ok)">${fmtMoney(totalPaid)}</b> · ${workers.length} цагийн ажилтан</div>
    <div style="font-size:11px;color:var(--muted);margin-top:4px;">Эх үүсвэр: <b>${HOURLY_FUND_LABEL}</b>. Менежер өдрийн хөлс × хоногоор гараар оруулж шилжүүлнэ.</div>
  </div>`;
  // Хайлт + эрэмбийн хяналт
  const controls = `<div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:6px;">
    <input id="hourly-search" type="text" placeholder="🔍 Нэрээр хайх..." value="${escapeHtml(state.hourlySearch || '')}" style="flex:1;min-width:160px;padding:8px 12px;border:1px solid var(--border);border-radius:8px;background:var(--panel);color:var(--text);font-size:13px;" />
    <select id="hourly-sort" style="padding:8px 12px;border:1px solid var(--border);border-radius:8px;background:var(--panel);color:var(--text);font-size:13px;cursor:pointer;">
      <option value="recent">🕒 Сүүлд ажилласан</option>
      <option value="name">🔤 Нэрээр</option>
      <option value="paid">💰 Их цалинтай</option>
    </select>
  </div>`;
  const emptyMsg = `<div id="hourly-empty-search" style="display:none;text-align:center;color:var(--muted);padding:24px;">Хайлтад тохирох ажилтан алга.</div>`;
  return header + controls + emptyMsg + sections;
}

// Хайлтын текстээр цагийн ажилтны мөрүүдийг шүүх (re-render хийхгүй — фокус хадгалагдана).
function applyHourlySearch() {
  const q = (state.hourlySearch || '').trim().toLowerCase();
  const qDigits = q.replace(/\D/g, '');
  const rows = document.querySelectorAll('[data-hourly-name]');
  let anyVisible = false;
  rows.forEach(r => {
    const nm = r.getAttribute('data-hourly-name') || '';
    const ph = r.getAttribute('data-hourly-phone') || '';
    const match = !q || nm.includes(q) || (!!qDigits && ph.includes(qDigits));
    r.style.display = match ? '' : 'none';
    if (match) anyVisible = true;
  });
  // Бүлгийн гарчгийг — доор нь харагдах мөр байгаа эсэхээр нуух
  document.querySelectorAll('[data-hourly-group]').forEach(h => {
    let n = h.nextElementSibling, vis = false;
    while (n && !n.hasAttribute('data-hourly-group')) {
      if (n.hasAttribute('data-hourly-name') && n.style.display !== 'none') { vis = true; break; }
      n = n.nextElementSibling;
    }
    h.style.display = vis ? '' : 'none';
  });
  const empty = document.getElementById('hourly-empty-search');
  if (empty) empty.style.display = anyVisible ? 'none' : '';
}

function attachHourlyHandlers() {
  document.querySelectorAll('button[data-hourly-pay]').forEach(b => {
    b.addEventListener('click', () => markHourlyPaid(b.dataset.hourlyPay));
  });
  document.querySelectorAll('button[data-hourly-rate]').forEach(b => {
    b.addEventListener('click', () => submitHourlyRating(b.dataset.hourlyRate));
  });
  const sortEl = document.getElementById('hourly-sort');
  if (sortEl) {
    sortEl.value = state.hourlySort || 'recent';
    sortEl.onchange = () => { state.hourlySort = sortEl.value; render(); };
  }
  const searchEl = document.getElementById('hourly-search');
  if (searchEl) {
    searchEl.oninput = () => { state.hourlySearch = searchEl.value; applyHourlySearch(); };
  }
  applyHourlySearch();
}

/* ─── Цагийн ажилтны үнэлгээ (од + тэмдэглэл) ───
   Менежер бүр 1-5 од + тэмдэглэл өгнө. Бүх үнэлгээ түүх болж хадгалагдана.
   Ажилтан дээр дундаж од + сүүлийн тэмдэглэлүүд харагдана. Зөвхөн менежер/CEO. */
function ratingsForWorker(m) {
  const ph = String(m.phone || '').replace(/\D/g, '');
  const nm = (m.name || '').trim();
  return (state.hourlyRatings || []).filter(r => {
    const rph = String(r.worker_phone || '').replace(/\D/g, '');
    if (ph && rph) return ph === rph || ph.endsWith(rph) || rph.endsWith(ph);
    return (r.worker_name || '').trim() === nm;
  });
}
function avgStars(list) {
  if (!list || !list.length) return 0;
  return list.reduce((s, r) => s + (Number(r.stars) || 0), 0) / list.length;
}
function starsRow(avg, count) {
  const full = Math.round(avg);
  let s = '';
  for (let i = 1; i <= 5; i++) s += `<span style="color:${i <= full ? '#f5a623' : 'var(--border-strong)'};">★</span>`;
  return `<span class="hr-stars">${s}</span> <span style="font-size:12px;color:var(--muted);">${avg ? avg.toFixed(1) : '—'}${count ? ` · ${count} үнэлгээ` : ''}</span>`;
}
function ratingDedupKey(r) {
  return (r.ts || '') + '|' + (r.worker_phone || r.worker_name || '') + '|' + (r.rater_phone || r.rater_name || '');
}
async function loadHourlyRatings() {
  if (!canSeeHourlyPayroll()) return;
  const url = state.config.hourlyRatingUrl;
  if (!url) return;
  try {
    const r = await fetchWithTimeout(withKey(url + '?t=' + Date.now()), { headers: { 'Accept': 'application/json' } }, 12000);
    if (!r.ok) throw new Error('HTTP ' + r.status);
    const data = await r.json();
    const server = Array.isArray(data) ? data : (Array.isArray(data.ratings) ? data.ratings : []);
    // Локалд sync хийгдээгүй үнэлгээг алдахгүйн тулд merge (dedupe)
    let local = []; try { local = JSON.parse(localStorage.getItem('hourlyRatings') || '[]'); } catch (e) {}
    const seen = new Set(server.map(ratingDedupKey));
    const merged = [...server, ...local.filter(r => !seen.has(ratingDedupKey(r)))];
    state.hourlyRatings = merged;
    localStorage.setItem('hourlyRatings', JSON.stringify(merged));
    if (typeof render === 'function') render();
  } catch (e) { console.warn('loadHourlyRatings fail', e); }
}
// Од + тэмдэглэлийн модал. Үнэлгээ {stars, note} эсвэл null буцаана.
function openHourlyRatingModal(m) {
  return new Promise((resolve) => {
    const modal = document.getElementById('hourly-rating-modal');
    const starsEl = document.getElementById('hr-stars');
    const noteEl = document.getElementById('hr-note');
    const okBtn = document.getElementById('hr-ok');
    const cancelBtn = document.getElementById('hr-cancel');
    document.getElementById('hr-worker').textContent = (m.name || '') + ' · ' + (m.role || 'цагийн ажилтан');
    let chosen = 0;
    function paint() {
      starsEl.querySelectorAll('span[data-star]').forEach(sp => {
        sp.style.color = Number(sp.dataset.star) <= chosen ? '#f5a623' : 'var(--border-strong)';
      });
    }
    starsEl.innerHTML = [1, 2, 3, 4, 5].map(i =>
      `<span data-star="${i}" style="cursor:pointer;font-size:34px;line-height:1;color:var(--border-strong);">★</span>`
    ).join('');
    starsEl.querySelectorAll('span[data-star]').forEach(sp => {
      sp.onclick = () => { chosen = Number(sp.dataset.star); paint(); };
    });
    paint();
    noteEl.value = '';
    // Сүүлийн үнэлгээнүүдийн түүх
    const hist = ratingsForWorker(m).slice().sort((a, b) => String(b.ts).localeCompare(String(a.ts)));
    const histEl = document.getElementById('hr-history');
    histEl.innerHTML = hist.length
      ? `<div style="font-size:11px;font-weight:700;color:var(--text-soft);text-transform:uppercase;margin:12px 0 6px;">Өмнөх үнэлгээ (${hist.length})</div>` +
        hist.slice(0, 6).map(r => `<div style="padding:6px 0;border-top:1px solid var(--border);font-size:12.5px;">
          <span style="color:#f5a623;">${'★'.repeat(Number(r.stars) || 0)}</span><span style="color:var(--border-strong);">${'★'.repeat(5 - (Number(r.stars) || 0))}</span>
          <span style="color:var(--muted);font-size:11px;margin-left:6px;">${escapeHtml(r.rater_name || '')} · ${escapeHtml(fmtDateTimeUB(r.ts || ''))}</span>
          ${r.note ? `<div style="color:var(--text-soft);margin-top:2px;">${escapeHtml(r.note)}</div>` : ''}
        </div>`).join('')
      : '';
    function cleanup(result) { modal.classList.remove('open'); okBtn.onclick = null; cancelBtn.onclick = null; resolve(result); }
    okBtn.onclick = () => {
      if (!chosen) { showToast('Од сонгоно уу (1-5).', 'warn', 2000); return; }
      cleanup({ stars: chosen, note: (noteEl.value || '').trim() });
    };
    cancelBtn.onclick = () => cleanup(null);
    modal.classList.add('open');
  });
}
async function submitHourlyRating(workerKey) {
  const m = (typeof findMember === 'function' && findMember(workerKey)) || hourlyWorkers().find(x => personKey(x) === workerKey);
  if (!m) return;
  const res = await openHourlyRatingModal(m);
  if (!res) return;
  const rec = {
    ts: new Date().toISOString(),
    worker_name: m.name || '', worker_phone: String(m.phone || '').replace(/\D/g, ''),
    stars: res.stars, note: res.note || '',
    rater_name: (state.user && state.user.name) || memberName(state.me) || '',
    rater_phone: String((state.user && state.user.phone) || state.me || '').replace(/\D/g, ''),
  };
  state.hourlyRatings = [rec, ...(state.hourlyRatings || [])];
  localStorage.setItem('hourlyRatings', JSON.stringify(state.hourlyRatings));
  render();
  showToast(`${m.name}: ${res.stars}★ үнэлгээ хадгаллаа`, 'success', 2000);
  // Backend руу sync (best-effort). Амжилтгүй бол локалд үлдэж, дараа merge-р сэргэнэ.
  const url = state.config.hourlyRatingUrl;
  if (url) {
    try {
      const r = await fetchWithTimeout(withKey(url), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'add', ...rec }) }, 12000);
      if (!r.ok) throw new Error('HTTP ' + r.status);
    } catch (e) { showToast('Үнэлгээ локалд хадгалагдсан, sync дараа хийгдэнэ.', 'warn', 2500); }
  }
}

// Текст хуулах (банк апп руу paste хийхэд). Secure context-д clipboard API, эс бөгөөс fallback.
function copyText(text, okMsg) {
  text = String(text || '').trim();
  if (!text) { showToast('Хуулах зүйл алга', 'warn', 1500); return; }
  const done = () => showToast(okMsg || 'Хууллаа', 'success', 1500);
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text).then(done).catch(() => fallbackCopy(text, done));
  } else { fallbackCopy(text, done); }
}
function fallbackCopy(text, done) {
  try {
    const ta = document.createElement('textarea');
    ta.value = text; ta.style.position = 'fixed'; ta.style.top = '-1000px'; ta.style.opacity = '0';
    document.body.appendChild(ta); ta.focus(); ta.select();
    document.execCommand('copy'); document.body.removeChild(ta);
    done && done();
  } catch (e) { showToast('Хуулж чадсангүй', 'warn', 1500); }
}

// Цалин шилжүүлэх модал — данс/утга хуулах + өдрийн цалин × өдөр + эхэлсэн огноо. {rate,days,start} эсвэл null.
function openHourlyPayModal(m) {
  return new Promise((resolve) => {
    const modal = document.getElementById('hourly-pay-modal');
    const rateEl = document.getElementById('hp-rate');
    const daysEl = document.getElementById('hp-days');
    const startEl = document.getElementById('hp-start');
    const totalEl = document.getElementById('hp-total');
    const memoEl = document.getElementById('hp-memo');
    const okBtn = document.getElementById('hp-ok');
    const cancelBtn = document.getElementById('hp-cancel');
    const copyAcctBtn = document.getElementById('hp-copy-acct');
    const copyMemoBtn = document.getElementById('hp-copy-memo');
    document.getElementById('hp-worker').textContent = (m.name || '') + ' · ' + (m.role || 'цагийн ажилтан');
    document.getElementById('hp-bank').textContent = (m.bank || '—') + (m.bank_account ? ' · ' + m.bank_account : '');
    document.getElementById('hp-holder').textContent = m.bank_holder || m.name || '';
    const acct = String(m.bank_account || '').replace(/\s/g, '');
    rateEl.value = ''; daysEl.value = ''; startEl.value = new Date().toISOString().slice(0, 10);
    // Гүйлгээний утга: "Зарлага: Өдрийн цалин 2х К.Эрбол 06.05"
    const memoText = () => {
      const dPart = Number(daysEl.value) > 0 ? Number(daysEl.value) + 'х' : '';
      const md = (startEl.value || '').slice(5).replace('-', '.'); // YYYY-MM-DD → MM.DD
      return ['Зарлага: Өдрийн цалин', dPart, (m.name || ''), md].filter(Boolean).join(' ');
    };
    const upd = () => {
      totalEl.textContent = 'Дүн: ' + fmtMoney(Math.round((Number(rateEl.value) || 0) * (Number(daysEl.value) || 0)));
      memoEl.textContent = memoText();
    };
    rateEl.oninput = upd; daysEl.oninput = upd; startEl.oninput = upd; startEl.onchange = upd; upd();
    copyAcctBtn.onclick = () => copyText(acct, 'Данс хууллаа');
    copyMemoBtn.onclick = () => copyText(memoEl.textContent, 'Утга хууллаа');
    function cleanup(result) {
      modal.classList.remove('open');
      okBtn.onclick = null; cancelBtn.onclick = null; rateEl.oninput = null; daysEl.oninput = null;
      startEl.oninput = null; startEl.onchange = null; copyAcctBtn.onclick = null; copyMemoBtn.onclick = null;
      resolve(result);
    }
    okBtn.onclick = () => {
      const rate = Number(rateEl.value) || 0, days = Number(daysEl.value) || 0;
      if (rate <= 0) { showToast('Өдрийн цалинг оруулна уу.', 'warn', 2000); return; }
      if (days <= 0) { showToast('Ажилласан өдрийг оруулна уу.', 'warn', 2000); return; }
      cleanup({ rate, days, start: startEl.value || '' });
    };
    cancelBtn.onclick = () => cleanup(null);
    modal.classList.add('open');
    setTimeout(() => rateEl.focus(), 50);
  });
}

async function markHourlyPaid(workerKey) {
  const m = findMember(workerKey);
  if (!m) return;
  const res = await openHourlyPayModal(m);
  if (!res) return;
  const { rate, days, start } = res;
  const amount = Math.round(rate * days);
  if (!(await showConfirm(`${m.name}: ${fmtMoney(rate)} × ${days} өдөр = ${fmtMoney(amount)}\nЭхэлсэн: ${start || '-'}\n${HOURLY_FUND_LABEL}-наас шилжүүлснийг бүртгэх үү?`, { okText: 'Тийм, шилжүүлсэн' }))) return;
  const today = new Date().toISOString().slice(0, 10);
  const now = new Date().toISOString();
  const r = {
    id: 'HRLY_' + personKey(m) + '_' + today + '_' + Math.random().toString(36).slice(2, 6),
    requested_by: state.me,
    requested_at: now,
    amount,
    beneficiary: m.name || '',
    bank: m.bank || '',
    account_number: m.bank_account || '',
    purpose: `Цагийн цалин · ${m.name} · ${start || today}`,
    justification: `${m.role || 'цагийн ажилтан'} · ${fmtMoney(rate)} × ${days} өдөр · Эхэлсэн: ${start || '-'} · Эх үүсвэр: ${HOURLY_FUND_LABEL} · 📞 ${m.phone || '-'}`,
    due_date: start || today,
    category: 'Цалин',
    dept_branch: (m.branches && m.branches[0]) || 'shared',
    frequency: 'Нэг удаагийн',
    priority: 'med',
    status: 'done',
    decision: 'approved',
    decision_at: now,
    decision_by: state.me,
    decision_reason: 'Цагийн ажилтны цалин — менежер шилжүүлэв (' + HOURLY_FUND_LABEL + ')',
    executor: state.me,
    executed_at: now,
    executed_by: state.me,
    received_at: now,
    received_by: personKey(m),
    purchase_proof_url: '', payment_proof_url: '', purchase_receipt_url: '',
    purchase_proof_urls: [], purchase_receipt_urls: [],
  };
  state.financeRequests.unshift(r);
  await saveFinanceRequest(r);
  pushBroadcast(personKey(m), { type: 'salary_paid', title: 'Цалин шилжүүлэв', body: `${fmtMoney(amount)} таны дансанд шилжүүлэв.` });
  showToast(`${m.name} — ${fmtMoney(amount)} бүртгэлээ`, 'success', 2000);
  render();
}

/* ===================== NOMAAD ЗАХИАЛГА (батлагдсан гэрээ + орлого) =====================
   nomaad Quote Log-оос Төлөв=ГЭРЭЭ/ГЭРЭЭ БАТЛАГДСАН гэрээг Quote Items-тэй нь
   /nomaad-orders webhook-оор татна. Нийт төлбөрийг гараар оруулж орлого бүртгэнэ. */
// NOMAAD захиалга харах эрхтэй нэмэлт утаснууд: Анужин, Дэлгэрбат (+ CEO, нягтлан үргэлж).
const NOMAAD_VIEWERS = ['88028216', '99179417', '99337760'];  // Анужин, Дэлгэрбат, Батжаргал
const NOMAAD_VIEWER_NAMES = ['алтансүх'];  // нэрээр зөвшөөрөх (утас тодорхойгүй)
function canSeeNomaadOrders() {
  if (state.isCEO) return true;
  if (state.me === getFinanceExecutorEmail()) return true; // нягтлан
  const myPhone = String((state.user && state.user.phone) || state.me || '').replace(/\D/g, '');
  if (myPhone && NOMAAD_VIEWERS.some(p => myPhone.endsWith(p))) return true;
  const me = (typeof findMember === 'function') ? findMember(state.me) : null;
  const myName = String((me && me.name) || (state.user && state.user.name) || '').toLowerCase();
  return NOMAAD_VIEWER_NAMES.some(n => myName.includes(n));
}
async function loadNomaadOrders() {
  if (!canSeeNomaadOrders()) return;
  const url = state.config.nomaadOrdersUrl;
  if (!url) return;
  try {
    const r = await fetchWithTimeout(withKey(url + '?t=' + Date.now()), { headers: { 'Accept': 'application/json' } }, 15000);
    if (!r.ok) throw new Error('HTTP ' + r.status);
    const data = await r.json();
    state.nomaadOrders = Array.isArray(data.orders) ? data.orders : [];
    try { localStorage.setItem('nomaadOrders', JSON.stringify(state.nomaadOrders)); } catch(e) {}
    if (typeof render === 'function') render();
  } catch(e) { console.warn('loadNomaadOrders fail', e); }
}
// date_start-аас өнөөдрийг хүртэлх үлдсэн хоног (null = огноо алга/буруу)
function nomaadDaysLeft(dateStr) {
  if (!dateStr) return null;
  const m = String(dateStr).match(/(\d{4})\D+(\d{1,2})\D+(\d{1,2})/);
  if (!m) return null;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  const today = new Date(); today.setHours(0, 0, 0, 0);
  return Math.round((d - today) / 86400000);
}
// Эрэмбэлэх түлхүүр: ирээдүйн ойрхон эхэлнэ → өнгөрсөн → огноогүй хамгийн сүүлд
function nomaadSortKey(o) {
  const d = nomaadDaysLeft(o.date_start);
  if (d == null) return 1e9;
  if (d < 0) return 1e8 - d;   // өнгөрсөн (сүүлийнх нь эхэнд)
  return d;
}
// Огноог "2026-06-09 Ба" хэлбэрээр — гарагийн товчилсон нэртэйгээр буцаана
function nomaadDateWithDow(dateStr) {
  if (!dateStr) return '';
  const m = String(dateStr).match(/(\d{4})\D+(\d{1,2})\D+(\d{1,2})/);
  if (!m) return escapeHtml(dateStr);
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  const dow = ['Ня', 'Да', 'Мя', 'Лх', 'Пү', 'Ба', 'Бя'][d.getDay()];
  return `${escapeHtml(dateStr)} <span class="nomaad-dow">${dow}</span>`;
}
// Plain текст хувилбар (HTML биш — textContent/desc-д ашиглана)
function nomaadDatePlain(dateStr) {
  if (!dateStr) return '';
  const m = String(dateStr).match(/(\d{4})\D+(\d{1,2})\D+(\d{1,2})/);
  if (!m) return String(dateStr);
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  const dow = ['Ня', 'Да', 'Мя', 'Лх', 'Пү', 'Ба', 'Бя'][d.getDay()];
  return `${dateStr} (${dow})`;
}
function nomaadCampLabel(o) {
  const c = String(o.camp || '').toLowerCase();
  if (c.includes('summit')) return 'NOMAAD Summit';
  if (c.includes('meadow')) return 'NOMAAD Meadow';
  if (c.includes('grove'))  return 'NOMAAD Grove';
  return (o.camp || '').trim() || 'Бусад';
}
function nomaadCountdownBadge(days) {
  if (days == null) return `<span class="nomaad-cd nomaad-cd-none">огноогүй</span>`;
  if (days < 0)  return `<span class="nomaad-cd nomaad-cd-past">дууссан</span>`;
  if (days === 0) return `<span class="nomaad-cd nomaad-cd-urgent">Өнөөдөр</span>`;
  if (days === 1) return `<span class="nomaad-cd nomaad-cd-urgent">Маргааш</span>`;
  const cls = days <= 7 ? 'nomaad-cd-soon' : 'nomaad-cd-ok';
  return `<span class="nomaad-cd ${cls}">${days} хоног үлдсэн</span>`;
}
// Тухайн захиалгад хувиарласан ажлууд — гарчиг "NOMAAD <quote_no> · ..."-ээр тааруулна
function nomaadOrderTasks(quoteNo) {
  const pref = 'NOMAAD ' + quoteNo + ' ';
  return (state.tasks || []).filter(t => t.status !== 'deleted' && (t.title || '').startsWith(pref));
}
function nomaadAssignedTasksHtml(quoteNo) {
  const tasks = nomaadOrderTasks(quoteNo);
  if (!tasks.length) return '';
  const statusMn  = { open: 'Шинэ', in_progress: 'Хийгдэж байна', done: 'Дууссан', declined: 'Татгалзсан' };
  const statusCls = { open: '', in_progress: 'in_progress', done: 'done', declined: 'declined' };
  const rows = tasks.map(t => {
    const photos = (t.completion_photos || []).filter(Boolean);
    const photoBit = t.status === 'done'
      ? (photos.length
          ? `<a href="${escapeHtml(photos[0])}" target="_blank" rel="noopener" class="nomaad-task-photo">📷 ${photos.length}</a>`
          : '<span style="color:var(--muted);font-size:11px;">зураггүй</span>')
      : '';
    const itemCnt = String(t.desc || '').split('\n').filter(l => l.trim().startsWith('•')).length;
    return `<div class="nomaad-task-row">
      <div class="nomaad-task-line">
        <span class="status-dot ${statusCls[t.status] || ''}"></span>
        <span class="nomaad-task-who">${escapeHtml(memberName(t.assignee))}</span>
        ${itemCnt ? `<span class="nomaad-task-cnt">${itemCnt} зүйл</span>` : ''}
        <span class="nomaad-task-st">${statusMn[t.status] || t.status || 'Шинэ'}</span>
        ${photoBit}
      </div>
    </div>`;
  }).join('');
  const doneN = tasks.filter(t => t.status === 'done').length;
  return `<div class="nomaad-tasks">
    <div class="nomaad-tasks-head">Хувиарласан ажил · ${doneN}/${tasks.length} дууссан</div>
    ${rows}
  </div>`;
}
// Нээлттэй (дэлгэрсэн) захиалгуудыг render хооронд хадгална
let nomaadExpanded = new Set();
let nomaadViewMode = 'pipeline';   // NOMAAD захиалга: 'pipeline' (Захиалга самбар) | 'calendar'. ('list' хасагдсан)
let nomaadCalMode = 'month';   // календарь: 'month' | 'week'
let nomaadCalAnchor = null;    // календарийн анкор огноо (Date)
// Pipeline: бүх шат анхдагчаар ЭВХЭГДСЭН (цэвэр dropdown жагсаалт) — дарвал тухайн шат задарна.
let nomaadStageCollapsed = new Set(['interested', 'sent', 'confirming', 'deposit', 'contract', 'done', 'cancelled']);
// Бэлтгэл-шалгах task-ийн desc-ийг нэг хэвээр угсарна
function nomaadTaskDesc(o, names) {
  return `Захиалга ${o.quote_no} · ${o.company}\n📅 ${o.date_start || ''} → ${o.date_end || ''} · ${o.camp || ''} ${o.tier || ''} · ${o.guests || 0} хүн\n☎ ${o.phone || ''}\n\nБэлэн эсэхийг шалгах:\n` + names.map(x => '• ' + x).join('\n');
}
function nomaadDescBullets(desc) {
  return String(desc || '').split('\n').filter(l => l.trim().startsWith('•')).map(l => l.replace(/^\s*•\s*/, '').trim()).filter(Boolean);
}
// Захиалгын дэлгэрэнгүй дээр зүйл дээр шууд дарж нэг хүнд хувиарлах/солих
async function assignNomaadItemInline(quoteNo, itemName) {
  const o = (state.nomaadOrders || []).find(x => x.quote_no === quoteNo);
  if (!o) return;
  const tasks = nomaadOrderTasks(quoteNo);
  let currentKey = '';
  tasks.forEach(t => { if (nomaadDescBullets(t.desc).includes(itemName)) currentKey = t.assignee; });
  const picked = await openGroupSinglePicker(currentKey, itemName);
  if (picked === null || picked === currentKey) return;
  // 1) Хуучин эзэмшигчээс хасах (task хоосрвол устгана)
  for (const t of tasks) {
    if (t.assignee === picked) continue;
    const items = nomaadDescBullets(t.desc);
    if (!items.includes(itemName)) continue;
    const rest = items.filter(x => x !== itemName);
    if (rest.length) { t.desc = nomaadTaskDesc(o, rest); await saveTask(t); }
    else {
      if (typeof markDeleted === 'function') markDeleted(t.id);
      state.tasks = state.tasks.filter(x => x.id !== t.id);
      saveTask(t, true, true);
    }
  }
  // 2) Шинэ эзэмшигчид нэмэх (task байвал desc-д нэмнэ, эс бөгөөс шинэ task)
  const dest = (state.tasks || []).find(t => t.status !== 'deleted' && (t.title || '').startsWith('NOMAAD ' + quoteNo + ' ') && t.assignee === picked);
  if (dest) {
    const items = nomaadDescBullets(dest.desc);
    if (!items.includes(itemName)) { items.push(itemName); dest.desc = nomaadTaskDesc(o, items); await saveTask(dest); }
  } else {
    const due = o.date_start ? String(o.date_start).slice(0, 10) : '';
    const t = {
      id: uid(),
      title: `NOMAAD ${o.quote_no} · ${o.company} — бэлтгэл шалгах`,
      desc: nomaadTaskDesc(o, [itemName]),
      branch: 'camp', project: '', assignee: picked, due, priority: 'high', status: 'open',
      requires_photo: true, createdBy: state.me, created: Date.now(), comments: [], activity: [],
    };
    state.tasks.unshift(t);
    await saveTask(t);
    pushBroadcast(picked, { type: 'task_assigned', task_id: t.id, title: 'Шинэ ажил', body: t.title });
  }
  nomaadExpanded.add(quoteNo);   // карт нээлттэй хэвээр үлдэнэ
  render();
  showToast(`${itemName} → ${memberName(picked)}`, 'success', 2000);
}
// Нэг захиалгын карт — эвхэгдсэн товч харагдац + дарахад нээгддэг дэлгэрэнгүй
// Бодит/хүлээн зөвшөөрөгдөх дүн = Эцсийн гэрээний дүн (акт) байвал тэр, эс бөгөөс Нийт дүн (санал).
// Орлого/тайланд grand_total биш ҮҮНИЙГ ашиглана — муу гүйцэтгэлийн хасалт орлогыг хөөрөгдөхгүй.
const nomaadEffTotal = o => Number(o.final_amount) || Number(o.grand_total) || 0;
function nomaadCardHtml(o) {
  const q = escapeHtml(o.quote_no);
  const isDoneQuote = nomaadStage(o) === 'done';   // Гүйцэтгэсэн — засах хаалттай (түүх хамгаална)
  const income = Number(o.income_amount) || 0;
  // Үлдэгдэл = гэрээний дүн − хүлээн авсан орлого (Эцсийн гэрээний дүн байвал тэрийг, эс бөгөөс Нийт дүн)
  const contractTotal = nomaadEffTotal(o);
  const gtRaw = Number(o.grand_total) || 0;
  const hasDed = Number(o.final_amount) > 0 && Number(o.final_amount) !== gtRaw;
  const balance = contractTotal - income;
  const balanceHtml = balance > 0
    ? `<div style="font-weight:700;color:var(--warn);font-size:13px;">Үлдэгдэл: ${fmtMoney(balance)}</div>`
    : `<div style="font-weight:700;color:var(--ok);font-size:13px;">✓ Бүрэн төлөгдсөн</div>`;
  const days = nomaadDaysLeft(o.date_start);
  const asgTasks = nomaadOrderTasks(o.quote_no);
  const asgDone  = asgTasks.filter(t => t.status === 'done').length;
  // Зүйл → хариуцагч map (task.desc доторх "• <зүйлийн нэр>"-ийг тухайн ажилтанд холбоно)
  const itemOwner = {};
  asgTasks.forEach(t => {
    const who = memberName(t.assignee);
    String(t.desc || '').split('\n').filter(l => l.trim().startsWith('•')).forEach(l => {
      const nm = l.replace(/^\s*•\s*/, '').trim();
      if (!nm) return;
      if (itemOwner[nm]) { if (!itemOwner[nm].split(', ').includes(who)) itemOwner[nm] += ', ' + who; }
      else itemOwner[nm] = who;
    });
  });
  const itemRows = (o.items || []).map(it => {
    const owner = itemOwner[it.name];
    const da = `data-na-assign-q="${q}" data-na-assign-item="${escapeHtml(it.name || '')}"`;
    const ownerCell = owner
      ? `<td class="nomaad-item-owner nomaad-item-assign" ${da} title="Солих">${escapeHtml(owner)}</td>`
      : `<td class="nomaad-item-owner nomaad-item-assign" ${da} title="Хувиарлах"><span class="na-assign-hint">+ хувиарлах</span></td>`;
    return `<tr><td>${escapeHtml(it.name || '')}</td><td class="num">${it.qty || 0} ${escapeHtml(it.unit || '')}</td>${ownerCell}<td class="num">${it.included ? '<span style="color:var(--muted)">багцад</span>' : fmtMoney(it.total || 0)}</td></tr>`;
  }).join('');
  const open = nomaadExpanded.has(o.quote_no);
  const incomeArea = income > 0
    ? `<div style="text-align:right;">
         <span style="font-weight:700;color:var(--ok);">Орлого: ${fmtMoney(income)}</span>
         ${balanceHtml}
         <div style="font-size:11px;color:var(--muted);">Урьд ${fmtMoney(o.income_advance || 0)} · Үлд ${fmtMoney(o.income_balance || 0)} · Нэм ${fmtMoney(o.income_addon || 0)} · Эвд ${fmtMoney(o.income_damage || 0)}</div>
         <div style="font-size:11px;color:var(--muted);">${escapeHtml(o.income_date || '')}${o.income_by ? ' · ' + escapeHtml(memberName(o.income_by)) : ''}${isDoneQuote ? '' : ` · <button class="btn" data-nomaad-income="${q}" style="padding:2px 8px;font-size:10px;">Засах</button>`}</div>
       </div>`
    : `<div style="text-align:right;display:flex;flex-direction:column;align-items:flex-end;gap:5px;">
         ${balanceHtml}
         <button class="btn btn-primary" data-nomaad-income="${q}" style="padding:5px 14px;font-size:12px;">Орлого бүртгэх</button>
       </div>`;
  return `<div class="nomaad-card${open ? ' expanded' : ''}" data-nomaad="${q}">
    <div class="nomaad-card-head" data-nomaad-toggle="${q}">
      <div class="nomaad-card-main">
        ${nomaadCountdownBadge(days)}
        <span class="nomaad-card-co">${escapeHtml(o.company || '')}</span>
        <span class="nomaad-card-date">${nomaadDateWithDow(o.date_start)} → ${nomaadDateWithDow(o.date_end)} · ${o.guests || 0} хүн</span>
      </div>
      <div class="nomaad-card-right">
        ${asgTasks.length ? `<span class="nomaad-asg" title="Хувиарласан ажил">👷 ${asgDone}/${asgTasks.length}</span>` : ''}
        ${balance > 0 ? `<span title="Үлдэгдэл" style="color:var(--warn);font-weight:700;font-size:12px;">Үлд ${fmtMoney(balance)}</span>` : '<span class="nomaad-paid" title="Бүрэн төлөгдсөн">✓</span>'}
        <span class="nomaad-card-total"${hasDed ? ` title="Акт дүн · гэрээний санал ${fmtMoney(gtRaw)}"` : ''}>${fmtMoney(contractTotal)}${hasDed ? ` <span class="nomaad-card-quote">${fmtMoney(gtRaw)}</span>` : ''}</span>
        <svg class="nomaad-chev" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
      </div>
    </div>
    <div class="nomaad-card-body" style="display:${open ? 'block' : 'none'};">
      <div class="order-cust" style="margin-top:4px;"><span class="order-no">${q}</span> · <a href="tel:${escapeHtml(o.phone)}">${escapeHtml(o.phone || '')}</a>${o.contact ? ' · ' + escapeHtml(o.contact) : ''}</div>
      <div class="order-meta">${escapeHtml(o.camp || '')} · ${escapeHtml(o.tier || '')}</div>
      ${nomaadIsCancelled(o) && o.note ? `<div class="order-meta" style="color:var(--danger);font-weight:600;">❌ ${escapeHtml(o.note)}</div>` : ''}
      <table class="order-items"><thead><tr><th>Зүйл</th><th class="num">Тоо</th><th>Хариуцагч</th><th class="num">Дүн</th></tr></thead><tbody>${itemRows}</tbody></table>
      ${nomaadAssignedTasksHtml(o.quote_no)}
      <div class="order-foot">
        <span class="order-sub">Нийт дүн: ${fmtMoney(o.grand_total || 0)} · Урьдчилгаа: ${fmtMoney(o.deposit || 0)}${(() => {
          const fa = Number(o.final_amount) || 0, gt = Number(o.grand_total) || 0;
          if (!fa || fa === gt) return '';
          return fa < gt
            ? ` · <b style="color:var(--danger)">Акт: ${fmtMoney(fa)} (гүйцэтгэлийн хасалт −${fmtMoney(gt - fa)})</b>`
            : ` · <b style="color:var(--ok)">Акт: ${fmtMoney(fa)} (нэмэгдэл +${fmtMoney(fa - gt)})</b>`;
        })()}</span>
        <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;justify-content:flex-end;">
          ${isDoneQuote
            ? `<span style="display:inline-flex;align-items:center;gap:8px;flex-wrap:wrap;" title="Гүйцэтгэсэн захиалга — мэдээллийг буруутгахаас сэргийлж бүх товч түгжсэн.">
                 <button class="btn" disabled style="padding:5px 14px;font-size:12px;opacity:.45;cursor:not-allowed;">🔒 Засах</button>
                 <button class="btn" disabled style="padding:5px 14px;font-size:12px;opacity:.45;cursor:not-allowed;">🔒 Харах</button>
                 <button class="btn" disabled style="padding:5px 14px;font-size:12px;opacity:.45;cursor:not-allowed;">🔒 Илгээх</button>
                 <button class="btn" disabled style="padding:5px 14px;font-size:12px;opacity:.45;cursor:not-allowed;">🔒 Бэлтгэл</button>
                 <span style="font-size:11px;color:var(--ok);font-weight:700;">✓ Гүйцэтгэсэн · хаалттай</span>
               </span>`
            : `<button class="btn" data-nomaad-edit="${q}" style="padding:5px 14px;font-size:12px;">✏️ Засах</button>
               <button class="btn" data-nomaad-view="${q}" style="padding:5px 14px;font-size:12px;">📄 Үнийн санал харах</button>
               <button class="btn" data-nomaad-send="${q}" style="padding:5px 14px;font-size:12px;">📧 Үнийн санал илгээх</button>
               <button class="btn" data-nomaad-prep="${q}" style="padding:5px 14px;font-size:12px;">📋 Бэлтгэл</button>
               ${(income > 0 || Number(o.income_advance) > 0) ? '' : `<button class="btn" data-nomaad-delete="${q}" style="padding:5px 14px;font-size:12px;color:var(--danger);border-color:var(--danger);">❌ Больсон болгох</button>`}`}
          ${incomeArea}
        </div>
      </div>
    </div>
  </div>`;
}
/* ===================== NOMAAD захиалга — Календарь харагдац ===================== */
function nomaadParseDay(dateStr) {
  const m = String(dateStr || '').match(/(\d{4})\D+(\d{1,2})\D+(\d{1,2})/);
  return m ? { y: +m[1], mo: +m[2], d: +m[3] } : null;
}
// Огноо+цаг → timestamp (ms). Цаг байхгүй бол 00:00. Цаг давхцал тооцоход.
function nomaadParseDT(dateStr) {
  const m = String(dateStr || '').match(/(\d{4})\D+(\d{1,2})\D+(\d{1,2})(?:\D+(\d{1,2}):(\d{2}))?/);
  if (!m) return null;
  return new Date(+m[1], +m[2] - 1, +m[3], m[4] ? +m[4] : 0, m[5] ? +m[5] : 0).getTime();
}
// "2026-06-26 11:00" → "11:00" (цаг байхгүй бол '')
function nomaadStartTime(dateStr) {
  const m = String(dateStr || '').match(/\d{1,2}:\d{2}/);
  return m ? m[0] : '';
}
// Захиалгыг 4 camp + бусад-д ангилна (календарийн зурвасуудад)
function nomaadCampKey(o) {
  const c = String(o.camp || '').toLowerCase();
  if (c.includes('summit')) return 'summit';
  if (c.includes('meadow')) return 'meadow';
  if (c.includes('grove'))  return 'grove';
  if (c.includes('нүүд') || c.includes('nomad') || c.includes('нуудли')) return 'nomad';
  return 'other';
}
const NOMAAD_CAMP_LANES = [['summit', 'S'], ['meadow', 'M'], ['grove', 'G'], ['nomad', 'Н']];
const NOMAAD_LANE_TAG = { summit: 'S', meadow: 'M', grove: 'G', nomad: 'Н', other: 'Б' };
function nomaadIsCancelled(o) {
  const s = String(o.status || '').toLowerCase();
  return s.includes('больсон') || s.includes('цуцл');
}
function renderNomaadToggle() {
  return `<div class="na-topbar">
    <div class="na-viewtoggle">
      <button class="na-vt${nomaadViewMode !== 'calendar' ? ' active' : ''}" data-na-view="pipeline">📊 Захиалга</button>
      <button class="na-vt${nomaadViewMode === 'calendar' ? ' active' : ''}" data-na-view="calendar">📅 Календарь</button>
    </div>
    <button class="btn btn-primary na-newbtn" data-na-new>+ Шинэ үнийн санал</button>
  </div>`;
}
/* ---- Pipeline (борлуулалтын шат) ---- */
const NOMAAD_STAGES = [
  { key: 'interested', label: 'Шинэ',                       color: '#0ea5e9' },
  { key: 'sent',       label: 'Үнийн санал илгээсэн',       color: '#8b5cf6' },
  { key: 'confirming', label: 'Баталгаажуулалт хүлээж буй', color: '#ec4899' },
  { key: 'deposit',    label: 'Урьдчилгаа төлсөн',          color: '#f59e0b' },
  { key: 'contract',   label: 'Гэрээ хийгдсэн',             color: '#16a34a' },
  { key: 'done',       label: 'Гүйцэтгэсэн',                color: '#0d9488' },
  { key: 'cancelled',  label: 'Больсон',                    color: '#94a3b8' },
];
// Гараар сонгох төлөвүүд (value=Төлөв, label=ойлгомжтой нэр). Шат руу зурваслана.
const NOMAAD_STATUSES = [
  { value: 'ШИНЭ', label: 'Шинэ' },
  { value: 'ИЛГЭЭСЭН', label: 'Үнийн санал илгээсэн' },
  { value: 'БАТАЛГААЖУУЛАЛТ', label: 'Баталгаажуулалт хүлээж буй' },
  { value: 'ГЭРЭЭ', label: 'Гэрээ хийгдсэн' },
  { value: 'ДУУССАН', label: 'Гүйцэтгэсэн' },
  { value: 'БОЛЬСОН', label: 'Больсон' },
];
// Захиалгын шатыг төлөв + орлого + огнооноос автоматаар тооцно
function nomaadStage(o) {
  const su = String(o.status || '').toUpperCase();
  if (su.includes('БОЛЬСОН') || su.includes('ЦУЦЛ')) return 'cancelled';
  if (su.includes('ДУУССАН') || su.includes('ГҮЙЦЭТГЭСЭН')) return 'done';
  const income = Number(o.income_amount) || 0;
  const contractTotal = nomaadEffTotal(o);
  const fullyPaid = income > 0 && (contractTotal - income) <= 0;
  const days = nomaadDaysLeft(o.date_start);
  const past = days != null && days < 0;
  if (past && fullyPaid) return 'done';
  if (su.includes('ГЭРЭЭ') || String(o.contract_date || '').trim()) return 'contract';
  if (Number(o.income_advance) > 0 || income > 0) return 'deposit';
  if (su.includes('БАТАЛГ')) return 'confirming';   // Баталгаажуулалт хүлээж буй (амаар тохирсон, гэрээ хүлээж буй)
  if (su.includes('ИЛГЭЭСЭН')) return 'sent';
  return 'interested';
}
function renderNomaadPipeline() {
  const orders = state.nomaadOrders || [];
  const byStage = {};
  orders.forEach(o => { const k = nomaadStage(o); (byStage[k] = byStage[k] || []).push(o); });
  const maxN = Math.max(1, ...NOMAAD_STAGES.map(s => (byStage[s.key] || []).length));
  const funnel = NOMAAD_STAGES.map(s => {
    const n = (byStage[s.key] || []).length;
    return `<button class="na-funnel-seg${n ? '' : ' empty'}" data-na-stage-scroll="${s.key}" style="--seg:${s.color}">
      <span class="na-funnel-bar" style="height:${6 + Math.round((n / maxN) * 34)}px"></span>
      <span class="na-funnel-n">${n}</span><span class="na-funnel-l">${escapeHtml(s.label)}</span>
    </button>`;
  }).join('');
  const sections = NOMAAD_STAGES.map(s => {
    const list = (byStage[s.key] || []).slice().sort((a, b) => nomaadSortKey(a) - nomaadSortKey(b));
    if (!list.length) return '';
    const total = list.reduce((sum, o) => sum + nomaadEffTotal(o), 0);
    const collapsed = nomaadStageCollapsed.has(s.key);
    return `<div class="na-stage" id="na-stage-${s.key}">
      <div class="na-stage-head${collapsed ? ' collapsed' : ''}" data-na-stage-toggle="${s.key}" style="--seg:${s.color}">
        <span class="na-stage-dot"></span>
        <span class="na-stage-label">${escapeHtml(s.label)}</span>
        <span class="na-stage-count">${list.length}</span>
        ${s.key === 'cancelled' ? '<span class="na-stage-total"></span>' : `<span class="na-stage-total">${fmtMoney(total)}</span>`}
        <svg class="na-stage-chev" viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
      </div>
      <div class="na-stage-body" style="display:${collapsed ? 'none' : 'block'}">${list.map(nomaadCardHtml).join('')}</div>
    </div>`;
  }).join('');
  // Нийт бүртгэсэн орлого (income_amount нийлбэр) + идэвхтэй захиалгын тоо
  const totalIncome = orders.reduce((sum, o) => sum + (Number(o.income_amount) || 0), 0);
  const activeN = orders.filter(o => !nomaadIsCancelled(o)).length;
  const header = `<div style="margin-bottom:12px;padding:12px 14px;border:1px solid var(--border);border-radius:10px;background:var(--bg-soft,var(--card));font-size:13px;">Нийт бүртгэсэн орлого: <b style="color:var(--ok)">${fmtMoney(totalIncome)}</b> · ${activeN} идэвхтэй захиалга</div>`;
  return header + `<div class="na-funnel">${funnel}</div>${sections}`;
}
// Нэг өдрийн нүд (camp зурвасууд) — сар ба 7 хоногийн харагдацад хоёуланд
function nomaadCalCellHtml(dateObj, list, today, conflicts) {
  const isToday = dateObj.getTime() === today.getTime();
  let lanesHtml = '';
  if (list.length) {
    const byCamp = {};
    list.forEach(o => { const k = nomaadCampKey(o); (byCamp[k] = byCamp[k] || []).push(o); });
    const laneKeys = NOMAAD_CAMP_LANES.map(x => x[0]);
    if ((byCamp.other || []).length) laneKeys.push('other');
    lanesHtml = '<div class="na-cal-lanes">' + laneKeys.map(k => {
      const items = (byCamp[k] || []).slice().sort((a, b) => nomaadEffTotal(b) - nomaadEffTotal(a));
      const chips = items.map(o => {
        const confirmed = ['deposit', 'contract', 'done'].includes(nomaadStage(o));  // урьдчилгаа төлж баталгаажсан
        const conflict = !!(conflicts && conflicts.has(o.quote_no));
        const t = nomaadStartTime(o.date_start);
        const cls = 'na-cal-chip'
          + (nomaadIsCancelled(o) ? ' na-cal-cancelled' : '')
          + (confirmed ? ' na-cal-confirmed' : '')
          + (conflict ? ' na-cal-conflict' : '');
        const prefix = (conflict ? '⚠' : '') + (confirmed ? '✓' : '');
        const label = (prefix ? prefix + ' ' : '') + (t ? t + ' ' : '') + String(o.company || o.quote_no || '').slice(0, 16);
        const tip = `${o.company || o.quote_no} · ${o.camp || ''} · ${o.tier || ''} · ${o.guests || 0} хүн\n${o.date_start || ''} → ${o.date_end || ''}\n${o.status || ''}${confirmed ? ' · ✓ урьдчилгаа төлсөн' : ''}${conflict ? '\n⚠ ЭНЭ КЕМП ДЭЭР ЦАГ ДАВХЦАЖ БАЙНА' : ''}`;
        return `<div class="${cls}" data-na-cal-order="${escapeHtml(o.quote_no)}" title="${escapeHtml(tip)}">${escapeHtml(label)}</div>`;
      }).join('');
      return `<div class="na-cal-lane na-lane-${k}${items.length ? ' has' : ''}"><span class="na-lane-tag">${NOMAAD_LANE_TAG[k]}</span><div class="na-lane-items">${chips}</div></div>`;
    }).join('') + '</div>';
  }
  return `<div class="na-cal-cell${isToday ? ' na-cal-today' : ''}${list.length ? ' na-cal-has' : ''}"><div class="na-cal-daynum">${dateObj.getDate()}</div>${lanesHtml}</div>`;
}
function renderNomaadCalendar() {
  const orders = (state.nomaadOrders || []).filter(o => !nomaadIsCancelled(o));   // цуцалсныг харуулахгүй
  if (!nomaadCalAnchor) nomaadCalAnchor = new Date();
  const mode = nomaadCalMode || 'month';
  const byKey = {};   // 'y-mo-d' -> [orders]
  let noDate = 0;
  orders.forEach(o => { const p = nomaadParseDay(o.date_start); if (!p) { noDate++; return; } const k = p.y + '-' + p.mo + '-' + p.d; (byKey[k] = byKey[k] || []).push(o); });
  // ─── Цаг давхцал: ИЖИЛ камп дээр хугацаа давхцвал зөрчил (нэг камп зэрэг 2 захиалга хүлээж чадахгүй) ───
  const conflicts = new Set(), conflictPairs = [];
  const byCampDT = {};
  orders.forEach(o => {
    const camp = nomaadCampKey(o);
    if (camp === 'other') return;   // тодорхой кампгүй — физик зөрчил тооцохгүй
    const s = nomaadParseDT(o.date_start);
    if (s == null) return;
    let e = nomaadParseDT(o.date_end);
    if (e == null || e <= s) e = s + 3600000;   // дуусах огноогүй бол 1 цаг гэж үзнэ
    (byCampDT[camp] = byCampDT[camp] || []).push({ o, s, e });
  });
  Object.values(byCampDT).forEach(arr => {
    arr.sort((a, b) => a.s - b.s);
    for (let i = 0; i < arr.length; i++)
      for (let j = i + 1; j < arr.length && arr[j].s < arr[i].e; j++) {
        conflicts.add(arr[i].o.quote_no); conflicts.add(arr[j].o.quote_no);
        conflictPairs.push([arr[i].o, arr[j].o, nomaadCampKey(arr[i].o)]);
      }
  });
  const keyFor = dt => dt.getFullYear() + '-' + (dt.getMonth() + 1) + '-' + dt.getDate();
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const dows = ['Да', 'Мя', 'Лх', 'Пү', 'Ба', 'Бя', 'Ня'];
  const a = nomaadCalAnchor;
  let title, cells = '', shown = 0, gridCls = '';
  if (mode === 'week') {
    const mon = new Date(a.getFullYear(), a.getMonth(), a.getDate() - ((a.getDay() + 6) % 7));
    const days = [];
    for (let i = 0; i < 7; i++) days.push(new Date(mon.getFullYear(), mon.getMonth(), mon.getDate() + i));
    cells = days.map(dt => { const l = byKey[keyFor(dt)] || []; shown += l.length; return nomaadCalCellHtml(dt, l, today, conflicts); }).join('');
    title = `${mon.getMonth() + 1}/${mon.getDate()} – ${days[6].getMonth() + 1}/${days[6].getDate()}`;
    gridCls = ' na-cal-weekgrid';
  } else {
    const y = a.getFullYear(), m = a.getMonth();
    const lead = (new Date(y, m, 1).getDay() + 6) % 7;
    const dim = new Date(y, m + 1, 0).getDate();
    for (let i = 0; i < lead; i++) cells += `<div class="na-cal-cell na-cal-empty"></div>`;
    for (let d = 1; d <= dim; d++) { const dt = new Date(y, m, d); const l = byKey[keyFor(dt)] || []; shown += l.length; cells += nomaadCalCellHtml(dt, l, today, conflicts); }
    title = `${y} оны ${m + 1}-р сар`;
  }
  const hint = `<div class="na-cal-hint">Энэ ${mode === 'week' ? '7 хоногт' : 'сард'} <b>${shown}</b> захиалга${noDate ? ` · огноогүй ${noDate}` : ''}</div>`;
  const warnHtml = conflictPairs.length
    ? `<div class="na-cal-warn">⚠ ${conflictPairs.length} цаг давхцал: ` + conflictPairs.slice(0, 4).map(([a, b, camp]) =>
        `${escapeHtml(String(a.company || a.quote_no || '').slice(0, 14))} ↔ ${escapeHtml(String(b.company || b.quote_no || '').slice(0, 14))} (${NOMAAD_LANE_TAG[camp] || camp})`).join('; ')
      + (conflictPairs.length > 4 ? ` …+${conflictPairs.length - 4}` : '') + '</div>'
    : '';
  return `<div class="na-cal">
    <div class="na-cal-head">
      <div class="na-calmode">
        <button class="na-cm${mode === 'month' ? ' active' : ''}" data-na-cal-mode="month">Сар</button>
        <button class="na-cm${mode === 'week' ? ' active' : ''}" data-na-cal-mode="week">7 хоног</button>
      </div>
      <button class="na-cal-nav" data-na-cal-nav="-1" aria-label="Өмнөх">‹</button>
      <div class="na-cal-title">${escapeHtml(title)}</div>
      <button class="na-cal-nav" data-na-cal-nav="1" aria-label="Дараах">›</button>
      <button class="na-cal-nav na-cal-todaybtn" data-na-cal-nav="0">Өнөөдөр</button>
    </div>
    <div class="na-cal-dows">${dows.map(x => `<div class="na-cal-dow">${x}</div>`).join('')}</div>
    <div class="na-cal-grid${gridCls}">${cells}</div>
    ${warnHtml}
    ${hint}
    <div class="na-cal-legend">
      <span><i class="na-lg na-cal-summit"></i>S · Summit</span>
      <span><i class="na-lg na-cal-meadow"></i>M · Meadow</span>
      <span><i class="na-lg na-cal-grove"></i>G · Grove</span>
      <span><i class="na-lg na-lg-nomad"></i>Н · Нүүдлийн</span>
      <span><i class="na-lg na-cal-other"></i>Б · Бусад</span>
      <span><i class="na-lg na-lg-cancel"></i>Больсон</span>
      <span style="color:var(--ok);font-weight:700;">✓ Урьдчилгаа төлсөн</span>
      <span style="color:var(--danger);font-weight:700;">⚠ Цаг давхцал</span>
    </div>
  </div>`;
}

function attachNomaadHandlers() {
  document.querySelectorAll('[data-nomaad-toggle]').forEach(h => {
    h.addEventListener('click', (e) => {
      if (e.target.closest('button, a')) return;
      const card = h.closest('.nomaad-card');
      if (!card) return;
      const qn = h.dataset.nomaadToggle;
      const body = card.querySelector('.nomaad-card-body');
      const open = body.style.display !== 'none';
      body.style.display = open ? 'none' : 'block';
      card.classList.toggle('expanded', !open);
      if (open) nomaadExpanded.delete(qn); else nomaadExpanded.add(qn);
    });
  });
  // Зүйл дээр шууд дарж нэг хүнд хувиарлах/солих
  document.querySelectorAll('[data-na-assign-item]').forEach(el => {
    el.addEventListener('click', (e) => {
      e.stopPropagation();
      assignNomaadItemInline(el.dataset.naAssignQ, el.dataset.naAssignItem);
    });
  });
  document.querySelectorAll('button[data-nomaad-income]').forEach(b => {
    b.addEventListener('click', () => recordNomaadIncome(b.dataset.nomaadIncome));
  });
  document.querySelectorAll('button[data-nomaad-prep]').forEach(b => {
    b.addEventListener('click', () => openNomaadPrepChecklist(b.dataset.nomaadPrep));
  });
  document.querySelectorAll('button[data-nomaad-edit]').forEach(b => {
    b.addEventListener('click', () => openNomaadEditModal(b.dataset.nomaadEdit));
  });
  document.querySelectorAll('button[data-nomaad-delete]').forEach(b => {
    b.addEventListener('click', () => deleteNomaadQuote(b.dataset.nomaadDelete));
  });
  document.querySelectorAll('button[data-nomaad-send]').forEach(b => {
    b.addEventListener('click', () => sendNomaadQuote(b.dataset.nomaadSend));
  });
  document.querySelectorAll('button[data-nomaad-view]').forEach(b => {
    b.addEventListener('click', () => openNomaadQuoteView(b.dataset.nomaadView));
  });
  // Жагсаалт ↔ Календарь сэлгэх
  document.querySelectorAll('[data-na-view]').forEach(b => {
    b.addEventListener('click', () => { nomaadViewMode = b.dataset.naView; render(); });
  });
  // + Шинэ үнийн санал
  document.querySelectorAll('[data-na-new]').forEach(b => {
    b.addEventListener('click', () => openNomaadCreateModal());
  });
  // Календарь — нав (‹ › Өнөөдөр): сар эсвэл 7 хоногоор
  document.querySelectorAll('[data-na-cal-nav]').forEach(b => {
    b.addEventListener('click', () => {
      const delta = Number(b.dataset.naCalNav);
      const a = nomaadCalAnchor || new Date();
      if (delta === 0) nomaadCalAnchor = new Date();
      else if (nomaadCalMode === 'week') nomaadCalAnchor = new Date(a.getFullYear(), a.getMonth(), a.getDate() + delta * 7);
      else nomaadCalAnchor = new Date(a.getFullYear(), a.getMonth() + delta, 1);
      render();
    });
  });
  // Календарь — Сар / 7 хоног
  document.querySelectorAll('[data-na-cal-mode]').forEach(b => {
    b.addEventListener('click', () => { nomaadCalMode = b.dataset.naCalMode; render(); });
  });
  // Pipeline — шат эвхэх/дэлгэх
  document.querySelectorAll('[data-na-stage-toggle]').forEach(h => {
    h.addEventListener('click', (e) => {
      if (e.target.closest('.nomaad-card')) return;
      const k = h.dataset.naStageToggle;
      if (nomaadStageCollapsed.has(k)) nomaadStageCollapsed.delete(k); else nomaadStageCollapsed.add(k);
      render();
    });
  });
  // Pipeline — юүлүүрээс шат руу гүйх
  document.querySelectorAll('[data-na-stage-scroll]').forEach(b => {
    b.addEventListener('click', () => {
      const k = b.dataset.naStageScroll;
      nomaadStageCollapsed.delete(k); render();
      setTimeout(() => { const el = document.getElementById('na-stage-' + k); if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' }); }, 50);
    });
  });
  // Календарийн захиалга дээр дарвал → Захиалга самбар руу шилжиж тэр захиалгыг дэлгэнэ
  document.querySelectorAll('[data-na-cal-order]').forEach(el => {
    el.addEventListener('click', () => {
      const qn = el.dataset.naCalOrder;
      nomaadViewMode = 'pipeline';
      nomaadExpanded.add(qn);
      render();
      setTimeout(() => {
        const sel = (window.CSS && CSS.escape) ? CSS.escape(qn) : qn.replace(/"/g, '\\"');
        const card = document.querySelector(`.nomaad-card[data-nomaad="${sel}"]`);
        if (card) card.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 60);
    });
  });
}

/* ─── NOMAAD үнийн санал устгах — зөвхөн урьдчилгаа/орлого бүртгэгдэхээс ӨМНӨ.
   Байгууллагууд олон үнийн санал авдаг тул хувирахгүй саналыг цэвэрлэнэ. Quote Log-ийн
   Төлөвийг "БОЛЬСОН" болгож аппын "АПП" шүүлтээс хасна (түүх Quote Log-д үлдэнэ).
   Засах(update_quote)-тай ИЖИЛ бүрэн payload — дутуу талбар Quote Log-ийг хоослохгүй. ─── */
async function deleteNomaadQuote(quoteNo) {
  const o = (state.nomaadOrders || []).find(x => x.quote_no === quoteNo);
  if (!o) { showToast('Захиалга олдсонгүй', 'error'); return; }
  if (Number(o.income_advance) > 0 || Number(o.income_amount) > 0) {
    showToast('Урьдчилгаа/орлого бүртгэгдсэн — устгах боломжгүй', 'warn', 4000); return;
  }
  const reason = await showPrompt(
    `${o.company || 'Захиалга'} · ${quoteNo}\nЯагаад больсон бэ? Шалтгаанаа бичнэ үү (түүх + статистикт үлдэнэ).`,
    { placeholder: 'Ж: үнэ тохирсонгүй / өөр компани сонгосон / хариу өгөхгүй / огноо таарсангүй...', okText: 'Больсон болгох' });
  if (reason === null || reason === undefined) return;          // болих
  if (!String(reason).trim()) { showToast('Шалтгаан заавал бичнэ үү', 'warn', 3500); return; }
  if (!state.config.nomaadOrdersUrl) { showToast('NOMAAD backend тохируулаагүй', 'error'); return; }
  // Шалтгааныг note талбарт ХЭН/ХЭЗЭЭ-тэй хадгална (хуучин тэмдэглэлийг ард нь хадгална). Pipeline-д харагдана.
  const who = (state.user && state.user.name) || memberName(state.me) || 'тодорхойгүй';
  const when = todayStr();
  const prevNote = String(o.note || '').replace(/^Больсон[^|]*\|?\s*/, '').trim();   // хуучин "Больсон..." угтварыг хасна
  const cancelNote = `Больсон (${who} · ${when}): ${String(reason).trim()}` + (prevNote ? ' | ' + prevNote : '');
  const body = {
    action: 'update_quote', quote_no: o.quote_no,
    company: o.company || '', status: 'БОЛЬСОН', reg_no: o.reg_no || '',
    contact: o.contact || '', phone: o.phone || '', email: o.email || '',
    camp: o.camp || '', tier: o.tier || '', note: cancelNote,
    final_amount: o.final_amount || '', date_start: o.date_start || '', date_end: o.date_end || '',
    guests: o.guests || 0, grand_total: o.grand_total || 0, deposit: o.deposit || 0,
    items: (o.items || []).map(it => ({ row_num: it.row_num, category: it.category, name: it.name, qty: it.qty, unit: it.unit, unit_price: it.unit_price, total: it.total, included: it.included, note: it.note })),
  };
  try {
    const r = await fetchWithTimeout(withKey(state.config.nomaadOrdersUrl), {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
    }, 20000);
    if (!r.ok) throw new Error('HTTP ' + r.status);
    // Локалд Больсон болгож шалтгаан хадгална → жагсаалт/календараас алга, Pipeline-ийн "Больсон" шатанд шалтгаантай харагдана
    o.status = 'БОЛЬСОН'; o.note = cancelNote;
    try { localStorage.setItem('nomaadOrders', JSON.stringify(state.nomaadOrders)); } catch (e) {}
    showToast('Больсон болголоо', 'success', 2500);
    render();
  } catch (e) {
    showToast('Алдаа: ' + e.message, 'error', 5000);
  }
}

/* ─── NOMAAD захиалга засах — хүний тоо + мөр бүрийн үнэ/тоо + холбоо барих.
   Хадгалбал nomaad-orders {action:'update_quote'} руу бичнэ → Quote Log/Items шинэчлэгдэнэ. ─── */
function openNomaadEditModal(quoteNo) {
  const o = (state.nomaadOrders || []).find(x => x.quote_no === quoteNo);
  if (!o) { showToast('Захиалга олдсонгүй', 'error'); return; }
  // Гүйцэтгэсэн захиалгыг засахыг хориглоно — дараа засвал түүх/орлогын мэдээлэл буруу болно.
  if (nomaadStage(o) === 'done') {
    showToast('Гүйцэтгэсэн захиалгыг засах боломжгүй (мэдээлэл хадгалагдана). Дэлгэрэнгүйг "📄 Үнийн санал харах"-аар үзнэ үү.', 'warn', 5000);
    return;
  }
  // Мөрүүдийн локал хуулбар (хадгалах хүртэл эх өгөгдөл хөндөхгүй)
  const items = (Array.isArray(o.items) ? o.items : []).map(it => ({
    row_num: Number(it.row_num) || 0,
    category: it.category || 'Нэмэлт үйлчилгээ',
    name: it.name || '',
    qty: Number(it.qty) || 0,
    unit: it.unit || '',
    unit_price: Number(it.unit_price) || 0,
    included: !!it.included,
    note: it.note || '',
  }));
  items.forEach(it => { it.total = it.included ? 0 : it.unit_price * it.qty; });
  let guests = Number(o.guests) || 0;
  const baseCamps = ['NOMAAD Summit', 'NOMAAD Meadow', 'NOMAAD Grove', 'Нүүдлийн кемп'];
  const campList = (o.camp && !baseCamps.includes(o.camp)) ? [o.camp, ...baseCamps] : baseCamps;
  const campOpts = campList.map(c => `<option${c === (o.camp || '') ? ' selected' : ''}>${escapeHtml(c)}</option>`).join('');
  const curStatus = String(o.status || '').trim();
  const knownStatus = NOMAAD_STATUSES.some(s => s.value === curStatus);
  const statusOpts = (knownStatus || !curStatus ? '' : `<option value="${escapeHtml(curStatus)}" selected>${escapeHtml(curStatus)} (одоогийн)</option>`)
    + NOMAAD_STATUSES.map(s => `<option value="${escapeHtml(s.value)}"${s.value === curStatus ? ' selected' : ''}>${escapeHtml(s.label)}</option>`).join('');
  // Хадгалсан огноо ("2026-06-19 9:00", "2026-06-19", чөлөөт текст) → datetime-local утга.
  // Цагийг 2 орон болгож тааруулна. Parse хийж чадахгүй бол '' (хоосон) — хуучин утгыг save үед хадгална.
  const toLocalInput = (v) => {
    if (!v) return '';
    const m = String(v).match(/(\d{4})[-./](\d{1,2})[-./](\d{1,2})(?:[ T](\d{1,2}):(\d{2}))?/);
    if (!m) return '';
    const pad = n => String(n).padStart(2, '0');
    return `${m[1]}-${pad(m[2])}-${pad(m[3])}T${m[4] != null ? pad(m[4]) + ':' + m[5] : '00:00'}`;
  };

  document.getElementById('nomaad-edit-modal')?.remove();
  const modal = document.createElement('div');
  modal.className = 'modal-bg';
  modal.id = 'nomaad-edit-modal';
  modal.innerHTML = `
    <div class="modal naq-modal">
      <h2>Захиалга засах · ${escapeHtml(o.quote_no || '')}</h2>
      <p class="naq-sub">${escapeHtml(o.company || '')} · ${escapeHtml(o.camp || '')}${o.tier ? ' · ' + escapeHtml(o.tier) : ''}</p>
      <div class="naq-preview-wrap" style="display:none;"></div>
      <div class="naq-edit">
        <div class="naq-grid">
          <label class="full">Компанийн нэр<input id="ne-company" value="${escapeHtml(o.company || '')}" /></label>
          <label class="full">Төлөв (шат)<select id="ne-status">${statusOpts}</select></label>
          <label>Регистр<input id="ne-reg" value="${escapeHtml(o.reg_no || '')}" /></label>
          <label>Холбоо барих<input id="ne-contact" value="${escapeHtml(o.contact || '')}" /></label>
          <label>Утас<input id="ne-phone" value="${escapeHtml(o.phone || '')}" /></label>
          <label>И-мэйл<input id="ne-email" value="${escapeHtml(o.email || '')}" /></label>
          <label>Кемп<select id="ne-camp">${campOpts}</select></label>
          <label>Багц<input id="ne-tier" value="${escapeHtml(o.tier || '')}" placeholder="Стандарт..." /></label>
          <label>Хүний тоо<input id="ne-guests" type="number" min="0" inputmode="numeric" value="${guests}" /></label>
          <label>Эхлэх<input id="ne-start" type="datetime-local" value="${toLocalInput(o.date_start)}" /></label>
          <label>Дуусах<input id="ne-end" type="datetime-local" value="${toLocalInput(o.date_end)}" /></label>
        </div>
        <span class="naq-sectitle">Бараа / үйлчилгээ <small>(багц = үнэгүй багтсан)</small></span>
        <div id="ne-items" class="naq-items"></div>
        <button class="naq-addbtn" id="ne-add">+ Мөр нэмэх</button>
        <span class="naq-sectitle">Гэрээний гүйцэтгэл (акт) <small>(төлбөр гүйцэтгэлийн дараа — муу гүйцэтгэлийн хасалт энд)</small></span>
        <div class="naq-grid">
          <label>Эцсийн гэрээний дүн (акт) ₮<input id="ne-final" type="number" min="0" inputmode="numeric" value="${Number(o.final_amount) > 0 ? Number(o.final_amount) : ''}" placeholder="хоосон = гэрээтэй ижил" /></label>
          <label>Хасалтын шалтгаан / тэмдэглэл<input id="ne-note" value="${escapeHtml(o.note || '')}" placeholder="жишээ: гүйцэтгэл актаар буурсан" /></label>
        </div>
        <div id="ne-deduct" class="naq-deduct"></div>
      </div>
      <div class="naq-foot">
        <div id="ne-total" class="naq-total"></div>
        <div class="naq-actions">
          <button class="btn naq-pv-show">👁 Урьдчилан харах</button>
          <button class="btn" id="ne-cancel">Болих</button>
          <button class="btn btn-primary" id="ne-save">💾 Хадгалах</button>
        </div>
      </div>
    </div>`;
  document.body.appendChild(modal);
  modal.classList.add('open');   // .modal-bg нь .open класстай үед л харагдана
  const ib = nomaadItemsBindings(modal, items, '#ne-items', '#ne-total', '#ne-add');
  // Гэрээний дүн (бараа) − Эцсийн гэрээний дүн (акт) = гүйцэтгэлийн хасалт (live)
  const curGrand = () => items.reduce((s, it) => s + (it.included ? 0 : (Number(it.unit_price) || 0) * (Number(it.qty) || 0)), 0);
  const updateDeduct = () => {
    const g = curGrand();
    const fv = modal.querySelector('#ne-final').value;
    const el = modal.querySelector('#ne-deduct');
    if (fv === '') { el.innerHTML = `<small>Акт оруулаагүй — гэрээний дүн (${fmtMoney(g)}) хэвээр.</small>`; return; }
    const final = Math.max(0, Number(fv) || 0);
    const ded = g - final;
    if (ded > 0) el.innerHTML = `<span class="naq-deduct-on">Гүйцэтгэлийн хасалт: −${fmtMoney(ded)}</span> <small>(гэрээ ${fmtMoney(g)} − акт ${fmtMoney(final)})</small>`;
    else if (ded < 0) el.innerHTML = `<span class="naq-deduct-add">Нэмэгдэл: +${fmtMoney(-ded)}</span> <small>(акт ${fmtMoney(final)} > гэрээ ${fmtMoney(g)})</small>`;
    else el.innerHTML = `<small>Акт = гэрээний дүн (хасалтгүй).</small>`;
  };
  modal.querySelector('#ne-final').addEventListener('input', updateDeduct);
  ['input', 'change', 'click'].forEach(ev => modal.querySelector('#ne-items').addEventListener(ev, updateDeduct));
  modal.querySelector('#ne-add').addEventListener('click', updateDeduct);
  updateDeduct();
  modal.querySelector('#ne-guests').addEventListener('input', (e) => {
    guests = Math.max(0, Number(e.target.value) || 0);
    const tb = items.find(it => it.category === 'Үндсэн багц');
    if (tb) { tb.qty = guests; ib.recalc(tb); ib.renderItems(); }
    updateDeduct();
  });
  nomaadWirePreview(modal, () => ({
    quote_no: o.quote_no,
    company: modal.querySelector('#ne-company').value.trim(),
    camp: modal.querySelector('#ne-camp').value,
    tier: modal.querySelector('#ne-tier').value.trim(),
    contact: modal.querySelector('#ne-contact').value.trim(),
    phone: modal.querySelector('#ne-phone').value.trim(),
    email: modal.querySelector('#ne-email').value.trim(),
    guests: Number(modal.querySelector('#ne-guests').value) || 0,
    date_start: modal.querySelector('#ne-start').value,
    date_end: modal.querySelector('#ne-end').value,
  }), items);
  modal.querySelector('#ne-cancel').addEventListener('click', () => modal.remove());
  modal.addEventListener('click', (e) => { if (e.target === modal) modal.remove(); });
  modal.querySelector('#ne-save').addEventListener('click', (e) => saveNomaadEdit(o, items, guests, modal, e.currentTarget));
}

async function saveNomaadEdit(o, items, guests, modal, btn) {
  btn.disabled = true;
  items.forEach((it, idx) => { it.row_num = idx + 1; it.total = it.included ? 0 : (Number(it.unit_price) || 0) * (Number(it.qty) || 0); });
  const grand = items.reduce((s, it) => s + (it.included ? 0 : it.total), 0);
  const deposit = Math.round(grand * 0.3);
  const fmtDT = v => v ? String(v).replace('T', ' ') : '';
  const startVal = modal.querySelector('#ne-start').value;
  const endVal = modal.querySelector('#ne-end').value;
  const finalVal = modal.querySelector('#ne-final').value;
  const fields = {
    company: modal.querySelector('#ne-company').value.trim(),
    status: modal.querySelector('#ne-status').value,
    reg_no: modal.querySelector('#ne-reg').value.trim(),
    contact: modal.querySelector('#ne-contact').value.trim(),
    phone: modal.querySelector('#ne-phone').value.trim(),
    email: modal.querySelector('#ne-email').value.trim(),
    camp: modal.querySelector('#ne-camp').value,
    tier: modal.querySelector('#ne-tier').value.trim(),
    note: modal.querySelector('#ne-note').value.trim(),
    // Эцсийн гэрээний дүн (акт) — хоосон бол хуучин утгыг хадгална (санамсаргүй устгахаас сэргийлнэ)
    final_amount: finalVal !== '' ? Math.max(0, Number(finalVal) || 0) : (o.final_amount || ''),
    // Хоосон бол хуучин утгыг хадгална (parse хийгдэхгүй чөлөөт текст огноог хамгаална)
    date_start: startVal ? fmtDT(startVal) : (o.date_start || ''),
    date_end: endVal ? fmtDT(endVal) : (o.date_end || ''),
  };
  const body = {
    action: 'update_quote', quote_no: o.quote_no,
    ...fields, guests, grand_total: grand, deposit,
    items: items.map(it => ({ row_num: it.row_num, category: it.category, name: it.name, qty: it.qty, unit: it.unit, unit_price: it.unit_price, total: it.total, included: it.included, note: it.note })),
  };
  try {
    const r = await fetchWithTimeout(withKey(state.config.nomaadOrdersUrl), {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
    }, 20000);
    if (!r.ok) throw new Error('HTTP ' + r.status);
    Object.assign(o, { ...fields, guests, grand_total: grand, deposit, items });
    showToast('Захиалга шинэчлэгдлээ', 'success', 2500);
    modal.remove(); render();
  } catch (e) {
    showToast('Алдаа: ' + e.message + ' (засвар локалд үлдсэнгүй)', 'error', 5000);
    btn.disabled = false;
  }
}

/* ===================== Шинэ үнийн санал үүсгэх (аппаас) ===================== */
function nextNomaadQuoteNo() {
  const yr = new Date().getFullYear();
  let max = 0;
  (state.nomaadOrders || []).forEach(o => {
    const m = String(o.quote_no || '').match(new RegExp('^NC-' + yr + '-(\\d+)$'));
    if (m) max = Math.max(max, Number(m[1]));
  });
  return 'NC-' + yr + '-' + String(max + 1).padStart(4, '0');
}
/* Нэг item-ийн карт (засварлах) — Үүсгэх ба Засах модалд хуваалцана */
function nomaadItemCardHtml(it, i) {
  const amt = it.included ? 0 : (Number(it.total) || 0);
  return `
    <div class="ne-row naq-item${it.included ? ' incl' : ''}" data-idx="${i}">
      <div class="naq-item-top">
        <input class="ne-name" value="${escapeHtml(it.name || '')}" placeholder="Бараа / үйлчилгээний нэр" />
        <button class="ne-rm naq-rm" title="Мөр устгах" aria-label="Мөр устгах">×</button>
      </div>
      <div class="naq-item-mid">
        <label>Тоо<input class="ne-qty naq-num" type="number" min="0" inputmode="numeric" value="${it.qty}" /></label>
        <label>Нэгж үнэ ₮<input class="ne-price naq-price" type="number" min="0" inputmode="numeric" value="${it.unit_price}" ${it.included ? 'disabled' : ''} /></label>
        <span class="ne-amt naq-amt">${fmtMoney(amt)}</span>
      </div>
      <label class="naq-incl"><input type="checkbox" class="ne-incl" ${it.included ? 'checked' : ''} /> Багцад үнэгүй багтсан</label>
    </div>`;
}

/* Үнийн саналыг уншихад тохиромжтой хэлбэрээр урьдчилан харуулах */
function nomaadQuotePreviewHtml(m, items) {
  const live = items.filter(it => (it.name || '').trim() || Number(it.qty) || Number(it.unit_price));
  const rows = live.map(it => {
    const amt = it.included ? 0 : (Number(it.unit_price) || 0) * (Number(it.qty) || 0);
    return `<tr>
      <td>${escapeHtml(it.name || '—')}${it.included ? ' <span class="naq-pv-free">үнэгүй</span>' : ''}</td>
      <td class="r">${Number(it.qty) || 0}${it.unit ? ' ' + escapeHtml(it.unit) : ''}</td>
      <td class="r">${it.included ? '—' : fmtMoney(it.unit_price)}</td>
      <td class="r">${it.included ? '0₮' : fmtMoney(amt)}</td>
    </tr>`;
  }).join('');
  const grand = items.reduce((s, it) => s + (it.included ? 0 : (Number(it.unit_price) || 0) * (Number(it.qty) || 0)), 0);
  const dep = Math.round(grand * 0.3);
  const dr = [m.date_start, m.date_end].filter(Boolean).map(d => String(d).replace('T', ' ').slice(0, 16)).join(' → ');
  return `
    <div class="naq-preview">
      <button class="btn naq-pv-back" style="margin-bottom:14px;">← Засвар руу буцах</button>
      <div class="naq-pv-card">
        <div class="naq-pv-h">
          <div>
            <div class="naq-pv-title">Үнийн санал</div>
            <div class="naq-pv-no">${escapeHtml(m.quote_no || '')}</div>
          </div>
          <div class="naq-pv-camp">${escapeHtml(m.camp || '')}${m.tier ? '<br>' + escapeHtml(m.tier) : ''}</div>
        </div>
        <div class="naq-pv-meta">
          ${m.company ? `<div><b>${escapeHtml(m.company)}</b></div>` : ''}
          ${m.contact ? `<div>${escapeHtml(m.contact)}${m.phone ? ' · ' + escapeHtml(m.phone) : ''}</div>` : (m.phone ? `<div>${escapeHtml(m.phone)}</div>` : '')}
          ${m.email ? `<div>${escapeHtml(m.email)}</div>` : ''}
          ${dr ? `<div>📅 ${escapeHtml(dr)}</div>` : ''}
          ${m.guests ? `<div>👥 ${m.guests} хүн</div>` : ''}
        </div>
        <table class="naq-pv-table">
          <thead><tr><th>Бараа / үйлчилгээ</th><th class="r">Тоо</th><th class="r">Нэгж үнэ</th><th class="r">Дүн</th></tr></thead>
          <tbody>${rows || '<tr><td colspan="4" class="naq-pv-empty">Мөр алга</td></tr>'}</tbody>
        </table>
        <div class="naq-pv-totals">
          <div><span>Нийт дүн</span><b>${fmtMoney(grand)}</b></div>
          <div><span>Урьдчилгаа (30%)</span><b>${fmtMoney(dep)}</b></div>
          <div class="naq-pv-bal"><span>Үлдэгдэл төлбөр</span><b>${fmtMoney(grand - dep)}</b></div>
        </div>
      </div>
    </div>`;
}

/* "Урьдчилан харах" товчийг утсаар холбоно: засвар ⇄ preview солих */
function nomaadWirePreview(modal, getMeta, items) {
  const showBtn = modal.querySelector('.naq-pv-show');
  const editWrap = modal.querySelector('.naq-edit');
  const pvWrap = modal.querySelector('.naq-preview-wrap');
  if (!showBtn || !editWrap || !pvWrap) return;
  showBtn.addEventListener('click', () => {
    pvWrap.innerHTML = nomaadQuotePreviewHtml(getMeta(), items);
    editWrap.style.display = 'none';
    pvWrap.style.display = 'block';
    modal.querySelector('.modal').scrollTop = 0;
    pvWrap.querySelector('.naq-pv-back').addEventListener('click', () => {
      pvWrap.style.display = 'none';
      editWrap.style.display = '';
    });
  });
}

function nomaadItemsBindings(modal, items, itemsSel, totalSel, addSel) {
  const itemsEl = modal.querySelector(itemsSel);
  const totalEl = modal.querySelector(totalSel);
  const recalc = it => { it.total = it.included ? 0 : (Number(it.unit_price) || 0) * (Number(it.qty) || 0); };
  const grand = () => items.reduce((s, it) => s + (it.included ? 0 : (Number(it.total) || 0)), 0);
  const renderTotal = () => { totalEl.textContent = 'Нийт дүн: ' + fmtMoney(grand()) + ' · Урьдчилгаа 30%: ' + fmtMoney(Math.round(grand() * 0.3)); };
  function renderItems() {
    itemsEl.innerHTML = items.map((it, i) => nomaadItemCardHtml(it, i)).join('');
    renderTotal();
  }
  renderItems();
  itemsEl.addEventListener('input', (e) => {
    const row = e.target.closest('.ne-row'); if (!row) return;
    const it = items[+row.dataset.idx];
    if (e.target.classList.contains('ne-name')) it.name = e.target.value;
    else if (e.target.classList.contains('ne-qty')) { it.qty = Math.max(0, Number(e.target.value) || 0); recalc(it); row.querySelector('.ne-amt').textContent = fmtMoney(it.total); renderTotal(); }
    else if (e.target.classList.contains('ne-price')) { it.unit_price = Math.max(0, Number(e.target.value) || 0); recalc(it); row.querySelector('.ne-amt').textContent = fmtMoney(it.total); renderTotal(); }
  });
  itemsEl.addEventListener('change', (e) => {
    if (!e.target.classList.contains('ne-incl')) return;
    const it = items[+e.target.closest('.ne-row').dataset.idx];
    it.included = e.target.checked; recalc(it); renderItems();
  });
  itemsEl.addEventListener('click', (e) => {
    if (!e.target.classList.contains('ne-rm')) return;
    items.splice(+e.target.closest('.ne-row').dataset.idx, 1); renderItems();
  });
  modal.querySelector(addSel).addEventListener('click', () => {
    items.push({ row_num: items.length + 1, category: 'Нэмэлт үйлчилгээ', name: '', qty: 1, unit: 'ш', unit_price: 0, included: false, total: 0, note: '' });
    renderItems();
  });
  return { renderItems, recalc };
}
function openNomaadCreateModal() {
  if (!state.config.nomaadOrdersUrl) { showToast('NOMAAD backend тохируулаагүй', 'error'); return; }
  const quoteNo = nextNomaadQuoteNo();
  const items = [{ row_num: 1, category: 'Үндсэн багц', name: 'Багц үнэ', qty: 0, unit: 'хүн', unit_price: 0, included: false, total: 0, note: '' }];
  const camps = ['NOMAAD Summit', 'NOMAAD Meadow', 'NOMAAD Grove', 'Нүүдлийн кемп'];
  document.getElementById('nomaad-create-modal')?.remove();
  const modal = document.createElement('div');
  modal.className = 'modal-bg'; modal.id = 'nomaad-create-modal';
  modal.innerHTML = `
    <div class="modal naq-modal">
      <h2>Шинэ үнийн санал · ${escapeHtml(quoteNo)}</h2>
      <div class="naq-preview-wrap" style="display:none;"></div>
      <div class="naq-edit">
        <div class="naq-grid">
          <label class="full">Компанийн нэр <span style="color:var(--danger)">*</span><input id="nc-company" placeholder="Компани / захиалагч" /></label>
          <label>Регистр<input id="nc-reg" /></label>
          <label>Утас<input id="nc-phone" /></label>
          <label>Холбоо барих<input id="nc-contact" /></label>
          <label>И-мэйл<input id="nc-email" /></label>
          <label>Кемп<select id="nc-camp">${camps.map(c => `<option>${c}</option>`).join('')}</select></label>
          <label>Багц<input id="nc-tier" placeholder="Стандарт..." /></label>
          <label>Хүний тоо<input id="nc-guests" type="number" min="0" inputmode="numeric" value="0" /></label>
          <label>Эхлэх<input id="nc-start" type="datetime-local" /></label>
          <label>Дуусах<input id="nc-end" type="datetime-local" /></label>
        </div>
        <span class="naq-sectitle">Бараа / үйлчилгээ <small>(багц = үнэгүй багтсан · Үндсэн багц = Хүний тоогоор)</small></span>
        <div id="nc-items" class="naq-items"></div>
        <button class="naq-addbtn" id="nc-add">+ Мөр нэмэх</button>
      </div>
      <div class="naq-foot">
        <div id="nc-total" class="naq-total"></div>
        <div class="naq-actions">
          <button class="btn naq-pv-show">👁 Урьдчилан харах</button>
          <button class="btn" id="nc-cancel">Болих</button>
          <button class="btn btn-primary" id="nc-save">💾 Үүсгэх</button>
        </div>
      </div>
    </div>`;
  document.body.appendChild(modal);
  modal.classList.add('open');   // .modal-bg нь .open класстай үед л харагдана
  const ib = nomaadItemsBindings(modal, items, '#nc-items', '#nc-total', '#nc-add');
  nomaadWirePreview(modal, () => ({
    quote_no: quoteNo,
    company: modal.querySelector('#nc-company').value.trim(),
    contact: modal.querySelector('#nc-contact').value.trim(),
    phone: modal.querySelector('#nc-phone').value.trim(),
    email: modal.querySelector('#nc-email').value.trim(),
    camp: modal.querySelector('#nc-camp').value,
    tier: modal.querySelector('#nc-tier').value.trim(),
    guests: Number(modal.querySelector('#nc-guests').value) || 0,
    date_start: modal.querySelector('#nc-start').value,
    date_end: modal.querySelector('#nc-end').value,
  }), items);
  modal.querySelector('#nc-guests').addEventListener('input', (e) => {
    const g = Math.max(0, Number(e.target.value) || 0);
    const tb = items.find(it => it.category === 'Үндсэн багц');
    if (tb) { tb.qty = g; ib.recalc(tb); ib.renderItems(); }
  });
  modal.querySelector('#nc-cancel').addEventListener('click', () => modal.remove());
  modal.addEventListener('click', (e) => { if (e.target === modal) modal.remove(); });
  modal.querySelector('#nc-save').addEventListener('click', (e) => saveNomaadCreate(quoteNo, items, modal, e.currentTarget));
}
async function saveNomaadCreate(quoteNo, items, modal, btn) {
  const company = modal.querySelector('#nc-company').value.trim();
  if (!company) { showToast('Компанийн нэр оруулна уу', 'warn'); return; }
  btn.disabled = true;
  items.forEach((it, idx) => { it.row_num = idx + 1; it.total = it.included ? 0 : (Number(it.unit_price) || 0) * (Number(it.qty) || 0); });
  const grand = items.reduce((s, it) => s + (it.included ? 0 : it.total), 0);
  const fmtDT = v => v ? String(v).replace('T', ' ') : '';
  const body = {
    action: 'create_quote', quote_no: quoteNo, company,
    reg_no: modal.querySelector('#nc-reg').value.trim(),
    contact: modal.querySelector('#nc-contact').value.trim(),
    phone: modal.querySelector('#nc-phone').value.trim(),
    email: modal.querySelector('#nc-email').value.trim(),
    camp: modal.querySelector('#nc-camp').value,
    tier: modal.querySelector('#nc-tier').value.trim(),
    guests: Number(modal.querySelector('#nc-guests').value) || 0,
    date_start: fmtDT(modal.querySelector('#nc-start').value),
    date_end: fmtDT(modal.querySelector('#nc-end').value),
    grand_total: grand, deposit: Math.round(grand * 0.3), status: 'ШИНЭ',
    items: items.map(it => ({ row_num: it.row_num, category: it.category, name: it.name, qty: it.qty, unit: it.unit, unit_price: it.unit_price, total: it.total, included: it.included, note: it.note })),
  };
  try {
    const r = await fetchWithTimeout(withKey(state.config.nomaadOrdersUrl), {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
    }, 20000);
    if (!r.ok) throw new Error('HTTP ' + r.status);
    (state.nomaadOrders = state.nomaadOrders || []).unshift({ ...body, income_amount: 0 });
    showToast('Үнийн санал үүслээ · ' + quoteNo, 'success', 3000);
    modal.remove(); render();
    loadNomaadOrders();
  } catch (e) {
    showToast('Алдаа: ' + e.message, 'error', 5000);
    btn.disabled = false;
  }
}

/* Илгээсэн/одоогийн үнийн саналыг шинэ таб дээр харах — nomaad-quote-view webhook бүрэн
   форматтай үнийн саналыг (PDF-ийн агуулга) HTML болгож буцаана. Имэйл явуулахгүй. */
function openNomaadQuoteView(quoteNo) {
  const url = state.config.nomaadQuoteViewUrl;
  if (!url) { showToast('Үнийн санал харах backend тохируулаагүй', 'error'); return; }
  const full = withKey(url + '?quote_no=' + encodeURIComponent(quoteNo));
  window.open(full, '_blank', 'noopener');
}

/* Үнийн санал илгээх — nomaad-quote-send webhook (Төлөв=ИЛГЭЭХ) → хэрэглэгч рүү ШУУД Gmail-ээр
   илгээнэ (PDF + гэрчилгээ хавсаргана). Ноорог биш — менежер CEO-гоор дамжихгүй өөрөө илгээнэ.
   source:'app' тул Quote Log-ийн Төлөв "АПП-д нэмэх" хэвээр (захиалга аппд үлдэнэ). */
async function sendNomaadQuote(quoteNo) {
  const o = (state.nomaadOrders || []).find(x => x.quote_no === quoteNo);
  if (!o) { showToast('Захиалга олдсонгүй', 'error'); return; }
  if (!o.email || !String(o.email).trim()) {
    showToast('⚠ Имэйл хаяг алга — эхлээд ✏️ Засах дээр имэйл оруулна уу', 'warn', 5000); return;
  }
  const ok = await showConfirm(
    `${o.company || quoteNo} — үнийн саналыг доорх хаяг руу ШУУД илгээх үү?\nPDF + улсын бүртгэлийн гэрчилгээ хавсаргана. (Ноорог биш — шууд хүрнэ)\n\n📧 ${o.email}`,
    { title: 'Үнийн санал илгээх', okText: 'Шууд илгээх' });
  if (!ok) return;
  showToast('Илгээж байна…', 'info', 2000);
  try {
    const r = await fetchWithTimeout(withKey(state.config.nomaadQuoteSendUrl), {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 'Төлөв': 'ИЛГЭЭХ', 'Үнийн саналын дугаар': quoteNo, source: 'app' }),
    }, 30000);
    if (!r.ok) throw new Error('HTTP ' + r.status);
    showToast(`✓ Үнийн санал ${o.email} рүү илгээгдлээ`, 'success', 4500);
    // Төлөвийг локалд ИЛГЭЭСЭН болгож шууд "Үнийн санал илгээсэн" шатанд оруулна (backend ч шинэчилнэ)
    if (!String(o.status || '').toUpperCase().includes('ИЛГЭЭ')) { o.status = 'ИЛГЭЭСЭН'; render(); }
  } catch (e) {
    showToast('Алдаа: ' + e.message, 'error', 5000);
  }
}
// Орлого модал — 4 хэсэг (урьдчилгаа/үлдэгдэл/нэмэлт/эвдрэл) + нийт. Объект эсвэл null.
function openNomaadIncomeModal(o) {
  return new Promise((resolve) => {
    const modal = document.getElementById('nomaad-income-modal');
    const fA = document.getElementById('ni-advance'), fB = document.getElementById('ni-balance'),
          fN = document.getElementById('ni-addon'), fD = document.getElementById('ni-damage');
    const totalEl = document.getElementById('ni-total');
    const okBtn = document.getElementById('ni-ok'), cancelBtn = document.getElementById('ni-cancel');
    const fields = [fA, fB, fN, fD];
    document.getElementById('ni-company').textContent = (o.company || '') + ' · ' + (o.quote_no || '');
    // Урьдчилгаа = deposit, Үлдэгдэл = нийт − урьдчилгаа (засаж болно)
    fA.value = o.income_advance != null && o.income_amount ? o.income_advance : (o.deposit || '');
    fB.value = o.income_balance != null && o.income_amount ? o.income_balance : ((Number(o.grand_total) || 0) - (Number(o.deposit) || 0) || '');
    fN.value = o.income_addon || ''; fD.value = o.income_damage || '';
    const sum = () => fields.reduce((s, f) => s + (Number(f.value) || 0), 0);
    const upd = () => { totalEl.textContent = 'Нийт орлого: ' + fmtMoney(Math.round(sum())); };
    fields.forEach(f => f.oninput = upd); upd();
    function cleanup(result) { modal.classList.remove('open'); okBtn.onclick = null; cancelBtn.onclick = null; fields.forEach(f => f.oninput = null); resolve(result); }
    okBtn.onclick = () => {
      const total = Math.round(sum());
      if (total <= 0) { showToast('Дор хаяж нэг дүн оруулна уу.', 'warn', 2000); return; }
      cleanup({ advance: Number(fA.value) || 0, balance: Number(fB.value) || 0, addon: Number(fN.value) || 0, damage: Number(fD.value) || 0, total });
    };
    cancelBtn.onclick = () => cleanup(null);
    modal.classList.add('open');
    setTimeout(() => fA.focus(), 50);
  });
}
async function recordNomaadIncome(quoteNo) {
  const o = (state.nomaadOrders || []).find(x => x.quote_no === quoteNo);
  if (!o) return;
  const res = await openNomaadIncomeModal(o);
  if (!res) return;
  if (!(await showConfirm(`${o.company}: нийт ${fmtMoney(res.total)} орлого бүртгэх үү?\n(Урьд ${fmtMoney(res.advance)} · Үлд ${fmtMoney(res.balance)} · Нэм ${fmtMoney(res.addon)} · Эвд ${fmtMoney(res.damage)})`, { okText: 'Тийм, бүртгэх' }))) return;
  const today = new Date().toISOString().slice(0, 10);
  Object.assign(o, { income_amount: res.total, income_advance: res.advance, income_balance: res.balance, income_addon: res.addon, income_damage: res.damage, income_date: today, income_by: state.me });
  render();
  try {
    const r = await fetchWithTimeout(withKey(state.config.nomaadOrdersUrl), {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'record_income', quote_no: quoteNo, income_amount: res.total, income_advance: res.advance, income_balance: res.balance, income_addon: res.addon, income_damage: res.damage, income_date: today, income_by: state.me }),
    }, 15000);
    if (r.ok) showToast(`${o.company} — ${fmtMoney(res.total)} орлого бүртгэлээ`, 'success', 2500);
    else showToast('Локалд хадгалсан. Sheet sync хийгдээгүй.', 'warn');
  } catch (e) { showToast('Локалд хадгалсан, sheet sync алдаатай.', 'warn'); }
}

// Ажилтны бүлэг — Master Sheet-ийн "Бүлэг" багана (m.group). Цагийн ажилтныг
// (daily) тусад нь гаргана (тэд бүгд "Нэгдсэн" бүлэгтэй ч тусдаа харагдах ёстой).
function memberGroupOf(m) {
  if (m.worker_type === 'daily') return 'Цагийн ажилтан';
  return String(m.group || m.branch || '').trim() || 'Бусад';
}
// Бүлэглэсэн <optgroup> сонголтууд. Дараалал: M Event → Camp → Нэгдсэн → бусад → Цагийн ажилтан.
function memberOptgroupsHtml(selected, placeholder = true) {
  const active = (TEAM || []).filter(m => (m.status || 'идэвхтэй') !== 'гарсан');
  const byGroup = {};
  active.forEach(m => { const g = memberGroupOf(m); (byGroup[g] = byGroup[g] || []).push(m); });
  const pref = ['M Event', 'Camp', 'Нэгдсэн'];
  const others = Object.keys(byGroup).filter(g => !pref.includes(g) && g !== 'Цагийн ажилтан').sort();
  const order = [...pref, ...others, 'Цагийн ажилтан'];
  let html = placeholder ? '<option value="">— Сонгох —</option>' : '';
  for (const g of order) {
    const ms = byGroup[g];
    if (!ms || !ms.length) continue;
    html += `<optgroup label="${escapeHtml(g)} (${ms.length})">`;
    html += ms.map(m => {
      const k = personKey(m);
      return `<option value="${escapeHtml(k)}"${k === selected ? ' selected' : ''}>${escapeHtml(m.name)}${m.role ? ' · ' + escapeHtml(m.role) : ''}</option>`;
    }).join('');
    html += '</optgroup>';
  }
  return html;
}
// Бүлэг-эхэнд нэг хүн сонгох picker — жагсаалт дээр дарж сонгоно. personKey эсвэл null буцаана.
function openGroupSinglePicker(currentKey = '', title = 'Хүн сонгох') {
  const modal = document.getElementById('single-pick-modal');
  const listEl = document.getElementById('sp-list');
  const searchEl = document.getElementById('sp-search');
  document.getElementById('sp-title').textContent = title;
  const expandedGroups = new Set();
  let finish;
  function renderList() {
    const q = (searchEl.value || '').toLowerCase().trim();
    const active = (TEAM || []).filter(m => (m.status || 'идэвхтэй') !== 'гарсан');
    const byGroup = {};
    active.forEach(m => {
      const ok = !q || (m.name || '').toLowerCase().includes(q) || (m.role || '').toLowerCase().includes(q);
      if (!ok) return;
      const g = memberGroupOf(m);
      (byGroup[g] = byGroup[g] || []).push(m);
    });
    const pref = ['M Event', 'Camp', 'Нэгдсэн'];
    const others = Object.keys(byGroup).filter(g => !pref.includes(g) && g !== 'Цагийн ажилтан').sort();
    const order = [...pref, ...others, 'Цагийн ажилтан'].filter(g => byGroup[g] && byGroup[g].length);
    const autoExpand = !!q;
    const rowHtml = (m) => {
      const k = personKey(m);
      const sel = k === currentKey;
      return `<button type="button" class="mp-row" data-sp-id="${escapeHtml(k)}" style="width:100%;text-align:left;border:none;background:${sel ? 'var(--panel-hover)' : 'transparent'};padding-left:16px;cursor:pointer;">
        <span class="mp-avatar">${escapeHtml(memberInitials(k))}</span>
        <span class="mp-info"><span class="mp-name">${escapeHtml(m.name)}</span><span class="mp-role">${escapeHtml(m.role || '')}</span></span>
        ${sel ? '<span style="margin-left:auto;color:var(--accent-green);font-weight:700;">✓</span>' : ''}
      </button>`;
    };
    listEl.innerHTML = order.map(g => {
      const ms = byGroup[g];
      const open = autoExpand || expandedGroups.has(g);
      return `<div class="mp-group">
        <button type="button" data-sp-group="${escapeHtml(g)}" style="display:flex;align-items:center;justify-content:space-between;width:100%;gap:8px;padding:11px 12px;margin-top:6px;background:var(--panel-hover);border:1px solid var(--border);border-radius:var(--r-md);font-weight:600;cursor:pointer;color:var(--text);font-size:14px;">
          <span>${open ? '▾' : '▸'} ${escapeHtml(g)} <span style="color:var(--muted);font-weight:400;">(${ms.length})</span></span>
        </button>
        <div style="display:${open ? 'block' : 'none'};">${ms.map(rowHtml).join('')}</div>
      </div>`;
    }).join('') || '<div style="padding:14px;color:var(--muted);">Ажилтан олдсонгүй</div>';
    listEl.querySelectorAll('button[data-sp-group]').forEach(btn => {
      btn.addEventListener('click', () => {
        const g = btn.dataset.spGroup;
        if (expandedGroups.has(g)) expandedGroups.delete(g); else expandedGroups.add(g);
        renderList();
      });
    });
    listEl.querySelectorAll('button[data-sp-id]').forEach(btn => {
      btn.addEventListener('click', () => finish(btn.dataset.spId));
    });
  }
  searchEl.value = '';
  searchEl.oninput = renderList;
  renderList();
  modal.classList.add('open');
  return new Promise((resolve) => {
    finish = (key) => { modal.classList.remove('open'); searchEl.oninput = null; resolve(key); };
    document.getElementById('sp-cancel').onclick = () => finish(null);
  });
}
// Захиалгын Quote Items-ийг ажилтнуудад хувиарлах модал.
/* ─── Арга хэмжээний бэлтгэлийн стандарт чеклист ───
   NOMAAD захиалга бүрт давтагддаг ажлууд. Шинэ зүйл нэмэх/засах бол энэ жагсаалтыг
   засна. group=бүлэг, deadline=цаг (гарчигт орно, task-д цагийн талбар байхгүй),
   photo=зураг шаардах эсэх, detail=урт заавар (тайлбарт орно). */
const NOMAAD_PREP_CHECKLIST = [
  { group: "Хог", title: "Гадаа хог цэвэрлэх", deadline: "09:00-аас өмнө", photo: true },
  { group: "Хог", title: "Гадаа хог цэвэрлэх", deadline: "15:00-аас өмнө", photo: true },
  { group: "Хог", title: "Гадаа хог цэвэрлэх", deadline: "20:00-аас өмнө", photo: true },
  { group: "Ариун цэвэр", title: "Ариун цэврийн өрөө цэвэрлэх, хогны уут солих (00 дүүрсэн бол байршуулах)", deadline: "09:00-аас өмнө", photo: true },
  { group: "Ариун цэвэр", title: "Ариун цэврийн өрөө цэвэрлэх, хогны уут солих (00 дүүрсэн бол байршуулах)", deadline: "15:00-аас өмнө", photo: true },
  { group: "Ариун цэвэр", title: "Ариун цэврийн өрөө цэвэрлэх, хогны уут солих (00 дүүрсэн бол байршуулах)", deadline: "20:00-аас өмнө", photo: true },
  { group: "Ус", title: "Гар угаалтуурын ус шалгаж дүүргэх,шингэн саван бэлдэж тавих", deadline: "09:00", photo: false },
  { group: "Ус", title: "Гар угаалтуурын ус шалгаж дүүргэх,шингэн саван бэлдэж тавих", deadline: "15:00", photo: false },
  { group: "Ус", title: "Гар угаалтуурын ус шалгаж дүүргэх,шингэн саван бэлдэж тавих", deadline: "20:00", photo: false },
  { group: "Ус", title: "Долоо хоногийн усны хэрэглээг тооцоолж нөөц бэлтгэх — 00 (жорлон) + гар угаалтуур дүүргэх", deadline: "09:00-аас өмнө", photo: true, detail: "Үйл ажиллагааны дундуур ус авахгүй байхаар тооцоолж усны нөөцийг урьдчилан бэлэн байлгах." },
  { group: "Тайз/гэрэл", title: "Тайз, хөгжим, микрофон, гэрлтүүлгийн ажиллагаа шалгах мирофон батери нөөц бэлэн байх + борооны хамгаалалт", deadline: "үйл ажиллагаанаас өмнө (09:00)", photo: true, detail: "Цаг агаар шалгаж борооны хамгаалалтыг бэлэн байлгах." },
  { group: "Тайз/гэрэл", title: "хөгжим, микрофон, фүльт гэх мэт бороонд норох зүйлсийг хөгжимийн хайрцагт хийж хураах", deadline: "үйл ажиллагааны дараа 00:00", photo: false },
  { group: "Хоолны асар", title: "Ширээ сандал хүний тоогоор зөв байрлуулах + угаасан бүтээлэгтэй + ширээ бүрд салфетка", deadline: "09:00-аас өмнө", photo: true },
  { group: "Хоолны асар", title: "Асрын зүлэг шүүрдэж соруулж цэвэрлэх, хогны сав байрлуулах, гэрэл 20:00-д ажиллахад бэлэн", deadline: "09:00-аас өмнө", photo: true },
  { group: "Хоол", title: "Гал тогооны тоног төхөөрөмж бүрэн ажиллаж байгаа эсэх газны нөөцийг шалгах цэнэглэх", deadline: "Хоёр хонгийн өмнө", photo: false },
  { group: "Хоол", title: "Хүнсний материал дутуу эсэхийг шалгаж  2 хонгийн өмнө бэлдэх 100% бэлэн болгох", deadline: "Хоёр хонгийн өмнө", photo: false },
  { group: "Хоол", title: "Өглөөний цай менежерээс мэдээлэл авч өглөө бэлтгэх", deadline: "", photo: false },
  { group: "Хоол", title: "Өглөөний цайнаас хийхээс өмнө асар цэвэрлэх,ширээ засах,хогны сав байршуулах", deadline: "", photo: false },
  { group: "Хоол", title: "Өдрийн хоолны бэлтгэл — аяга таваг тоолох, буфет тоног төхөөрөмж цэвэрхэн, халуун цай/ус бэлэн", deadline: "өдрийн хоолны өмнө", photo: false },
  { group: "Хоол", title: "Өдрийн хоолны дараа аяга таваг хураах, 3 дамжлагаар угааж хатааж хайрцагт савлах", deadline: "өдрийн хоолны дараа", photo: false },
  { group: "Хоол", title: "Оройн хоолны бэлтгэл — аяга таваг тоолох, уфет тоног төхөөрөмж цэвэрхэн, халуун цай/ус бэлэн", deadline: "оройн хоолны өмнө", photo: false },
  { group: "Хоол", title: "Оройн хоолны дараа аяга таваг хураах, 3 дамжлагаар угааж хатааж хайрцагт савлах", deadline: "оройн хоолны дараа", photo: false },
  { group: "Хоол", title: "Хоол гаргах бүрийн өмнө болц голын темпратур шалгаж амталгаа хийж шалгах.Дүгнэлт бичих.", deadline: "", photo: false },
  { group: "Майхан", title: "Хүлээн авах/checkout-ын майхан шалгалт (ор, мешок, гадас татлага)", deadline: "хүлээн авах / checkout", photo: true, detail: "Нэг хүн удирдаж ажиллана.Бүх залуучуудыг майхныг тэнцүү хувааж: орны эвдрэл, мешок тоо, бохирдол шалгах. Ор гадаа гаргаж охидууд цэвэрлэгээнд бэлдэх, дараа нь стандартаар байрлуулах. Гадас татлага чангалах. Дутуу/эвдрэл/бохир бол менежерт даалгавар үүсгэх. Чийг/үнэр шалгаж агааржуулах, бороонд хаах." },
  { group: "Майхан", title: "Checkout-ийн дараа гарсан майхныг цэвэрлэх + майхан бүрийн зураг дарж баталгаажуулах", deadline: "өглөө checkout-ийн дараа", photo: true, detail: "Нэг хүн удирдаж ажиллана.Бүх охидууд гарсан майхныг тэнцүү хувааж цэвэрлэнэ. Цэвэрлэсэн майхан бүрийн зургийг дарж баталгаажуулна." },
  { group: "Цахилгаан", title: "Цахилгаан үүсгүүрийн түлш + кабель хүрэлцээ хангах", deadline: "үйл ажиллагаанаас өмнө", photo: false, detail: "Түлшийг үйл ажиллагааны дундуур зөөхгүй байхаар тооцоолж хангах. Кабель хүрэлцээ хангаж, эвдрэлийг яаралтай шийдвэрлэх/ашиглалтаас гаргах." },
  { group: "Хог", title: "Хог Эрдэнэ сумын хогны цэгт тээвэрлэж асгах", deadline: "үйл ажиллагааны дараа, даваа гараг", photo: true },
  { group: "Гал", title: "Оройн түүдэг галын мод түүж бэлтгэх, бүрэнхийд асаах", deadline: "орой", photo: false },
  { group: "Нэмэлт захиалга", title: "Автобус болон үйлчилүүлэгчийн нэмэлт хүсэлт захиалгуудыг нэгтгэж шинэ ажил үүсгэж ажилчдад хувиарлах", deadline: "үйл ажиллагаанаас өмнө", photo: false },
  { group: "Тайлан", title: "Арга хэмжээний дараа асуудал,гомдол,дараагийн арга хэмжээнд сайжруулах шаардлагтай зүйлсийг бичиж зургаар хавсаргах", deadline: "үйл ажиллагааны дараа, даваа гараг", photo: false },
];
// Ажлын гарчиг — модал (давхардал таних) ба үүсгэхэд ИЖИЛ байх ёстой. Хугацаагүй бол хаалт нэмэхгүй.
function prepTaskTitle(c) { return `${c.group}: ${c.title}${c.deadline ? ` (${c.deadline})` : ''}`; }
// Нэгдсэн бэлтгэл модал — (1) стандарт чеклист + (2) захиалгын бараа. Нэг газраас хүн оноож үүсгэнэ.
function openNomaadPrepChecklist(quoteNo) {
  const o = (state.nomaadOrders || []).find(x => x.quote_no === quoteNo);
  if (!o) return;
  const modal = document.getElementById('nomaad-assign-modal');
  document.getElementById('na-title').textContent = `Бэлтгэл · ${o.quote_no}`;
  document.getElementById('na-sub').textContent = `${o.company || ''} · ${o.camp || ''} ${o.tier || ''} · ${o.guests || 0} хүн · ${nomaadDatePlain(o.date_start)}`;
  const itemsEl = document.getElementById('na-items');
  const secHdr = (txt) => `<div style="font-size:12px;font-weight:800;color:var(--text);background:var(--bg-soft,#eef2f7);padding:8px 10px;margin:14px -4px 6px;border-radius:6px;">${escapeHtml(txt)}</div>`;
  const grpHdr = (txt) => `<div style="font-size:11px;font-weight:700;color:var(--text-soft);text-transform:uppercase;margin:10px 0 4px;">${escapeHtml(txt)}</div>`;
  const pickBtn = (type, idx, owner, exTask) => {
    const style = owner ? 'color:var(--text);border-style:solid;font-weight:600;' : 'color:var(--muted);border-style:dashed;font-weight:400;';
    const exId = exTask ? exTask.id : '';
    return `<button type="button" class="na-pick" data-na-type="${type}" data-na-item="${idx}" data-na-owner="${owner ? escapeHtml(owner) : ''}" data-na-exists="${exTask ? '1' : ''}" data-na-task-id="${escapeHtml(exId)}" data-na-orig="${owner ? escapeHtml(owner) : ''}" style="flex-shrink:0;min-width:140px;text-align:left;padding:7px 10px;border:1px dashed var(--border-strong);border-radius:var(--r-md);font-size:12px;background:var(--panel);cursor:pointer;${style}">${owner ? escapeHtml(memberName(owner)) : '+ Хүн сонгох'}</button>`;
  };
  const row = (label, meta, btn) => `<div style="display:flex;align-items:center;gap:8px;padding:6px 0;border-bottom:1px solid var(--border);"><span style="flex:1;font-size:13px;min-width:0;">${label}${meta}</span>${btn}</div>`;
  // 1) Стандарт чеклист (үүссэнийг таниж тэмдэглэнэ)
  const byGroup = {};
  NOMAAD_PREP_CHECKLIST.forEach((c, idx) => { (byGroup[c.group] = byGroup[c.group] || []).push({ c, idx }); });
  const findExisting = (c) => (state.tasks || []).find(t => t.title === prepTaskTitle(c)
    && (t.desc || '').includes(`NOMAAD ${o.quote_no} `) && t.status !== 'deleted');
  let html = secHdr('1. Үйл ажиллагааны чеклист');
  html += Object.keys(byGroup).map(g => grpHdr(g) + byGroup[g].map(({ c, idx }) => {
    const ex = findExisting(c);
    const meta = `<span style="color:var(--muted);font-size:11px;">${c.deadline ? '· ' + escapeHtml(c.deadline) : ''}${c.photo ? ' · ✓зураг' : ''}${ex ? ' · <b style="color:var(--ok)">✓ үүссэн</b>' : ''}</span>`;
    return row(escapeHtml(c.title) + ' ', meta, pickBtn('prep', idx, ex ? (ex.assignee || '') : '', ex));
  }).join('')).join('');
  // 2) Захиалгын бараа (түрээсийн эд хогшил)
  const items = o.items || [];
  if (items.length) {
    html += secHdr('2. Захиалгын бараа');
    const byCat = {};
    items.forEach((it, idx) => { (byCat[it.category || 'Бусад'] = byCat[it.category || 'Бусад'] || []).push({ it, idx }); });
    html += Object.keys(byCat).map(cat => grpHdr(cat) + byCat[cat].map(({ it, idx }) =>
      row(escapeHtml(it.name || '') + ' ', `<span style="color:var(--muted);font-size:11px;">${it.qty || ''} ${escapeHtml(it.unit || '')}</span>`, pickBtn('item', idx, '', false))
    ).join('')).join('');
  }
  itemsEl.innerHTML = html;
  function setOwnerBtn(btn, key) {
    btn.dataset.naOwner = key || '';
    if (key) { btn.textContent = memberName(key); btn.style.color = 'var(--text)'; btn.style.borderStyle = 'solid'; btn.style.fontWeight = '600'; }
    else { btn.textContent = '+ Хүн сонгох'; btn.style.color = 'var(--muted)'; btn.style.borderStyle = 'dashed'; btn.style.fontWeight = '400'; }
  }
  itemsEl.querySelectorAll('button.na-pick').forEach(btn => {
    btn.onclick = async () => {
      const picked = await openGroupSinglePicker(btn.dataset.naOwner || '', 'Хэн хариуцах вэ?');
      if (picked === null) return;
      setOwnerBtn(btn, picked);
    };
  });
  document.getElementById('na-bulk').onclick = async () => {
    const picked = await openGroupSinglePicker('', 'Бүгдийг хэнд оноох вэ?');
    if (picked === null) return;
    itemsEl.querySelectorAll('button.na-pick').forEach(b => setOwnerBtn(b, picked));
  };
  document.getElementById('na-cancel').onclick = () => modal.classList.remove('open');
  document.getElementById('na-send').onclick = () => sendNomaadPrepTasks(quoteNo);
  modal.classList.add('open');
}
async function sendNomaadPrepTasks(quoteNo) {
  const o = (state.nomaadOrders || []).find(x => x.quote_no === quoteNo);
  if (!o) return;
  const modal = document.getElementById('nomaad-assign-modal');
  const btns = [...modal.querySelectorAll('button.na-pick')];
  // 1a) Чеклистийн ШИНЭ ажил — үүсээгүйг үүсгэнэ (хүн заавал биш).
  const prepPicks = btns.filter(b => b.dataset.naType === 'prep' && b.dataset.naExists !== '1')
    .map(b => ({ idx: Number(b.dataset.naItem), owner: b.dataset.naOwner || '' }));
  // 1b) Үүссэн ажлыг ДАХИН ХУВИАРЛАХ — хариуцагч өөрчлөгдсөн бол шинэчилнэ.
  const prepReassign = btns.filter(b => b.dataset.naType === 'prep' && b.dataset.naExists === '1'
      && (b.dataset.naOwner || '') !== (b.dataset.naOrig || ''))
    .map(b => ({ id: b.dataset.naTaskId, owner: b.dataset.naOwner || '' }));
  // 2) Захиалгын бараа — зөвхөн хүн сонгосныг хүнээр бүлэглэж нэг ажил болгоно.
  const byAssignee = {};
  btns.filter(b => b.dataset.naType === 'item' && b.dataset.naOwner).forEach(b => {
    const it = (o.items || [])[Number(b.dataset.naItem)];
    if (it) (byAssignee[b.dataset.naOwner] = byAssignee[b.dataset.naOwner] || []).push(it.name);
  });
  const itemOwners = Object.keys(byAssignee);
  if (!prepPicks.length && !prepReassign.length && !itemOwners.length) { showToast('Өөрчлөлт алга.', 'warn', 3000); return; }
  if (!(await showConfirm(`"${o.company}" — ${prepPicks.length} шинэ ажил + ${prepReassign.length} дахин хувиарлах + ${itemOwners.length} барааны ажил. Үргэлжлүүлэх үү?`, { okText: 'Тийм' }))) return;
  modal.classList.remove('open');
  const due = o.date_start ? String(o.date_start).slice(0, 10) : '';
  let n = 0, assigned = 0;
  const created = []; // үүсгэсэн бүх ажил — доор зэрэгцээ (арын) бичнэ
  // Чеклист — зүйл бүрд нэг ажил
  for (const p of prepPicks) {
    const c = NOMAAD_PREP_CHECKLIST[p.idx];
    if (!c) continue;
    const ass = p.owner || '';
    const t = {
      id: uid(), title: prepTaskTitle(c),
      desc: `NOMAAD ${o.quote_no} · ${o.company || ''} · ${o.camp || ''} ${o.tier || ''} · ${o.guests || 0} хүн\nАрга хэмжээ: ${nomaadDatePlain(o.date_start)}${c.deadline ? '\nЭцсийн хугацаа: ' + c.deadline : ''}${c.detail ? '\n\n' + c.detail : ''}`,
      branch: 'camp', project: '', assignee: ass, due, priority: 'high', status: 'open',
      requires_photo: !!c.photo, createdBy: state.me, created: Date.now() + n, comments: [], activity: [],
    };
    state.tasks.unshift(t); created.push(t);
    if (p.owner) { pushBroadcast(ass, { type: 'task_assigned', task_id: t.id, title: 'Шинэ бэлтгэл ажил', body: t.title }); assigned++; }
    n++;
  }
  // Захиалгын бараа — хүн тус бүрд нэг ажил
  for (const ass of itemOwners) {
    const t = {
      id: uid(), title: `Захиалгын бараа бэлтгэх · ${o.quote_no}`,
      desc: nomaadTaskDesc(o, byAssignee[ass]),
      branch: 'camp', project: '', assignee: ass, due, priority: 'high', status: 'open',
      requires_photo: true, createdBy: state.me, created: Date.now() + n, comments: [], activity: [],
    };
    state.tasks.unshift(t); created.push(t);
    pushBroadcast(ass, { type: 'task_assigned', task_id: t.id, title: 'Шинэ ажил', body: t.title }); assigned++;
    n++;
  }
  // Үүссэн ажлыг дахин хувиарлах (хариуцагч өөрчлөх)
  let reassigned = 0;
  for (const r of prepReassign) {
    const t = state.tasks.find(x => x.id === r.id);
    if (!t) continue;
    t.assignee = r.owner;
    created.push(t);
    if (r.owner) { pushBroadcast(r.owner, { type: 'task_assigned', task_id: t.id, title: 'Ажил хувиарлагдлаа', body: t.title }); }
    reassigned++;
  }
  saveLocal(); // локалд нэг л удаа бичнэ (шууд бэлэн)
  render();
  showToast(`${n} шинэ ажил, ${reassigned} дахин хувиарлав. Сервэрт хадгалж байна…`, 'success', 3500);
  // ─── Сервэрт ЗЭРЭГЦЭЭ (арын) бичнэ ───
  // Бүгд шинэ, давхцахгүй ID-тай append тул сериал гинж шаардлагагүй. Browser өөрөө
  // ~6 concurrent-аар хязгаарладаг тул 30 ажил ~8 секундэд, UI гацуулахгүй бичигдэнэ.
  // Сериал гинжээр нэг нэгээр бичих нь (~45с) гацалт үүсгэдэг байсныг арилгав.
  if (state.config.apiUrl) {
    created.forEach(t => {
      postWrite(state.config.apiUrl, { action: 'upsert', task: taskToWire(t) })
        .then(ok => { if (!ok) enqueueWrite({ kind: 'task', action: 'upsert', payload: t, ts: Date.now() }); })
        .catch(() => enqueueWrite({ kind: 'task', action: 'upsert', payload: t, ts: Date.now() }));
    });
  }
}

/* ─── Гүйцэтгэл (Phase 1: объектив метрик) ─────────────────
   Сарын task өгөгдлөөс ажилтан бүрийн объектив гүйцэтгэл.
   On-time = дуусгасан огноо <= эцсийн хугацаа. Оноо = (хугацаандаа + 0.5×хоцорч дуусгасан) / нийт.
   Энэ нь нэгдсэн оноонд 55% жинтэй орно (Phase 3-д 360° + KPI нэмэгдэнэ). */
function taskCompletedDate(t) {
  const ms = typeof t.completed_at === 'number' ? t.completed_at
    : (t.completed_at ? new Date(t.completed_at).getTime()
      : (t.executed_at ? new Date(t.executed_at).getTime()
        : (t.updated ? new Date(t.updated).getTime() : 0)));
  return ms ? new Date(ms).toISOString().slice(0, 10) : '';
}
function objectiveMetrics(key, month) {
  const today = todayStr();
  const mine = (state.tasks || []).filter(t =>
    t.assignee === key && t.status !== 'deleted' && t.kind !== 'act_parent'
    // Зөвхөн удирдлагаас өгсөн ажил — өөртөө оноосон ажлаар оноо нэмэхээс сэргийлнэ.
    && t.createdBy && t.createdBy !== key
    && (t.due || '').slice(0, 7) === month);
  const total = mine.length;
  let done = 0, onTime = 0, late = 0, overdue = 0;
  mine.forEach(t => {
    if (t.status === 'done') {
      done++;
      const cd = taskCompletedDate(t);
      if (cd && t.due && cd <= t.due) onTime++; else late++;
    } else if (t.due && t.due < today) { overdue++; }
  });
  const score = total ? Math.round(100 * (onTime + 0.5 * late) / total) : null;
  // Цөөн ажилтай үед оноо найдваргүй (2 амар ажил → 100%). Тэмдэглэж, нэгдсэн онооноос хасна.
  const lowData = total > 0 && total < MIN_OBJ_TASKS;
  return { total, done, onTime, late, overdue, score, lowData };
}
const MIN_OBJ_TASKS = 3;
/* ─── Нэгдсэн оноо (Объектив 40% + Ажлын чанар 40% + 360° 20%) + бонус ─── */
const PERF_WEIGHTS = { objective: 0.40, quality: 0.40, eval360: 0.20 };
const EVAL_COMPETENCIES = [
  { id: 'responsibility', label: 'Хариуцлага' },
  { id: 'quality', label: 'Чанар' },
  { id: 'teamwork', label: 'Багийн ажиллагаа' },
  { id: 'initiative', label: 'Санаачлага' },
];

async function loadEvaluations() {
  const url = state.config.evalUrl;
  if (!url) return;
  try {
    const r = await fetchWithTimeout(withKey(url + '?t=' + Date.now()), { headers: { 'Accept': 'application/json' } }, 15000);
    if (!r.ok) throw new Error('HTTP ' + r.status);
    const data = await r.json();
    state.evaluations = Array.isArray(data) ? data : (data.evaluations || []);
    try { localStorage.setItem('evaluations', JSON.stringify(state.evaluations)); } catch(e) {}
    if (typeof render === 'function') render();
  } catch(e) { console.warn('loadEvaluations fail', e); }
}

async function saveEvaluation(ratee, fields) {
  const period = state.perfMonth;
  const id = `${period}|${state.me}|${ratee}`;
  const row = { id, period, ratee, rater: state.me, ts: new Date().toISOString(), ...fields };
  const idx = state.evaluations.findIndex(e => e.id === id);
  if (idx >= 0) state.evaluations[idx] = { ...state.evaluations[idx], ...row }; else state.evaluations.push(row);
  render();
  const url = state.config.evalUrl;
  if (!url) return;
  try {
    const r = await fetchWithTimeout(withKey(url), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(row) }, 15000);
    if (!r.ok) throw new Error('HTTP ' + r.status);
    showToast('Үнэлгээ хадгалагдлаа', 'success', 1500);
  } catch(e) { showToast('Алдаа: ' + e.message, 'error'); }
}

/* ─── Гүйцэтгэлийн суутгал: нэмэх / устгах (evaluations-д type=penalty мөр) ─── */
async function postEvalRow(row) {
  const idx = state.evaluations.findIndex(e => e.id === row.id);
  if (idx >= 0) state.evaluations[idx] = { ...state.evaluations[idx], ...row }; else state.evaluations.push(row);
  render();
  const url = state.config.evalUrl;
  if (!url) { showToast('evaluations backend тохируулаагүй', 'warn'); return; }
  const r = await fetchWithTimeout(withKey(url), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(row) }, 15000);
  if (!r.ok) throw new Error('HTTP ' + r.status);
}
function openPenaltyModal(ratee, name) {
  const month = state.perfMonth;
  document.getElementById('penalty-modal')?.remove();
  const modal = document.createElement('div');
  modal.className = 'modal-bg'; modal.id = 'penalty-modal';
  const renderList = () => {
    const list = monthPenalties(ratee, month);
    return list.length ? list.map(p => `
      <div class="pen-item" data-pen-id="${escapeHtml(p.id)}">
        <span class="pen-pts">−${Number(p.kpi_pct) || 0}</span>
        <span class="pen-reason">${escapeHtml(p.note || 'шалтгаан тэмдэглээгүй')}</span>
        <button class="pen-del" title="Цуцлах">×</button>
      </div>`).join('') : '<div class="pen-empty">Энэ сард суутгал алга.</div>';
  };
  modal.innerHTML = `
    <div class="modal naq-modal" style="max-width:440px;">
      <h2>Суутгал · ${escapeHtml(name)}</h2>
      <p class="naq-sub">${month} сар · нэгдсэн гүйцэтгэлийн онооноос хасагдана</p>
      <div id="pen-list">${renderList()}</div>
      <div class="naq-grid" style="margin-top:14px;">
        <label>Хасах оноо<input id="pen-pts" type="number" min="1" max="100" inputmode="numeric" placeholder="жишээ: 10" /></label>
        <label class="full">Шалтгаан<input id="pen-reason" placeholder="Жишээ: 3 удаа хоцорсон" /></label>
      </div>
      <div class="naq-foot">
        <div class="naq-actions">
          <button class="btn" id="pen-cancel">Хаах</button>
          <button class="btn btn-primary" id="pen-add">➖ Суутгал нэмэх</button>
        </div>
      </div>
    </div>`;
  document.body.appendChild(modal);
  modal.classList.add('open');
  const listEl = modal.querySelector('#pen-list');
  const refresh = () => { listEl.innerHTML = renderList(); wireDel(); };
  const wireDel = () => listEl.querySelectorAll('.pen-del').forEach(btn => btn.onclick = async (e) => {
    const id = e.target.closest('.pen-item').dataset.penId;
    const row = state.evaluations.find(x => x.id === id); if (!row) return;
    e.target.disabled = true;
    try { await postEvalRow({ ...row, kpi_pct: 0, ts: new Date().toISOString() }); refresh(); showToast('Суутгал цуцлагдлаа', 'success', 1500); }
    catch (err) { showToast('Алдаа: ' + err.message, 'error'); e.target.disabled = false; }
  });
  wireDel();
  modal.querySelector('#pen-cancel').onclick = () => modal.remove();
  modal.addEventListener('click', (e) => { if (e.target === modal) modal.remove(); });
  modal.querySelector('#pen-add').onclick = async (e) => {
    const pts = Math.round(Number(modal.querySelector('#pen-pts').value) || 0);
    const reason = modal.querySelector('#pen-reason').value.trim();
    if (pts <= 0) { showToast('Хасах оноо (1+) оруулна уу', 'warn'); return; }
    if (!reason) { showToast('Шалтгаан заавал', 'warn'); return; }
    e.target.disabled = true;
    const ts = new Date().toISOString();
    const row = { id: `pen|${month}|${ratee}|${ts}`, period: month, ratee, rater: state.me, type: 'penalty', kpi_pct: pts, note: reason, ts };
    try {
      await postEvalRow(row);
      modal.querySelector('#pen-pts').value = ''; modal.querySelector('#pen-reason').value = '';
      refresh(); showToast(`−${pts} оноо суутгалаа`, 'success', 1800);
    } catch (err) { showToast('Алдаа: ' + err.message, 'error'); }
    e.target.disabled = false;
  };
}

function evalRowScore(e) {
  const vals = EVAL_COMPETENCIES.map(c => Number(e[c.id]) || 0).filter(v => v > 0);
  return vals.length ? Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 20) : null;
}
function eval360Score(key, period) {
  const rows = (state.evaluations || []).filter(e => e.ratee === key && e.period === period);
  const mgr = rows.filter(e => e.type === 'manager').map(evalRowScore).filter(v => v != null);
  let peers = rows.filter(e => e.type === 'peer').map(evalRowScore).filter(v => v != null);
  const peerN = peers.length;
  if (peers.length >= 3) peers = peers.slice().sort((a, b) => a - b).slice(1, -1);  // outlier trim
  const mgrAvg = mgr.length ? mgr.reduce((a, b) => a + b, 0) / mgr.length : null;
  const peerAvg = peers.length ? peers.reduce((a, b) => a + b, 0) / peers.length : null;
  let num = 0, den = 0;
  if (mgrAvg != null) { num += mgrAvg * 2; den += 2; }
  if (peerAvg != null) { num += peerAvg; den += 1; }
  return { score: den ? Math.round(num / den) : null, raterCount: mgr.length + peerN };
}
/* ─── Ажлын чанар (даалгавар өгөгчийн ★ үнэлгээ) ───
   Даалгавар өгөгч (удирдлага) дуусгасан ажил бүрийг 1-5★ үнэлнэ. Үнэлгээ нь
   task.kpi_code баганд хадгалагдана (Sheet "KPI код" — backend засваргүй persist).
   Сарын дундаж ×20 → 0-100. Объектив (цагтаа)-оос ӨӨР хэмжүүр: чанар. */
function taskQualityScore(key, month) {
  const done = (state.tasks || []).filter(t =>
    t.assignee === key && t.status === 'done' && t.kind !== 'act_parent'
    && t.createdBy && t.createdBy !== key
    && (t.due || '').slice(0, 7) === month);
  const rated = done.map(t => Number(t.kpi_code)).filter(v => v >= 1 && v <= 5);
  if (!rated.length) return { score: null, rated: 0, doneTotal: done.length };
  const avg = rated.reduce((a, b) => a + b, 0) / rated.length;
  return { score: Math.round(avg * 20), rated: rated.length, doneTotal: done.length, avg: Math.round(avg * 10) / 10 };
}
async function saveTaskQuality(id, rating) {
  const t = state.tasks.find(x => x.id === id);
  if (!t) return;
  t.kpi_code = String(rating);
  document.querySelectorAll('#t-quality-block .q-star').forEach(s => {
    s.style.color = Number(s.dataset.q) <= rating ? '#f59e0b' : 'var(--border)';
  });
  try { await saveTask(t); showToast(`Ажлын чанар: ${rating}★ хадгалагдлаа`, 'success', 1500); }
  catch (e) { showToast('Алдаа: ' + e.message, 'error'); }
}
/* ─── Гүйцэтгэлийн суутгал (гар торгууль) ───
   Менежер тухайн ажилтанд тухайн сард шалтгаантай оноо хасч болно. evaluations
   хадгалалтыг дахин ашиглана: type='penalty', kpi_pct=хасах оноо, note=шалтгаан.
   id='pen|сар|ажилтан|ts' тул нэг сард олон суутгал болно. kpi_pct=0 → цуцлагдсан. */
function monthPenalties(key, period) {
  return (state.evaluations || []).filter(e =>
    e.type === 'penalty' && e.ratee === key && e.period === period && (Number(e.kpi_pct) || 0) > 0);
}
function penaltyTotal(key, period) {
  return monthPenalties(key, period).reduce((s, e) => s + (Number(e.kpi_pct) || 0), 0);
}
function unifiedScore(key, period) {
  const om = objectiveMetrics(key, period);
  const obj = om.score;
  const objLowData = om.lowData;
  const q = taskQualityScore(key, period);
  const quality = q.score;
  const e360 = eval360Score(key, period);
  const penalty = penaltyTotal(key, period);
  const parts = [];
  // Цөөн ажилтай объективийг (lowData) нэгдсэн онооноос хасна — хиймэл өндөр оноо/бонусаас сэргийлнэ.
  if (obj != null && !objLowData) parts.push([obj, PERF_WEIGHTS.objective]);
  if (quality != null) parts.push([quality, PERF_WEIGHTS.quality]);
  if (e360.score != null) parts.push([e360.score, PERF_WEIGHTS.eval360]);
  if (!parts.length) return { total: null, obj, objLowData, quality, qualityInfo: q, e360, partsUsed: 0, penalty, rawTotal: null };
  const wsum = parts.reduce((s, [, w]) => s + w, 0);
  const rawTotal = Math.round(parts.reduce((s, [v, w]) => s + v * w, 0) / wsum);
  // Суутгалыг нэгдсэн онооноос хасч 0-ээс доош болгохгүй.
  const total = Math.max(0, rawTotal - penalty);
  return { total, rawTotal, penalty, obj, objLowData, quality, qualityInfo: q, e360, partsUsed: parts.length };
}
function bonusPctForScore(s) {
  if (s == null) return 0;
  if (s >= 90) return 20; if (s >= 80) return 15; if (s >= 70) return 10; if (s >= 60) return 5; return 0;
}
const BONUS_MIN_PARTS = 2;
/* Бонус олгох эрх: дан нэг бүрэлдэхүүнээс (ихэвчлэн объектив) +20% олгох нь
   gaming/инфляци үүсгэдэг. Дор хаяж 2 бүрэлдэхүүн (объектив + KPI эсвэл 360°)
   байж байж бонус тооцно. Доош нь оноо харагдана, бонус 0. */
function eligibleBonus(u) {
  if (!u || u.total == null) return 0;
  if ((u.partsUsed || 0) < BONUS_MIN_PARTS) return 0;
  return bonusPctForScore(u.total);
}
const perfScoreColor = s => s == null ? 'var(--muted)' : s >= 85 ? 'var(--ok)' : s >= 60 ? 'var(--warn)' : 'var(--danger)';

function renderPerformance() {
  const isMgr = canManageOrders() || state.isCEO;
  const tab = (!isMgr && state.perfTab === 'all') ? 'me' : (state.perfTab || 'me');
  const cur = new Date().toISOString().slice(0, 7);
  const tabs = [{ id: 'me', label: 'Миний оноо' }, ...(isMgr ? [{ id: 'all', label: 'Бүх ажилтан' }] : []), { id: 'rate', label: 'Үнэлэх' }];
  const head = `<div class="perf-head">
    <div class="perf-month"><button class="btn perf-nav" data-perf-nav="-1">‹</button><span class="perf-month-label">${state.perfMonth}</span><button class="btn perf-nav" data-perf-nav="1"${state.perfMonth >= cur ? ' disabled' : ''}>›</button></div>
    <div class="perf-tabs">${tabs.map(t => `<button class="perf-tab${t.id === tab ? ' active' : ''}" data-perf-tab="${t.id}">${t.label}</button>`).join('')}</div>
  </div>`;
  const body = tab === 'all' ? renderPerfAll() : tab === 'rate' ? renderPerfRate() : renderPerfMe();
  return head + body;
}

function renderPerfMe() {
  const month = state.perfMonth;
  const u = unifiedScore(state.me, month);
  const me = findMember(state.me) || {};
  const bp = eligibleBonus(u);
  const base = Number(me.base_salary) || 0;
  const partial = u.total != null && (u.partsUsed || 0) < BONUS_MIN_PARTS;
  const bar = (label, val, w) => `<div class="perf-bar-row"><span>${label} <small>(${Math.round(w * 100)}%)</small></span><b>${val == null ? '—' : val}</b></div>`;
  const obj = objectiveMetrics(state.me, month);
  return `<div class="perf-me-card">
      <div class="perf-big-score" style="color:${perfScoreColor(u.total)}">${u.total == null ? '—' : u.total}<small>/100</small></div>
      <div class="perf-bonus">${bp ? `Урамшуулал: <b style="color:var(--ok)">+${bp}%</b>${base ? ` = ${fmtMoney(Math.round(base * bp / 100))}` : ''}` : partial ? `Урамшуулал: 0% <small>(хэсэгчилсэн дата — ${BONUS_MIN_PARTS}+ бүрэлдэхүүн хэрэгтэй)</small>` : 'Урамшуулал: 0% <small>(60+ оноо хэрэгтэй)</small>'}</div>
      <div class="perf-breakdown">
        ${bar('Объектив (цагтаа)', u.obj, PERF_WEIGHTS.objective)}
        ${bar('Ажлын чанар', u.quality, PERF_WEIGHTS.quality)}
        ${bar('360° үнэлгээ', u.e360.score, PERF_WEIGHTS.eval360)}
        ${u.penalty ? `<div class="perf-bar-row perf-penalty-row"><span>Суутгал ${u.rawTotal != null ? `<small>(${u.rawTotal} → ${u.total})</small>` : ''}</span><b>−${u.penalty}</b></div>` : ''}
      </div>
      ${u.penalty ? `<div class="perf-penalty-list">${monthPenalties(state.me, month).map(p => `<div class="perf-penalty-item"><span>−${Number(p.kpi_pct) || 0}</span> ${escapeHtml(p.note || 'шалтгаан тэмдэглээгүй')}</div>`).join('')}</div>` : ''}
      ${u.total != null && u.partsUsed < 3 ? `<div class="perf-partial" style="color:var(--warn);font-size:12px;margin:4px 0;">⚠ Хэсэгчилсэн дата — оноо ${u.partsUsed}/3 бүрэлдэхүүнээс гарсан</div>` : ''}
      <div class="perf-note">Ажил: ${obj.total} · хугацаандаа ${obj.onTime} · хоцорсон ${obj.overdue}.${obj.lowData ? ` <b style="color:var(--warn)">⚠ Хангалтгүй дата (${MIN_OBJ_TASKS}+ ажил хэрэгтэй — объектив оноо нэгдсэн онооноос хасагдсан).</b>` : ''} Чанар: ${u.qualityInfo && u.qualityInfo.rated ? `${u.qualityInfo.avg}★ (${u.qualityInfo.rated}/${u.qualityInfo.doneTotal} ажил үнэлэгдсэн)` : 'үнэлгээ хийгдээгүй'}. 360°: ${u.e360.raterCount} үнэлэгч.</div>
    </div>`;
}

function renderPerfAll() {
  const month = state.perfMonth;
  const active = (TEAM || []).filter(m => (m.status || 'идэвхтэй') === 'идэвхтэй' && isPermanentStaff(m));
  const rows = active.map(m => ({ m, key: personKey(m), u: unifiedScore(personKey(m), month), base: Number(m.base_salary) || 0 }))
    .sort((a, b) => (b.u.total ?? -1) - (a.u.total ?? -1));
  const list = rows.map((r, i) => {
    const bp = eligibleBonus(r.u);
    return `<div class="perf-row">
      <div class="perf-rank">${i + 1}</div>
      <div class="perf-name"><b>${escapeHtml(r.m.name)}</b><div class="perf-sub">${escapeHtml(r.m.role || '')} · 360°: ${r.u.e360.raterCount} үнэлэгч${r.u.penalty ? ` · <span style="color:var(--danger)">−${r.u.penalty} суутгал</span>` : ''}</div><button class="perf-penalty-btn" data-penalty-key="${escapeHtml(r.key)}" data-penalty-name="${escapeHtml(r.m.name)}">➖ Суутгал</button></div>
      <div class="perf-metrics"><span title="${r.u.objLowData ? 'Объектив — хангалтгүй дата, онооноос хасагдсан' : 'Объектив (цагтаа)'}">об ${r.u.obj ?? '—'}${r.u.objLowData ? '⚠' : ''}</span><span title="Ажлын чанар${r.u.qualityInfo && r.u.qualityInfo.rated ? ` — ${r.u.qualityInfo.avg}★ (${r.u.qualityInfo.rated}/${r.u.qualityInfo.doneTotal})` : ' — үнэлгээгүй'}">чан ${r.u.quality ?? '—'}</span><span title="360°">360 ${r.u.e360.score ?? '—'}</span></div>
      <div class="perf-score" style="color:${perfScoreColor(r.u.total)}" title="${r.u.total != null && r.u.partsUsed < 3 ? `Хэсэгчилсэн дата — ${r.u.partsUsed}/3 бүрэлдэхүүн` : ''}">${r.u.total ?? '—'}${r.u.total != null && r.u.partsUsed < 3 ? '<sup style="color:var(--warn);font-size:11px;">⚠</sup>' : ''}</div>
      <div class="perf-bonus-cell">${bp ? `+${bp}%${r.base ? `<br><small>${fmtMoney(Math.round(r.base * bp / 100))}</small>` : ''}` : '—'}</div>
    </div>`;
  }).join('');
  return `<div class="perf-list"><div class="perf-row perf-row-head"><div class="perf-rank">#</div><div class="perf-name">Ажилтан</div><div class="perf-metrics">Задаргаа</div><div class="perf-score">Оноо</div><div class="perf-bonus-cell">Бонус</div></div>${list}</div>
    <div class="perf-note" style="margin-top:10px;">Бонус = үндсэн цалин × хувь. CEO баталгаажуулна. <b>Бонус авахад дор хаяж ${BONUS_MIN_PARTS} бүрэлдэхүүн (объектив + ажлын чанар эсвэл 360°) хэрэгтэй</b> — дан объективаас бонус олгохгүй. Calibration: маш олон 5★ эсвэл харилцан өндөр оноог шалгаарай.</div>`;
}

function renderPerfRate() {
  const month = state.perfMonth;
  const me = findMember(state.me) || {};
  const myBranches = me.branches || [];
  const myLevel = Number(me.level) || 0;
  const active = (TEAM || []).filter(m => (m.status || 'идэвхтэй') === 'идэвхтэй' && isPermanentStaff(m));
  const targets = active.filter(m => {
    const k = personKey(m);
    if (k === state.me) return true;
    return (m.branches || []).some(b => myBranches.includes(b));
  });
  const cards = targets.map(m => {
    const key = personKey(m);
    const isSelf = key === state.me;
    const type = isSelf ? 'self' : (myLevel >= 60 && (Number(m.level) || 0) < myLevel ? 'manager' : 'peer');
    const ex = (state.evaluations || []).find(e => e.id === `${month}|${state.me}|${key}`);
    const typeLbl = type === 'manager' ? 'удирдсан' : type === 'self' ? 'өөрөө' : 'хамт';
    return `<div class="perf-rate-card" data-rate-key="${escapeHtml(key)}" data-rate-type="${type}">
      <div class="perf-rate-head"><div><b>${escapeHtml(m.name)}</b> <span class="perf-sub">${typeLbl}</span></div>${ex ? '<span class="perf-done">✓ үнэлсэн</span>' : ''}</div>
      <div class="perf-rate-body">
        ${EVAL_COMPETENCIES.map(c => `<div class="perf-comp"><span>${c.label}</span><div class="perf-stars" data-comp="${c.id}"${ex && Number(ex[c.id]) ? ` data-val="${Number(ex[c.id])}"` : ''}>${[1, 2, 3, 4, 5].map(n => `<span class="perf-star${ex && Number(ex[c.id]) >= n ? ' on' : ''}" data-star="${n}">★</span>`).join('')}</div></div>`).join('')}
        <textarea class="perf-rate-note" placeholder="Тэмдэглэл (1 эсвэл 5 өгвөл заавал)">${ex ? escapeHtml(ex.note || '') : ''}</textarea>
        <button class="btn btn-primary perf-rate-save">Хадгалах</button>
      </div>
    </div>`;
  }).join('');
  return `<div class="perf-note">${month} сард үнэлэх хүмүүс (таны салбар). 1-5★. Хамт олны оноо нэргүй нэгтгэгдэнэ.</div><div class="perf-rate-list">${cards}</div>`;
}

function attachPerformanceHandlers() {
  document.querySelectorAll('[data-perf-tab]').forEach(b => b.onclick = () => { state.perfTab = b.dataset.perfTab; render(); });
  document.querySelectorAll('[data-penalty-key]').forEach(b => b.onclick = () => {
    if (!(canManageOrders() || state.isCEO)) { showToast('Зөвхөн удирдлага суутгал хийнэ', 'warn'); return; }
    openPenaltyModal(b.dataset.penaltyKey, b.dataset.penaltyName);
  });
  document.querySelectorAll('[data-perf-nav]').forEach(btn => btn.addEventListener('click', () => {
    const [y, m] = state.perfMonth.split('-').map(Number);
    const d = new Date(y, m - 1 + Number(btn.dataset.perfNav), 1);
    const next = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    if (next > new Date().toISOString().slice(0, 7)) return;
    state.perfMonth = next; render();
  }));
  document.querySelectorAll('.perf-rate-card').forEach(card => {
    card.querySelectorAll('.perf-stars').forEach(stars => stars.querySelectorAll('.perf-star').forEach(star => {
      star.onclick = () => {
        const n = Number(star.dataset.star);
        stars.querySelectorAll('.perf-star').forEach(s => s.classList.toggle('on', Number(s.dataset.star) <= n));
        stars.dataset.val = n;
      };
    }));
    const saveBtn = card.querySelector('.perf-rate-save');
    if (saveBtn) saveBtn.onclick = (e) => {
      const key = card.dataset.rateKey, type = card.dataset.rateType;
      const fields = { type };
      let any = false, extreme = false;
      EVAL_COMPETENCIES.forEach(c => {
        const stars = card.querySelector(`.perf-stars[data-comp="${c.id}"]`);
        const v = Number(stars?.dataset.val || 0);
        fields[c.id] = v || ''; if (v) any = true; if (v === 1 || v === 5) extreme = true;
      });
      const note = card.querySelector('.perf-rate-note').value.trim();
      if (!any) { showToast('Дор хаяж нэг чадвар үнэлнэ үү', 'warn'); return; }
      if (extreme && !note) { showToast('1 эсвэл 5 өгвөл тэмдэглэл заавал', 'warn'); return; }
      fields.note = note;
      withBusy(e.currentTarget, () => saveEvaluation(key, fields), { successText: 'Хадгалсан' });
    };
  });
}

function renderProducts() {
  let list = state.products || [];
  const rows = list.map(productRowHtml).join('');
  return `
    <div class="prod-toolbar">
      <input type="search" id="prod-search" class="prod-search" placeholder="Бараа хайх (нэр, ангилал, SKU)..." value="${escapeHtml(state.productSearch || '')}">
      <button class="btn btn-primary" id="prod-new">+ Шинэ бараа</button>
    </div>
    <div class="prod-count" id="prod-count">${list.length} бараа</div>
    <div id="prod-new-form"></div>
    <div class="prod-list">${rows || '<div class="orders-empty"><div class="icon">📦</div>Бараа алга. "Шинэ бараа" дарж нэмнэ үү.</div>'}</div>
  `;
}

function newProductFormHtml() {
  const cats = [...new Set((state.products || []).map(p => p.category).filter(Boolean))].sort();
  const opts = cats.map(c => `<option value="${escapeHtml(c)}">`).join('');
  return `<div class="pnf">
    <div class="pnf-grid">
      <label>Нэр*<input id="pnf-name" placeholder="Барааны нэр"></label>
      <label>Ангилал<input id="pnf-cat" list="pnf-cats" placeholder="Ангилал"><datalist id="pnf-cats">${opts}</datalist></label>
      <label>SKU<input id="pnf-sku" placeholder="SKU код"></label>
      <label>Үнэ<input id="pnf-price" type="number" value="0"></label>
      <label>Барьцаа<input id="pnf-deposit" type="number" value="0"></label>
      <label>Нөөц<input id="pnf-stock" type="number" value="1"></label>
      <label class="pnf-wide">Зургийн URL<input id="pnf-photo" placeholder="https://..."></label>
      <label class="pnf-wide">Тайлбар<input id="pnf-desc" placeholder="Тайлбар"></label>
    </div>
    <div class="pnf-actions">
      <button class="btn" id="pnf-cancel">Болих</button>
      <button class="btn btn-primary" id="pnf-save">Нэмэх</button>
    </div>
  </div>`;
}

function attachProductsHandlers() {
  // Хайлт — DOM filter (focus алдахгүй, дахин render хийхгүй)
  const s = document.getElementById('prod-search');
  if (s) s.oninput = (e) => {
    const q = e.target.value.toLowerCase().trim();
    state.productSearch = e.target.value;
    let n = 0;
    document.querySelectorAll('.prod-row').forEach(row => {
      const show = !q || (row.dataset.search || '').includes(q);
      row.style.display = show ? '' : 'none';
      if (show) n++;
    });
    const c = document.getElementById('prod-count');
    if (c) c.textContent = `${n} бараа${q ? ' (шүүсэн)' : ''}`;
  };
  // Мөр хадгалах
  document.querySelectorAll('.prod-save').forEach(btn => {
    btn.onclick = () => {
      const row = btn.closest('.prod-row');
      const id = row.dataset.id;
      const orig = state.products.find(p => p.id === id) || {};
      const get = f => row.querySelector(`[data-f="${f}"]`);
      const product = { ...orig, id,
        name: get('name').value.trim(),
        price: Number(get('price').value) || 0,
        deposit: Number(get('deposit').value) || 0,
        stock: Number(get('stock').value) || 0,
      };
      withBusy(btn, () => saveProduct(product), { successText: 'Хадгалсан' });
    };
  });
  // Шинэ бараа
  document.getElementById('prod-new')?.addEventListener('click', () => {
    const wrap = document.getElementById('prod-new-form');
    if (!wrap) return;
    if (wrap.innerHTML.trim()) { wrap.innerHTML = ''; return; }
    wrap.innerHTML = newProductFormHtml();
    wrap.querySelector('#pnf-cancel').onclick = () => { wrap.innerHTML = ''; };
    wrap.querySelector('#pnf-save').onclick = (e) => {
      const g = id => (wrap.querySelector('#' + id)?.value || '').trim();
      const name = g('pnf-name');
      if (!name) { showToast('Нэр оруулна уу', 'warn'); return; }
      const cat = g('pnf-cat');
      const product = {
        name, category: cat, sku: g('pnf-sku'),
        price: Number(g('pnf-price')) || 0, deposit: Number(g('pnf-deposit')) || 0,
        stock: Number(g('pnf-stock')) || 0, photo: g('pnf-photo'), description: g('pnf-desc'),
        type: 'rental', all_categories: cat ? [cat] : [],
      };
      withBusy(e.currentTarget, () => saveProduct(product), { successText: 'Нэмсэн' });
      wrap.innerHTML = '';
    };
  });
}

/* ─── CEO Dashboard ───────────────────────────────────────
   Үндсэн KPI болон график.
   - Task статусын pie/donut
   - Сарын санхүүгийн хүсэлтийн дүн
   - Ажилтан тус бүрийн идэвхтэй ажлын тоо
   - Хоцорсон таскын тоо
   Бүх chart нь inline SVG — гадны library хэрэггүй.
   CEO бус хэрэглэгчид зөвхөн хувийн KPI хэсэг (renderPersonalKPI) харагдана. */
/* Санхүүгийн хүсэлтийн төлбөрийн үе шат — НЭГ эх сурвалж (тайлангийн карт, мөрийн тэмдэг,
   Excel экспорт бүгд үүгээр). Батлагдсан хүсэлтийг шилжүүлсэн/шилжүүлээгүй/дууссанаар ялгана.
   key: pending | untransferred | transferred | fdone | rejected | deferred */
function finStage(t) {
  const dec = t.decision || 'pending';
  if (dec === 'rejected') return { key: 'rejected',      label: 'Татгалзсан',    mark: '✗',  color: 'var(--danger)' };
  if (dec === 'deferred') return { key: 'deferred',      label: 'Хойшлуулсан',   mark: '🕐', color: 'var(--warn)' };
  if (dec !== 'approved')  return { key: 'pending',       label: 'Хүлээгдэж буй', mark: '⏳', color: 'var(--warn)' };
  // Батлагдсан → төлбөрийн үе шат
  if (t.status === 'done') {
    // Дууссан хүсэлтийг баримтаар нь ялгана (аудит — нээлгүйгээр баримтгүйг шууд харах).
    if (t.close_type === 'дутуу')                          return { key: 'fdone', label: 'Дууссан · дутуу',     mark: '⚠',  color: 'var(--warn)' };
    if (t.close_type === 'баримтгүй' || t.has_receipt === false)
                                                           return { key: 'fdone', label: 'Дууссан · баримтгүй',  mark: '📝', color: 'var(--warn)' };
    return                                                        { key: 'fdone', label: 'Дууссан',             mark: '✓',  color: 'var(--ok)' };
  }
  if (t.executed_at)       return { key: 'transferred',   label: 'Шилжүүлсэн',    mark: '💵', color: 'var(--primary)' };
  return                          { key: 'untransferred', label: 'Шилжүүлээгүй',  mark: '💸', color: 'var(--warn)' };
}

/* ─── Санхүүгийн тайлан — сараар, Салбар → Үндсэн → Дэд ангилал, дэлгэрэнгүй ─── */
function renderFinanceReport(wrap) {
  const curMonth = new Date().toISOString().slice(0, 7);
  if (!state.finReportMonth) state.finReportMonth = curMonth;
  const month = state.finReportMonth;
  // Хамрах хүрээ: бүх санхүүгийн хүсэлт, хандалт + салбар лензээр
  const lens = effectiveBranchLens();
  const wantBr = finLensBranch(lens);
  let base = (state.financeRequests || []).filter(r => r.status !== 'deleted').map(financeAsTask);
  // CEO + санхүү салбар-засагч → бүх гүйлгээ. Бусад → зөвхөн өөрийн хүсэлт.
  if (!canSeeAllFinance() && state.me) base = base.filter(t => t.assignee === state.me || t.createdBy === state.me);
  // Салбар лензээр шүүхэд зөвхөн тухайн салбар. Хөрөнгө (CAPEX) нь '🏗 Хөрөнгө' тусдаа
  // лензтэй тул салбар дотор нэгтгэхгүй — салбарын нийт зардал зөв (хөөрөгдөхгүй) харагдана.
  if (wantBr) base = base.filter(t => finEffBranch(t) === wantBr);

  const groupBy = (arr, k) => arr.reduce((o, t) => { const x = k(t); (o[x] = o[x] || []).push(t); return o; }, {});
  const sumOf = arr => arr.reduce((s, t) => s + (Number(t.amount) || 0), 0);
  const monthList = base.filter(t => (t.requested_at || '').slice(0, 7) === month);

  // ── Excel татах ──
  const bar = document.createElement('div');
  bar.style.cssText = 'display:flex;justify-content:flex-end;margin-bottom:6px;';
  bar.innerHTML = `<button id="fin-export-xls" class="btn" style="padding:6px 12px;font-size:12.5px;">📥 Excel татах</button>`;
  wrap.appendChild(bar);
  bar.querySelector('#fin-export-xls').addEventListener('click', exportFinanceReportExcel);

  // ── Толгой: сар сонгох + нийт дүн ──
  const head = document.createElement('div');
  head.style.cssText = 'display:flex;align-items:center;justify-content:space-between;gap:10px;margin:2px 0 14px;';
  head.innerHTML = `<button class="btn" data-fin-month="-1" style="padding:6px 13px;font-size:16px;line-height:1;">‹</button>`
    + `<div style="text-align:center;flex:1;min-width:0;"><div style="font-size:16px;font-weight:800;">${month}</div>`
    + `<div style="font-size:12px;color:var(--muted);margin-top:1px;">${monthList.length} гүйлгээ · <b style="color:var(--text);">${fmtMoney(sumOf(monthList))}</b></div></div>`
    + `<button class="btn" data-fin-month="1" style="padding:6px 13px;font-size:16px;line-height:1;"${month >= curMonth ? ' disabled' : ''}>›</button>`;
  wrap.appendChild(head);
  head.querySelectorAll('[data-fin-month]').forEach(b => b.addEventListener('click', () => {
    const [y, m] = state.finReportMonth.split('-').map(Number);
    const d = new Date(y, m - 1 + Number(b.dataset.finMonth), 1);
    const nm = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    if (nm > curMonth) return;
    state.finReportMonth = nm; render();
  }));

  // ── 💰 Ашиг: NOMAAD орлого − батлагдсан зардал = цэвэр ашиг + марж ──
  // Зөвхөн бүх санхүү хардаг (CEO/нягтлан) + камп/бүгд лензэд (NOMAAD = камп орлого).
  if (canSeeAllFinance() && (!wantBr || wantBr === 'КЕМП')) {
    let nomaadIncome = 0;
    (state.nomaadOrders || []).forEach(o => {
      if (nomaadIsCancelled(o)) return;
      if (String(o.income_date || '').slice(0, 7) === month) nomaadIncome += Number(o.income_amount) || 0;
    });
    const approvedExpense = sumOf(monthList.filter(t => t.decision === 'approved'));
    const net = nomaadIncome - approvedExpense;
    const margin = nomaadIncome > 0 ? Math.round(net / nomaadIncome * 100) : null;
    const netCol = net >= 0 ? 'var(--ok)' : 'var(--danger)';
    const cell = (label, val, col) => `<div style="padding:8px 10px;border-radius:9px;background:var(--panel-hover);"><div style="font-size:11px;color:var(--muted);">${label}</div><div style="font-weight:800;font-size:14px;color:${col};">${val}</div></div>`;
    const p = document.createElement('div');
    p.style.cssText = 'border:1px solid var(--border);border-radius:12px;padding:12px 14px;margin-bottom:14px;background:var(--panel);';
    p.innerHTML = `<div style="font-weight:800;font-size:13px;margin-bottom:10px;">💰 Ашиг — ${month} <span style="color:var(--muted);font-weight:400;font-size:11px;">${wantBr === 'КЕМП' ? '(Кемп)' : '(NOMAAD орлого − батлагдсан зардал)'}</span></div>`
      + `<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">`
      + cell('Орлого (NOMAAD)', fmtMoney(nomaadIncome), 'var(--ok)')
      + cell('Зарлага (батлагдсан)', fmtMoney(approvedExpense), 'var(--danger)')
      + cell('Цэвэр ашиг', fmtMoney(net), netCol)
      + cell('Ашгийн марж', margin === null ? '—' : margin + '%', netCol)
      + `</div>`
      + `<div style="font-size:10.5px;color:var(--muted);margin-top:8px;">Орлого = NOMAAD бүртгэсэн орлого (тухайн сар). Зарлага = батлагдсан санхүүгийн хүсэлт. Цэвэр ашиг = Орлого − Зарлага.</div>`;
    wrap.appendChild(p);
  }

  if (!monthList.length) { const e = document.createElement('div'); e.style.cssText = 'text-align:center;color:var(--muted);padding:30px 12px;'; e.textContent = 'Энэ сард санхүүгийн хүсэлт алга.'; wrap.appendChild(e); return; }

  // ── Төлөвийн шүүлтийн чип (дарж шүүнэ) ──
  // Үе шатууд = төлбөрийн амьдралын мөчлөг (батлагдсаныг шилжүүлсэн/шилжүүлээгүй/дууссанаар задлав).
  // Дарвал тухайн үе шатны хүсэлтүүд тусдаа харагдана. finStage()-тэй НЭГ эх сурвалж.
  const stDefs = [
    ['all',           'Бүгд',             () => true,                               'var(--text)'],
    ['pending',       '⏳ Хүлээгдэж буй',  t => finStage(t).key === 'pending',       'var(--warn)'],
    ['untransferred', '💸 Шилжүүлээгүй',   t => finStage(t).key === 'untransferred', 'var(--warn)'],
    ['transferred',   '💵 Шилжүүлсэн',     t => finStage(t).key === 'transferred',   'var(--primary)'],
    ['fdone',         '✓ Дууссан',         t => finStage(t).key === 'fdone',         'var(--ok)'],
    ['rejected',      '✗ Татгалзсан',      t => finStage(t).key === 'rejected',      'var(--danger)'],
  ];
  const stFilter = state.finReportStatus || 'all';
  const chips = document.createElement('div');
  chips.style.cssText = 'display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:16px;';
  chips.innerHTML = stDefs.map(([k, l, pred, c]) => {
    const items = monthList.filter(pred);
    const on = stFilter === k;
    return `<button data-fin-st="${k}" style="cursor:pointer;text-align:left;padding:9px 12px;border-radius:10px;border:1.5px solid ${on ? c : 'var(--border)'};background:${on ? 'var(--panel-hover)' : 'var(--panel)'};transition:all .12s;">`
      + `<div style="font-size:11px;color:var(--muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${l} · ${items.length}</div>`
      + `<div style="font-weight:800;font-size:14px;color:${c};">${fmtMoney(sumOf(items))}</div></button>`;
  }).join('');
  wrap.appendChild(chips);
  chips.querySelectorAll('[data-fin-st]').forEach(b => b.addEventListener('click', () => { state.finReportStatus = b.dataset.finSt; render(); }));

  // ── Баримтын хяналт — дууссан зардлын дотор баримтгүй (📝/⚠) хувь, үндсэн ангилал бүрээр ──
  (function renderReceiptAudit() {
    const doneList = monthList.filter(t => finStage(t).key === 'fdone');
    if (!doneList.length) return;
    const noRcpt = (t) => { const m = finStage(t).mark; return m === '📝' || m === '⚠'; };
    const doneTotal = sumOf(doneList);
    const nrList = doneList.filter(noRcpt);
    const nrTotal = sumOf(nrList);
    const pct = doneTotal ? Math.round(nrTotal / doneTotal * 100) : 0;
    // Үндсэн ангилал бүрээр — баримтгүй дүнгээр буурахаар эрэмбэлж, баримтгүйтэй ангиллыг л харуулна
    const byCat = groupBy(doneList, t => finMainName(t.category));
    const cats = Object.keys(byCat).map(cat => {
      const items = byCat[cat]; const tot = sumOf(items);
      const nr = sumOf(items.filter(noRcpt)); const cnt = items.filter(noRcpt).length;
      return { cat, tot, nr, cnt, pct: tot ? Math.round(nr / tot * 100) : 0 };
    }).filter(c => c.nr > 0).sort((a, b) => b.nr - a.nr);
    const barCol = (p) => p >= 50 ? 'var(--danger)' : p >= 20 ? 'var(--warn)' : 'var(--ok)';
    const panel = document.createElement('div');
    panel.style.cssText = 'border:1px solid var(--border);border-radius:12px;padding:12px 14px;margin-bottom:16px;background:var(--panel);';
    let html = `<div style="display:flex;justify-content:space-between;align-items:baseline;gap:8px;">`
      + `<span style="font-weight:800;font-size:13px;">📝 Баримтын хяналт <span style="color:var(--muted);font-weight:400;font-size:11px;">· дууссан зардал</span></span>`
      + `<span style="font-weight:800;font-size:15px;color:${barCol(pct)};">${pct}% баримтгүй</span></div>`
      + `<div style="font-size:11.5px;color:var(--muted);margin:2px 0 ${cats.length ? '11px' : '0'};">${fmtMoney(nrTotal)} / ${fmtMoney(doneTotal)} · ${nrList.length}/${doneList.length} хүсэлт</div>`;
    cats.forEach(c => {
      html += `<div style="margin-bottom:7px;">`
        + `<div style="display:flex;justify-content:space-between;gap:8px;font-size:11.5px;margin-bottom:2px;"><span style="min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${escapeHtml(c.cat)}</span><span style="white-space:nowrap;color:var(--muted);"><b style="color:${barCol(c.pct)};">${c.pct}%</b> · ${fmtMoney(c.nr)}</span></div>`
        + `<div style="height:5px;border-radius:3px;background:var(--panel-hover);overflow:hidden;"><div style="height:100%;width:${c.pct}%;background:${barCol(c.pct)};"></div></div>`
        + `</div>`;
    });
    if (!cats.length) html += `<div style="font-size:12px;color:var(--ok);font-weight:600;">✓ Бүх дууссан зардал баримттай</div>`;
    panel.innerHTML = html;
    wrap.appendChild(panel);
  })();

  // Хадгалагдсан шүүлт устсан түлхүүртэй байвал (хуучин 'approved') → Бүгд рүү унана.
  const stDef = stDefs.find(d => d[0] === stFilter) || stDefs[0];
  const shown = monthList.filter(stDef[2]);
  if (!shown.length) { const e = document.createElement('div'); e.style.cssText = 'text-align:center;color:var(--muted);padding:24px 12px;'; e.textContent = 'Энэ төлөвт гүйлгээ алга.'; wrap.appendChild(e); return; }

  // ── Задаргаа: Салбар → Үндсэн → Дэд → мөр (салбар бүлэг эвхэгддэг) ──
  const stMark = (t) => finStage(t).mark;
  const stCol  = (t) => finStage(t).color;
  const subHdr = (label, count, sum, level) => {
    const st = level === 1
      ? 'padding:7px 12px;margin:9px 0 1px 8px;font-weight:700;font-size:12px;border-left:3px solid var(--border-strong);'
      : 'padding:4px 12px;margin:5px 0 1px 20px;font-weight:600;font-size:10.5px;color:var(--muted);text-transform:uppercase;letter-spacing:.3px;';
    const d = document.createElement('div');
    d.style.cssText = 'display:flex;justify-content:space-between;align-items:center;gap:8px;' + st;
    d.innerHTML = `<span style="min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${escapeHtml(label)} <span style="color:var(--muted);font-weight:400;">(${count})</span></span><span style="color:var(--muted);font-weight:600;white-space:nowrap;">${fmtMoney(sum)}</span>`;
    return d;
  };
  const line = (t) => {
    const d = document.createElement('div');
    d.style.cssText = 'display:flex;justify-content:space-between;gap:10px;align-items:center;padding:7px 12px 7px 30px;font-size:12px;border-bottom:1px solid var(--border);cursor:pointer;';
    d.onmouseenter = () => d.style.background = 'var(--panel-hover)';
    d.onmouseleave = () => d.style.background = '';
    const who = escapeHtml(t.beneficiary || memberName(t.createdBy) || '—');
    const purp = t.purpose ? '<span style="color:var(--muted);"> · ' + escapeHtml(t.purpose) + '</span>' : '';
    // Баримтгүй/дутуу хаагдсан бол хаасан тайлбарыг мөрөнд шууд харуулна — нээлгүйгээр аудит.
    const noteHtml = (t.close_note && (stMark(t) === '📝' || stMark(t) === '⚠'))
      ? `<span style="color:var(--warn);"> · «${escapeHtml(t.close_note)}»</span>` : '';
    const titleAttr = t.close_note ? ` title="${escapeHtml(t.close_note)}"` : '';
    d.innerHTML = `<span style="flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;"${titleAttr}>`
      + `<span style="color:${stCol(t)};font-weight:700;">${stMark(t)}</span> ${who}${purp}${noteHtml}</span>`
      + `<b style="white-space:nowrap;">${fmtMoney(Number(t.amount) || 0)}</b>`;
    d.addEventListener('click', () => openFinanceModal(t.id));
    return d;
  };
  const BR_ORDER = ['ИВЕНТ', 'КЕМП', 'ЗАХ', 'Чимун ХХК'];
  const byBr = groupBy(shown, t => finEffBranch(t));
  const brs = [...BR_ORDER.filter(b => byBr[b]), ...Object.keys(byBr).filter(b => !BR_ORDER.includes(b)).sort()];
  brs.forEach(b => {
    const collapsed = !!(state.finReportCollapsed && state.finReportCollapsed[b]);
    const bh = document.createElement('div');
    bh.style.cssText = 'display:flex;justify-content:space-between;align-items:center;gap:8px;cursor:pointer;padding:11px 12px;margin:14px 0 2px;background:var(--panel-hover);border-radius:10px;font-weight:800;font-size:14px;';
    const caret = `<span data-caret style="display:inline-block;transition:transform .12s;transform:rotate(${collapsed ? -90 : 0}deg);color:var(--muted);">▾</span>`;
    bh.innerHTML = `<span style="min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${caret} ${escapeHtml(finBranchDisplay(b))} <span style="color:var(--muted);font-weight:400;">(${byBr[b].length})</span></span><span style="color:var(--muted);font-weight:700;white-space:nowrap;">${fmtMoney(sumOf(byBr[b]))}</span>`;
    wrap.appendChild(bh);
    const body = document.createElement('div');
    body.style.display = collapsed ? 'none' : '';
    const byMain = groupBy(byBr[b], t => finMainName(t.category));
    Object.keys(byMain).sort().forEach(main => {
      body.appendChild(subHdr(main, byMain[main].length, sumOf(byMain[main]), 1));
      const bySub = groupBy(byMain[main], t => finSubName(t.category));
      Object.keys(bySub).sort().forEach(sub => {
        body.appendChild(subHdr(sub, bySub[sub].length, sumOf(bySub[sub]), 2));
        bySub[sub].forEach(t => body.appendChild(line(t)));
      });
    });
    wrap.appendChild(body);
    bh.addEventListener('click', () => {
      state.finReportCollapsed = state.finReportCollapsed || {};
      const now = body.style.display !== 'none';
      body.style.display = now ? 'none' : '';
      state.finReportCollapsed[b] = now;
      const cr = bh.querySelector('[data-caret]');
      if (cr) cr.style.transform = `rotate(${now ? -90 : 0}deg)`;
    });
  });
}

/* Санхүүгийн тайланг бодит Excel (SpreadsheetML .xls) болгож татна — гадны сангүй.
   Одоогийн сар + салбар ленз + төлөвийн шүүлтийг дагана. */
function exportFinanceReportExcel() {
  const month = state.finReportMonth || new Date().toISOString().slice(0, 7);
  const lens = effectiveBranchLens();
  const wantBr = finLensBranch(lens);
  let base = (state.financeRequests || []).filter(r => r.status !== 'deleted').map(financeAsTask);
  if (!state.isCEO && state.me) base = base.filter(t => t.assignee === state.me || t.createdBy === state.me);
  if (wantBr) base = base.filter(t => finEffBranch(t) === wantBr);
  const stKey = state.finReportStatus || 'all';
  const stPred = stKey === 'all' ? () => true : (t => finStage(t).key === stKey);
  let rows = base.filter(t => (t.requested_at || '').slice(0, 7) === month && stPred(t));
  if (!rows.length) { showToast('Татах гүйлгээ алга', 'warn'); return; }
  const BR_ORDER = ['ИВЕНТ', 'КЕМП', 'ЗАХ', 'Чимун ХХК'];
  const brIdx = b => { const i = BR_ORDER.indexOf(b); return i < 0 ? 99 : i; };
  rows.sort((a, b) => {
    const ba = finEffBranch(a), bb = finEffBranch(b);
    if (ba !== bb) return brIdx(ba) - brIdx(bb) || ba.localeCompare(bb);
    const ca = String(a.category || ''), cb = String(b.category || '');
    if (ca !== cb) return ca.localeCompare(cb);
    return (a.requested_at || '').localeCompare(b.requested_at || '');
  });
  const stMn = t => finStage(t).label;
  const esc = s => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const C = (v, type, style) => `<Cell${style ? ` ss:StyleID="${style}"` : ''}><Data ss:Type="${type}">${esc(v)}</Data></Cell>`;
  const headers = ['Огноо', 'Салбар', 'Үндсэн ангилал', 'Дэд ангилал', 'Хүлээн авагч', 'Гүйлгээний утга', 'Дүн', 'Төлөв'];
  let bodyXml = '';
  rows.forEach(t => {
    bodyXml += '<Row>'
      + C((t.requested_at || '').slice(0, 10), 'String')
      + C(finBranchDisplay(finEffBranch(t)), 'String')
      + C(finMainName(t.category), 'String')
      + C(finSubName(t.category), 'String')
      + C(t.beneficiary || memberName(t.createdBy) || '', 'String')
      + C(t.purpose || '', 'String')
      + C(Number(t.amount) || 0, 'Number', 'money')
      + C(stMn(t), 'String')
      + '</Row>';
  });
  const total = rows.reduce((s, t) => s + (Number(t.amount) || 0), 0);
  const totalRow = '<Row>' + C('', 'String').repeat(5) + C('НИЙТ', 'String', 'grp') + C(total, 'Number', 'grpMoney') + C('', 'String') + '</Row>';
  const headRow = '<Row>' + headers.map(h => C(h, 'String', 'hdr')).join('') + '</Row>';
  const cols = [80, 110, 180, 190, 130, 280, 100, 110].map(w => `<Column ss:Width="${w}"/>`).join('');
  const sheetName = `Тайлан ${month}`.replace(/[\\\/\?\*\[\]:]/g, '-').slice(0, 31);
  const xml = '<?xml version="1.0" encoding="UTF-8"?>\n<?mso-application progid="Excel.Sheet"?>\n'
    + '<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">\n'
    + '<Styles>'
    + '<Style ss:ID="hdr"><Font ss:Bold="1" ss:Color="#FFFFFF"/><Interior ss:Color="#4338CA" ss:Pattern="Solid"/></Style>'
    + '<Style ss:ID="money"><NumberFormat ss:Format="#,##0&quot;₮&quot;"/></Style>'
    + '<Style ss:ID="grp"><Font ss:Bold="1"/></Style>'
    + '<Style ss:ID="grpMoney"><Font ss:Bold="1"/><NumberFormat ss:Format="#,##0&quot;₮&quot;"/></Style>'
    + '</Styles>\n'
    + `<Worksheet ss:Name="${esc(sheetName)}"><Table>${cols}${headRow}${bodyXml}${totalRow}</Table></Worksheet>\n`
    + '</Workbook>';
  const blob = new Blob(['﻿' + xml], { type: 'application/vnd.ms-excel;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const lensLabel = lens === 'm-event' ? 'M-Event' : lens === 'camp' ? 'Camp' : lens === 'capital' ? 'Хөрөнгө' : 'Бүгд';
  const a = document.createElement('a');
  a.href = url; a.download = `Чимун-санхүү-${lensLabel}-${month}.xls`;
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  URL.revokeObjectURL(url);
  showToast(`${rows.length} гүйлгээ Excel-д татагдлаа`, 'success');
}

function renderDashboard() {
  // ─── Глобал салбар ленз (толгойн сонгогч) — доорх БҮХ тоо үүгээр шүүгдэнэ. Нэгдсэн (shared) хоёуланд. ───
  const dashBranch = effectiveBranchLens();
  const wantFinBr = finLensBranch(dashBranch);
  const memberInDashBranch = (m) => dashBranch === 'all'
    || (Array.isArray(m.branches) && (m.branches.includes(dashBranch) || m.branches.includes('shared')))
    || !(m.branches && m.branches.length);
  const tasks = (state.tasks || []).filter(t => dashBranch === 'all' || taskBranch(t) === dashBranch || taskBranch(t) === 'shared');
  const fr = (state.financeRequests || []).filter(r => r.status !== 'deleted'
    && (dashBranch === 'all' || finEffBranch(r) === wantFinBr));
  const today = todayStr();
  const isCEO = !!state.isCEO;
  const me = state.me;

  // ─── Хувийн KPI (бүх ажилтанд) ───
  const mineTasks = tasks.filter(t => t.assignee === me);
  const myDone = mineTasks.filter(t => t.status === 'done').length;
  const myActive = mineTasks.filter(t => t.status !== 'done').length;
  const myOverdue = mineTasks.filter(t => t.status !== 'done' && t.due && t.due < today).length;
  const myToday = mineTasks.filter(t => t.due === today && t.status !== 'done').length;
  const myRate = mineTasks.length > 0 ? Math.round((myDone / mineTasks.length) * 100) : 0;
  // Сүүлийн 7 хоног — миний дуусгасан
  const my7 = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(); d.setDate(d.getDate() - i);
    const ds = d.toISOString().slice(0, 10);
    my7.push({
      day: ['Ня','Да','Мя','Лх','Пү','Ба','Бя'][d.getDay()],
      count: mineTasks.filter(t => t.status === 'done' && (t.executed_at || t.completed_at || '').toString().startsWith(ds)).length,
      isToday: ds === today,
    });
  }
  const myMax = Math.max(1, ...my7.map(x => x.count));

  // 1) Status breakdown
  const byStatus = { open: 0, in_progress: 0, done: 0, declined: 0 };
  tasks.forEach(t => { byStatus[t.status || 'open'] = (byStatus[t.status || 'open'] || 0) + 1; });
  const totalTasks = tasks.length || 1;

  // 2) Per-staff active load — БҮХ идэвхтэй ажилтныг 0-ээс эхлүүлнэ (ачаалалгүй/чөлөөтэй
  //    хүмүүс ч харагдана — CEO хэнд ажил оноох боломжтойг шууд харна).
  const staffLoad = {};
  TEAM.filter(m => (m.status || 'идэвхтэй') === 'идэвхтэй' && memberInDashBranch(m)).forEach(m => { staffLoad[personKey(m)] = 0; });
  tasks.filter(t => t.status !== 'done' && t.assignee).forEach(t => {
    staffLoad[t.assignee] = (staffLoad[t.assignee] || 0) + 1;
  });
  const topStaff = Object.entries(staffLoad).sort((a,b)=>b[1]-a[1]); // бүгд, ачаалалаар (чөлөөтэй нь доор)
  const maxLoad = Math.max(1, ...topStaff.map(([,n]) => n));
  // Үндсэн ба цагийн ажилтныг тойм дээр тусад нь харуулна.
  const isDailyKey = (id) => { const m = findMember(id); return !!(m && m.worker_type === 'daily'); };
  const permStaff  = topStaff.filter(([id]) => !isDailyKey(id));
  const dailyStaff = topStaff.filter(([id]) =>  isDailyKey(id));
  const maxPermLoad = Math.max(1, ...permStaff.map(([,n]) => n));

  // 3) Финансын зардал — сүүлийн 30 хоног. Finance-ийн ts талбар нь `requested_at` —
  // өмнөх кодонд `created_at || ts` гэж буруу нэр хайж байсан тул хоосон гарч байсан.
  const cutoff = Date.now() - 30 * 86400 * 1000;
  const financeTs = r => {
    const raw = r.requested_at || r.updated || r.decision_at || r.created_at || r.ts;
    if (!raw) return 0;
    const t = new Date(raw).getTime();
    return Number.isFinite(t) ? t : 0;
  };
  const recentFinance = fr.filter(r => financeTs(r) > cutoff);
  const totalApproved = recentFinance
    .filter(r => r.decision === 'approved' || r.status === 'done')
    .reduce((s, r) => s + (Number(r.amount) || 0), 0);
  const totalPending = recentFinance
    .filter(r => (r.decision || 'pending') === 'pending')
    .reduce((s, r) => s + (Number(r.amount) || 0), 0);
  const totalRejected = recentFinance
    .filter(r => r.decision === 'rejected')
    .reduce((s, r) => s + (Number(r.amount) || 0), 0);

  // 4) Хоцорсон
  const overdueCount = tasks.filter(t => t.status !== 'done' && t.due && t.due < today).length;
  const todayCount = tasks.filter(t => t.due === today && t.status !== 'done').length;
  // 5) Хүлээж буй ажилтны бүртгэл (CEO action хэрэгтэй)
  const pendingRegCount = TEAM.filter(m => (m.status || '') === 'хүлээж буй').length;

  // 6) Trend: сүүлийн 14 хоногийн task үүсгэх vs дуусгах
  const trendDays = 14;
  const dayMs = 86400 * 1000;
  const createdByDay = new Array(trendDays).fill(0);
  const doneByDay = new Array(trendDays).fill(0);
  const startOfToday = new Date(); startOfToday.setHours(0, 0, 0, 0);
  const trendStart = startOfToday.getTime() - (trendDays - 1) * dayMs;
  for (const t of tasks) {
    const cMs = typeof t.created === 'number' ? t.created : new Date(t.created || 0).getTime();
    if (cMs >= trendStart) {
      const idx = Math.floor((cMs - trendStart) / dayMs);
      if (idx >= 0 && idx < trendDays) createdByDay[idx]++;
    }
    if (t.status === 'done') {
      const dMs = typeof t.completed_at === 'number' ? t.completed_at : new Date(t.completed_at || t.executed_at || 0).getTime();
      if (dMs >= trendStart) {
        const idx = Math.floor((dMs - trendStart) / dayMs);
        if (idx >= 0 && idx < trendDays) doneByDay[idx]++;
      }
    }
  }

  // 7) Top performer — хамгийн их дуусгасан 3 ажилтан (сүүлийн 30 хоног)
  const completionCutoff = Date.now() - 30 * dayMs;
  const completionCount = {};
  for (const t of tasks) {
    if (t.status !== 'done' || !t.assignee) continue;
    const dMs = typeof t.completed_at === 'number' ? t.completed_at : new Date(t.completed_at || t.executed_at || 0).getTime();
    if (dMs >= completionCutoff) {
      completionCount[t.assignee] = (completionCount[t.assignee] || 0) + 1;
    }
  }
  const topPerformers = Object.entries(completionCount).sort((a,b)=>b[1]-a[1]).slice(0, 3);

  // 8) Дундаж дуусгах хугацаа (created → completed_at, сүүлийн 30 хоног)
  const durations = [];
  for (const t of tasks) {
    if (t.status !== 'done') continue;
    const cMs = typeof t.created === 'number' ? t.created : new Date(t.created || 0).getTime();
    const dMs = typeof t.completed_at === 'number' ? t.completed_at : new Date(t.completed_at || t.executed_at || 0).getTime();
    if (!cMs || !dMs || dMs < completionCutoff) continue;
    const days = (dMs - cMs) / dayMs;
    if (days >= 0 && days < 365) durations.push(days);
  }
  const avgCompletionDays = durations.length ? (durations.reduce((s,d)=>s+d, 0) / durations.length) : 0;

  // SVG donut for status
  const donut = (() => {
    const cx = 60, cy = 60, r = 48;
    const C = 2 * Math.PI * r;
    const colors = {
      open: '#f59e0b', in_progress: '#3b82f6',
      done: '#10b981', declined: '#ef4444'
    };
    let offset = 0;
    const segments = ['done', 'in_progress', 'open', 'declined'].map(k => {
      const n = byStatus[k] || 0;
      const frac = n / totalTasks;
      const dash = `${C * frac} ${C}`;
      const seg = `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${colors[k]}" stroke-width="14" stroke-dasharray="${dash}" stroke-dashoffset="${-offset * C}" transform="rotate(-90 ${cx} ${cy})"/>`;
      offset += frac;
      return seg;
    }).join('');
    return `
      <svg viewBox="0 0 120 120" width="120" height="120">
        ${segments}
        <text x="60" y="58" text-anchor="middle" font-size="22" font-weight="700" fill="var(--text)">${tasks.length}</text>
        <text x="60" y="76" text-anchor="middle" font-size="10" fill="var(--muted)">нийт</text>
      </svg>
    `;
  })();

  return `
    <div class="dashboard">
      <div class="dashboard-actions">
        <button class="btn" id="dash-export-csv">
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-2px;margin-right:6px;"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
          CSV татах
        </button>
        <button class="btn" id="dash-export-ics">
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-2px;margin-right:6px;"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
          Календарт татах (.ics)
        </button>
        <button class="btn" id="dash-print">
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-2px;margin-right:6px;"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
          PDF хэвлэх
        </button>
        <button class="btn" id="dash-email-digest">
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-2px;margin-right:6px;"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
          Долоо хоногийн тойм имэйлдэх
        </button>
        <button class="btn" id="dash-staff">
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-2px;margin-right:6px;"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
          Ажилтан удирдах
        </button>
        <button class="btn" id="dash-permissions">
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-2px;margin-right:6px;"><path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4z"/></svg>
          Эрх тохируулах
        </button>
      </div>
      <div class="dashboard-grid">
        <!-- ─── Миний ажил (бүх ажилтанд) ─── -->
        <div class="dash-section-title" style="grid-column: span 4; font-size:13px; font-weight:700; color:var(--muted); text-transform:uppercase; letter-spacing:0.5px; margin-bottom:-4px;">Миний ажил</div>
        <div class="dash-card dash-kpi">
          <div class="dash-kpi-label">Идэвхтэй</div>
          <div class="dash-kpi-value primary">${myActive}</div>
          <div class="dash-kpi-sub">та хийх ёстой</div>
        </div>
        <div class="dash-card dash-kpi">
          <div class="dash-kpi-label">Өнөөдөр</div>
          <div class="dash-kpi-value warn">${myToday}</div>
          <div class="dash-kpi-sub">дуусах ёстой</div>
        </div>
        <div class="dash-card dash-kpi">
          <div class="dash-kpi-label">Хоцорсон</div>
          <div class="dash-kpi-value danger">${myOverdue}</div>
          <div class="dash-kpi-sub">та хийх ёстой</div>
        </div>
        <div class="dash-card dash-kpi">
          <div class="dash-kpi-label">Гүйцэтгэл</div>
          <div class="dash-kpi-value ok">${myRate}%</div>
          <div class="dash-kpi-sub">${myDone}/${mineTasks.length} дуусгасан</div>
        </div>
        <div class="dash-card dash-chart" style="grid-column: span 4;">
          <div class="dash-card-title">Сүүлийн 7 хоног — Миний дуусгасан ажил</div>
          <div class="kpi-bar-chart">
            ${my7.map(d => `
              <div class="kpi-bar-col">
                <div class="kpi-bar-track">
                  <div class="kpi-bar-fill ${d.isToday ? 'today' : ''}" style="height:${(d.count/myMax)*100}%"></div>
                </div>
                <div class="kpi-bar-num">${d.count}</div>
                <div class="kpi-bar-day ${d.isToday ? 'today' : ''}">${d.day}</div>
              </div>
            `).join('')}
          </div>
        </div>

        <!-- ─── Компанийн тойм (бүх ажилтанд) ─── -->
        <div class="dash-section-title" style="grid-column: span 4; font-size:13px; font-weight:700; color:var(--muted); text-transform:uppercase; letter-spacing:0.5px; margin-top:12px; margin-bottom:-4px;">Компанийн тойм</div>
        <div class="dash-card dash-kpi">
          <div class="dash-kpi-label">Хоцорсон</div>
          <div class="dash-kpi-value danger">${overdueCount}</div>
          <div class="dash-kpi-sub">эцсийн хугацаа өнгөрсөн</div>
        </div>
        <div class="dash-card dash-kpi">
          <div class="dash-kpi-label">Өнөөдөр</div>
          <div class="dash-kpi-value warn">${todayCount}</div>
          <div class="dash-kpi-sub">дуусах ёстой</div>
        </div>
        <div class="dash-card dash-kpi">
          <div class="dash-kpi-label">Хүлээгдэж буй</div>
          <div class="dash-kpi-value primary">${recentFinance.filter(r => (r.decision||'pending')==='pending').length}</div>
          <div class="dash-kpi-sub">санхүүгийн хүсэлт</div>
        </div>
        <div class="dash-card dash-kpi">
          <div class="dash-kpi-label">Идэвхтэй</div>
          <div class="dash-kpi-value ok">${byStatus.open + byStatus.in_progress}</div>
          <div class="dash-kpi-sub">ажилтнуудад</div>
        </div>
        ${isCEO && pendingRegCount > 0 ? `
        <div class="dash-card dash-kpi dash-kpi-clickable" id="dash-pending-reg-card" style="grid-column: span 4;cursor:pointer;border:2px solid var(--accent-amber);">
          <div class="dash-kpi-label" style="color:var(--accent-amber);">⏳ Хүлээж буй бүртгэлийн хүсэлт</div>
          <div class="dash-kpi-value warn" style="font-size:24px;">${pendingRegCount} ажилтан хянахыг хүлээж байна</div>
          <div class="dash-kpi-sub">Энд дарж хянах →</div>
        </div>` : ''}

        <!-- Status donut -->
        <div class="dash-card dash-chart">
          <div class="dash-card-title">Ажлын статус</div>
          <div class="dash-donut">
            ${donut}
            <div class="dash-legend">
              <div><span class="dot" style="background:#10b981"></span> Дууссан <strong>${byStatus.done}</strong></div>
              <div><span class="dot" style="background:#3b82f6"></span> Хийгдэж байна <strong>${byStatus.in_progress}</strong></div>
              <div><span class="dot" style="background:#f59e0b"></span> Шинэ <strong>${byStatus.open}</strong></div>
              <div><span class="dot" style="background:#ef4444"></span> Татгалзсан <strong>${byStatus.declined}</strong></div>
            </div>
          </div>
        </div>

        <!-- Finance summary (CEO only — sensitive amounts) -->
        ${isCEO ? `
        <div class="dash-card dash-finance">
          <div class="dash-card-title">Сүүлийн 30 хоног — Санхүү</div>
          <div class="dash-finance-row">
            <div class="dash-finance-label">Зөвшөөрсөн</div>
            <div class="dash-finance-value ok">${totalApproved.toLocaleString('mn-MN')}₮</div>
          </div>
          <div class="dash-finance-row">
            <div class="dash-finance-label">Хүлээгдэж буй</div>
            <div class="dash-finance-value warn">${totalPending.toLocaleString('mn-MN')}₮</div>
          </div>
          ${totalRejected > 0 ? `
          <div class="dash-finance-row">
            <div class="dash-finance-label">Татгалзсан</div>
            <div class="dash-finance-value" style="color:var(--danger)">${totalRejected.toLocaleString('mn-MN')}₮</div>
          </div>` : ''}
          <div class="dash-finance-row">
            <div class="dash-finance-label">Нийт хүсэлт</div>
            <div class="dash-finance-value">${recentFinance.length}${fr.length > recentFinance.length ? ` <span style="color:var(--muted);font-weight:400;font-size:11px;">(нийт ${fr.length})</span>` : ''}</div>
          </div>
        </div>` : ''}

        <!-- Үндсэн ажилтны ачаалал — мөр дээр дарж тухайн хүний ажлуудыг харна -->
        <div class="dash-card dash-staff">
          <div class="dash-card-title">Үндсэн ажилтны ачаалал (идэвхтэй ажил)</div>
          <div class="dash-staff-scroll">
          ${permStaff.length === 0 ? '<div class="dash-empty">Ажилтан алга</div>' : permStaff.map(([id, n]) => `
            <div class="dash-bar-row dash-staff-clickable${n === 0 ? ' is-free' : ''}" data-staff-email="${escapeHtml(id)}" title="Дарж ${escapeHtml(memberName(id))}-ийн ажлуудыг харах">
              <div class="dash-bar-label">${escapeHtml(memberName(id))}</div>
              <div class="dash-bar-track">
                <div class="dash-bar-fill" style="width:${(n/maxPermLoad)*100}%"></div>
              </div>
              <div class="dash-bar-count">${n === 0 ? '<span class="dash-free">чөлөөтэй</span>' : n}</div>
            </div>
          `).join('')}
          </div>
        </div>

        <!-- Цагийн (өдрийн) ажилтан — тусад нь. Нийт шилжүүлсэн цалин. -->
        <div class="dash-card dash-staff">
          <div class="dash-card-title">Цагийн ажилтан (${dailyStaff.length})</div>
          <div class="dash-staff-scroll">
          ${dailyStaff.length === 0 ? '<div class="dash-empty">Цагийн ажилтан алга</div>' : dailyStaff.map(([id]) => {
            const m = findMember(id) || {};
            const paid = hourlyPayouts(m).reduce((s, r) => s + (Number(r.amount) || 0), 0);
            return `
            <div class="dash-bar-row dash-staff-clickable" data-staff-email="${escapeHtml(id)}" title="Дарж ${escapeHtml(memberName(id))}-ийн ажлуудыг харах">
              <div class="dash-bar-label">${escapeHtml(memberName(id))}<span style="font-size:10px;color:var(--muted);margin-left:6px;">${escapeHtml(m.role || '')}</span></div>
              <div style="flex:1;text-align:right;font-size:11px;color:var(--muted);white-space:nowrap;">${paid > 0 ? 'Цалин: ' + fmtMoney(paid) : '—'}</div>
            </div>`;
          }).join('')}
          </div>
        </div>

        <!-- Сүүлийн 14 хоног — үүсгэх vs дуусгах trend (inline SVG sparkline) -->
        <div class="dash-card dash-staff" style="grid-column: span 4;">
          <div class="dash-card-title">Сүүлийн 14 хоног — даалгаврын урсгал</div>
          ${(() => {
            const maxV = Math.max(1, ...createdByDay, ...doneByDay);
            const W = 600, H = 80, pad = 8;
            const stepX = (W - 2*pad) / (trendDays - 1);
            const yFor = v => H - pad - (v / maxV) * (H - 2*pad);
            const ptsCreated = createdByDay.map((v, i) => `${pad + i*stepX},${yFor(v)}`).join(' ');
            const ptsDone = doneByDay.map((v, i) => `${pad + i*stepX},${yFor(v)}`).join(' ');
            const totalCreated = createdByDay.reduce((s,v)=>s+v,0);
            const totalDone = doneByDay.reduce((s,v)=>s+v,0);
            return `
              <svg viewBox="0 0 ${W} ${H}" width="100%" height="${H}" style="display:block;">
                <polyline points="${ptsCreated}" fill="none" stroke="#f59e0b" stroke-width="2" stroke-linejoin="round"/>
                <polyline points="${ptsDone}"    fill="none" stroke="#10b981" stroke-width="2" stroke-linejoin="round"/>
                ${createdByDay.map((v, i) => `<circle cx="${pad + i*stepX}" cy="${yFor(v)}" r="2.5" fill="#f59e0b"/>`).join('')}
                ${doneByDay.map((v, i) => `<circle cx="${pad + i*stepX}" cy="${yFor(v)}" r="2.5" fill="#10b981"/>`).join('')}
              </svg>
              <div style="display:flex; gap:16px; font-size:12px; margin-top:6px; color:var(--muted);">
                <span><span class="dot" style="background:#f59e0b;"></span> Үүсгэсэн <strong style="color:var(--text);">${totalCreated}</strong></span>
                <span><span class="dot" style="background:#10b981;"></span> Дуусгасан <strong style="color:var(--text);">${totalDone}</strong></span>
                <span style="margin-left:auto;">Дундаж дуусгах хугацаа: <strong style="color:var(--text);">${avgCompletionDays.toFixed(1)} өдөр</strong></span>
              </div>
            `;
          })()}
        </div>

        <!-- Top performers — сүүлийн 30 хоног хамгийн их дуусгасан -->
        <div class="dash-card dash-staff" style="grid-column: span 2;">
          <div class="dash-card-title">🏆 Шилдэг гүйцэтгэгч (30 хоног)</div>
          ${topPerformers.length === 0 ? '<div class="dash-empty">Дуусгасан ажил алга</div>' : topPerformers.map(([email, n], i) => {
            const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : '🥉';
            return `
              <div class="dash-bar-row">
                <div class="dash-bar-label">${medal} ${escapeHtml(memberName(email))}</div>
                <div class="dash-bar-track">
                  <div class="dash-bar-fill" style="width:${(n/topPerformers[0][1])*100}%;background:linear-gradient(90deg,#fbbf24,#f59e0b);"></div>
                </div>
                <div class="dash-bar-count">${n}</div>
              </div>
            `;
          }).join('')}
        </div>

        <!-- Салбараар ажлын статистик -->
        <div class="dash-card dash-staff" style="grid-column: span 2;">
          <div class="dash-card-title">Салбараар ажлын тоо</div>
          ${(() => {
            const byBranch = {};
            BRANCHES.forEach(b => { byBranch[b.id] = { name: b.name, total: 0, done: 0, active: 0 }; });
            tasks.forEach(t => {
              const b = t.branch || 'shared';
              if (!byBranch[b]) byBranch[b] = { name: b, total: 0, done: 0, active: 0 };
              byBranch[b].total++;
              if (t.status === 'done') byBranch[b].done++;
              else byBranch[b].active++;
            });
            const branches = Object.values(byBranch).filter(b => b.total > 0);
            if (branches.length === 0) return '<div class="dash-empty">Ажил алга</div>';
            const maxTotal = Math.max(1, ...branches.map(b => b.total));
            return branches.map(b => `
              <div class="dash-bar-row">
                <div class="dash-bar-label">${escapeHtml(b.name)}</div>
                <div class="dash-bar-track" style="position:relative;">
                  <div class="dash-bar-fill" style="width:${(b.total/maxTotal)*100}%;background:linear-gradient(90deg,var(--accent-green),var(--accent-blue));"></div>
                </div>
                <div class="dash-bar-count" style="width:auto;min-width:70px;text-align:right;font-size:12px;">
                  <span style="color:var(--accent-green);">${b.done}</span> / <span>${b.total}</span>
                </div>
              </div>
            `).join('');
          })()}
        </div>
      </div>
    </div>
  `;
}

/* ─── Долоо хоногийн email тойм — CEO-д ──────────────────
   n8n webhook руу POST хийж тус ажилтан бүрд тус тусын статистикийг
   email-ээр илгээнэ. Webhook payload: { type: 'weekly_digest', period, stats } */
async function sendWeeklyDigest() {
  if (!state.isCEO) return;
  const webhook = state.config.apiUrl;
  if (!webhook) {
    showToast('n8n endpoint тохируулагдаагүй', 'warn');
    return;
  }
  // Сүүлийн 7 хоногийн өгөгдөл цуглуулах
  const now = new Date();
  const weekAgo = new Date(now);
  weekAgo.setDate(now.getDate() - 7);
  const tasks = state.tasks || [];
  const fr = (state.financeRequests || []).filter(r => r.status !== 'deleted');

  const stats = {
    period: {
      from: weekAgo.toISOString().slice(0, 10),
      to: now.toISOString().slice(0, 10),
    },
    tasks: {
      total: tasks.length,
      done: tasks.filter(t => t.status === 'done').length,
      open: tasks.filter(t => t.status !== 'done').length,
      overdue: tasks.filter(t => t.status !== 'done' && t.due && t.due < todayStr()).length,
      created_this_week: tasks.filter(t => t.created && new Date(t.created) >= weekAgo).length,
      completed_this_week: tasks.filter(t => t.status === 'done' && t.updated && new Date(t.updated) >= weekAgo).length,
    },
    finance: {
      total: fr.length,
      pending: fr.filter(r => (r.decision || 'pending') === 'pending').length,
      approved_amount: fr.filter(r => r.decision === 'approved').reduce((s, r) => s + (+r.amount || 0), 0),
    },
    by_staff: (() => {
      const map = {};
      tasks.forEach(t => {
        if (!t.assignee) return;
        if (!map[t.assignee]) map[t.assignee] = { name: memberName(t.assignee), done: 0, active: 0, overdue: 0 };
        if (t.status === 'done') map[t.assignee].done++;
        else map[t.assignee].active++;
        if (t.status !== 'done' && t.due && t.due < todayStr()) map[t.assignee].overdue++;
      });
      return Object.values(map);
    })(),
  };

  try {
    showToast('Имэйл илгээж байна...', 'info', 2000);
    const r = await fetchWithTimeout(withKey(webhook.replace(/\/[^\/]+$/, '/weekly-digest')), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'weekly_digest', stats, requested_by: state.user?.email }),
    });
    if (r.ok) showToast('Долоо хоногийн тойм имэйлээр илгээгдлээ', 'success', 3000);
    else throw new Error('HTTP ' + r.status);
  } catch (e) {
    showToast('Имэйл илгээх амжилтгүй: ' + e.message, 'error', 4500);
  }
}

/* ─── Google Calendar / ICS export ───────────────────────
   Task-ийн due огнооноос ICS файл үүсгэж татах. Хэрэглэгч Google
   Calendar, Apple Calendar, Outlook бүгдэд импортлох боломжтой. */
function generateICS(tasks) {
  const pad = (n) => String(n).padStart(2, '0');
  const fmtDateICS = (dateStr) => {
    // YYYY-MM-DD → YYYYMMDD (all-day event)
    return dateStr.replace(/-/g, '');
  };
  const escape = (s) => String(s || '').replace(/[\\,;]/g, m => '\\' + m).replace(/\n/g, '\\n');
  const now = new Date();
  const stamp = `${now.getUTCFullYear()}${pad(now.getUTCMonth()+1)}${pad(now.getUTCDate())}T${pad(now.getUTCHours())}${pad(now.getUTCMinutes())}${pad(now.getUTCSeconds())}Z`;

  const events = tasks.filter(t => t.due).map(t => {
    const startDate = fmtDateICS(t.due);
    const endDate = (() => {
      const d = new Date(t.due);
      d.setDate(d.getDate() + 1);
      return d.toISOString().slice(0,10).replace(/-/g,'');
    })();
    const priorityNum = { high: 1, med: 5, low: 9 }[t.priority] || 5;
    const description = [
      `Хариуцагч: ${memberName(t.assignee)}`,
      `Үүсгэгч: ${memberName(t.createdBy)}`,
      `Төлөв: ${t.status}`,
      t.desc ? `\\n${t.desc}` : '',
    ].filter(Boolean).join('\\n');
    return [
      'BEGIN:VEVENT',
      `UID:${t.id}@chimunllc.github.io`,
      `DTSTAMP:${stamp}`,
      `DTSTART;VALUE=DATE:${startDate}`,
      `DTEND;VALUE=DATE:${endDate}`,
      `SUMMARY:${escape(t.title)}`,
      `DESCRIPTION:${description}`,
      `PRIORITY:${priorityNum}`,
      `STATUS:${t.status === 'done' ? 'COMPLETED' : 'NEEDS-ACTION'}`,
      'END:VEVENT',
    ].join('\r\n');
  });

  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Chimun Tasks//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'X-WR-CALNAME:Чимун Tasks',
    'X-WR-TIMEZONE:Asia/Ulaanbaatar',
    ...events,
    'END:VCALENDAR',
  ].join('\r\n');
}

function exportTasksAsICS(tasks) {
  const due = (tasks || state.tasks).filter(t => t.due);
  if (!due.length) { showToast('Эцсийн огноотой ажил алга байна', 'warn'); return; }
  const ics = generateICS(due);
  const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `chimun-tasks-${todayStr()}.ics`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  showToast(`${due.length} ажлыг календарт татсан`, 'success');
}


/* ─── Personal KPI (ажилтны хувийн тойм) ───────────────── */
function renderPersonalKPI() {
  const me = state.me;
  const mine = (state.tasks || []).filter(t => t.assignee === me);
  const today = todayStr();
  const total = mine.length;
  const done = mine.filter(t => t.status === 'done').length;
  const active = mine.filter(t => t.status !== 'done').length;
  const overdue = mine.filter(t => t.status !== 'done' && t.due && t.due < today).length;
  const completionRate = total > 0 ? Math.round((done / total) * 100) : 0;

  // Сүүлийн 7 хоногт хийсэн ажлуудаар bar chart
  const last7 = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().slice(0, 10);
    const dayDone = mine.filter(t => t.status === 'done' && t.executed_at && t.executed_at.startsWith(dateStr)).length;
    last7.push({
      day: ['Ня','Да','Мя','Лх','Пү','Ба','Бя'][d.getDay()],
      count: dayDone,
      isToday: dateStr === today,
    });
  }
  const maxDay = Math.max(1, ...last7.map(d => d.count));

  return `
    <div class="dashboard">
      <div class="dashboard-grid">
        <div class="dash-card dash-kpi">
          <div class="dash-kpi-label">Дуусгасан</div>
          <div class="dash-kpi-value ok">${done}</div>
          <div class="dash-kpi-sub">нийт ажлаас ${total}</div>
        </div>
        <div class="dash-card dash-kpi">
          <div class="dash-kpi-label">Идэвхтэй</div>
          <div class="dash-kpi-value primary">${active}</div>
          <div class="dash-kpi-sub">та хийх ёстой</div>
        </div>
        <div class="dash-card dash-kpi">
          <div class="dash-kpi-label">Хоцорсон</div>
          <div class="dash-kpi-value danger">${overdue}</div>
          <div class="dash-kpi-sub">эцсийн хугацаа өнгөрсөн</div>
        </div>
        <div class="dash-card dash-kpi">
          <div class="dash-kpi-label">Гүйцэтгэл</div>
          <div class="dash-kpi-value warn">${completionRate}%</div>
          <div class="dash-kpi-sub">дуусгасан хувь</div>
        </div>
        <div class="dash-card dash-chart" style="grid-column: span 4;">
          <div class="dash-card-title">Сүүлийн 7 хоног — Дуусгасан ажил</div>
          <div class="kpi-bar-chart">
            ${last7.map(d => `
              <div class="kpi-bar-col">
                <div class="kpi-bar-track">
                  <div class="kpi-bar-fill ${d.isToday ? 'today' : ''}" style="height:${(d.count/maxDay)*100}%"></div>
                </div>
                <div class="kpi-bar-num">${d.count}</div>
                <div class="kpi-bar-day ${d.isToday ? 'today' : ''}">${d.day}</div>
              </div>
            `).join('')}
          </div>
        </div>
      </div>
    </div>
  `;
}

/* ─── Calendar view ──────────────────────────────────────
   Сарын календар — due date бүхий task-ыг өдрөөр бүлэглэж харуулна.
   Click өдөр → түүний ажлуудыг доор жагсаална. */
function renderCalendar() {
  if (!state.calendarMonth) {
    const now = new Date();
    state.calendarMonth = { year: now.getFullYear(), month: now.getMonth() };
  }
  const { year, month } = state.calendarMonth;
  const monthNames = ['1-р сар','2-р сар','3-р сар','4-р сар','5-р сар','6-р сар','7-р сар','8-р сар','9-р сар','10-р сар','11-р сар','12-р сар'];
  const dayNames = ['Да','Мя','Лх','Пү','Ба','Бя','Ня'];

  // Эхний өдрийн weekday (Mon = 0)
  const first = new Date(year, month, 1);
  let firstDow = first.getDay() - 1;
  if (firstDow < 0) firstDow = 6;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const today = todayStr();

  // Task-уудыг date-аар бүлэглэх
  const byDate = {};
  state.tasks.forEach(t => {
    if (!t.due) return;
    (byDate[t.due] = byDate[t.due] || []).push(t);
  });

  // Selected day (default: today if visible, else 1st)
  const selected = state.calendarSelected || today;
  const selectedTasks = byDate[selected] || [];

  // Grid cells
  const cells = [];
  for (let i = 0; i < firstDow; i++) cells.push('<div class="cal-cell cal-empty"></div>');
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${year}-${String(month+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
    const dayTasks = byDate[dateStr] || [];
    const isToday = dateStr === today;
    const isSelected = dateStr === selected;
    const isOverdue = dateStr < today;
    const dotCount = Math.min(dayTasks.length, 3);
    const dots = dayTasks.slice(0, 3).map(t => {
      const cls = t.status === 'done' ? 'cal-dot-done'
        : (t.priority === 'high' ? 'cal-dot-high'
        : (t.priority === 'med' ? 'cal-dot-med' : 'cal-dot-low'));
      return `<span class="cal-dot ${cls}"></span>`;
    }).join('');
    const more = dayTasks.length > 3 ? `<span class="cal-more">+${dayTasks.length - 3}</span>` : '';
    cells.push(`
      <button class="cal-cell ${isToday?'cal-today':''} ${isSelected?'cal-selected':''} ${isOverdue && dayTasks.some(t=>t.status!=='done')?'cal-overdue':''}" data-date="${dateStr}">
        <span class="cal-num">${d}</span>
        <span class="cal-dots">${dots}${more}</span>
      </button>
    `);
  }

  return `
    <div class="calendar-view">
      <div class="cal-header">
        <button class="cal-nav" id="cal-prev" aria-label="Өмнөх сар">‹</button>
        <div class="cal-title">${monthNames[month]} ${year}</div>
        <button class="cal-nav" id="cal-next" aria-label="Дараагийн сар">›</button>
        <button class="cal-today-btn" id="cal-today">Өнөөдөр</button>
      </div>
      <div class="cal-weekdays">
        ${dayNames.map(d => `<div>${d}</div>`).join('')}
      </div>
      <div class="cal-grid">
        ${cells.join('')}
      </div>
      <div class="cal-selected-info">
        <div class="cal-selected-date">${selected === today ? 'Өнөөдөр' : fmtDate(selected)} — ${selectedTasks.length} ажил</div>
        ${selectedTasks.length ? selectedTasks.map(t => `
          <div class="cal-task" data-task-id="${escapeHtml(t.id)}">
            <span class="cal-task-priority cal-dot-${t.priority || 'low'}"></span>
            <span class="cal-task-title ${t.status === 'done' ? 'done' : ''}">${escapeHtml(t.title)}</span>
            <span class="cal-task-assignee">${escapeHtml(memberName(t.assignee))}</span>
          </div>
        `).join('') : '<div class="cal-empty-msg">Энэ өдөрт ажил алга</div>'}
      </div>
    </div>
  `;
}

function attachCalendarHandlers() {
  document.getElementById('cal-prev')?.addEventListener('click', () => {
    let { year, month } = state.calendarMonth;
    month--;
    if (month < 0) { month = 11; year--; }
    state.calendarMonth = { year, month };
    render();
  });
  document.getElementById('cal-next')?.addEventListener('click', () => {
    let { year, month } = state.calendarMonth;
    month++;
    if (month > 11) { month = 0; year++; }
    state.calendarMonth = { year, month };
    render();
  });
  document.getElementById('cal-today')?.addEventListener('click', () => {
    const now = new Date();
    state.calendarMonth = { year: now.getFullYear(), month: now.getMonth() };
    state.calendarSelected = todayStr();
    render();
  });
  document.querySelectorAll('.cal-cell[data-date]').forEach(el => {
    el.addEventListener('click', () => {
      state.calendarSelected = el.dataset.date;
      render();
    });
  });
  document.querySelectorAll('.cal-task[data-task-id]').forEach(el => {
    el.addEventListener('click', () => openTaskModal(el.dataset.taskId));
  });
}

// Анхны ачааллын skeleton — cache хоосон, сервер дата хүлээж буй үед "Даалгавар алга"
// гэж андуурахаас сэргийлж shimmer мөрүүд харуулна.
function listSkeletonHtml() {
  const row = `<div class="skeleton-row">
    <div class="sk sk-dot"></div>
    <div style="flex:1;display:flex;flex-direction:column;gap:6px;">
      <div class="sk sk-line" style="width:55%;"></div>
      <div class="sk sk-line" style="width:30%;height:9px;"></div>
    </div>
    <div class="sk sk-chip"></div>
    <div class="sk sk-line" style="width:60px;height:11px;"></div>
  </div>`;
  return `<div class="skeleton-wrap">${row.repeat(6)}</div>`;
}
function emptyStateHtml() {
  // View-ийн дагуу contextual empty state — SVG icon (emoji биш)
  const SEARCH_SVG = '<svg class="lcd-icon" viewBox="0 0 24 24" style="width:56px;height:56px;opacity:.25;"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>';
  const big = (svg) => svg.replace('class="lcd-icon"', 'class="lcd-icon" style="width:56px;height:56px;opacity:.25;"');
  let icon = big(ICONS.layers), title = 'Даалгавар алга', sub = '+ Шинэ дарж нэмнэ үү';
  const v = state.view;
  if (v === 'mine')           { icon = big(ICONS.target);   title = 'Танд оноосон ажил алга'; sub = 'Бүх ажилаа дуусгасан байна. Сайн байна!'; }
  else if (v === 'delegated') { icon = big(ICONS.send);     title = 'Үүргэсэн ажил алга'; sub = 'Та өөр хүнд хариуцуулсан ажил байхгүй байна. + Шинэ дарж оноо.'; }
  else if (v === 'finance')   { icon = big(ICONS.wallet);   title = 'Санхүүгийн хүсэлт алга'; sub = 'Хүсэлт дарж шинэ төлбөрийн хүсэлт илгээнэ үү.'; }
  else if (v === 'overdue')   { icon = big(ICONS.check);    title = 'Хоцорсон даалгавар алга'; sub = 'Бүх хугацаа дотроо явж байна.'; }
  else if (v === 'today')     { icon = big(ICONS.sun);      title = 'Өнөөдөр дуусах юм алга'; sub = 'Тайван өдөр болж байна.'; }
  else if (v === 'done')      { icon = big(ICONS.layers);   title = 'Дууссан ажил алга'; sub = 'Шинэ ажилаа эхлээрэй.'; }
  else if (state.statusFilter === 'done') { icon = big(ICONS.check); title = 'Дуусгасан ажил алга'; sub = 'Идэвхтэй ажлуудаа үргэлжлүүл.'; }
  else if (state.search)      { icon = SEARCH_SVG; title = `"${state.search}" гэж олдсонгүй`; sub = 'Өөр түлхүүр үг туршаарай.'; }

  // Quick-add товч — empty state дотроос шууд үүсгэх боломж
  let actionBtn = '';
  if (v === 'mine' || v === 'delegated') {
    actionBtn = `<button class="empty-action btn-primary" onclick="openTaskModal()">+ Шинэ ажил үүсгэх</button>`;
  } else if (v === 'finance') {
    actionBtn = `<button class="empty-action btn-primary" onclick="openFinanceModal()">+ Шинэ хүсэлт илгээх</button>`;
  }
  return `<div class="empty">${icon}<div class="title">${escapeHtml(title)}</div><div class="sub">${escapeHtml(sub)}</div>${actionBtn}</div>`;
}
/* ─── Multi-assignee picker — олон хүнд нэг дор ажил оноох ─── */
function openMultiAssigneePicker(currentAssignees = []) {
  const modal = document.getElementById('multi-pick-modal');
  const listEl = document.getElementById('mp-list');
  const searchEl = document.getElementById('mp-search');
  const allEl = document.getElementById('mp-all');
  const countEl = document.getElementById('mp-save-count');

  let selected = new Set(currentAssignees);
  const expandedGroups = new Set();   // нээлттэй бүлгүүд (толгой дарж нээнэ)

  function renderList() {
    const q = (searchEl.value || '').toLowerCase().trim();
    const active = TEAM.filter(m => (m.status || 'идэвхтэй') !== 'гарсан');
    // Бүлгээр (Бүлэг багана + Цагийн ажилтан) ангилна, хайлтаар шүүнэ.
    const byGroup = {};
    active.forEach(m => {
      const ok = !q || (m.name || '').toLowerCase().includes(q) || (m.role || '').toLowerCase().includes(q);
      if (!ok) return;
      const g = memberGroupOf(m);
      (byGroup[g] = byGroup[g] || []).push(m);
    });
    const pref = ['M Event', 'Camp', 'Нэгдсэн'];
    const others = Object.keys(byGroup).filter(g => !pref.includes(g) && g !== 'Цагийн ажилтан').sort();
    const order = [...pref, ...others, 'Цагийн ажилтан'].filter(g => byGroup[g] && byGroup[g].length);
    const autoExpand = !!q;   // хайж байгаа үед бүх таарсан бүлгийг нээнэ
    const rowHtml = (m) => `
      <label class="mp-row" style="padding-left:16px;">
        <input type="checkbox" data-mp-id="${escapeHtml(personKey(m))}" ${selected.has(personKey(m)) ? 'checked' : ''} style="width:18px;height:18px;" />
        <span class="mp-avatar">${escapeHtml(memberInitials(personKey(m)))}</span>
        <span class="mp-info"><span class="mp-name">${escapeHtml(m.name)}</span><span class="mp-role">${escapeHtml(m.role || '')}</span></span>
      </label>`;
    listEl.innerHTML = order.map(g => {
      const ms = byGroup[g];
      const selCount = ms.filter(m => selected.has(personKey(m))).length;
      const open = autoExpand || expandedGroups.has(g);
      return `<div class="mp-group">
        <button type="button" data-mp-group="${escapeHtml(g)}" style="display:flex;align-items:center;justify-content:space-between;width:100%;gap:8px;padding:11px 12px;margin-top:6px;background:var(--panel-hover);border:1px solid var(--border);border-radius:var(--r-md);font-weight:600;cursor:pointer;color:var(--text);font-size:14px;">
          <span>${open ? '▾' : '▸'} ${escapeHtml(g)} <span style="color:var(--muted);font-weight:400;">(${ms.length})</span></span>
          ${selCount ? `<span style="color:var(--accent-green);font-size:12px;">${selCount} ✓</span>` : ''}
        </button>
        <div style="display:${open ? 'block' : 'none'};">${ms.map(rowHtml).join('')}</div>
      </div>`;
    }).join('') || '<div style="padding:14px;color:var(--muted);">Ажилтан олдсонгүй</div>';
    listEl.querySelectorAll('button[data-mp-group]').forEach(btn => {
      btn.addEventListener('click', () => {
        const g = btn.dataset.mpGroup;
        if (expandedGroups.has(g)) expandedGroups.delete(g); else expandedGroups.add(g);
        renderList();
      });
    });
    listEl.querySelectorAll('input[data-mp-id]').forEach(cb => {
      cb.addEventListener('change', () => {
        if (cb.checked) selected.add(cb.dataset.mpId);
        else selected.delete(cb.dataset.mpId);
        updateCount();
      });
    });
    updateCount();
  }
  function updateCount() {
    countEl.textContent = selected.size;
    allEl.checked = selected.size === TEAM.length;
  }
  searchEl.value = '';
  searchEl.oninput = renderList;
  allEl.onchange = () => {
    if (allEl.checked) {
      TEAM.filter(m => (m.status || 'идэвхтэй') !== 'гарсан').forEach(m => selected.add(personKey(m)));
    } else {
      selected.clear();
    }
    renderList();
  };
  renderList();
  modal.classList.add('open');

  return new Promise((resolve) => {
    document.getElementById('mp-cancel').onclick = () => {
      modal.classList.remove('open');
      resolve(null);
    };
    document.getElementById('mp-save').onclick = () => {
      modal.classList.remove('open');
      resolve([...selected]);
    };
  });
}

function refreshMultiAssigneeChips(ids) {
  const wrap = document.getElementById('t-multi-chips');
  const single = document.getElementById('t-assignee');
  if (!ids || ids.length === 0) {
    wrap.style.display = 'none';
    single.style.display = '';
    return;
  }
  wrap.style.display = 'flex';
  single.style.display = 'none';
  wrap.innerHTML = ids.slice(0, 8).map(id => `
    <span class="t-multi-chip">
      <span class="mp-avatar">${escapeHtml(memberInitials(id))}</span>
      ${escapeHtml(memberName(id))}
      <button type="button" data-mp-remove="${escapeHtml(id)}" aria-label="Хасах">×</button>
    </span>
  `).join('') + (ids.length > 8 ? `<span class="t-multi-more">+${ids.length - 8}</span>` : '');
  wrap.querySelectorAll('button[data-mp-remove]').forEach(btn => {
    btn.addEventListener('click', () => {
      state._multiAssignees = (state._multiAssignees || []).filter(x => x !== btn.dataset.mpRemove);
      refreshMultiAssigneeChips(state._multiAssignees);
    });
  });
}

/* ─── Online/offline detection + auto-sync ─────────────── */
function updateOnlineStatus() {
  const offline = !navigator.onLine;
  const banner = document.getElementById('offline-banner');
  if (banner) banner.classList.toggle('show', offline);
  const queue = loadPendingWrites();
  const cntEl = document.getElementById('offline-queue-count');
  if (cntEl) {
    if (queue.length > 0) {
      cntEl.textContent = ` · ${queue.length} өөрчлөлт хүлээж байна`;
      cntEl.style.display = '';
    } else {
      cntEl.style.display = 'none';
    }
  }
  if (!offline && queue.length > 0) {
    // Шинээр онлайн болсон — backlog flush хийх
    flushPendingWrites().then(() => updateOnlineStatus());
  }
}
window.addEventListener('online', () => {
  showToast('Интернэт сэргэв — синк хийж байна...', 'info', 2000);
  updateOnlineStatus();
});
window.addEventListener('offline', () => {
  showToast('Интернэтгүй боллоо — офлайн горим', 'warn', 3000);
  updateOnlineStatus();
});
// Анхны load
setTimeout(updateOnlineStatus, 500);
// Pending writes-ийг тогтмол шалгах (хэрэв background-д ямар нэг солигдвол)
setInterval(updateOnlineStatus, 15000);

/* ─── Албан тушаалаас Зэрэглэл (level) олох ──────────── */
function levelForRole(role) {
  const r = String(role || '').trim().toLowerCase();
  // 100 — CEO
  if (/гүйцэтгэх захирал|ceo/.test(r)) return 100;
  // 80 — COO / ҮАХ захирал
  if (/үйл ажиллагааны захирал|үах захирал|coo/.test(r)) return 80;
  // 60 — Менежер, ахлах ангилал, Ерөнхий нягтлан, Нярав
  if (/менежер|manager|ерөнхий нягтлан|ахлах|нярав/.test(r)) return 60;
  // 40 — Үлдсэн ажилтнууд (туслах, ажилтан, тогооч, жолооч г.м.)
  return 40;
}

/* ─── Шинэ ажилтан бүртгүүлсэн үед CEO-д мэдэгдэх ─────────
   loadTeamFromAPI болгонд request_id-тай шинэ ажилтан байгаа эсэхийг
   шалгана. localStorage('seenStaffIds_v1') нь өмнө мэдэгдсэн нэгжийг
   тэмдэглэдэг тул давтан spam-ээ сэргийлнэ. */
function notifyCEOOfPendingRegistrations() {
  if (!state.isCEO) return;
  // Шинэ ажилтан = request_id-тай (бүртгэлээр орсон) бөгөөд CEO-биш бусад ажилтан
  const fresh = TEAM.filter(m => m.request_id && m.email !== state.me);
  if (!fresh.length) return;
  const seenRaw = localStorage.getItem('seenStaffIds_v1') || '[]';
  let seen;
  try { seen = JSON.parse(seenRaw); if (!Array.isArray(seen)) seen = []; }
  catch(e) { seen = []; }
  const newOnes = fresh.filter(m => !seen.includes(m.request_id));
  if (!newOnes.length) return;
  // In-app notification
  if (!Array.isArray(state.notifications)) state.notifications = [];
  newOnes.forEach(m => {
    state.notifications.unshift({
      id: 'new-staff-' + m.request_id,
      type: 'assigned',
      taskId: 'staff-management',
      msg: `Шинэ ажилтан бүртгүүллээ: ${m.name} (${m.role})`,
      ts: Date.now(),
      read: false,
    });
  });
  saveNotifications();
  renderNotifications();
  showToast(
    newOnes.length === 1
      ? `🆕 Шинэ ажилтан: ${newOnes[0].name}`
      : `🆕 ${newOnes.length} шинэ ажилтан бүртгүүллээ`,
    'success', 4000
  );
  if (window._chimunNotify) {
    newOnes.forEach(m => {
      window._chimunNotify('Шинэ ажилтан бүртгүүллээ', `${m.name} — ${m.role}`, {
        tag: 'new-staff-' + m.request_id,
      });
    });
  }
  const newSeen = [...new Set([...seen, ...newOnes.map(m => m.request_id)])];
  localStorage.setItem('seenStaffIds_v1', JSON.stringify(newSeen));
}

/* ─── Pending registrations (CEO review) ───────────────────
   Шинэ ажилтан бүртгүүлэхэд status='хүлээж буй' гэж тэмдэглэгдэнэ.
   CEO Staff Management list дотроос pending row дээр товшиход энэ
   modal нээгдэж CEO цалин/зэрэглэл/ID нэмж "Зөвшөөрөх" эсвэл "Татгалзах". */
function openPendingRegistration(member) {
  if (!state.isCEO) return;
  const modal = document.getElementById('pending-reg-modal');
  // Avatar / initials
  const photoEl = document.getElementById('pending-reg-photo');
  if (member.photo) {
    photoEl.innerHTML = `<img src="${escapeHtml(driveThumbUrl(member.photo, 256))}" alt="" loading="lazy" decoding="async" style="width:100%;height:100%;object-fit:cover;border-radius:50%;" />`;
  } else {
    photoEl.textContent = memberInitials(member.email || member.name);
  }
  // Info block
  const fmt = (label, val) => val ? `<div><strong>${escapeHtml(label)}:</strong> ${escapeHtml(val)}</div>` : '';
  document.getElementById('pending-reg-info').innerHTML = [
    fmt('Нэр', member.name),
    fmt('Албан тушаал', member.role),
    fmt('Салбар', member.group || member.branch),
    fmt('Утас', member.phone),
    fmt('И-мэйл', member.email),
    fmt('РД', member.rd),
    fmt('Гэрийн хаяг', member.address),
    fmt('Яаралтай үед', `${member.emergency_name || ''}${member.emergency_phone ? ' — ' + member.emergency_phone : ''}`),
    fmt('Хүсэлт өгсөн', member.requested_at ? new Date(member.requested_at).toLocaleString('mn-MN') : ''),
  ].filter(Boolean).join('');
  // CEO-ийн талбарууд — Зэрэглэлийг албан тушаалаас автомат
  document.getElementById('reg-salary').value = member.salary || '';
  document.getElementById('reg-level').value = member.level || levelForRole(member.role);
  document.getElementById('reg-notes').value = member.notes || '';

  const approveBtn = document.getElementById('reg-approve');
  const rejectBtn = document.getElementById('reg-reject');
  approveBtn.onclick = async () => {
    const salary = document.getElementById('reg-salary').value.trim();
    const level = parseInt(document.getElementById('reg-level').value, 10) || 40;
    const notes = document.getElementById('reg-notes').value.trim();
    if (!member.email) { showToast('И-мэйл хаяг алга — баталгаажуулах боломжгүй', 'error'); return; }
    const payload = {
      action: 'approve_registration',
      request_id: member.request_id || member.email || member.requested_at,
      email: member.email,
      salary,
      level,
      notes,
      status: 'идэвхтэй',
      approved_by: state.me,
      approved_at: new Date().toISOString(),
    };
    const webhook = state.config.staffUrl?.replace(/\/[^\/]+$/, '/staff-approve');
    if (webhook) {
      try {
        const r = await fetchWithTimeout(withKey(webhook), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        if (r.ok) {
          showToast('Бүртгэл баталгаажсан. Master Sheet шинэчлэгдсэн.', 'success', 3000);
          modal.classList.remove('open');
          // Локал TEAM шинэчлэх — email-ээр олно
          const idx = TEAM.findIndex(m => m.email === member.email);
          if (idx >= 0) {
            TEAM[idx] = { ...TEAM[idx], status: 'идэвхтэй', salary, level, notes };
            localStorage.setItem('teamCache', JSON.stringify(TEAM.map(sanitizeTeamForCache)));
          }
          await loadTeamFromAPI();
          renderStaffList();
        } else {
          throw new Error('HTTP ' + r.status);
        }
      } catch(e) {
        showToast('Sync алдаа: ' + e.message, 'error', 4000);
      }
    } else {
      showToast('Staff webhook тохируулагдаагүй', 'warn');
    }
  };
  rejectBtn.onclick = async () => {
    if (!(await showConfirm(`${member.name}-ийн хүсэлтийг татгалзах уу?`, { okText: 'Татгалзах', danger: true }))) return;
    const payload = {
      action: 'reject_registration',
      request_id: member.request_id || member.email || member.requested_at,
      email: member.email,
      status: 'татгалзсан',
      rejected_by: state.me,
      rejected_at: new Date().toISOString(),
    };
    const webhook = state.config.staffUrl?.replace(/\/[^\/]+$/, '/staff-approve');
    if (webhook) {
      try {
        await fetchWithTimeout(withKey(webhook), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      } catch(e) {}
    }
    // Локал хасах — email-ээр
    const idx = TEAM.findIndex(m => m.email === member.email);
    if (idx >= 0) TEAM.splice(idx, 1);
    localStorage.setItem('teamCache', JSON.stringify(TEAM.map(sanitizeTeamForCache)));
    modal.classList.remove('open');
    showToast('Хүсэлт татгалзсан', 'info');
    renderStaffList();
  };

  modal.classList.add('open');
}

/* ─── Staff management (CEO only) ─────────────────────────
   CEO ажилтны статусыг өөрчилнө (идэвхтэй ↔ гарсан).
   "Гарсан" гэж тэмдэглэсэн ажилтан:
     - Apps нэвтрэх боломжгүй (loadTeamFromAPI 'гарсан' статусыг шүүж хасдаг)
     - Master Sheet-д тус "Төлөв" нүдэнд "гарсан" гэж бичигдэнэ
   Webhook URL нь n8n-ийн /staff-update endpoint руу POST хийнэ. */
function openStaffManagement() {
  if (!state.isCEO) { showToast('Зөвхөн CEO эрхтэй', 'warn'); return; }
  document.getElementById('staff-modal').classList.add('open');
  renderStaffList();
}

// Ажилтны салбарын шошго (branches[]-д суурилсан — Тоймын toggle-тэй нийцнэ).
function staffBranchLabel(m) {
  if (m.worker_type === 'daily') return 'Цагийн ажилтан';
  const bs = (Array.isArray(m.branches) ? m.branches.join(' ') : String(m.group || m.branch || '')).toLowerCase();
  const hasE = /m-event|event|ивент|эвент/.test(bs);
  const hasC = /camp|кемп|номаад|nomaad/.test(bs);
  if (hasE && hasC) return 'Нэгдсэн';
  if (hasE) return 'M-Event';
  if (hasC) return 'NOMAAD Camp';
  return 'Нэгдсэн';
}
function renderStaffList() {
  const listEl = document.getElementById('staff-list');
  const q = (document.getElementById('staff-search')?.value || '').toLowerCase().trim();
  const all = [...TEAM].sort((a, b) => {
    // Active first, then by level
    const aActive = (a.status || 'идэвхтэй') === 'идэвхтэй';
    const bActive = (b.status || 'идэвхтэй') === 'идэвхтэй';
    if (aActive !== bActive) return aActive ? -1 : 1;
    return (b.level || 0) - (a.level || 0);
  });
  const filtered = all.filter(m =>
    !q || (m.name || '').toLowerCase().includes(q) || (m.role || '').toLowerCase().includes(q)
  );
  if (!filtered.length) {
    listEl.innerHTML = '<div style="color:var(--muted);text-align:center;padding:20px;">Ажилтан олдсонгүй</div>';
    return;
  }
  const rowHtml = (m) => {
    const status = m.status || 'идэвхтэй';
    const isActive = status === 'идэвхтэй';
    const isPending = status === 'хүлээж буй';
    const isSelf = personKey(m) === state.me;
    let statusLabel = 'Идэвхтэй', statusCls = 'active';
    if (status === 'гарсан') { statusLabel = 'Гарсан'; statusCls = 'left'; }
    else if (isPending)      { statusLabel = '⏳ Хүлээж буй'; statusCls = 'pending'; }
    const key = personKey(m);
    return `
      <div class="staff-row ${isActive ? '' : (isPending ? 'staff-pending' : 'staff-left')}" data-staff-email="${escapeHtml(key)}">
        <span class="staff-avatar">${m.photo ? `<img src="${escapeHtml(driveThumbUrl(m.photo, 96))}" alt="" loading="lazy" decoding="async" style="width:100%;height:100%;object-fit:cover;border-radius:50%;" />` : escapeHtml(memberInitials(key))}</span>
        <div class="staff-info">
          <div class="staff-name">${escapeHtml(m.name)} ${isSelf ? '<span class="staff-you">(Та)</span>' : ''}</div>
          <div class="staff-role"><span class="staff-role-text">${escapeHtml(m.role || '—')}</span><button class="staff-role-edit" data-staff-roleedit="${escapeHtml(key)}" title="Албан тушаал засах">✎</button>${m.email ? ' · ' + escapeHtml(m.email) : ''}</div>
          ${state.isCEO && isActive ? `<label class="staff-finperm" style="display:inline-flex;align-items:center;gap:5px;font-size:11px;color:var(--muted);margin-top:4px;cursor:pointer;"><input type="checkbox" data-finperm="${escapeHtml(key)}" data-finperm-name="${escapeHtml(m.name)}" ${state.finBranchPerms && state.finBranchPerms.has(key) ? 'checked' : ''} style="margin:0;width:auto;" />🏦 Санхүү: салбар засах эрх</label>` : ''}
        </div>
        <span class="staff-status status-${statusCls}">${statusLabel}</span>
        ${isSelf ? '' : (
          isPending
            ? `<button class="staff-action approve" data-staff-act="review" data-staff-email="${escapeHtml(key)}">Хянах</button>`
            : `<button class="staff-action ${isActive ? 'leave' : 'restore'}" data-staff-act="${isActive ? 'leave' : 'restore'}" data-staff-email="${escapeHtml(key)}">${isActive ? 'Гарсан гэж тэмдэглэх' : 'Сэргээх'}</button>`
        )}
      </div>
    `;
  };
  // Салбараар бүлэглэх: M-Event → NOMAAD Camp → Нэгдсэн → Цагийн ажилтан
  const groups = {};
  filtered.forEach(m => { const g = staffBranchLabel(m); (groups[g] = groups[g] || []).push(m); });
  const order = ['M-Event', 'NOMAAD Camp', 'Нэгдсэн', 'Цагийн ажилтан'];
  const gkeys = [...order.filter(g => groups[g]), ...Object.keys(groups).filter(g => !order.includes(g)).sort()];
  listEl.innerHTML = gkeys.map(g =>
    `<div class="staff-group-head" style="font-size:12px;font-weight:700;color:var(--muted);text-transform:uppercase;letter-spacing:.4px;padding:14px 4px 4px;">${escapeHtml(g)} <span style="color:var(--text-soft);">(${groups[g].length})</span></div>`
    + groups[g].map(rowHtml).join('')
  ).join('');
  listEl.querySelectorAll('.staff-role-edit').forEach(btn => {
    btn.addEventListener('click', (e) => { e.stopPropagation(); editStaffRole(btn.dataset.staffRoleedit); });
  });
  // Санхүү салбар-засах эрх — CEO тус бүр дээр асаах/унтраах.
  listEl.querySelectorAll('[data-finperm]').forEach(cb => {
    cb.addEventListener('change', (e) => {
      e.stopPropagation();
      saveFinanceBranchPerm(cb.dataset.finperm, cb.dataset.finpermName, cb.checked);
    });
  });
  listEl.querySelectorAll('.staff-action').forEach(btn => {
    btn.addEventListener('click', async () => {
      const email = btn.dataset.staffEmail;
      const act = btn.dataset.staffAct;
      const member = findMember(email);
      if (!member) return;
      if (act === 'review') { openPendingRegistration(member); return; }
      const newStatus = act === 'leave' ? 'гарсан' : 'идэвхтэй';
      const verb = act === 'leave' ? 'Гарсан гэж тэмдэглэх' : 'Сэргээх';
      const confirmMsg = act === 'leave'
        ? `${member.name}-ийг "Гарсан" гэж тэмдэглэх үү? Тэр аппд нэвтэрч чадахгүй болно.`
        : `${member.name}-ийг буцааж "Идэвхтэй" болгох уу?`;
      if (!(await showConfirm(confirmMsg, { okText: verb, danger: act === 'leave' }))) return;

      // 1. Локал TEAM шинэчлэх
      member.status = newStatus;
      localStorage.setItem('teamCache', JSON.stringify(TEAM.map(sanitizeTeamForCache)));
      // 2. Master Sheet руу webhook илгээх (n8n /staff-update endpoint)
      const webhook = state.config.staffUrl;
      if (webhook) {
        try {
          // Огноо талбарууд — статусаас хамаарч 'Гарсан огноо' эсвэл 'Орсон огноо' бичигдэнэ.
          // Sheet дотор хоёр баганатай байх ёстой: 'Гарсан огноо', 'Орсон огноо'.
          const today = todayStr(); // YYYY-MM-DD local format
          const leftDate = newStatus === 'гарсан' ? today : '';
          const joinedDate = newStatus === 'идэвхтэй' ? today : '';
          // Locally also persist
          if (newStatus === 'гарсан') member.left_at = today;
          if (newStatus === 'идэвхтэй') member.joined_at = today;
          localStorage.setItem('teamCache', JSON.stringify(TEAM.map(sanitizeTeamForCache)));

          const r = await fetchWithTimeout(withKey(webhook.replace(/\/[^\/]+$/, '/staff-update')), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              action: 'update_status',
              phone: member.phone,      // утсаар тааруулна (ID хэрэглэхээ больсон)
              email: member.email,
              status: newStatus,
              left_date: leftDate,      // 'Гарсан огноо' багана
              joined_date: joinedDate,  // 'Орсон огноо' багана
              requested_by: state.me,
              timestamp: new Date().toISOString(),
            }),
          });
          if (r.ok) {
            showToast(`${member.name} — ${newStatus} болсон. Master Sheet-д хадгалагдсан.`, 'success', 3000);
          } else {
            showToast(`${member.name} — локалд хадгалагдсан. Master Sheet-д sync хийгдээгүй.`, 'warn', 4000);
          }
        } catch (e) {
          showToast(`${member.name} — локалд хадгалагдсан. Sheet sync алдаатай.`, 'warn', 4000);
        }
      } else {
        showToast(`${member.name} — локалд хадгалагдсан. Sheet тохируулагдаагүй.`, 'info', 3000);
      }
      renderStaffList();
    });
  });
}

// Бүртгэлийн формын role сонголтуудыг runtime-д уншина (давхардуулахгүй).
function getRoleOptions() {
  return [...document.querySelectorAll('#reg-role option')].map(o => o.value).filter(Boolean);
}

// Ажилтны албан тушаал (role)-ийг мөр дотор inline select-ээр засна.
function editStaffRole(key) {
  const member = findMember(key);
  if (!member) return;
  const row = [...document.querySelectorAll('.staff-row')].find(r => r.dataset.staffEmail === key);
  const roleDiv = row?.querySelector('.staff-role');
  if (!roleDiv) return;
  const roles = getRoleOptions();
  const cur = member.role || '';
  if (cur && !roles.includes(cur)) roles.unshift(cur);   // одоогийн role жагсаалтад байхгүй бол нэмнэ
  const sel = document.createElement('select');
  sel.className = 'staff-role-select';
  sel.innerHTML = roles.map(r => `<option value="${escapeHtml(r)}"${r === cur ? ' selected' : ''}>${escapeHtml(r)}</option>`).join('');
  roleDiv.innerHTML = '';
  roleDiv.appendChild(sel);
  sel.focus();
  sel.addEventListener('change', () => saveStaffRole(member, sel.value));
  sel.addEventListener('blur', () => setTimeout(renderStaffList, 100));
}

// Role-ийг Master Sheet-д хадгална (/staff-role endpoint, утсаар тааруулна). Optimistic.
async function saveStaffRole(member, role) {
  role = String(role || '').trim();
  if (!role || role === member.role) { renderStaffList(); return; }
  const prev = member.role;
  member.role = role;
  try { localStorage.setItem('teamCache', JSON.stringify(TEAM.map(sanitizeTeamForCache))); } catch(e) {}
  renderStaffList();
  const base = state.config.staffUrl;
  if (!base) { showToast('Локалд хадгаллаа (Sheet sync алга)', 'warn'); return; }
  const url = base.replace(/\/[^\/]+$/, '/staff-role');
  try {
    const r = await fetchWithTimeout(withKey(url), {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'update_role', phone: member.phone, role, requested_by: state.me }),
    }, 15000);
    if (!r.ok) throw new Error('HTTP ' + r.status);
    showToast(`${member.name}: албан тушаал → ${role}`, 'success', 2500);
  } catch(e) {
    member.role = prev;
    try { localStorage.setItem('teamCache', JSON.stringify(TEAM.map(sanitizeTeamForCache))); } catch(_) {}
    renderStaffList();
    showToast('Алдаа: ' + e.message, 'error');
  }
}

function setupStaffManagement() {
  document.getElementById('staff-close')?.addEventListener('click', () =>
    document.getElementById('staff-modal').classList.remove('open'));
  document.getElementById('staff-search')?.addEventListener('input', renderStaffList);
}

/* ─── Permissions UI (CEO only) ─── */
function openPermissionsModal() {
  if (!state.isCEO) return;
  const list = document.getElementById('perm-list');
  const perms = JSON.parse(localStorage.getItem('permissions') || '{}');
  // Боломжит эрхүүд
  const features = [
    { key: 'create_task', label: 'Шинэ ажил үүсгэх' },
    { key: 'create_finance', label: 'Санхүүгийн хүсэлт илгээх' },
    { key: 'create_order', label: 'Шинэ захиалга (5-дамжлагат акт) үүсгэх' },
    { key: 'edit_others', label: 'Өөр хүний ажлыг засах' },
    { key: 'delete_tasks', label: 'Ажил устгах' },
    { key: 'view_dashboard', label: 'Тойм үзэх' },
  ];
  list.innerHTML = features.map(f => {
    const enabled = perms[f.key] !== false; // default true
    return `
      <label class="perm-row">
        <input type="checkbox" data-perm-key="${f.key}" ${enabled ? 'checked' : ''} />
        <span>${escapeHtml(f.label)}</span>
      </label>
    `;
  }).join('');
  document.getElementById('permissions-modal').classList.add('open');
}

function setupPermissionsModal() {
  document.getElementById('perm-cancel')?.addEventListener('click', () =>
    document.getElementById('permissions-modal').classList.remove('open'));
  document.getElementById('perm-save')?.addEventListener('click', () => {
    const perms = {};
    document.querySelectorAll('#perm-list input[data-perm-key]').forEach(cb => {
      perms[cb.dataset.permKey] = cb.checked;
    });
    localStorage.setItem('permissions', JSON.stringify(perms));
    document.getElementById('permissions-modal').classList.remove('open');
    showToast('Эрхийн тохиргоо хадгалагдсан', 'success');
  });
}

/* ─── Drag-drop reorder (desktop) ─── */
let _dragSrcId = null;
function attachDragReorder(row, t) {
  row.addEventListener('dragstart', (e) => {
    _dragSrcId = t.id;
    row.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
    try { e.dataTransfer.setData('text/plain', t.id); } catch(err) {}
  });
  row.addEventListener('dragend', () => {
    row.classList.remove('dragging');
    document.querySelectorAll('.task-row.drag-over').forEach(r => r.classList.remove('drag-over'));
    _dragSrcId = null;
  });
  row.addEventListener('dragover', (e) => {
    if (!_dragSrcId || _dragSrcId === t.id) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    row.classList.add('drag-over');
  });
  row.addEventListener('dragleave', () => row.classList.remove('drag-over'));
  row.addEventListener('drop', (e) => {
    e.preventDefault();
    row.classList.remove('drag-over');
    if (!_dragSrcId || _dragSrcId === t.id) return;
    const srcIdx = state.tasks.findIndex(x => x.id === _dragSrcId);
    const dstIdx = state.tasks.findIndex(x => x.id === t.id);
    if (srcIdx < 0 || dstIdx < 0) return;
    const [moved] = state.tasks.splice(srcIdx, 1);
    state.tasks.splice(dstIdx, 0, moved);
    saveData();
    render();
    showToast('Эрэмбэ өөрчилсөн', 'success', 1200);
  });
}

/* ─── Long-press → bulk mode (мобайл + desktop) ─── */
function attachLongPress(row, t) {
  let timer = null;
  let moved = false;
  const LONG_MS = 500;
  const start = () => {
    moved = false;
    timer = setTimeout(() => {
      if (moved) return;
      ensureBulkState();
      bulkToggle(t.id);
      if ('vibrate' in navigator) try { navigator.vibrate(20); } catch(e) {}
    }, LONG_MS);
  };
  const cancel = () => { if (timer) { clearTimeout(timer); timer = null; } };
  row.addEventListener('touchstart', start, { passive: true });
  row.addEventListener('touchmove', () => { moved = true; cancel(); }, { passive: true });
  row.addEventListener('touchend', cancel);
  row.addEventListener('touchcancel', cancel);
  // Desktop: contextmenu (right-click) → bulk toggle
  row.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    bulkToggle(t.id);
  });
}

/* ─── Mobile swipe actions for task rows ───
   Зүүн → Татгалзах/Устгах. Баруун → Дуусгасан. Зөвхөн утсан дээр (touch).
   80px-аас илүү шудалбал үйлдэл идэвхжинэ. */
function attachSwipeActions(row, t) {
  // Зөвхөн утсан дээр (touch device) ажиллана
  if (!('ontouchstart' in window)) return;
  // Finance request, subtask, parent — swipe-гүй (төвөгтэй логиктой)
  if (t.kind === 'finance_request' || t.kind === 'act_parent' || t.kind === 'act_stage') return;
  // Дууссан task-д swipe үл хэрэгтэй
  if (t.status === 'done') return;

  let startX = 0, startY = 0, currentX = 0;
  let swiping = false, axisLocked = false;
  const THRESHOLD = 80;

  const onStart = (e) => {
    const touch = e.touches[0];
    startX = touch.clientX;
    startY = touch.clientY;
    currentX = 0;
    swiping = true;
    axisLocked = false;
    row.style.transition = 'none';
  };

  const onMove = (e) => {
    if (!swiping) return;
    const touch = e.touches[0];
    const dx = touch.clientX - startX;
    const dy = touch.clientY - startY;
    // Эхний хөдөлгөөнд axis сонгох — vertical scroll-ийг саатуулахгүй
    if (!axisLocked) {
      if (Math.abs(dy) > Math.abs(dx)) {
        swiping = false; // vertical scroll, swipe цуцлах
        return;
      }
      if (Math.abs(dx) > 8) axisLocked = true;
      else return;
    }
    currentX = dx;
    row.style.transform = `translateX(${dx}px)`;
    // Дэвсгэр өнгийг harguilsan үйлдлийнхээр өөрчлөх
    if (dx > 0) {
      row.style.background = `linear-gradient(90deg, rgba(16,185,129,${Math.min(dx/THRESHOLD, 1)*0.30}) 0%, transparent ${Math.min(100, dx/3)}%)`;
    } else if (dx < 0) {
      row.style.background = `linear-gradient(270deg, rgba(239,68,68,${Math.min(-dx/THRESHOLD, 1)*0.30}) 0%, transparent ${Math.min(100, -dx/3)}%)`;
    }
  };

  const onEnd = () => {
    if (!swiping) return;
    swiping = false;
    row.style.transition = 'transform 200ms ease, background 200ms ease';
    if (currentX > THRESHOLD) {
      // Баруун шудалсан → Дуусгасан
      row.style.transform = 'translateX(100%)';
      row.style.background = 'rgba(16,185,129,0.30)';
      setTimeout(() => {
        const idx = state.tasks.findIndex(x => x.id === t.id);
        if (idx >= 0) {
          state.tasks[idx].status = 'done';
          state.tasks[idx].executed_at = new Date().toISOString();
          state.tasks[idx].executed_by = state.me;
          saveData();
          render();
          showToast('Дуусгасан', 'success', 1200);
        }
      }, 180);
    } else if (currentX < -THRESHOLD) {
      // Зүүн шудалсан → Устгах. canDeleteTask check-ээр permission шалгана.
      row.style.transform = 'translateX(-100%)';
      row.style.background = 'rgba(239,68,68,0.30)';
      setTimeout(async () => {
        const can = canDeleteTask(t);
        if (!can.ok) {
          row.style.transform = '';
          row.style.background = '';
          const who = can.creator ? `${can.creator.name} (${can.creator.role})` : 'дээд албан тушаалтан';
          showToast(`${who} үүсгэсэн даалгавар. Устгах эрх танд алга.`, 'warn', 4000);
          return;
        }
        // Зөвшөөрөгдсөн — deleteTask helper-ээр явуулна (mistake window + soft/hard сонголтыг бас хариуцна)
        await deleteTask(t.id);
      }, 180);
    } else {
      // Threshold хүрээгүй → буцаах
      row.style.transform = '';
      row.style.background = '';
    }
  };

  row.addEventListener('touchstart', onStart, { passive: true });
  row.addEventListener('touchmove', onMove, { passive: true });
  row.addEventListener('touchend', onEnd);
  row.addEventListener('touchcancel', onEnd);
}

function renderRow(t) {
  const row = document.createElement('div');
  const isParent = t.kind === 'act_parent';
  const isSub = t.kind === 'act_stage' || !!t.parent_id;
  const isFinance = t.kind === 'finance_request';
  const lockCheck = isSub ? canCompleteSubtask(t) : { ok: true };
  let cls = 'task-row';
  if (t.status === 'done') cls += ' completed';
  if (isParent) cls += ' act-parent';
  if (isSub) cls += ' subtask';
  if (!lockCheck.ok && t.status !== 'done') cls += ' locked-stage';
  row.className = cls;
  row.dataset.taskId = t.id;
  // Bulk-selected state
  if (state.bulkSelected && state.bulkSelected.has(t.id)) row.classList.add('bulk-selected');
  // Drag-drop reorder (desktop) — зөвхөн өөрийн ажил эсвэл CEO үед
  if (!t.parent_id && t.kind !== 'finance_request' && (state.isCEO || t.createdBy === state.me)) {
    row.draggable = true;
    attachDragReorder(row, t);
  }
  // Мобайл swipe action нэмэх — task row-нд touch handler
  attachSwipeActions(row, t);
  // Long-press → bulk mode-руу орох (мобайл)
  attachLongPress(row, t);
  const dc = dueClass(t.due, t.status);

  // Title: prepend stage badge for sub-tasks, append progress for parents
  let titleHtml = '';
  if (isSub && t.stage) {
    titleHtml = `<span class="stage-badge">D${t.stage}</span>${escapeHtml(t.title.replace(/^Дамжлага \d+:\s*/, ''))}`;
  } else {
    titleHtml = escapeHtml(t.title);
  }
  let extraHtml = '';
  if (isParent) {
    const p = actProgress(t.id);
    if (p.total) extraHtml = `<span class="act-progress">${p.done}/${p.total} дуусгасан</span>`;
  }
  if (isSub && !lockCheck.ok && t.status !== 'done') {
    const prevName = lockCheck.prev ? `D${lockCheck.prev.stage}` : 'өмнөх';
    extraHtml += `<span class="stage-locked-hint">🔒 ${prevName} дуусгахыг хүлээж байна</span>`;
  }
  if (isFinance) {
    const dec = t.decision || 'pending';
    let pillHtml;
    if (dec === 'pending')      pillHtml = '<span class="finance-pill pending">🕐 Хүлээгдэж буй</span>';
    else if (dec === 'rejected') pillHtml = '<span class="finance-pill rejected">✗ Татгалзсан</span>';
    else if (dec === 'deferred') pillHtml = '<span class="finance-pill deferred">🕐 Хойшлогдсон</span>';
    else if (dec === 'approved') {
      if (t.status === 'done')       pillHtml = '<span class="finance-pill executed">✓ Дууссан</span>';
      else if (t.executed_at)        pillHtml = '<span class="finance-pill executed">💵 Гүйлгээ хийгдсэн · хаахыг хүлээж буй</span>';
      else                            pillHtml = '<span class="finance-pill approved">✓ Зөвшөөрсөн · гүйлгээ хүлээж буй</span>';
    }
    if (pillHtml) extraHtml += pillHtml;
  }

  // Status dot — shows current task state subtly
  const statusClass = t.status === 'done' ? 'done'
                    : t.status === 'in_progress' ? 'in_progress'
                    : t.status === 'declined' ? 'declined'
                    : 'open';
  row.innerHTML = `
    <div>
      <!-- Status indicator (clickable биш) — нээж байж дуусгана. -->
      <div class="checkbox ${t.status==='done'?'checked':''}" data-act="open" style="cursor:pointer;"></div>
    </div>
    <div class="task-title-wrap" data-act="open">
      <div class="task-title" data-act="open">${titleHtml}${extraHtml}</div>
      <div class="task-meta" data-act="open">
        <span class="status-dot ${statusClass}" title="${statusClass === 'in_progress' ? 'Хийгдэж байна' : statusClass === 'declined' ? 'Татгалзсан' : statusClass === 'done' ? 'Дууссан' : 'Шинэ'}"></span>
        <span class="meta-mobile-only avatar-circle sm" style="display:none;background:linear-gradient(135deg,var(--primary),var(--primary-hover));">${escapeHtml(memberInitials(t.assignee))}</span>
        <span class="meta-mobile-only" style="display:none;color:var(--text-soft);font-weight:500;">${escapeHtml(memberName(t.assignee))}</span>
        ${t.due ? `<span class="meta-mobile-only meta-dot" style="display:none;"></span><span class="meta-mobile-only meta-due ${dc}" style="display:none;color:${dc==='overdue' ? 'var(--danger)' : dc==='soon' ? 'var(--warn)' : 'var(--muted)'};font-weight:${dc ? '600' : '400'};">${fmtDate(t.due)}</span>` : ''}
        ${t.priority && t.priority !== 'none' ? `<span class="meta-mobile-only" style="display:none;color:${t.priority==='high'?'var(--danger)':t.priority==='med'?'var(--warn)':'var(--ok)'};">●</span>` : ''}
        ${t.createdBy && t.createdBy !== t.assignee
          ? `<span class="meta-desktop-only meta-dot"></span><span class="meta-desktop-only delegated-from">${escapeHtml(memberName(t.createdBy))}</span>`
          : ''}
        ${t._isFinance && t.purpose
          ? `<span class="meta-dot"></span><span class="fin-purpose" style="color:var(--text-soft);" title="${escapeHtml(t.purpose)}">${escapeHtml(t.purpose.length > 70 ? t.purpose.slice(0, 70) + '…' : t.purpose)}</span>`
          : ''}
        ${t._isFinance && t.requested_at
          ? `<span class="meta-dot"></span><span class="fin-time" style="color:var(--muted);">🕐 ${escapeHtml(fmtDateTimeUB(t.requested_at))}</span>`
          : ''}
      </div>
    </div>
    <div class="col-assignee">
      <span class="assignee-chip" data-act="open" title="${escapeHtml(t.createdBy && t.createdBy !== t.assignee ? memberName(t.createdBy) + ' → ' + memberName(t.assignee) : 'Өөрөө оноосон')}">
        <span class="avatar">${escapeHtml(memberInitials(t.assignee))}</span>
        <span class="name">${escapeHtml(memberName(t.assignee))}</span>
      </span>
    </div>
    <div class="col-due">
      <span class="due ${dc}" data-act="open">${fmtDate(t.due) || '—'}</span>
    </div>
    <div class="col-priority">
      <span class="priority ${t.priority||'none'}" data-act="open">
        ${(t._isFinance
          ? ({high:'🔴 Чухал',med:'🟡 Энгийн',low:'⚪ Чөлөөтэй',none:'—'})
          : ({high:'🔴 Яаралтай',med:'🟡 Энгийн',low:'⚪ Чөлөөтэй',none:'—'})
        )[t.priority||'none']}
      </span>
    </div>
    <div class="col-rowactions">
      ${isFinance ? '' : '<button class="row-menu-btn" title="Шуурхай үйлдэл" data-act="menu">⋯</button>'}
      ${(() => {
        const can = canDeleteTask(t);
        if (can.ok) return '<button class="delete-btn" title="Устгах" data-act="delete">×</button>';
        const who = can.creator ? can.creator.name : 'дээд тушаалтан';
        return `<button class="delete-btn locked" title="${escapeHtml(who)} үүсгэсэн — устгах эрхгүй" data-act="locked">🔒</button>`;
      })()}
    </div>
  `;
  row.addEventListener('click', (e) => {
    const actEl = e.target.closest('[data-act]');
    const act = actEl?.dataset.act;
    // Delete + locked + menu үлдсэн — бусад бүх click модал нээнэ.
    if (act === 'menu') { e.stopPropagation(); openRowMenu(t, actEl); return; }
    if (act === 'delete') { deleteTask(t.id); return; }
    if (act === 'locked') {
      const can = canDeleteTask(t);
      const who = can.creator ? `${can.creator.name} (${can.creator.role})` : 'дээд албан тушаалтан';
      showToast(`${who} үүсгэсэн даалгавар. Устгах эрх танд алга. Биелүүлсэн бол ✓ тэмдэглээрэй.`, 'warn', 4500);
      return;
    }
    // Бусад бүх click (гарчиг, аватар, due, status circle, хоосон газар) → модал нээнэ
    if (isFinance) openFinanceModal(t.id);
    else openTaskModal(t.id);
  });
  row.querySelector('.task-title').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { e.preventDefault(); e.target.blur(); }
  });
  // Inline edit — title дээр double-click хийвэл шууд засагдана
  const titleEl = row.querySelector('.task-title');
  if (titleEl && !t.parent_id && t.kind !== 'finance_request') {
    titleEl.addEventListener('dblclick', (e) => {
      e.stopPropagation();
      const can = canEditTask(t);
      if (!can.all) { showToast('Зөвхөн үүсгэгч засаж чадна', 'warn'); return; }
      const oldText = t.title;
      titleEl.setAttribute('contenteditable', 'true');
      titleEl.classList.add('editing');
      titleEl.focus();
      // Бүх текстийг select хийх
      const range = document.createRange();
      range.selectNodeContents(titleEl);
      const sel = window.getSelection();
      sel.removeAllRanges();
      sel.addRange(range);
      const finish = (save) => {
        titleEl.removeAttribute('contenteditable');
        titleEl.classList.remove('editing');
        const newText = titleEl.textContent.trim();
        if (save && newText && newText !== oldText) {
          const idx = state.tasks.findIndex(x => x.id === t.id);
          if (idx >= 0) {
            state.tasks[idx].title = newText;
            saveData();
            showToast('Хадгалсан', 'success', 1200);
          }
        } else {
          titleEl.textContent = oldText;
        }
      };
      titleEl.addEventListener('blur', () => finish(true), { once: true });
      titleEl.addEventListener('keydown', (ev) => {
        if (ev.key === 'Enter') { ev.preventDefault(); finish(true); }
        else if (ev.key === 'Escape') { ev.preventDefault(); finish(false); titleEl.blur(); }
      });
    });
  }
  return row;
}

/* ─── Жагсаалтаас шуурхай үйлдэл (мөрийн ⋯ цэс) ───
   Модал нээлгүйгээр статус/оноолт/хугацаа өөрчилнө. Үйлдлүүд нь modal доторхтой
   ижил функц дуудна (handleTaskAction г.м.) тул логик давхардахгүй. */
let _rowMenuEl = null;
function _rowMenuOutside(e) { if (_rowMenuEl && !_rowMenuEl.contains(e.target)) closeRowMenu(); }
function _rowMenuEsc(e) { if (e.key === 'Escape') closeRowMenu(); }
function closeRowMenu() {
  if (!_rowMenuEl) return;
  _rowMenuEl.remove(); _rowMenuEl = null;
  document.removeEventListener('click', _rowMenuOutside, true);
  document.removeEventListener('keydown', _rowMenuEsc);
}
function openRowMenu(t, anchorEl) {
  closeRowMenu();
  const isAssignee = state.me === t.assignee;
  const canEdit = canEditTask(t);
  const status = t.status || 'open';
  const items = [];
  if (isAssignee && (status === 'open' || status === 'declined')) items.push({ label: 'Эхлүүлэх', icon: '▶', fn: () => handleTaskAction(t.id, 'start') });
  if (isAssignee && status !== 'done' && status !== 'declined') items.push({ label: 'Дуусгасан', icon: '✓', fn: () => handleTaskAction(t.id, 'done') });
  if (isAssignee && status === 'done') items.push({ label: 'Дахин нээх', icon: '↻', fn: () => handleTaskAction(t.id, 'reopen') });
  if (canEdit.all) items.push({ label: 'Дахин оноох', icon: '👤', fn: () => reassignTaskQuick(t) });
  if (canEdit.all) items.push({ label: 'Хугацаа солих', icon: '📅', fn: () => changeDueQuick(t) });
  items.push({ label: 'Дэлгэрэнгүй', icon: '✎', fn: () => openTaskModal(t.id) });
  const del = canDeleteTask(t);
  if (del.ok) items.push({ label: 'Устгах', icon: '🗑', danger: true, fn: () => deleteTask(t.id) });

  const menu = document.createElement('div');
  menu.className = 'row-action-menu';
  menu.innerHTML = items.map((it, i) => `<button class="ram-item${it.danger ? ' danger' : ''}" data-i="${i}"><span class="ram-ic">${it.icon}</span>${escapeHtml(it.label)}</button>`).join('');
  document.body.appendChild(menu);
  _rowMenuEl = menu;
  // Anchor товчны дэргэд байрлуулна; дэлгэцээс хальбал дээш/зүүн тийш эргүүлнэ
  const r = anchorEl.getBoundingClientRect();
  const mw = menu.offsetWidth, mh = menu.offsetHeight;
  let left = r.right - mw;
  let top = r.bottom + 4;
  if (top + mh > window.innerHeight - 8) top = r.top - mh - 4;
  if (left < 8) left = 8;
  menu.style.left = left + 'px';
  menu.style.top = Math.max(8, top) + 'px';
  menu.querySelectorAll('.ram-item').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const it = items[Number(btn.dataset.i)];
      closeRowMenu();
      it.fn();
    });
  });
  setTimeout(() => {
    document.addEventListener('click', _rowMenuOutside, true);
    document.addEventListener('keydown', _rowMenuEsc);
  }, 0);
}
async function reassignTaskQuick(t) {
  const picked = await openMultiAssigneePicker([t.assignee]);
  if (!picked || !picked.length) return;
  const newAssignee = picked.find(p => p !== t.assignee) || picked[0];
  if (newAssignee === t.assignee) { showToast('Өөр хариуцагч сонгоно уу', 'warn'); return; }
  const prev = t.assignee;
  t.assignee = newAssignee;
  t.updated = new Date().toISOString();
  logTaskActivity(t, 'reassigned', { from: prev, to: newAssignee });
  await saveTask(t);
  pushBroadcast(newAssignee, { kind: 'tasks', title: 'Шинэ даалгавар', body: t.title, url: './' });
  showToast(`Дахин оноосон: ${memberName(newAssignee)}`, 'success', 2500);
  render();
}
function changeDueQuick(t) {
  const input = document.createElement('input');
  input.type = 'date';
  input.value = t.due || '';
  input.style.cssText = 'position:fixed;left:-9999px;top:0;opacity:0;';
  document.body.appendChild(input);
  input.addEventListener('change', async () => {
    const v = input.value;
    input.remove();
    if (v === (t.due || '')) return;
    t.due = v;
    t.updated = new Date().toISOString();
    logTaskActivity(t, 'edited', { field: 'due', to: v });
    await saveTask(t);
    showToast(v ? `Хугацаа: ${fmtDate(v)}` : 'Хугацаа арилгалаа', 'success', 2000);
    render();
  }, { once: true });
  input.addEventListener('blur', () => setTimeout(() => input.remove(), 300), { once: true });
  if (input.showPicker) { try { input.showPicker(); } catch { input.click(); } }
  else input.click();
}
function renderCounts() {
  const today = todayStr();
  // Apply access control to base task list — non-CEO sees only own tasks
  const accessible = state.isCEO
    ? state.tasks
    : state.tasks.filter(t => t.assignee === state.me);
  // Branch filter disabled — бүх task ижилхэн тоологдоно.
  const branchTasks = accessible;
  // Helper — element байхгүй бол алгасах (cnt-all/overdue/today/done нь
  // sidebar-аас хасагдсан, зөвхөн filter pill-аар ажилладаг болсон).
  const setCount = (id, n) => { const el = document.getElementById(id); if (el) el.textContent = n; };
  setCount('cnt-all', branchTasks.filter(t => t.status !== 'done').length);
  setCount('cnt-mine', accessible.filter(t => t.assignee === state.me && t.status !== 'done').length);
  setCount('cnt-delegated', accessible.filter(t => t.createdBy === state.me && t.assignee !== state.me && t.status !== 'done').length);
  // Финансын хүсэлт нь state.financeRequests-ээс ирнэ (тусдаа Sheet)
  const executorId = getFinanceExecutorEmail();
  const myFinance = state.isCEO
    ? state.financeRequests
    : state.financeRequests.filter(r => r.requested_by === state.me ||
        (r.decision === 'approved' && r.status !== 'done' && (r.executor || executorId) === state.me));
  setCount('cnt-finance', myFinance.filter(r => r.status !== 'done' && r.status !== 'deleted').length);
  setCount('cnt-overdue', branchTasks.filter(t => t.status !== 'done' && t.due && t.due < today).length);
  setCount('cnt-today', branchTasks.filter(t => t.due === today).length);
  setCount('cnt-done', branchTasks.filter(t => t.status === 'done').length);
}
function escapeHtml(s) {
  // Defensive: Google Sheets sometimes returns numbers/booleans where we expected strings
  // (e.g. assignee "001" → 1). Coerce to string before replacing.
  return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}

/* -------------------- ACTIONS -------------------- */
/* Биелэлтийн зураг — олон зураг хавсаргах modal.
   opts.required=true (default false): хамгийн багадаа 1 зураг шаардана; Алгасах сонголт байхгүй.
   opts.required=false: 0 зураг бол ч Алгасах товчоор шууд дуусгана.
   Resolve: массив (URL-ууд эсвэл хоосон), null (Болих). */
function promptCompletionPhoto(task, opts = {}) {
  const required = !!opts.required;
  return new Promise((resolve) => {
    const modal = document.getElementById('completion-photos-modal');
    const titleEl = document.getElementById('cp-task-title');
    const listEl  = document.getElementById('cp-photos-list');
    const input   = document.getElementById('cp-photo-input');
    const status  = document.getElementById('cp-upload-status');
    const doneBtn = document.getElementById('cp-done');
    const cancelBtn = document.getElementById('cp-cancel');
    const photos = [];
    let settled = false;

    titleEl.innerHTML = `📋 ${escapeHtml(task.title || '(нэргүй даалгавар)')}${required ? ' · <span style="color:var(--danger);font-weight:600;">Зураг ЗААВАЛ</span>' : ' · <span style="color:var(--muted);">Зураг заавал биш</span>'}`;
    listEl.innerHTML = '';
    status.textContent = '';
    doneBtn.disabled = required; // заавал бол анхандаа disabled
    doneBtn.textContent = required ? 'Даалгавар дуусгах' : 'Зураггүй дуусгах';

    const renderList = () => {
      listEl.innerHTML = photos.map((p, i) =>
        `<div style="position:relative;aspect-ratio:1;border-radius:8px;overflow:hidden;border:1px solid var(--border);">
           <img src="${escapeHtml(driveThumbUrl(p, 400))}" loading="lazy" style="width:100%;height:100%;object-fit:cover;" />
           <button data-rm="${i}" type="button" style="position:absolute;top:2px;right:2px;width:22px;height:22px;border:none;border-radius:50%;background:rgba(0,0,0,.7);color:#fff;font-size:14px;cursor:pointer;line-height:1;">×</button>
         </div>`
      ).join('');
      listEl.querySelectorAll('[data-rm]').forEach(b => {
        b.onclick = () => { photos.splice(Number(b.dataset.rm), 1); renderList(); };
      });
      // required=true үед зураг хэрэг; required=false үед үргэлж enabled
      doneBtn.disabled = required ? (photos.length === 0) : false;
      if (photos.length > 0) doneBtn.textContent = `Даалгавар дуусгах (${photos.length} зураг)`;
      else doneBtn.textContent = required ? '⚠ Эхлээд зураг хавсаргана уу' : 'Зураггүй дуусгах';
    };

    const cleanup = () => {
      modal.classList.remove('open');
      input.value = '';
      input.onchange = null;
      doneBtn.onclick = null;
      cancelBtn.onclick = null;
    };
    const finish = (val) => { if (settled) return; settled = true; cleanup(); resolve(val); };

    input.onchange = async () => {
      const file = input.files && input.files[0];
      input.value = ''; // дараагийн нэмэх боломжтой болгох
      if (!file) return;
      status.textContent = '⏳ Илгээж байна...';
      try {
        const url = await uploadReceipt(file, task.id, 'completion', task.title);
        if (url) {
          photos.push(url);
          renderList();
          status.textContent = `✓ ${photos.length} зураг хадгалагдсан`;
        } else {
          status.textContent = '⚠ Зураг илгээгдсэнгүй';
        }
      } catch (e) {
        console.warn('completion upload err', e);
        status.textContent = '⚠ Алдаа: ' + (e?.message || '');
      }
    };

    cancelBtn.onclick = () => finish(null);
    doneBtn.onclick = () => finish(photos.slice());
    modal.classList.add('open');
  });
}

/* Permission матриц:
   - CEO: бүх зүйл засах + устгах
   - Үүсгэгч өөрөө: бүх зүйл засах + устгах
   - Үүсгэгчээс ДЭЭГҮҮР зэрэглэлтэй (managers over staff): бүх зүйл засах + устгах
   - Хариуцагч (assignee): зөвхөн ✓ status тэмдэглэх (гарчиг/тайлбар/огноо засахгүй)
   - Бусад: зөвхөн харах
*/
function canEditTask(t) {
  if (!t) return { all: false, status: false, none: true };
  if (state.isCEO) return { all: true, status: true, none: false };
  // Үүсгэгч нь өөрөө
  if (state.me && state.me === t.createdBy) return { all: true, status: true, none: false };
  const creator = findMember(t.createdBy);
  const creatorLevel = creator ? (creator.level || 0) : 100;
  const myLevel = state.myLevel || 0;
  // Үүсгэгчээс ДЭЭГҮҮР түвшинтэй
  if (myLevel > creatorLevel) return { all: true, status: true, none: false };
  // Хариуцагч — зөвхөн status солих
  if (state.me === t.assignee) return { all: false, status: true, none: false };
  // Бусад — зөвхөн харах
  return { all: false, status: false, none: true };
}

// Delete permission матриц:
//   CEO       → ok + permanent (бүрэн устгах эрхтэй)
//   Үүсгэгч өөрөө → ok; permanent зөвхөн "алдаа цонх" хангагдсан үед (24 цаг
//     дотор + ажиллаж эхлээгүй + comment байхгүй). Бусад тохиолдолд soft delete.
//   Дээд зэрэглэлтэй → ok + soft delete (бүрэн устгах эрх алга, аудит хадгална)
//   Бусад → ok=false
const MISTAKE_WINDOW_MS = 24 * 60 * 60 * 1000;
function canDeleteTask(t) {
  // Финансын хүсэлт нь нягтлан гүйцэтгэсэн (executed_at тогтоосон) бол хэн ч устгаж болохгүй —
  // CEO ч мөн адил. Дансны бүртгэлийн уялдааг хадгална.
  if ((t.kind === 'finance_request' || t._isFinance) && t.executed_at) {
    return { ok: false, reason: 'executed', creator: null };
  }
  if (state.isCEO) return { ok: true, permanent: true };
  const creator = findMember(t.createdBy);
  const creatorLevel = creator ? (creator.level || 0) : 100;
  const myLevel = state.myLevel || 0;
  if (creatorLevel > myLevel) return { ok: false, creator };
  // Үүсгэгч өөрөө — алдаа цонх (24 цаг + ажиллаж эхлээгүй) үед бүрэн устгана
  if (state.me && state.me === t.createdBy) {
    const createdMs = typeof t.created === 'number' ? t.created : new Date(t.created || 0).getTime();
    const inWindow = createdMs && (Date.now() - createdMs) < MISTAKE_WINDOW_MS;
    const noProgress = (t.status === 'open' || !t.status)
      && !t.started_at && !t.completed_at
      && !(Array.isArray(t.comments) && t.comments.length)
      && !(Array.isArray(t.completion_photos) && t.completion_photos.length);
    return { ok: true, permanent: !!(inWindow && noProgress) };
  }
  return { ok: true, permanent: false };
}
async function deleteTask(id) {
  const t = state.tasks.find(x=>x.id===id);
  if (!t) return;
  const check = canDeleteTask(t);
  if (!check.ok) {
    if (check.reason === 'executed') {
      showToast('Гүйлгээ хийгдсэн санхүүгийн хүсэлтийг устгах боломжгүй (аудит хадгална).', 'warn', 5000);
    } else {
      const who = check.creator ? `${check.creator.name} (${check.creator.role})` : 'дээд албан тушаалтан';
      showToast(`Энэ даалгаврыг ${who} үүсгэсэн тул устгах эрх танд алга. Биелүүлсэн бол ✓ тэмдэглээрэй.`, 'warn', 4500);
    }
    return;
  }
  const hardDelete = true;  // Архив хэрэггүй — даалгаврыг шууд бүрмөсөн устгана (дуусгаагүй ч).
  const label = 'Устгах';
  const explainer = 'Энэ даалгавар бүрмөсөн устгагдана. Сэргээх боломжгүй.';
  // 5-дамжлагат акт parent — sub-task-уудтай хамт устгана
  if (t.kind === 'act_parent') {
    const subs = state.tasks.filter(x => x.parent_id === t.id);
    if (!(await showConfirm(`"${t.title}" + ${subs.length} sub-task бүгдийг хамт устгана.\n\n${explainer}`, { okText: label, danger: true }))) return;
    const idsToRemove = new Set([t.id, ...subs.map(s => s.id)]);
    idsToRemove.forEach(markDeleted);
    state.tasks = state.tasks.filter(x => !idsToRemove.has(x.id));
    saveTask(t, true, hardDelete);
    subs.forEach(s => saveTask(s, true, hardDelete));
    render();
    showToast('Устгалаа', 'success', 1800);
    return;
  }
  if (!(await showConfirm(`${explainer}\n\nҮргэлжлүүлэх үү?`, { okText: label, danger: true }))) return;
  markDeleted(id);
  state.tasks = state.tasks.filter(x=>x.id!==id);
  saveTask(t, true, hardDelete);
  render();
  showToast('Устгалаа', 'success', 1800);
}

/* ─── Bulk action — олон task сонгож нэг дороос үйлдэл хийх ─── */
function ensureBulkState() {
  if (!state.bulkSelected) state.bulkSelected = new Set();
}
function bulkToggle(id) {
  ensureBulkState();
  if (state.bulkSelected.has(id)) state.bulkSelected.delete(id);
  else state.bulkSelected.add(id);
  bulkRefreshBar();
  // task мөрийн checkbox-ыг шинэчлэх
  const row = document.querySelector(`.task-row[data-task-id="${id}"]`);
  if (row) row.classList.toggle('bulk-selected', state.bulkSelected.has(id));
}
function bulkClear() {
  ensureBulkState();
  state.bulkSelected.clear();
  document.querySelectorAll('.task-row.bulk-selected').forEach(r => r.classList.remove('bulk-selected'));
  bulkRefreshBar();
}
function bulkRefreshBar() {
  ensureBulkState();
  const bar = document.getElementById('bulk-bar');
  const count = state.bulkSelected.size;
  if (!bar) return;
  bar.classList.toggle('open', count > 0);
  const numEl = document.getElementById('bulk-count-num');
  if (numEl) numEl.textContent = count;
  // Архив view-д "Сэргээх" товч харагдана, "Дуусгах" нуугдана. Бусад view-д эсрэг.
  const isArchive = state.view === 'archive';
  const doneBtn = document.getElementById('bulk-done');
  const restoreBtn = document.getElementById('bulk-restore');
  if (doneBtn) doneBtn.style.display = isArchive ? 'none' : '';
  if (restoreBtn) restoreBtn.style.display = isArchive ? '' : 'none';
}
// Bulk bar дотроо "✓ Сэргээгдлээ" гэсэн success cap-ыг 900мс харуулаад дараа нь
// нуудаг helper. Хэрэглэгч товч дарсан газартаа шууд хариу авна (toast доод
// талд гарах ч анзаарагдахгүй байж болзошгүйг нөхнө).
function flashBulkBarSuccess(text) {
  const bar = document.getElementById('bulk-bar');
  const count = document.querySelector('.bulk-count');
  const actions = document.querySelector('.bulk-actions');
  if (!bar || !count) return;
  const origCountHTML = count.innerHTML;
  const origActionsDisplay = actions ? actions.style.display : '';
  if (actions) actions.style.display = 'none';
  count.innerHTML = `<span style="display:inline-flex;align-items:center;gap:6px;color:#10b981;font-weight:600;"><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>${escapeHtml(text)}</span>`;
  return new Promise(resolve => setTimeout(() => {
    count.innerHTML = origCountHTML;
    if (actions) actions.style.display = origActionsDisplay;
    resolve();
  }, 900));
}

async function bulkApply(action) {
  ensureBulkState();
  const ids = [...state.bulkSelected];
  if (!ids.length) return;
  if (action === 'delete') {
    // Зөвшөөрөлгүй task-уудыг хасч, зөвхөн устгах эрхтэйг үлдээнэ.
    const allTargets = state.tasks.filter(t => state.bulkSelected.has(t.id));
    const allowed = allTargets.filter(t => canDeleteTask(t).ok);
    const blocked = allTargets.length - allowed.length;
    if (!allowed.length) {
      showToast(`Сонгосон ${allTargets.length} ажил бүгд устгах эрхээс гадуур (бусдын үүсгэсэн).`, 'warn', 4500);
      return;
    }
    const skipNote = blocked > 0 ? `\n\n⚠ ${blocked} ажил бусдын үүсгэсэн тул алгасагдана.` : '';
    const msg = `${allowed.length} ажлыг бүрмөсөн устгах уу? Сэргээх боломжгүй.${skipNote}`;
    if (!(await showConfirm(msg, { okText: 'Устгах', danger: true }))) return;
    const allowedIds = new Set(allowed.map(t => t.id));
    allowed.forEach(t => markDeleted(t.id));                 // refresh буцааж нэмэхгүй
    state.tasks = state.tasks.filter(t => !allowedIds.has(t.id));
    state.bulkSelected.clear();
    saveData();
    render();                                                // ШУУД жагсаалтаас арилгана
    showToast(`${allowed.length} ажил устгалаа`, 'success', 2500);
    allowed.forEach(t => saveTask(t, true, true));           // backend hard delete — фон дээр
    return;
  } else if (action === 'done') {
    const doneList = [];
    state.tasks.forEach(t => {
      if (state.bulkSelected.has(t.id)) {
        t.status = 'done';
        t.executed_at = new Date().toISOString();
        t.executed_by = state.me;
        doneList.push(t);
      }
    });
    await Promise.all(doneList.map(t => saveTask(t)));
    await flashBulkBarSuccess(`${ids.length} ажил дуусгалаа`);
    showToast(`${ids.length} ажил дуусгасан`, 'success');
  } else if (action === 'restore') {
    // Архивласан task-уудыг 'open' болгож буцаан идэвхжүүлнэ.
    const restored = [];
    state.tasks.forEach(t => {
      if (state.bulkSelected.has(t.id) && t.status === 'deleted') {
        t.status = 'open';
        t.updated = new Date().toISOString();
        restored.push(t);
      }
    });
    await Promise.all(restored.map(t => saveTask(t))); // upsert — Sheet 'Идэвхтэй' болно
    await flashBulkBarSuccess(`${restored.length} ажил сэргээгдлээ`);
    showToast(`${restored.length} ажил сэргээгдсэн`, 'success');
  }
  state.bulkSelected.clear();
  saveData();
  render();
}

function duplicateTask(id) {
  const orig = state.tasks.find(x => x.id === id);
  if (!orig) return;
  const dup = {
    ...orig,
    id: 'T' + Date.now(),
    title: orig.title + ' (хуулбар)',
    status: 'open',
    executed_at: null, executed_by: null,
    decision: undefined, decision_at: undefined, decision_by: undefined,
    comments: [], activity: [],
    created_at: new Date().toISOString(),
    createdBy: state.me,
  };
  state.tasks.unshift(dup);
  saveData();
  render();
  showToast('Хуулбарласан', 'success');
}

function openTaskModal(id) {
  const t = id ? state.tasks.find(x=>x.id===id) : null;
  state.editingId = id || null;

  // Permission check — existing task үед canEditTask тогтооно
  const realCanEdit = t ? canEditTask(t) : { all: true, status: true, none: false };
  // View mode: засах эрхтэй ч хадгалагдсан task-ыг эхэндээ read-only-аар нээнэ —
  // санамсаргүй өөрчлөлтөөс хамгаална. "Засах" товч дармагц edit mode-руу шилжинэ.
  // Шинэ task бол шууд edit mode.
  if (!t) state._taskViewMode = false;
  else if (state._taskViewMode == null) state._taskViewMode = realCanEdit.all;
  const inViewMode = !!(t && realCanEdit.all && state._taskViewMode);
  // Дууссан даалгавар — БҮХ хэрэглэгчид цэвэр read-only тойм. Засах/статус/footer товч
  // огт харагдахгүй (хэрэглэгч баталсан: дууссан ажил дээр ямар ч товч хэрэггүй).
  // Дээд буланд × товчоор хаана.
  const isDone = !!(t && t.status === 'done');
  let canEdit = inViewMode ? { all: false, status: realCanEdit.status, none: false } : realCanEdit;
  if (isDone) canEdit = { all: false, status: false, none: true };
  state._modalCanEdit = canEdit;

  // Header текст
  const modalTitleEl = document.getElementById('task-modal-title');
  if (!t) {
    modalTitleEl.textContent = 'Шинэ даалгавар';
  } else if (isDone) {
    modalTitleEl.innerHTML = '<span style="font-size:13px;font-weight:700;background:#dcfce7;color:#15803d;padding:3px 12px;border-radius:999px;vertical-align:middle;">✓ Дууссан даалгавар</span>';
  } else if (inViewMode) {
    modalTitleEl.textContent = 'Даалгавар';
  } else if (realCanEdit.all) {
    modalTitleEl.textContent = 'Даалгавар засах';
  } else if (realCanEdit.status) {
    modalTitleEl.innerHTML = '📋 Танд оноосон даалгавар <span style="font-size:11px;font-weight:600;background:var(--accent-blue,#4f46e5);color:#fff;padding:2px 8px;border-radius:999px;vertical-align:middle;margin-left:6px;">ХАРИУЦАГЧ</span>';
  } else {
    modalTitleEl.textContent = 'Даалгавар';
  }

  // Creator info — only shown when editing an existing task
  const creatorInfo = document.getElementById('t-creator-info');
  if (t && t.createdBy) {
    const creator = memberName(t.createdBy);
    const assignee = memberName(t.assignee);
    const createdAt = t.created ? new Date(t.created).toLocaleString('mn-MN', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '';
    let info = `📋 <strong>${escapeHtml(creator)}</strong> → <strong>${escapeHtml(assignee)}</strong>` +
      (createdAt ? ` · ${escapeHtml(createdAt)}` : '');
    if (!canEdit.all && canEdit.status) {
      info += `<br><span style="color:var(--warn);font-weight:600;">⚠ Та зөвхөн ✓ тэмдэглэх эрхтэй. Гарчиг, тайлбар засах боломжгүй.</span>`;
    } else if (canEdit.none) {
      info += `<br><span style="color:var(--danger);font-weight:600;">🔒 Танд засах эрхгүй (зөвхөн харах).</span>`;
    }
    // Биелэлтийн зураг(ууд) — дууссан даалгаврын баталгаа
    const photos = Array.isArray(t.completion_photos) ? t.completion_photos
                  : (t.completion_photo_url ? [t.completion_photo_url] : []);
    if (t.status === 'done' && photos.length) {
      info += `<div style="margin-top:10px;padding-top:10px;border-top:1px solid var(--border);">
        <div style="font-size:11px;color:var(--muted);margin-bottom:6px;">✅ Биелэлтийн зураг (${photos.length})</div>
        <div style="display:flex;flex-wrap:wrap;gap:6px;">${imageThumbsHtml(photos, { size: 92, label: 'Биелэлт' })}</div>
      </div>`;
    }
    // Үүсгэх үед хавсаргасан зураг(ууд) — дарвал аппын дотор томроно
    const attachImgs = Array.isArray(t.task_images) ? t.task_images : [];
    if (attachImgs.length) {
      info += `<div style="margin-top:10px;padding-top:10px;border-top:1px solid var(--border);">
        <div style="font-size:11px;color:var(--muted);margin-bottom:6px;">🖼 Хавсаргасан зураг (${attachImgs.length})</div>
        <div style="display:flex;flex-wrap:wrap;gap:6px;">${imageThumbsHtml(attachImgs, { size: 92, label: 'Зураг' })}</div>
      </div>`;
    }
    // ⭐ Ажлын чанар — зөвхөн даалгавар өгөгч (эсвэл CEO) дуусгасан ажлыг үнэлнэ.
    // Үнэлгээ task.kpi_code баганд хадгалагдана (Sheet "KPI код", backend засваргүй).
    const canRateQuality = t.status === 'done' && (state.me === t.createdBy || state.isCEO);
    if (canRateQuality) {
      const qVal = Number(t.kpi_code) || 0;
      info += `<div id="t-quality-block" style="margin-top:10px;padding-top:10px;border-top:1px solid var(--border);">
        <div style="font-size:11px;color:var(--muted);margin-bottom:6px;">⭐ Ажлын чанар — таны үнэлгээ (гүйцэтгэлийн оноонд 40% жинтэй)</div>
        <div class="q-stars" style="display:flex;gap:6px;font-size:26px;line-height:1;cursor:pointer;">${[1,2,3,4,5].map(n => `<span class="q-star" data-q="${n}" style="color:${qVal >= n ? '#f59e0b' : 'var(--border)'};">★</span>`).join('')}</div>
      </div>`;
    }
    creatorInfo.innerHTML = info;
    creatorInfo.style.display = 'block';
    const qStars = creatorInfo.querySelector('.q-stars');
    if (qStars) qStars.querySelectorAll('.q-star').forEach(s => s.onclick = () => saveTaskQuality(t.id, Number(s.dataset.q)));
  } else {
    creatorInfo.style.display = 'none';
  }
  document.getElementById('t-title').value = t?.title || '';
  document.getElementById('t-desc').value = t?.desc || '';
  // Branch — when editing keep its branch; for new tasks default to currently-viewed branch.
  // The branch select drives which projects + assignees are shown.
  const taskBranchVal = t ? taskBranch(t) : state.branch;
  fillBranchSelectInModal('t-branch', taskBranchVal);
  fillProjectSelect('t-project', t?.project, taskBranchVal);
  fillAssigneeSelect('t-assignee', t?.assignee || state.me, taskBranchVal);
  // Multi-assignee state reset
  state._multiAssignees = null;
  refreshMultiAssigneeChips([]);
  // "Олон хүнд оноох" товч — modal-аас сонгож аваад chips болгож харуулах
  const multiBtn = document.getElementById('t-assignee-multi');
  if (multiBtn) {
    multiBtn.style.display = state.editingId ? 'none' : ''; // зөвхөн шинэ task үед
    multiBtn.onclick = async () => {
      const cur = state._multiAssignees || (document.getElementById('t-assignee').value ? [document.getElementById('t-assignee').value] : []);
      const picked = await openMultiAssigneePicker(cur);
      if (!picked) return;
      if (picked.length === 0) {
        state._multiAssignees = null;
        refreshMultiAssigneeChips([]);
      } else {
        state._multiAssignees = picked;
        refreshMultiAssigneeChips(picked);
      }
    };
  }
  document.getElementById('t-due').value = t?.due || '';
  document.getElementById('t-priority').value = t?.priority || 'none';
  const recEl = document.getElementById('t-recurrence');
  if (recEl) recEl.value = t?.recurrence || '';
  const reqPhotoEl = document.getElementById('t-requires-photo');
  if (reqPhotoEl) reqPhotoEl.checked = !!t?.requires_photo;
  // Duplicate товч — зөвхөн existing task үед харагдана
  const dupBtn = document.getElementById('t-duplicate');
  if (dupBtn) {
    dupBtn.style.display = t ? '' : 'none';
    dupBtn.onclick = () => {
      duplicateTask(t.id);
      closeTaskModal();
    };
  }
  // Branch солих үед зөвхөн төслийн жагсаалт шинэчилнэ.
  // Хариуцагч нь бүх ажилтнаас сонгох тул дахин filter хийхгүй.
  document.getElementById('t-branch').onchange = (e) => {
    fillProjectSelect('t-project', null, e.target.value);
  };

  // Permission lock — canEdit.all биш бол бүх form-ийг НУУГААД read-only card харуулна
  const formFieldIds = ['t-title','t-desc','t-branch','t-project','t-assignee','t-due','t-priority','t-recurrence','t-requires-photo'];
  // Тус бүрийн label-г label.previousLabel ашиглан олж нуух — DOM-д label > input дараалал
  const formLabelTexts = {
    't-title': 'Гарчиг *', 't-desc': 'Тайлбар',
    't-branch': 'Аль салбарт хамаарах вэ?',
    't-project': 'Төсөл', 't-assignee': 'Хариуцагч',
    't-due': 'Эцсийн хугацаа', 't-priority': 'Зэрэглэл',
    't-recurrence': 'Давтамж',
  };
  formFieldIds.forEach(iid => {
    const el = document.getElementById(iid);
    if (!el) return;
    if (canEdit.all) {
      el.style.display = '';
      el.removeAttribute('readonly');
      el.removeAttribute('disabled');
      el.style.opacity = '';
      el.style.background = '';
      el.style.cursor = '';
    } else {
      // Хариуцагчийн харагдац — бүх засварлах талбарыг нуух
      el.style.display = 'none';
    }
  });
  // Form-ийн label-уудыг нуух (хариуцагч үед)
  document.querySelectorAll('#task-modal .modal > label').forEach(lb => {
    if (canEdit.all) { lb.style.display = ''; return; }
    const txt = lb.textContent.trim();
    // Гарчиг/Тайлбар/Хариуцагч гэх мэт form label-уудыг нуух (бусдыг үлдээх)
    if (Object.values(formLabelTexts).some(t => txt.startsWith(t.replace(' *','')))) {
      lb.style.display = 'none';
    }
  });
  // requires_photo checkbox label + хажуух тайлбар хоёрыг нуух
  const reqPhotoLabel = document.getElementById('t-requires-photo-label');
  const reqPhotoHint  = document.getElementById('t-requires-photo-hint');
  if (reqPhotoLabel) reqPhotoLabel.style.display = canEdit.all ? '' : 'none';
  if (reqPhotoHint)  reqPhotoHint.style.display  = canEdit.all ? '' : 'none';
  // assignee picker wrapper нуух
  const asgnWrap = document.querySelector('#task-modal .assignee-picker-wrap');
  if (asgnWrap) asgnWrap.style.display = canEdit.all ? '' : 'none';
  const multiBtnEl = document.getElementById('t-assignee-multi');
  if (multiBtnEl) multiBtnEl.style.display = canEdit.all ? '' : 'none';
  // Зураг хавсаргах picker — зөвхөн засах/үүсгэх эрхтэй үед. Хариуцагч уншмаар горимд
  // зургууд дээрх creatorInfo card дотор томруулж харагдана.
  setupTaskImagePicker(t, canEdit.all);
  const saveBtn = document.getElementById('t-save');
  if (saveBtn) {
    // View mode → "Засах" товч. Edit mode → "Хадгалах". Зөвхөн харах / дууссан үед нуух.
    if (isDone) {
      saveBtn.style.display = 'none';
    } else if (inViewMode) {
      saveBtn.style.display = '';
      saveBtn.textContent = '✎ Засах';
      saveBtn.onclick = () => { state._taskViewMode = false; openTaskModal(t.id); };
    } else if (canEdit.all) {
      saveBtn.style.display = '';
      saveBtn.textContent = 'Хадгалах';
      saveBtn.onclick = () => withBusy(saveBtn, saveTaskFromModal, { successText: 'Хадгалагдлаа' });
    } else {
      saveBtn.style.display = 'none';
    }
  }
  const dupBtnEl = document.getElementById('t-duplicate');
  if (dupBtnEl) dupBtnEl.style.display = (realCanEdit.all && !inViewMode && !isDone) ? '' : 'none';
  // Дууссан үед "Болих" footer товчийг нуух — × товчоор хаана (товчгүй цэвэр тойм)
  const cancelBtn = document.getElementById('t-cancel');
  if (cancelBtn) cancelBtn.style.display = isDone ? 'none' : '';

  // ─── Хариуцагчийн уншмаар card (бүх мэдээлэл нэг дор) ───
  let readOnlyCard = document.getElementById('t-readonly-card');
  if (!readOnlyCard) {
    readOnlyCard = document.createElement('div');
    readOnlyCard.id = 't-readonly-card';
    const modalEl = document.querySelector('#task-modal .modal');
    const statusBarEl = document.getElementById('t-status-bar');
    if (modalEl && statusBarEl) modalEl.insertBefore(readOnlyCard, statusBarEl);
  }
  if (t && !canEdit.all) {
    const branchLabel = ({'m-event':'M Event','camp':'NOMAAD Camp','shared':'Нэгдсэн','production':'Бэлтгэл'})[t.branch] || t.branch || '';
    const priorityLabel = t._isFinance
      ? ({'low':'Чөлөөтэй','med':'Энгийн','high':'Чухал'})[t.priority] || ''
      : ({'low':'Чөлөөтэй','med':'Энгийн','high':'Яаралтай'})[t.priority] || '';
    const priorityColor = ({'low':'#10b981','med':'#f59e0b','high':'#ef4444'})[t.priority] || 'var(--muted)';
    readOnlyCard.style.display = '';
    readOnlyCard.innerHTML = `
      <div style="background:var(--panel);border:1px solid var(--border);border-radius:10px;padding:16px;margin-bottom:14px;">
        <div style="font-size:18px;font-weight:700;color:var(--text);margin-bottom:6px;">${escapeHtml(t.title || '')}</div>
        ${t.desc ? `<div style="font-size:14px;color:var(--muted);margin-bottom:12px;line-height:1.5;white-space:pre-wrap;">${escapeHtml(t.desc)}</div>` : ''}
        <div style="display:grid;grid-template-columns:90px 1fr;gap:6px 12px;font-size:13px;">
          ${isDone ? `<div style="color:var(--muted);">Төлөв</div><div style="color:#15803d;font-weight:700;">✓ Дууссан</div>` : ''}
          ${branchLabel ? `<div style="color:var(--muted);">Салбар</div><div>${escapeHtml(branchLabel)}</div>` : ''}
          ${t.project ? `<div style="color:var(--muted);">Төсөл</div><div>${escapeHtml(t.project)}</div>` : ''}
          ${t.due ? `<div style="color:var(--muted);">Хугацаа</div><div style="font-weight:600;${(t.status !== 'done' && t.due < todayStr()) ? 'color:var(--danger);' : ''}">${escapeHtml(fmtDate(t.due))}${(t.status !== 'done' && t.due < todayStr()) ? ' · хоцорсон' : ''}</div>` : ''}
          ${priorityLabel ? `<div style="color:var(--muted);">Зэрэглэл</div><div style="color:${priorityColor};font-weight:600;">${escapeHtml(priorityLabel)}</div>` : ''}
        </div>
        ${t.requires_photo && t.status !== 'done' ? `
          <div style="margin-top:12px;padding:10px 12px;background:linear-gradient(135deg,#dbeafe,#ede9fe);border-left:3px solid #4f46e5;border-radius:6px;color:#3730a3;font-weight:600;font-size:13px;">
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="#dc2626" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-2px;margin-right:6px;"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg>Энэ даалгаврыг дуусгахдаа биелэлтийн зураг хавсаргах ёстой
          </div>` : ''}
      </div>
    `;
  } else {
    readOnlyCard.style.display = 'none';
    readOnlyCard.innerHTML = '';
  }

  // ─── СТАТУС ТОВЧНУУД + ҮЙЛДЛИЙН ТҮҮХ — зөвхөн хадгалагдсан task үед ───
  const statusBar = document.getElementById('t-status-bar');
  const activitySection = document.getElementById('t-activity-section');
  if (t) {
    // Дууссан үед статус/action товчнуудыг огт харуулахгүй (товчгүй цэвэр тойм).
    if (isDone) {
      if (statusBar) statusBar.style.display = 'none';
    } else {
      renderTaskActionButtons(t);
      if (statusBar) statusBar.style.display = '';
    }
    if (activitySection) {
      activitySection.style.display = '';
      renderTaskActivity(t);
    }
  } else {
    if (statusBar) statusBar.style.display = 'none';
    if (activitySection) activitySection.style.display = 'none';
  }

  // ─── Шинэ даалгаврын хадгалаагүй ноорог сэргээх (хальт хаагдвал алдагдахгүй) ───
  if (!t) restoreTaskDraft();

  document.getElementById('task-modal').classList.add('open');
  if (canEdit.all && !t) setTimeout(()=>document.getElementById('t-title').focus(), 50);
}

/* ─── Шинэ даалгаврын ноорог — localStorage-д түр хадгалж, хальт хаагдвал сэргээнэ.
   Зөвхөн ШИНЭ үүсгэх үед. Амжилттай хадгалмагц цэвэрлэгдэнэ. */
function saveTaskDraft() {
  if (state.editingId) return; // зөвхөн шинэ
  const modal = document.getElementById('task-modal');
  if (!modal || !modal.classList.contains('open')) return;
  const g = id => document.getElementById(id);
  const draft = {
    title: g('t-title')?.value || '',
    desc: g('t-desc')?.value || '',
    branch: g('t-branch')?.value || '',
    project: g('t-project')?.value || '',
    assignee: g('t-assignee')?.value || '',
    due: g('t-due')?.value || '',
    priority: g('t-priority')?.value || '',
    recurrence: g('t-recurrence')?.value || '',
    requires_photo: !!g('t-requires-photo')?.checked,
    images: (state._taskImages || []).slice(),
  };
  // Утга оруулсан үед л хадгална (хоосон форм ноорог болохгүй)
  if (!(draft.title || draft.desc || draft.due || draft.images.length)) { clearTaskDraft(); return; }
  try { localStorage.setItem('taskDraft', JSON.stringify(draft)); } catch (e) {}
}
function clearTaskDraft() { try { localStorage.removeItem('taskDraft'); } catch (e) {} }
function restoreTaskDraft() {
  let draft = null;
  try { draft = JSON.parse(localStorage.getItem('taskDraft') || 'null'); } catch (e) {}
  if (!draft || !(draft.title || draft.desc || draft.due || (draft.images && draft.images.length))) return;
  const g = id => document.getElementById(id);
  if (g('t-title')) g('t-title').value = draft.title || '';
  if (g('t-desc')) g('t-desc').value = draft.desc || '';
  if (draft.branch && g('t-branch')) { g('t-branch').value = draft.branch; fillProjectSelect('t-project', draft.project, draft.branch); }
  if (draft.project && g('t-project')) g('t-project').value = draft.project;
  if (draft.assignee && g('t-assignee')) g('t-assignee').value = draft.assignee;
  if (g('t-due')) g('t-due').value = draft.due || '';
  if (draft.priority && g('t-priority')) g('t-priority').value = draft.priority;
  if (draft.recurrence && g('t-recurrence')) g('t-recurrence').value = draft.recurrence;
  if (g('t-requires-photo')) g('t-requires-photo').checked = !!draft.requires_photo;
  if (Array.isArray(draft.images) && draft.images.length) { state._taskImages = draft.images.slice(); renderTaskImagePreview(); }
  showToast('Хадгалаагүй ноорог сэргээгдлээ', 'info', 2500);
}

/* ─── Даалгаврын зураг хавсралт (үүсгэх/засах) ───
   state._taskImages — тухайн нээлттэй modal-ийн temp зургийн URL массив.
   Файл сонгомогц шууд uploadReceipt-ээр Drive рүү хуулж, URL-г массивт нэмнэ.
   Хадгалахад saveTaskFromModal энэ массивыг task.task_images болгож бичнэ. */
function renderTaskImagePreview() {
  const wrap = document.getElementById('t-image-preview');
  if (!wrap) return;
  const imgs = state._taskImages || [];
  if (!imgs.length) { wrap.innerHTML = ''; return; }
  wrap.innerHTML = imgs.map((u, i) => `
    <div style="position:relative;">
      ${imageThumbsHtml([u], { size: 84, label: 'Зураг' })}
      <button type="button" data-task-img-rm="${i}" title="Хасах" style="position:absolute;top:-6px;right:-6px;width:20px;height:20px;border-radius:50%;background:var(--danger);color:#fff;border:2px solid var(--panel);cursor:pointer;font-size:13px;line-height:1;padding:0;display:flex;align-items:center;justify-content:center;">×</button>
    </div>`).join('');
  wrap.querySelectorAll('[data-task-img-rm]').forEach(btn => {
    btn.onclick = () => {
      const idx = Number(btn.dataset.taskImgRm);
      (state._taskImages || []).splice(idx, 1);
      renderTaskImagePreview();
      saveTaskDraft();
    };
  });
}
function setupTaskImagePicker(t, editable) {
  state._taskImages = Array.isArray(t?.task_images) ? t.task_images.slice() : [];
  const row = document.getElementById('t-image-row');
  const label = document.getElementById('t-image-label');
  const preview = document.getElementById('t-image-preview');
  if (row) row.style.display = editable ? 'flex' : 'none';
  if (label) label.style.display = editable ? '' : 'none';
  if (preview) preview.style.display = editable ? 'flex' : 'none';
  if (!editable) return;
  renderTaskImagePreview();
  const input = document.getElementById('t-image-input');
  if (!input) return;
  input.value = '';
  input.onchange = async () => {
    const files = Array.from(input.files || []);
    if (!files.length) return;
    const note = document.getElementById('t-image-uploading');
    if (note) note.style.display = '';
    const reqId = state.editingId || ('t_new_' + Date.now().toString(36));
    const title = document.getElementById('t-title')?.value || '';
    for (const f of files) {
      const url = await uploadReceipt(f, reqId, 'task', title);
      if (url) { (state._taskImages = state._taskImages || []).push(url); renderTaskImagePreview(); saveTaskDraft(); }
    }
    if (note) note.style.display = 'none';
    input.value = '';
  };
}

/* ─── Task modal: Action товчнууд (статус өөрчлөх + татгалзах + тодруулга) ─── */
function renderTaskActionButtons(t) {
  const bar = document.getElementById('t-action-buttons');
  const isAssignee = (state.me === t.assignee);
  const status     = t.status || 'open';
  // Status өөрчлөх товчнууд — ЗӨВХӨН хариуцагчид зориулсан. CEO/үүсгэгч өөрөө хариуцагч
  // биш бол харагдахгүй (өөрийн бусдад өгсөн ажил дээр Start/Done/Decline дарж хариуцагчийн
  // өмнөөс шийдэх нь буруу). CEO task field-уудыг (нэр, due, assignee) modal-аас засна.
  // Тусгай override хэрэгтэй болвол admin товч дараа нэмж болно.
  const canAct = isAssignee;

  const btns = [];
  // Эхлүүлэх — open эсвэл declined
  if (canAct && (status === 'open' || status === 'declined')) {
    btns.push(`<button class="btn btn-action" data-action="start">Эхлүүлэх</button>`);
  }
  // Дуусгах
  if (canAct && status !== 'done' && status !== 'declined') {
    btns.push(`<button class="btn btn-action" data-action="done">Дуусгасан</button>`);
  }
  // Дахин нээх
  if (canAct && status === 'done') {
    btns.push(`<button class="btn btn-action" data-action="reopen">Дахин нээх</button>`);
  }
  // Татгалзах
  if (canAct && (status === 'open' || status === 'in_progress')) {
    btns.push(`<button class="btn btn-action" data-action="decline">Татгалзах</button>`);
  }
  // (Зураг хавсаргах тусдаа товч хасагдсан — "Дуусгасан" дарахад promptCompletionPhoto
  //  автомат гарч ирнэ.)
  // Дамжуулах — менежер ба түүнээс дээш зэрэглэлтэй хариуцагч өөрийн харьяа ажилтанд
  // хариуцлагыг шилжүүлж болно. CEO зөвшөөрөл шаардахгүй (хурдан үйл ажиллагаа), гэхдээ
  // activity log + push мэдэгдэлээр транспэрэнт байна.
  if (canAct && (state.myLevel || 0) >= 60 && status !== 'done' && status !== 'declined') {
    btns.push(`<button class="btn btn-action" data-action="delegate">↪ Дамжуулах</button>`);
  }
  // Төлвийн badge — CSS class-аар стиль, inline арилгасан
  const statusLabels = {
    open:        { text: 'Шинэ',          cls: 'open' },
    in_progress: { text: 'Хийгдэж байна', cls: 'in_progress' },
    done:        { text: 'Дууссан',       cls: 'done' },
    declined:    { text: 'Татгалзсан',    cls: 'declined' },
  };
  const sl = statusLabels[status] || statusLabels.open;
  let html = `<span class="status-badge status-${sl.cls}">${sl.text}</span>`;
  if (status === 'declined' && t.decline_reason) {
    html += `<div style="width:100%;margin-top:6px;padding:8px;background:var(--danger-soft);color:var(--danger);border-radius:6px;font-size:12px;">Шалтгаан: ${escapeHtml(t.decline_reason)}</div>`;
  }
  html += btns.join('');
  bar.innerHTML = html;
  // Listeners
  bar.querySelectorAll('button[data-action]').forEach(btn => {
    btn.onclick = async (e) => {
      const action = e.currentTarget.dataset.action;
      await handleTaskAction(t.id, action);
    };
  });
}

async function handleTaskAction(taskId, action) {
  const t = state.tasks.find(x => x.id === taskId);
  if (!t) return;
  if (action === 'start') {
    await changeTaskStatus(taskId, 'in_progress');
    showToast('Ажил эхэлсэн', 'success');
  } else if (action === 'done') {
    await changeTaskStatus(taskId, 'done');
  } else if (action === 'reopen') {
    await changeTaskStatus(taskId, 'open');
    showToast('Дахин нээгдсэн', 'warn');
  } else if (action === 'decline') {
    const reason = await showPrompt('Яагаад татгалзаж байна вэ? (заавал)', { placeholder: 'Шалтгаан...', okText: 'Татгалзах' });
    if (!reason || !reason.trim()) { showToast('Шалтгаан шаардлагатай', 'warn'); return; }
    await changeTaskStatus(taskId, 'declined', reason.trim());
    showToast('Татгалзсан. Үүсгэгчид мэдэгдэв.', 'warn');
  } else if (action === 'delegate') {
    const picked = await openMultiAssigneePicker([t.assignee]);
    if (!picked || !picked.length) return;
    // Зөвхөн нэг хүн сонгох — олон бол эхнийхийг авна (Шинэ task үүсгэхдээ олныг хувиарлах өөр урсгал)
    const newAssignee = picked.find(p => p !== t.assignee) || picked[0];
    if (newAssignee === t.assignee) { showToast('Өөр хариуцагч сонгоно уу', 'warn'); return; }
    const prev = t.assignee;
    t.assignee = newAssignee;
    t.updated = new Date().toISOString();
    logTaskActivity(t, 'reassigned', { from: prev, to: newAssignee });
    await saveTask(t);
    pushBroadcast(newAssignee, { kind: 'tasks', title: 'Шинэ даалгавар', body: t.title, url: './' });
    showToast(`Дамжуулсан: ${memberName(newAssignee)}`, 'success', 2500);
    closeTaskModal();
    render();
    return;
  }
  // Modal-ыг шинэчлэх (action товчнууд + activity)
  renderTaskActionButtons(t);
  renderTaskActivity(t);
  render();
}

/* ─── Task modal: Үйлдлийн түүх (Activity log) ─── */
function renderTaskActivity(t) {
  const list = document.getElementById('t-activity-list');
  const countEl = document.getElementById('t-activity-count');
  const activity = t.activity || [];
  countEl.textContent = activity.length;
  if (!activity.length) {
    list.innerHTML = '<div style="color:var(--muted);font-style:italic;">Түүх алга</div>';
    return;
  }
  const actionLabels = {
    created: 'Үүсгэсэн',
    status_changed: 'Төлвийг солисон',
    comment_added: 'Сэтгэгдэл нэмсэн',
    declined: 'Татгалзсан',
    reassigned: 'Хариуцагчийг өөрчилсөн',
    edited: 'Засварласан',
    clarification_requested: 'Тодруулга асуусан',
  };
  const statusNames = { open: 'Шинэ', in_progress: 'Хийгдэж байна', done: 'Дууссан', declined: 'Татгалзсан' };
  // Vertical timeline маяг — actor avatar + dot + line connector + content
  const actionColors = {
    created: 'var(--accent-blue)',
    status_changed: 'var(--accent-amber)',
    comment_added: 'var(--accent-purple)',
    declined: 'var(--accent-red)',
    reassigned: 'var(--accent-blue)',
    edited: 'var(--muted)',
    clarification_requested: 'var(--accent-amber)',
  };
  list.innerHTML = `<div class="timeline">` + activity.slice().reverse().map((a, idx) => {
    const who = memberName(a.actor);
    const initials = memberInitials(a.actor);
    const when = new Date(a.timestamp).toLocaleString('mn-MN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    const color = actionColors[a.action] || 'var(--muted)';
    let detail = '';
    if (a.action === 'status_changed' && a.details) {
      const from = statusNames[a.details.from] || a.details.from;
      const to = statusNames[a.details.to] || a.details.to;
      detail = `<span class="timeline-detail">${escapeHtml(from)} → ${escapeHtml(to)}</span>`;
      if (a.details.reason) detail += `<div class="timeline-reason">${escapeHtml(a.details.reason)}</div>`;
    }
    return `
      <div class="timeline-item">
        <div class="timeline-dot" style="background:${color};"></div>
        <div class="timeline-content">
          <div class="timeline-head">
            <span class="timeline-avatar">${escapeHtml(initials)}</span>
            <span class="timeline-who">${escapeHtml(who)}</span>
            <span class="timeline-action">${escapeHtml(actionLabels[a.action] || a.action)}</span>
          </div>
          ${detail}
          <div class="timeline-time">${escapeHtml(when)}</div>
        </div>
      </div>
    `;
  }).join('') + `</div>`;
}
function closeTaskModal() {
  document.getElementById('task-modal').classList.remove('open');
  state.editingId = null;
  state._taskViewMode = null; // дараагийн нээхэд анхдагч view mode-аар эхэлнэ
}
async function saveTaskFromModal() {
  const title = document.getElementById('t-title').value.trim();
  if (!title) { showToast('Гарчиг шаардлагатай', 'warn'); return; }
  const multi = state._multiAssignees || [];
  const baseData = {
    title,
    desc: document.getElementById('t-desc').value.trim(),
    branch: document.getElementById('t-branch').value || state.branch,
    project: document.getElementById('t-project')?.value || '',
    due: document.getElementById('t-due').value || '',
    priority: document.getElementById('t-priority').value,
    recurrence: document.getElementById('t-recurrence')?.value || '',
    requires_photo: !!document.getElementById('t-requires-photo')?.checked,
    task_images: (state._taskImages || []).slice(),
  };
  // Multi-assignee — олон хүнд тус тусын task үүсгэх. saveTask-уудыг ДАРААЛУУЛНА.
  // Параллел fire хийвэл Google Sheets concurrent appendOrUpdate race condition үүсч
  // зөвхөн сүүлийн write үлдэж бусад нь дарагддаг (2026-05-26 олдсон bug).
  if (!state.editingId && multi.length > 1) {
    const groupId = 'g_' + Date.now().toString(36);
    const tasks = multi.map((asgn, i) => ({
      id: uid(),
      status: 'open',
      created: Date.now() + i,
      createdBy: state.me,
      comments: [],
      activity: [],
      ...baseData,
      assignee: asgn,
      group_id: groupId,
    }));
    // Local state + UI шуурхай шинэчилнэ
    tasks.forEach(t => { logTaskActivity(t, 'created', { title: t.title }); state.tasks.unshift(t); });
    closeTaskModal();
    render();
    // Sheet рүү тус бүрчлэн дараалуулан хадгална
    for (let i = 0; i < tasks.length; i++) {
      await saveTask(tasks[i]);
      pushBroadcast(tasks[i].assignee, { kind: 'tasks', title: 'Шинэ даалгавар', body: tasks[i].title, url: './' });
    }
    state._multiAssignees = null;
    state._taskImages = null;
    clearTaskDraft();
    // Хэрэглэгчийг тус тусын task-уудыг харах "Илгээсэн ажил" руу шилжүүлнэ
    const includesMe = multi.includes(state.me);
    const otherCount = includesMe ? multi.length - 1 : multi.length;
    showToast(`${multi.length} ажилтанд тус тусдаа даалгавар хадгалагдлаа`, 'success', 4000);
    if (otherCount > 0) {
      state.view = 'delegated';
      state._taskListLimit = null;
    }
    render();
    return;
  }
  // Ганц assignee
  const data = {
    ...baseData,
    assignee: multi.length === 1 ? multi[0] : document.getElementById('t-assignee').value,
  };
  let t;
  if (state.editingId) {
    t = state.tasks.find(x=>x.id===state.editingId);
    Object.assign(t, data);
    saveTask(t);
  } else {
    t = { id: uid(), status: 'open', created: Date.now(), createdBy: state.me, comments: [], activity: [], ...data };
    logTaskActivity(t, 'created', { title: t.title });
    state.tasks.unshift(t);
    saveTask(t);
    if (t.assignee) pushBroadcast(t.assignee, { kind: 'tasks', title: 'Шинэ даалгавар', body: t.title, url: './' });
  }
  state._multiAssignees = null;
  state._taskImages = null;
  clearTaskDraft();
  closeTaskModal();
  render();
}
async function addProject() {
  const name = await showPrompt('Шинэ төслийн нэр:', { title: 'Шинэ төсөл', okText: 'Нэмэх' });
  if (!name || !name.trim()) return;
  const id = 'p_' + Date.now().toString(36);
  // Single bucket — салбарын систем дотроос л үлдсэн тул "shared"-д хадгална
  if (!state.projectsByBranch['shared']) state.projectsByBranch['shared'] = [];
  state.projectsByBranch['shared'].push({ id, name: name.trim() });
  saveLocal();
  state.view = 'project:' + id;
  render();
}

/* -------------------- ТАЙЛАН EXPORT (CEO) --------------------
   Бүх даалгаврыг CSV болгон татах. UTF-8 BOM нэмсэн тул Excel дээр Монгол үсэг зөв нээгдэнэ.
   Долоо хоногийн тайлан/хяналтад зориулсан — хэн юу хариуцаж, юу хоцорсныг нэг дор харна. */
function csvCell(v) {
  const s = String(v == null ? '' : v);
  return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
}
function exportTasksReport() {
  const statusMn = { open: 'Шинэ', in_progress: 'Хийгдэж байна', done: 'Дууссан', declined: 'Татгалзсан' };
  const prioMn = { high: 'Яаралтай', med: 'Энгийн', low: 'Чөлөөтэй', none: '—' };
  const today = todayStr();
  const tasks = state.tasks.filter(t => t.status !== 'deleted');
  const rows = tasks.map(t => [
    t.title,
    memberName(t.assignee),
    memberName(t.createdBy),
    projectName(t.project),
    prioMn[t.priority] || '—',
    statusMn[t.status] || t.status || 'Шинэ',
    t.due || '',
    (t.status !== 'done' && t.due && t.due < today) ? 'Тийм' : '',
    t.created ? new Date(t.created).toLocaleDateString('mn-MN') : '',
  ].map(csvCell).join(','));
  const header = ['Гарчиг', 'Хариуцагч', 'Үүсгэгч', 'Төсөл', 'Зэрэглэл', 'Төлөв', 'Эцсийн огноо', 'Хоцорсон', 'Үүсгэсэн'].join(',');
  const csv = '﻿' + header + '\n' + rows.join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `Чимун-даалгавар-тайлан-${today}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  showToast(`${tasks.length} даалгаврын тайлан татагдлаа`, 'success');
}

/* -------------------- INIT -------------------- */
function fillSelect(id, items, value, placeholder) {
  const el = document.getElementById(id);
  el.innerHTML = '';
  if (placeholder) {
    const o = document.createElement('option');
    o.value = ''; o.textContent = placeholder;
    el.appendChild(o);
  }
  items.forEach(it => {
    const o = document.createElement('option');
    o.value = it.value; o.textContent = it.label;
    if (it.value === value) o.selected = true;
    el.appendChild(o);
  });
}
function fillProjectSelect(id, value, branchOverride) {
  // Төсөл талбар UI-аас хасагдсан — element байхгүй бол юу ч хийхгүй.
  if (!document.getElementById(id)) return;
  // Бүх төслийг (бүх салбараас) нэгтгэж харуулна — Чимун ХХК нэг компани.
  const projects = currentProjects();
  // "— Төсөлгүй —" сонголтыг эхэнд тавиж заавал биш болгох
  const options = [{ value: '', label: '— Төсөлгүй —' }, ...projects.map(p => ({ value: p.id, label: p.name }))];
  fillSelect(id, options, value != null ? value : '');
}
function fillAssigneeSelect(id, value, branchOverride) {
  // Салбар (M Event / NOMAAD Camp / Удирдлага) + Цагийн ажилтнаар бүлэглэж харуулна.
  const el = document.getElementById(id);
  if (!el) return;
  el.innerHTML = memberOptgroupsHtml(value, true);
  if (value) el.value = value;
}
function fillBranchSelectInModal(id, value) {
  // `<select><option>` нь HTML рендер хийдэггүй тул SVG icon-ыг хасч зөвхөн текст үлдээнэ.
  // Salbar нь зөвхөн статистикт хэрэглэгдэх label. Хүн ямар ч салбарт ажил хийж болно.
  const options = [
    { value: '', label: '— Сонгох (заавал биш) —' },
    ...BRANCHES.map(b => ({ value: b.id, label: b.name })),
  ];
  fillSelect(id, options, value != null ? value : '');
}

function initEvents() {
  document.querySelectorAll('.nav-item').forEach(el => {
    el.onclick = () => { state.view = el.dataset.view; state._taskListLimit = null; render(); };
  });
  document.querySelectorAll('.filter-pill').forEach(el => {
    el.onclick = () => {
      document.querySelectorAll('.filter-pill').forEach(x => x.classList.remove('active'));
      el.classList.add('active');
      state.statusFilter = el.dataset.status;
      render();
    };
  });
  const addProjBtn = document.getElementById('add-project');
  if (addProjBtn) addProjBtn.onclick = addProject;
  document.getElementById('new-task-btn').onclick = () => openTaskModal();
  document.getElementById('t-cancel').onclick = closeTaskModal;
  document.getElementById('t-save').onclick = () => withBusy(document.getElementById('t-save'), saveTaskFromModal, { successText: 'Хадгалагдлаа' });
  // Шинэ даалгаврын ноорог — талбар өөрчлөгдөх бүрд localStorage-д түр хадгална
  ['t-title','t-desc','t-branch','t-project','t-assignee','t-due','t-priority','t-recurrence','t-requires-photo'].forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    el.addEventListener('input', saveTaskDraft);
    el.addEventListener('change', saveTaskDraft);
  });

  // ─── Мобайл доод нав ───
  document.querySelectorAll('.mobile-nav-item[data-view]').forEach(btn => {
    btn.onclick = (e) => {
      const view = e.currentTarget.dataset.view;
      state.view = view;
      // Visible state
      document.querySelectorAll('.mobile-nav-item').forEach(x => x.classList.remove('active'));
      e.currentTarget.classList.add('active');
      // Sidebar dropdown синхрон болгох
      document.querySelectorAll('.nav-item').forEach(x => x.classList.remove('active'));
      document.querySelector(`.nav-item[data-view="${view}"]`)?.classList.add('active');
      render();
    };
  });
  // Mobile "Цэс" товч — сайдбарыг нээх
  document.getElementById('mobile-menu-more')?.addEventListener('click', () => {
    document.querySelector('.sidebar')?.classList.add('open');
    document.querySelector('.sidebar-backdrop')?.classList.add('open');
  });
  // FAB — sheet нээж 3 сонголт үзүүлнэ (Даалгавар / Санхүү / Захиалга).
  // Захиалга нь зөвхөн M Event-ийн ажилчин эсвэл CEO-д харагдана.
  // ─── Бүх modal-д close X товч + backdrop click handler нэмэх ───
  // Хэрэглэгч modal-аас гарахын тулд handle bar дээр slide хийх биш,
  // тодорхой "×" товч эсвэл арын дэвсгэр дээр товшиж гарах боломжтой.
  document.querySelectorAll('.modal-bg').forEach(bg => {
    const modal = bg.querySelector('.modal');
    if (!modal) return;
    // Close X товч нэмэх (хэрэв байхгүй бол)
    if (!modal.querySelector('.modal-close-x')) {
      const closeBtn = document.createElement('button');
      closeBtn.type = 'button';
      closeBtn.className = 'modal-close-x';
      closeBtn.setAttribute('aria-label', 'Хаах');
      closeBtn.innerHTML = '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>';
      closeBtn.addEventListener('click', () => bg.classList.remove('open'));
      modal.insertBefore(closeBtn, modal.firstChild);
    }
    // Backdrop click → modal хаах
    bg.addEventListener('click', (e) => {
      if (e.target === bg) bg.classList.remove('open');
    });
  });
  // ESC → бүх нээлттэй modal хаах
  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    document.querySelectorAll('.modal-bg.open').forEach(bg => bg.classList.remove('open'));
  });

  const fabSheetBg = document.getElementById('fab-sheet-bg');
  const fabSheetOrder = document.getElementById('fab-sheet-order');
  function openFabSheet() {
    // "Захиалга" үүсгэх сонголт — зөвхөн менежер (CEO / эвент-захиалгын менежер).
    // Бусад M Event хүн зүүн талын "Захиалга" view-ээс хараад статус л өөрчилнө.
    if (fabSheetOrder) fabSheetOrder.style.display = canManageOrders() ? '' : 'none';
    fabSheetBg?.classList.add('open');
  }
  function closeFabSheet() { fabSheetBg?.classList.remove('open'); }

  document.getElementById('fab-new')?.addEventListener('click', openFabSheet);
  document.getElementById('fab-sheet-cancel')?.addEventListener('click', closeFabSheet);
  fabSheetBg?.addEventListener('click', (e) => {
    if (e.target === fabSheetBg) closeFabSheet();
  });
  fabSheetBg?.querySelectorAll('.fab-sheet-item').forEach(btn => {
    btn.addEventListener('click', () => {
      const action = btn.dataset.action;
      closeFabSheet();
      // Sheet хаагдсаны дараа modal нээж жижиг хоцрогдол үүсгэж smooth transition
      setTimeout(() => {
        if (action === 'task') openTaskModal();
        else if (action === 'finance') openFinanceModal();
        else if (action === 'order') openNewMeventOrder();
      }, 180);
    });
  });
  // ESC-ээр хаах
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && fabSheetBg?.classList.contains('open')) closeFabSheet();
  });

  // ─── Onboarding tour — анх нэвтэрсэн хэрэглэгчид богино зааварчилгаа ───
  const OB_KEY = 'onboardingShown_v1';
  const obSteps = [
    {
      illus: ICONS.inbox,
      title: 'Тавтай морил!',
      text: 'Энэ апп таны өдөр тутмын ажил, санхүүгийн хүсэлт, тайлангуудыг нэг дороос удирдана.',
    },
    {
      illus: '<svg class="lcd-icon" viewBox="0 0 24 24" style="width:64px;height:64px;color:var(--accent-blue);"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>',
      title: 'Шинэ ажил үүсгэх',
      text: 'Доод буланд "+" товч дарна. Сонголтоос Даалгавар, Санхүүгийн хүсэлт эсвэл Захиалга үүсгэж болно.',
    },
    {
      illus: '<svg class="lcd-icon" viewBox="0 0 24 24" style="width:64px;height:64px;color:var(--accent-green);"><path d="M9 12h6m-3-3v6m9 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0z" stroke-linecap="round"/></svg>',
      title: 'Утсан дээр swipe',
      text: 'Ажил мөрөн дээр баруун шудалбал дуусгасан, зүүн шудалбал устгахаар тэмдэглэгдэнэ.',
    },
    {
      illus: '<svg class="lcd-icon" viewBox="0 0 24 24" style="width:64px;height:64px;color:var(--accent-purple);"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>',
      title: 'Хайлт, shortcut',
      text: 'Desktop дээр ⌘K дарж бүх шилжилт, командын меню. ? дарвал бүх shortcut жагсаалт нээгдэнэ.',
    },
  ];
  function showOnboardingStep(idx) {
    const step = obSteps[idx];
    if (!step) { closeOnboarding(); return; }
    document.getElementById('ob-illus').innerHTML = step.illus;
    document.getElementById('ob-title').textContent = step.title;
    document.getElementById('ob-text').textContent = step.text;
    document.querySelectorAll('.onboarding-dot').forEach((d, i) => d.classList.toggle('active', i === idx));
    document.getElementById('ob-prev').style.display = idx === 0 ? 'none' : '';
    document.getElementById('ob-next').textContent = (idx === obSteps.length - 1) ? 'Эхлүүлэх ✓' : 'Дараах →';
    state._obIdx = idx;
  }
  function closeOnboarding() {
    document.getElementById('onboarding-bg')?.classList.remove('open');
    localStorage.setItem(OB_KEY, '1');
  }
  // Анх удаа нэвтэрсэн бол tour эхлүүлэх
  if (!localStorage.getItem(OB_KEY) && state.user) {
    setTimeout(() => {
      document.getElementById('onboarding-bg')?.classList.add('open');
      showOnboardingStep(0);
    }, 600);
  }
  document.getElementById('ob-skip')?.addEventListener('click', closeOnboarding);
  document.getElementById('ob-prev')?.addEventListener('click', () => showOnboardingStep((state._obIdx || 0) - 1));
  document.getElementById('ob-next')?.addEventListener('click', () => {
    const next = (state._obIdx || 0) + 1;
    if (next >= obSteps.length) closeOnboarding();
    else showOnboardingStep(next);
  });

  // ─── Browser notification — local push мэдэгдэл ──────
  // PWA-д суулгасан үед browser-ээс үзүүлэх native notification.
  // Анх удаа task assign хийгдсэн үед permission асуунa.
  function requestNotifPermission() {
    if (!('Notification' in window)) return;
    if (Notification.permission === 'default') {
      Notification.requestPermission().then(p => {
        if (p === 'granted') showToast('Мэдэгдэл идэвхжсэн', 'success', 2000);
      });
    }
  }
  function pushNotify(title, body, opts = {}) {
    if (!('Notification' in window) || Notification.permission !== 'granted') return;
    if (document.hasFocus() && !opts.force) return; // апп нээлттэй үед toast хангалттай
    try {
      const n = new Notification(title, {
        body,
        icon: 'icon-192.png',
        badge: 'icon.svg',
        tag: opts.tag || 'chimun',
        silent: false,
        renotify: false,
      });
      if (opts.taskId) {
        n.onclick = () => {
          window.focus();
          openTaskModal(opts.taskId);
          n.close();
        };
      }
    } catch(e) { /* iOS may not support */ }
  }
  // First-run: subtle prompt button (Settings modal-д)
  // Шинэ task оноогдох үед автомат notification — generateNotifications-д hook нэмнэ.
  window._chimunNotify = pushNotify; // optional: expose for testing
  // Settings modal дотроос "Мэдэгдэл асуух" товчоор гар аргаар идэвхжүүлэх боломжтой
  const settingsBtn = document.getElementById('settings-btn');
  if (settingsBtn) {
    settingsBtn.addEventListener('click', () => {
      // Modal нээгдэхэд permission төлвийг харах
      setTimeout(() => {
        const advBlock = document.getElementById('s-advanced');
        if (!advBlock || advBlock.querySelector('.notif-perm-block')) return;
        const block = document.createElement('div');
        block.className = 'notif-perm-block';
        block.style.cssText = 'margin-top:16px;padding:12px;background:var(--panel-hover);border-radius:8px;';
        const perm = ('Notification' in window) ? Notification.permission : 'unsupported';
        const label = perm === 'granted' ? '✓ Мэдэгдэл идэвхжсэн'
          : perm === 'denied' ? '✗ Мэдэгдэл хориглосон (Browser-аас зөвшөөрөл)'
          : perm === 'unsupported' ? 'Browser дэмжихгүй'
          : 'Идэвхжүүлэх боломжтой';
        block.innerHTML = `
          <div style="font-size:13px;font-weight:600;margin-bottom:6px;">Push мэдэгдэл</div>
          <div style="font-size:12px;color:var(--muted);margin-bottom:8px;">${label}</div>
          ${perm === 'default' ? `<button type="button" id="s-enable-notif" class="btn btn-primary" style="font-size:13px;padding:8px 14px;">Идэвхжүүлэх</button>` : ''}
        `;
        advBlock.parentNode.insertBefore(block, advBlock);
        document.getElementById('s-enable-notif')?.addEventListener('click', requestNotifPermission);
      }, 50);
    });
  }

  // ─── Bulk action bar wiring ──────────────────────────
  document.getElementById('bulk-cancel')?.addEventListener('click', bulkClear);
  document.getElementById('bulk-done')?.addEventListener('click', (e) => withBusy(e.currentTarget, () => bulkApply('done'), { successText: 'Дуусгалаа' }));
  document.getElementById('bulk-restore')?.addEventListener('click', (e) => withBusy(e.currentTarget, () => bulkApply('restore'), { successText: 'Сэргээгдлээ' }));
  document.getElementById('bulk-delete')?.addEventListener('click', (e) => withBusy(e.currentTarget, () => bulkApply('delete'), { successText: 'Устгагдлаа' }));
  // Esc → bulk цуцлах
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && state.bulkSelected?.size > 0) bulkClear();
  });

  // ─── Pull-to-refresh (мобайл) ─────────────────────────
  // Дэлгэцийн дээд хэсэгт доош 80px+ татвал sync хийнэ.
  // Зөвхөн touch device-д, scrollTop === 0 байх үед идэвхжинэ.
  if ('ontouchstart' in window) (function setupPullToRefresh() {
    let startY = 0, currentY = 0, pulling = false;
    const TRIGGER = 80;
    // Refresh indicator DOM-д нэмэх
    const indicator = document.createElement('div');
    indicator.id = 'ptr-indicator';
    indicator.innerHTML = '<div class="ptr-spinner"></div>';
    document.body.appendChild(indicator);

    const main = document.querySelector('.main') || document.body;
    main.addEventListener('touchstart', (e) => {
      if (window.scrollY > 0) return;
      const el = main.scrollTop !== undefined ? main : document.scrollingElement;
      if (el && el.scrollTop > 0) return;
      startY = e.touches[0].clientY;
      pulling = true;
    }, { passive: true });
    main.addEventListener('touchmove', (e) => {
      if (!pulling) return;
      currentY = e.touches[0].clientY;
      const dy = currentY - startY;
      if (dy < 0) { pulling = false; indicator.style.transform = ''; return; }
      const pct = Math.min(dy / TRIGGER, 1.2);
      indicator.style.transform = `translateY(${Math.min(dy, TRIGGER + 20)}px)`;
      indicator.style.opacity = pct;
      indicator.classList.toggle('ready', dy > TRIGGER);
    }, { passive: true });
    main.addEventListener('touchend', async () => {
      if (!pulling) return;
      pulling = false;
      const dy = currentY - startY;
      if (dy > TRIGGER) {
        indicator.classList.add('refreshing');
        try {
          // Bootstrap (tasks+finance 1 дуудлага) ашиглана — 2 тусдаа дуудлагын оронд.
          await refreshFromServer();
          // Spin indicator өөрөө "Шинэчлэгдлээ" мессежийг харуулдаг тул toast илүү байна.
          // (Алдаа гарвал л toast гаргана.)
        } catch (e) {
          showToast('Шинэчлэх амжилтгүй', 'error');
        }
        setTimeout(() => {
          indicator.classList.remove('refreshing', 'ready');
          indicator.style.transform = '';
          indicator.style.opacity = '';
        }, 400);
      } else {
        indicator.style.transition = 'transform 200ms ease, opacity 200ms ease';
        indicator.style.transform = '';
        indicator.style.opacity = '';
        setTimeout(() => { indicator.style.transition = ''; }, 220);
      }
    });
  })();

  // ─── Keyboard shortcuts ────────────────────────────────
  // Гар бичих input/textarea-д фокус байх үед shortcut саатуулахгүй.
  document.addEventListener('keydown', (e) => {
    const tag = (e.target.tagName || '').toLowerCase();
    if (tag === 'input' || tag === 'textarea' || tag === 'select' || e.target.isContentEditable) return;
    const mod = e.metaKey || e.ctrlKey;
    if (mod && e.key.toLowerCase() === 'n') {
      e.preventDefault();
      openTaskModal();
    } else if (mod && e.key.toLowerCase() === 'f') {
      e.preventDefault();
      openFinanceModal();
    } else if (e.key === '?' && !mod) {
      e.preventDefault();
      document.getElementById('shortcuts-modal')?.classList.add('open');
    } else if (['1','2','3','4'].includes(e.key) && !mod) {
      const views = ['mine','delegated','finance','dashboard'];
      const idx = parseInt(e.key, 10) - 1;
      if (views[idx] === 'dashboard' && !state.isCEO) return;
      state.view = views[idx];
      render();
    }
  });

  // Theme toggle товч
  document.getElementById('theme-toggle')?.addEventListener('click', () => {
    toggleTheme();
    updateThemeIcon();
  });

  // ─── Глобал салбар сонгогч (толгой) ───
  document.getElementById('branch-lens')?.addEventListener('change', (e) => setBranchLens(e.target.value));

  // ─── ⌘K / Ctrl+K — command palette ───
  document.addEventListener('keydown', (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
      e.preventDefault();
      openCommandPalette();
    } else if (e.key === 'Escape') {
      const bg = document.getElementById('cmd-palette-bg');
      if (bg?.classList.contains('open')) closeCommandPalette();
    }
  });
  document.getElementById('cmd-palette-bg')?.addEventListener('click', (e) => {
    if (e.target.id === 'cmd-palette-bg') closeCommandPalette();
  });
  const cmdInput = document.getElementById('cmd-input');
  cmdInput?.addEventListener('input', () => renderCommandResults(cmdInput.value));
  cmdInput?.addEventListener('keydown', (e) => {
    const results = document.querySelectorAll('.cmd-result');
    let active = document.querySelector('.cmd-result.active');
    let idx = [...results].indexOf(active);
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      idx = Math.min(results.length - 1, idx + 1);
      results.forEach(r => r.classList.remove('active'));
      results[idx]?.classList.add('active');
      results[idx]?.scrollIntoView({ block: 'nearest' });
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      idx = Math.max(0, idx - 1);
      results.forEach(r => r.classList.remove('active'));
      results[idx]?.classList.add('active');
      results[idx]?.scrollIntoView({ block: 'nearest' });
    } else if (e.key === 'Enter') {
      e.preventDefault();
      (active || results[0])?.click();
    }
  });

  // ─── Үйлдлийн түүх toggle ───
  document.getElementById('t-activity-toggle')?.addEventListener('click', () => {
    const list = document.getElementById('t-activity-list');
    const icon = document.getElementById('t-activity-icon');
    const open = list.style.display === 'flex';
    list.style.display = open ? 'none' : 'flex';
    icon.textContent = open ? '▸' : '▾';
  });

  // NEW FINANCE REQUEST button
  document.getElementById('new-finance-btn')?.addEventListener('click', () => openFinanceModal());
  document.getElementById('f-cancel')?.addEventListener('click', () => closeFinanceModal());
  // Шинэ санхүүгийн хүсэлтийн ноорог — талбар өөрчлөгдөх бүрд localStorage-д түр хадгална
  ['f-purpose','f-amount','f-beneficiary','f-bank','f-account','f-priority','f-due'].forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    el.addEventListener('input', saveFinanceDraft);
    el.addEventListener('change', saveFinanceDraft);
  });
  document.getElementById('f-delete')?.addEventListener('click', (e) => {
    e.preventDefault();
    if (state.editingId) deleteFinanceRequest(state.editingId);
  });
  // "Дэлгэрэнгүй" expander товч — нуугдсан талбаруудыг харуулах/нуух
  document.getElementById('f-toggle-advanced')?.addEventListener('click', () => {
    const adv = document.getElementById('f-advanced-fields');
    const icon = document.getElementById('f-expand-icon');
    const isHidden = adv.style.display === 'none';
    adv.style.display = isHidden ? '' : 'none';
    if (icon) icon.textContent = isHidden ? '▴' : '▾';
  });
  // Receipt-save товч → closeFinanceRequest (Stage 4 — бараа хүлээн авч хаах)
  document.getElementById('f-close-match')?.addEventListener('click', (e) => {
    if (!state.editingId) return;
    withBusy(e.currentTarget, () => closeFinanceRequest(state.editingId, 'match'), { successText: 'Хаагдлаа' });
  });
  document.getElementById('f-close-short')?.addEventListener('click', (e) => {
    if (!state.editingId) return;
    withBusy(e.currentTarget, () => closeFinanceRequest(state.editingId, 'short'), { successText: 'Хаагдлаа' });
  });
  document.getElementById('f-close-noreceipt')?.addEventListener('click', (e) => {
    if (!state.editingId) return;
    withBusy(e.currentTarget, () => closeFinanceRequest(state.editingId, 'noreceipt'), { successText: 'Хаагдлаа' });
  });
  // Multi-file picker change handler:
  //  - ШИНЭ хүсэлт (editingId хоосон): upload-ыг ХОЙШЛУУЛНА. Илгээх товч дармагц л Drive-руу
  //    илгээгдэнэ. Илгээх хийгээгүй бол Drive-д хог үлдэхгүй.
  //  - ЗАСАЖ БУЙ (editingId): хүсэлт аль хэдийн Sheet-д бий тул шууд upload + автомат хадгалалт.
  document.getElementById('f-purchase-file')?.addEventListener('change', async (e) => {
    const files = [...(e.target.files || [])];
    if (!files.length) return;
    const editingId = state.editingId;
    if (!editingId) {
      // Шинэ хүсэлт — файлуудыг локалд хадгалаад preview-нд харуулна (Илгээх дармагц upload).
      state._fPurchasePendingFiles = (state._fPurchasePendingFiles || []).concat(files);
      const tmpUrls = state._fPurchasePendingFiles.map(f => URL.createObjectURL(f));
      renderFinanceFileList('f-purchase-list', [...(state._fPurchaseUrls || []), ...tmpUrls], true);
      e.target.value = '';
      showToast(`${files.length} зураг сонгогдсон — "Илгээх" дармагц Drive руу илгээнэ`, 'info', 2500);
      return;
    }
    // Хуучин хүсэлт — шууд upload
    const btn = document.getElementById('f-purchase-btn');
    state._fPurchaseUploading = (state._fPurchaseUploading || 0) + files.length;
    if (btn) { btn.style.opacity = '0.6'; btn.style.pointerEvents = 'none';
      btn.lastChild.textContent = ` Upload хийж байна... ${state._fPurchaseUploading}`;
    }
    for (const f of files) {
      const url = await uploadReceipt(f, editingId, 'purchase');
      if (url) {
        state._fPurchaseUrls = state._fPurchaseUrls || [];
        state._fPurchaseUrls.push(url);
        const r = state.financeRequests.find(x => x.id === editingId);
        if (r) {
          r.purchase_proof_urls = [...state._fPurchaseUrls];
          await saveFinanceRequest(r);
        }
      }
      state._fPurchaseUploading--;
    }
    if (btn) { btn.style.opacity = ''; btn.style.pointerEvents = '';
      btn.lastChild.textContent = ' Зураг / баримт хавсаргах';
    }
    renderFinanceFileList('f-purchase-list', state._fPurchaseUrls, true);
    e.target.value = '';
    showToast('Бараа баримт нэмэгдлээ', 'success', 1500);
  });
  document.getElementById('f-receipt-file')?.addEventListener('change', async (e) => {
    // Receipt picker нь Stage 4-д closeFinanceRequest үед upload хийнэ. Энд preview-д л харуулна.
    const files = [...(e.target.files || [])];
    if (!files.length) return;
    const tmpList = files.map((f, i) => URL.createObjectURL(f));
    state._fReceiptPending = files;
    renderFinanceFileList('f-receipt-list', [...(state._fReceiptUrls || []), ...tmpList], false);
    showToast(`${files.length} файл сонгогдсон — "Хүлээн авч хаах" товч дарж хадгална`, 'info', 3000);
  });
  // Stage 3 payment picker — change үед файлыг pending state-д хадгална
  document.getElementById('f-payment-file')?.addEventListener('change', (e) => {
    const f = e.target.files && e.target.files[0];
    if (!f) return;
    state._fPaymentPending = f;
    const prev = document.getElementById('f-payment-preview');
    if (prev) {
      const url = URL.createObjectURL(f);
      prev.innerHTML = `<div style="display:flex;align-items:center;gap:8px;padding:6px 8px;background:var(--panel-hover);border-radius:6px;font-size:13px;"><img src="${url}" alt="" style="width:48px;height:48px;object-fit:cover;border-radius:4px;" onerror="this.style.display='none'"/><span style="flex:1;">${f.name}</span></div>`;
    }
    showToast('Шилжүүлгийн баримт сонгогдсон — "Гүйлгээ хийгдсэн" товч дарж илгээнэ', 'info', 3000);
  });
  // Lightbox — зураг товч дарахад апп дотор томруулж харуулна
  const lightbox = document.getElementById('lightbox');
  const lightboxImg = document.getElementById('lightbox-img');
  const lightboxOpen = document.getElementById('lightbox-open');
  document.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-lightbox]');
    if (btn) {
      e.preventDefault();
      const src = btn.dataset.lightbox;
      const fallback = btn.dataset.fallback || src;
      if (lightboxImg) lightboxImg.src = src;
      if (lightboxOpen) lightboxOpen.href = fallback;
      if (lightbox) lightbox.style.display = 'flex';
      return;
    }
    if (lightbox && (e.target === lightbox || e.target.id === 'lightbox-close')) {
      lightbox.style.display = 'none';
      if (lightboxImg) lightboxImg.src = '';
    }
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && lightbox && lightbox.style.display === 'flex') {
      lightbox.style.display = 'none';
      if (lightboxImg) lightboxImg.src = '';
    }
  });

  // Multi-file жагсаалтаас X товч дарахад нэг хавсралт хасах
  document.addEventListener('click', async (e) => {
    const rmBtn = e.target.closest('[data-rm-idx][data-rm-container]');
    if (!rmBtn) return;
    const containerId = rmBtn.dataset.rmContainer;
    const idx = +rmBtn.dataset.rmIdx;
    const arr = containerId === 'f-purchase-list' ? state._fPurchaseUrls : state._fReceiptUrls;
    if (!arr || idx < 0 || idx >= arr.length) return;
    arr.splice(idx, 1);
    renderFinanceFileList(containerId, arr, true);
    if (state.editingId) {
      const r = state.financeRequests.find(x => x.id === state.editingId);
      if (r) {
        if (containerId === 'f-purchase-list') r.purchase_proof_urls = [...arr];
        else r.purchase_receipt_urls = [...arr];
        await saveFinanceRequest(r);
      }
    }
  });
  document.getElementById('f-save')?.addEventListener('click', async () => {
    // View mode үед "Засах" гэж ажилладаг — modal-ыг edit mode-руу шилжүүлнэ.
    if (state._financeViewMode && state.editingId) {
      state._financeViewMode = false;
      openFinanceModal(state.editingId);
      return;
    }
    // Edit mode + existing pending request → update + save + close
    if (state.editingId && !state._financeViewMode) {
      await applyCeoEditsBeforeDecision(state.editingId);
      const r = state.financeRequests.find(x => x.id === state.editingId);
      if (r) {
        r.updated = new Date().toISOString();
        await saveFinanceRequest(r);
        showToast('Хадгалагдлаа', 'success', 2000);
      }
      closeFinanceModal();
      render();
      return;
    }
    const amount = document.getElementById('f-amount').value;
    const beneficiary = document.getElementById('f-beneficiary').value.trim();
    const bank = document.getElementById('f-bank').value;
    const accountNumber = document.getElementById('f-account').value.trim();
    const purpose = document.getElementById('f-purpose').value.trim();
    const justification = document.getElementById('f-justification').value.trim();
    const dueDate = document.getElementById('f-due').value;
    const category = document.getElementById('f-category').value;
    const deptBranch = document.getElementById('f-dept-branch').value;
    const frequency = document.getElementById('f-frequency').value;
    const priority = document.getElementById('f-priority')?.value || 'med';
    const purchaseFile = document.getElementById('f-purchase-file').files[0];
    // Заавал бөглөх — Зорилго, Дэд код, Салбар. Бусад нь CEO/S03 нөхөж бөглөнө.
    if (!purpose) { showToast('Зарцуулалтын тайлбараа бөглөнө үү', 'warn'); return; }
    // ШИНЭ хүсэлт илгээж байгаа нь зөвхөн нягтлан өөрөө бол ангилал шаардана.
    // CEO ч энгийн ажилтан шиг хоосон үлдээж болно (нягтлан дараа нь бөглөнө).
    const isAcctSubmit = (state.me === getFinanceExecutorEmail());
    if (isAcctSubmit) {
      if (!category) { showToast('Дэд ангилал сонгоно уу', 'warn'); return; }
      if (!deptBranch) { showToast('Аль салбарт хамаарахыг сонгоно уу', 'warn'); return; }
    }
    // Upload дуусаагүй байгаа бол хүлээнэ
    if (state._fPurchaseUploading > 0) {
      showToast('Зураг upload дуусахыг хүлээнэ үү...', 'warn', 3000);
      return;
    }
    // Зураг/баримт ЗААВАЛ хавсаргасан байх ёстой — CEO нь яг юу болохыг харах ёстой
    const pendingCount = (state._fPurchasePendingFiles || []).length;
    const hasAttach = (Array.isArray(state._fPurchaseUrls) && state._fPurchaseUrls.length > 0) || pendingCount > 0;
    if (!hasAttach) {
      showToast('⚠ Бараа бүтээгдэхүүний зураг эсвэл нэхэмжлэх ЗААВАЛ хавсаргах ёстой', 'warn', 5000);
      return;
    }
    // Хэрэв дүн+банк+данс бүгд хоосон бол анхааруулга (гэхдээ үргэлжлүүлэх боломжтой)
    if ((!amount || Number(amount) <= 0) && !bank && !accountNumber && !purchaseFile) {
      if (!(await showConfirm('Дүн, банк, данс, баримт бүгд хоосон байна. CEO юу авах хэрэгтэйг ойлгох уу?\n\nҮргэлжлүүлэх үү?', { okText: 'Үргэлжлүүлэх' }))) return;
    }
    const btn = document.getElementById('f-save');
    btn.disabled = true;
    try {
      const newRequest = await createFinanceRequest({ amount, beneficiary, bank, accountNumber, purpose, justification, dueDate, category, deptBranch, frequency, priority });
      // Хойшлогдсон файлуудыг ОДОО Drive-руу upload хийнэ (request бүртгэгдсэний дараа real ID ашиглана)
      const pendingFiles = state._fPurchasePendingFiles || [];
      if (pendingFiles.length) {
        showToast(`${pendingFiles.length} зураг Drive руу илгээж байна...`, '', 3000);
        for (const f of pendingFiles) {
          const url = await uploadReceipt(f, newRequest.id, 'purchase');
          if (url) {
            state._fPurchaseUrls = state._fPurchaseUrls || [];
            state._fPurchaseUrls.push(url);
          }
        }
        state._fPurchasePendingFiles = [];
      }
      // Multi-file picker дээр upload хийгдсэн бүх URL:
      if (Array.isArray(state._fPurchaseUrls) && state._fPurchaseUrls.length) {
        newRequest.purchase_proof_urls = [...state._fPurchaseUrls];
        await saveFinanceRequest(newRequest);
      }
      clearFinanceDraft();   // амжилттай илгээгдсэн — ноорог цэвэрлэнэ
      closeFinanceModal();
      showToast('Хүсэлт CEO-руу илгээгдсэн', 'success');
      render();
    } finally { btn.disabled = false; }
  });
  // CEO шийдвэрийн өмнө modal-аас бүх засагдсан талбарыг татаж хадгалах helper
  // (Бөглөгдөөгүй талбаруудыг CEO нөхөж өгсөн бол энд татагдаж хадгална)
  async function applyCeoEditsBeforeDecision(id) {
    const r = state.financeRequests.find(x => x.id === id);
    if (!r) return;
    const get = (eid, defaultVal = '') => (document.getElementById(eid)?.value ?? defaultVal).trim();
    const newAmount = Number(document.getElementById('f-amount').value) || 0;
    if (newAmount !== r.amount && newAmount > 0) r.amount = newAmount;
    const fields = {
      beneficiary: get('f-beneficiary'),
      bank: get('f-bank'),
      account_number: get('f-account'),
      purpose: get('f-purpose'),
      justification: get('f-justification'),
      due_date: get('f-due'),
      category: get('f-category'),
      dept_branch: get('f-dept-branch'),
      frequency: get('f-frequency'),
    };
    for (const [k, v] of Object.entries(fields)) {
      if (v && v !== r[k]) r[k] = v;
    }
    const reason = get('f-decision-reason');
    if (reason) r.decision_reason = reason;
  }
  document.getElementById('f-approve')?.addEventListener('click', async () => {
    if (state.editingId) {
      await applyCeoEditsBeforeDecision(state.editingId);
      await decideFinanceRequest(state.editingId, 'approved');
      closeFinanceModal();
    }
  });
  document.getElementById('f-reject')?.addEventListener('click', async () => {
    if (!state.editingId) return;
    if (!(await showConfirm('Энэ хүсэлтийг татгалзах уу? Дахин нээгдэхгүй.', { okText: 'Татгалзах', danger: true }))) return;
    await applyCeoEditsBeforeDecision(state.editingId);
    await decideFinanceRequest(state.editingId, 'rejected');
    closeFinanceModal();
  });
  document.getElementById('f-defer')?.addEventListener('click', async () => {
    if (state.editingId) {
      await applyCeoEditsBeforeDecision(state.editingId);
      await decideFinanceRequest(state.editingId, 'deferred');
      closeFinanceModal();
    }
  });
  document.getElementById('f-execute')?.addEventListener('click', async () => {
    if (!state.editingId) return;
    const paymentFile = document.getElementById('f-payment-file').files[0];
    if (!paymentFile) {
      const proceed = await showConfirm('Төлбөрийн баримт хавсаргаагүй байна. Үргэлжлүүлэх үү?', { okText: 'Үргэлжлүүлэх' });
      if (!proceed) return;
    } else if (!(await showConfirm('Энэ гүйлгээг хийсэн гэж тэмдэглэх үү?', { okText: 'Гүйцэтгэсэн' }))) return;
    // Upload payment proof first if provided
    if (paymentFile) {
      showToast('Баримт upload хийж байна...', '', 2000);
      const url = await uploadReceipt(paymentFile, state.editingId, 'payment');
      if (url) {
        const r = state.financeRequests.find(x => x.id === state.editingId);
        if (r) { r.payment_proof_url = url; await saveFinanceRequest(r); }
      }
    }
    await executeFinanceRequest(state.editingId);
    closeFinanceModal();
  });

  document.getElementById('search').oninput = (e) => { state.search = e.target.value; render(); };
  document.getElementById('fin-sort')?.addEventListener('change', (e) => { state.financeSort = e.target.value; render(); });

  // settings — modal-д зөвхөн notification permission helper (initEvents-д dynamic нэмэгдэнэ)
  document.getElementById('export-btn')?.addEventListener('click', exportTasksReport);
  document.getElementById('settings-btn').onclick = () => {
    document.getElementById('settings-modal').classList.add('open');
  };
  document.getElementById('s-cancel').onclick = () => document.getElementById('settings-modal').classList.remove('open');

  // Branch switcher UI-аас бүрэн хасагдсан 2026-05-18 — Чимун ХХК нэг компани.
  // BRANCHES const нь task үүсгэх үед "Аль салбарын ажил вэ?" dropdown-д хэрэглэгдсэн хэвээр.

  // Logout button
  document.getElementById('logout-btn')?.addEventListener('click', logout);

  // Profile modal setup
  setupProfileModal();
  // Permissions modal (CEO only)
  setupPermissionsModal();
  // Staff management (CEO only)
  setupStaffManagement();

  // Notification bell — toggle drawer
  const notifBtn = document.getElementById('notif-btn');
  const notifPanel = document.getElementById('notif-panel');
  const notifBackdrop = document.getElementById('notif-backdrop');
  notifBtn?.addEventListener('click', (e) => {
    e.stopPropagation();
    if (notifPanel.hidden) openNotifDrawer();
    else closeNotifDrawer();
  });
  notifBackdrop?.addEventListener('click', closeNotifDrawer);
  document.getElementById('notif-close')?.addEventListener('click', closeNotifDrawer);
  document.getElementById('notif-mark-all')?.addEventListener('click', markAllNotificationsRead);
  // Panel-аас гадуур дарвал хаах — backdrop click-ийг strengthening
  document.addEventListener('click', (e) => {
    if (notifPanel.hidden) return;
    if (notifPanel.contains(e.target)) return;       // panel дотор
    if (notifBtn && notifBtn.contains(e.target)) return; // bell товч дээр
    closeNotifDrawer();
  });

  // close modal on bg click
  document.querySelectorAll('.modal-bg').forEach(bg => {
    bg.addEventListener('click', (e) => { if (e.target === bg) bg.classList.remove('open'); });
  });
  // keyboard
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      document.querySelectorAll('.modal-bg').forEach(bg => bg.classList.remove('open'));
      closeMobileSidebar();
      closeNotifDrawer();
    }
    // Shortcut: "n" (latin) эсвэл "н" (Mongolian) — шинэ task
    if ((e.key === 'n' || e.key === 'N' || e.key === 'н' || e.key === 'Н') &&
        !e.target.matches('input,textarea,select,[contenteditable=true]')) {
      e.preventDefault();
      openTaskModal();
    }
  });

  // MOBILE: hamburger menu opens/closes the sidebar drawer
  const menuBtn = document.getElementById('mobile-menu-btn');
  const backdrop = document.getElementById('sidebar-backdrop');
  if (menuBtn) menuBtn.onclick = () => {
    document.querySelector('.sidebar').classList.add('open');
    backdrop.classList.add('open');
  };
  if (backdrop) backdrop.onclick = closeMobileSidebar;
  // Auto-close after picking a view, project, or branch on mobile
  document.querySelectorAll('.nav-item, .project-item').forEach(el => {
    el.addEventListener('click', closeMobileSidebar, { capture: true });
  });
  // Re-bind project-item close handler each render via a delegated listener
  document.querySelector('.sidebar')?.addEventListener('click', (e) => {
    if (e.target.closest('.project-item')) closeMobileSidebar();
  });
}
function closeMobileSidebar() {
  document.querySelector('.sidebar')?.classList.remove('open');
  document.getElementById('sidebar-backdrop')?.classList.remove('open');
}

/* -------------------- AUTH (PIN-based) --------------------
   Flow:
   1. Page loads → tryRestoreSession() (cached session <24h) → showApp(),
      otherwise showLoginScreen() → user picks name + enters 4-digit PIN.
   2. handlePinLogin() validates against TEAM (loaded from Master Sheet via /staff).
   3. Match success → setUser() + showApp() + bootApp().
   Note: Google OAuth removed 2026-05-17 — PIN auth is the only login flow. */

function setUser(member, profile) {
  state.user = {
    ...member,
    email: profile.email || member.email || '',
    picture: profile.picture || '',
  };
  // Identity = утасны дугаар (давтагдашгүй, бүгдэд бий). Утасгүй бол email/нэр рүү уналт.
  // Өмнө нь email байсан тул и-мэйлгүй ажилтан хоосон болж, хүсэлт буруугаар CEO-д онооддог байсан.
  state.me = personKey(member);
  // CEO эрх — level === 100-аар тогтооно.
  state.isCEO = ((member.level || 0) >= 100);
  state.myLevel = member.level || 0;
  // Constrain branch to one the user actually belongs to
  if (member.branches && member.branches.length && !member.branches.includes(state.branch)) {
    state.branch = member.branches[0];
  }
  // Persist a lightweight session — утас/email/нэрийн түлхүүрээр
  localStorage.setItem('userEmail', personKey(member));
  localStorage.setItem('userLoginAt', String(Date.now()));
}

// Single entry point for fully booting the app once the user is authenticated.
// Safe to call multiple times — initEvents is idempotent because we check _eventsBound.
let _eventsBound = false;
let _pollTimer = null;
let _visibilityBound = false;
async function bootApp() {
  initTheme();
  if (!_eventsBound) {
    initEvents();
    _eventsBound = true;
  }
  loadNotifications();
  // ─── CACHE-FIRST RENDER ───
  // localStorage-аас өмнөх session-ийн tasks + finance-ийг шууд унших → render шууд явна.
  // Хэрэглэгч аппаа нээмэгц 0мс-д даалгавруудаа харна. Сервер дата дараа async ачаалагдаж,
  // өөрчлөлт байвал чимээгүй re-render хийнэ. (Twitter / Gmail-ийн pattern.)
  loadLocal();
  try {
    const frRaw = localStorage.getItem('financeRequests');
    if (frRaw) state.financeRequests = JSON.parse(frRaw);
  } catch(e) { state.financeRequests = []; }
  setConn('offline', 'Шинэчилж байна…');
  // Cache хоосон (анх удаа / шинэ төхөөрөмж) бол сервер хариу иртэл skeleton харуулна.
  state._initialLoading = !state.tasks.length;
  generateNotifications();
  render();

  // ─── BACKGROUND SYNC ───
  await flushPendingWrites();   // офлайн үлдсэн өөрчлөлтийг сервер рүү
  // TEAM нь /staff cache-аас аль хэдийн ачаалагдсан (start()-д). Хоосон үед л дахин татах.
  if (!TEAM.length) await loadTeamFromAPI();
  const bootOk = await loadBootstrap();
  if (!bootOk) await Promise.all([loadData(), loadFinanceRequests()]);
  loadOrders();   // M-Event захиалга (CEO) — фон дээр, ачаалмагц render дахин дуудна
  loadProductsCatalog();   // M-Event барааны каталог (CEO)
  loadEvaluations();   // 360° гүйцэтгэлийн үнэлгээ (бүх ажилтан)
  loadFinanceCategories();  // Санхүүгийн ангилал — Sheet-ээс (засвал бүгдэд тархана)
  loadNomaadOrders();   // NOMAAD батлагдсан гэрээ + орлого (CEO/нягтлан)
  loadHourlyRatings();  // Цагийн ажилтны үнэлгээ (менежер/CEO)
  state._initialLoading = false;
  generateNotifications();
  render();
  setConn('online', 'n8n холбогдсон');
  // CEO-д шинэ бүртгэлийн хүсэлтийг тусгайлан шалгаж дахин мэдэгдэх
  notifyCEOOfPendingRegistrations();
  // Safety-net polling — Web Push амжилттай subscribe хийгдсэн бол polling-г бүхэлд нь хасна
  // (push event + visibilitychange л refresh-ийг trigger болгоно). Push бүтэлгүйтсэн бол
  // 10 мин тутам fallback poll хийнэ. N8n execution-ийг 30+ мянгаар бууруулна.
  if (_pollTimer) { clearInterval(_pollTimer); _pollTimer = null; }
  const pushReady = await ensurePushSubscription();
  if (!pushReady) _pollTimer = setInterval(refreshFromServer, 600_000);
  // Захиалга/бараа view-г идэвхтэй харж буй ажилтанд статус өөрчлөлтийг хурдан хүргэх богино poll.
  // Зөвхөн тухайн view нээлттэй + таб харагдаж байх үед (push эсэхээс үл хамаарч). n8n ачааллыг хэмнэнэ.
  if (window._ordersPollTimer) clearInterval(window._ordersPollTimer);
  window._ordersPollTimer = setInterval(() => {
    if (document.hidden || !state.me) return;
    // Хэрэглэгч select/input засаж байвал алгасна (дэлгэц дахин зурж тасалдуулахгүй).
    const ae = document.activeElement;
    if (ae && (ae.tagName === 'SELECT' || ae.tagName === 'INPUT' || ae.tagName === 'TEXTAREA')) return;
    if (state.view === 'nomaad' && canSeeNomaadOrders()) loadNomaadOrders();
    else if (state.view === 'orders' && canSeeOrders()) loadOrders();
    else if (state.view === 'products' && state.isCEO) loadProductsCatalog();
  }, 45_000);
  // Таб/апп нуугдсан үед polling зогсоож батерей хэмнэнэ. Эргэж нээхэд нэн даруй шинэчилнэ —
  // гэхдээ tab switch ихтэй хэрэглэгчид мангаа дуудахаас сэргийлж 90 сек throttle.
  // (Шинэ ажил оноогдох бүрд Web Push шууд мэдэгддэг тул focus-refresh ховор байж болно.)
  if (!_visibilityBound) {
    let _lastVisRefresh = 0;
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden && state.me && Date.now() - _lastVisRefresh > 90_000) {
        _lastVisRefresh = Date.now();
        refreshFromServer();
      }
    });
    // Холболт сэргэхэд (offline → online) хүлээгдэж буй өөрчлөлтийг шууд илгээх
    window.addEventListener('online', () => { if (state.me) flushPendingWrites(); });
    // Service Worker push-аас ирэх refresh сигналд хариу үзүүлнэ
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message', (ev) => {
        if (ev.data && ev.data.type === 'push-refresh' && state.me) refreshFromServer();
      });
    }
    _visibilityBound = true;
  }
}

/* -------------------- WEB PUSH SUBSCRIBE --------------------
   Хэрэглэгч аппад нэвтэрсний дараа Web Push-д subscribe хийнэ. Subscription endpoint-ийг
   n8n /push-subscribe рүү илгээж n8n тал тэр endpoint руу push илгээх боломжтой болгоно.
   Apps Script onEdit trigger Sheet өөрчлөгдөх бүрд n8n /push-broadcast дуудна.
   n8n тэндээсээ бүх хадгалагдсан subscription руу web-push илгээнэ. */
function urlBase64ToUint8Array(b64) {
  const pad = '='.repeat((4 - b64.length % 4) % 4);
  const base64 = (b64 + pad).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(base64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}
async function ensurePushSubscription() {
  try {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return false;
    if (!VAPID_PUBLIC_KEY) return false;
    const reg = await navigator.serviceWorker.ready;
    let sub = await reg.pushManager.getSubscription();
    if (!sub) {
      // Notification зөвшөөрөл шаардлагатай. Default үед асуулгүй өнгөрөөнө —
      // хэрэглэгч өмнө "Block" дарсан бол дахин асуухгүй.
      if (Notification.permission === 'default') {
        const perm = await Notification.requestPermission();
        if (perm !== 'granted') return false;
      } else if (Notification.permission !== 'granted') {
        return false;
      }
      sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      });
    }
    // Subscription-ийг сервер рүү илгээх — нэг и-мэйлд олон төхөөрөмж байж болно
    const url = state.config.pushSubscribeUrl;
    if (!url) return !!sub;
    const lastSent = localStorage.getItem('pushSubLastSent');
    const subStr = JSON.stringify(sub);
    if (lastSent === subStr + '::' + state.me) return true; // өөрчлөгдөөгүй, дахин илгээхгүй
    const r = await fetchWithTimeout(withKey(url), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: state.me, subscription: sub }),
    });
    if (r.ok) {
      localStorage.setItem('pushSubLastSent', subStr + '::' + state.me);
      return true;
    }
    return false;
  } catch(e) {
    console.warn('Push subscribe failed:', e);
    return false;
  }
}

// Сэрвэрээс дата татаж дэлгэцийг шинэчлэх (poll + visibility-д хуваалцсан).
async function refreshFromServer() {
  if (document.hidden) return; // нуугдсан үед сэрвэр дуудахгүй
  try {
    await flushPendingWrites();   // татахаасаа өмнө офлайн өөрчлөлтөө илгээж, дарагдахаас сэргийлнэ
    // TEAM хоосон бол эхлээд татах (assignee нэр → email хөрвүүлэх тулд хэрэгтэй).
    // Энгийн refresh үед TEAM аль хэдийн in-memory-д бий тул дахин татахгүй.
    if (!TEAM.length) await loadTeamFromAPI();
    // Bootstrap endpoint-ыг турших — tasks + finance-ийг 1 fetch-ээр. Алдаатай бол fallback.
    const bootOk = await loadBootstrap();
    const taskPromises = bootOk ? [] : [ loadData(), loadFinanceRequests() ];
    // M-Event захиалга/бараа — refresh бүрд дахин татна (статус өөрчлөгдөхөд бусад ажилтанд хүрэх тулд).
    // Дотроо canSeeOrders/isCEO-аар хаалттай тул хамааралгүй хүмүүст no-op.
    taskPromises.push(loadOrders(), loadProductsCatalog(), loadEvaluations());
    // Ажилтны жагсаалт ховор өөрчлөгддөг — refresh бүрд биш, зөвхөн 2 цаг өнгөрсөн бол
    // дахин татна (n8n execution хэмнэх). Бүртгэл/засвар үед тусдаа шууд татагдсаар.
    const teamAge = Date.now() - (Number(localStorage.getItem('teamCacheAt')) || 0);
    if (state.isCEO && teamAge > 2 * 60 * 60 * 1000) taskPromises.push(loadTeamFromAPI());
    await Promise.all(taskPromises);
    generateNotifications();
    // Модал нээлттэй (хэрэглэгч засаж байгаа) бол жагсаалтыг бүрэн дахин зурахгүй —
    // зөвхөн badge/тоог шинэчилнэ. Эс бөгөөс бүрэн render хийж шинэ даалгаврыг харуулна.
    const modalOpen = !!document.querySelector('.modal-bg.open');
    if (modalOpen) { renderNotifications(); renderCounts(); }
    else render();
  } catch(e) { console.warn('Refresh failed:', e); }
}

function showLoginError(msg, type) {
  const el = document.getElementById('login-error');
  el.textContent = msg;
  el.classList.add('show');
  el.style.color = type === 'info' ? 'var(--ok)' : '';
}

function showLoginScreen() {
  document.getElementById('login-screen').classList.remove('hidden');
  document.getElementById('app').style.display = 'none';
}

function showApp() {
  document.getElementById('login-screen').classList.add('hidden');
  document.getElementById('app').style.display = '';
  renderUserChip();
  // Тайлан export зөвхөн CEO-д
  const exportBtn = document.getElementById('export-btn');
  if (exportBtn) exportBtn.style.display = state.isCEO ? '' : 'none';
  // Цагийн ажилтан — хязгаарлагдмал UI (body class → CSS-ээр нав/товч нуух)
  document.body.classList.toggle('role-daily', isDailyWorker());
  if (isDailyWorker()) state.view = 'mine';
}

function renderUserChip() {
  if (!state.user) return;
  document.getElementById('user-name').textContent = state.user.name;
  document.getElementById('user-role').textContent = state.user.role;
  // Avatar — хэрэглэгчийн уплоадсан зураг эсвэл initials
  const avatarEl = document.getElementById('user-avatar');
  const picture = state.user.picture || localStorage.getItem('userPicture');
  if (picture) {
    avatarEl.innerHTML = `<img src="${escapeHtml(picture)}" alt="" style="width:100%;height:100%;object-fit:cover;border-radius:inherit;" />`;
  } else {
    avatarEl.textContent = state.user.name.replace(/\./g,'').slice(0,2);
  }
}

/* ─── Profile modal ───────────────────────────────────────
   Хэрэглэгч өөрийн нэр/утас/имэйл засах, PIN солих, avatar upload.
   Localstorage-д хадгалагдана. n8n endpoint байгаа бол Master Sheet
   рүү sync хийх боломжтой (саралан хадгалагдах). */
function openProfileModal() {
  if (!state.user) return;
  document.getElementById('profile-name').value = state.user.name || '';
  document.getElementById('profile-role').value = state.user.role || '';
  document.getElementById('profile-phone').value = state.user.phone || localStorage.getItem('userPhone') || '';
  document.getElementById('profile-email').value = state.user.email || '';
  // Clear PIN inputs
  document.getElementById('profile-pin-current').value = '';
  document.getElementById('profile-pin-new').value = '';
  document.getElementById('profile-pin-confirm').value = '';
  // Accessibility prefs
  const fs = localStorage.getItem('fontSize') || 'md';
  document.querySelectorAll('.fs-btn').forEach(b => b.classList.toggle('active', b.dataset.fs === fs));
  document.getElementById('profile-high-contrast').checked = localStorage.getItem('highContrast') === '1';
  // Avatar preview
  const picture = state.user.picture || localStorage.getItem('userPicture');
  const display = document.getElementById('profile-avatar-display');
  const initialsEl = document.getElementById('profile-avatar-initials');
  const imgEl = document.getElementById('profile-avatar-img');
  const clearBtn = document.getElementById('profile-avatar-clear');
  if (picture) {
    imgEl.src = picture;
    imgEl.style.display = '';
    initialsEl.style.display = 'none';
    clearBtn.style.display = '';
  } else {
    imgEl.src = '';
    imgEl.style.display = 'none';
    initialsEl.style.display = '';
    initialsEl.textContent = state.user.name.replace(/\./g,'').slice(0,2);
    clearBtn.style.display = 'none';
  }
  // Default PIN-ийг солих заавал шаардлагатай үед "Болих" товчийг нуух (хэрэглэгч хаах боломжгүй)
  const cancelBtn = document.getElementById('profile-cancel');
  if (cancelBtn) cancelBtn.style.display = state._forcePinChange ? 'none' : '';
  document.getElementById('profile-modal').classList.add('open');
}

/* ─── Accessibility — үсгийн хэмжээ + high contrast ─── */
function applyFontSize(size) {
  document.documentElement.setAttribute('data-fs', size);
  localStorage.setItem('fontSize', size);
}
function applyHighContrast(on) {
  document.documentElement.classList.toggle('high-contrast', !!on);
  localStorage.setItem('highContrast', on ? '1' : '0');
}
function loadAccessibilityPrefs() {
  const fs = localStorage.getItem('fontSize') || 'md';
  applyFontSize(fs);
  if (localStorage.getItem('highContrast') === '1') applyHighContrast(true);
}
// Аппын анх ачаалах үед хэрэглэх
loadAccessibilityPrefs();

function setupProfileModal() {
  // Font size picker
  document.querySelectorAll('.fs-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.fs-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      applyFontSize(btn.dataset.fs);
    });
  });
  // High contrast toggle
  document.getElementById('profile-high-contrast')?.addEventListener('change', (e) => {
    applyHighContrast(e.target.checked);
  });
  document.getElementById('profile-cancel')?.addEventListener('click', () =>
    document.getElementById('profile-modal').classList.remove('open'));

  // Avatar upload — file → base64 (resize-сэн 256x256)
  document.getElementById('profile-avatar-input')?.addEventListener('change', async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      showToast('Зөвхөн зураг сонгоно уу', 'warn');
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      showToast('Зураг 2MB-аас бага байх ёстой', 'warn');
      return;
    }
    try {
      const dataUrl = await resizeImageToBase64(file, 512, 0.92);
      document.getElementById('profile-avatar-img').src = dataUrl;
      document.getElementById('profile-avatar-img').style.display = '';
      document.getElementById('profile-avatar-initials').style.display = 'none';
      document.getElementById('profile-avatar-clear').style.display = '';
      // Tmp хадгалах — Save товч дарвал л баталгаажна
      state._tmpAvatarDataUrl = dataUrl;
    } catch (err) {
      showToast('Зураг боловсруулах амжилтгүй', 'error');
    }
  });
  document.getElementById('profile-avatar-clear')?.addEventListener('click', () => {
    document.getElementById('profile-avatar-img').src = '';
    document.getElementById('profile-avatar-img').style.display = 'none';
    document.getElementById('profile-avatar-initials').style.display = '';
    document.getElementById('profile-avatar-clear').style.display = 'none';
    state._tmpAvatarDataUrl = '__CLEAR__';
  });

  document.getElementById('profile-save')?.addEventListener('click', async () => {
    const name = document.getElementById('profile-name').value.trim();
    const phone = document.getElementById('profile-phone').value.trim();
    const email = document.getElementById('profile-email').value.trim();
    const pinCur = document.getElementById('profile-pin-current').value.trim();
    const pinNew = document.getElementById('profile-pin-new').value.trim();
    const pinConfirm = document.getElementById('profile-pin-confirm').value.trim();
    if (!name) { showToast('Нэрээ оруулна уу', 'warn'); return; }
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      showToast('И-мэйл буруу формат', 'warn'); return;
    }
    if (phone && phone.replace(/\D/g,'').length < 8) {
      showToast('Утас наад зах нь 8 орон', 'warn'); return;
    }
    // PIN солих логик
    if (pinNew || pinConfirm || pinCur) {
      if (!pinCur || String(pinCur) !== String(state.user.pin)) {
        showToast('Одоогийн PIN буруу байна', 'error'); return;
      }
      if (!/^\d{4}$/.test(pinNew)) { showToast('Шинэ PIN 4 оронтой тоо', 'warn'); return; }
      if (pinNew !== pinConfirm) { showToast('Шинэ PIN таарахгүй байна', 'warn'); return; }
      state.user.pin = pinNew;
      // TEAM array дотор мөн шинэчлэх
      const member = TEAM.find(m => m.email === state.user.email);
      if (member) member.pin = pinNew;
      localStorage.setItem('teamCache', JSON.stringify(TEAM.map(sanitizeTeamForCache)));
      state._forcePinChange = false; // PIN солисон → enforcement off
    }
    // Profile талбарууд хадгалах
    state.user.name = name;
    state.user.phone = phone;
    state.user.email = email;
    localStorage.setItem('userPhone', phone);
    // Avatar
    if (state._tmpAvatarDataUrl === '__CLEAR__') {
      state.user.picture = '';
      localStorage.removeItem('userPicture');
    } else if (state._tmpAvatarDataUrl) {
      state.user.picture = state._tmpAvatarDataUrl;
      localStorage.setItem('userPicture', state._tmpAvatarDataUrl);
    }
    state._tmpAvatarDataUrl = null;
    // TEAM-д member-ийг мөн шинэчлэх
    const member = TEAM.find(m => m.email === state.user.email);
    if (member) {
      member.name = name;
      member.email = email;
      member.phone = phone;
    }
    // Default PIN-ийг солих заавал шаардлагатай байсан бол шинэ PIN үнэхээр оруулсан
    // эсэхийг шалгана. Хоосон үлдээж "хадгалах" дарвал модал хаагдахгүй.
    if (state._forcePinChange) {
      showToast('PIN-ээ заавал өөрчилнө үү', 'warn');
      const newPin = document.getElementById('profile-pin-new');
      if (newPin) newPin.focus();
      return;
    }
    document.getElementById('profile-modal').classList.remove('open');
    showToast('Профайл хадгалагдсан', 'success');
    renderUserChip();
    render();
  });

  // User chip дээр товшиход профайл нээх
  document.querySelector('.user-chip')?.addEventListener('click', (e) => {
    // Logout button-ийг алгасах
    if (e.target.closest('.logout-btn')) return;
    openProfileModal();
  });
}

/* Файлыг канвас дээр resize хийгээд base64 болгох (avatar-д ашиглана) */
function resizeImageToBase64(file, maxSize = 512, quality = 0.92) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let { width, height } = img;
        // Хэт жижиг (max биш) ч ороцог — оригиналаас том болохгүй
        const ratio = Math.min(1, maxSize / Math.max(width, height));
        width = Math.round(width * ratio);
        height = Math.round(height * ratio);
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        // Илүү чанартай scaling
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.onerror = reject;
      img.src = reader.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

async function logout() {
  if (!(await showConfirm('Гарах уу?', { okText: 'Гарах' }))) return;
  if (_pollTimer) { clearInterval(_pollTimer); _pollTimer = null; }
  localStorage.removeItem('userEmail');
  localStorage.removeItem('userLoginAt');
  // Notification "seen" state is per-user — clear so next user doesn't see this user's history
  localStorage.removeItem('notifications');
  state.notifications = [];
  state.user = null;
  state.me = null;
  state.isCEO = false;
  location.reload();
}

function tryRestoreSession() {
  // Lightweight session restore — if we have a recent userEmail, use it without forcing re-auth.
  // Hard cap: 24 hours, after which we make the user sign in again.
  const userEmail = localStorage.getItem('userEmail');
  const loginAt = parseInt(localStorage.getItem('userLoginAt') || '0', 10);
  const ageMs = Date.now() - loginAt;
  if (!userEmail || ageMs > 24 * 60 * 60 * 1000) return false;
  // Утас/email/нэрийн түлхүүрээр сэргээнэ
  const member = findMember(userEmail);
  if (!member) return false;
  // Restore without picture (we didn't cache it) — user chip will show initials
  state.user = { ...member, email: member.email, picture: '' };
  state.me = personKey(member);
  state.isCEO = ((member.level || 0) >= 100);
  state.myLevel = member.level || 0;
  if (member.branches && member.branches.length && !member.branches.includes(state.branch)) {
    state.branch = member.branches[0];
  }
  return true;
}

/* PIN-based authentication — works in iOS PWA standalone (no Google webview restrictions).
   Each TEAM member has a 4-digit `pin`. User picks their name + enters PIN to sign in. */

function initPinLogin() {
  // Утас эсвэл и-мэйл + PIN-ээр нэвтрэх. Нэрийн жагсаалт харуулахгүй (нууцлал).
  const idInput = document.getElementById('login-id-input');

  const form = document.getElementById('pin-login-form');
  const pinInput = document.getElementById('login-pin-input');
  // Auto-submit when 4 digits entered (faster UX on mobile)
  pinInput.addEventListener('input', () => {
    pinInput.value = pinInput.value.replace(/\D/g,'').slice(0,4);
    if (pinInput.value.length === 4 && idInput.value.trim()) {
      // Defer slightly so the keyboard "done" UX feels natural
      setTimeout(() => form.requestSubmit(), 80);
    }
  });

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const identifier = idInput.value.trim();
    const pin = pinInput.value.trim();
    handlePinLogin(identifier, pin);
  });

  // ─── Шинэ ажилтан бүртгэл ───
  const regSection = document.getElementById('register-section');
  const loginFooter = document.getElementById('login-footer-default');
  const openRegister = (type) => {
    regSection.style.display = 'block';
    loginFooter.style.display = 'none';
    form.style.display = 'none';
    const subTxt = type === 'daily' ? 'Цагийн ажилтны бүртгэл' : 'Үндсэн ажилтны бүртгэл';
    document.querySelector('.login-sub').textContent = subTxt;
    // Worker type toggle-ийг автоматаар тохируулна
    const targetBtn = document.querySelector(`#reg-worker-type .reg-type-btn[data-type="${type}"]`);
    if (targetBtn) targetBtn.click();
    // Top toggle-ийг далдална — entry button-аар сонгосон тул дахин харуулах хэрэггүй
    const tt = document.getElementById('reg-worker-type');
    if (tt) tt.style.display = 'none';
    const ttLabel = tt?.previousElementSibling;
    if (ttLabel && ttLabel.classList.contains('login-label')) ttLabel.style.display = 'none';
  };
  document.getElementById('show-register-permanent-btn')?.addEventListener('click', () => openRegister('permanent'));
  document.getElementById('show-register-daily-btn')?.addEventListener('click', () => openRegister('daily'));
  document.getElementById('reg-cancel')?.addEventListener('click', () => {
    regSection.style.display = 'none';
    loginFooter.style.display = 'block';
    form.style.display = 'flex';
    document.querySelector('.login-sub').textContent = 'Утас эсвэл и-мэйл + PIN кодоор нэвтэрнэ үү';
    // Toggle-ийг буцааж харуулах хэрэггүй (entry button-аар л сонгоно)
  });
  document.getElementById('reg-submit')?.addEventListener('click', handleRegister);
  // Зураг upload — registration form
  document.getElementById('reg-photo')?.addEventListener('change', async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { showToast('Зөвхөн зураг сонгоно уу', 'warn'); return; }
    // Selfie — өндөр чанартай байх ёстой. 8MB хүртэл зөвшөөрнө.
    if (file.size > 8 * 1024 * 1024) { showToast('Зураг 8MB-аас бага байх ёстой', 'warn'); return; }
    try {
      // 1024px max + 0.95 quality — ID verification-д тохирно (≈250-400KB JPEG)
      const dataUrl = await resizeImageToBase64(file, 1024, 0.95);
      state._regPhotoDataUrl = dataUrl;
      const prev = document.getElementById('reg-photo-preview');
      if (prev) prev.innerHTML = `<img src="${dataUrl}" alt="" style="width:100%;height:100%;object-fit:cover;border-radius:50%;" />`;
    } catch (err) {
      showToast('Зураг боловсруулах амжилтгүй', 'error');
    }
  });

  // Нэрийн preview — Овог + Нэр → "Б.Энх" формат
  const surnameEl = document.getElementById('reg-surname');
  const givenEl = document.getElementById('reg-givenname');
  const previewEl = document.getElementById('reg-name-preview');
  const updatePreview = () => {
    const formatted = formatMongolianName(surnameEl.value, givenEl.value);
    previewEl.textContent = formatted ? `Бүртгэгдэх нэр: ${formatted}` : '';
  };
  surnameEl?.addEventListener('input', updatePreview);
  givenEl?.addEventListener('input', updatePreview);

  // Бүртгэлийн төрөл (Үндсэн / Өдрийн) — toggle
  state._regWorkerType = 'permanent';
  document.querySelectorAll('#reg-worker-type .reg-type-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const type = btn.dataset.type;
      state._regWorkerType = type;
      document.querySelectorAll('#reg-worker-type .reg-type-btn').forEach(b => {
        const active = b.dataset.type === type;
        b.classList.toggle('active', active);
        b.style.background = active ? 'var(--primary)' : 'var(--panel)';
        b.style.color = active ? '#fff' : 'var(--text)';
        b.style.borderColor = active ? 'var(--primary)' : 'var(--border)';
      });
      // Үндсэн ажилтны нэмэлт талбарууд (албан тушаал, салбар, и-мэйл, хаяг, яаралтай үед)
      // өдрийн ажилтанд харагдахгүй
      document.querySelectorAll('.reg-permanent-only').forEach(el => {
        el.style.display = (type === 'daily') ? 'none' : '';
      });
      // Цагийн ажилтны салбар сонголт — зөвхөн daily үед
      document.querySelectorAll('.reg-daily-only').forEach(el => {
        el.style.display = (type === 'daily') ? '' : 'none';
      });
    });
  });
}

// Овог + Нэр → "Б.Энх" формат (овгийн эхний үсэг + цэг + нэр)
function formatMongolianName(surname, given) {
  const s = String(surname || '').trim();
  const g = String(given || '').trim();
  if (!s && !g) return '';
  if (!s) return g;
  if (!g) return s;
  return s.charAt(0).toUpperCase() + '.' + g;
}

async function handleRegister() {
  const errEl = document.getElementById('reg-error');
  const show = (msg, ok) => {
    errEl.textContent = msg;
    errEl.style.color = ok ? 'var(--ok)' : 'var(--danger)';
    errEl.style.fontWeight = '600';
    errEl.style.fontSize = '13px';
    errEl.classList.add('show');
    errEl.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  };
  const surname = document.getElementById('reg-surname').value.trim();
  const given   = document.getElementById('reg-givenname').value.trim();
  const name    = formatMongolianName(surname, given); // "Б.Энх"
  const role    = document.getElementById('reg-role').value.trim();
  const group   = document.getElementById('reg-group').value;
  const dailyBranch = document.getElementById('reg-daily-branch')?.value || ''; // цагийн ажилтны салбар (M Event / Camp)
  const phone   = document.getElementById('reg-phone').value.trim();
  const email   = document.getElementById('reg-email').value.trim();
  const pin     = document.getElementById('reg-pin').value.trim();
  // Шинэ талбарууд
  const rd      = document.getElementById('reg-rd')?.value.trim().toUpperCase() || '';
  const address = document.getElementById('reg-address')?.value.trim() || '';
  const emergencyRelation = document.getElementById('reg-emergency-relation')?.value.trim() || '';
  const emergencyName     = document.getElementById('reg-emergency-name')?.value.trim() || '';
  const emergencyPhone    = document.getElementById('reg-emergency-phone')?.value.trim() || '';
  const photoDataUrl   = state._regPhotoDataUrl || '';
  const workerType     = state._regWorkerType || 'permanent';
  const bank           = document.getElementById('reg-bank')?.value || '';
  const bankAccount    = document.getElementById('reg-bank-account')?.value.trim() || '';
  const bankHolder     = document.getElementById('reg-bank-holder')?.value.trim() || '';

  // Кирилл шалгах (Монгол үсэг — Өө Үү багтсан 0400-04FF муж + зай, цэг, зураас)
  const cyrillic = /^[Ѐ-ӿ\s.\-]+$/;          // Кирилл (Монгол) үсэг
  const hasLatin = /[A-Za-z]/;                // Латин үсэг агуулсан эсэх
  const phoneNorm = phone.replace(/\D/g, ''); // Зөвхөн тоо
  // Validation — алдааг тод харуулах (scroll into view)
  if (!surname) return show('Овгоо оруулна уу.');
  if (hasLatin.test(surname) || !cyrillic.test(surname)) return show('⚠ Овгоо МОНГОЛоор (кирилл) бичнэ үү. Жишээ: Болд');
  if (!given)   return show('Нэрээ оруулна уу.');
  if (hasLatin.test(given) || !cyrillic.test(given)) return show('⚠ Нэрээ МОНГОЛоор (кирилл) бичнэ үү. Жишээ: Энх');
  if (workerType === 'permanent') {
    if (!role)    return show('Албан тушаалаа жагсаалтаас сонгоно уу.');
    if (!group)   return show('Аль салбарт хамаарахаа сонгоно уу.');
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return show('⚠ И-мэйл хаягаа зөв оруулна уу.');
    if (!address || address.length < 8) return show('⚠ Гэрийн хаягаа дэлгэрэнгүй (хороо, байр, тоот) оруулна уу.');
    if (!emergencyName) return show('⚠ Яаралтай үед холбоо барих хүний нэр оруулна уу.');
    if (!emergencyPhone || emergencyPhone.replace(/\D/g,'').length < 8) return show('⚠ Яаралтай үеийн утас наад зах нь 8 орон.');
  }
  if (workerType === 'daily' && !dailyBranch) return show('⚠ Аль салбарт хамаарахаа сонгоно уу (M Event / NOMAAD).');
  if (!phone || phoneNorm.length < 8) return show('⚠ Утасны дугаараа зөв оруулна уу (наад зах нь 8 орон).');
  if (!rd || !/^[А-ЯӨҮ]{2}\d{8}$/i.test(rd)) return show('⚠ РД дугаар "АА00000000" хэлбэртэй байх ёстой.');
  if (!photoDataUrl) return show('⚠ Selfie зураг заавал оруулна уу.');
  // Цалин хүлээн авах данс — бүх ажилтанд шаардлагатай
  if (!bank) return show('⚠ Банкаа сонгоно уу.');
  if (!bankAccount || bankAccount.replace(/\D/g,'').length < 6) return show('⚠ Дансны дугаараа зөв оруулна уу.');
  if (!bankHolder) return show('⚠ Данс эзэмшигчийн нэр оруулна уу.');
  // Цагийн ажилтны цалин (өдрийн хөлс × хоног)-г менежер ажил дуусахад гараар оруулна.
  if (!/^\d{4}$/.test(pin)) return show('PIN нь 4 оронтой тоо байх ёстой.');

  // ─── Давхцал шалгах (одоогийн TEAM дотор) ───
  if (TEAM.some(m => String(m.pin) === pin)) {
    return show('⚠ Энэ PIN өөр хүн ашиглаж байна. Өөр PIN сонгоно уу.');
  }
  // И-мэйл давхцал (TEAM-д email бий)
  if (email && TEAM.some(m => m.email && m.email.trim().toLowerCase() === email.toLowerCase())) {
    return show('⚠ Энэ и-мэйл хаягаар бүртгэлтэй байна. Нэвтрэх рүү буцна уу.');
  }
  // Утас давхцал (TEAM-д phone байвал)
  if (phoneNorm && TEAM.some(m => m.phone && String(m.phone).replace(/\D/g,'') === phoneNorm)) {
    return show('⚠ Энэ утасны дугаараар бүртгэлтэй байна. Нэвтрэх рүү буцна уу.');
  }

  const btn = document.getElementById('reg-submit');
  btn.disabled = true;
  btn.textContent = 'Бүртгэж байна...';

  try {
    const url = state.config.registerUrl;
    if (!url) { show('Бүртгэлийн систем тохируулагдаагүй. CEO-той холбогдоно уу.'); return; }
    // CEO зөвшөөрөл шаардахгүй — зэрэглэлийг албан тушаалаас автомат тогтооно.
    // Өдрийн ажилтны хувьд role/group хоосон тул автомат default тогтооно.
    const effectiveRole  = (workerType === 'daily') ? 'Өдрийн ажилтан' : role;
    const effectiveGroup = (workerType === 'daily') ? dailyBranch      : group;
    const autoLevel = (workerType === 'daily') ? 40 : levelForRole(role);
    const r = await fetchWithTimeout(withKey(url), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name, role: effectiveRole, group: effectiveGroup, phone, email, pin,
        rd, address,
        emergency_relation: emergencyRelation,
        emergency_name: emergencyName,
        emergency_phone: emergencyPhone,
        photo: photoDataUrl, // base64 data URL эсвэл хоосон
        level: autoLevel,         // 40/60/80/100
        status: 'идэвхтэй',       // шууд идэвхтэй — зөвшөөрөл шаардахгүй
        joined_at: new Date().toISOString().slice(0, 10),
        requested_at: new Date().toISOString(),
        worker_type:   workerType,   // 'permanent' | 'daily'
        bank, bank_account: bankAccount, bank_holder: bankHolder,
      }),
    });
    const data = await r.json().catch(() => ({}));
    if (!r.ok) {
      // n8n-н жинхэнэ алдааны мессежийг харуулах (errorMessage эсвэл message)
      let msg = data?.errorMessage || data?.message || data?.error || ('Серверийн алдаа: ' + r.status);
      // n8n "[line 15]" гэх кодын байршлыг цэвэрлэх
      msg = String(msg).replace(/\s*\[line \d+\]\s*$/, '');
      show('⚠ ' + msg);
      return;
    }

    errEl.style.color = 'var(--ok)';
    errEl.textContent = '✓ Амжилттай бүртгэгдлээ! Шинэ TEAM ачаалж байна...';

    // Master Sheet-аас шинэ TEAM татаж шинэ хүнийг dropdown-д оруулах
    await loadTeamFromAPI();
    setTimeout(() => {
      // Login руу буцаад шинэ хэрэглэгчийг и-мэйлээр сонгуулах
      document.getElementById('reg-cancel').click();
      initPinLogin();
      const idInput = document.getElementById('login-id-input');
      if (email && idInput) idInput.value = email;
      showLoginError('Бүртгэл амжилттай. И-мэйл: ' + email + ' · PIN кодоо оруулж нэвтэрнэ үү.', 'info');
    }, 1200);
  } catch (e) {
    console.warn('Бүртгэл амжилтгүй:', e);
    show('Бүртгэхэд алдаа гарлаа. Дахин оролдоно уу эсвэл CEO-той холбогдоно уу.');
  } finally {
    btn.disabled = false;
    btn.textContent = 'Бүртгүүлэх';
  }
}

async function handlePinLogin(userIdentifier, pin) {
  if (!userIdentifier) return showLoginError('Утас эсвэл и-мэйл хаягаа оруулна уу.');
  if (!/^\d{4}$/.test(pin)) return showLoginError('PIN нь 4 оронтой тоо байх ёстой.');

  const raw = String(userIdentifier).trim();
  const lowered = raw.toLowerCase();
  const phoneNorm = raw.replace(/\D/g, '');

  const tryAuth = () => {
    // Эхлээд утсаар хайх (8+ оронтой бол утас гэж үзнэ)
    let member = null;
    if (phoneNorm.length >= 8) {
      member = TEAM.find(m => {
        const p = String(m.phone || '').replace(/\D/g, '');
        return p && p === phoneNorm;
      });
    }
    // Олдоогүй бол email-ээр хайх
    if (!member) {
      member = TEAM.find(m => String(m.email || '').toLowerCase() === lowered);
    }
    if (!member) return { ok: false, reason: 'Хэрэглэгч олдсонгүй. CEO-той холбогдоорой.' };
    // "Гарсан" статустай ажилтан нэвтэрч чадахгүй
    if ((member.status || 'идэвхтэй') === 'гарсан') {
      return { ok: false, reason: 'Та ажлаас гарсан гэж тэмдэглэгдсэн. CEO-той холбогдоорой.' };
    }
    if (!member.pin) return { ok: false, reason: 'no_pin_in_sheet' };
    if (String(member.pin) !== String(pin)) return { ok: false, reason: 'wrong_pin' };
    return { ok: true, member };
  };

  // 1-р оролдлого: одоогийн TEAM (cache) дээр шалгана
  let result = tryAuth();

  // PIN буруу эсвэл Sheet-д PIN тохируулаагүй бол Master Sheet-ээс шинэ data татаад дахин шалгана
  if (!result.ok && (result.reason === 'wrong_pin' || result.reason === 'no_pin_in_sheet')) {
    showLoginError('Шалгаж байна...', 'info');
    try {
      await loadTeamFromAPI();
      result = tryAuth();
    } catch(e) {
      console.warn('Master Sheet шалгалт амжилтгүй:', e);
    }
  }

  if (!result.ok) {
    document.getElementById('login-pin-input').value = '';
    let msg = result.reason;
    if (result.reason === 'wrong_pin') msg = 'PIN буруу байна. Дахин оролдоорой эсвэл CEO-той холбогдоорой.';
    else if (result.reason === 'no_pin_in_sheet') msg = 'Таны PIN Master Sheet-д тохируулагдаагүй байна. CEO-той холбогдоорой.';
    return showLoginError(msg);
  }

  // Амжилттай — нэвтрэх
  setUser(result.member, { email: result.member.email || '', name: result.member.name, picture: '' });
  showApp();
  bootApp();
  // Default PIN (хамтын '1111' гэх мэт) хэвээр байгаа бол шууд солихыг шаардана.
  // Энэ нь шинэ ажилтан болон CEO-ийн setup-аас үлдсэн default-аас account takeover хаах
  // зориулалттай. Хэрэглэгч PIN солих хүртэл profile modal-ыг хааж болохгүй.
  if (isDefaultPin(result.member.pin)) {
    state._forcePinChange = true;
    setTimeout(() => promptDefaultPinChange(), 600);
  }
}

// Зөвхөн hardcoded '1111' нь default — бусад "сул" PIN-ийг (8888, 1234 г.м.) хэрэглэгч
// зориудаар сонгосон байж болохыг хүндэтгэнэ. Master Sheet дотор хэрэв ажилтан '1111'
// PIN-тэй бол шинэ ажилтан CEO setup-аас үлдсэн default гэж тооцох ба заавал солих
// шаардлагатай. Бусдад нь интерфэр хийхгүй.
const DEFAULT_PINS = new Set(['1111']);
function isDefaultPin(pin) { return DEFAULT_PINS.has(String(pin || '')); }

function promptDefaultPinChange() {
  showToast('Аюулгүй байдлын үүднээс PIN-ээ өөрчилнө үү', 'warn', 5000);
  openProfileModal();
  // PIN секц рүү fokус
  const newPin = document.getElementById('profile-pin-new');
  if (newPin) {
    newPin.scrollIntoView({ behavior: 'smooth', block: 'center' });
    setTimeout(() => newPin.focus(), 400);
  }
  // Cancel товч + background click нь модалыг хаахаар хийсэн — тэдгээрийг blok
  const cancelBtn = document.getElementById('profile-cancel');
  if (cancelBtn) cancelBtn.style.display = 'none';
}

(async function start() {
  // STAFF SYNC — load fresh team roster from Master Sheet (background).
  // Cache hit is instant; API fetch happens async + re-renders if data changes.
  loadTeamFromCache();
  loadTeamFromAPI().then(updated => {
    if (!updated) return;
    // If still on login screen, repopulate the PIN dropdown with fresh names.
    // If already in the app, re-render so assignee selects reflect new staff.
    if (!state.user) initPinLogin();
    else render();
  });

  // Restore a recent session if we have one; otherwise show PIN login.
  if (tryRestoreSession()) {
    showApp();
    bootApp();
    // Session-аар нэвтэрсэн ч default PIN хэвээр байгаа бол шууд солихыг шаардана.
    // TEAM нь async ачаалагдаж буй тул жаахан хүлээгээд шалгана.
    setTimeout(() => {
      if (!state.user) return;
      const member = TEAM.find(m => m.email === state.user.email);
      if (member && isDefaultPin(member.pin)) {
        state._forcePinChange = true;
        promptDefaultPinChange();
      }
    }, 2000);
  } else {
    showLoginScreen();
    initPinLogin();
  }
})();

/* -------------------- PWA: register service worker -------------------- */
// Only registers on http(s) (skips file:// — double-clicked local files won't try to register).
// SW-г түр зогсоож гацлыг тусгаарлах — ?nosw=1 URL-р идэвхгүй болгож болно
const _NO_SW = new URLSearchParams(location.search).has('nosw');
if (_NO_SW && 'serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then(regs => regs.forEach(r => r.unregister()));
}
function showUpdateBanner() {
  if (document.getElementById('sw-update-banner')) return;
  const b = document.createElement('div');
  b.id = 'sw-update-banner';
  b.style.cssText = 'position:fixed;left:50%;bottom:20px;transform:translateX(-50%);z-index:12000;background:var(--primary,#5e6ad2);color:#fff;padding:12px 16px;border-radius:10px;box-shadow:0 6px 20px rgba(0,0,0,.25);display:flex;align-items:center;gap:12px;font-size:14px;max-width:92vw;';
  b.innerHTML = '<span>🔄 Шинэ хувилбар бэлэн</span><button id="sw-update-btn" style="background:#fff;color:#5e6ad2;border:none;padding:6px 14px;border-radius:6px;font-weight:700;cursor:pointer;white-space:nowrap;">Шинэчлэх</button><button id="sw-update-x" style="background:none;border:none;color:#fff;font-size:18px;cursor:pointer;line-height:1;padding:0 4px;">×</button>';
  document.body.appendChild(b);
  document.getElementById('sw-update-btn').onclick = () => location.reload();
  document.getElementById('sw-update-x').onclick = () => b.remove();
}

if (!_NO_SW && 'serviceWorker' in navigator && (location.protocol === 'https:' || location.protocol === 'http:')) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').then((reg) => {
      console.log('SW registered:', reg.scope);
      // Шинэ хувилбар суурилмагц "Шинэчлэх" banner үзүүлнэ. Хэрэглэгч дарж reload —
      // автомат reload биш тул infinite loop болохгүй, мид-форм дата ч алдагдахгүй.
      reg.addEventListener('updatefound', () => {
        const nw = reg.installing;
        if (!nw) return;
        nw.addEventListener('statechange', () => {
          // controller байгаа = энэ нь ШИНЭЧЛЭЛТ (анхны суулгац биш)
          if (nw.state === 'installed' && navigator.serviceWorker.controller) showUpdateBanner();
        });
      });
      // Update check — 15 минут тутам
      setInterval(() => reg.update().catch(()=>{}), 15 * 60_000);
    }).catch((err) => {
      console.warn('SW register failed:', err);
    });
  });
}

/* ═══════════════════════════════════════════════════════════
   INSTALL PROMPT — "Гэрийн дэлгэц рүү нэмэх" туслалцаа
   - Android Chrome: beforeinstallprompt үйл явдлыг барьж native prompt үзүүлнэ
   - iOS Safari: native API байхгүй тул step-by-step заавар үзүүлнэ
   - Аль хэдийн суулгасан (standalone mode) бол огт харуулахгүй
   - Хэрэглэгч хаасан бол 7 хоног дахин харуулахгүй
   ═══════════════════════════════════════════════════════════ */
(function setupInstallPrompt() {
  const DISMISS_KEY = 'installBannerDismissedAt';
  const DISMISS_DAYS = 7;

  // PWA standalone mode-д ажиллаж байвал банер үл хэрэгтэй
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches
    || window.navigator.standalone === true;
  if (isStandalone) return;

  // Сүүлд хаасан 7 хоногийн дотор бол үл харуулах
  const dismissedAt = parseInt(localStorage.getItem(DISMISS_KEY) || '0', 10);
  if (dismissedAt && (Date.now() - dismissedAt) < DISMISS_DAYS * 86400 * 1000) return;

  const banner = document.getElementById('install-banner');
  const btn = document.getElementById('install-btn');
  const closeBtn = document.getElementById('install-close');
  const iosModal = document.getElementById('ios-install-modal');
  const iosClose = document.getElementById('ios-install-close');
  if (!banner || !btn || !closeBtn) return;

  let deferredPrompt = null;

  // iOS Safari detect (beforeinstallprompt дэмжлэггүй)
  const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent) && !window.MSStream;
  const isSafari = /^((?!chrome|android|crios|fxios).)*safari/i.test(navigator.userAgent);

  function dismiss() {
    banner.classList.remove('show');
    localStorage.setItem(DISMISS_KEY, String(Date.now()));
  }

  closeBtn.addEventListener('click', dismiss);

  btn.addEventListener('click', async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      if (choice.outcome === 'accepted') {
        dismiss();
      }
      deferredPrompt = null;
    } else if (isIOS && isSafari) {
      // iOS: native prompt байхгүй тул заавар үзүүлнэ
      iosModal.classList.add('show');
    } else {
      // Бусад тохиолдол — browser-ийн menu-аас "Install app" сонгох заавар
      alert('Browser-ийн цэснээс "Аппыг суулгах" эсвэл "Add to Home Screen" сонгоно уу.');
    }
  });

  iosClose?.addEventListener('click', () => iosModal.classList.remove('show'));
  iosModal?.addEventListener('click', (e) => {
    if (e.target === iosModal) iosModal.classList.remove('show');
  });

  // Android/desktop Chrome: beforeinstallprompt-ыг хадгалаад банер харуулна
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    banner.classList.add('show');
  });

  // iOS дээр beforeinstallprompt гарахгүй — шууд банер харуулна
  if (isIOS && isSafari) {
    // App нээгдэхэд 3 секундын дараа банер харуулна (анх хараахан их санасангүй байх)
    setTimeout(() => banner.classList.add('show'), 3000);
  }

  // Хэрэглэгч суулгасны дараа банер хаах
  window.addEventListener('appinstalled', dismiss);
})();
