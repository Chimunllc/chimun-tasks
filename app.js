/* -------------------- CONSTANTS -------------------- */
// Branches — 3 work-groups + 1 cross-branch "production" type for Camp↔M Event events.
// Store branch removed 2026-05-16: CEO no longer manages the store (Wise Brothers).
const BRANCHES = [
  { id: 'm-event',    name: 'M Event',         icon: '🎪' },
  { id: 'camp',       name: 'NOMAAD Camp',     icon: '🏕️' },
  { id: 'shared',     name: 'Нэгдсэн алба',    icon: '🏢' },
  { id: 'production', name: 'Production event',icon: '🌟' },
];

// 13-staff roster as of 2026-05-16, синк хийгдсэн Master Sheet:
// https://docs.google.com/spreadsheets/d/1so0IBwfok7_Tss3y25a-40qybGe9SGHimkuXrihuWvM/edit
// Old IDs (001–006) kept for backward compat with existing tasks in localStorage.
// `email` field used for login email lookup (legacy). PIN is the active auth.
// `level` is hierarchical rank: 100=CEO, 80=executive, 60=manager/ахлах, 40=staff.
// A user can only DELETE tasks created by someone at their level or below.
//
// Store branch + Wise Brothers staff removed: CEO no longer manages дэлгүүр.
// Хасагдсан хүмүүс: S02 Тэмүүлэн, S04 Ганболд, M03 Шижирсаран, M09 Тананбат,
//   C03 Бямбацэрэн, C04 Төгөлдөр, C05 Эрка, T01 Содхүү, T02 Тэлмэн.
//
// `let` (not const) — runtime sync replaces this array in-place from Master Sheet via n8n /staff endpoint.
// PIN-ийг hardcoded TEAM-д хадгалахгүй. Master Sheet sync (loadTeamFromAPI) ажиллахгүй бол
// нэвтрэлт ажиллахгүй — энэ нь зориуд тавьсан failsafe. Production PIN зөвхөн Sheet-д байрладаг.
let TEAM = [
  { id: 'CEO', name: 'Г.Мөнх-Учрал', role: 'CEO', level: 100, pin: '',
    email: 'ceo@nomaadcamp.com',
    branches: ['m-event','camp','shared','production'] },

  // Нэгдсэн алба (cross-cutting)
  { id: 'S01', name: 'Н.Анужин',       role: 'Кемп менежер',           level: 80, pin: '', email: 'akunaa.anujin@gmail.com',  branches: ['shared','camp'] },
  { id: 'S03', name: 'О.Түвдэндаржаа', role: 'Туслах нягтлан',         level: 40, pin: '', email: 'tuvdendar@gmail.com',      branches: ['shared'] },

  // M Event салбар
  { id: '001', name: 'И.Алтансүх',     role: 'ҮАХ захирал M EVENT',    level: 80, pin: '', email: 'coo@mevent.mn',            branches: ['m-event','production'] },
  { id: 'M02', name: 'Г.Сайнжаргал',   role: 'Event Manager',          level: 60, pin: '', email: '',                         branches: ['m-event','production'] },
  { id: '003', name: 'Д.Нинждолгор',   role: 'Нярав',                  level: 60, pin: '', email: '',                         branches: ['m-event'] },
  { id: '004', name: 'Б.Пүрэвдавга',   role: 'Агуулах засварын ажилтан', level: 60, pin: '', email: '',                       branches: ['m-event','production'] },
  { id: '005', name: 'Д.Баясгалан',    role: 'Агуулах-Логистик 1',     level: 40, pin: '', email: '',                         branches: ['m-event','production'] },
  { id: 'M07', name: 'О.Эрдэнэхүү',    role: 'Агуулах-Логистик 2',     level: 40, pin: '', email: '',                         branches: ['m-event','production'] },
  { id: '006', name: 'Хишигтогтох',    role: 'Цэврэлгээ',              level: 40, pin: '', email: '',                         branches: ['m-event'] },

  // NOMAAD Camp
  { id: 'C01', name: 'Б.Дэлгэрбат',    role: 'ҮАХ захирал NOMAAD',     level: 80, pin: '', email: 'delgerbat69@nomaadcamp.com', branches: ['camp','production'] },
  { id: 'C02', name: 'Б.Батжаргал',    role: 'Кемпийн менежер',        level: 60, pin: '', email: '',                         branches: ['camp','production'] },
  { id: 'C06', name: 'Цэлмэг',         role: 'Кемп туслах 1',          level: 40, pin: '', email: '',                         branches: ['camp'] },
];

// n8n webhook URL — hardcoded so staff never have to configure anything.
// Change here + push when the backend moves. Settings panel still lets the user
// override locally for testing.
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

// Default projects per branch. Saved to localStorage on first load; user can add more.
const PROJECTS_BY_BRANCH = {
  'm-event': [
    { id: 'event',     name: 'Захиалга бэлдэх (5 дамжлага)' },
    { id: 'inventory', name: 'Сар бүрийн тооллого' },
    { id: 'cleaning',  name: 'Цэвэрлэгээ / чанарын шалгалт' },
    { id: 'repair',    name: 'Засвар / тоноглол' },
    { id: 'kpi',       name: 'KPI хяналт' },
  ],
  'camp': [
    { id: 'pre-season', name: 'Сезоны өмнөх бэлтгэл' },
    { id: 'event-prep', name: 'Арга хэмжээний бэлдэл' },
    { id: 'camp-ops',   name: 'Кемпийн өдөр тутмын ажил' },
    { id: 'kitchen',    name: 'Гал тогоо' },
  ],
  'shared': [
    { id: 'admin',     name: 'Захиргааны ажил' },
    { id: 'finance',   name: 'Санхүү / татвар' },
    { id: 'marketing', name: 'Маркетинг / social' },
    { id: 'hr',        name: 'Хүний нөөц / цалин' },
  ],
  'production': [
    { id: 'camp-prep',   name: 'Camp талын бэлдэл' },
    { id: 'mevent-prep', name: 'M Event талын бэлдэл' },
    { id: 'event-day',   name: 'Арга хэмжээний өдөр' },
    { id: 'post-event',  name: 'Дараах тайлан' },
  ],
};

/* -------------------- 5-СТАДИЙН АКТ TEMPLATE --------------------
   Camp ↔ M Event-ийн актын урсгал — Chimun_Camp_MEvent_Agreement_2026.
   "Шинэ захиалга" товчоор 1 эх (parent) task + 5 sub-task үүснэ.
   Дамжлага бүр `offset` өдрөөр event-ийн өдрөөс тооцон due огноотой болно.

   ⚠ Шинэ дизайн: hardcoded ID-ын оронд role_pattern ашиглана —
   ингэснээр Master Sheet-д ID солигдсон ч хариуцагч role-аар нь автомат олдоно. */
const ACT_TEMPLATE = [
  { stage: 1, title: 'Акт үүсгэх + захиалгын мэдээлэл',         role_pattern: 'event manager|захиалгын ажилтан|менежер', offset: -7, priority: 'high' },
  { stage: 2, title: 'Тоног төхөөрөмж бэлдэх + тест',           role_pattern: 'агуулах|засвар',                          offset: -1, priority: 'high' },
  { stage: 3, title: 'Газар дээр хүргэх + setup',               role_pattern: 'логистик',                               offset:  0, priority: 'high' },
  { stage: 4, title: 'Буцаалт + цэвэрлэгээ + чанарын шалгалт',  role_pattern: 'цэвэрлэгээ|цэврэлгээ',                   offset:  1, priority: 'med'  },
  { stage: 5, title: 'Бүртгэл хаах + санхүүгийн бүртгэл',       role_pattern: 'нярав',                                  offset:  2, priority: 'med'  },
];

/* -------------------- STATE -------------------- */
const state = {
  tasks: [],
  financeRequests: [],   // Финансын хүсэлт — тусдаа Sheet-аас sync хийгдэнэ
  projectsByBranch: {},  // { 'm-event': [...], 'camp': [...], ... }
  branch: localStorage.getItem('branch') || 'm-event',
  view: 'mine',          // mine | delegated | finance | all | overdue | today | done | project:<id>
  statusFilter: 'all',   // all | open | done
  search: '',
  // Auth state — populated by Google Sign-In flow. `me` is set automatically.
  user: null,            // { id, name, role, email, picture, branches }
  me: null,              // user.id (used as task assignee key, kept for backward compat)
  isCEO: false,          // whether this user has full access
  config: (() => {
    // Migration: chimun.app.n8n.cloud → chimunllc.app.n8n.cloud (2026-05-18)
    // Хэрэглэгчийн localStorage-д хадгалсан хуучин URL-ыг шинэ домэйн рүү шилжүүлнэ.
    const migrationFlag = 'urlMigrated_chimunllc_v1';
    if (!localStorage.getItem(migrationFlag)) {
      for (const k of ['apiUrl', 'staffUrl', 'financeUrl', 'uploadUrl']) {
        const v = localStorage.getItem(k);
        if (v && v.includes('chimun.app.n8n.cloud')) {
          localStorage.setItem(k, v.replace('chimun.app.n8n.cloud', 'chimunllc.app.n8n.cloud'));
        }
      }
      localStorage.setItem(migrationFlag, '1');
    }
    return {
      apiUrl:      localStorage.getItem('apiUrl')      || DEFAULT_API_URL      || '',
      staffUrl:    localStorage.getItem('staffUrl')    || DEFAULT_STAFF_URL    || '',
      financeUrl:  localStorage.getItem('financeUrl')  || DEFAULT_FINANCE_URL  || '',
      uploadUrl:   localStorage.getItem('uploadUrl')   || DEFAULT_UPLOAD_URL   || '',
      registerUrl: localStorage.getItem('registerUrl') || DEFAULT_REGISTER_URL || '',
    };
  })(),
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
  el.className = 'toast' + (type ? ' ' + type : '');
  const icon = { success: '✓', error: '✕', warn: '⚠' }[type] || 'ⓘ';
  el.innerHTML = `<span class="toast-icon">${icon}</span><span>${escapeHtml(msg)}</span>`;
  stack.appendChild(el);
  setTimeout(() => {
    el.style.transition = 'opacity .2s';
    el.style.opacity = '0';
    setTimeout(() => el.remove(), 220);
  }, timeoutMs);
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
  //    + 4a. COMMENTS — миний үүсгэсэн / надад оноогдсон ажил дээр шинэ сэтгэгдэл
  //    + 4b. MENTIONS — намайг @mention хийсэн
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
    // Comments scan
    if (Array.isArray(t.comments)) {
      for (const c of t.comments) {
        if (c.author === state.me) continue;
        const cid = `${t.id}-cmt-${c.id}`;
        const lastTs = lastSeen[`cmt-${t.id}`] || 0;
        if (c.timestamp <= lastTs) continue;
        const mentioned = Array.isArray(c.mentions) && c.mentions.includes(state.me);
        if ((involved || mentioned) && !seen.has(cid)) {
          const preview = String(c.text || '').slice(0, 60);
          newOnes.push({
            id: cid,
            type: mentioned ? 'overdue' : 'assigned', // mention улаан icon-той
            taskId: t.id,
            msg: `💬 ${memberName(c.author)}${mentioned ? ' таныг дурдсан' : ''}: ${preview}`,
            ts: c.timestamp,
            read: false,
          });
        }
      }
      nowSeen[`cmt-${t.id}`] = Math.max(nowSeen[`cmt-${t.id}`] || 0, ...t.comments.map(c => c.timestamp || 0));
    }
  });
  localStorage.setItem(lastSeenKey, JSON.stringify(nowSeen));

  // 5. FINANCE — миний илгээсэн хүсэлтийн төлөв өөрчлөгдсөн (approved/rejected/deferred/executed)
  state.financeRequests.filter(t => t.requested_by === state.me).forEach(t => {
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
    state.financeRequests.filter(r => (r.decision || 'pending') === 'pending' && r.status !== 'done').forEach(r => {
      const nid = `finance-pending-${r.id}`;
      if (!seen.has(nid)) {
        newOnes.push({ id: nid, type: 'assigned', taskId: r.id,
          msg: `💸 Хүсэлт: ${memberName(r.requested_by)} — ${Number(r.amount).toLocaleString('mn-MN')}₮ (${r.beneficiary})`,
          ts: Date.now(), read: false });
      }
    });
  }
  if (state.me === getFinanceExecutorId()) {
    state.financeRequests.filter(r => r.decision === 'approved' && r.status !== 'done').forEach(r => {
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
  list.innerHTML = state.notifications.map(n => {
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
  }).join('');
  list.querySelectorAll('.notif-item').forEach(el => {
    el.onclick = () => {
      const taskId = el.dataset.taskId;
      const notifId = el.dataset.notifId;
      const n = state.notifications.find(x => x.id === notifId);
      if (n) { n.read = true; saveNotifications(); }
      closeNotifDrawer();
      if (taskId) {
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
  document.getElementById('notif-panel').hidden = false;
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
// Cache version — bump-лэх үед утсууд хуучин teamCache-ыг хаяна
const TEAM_CACHE_VERSION = '2026-05-20-phone';
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
    const bustUrl = `${url}${sep}t=${Date.now()}`;
    const r = await fetch(bustUrl, {
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
    localStorage.setItem('teamCache', JSON.stringify(fresh));
    localStorage.setItem('teamCacheAt', String(Date.now()));
    console.log(`Staff sync OK: ${fresh.length} members from Master Sheet`);
    return true;
  } catch(e) {
    console.warn('Staff sync failed, using cached/hardcoded TEAM:', e);
    return false;
  }
}
function currentProjects() {
  return state.projectsByBranch[state.branch] || [];
}
function currentBranchInfo() {
  return BRANCHES.find(b => b.id === state.branch) || BRANCHES[0];
}

/* -------------------- STORAGE -------------------- */
// Google Sheets returns string-typed columns as numbers when the value looks numeric
// (e.g. assignee "001" → 1). Normalize so render code can rely on consistent types.
function normalizeTask(t) {
  if (!t || typeof t !== 'object') return t;
  const stringFields = ['id','title','desc','branch','project','assignee','due','priority','status','kpi_code','createdBy','parent_id','kind',
    'decision','decision_at','decision_by','executed_at','executed_by','purpose','beneficiary','justification','decline_reason'];
  const out = { ...t };
  for (const f of stringFields) {
    if (out[f] != null) out[f] = String(out[f]);
  }
  // Pad assignee back to 3 digits if it looks like a stripped numeric ID ("1" → "001")
  if (/^\d{1,2}$/.test(out.assignee)) out.assignee = out.assignee.padStart(3, '0');
  if (/^\d{1,2}$/.test(out.createdBy)) out.createdBy = out.createdBy.padStart(3, '0');
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

/* ─── Comments + Activity log helpers ─────────────────────────────
   Tier 2 task system: бүх үйлдэл бичигдсэн audit trail.
   Comments — creator/assignee/CEO-ийн харилцан яриа.
   Activity — статус өөрчлөгдсөн, баримт нэмэгдсэн г.м. system log. */

function uidShort() {
  return Math.random().toString(36).slice(2, 8);
}

// Сэтгэгдэл нэмэх. @mention — текстээс @id хэлбэрээр уншина.
async function addTaskComment(taskId, text, fileUrl = null) {
  const task = state.tasks.find(t => t.id === taskId);
  if (!task) return;
  if (!Array.isArray(task.comments)) task.comments = [];
  const mentions = [...String(text).matchAll(/@(\w+)/g)].map(m => m[1]);
  const comment = {
    id: uidShort(),
    author: state.me,
    text: String(text).slice(0, 2000),
    timestamp: Date.now(),
    file_url: fileUrl || null,
    mentions,
  };
  task.comments.push(comment);
  logTaskActivity(task, 'comment_added', { commentId: comment.id });
  await saveTask(task);
  return comment;
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
  task.status = newStatus;
  if (newStatus === 'in_progress') task.started_at = Date.now();
  if (newStatus === 'done') task.completed_at = Date.now();
  if (newStatus === 'declined') task.decline_reason = reason || '';
  logTaskActivity(task, 'status_changed', { from: oldStatus, to: newStatus, reason });
  await saveTask(task);
}

// Тодруулга хүсэх — сэтгэгдэл + activity log
async function requestTaskClarification(taskId, question) {
  const task = state.tasks.find(t => t.id === taskId);
  if (!task) return;
  await addTaskComment(taskId, `❓ Тодруулга хэрэгтэй: ${question}`);
  logTaskActivity(task, 'clarification_requested', { question });
  await saveTask(task);
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
      const r = await fetch(state.config.apiUrl + '?action=list&t=' + Date.now(), {
        cache: 'no-store',
        headers: { 'Cache-Control': 'no-cache' },
      });
      if (!r.ok) throw new Error('HTTP ' + r.status);
      const data = await r.json();
      const raw = Array.isArray(data) ? data : (data.tasks || []);
      state.tasks = raw.map(normalizeTask);
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
    const r = await fetch(url, {
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
      ? { action: w.action, request: w.payload }
      : { action: w.action, task: w.payload };
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
async function saveTask(task, deleted=false) {
  saveLocal();
  if (!state.config.apiUrl) return; // backend тохируулаагүй — зөвхөн локал
  const ok = await postWrite(state.config.apiUrl, { action: deleted ? 'delete' : 'upsert', task });
  if (ok) { flushPendingWrites(); }            // амжилттай — хуримтлагдсан backlog-оо бас илгээх
  else { enqueueWrite({ kind: 'task', action: deleted ? 'delete' : 'upsert', payload: task, ts: Date.now() }); }
}
function uid() { return 't_' + Math.random().toString(36).slice(2,10) + Date.now().toString(36); }

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
async function createOrderAct({ customer, eventDate, location, desc }) {
  const branch = 'm-event';
  const parentId = uid();
  const owner = state.me || getCEOId();
  const parent = {
    id: parentId,
    title: `📋 ${customer || 'Захиалга'} — ${eventDate || 'огноогүй'}`,
    desc: (location ? `📍 ${location}\n` : '') + (desc || ''),
    branch,
    project: 'event',
    assignee: owner,           // парент даалгаврыг үүсгэгч хариуцна
    due: eventDate || '',
    priority: 'high',
    status: 'open',
    kind: 'act_parent',
    createdBy: owner,
    created: Date.now(),
  };
  state.tasks.unshift(parent);
  await saveTask(parent);
  // Sub-tasks (5 stages) — assignee нь Master Sheet дахь role-аар автомат олдоно
  for (const tpl of ACT_TEMPLATE) {
    const assigneeId = tpl.role_pattern ? findMemberIdByRole(tpl.role_pattern, owner) : (tpl.role_id || owner);
    const sub = {
      id: uid(),
      title: `Дамжлага ${tpl.stage}: ${tpl.title}`,
      desc: '',
      branch,
      project: 'event',
      assignee: assigneeId,
      due: addDays(eventDate, tpl.offset),
      priority: tpl.priority,
      status: 'open',
      kind: 'act_stage',
      stage: tpl.stage,
      parent_id: parentId,
      createdBy: owner,
      created: Date.now() + tpl.stage,  // keep stable order
    };
    state.tasks.push(sub);
    await saveTask(sub);
  }
  return parent;
}

/* Финансын request-ийг task-уудтай адил render хийхэд адаптер хэлбэрт оруулах */
function financeAsTask(r) {
  const executorId = r.executor || getFinanceExecutorId();
  return {
    id: r.id,
    title: `💸 ${r.beneficiary || 'Хүсэлт'} — ${Number(r.amount || 0).toLocaleString('mn-MN')}₮`,
    desc: (r.purpose ? `Зорилго: ${r.purpose}\n` : '') + (r.justification || ''),
    branch: 'shared',
    project: 'finance',
    assignee: (r.decision === 'approved' && r.status !== 'done') ? executorId : getCEOId(),
    due: r.due_date || '',
    priority: 'high',
    status: r.status || 'open',
    kind: 'finance_request',
    amount: r.amount,
    decision: r.decision,
    executed_at: r.executed_at,
    createdBy: r.requested_by,
    created: r.requested_at ? new Date(r.requested_at).getTime() : 0,
    _isFinance: true, // marker
  };
}

/* -------------------- ФИНАНСЫН ХҮСЭЛТ (Finance request) --------------------
   Workflow:
     Ажилтан → submit → CEO (assignee автомат CEO) → CEO decision:
       Зөвшөөрөх  → assignee = S03 (Туслах нягтлан) → S03 гүйлгээ хийгээд ✓ done
       Татгалзах  → decision=rejected, status=done (хаагдсан)
       Хойшлуулах → due += 7 хоног, CEO дээр үлдэнэ */

// Туслах нягтлан — зөвшөөрсөн хүсэлтийг гүйцэтгэнэ. Hardcoded ID биш role-аар хайна
// (Master Sheet-д ID солигдсон ч role-аар хадгалагдсан хүн олдох ёстой).
function getFinanceExecutorId() {
  return findMemberIdByRole('нягтлан', 'CEO');
}

/* Зардлын стандарт ангилал — 2-түвшинт (Үндсэн → Дэд)
   CEO-аас 2026-05-18-нд баталсан стандарт. МНББС-тэй нийцсэн.
   Canonical Sheet: Чимун_ХХК_Зардлын_Ангилал_Стандарт.xlsx
   Дэлгэрэнгүйг гүйлгээний утга дээр чөлөөт текстээр бичнэ. */
const FINANCE_MAIN_CATEGORIES = [
  { code: '1000', name: 'Үйл ажиллагаа — Шууд' },
  { code: '2000', name: 'Үйл ажиллагаа — Тогтмол' },
  { code: '3000', name: 'Захиргаа' },
  { code: '4000', name: 'Маркетинг' },
  { code: '5000', name: 'Санхүү ба татвар' },
  { code: '6000', name: 'Хөрөнгийн зардал' },
  { code: '9000', name: 'Бусад ба тусгай' },
];

const FINANCE_SUB_CATEGORIES = {
  '1000': [
    { code: '1100', name: 'Гадны тоног түрээс' },
    { code: '1200', name: 'Угсралт, буулгалт, тээвэр' },
    { code: '1300', name: 'Нийлүүлэгчийн хоол, ундаа, чимэглэл' },
    { code: '1400', name: 'Урлагийн үйлчилгээ (гаднаас)' },
    { code: '1500', name: 'Зочны хэрэглээний материал' },
    { code: '1600', name: 'Зочны хоол ба түлш (өөрсдийн)' },
    { code: '1700', name: 'Цэвэрлэгээ, угаалга, арчилгаа' },
    { code: '1800', name: 'Ажилтны халамж (арга хэмжээ, хоног)' },
    { code: '1900', name: 'Сезоны цалин ба бусад' },
  ],
  '2000': [
    { code: '2100', name: 'Үндсэн ажилтны цалин' },
    { code: '2200', name: 'Тоног арчилгаа (тогтмол)' },
    { code: '2300', name: 'Шатахуун ба тээвэр' },
    { code: '2400', name: 'Байр, агуулах, газар' },
    { code: '2500', name: 'Холбоо (үйлдвэрлэлд)' },
    { code: '2900', name: 'Бусад тогтмол' },
  ],
  '3000': [
    { code: '3100', name: 'Удирдлагын цалин' },
    { code: '3200', name: 'Оффисын аж ахуй' },
    { code: '3300', name: 'Конторын түрээс, нийтийн үйлчилгээ' },
    { code: '3400', name: 'IT, онлайн програм' },
    { code: '3500', name: 'Утас, интернэт (захиргааны)' },
    { code: '3600', name: 'Даатгал, лиценз, зөвшөөрөл' },
    { code: '3700', name: 'Хууль зүйн зардал' },
    { code: '3800', name: 'Сургалт, семинар' },
    { code: '3900', name: 'Бусад захиргаа' },
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
    { code: '6300', name: 'Машин, тээврийн хэрэгсэл' },
    { code: '6400', name: 'Компьютер, утас, гаджет' },
    { code: '6500', name: 'Том засвар, шинэчлэл (>1сая)' },
    { code: '6600', name: 'Программын байнгын лиценз' },
    { code: '6700', name: 'Барилгын сайжруулалт' },
    { code: '6900', name: 'Бусад хөрөнгө' },
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
];

/* FINANCE_CATEGORIES + FINANCE_DEPT_BRANCHES backward-compat хасагдсан 2026-05-18.
   Кодын хаана ч уншигдахгүй болсон. Хэрэв хуучин код mention хийвэл
   FINANCE_MAIN_CATEGORIES + FINANCE_BRANCHES-аас шууд ашиглана. */
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
async function uploadReceipt(file, requestId, kind) {
  if (!file) return null;
  if (!state.config.uploadUrl) {
    showToast('Upload endpoint тохируулагдаагүй. Settings шалгана уу.', 'error');
    return null;
  }
  // File → base64 (FileReader)
  const base64 = await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
  try {
    const r = await fetch(state.config.uploadUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        filename: file.name,
        contentType: file.type || 'application/octet-stream',
        base64,
        request_id: requestId,
        kind,
      })
    });
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
  const ok = await postWrite(state.config.financeUrl, { action: deleted ? 'delete' : 'upsert', request: r });
  if (ok) { flushPendingWrites(); }
  else { enqueueWrite({ kind: 'finance', action: deleted ? 'delete' : 'upsert', payload: r, ts: Date.now() }); }
}

async function loadFinanceRequests() {
  if (state.config.financeUrl) {
    try {
      // Cache-bust — Sheet дээр шууд устгасан/засварласан хүсэлт нэн даруй тусахын тулд
      const res = await fetch(state.config.financeUrl + '?action=list&t=' + Date.now(), {
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

function normalizeFinance(r) {
  if (!r || typeof r !== 'object') return r;
  const stringFields = ['id','requested_by','beneficiary','purpose','justification','due_date',
    'status','decision','decision_at','decision_by','decision_reason',
    'executed_at','executed_by','executor','purchase_proof_url','payment_proof_url','purchase_receipt_url',
    'category','dept_branch','frequency','bank','account_number'];
  const out = { ...r };
  for (const f of stringFields) if (out[f] != null) out[f] = String(out[f]);
  if (out.amount != null && out.amount !== '') out.amount = Number(out.amount) || 0;
  // Pad numeric IDs
  if (/^\d{1,2}$/.test(out.requested_by)) out.requested_by = out.requested_by.padStart(3,'0');
  if (/^\d{1,2}$/.test(out.decision_by))  out.decision_by  = out.decision_by.padStart(3,'0');
  if (/^\d{1,2}$/.test(out.executed_by))  out.executed_by  = out.executed_by.padStart(3,'0');
  return out;
}

async function createFinanceRequest({ amount, purpose, beneficiary, justification, dueDate, category, deptBranch, frequency, bank, accountNumber }) {
  const owner = state.me || getCEOId();
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
    category: category || '9500',
    dept_branch: deptBranch || 'ХАМТ',
    frequency: frequency || 'Нэг удаагийн',
    status: 'open',
    decision: 'pending',
    decision_at: '',
    decision_by: '',
    decision_reason: '',
    executed_at: '',
    executed_by: '',
    executor: getFinanceExecutorId(), // Role-аар хайна, hardcoded ID биш
    purchase_proof_url: '',
    payment_proof_url: '',
    purchase_receipt_url: '',
  };
  state.financeRequests.unshift(r);
  await saveFinanceRequest(r);
  return r;
}

async function decideFinanceRequest(id, decision, reason = '') {
  const r = state.financeRequests.find(x => x.id === id);
  if (!r) return;
  if (!state.isCEO) { showToast('Зөвхөн CEO шийдвэр гаргах эрхтэй', 'error'); return; }
  r.decision = decision;
  r.decision_at = new Date().toISOString();
  r.decision_by = state.me;
  if (reason) r.decision_reason = reason;
  if (decision === 'approved') {
    // Approved үед executor-г динамикаар шинэчилнэ (Master Sheet-д нягтлан солигдсон бол шинэ хүн)
    r.executor = getFinanceExecutorId();
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
  input.style.display = show ? '' : 'none';
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
  el.innerHTML = `<a href="${escapeHtml(url)}" target="_blank" rel="noopener" style="color:var(--primary);text-decoration:underline;">📎 ${escapeHtml(label)} баримтыг харах</a>`;
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

  // Default reset
  submitActions.style.display = '';
  decisionActions.style.display = 'none';
  executeActions.style.display = 'none';
  receiptActions.style.display = 'none';
  decisionInfo.style.display = 'none';

  // Dropdown options-уудыг шинэчилэх (modal нээх бүрд)
  fillFinanceSelects();

  if (!t) {
    // NEW request — submit mode
    title.textContent = '💸 Санхүүгийн хүсэлт';
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
    document.getElementById('f-save').style.display = '';
  } else {
    // VIEW existing — populate read-only
    title.textContent = '💸 Хүсэлт #' + t.id.slice(-5);
    document.getElementById('f-amount').value = t.amount || '';
    document.getElementById('f-beneficiary').value = t.beneficiary || '';
    document.getElementById('f-bank').value = t.bank || '';
    document.getElementById('f-account').value = t.account_number || '';
    document.getElementById('f-purpose').value = t.purpose || '';
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
    document.getElementById('f-dept-branch').value = t.dept_branch || 'ХАМТ';
    document.getElementById('f-frequency').value = t.frequency || 'Нэг удаагийн';
    // Existing receipts харуулах
    renderProofPreview('f-purchase-preview', t.purchase_proof_url, 'Үнийн судалгаа');
    renderProofPreview('f-payment-preview', t.payment_proof_url, 'Төлбөрийн');
    renderProofPreview('f-receipt-preview', t.purchase_receipt_url, 'Худалдан авалтын');
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
    // Payment file picker зөвхөн approved + S03/CEO үед харагдана
    const showPayment = (t.decision === 'approved' && t.status !== 'done' && (state.me === getFinanceExecutorId() || state.isCEO));
    toggleFinanceFileInput('f-payment-file', showPayment);
    // Receipt picker — гүйцэтгэгдсэний дараа + requested_by (or CEO) — final receipt upload боломжтой
    const showReceipt = (t.status === 'done' && t.decision === 'approved' && !t.purchase_receipt_url &&
      (state.me === t.requested_by || state.isCEO));
    toggleFinanceFileInput('f-receipt-file', showReceipt);
    document.getElementById('f-save').style.display = 'none';

    // Decision banner — хоосон утга бол 'pending' гэж тооцох (Sheet sync-аас буцаж ирэхэд decision талбар хоосон байх магадлалтай)
    const dec = t.decision || 'pending';
    const requester = memberName(t.requested_by);
    const decisionLabels = {
      pending:  { bg:'var(--warn-soft)',    col:'var(--warn)',    icon:'🕐', text:'Хүлээгдэж буй' },
      approved: { bg:'var(--ok-soft)',      col:'var(--ok)',      icon:'✓',  text:'Зөвшөөрсөн' },
      rejected: { bg:'var(--danger-soft)',  col:'var(--danger)',  icon:'✗',  text:'Татгалзсан' },
      deferred: { bg:'var(--primary-soft)', col:'var(--primary)', icon:'🕐', text:'Хойшлогдсон' },
    };
    const d = decisionLabels[dec] || decisionLabels.pending;
    let info = `<div style="background:${d.bg};color:${d.col};padding:8px 12px;border-radius:6px;font-weight:600;">${d.icon} ${d.text}</div>`;
    info += `<div style="margin-top:6px;color:var(--muted);">Илгээгч: <strong>${escapeHtml(requester)}</strong>`;
    if (t.decision_by) info += ` · Шийдвэр гаргасан: <strong>${escapeHtml(memberName(t.decision_by))}</strong>`;
    if (t.executed_by) info += ` · Гүйцэтгэсэн: <strong>${escapeHtml(memberName(t.executed_by))}</strong>`;
    info += `</div>`;
    decisionInfo.innerHTML = info;
    decisionInfo.style.display = 'block';

    // Show appropriate actions — хоосон decision нь 'pending' гэж тооцогдоно
    if (dec === 'pending' && state.isCEO) {
      submitActions.style.display = 'none';
      decisionActions.style.display = 'flex';
    } else if (dec === 'approved' && t.status !== 'done' && (state.me === getFinanceExecutorId() || state.isCEO)) {
      submitActions.style.display = 'none';
      executeActions.style.display = 'flex';
    } else if (t.status === 'done' && t.decision === 'approved' && !t.purchase_receipt_url &&
               (state.me === t.requested_by || state.isCEO)) {
      // Final receipt upload step — requester эцсийн баримт хавсаргах
      submitActions.style.display = 'none';
      receiptActions.style.display = 'flex';
    } else {
      // Read-only view — show only "Болих" close button
      document.getElementById('f-save').style.display = 'none';
    }
  }
  modal.classList.add('open');
}

async function executeFinanceRequest(id) {
  const r = state.financeRequests.find(x => x.id === id);
  if (!r) return;
  if (r.decision !== 'approved') { showToast('Зөвхөн зөвшөөрсөн хүсэлтийг гүйцэтгэх боломжтой', 'warn'); return; }
  const executorId = r.executor || getFinanceExecutorId();
  if (state.me !== executorId && !state.isCEO) {
    showToast('Зөвхөн Туслах нягтлан гүйлгээ хийх эрхтэй', 'error'); return;
  }
  r.executed_at = new Date().toISOString();
  r.executed_by = state.me;
  r.status = 'done';
  await saveFinanceRequest(r);
  showToast('Гүйлгээ хийгдсэн гэж тэмдэглэгдсэн.', 'success');
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
function memberName(id) {
  if (!id) return '(сонгох)';
  const m = TEAM.find(x => x.id === id);
  if (m) return m.name;
  // ID олдсонгүй — Master Sheet-аас ажилтан хасагдсан магадгүй
  return `(${id} — алга)`;
}
function memberInitials(id) {
  if (!id) return '?';
  const m = TEAM.find(x => x.id === id);
  if (!m) return '⚠';
  return m.name.replace(/\./g,'').slice(0,2);
}

/* Role-аар хайх — ID-аас үл хамаарсан resilient lookup.
   Master Sheet-д ID солигдсон ч "Туслах нягтлан" role-той хүн олдох ёстой. */
function findMemberByRole(rolePattern) {
  const re = new RegExp(rolePattern, 'i');
  return TEAM.find(t => re.test(t.role || ''));
}
function findMemberIdByRole(rolePattern, fallback = 'CEO') {
  const m = findMemberByRole(rolePattern);
  return m ? m.id : fallback;
}
// CEO-ийн ID-г динамикаар олох (level === 100). Master Sheet-д ID өөрчилсөн ч CEO олдоно.
function getCEOId() {
  const m = TEAM.find(t => (t.level || 0) >= 100);
  return m ? m.id : 'CEO';
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
function filteredTasks() {
  let list = [...state.tasks];
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
    // Финансын хүсэлтийг task-loga adapter-аар render хийнэ
    list = state.financeRequests.map(financeAsTask);
    // 'mine' эсвэл 'delegated' гэх view-ийн адил accessrolгүүл явна
    if (!state.isCEO && state.me) {
      list = list.filter(r => r.assignee === state.me || r.createdBy === state.me);
    }
  }
  else if (state.view === 'overdue') list = list.filter(t => t.status === 'open' && t.due && t.due < today);
  else if (state.view === 'today') list = list.filter(t => t.due === today);
  else if (state.view === 'done') list = list.filter(t => t.status === 'done');
  else if (state.view.startsWith('project:')) {
    const pid = state.view.split(':')[1];
    list = list.filter(t => t.project === pid);
  }
  // status filter (Бүгд / Идэвхтэй / Хоцорсон / Өнөөдөр / Дууссан)
  if (state.statusFilter === 'open') list = list.filter(t => t.status !== 'done');
  else if (state.statusFilter === 'done') list = list.filter(t => t.status === 'done');
  else if (state.statusFilter === 'overdue') list = list.filter(t => t.status !== 'done' && t.due && t.due < today);
  else if (state.statusFilter === 'today') list = list.filter(t => t.status !== 'done' && t.due === today);
  // search
  if (state.search) {
    const q = state.search.toLowerCase();
    list = list.filter(t => (t.title||'').toLowerCase().includes(q) || (t.desc||'').toLowerCase().includes(q));
  }
  // sort: open first, then by due asc, then created desc
  list.sort((a,b) => {
    if ((a.status==='done') !== (b.status==='done')) return a.status==='done' ? 1 : -1;
    const ad = a.due || '9999-12-31', bd = b.due || '9999-12-31';
    if (ad !== bd) return ad < bd ? -1 : 1;
    return (b.created||0) - (a.created||0);
  });
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

/* -------------------- RENDER -------------------- */
function render() {
  renderSidebar();
  renderTitle();
  renderTaskList();
  renderCounts();
  renderNotifications();
}
function renderSidebar() {
  // active nav
  document.querySelectorAll('.nav-item').forEach(el => {
    el.classList.toggle('active', el.dataset.view === state.view);
  });
  // brand reflects current branch so the user always knows which space they're in
  const info = currentBranchInfo();
  const brandEl = document.getElementById('brand-text');
  if (brandEl) brandEl.textContent = info.icon + ' ' + info.name;
  // projects (only for current branch)
  const list = document.getElementById('project-list');
  list.innerHTML = '';
  currentProjects().forEach(p => {
    const div = document.createElement('div');
    div.className = 'project-item' + (state.view === 'project:'+p.id ? ' active':'');
    const cnt = state.tasks.filter(t =>
      t.project === p.id && taskBranch(t) === state.branch && t.status !== 'done'
    ).length;
    div.innerHTML = `<span>${escapeHtml(p.name)}</span><span class="count-badge">${cnt}</span>`;
    div.onclick = () => { state.view = 'project:'+p.id; render(); };
    list.appendChild(div);
  });
}
function renderTitle() {
  const titles = {
    mine:      ['📥 Ирсэн ажил', 'Танд оноосон ажлууд'],
    delegated: ['📤 Илгээсэн ажил', 'Та өөр хүнд оноосон ажлууд'],
    finance:   ['💸 Санхүүгийн хүсэлт', 'Зөвшөөрөл хүлээж буй болон гүйцэтгэгдсэн'],
    all:       ['Бүгд','Бүх checklist'],
    overdue:   ['Хоцорсон','Эцсийн хугацаа өнгөрсөн'],
    today:     ['Өнөөдөр','Өнөөдөр дуусах ёстой'],
    done:      ['Дууссан','Биелсэн даалгаврууд'],
  };
  let t = titles[state.view];
  if (!t && state.view.startsWith('project:')) {
    const pid = state.view.split(':')[1];
    t = [projectName(pid), 'Төсөл'];
  }
  document.getElementById('view-title').textContent = (t||['Бүгд'])[0];
  document.getElementById('view-sub').textContent = (t||['','Бүх'])[1] || '';
}
function renderTaskList() {
  const wrap = document.getElementById('task-list');
  const tasks = filteredTasks();
  wrap.innerHTML = '';
  if (!tasks.length) {
    wrap.innerHTML = emptyStateHtml();
    return;
  }
  tasks.forEach(t => wrap.appendChild(renderRow(t)));
}
function emptyStateHtml() {
  // View-ийн дагуу contextual empty state
  let icon = '📋', title = 'Даалгавар алга', sub = '+ Шинэ дарж нэмнэ үү';
  const v = state.view;
  if (v === 'mine')     { icon = '🎯'; title = 'Танд оноосон ажил алга'; sub = 'Бүх ажилаа дуусгасан байна. Сайн байна!'; }
  else if (v === 'delegated') { icon = '📤'; title = 'Үүргэсэн ажил алга'; sub = 'Та өөр хүнд хариуцуулсан ажил байхгүй байна. + Шинэ дарж оноо.'; }
  else if (v === 'finance')   { icon = '💸'; title = 'Санхүүгийн хүсэлт алга'; sub = '💸 Хүсэлт дарж шинэ төлбөрийн хүсэлт илгээнэ үү.'; }
  else if (v === 'overdue') { icon = '🎉'; title = 'Хоцорсон даалгавар алга'; sub = 'Бүх хугацаа дотроо явж байна.'; }
  else if (v === 'today')   { icon = '☕'; title = 'Өнөөдөр дуусах юм алга'; sub = 'Тайван өдөр болж байна.'; }
  else if (v === 'done')    { icon = '🗂'; title = 'Дууссан ажил алга'; sub = 'Шинэ ажилаа эхлээрэй.'; }
  else if (state.statusFilter === 'done') { icon = '✅'; title = 'Дуусгасан ажил алга'; sub = 'Идэвхтэй ажлуудаа үргэлжлүүл.'; }
  else if (state.search)    { icon = '🔍'; title = `"${state.search}" гэж олдсонгүй`; sub = 'Өөр түлхүүр үг туршаарай.'; }
  return `<div class="empty"><div class="icon">${icon}</div><div class="title">${escapeHtml(title)}</div><div class="sub">${escapeHtml(sub)}</div></div>`;
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
    const decisionPills = {
      pending:  '<span class="finance-pill pending">🕐 Хүлээгдэж буй</span>',
      approved: '<span class="finance-pill approved">✓ Зөвшөөрсөн · Гүйлгээ хүлээж буй</span>',
      rejected: '<span class="finance-pill rejected">✗ Татгалзсан</span>',
      deferred: '<span class="finance-pill deferred">🕐 Хойшлогдсон</span>',
    };
    const pill = decisionPills[t.decision || 'pending'] || decisionPills.pending;
    extraHtml += pill;
    if (t.status === 'done' && (t.decision === 'approved' || t.executed_at)) {
      extraHtml += '<span class="finance-pill executed">💵 Гүйцэтгэсэн</span>';
    }
  }

  // Status dot — shows current task state subtly
  const statusClass = t.status === 'done' ? 'done'
                    : t.status === 'in_progress' ? 'in_progress'
                    : t.status === 'declined' ? 'declined'
                    : 'open';
  row.innerHTML = `
    <div>
      <div class="checkbox ${t.status==='done'?'checked':''}" data-act="toggle"></div>
    </div>
    <div class="task-title-wrap" data-act="open">
      <div class="task-title" data-act="open">${titleHtml}${extraHtml}</div>
      <div class="task-meta" data-act="open">
        <span class="status-dot ${statusClass}" title="${statusClass === 'in_progress' ? 'Хийгдэж байна' : statusClass === 'declined' ? 'Татгалзсан' : statusClass === 'done' ? 'Дууссан' : 'Шинэ'}"></span>
        <span class="meta-mobile-only avatar-circle sm" style="display:none;background:linear-gradient(135deg,var(--primary),var(--primary-hover));">${escapeHtml(memberInitials(t.assignee))}</span>
        <span class="meta-mobile-only" style="display:none;color:var(--text-soft);font-weight:500;">${escapeHtml(memberName(t.assignee))}</span>
        ${t.due ? `<span class="meta-mobile-only meta-dot" style="display:none;"></span><span class="meta-mobile-only meta-due ${dc}" style="display:none;color:${dc==='overdue' ? 'var(--danger)' : dc==='soon' ? 'var(--warn)' : 'var(--muted)'};font-weight:${dc ? '600' : '400'};">${fmtDate(t.due)}</span>` : ''}
        ${t.priority && t.priority !== 'none' ? `<span class="meta-mobile-only" style="display:none;color:${t.priority==='high'?'var(--danger)':t.priority==='med'?'var(--warn)':'var(--ok)'};">●</span>` : ''}
        <span class="meta-desktop-only meta-project">${escapeHtml(projectName(t.project) || 'Төсөлгүй')}</span>
        ${t.createdBy && t.createdBy !== t.assignee
          ? `<span class="meta-desktop-only meta-dot"></span><span class="meta-desktop-only delegated-from">${escapeHtml(memberName(t.createdBy))}</span>`
          : ''}
        ${t.comments && t.comments.length ? `<span class="meta-dot"></span><span title="${t.comments.length} сэтгэгдэл">💬 ${t.comments.length}</span>` : ''}
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
        ${({high:'Өндөр',med:'Дунд',low:'Бага',none:'—'})[t.priority||'none']}
      </span>
    </div>
    <div>
      ${(() => {
        const can = canDeleteTask(t);
        if (can.ok) return '<button class="delete-btn" title="Устгах" data-act="delete">×</button>';
        const who = can.creator ? can.creator.name : 'дээд тушаалтан';
        return `<button class="delete-btn locked" title="${escapeHtml(who)} үүсгэсэн — устгах эрхгүй" data-act="locked">🔒</button>`;
      })()}
    </div>
  `;
  row.addEventListener('click', (e) => {
    const act = e.target.closest('[data-act]')?.dataset.act;
    // Finance request — special modal
    if (isFinance && (act === 'open' || act === 'edit-title')) {
      openFinanceModal(t.id);
      return;
    }
    if (act === 'toggle' && isFinance) {
      // Finance row-н checkbox дарвал finance modal-ыг execute mode-руу нээх
      openFinanceModal(t.id);
      return;
    }
    if (act === 'toggle') toggleTask(t.id);
    else if (act === 'delete') deleteTask(t.id);
    else if (act === 'locked') {
      const can = canDeleteTask(t);
      const who = can.creator ? `${can.creator.name} (${can.creator.role})` : 'дээд албан тушаалтан';
      showToast(`${who} үүсгэсэн даалгавар. Устгах эрх танд алга. Биелүүлсэн бол ✓ тэмдэглээрэй.`, 'warn', 4500);
    }
    else if (act === 'open' || !act) {
      // Гарчиг, тайлбар эсвэл хоосон газар — модал нээх
      openTaskModal(t.id);
    }
  });
  row.querySelector('.task-title').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { e.preventDefault(); e.target.blur(); }
  });
  return row;
}
function renderCounts() {
  const today = todayStr();
  // Apply access control to base task list — non-CEO sees only own tasks
  const accessible = state.isCEO
    ? state.tasks
    : state.tasks.filter(t => t.assignee === state.me);
  // Branch filter disabled — бүх task ижилхэн тоологдоно.
  const branchTasks = accessible;
  document.getElementById('cnt-all').textContent     = branchTasks.filter(t => t.status !== 'done').length;
  document.getElementById('cnt-mine').textContent    = accessible.filter(t => t.assignee === state.me && t.status !== 'done').length;
  document.getElementById('cnt-delegated').textContent = accessible.filter(t => t.createdBy === state.me && t.assignee !== state.me && t.status !== 'done').length;
  // Финансын хүсэлт нь state.financeRequests-ээс ирнэ (тусдаа Sheet)
  const executorId = getFinanceExecutorId();
  const myFinance = state.isCEO
    ? state.financeRequests
    : state.financeRequests.filter(r => r.requested_by === state.me ||
        (r.decision === 'approved' && r.status !== 'done' && (r.executor || executorId) === state.me));
  document.getElementById('cnt-finance').textContent = myFinance.filter(r => r.status !== 'done').length;
  document.getElementById('cnt-overdue').textContent = branchTasks.filter(t => t.status !== 'done' && t.due && t.due < today).length;
  document.getElementById('cnt-today').textContent   = branchTasks.filter(t => t.due === today).length;
  document.getElementById('cnt-done').textContent    = branchTasks.filter(t => t.status === 'done').length;
}
function escapeHtml(s) {
  // Defensive: Google Sheets sometimes returns numbers/booleans where we expected strings
  // (e.g. assignee "001" → 1). Coerce to string before replacing.
  return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}

/* -------------------- ACTIONS -------------------- */
async function toggleTask(id) {
  const t = state.tasks.find(x=>x.id===id); if (!t) return;
  // Going from open → done: enforce 5-stage dependency for act sub-tasks
  if (t.status !== 'done') {
    const block = canCompleteSubtask(t);
    if (!block.ok) {
      const prev = block.prev;
      showToast(`Энэ дамжлагыг дуусгахын өмнө "${prev.title}" дуусгасан байх ёстой. Хариуцагч: ${memberName(prev.assignee)}`, 'warn', 4500);
      return;
    }
  } else {
    // Going from done → open: warn if a later stage is already done (would create inconsistency)
    if (t.kind === 'act_stage' && t.parent_id) {
      const next = state.tasks.find(x => x.parent_id === t.parent_id && Number(x.stage) === Number(t.stage) + 1 && x.status === 'done');
      if (next && !(await showConfirm(`Дараагийн дамжлага "${next.title}" аль хэдийн дуусчихсан байна. Энэ дамжлагыг буцаах уу?`, { okText: 'Буцаах', danger: true }))) return;
    }
  }
  t.status = t.status === 'done' ? 'open' : 'done';
  saveTask(t);
  // If this was the last sub-task and all are done, also auto-complete the parent
  if (t.status === 'done' && t.parent_id) {
    const parent = state.tasks.find(x => x.id === t.parent_id);
    if (parent && parent.status !== 'done') {
      const p = actProgress(parent.id);
      if (p.total > 0 && p.done === p.total) {
        parent.status = 'done';
        saveTask(parent);
      }
    }
  }
  render();
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
  const creator = TEAM.find(m => m.id === t.createdBy);
  const creatorLevel = creator ? (creator.level || 0) : 100;
  const myLevel = state.myLevel || 0;
  // Үүсгэгчээс ДЭЭГҮҮР түвшинтэй
  if (myLevel > creatorLevel) return { all: true, status: true, none: false };
  // Хариуцагч — зөвхөн status солих
  if (state.me === t.assignee) return { all: false, status: true, none: false };
  // Бусад — зөвхөн харах
  return { all: false, status: false, none: true };
}

function canDeleteTask(t) {
  // CEO can always delete. Others can only delete tasks created by someone at
  // their rank or below. Tasks with no `createdBy` are treated as CEO-created
  // (most cautious — only CEO can clean them up).
  if (state.isCEO) return { ok: true };
  const creator = TEAM.find(m => m.id === t.createdBy);
  const creatorLevel = creator ? (creator.level || 0) : 100;
  const myLevel = state.myLevel || 0;
  if (creatorLevel > myLevel) {
    return { ok: false, creator };
  }
  return { ok: true };
}
async function deleteTask(id) {
  const t = state.tasks.find(x=>x.id===id);
  if (!t) return;
  // Hierarchical access control — block delete of higher-rank tasks
  const check = canDeleteTask(t);
  if (!check.ok) {
    const who = check.creator ? `${check.creator.name} (${check.creator.role})` : 'дээд албан тушаалтан';
    showToast(`Энэ даалгаврыг ${who} үүсгэсэн тул устгах эрх танд алга. Биелүүлсэн бол ✓ тэмдэглээрэй.`, 'warn', 4500);
    return;
  }
  // Special confirm + cascade for 5-stage act parents
  if (t.kind === 'act_parent') {
    const subs = state.tasks.filter(x => x.parent_id === t.id);
    if (!(await showConfirm(`"${t.title}" + ${subs.length} sub-task бүгдийг хамт устгана. Та итгэлтэй байна уу?`, { okText: 'Устгах', danger: true }))) return;
    const idsToRemove = new Set([t.id, ...subs.map(s => s.id)]);
    state.tasks = state.tasks.filter(x => !idsToRemove.has(x.id));
    saveTask(t, true);
    subs.forEach(s => saveTask(s, true));
    render();
    return;
  }
  if (!(await showConfirm('Энэ даалгаврыг устгах уу?', { okText: 'Устгах', danger: true }))) return;
  state.tasks = state.tasks.filter(x=>x.id!==id);
  saveTask(t, true);
  render();
}
function openTaskModal(id) {
  const t = id ? state.tasks.find(x=>x.id===id) : null;
  state.editingId = id || null;

  // Permission check — existing task үед canEditTask тогтооно
  const canEdit = t ? canEditTask(t) : { all: true, status: true, none: false };
  state._modalCanEdit = canEdit;

  // Header текст
  if (!t) {
    document.getElementById('task-modal-title').textContent = 'Шинэ даалгавар';
  } else if (canEdit.all) {
    document.getElementById('task-modal-title').textContent = 'Даалгавар засах';
  } else if (canEdit.status) {
    document.getElementById('task-modal-title').textContent = 'Даалгавар (зөвхөн харах)';
  } else {
    document.getElementById('task-modal-title').textContent = 'Даалгавар';
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
    creatorInfo.innerHTML = info;
    creatorInfo.style.display = 'block';
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
  document.getElementById('t-due').value = t?.due || '';
  document.getElementById('t-priority').value = t?.priority || 'none';
  // Branch солих үед зөвхөн төслийн жагсаалт шинэчилнэ.
  // Хариуцагч нь бүх ажилтнаас сонгох тул дахин filter хийхгүй.
  document.getElementById('t-branch').onchange = (e) => {
    fillProjectSelect('t-project', null, e.target.value);
  };

  // Permission lock — canEdit.all биш бол input-уудыг readonly + Save товчийг нуух
  const inputIds = ['t-title','t-desc','t-branch','t-project','t-assignee','t-due','t-priority'];
  inputIds.forEach(iid => {
    const el = document.getElementById(iid);
    if (!el) return;
    if (canEdit.all) {
      el.removeAttribute('readonly');
      el.removeAttribute('disabled');
      el.style.opacity = '';
    } else {
      // textarea/input: readonly; select: disabled (Safari doesn't honor readonly on select)
      if (el.tagName === 'SELECT') el.setAttribute('disabled','disabled');
      else el.setAttribute('readonly','readonly');
      el.style.opacity = '0.7';
    }
  });
  const saveBtn = document.getElementById('t-save');
  if (saveBtn) saveBtn.style.display = canEdit.all ? '' : 'none';

  // ─── СТАТУС ТОВЧНУУД, СЭТГЭГДЭЛ, ҮЙЛДЛИЙН ТҮҮХ ───
  // Зөвхөн хадгалагдсан task үед харагдана (шинэ task үүсэхээс өмнө хоосон)
  const statusBar = document.getElementById('t-status-bar');
  const commentsSec = document.getElementById('t-comments-section');
  const activitySec = document.getElementById('t-activity-section');
  if (t) {
    renderTaskActionButtons(t);
    statusBar.style.display = '';
    renderTaskComments(t);
    commentsSec.style.display = '';
    renderTaskActivity(t);
    activitySec.style.display = '';
  } else {
    statusBar.style.display = 'none';
    commentsSec.style.display = 'none';
    activitySec.style.display = 'none';
  }

  document.getElementById('task-modal').classList.add('open');
  if (canEdit.all && !t) setTimeout(()=>document.getElementById('t-title').focus(), 50);
}

/* ─── Task modal: Action товчнууд (статус өөрчлөх + татгалзах + тодруулга) ─── */
function renderTaskActionButtons(t) {
  const bar = document.getElementById('t-action-buttons');
  const isAssignee = (state.me === t.assignee);
  const isCreator  = (state.me === t.createdBy);
  const isCEO      = state.isCEO;
  const canAct     = isAssignee || isCreator || isCEO;
  const status     = t.status || 'open';

  const btns = [];
  // Эхлүүлэх — assignee/CEO, төлөв open эсвэл declined
  if (canAct && (status === 'open' || status === 'declined')) {
    btns.push(`<button class="btn btn-action" data-action="start" style="background:#3b82f6;color:#fff;padding:8px 14px;font-size:13px;border-radius:6px;border:none;cursor:pointer;">▶ Эхлүүлэх</button>`);
  }
  // Дуусгах — assignee/CEO, in_progress эсвэл open үед
  if (canAct && status !== 'done' && status !== 'declined') {
    btns.push(`<button class="btn btn-action" data-action="done" style="background:#10b981;color:#fff;padding:8px 14px;font-size:13px;border-radius:6px;border:none;cursor:pointer;">✓ Дуусгасан</button>`);
  }
  // Дахин нээх — done төлөвийг буцаах
  if (canAct && status === 'done') {
    btns.push(`<button class="btn btn-action" data-action="reopen" style="background:#f59e0b;color:#fff;padding:8px 14px;font-size:13px;border-radius:6px;border:none;cursor:pointer;">↶ Дахин нээх</button>`);
  }
  // Татгалзах — assignee, эсвэл CEO. Зөвхөн open/in_progress
  if ((isAssignee || isCEO) && (status === 'open' || status === 'in_progress')) {
    btns.push(`<button class="btn btn-action" data-action="decline" style="background:#ef4444;color:#fff;padding:8px 14px;font-size:13px;border-radius:6px;border:none;cursor:pointer;">✗ Татгалзах</button>`);
  }
  // Тодруулга хүсэх — assignee, аль ч төлөвт
  if (isAssignee && status !== 'done') {
    btns.push(`<button class="btn btn-action" data-action="clarify" style="background:#8b5cf6;color:#fff;padding:8px 14px;font-size:13px;border-radius:6px;border:none;cursor:pointer;">❓ Тодруулга</button>`);
  }
  // Төлвийн badge
  const statusLabels = {
    open:        { text: 'Шинэ',         bg: 'var(--warn-soft)',   col: 'var(--warn)' },
    in_progress: { text: 'Хийгдэж байна', bg: 'var(--info-soft)',   col: 'var(--info)' },
    done:        { text: 'Дууссан',      bg: 'var(--ok-soft)',     col: 'var(--ok)' },
    declined:    { text: 'Татгалзсан',   bg: 'var(--danger-soft)', col: 'var(--danger)' },
  };
  const sl = statusLabels[status] || statusLabels.open;
  let html = `<span style="padding:6px 12px;background:${sl.bg};color:${sl.col};border-radius:6px;font-size:12px;font-weight:600;margin-right:4px;">${sl.text}</span>`;
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
    showToast('Даалгавар дууссан', 'success');
  } else if (action === 'reopen') {
    await changeTaskStatus(taskId, 'open');
    showToast('Дахин нээгдсэн', 'warn');
  } else if (action === 'decline') {
    const reason = await showPrompt('Яагаад татгалзаж байна вэ? (заавал)', { placeholder: 'Шалтгаан...', okText: 'Татгалзах' });
    if (!reason || !reason.trim()) { showToast('Шалтгаан шаардлагатай', 'warn'); return; }
    await changeTaskStatus(taskId, 'declined', reason.trim());
    showToast('Татгалзсан. Үүсгэгчид мэдэгдэв.', 'warn');
  } else if (action === 'clarify') {
    const q = await showPrompt('Юу тодруулмаар байна вэ?', { placeholder: 'Жишээ: Тоног төхөөрөмжийн жагсаалт хаана байна?', okText: 'Илгээх' });
    if (!q || !q.trim()) return;
    await requestTaskClarification(taskId, q.trim());
    showToast('Тодруулга илгээсэн', 'success');
  }
  // Modal-ыг шинэчлэх (action товчнууд + comments + activity)
  renderTaskActionButtons(t);
  renderTaskComments(t);
  renderTaskActivity(t);
  render();
}

/* ─── Task modal: Сэтгэгдэл (Comments) ─── */
function renderTaskComments(t) {
  const list = document.getElementById('t-comments-list');
  const comments = t.comments || [];
  if (!comments.length) {
    list.innerHTML = `<div style="color:var(--muted);font-size:12px;padding:6px;">Сэтгэгдэл алга. Эхний санаагаа бичээрэй.</div>`;
    return;
  }
  list.innerHTML = comments.map(c => {
    const author = memberName(c.author);
    const time = new Date(c.timestamp).toLocaleString('mn-MN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    const mine = (c.author === state.me);
    const textHtml = renderCommentText(c.text);
    const fileHtml = c.file_url ? `<a href="${escapeHtml(c.file_url)}" target="_blank" rel="noopener" style="display:block;margin-top:4px;color:var(--primary);font-size:12px;">📎 Хавсралт</a>` : '';
    return `<div style="background:${mine ? 'var(--info-soft)' : 'var(--panel-hover)'};border-left:3px solid ${mine ? 'var(--info)' : 'var(--muted-soft)'};padding:8px 10px;border-radius:6px;">
      <div style="font-size:11px;color:var(--muted);margin-bottom:3px;"><strong>${escapeHtml(author)}</strong> · ${escapeHtml(time)}</div>
      <div style="font-size:13px;white-space:pre-wrap;word-break:break-word;">${textHtml}</div>
      ${fileHtml}
    </div>`;
  }).join('');
  // Scroll to bottom
  list.scrollTop = list.scrollHeight;
}

// Сэтгэгдлийн @mention-ийг hyperlink-аар render хийх
function renderCommentText(text) {
  if (!text) return '';
  let html = escapeHtml(text);
  html = html.replace(/@(\w+)/g, (match, id) => {
    const name = memberName(id);
    if (name === id) return match; // mapping олдсонгүй — текстээр үлдээ
    return `<span style="background:var(--warn-soft);color:var(--warn);padding:1px 4px;border-radius:3px;font-weight:600;">@${escapeHtml(name)}</span>`;
  });
  return html;
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
  list.innerHTML = activity.slice().reverse().map(a => {
    const who = memberName(a.actor);
    const when = new Date(a.timestamp).toLocaleString('mn-MN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    let line = `<strong>${escapeHtml(who)}</strong> — ${escapeHtml(actionLabels[a.action] || a.action)}`;
    if (a.action === 'status_changed' && a.details) {
      const from = statusNames[a.details.from] || a.details.from;
      const to = statusNames[a.details.to] || a.details.to;
      line += `: <em>${escapeHtml(from)}</em> → <em>${escapeHtml(to)}</em>`;
      if (a.details.reason) line += ` (${escapeHtml(a.details.reason)})`;
    }
    return `<div>${line} <span style="color:var(--muted-soft);">· ${escapeHtml(when)}</span></div>`;
  }).join('');
}
function closeTaskModal() {
  document.getElementById('task-modal').classList.remove('open');
  state.editingId = null;
}
function saveTaskFromModal() {
  const title = document.getElementById('t-title').value.trim();
  if (!title) { showToast('Гарчиг шаардлагатай', 'warn'); return; }
  const data = {
    title,
    desc: document.getElementById('t-desc').value.trim(),
    branch: document.getElementById('t-branch').value || state.branch,
    project: document.getElementById('t-project').value,
    assignee: document.getElementById('t-assignee').value,
    due: document.getElementById('t-due').value || '',
    priority: document.getElementById('t-priority').value,
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
  }
  closeTaskModal();
  render();
}
async function addProject() {
  const name = await showPrompt('Шинэ төслийн нэр (' + currentBranchInfo().name + ' дотор үүснэ):', { title: 'Шинэ төсөл', okText: 'Нэмэх' });
  if (!name || !name.trim()) return;
  const id = 'p_' + Date.now().toString(36);
  if (!state.projectsByBranch[state.branch]) state.projectsByBranch[state.branch] = [];
  state.projectsByBranch[state.branch].push({ id, name: name.trim() });
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
  const prioMn = { high: 'Өндөр', med: 'Дунд', low: 'Бага', none: '—' };
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
    (t.comments || []).length,
    t.created ? new Date(t.created).toLocaleDateString('mn-MN') : '',
  ].map(csvCell).join(','));
  const header = ['Гарчиг', 'Хариуцагч', 'Үүсгэгч', 'Төсөл', 'Зэрэглэл', 'Төлөв', 'Эцсийн огноо', 'Хоцорсон', 'Сэтгэгдэл', 'Үүсгэсэн'].join(',');
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
  const branch = branchOverride || state.branch;
  const projects = state.projectsByBranch[branch] || [];
  fillSelect(id, projects.map(p => ({ value: p.id, label: p.name })), value);
}
function fillAssigneeSelect(id, value, branchOverride) {
  // Бүх ажилтан — салбараар хязгаарлахгүй. Хэн ч хэнд ч даалгавар өгч болно.
  // (Жишээ нь Алтансүх Анужинд, Анужин Алтансүхэд даалгавар өгөх).
  fillSelect(id, TEAM.map(m => ({ value: m.id, label: m.name + ' (' + m.role + ')' })), value);
}
function fillBranchSelectInModal(id, value) {
  fillSelect(id, BRANCHES.map(b => ({ value: b.id, label: b.icon + ' ' + b.name })), value);
}

function initEvents() {
  document.querySelectorAll('.nav-item').forEach(el => {
    el.onclick = () => { state.view = el.dataset.view; render(); };
  });
  document.querySelectorAll('.filter-pill').forEach(el => {
    el.onclick = () => {
      document.querySelectorAll('.filter-pill').forEach(x => x.classList.remove('active'));
      el.classList.add('active');
      state.statusFilter = el.dataset.status;
      render();
    };
  });
  document.getElementById('add-project').onclick = addProject;
  document.getElementById('new-task-btn').onclick = () => openTaskModal();
  document.getElementById('t-cancel').onclick = closeTaskModal;
  document.getElementById('t-save').onclick = saveTaskFromModal;

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
  // FAB — шинэ ажил
  document.getElementById('fab-new')?.addEventListener('click', () => openTaskModal());

  // Theme toggle товч
  document.getElementById('theme-toggle')?.addEventListener('click', () => {
    toggleTheme();
    updateThemeIcon();
  });

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

  // ─── Сэтгэгдэл илгээх ───
  document.getElementById('t-comment-send')?.addEventListener('click', async () => {
    if (!state.editingId) return;
    const input = document.getElementById('t-comment-input');
    const fileInput = document.getElementById('t-comment-file');
    const text = input.value.trim();
    if (!text && !fileInput.files[0]) { showToast('Сэтгэгдэл бичих эсвэл файл хавсаргах', 'warn'); return; }
    let fileUrl = null;
    if (fileInput.files[0]) {
      showToast('Файл upload хийж байна...', '', 1500);
      fileUrl = await uploadReceipt(fileInput.files[0], state.editingId, 'comment');
    }
    await addTaskComment(state.editingId, text || '(файл)', fileUrl);
    input.value = '';
    fileInput.value = '';
    const t = state.tasks.find(x => x.id === state.editingId);
    if (t) { renderTaskComments(t); renderTaskActivity(t); }
  });

  // ─── @mention popup (textarea-д @ дарахад нээгдэнэ) ───
  const commentInput = document.getElementById('t-comment-input');
  const mentionPopup = document.getElementById('t-mention-popup');
  if (commentInput && mentionPopup) {
    commentInput.addEventListener('input', () => {
      const val = commentInput.value;
      const cursor = commentInput.selectionStart;
      const before = val.slice(0, cursor);
      const match = before.match(/@(\w*)$/);
      if (!match) { mentionPopup.style.display = 'none'; return; }
      const query = match[1].toLowerCase();
      const candidates = TEAM.filter(m =>
        m.id.toLowerCase().includes(query) || m.name.toLowerCase().includes(query)
      ).slice(0, 8);
      if (!candidates.length) { mentionPopup.style.display = 'none'; return; }
      mentionPopup.innerHTML = candidates.map(m =>
        `<div data-mid="${escapeHtml(m.id)}" style="padding:6px 10px;cursor:pointer;font-size:13px;border-bottom:1px solid var(--border);" onmouseover="this.style.background='var(--panel-hover)'" onmouseout="this.style.background=''">${escapeHtml(m.name)} <span style="color:var(--muted);font-size:11px;">(${escapeHtml(m.id)})</span></div>`
      ).join('');
      mentionPopup.style.display = 'block';
      mentionPopup.querySelectorAll('[data-mid]').forEach(el => {
        el.onclick = () => {
          const mid = el.dataset.mid;
          const newBefore = before.replace(/@\w*$/, `@${mid} `);
          commentInput.value = newBefore + val.slice(cursor);
          commentInput.focus();
          commentInput.setSelectionRange(newBefore.length, newBefore.length);
          mentionPopup.style.display = 'none';
        };
      });
    });
    commentInput.addEventListener('blur', () => {
      setTimeout(() => { mentionPopup.style.display = 'none'; }, 150);
    });
  }

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
  document.getElementById('f-cancel')?.addEventListener('click', () => document.getElementById('finance-modal').classList.remove('open'));
  // "Дэлгэрэнгүй" expander товч — нуугдсан талбаруудыг харуулах/нуух
  document.getElementById('f-toggle-advanced')?.addEventListener('click', () => {
    const adv = document.getElementById('f-advanced-fields');
    const icon = document.getElementById('f-expand-icon');
    const isHidden = adv.style.display === 'none';
    adv.style.display = isHidden ? '' : 'none';
    if (icon) icon.textContent = isHidden ? '▴' : '▾';
  });
  document.getElementById('f-execute-cancel')?.addEventListener('click', () => document.getElementById('finance-modal').classList.remove('open'));
  document.getElementById('f-receipt-cancel')?.addEventListener('click', () => document.getElementById('finance-modal').classList.remove('open'));
  document.getElementById('f-receipt-save')?.addEventListener('click', async () => {
    if (!state.editingId) return;
    const file = document.getElementById('f-receipt-file').files[0];
    if (!file) { showToast('Худалдан авалтын баримт сонгоно уу', 'warn'); return; }
    showToast('Баримт upload хийж байна...', '', 2000);
    const url = await uploadReceipt(file, state.editingId, 'receipt');
    if (!url) return;
    const r = state.financeRequests.find(x => x.id === state.editingId);
    if (r) {
      r.purchase_receipt_url = url;
      await saveFinanceRequest(r);
      showToast('Худалдан авалтын баримт хадгалагдсан', 'success');
    }
    document.getElementById('finance-modal').classList.remove('open');
    render();
  });
  document.getElementById('f-save')?.addEventListener('click', async () => {
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
    const purchaseFile = document.getElementById('f-purchase-file').files[0];
    // Заавал бөглөх — Зорилго, Дэд код, Салбар. Бусад нь CEO/S03 нөхөж бөглөнө.
    if (!purpose) { showToast('Юу авах хэрэгтэйг бөглөнө үү', 'warn'); return; }
    if (!category) { showToast('Дэд ангилал сонгоно уу', 'warn'); return; }
    if (!deptBranch) { showToast('Аль салбарт хамаарахыг сонгоно уу', 'warn'); return; }
    // Хэрэв дүн+банк+данс бүгд хоосон бол анхааруулга (гэхдээ үргэлжлүүлэх боломжтой)
    if ((!amount || Number(amount) <= 0) && !bank && !accountNumber && !purchaseFile) {
      if (!(await showConfirm('Дүн, банк, данс, баримт бүгд хоосон байна. CEO юу авах хэрэгтэйг ойлгох уу?\n\nҮргэлжлүүлэх үү?', { okText: 'Үргэлжлүүлэх' }))) return;
    }
    const btn = document.getElementById('f-save');
    btn.disabled = true;
    try {
      const newRequest = await createFinanceRequest({ amount, beneficiary, bank, accountNumber, purpose, justification, dueDate, category, deptBranch, frequency });
      // Худалдан авсан баримт сонгогдсон бол upload хийгээд update
      if (purchaseFile) {
        showToast('Баримт upload хийж байна...', '', 2000);
        const url = await uploadReceipt(purchaseFile, newRequest.id, 'purchase');
        if (url) {
          newRequest.purchase_proof_url = url;
          await saveFinanceRequest(newRequest);
        }
      }
      document.getElementById('finance-modal').classList.remove('open');
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
      document.getElementById('finance-modal').classList.remove('open');
    }
  });
  document.getElementById('f-reject')?.addEventListener('click', async () => {
    if (!state.editingId) return;
    if (!(await showConfirm('Энэ хүсэлтийг татгалзах уу? Дахин нээгдэхгүй.', { okText: 'Татгалзах', danger: true }))) return;
    await applyCeoEditsBeforeDecision(state.editingId);
    await decideFinanceRequest(state.editingId, 'rejected');
    document.getElementById('finance-modal').classList.remove('open');
  });
  document.getElementById('f-defer')?.addEventListener('click', async () => {
    if (state.editingId) {
      await applyCeoEditsBeforeDecision(state.editingId);
      await decideFinanceRequest(state.editingId, 'deferred');
      document.getElementById('finance-modal').classList.remove('open');
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
    document.getElementById('finance-modal').classList.remove('open');
  });

  // NEW ORDER (5-stage act) — branch-аас үл хамаарч бүх хэрэглэгчид нээлттэй
  const orderBtn = document.getElementById('new-order-btn');
  orderBtn.onclick = () => {
    document.getElementById('o-customer').value = '';
    document.getElementById('o-date').value = '';
    document.getElementById('o-location').value = '';
    document.getElementById('o-desc').value = '';
    document.getElementById('order-modal').classList.add('open');
    setTimeout(() => document.getElementById('o-customer').focus(), 50);
  };
  document.getElementById('o-cancel').onclick = () => document.getElementById('order-modal').classList.remove('open');
  document.getElementById('o-save').onclick = async () => {
    const customer = document.getElementById('o-customer').value.trim();
    const eventDate = document.getElementById('o-date').value;
    const location = document.getElementById('o-location').value.trim();
    const desc = document.getElementById('o-desc').value.trim();
    if (!customer) { showToast('Үйлчлүүлэгчийн нэр шаардлагатай', 'warn'); return; }
    if (!eventDate) { showToast('Арга хэмжээний өдөр шаардлагатай', 'warn'); return; }
    document.getElementById('o-save').disabled = true;
    try {
      await createOrderAct({ customer, eventDate, location, desc });
      document.getElementById('order-modal').classList.remove('open');
      state.view = 'all';
      render();
    } finally {
      document.getElementById('o-save').disabled = false;
    }
  };
  document.getElementById('search').oninput = (e) => { state.search = e.target.value; render(); };

  // settings
  document.getElementById('export-btn')?.addEventListener('click', exportTasksReport);
  document.getElementById('settings-btn').onclick = () => {
    document.getElementById('s-api').value = state.config.apiUrl;
    document.getElementById('s-staff').value = state.config.staffUrl;
    document.getElementById('s-finance').value = state.config.financeUrl;
    document.getElementById('s-upload').value = state.config.uploadUrl;
    document.getElementById('settings-modal').classList.add('open');
  };
  document.getElementById('s-cancel').onclick = () => document.getElementById('settings-modal').classList.remove('open');
  document.getElementById('s-save').onclick = () => {
    state.config.apiUrl = document.getElementById('s-api').value.trim();
    state.config.staffUrl = document.getElementById('s-staff').value.trim();
    state.config.financeUrl = document.getElementById('s-finance').value.trim();
    state.config.uploadUrl = document.getElementById('s-upload').value.trim();
    localStorage.setItem('apiUrl', state.config.apiUrl);
    localStorage.setItem('staffUrl', state.config.staffUrl);
    localStorage.setItem('financeUrl', state.config.financeUrl);
    localStorage.setItem('uploadUrl', state.config.uploadUrl);
    document.getElementById('settings-modal').classList.remove('open');
    loadTeamFromAPI().then(() => Promise.all([loadData(), loadFinanceRequests()]).then(render));
  };

  // Branch switcher UI-аас бүрэн хасагдсан 2026-05-18 — Чимун ХХК нэг компани.
  // BRANCHES const нь task үүсгэх үед "Аль салбарын ажил вэ?" dropdown-д хэрэглэгдсэн хэвээр.

  // Logout button
  document.getElementById('logout-btn')?.addEventListener('click', logout);

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
  state.me = member.id;
  // CEO эрх — ID-аас үл хамаарч level === 100-аар тогтооно. Master Sheet-д ID өөрчилсөн ч ажиллана.
  state.isCEO = ((member.level || 0) >= 100 || member.id === 'CEO');
  state.myLevel = member.level || 0;
  // Constrain branch to one the user actually belongs to
  if (member.branches && member.branches.length && !member.branches.includes(state.branch)) {
    state.branch = member.branches[0];
  }
  // Persist a lightweight session — just the matched ID
  localStorage.setItem('userId', member.id);
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
  await flushPendingWrites();   // өмнөх session-д офлайн үлдсэн өөрчлөлт байвал эхлээд илгээх
  await Promise.all([ loadData(), loadFinanceRequests() ]);
  generateNotifications();
  render();
  // Auto-refresh every 60s — pulls latest tasks from n8n + generates fresh notifications.
  if (_pollTimer) clearInterval(_pollTimer);
  _pollTimer = setInterval(refreshFromServer, 60_000);
  // Таб/апп нуугдсан үед polling зогсоож батерей хэмнэнэ. Эргэж нээхэд нэн даруй шинэчилнэ
  // — ингэснээр хэрэглэгч апп нээх агшинд хамгийн сүүлийн дата + badge харагдана.
  if (!_visibilityBound) {
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden && state.me) refreshFromServer();
    });
    // Холболт сэргэхэд (offline → online) хүлээгдэж буй өөрчлөлтийг шууд илгээх
    window.addEventListener('online', () => { if (state.me) flushPendingWrites(); });
    _visibilityBound = true;
  }
}

// Сэрвэрээс дата татаж дэлгэцийг шинэчлэх (poll + visibility-д хуваалцсан).
async function refreshFromServer() {
  if (document.hidden) return; // нуугдсан үед сэрвэр дуудахгүй
  try {
    await flushPendingWrites();   // татахаасаа өмнө офлайн өөрчлөлтөө илгээж, дарагдахаас сэргийлнэ
    await Promise.all([ loadData(), loadFinanceRequests() ]);
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
}

function renderUserChip() {
  if (!state.user) return;
  document.getElementById('user-name').textContent = state.user.name;
  document.getElementById('user-role').textContent = state.user.role;
  // PIN-only auth — профайл зураг байхгүй тул нэрний эхний үсгүүдийг харуулна.
  document.getElementById('user-avatar').textContent = state.user.name.replace(/\./g,'').slice(0,2);
}

async function logout() {
  if (!(await showConfirm('Гарах уу?', { okText: 'Гарах' }))) return;
  if (_pollTimer) { clearInterval(_pollTimer); _pollTimer = null; }
  localStorage.removeItem('userId');
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
  // Lightweight session restore — if we have a recent userId, use it without forcing re-auth.
  // Hard cap: 24 hours, after which we make the user sign in again.
  const userId = localStorage.getItem('userId');
  const loginAt = parseInt(localStorage.getItem('userLoginAt') || '0', 10);
  const ageMs = Date.now() - loginAt;
  if (!userId || ageMs > 24 * 60 * 60 * 1000) return false;
  const member = TEAM.find(m => m.id === userId);
  if (!member) return false;
  // Restore without picture (we didn't cache it) — user chip will show initials
  state.user = { ...member, email: member.email, picture: '' };
  state.me = member.id;
  // CEO эрх — ID-аас үл хамаарч level === 100-аар тогтооно. Master Sheet-д ID өөрчилсөн ч ажиллана.
  state.isCEO = ((member.level || 0) >= 100 || member.id === 'CEO');
  state.myLevel = member.level || 0;
  if (member.branches && member.branches.length && !member.branches.includes(state.branch)) {
    state.branch = member.branches[0];
  }
  return true;
}

/* PIN-based authentication — works in iOS PWA standalone (no Google webview restrictions).
   Each TEAM member has a 4-digit `pin`. User picks their name + enters PIN to sign in. */

function initPinLogin() {
  // ID-р нэвтрэх — нэрийн жагсаалт харуулахгүй (нууцлал). Ажилтан өөрийн ID-г бичнэ.
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
    const userId = idInput.value.trim().toUpperCase();
    const pin = pinInput.value.trim();
    handlePinLogin(userId, pin);
  });

  // ─── Шинэ ажилтан бүртгэл ───
  const regSection = document.getElementById('register-section');
  const loginFooter = document.getElementById('login-footer-default');
  document.getElementById('show-register-btn')?.addEventListener('click', () => {
    regSection.style.display = 'block';
    loginFooter.style.display = 'none';
    form.style.display = 'none';
    document.querySelector('.login-sub').textContent = 'Шинэ ажилтны бүртгэл';
  });
  document.getElementById('reg-cancel')?.addEventListener('click', () => {
    regSection.style.display = 'none';
    loginFooter.style.display = 'block';
    form.style.display = 'flex';
    document.querySelector('.login-sub').textContent = 'ID болон PIN кодоо оруулж нэвтэрнэ үү';
  });
  document.getElementById('reg-submit')?.addEventListener('click', handleRegister);

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
  const phone   = document.getElementById('reg-phone').value.trim();
  const email   = document.getElementById('reg-email').value.trim();
  const pin     = document.getElementById('reg-pin').value.trim();

  // Кирилл шалгах (Монгол үсэг — Өө Үү багтсан 0400-04FF муж + зай, цэг, зураас)
  const cyrillic = /^[Ѐ-ӿ\s.\-]+$/;          // Кирилл (Монгол) үсэг
  const hasLatin = /[A-Za-z]/;                // Латин үсэг агуулсан эсэх
  const phoneNorm = phone.replace(/\D/g, ''); // Зөвхөн тоо
  // Validation — алдааг тод харуулах (scroll into view)
  if (!surname) return show('Овгоо оруулна уу.');
  if (hasLatin.test(surname) || !cyrillic.test(surname)) return show('⚠ Овгоо МОНГОЛоор (кирилл) бичнэ үү. Жишээ: Болд');
  if (!given)   return show('Нэрээ оруулна уу.');
  if (hasLatin.test(given) || !cyrillic.test(given)) return show('⚠ Нэрээ МОНГОЛоор (кирилл) бичнэ үү. Жишээ: Энх');
  if (!role)    return show('Албан тушаалаа оруулна уу.');
  if (!group)   return show('Аль салбарт хамаарахаа сонгоно уу.');
  if (!phone || phoneNorm.length < 8) return show('⚠ Утасны дугаараа зөв оруулна уу (наад зах нь 8 орон).');
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return show('⚠ И-мэйл хаягаа зөв оруулна уу.');
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
    const r = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, role, group, phone, email, pin }),
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
      // Login руу буцаад шинэ хэрэглэгчийг сонгуулах
      document.getElementById('reg-cancel').click();
      initPinLogin();
      const idInput = document.getElementById('login-id-input');
      const newId = data.id;
      if (newId && idInput) idInput.value = String(newId).toUpperCase();
      showLoginError('Бүртгэл амжилттай. ID: ' + (newId||'') + ' · PIN кодоо оруулж нэвтэрнэ үү.', 'info');
    }, 1200);
  } catch (e) {
    console.warn('Бүртгэл амжилтгүй:', e);
    show('Бүртгэхэд алдаа гарлаа. Дахин оролдоно уу эсвэл CEO-той холбогдоно уу.');
  } finally {
    btn.disabled = false;
    btn.textContent = 'Бүртгүүлэх';
  }
}

async function handlePinLogin(userId, pin) {
  if (!userId) return showLoginError('Ажилтны ID-гаа оруулна уу.');
  if (!/^\d{4}$/.test(pin)) return showLoginError('PIN нь 4 оронтой тоо байх ёстой.');

  const uid = String(userId).trim().toUpperCase();
  const tryAuth = () => {
    const member = TEAM.find(m => String(m.id).toUpperCase() === uid);
    if (!member) return { ok: false, reason: 'Хэрэглэгч олдсонгүй. CEO-той холбогдоорой.' };
    if (!member.pin) return { ok: false, reason: 'no_pin_in_sheet' };
    if (String(member.pin) !== String(pin)) return { ok: false, reason: 'wrong_pin' };
    return { ok: true, member };
  };

  // 1-р оролдлого: одоогийн TEAM (cache + hardcoded) дээр шалгана
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
  } else {
    showLoginScreen();
    initPinLogin();
  }
})();

/* -------------------- PWA: register service worker -------------------- */
// Only registers on http(s) (skips file:// — double-clicked local files won't try to register).
if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.protocol === 'http:')) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').then((reg) => {
      console.log('SW registered:', reg.scope);
      // When a new SW takes control, reload the page so users get the latest UI
      // without having to delete + re-add the PWA from home screen.
      let firstRegister = !navigator.serviceWorker.controller;
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (firstRegister) { firstRegister = false; return; }
        console.log('SW updated — reloading');
        location.reload();
      });
      // Check for updates regularly (every 60s while open) so phones pick up new code
      setInterval(() => reg.update().catch(()=>{}), 60_000);
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
