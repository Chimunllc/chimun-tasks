/*
 * Чимун апп — автомат тест (гуравдагч сангүй, Node built-in vm).
 * Ажиллуулах:  node test/run.js
 *
 * Апп нэг том browser-файл тул: browser-ийн globals (document/localStorage/fetch...)-ийг
 * хуурамчаар (mock) өгч, app.js-г тусгаарлагдсан vm контекстэд ачаална. Дараа тухайн
 * контекстээс ЦЭВЭР функцуудыг (мөнгө/токены логик, DOM-гүй) аваад шалгана.
 * UI (товч дарах) тест ХИЙХГҮЙ — зөвхөн тооцоо/задлан авах логик.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');

// ── browser globals mock (app.js ачаалах үед унахгүй байх хамгийн бага орчин) ──
function stubEl() {
  const el = {
    style: {}, dataset: {}, children: [], parentNode: null,
    classList: { add() {}, remove() {}, toggle() {}, contains() { return false; } },
    addEventListener() {}, removeEventListener() {}, appendChild() {}, removeChild() {}, remove() {},
    setAttribute() {}, removeAttribute() {}, getAttribute() { return null; },
    querySelector() { return stubEl(); }, querySelectorAll() { return []; },
    insertAdjacentHTML() {}, focus() {}, blur() {}, click() {}, scrollIntoView() {},
    closest() { return null; }, matches() { return false; }, hasAttribute() { return false; },
    innerHTML: '', textContent: '', value: '', checked: false, disabled: false,
  };
  return el;
}
const _store = {};
const localStorage = {
  getItem(k) { return Object.prototype.hasOwnProperty.call(_store, k) ? _store[k] : null; },
  setItem(k, v) { _store[k] = String(v); }, removeItem(k) { delete _store[k]; }, clear() { for (const k in _store) delete _store[k]; },
};
const documentMock = {
  getElementById() { return stubEl(); }, querySelector() { return stubEl(); }, querySelectorAll() { return []; },
  createElement() { return stubEl(); }, createElementNS() { return stubEl(); },
  addEventListener() {}, removeEventListener() {}, body: stubEl(), head: stubEl(), documentElement: stubEl(),
  cookie: '', title: '', readyState: 'complete', visibilityState: 'visible',
};
const noopFetch = () => Promise.resolve({ ok: false, status: 0, json: () => Promise.resolve({}), text: () => Promise.resolve('') });

const sandbox = {
  console, setTimeout, clearTimeout, setInterval, clearInterval, Date, Math, JSON, Promise,
  Array, Object, String, Number, Boolean, RegExp, Error, Map, Set, Symbol, parseInt, parseFloat,
  isNaN, isFinite, encodeURIComponent, decodeURIComponent, Buffer, atob: (s) => Buffer.from(s, 'base64').toString('binary'), btoa: (s) => Buffer.from(s, 'binary').toString('base64'),
  document: documentMock, localStorage, sessionStorage: localStorage,
  fetch: noopFetch, navigator: { userAgent: 'node', serviceWorker: { register: noopFetch, getRegistrations: () => Promise.resolve([]) }, onLine: true },
  location: { href: 'https://test/', search: '', hash: '', pathname: '/', reload() {}, replace() {}, assign() {} },
  crypto: { randomUUID: () => 'test-uuid', getRandomValues: (a) => a },
  caches: { open: () => Promise.resolve({ addAll: noopFetch, put: noopFetch, match: noopFetch }), keys: () => Promise.resolve([]), match: noopFetch },
  Notification: function () {}, alert() {}, confirm() { return false; }, prompt() { return null; },
  requestAnimationFrame: (cb) => setTimeout(cb, 0), cancelAnimationFrame: () => {},
  matchMedia: () => ({ matches: false, addEventListener() {}, addListener() {} }),
  URL, URLSearchParams, TextEncoder, TextDecoder, FileReader: function () {}, Blob: function () {}, FormData: function () {},
  AbortController, AbortSignal,
};
sandbox.window = sandbox;
sandbox.self = sandbox;
sandbox.globalThis = sandbox;
sandbox.window.addEventListener = () => {};
sandbox.window.matchMedia = sandbox.matchMedia;

const src = fs.readFileSync(path.join(__dirname, '..', 'app.js'), 'utf8');
vm.createContext(sandbox);
try {
  vm.runInContext(src, sandbox, { filename: 'app.js' });
} catch (e) {
  console.error('❌ app.js ачаалахад алдаа:', e.message);
  process.exit(1);
}

// ── жижиг assert helper ──
let passed = 0, failed = 0;
const fails = [];
function eq(actual, expected, name) {
  const a = JSON.stringify(actual), e = JSON.stringify(expected);
  if (a === e) { passed++; }
  else { failed++; fails.push(`  🔴 ${name}\n     хүлээсэн: ${e}\n     гарсан:   ${a}`); }
}
function ok(cond, name) { if (cond) passed++; else { failed++; fails.push(`  🔴 ${name}`); } }

// функцуудыг контекстээс авах
const F = sandbox;
function need(names) { const miss = names.filter(n => typeof F[n] !== 'function'); if (miss.length) { console.error('❌ функц олдсонгүй:', miss.join(', ')); process.exit(1); } }
need(['parseVat', 'encodeVat', 'custInfoOf', 'setCustInfo', 'parsePaidRef', 'parseDelivery', 'encodeDelivery', 'cleanAppNote', 'receiptFingerprint', 'parseBankReceipt', 'mapsHref', 'parseOrderTimes', 'encodeOrderTimes',
  'rentalDiscount', 'rentalDays', 'orderRentalDays', 'salaryNet', 'salaryNextYm', 'vatNum', 'vatNorm', 'vatDateIso', 'vatRegNorm', 'vatNameMatch', 'vatAutoScore', 'vatIsReturned', 'vatActive', 'vatDetectReturned', '_rangesOverlap', 'fmtMoney', 'fmtMoneyShort', 'meventContractHtml', 'ctTierText', 'tariffWorkStart', 'tariffWorkEnd', 'attMemberSummary', 'attAggregateMonth', 'attWorkedLine', 'buildReconAiPayload', 'applyReconAiSuggestions', '_isInternalCredit', 'reconcileOrders', 'parsePaidRef', 'receiptTooOld', 'statementMeta', 'reconcileByReceipts', 'receiptFingerprint', 'reconReceiptOwnerLabel', 'driverBonus', 'finIsRealExpense',
  'finIsDepositReturn', 'encodeSetup', 'setupFlagOf', 'setupFeeOf', 'setupFeeForItems', 'setupRateForName', 'setupUnitFee', 'cooShareAmount', 'quoteDiscountFromTotal', '_histCompute', 'isOrderAutoTask', '_nomaadMonthSum', 'orderDiscountAmount', 'orderMoneyBreakdown', 'calcDeliveryFee', 'tariffOffhoursFee', 'tariffDeliveryCity', 'tariffPerKm', 'parseRefund', 'encodeRefundNote', 'productUtilization', 'errStatusLabel', 'productStockByName', 'availabilityFor', 'orderShortages', 'stripFormTokens', 'canProductPart', 'canEditAnyProductPart', 'productPartFields', 'restrictProductEdit', 'countRowPerson', 'scQuarterOf', 'scSessionLabel', 'scNewSessionId', 'scNormalizeConfig', 'scAllSessionIds', 'countRowState', 'countMergeProducts', 'countFilterList',
  'parseStatement', 'expenseFp', 'salaryBranchOf', 'fpAlreadyImported', 'isInternalTransfer',
  'attManualOutTs', 'attManualOutCheck']);

// ═══════════════════ ТЕСТҮҮД ═══════════════════

// 0f) productUtilization — ROI-ийн эх сурвалж (2026-09-04)
// Регресс: өмнө нь `state.orders`-оос уншдаг байсан. Тэр массив нэг л удаа `[]` гэж
// оноогдоод хэзээ ч бичигддэггүй байсан → БҮХ барааны ROI 0% харагдаж, CEO хөрөнгийн
// шийдвэрээ буруу тоон дээр гаргаж байв. (`state.orders` өөрөө устсан — 0g-г үз.)
// Мөн: booqable түүхэн мөрийн price нь ХУГАЦААНЫ НИЙТ, аппынх нь ӨДРИЙН үнэ.
{
  const runIn = (code) => vm.runInContext(code, sandbox);
  const save = runIn('[state.products, state.appOrders]');
  runIn("state.products = [{ id:'M-900', sku:'M-900', name:'Тест ширээ', price:10000, qty_mevent:10, stock:10 }];");
  runIn(`state.appOrders = [
    { number:1, source:'app',      status:'rented',    starts_at:'2026-10-01', stops_at:'2026-10-04', items:[{sku:'M-900', name:'Тест ширээ', qty:2, price:10000}] },
    { number:2, source:'booqable', status:'done',      starts_at:'2026-09-01', stops_at:'2026-09-11', items:[{sku:'M-900', name:'Тест ширээ', qty:1, price:50000}] },
    { number:3, source:'app',      status:'cancelled', starts_at:'2026-10-01', stops_at:'2026-10-04', items:[{sku:'M-900', name:'Тест ширээ', qty:9, price:10000}] }
  ];`);
  const u = runIn('productUtilization')('Тест ширээ');
  ok(u.orders === 2, 'ROI: цуцалсан захиалга тоологдохгүй (2 захиалга)');
  ok(u.qty === 3, 'ROI: тоо ширхэг = 2 + 1 (цуцалсан 9 ороогүй)');
  // app: 10000 × 2 × 3 хоног = 60,000 · booqable: 50000 × 1 × 1 (НИЙТ дүн, үржүүлэхгүй) = 50,000
  ok(u.revenue === 110000, 'ROI: app хоногоор, booqable нийт дүнгээр — ' + u.revenue);

  ok(u.revenue > 0, 'ROI: орлого 0 БИШ (амьд эх сурвалжаас уншина)');

  // ГАЦАЛТЫН ХАМГААЛАЛТ (2026-09-04, амьдаар тохиолдсон): энэ функц бараа МӨР
  // БҮРД дуудагдана (294 удаа). Дуудалт бүрд захиалгыг дахин гүйвэл
  // O(бараа × захиалга × мөр) болж «Бараа & хөрөнгө» дэлгэц НЭЭГДЭХЭЭ болино.
  // Индекс НЭГ УДАА баригдаж, дараагийн дуудалтууд түүнийг л уншина.
  runIn('state._utilIdx = null;');
  runIn('productUtilization')('Тест ширээ');
  const idx1 = runIn('state._utilIdx');
  ok(!!idx1, 'ашиглалт: индекс баригдав');
  for (let i = 0; i < 300; i++) runIn('productUtilization')('Тест ширээ');
  ok(runIn('state._utilIdx') === idx1, 'ашиглалт: 300 дуудалтад индекс ДАХИН баригдахгүй (гацалтын хамгаалалт)');

  runIn('state.products = ' + JSON.stringify(save[0] || []) + '; state.appOrders = ' + JSON.stringify(save[1] || []) + ';');
}

// 0e) SCAN — түүхий UTC огноо БАЙХГҮЙ (2026-09-04)
// `x.toISOString().slice(0,10)` нь UTC огноо буцаана. Монгол UTC+8 тул 00:00-08:00
// хооронд НЭГ ӨДРӨӨР хоцордог: сарын 1-нд цалин/гүйцэтгэл өмнөх сарыг үзүүлнэ,
// «Хоцорсон» тооллого буруу гарна. Зөвшөөрөгдөх цорын ганц хэлбэр нь
// getTimezoneOffset()-оор тохируулсан нь (todayStr/dateStr/addDays-ийн дотоод).
// Шинэ код: todayStr() · dateStr(d) · monthStr(d) · addDays(s, n) ашиглана.
{
  // Тайлбар мөрүүдэд тэр хэв маягийг ЗОРИУД бичсэн (яагаад болохгүйг тайлбарлахын тулд)
  // тул код мөрүүдийг л шалгана.
  const codeLines = src.split('\n').filter(l => !/^\s*(\/\/|\*)/.test(l)).join('\n');
  const all = (codeLines.match(/toISOString\(\)\.slice\(0, ?(?:10|7)\)/g) || []).length;
  const safe = (codeLines.match(/getTimezoneOffset\(\) \* 60000\)\.toISOString\(\)\.slice\(0, ?(?:10|7)\)/g) || []).length;
  eq(all - safe, 0, 'scan: түүхий UTC огноо байхгүй (todayStr/dateStr/monthStr ашигла)');
}

// 0j) SCAN — захиалгын хүснэгтийн толгой ба мөр НЭГ багана тодорхойлолтоос (2026-09-04)
// Алдаа: толгой ба мөр тус тусдаа `… 118px auto` гэж бичигдсэн байв. Сүүлийн `auto`
// нь агуулгаас хамаарна — «💵 Төлбөр авах» товчтой мөрөнд ~124px, товчгүй мөрөнд 0 —
// тэгэхээр `1fr` мөр бүрт өөр болж БҮХ багана 112px шилжиж, хойно урд харагдана.
// Дүрэм: хоёулаа `var(--otable-cols)`-ыг л ашиглана; шинэ `auto` сүүлийн багана хориотой.
{
  const css = fs.readFileSync(path.join(__dirname, '..', 'styles.css'), 'utf8');
  // Токен нэг л удаа тодорхойлогдоно, сүүлийн багана нь ТОГТМОЛ px (auto БИШ)
  const tok = (css.match(/--otable-cols:[^;]+;/g) || []);
  eq(tok.length, 1, 'scan: --otable-cols токен нэг л газар');
  ok(/\d+px;$/.test(tok[0] || ''), 'scan: --otable-cols сүүлийн багана тогтмол өргөнтэй (auto биш)');
  // Толгой ба мөр хоёулаа тэр токеноор — тусад нь бичсэн 8 баганын жагсаалт БАЙХГҮЙ
  ok(/\.otable-head\s*\{[^}]*grid-template-columns:\s*var\(--otable-cols\)/.test(css),
     'scan: otable толгой --otable-cols токеныг ашиглана');
  ok(/\.olist-row\s*>\s*summary\s*\{[^}]*grid-template-columns:\s*var\(--otable-cols\)/.test(css),
     'scan: otable мөр --otable-cols токеныг ашиглана');
  // Баганын жагсаалт өөрөө зөвхөн ТОКЕНД байна (утга нь өөрчлөгдөхөд тест хуучрахгүй)
  const cols = (tok[0] || '').replace('--otable-cols:', '').replace(';', '').trim();
  eq(css.split(cols).length - 1, 1,
     'scan: 8 баганын жагсаалт зөвхөн токенд (толгой/мөрд давхардуулахгүй)');
}

// 0k) Захиалгын жагсаалт — хугацааны бүлэг (Өнөөдөр / Маргааш) (2026-09-04)
// «Самбар» харагдац хасагдаж, бүлэг нь жагсаалтын дотор гарчиг мөр болов.
// Гол дүрэм: дууссан/архив/цуцалсныг ХЭЗЭЭ Ч «өнөөдөр/маргааш» гэж бүлэглэхгүй —
// эс бөгөөс 888 архивласан захиалга «хугацаа хэтэрсэн» болж жагсаалтыг дүүргэнэ.
{
  const T = '2026-09-04';
  // Гол огноо: гарах шатанд АВАХ өдөр, түрээсэнд БУЦААХ өдөр
  eq(F.orderKeyDate({ status: 'reserved', starts_at: '2026-09-01', stops_at: '2026-09-05' }), '2026-09-01', 'бүлэг: гарахаас өмнө авах огноо');
  eq(F.orderKeyDate({ status: 'rented', starts_at: '2026-09-01', stops_at: '2026-09-05' }), '2026-09-05', 'бүлэг: түрээсэнд байхад буцаах огноо');
  eq(F.orderKeyDate({ status: 'reserved' }), '', 'бүлэг: огноогүй бол хоосон');
  // Хугацааны бүлэг
  eq(F.orderTimeGroup({ status: 'reserved', starts_at: '2026-09-04' }, T), 'today', 'бүлэг: өнөөдөр');
  eq(F.orderTimeGroup({ status: 'reserved', starts_at: '2026-09-05' }, T), 'tomorrow', 'бүлэг: маргааш');
  eq(F.orderTimeGroup({ status: 'reserved', starts_at: '2026-09-02' }, T), 'over', 'бүлэг: хугацаа хэтэрсэн');
  eq(F.orderTimeGroup({ status: 'reserved' }, T), 'none', 'бүлэг: огноогүй');
  ['returned', 'archived', 'canceled', 'deleted'].forEach(st => {
    eq(F.orderTimeGroup({ status: st, starts_at: '2026-09-02' }, T), 'closed',
       `бүлэг: «${st}» нь хэтэрсэн биш, дууссан бүлэгт`);
  });
  // Гарчгийн дараалал: хэтэрсэн → өнөөдөр → маргааш → … → дууссан (хамгийн сүүл)
  const G = n => vm.runInContext(n, sandbox);
  const keys = G('ORDER_TIME_GROUPS').map(x => x[0]);
  eq(keys[0], 'over', 'бүлэг: хэтэрсэн нь тэргүүнд');
  eq(keys[1], 'today', 'бүлэг: өнөөдөр хоёрт');
  eq(keys[2], 'tomorrow', 'бүлэг: маргааш гуравт');
  eq(keys[keys.length - 1], 'closed', 'бүлэг: дууссан нь хамгийн сүүлд');
  eq(G('ORDER_SORT_OPTS')[0][0], 'smart', 'бүлэг: эрэмбийн default = хугацаагаар');
}

// 0m) SCAN — гүйцэтгэгч ажилтны мөрөнд МӨНГӨНИЙ мэдээлэл гарахгүй (2026-09-04)
// Утаснаас ажилладаг хүнд барьцаа / НӨАТ / илгээсэн үнийн санал / борлуулалтын
// суваг хэрэггүй — тэдгээр нь картанд бүтэн МӨР эзэлж, ажлын мэдээллийг доош
// түлхдэг. Мөнгөний багана хоосон үед мөр `compact` болж 4 биш 2 мөрт багтана.
{
  const row = src.slice(src.indexOf('function orderListRow('), src.indexOf('function orderListHtml('));
  ok(/_money \?[^\n]*depWarn[^\n]*:[^\n]*badChip, cxChip\]/.test(row),
     'scan: барьцаа/НӨАТ/үнийн санал/суваг шошго зөвхөн мөнгө харах эрхтэйд');
  ok(/class="olist-row\$\{_money \? '' : ' compact'\}/.test(row),
     'scan: мөнгөгүй мөр .compact класстай (утсанд 2 мөрт багтана)');
  ok(/_seeMoney && _site\.site \?/.test(src),
     'scan: сайтын эзлэх хувь = борлуулалтын үзүүлэлт, ажилтанд харагдахгүй');
}

// 0l) SCAN — «Самбар» харагдац БҮРМӨСӨН хасагдсан (2026-09-04)
// Хэрэглэгчийн шийдвэр: нэг харагдац (жагсаалт) л байна. Хоёр харагдац байхад
// нэг нь (самбар) сайжирч, нөгөө нь хоцордог — өнөөдөр/маргааш нь зөвхөн
// самбарт байсан тул утаснаас хардаг ажилчид түүнийг олдоггүй байв.
{
  const css = fs.readFileSync(path.join(__dirname, '..', 'styles.css'), 'utf8');
  ['ordersView', 'ordersBoardOpen', 'renderOrderPipelineBoard', 'boardOrderRow', 'data-oview', 'board-order'].forEach(pat => {
    eq(src.split(pat).length - 1, 0, `scan: самбарын үлдэгдэл «${pat}» байхгүй`);
  });
  ['.oview-toggle', '.bstep', '.board-stepper', '.board-sec', '.oboard'].forEach(pat => {
    eq(css.split(pat).length - 1, 0, `scan: самбарын CSS «${pat}» байхгүй`);
  });
}

// 0g) SCAN — «мөнх хоосон» state талбар БАЙХГҮЙ (2026-09-04)
// ROI 0% алдааны АНГИЛАЛ: `state.x` зарлагдсан ч хэзээ ч бичигддэггүй атлаа
// уншигддаг бол алдаа шидэхгүйгээр ХУДАЛ «0 / хоосон» хариу өгнө. Ийм алдаа
// чимээгүй тул сар турш илэрдэггүй — тэр л ROI-д тохиолдсон.
// Зөвшөөрөгдөх цорын ганц тохиолдол: зориудын статик тохиргоо (`config`).
{
  const codeOnly = src.split('\n').map(l => l.replace(/^\s*\/\/.*$/, '')).join('\n');
  const init = codeOnly.match(/const state = \{([\s\S]*?)\n\};/);
  ok(!!init, 'scan: state эхлүүлэгч олдов');
  const STATIC_OK = ['config'];   // IIFE-ээр нэг удаа бүтээгддэг, өөрчлөгддөггүй
  const dead = [];
  for (const f of [...init[1].matchAll(/^\s{2}([A-Za-z_$][\w$]*)\s*:/gm)].map(x => x[1])) {
    if (STATIC_OK.includes(f)) continue;
    const reads = (codeOnly.match(new RegExp('state\\.' + f + '\\b', 'g')) || []).length;
    const writes = (codeOnly.match(new RegExp(
      'state\\.' + f + '\\s*=[^=]' +
      '|state\\.' + f + '\\s*\\.(push|unshift|splice|set|add|delete|clear|sort)\\(' +
      '|state\\.' + f + '\\s*\\[[^\\]]*\\]\\s*=[^=]' +
      '|state\\.' + f + '\\.[A-Za-z_$][\\w$]*\\s*=[^=]' +
      '|Object\\.assign\\(\\s*state\\.' + f, 'g')) || []).length;
    if (writes === 0 && reads > 1) dead.push(f + ' (' + reads + ' уншилт, 0 бичилт)');
  }
  eq(dead.length, 0, 'scan: мөнх хоосон state талбар байхгүй — ' + (dead.join(', ') || 'цэвэр'));
}

// 0j) SCAN — PIN нь 4-6 оронтой (2026-09-04)
// PIN 4 → 4-6 орон болсон. Хуучин 4 оронтой PIN БҮГД ажилласаар байна.
// ⚠ Сервер тал (n8n «CHIMUN · Login» ба «Reset Verify») мөн `\d{4,6}` — клиентийг
//   ГАНЦААР нь өөрчилвөл 6 оронтой PIN серверт `bad_input` болж нэвтрэлт эвдэрнэ.
// ⚠ Нэвтрэлтийн авто илгээлт ЯГ 4 орон дээр ажиллаж БОЛОХГҮЙ: 6 оронтой хүн
//   бичиж дуусахаас өмнө илгээгдэж «буруу PIN» гэж тоологдоно. Сервер 5 буруу
//   оролдлогын дараа 15 минут ТҮГЖДЭГ тул энэ нь бодит эрсдэл.
{
  const codeLines = src.split('\n').filter(l => !/^\s*(\/\/|\*)/.test(l)).join('\n');
  eq((codeLines.match(/\/\^\\d\{4\}\$\/\.test\(\s*(pin|newPin)/g) || []).length, 0,
     'scan: PIN шалгуур 4 оронтой хатуу биш (\\d{4,6} ашигла)');
  eq((codeLines.match(/pinInput\.value\.length === 4/g) || []).length, 0,
     'scan: нэвтрэлтийн авто илгээлт ЯГ 4 орон дээр ажиллахгүй (6 оронтой PIN тасарна)');
  ok(/slice\(0,\s*6\)/.test(codeLines) && /pinInput/.test(codeLines),
     'scan: PIN оруулга 6 орон хүртэл зөвшөөрнө');
  // ⚠ 2026-09-05: #191 нь app.js-ийг зассан ч index.html-ийн НЭВТРЭХ талбар
  //   `maxlength="4" minlength="4" pattern="[0-9]{4}"` хэвээр үлдсэн. 6 оронтой
  //   PIN-тэй хүн 4-өөс илүү тэмдэгт БИЧИЖ ЧАДАХГҮЙ → буруу PIN → 5 оролдлогын
  //   дараа 15 минут түгжигдэнэ. CEO яг ингэж нэвтэрч чадахгүй болсон.
  const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
  ['login-pin-input', 'reg-pin'].forEach(id => {
    const tag = (html.match(new RegExp('<input id="' + id + '"[^>]*>', 's')) || [''])[0];
    ok(tag, 'scan: ' + id + ' талбар index.html-д байна');
    eq(/maxlength="(\d+)"/.test(tag) ? RegExp.$1 : '', '6',
       'scan: ' + id + ' нь 6 орон хүртэл бичихийг зөвшөөрнө');
    eq(/pattern="\[0-9\]\{4\}"/.test(tag), false,
       'scan: ' + id + ' нь ЯГ 4 орон шаардахгүй ([0-9]{4,6})');
  });
}

// 0l) Ажилтны данс — цалин олгодог хүнд харагдана (2026-09-05)
// Данс/РД/цалин нь ажилтны нийтийн жагсаалтаар ирдэггүй, тусдаа эмзэг сувгаар ирнэ.
// Тэр суваг ЗӨВХӨН CEO-д нээлттэй байсан тул «Цалин» эрх өгсөн захиралд бүх ажилтан
// «данс бүртгэгдээгүй» гэж улаанаар харагдаж, цалин шилжүүлэх боломжгүй байв.
// ⚠ Сервер тал (n8n «CHIMUN · Staff PINs») мөн нээгдэх ёстой — эс бол хүсэлт татгалзана.
//   Тэр үед «denied» гэж ялгаж, ДАХИН оролдохгүй байх ёстой (render бүрд хүсэлт явахаас сэргийлнэ).
{
  const runIn = (code) => vm.runInContext(code, sandbox);
  const save = runIn('[state.isCEO, state.me, state.memberPerms, state._staffPinsLoaded, state._staffPinsErr]');

  runIn("state.isCEO = true; state.me = 'ceo'; state.memberPerms = {};");
  ok(F.canSeeStaffSensitive(), 'данс: CEO харна');

  // Цалин эрхтэй, CEO биш хүн — данс харна (цалин шилжүүлэхэд заавал хэрэгтэй)
  runIn("state.isCEO = false; state.me = '80000001'; state.memberPerms = { '80000001': { salary: true } };");
  ok(F.canSeeStaffSensitive(), 'данс: «Цалин» эрхтэй хүн харна');

  // Цалингийн эрхгүй хүн — харахгүй
  runIn("state.memberPerms = { '80000001': { salary: false } };");
  ok(!F.canSeeStaffSensitive(), 'данс: цалингийн эрхгүй хүн харахгүй');
  ok(/харах эрх алга/.test(F.staffAcctMissingHtml()), 'данс: эрхгүй бол «эрх алга» гэж хэлнэ');

  // Хоосон харагдах шалтгааныг ЯЛГАНА — бүгдийг «бүртгэгдээгүй» гэж хэлэх нь худал
  runIn("state.memberPerms = { '80000001': { salary: true } }; state._staffPinsLoaded = false; state._staffPinsErr = '';");
  ok(/ачаалж байна/.test(F.staffAcctMissingHtml()), 'данс: ачаалж байхад «ачаалж байна»');
  runIn("state._staffPinsLoaded = true; state._staffPinsErr = 'denied';");
  ok(/эрх өгсөнгүй/.test(F.staffAcctMissingHtml()), 'данс: сервер татгалзвал «эрх өгсөнгүй»');
  runIn("state._staffPinsErr = 'need_login';");
  ok(/дахин нэвтэрнэ/.test(F.staffAcctMissingHtml()), 'данс: токен дууссан бол «дахин нэвтэрнэ үү»');
  runIn("state._staffPinsErr = '';");
  ok(/бүртгэгдээгүй/.test(F.staffAcctMissingHtml()), 'данс: жинхэнэ хоосон бол «бүртгэгдээгүй»');

  // SCAN — эмзэг суваг зөвхөн state.isCEO дээр түгжигдэхгүй
  ok(/if \(state\._staffPinsLoaded \|\| !canSeeStaffSensitive\(\)\) return;/.test(src),
     'scan: loadStaffPins нь canSeeStaffSensitive()-ээр шалгана (CEO-гоор хатуу биш)');
  // SCAN — давталтын хамгаалалт: renderSalary дуудна, сервер 403 буцаавал хязгааргүй хүсэлт явж БОЛОХГҮЙ
  ok(/_staffPinsTries >= 2/.test(src) && /_staffPinsTries\+\+/.test(src),
     'scan: loadStaffPins сессид 2 оролдлогоор хязгаарлагдана (хүсэлтийн давталт хаана)');
  // SCAN — цалин хуудас өөрөө эмзэг датаг татна (өмнө нь зөвхөн «Ажилчид» хуудсаар татагддаг байв)
  ok(/function renderSalary\(\)[\s\S]{0,400}loadStaffPins\(\)/.test(src),
     'scan: renderSalary нь данс/РД-г өөрөө татна');

  vm.runInContext('state.isCEO = __s[0]; state.me = __s[1]; state.memberPerms = __s[2]; state._staffPinsLoaded = __s[3]; state._staffPinsErr = __s[4];',
    Object.assign(sandbox, { __s: save }));
}

// 0h) canonKey / keyVariants — ажилтны хуучин түлхүүрийг эзэнтэй нь холбох (2026-09-04)
// Нэг ажилтны утас солигдоход 5 хүснэгтийн 16 бичлэг эзэнгүй болж, 360° оноо нь
// БҮРЭН алдагдсан (2026-09-04). Зураглалыг DB талын trigger автоматаар бичдэг;
// энд аппын тал зөв уншиж байгааг бэхжүүлнэ.
{
  const run = (code) => vm.runInContext(code, sandbox);
  const save = run('state.empAliases');

  // alias байхгүй үед ЮУ Ч өөрчлөгдөхгүй (зөөлөн задрал)
  run('state.empAliases = null;');
  eq(run('canonKey')('89904109'), '89904109', 'canonKey: alias байхгүй бол утга хэвээр');
  eq(run('canonKey')(''), '', 'canonKey: хоосон утга аюулгүй');

  run("state.empAliases = { 'phone:89904109':'89985352', 'email:huuchin@a.mn':'89985352', 'name:хуучин нэр':'89985352' };");
  eq(run('canonKey')('89904109'), '89985352', 'canonKey: утсаар шийднэ');
  eq(run('canonKey')('HUUCHIN@a.mn'), '89985352', 'canonKey: мэйл том/жижиг үсэг ялгахгүй');
  eq(run('canonKey')('Хуучин Нэр'), '89985352', 'canonKey: нэрээр шийднэ');
  eq(run('canonKey')('89985352'), '89985352', 'canonKey: одоогийн түлхүүр хэвээр');

  // Транзитив A→B→C
  run("state.empAliases = { 'phone:111':'222', 'phone:222':'333' };");
  eq(run('canonKey')('111'), '333', 'canonKey: транзитив A→B→C');

  // ⚠ Мөчлөг үүсвэл ГАЦААХГҮЙ (оператор дугаарыг дахин олгодог тул бодит эрсдэл)
  run("state.empAliases = { 'phone:111':'222', 'phone:222':'111' };");
  const cyc = run('canonKey')('111');
  ok(cyc === '111' || cyc === '222', 'canonKey: мөчлөг дээр гацахгүй — ' + cyc);

  // keyVariants — сервер талын шүүлтэд БҮХ хувилбар орох ёстой
  run("state.empAliases = { 'phone:89904109':'89985352', 'phone:70001111':'89985352', 'phone:999':'өөр' };");
  const v = run('keyVariants')('89985352');
  ok(v.includes('89985352') && v.includes('89904109') && v.includes('70001111'),
     'keyVariants: бүх хуучин утас багтана — ' + JSON.stringify(v));
  ok(!v.includes('999'), 'keyVariants: өөр хүний alias ОРОХГҮЙ');

  // PostgREST жагсаалт — нэрэнд зай/цэг байж болно тул хашилттай
  eq(run('pgrstInList')(['89985352', 'Б.Тест Нэр']), 'in.("89985352","Б.Тест Нэр")',
     'pgrstInList: утга бүр хашилтад');

  run('state.empAliases = ' + JSON.stringify(save) + ';');
}

// 0i) SCAN — ажилтны түлхүүрээр СЕРВЕР талд шүүхийг хориглоно (2026-09-04)
// PostgREST-ийн шүүлт сервер дээр болдог тул хуучин түлхүүртэй мөр клиент рүү ОГТ
// ирэхгүй — canonKey тэнд туслахгүй. Ийм дуудлага нэмбэл «Миний ирц» ба «Ирцийн
// тайлан» ӨӨР ӨӨР тоо харуулна. Зөв хэлбэр: `${pgrstInList(keyVariants(түлхүүр))}`.
// (member_perms дээрх DELETE нь БИЧИЛТ тул хамаарахгүй — үргэлж одоогийн түлхүүрээр.)
{
  const codeLines = src.split('\n').filter(l => !/^\s*(\/\/|\*)/.test(l)).join('\n');
  // Сервер талын RPC хайлт ч мөн адил — `get_employee_doc` нь p_phone-оор хайдаг тул
  // хуучин түлхүүр дор хадгалагдсан баримт олдохгүй. keyVariants-аар дараалан оролдоно.
  const rpcBad = (codeLines.match(/rpc\/get_employee_doc/g) || []).length > 0
              && !/keyVariants\(phone\)/.test(codeLines) ? 1 : 0;
  const bad = rpcBad
            + (codeLines.match(/rest\/v1\/attendance\?[^`'"]*member_key=eq\./g) || []).length
            + (codeLines.match(/rest\/v1\/(evaluations|staff_salary|hourly_ratings)\?[^`'"]*=eq\.\$\{encodeURIComponent\((state\.me|personKey)/g) || []).length;
  eq(bad, 0, 'scan: ажилтны түлхүүрээр сервер талд шүүхгүй (pgrstInList(keyVariants(...)) ашигла)');
}

// 0b) Хүрэлцээ — ХУУЧИРСАН НЭРТЭЙ мөрийг sku-гээр таньж шалгана (2026-09-03)
// Регресс: өмнө нь availabilityFor(it.name) байсан тул сайтаас хуучин нэртэй мөр
// ирэхэд productByName олдохгүй → null → «Хүрэлцэхгүй» ОГТ гардаггүй байв.
{
  const runIn = (code) => vm.runInContext(code, sandbox);
  const save = runIn('[state.products, state.appOrders]');
  runIn("state.products = [{ id:'M-100', sku:'M-100', name:'Цагаан ширээ 180см', price:10000, qty_mevent:5, stock:5 }]; state.appOrders = [];");
  const SH = runIn('orderShortages'), AV = runIn('availabilityFor');

  ok(SH([{ sku:'M-100', name:'Цагаан ширээ 180см', qty:9 }], '2026-10-01', '2026-10-02').length === 1,
     'хүрэлцээ: зөв нэрээр хүрэлцэхгүйг барина');
  ok(SH([{ sku:'M-100', name:'Ширээ (хуучин нэр)', qty:9 }], '2026-10-01', '2026-10-02').length === 1,
     'хүрэлцээ: ХУУЧИРСАН нэртэй ч sku-гээр таньж барина');
  ok(SH([{ sku:'M-100', name:'Ширээ (хуучин нэр)', qty:3 }], '2026-10-01', '2026-10-02').length === 0,
     'хүрэлцээ: хүрэлцэж байвал анхааруулахгүй');
  ok(SH([{ sku:'ZZZ', name:'Байхгүй бараа', qty:99 }], '2026-10-01', '2026-10-02').length === 0,
     'хүрэлцээ: каталогт байхгүй бол шалгахгүй');

  const aItem = AV({ sku:'M-100', name:'хуучин' }, '2026-10-01', '2026-10-02');
  const aName = AV('Цагаан ширээ 180см', '2026-10-01', '2026-10-02');
  ok(aItem && aName && aItem.stock === aName.stock && aItem.avail === aName.avail,
     'availabilityFor: мөрөөр ба каноник нэрээр ижил');

  runIn('state.products = ' + JSON.stringify(save[0] || []) + '; state.appOrders = ' + JSON.stringify(save[1] || []) + ';');
}

// 5c) SCAN — reserveReceipt-ийн үр дүнг ЦАГААН жагсаалтаар шалгана (2026-09-03)
// Дүрэм 2: 'dup'-ыг хар жагсаалтаар барих нь 'err'-ийг 'ok' мэт нэвтрүүлдэг →
// сүлжээ/эрх унахад давхар баримтын хамгаалалт ЧИМЭЭГҮЙ унтардаг байв.
// Энэ scan нь: 'dup' шалгадаг газар бүр 'err'-ийг мөн шалгасан байх ёстой.
{
  const dupChecks = (src.match(/rr === 'dup'/g) || []).length;
  const errChecks = (src.match(/rr === 'err'/g) || []).length;
  ok(dupChecks > 0, 'scan: reserveReceipt дуудагч олдов (' + dupChecks + ')');
  ok(errChecks >= dupChecks,
     "scan: 'dup' шалгадаг газар бүр 'err'-ийг мөн шалгана (dup=" + dupChecks + ", err=" + errChecks + ')');
}

// 0d) SCAN — view бүр safeViewHtml-ээр хамгаалагдсан байна (2026-09-03)
// Рендер алдаа шидвэл wrap.innerHTML хоосон үлдэж апп «үхсэн» мэт харагдана —
// цэс дарахад юу ч болохгүй, алдааны мессеж ч гарахгүй. safeViewHtml нь try/catch
// хийж хэрэглэгчид ойлгомжтой мессеж үзүүлнэ. Аудит: 15 view-ээс 13 нь хамгаалалтгүй байв.
{
  const bare = (src.match(/wrap\.innerHTML\s*=\s*render[A-Z]/g) || []).length;
  eq(bare, 0, 'scan: view рендер бүр safeViewHtml-ээр хамгаалагдсан');
}

// 0c) SCAN — CACHE_TAG-ийг ЗӨВХӨН globalThis-ээр уншина (2026-09-03)
// `typeof X === 'string' ? X : ''` дэх ХОЁР ДАХЬ лавлагаа нь no-undef-д баригдаж
// CI-г улаан болгодог. 2026-09-03-нд хоёр удаа тохиолдсон — эхнийх нь 2 газар
// зассаны дараа өөр сесс 3 дахь газар нэмсэн. Тиймээс ХЭВ МАЯГИЙГ хаана.
{
  const bare = (src.match(/(?<!globalThis\.)\bCACHE_TAG\b/g) || []).length;
  eq(bare, 0, 'scan: CACHE_TAG зөвхөн globalThis.CACHE_TAG хэлбэрээр (no-undef)');
}

// 0a) SCAN — PostgREST дуудлага бүр НЭВТЭРСЭН токеноор явна (2026-09-03)
// pgrstBearer() = pgrstToken() || DB_ANON_KEY — токенгүй бол anon руу унана, тул
// солих нь юуг ч эвдэхгүй. Харин anon-ы УНШИХ эрхийг ирээдүйд хаах боломж нээгдэнэ.
// Шинэ код `Bearer ' + DB_ANON_KEY` бичвэл тэр бараа дахин anon-оор явна.
{
  const anonBearer = (src.match(/Authorization: 'Bearer ' \+ DB_ANON_KEY/g) || []).length;
  eq(anonBearer, 0, "scan: PostgREST дуудлагад 'Bearer ' + DB_ANON_KEY БАЙХГҮЙ (pgrstBearer() ашигла)");
}

// 0g) SCAN — «Бараа & хөрөнгө» дэлгэц захиалгын датаг АЧААЛНА (2026-09-04)
// productUtilization (ROI, «N удаа · орлого») нь state.appOrders-оос уншина.
// Дэлгэц түүнийг ачаалахгүй бол state.appOrders === undefined хэвээр үлдэж
// БҮХ барааны ROI 0% харагдана — хөрөнгийн шийдвэр худал тоон дээр гарна.
// #162 функцийг зассан ч ачаалалт дутуу үлдсэн (амьд дэлгэцээр илрэв).
{
  const line = src.split('\n').find(l => l.includes("v === 'products'") && l.includes('canSeeProducts'));
  ok(!!line, 'scan: products дэлгэцийн ачаалалтын мөр олдов');
  ok(/loadAppOrders/.test(line || ''), 'scan: products дэлгэц loadAppOrders дуудна (ROI мөнх 0% болохоос сэргийлнэ)');
}

// 0f) SCAN — барааны модалын таб задаргаа талбар алдагдуулаагүй байх (2026-09-04)
// openProductModal 25 талбартай нэг цонх байсныг Каталог/Үнэ/Нөөц 3 таб болгосон.
// Талбар аль ч pane-д ороогүй үлдвэл ЧИМЭЭГҮЙ алдагдана: submitProductModal нь
// querySelector-оос null авч үнэ 0, нөөц 0 болгож хадгална. Тиймээс модал болон
// submit-ийн УНШДАГ pm-* id бүр модалын HTML-д зарлагдсан байх ёстой.
{
  const openSrc = src.slice(src.indexOf('function openProductModal(p) {'), src.indexOf('async function submitProductModal('));
  const _rest = src.slice(src.indexOf('async function submitProductModal('));
  const submitSrc = _rest.slice(0, _rest.indexOf('\nfunction attachProductsHandlers('));
  const read = new Set();
  [openSrc, submitSrc].forEach(t => {
    // Сүүлчийн зураас дээр таслахгүй: тайлбар дахь `#pm-media-д` (кирилл) нь
    // `pm-media-` болж худал сэрэмжлүүлэг өгдөг байв.
    (t.match(/#(pm-[a-z]+(?:-[a-z]+)*)/g) || []).forEach(m => read.add(m.slice(1)));
    (t.match(/g\('(pm-[a-z-]+)'\)/g) || []).forEach(m => read.add(m.slice(3, -2)));
  });
  const declared = new Set((openSrc.match(/id="(pm-[a-z-]+)"/g) || []).map(m => m.slice(4, -1)));
  eq([...read].filter(id => !declared.has(id)), [], 'scan: модалын уншдаг pm-* id бүр HTML-д зарлагдсан');
  ok(declared.size >= 20, 'scan: барааны модалын талбарууд бүрэн (' + declared.size + ')');

  // Меню мөр / буцах товч бүр БАЙГАА хэсэг рүү заана. Нэг нь зөрвөл тэр бүлэг
  // талбар бүрмөсөн нуугдана (эсвэл хоосон дэлгэц гарна).
  const gos = [...new Set((openSrc.match(/data-pmgo="[a-z]+"/g) || []).map(m => m.slice(11, -1)))].sort();
  const panes = [...new Set((openSrc.match(/data-pmpane="[a-z]+"/g) || []).map(m => m.slice(13, -1)))].sort();
  eq(panes, ['cat', 'cost', 'menu', 'price', 'stock'], 'scan: барааны модал = меню + 4 хэсэг');
  eq(gos, panes, 'scan: меню/буцах товч бүр байгаа хэсэг рүү заана');

  // Хэсэг бүр ТҮГЖИГДЭХ хайрцагтай — эс бөгөөс эрхгүй хүнд задгай үлдэнэ.
  const locks = [...new Set((openSrc.match(/data-pmlock="[a-z]+"/g) || []).map(m => m.slice(13, -1)))].sort();
  eq(locks, ['cat', 'cost', 'price', 'stock'], 'scan: 4 хэсэг тус бүр түгжигдэх хайрцагтай');

  // ХАДГАЛАГДДАГ талбар бүр аль нэг хэсэгт ХАРЬЯАЛАГДАНА. Шинэ талбар нэмээд
  // хэсэгт хуваарилахаа мартвал эрхгүй хүн түүнийг дарж бичих боломжтой үлдэнэ.
  {
    const b = submitSrc.slice(submitSrc.indexOf('const base = {'));
    const baseSrc = b.slice(0, b.indexOf('\n  };'));
    const written = [...new Set((baseSrc.match(/([a-z_]+):/g) || []).map(m => m.slice(0, -1)))];
    const owned = new Set(Object.values(F.productPartFields()).flat());
    const exempt = new Set(['sku', 'code', 'variant_group', 'variant_label']);   // өөрчлөгддөггүй таних талбар
    eq(written.filter(f => !owned.has(f) && !exempt.has(f)), [], 'scan: хадгалагддаг талбар бүр хэсэгт харьяалагдана');
  }
}

// 1) НӨАТ токен round-trip
eq(F.parseVat(F.encodeVat(15000)), 15000, 'НӨАТ токен: encode→parse round-trip');
eq(F.parseVat('note ' + F.encodeVat(0)), 0, 'НӨАТ токен: 0 дүн');
eq(F.parseVat('токенгүй note'), null, 'НӨАТ токен: байхгүй бол null');

// 2) Харилцагчийн мэдээлэл (CI) токен
{
  const ci = { company: 'Түшиг ХХК', reg: '1234567', contact: 'FB: mevent', maps: 'https://maps.google/x' };
  const note = F.setCustInfo('үндсэн note', ci);
  eq(F.custInfoOf(note), ci, 'CI токен: setCustInfo→custInfoOf round-trip');
  ok(note.indexOf('үндсэн note') === 0, 'CI токен: үндсэн note хадгалагдана');
}
eq(F.custInfoOf('token байхгүй'), {}, 'CI токен: байхгүй бол {}');
// injection хамгаалалт — ⟦⟧ тэмдэгт зайлуулагдана
{
  const note = F.setCustInfo('', { company: 'Му⟧ухай⟦ХХК' });
  const back = F.custInfoOf(note);
  ok(!/[⟦⟧]/.test(back.company || ''), 'CI токен: ⟦⟧ injection зайлуулна');
}

// 3) Хүргэлт токен
{
  const enc = F.encodeDelivery('city', 5, 150000);
  const d = F.parseDelivery('note ' + enc);
  eq({ zone: d.zone, km: d.km, fee: d.fee }, { zone: 'city', km: 5, fee: 150000 }, 'Хүргэлт токен: encode→parse');
}
eq(F.parseDelivery('токенгүй'), null, 'Хүргэлт токен: байхгүй бол null');

// 3b) Суурилуулалт токен + нэгж хөлс
{
  // encode→parse round-trip (флаг + хөлс)
  const enc = F.encodeSetup(true, 75000);
  eq(F.setupFlagOf('note ' + enc), true, 'Суурилуулалт токен: флаг=true');
  eq(F.setupFeeOf('note ' + enc), 75000, 'Суурилуулалт токен: хөлс уншина');
  // хуучин 2 хэсэгтэй токентой нийцтэй (хөлсгүй) → фээ 0
  eq(F.setupFlagOf('⟦SET|1⟧'), true, 'Суурилуулалт токен: хуучин ⟦SET|1⟧ флаг');
  eq(F.setupFeeOf('⟦SET|1⟧'), 0, 'Суурилуулалт токен: хуучин токенд хөлс 0');
  eq(F.setupFlagOf('⟦SET|0⟧'), false, 'Суурилуулалт токен: 0 = false');
  eq(F.encodeSetup(false, 99999), '⟦SET|0⟧', 'Суурилуулалт токен: off бол хөлс кодлохгүй');
  eq(F.setupFlagOf('токенгүй'), null, 'Суурилуулалт токен: байхгүй бол null');
  // нэгж хөлс — барааны нэрээр
  eq(F.setupRateForName('Тайз 2х2м'), 30000, 'Нэгж хөлс: тайз=30000');
  eq(F.setupRateForName('Сүлжмэл сандал'), 500, 'Нэгж хөлс: сандал=500');
  eq(F.setupRateForName('Танихгүй бараа'), 1000, 'Нэгж хөлс: default=1000');
  // нийт хөлс = тоо × нэгж, доод хязгаартай
  eq(F.setupFeeForItems([{ name: 'Тайз', qty: 3 }]), 90000, 'Нийт хөлс: 3×30000=90000');
  eq(F.setupFeeForItems([{ name: 'Сандал', qty: 10 }]), 50000, 'Нийт хөлс: 10×500=5000 → доод хязгаар 50000');
  eq(F.setupFeeForItems([]), 0, 'Нийт хөлс: бараагүй = 0');
  // каталогийн setup (item.setup) нэрээр таамагласнаас ДАВУУ
  eq(F.setupUnitFee({ name: 'Сандал', setup: 3000 }), 3000, 'Нэгж хөлс: каталогийн setup давуу');
  eq(F.setupUnitFee({ name: 'Сандал' }), 500, 'Нэгж хөлс: setup байхгүй → нэрээр');
  eq(F.setupFeeForItems([{ name: 'Сандал', qty: 100, setup: 3000 }]), 300000, 'Нийт хөлс: каталогийн setup×тоо');
  // Үнийн саналын хямдрал — нийт дүнгээс гаргах (задаргаа нийт дүнтэй тэнцэнэ)
  // #1478 бодит кейс: түрээс 6.6сая, хүргэлт 150k, нийт 3.45сая → хямдрал = 3.3сая (50%), 4.62сая БИШ
  eq(F.quoteDiscountFromTotal(6600000, 150000, 0, 0, 0, 0, 3450000), 3300000, 'Quote хямдрал: #1478 = 3.3сая (давхар тоолохгүй)');
  // сайтын авто-20% total-д шингэсэн, гар хямдралгүй → 20% харагдана
  eq(F.quoteDiscountFromTotal(1000000, 0, 0, 0, 0, 0, 800000), 200000, 'Quote хямдрал: авто-20% total-аас');
  // хямдралгүй — задаргаа тэнцэнэ (хүргэлт+барьцаа+НӨАТ)
  eq(F.quoteDiscountFromTotal(1000000, 100000, 0, 0, 50000, 25000, 1125000), 0, 'Quote хямдрал: хямдралгүй = 0');
  eq(F.quoteDiscountFromTotal(6600000, 150000, 0, 0, 0, 0, 0), 0, 'Quote хямдрал: total 0 бол 0 (ноорог)');
  // NOMAAD цуглуулсан орлого — сарын харьяалал (C5): олон удаагийн төлбөр зөв сард, Σ = nomaadPaid
  {
    const log = [{ total: 500000, pay_date: '2026-08-15' }, { total: 300000, pay_date: '2026-09-02' }];
    eq(F._nomaadMonthSum(log, 800000, '2026-09-02', '2026-08'), 500000, 'NOMAAD сар: 8-р сард төлбөр₁');
    eq(F._nomaadMonthSum(log, 800000, '2026-09-02', '2026-09'), 300000, 'NOMAAD сар: 9-р сард төлбөр₂');
    eq(F._nomaadMonthSum(log, 800000, '2026-09-02', '2026-08') + F._nomaadMonthSum(log, 800000, '2026-09-02', '2026-09'), 800000, 'NOMAAD сар: Σ = nomaadPaid');
    // лог хоосон — running total-ыг income_date сард
    eq(F._nomaadMonthSum([], 800000, '2026-09-02', '2026-09'), 800000, 'NOMAAD сар: логгүй → income_date сард');
    eq(F._nomaadMonthSum([], 800000, '2026-09-02', '2026-08'), 0, 'NOMAAD сар: логгүй, өөр сар = 0');
    // лог дутуу (running total их) — зөрүү income_date сард
    const partial = [{ total: 500000, pay_date: '2026-08-15' }];
    eq(F._nomaadMonthSum(partial, 800000, '2026-09-02', '2026-08'), 500000, 'NOMAAD сар: лог дутуу, 8-р сар = логоор');
    eq(F._nomaadMonthSum(partial, 800000, '2026-09-02', '2026-09'), 300000, 'NOMAAD сар: лог дутуу, зөрүү 9-р сард');
  }
  // Захиалгын хямдрал — авто-хоног ба гар хямдралын их нь (C3, сувгаар парити)
  eq(F.orderDiscountAmount(1000000, 3, 'pct', 0), 200000, 'C3: 3 хоног авто −20% (гар 0)');
  eq(F.orderDiscountAmount(1000000, 7, 'pct', 0), 400000, 'C3: 7 хоног авто −40%');
  eq(F.orderDiscountAmount(1000000, 1, 'pct', 0), 0, 'C3: 1 хоног авто-хямдралгүй');
  eq(F.orderDiscountAmount(1000000, 3, 'pct', 30), 300000, 'C3: гар 30% > авто 20% → гар');
  eq(F.orderDiscountAmount(1000000, 3, 'pct', 10), 200000, 'C3: гар 10% < авто 20% → авто (доод хамгаалалт)');
  eq(F.orderDiscountAmount(1000000, 3, 'amount', 500000), 500000, 'C3: гар дүн 500k > авто 200k → гар');
  // orderMoneyBreakdown — ГАНЦ эх сурвалж: задаргаа нийт дүнтэй ҮРГЭЛЖ тэнцэнэ (үнийн санал+гэрээ ижил)
  {
    // #1478 бодит кейс: түрээс 6.6сая, хүргэлт 150k, нийт 3.45сая → хямдрал 3.3сая (50%)
    const o = { subtotal_mnt: 6600000, total_mnt: 3450000, deposit_mnt: 0, discount_type: 'pct', discount_value: 50, starts_at: '2026-09-15', stops_at: '2026-09-18', note: '⟦DLV|city|0|150000⟧' };
    const b = F.orderMoneyBreakdown(o);
    eq(b.subtotal, 6600000, 'breakdown: subtotal');
    eq(b.delivFee, 150000, 'breakdown: delivFee');
    eq(b.discount, 3300000, 'breakdown: хямдрал total-аас (3.3сая, 4.62сая БИШ)');
    eq(b.subtotal - b.discount - b.vatDisc + b.delivFee + b.offFee + b.setupFee + b.deposit, b.total, 'breakdown: задаргаа = нийт дүн (үргэлж тэнцэнэ)');
    // НӨАТ хассан + барьцаатай кейс — мөн тэнцэнэ
    const o2 = { subtotal_mnt: 1000000, total_mnt: 1075000, deposit_mnt: 200000, note: '⟦DLV|city|0|100000⟧ ⟦VAT|25000⟧' };
    const b2 = F.orderMoneyBreakdown(o2);
    eq(b2.subtotal - b2.discount - b2.vatDisc + b2.delivFee + b2.offFee + b2.setupFee + b2.deposit, b2.total, 'breakdown: НӨАТ+барьцаатай ч тэнцэнэ');
  }
  // Тариф fallback (app_config байхгүй үед) — одоогийн утгыг цоожилно (C2, сайттай ижил байх ёстой)
  eq(F.tariffDeliveryCity(), 150000, 'Тариф fallback: хот дотор 150,000');
  eq(F.tariffPerKm(), 5000, 'Тариф fallback: км тутам 5,000');
  eq(F.tariffOffhoursFee(), 20000, 'Тариф fallback: ажлын бус цаг 20,000');
  eq(F.calcDeliveryFee('city', 0), 150000, 'Хүргэлт: хот дотор 150,000');
  eq(F.calcDeliveryFee('out', 12), 120000, 'Хүргэлт: 12км × 2 × 5,000 = 120,000');
  eq(F.calcDeliveryFee('pickup', 0), 0, 'Хүргэлт: өөрөө авах 0');
  // Буцаан олголт токен + барьцааны буцаалт төрөл (C11)
  {
    // барьцааны буцаалт — kind='dep' round-trip
    const n1 = F.encodeRefundNote('', 200000, 'цуцлагдсан', 'dep');
    const r1 = F.parseRefund(n1);
    eq({ amount: r1.amount, note: r1.note, kind: r1.kind }, { amount: 200000, note: 'цуцлагдсан', kind: 'dep' }, 'Refund: барьцаа (dep) round-trip');
    // хоосон шалтгаантай ч dep хадгалагдана
    const r2 = F.parseRefund(F.encodeRefundNote('', 200000, '', 'dep'));
    eq({ amount: r2.amount, kind: r2.kind }, { amount: 200000, kind: 'dep' }, 'Refund: шалтгаангүй ч dep');
    // ерөнхий буцаалт (kind байхгүй) — dep БИШ
    const r3 = F.parseRefund(F.encodeRefundNote('note', 150000, 'илүү төлөлт'));
    eq({ amount: r3.amount, note: r3.note, kind: r3.kind }, { amount: 150000, note: 'илүү төлөлт', kind: '' }, 'Refund: ерөнхий буцаалт dep БИШ');
    // хуучин 2 хэсэгтэй токентой нийцтэй
    eq(F.parseRefund('⟦RF|100000⟧').kind, '', 'Refund: хуучин токенд kind хоосон');
  }
}

// 4) Эхлэх/дуусах цаг токен
{
  const enc = F.encodeOrderTimes(9, 18);
  const t = F.parseOrderTimes('note ' + enc);
  eq({ sh: t.sh, eh: t.eh }, { sh: 9, eh: 18 }, 'Цаг токен: encode→parse');
}

// 4b) orderDateTime — огноо + ⟦RT⟧ цаг нэгтгэх (2026-09-04)
// Регресс: `starts_at`/`stops_at` нь ЗӨВХӨН огноо, формын цаг ⟦RT⟧ токенд хадгалагддаг.
// Үнийн санал/гэрээ нь огноог шууд уншдаг байсан тул АВАХ ЦАГ хэзээ ч гардаггүй байв
// (гэрээнд «……» цаг гэж хэвлэгддэг). Ажлын бус цагийн +төлбөр яг тэр цагаас тооцогддог
// тул харилцагч ямар цагаас төлбөр нэмэгдсэнийг баримтаас харах ёстой.
need(['orderDateTime']);
{
  const note = 'тэмдэглэл ' + F.encodeOrderTimes(8, 20);
  eq(F.orderDateTime('2026-09-10', note, false), '2026-09-10T08:00', 'orderDateTime: эхлэх цаг огноотой нийлнэ');
  eq(F.orderDateTime('2026-09-12', note, true),  '2026-09-12T20:00', 'orderDateTime: дуусах цаг огноотой нийлнэ');
  // токенгүй (хуучин мөр) — огноо хэвээр, хуурамч цаг зохиохгүй
  eq(F.orderDateTime('2026-09-10', '', false), '2026-09-10', 'orderDateTime: ⟦RT⟧ байхгүй бол огноо хэвээр');
  // огноонд аль хэдийн цаг байвал (booqable түүх) ХӨНДӨХГҮЙ
  eq(F.orderDateTime('2026-09-10T14:30', note, false), '2026-09-10T14:30', 'orderDateTime: байгаа цагийг дарж бичихгүй');
  eq(F.orderDateTime('', note, false), '', 'orderDateTime: огноогүй бол хоосон');
  // шөнө дунд (0 цаг) — falsy тул алдагдаж болзошгүй
  eq(F.orderDateTime('2026-09-10', F.encodeOrderTimes(0, 23), false), '2026-09-10T00:00', 'orderDateTime: 00 цаг алдагдахгүй');
}

// 4c) Гэрээнд авах/өгөх цаг хэвлэгдэнэ (дээрх алдааны нөхөн үзүүлэлт)
{
  const ord = {
    number: 7, customer: 'Тест ХХК', order_no: 'ME-7',
    starts_at: '2026-09-10', stops_at: '2026-09-12',
    total_mnt: 500000, deposit_mnt: 0,
    items: [{ name: 'Ширээ', qty: 2, price: 10000, total: 40000 }],
    note: F.encodeOrderTimes(8, 20),
  };
  const ct = F.meventContractHtml(ord);
  ok(ct.indexOf('2026-09-10 08:00') > -1, 'гэрээ/цаг: эхлэх огноо+цаг хэвлэгдэнэ');
  ok(ct.indexOf('2026-09-12 20:00') > -1, 'гэрээ/цаг: дуусах огноо+цаг хэвлэгдэнэ');
  // цагийн байрлалд бөглөх «……» үлдэхгүй (гарын үсгийн мөрийн «……» нь ӨӨР — түүнийг хөндөхгүй)
  ok(!/Эхлэх:[^<]*<b>[^<]*……/.test(ct), 'гэрээ/цаг: цагийн оронд «……» үлдэхгүй');
}

// 5) cleanAppNote — токенуудыг цэвэрлэнэ, үндсэн текст үлдэнэ
{
  const note = 'Жинхэнэ тэмдэглэл ' + F.encodeVat(5000) + ' ' + F.encodeDelivery('out', 10, 50000);
  const clean = F.cleanAppNote(note);
  ok(clean.indexOf('Жинхэнэ тэмдэглэл') === 0, 'cleanAppNote: үндсэн текст үлдэнэ');
  ok(!/⟦VAT/.test(clean) && !/⟦DLV/.test(clean), 'cleanAppNote: токенууд арилна');
}

// 5b) stripFormTokens — захиалгын форм ЗӨВХӨН өөрийн токеныг солино (2026-09-03)
// Регресс: өмнө нь cleanAppNote-оор бүгдийг арилгаж байсан тул захиалга засах бүрд
// санхүүгийн бүртгэсэн ⟦PAY⟧ ба буцаалтын ⟦RF⟧ УСТДАГ байв.
{
  const foreign = '⟦PAY|500000|бүтэн|данс|2026-09-01|ITZONE⟧ ⟦RF|120000⟧ ⟦DMG|сандал⟧ ⟦CX|цуцлав⟧';
  const own = F.encodeVat(5000) + ' ' + F.encodeDelivery('out', 10, 50000) + ' ' + F.encodeSetup(true);
  const kept = F.stripFormTokens('Тэмдэглэл ' + own + ' ' + foreign);
  ok(!/⟦VAT/.test(kept), 'stripFormTokens: өөрийн ⟦VAT⟧ арилна');
  ok(!/⟦DLV/.test(kept), 'stripFormTokens: өөрийн ⟦DLV⟧ арилна');
  ok(!/⟦SET/.test(kept), 'stripFormTokens: өөрийн ⟦SET⟧ арилна');
  ok(/⟦PAY\|500000/.test(kept), 'stripFormTokens: санхүүгийн ⟦PAY⟧ ХАДГАЛАГДАНА');
  ok(/⟦RF\|120000⟧/.test(kept), 'stripFormTokens: буцаалтын ⟦RF⟧ ХАДГАЛАГДАНА');
  ok(/⟦DMG\|/.test(kept) && /⟦CX\|/.test(kept), 'stripFormTokens: ⟦DMG⟧ ба ⟦CX⟧ ХАДГАЛАГДАНА');
  ok(kept.indexOf('Тэмдэглэл') === 0, 'stripFormTokens: үндсэн текст үлдэнэ');
  ok(F.cleanAppNote(foreign) === '', 'cleanAppNote нь ХАРИН бүгдийг арилгасаар байна (өөр зориулалт)');
}

// 6) paid_ref задлах (банкны баримтын лавлагаа)
{
  const raw = '[#REF123] Бат · 5555000123 · түрээс  |  [#REF456] Дорж · 4444 · төлбөр';
  const list = F.parsePaidRef(raw);
  eq(list.length, 2, 'paid_ref: 2 баримт задлана');
  eq(list[0].id, 'REF123', 'paid_ref: баримтын дугаар');
  eq(list[0].sender, 'Бат', 'paid_ref: илгээгч');
  eq(list[0].acct, '5555000123', 'paid_ref: данс');
}
eq(F.parsePaidRef(''), [], 'paid_ref: хоосон бол []');

// 7) mapsHref — линк эсвэл координат
ok(F.mapsHref('https://maps.google.com/x') === 'https://maps.google.com/x', 'mapsHref: http линкийг хэвээр');
ok(/google\.com\/maps\/search/.test(F.mapsHref('47.9,106.9')), 'mapsHref: координатыг maps search болгоно');

// 8) receiptFingerprint — ижил гүйлгээ ижил хурууны хээ, өөр нь өөр
{
  const a = F.receiptFingerprint({ amount: 100000, date: '2026-08-28', senderName: 'Бат' });
  const b = F.receiptFingerprint({ amount: 100000, date: '2026-08-28', senderName: 'Бат' });
  const c = F.receiptFingerprint({ amount: 200000, date: '2026-08-28', senderName: 'Бат' });
  ok(a === b, 'receiptFingerprint: ижил гүйлгээ = ижил хээ');
  ok(a !== c, 'receiptFingerprint: өөр дүн = өөр хээ');
}

// 9) parseBankReceipt — банкны баримтаас мөнгө/огноо/илгээгч гаргах (ХАМГИЙН ЧУХАЛ)
{
  const golomt = [
    'Хүлээн авагчийн банк', 'Голомт банк',
    'Хүлээн авагчийн данс', '3635185058',
    'Хүлээн авагчийн нэр', 'Чимун ХХК',
    'Гүйлгээний дүн', '500,000.00 MNT',
    'Гүйлгээний огноо', '2026-08-28',
    'Гүйлгээний утга', 'Түрээсийн төлбөр',
    'Гүйлгээний төлөв', 'Амжилттай',
    'Шилжүүлэгчийн нэр', 'Батбаяр',
    'Шилжүүлэгчийн дансны дугаар', '5555000123',
    'Хүсэлтийн лавлах дугаар: ABC123',
  ].join('\n');
  const r = F.parseBankReceipt(golomt);
  eq(r.amount, 500000, 'parseBankReceipt: ДҮН зөв (500,000.00 MNT → 500000)');
  eq(r.date, '2026-08-28', 'parseBankReceipt: огноо');
  eq(r.senderName, 'Батбаяр', 'parseBankReceipt: илгээгчийн нэр');
  eq(r.receiverName, 'Чимун ХХК', 'parseBankReceipt: хүлээн авагч');
  eq(r.senderAcct, '5555000123', 'parseBankReceipt: илгээгчийн данс');
  eq(r.ref, 'Түрээсийн төлбөр', 'parseBankReceipt: гүйлгээний утга');
  eq(r.status, 'Амжилттай', 'parseBankReceipt: төлөв');
  eq(r.bankRef, 'GLABC123', 'parseBankReceipt: лавлах дугаар (GL префикс)');
  ok(/чимун/i.test(r.receiverName), 'parseBankReceipt: Чимун хүлээн авагч шалгалт (орлого мөн)');
}
// Таслалтай том дүн + бутархай
{
  const r = F.parseBankReceipt('Гүйлгээний дүн\n1,234,567.89 MNT\n2026-01-15');
  eq(r.amount, 1234568, 'parseBankReceipt: том дүн таслалтай (1,234,567.89 → 1234568)');
}
// Дүнгүй баримт → amount undefined (буруу файлыг таних)
{
  const r = F.parseBankReceipt('ямар нэг текст дүнгүй');
  ok(r.amount === undefined, 'parseBankReceipt: дүнгүй бол amount undefined (буруу баримт барих)');
}

// 10) rentalDiscount — түрээсийн хугацааны хямдрал (2+ хоног 20%, 7+ 40%, 30+ 55%)
eq(F.rentalDiscount(1).pct, 0, 'Хямдрал: 1 хоног = 0%');
eq(F.rentalDiscount(2).pct, 0.20, 'Хямдрал: 2 хоног = 20%');
eq(F.rentalDiscount(6).pct, 0.20, 'Хямдрал: 6 хоног = 20%');
eq(F.rentalDiscount(7).pct, 0.40, 'Хямдрал: 7 хоног = 40%');
eq(F.rentalDiscount(29).pct, 0.40, 'Хямдрал: 29 хоног = 40%');
eq(F.rentalDiscount(30).pct, 0.55, 'Хямдрал: 30 хоног = 55%');

// 11) rentalDays / orderRentalDays — түрээсийн хоног = КАЛЕНДАРИЙН ӨДРӨӨР (mevent.mn сайттай ЯГ ижил)
const _dMs = (y, m, day, h) => new Date(y, m - 1, day, h || 0).getTime();
eq(F.rentalDays(_dMs(2026, 8, 28, 10), _dMs(2026, 8, 29, 10)), 1, 'Хоног: 28→29 = 1 хоног');
eq(F.rentalDays(_dMs(2026, 8, 28, 10), _dMs(2026, 8, 29, 20)), 1, 'Хоног: 28 10:00→29 20:00 (34ц) = 1 хоног — цаг үл нөлөөлнө (сайттай ижил)');
eq(F.rentalDays(_dMs(2026, 8, 28, 10), _dMs(2026, 8, 30, 9)), 2, 'Хоног: 28→30 = 2 хоног');
eq(F.rentalDays(_dMs(2026, 8, 28, 10), _dMs(2026, 8, 28, 20)), 1, 'Хоног: нэг өдөр = хамгийн багадаа 1');
eq(F.orderRentalDays({ starts_at: '2026-08-28', stops_at: '2026-08-30' }), 2, 'orderRentalDays: 28→30 = 2 хоног');
eq(F.orderRentalDays({ starts_at: '', stops_at: '' }), 1, 'orderRentalDays: огноогүй = 1');

// 12) salaryNet — цэвэр цалин (НДШ 11.5% + ХХОАТ 10%)
{
  const r = F.salaryNet(1000000, true);
  eq(r.ndsh, 115000, 'Цалин: НДШ 11.5% (1сая → 115,000)');
  eq(r.pit, 88500, 'Цалин: ХХОАТ 10% үлдэгдлээс (88,500)');
  eq(r.net, 796500, 'Цалин: цэвэр дүн (796,500)');
}
eq(F.salaryNet(1000000, false).net, 1000000, 'Цалин: суутгалгүй ажилтан → цэвэр = нийт');

// 13) salaryNextYm — дараагийн сар (жил дамжина)
eq(F.salaryNextYm('2026-06'), '2026-07', 'Дараа сар: 2026-06 → 2026-07');
eq(F.salaryNextYm('2026-12'), '2027-01', 'Дараа сар: 12 сар → дараа жилийн 1 сар');

// 14) Огноо давхцал — давхар захиалгын гол логик (_rangesOverlap)
ok(F._rangesOverlap('2026-08-28', '2026-08-30', '2026-08-29', '2026-08-31') === true, 'Давхцал: 28-30 ба 29-31 → давхцана');
ok(F._rangesOverlap('2026-08-01', '2026-08-05', '2026-08-10', '2026-08-15') === false, 'Давхцал: 1-5 ба 10-15 → давхцахгүй');
ok(F._rangesOverlap('2026-08-01', '2026-08-10', '2026-08-10', '2026-08-15') === true, 'Давхцал: нэг өдөр шүргэлцэх = давхцана (инклюзив)');

// 15) НӨАТ туслах логик (тулгалт)
eq(F.vatNum('1,234.5'), 1234.5, 'vatNum: таслалтай тоо');
eq(F.vatNum('₮5,000'), 5000, 'vatNum: тэмдэгттэй');
eq(F.vatNum('abc'), 0, 'vatNum: тоо биш → 0');
eq(F.vatNorm('Түшиг ХХК'), 'түшиг', 'vatNorm: ХХК-г хасна');
eq(F.vatNorm('ABC Group LLC'), 'abc', 'vatNorm: group/llc хасна');
eq(F.vatRegNorm('РД: 1234567'), '1234567', 'vatRegNorm: зөвхөн цифр');
ok(F.vatDateIso('2026-08-28').indexOf('2026-08-28T') === 0, 'vatDateIso: огноо ISO болгоно');
eq(F.vatDateIso(''), '', 'vatDateIso: хоосон → хоосон');

// 16) НӨАТ нэр таарах — ХАТУУ (нэг ерөнхий үг хангалтгүй)
ok(F.vatNameMatch('Түшиг ХХК', 'Түшиг ХХК') === true, 'vatNameMatch: яг таарна');
ok(F.vatNameMatch('Ирээдүйн Хөгжил', 'Хөгжил Ирээдүйн') === true, 'vatNameMatch: 2 гол үг таарвал (эрэмбэ хамаагүй)');
ok(F.vatNameMatch('Гэрэл групп', 'Гэрэл төв') === false, 'vatNameMatch: 1 л гол үг таарвал ХАРГАЛЗАХГҮЙ (хатуу)');
ok(F.vatNameMatch('Түшиг', 'Өөр Компани') === false, 'vatNameMatch: огт өөр нэр');

// 16a) БУЦААСАН НӨАТ баримт (2026-09-04) — нөхөн үзүүлэх тест
// Бодит алдаа: 2026-08-27-нд Токи шоп-д 21,057,080₮-ийн баримт шивээд маргааш нь
// БУЦААГААД 3,000,000 + 18,057,080 болгож хуваасан. eBarimt дээр буцаасан баримт
// задаргаанаас БҮРМӨСӨН алга болдог (сөрөг мөр ч, төлөвийн багана ч үлдэхгүй) ч
// апп ачаалахдаа зөвхөн НЭМДЭГ байсан тул хуучин баримт сууж, нэг захиалгад
// 4 баримт (21.0сая + 2.6сая + 3.0сая + 18.0сая = 44.7сая) холбогдож 25.2сая₮-ийн
// захиалгыг «НӨАТ илүү 19.5сая» гэж харуулж байв.
{
  const D = (dt, ddtd, total, vat, name) => ({ id: ddtd, ddtd, dt, total, vat, buyer_name: name, matched_id: 'NC-2026-0160' });
  // Аппын DB-д байгаа нь (өмнөх ачаалалт — буцаахаас ӨМНӨ татсан файлаас)
  const existing = [
    D('2026-08-27T11:06:00Z', 'A-21057080', 21057080, 1914280, 'Токи шоп'),          // ← буцаагдсан
    D('2026-08-27T11:09:00Z', 'A-2655120', 2655120, 241374.55, 'ТОКИ ББСБ'),
    D('2026-08-28T15:44:00Z', 'A-3000000', 3000000, 272727.27, 'Токи шоп'),
    D('2026-08-28T15:45:00Z', 'A-18057080', 18057080, 1641552.73, 'Токи шоп'),
    D('2026-07-15T10:00:00Z', 'A-7SAR', 5000000, 454545.45, 'Өөр сарын'),            // ← 7-р сар, хөндөгдөх ЁСГҮЙ
  ];
  // Шинэ eBarimt задаргаа (8-р сар) — буцаасан баримт БАЙХГҮЙ
  const imported = existing.filter(r => r.ddtd !== 'A-21057080' && r.ddtd !== 'A-7SAR');

  const det = F.vatDetectReturned(existing, imported);
  eq(det.gone.map(r => r.ddtd), ['A-21057080'], 'буцаалт: файлаас алга болсон баримтыг олно');
  eq(det.months, ['2026-08'], 'буцаалт: зөвхөн ачаалсан сар');
  eq(det.back.length, 0, 'буцаалт: сэргээх баримт алга');

  // ⚠ ХАМГИЙН ЧУХАЛ: 8-р сарын файл ачаалахад 7-р сарын баримт хөндөгдөхгүй
  ok(!det.gone.some(r => r.ddtd === 'A-7SAR'), 'буцаалт: ачаалаагүй сарын баримт БУЦААСАН болохгүй');

  // Тэмдэглэсний дараа — нийлбэрээс хасагдана
  const after = existing.map(r => r.ddtd === 'A-21057080' ? { ...r, returned: true } : r);
  const act = F.vatActive(after);
  eq(act.length, 4, 'буцаалт: хүчинтэй баримт 4 (буцаасан хасагдав)');
  const aug = act.filter(r => String(r.dt).slice(0, 7) === '2026-08');
  eq(aug.reduce((s, r) => s + r.total, 0), 23712200, 'буцаалт: 8-р сарын Токи нийлбэр = 23,712,200₮ (44,769,280 БИШ)');

  // Дахин гарч ирвэл (буцаалт цуцлагдсан) автоматаар сэргэнэ
  const det2 = F.vatDetectReturned(after, existing.filter(r => r.ddtd !== 'A-7SAR'));
  eq(det2.back.map(r => r.ddtd), ['A-21057080'], 'буцаалт: файлд дахин гарвал сэргээх жагсаалтад');
  eq(det2.gone.length, 0, 'буцаалт: сэргээх үед шинэ алга болсон байхгүй');

  eq(F.vatIsReturned({ returned: true }), true, 'буцаалт: тэмдэглэгээ уншина');
  eq(F.vatIsReturned({}), false, 'буцаалт: тэмдэглэгээгүй = хүчинтэй');
  eq(F.vatActive(null).length, 0, 'буцаалт: хоосон оролт унахгүй');
  eq(F.vatDetectReturned([], []).gone.length, 0, 'буцаалт: хоосон файл юуг ч тэмдэглэхгүй');
}

// 16a-2) SCAN — НӨАТ-ын нийлбэр/тулгалт БҮГД буцаасныг шүүсэн эх сурвалжаас уншина.
// Түүхий `state.vatReceipts`-ыг шүүлтгүй уншвал буцаасан баримт дахин тоологдоно —
// яг энэ алдаа 2026-08-д гарсан. Зөвшөөрөгдөх түүхий уншилт: ачаалалт, тайлангийн
// модалын сар/жагсаалт (тэнд «↩ Буцаасан» таб ХАРУУЛАХ ёстой), rec хайлт.
{
  const src = fs.readFileSync(path.join(__dirname, '..', 'app.js'), 'utf8');
  const bad = (src.match(/^.*\bstate\.vatReceipts\b.*$/gm) || [])
    .filter(l => !/state\.vatReceipts\s*=/.test(l))            // оноолт
    .filter(l => !/Array\.isArray\(state\.vatReceipts\)/.test(l))   // ачаалсан эсэх шалгалт
    .filter(l => !/\.find\(x => x\.id === /.test(l))           // нэг бичлэг хайх
    .filter(l => !/return state\.vatReceipts;/.test(l))        // loadVatReceipts — түүхий агуулах
    .filter(l => !/\.slice\(\)\.sort\(/.test(l))               // модалын сарын жагсаалт (↩ таб буцаасныг ХАРУУЛНА)
    .filter(l => !/function months\(\)|const before =|const RET =|vatActive\(|vatReceiptsActive/.test(l));
  eq(bad.map(l => l.trim().slice(0, 60)), [],
     'scan: НӨАТ нийлбэр бүр vatActive/vatReceiptsActive-ээр (буцаасан давхар тоологдохгүй)');
}

// 16b) Ирцийн цаг — өнгөрсөн өдрийн нээлттэй сесс (гарахаа бүртгүүлээгүй) 172ц болохгүй
{
  const inTs = '2026-08-20T01:00:00.000Z';   // ирсэн, гараагүй
  const past = F.attMemberSummary([{ kind: 'in', ts: inTs }], false);
  ok(past.mins === 0, 'attMemberSummary: өнгөрсөн өдрийн нээлттэй сесс = 0 мин (172ц алдаа засав)');
  ok(past.noOut === true && past.open === false, 'attMemberSummary: өнгөрсөн нээлттэй = noOut, open биш');
  const closed = F.attMemberSummary([{ kind: 'in', ts: '2026-08-20T01:00:00.000Z' }, { kind: 'out', ts: '2026-08-20T09:00:00.000Z' }], false);
  ok(closed.mins === 480, 'attMemberSummary: хаагдсан сесс = 8ц (480 мин)');
}

// 17) НӨАТ авто оноо — РД+нэр+дүн+огноо таарвал өндөр
{
  const rec = { reg: '1234567', name: 'Түшиг ХХК', total: 500000, net: 450000, dt: '2026-08-28' };
  const strong = F.vatAutoScore(rec, { reg: '1234567', name: 'Түшиг', amount: 500000, date: '2026-08-28' });
  const weak = F.vatAutoScore(rec, { reg: '9999999', name: 'Огт өөр', amount: 12345, date: '2020-01-01' });
  ok(strong >= 20, 'vatAutoScore: РД+нэр+дүн+огноо таарвал өндөр оноо (≥20)');
  ok(weak < strong, 'vatAutoScore: таарахгүй бол бага оноо');
}

// 18) Мөнгөний НЭГ формат — сая-аас дээш товчилно, доош бүтэн
eq(F.fmtMoneyShort(1153639389), '1.15 тэрбум₮', 'мөнгө: тэрбум → 2 орон таслалаар');
eq(F.fmtMoneyShort(12000000000), '12 тэрбум₮',  'мөнгө: 10 тэрбумаас дээш → бүхэл');
eq(F.fmtMoneyShort(9705000), '9.7 сая₮',        'мөнгө: сая → 1 орон таслалаар');
eq(F.fmtMoneyShort(3000000), '3 сая₮',          'мөнгө: бүхэл сая → таслалгүй');
eq(F.fmtMoneyShort(33000000), '33 сая₮',        'мөнгө: 10 саяас дээш → бүхэл');
eq(F.fmtMoneyShort(176000), F.fmtMoney(176000), 'мөнгө: саяас доош → БҮТЭН (товчлохгүй)');
eq(F.fmtMoneyShort(33000), F.fmtMoney(33000),   'мөнгө: мянга товчлохгүй');
eq(F.fmtMoneyShort(0), F.fmtMoney(0),           'мөнгө: тэг');
eq(F.fmtMoneyShort(-2500000), '-2.5 сая₮',      'мөнгө: сөрөг дүн');
ok(!/\.0 |\.00 /.test(F.fmtMoneyShort(2000000000)), 'мөнгө: илүүдэл тэг үлдэхгүй');

// 19) Баримт бичиг — ангилал, хэмжээ, жагсаалтын шүүлт
need(['docCat', 'fmtBytes', 'renderDocuments']);
eq(F.docCat('template').label, 'Загвар',   'баримт: мэдэгдэж буй ангилал');
eq(F.docCat('чгүй').key,       'other',    'баримт: танихгүй ангилал → Бусад');
eq(F.docCat(undefined).key,    'other',    'баримт: ангилалгүй → Бусад');
eq(F.fmtBytes(0),        '',        'хэмжээ: тэг бол хоосон');
eq(F.fmtBytes(900),      '900 B',   'хэмжээ: байт');
eq(F.fmtBytes(2048),     '2 KB',    'хэмжээ: килобайт');
eq(F.fmtBytes(3670016),  '3.5 MB',  'хэмжээ: мегабайт нэг оронтой');
{
  // renderDocuments нь state-ээс уншиж HTML буцаана — загвар эвдэрсэн эсэхийг барина.
  // state нь app.js дотор `const` тул sandbox глобалд гарахгүй — контекст ДОТОР нь ажиллуулна.
  const runIn = (code) => vm.runInContext(code, sandbox);
  runIn(`state.companyDocs = [
    { id: 'd1', title: 'Улсын бүртгэлийн гэрчилгээ', category: 'certificate', doc_no: '9/12', doc_date: '2024-03-01', size_bytes: 2048 },
    { id: 'd2', title: 'Үнийн саналын загвар',        category: 'template',    file_name: 'quote.docx' },
    { id: 'd3', title: '<scr'+'ipt>муу</scr'+'ipt>',  category: 'incoming',    counterparty: 'Түшиг ХХК' },
  ]; state.docsCat = ''; state.docsSearch = '';`);
  const all = runIn('renderDocuments()');
  ok(all.indexOf('Улсын бүртгэлийн гэрчилгээ') > -1, 'баримт: бүх ангилалд жагсана');
  ok(all.indexOf('<scr' + 'ipt>муу') === -1,          'баримт: HTML тайлбарлагдахгүй (escape)');
  runIn("state.docsCat = 'template'");
  const tpl = runIn('renderDocuments()');
  ok(tpl.indexOf('Үнийн саналын загвар') > -1,       'баримт: ангилалаар шүүнэ');
  ok(tpl.indexOf('Улсын бүртгэлийн гэрчилгээ') === -1, 'баримт: бусад ангилал хасагдана');
  runIn("state.docsCat = ''; state.docsSearch = 'Түшиг';");
  const q = runIn('renderDocuments()');
  ok(q.indexOf('Түшиг ХХК') > -1,                     'баримт: хайлт байгууллагаар олно');
  ok(q.indexOf('Үнийн саналын загвар') === -1,        'баримт: хайлтад таарахгүй нь хасагдана');
  runIn("state.docsSearch = 'огт байхгүй утга'");
  ok(runIn('renderDocuments()').indexOf('баримт алга') > -1, 'баримт: хоосон үр дүнгийн мессеж');
  runIn("state.docsSearch = ''");
}

// 20) Системийн загвар — ХООСОН датагаар унахгүй эсэх (гол эрсдэл: талбар дутуу үед крэш)
need(['docBlankMeventOrder', 'docBlankNomaadQuote', 'meventContractHtml', 'nomaadContractHtml', 'buildOrderQuote']);
{
  const runIn = (code) => vm.runInContext(code, sandbox);
  eq(runIn('DOC_TEMPLATES.length'), 4, 'загвар: бүртгэлд 4 загвар');
  const mev = runIn('meventContractHtml(docBlankMeventOrder())');
  ok(typeof mev === 'string' && mev.length > 500, 'загвар: M-Event гэрээ хоосон датагаар үүснэ');
  ok(mev.indexOf('ТҮРЭЭСИЙН ГЭРЭЭ') > -1,        'загвар: M-Event гэрээний гарчиг');
  ok(mev.indexOf('……') > -1,                     'загвар: M-Event гэрээнд бөглөх талбар үлдэнэ');
  const nom = runIn('nomaadContractHtml(docBlankNomaadQuote())');
  ok(typeof nom === 'string' && nom.length > 500, 'загвар: NOMAAD гэрээ хоосон датагаар үүснэ');
  ok(nom.indexOf('КОРПОРАТ') > -1,               'загвар: NOMAAD гэрээний гарчиг');
  ok(nom.indexOf('…………') > -1,                   'загвар: NOMAAD гэрээнд бөглөх талбар үлдэнэ');
}

// 22) Олноор оруулах — файлын нэрээр ангилал таамаглах (жишээ нэрс Drive-аас авсан)
need(['guessDocCategory', 'docTitleFromFile']);
eq(F.guessDocCategory('Төхөөрөмж түрээсийн гэрээ загвар.docx'), 'template',
   'таамаг: "гэрээ ЗАГВАР" → загвар (гэрээ БИШ — дараалал чухал)');
eq(F.guessDocCategory('M_Event_АБТ баталсан загвар.docx'), 'template',  'таамаг: АБТ загвар → загвар');
eq(F.guessDocCategory('Компанийн гэрчилгээ.pdf'),          'certificate','таамаг: гэрчилгээ');
eq(F.guessDocCategory('Чимун_ХХК_Гэрчилгээ.pdf'),          'certificate','таамаг: том/жижиг үсэг хамаарахгүй');
eq(F.guessDocCategory('Газрын гэрчилгээ.pdf'),             'certificate','таамаг: газрын гэрчилгээ');
eq(F.guessDocCategory('Чимун ХХК зуны зугаалгын гэрээ.pdf'),'contract',  'таамаг: гэрээ');
eq(F.guessDocCategory('Санхүүгийн үйлчилгээ үзүүлэх гэрээ.pdf'), 'contract', 'таамаг: үйлчилгээний гэрээ');
eq(F.guessDocCategory('23. MCS International үнийн санал.pdf'), 'outgoing', 'таамаг: үнийн санал → явсан');
eq(F.guessDocCategory('Nomaad үнийн санал Аригү-д.pdf'),   'outgoing',  'таамаг: үнийн санал (нэр дунд)');
eq(F.guessDocCategory('Ирсэн албан бичиг 2025.pdf'),       'incoming',  'таамаг: ирсэн бичиг');
eq(F.guessDocCategory('scan_0012.pdf'),                    'other',     'таамаг: танихгүй нэр → бусад');
eq(F.guessDocCategory(''),                                 'other',     'таамаг: хоосон нэр → бусад');
eq(F.docTitleFromFile('01. Гэрээ загвар.docx'), '01. Гэрээ загвар', 'гарчиг: өргөтгөл хасагдана');
eq(F.docTitleFromFile('гэрээ.pdf'),             'гэрээ',            'гарчиг: энгийн нэр');
eq(F.docTitleFromFile('.pdf'),                  'Нэргүй',           'гарчиг: зөвхөн өргөтгөл → Нэргүй');

// ═══════════════════ ДҮН ═══════════════════
function finish() {
  console.log('');
  if (fails.length) { console.log(fails.join('\n')); console.log(''); }
  console.log(`${failed === 0 ? '✅' : '❌'}  Тест: ${passed} амжилттай, ${failed} унасан (нийт ${passed + failed})`);
  process.exit(failed === 0 ? 0 : 1);
}

// 22) Захиалгын харилцагчийн мэдээлэл заавал байх — validateOrderContact
{
  const V = (o) => vm.runInContext('validateOrderContact', sandbox)(o);
  const full = { customer: 'Болд', phone: '99112233', email: 'a@b.mn', noEmail: false };
  ok(V(full) === null, 'холбоо: бүрэн бөглөсөн захиалга дамжина');
  ok(V({ ...full, customer: '   ' })?.field === 'customer', 'холбоо: нэргүй бол зогсооно');
  ok(V({ ...full, phone: '' })?.field === 'phone', 'холбоо: утасгүй бол зогсооно');
  ok(V({ ...full, phone: '9911' })?.field === 'phone', 'холбоо: утас 8 оронгүй бол зогсооно');
  ok(V({ ...full, phone: '9911-2233' }) === null, 'холбоо: зураастай утас зөвшөөрнө');
  ok(V({ ...full, phone: '+976 9911 2233' }) === null, 'холбоо: улсын кодтой утас зөвшөөрнө');
  ok(V({ ...full, email: '' })?.field === 'email', 'холбоо: имэйлгүй, тэмдэглээгүй бол зогсооно');
  ok(V({ ...full, email: '', noEmail: true }) === null, 'холбоо: «Имэйлгүй» тэмдэглэвэл дамжина');
  ok(V({ ...full, email: 'buruu' })?.field === 'email', 'холбоо: буруу имэйл зогсооно');
  ok(V({ ...full, email: 'a@b' })?.field === 'email', 'холбоо: домэйнгүй имэйл зогсооно');
  ok(V({ ...full, email: 'a@b.mn', noEmail: true }) === null, 'холбоо: имэйлтэй бол тэмдэглэгээ саад болохгүй');
  ok(V({ customer: 'A', phone: '99112233', email: null, noEmail: true }) === null, 'холбоо: имэйл null байхад унахгүй');
}

// 23) Хамтран гүйцэтгэгч — оролцогчийг зөв таних
{
  const CO = vm.runInContext('taskCoKeys', sandbox);
  const PA = vm.runInContext('taskParticipants', sandbox);
  const IS = vm.runInContext('isTaskParticipant', sandbox);
  eq(CO({ co_assignees: ['99112233', '88112233'] }), ['99112233', '88112233'], 'хамтрагч: массив уншина');
  eq(CO({ co_assignees: '99112233, 88112233' }), ['99112233', '88112233'], 'хамтрагч: таслалтай мөр уншина');
  eq(CO({ co_assignees: null }), [], 'хамтрагч: null → []');
  eq(CO({}), [], 'хамтрагч: талбар байхгүй → []');
  eq(CO({ co_assignees: ['', '  ', '99112233'] }), ['99112233'], 'хамтрагч: хоосон утга шүүгдэнэ');

  const t = { assignee: '99112233', co_assignees: ['88112233', '77112233'] };
  eq(PA(t), ['99112233', '88112233', '77112233'], 'оролцогч: хариуцагч эхэнд, дараа нь хамтрагчид');
  eq(PA({ assignee: '99112233', co_assignees: ['99112233'] }), ['99112233'], 'оролцогч: давхардал арилна');
  ok(IS(t, '99112233'), 'оролцогч: хариуцагч мөн');
  ok(IS(t, '77112233'), 'оролцогч: хамтрагч мөн');
  ok(!IS(t, '11111111'), 'оролцогч: гуравдагч хүн биш');
  ok(!IS(t, ''), 'оролцогч: хоосон түлхүүр биш');
  ok(!IS(null, '99112233'), 'оролцогч: ажил байхгүй бол биш');
}

// 24) Гүйцэтгэлийн оноо хамтран гүйцэтгэгчид ЧУ тооцогдож байгаа эсэх (гомдлын гол цэг)
{
  const st = vm.runInContext('state', sandbox);
  const OM = vm.runInContext('objectiveMetrics', sandbox);
  const QS = vm.runInContext('taskQualityScore', sandbox);
  const saved = st.tasks;
  const M = '2026-07';
  st.tasks = [
    // Хариуцагч=A, хамтрагч=B ба C. Удирдлага (Z) өгсөн, хугацаандаа дууссан, 5★
    { id: 't1', assignee: 'A', co_assignees: ['B', 'C'], createdBy: 'Z', status: 'done',
      due: '2026-07-10', updated: '2026-07-09', kpi_code: '5' },
    // Зөвхөн A-гийн ажил
    { id: 't2', assignee: 'A', createdBy: 'Z', status: 'done', due: '2026-07-11', updated: '2026-07-11', kpi_code: '4' },
    { id: 't3', assignee: 'A', createdBy: 'Z', status: 'done', due: '2026-07-12', updated: '2026-07-12', kpi_code: '4' },
  ];
  const a = OM('A', M), b = OM('B', M), c = OM('C', M), d = OM('D', M);
  eq(a.total, 3, 'оноо: хариуцагч A-д 3 ажил');
  eq(b.total, 1, 'оноо: хамтрагч B-д хамтарсан 1 ажил тооцогдоно');
  eq(c.total, 1, 'оноо: хамтрагч C-д мөн тооцогдоно');
  eq(d.total, 0, 'оноо: оролцоогүй D-д тооцогдохгүй');
  ok(b.done === 1 && b.onTime === 1, 'оноо: хамтрагчид хугацаандаа гүйцэтгэсэн гэж тооцогдоно');

  const qb = QS('B', M);
  eq(qb.rated, 1, 'чанар: хамтрагчид ★ үнэлгээ тооцогдоно');
  eq(qb.score, 100, 'чанар: 5★ → 100 оноо');
  eq(QS('D', M).rated, 0, 'чанар: оролцоогүй хүнд тооцогдохгүй');
  st.tasks = saved;
}

// 25) Мэдэгдэл оролцогч бүрд очих эсэх (хамтран гүйцэтгэгч мартагдахгүй)
{
  const st = vm.runInContext('state', sandbox);
  const NF = vm.runInContext('notifyTaskAssigned', sandbox);
  const sent = [];
  const savedPB = vm.runInContext('pushBroadcast', sandbox);
  const savedMe = st.me;
  sandbox.pushBroadcast = (who, payload) => { sent.push(who); };
  st.me = 'Z';                                     // үүсгэгч = Z

  NF({ title: 'Цэвэрлэгээ', assignee: 'A', co_assignees: ['B', 'C'] });
  eq(sent.slice().sort(), ['A', 'B', 'C'], 'мэдэгдэл: хариуцагч + хамтрагч бүгдэд очно');

  sent.length = 0;
  st.me = 'A';                                     // хариуцагч өөрөө үүсгэсэн
  NF({ title: 'x', assignee: 'A', co_assignees: ['B'] });
  eq(sent, ['B'], 'мэдэгдэл: үүсгэгч өөртөө мэдэгдэл авахгүй');

  sent.length = 0;
  st.me = 'Z';
  NF({ title: 'x', assignee: 'A', co_assignees: ['A', 'B'] });
  eq(sent.slice().sort(), ['A', 'B'], 'мэдэгдэл: давхардсан хүнд нэг л удаа');

  sent.length = 0;
  NF(null);
  eq(sent, [], 'мэдэгдэл: ажил байхгүй бол юу ч илгээхгүй');

  sandbox.pushBroadcast = savedPB; st.me = savedMe;
}

// 26) Дамжлагын зураг харагдах эсэх (Бэлдсэн захиалгын зураг алга болж байсан)
{
  const SMH = vm.runInContext('stageMetaHtml', sandbox);
  const SAF = vm.runInContext('stageActionFor', sandbox);

  // Шинэ дараалал: ЦЭВЭРЛЭХ нь эхэлнэ (reserved→prepared = clean), дараа нь БЭЛДЭХ (prepared→ready = prepare)
  eq(SAF('reserved', 'prepared').key, 'clean', 'дамжлага: reserved→prepared нь clean түлхүүртэй (цэвэрлэх эхэлнэ)');
  eq(SAF('cleaning', 'prepared').key, 'clean', 'дамжлага: cleaning→prepared нь clean түлхүүртэй');
  eq(SAF('ready', 'prepared').key, 'clean', 'дамжлага: ready→prepared нь clean түлхүүртэй');
  eq(SAF('prepared', 'rented').key, 'dispatch', 'дамжлага: prepared→rented хэвээр dispatch');

  // ХУУЧИН датанд 'prepared' түлхүүрээр хадгалагдсан зураг ч харагдана
  const oldData = { stage_meta: { prepared: { by: '86855866', at: '2026-09-01T10:40:33.939Z',
    photos: ['https://drive.google.com/file/d/AAA/view'] } } };
  const h1 = SMH(oldData);
  ok(h1.indexOf('sm-photos') > -1, 'зураг: хуучин prepared түлхүүрийн зураг харагдана');
  ok(h1.indexOf('Бэлдсэн') > -1, 'зураг: prepared түлхүүрт ойлгомжтой нэр гарна');

  // Шинэ түлхүүр мөн ажиллана
  const newData = { stage_meta: { prepare: { by: 'X', photos: ['https://drive.google.com/file/d/B/view'] } } };
  ok(SMH(newData).indexOf('sm-photos') > -1, 'зураг: шинэ prepare түлхүүр харагдана');

  // stage_meta.quotes (массив) нь шат биш — эвдрэл үүсгэхгүй
  const withQuotes = { stage_meta: { quotes: [{ at: '2026-01-01', to: 'a@b.mn' }] } };
  eq(SMH(withQuotes), '', 'зураг: quotes массив шат гэж тооцогдохгүй');
  eq(SMH({}), '', 'зураг: stage_meta байхгүй бол хоосон');
  eq(SMH({ stage_meta: null }), '', 'зураг: null stage_meta аюулгүй');
}

// 27) Шошгийн нийцэл — нэг үйлдэл нэг л нэртэй байх
{
  const SLL = vm.runInContext('STAGE_LOG_LABEL', sandbox);
  const SML = vm.runInContext('STAGE_META_LABEL', sandbox);
  const BQS = vm.runInContext('BQ_STATUS', sandbox);
  ok(SLL.prepared.indexOf('Бэлдсэн') > -1, 'шошго: SL лог prepared = Бэлдсэн (төлвийн нэртэй нийцнэ)');
  eq(BQS.prepared.label, 'Цэвэрлэсэн', 'шошго: prepared төлвийн нэр Цэвэрлэсэн (шинэ дараалал)');
  ok(SML.prepare.indexOf('Бэлдсэн') > -1, 'шошго: stage_meta prepare = Бэлдсэн');
  ok(SLL.prepared.indexOf('Цэвэрлэсэн') === -1, 'шошго: prepared нь Цэвэрлэсэн ГЭЖ нэрлэгдэхээ болив');
}

// 28) Бэлдэх ба Цэвэрлэх нь ТУСДАА алхам болсон эсэх
{
  const NS  = vm.runInContext('orderNextStep', sandbox);
  const SAF = vm.runInContext('stageActionFor', sandbox);
  const BQS = vm.runInContext('BQ_STATUS', sandbox);
  const LEG = vm.runInContext('BQ_LEGACY_MAP', sandbox);
  const ORD = vm.runInContext('BQ_STATUS_ORDER', sandbox);
  const AT  = vm.runInContext('STAGE_AUTOTASK', sandbox);

  eq(NS({ status: 'reserved' }).to, 'prepared', 'урсгал: Захиалсан → Цэвэрлэсэн');
  eq(NS({ status: 'prepared' }).to, 'ready',    'урсгал: Цэвэрлэсэн → Бэлдсэн (ШИНЭ дараалал)');
  eq(NS({ status: 'ready' }).to,    'rented',   'урсгал: Бэлдсэн → Гаргах');
  eq(NS({ status: 'rented' }).to,   'returned', 'урсгал: Гарсан → Буцаан авах');

  eq(NS({ status: 'reserved' }).cap, 'orders.clean',    'эрх: эхний алхам (цэвэрлэх) orders.clean');
  eq(NS({ status: 'prepared' }).cap, 'orders.prepare',  'эрх: 2 дахь алхам (бэлдэх) orders.prepare');
  eq(NS({ status: 'ready' }).cap,    'orders.dispatch', 'эрх: гаргах алхам orders.dispatch');

  eq(SAF('prepared', 'ready').key, 'prepare', 'дамжлага: prepared→ready нь prepare түлхүүртэй');
  eq(SAF('ready', 'rented').key,   'dispatch','дамжлага: ready→rented нь dispatch');

  eq(BQS.ready.label, 'Бэлдсэн', 'төлөв: ready = Бэлдсэн');
  ok(!LEG.ready, 'төлөв: ready legacy зураглалаас гарсан (жинхэнэ төлөв боллоо)');
  ok(ORD.indexOf('ready') > ORD.indexOf('prepared'), 'төлөв: ready нь prepared-ийн ДАРАА эрэмбэлэгдэнэ');
  ok(ORD.indexOf('ready') < ORD.indexOf('rented'),   'төлөв: ready нь rented-ээс ӨМНӨ');

  eq(AT.reserved.cap, 'orders.clean', 'авто ажил: захиалсны дараа ЦЭВЭРЛЭХ ажил үүснэ');
  eq(AT.prepared.cap, 'orders.prepare', 'авто ажил: цэвэрлэсний дараа БЭЛДЭХ ажил үүснэ');
  eq(AT.ready.cap, 'orders.dispatch', 'авто ажил: бэлдсэний дараа ГАРГАХ ажил үүснэ');
}

// 30) worker_type override нь ӨӨРИЙН сесст мөн үйлчлэх эсэх
{
  const st   = vm.runInContext('state', sandbox);
  const TEAM = vm.runInContext('TEAM', sandbox);
  const isDW = vm.runInContext('isDailyWorker', sandbox);
  const isDM = vm.runInContext('isDailyMember', sandbox);
  const applyOv = vm.runInContext('applyWorkerTypeOverrides', sandbox);

  const savedTeam = TEAM.slice(), savedMe = st.me, savedUser = st.user, savedOv = st._wtOverrides;
  TEAM.length = 0;
  TEAM.push({ name: 'Тест Ажилтан', phone: '89600906', role: 'Агуулахын ажилтан', worker_type: 'daily' });
  st.me = '89600906';
  st.user = { name: 'Тест Ажилтан', phone: '89600906', role: 'Агуулахын ажилтан', worker_type: 'daily' };

  ok(isDW(), 'override-гүй үед: DB-ийн daily хүчинтэй');

  // CEO «Үндсэн» болгов → override тавигдана
  st._wtOverrides = { '89600906': 'permanent' };
  applyOv();
  ok(!isDM(TEAM[0]), 'override: TEAM бичлэг үндсэн боллоо');
  ok(!isDW(), 'override: ӨӨРИЙН сесст ч үндсэн гэж тооцогдоно (гол засвар)');
  eq(st.user.worker_type, 'permanent', 'override: state.user хуулбар мөн шинэчлэгдэнэ');

  // Буцаад цагийн болгоход мөн ажиллана
  st._wtOverrides = { '89600906': 'daily' };
  applyOv();
  ok(isDW(), 'override: цагийн руу буцаахад мөн үйлчилнэ');

  // TEAM-д байхгүй хүн — state.user рүү уналт хийнэ, унахгүй
  st.me = '00000000'; st.user = { worker_type: 'daily' };
  ok(isDW(), 'TEAM-д олдоогүй бол state.user-ээр шийднэ, алдаа өгөхгүй');

  TEAM.length = 0; savedTeam.forEach(m => TEAM.push(m));
  st.me = savedMe; st.user = savedUser; st._wtOverrides = savedOv;
}

// 31) Гүйцэтгэгч ажилтанд мөнгө/илүүц таб харагдахгүй
{
  const st  = vm.runInContext('state', sandbox);
  const SEE = vm.runInContext('canSeeOrderMoney', sandbox);
  const STF = vm.runInContext('ORDER_STAFF_STATUSES', sandbox);
  const ORD = vm.runInContext('BQ_STATUS_ORDER', sandbox);

  const savedCEO = st.isCEO, savedMe = st.me, savedMp = st.memberPerms, savedRp = st.rolePerms;
  st.isCEO = false; st.me = 'W1'; st.rolePerms = {};

  st.memberPerms = { W1: { 'orders.pay': false } };
  ok(!SEE(), 'нууцлал: orders.pay эрхгүй ажилтанд дүн харагдахгүй');

  st.memberPerms = { W1: { 'orders.pay': true } };
  ok(SEE(), 'нууцлал: orders.pay эрхтэй хүн дүн харна');

  st.memberPerms = {}; st.isCEO = true;
  ok(SEE(), 'нууцлал: CEO үргэлж харна');
  st.isCEO = false;

  // Ажилтанд харагдах табууд — ноорог/архив/цуцалсан/устгасан БАЙХГҮЙ
  ['draft', 'archived', 'canceled', 'deleted', 'stopped'].forEach(k =>
    ok(!STF.includes(k), `таб: «${k}» гүйцэтгэгчид харагдахгүй`));
  ['reserved', 'prepared', 'ready', 'rented', 'returned'].forEach(k =>
    ok(STF.includes(k), `таб: «${k}» гүйцэтгэгчид харагдана`));
  STF.forEach(k => ok(ORD.includes(k), `таб: «${k}» нь бодит төлөв мөн`));

  st.isCEO = savedCEO; st.me = savedMe; st.memberPerms = savedMp; st.rolePerms = savedRp;
}

// 32) Рендерийн алдаа хуучин агуулгыг үлдээхгүй
{
  const SV = vm.runInContext('safeViewHtml', sandbox);
  const okHtml = SV(() => '<div>зөв</div>', 'Тест');
  eq(okHtml, '<div>зөв</div>', 'safeViewHtml: хэвийн үед үр дүнг шууд буцаана');
  const bad = SV(() => { throw new Error('туршилтын алдаа'); }, 'M event захиалга');
  ok(bad.indexOf('алдаа гарлаа') > -1, 'safeViewHtml: алдаанд ойлгомжтой мессеж');
  ok(bad.indexOf('M event захиалга') > -1, 'safeViewHtml: аль хэсэг болохыг хэлнэ');
  ok(bad.indexOf('туршилтын алдаа') > -1, 'safeViewHtml: алдааны эх шалтгааныг харуулна');
  ok(bad.length > 0, 'safeViewHtml: хоосон буцаахгүй (хуучин агуулга үлдэхгүй)');
}

// 33) Агуулахын ажилтан ба ахлахын эрхийн ялгаа
{
  const RP = vm.runInContext('rolePresetFor', sandbox);

  const worker = RP('Агуулахын ажилтан');
  ok(worker && worker.views.includes('products'), 'ажилтан: бараа ХАРНА');
  ok(worker && worker.views.includes('orders'), 'ажилтан: захиалга харна');
  ok(worker && !worker.actions.includes('products.edit'), 'ажилтан: бараа ЗАСАХГҮЙ');
  ok(worker && worker.actions.includes('orders.prepare'), 'ажилтан: захиалга бэлдэнэ');
  ok(worker && worker.actions.includes('orders.clean'), 'ажилтан: цэвэрлэнэ');
  ok(worker && !worker.actions.includes('orders.pay'), 'ажилтан: төлбөр бүртгэхгүй (дүн харагдахгүй)');

  const lead = RP('Агуулахын ахлах / Нярав');
  ok(lead && lead.actions.includes('products.edit'), 'ахлах: бараа ЗАСНА');
  ok(lead && lead.actions.includes('orders.dispatch'), 'ахлах: захиалга гаргана');

  const nyarav = RP('Нярав');
  ok(nyarav && nyarav.actions.includes('products.edit'), 'нярав: бараа засна');

  // Бусад роль хэвээр — «Эвент менежер» нь /эвент/ загварт эхэлж таардаг (өмнөх зан төлөв)
  ok(RP('Менежер').actions.includes('products.edit'), 'менежер: бараа засах эрх хэвээр');
  ok(RP('Үйл ажиллагааны захирал').actions.includes('products.edit'), 'ҮАХ захирал: хэвээр');
  ok(!RP('Эвент менежер').actions.includes('products.edit'), 'эвент менежер: /эвент/ загвар — бараа засахгүй (хэвээр)');
}

// 34) Ажилтанд ноорог/архив/цуцалсан захиалга ӨГӨГДӨЛ дээрээ ирэхгүй
{
  const st = vm.runInContext('state', sandbox);
  const RO = vm.runInContext('renderOrders', sandbox);
  const STF = vm.runInContext('ORDER_STAFF_STATUSES', sandbox);
  const saved = { ceo: st.isCEO, me: st.me, mp: st.memberPerms, rp: st.rolePerms, ao: st.appOrders, bo: st.bqOrders, o: st.orders };

  st.orders = []; st.bqOrders = []; st.rolePerms = {};
  st.appOrders = [
    { id: 'a', number: 1, status: 'draft',    customer: 'Ноорог',   total_mnt: 100, starts_at: '2026-09-01', stops_at: '2026-09-02', items: [] },
    { id: 'b', number: 2, status: 'archived', customer: 'Архив',    total_mnt: 200, starts_at: '2026-09-01', stops_at: '2026-09-02', items: [] },
    { id: 'c', number: 3, status: 'reserved', customer: 'Захиалсан', total_mnt: 300, paid_mnt: 300, starts_at: '2026-09-01', stops_at: '2026-09-02', items: [] },
    { id: 'd', number: 4, status: 'canceled', customer: 'Цуцалсан', total_mnt: 400, starts_at: '2026-09-01', stops_at: '2026-09-02', items: [] },
  ];

  st.isCEO = false; st.me = 'W1'; st.memberPerms = { W1: { orders: true, 'orders.pay': false } };
  const staffHtml = String(RO());
  ok(staffHtml.indexOf('Захиалсан') > -1, 'ажилтан: идэвхтэй захиалга харагдана');
  ok(staffHtml.indexOf('Ноорог') === -1,   'ажилтан: НООРОГ харагдахгүй');
  ok(staffHtml.indexOf('Архив') === -1,    'ажилтан: АРХИВ харагдахгүй');
  ok(staffHtml.indexOf('Цуцалсан') === -1, 'ажилтан: ЦУЦАЛСАН харагдахгүй');
  ok(staffHtml.indexOf('Төлбөр: бүгд') === -1, 'ажилтан: төлбөрийн шүүлтүүр алга');
  ok(staffHtml.indexOf('Барьцаа: бүгд') === -1, 'ажилтан: барьцааны шүүлтүүр алга');
  ok(staffHtml.indexOf('НӨАТ: бүгд') === -1,   'ажилтан: НӨАТ шүүлтүүр алга');

  st.memberPerms = { W1: { orders: true, 'orders.pay': true } };
  const mgrHtml = String(RO());
  ok(mgrHtml.indexOf('Ноорог') > -1, 'менежер: ноорог хэвээр харагдана');
  ok(mgrHtml.indexOf('Төлбөр: бүгд') > -1, 'менежер: төлбөрийн шүүлтүүр хэвээр');

  STF.forEach(k => ok(typeof k === 'string', 'төлвийн жагсаалт мөр утгатай'));
  st.isCEO = saved.ceo; st.me = saved.me; st.memberPerms = saved.mp; st.rolePerms = saved.rp;
  st.appOrders = saved.ao; st.bqOrders = saved.bo; st.orders = saved.o;
}

// 35) Дамжлагын авто ажил унтарсан + үнэлгээний асуулт тодорхой болсон
{
  const ON  = vm.runInContext('STAGE_AUTOTASK_ENABLED', sandbox);
  const PSI = vm.runInContext('prevStageInfo', sandbox);
  const PSQ = vm.runInContext('prevStageQuestion', sandbox);
  const st  = vm.runInContext('state', sandbox);

  eq(ON, false, 'авто ажил: дамжлагын ажил автоматаар үүсэхээ болив');

  // Өмнөх шатыг ХЭН, АЛЬ шат гэдгээр нь таних
  const o = { stage_meta: {
    prepare: { by: 'A', at: '2026-09-01T10:00:00Z' },
    clean:   { by: 'B', at: '2026-09-01T12:00:00Z' },
  } };
  const p1 = PSI(o, 'C');
  eq(p1 && p1.key, 'clean', 'өмнөх шат: хамгийн сүүлийнх (clean)');
  eq(p1 && p1.by, 'B', 'өмнөх шат: гүйцэтгэсэн хүн');
  const p2 = PSI(o, 'B');   // өөрийгөө тооцохгүй
  eq(p2 && p2.key, 'prepare', 'өмнөх шат: өөрийн хийсэн шатыг алгасна');
  eq(PSI({ stage_meta: {} }, 'C'), null, 'өмнөх шат: байхгүй бол null');
  eq(PSI({ stage_meta: { quotes: [{ to: 'x' }] } }, 'C'), null, 'өмнөх шат: quotes массив шат биш');

  // Өмнөх шат — хэн хийснээс үл хамааран сүүлийнх (асуулт нь ҮҮГЭЭР тодорхойлогдоно)
  const PSA = vm.runInContext('prevStageInfoAny', sandbox);
  const pa = PSA(o);
  eq(pa && pa.key, 'clean', 'prevStageInfoAny: сүүлийн шат (хэн ч бай)');

  // Асуулт нь шатдаа тохирсон, ерөнхий биш
  const qClean = PSQ({ by: 'B', key: 'clean' });
  ok(/цэвэрлэгээ/i.test(qClean), 'асуулт: цэвэрлэгээний тухай тодорхой');
  ok(qClean.indexOf('хүлээлгэж өгсөн ажлыг үнэлнэ') === -1, 'асуулт: ерөнхий томьёолол ашиглахаа болив');
  const qPrep = PSQ({ by: 'A', key: 'prepare' });
  ok(qPrep.indexOf('бүрэн') > -1, 'асуулт: бэлтгэл бүрэн эсэхийг асууна');
  ok(PSQ({ by: 'A', key: 'deliver' }).indexOf('цаг хугацаа') > -1, 'асуулт: хүргэлт цаг хугацааны тухай');
  ok(PSQ({ by: 'A', key: 'received' }).indexOf('эвдрэлгүй') > -1, 'асуулт: буцаан авалт эвдрэлийн тухай');
  eq(PSQ(null), null, 'асуулт: өмнөх шат байхгүй бол null');
  ok(PSQ({ by: 'A', key: 'танихгүй_шат' }).length > 0, 'асуулт: танигдаагүй шатад ерөнхий асуулт');

  // Олон үнэлгээ (handoffRatings массив — Агуулахаас гарах дээр цэвэрлэгч+бэлдэгч)
  const HQS = vm.runInContext('handoffQualityScore', sandbox);
  vm.runInContext('state.appOrders = ' + JSON.stringify([
    { stage_meta: { dispatch: { by: 'N', at: '2026-09-01T10:00:00Z', handoffRatings: [{ ratee: 'cleaner', rating: 4 }, { ratee: 'prep', rating: 5 }] } } },
    { stage_meta: { prepare: { by: 'X', at: '2026-09-02T10:00:00Z', handoffRating: 3, handoffRatee: 'cleaner' } } },
  ]) + ';', sandbox);
  const hc = HQS('cleaner', '2026-09');
  eq(hc.count, 2, 'handoff: цэвэрлэгч 2 үнэлгээ (массив + legacy)');
  ok(Math.abs(hc.avg - 3.5) < 0.01, 'handoff: цэвэрлэгч дундаж (4+3)/2=3.5');
  eq(HQS('prep', '2026-09').count, 1, 'handoff: бэлдэгч 1 үнэлгээ (массиваас)');

  // Хамтрагч — pipelineThroughput нь by + helpers хоёуланг тоолно
  const PTP = vm.runInContext('pipelineThroughput', sandbox);
  vm.runInContext('state.appOrders = ' + JSON.stringify([
    { stage_meta: { clean: { by: 'A', at: '2026-09-01T10:00:00Z', helpers: ['B', 'C'] } } },
  ]) + ';', sandbox);
  eq(PTP('A', '2026-09'), 1, 'throughput: гол гүйцэтгэгч тоологдоно');
  eq(PTP('B', '2026-09'), 1, 'throughput: хамтрагч тоологдоно');
  eq(PTP('C', '2026-09'), 1, 'throughput: хамтрагч 2 тоологдоно');
  eq(PTP('D', '2026-09'), 0, 'throughput: оролцоогүй хүн 0');
  vm.runInContext('state.appOrders = [];', sandbox);
}

// 36) 6 шаттай дамжлага — хүргэлттэй ба очиж авах салаа
{
  const NS  = vm.runInContext('orderNextStep', sandbox);
  const SAF = vm.runInContext('stageActionFor', sandbox);
  const BQS = vm.runInContext('BQ_STATUS', sandbox);
  const LEG = vm.runInContext('BQ_LEGACY_MAP', sandbox);
  const STF = vm.runInContext('ORDER_STAFF_STATUSES', sandbox);

  // Хүргэлттэй захиалга — DLV токеноор танина
  const DLV = (st) => ({ status: st, note: '⟦DLV|city|0|150000⟧' });
  const PICK = (st) => ({ status: st, note: '⟦DLV|pickup|0|0⟧' });

  // Хүргэлттэй: 6 шат
  eq(NS(DLV('reserved')).to,   'prepared',   'хүргэлт 1: Захиалсан → Бэлдсэн');
  eq(NS(DLV('prepared')).to,   'ready',      'хүргэлт 2: Бэлдсэн → Цэвэрлэсэн');
  eq(NS(DLV('ready')).to,      'delivering', 'хүргэлт 3: Цэвэрлэсэн → Агуулахаас гарсан');
  eq(NS(DLV('delivering')).to, 'rented',     'хүргэлт 4: Агуулахаас гарсан → Хүргэж өгсөн');
  eq(NS(DLV('rented')).to,     'returning',  'хүргэлт 5: Хүргэж өгсөн → Хүргэлтээр авсан');
  eq(NS(DLV('returning')).to,  'returned',   'хүргэлт 6: Хүргэлтээр авсан → Агуулахад хүлээн авсан');
  eq(NS(DLV('returned')).to,   'archived',   'хүргэлт: дараа нь архив');

  // Очиж авах: 4, 5-р шат ГАРАХГҮЙ
  eq(NS(PICK('ready')).to,  'rented',   'очиж авах: Цэвэрлэсэн → шууд Олгосон');
  eq(NS(PICK('rented')).to, 'returned', 'очиж авах: Олгосон → шууд Агуулахад хүлээн авсан');

  // Эрх — шат бүр зөв хүнд
  eq(NS(DLV('ready')).cap,      'orders.dispatch', 'эрх: агуулахаас гаргах нь нярав');
  eq(NS(DLV('delivering')).cap, 'orders.deliver',  'эрх: хүргэж өгөх нь жолооч');
  eq(NS(DLV('rented')).cap,     'orders.deliver',  'эрх: хүргэлтээр авах нь жолооч');
  eq(NS(DLV('returning')).cap,  'orders.dispatch', 'эрх: агуулахад хүлээн авах нь нярав');

  // Шатны түлхүүр — зураг/үнэлгээ тус тусдаа хадгалагдана
  eq(SAF('ready', 'delivering').key,   'dispatch', 'түлхүүр: агуулахаас гаргах');
  eq(SAF('delivering', 'rented').key,  'deliver',  'түлхүүр: хүргэж өгсөн');
  eq(SAF('rented', 'returning').key,   'retstart', 'түлхүүр: хүргэлтээр авсан');
  eq(SAF('returning', 'returned').key, 'received', 'түлхүүр: агуулахад хүлээн авсан');

  // Төлөв жинхэнэ болсон эсэх
  ok(!LEG.delivering, 'төлөв: delivering legacy зураглалаас гарсан');
  ok(!LEG.returning,  'төлөв: returning legacy зураглалаас гарсан');
  eq(BQS.delivering.label, 'Агуулахаас гаргасан', 'нэр: delivering');
  eq(BQS.returning.label,  'Хүргэлтээр авсан',  'нэр: returning');
  ok(STF.includes('delivering') && STF.includes('returning'), 'ажилтан: шинэ шатууд харагдана');
}

// 37) Засварын дамжлага
{
  const ST = vm.runInContext('REPAIR_STAGES', sandbox);
  const RID = vm.runInContext('repairId', sandbox);

  eq(ST.pending.next, 'in_progress', 'засвар: хүлээж буй → засаж байна');
  eq(ST.in_progress.next, 'fixed',   'засвар: засаж байна → зассан');
  eq(ST.fixed.next, null,            'засвар: зассан нь эцсийн шат');
  eq(ST.written_off.next, null,      'засвар: актлав нь эцсийн шат');
  ok(ST.pending.label.indexOf('Засвар') > -1, 'засвар: шатны нэр монголоор');

  const id1 = RID('M-069', 1455), id2 = RID('M-069', 1455);
  ok(id1.indexOf('M069') > -1, 'засвар: id-д sku багтана');
  ok(id1.indexOf('1455') > -1, 'засвар: id-д захиалгын дугаар багтана');
  ok(!/[^\w]/.test(id1.replace(/_/g, '')), 'засвар: id аюулгүй тэмдэгттэй');
  ok(RID('M/069 x', 0).indexOf('/') === -1, 'засвар: sku дахь тусгай тэмдэгт цэвэрлэгдэнэ');
}

// 38) Засвар дуусгахад зураг ЗААВАЛ
{
  const st = vm.runInContext('state', sandbox);
  const AR = vm.runInContext('advanceRepair', sandbox);
  const saved = { rep: st.repairs, me: st.me, ceo: st.isCEO, mp: st.memberPerms };
  st.isCEO = true; st.me = 'W1';
  st.repairs = [{ id: 'r1', sku: 'M-069', product_name: 'Тест', qty: 2, status: 'in_progress' }];

  let opened = null;
  const origOpen = vm.runInContext('openRepairFinishModal', sandbox);
  sandbox.openRepairFinishModal = (id, to) => { opened = { id, to }; };

  AR('r1', 'fixed');                       // зураггүй → модал нээгдэх ёстой
  eq(opened && opened.to, 'fixed', 'засвар: зураггүй «Зассан» дарвал зургийн модал нээгдэнэ');
  ok(st.repairs[0].status === 'in_progress', 'засвар: зураггүй бол төлөв ӨӨРЧЛӨГДӨХГҮЙ');

  opened = null;
  AR('r1', 'written_off');
  eq(opened && opened.to, 'written_off', 'засвар: актлахад ч зураг шаардана');
  ok(st.repairs[0].status === 'in_progress', 'засвар: актлах ч зураггүйгээр болохгүй');

  opened = null;
  AR('r1', 'in_progress');                 // засварт авахад зураг шаардахгүй
  eq(opened, null, 'засвар: «Засварт авах» шатанд зураг шаардахгүй');

  sandbox.openRepairFinishModal = origOpen;
  st.repairs = saved.rep; st.me = saved.me; st.isCEO = saved.ceo; st.memberPerms = saved.mp;
}

// 39) Буцаан авалтын тоолол — дутсан барааг барина
{
  const RS = vm.runInContext('receiveShortfalls', sandbox);
  const items = [
    { sku: 'A', name: 'Ширээ', qty: 10 },
    { sku: 'B', name: 'Сандал', qty: 50 },
    { sku: 'C', name: 'Асар', qty: 1 },
  ];
  eq(RS(items, [10, 50, 1]), [], 'тоолол: бүгд бүрэн ирвэл зөрүүгүй');

  const sh = RS(items, [10, 47, 0]);
  eq(sh.length, 2, 'тоолол: 2 бараанд зөрүү');
  eq(sh[0].name, 'Сандал', 'тоолол: дутсан барааг нэрээр нь заана');
  eq(sh[0].miss, 3, 'тоолол: 50-аас 47 ирвэл 3 дутуу');
  eq(sh[1].miss, 1, 'тоолол: асар огт ирээгүй');

  eq(RS(items, [99, 50, 1]), [], 'тоолол: хүлээгдсэнээс их тоо оруулбал таслана (сөрөг зөрүү үүсэхгүй)');
  eq(RS(items, [-5, 50, 1])[0].miss, 10, 'тоолол: сөрөг тоо 0 гэж тооцогдоно');
  eq(RS(items, [null, 50, 1])[0].miss, 10, 'тоолол: хоосон утга 0');
  eq(RS([], []), [], 'тоолол: бараагүй бол хоосон');
  eq(RS(null, null), [], 'тоолол: null аюулгүй');
  eq(RS(items, [10, 50])[0].miss, 1, 'тоолол: дутуу массив — сүүлийн бараа 0 гэж тооцогдоно');
}

// 40) Шат алгасах эрх — зөвхөн CEO / тусгайлан олгосон хүн
{
  const st = vm.runInContext('state', sandbox);
  const CS = vm.runInContext('canSkipStage', sandbox);
  const SMH = vm.runInContext('stageMetaHtml', sandbox);
  const saved = { ceo: st.isCEO, me: st.me, mp: st.memberPerms, rp: st.rolePerms };
  st.me = 'W1'; st.rolePerms = {};

  st.isCEO = false; st.memberPerms = { W1: { 'orders.skip': false } };
  ok(!CS(), 'алгасах: эрхгүй ажилтан алгасаж чадахгүй');

  st.memberPerms = { W1: { 'orders.skip': true } };
  ok(CS(), 'алгасах: эрх олгосон хүн чадна');

  st.memberPerms = {}; st.isCEO = true;
  ok(CS(), 'алгасах: CEO үргэлж чадна');
  st.isCEO = false;

  // Алгассан шат ИЛ харагдана
  const h = SMH({ stage_meta: { clean: { by: 'W1', at: '2026-09-02T10:00:00Z', skipped: true, reason: 'Цэвэрлэгч ажилдаа гараагүй' } } });
  ok(h.indexOf('алгассан') > -1, 'алгасах: картад «алгассан» тэмдэг гарна');
  ok(h.indexOf('Цэвэрлэгч ажилдаа гараагүй') > -1, 'алгасах: шалтгаан харагдана');

  const h2 = SMH({ stage_meta: { clean: { by: 'W1', at: '2026-09-02T10:00:00Z', photos: ['u'] } } });
  ok(h2.indexOf('алгассан') === -1, 'алгасах: хэвийн шатанд тэмдэг гарахгүй');

  st.isCEO = saved.ceo; st.me = saved.me; st.memberPerms = saved.mp; st.rolePerms = saved.rp;
}

// 40b) Шат БУЦААХ эрх + засах модалын төлөв сонгогч (урагш үсрэх нүх хаагдсан эсэх)
{
  const st = vm.runInContext('state', sandbox);
  const CR = vm.runInContext('canRevertStage', sandbox);
  const AES = vm.runInContext('allowedEditStatuses', sandbox);
  const SMH = vm.runInContext('stageMetaHtml', sandbox);
  const ORDER = vm.runInContext('BQ_STATUS_ORDER', sandbox);
  const saved = { ceo: st.isCEO, me: st.me, mp: st.memberPerms, rp: st.rolePerms };
  st.me = 'W1'; st.rolePerms = {};

  st.isCEO = false; st.memberPerms = {};
  ok(!CR(), 'буцаах: тусгайлан олгоогүй бол ХОРИГЛОНО (default-deny)');
  st.memberPerms = { W1: { 'orders.revert': true } };
  ok(CR(), 'буцаах: эрх олгосон хүн (ҮАХ захирал) чадна');
  st.memberPerms = {}; st.isCEO = true;
  ok(CR(), 'буцаах: CEO үргэлж чадна');
  st.isCEO = false;

  // Эрхгүй хүнд сонголт огт байхгүй — өөрчлөх боломжгүй
  eq(AES('ready', ORDER, false), ['ready'], 'сонгогч: эрхгүй бол зөвхөн одоогийн төлөв');

  // Эрхтэй хүнд ЗӨВХӨН урвуу чиглэл (урагшлах сонголт гарахгүй)
  const back = AES('rented', ORDER, true);
  ok(back.indexOf('rented') > -1, 'сонгогч: одоогийн төлөв багтана');
  ok(back.indexOf('ready') > -1 && back.indexOf('prepared') > -1, 'сонгогч: өмнөх шатууд багтана');
  ok(back.indexOf('returned') === -1 && back.indexOf('archived') === -1, 'сонгогч: УРАГШ үсрэх сонголт гарахгүй');
  ok(back.indexOf('draft') === -1, 'сонгогч: draft руу буцаахгүй');
  ok(back.indexOf('canceled') === -1 && back.indexOf('deleted') === -1, 'сонгогч: цуцлах/устгах нь дамжлагын шат биш');

  // Танигдахгүй төлөв — аюулгүй тал руу (өөрчлөх боломжгүй)
  eq(AES('ямар_нэг', ORDER, true), ['ямар_нэг'], 'сонгогч: танигдахгүй төлөвт өөрчлөлт зөвшөөрөхгүй');

  // Буцаалт түүхэнд ИЛ үлдэнэ
  const h = SMH({ stage_meta: { revert: { by: 'W1', at: '2026-09-02T10:00:00Z', from: 'rented', to: 'ready', comment: 'Түрээслэгдсэн → Цэвэрлэсэн' } } });
  ok(h.indexOf('Шат буцаасан') > -1, 'буцаах: түүхэнд «Шат буцаасан» гэж харагдана');
  ok(h.indexOf('Түрээслэгдсэн → Цэвэрлэсэн') > -1, 'буцаах: аль шатнаас хаашаа буцсан нь харагдана');

  st.isCEO = saved.ceo; st.me = saved.me; st.memberPerms = saved.mp; st.rolePerms = saved.rp;
}

// 40c) Захиалга хаах — төлбөр авсан эсэхээр УСТГАХ/ЦУЦЛАХ ялгана
{
  const CA = vm.runInContext('orderCloseAction', sandbox);
  const CL = vm.runInContext('orderCloseLabel', sandbox);
  const PA = vm.runInContext('orderPaidAmount', sandbox);

  eq(CA({ paid_mnt: 0 }), 'deleted', 'хаах: төлбөргүй → устгах');
  eq(CA({ paid_mnt: null }), 'deleted', 'хаах: paid_mnt хоосон → устгах');
  eq(CA({}), 'deleted', 'хаах: талбар огт байхгүй → устгах');
  eq(CA({ paid_mnt: 1 }), 'canceled', 'хаах: 1₮ ч орсон бол цуцлах');
  eq(CA({ paid_mnt: 330000 }), 'canceled', 'хаах: төлбөртэй → цуцлах');

  // Түүхэн (bq) захиалга total_paid талбартай
  eq(CA({ total_paid: 55000 }), 'canceled', 'хаах: bq total_paid-г мөн таньна');
  eq(CA({ total_paid: 0 }), 'deleted', 'хаах: bq төлбөргүй → устгах');

  // Барьцаа/нийт дүн нь ТӨЛБӨР БИШ — зөвхөн бодитоор орсон мөнгө шийднэ
  eq(CA({ total_mnt: 16681500, paid_mnt: 0 }), 'deleted', 'хаах: борлуулалтын дүн төлбөр биш');
  eq(CA({ deposit_mnt: 500000, paid_mnt: 0 }), 'deleted', 'хаах: барьцааны дүн ч төлбөр биш');

  eq(PA({ paid_mnt: 0, total_paid: 900 }), 0, 'хаах: paid_mnt тэргүүлнэ (0 ч гэсэн)');

  ok(CL({ paid_mnt: 0 }).indexOf('Устгах') > -1, 'хаах: төлбөргүйд товч «Устгах»');
  ok(CL({ paid_mnt: 5 }).indexOf('Цуцлах') > -1, 'хаах: төлбөртэйд товч «Цуцлах»');
}

// 40d) Боломжит борлуулалт (ноорог) + илгээсэн үнийн саналын лог
{
  const QO = vm.runInContext('quotesOf', sandbox);
  const DPT = vm.runInContext('draftPipelineTotal', sandbox);

  eq(QO({}), [], 'санал: stage_meta байхгүй → хоосон');
  eq(QO({ stage_meta: {} }), [], 'санал: quotes байхгүй → хоосон');
  eq(QO({ stage_meta: { quotes: 'муу' } }), [], 'санал: массив биш → хоосон');
  eq(QO({ stage_meta: { quotes: [{ amount: 5 }] } }).length, 1, 'санал: логийг уншина');

  const orders = [
    { status: 'draft',    total_mnt: 1000, deposit_mnt: 200 },   // 800
    { status: 'draft',    total_mnt: 500,  deposit_mnt: 0 },     // 500
    { status: 'reserved', total_mnt: 9999 },                      // тоологдохгүй
    { status: 'canceled', total_mnt: 7777 },                      // тоологдохгүй
    { status: 'deleted',  total_mnt: 6666 },                      // тоологдохгүй
  ];
  eq(DPT(orders), 1300, 'боломжит: зөвхөн ноорог, барьцаа хасагдсан');
  eq(DPT([]), 0, 'боломжит: ноороггүй бол 0');

  // Санхүүд ОРОХГҮЙ — _orderActive нь draft-ыг хасдаг (гол баталгаа)
  const OA = vm.runInContext('_orderActive', sandbox);
  ok(!OA({ status: 'draft' }), 'боломжит: ноорог санхүүгийн тооцоонд орохгүй');
  ok(OA({ status: 'reserved' }), 'боломжит: баталгаажсан захиалга орно');
}

// 40e) Захиалгын эх сурвалж — сайт уу, ажилтан уу
{
  const SK = vm.runInContext('orderSourceKey', sandbox);
  const SS = vm.runInContext('siteShare', sandbox);

  eq(SK({ source: 'm-event-website' }), 'site', 'эх: m-event-website → сайт');
  eq(SK({ source: 'M-Event-Website' }), 'site', 'эх: том жижиг үсэг хамаарахгүй');
  eq(SK({ source: 'booqable' }), 'booqable', 'эх: booqable → түүхэн');
  eq(SK({ source: 'app' }), 'app', 'эх: app → ажилтан');
  eq(SK({}), 'app', 'эх: талбар хоосон бол ажилтных гэж үзнэ');

  const rows = [
    { source: 'm-event-website' }, { source: 'm-event-website' },
    { source: 'app' }, { source: 'app' }, { source: '' },
    { source: 'booqable' }, { source: 'booqable' }, { source: 'booqable' },
  ];
  const sh = SS(rows);
  eq(sh.site, 2, 'хувь: сайтын тоо');
  eq(sh.total, 5, 'хувь: Booqable түүх хуваарьт ОРОХГҮЙ');
  eq(sh.pct, 40, 'хувь: 2/5 = 40%');

  eq(SS([]).pct, 0, 'хувь: хоосонд 0 (тэгд хуваахгүй)');
  eq(SS([{ source: 'booqable' }]).pct, 0, 'хувь: зөвхөн түүх бол 0');
}

// 40f) Борлуулалтын суваг тайлан — сайт vs ажилтан, 2026-09-аас
{
  const AV = vm.runInContext('srcStatsAvailable', sandbox);
  const CS = vm.runInContext('channelStats', sandbox);

  ok(!AV('2026-08'), 'суваг: 8-р сар харагдахгүй (дата найдваргүй)');
  ok(!AV('2026-07'), 'суваг: 7-р сар харагдахгүй (CORS-оос захиалга тасарсан)');
  ok(AV('2026-09'), 'суваг: 9-р сараас эхэлнэ');
  ok(AV('2026-12'), 'суваг: дараагийн саруудад харагдана');
  ok(AV('2027-01'), 'суваг: дараа жилд ч харагдана');
  ok(!AV(''), 'суваг: сар хоосон бол харуулахгүй');

  const rows = [
    { source: 'm-event-website', total_mnt: 1000, deposit_mnt: 0 },
    { source: 'm-event-website', total_mnt: 3000, deposit_mnt: 0 },
    { source: 'app', total_mnt: 2000, deposit_mnt: 0 },
    { source: '', total_mnt: 4000, deposit_mnt: 0 },
    { source: 'booqable', total_mnt: 9999, deposit_mnt: 0 },   // түүх — орохгүй
  ];
  const cs = CS(rows, 'accrual');
  eq(cs.site.n, 2, 'суваг: сайтын тоо');
  eq(cs.staff.n, 2, 'суваг: ажилтны тоо (source хоосон = ажилтных)');
  eq(cs.n, 4, 'суваг: Booqable нийлбэрт ОРОХГҮЙ');
  eq(cs.site.inc, 4000, 'суваг: сайтын орлого');
  eq(cs.site.avg, 2000, 'суваг: сайтын дундаж дүн');
  eq(cs.staff.avg, 3000, 'суваг: ажилтны дундаж дүн');

  // Барьцаа орлогоос хасагдана (orderRevenue-тэй нийцнэ)
  const dep = CS([{ source: 'm-event-website', total_mnt: 1000, deposit_mnt: 400 }], 'accrual');
  eq(dep.site.inc, 600, 'суваг: барьцаа хасагдана');

  // Барьцаа буцаалт(5810) = ЗАРДАЛ БИШ (P&L саармаг) — орлого талтай тэнцвэртэй
  const FIR = vm.runInContext('finIsRealExpense', sandbox);
  const FDR = vm.runInContext('finIsDepositReturn', sandbox);
  eq(FDR({ category: '5810' }), true, 'барьцаа буцаалт: 5810 танина');
  eq(FDR({ category: '5100' }), false, 'барьцаа буцаалт: 5100 биш');
  eq(FIR({ decision: 'approved', category: '5810' }), false, 'зардал: барьцаа буцаалт(5810) ХАСАГДАНА');
  eq(FIR({ decision: 'approved', category: '6900' }), false, 'зардал: эзний зээл(6900) хасагдана');
  eq(FIR({ decision: 'approved', category: '3100' }), true, 'зардал: жинхэнэ зардал(3100) тоологдоно');

  // COO цалин — цэвэр ашгаас хувь (алдагдалтай бол 0, дугуйрна)
  const COO = vm.runInContext('cooShareAmount', sandbox);
  eq(COO(12000000, 30), 3600000, 'COO: 12сая ашгийн 30% = 3.6сая');
  eq(COO(-5000000, 30), 0, 'COO: алдагдалтай сард 0 (сөрөг цалин үгүй)');
  eq(COO(0, 30), 0, 'COO: 0 ашигт 0');
  eq(COO(10000000, 0), 0, 'COO: 0% = 0');

  // Түрээсийн түүх — KPI (Нийт орлого) ба сарын нийлбэр НЭГ эх сурвалжаас (зөрөхгүй)
  const HC = vm.runInContext('_histCompute', sandbox);
  const _h = HC([
    { customer: 'Бат', total_mnt: 1000, paid_mnt: 500, deposit_mnt: 200, starts_at: '2026-07-10', items: [] },
    { customer: 'Болд', total_mnt: 2000, paid_mnt: 2000, deposit_mnt: 0, starts_at: '2026-08-01', items: [] },
    { customer: 'NOMAAD Camp', total_mnt: 9999, paid_mnt: 9999, deposit_mnt: 0, starts_at: '2026-07-01', items: [] },
  ], null, () => 'Бусад');
  eq(_h.summary.net_revenue_mnt, 2800, 'түүх: net = (1000−200)+2000, NOMAAD(self) хасна');
  eq(_h.summary.real_orders, 2, 'түүх: бодит захиалга 2 (self хасна)');
  eq(_h.monthly.reduce((s, x) => s + x.net_mnt, 0), _h.summary.net_revenue_mnt, 'түүх: сарын нийлбэр = Нийт орлого KPI (дотоод зөрүү үгүй)');

  // Захиалгын дамжлагын авто-ажил ажлын жагсаалтаас нуугдана (NOMAAD бэлтгэл ХАРАГДАНА)
  const IOA = vm.runInContext('isOrderAutoTask', sandbox);
  eq(IOA({ id: 'ordstage__123__delivering' }), true, 'авто ажил: ordstage__ id таьна');
  eq(IOA({ id: 'x', auto_source: 'order' }), true, 'авто ажил: auto_source=order');
  eq(IOA({ id: 'x', auto_source: 'nomaad_prep' }), false, 'NOMAAD бэлтгэл нь захиалгын авто ажил БИШ (харагдана)');
  eq(IOA({ id: 'manual-1', createdBy: 'a' }), false, 'гар ажил: авто биш');

  eq(CS([], 'accrual').n, 0, 'суваг: хоосонд 0');
  eq(CS([{ source: 'app', total_mnt: 0 }], 'accrual').staff.avg, 0, 'суваг: 0 дүнд дундаж 0 (тэгд хуваахгүй)');
}

// 40g) Сайтын захиалгын бараа тайлах — sku → id → нэр (зураг + НӨӨЦ)
{
  const st = vm.runInContext('state', sandbox);
  const PO = vm.runInContext('productOf', sandbox);
  const UM = vm.runInContext('unmatchedItems', sandbox);
  const saved = st.products;
  // Бодит каталогийн хэлбэр: id ≠ sku (амьд дата дээр 308/308 ийм байсан)
  st.products = [
    { id: 'f83fc516-1a50-4dd3-9ca0-eb56319e45aa', sku: 'M-018', name: 'Асар 6м*12м', photo: 'p18.jpg' },
    { id: 'ASAR-18X15', sku: 'M-294', name: 'Асар 18м 18×15', photo: 'p294.jpg' },
  ];

  eq(PO({ sku: 'M-018' }).sku, 'M-018', 'тайлах: жинхэнэ sku-гээр');
  // Сайт sku талбарт id бичдэг — энэ нь гол буг байсан
  eq(PO({ sku: 'f83fc516-1a50-4dd3-9ca0-eb56319e45aa', name: 'Асар 6м өргөн' }).sku, 'M-018',
     'тайлах: sku талбарт ID ирсэн ч олно (сайтын бодит тохиолдол)');
  eq(PO({ name: 'Асар 18м 18×15' }).sku, 'M-294', 'тайлах: sku огт байхгүй бол нэрээр');
  eq(PO({ sku: 'CH_235', name: 'Байхгүй бараа' }), undefined, 'тайлах: каталогт байхгүй бол undefined');
  eq(PO(null), undefined, 'тайлах: хоосон мөрд унахгүй');

  // Зөрүүтэй нэр + буруу sku ирсэн ч бараа олдоно → зураг гарна
  ok(PO({ sku: 'f83fc516-1a50-4dd3-9ca0-eb56319e45aa', name: 'огт өөр нэр' }).photo === 'p18.jpg',
     'тайлах: нэр зөрсөн ч каталогийн зураг олдоно');

  // Анхааруулга ЗӨВХӨН гүйцэтгэгдэж болох захиалгад — хаагдсан түүхэнд утгагүй
  const _mixed = [{ sku: 'CH_235', name: 'Байхгүй бараа' }];
  eq(UM({ status: 'draft', items: _mixed }).length, 1, 'чимээ: ноорогт анхааруулна');
  eq(UM({ status: 'rented', items: _mixed }).length, 1, 'чимээ: түрээсэнд байгаад анхааруулна');
  eq(UM({ status: 'reserved', items: _mixed }).length, 1, 'чимээ: захиалсанд анхааруулна');
  eq(UM({ status: 'done', items: _mixed }).length, 0, 'чимээ: ДУУССАН захиалгад анхааруулахгүй');
  eq(UM({ status: 'archived', items: _mixed }).length, 0, 'чимээ: архивлаж дуусгасанд анхааруулахгүй');
  eq(UM({ status: 'canceled', items: _mixed }).length, 0, 'чимээ: цуцалсанд анхааруулахгүй');
  eq(UM({ status: 'returned', items: _mixed }).length, 0, 'чимээ: буцаагдаж дууссанд анхааруулахгүй');

  const bad = UM({ status: 'draft', items: [
    { sku: 'M-018', name: 'Асар 6м*12м' },
    { sku: 'CH_235', name: 'Эвхэгддэг модон ширээ' },
    { sku: 'CH_200', name: '120см ширээ бүтээлэг' },
  ] });
  eq(bad.length, 2, 'хамгаалалт: каталогт байхгүй 2 барааг барина');
  eq(bad[0].name, 'Эвхэгддэг модон ширээ', 'хамгаалалт: аль нь болохыг заана');
  eq(UM({ status: 'draft', items: [] }).length, 0, 'хамгаалалт: хоосон захиалгад анхааруулга байхгүй');

  // ⚠ Каталог ачаалагдаагүй үед ХУДАЛ анхааруулга гарч болохгүй (2026-09-02 регресс)
  const _keep = st.products;
  st.products = [];
  eq(UM({ status: 'draft', items: [{ sku: 'M-018', name: 'Асар 6м*12м' }] }).length, 0,
     'хамгаалалт: каталог ачаалагдаагүй бол анхааруулга ГАРАХГҮЙ');
  st.products = null;
  eq(UM({ status: 'draft', items: [{ sku: 'M-018', name: 'Асар 6м*12м' }] }).length, 0,
     'хамгаалалт: products=null үед ч унахгүй');
  st.products = _keep;
  eq(UM({}).length, 0, 'хамгаалалт: items байхгүй бол унахгүй');

  st.products = saved;
}

// 40h) ДАВХАР ЗАХИАЛГЫН НҮХ — сайтын зөрүүтэй нэртэй захиалга нөөц эзлэх ёстой
{
  const st = vm.runInContext('state', sandbox);
  const BQR = vm.runInContext('bookedQtyForRange', sandbox);
  const saved = { p: st.products, o: st.appOrders };
  st.products = [{ id: 'f83fc516-aaaa', sku: 'M-018', name: 'Асар 6м*12м', stock: 3 }];

  // Сайтаас ирсэн захиалга: sku талбарт ID, нэр нь каталогийнхаас ЗӨРҮҮТЭЙ
  st.appOrders = [{
    number: 1478, status: 'rented', starts_at: '2026-09-16', stops_at: '2026-09-17',
    items: [{ sku: 'f83fc516-aaaa', name: 'Асар 6м өргөн', qty: 2 }],
  }];
  eq(BQR('Асар 6м*12м', '2026-09-16', '2026-09-17'), 2,
     'нөөц: зөрүүтэй нэртэй сайтын захиалга ч нөөц ЭЗЭЛНЭ (давхар захиалгаас хамгаална)');

  // Огноо давхцахгүй бол эзлэхгүй
  eq(BQR('Асар 6м*12м', '2026-10-01', '2026-10-02'), 0, 'нөөц: давхцаагүй огноонд эзлэхгүй');

  // Цуцалсан захиалга нөөц эзлэхгүй
  st.appOrders = [{
    number: 1478, status: 'canceled', starts_at: '2026-09-16', stops_at: '2026-09-17',
    items: [{ sku: 'f83fc516-aaaa', name: 'Асар 6м өргөн', qty: 2 }],
  }];
  eq(BQR('Асар 6м*12м', '2026-09-16', '2026-09-17'), 0, 'нөөц: цуцалсан захиалга эзлэхгүй');

  st.products = saved.p; st.appOrders = saved.o;
}

// 40i) TDZ хамгаалалт — «Агуулахад авсан» цонх нээгддэг эсэх (эх кодын дараалал)
// ⚠ Энэ бол DOM-гүй тест: openStageAdvanceModal нь браузер шаарддаг тул ажиллуулж
// чадахгүй. Оронд нь ЭХ КОДЫН дараалалд `const` тодорхойлолт нь ХЭРЭГЛЭЭНЭЭС өмнө
// байгаа эсэхийг шалгана. 2026-09-02-нд `rcPaint()` нь тодорхойлолтоосоо 7 мөрийн
// ӨМНӨ дуудагдаж ReferenceError шидсэн тул нярав «Агуулахад авсан» дарахад цонх ОГТ
// нээгддэггүй байв (commit 7bc4ae0). Тест нь дахин орохоос сэргийлнэ.
{
  const start = src.indexOf('function openStageAdvanceModal');
  ok(start > -1, 'TDZ: openStageAdvanceModal олдов');
  // Функцийн төгсгөл — дараагийн дээд түвшний функцийн эхлэл
  const after = src.indexOf('\nfunction ', start + 10);
  const body = src.slice(start, after > -1 ? after : src.length);

  [['rcPaint', 'rcPaint()'], ['rcShort', 'rcShort()'], ['validate', 'validate()']].forEach(([name, call]) => {
    const decl = body.indexOf('const ' + name + ' =');
    const use = body.indexOf(call);
    if (decl === -1 || use === -1) return;   // нэр өөрчлөгдсөн бол алгасна
    ok(decl < use, 'TDZ: `' + name + '` тодорхойлолт нь хэрэглээнээсээ ӨМНӨ байх ёстой');
  });

  // rcGot массив — оруулгын handler дотор ашиглагдана, тодорхойлолт нь өмнө байх ёстой
  const gotDecl = body.indexOf('const rcGot');
  const gotUse = body.indexOf('rcGot[i] =');
  if (gotDecl > -1 && gotUse > -1) ok(gotDecl < gotUse, 'TDZ: `rcGot` тодорхойлолт хэрэглээнээс өмнө');
}

// 40j) Глобал алдаа баригч — чимээгүй эвдрэлийг ил гаргана
{
  const noise = vm.runInContext('_errIsNoise', sandbox);
  const logErr = vm.runInContext('logAppError', sandbox);
  const getErrs = vm.runInContext('appErrors', sandbox);
  const clearErrs = vm.runInContext('clearAppErrors', sandbox);
  const recent = vm.runInContext('recentAppErrors', sandbox);

  // Чимээг тоохгүй — эс бөгөөс хэрэглэгч утгагүй мэдэгдлээр дүүрнэ
  ok(noise('Script error.', ''), 'алдаа: cross-origin «Script error.» тоохгүй');
  ok(noise('', ''), 'алдаа: хоосон мессеж тоохгүй');
  ok(noise('ResizeObserver loop limit exceeded', ''), 'алдаа: ResizeObserver чимээ тоохгүй');
  ok(noise('x', 'chrome-extension://abc/x.js'), 'алдаа: өргөтгөлийн алдаа тоохгүй');
  ok(!noise("Cannot access 'rcPaint' before initialization", 'app.js:17472'),
     'алдаа: ЖИНХЭНЭ алдааг барина (нярвын тохиолдол)');

  clearErrs();
  eq(getErrs().length, 0, 'алдаа: цэвэрлэсний дараа хоосон');

  logErr("Cannot access 'rcPaint' before initialization", 'app.js:17472', 'stack');
  const list = getErrs();
  eq(list.length, 1, 'алдаа: бүртгэгдэнэ');
  ok(list[0].msg.indexOf('rcPaint') > -1, 'алдаа: мессеж хадгалагдана');
  ok(String(list[0].src).indexOf('app.js') > -1, 'алдаа: байршил хадгалагдана');
  ok(!!list[0].at, 'алдаа: цаг хадгалагдана');

  logErr('Script error.', '');
  eq(getErrs().length, 1, 'алдаа: чимээ бүртгэлд ОРОХГҮЙ');

  // Хязгаар — тэмдэглэл хязгааргүй өсөхгүй
  for (let i = 0; i < 40; i++) logErr('алдаа ' + i, 'app.js:1');
  ok(getErrs().length <= 20, 'алдаа: сүүлийн 20-оор хязгаарлана');
  ok(getErrs().slice(-1)[0].msg.indexOf('алдаа 39') > -1, 'алдаа: хамгийн сүүлийнх үлдэнэ');

  // 24 цагийн шүүлт
  clearErrs();
  const old = { at: new Date(Date.now() - 40 * 3600000).toISOString(), msg: 'хуучин', src: '' };
  const now = { at: new Date().toISOString(), msg: 'шинэ', src: '' };
  localStorage.setItem('appErrors', JSON.stringify([old, now]));
  eq(recent().length, 1, 'алдаа: 24 цагаас хуучныг тоохгүй');
  eq(recent()[0].msg, 'шинэ', 'алдаа: зөвхөн шинийг харуулна');
  clearErrs();
}

// 40k) Серверийн алдааны бүртгэл — өөрөө хэзээ ч унахгүй байх
{
  const report = vm.runInContext('_reportErrToServer', sandbox);
  const loadSrv = vm.runInContext('loadServerErrors', sandbox);
  const st = vm.runInContext('state', sandbox);

  // ⚠ ХАМГИЙН ЧУХАЛ: мэдээлэх функц алдаа шидвэл тэр нь дахин бүртгэгдэж
  // ХЯЗГААРГҮЙ ДАВТАЛТ үүснэ. Ямар ч оролтод унахгүй байх ЁСТОЙ.
  let threw = null;
  try {
    report('энгийн алдаа', 'app.js:1', 'stack');
    report(null, null, null);
    report(undefined, undefined, undefined);
    report({ toString() { throw new Error('хорон объект'); } }, 'x', 'y');
    report('а'.repeat(5000), 'б'.repeat(5000), 'в'.repeat(5000));
  } catch (e) { threw = e; }
  ok(threw === null, 'серверийн бүртгэл: ямар ч оролтод УНАХГҮЙ (давталтаас хамгаална)');

  // CEO биш бол сервер рүү огт хандахгүй (алдааны лог нийтэд ил байх ёсгүй)
  const savedCeo = st.isCEO;
  st.isCEO = false;
  let threw2 = null;
  try { loadSrv(); } catch (e) { threw2 = e; }
  ok(threw2 === null, 'серверийн бүртгэл: CEO бишэд унахгүй');
  st.isCEO = savedCeo;
}

// 41) Засвар KPI-д тооцогдох эсэх
{
  const st = vm.runInContext('state', sandbox);
  const RM = vm.runInContext('repairMetrics', sandbox);
  const OM = vm.runInContext('objectiveMetrics', sandbox);
  const saved = { rep: st.repairs, tasks: st.tasks };
  const M = '2026-08';

  st.repairs = [
    { status: 'fixed',   fixed_by: 'A', fixed_at: '2026-08-05T10:00:00Z', started_at: '2026-08-03T10:00:00Z', qty: 2 },
    { status: 'fixed',   fixed_by: 'A', fixed_at: '2026-08-09T10:00:00Z', started_at: '2026-08-05T10:00:00Z', qty: 1 },
    { status: 'fixed',   fixed_by: 'B', fixed_at: '2026-08-06T10:00:00Z', started_at: '2026-08-06T10:00:00Z', qty: 5 },
    { status: 'pending', fixed_by: 'A', fixed_at: null, qty: 9 },
    { status: 'fixed',   fixed_by: 'A', fixed_at: '2026-07-30T10:00:00Z', started_at: '2026-07-29T10:00:00Z', qty: 3 },
  ];
  const a = RM('A', M);
  eq(a.fixed, 2, 'засвар KPI: A сард 2 засвар дуусгасан');
  eq(a.qty, 3,   'засвар KPI: нийт 3ш бараа');
  eq(a.avgDays, 3, 'засвар KPI: дундаж эргэлт 3 хоног (2 ба 4)');
  eq(RM('B', M).avgDays, 0, 'засвар KPI: нэг өдөрт зассан → 0 хоног');
  eq(RM('C', M).fixed, 0,   'засвар KPI: зaсвар хийгээгүй хүнд 0');
  eq(RM('A', '2026-07').fixed, 1, 'засвар KPI: өөр сар тусдаа тоологдоно');

  // Объектив оноонд нэмэгдэх
  st.tasks = [];
  const o = OM('A', M);
  eq(o.repairs, 2, 'объектив: засвар тусад нь харагдана');
  eq(o.tasks, 0,   'объектив: даалгавар тусад нь');
  eq(o.total, 2,   'объектив: нийт = даалгавар + засвар');
  eq(o.onTime, 2,  'объектив: засвар «цагтаа» гэж тооцогдоно');
  eq(o.score, 100, 'объектив: зөвхөн засвартай хүн 100 оноо авна');

  st.repairs = saved.rep; st.tasks = saved.tasks;
}

// 23) Гэрээний НӨАТ мэдэгдэл — нэг хуудсан дээр зөрчилтэй мэдэгдэл ГАРАХГҮЙ
{
  const mkOrder = (vatOff) => ({
    number: 1, customer: 'Тест ХХК', order_no: 'ME-1',
    starts_at: '2026-09-10', stops_at: '2026-09-12',
    total_mnt: 500000, deposit_mnt: 0,
    items: [{ name: 'Ширээ', qty: 2, price: 10000, total: 40000 }],
    note: vatOff ? F.encodeVat(25000) : '',
  });
  const withVat = F.meventContractHtml(mkOrder(false));   // НӨАТ багтсан (өгөгдмөл)
  const noVat   = F.meventContractHtml(mkOrder(true));    // НӨАТ хасалттай

  // НӨАТ БАГТСАН захиалга
  ok(withVat.indexOf('НӨАТ багтсан болно') > -1,   'гэрээ/НӨАТ: багтсан үед «багтсан» гэж мэдэгдэнэ');
  ok(withVat.indexOf('НӨАТ багтаагүй') === -1,     'гэрээ/НӨАТ: багтсан үед «багтаагүй» гарахгүй');
  ok(/үүнээс НӨАТ [\d,]+₮/.test(withVat),          'гэрээ/НӨАТ: багтсан үед дүн тайлбарт гарна');
  ok(withVat.indexOf('<td>Үүнээс НӨАТ') === -1,     'гэрээ/НӨАТ: нийлбэрийн баганад мөр болж ОРОХГҮЙ (нэмэгдэх мэт харагдана)');
  ok(withVat.indexOf('НӨАТ хасалт') === -1,        'гэрээ/НӨАТ: багтсан үед хасалтын мөр гарахгүй');

  // НӨАТ ХАСАГДСАН захиалга — гурван зөрчил давтагдахгүй
  ok(noVat.indexOf('НӨАТ багтаагүй болно') > -1,   'гэрээ/НӨАТ: хасалттай үед «багтаагүй» гэж мэдэгдэнэ');
  ok(noVat.indexOf('НӨАТ багтсан болно') === -1,   'гэрээ/НӨАТ: хасалттай үед «багтсан» ЗЭРЭГ гарахгүй');
  ok(!/үүнээс НӨАТ/i.test(noVat),                  'гэрээ/НӨАТ: хасалттай үед «үүнээс НӨАТ» гарахгүй');
  ok(noVat.indexOf('НӨАТ хасалт') > -1,            'гэрээ/НӨАТ: хасалттай үед хасалтын мөр гарна');

  // Барааны мөрийн НӨАТ багана хоёр горимд ЭСРЭГ утгатай
  ok(withVat.indexOf('>багтсан<') > -1,            'гэрээ/НӨАТ: мөрийн багана «багтсан»');
  ok(noVat.indexOf('>багтаагүй<') > -1,            'гэрээ/НӨАТ: мөрийн багана «багтаагүй»');
  ok(noVat.indexOf('>багтсан<') === -1,            'гэрээ/НӨАТ: хасалттай үед мөр «багтсан» гэж хэлэхгүй');
}

// 24) Гэрээний шинэ найруулга — бүтэц, динамик тариф, батлагдсан цуцлалт
{
  const mk = (vatOff) => ({
    number: 7, customer: 'Тест ХХК', order_no: 'ME-7',
    starts_at: '2026-09-10', stops_at: '2026-09-12',
    total_mnt: 500000, deposit_mnt: 100000,
    items: [{ name: 'Ширээ', qty: 2, price: 10000, total: 40000 }],
    note: vatOff ? F.encodeVat(25000) : '',
  });
  const ct = F.meventContractHtml(mk(false));

  // Бүтэц — 12 хэсэг, хуучин 8 биш
  for (const h of ['НЭГ. ГЭРЭЭНИЙ ЗҮЙЛ', 'ХОЁР. ХУГАЦАА БА ХОНОГ ТООЦОХ', 'ГУРАВ. ТӨЛБӨР',
                   'ДӨРӨВ. БАРЬЦАА', 'ТАВ. ХҮЛЭЭЛЦЭХ ЖУРАМ', 'ЗУРГАА. ХЭРЭГЛЭГЧИЙН ҮҮРЭГ',
                   'ДОЛОО. ЭВДРЭЛ', 'НАЙМ. ХУГАЦАА СУНГАХ', 'ЕС. ЦУЦЛАЛТ',
                   'АРАВ. ДАВАГДАШГҮЙ', 'АРВАН НЭГ. МАРГААН', 'АРВАН ХОЁР. БУСАД']) {
    ok(ct.indexOf(h) > -1, `гэрээ: «${h}» хэсэг бий`);
  }
  ok(ct.indexOf('НАЙМ. БУСАД') === -1, 'гэрээ: хуучин «НАЙМ. БУСАД» дугаарлалт үлдээгүй');

  // Хоног тоолох — ажилласан жишээтэй (маргааныг таслах)
  ok(ct.indexOf('календарийн өдрийн зөрүүгээр') > -1, 'гэрээ: хоног = өдрийн зөрүү');
  ok(ct.indexOf('12-ны өдөр буцаавал 2 хоног') > -1,  'гэрээ: хоногийн жишээ бичигдсэн');

  // Цуцлалт — ХЭРЭГЛЭГЧИЙН БАТАЛСАН тоо (7 / 3–7 / <3)
  ok(ct.indexOf('7 ба түүнээс дээш хоногийн өмнө — бүрэн') > -1, 'гэрээ: цуцлалт 7+ хоног бүрэн');
  ok(ct.indexOf('3-аас 7 хоногийн өмнө — 50 хувь') > -1,         'гэрээ: цуцлалт 3–7 хоног 50%');
  ok(ct.indexOf('3 хоногоос бага хугацаанд — буцаахгүй') > -1,   'гэрээ: цуцлалт <3 хоног 0%');
  ok(ct.indexOf('Барьцааг цуцлалтын аль ч тохиолдолд бүтнээр буцаана') > -1, 'гэрээ: барьцаа цуцлалтад бүтэн');

  // Аппын процесстой холбогдсон заалтууд
  ok(ct.indexOf('гүйлгээний утгад захиалгын дугаарыг') > -1, 'гэрээ: гүйлгээний утга (тулгалт)');
  ok(ct.indexOf('бүртгэлийн системд бүртгэнэ') > -1,         'гэрээ: хүлээлцэх нь системд');
  ok(ct.indexOf('нөөцөөс хамаарна') > -1,                    'гэрээ: сунгалт нөөцөөс хамаарна');
  ok(ct.indexOf('урьдчилгаа буюу бүтэн төлбөр') > -1,        'гэрээ: урьдчилгааны зөрчил арилсан');

  // НӨАТ заалт — захиалгаас хамаарч ЭСРЭГ
  ok(ct.indexOf('татвар багтсан бөгөөд') > -1,        'гэрээ/НӨАТ: багтсан үед 3.1 «багтсан»');
  const ctNo = F.meventContractHtml(mk(true));
  ok(ctNo.indexOf('татвар багтаагүй болно') > -1,     'гэрээ/НӨАТ: хасалттай үед 3.1 «багтаагүй»');
  ok(ctNo.indexOf('татвар багтсан бөгөөд') === -1,    'гэрээ/НӨАТ: хасалттай үед «багтсан» ЗЭРЭГ гарахгүй');

  // Тариф ДИНАМИК — app_config өөрчлөгдвөл гэрээ дагана (хатуу бичигдээгүй)
  const tierTxt = F.ctTierText();
  ok(/\d+.*хоног.*\d+%/.test(tierTxt), 'гэрээ: хөнгөлөлтийн шатлал тарифаас үүснэ');
  ok(ct.indexOf(tierTxt) > -1,         'гэрээ: 2.3 заалт тарифын текстийг агуулна');
  ok(ct.indexOf(`${F.tariffWorkStart()}:00`.padStart(5, '0')) > -1 ||
     ct.indexOf('ажлын цаг') > -1 || ct.indexOf('Ажлын цаг') > -1 ||
     ct.indexOf('ажлын бус цагт') > -1, 'гэрээ: ажлын цаг тарифаас бичигдэнэ');
}

// 25) Гэрээ — нөхөн төлбөрийн үнэлгээ (products.market_value → заалт 7.3)
{
  const runIn = (code) => vm.runInContext(code, sandbox);
  const save = runIn('state.products');
  const setP = (arr) => runIn('state.products = ' + JSON.stringify(arr) + ';');
  const base = {
    number: 9, customer: 'Тест ХХК', order_no: 'ME-9',
    starts_at: '2026-09-10', stops_at: '2026-09-12',
    total_mnt: 400000, deposit_mnt: 0, note: '',
    items: [{ name: 'Ширээ', sku: 'M-001', qty: 3, price: 10000, total: 60000 }],
  };

  // Үнэлгээ ТАВЬСАН бараа
  setP([{ sku: 'M-001', id: 'M-001', name: 'Ширээ', market_value: 250000 }]);
  const withMv = F.meventContractHtml(base);
  ok(withMv.indexOf('Нөхөн төлбөрийн үнэлгээ') > -1, 'үнэлгээ: хүснэгт гарна');
  ok(withMv.indexOf('750,000₮') > -1,                 'үнэлгээ: 3ш × 250,000 = 750,000 бодогдоно');
  ok(withMv.indexOf('«Нөхөн төлбөрийн үнэлгээ» хүснэгтэд заасан') > -1,
     'үнэлгээ: заалт 7.3 хүснэгтийг иш татна');

  // Үнэлгээ ТАВЬААГҮЙ — хүснэгт гарахгүй, гэрээ унахгүй
  setP([{ sku: 'M-001', id: 'M-001', name: 'Ширээ' }]);
  const noMv = F.meventContractHtml(base);
  ok(noMv.indexOf('Нөхөн төлбөрийн үнэлгээ (заалт 7.3)') === -1, 'үнэлгээ: үнэлгээгүй бол хүснэгт гарахгүй');
  ok(noMv.indexOf('зах зээлийн ханшаар тооцно') > -1, 'үнэлгээ: 7.3-д нөөц дүрэм бий');

  // Хэсэгчилсэн — нэг нь үнэлгээтэй, нөгөө нь үгүй → «—»
  const mixed = Object.assign({}, base, { items: [
    { name: 'Ширээ', sku: 'M-001', qty: 1, price: 10000, total: 20000 },
    { name: 'Асар',  sku: 'M-002', qty: 1, price: 50000, total: 100000 },
  ]});
  setP([{ sku: 'M-001', id: 'M-001', name: 'Ширээ', market_value: 250000 },
        { sku: 'M-002', id: 'M-002', name: 'Асар' }]);
  const mx = F.meventContractHtml(mixed);
  ok(mx.indexOf('Нөхөн төлбөрийн үнэлгээ') > -1, 'үнэлгээ: хэсэгчилсэн ч хүснэгт гарна');
  ok(mx.indexOf('>—<') > -1,                     'үнэлгээ: үнэлгээгүй мөр «—» гэж ялгарна');

  runIn('state.products = ' + JSON.stringify(save || []) + ';');
}

// 26) Гэрээний БАЙРШИЛ — хаана юу байх ёстой вэ
{
  const runIn = (code) => vm.runInContext(code, sandbox);
  const save = runIn('state.products');
  runIn("state.products = [{ sku:'M-001', id:'M-001', name:'Майхан', market_value: 1980000 }];");
  const o = {
    number: 1480, customer: 'Соёл-Эрдэнэ', order_no: 'ME-1480',
    starts_at: '2026-09-05', stops_at: '2026-09-07',
    total_mnt: 184800, deposit_mnt: 0,
    items: [{ name: 'Өвлийн майхан 6-8 хүний', sku: 'M-001', qty: 1, price: 132000, total: 264000 }],
    note: F.encodeOrderTimes(9, 18),
  };
  const ct = F.meventContractHtml(o);

  // ЦАГ — ⟦RT⟧ token-оос уншина; «……» гарах ёсгүй
  ok(ct.indexOf('09:00') > -1 && ct.indexOf('18:00') > -1, 'байршил: эхлэх/дуусах цаг note token-оос бөглөгдөнө');
  ok(ct.indexOf('2026-09-05 ……') === -1,                   'байршил: огнооны хажууд «……» үлдэхгүй');

  // ҮНЭЛГЭЭНИЙ ХҮСНЭГТ нь заалт 7.3-ийн ДАРАА, гэрээний эхэнд БИШ
  const iMv = ct.indexOf('Нөхөн төлбөрийн үнэлгээ (заалт 7.3)');
  const i73 = ct.indexOf('<b>7.3.</b>');
  const i11 = ct.indexOf('<b>1.1.</b>');
  ok(iMv > -1 && i73 > -1, 'байршил: үнэлгээний хүснэгт ба 7.3 хоёул бий');
  ok(iMv > i73,            'байршил: үнэлгээний хүснэгт заалт 7.3-ийн ДАРАА');
  ok(iMv > i11,            'байршил: үнэлгээний хүснэгт гэрээний эхэнд ОРОХГҮЙ');
  ok(ct.indexOf('доорх «Нөхөн төлбөрийн үнэлгээ»') > -1, 'байршил: 7.3 «доорх» гэж зөв заана');

  // ТҮРЭЭСЛҮҮЛЭГЧИЙН РД толгойд байна (Хэрэглэгчийнхтэй тэнцвэртэй).
  // Хувь хүний захиалгад хэрэглэгчийн тал «Регистрийн дугаар» гэж бичигдэнэ —
  // «Байгууллагын РД» гэдэг нь ЗӨВХӨН байгууллагад хамаарна (2026-09-04).
  const head = ct.slice(0, ct.indexOf('НЭГ. ГЭРЭЭНИЙ ЗҮЙЛ'));
  ok(head.indexOf('Байгууллагын РД') > -1, 'байршил: түрээслүүлэгчийн РД толгойд бий');
  ok(head.indexOf('Регистрийн дугаар') > -1, 'байршил: хувь хүний РД толгойд бий');

  runIn('state.products = ' + JSON.stringify(save || []) + ';');
}

// 26a) ХАРИЛЦАГЧИЙН ТӨРӨЛ — хүний СОНГОЛТ таамаглалаас дээгүүр (2026-09-04)
// Өмнө нь «Байгууллага» талбар дүүрэн байвал л байгууллага гэж үздэг байсан. Тэр талбар
// НӨАТ-ын худалдан авагч / төлөгчийн нэрээр АВТОМАТААР бөглөгддөг тул хүний нэр орж,
// гэрээ «МӨНХСАЙХАН ЗАНАБАЗАР» гэсэн «байгууллага»-тай байгуулагдаж байв.
need(['orderCustType']);
{
  const ct = (ci) => F.orderCustType({ customer: 'М.Занабазар', note: F.setCustInfo('', ci) });
  // (а) Формын сонголт — юунаас ч ДЭЭГҮҮР
  eq(ct({ ctype: 'person', company: 'Итзон ХХК', reg: '1234567' }), 'person', 'төрөл: сонголт «хувь хүн» таамаглалыг дардаг');
  eq(ct({ ctype: 'org' }), 'org', 'төрөл: сонголт «байгууллага» дангаараа хангалттай');
  // (б) Сонголтгүй хуучин захиалга — 7 оронтой РД = байгууллага
  eq(ct({ reg: '1234567' }), 'org', 'төрөл: 7 оронтой РД → байгууллага');
  eq(ct({ reg: 'УБ98765432' }), 'person', 'төрөл: хувь хүний РД → хувь хүн');
  // (в) Байгууллагын нэр — хуулийн хэлбэрийн тэмдэг ШААРДАНА
  eq(ct({ company: 'Итзон ХХК' }), 'org', 'төрөл: ХХК → байгууллага');
  eq(ct({ company: 'Nomad LLC' }), 'org', 'төрөл: LLC → байгууллага');
  eq(ct({ company: 'МӨНХСАЙХАН ЗАНАБАЗАР' }), 'person', 'төрөл: хүний нэр байгууллагын талбарт байсан ч хувь хүн');
  eq(ct({}), 'person', 'төрөл: мэдээлэлгүй бол хувь хүн');
}

// 26b) БАЙГУУЛЛАГЫН ГЭРЭЭ — гэрээ байгуулагч тал = байгууллага, хувь хүн БИШ (2026-09-04)
// Хариуцлага (заалт 7 — нөхөн төлбөр) хэн дээр буухыг энэ шийднэ: байгууллагын захиалгыг
// хувь хүний нэр дээр байгуулбал компаниас нэхэмжлэх эрх зүйн үндэс сул.
{
  const runIn = (code) => vm.runInContext(code, sandbox);
  const mk = (ci) => ({
    number: 1500, customer: 'Батбаяр', starts_at: '2026-09-05', stops_at: '2026-09-07',
    total_mnt: 500000, deposit_mnt: 0, items: [{ name: 'Ширээ', qty: 2, price: 10000 }],
    note: runIn('setCustInfo(' + JSON.stringify(F.encodeOrderTimes(9, 18)) + ', ' + JSON.stringify(ci) + ')'),
  });
  // (а) Байгууллагын нэртэй — тал нь байгууллага, захиалагч нь төлөөлөгч
  const org = F.meventContractHtml(mk({ company: 'Итзон ХХК', reg: '1234567' }));
  const oHead = org.slice(0, org.indexOf('НЭГ. ГЭРЭЭНИЙ ЗҮЙЛ'));
  ok(oHead.indexOf('<b>Итзон ХХК</b>') > -1,      'байгууллага: гэрээний тал = байгууллагын нэр');
  ok(oHead.indexOf('Төлөөлөх хүн: Батбаяр') > -1, 'байгууллага: захиалагч төлөөлөгч болж бичигдэнэ');
  ok(oHead.indexOf('Байгууллагын РД') > -1,       'байгууллага: РД-ийн шошго байгууллагынх');
  ok(org.indexOf('1234567 регистрийн дугаартай "Итзон ХХК"') > -1, 'байгууллага: гэрээ байгуулах өгүүлбэрт РД+нэр');
  ok(org.indexOf('түүнийг төлөөлж Батбаяр') > -1, 'байгууллага: төлөөлөгч өгүүлбэрт бий');
  ok(org.indexOf('( Тамга )') > -1,               'байгууллага: гарын үсгийн хэсэгт тамга');
  // (б) Байгууллагын нэргүй ч 7 оронтой РД = байгууллага (orderCustType-ийн дүрэм)
  const reg7 = F.meventContractHtml(mk({ reg: '7654321' }));
  ok(reg7.indexOf('Байгууллагын РД') > -1, 'байгууллага: 7 оронтой РД-г байгууллагад тооцно');
  ok(reg7.indexOf('Төлөөлөх хүн:') === -1, 'байгууллага: нэр давхардвал төлөөлөгч мөр гарахгүй');
  // (в2) Байгууллагын нэр бөглөгдсөн ч «хувь хүн» гэж СОНГОСОН бол гэрээ хүнтэй
  const forced = F.meventContractHtml(mk({ ctype: 'person', company: 'Итзон ХХК', reg: '1234567' }));
  ok(forced.indexOf('<b>Батбаяр</b>') > -1,       'сонголт: «хувь хүн» гэвэл гэрээний тал хүн');
  ok(forced.indexOf('Итзон ХХК') === -1,          'сонголт: «хувь хүн» гэвэл байгууллагын нэр гэрээнд гарахгүй');
  ok(forced.indexOf('Регистрийн дугаар: 1234567') > -1, 'сонголт: хувь хүний РД шошготой хэвээр гарна');

  // (в) Хувь хүн — хуучин байдал хэвээр, тамга/төлөөлөгч ГАРАХГҮЙ
  const per = F.meventContractHtml(mk({ reg: 'УБ98765432' }));
  const pHead = per.slice(0, per.indexOf('НЭГ. ГЭРЭЭНИЙ ЗҮЙЛ'));
  ok(pHead.indexOf('<b>Батбаяр</b>') > -1,   'хувь хүн: гэрээний тал = хувь хүн');
  ok(pHead.indexOf('Төлөөлөх хүн') === -1,   'хувь хүн: төлөөлөгч мөр гарахгүй');
  ok(per.indexOf('"Батбаяр" ("Хэрэглэгч" гэх)') > -1, 'хувь хүн: гэрээ байгуулах өгүүлбэр хэвээр');
}

// 21) Үнийн саналын загвар — async builder (хоосон захиалгаар мөн унахгүй)
(async () => {
  const runIn = (code) => vm.runInContext(code, sandbox);
  // buildOrderQuote нь popup-ийн БҮРЭН HTML мөр буцаана (объект биш).
  for (const [lang, name] of [['mn', 'Монгол'], ['en', 'English']]) {
    try {
      const html = await runIn(`buildOrderQuote(docBlankMeventOrder(), '${lang}')`);
      ok(typeof html === 'string' && html.length > 2000, `загвар: Үнийн санал (${name}) хоосон датагаар үүснэ`);
      ok(String(html).indexOf('<!DOCTYPE html') === 0,        `загвар: Үнийн санал (${name}) бүтэн HTML баримт`);
      ok(String(html).indexOf('Үнийн санал') > -1,            `загвар: Үнийн санал (${name}) гарчиг`);
      ok(String(html).indexOf('ЧИМУН') > -1,                  `загвар: Үнийн санал (${name}) компанийн мэдээлэл`);
    } catch (e) {
      ok(false, `загвар: Үнийн санал (${name}) — алдаа гарлаа: ${e.message}`);
    }
  }
  // 21b) Үнийн саналд АВАХ/ӨГӨХ ЦАГ гарна (2026-09-04 алдаа — Г.Сайнжаргал мэдээлсэн)
  // starts_at нь огноо төдий тул үнийн санал цаггүй гардаг байв. Ажлын бус цагийн
  // +төлбөр яг эдгээр цагаас тооцогддог — баримт дээр харагдах ЁСТОЙ.
  try {
    const ord = {
      number: 42, customer: 'Тест ХХК', starts_at: '2026-09-10', stops_at: '2026-09-12',
      total_mnt: 500000, deposit_mnt: 0, items: [{ name: 'Ширээ', qty: 2, price: 10000 }],
      note: runIn("encodeOrderTimes(8, 20)"),
    };
    runIn('globalThis._qTestOrd = ' + JSON.stringify(ord) + ';');
    const qhtml = String(await runIn("buildOrderQuote(globalThis._qTestOrd, 'mn')"));
    ok(qhtml.indexOf('2026.09.10 08:00') > -1, 'үнийн санал/цаг: авах цаг гарна');
    ok(qhtml.indexOf('2026.09.12 20:00') > -1, 'үнийн санал/цаг: буцаах цаг гарна');
  } catch (e) { ok(false, 'үнийн санал/цаг — алдаа: ' + e.message); }

  // ── AI банкны тулгалт (buildReconAiPayload / applyReconAiSuggestions) ──
  (function () {
    const mkRes = () => ({
      missing: [
        { order: { order_no: 'ME-1', customer_name: 'Бат', paid_amount: 100000, paid_ref: 'REF1', paid_date: '2026-08-01' } },
        { order: { order_no: 'ME-2', customer_name: 'Болд', paid_amount: 50000, paid_ref: '', paid_date: '' } },
      ],
      untracked: [
        { date: '2026-08-01', name: 'BAT', memo: 'REF1 shiree', credit: 100000 },
        { date: '2026-08-02', name: 'BOLD', memo: 'sandal', credit: 50000 },
      ],
    });
    ok(F.buildReconAiPayload(null) === null, 'reconAi: null res → null');
    ok(F.buildReconAiPayload({ missing: [], untracked: [{ credit: 1 }] }) === null, 'reconAi: missing хоосон → null');
    ok(F.buildReconAiPayload({ missing: [{ order: { order_no: 'X' } }], untracked: [] }) === null, 'reconAi: untracked хоосон → null');
    const p = F.buildReconAiPayload(mkRes());
    ok(p && p.orders.length === 2 && p.incomes.length === 2, 'reconAi: payload orders+incomes');
    ok(p.incomes[0].i === 0 && p.incomes[1].i === 1, 'reconAi: incomes индекстэй');
    ok(p.orders[0].order_no === 'ME-1' && p.orders[0].amount === 100000, 'reconAi: order талбар зөв');
    ok(F.buildReconAiPayload({ missing: [{ order: { order_no: '' } }], untracked: [{ credit: 1 }] }) === null, 'reconAi: order_no хоосон → шүүгдэж null');
    // Хэмжээний хязгаар — том хуулга промптыг хөөргөж зардал өсгөхөөс сэргийлнэ
    {
      const big = {
        missing:   Array.from({ length: 150 }, (_, i) => ({ order: { order_no: 'ME-' + i, paid_amount: 1000 } })),
        untracked: Array.from({ length: 150 }, (_, i) => ({ date: '2026-08-01', name: 'N' + i, memo: '', credit: 1000 })),
      };
      const bp = F.buildReconAiPayload(big);
      ok(bp.orders.length === 60 && bp.incomes.length === 60, 'reconAi: ачаалал 60-аар таслагдана (зардлын хязгаар)');
      ok(bp.incomes[59].i === 59, 'reconAi: таслагдсан ч индекс тасралтгүй');
    }
    let r = mkRes(); ok(F.applyReconAiSuggestions(r, null).length === 0 && r._aiSuggestions.length === 0, 'reconAi: массив биш → []');
    ok(F.applyReconAiSuggestions(mkRes(), 'oops').length === 0, 'reconAi: string хариу → []');
    ok(F.applyReconAiSuggestions(mkRes(), [{ order_no: 'ME-1', income_i: 0, confidence: 0.9 }]).length === 1, 'reconAi: зөв санал → 1');
    ok(F.applyReconAiSuggestions(mkRes(), [{ order_no: 'ГҮЙ', income_i: 0, confidence: 0.9 }]).length === 0, 'reconAi: зохиомол захиалга → хаяна');
    ok(F.applyReconAiSuggestions(mkRes(), [{ order_no: 'ME-1', income_i: 9, confidence: 0.9 }]).length === 0, 'reconAi: зохиомол орлого → хаяна');
    ok(F.applyReconAiSuggestions(mkRes(), [{ order_no: 'ME-1', income_i: 0, confidence: 0.3 }]).length === 0, 'reconAi: итгэл <0.5 → нуух');
    { const o = F.applyReconAiSuggestions(mkRes(), [{ order_no: 'ME-1', income_i: 0, confidence: 5 }]); ok(o.length === 1 && o[0].confidence === 1, 'reconAi: итгэл >1 → 1 таслах'); }
    ok(F.applyReconAiSuggestions(mkRes(), [{ order_no: 'ME-1', income_i: 0, confidence: 'муу' }]).length === 0, 'reconAi: итгэл NaN → нуух');
    { const o = F.applyReconAiSuggestions(mkRes(), [{ order_no: 'ME-1', income_i: 0, confidence: 0.7 }, { order_no: 'ME-1', income_i: 1, confidence: 0.9 }]); ok(o.length === 1 && o[0].income.credit === 50000, 'reconAi: нэг захиалга 2 удаа → өндөр итгэлийнх'); }
    { const o = F.applyReconAiSuggestions(mkRes(), [{ order_no: 'ME-1', income_i: 0, confidence: 0.6 }, { order_no: 'ME-2', income_i: 0, confidence: 0.95 }]); ok(o.length === 1 && o[0].order.order_no === 'ME-2', 'reconAi: нэг орлого 2 удаа → өндөр итгэлийнх'); }
    { const o = F.applyReconAiSuggestions(mkRes(), [{ order_no: 'ME-1', income_i: 0, confidence: 0.9 }]); ok(o[0].amountDiff === 0, 'reconAi: amountDiff 0 (тэнцүү)'); }
    { const rr = mkRes(); rr.untracked[0].credit = 90000; const o = F.applyReconAiSuggestions(rr, [{ order_no: 'ME-1', income_i: 0, confidence: 0.9 }]); ok(o[0].amountDiff === 10000, 'reconAi: amountDiff зөрүү'); }
    { const o = F.applyReconAiSuggestions(mkRes(), [null, 'x', { order_no: 'ME-2', income_i: 1, confidence: 0.8, reason: 'нэр таарав' }]); ok(o.length === 1 && o[0].reason === 'нэр таарав', 'reconAi: хог entry алгасаж reason дамжина'); }
    { const o = F.applyReconAiSuggestions(mkRes(), [{ order_no: 'ME-1', income_i: 0, confidence: 0.9 }, { order_no: 'ME-2', income_i: 1, confidence: 0.8 }]); ok(o.length === 2, 'reconAi: 2 бие даасан хос → 2'); }
  })();

  // ── Дотоод шилжүүлэг тулгалтаас хасах (_isInternalCredit) ──
  ok(F._isInternalCredit({ memo: 'ӨӨРИЙН ДАНС ХООРОНД', name: 'ЧИМУН ХХК' }) === true, 'internal: өөрийн данс хооронд');
  ok(F._isInternalCredit({ memo: 'ДАНС ХООРОНД', name: 'ЧИМУН ХХК' }) === true, 'internal: данс хооронд');
  ok(F._isInternalCredit({ memo: 'хадгаламж шилжүүлэг', name: '' }) === true, 'internal: хадгаламж');
  ok(F._isInternalCredit({ memo: 'REF1 ширээ сандал', name: 'Бат' }) === false, 'internal: жинхэнэ төлбөр → false');
  ok(F._isInternalCredit({ memo: '', name: 'Болд' }) === false, 'internal: энгийн нэр → false');
  ok(F._isInternalCredit({ memo: 'DANS HOOROND ZARLAGA', name: 'ЧИМУН ХХК' }) === true, 'internal: илгээгч ЧИМУН → true');
  ok(F._isInternalCredit({ memo: 'ЗАРЛАГЫН ДАНСРУУ', name: 'ЧИМУН ХХК' }) === true, 'internal: зарлагын дансруу');
  ok(F._isInternalCredit({ memo: 'DANS HOOROND', name: '' }) === true, 'internal: latin dans hoorond');

  // ── reconcileOrders: хуваасан төлбөр + огноо scope ──
  {
    // Хуваасан төлбөр (баримт задаргаагүй, paid_ref хоосон): нэрээр 2 гүйлгээг нийлбэрлэж таарна (fallback)
    const stmt = [
      { date: '2026-09-01', credit: 500000, memo: 'темуулэн', name: 'Н.Тэмүүлэн' },
      { date: '2026-09-03', credit: 682000, memo: 'темуулэн', name: 'Н.Тэмүүлэн' },
    ];
    const orders = [{ order_no: '1450', customer_name: 'Н.Тэмүүлэн', paid_amount: 1182000, paid_ref: '', paid_date: '2026-09-01' }];
    const r = F.reconcileOrders(stmt, orders);
    ok(r.matched.length === 1, 'split: 2 гүйлгээ нийлбэрээр таарна');
    ok(r.matched[0] && r.matched[0].rows && r.matched[0].rows.length === 2, 'split: 2 мөр хэрэглэсэн');
    ok(r.untracked.length === 0, 'split: захиалгагүй орлого үлдэхгүй');
    ok(r.mismatch.length === 0, 'split: зөрүү гарахгүй');
  }
  {
    // Огноо scope: хуулга 09 сар, захиалга 07 сард төлөгдсөн → «дансанд алга» болгож ШУУГИХГҮЙ
    const stmt = [{ date: '2026-09-05', credit: 100000, memo: 'REF-A', name: 'Бат' }];
    const orders = [
      { order_no: '1000', customer_name: 'Бат', paid_amount: 100000, paid_ref: 'REF-A', paid_date: '2026-09-05' },
      { order_no: '900', customer_name: 'Дорж', paid_amount: 300000, paid_ref: 'OLD', paid_date: '2026-07-10' },
    ];
    const r = F.reconcileOrders(stmt, orders);
    ok(r.matched.length === 1 && r.matched[0].order.order_no === '1000', 'scope: 09-р сарынх таарна');
    ok(r.missing.length === 0, 'scope: өөр сарын захиалга «алга» болохгүй');
  }
  {
    // Баримт-суурьтай тулгалт: 2 баримт (paid_ref-д 2 сегмент) → банкны 2 мөр дансны дугаараар таарна
    const stmt = [
      { date: '2026-09-01', credit: 500000, memo: 'гүйлгээ', name: 'ТЭМҮҮЛЭН НАРАН', account: '5301234567' },
      { date: '2026-09-04', credit: 682000, memo: 'гүйлгээ', name: 'ТЭМҮҮЛЭН НАРАН', account: '5301234567' },
    ];
    const orders = [{ order_no: '1450', customer_name: 'Н.Тэмүүлэн', paid_amount: 1182000,
      paid_ref: '[#A1] Н.Тэмүүлэн · 5301234567 · deposit  |  [#A2] Н.Тэмүүлэн · 5301234567 · balance', paid_date: '2026-09-01' }];
    const r = F.reconcileOrders(stmt, orders);
    ok(r.matched.length === 1, 'receipt: 2 баримт дансны дугаараар таарна');
    ok(r.matched[0] && r.matched[0].rows.length === 2, 'receipt: 2 гүйлгээ хэрэглэсэн');
    ok(r.untracked.length === 0, 'receipt: захиалгагүй орлого үлдэхгүй');
  }
  {
    // 2 баримт бүртгэсэн ч банкны хуулгад зөвхөн 1 нь → «дутуу» (mismatch, receipts=2, rows=1)
    const stmt = [{ date: '2026-09-01', credit: 500000, memo: 'г', name: 'БАТ', account: '5309999999' }];
    const orders = [{ order_no: '1500', customer_name: 'Бат', paid_amount: 1000000,
      paid_ref: '[#B1] Бат · 5309999999 · a  |  [#B2] Бат · 5309999999 · b', paid_date: '2026-09-01' }];
    const r = F.reconcileOrders(stmt, orders);
    ok(r.mismatch.length === 1 && r.mismatch[0].rows.length === 1 && r.mismatch[0].receipts === 2, 'receipt: дутуу баримт → mismatch 1/2');
  }
  {
    // Захиалгын дугаар банкны утганд → 2 хэсэг нийлбэрлэж таарна (жинхэнэ 1458 кейс: 70к+62к=132к)
    const stmt = [
      { date: '2026-08-15', credit: 70000, memo: 'дөлгөөн энэрэл', name: 'ДӨЛГӨӨН ЭНЭРЭЛ', account: '5401111111' },
      { date: '2026-08-26', credit: 62000, memo: '1458-ДӨЛГӨӨН ЭНЭРЭЛ', name: 'ДӨЛГӨӨН ЭНЭРЭЛ', account: '5401111111' },
    ];
    const orders = [{ order_no: '1458', customer_name: 'Дөлгөөн Энэрэл', paid_amount: 132000, paid_ref: '', paid_date: '2026-08-15' }];
    const r = F.reconcileOrders(stmt, orders);
    ok(r.matched.length === 1 && r.matched[0].rows.length === 2, 'ono: захиалгын дугаар+нэрээр 2 хэсэг нийлбэрлэнэ');
    ok(r.untracked.length === 0, 'ono: захиалгагүй орлого үлдэхгүй');
  }
  {
    // 3 хэсэгтэй төлбөр нэг захиалгад нийлнэ (1445 Б.Солонго: 40к+92к+55к=187к)
    const stmt = [
      { date: '2026-08-14', credit: 40000, memo: 'солонго', name: 'БОЛД СОЛОНГО', account: '5402222222' },
      { date: '2026-08-15', credit: 92000, memo: '99006908-БОЛД СОЛОНГО', name: 'БОЛД СОЛОНГО', account: '5402222222' },
      { date: '2026-08-16', credit: 55000, memo: '99006908-БОЛД СОЛОНГО', name: 'БОЛД СОЛОНГО', account: '5402222222' },
    ];
    const orders = [{ order_no: '1445', customer_name: 'Б.Солонго', paid_amount: 187000, paid_ref: '', paid_date: '2026-08-14' }];
    const r = F.reconcileOrders(stmt, orders);
    ok(r.matched.length === 1 && r.matched[0].rows.length === 3, '3 installment: 3 гүйлгээ нийлбэрлэж таарна');
    ok(r.untracked.length === 0, '3 installment: үлдэгдэлгүй');
  }
  {
    // Хуучин эвент (3 сар) + paid_date хоосон захиалга 8 сарын хуулгад орж нэрийн дэд-мөрөөр буруу таарахгүй (#1063 кейс)
    const stmt = [{ date: '2026-08-10', credit: 132000, memo: '1431-БАТ-ИТГЭЛ ГҮНЖ', name: 'БАТ-ИТГЭЛ ГҮНЖ', account: '5131572586' }];
    const orders = [
      { order_no: '1431', customer_name: 'Б.Ганчимэг', paid_amount: 132000, paid_ref: '', paid_date: '2026-08-10' },   // жинхэнэ
      { order_no: '1063', customer_name: 'Т.Итгэл', paid_amount: 170000, paid_ref: '', paid_date: '', event_date: '2026-03-14' },  // 3 сарын, огноогүй
    ];
    const r = F.reconcileOrders(stmt, orders);
    ok(!r.mismatch.some(m => m.order.order_no === '1063') && !r.matched.some(m => m.order.order_no === '1063'), 'scope: 3 сарын огноогүй захиалга 8 сарын хуулгад орохгүй');
  }
  {
    // Бэлнээр төлсөн захиалга банкны хуулгад орохгүй → missing болгож шуугихгүй
    const stmt = [{ date: '2026-09-05', credit: 100000, memo: 'REF-A', name: 'Бат' }];
    const orders = [
      { order_no: '1000', customer_name: 'Бат', paid_amount: 100000, paid_ref: 'REF-A', paid_date: '2026-09-05' },
      { order_no: '1001', customer_name: 'Сүх', paid_amount: 50000, paid_ref: '', paid_date: '2026-09-06', paid_method: 'бэлэн' },
    ];
    const r = F.reconcileOrders(stmt, orders);
    ok(r.missing.length === 0, 'cash: бэлэн захиалга тулгалтаас хасагдана');
  }

  // addDays — огнооны арифметик (Монгол UTC+8-д toISOString UTC-гээс болж НЭГ ӨДРӨӨР
  // буруу болдог байсныг зассан; TZ=Asia/Ulaanbaatar-д ажиллуулж баталгаажна)
  eq(F.addDays('2026-09-01', 1), '2026-09-02', 'addDays: +1 өдөр (TZ-найдвартай)');
  eq(F.addDays('2026-09-01', -1), '2026-08-31', 'addDays: -1 өдөр');
  eq(F.addDays('2026-12-31', 1), '2027-01-01', 'addDays: жил давах');
  ok(F.addDays('2026-09-01', 1) !== '2026-09-01', 'addDays: +1 нь ижил өдөр буцаахгүй');

  // ── receiptTooOld: 2026-07-01-нээс өмнөх баримт хүлээж авахгүй ──
  ok(F.receiptTooOld('2026-05-12') === true, 'receiptTooOld: 5 сар → true');
  ok(F.receiptTooOld('2026-06-30') === true, 'receiptTooOld: 6/30 → true');
  ok(F.receiptTooOld('2026-07-01') === false, 'receiptTooOld: 7/01 → false (эхлэл огноо)');
  ok(F.receiptTooOld('2026-08-12') === false, 'receiptTooOld: 8 сар → false');
  ok(F.receiptTooOld('') === false, 'receiptTooOld: огноогүй → false (хаахгүй)');

  // ── reconcileByReceipts: хээ-суурьтай тулгалт (хуулга ↔ бүртгэсэн PDF) ──
  {
    const stmt = [
      { date: '2026-08-12', credit: 5877700, name: 'МЯГМАРЖАВ ЗОЛЖАРГАЛ', memo: 'төлбөр' },   // бүртгэсэн
      { date: '2026-08-14', credit: 17132000, name: 'DENTSU DATA ARTIST', memo: 'balance' },   // бүртгээгүй
      { date: '2026-08-13', credit: 1000000, name: 'ЧИМУН ХХК', memo: 'DANS HOOROND' },         // дотоод → хасагдана
    ];
    const fp = F.receiptFingerprint({ amount: 5877700, date: '2026-08-12', senderName: 'МЯГМАРЖАВ ЗОЛЖАРГАЛ' });
    const usedFps = new Set([fp]);
    const fpOwners = new Map([[fp, 'mevent:#1160']]);
    const r = F.reconcileByReceipts(stmt, { usedFps, fpOwners });
    ok(r.recorded.length === 1 && r.recorded[0].owner === 'mevent:#1160', 'byReceipt: хээ таарвал бүртгэсэн');
    ok(r.unrecorded.length === 1 && r.unrecorded[0].credit === 17132000, 'byReceipt: хээ таарахгүй→бүртгээгүй');
    ok(r.incomeCount === 2, 'byReceipt: дотоод шилжүүлэг хасагдана');
    ok(r.matched.length === 1 && r.matched[0].order.order_no === '#1160', 'byReceipt: matched-д эзэмшигч шошго');
  }
  ok(F.reconReceiptOwnerLabel && F.reconReceiptOwnerLabel('nomaad:NC-2026-0073') === 'NC-2026-0073', 'ownerLabel: nomaad');
  {
    // Угтвар-нэрийн таарал: хуулгын нэр PDF-ийнхээс УРТ (НЭткапитал кейс) — дүн+огноо+угтвараар таарна
    const stmt = [{ date: '2026-08-05', credit: 31570000, name: 'НЭТКАПИТАЛ АВТО БАРЬЦААЛАН ЗЭЭЛДҮҮЛЭХ ТӨВ' }];
    const recFp = F.receiptFingerprint({ amount: 31570000, date: '2026-08-05', senderName: 'НЭткапитал Авто' });   // богино нэр
    const r = F.reconcileByReceipts(stmt, { usedFps: new Set([recFp]), fpOwners: new Map([[recFp, 'nomaad:NC-2026-0170']]) });
    ok(r.recorded.length === 1, 'byReceipt: нэрийн урт ялгааг угтвараар таарна');
    ok(r.unrecorded.length === 0, 'byReceipt: НЭткапитал бүртгээгүйд орохгүй');
  }
  {
    // Дүн эсвэл огноо зөрвөл таарахгүй (өөр гүйлгээ)
    const recFp = F.receiptFingerprint({ amount: 100000, date: '2026-08-05', senderName: 'Бат' });
    const r = F.reconcileByReceipts([{ date: '2026-08-05', credit: 100001, name: 'Бат' }], { usedFps: new Set([recFp]) });
    ok(r.unrecorded.length === 1, 'byReceipt: дүн зөрвөл таарахгүй');
  }

  // ── statementMeta: данс+хугацаа задлах (label-аас хойш хоосон нүд байж болно) ──
  {
    const m = [
      ['', '', '', '', '', 'Хуулганы огноо', '', '2026-09-02'],
      ['Дансны дугаар', '3635185058 [MNT]', 'IBAN', '', 'MN77 0015 0036 3518 5058'],
      ['Харилцагчийн нэр', 'ЧИМУН', 'Гүйлгээний огноо', '', '2026-08-01 - 2026-08-31'],
    ];
    const meta = F.statementMeta(m);
    ok(meta.acct === '3635185058', 'statementMeta: дансны дугаар');
    ok(meta.period === '2026-08-01 - 2026-08-31', 'statementMeta: хугацаа (2 нүд цаана)');
  }
  ok(F.statementMeta([]).acct === '', 'statementMeta: хоосон → хоосон');

  // Захиалгын хэсэг CEO ба ажилтан хоёуланд рендерлэгдэх эсэх (TDZ регресс сэргийлэх)
  const st = vm.runInContext('state', sandbox);
  const RO = vm.runInContext('renderOrders', sandbox);
  st.orders = []; st.bqOrders = []; st.appOrders = [];
  for (const [who, ceo, perms] of [['CEO', true, {}], ['ажилтан', false, { W1: { 'orders.pay': false, orders: true } }]]) {
    st.isCEO = ceo; st.me = 'W1'; st.memberPerms = perms; st.rolePerms = {};
    try { const h = RO(); ok(String(h).length > 0, 'захиалгын хэсэг ' + who + '-д рендерлэгдэнэ'); }
    catch (e) { ok(false, 'захиалгын хэсэг ' + who + '-д УНАЛАА: ' + e.message); }
  }
  // ── driverBonus: хүргэсэн (rented) + авсан (returning) бүрд 10,000₮ (зөвхөн хүргэлттэй захиалга) ──
  {
    const orders = [
      // Хүргэлттэй (DLV token хот): жолооч Бат хүргэж өгсөн (deliver) + буцаан авсан (retstart)
      { number: 1455, delivery_address: 'СБД 1-р хороо', note: '⟦DLV|city|0|150000⟧', stage_meta: { deliver: { by: 'bat', at: '2026-08-10' }, retstart: { by: 'bat', at: '2026-08-12' } } },
      // Хүргэлттэй: Бат хүргэсэн, өөр хүн авсан
      { number: 1460, note: '⟦DLV|out|5|50000⟧', stage_meta: { deliver: { by: 'bat', at: '2026-08-15' }, retstart: { by: 'dorj', at: '2026-08-17' } } },
      // Хүргэлтгүй (очиж авах): нэмэгдэл тооцохгүй
      { number: 1461, note: '', stage_meta: { deliver: { by: 'bat', at: '2026-08-20' } } },
    ];
    const b = F.driverBonus('bat', '2026-08', orders);
    ok(b.deliveries === 2 && b.pickups === 1, 'driverBonus: 2 хүргэсэн + 1 авсан');
    ok(b.count === 3 && b.amount === 30000, 'driverBonus: 3 × 10,000 = 30,000');
    ok(b.trips.length === 3 && b.trips[0].number != null && b.trips[0].type, 'driverBonus: аяллын жагсаалт (дугаар+төрөл)');
    const d = F.driverBonus('dorj', '2026-08', orders);
    ok(d.count === 1 && d.amount === 10000, 'driverBonus: Дорж 1 авсан = 10,000');
    ok(F.driverBonus('bat', '2026-07', orders).count === 0, 'driverBonus: өөр сар → 0');
  }

  // ── Хамтрагчийн асуулт — шат бүрд тодорхой ──
  {
    ok(F.stageHelpQuestion('clean').includes('Цэвэрлэгээ'), 'help-Q: цэвэрлэх шатны асуулт тодорхой');
    ok(F.stageHelpQuestion('prepare').includes('Бэлтгэл'), 'help-Q: бэлдэх шатны асуулт тодорхой');
    ok(F.stageHelpQuestion('deliver').includes('Хүргэлт'), 'help-Q: хүргэх шатны асуулт тодорхой');
    ok(F.stageHelpQuestion('retstart').includes('Буцаан авах'), 'help-Q: буцаан авах шатны асуулт');
    const d = F.stageHelpQuestion('огт_байхгүй');
    ok(typeof d === 'string' && d.length > 5, 'help-Q: танигдаагүй шатанд ерөнхий асуулт');
  }
  // ── Хамтрагчаар нэмэгдэх боломжтой хүн = зөвхөн үндсэн, идэвхтэй, өөрөөс бусад ──
  {
    const cands = [
      { name: 'Үндсэн Б', status: 'идэвхтэй', worker_type: 'permanent' },
      { name: 'Цагийн Ц', status: 'идэвхтэй', worker_type: 'daily' },
      { name: 'Гарсан Г', status: 'гарсан', worker_type: 'permanent' },
    ];
    const pick = cands.filter(m => (m.status || 'идэвхтэй') === 'идэвхтэй' && !F.isDailyMember(m));
    ok(pick.length === 1 && pick[0].name === 'Үндсэн Б', 'хамтрагч: цагийн ба гарсан ажилтан жагсаалтад ороогүй');
  }

  // ── Суурилуулалт / угсралтын дамжлага (⟦SET⟧) ──
  {
    const dlv = '⟦DLV|city|0|150000⟧';
    const plain   = { note: dlv, items: [{ name: 'Сандал', qty: 10 }] };
    const withSet = { note: dlv + ' ⟦SET|1⟧', items: [{ name: 'Тайз', qty: 1 }] };
    const byItem  = { note: dlv, items: [{ name: 'Тайзны суурилуулалт', qty: 1 }] };
    const offFlag = { note: dlv + ' ⟦SET|0⟧', items: [{ name: 'Тайзны суурилуулалт', qty: 1 }] };
    const pickup  = { note: '⟦SET|1⟧', items: [{ name: 'Тайз', qty: 1 }] };

    ok(F.orderNeedsSetup(withSet) === true, 'setup: ⟦SET|1⟧ тэмдэгтэй бол тийм');
    ok(F.orderNeedsSetup(byItem) === true, 'setup: «суурилуулалт» бараа мөрөөр авто танина');
    ok(F.orderNeedsSetup(offFlag) === false, 'setup: гараар унтраасан нь бараа мөрөөс ДАВУУ');
    ok(F.orderNeedsSetup(plain) === false, 'setup: энгийн захиалгад шат гарахгүй');

    const step = (o, st) => F.orderNextStep(Object.assign({}, o, { status: st }));
    // Суурилуулалттай: Хүргэсэн → 🔧 Суурилуулах → түрээс → 🧱 Буулгах → буцаан авах
    ok(step(withSet, 'delivering').to === 'installing', 'setup: хүргэсний дараа installing');
    ok(step(withSet, 'installing').to === 'rented', 'setup: суурилуулсны дараа түрээс');
    ok(step(withSet, 'installing').cap === 'orders.setup', 'setup: суурилуулах эрх = orders.setup');
    ok(step(withSet, 'rented').to === 'teardown', 'setup: түрээсийн дараа буулгах');
    ok(step(withSet, 'teardown').to === 'returning', 'setup: буулгасны дараа буцаан авах');
    // Суурилуулалтгүй хүргэлт — хуучин урсгал хэвээр
    ok(step(plain, 'delivering').to === 'rented', 'setup: энгийн хүргэлт → шууд түрээс');
    ok(step(plain, 'rented').to === 'returning', 'setup: энгийн хүргэлт → шууд буцаан авах');
    // Очиж авах захиалгад суурилуулалт гарахгүй (бид угсрахгүй)
    ok(step(pickup, 'ready').to === 'rented', 'setup: очиж авах захиалгад шат нэмэгдэхгүй');

    // Шатны нэр, асуулт бүрэн бүртгэгдсэн эсэх
    // const-ууд sandbox объектод наалддаггүй тул context дотроос уншина
    const G = n => vm.runInContext(n, sandbox);
    ok(G('STAGE_ACTION')['installing>rented'].key === 'setup', 'setup: STAGE_ACTION зураглал');
    ok(G('STAGE_ACTION')['rented>teardown'].key === 'teardown', 'teardown: STAGE_ACTION зураглал');
    ok(!!G('STAGE_META_LABEL').setup && !!G('STAGE_META_LABEL').teardown, 'setup: түүхийн нэр бий');
    ok(F.stageHelpQuestion('setup').includes('Суурилуулалт'), 'setup: хамтрагчийн асуулт тодорхой');
    ok(!!G('STAGE_PREV_Q').setup && !!G('STAGE_PREV_Q').teardown, 'setup: үнэлгээний асуулт бий');
    const _ss = G('ORDER_STAFF_STATUSES');
    ok(_ss.includes('installing') && _ss.includes('teardown'), 'setup: шинэ төлөв ажилтанд харагдана');
    ok(F.bucketOf('installing') === 'active' && F.bucketOf('teardown') === 'active',
       'setup: шинэ төлөв «Захиалсан» бүлэгт');
    ok(!!G('BQ_STATUS').installing && !!G('BQ_STATUS').teardown, 'setup: төлөвийн badge бий');
    // ⟦SET⟧ token нь cleanAppNote-д арилдаг (засварлахад давхардахгүй)
    ok(F.cleanAppNote('Тэмдэглэл ' + F.encodeSetup(true)).trim() === 'Тэмдэглэл', 'setup: token тэмдэглэлээс арилна');
  }

  // ── Эрхийн чагт = дамжлагын дараалал + товчны нэртэй ижил бичилт ──
  {
    const G2 = n => vm.runInContext(n, sandbox);
    const canon = G2('ORDER_STAGE_CAPS');
    ok(JSON.stringify(F.ordersStageCapOrder()) === JSON.stringify(canon),
       'эрх: захиалгын чагтууд дамжлагын дараалалтай');
    const lbl = {};
    G2('PERM_MENUS').find(m => m.key === 'orders').actions.forEach(a => { lbl[a.key] = a.label; });
    // Товчны нэр (orderNextStep) чагтны нэрэнд агуулагдах ёстой
    const btn = (o, st) => F.orderNextStep(Object.assign({}, o, { status: st }));
    const setO = { note: '⟦DLV|city|0|150000⟧ ⟦SET|1⟧', items: [] };
    const pairs = [
      ['reserved', 'orders.clean'], ['prepared', 'orders.prepare'],
      ['ready', 'orders.dispatch'], ['delivering', 'orders.deliver'],
      ['installing', 'orders.setup'], ['rented', 'orders.setup'],
      ['returned', 'orders.advance'],
    ];
    for (const [st, cap] of pairs) {
      const b = btn(setO, st);
      ok(b.cap === cap, `эрх: ${st} шат → ${cap}`);
      ok(String(lbl[cap] || '').includes(b.label), `эрх: «${b.label}» товч чагтны нэрэнд ижил бичилттэй`);
    }
  }

  // ── Барааны тулгалт: нормчлол, шийдэх дараалал, тогтвортой байдал ──
  {
    ok(F.normItemKey('Эвхдэг  Сандал (Цагаан)') === F.normItemKey('эвхдэг сандал цагаан'),
       'тулгалт: зай/цэг таслал/том үсэг ялгаагүй');
    ok(F.normItemKey('Mишок') === F.normItemKey('Мишок'), 'тулгалт: латин/кирилл ижил дүрст үсэг нэгдэнэ');
    ok(F.normItemKey('Ширээ 180*70см') !== F.normItemKey('Ширээ 180*74см'), 'тулгалт: хэмжээ ялгагдана');
    ok(F.normItemKey(null) === '' && F.normItemKey(undefined) === '', 'тулгалт: хоосон утга аюулгүй');

    const ctx = {
      bySku: { 'M-234': { sku: 'M-234' }, 'M-217': { sku: 'M-217' } },
      byName: { [F.normItemKey('Эвхэгддэг сандал Цагаан')]: 'M-234' },
      aliases: { 'sku:ch_234': 'M-234', ['name:' + F.normItemKey('Эвхдэг Сандал (Цагаан)')]: 'M-234',
                 ['name:' + F.normItemKey('Бараа')]: '' },
    };
    ok(F.resolveItemSku({ sku: 'M-234', name: 'ямар ч нэр' }, ctx).how === 'sku', 'тулгалт: sku шууд давуу');
    ok(F.resolveItemSku({ sku: 'CH_234', name: 'өөр нэр' }, ctx).sku === 'M-234', 'тулгалт: хуучин sku толиор');
    ok(F.resolveItemSku({ sku: 'ch_234', name: 'өөр нэр' }, ctx).sku === 'M-234', 'тулгалт: том/жижиг үсэг ялгаагүй');
    ok(F.resolveItemSku({ sku: '', name: 'Эвхдэг Сандал (Цагаан)' }, ctx).sku === 'M-234', 'тулгалт: нэрийн толь');
    ok(F.resolveItemSku({ sku: '', name: 'Эвхэгддэг сандал Цагаан' }, ctx).how === 'name', 'тулгалт: шууд нэрээр');
    const skip = F.resolveItemSku({ sku: '', name: 'Бараа' }, ctx);
    ok(skip.how === 'skip' && skip.sku === '', 'тулгалт: «бараа биш» тэмдэглэгээ');
    ok(F.resolveItemSku({ sku: 'ХЗ-999', name: 'танихгүй' }, ctx).how === 'none', 'тулгалт: танигдаагүй');
    // ГОЛ БАТАЛГАА: бараа нэрээ соливол толиор холбогдсон мөр ТАСРАХГҮЙ
    const renamed = { bySku: ctx.bySku, byName: { [F.normItemKey('ЦАГААН сандал шинэ нэр')]: 'M-234' }, aliases: ctx.aliases };
    ok(F.resolveItemSku({ sku: '', name: 'Эвхдэг Сандал (Цагаан)' }, renamed).sku === 'M-234',
       'тулгалт: бараа нэрээ соливол толь ТАСРАХГҮЙ');
    ok(F.resolveItemSku({ sku: 'CH_234', name: 'юу ч байсан' }, renamed).sku === 'M-234',
       'тулгалт: хуучин sku нэр солиход тасрахгүй');

    // Санал болгох оноо — бодит алдаанууд дээр шалгав
    const S = F.itemNameScore;
    ok(S('Эвхдэг Сандал (Цагаан)', 'Эвхэгддэг сандал Цагаан') > S('Эвхдэг Сандал (Цагаан)', 'Зөөлөвчтэй цагаан сандал'),
       'санал: үг хувирлыг барина (эвхдэг ↔ эвхэгддэг)');
    ok(S('Өвлийн Майхан 6-8 хүн', 'Өвлийн майхан 6-8 хүний') > S('Өвлийн Майхан 6-8 хүн', 'Өвлийн майхан 2-4 хүний'),
       'санал: ХЭМЖЭЭ таарахгүй бол унана (6-8 ≠ 2-4)');
    ok(S('Асар 12:15', 'Асар 12м 12×15') > S('Асар 12:15', 'Асар 18м 18×15'), 'санал: асрын хэмжээ ялгагдана');
    ok(S('Лэд дэлгэц', 'LED дэлгэц') > 0.4, 'санал: латин/кирилл бичилт таарна');
    ok(S('Тайз (1,2мкв)', 'Тайз (1,2 м²)') > 0.6, 'санал: тэмдэгтийн ялгаа саад болохгүй');
    ok(S('Эвхдэг Сандал (Цагаан)', 'Шөлний сав 50 л') < 0.25, 'санал: хамааралгүй бараа бага оноотой');

    // Бүлэглэл — дүнгээр эрэмбэлж, шийдэгдсэнийг тоолно
    const orders = [
      { number: 1, status: 'returned', items: [
        { sku: 'M-234', name: 'Эвхэгддэг сандал Цагаан', qty: 10, price: 6600 },
        { sku: '', name: 'Танихгүй зүйл', qty: 2, price: 500000 } ] },
      { number: 2, status: 'rented', items: [{ sku: '', name: 'Танихгүй зүйл', qty: 1, price: 100000 }] },
      { number: 3, status: 'draft',    items: [{ sku: '', name: 'Тоологдохгүй', qty: 9, price: 900000 }] },
      { number: 4, status: 'canceled', items: [{ sku: '', name: 'Тоологдохгүй', qty: 9, price: 900000 }] },
    ];
    const g = F.unresolvedItemGroups(orders, ctx);
    ok(g.okLines === 1 && g.okAmt === 66000, 'бүлэглэл: шийдэгдсэн мөр зөв');
    ok(g.groups.length === 1 && g.groups[0].lines === 2 && g.groups[0].amount === 1100000,
       'бүлэглэл: нэг нэр дор нэгтгэнэ');
    ok(g.groups[0].orders.join(',') === '1,2', 'бүлэглэл: жишээ захиалгын дугаар');
    ok(!g.groups.some(x => x.name === 'Тоологдохгүй'), 'бүлэглэл: ноорог/цуцалсныг тоохгүй');
  }

  // ── QR ирц: серверийн бичилт унавал ЧИМЭЭГҮЙ ӨНГӨРӨХГҮЙ ──
  {
    const st = vm.runInContext('state', sandbox);
    const save = vm.runInContext('attSaveScanRecord', sandbox);
    const savedFetch = sandbox.fetch, savedAtt = st.attendanceToday, savedLast = st._attLastScan;

    const mkRec = () => ({ member_key: '99112233', member_name: 'Тест', kind: 'in', ts: '2026-09-02T01:00:00Z' });
    const body = { member_key: '99112233', kind: 'in' };

    // (1) Амжилттай — мөр үлдэнэ, true буцаана
    sandbox.fetch = () => Promise.resolve({ ok: true, status: 201 });
    let rec = mkRec();
    st.attendanceToday = [rec]; st._attLastScan = { '99112233': Date.now() };
    ok(await save(body, rec, 'Тест'), 'ирц: амжилттай хадгалалт true');
    eq(st.attendanceToday.length, 1, 'ирц: амжилттай үед мөр үлдэнэ');
    ok(st._attLastScan['99112233'] != null, 'ирц: амжилттай үед давхардлын түгжээ хэвээр');

    // (2) HTTP алдаа — !r.ok бол чимээгүй өнгөрөхгүй (checkin.html-ийн загвар)
    sandbox.fetch = () => Promise.resolve({ ok: false, status: 500 });
    rec = mkRec();
    st.attendanceToday = [rec]; st._attLastScan = { '99112233': Date.now() };
    ok(!(await save(body, rec, 'Тест')), 'ирц: HTTP алдаанд false буцаана');
    eq(st.attendanceToday.length, 0, 'ирц: алдаанд оптимист мөр буцаагдана (худал ирц үлдэхгүй)');
    eq(st._attLastScan['99112233'], undefined, 'ирц: алдаанд түгжээ тайлагдаж шууд дахин уншуулна');

    // (3) Сүлжээ тасарсан — мөн адил
    sandbox.fetch = () => Promise.reject(new Error('offline'));
    rec = mkRec();
    st.attendanceToday = [rec]; st._attLastScan = { '99112233': Date.now() };
    ok(!(await save(body, rec, 'Тест')), 'ирц: сүлжээ тасрахад false буцаана');
    eq(st.attendanceToday.length, 0, 'ирц: сүлжээ тасрахад оптимист мөр буцаагдана');

    // (4) Кодод .catch(() => {}) чимээгүй залгигч эргэж ирээгүй эсэх
    const scan = src.slice(src.indexOf('function attHandleScan('));
    const fn = scan.slice(0, scan.indexOf('\n}'));
    ok(fn.indexOf('.catch(() => {})') === -1, 'ирц: сканы бичилтэд чимээгүй catch байхгүй');
    ok(fn.indexOf('attSaveScanRecord') > -1, 'ирц: бичилт алдаа шалгадаг замаар явна');
    ok(/saved && kind === 'out'/.test(fn), 'ирц: «маргааш хэдэн цагт» зөвхөн хадгалагдсаны дараа');

    sandbox.fetch = savedFetch; st.attendanceToday = savedAtt; st._attLastScan = savedLast;
  }

  // ── Тулгалтын хяналт: аль толь хэр их дүн дааж байгааг илрүүлэх ──
  {
    const ctx = { bySku: { 'M-235': { sku: 'M-235' } }, byName: {},
      aliases: { ['name:' + F.normItemKey('Бараа')]: 'M-235',
                 ['name:' + F.normItemKey('Жижиг зүйл')]: 'M-235' } };
    const orders = [
      { number: 1, status: 'returned', items: [
        { sku: '', name: 'Бараа', qty: 1, price: 9000000 },
        { sku: '', name: 'Жижиг зүйл', qty: 1, price: 1000000 } ] },
    ];
    const u = F.aliasUsage(orders, ctx);
    ok(u.total === 10000000, 'хяналт: нийт дүн');
    ok(u.rows[0].label === 'Бараа' && u.rows[0].amount === 9000000, 'хяналт: дүнгээр эрэмбэлнэ');
    ok(Math.round(u.rows[0].share * 100) === 90, 'хяналт: эзлэх хувь тооцогдоно');
    ok(u.rows[0].share >= 0.15, 'хяналт: 15%-иас дээш нь анхааруулга өгөх ёстой');
    ok(u.rows[1].share < 0.15, 'хяналт: жижиг толь анхааруулга өгөхгүй');
    // sku нь бодит бараа бол толь тоологдохгүй (шууд таарсан)
    const u2 = F.aliasUsage([{ status: 'rented', items: [{ sku: 'M-235', name: 'Бараа', qty: 1, price: 100 }] }], ctx);
    ok(u2.rows.length === 0, 'хяналт: шууд sku-тай мөр толинд тоологдохгүй');
  }

  // ── Үнийн шинжилгээ: үзүүлэлт + дүгнэлт ──
  {
    const ctx = { bySku: { 'A': { sku: 'A' }, 'B': { sku: 'B' }, 'C': { sku: 'C' }, 'D': { sku: 'D' } }, byName: {}, aliases: {} };
    const prods = [
      { sku: 'A', name: 'Дүүрдэг сандал', price: 10000, cost: 20000, qty_mevent: 10, type: 'rental' },
      { sku: 'B', name: 'Хямдруулдаг дэлгэц', price: 100000, cost: 400000, qty_mevent: 5, type: 'rental' },
      { sku: 'C', name: 'Зогсонги бараа', price: 5000, cost: 50000, qty_mevent: 4, type: 'rental' },
      { sku: 'D', name: 'Хүргэлт', price: 150000, cost: 0, qty_mevent: 1, type: 'service' },
      { sku: 'E', name: 'Ачааны машин', price: 0, cost: 68000000, qty_mevent: 1, type: 'asset' },
    ];
    // A: 10ш нөөц, 4 захиалга × 10ш = 40ш, бүтэн үнээр, огноо давхцаж 3+ өдөр дүүрнэ
    const orders = [
      { number: 1, status: 'returned', starts_at: '2026-05-01', stops_at: '2026-05-03', total_mnt: 350000,
        items: [{ sku: 'A', name: 'a', qty: 10, price: 10000 }, { sku: 'B', name: 'b', qty: 5, price: 50000 }] },
      { number: 2, status: 'returned', starts_at: '2026-05-02', stops_at: '2026-05-02', total_mnt: 100000,
        items: [{ sku: 'A', name: 'a', qty: 10, price: 10000 }] },
      { number: 3, status: 'rented',   starts_at: '2026-05-10', stops_at: '2026-05-10', total_mnt: 250000,
        items: [{ sku: 'A', name: 'a', qty: 10, price: 10000 }, { sku: 'D', name: 'd', qty: 1, price: 150000 }] },
      { number: 4, status: 'returned', starts_at: '2026-05-11', stops_at: '2026-05-11', total_mnt: 100000,
        items: [{ sku: 'A', name: 'a', qty: 10, price: 10000 }] },
      { number: 5, status: 'draft',    starts_at: '2026-05-12', stops_at: '2026-05-12', total_mnt: 20000,
        items: [{ sku: 'C', name: 'c', qty: 4, price: 5000 }] },
    ];
    const st = F.pricingStats(orders, prods, { from: '2026-01-01', to: '2026-12-31', ctx });
    const by = {}; st.rows.forEach(r => { by[r.sku] = r; });

    ok(!by.D, 'үнэ: үйлчилгээ (хүргэлт) тайланд орохгүй');
    ok(!by.E, 'үнэ: дотоод хөрөнгө (машин) тайланд орохгүй');
    ok(st.totals.capital === 20000 * 10 + 400000 * 5 + 50000 * 4, 'үнэ: хөрөнгө зөвхөн түрээсийн бараанаас');
    ok(by.A.qty === 40 && by.A.turns === 4, 'үнэ: эргэлт = ширхэг ÷ нөөц');
    ok(by.A.orders === 4, 'үнэ: захиалгын тоо');
    ok(by.A.revenue === 400000 && by.A.avg === 10000, 'үнэ: орлого ба дундаж бодит үнэ');
    ok(by.A.real === 1, 'үнэ: биелэлт 100% (хөнгөлөлтгүй)');
    // 05-01..03 (10ш) + 05-02 давхцал = 05-02-т 20ш; дүүрсэн өдөр = 10ш-ээс дээш өдрүүд
    ok(by.A.peak === 20, 'үнэ: оргилын ачаалал давхацсан өдрөөр');
    ok(by.A.soldOut === 5, 'үнэ: нөөц дүүрсэн өдрийн тоо');
    ok(by.A.verdict.key === 'up', 'дүгнэлт: дүүрдэг + хөнгөлдөггүй = ҮНЭ ӨСГӨ');

    ok(Math.round(by.B.real * 100) === 50, 'үнэ: хагас үнээр зарагдсан');
    ok(by.B.verdict.key === 'down', 'дүгнэлт: 70%-иас доош биелэлт = ҮНЭ БОДИТ БОЛГО');

    ok(by.C.qty === 0, 'үнэ: ноорог захиалга тоологдохгүй');
    ok(by.C.verdict.key === 'idle', 'дүгнэлт: огт эргээгүй = ЗОГСОНГИ');
    ok(st.totals.idleCapital === 200000 && st.totals.idleCount === 1, 'үнэ: зогсонги хөрөнгө');

    // ROI = орлого ÷ (өртөг × нөөц)
    ok(by.A.roi === 400000 / (20000 * 10), 'үнэ: ROI = орлого ÷ хөрөнгө');
    // Хөнгөлөлттэй захиалга — бодит үнэ буурч, «үнэ өсгө» гэж буруу зөвлөхгүй
    {
      const disc = [{ number: 7, status: 'returned', starts_at: '2026-03-01', stops_at: '2026-03-01',
        total_mnt: 50000,   // мөрийн нийлбэр 100,000 — 50% хөнгөлөлт
        items: [{ sku: 'A', name: 'a', qty: 10, price: 10000 }] }];
      const sd = F.pricingStats(disc, prods, { from: '2026-01-01', to: '2026-12-31', ctx });
      const a = sd.rows.find(r => r.sku === 'A');
      ok(a.revenue === 50000 && a.avg === 5000, 'үнэ: хөнгөлөлт бодит үнэд тусна');
      ok(a.real === 0.5 && a.verdict.key === 'down', 'дүгнэлт: хөнгөлж зардаг бол «үнэ өсгө» гэхгүй');
    }
    // Барьцаа бодит үнийг өсгөх ёсгүй
    {
      const dep = [{ number: 8, status: 'returned', starts_at: '2026-03-01', stops_at: '2026-03-01',
        total_mnt: 500000, deposit_mnt: 400000,
        items: [{ sku: 'A', name: 'a', qty: 10, price: 10000 }] }];
      const sdp = F.pricingStats(dep, prods, { from: '2026-01-01', to: '2026-12-31', ctx });
      ok(sdp.rows.find(r => r.sku === 'A').avg === 10000, 'үнэ: барьцаа бодит үнийг өсгөхгүй');
    }
    // Хугацааны шүүлт — өмнөх оны захиалга орохгүй
    const st2 = F.pricingStats(orders, prods, { from: '2026-06-01', to: '2026-12-31', ctx });
    ok(st2.rows.every(r => r.qty === 0), 'үнэ: хугацааны шүүлт ажиллана');
    // Нөөцгүй бараа — дүгнэлт гаргахгүй
    const st3 = F.pricingStats(orders, [{ sku: 'A', name: 'x', price: 1, qty_mevent: 0, stock: 0 }], { from: '2026-01-01', to: '2026-12-31', ctx });
    ok(st3.rows[0].verdict.key === 'nodata', 'дүгнэлт: нөөц тэмдэглээгүй бол дата дутуу');
    // Огнооны хамгаалалт
    ok(F._dayRange('2026-05-03', '2026-05-01').length === 1, 'огноо: буруу дараалал = 1 өдөр');
    ok(F._dayRange('', '').length === 0, 'огноо: хоосон = хоосон');
    // Багц барааны нөөц — бүрэлдэхүүнээс тухайн агшинд бодогдоно (хадгалагдсанаас биш)
    {
      const st0 = vm.runInContext('state', sandbox);
      const prev = st0.products;
      st0.products = [
        { sku: 'P1', name: 'Майхан', stock: 6, qty_mevent: 6 },
        { sku: 'P2', name: 'Зуух', stock: 4, qty_mevent: 4 },
      ];
      const pkg = { sku: 'PK', name: 'Өвлийн багц', type: 'package', price: 390000,
        stock: 99, qty_mevent: 99, bundle_items: [{ sku: 'P1', qty: 1 }, { sku: 'P2', qty: 2 }] };
      ok(F.pricingStock(pkg) === 2, 'багц: нөөц = бүрэлдэхүүний хамгийн бага (4÷2=2)');
      ok(F.pricingStock({ sku: 'X', stock: 7 }) === 7, 'багц бус: энгийн нөөц');
      const sp = F.pricingStats(
        [{ number: 9, status: 'returned', starts_at: '2026-02-01', stops_at: '2026-02-01', total_mnt: 780000,
           items: [{ sku: 'PK', name: 'Өвлийн багц', qty: 2, price: 390000 }] }],
        [pkg], { from: '2026-01-01', to: '2026-12-31',
                 ctx: { bySku: { PK: pkg }, byName: {}, aliases: {} } });
      ok(sp.rows[0].pkg === true && sp.rows[0].stock === 2 && sp.rows[0].turns === 1,
         'багц: тайланд багц гэж тэмдэглэгдэж, эргэлт зөв');
      st0.products = prev;
    }
  }

  // ── Санхүүгийн кэш эрхгүй хүний утсанд БҮХ гүйлгээг хадгалахгүй ──
  {
    const st = vm.runInContext('state', sandbox);
    const VIS = vm.runInContext('financeVisibleRows', sandbox);
    const SAVE = vm.runInContext('saveFinanceCache', sandbox);
    const saved = { me: st.me, ceo: st.isCEO, fr: st.financeRequests, perms: st.finBranchPerms };
    st.finBranchPerms = new Set();   // тусгай эрхгүй

    const ME = '99112233', OTHER = '88445566';
    const rows = [
      { id: 'a', requested_by: ME,    beneficiary: 'Өөрийн хүсэлт', amount: 50000,   decision: 'pending' },
      { id: 'b', requested_by: OTHER, beneficiary: 'Бусдын хүсэлт', amount: 9000000, decision: 'pending' },
      { id: 'c', requested_by: OTHER, beneficiary: 'Бусдын, надад',  amount: 300000,  decision: 'approved', executor: ME },
      { id: 'd', requested_by: OTHER, beneficiary: 'Бусдын, өөрт',   amount: 700000,  decision: 'approved', executor: OTHER },
    ];

    // Энгийн ажилтан — зөвхөн өөрт нь хамаатай мөрүүд
    st.me = ME; st.isCEO = false; st.financeRequests = rows;
    const seen = VIS(rows).map(r => r.id);
    ok(seen.indexOf('a') > -1, 'кэш: өөрийн хүсэлт кэшлэгдэнэ');
    ok(seen.indexOf('c') > -1, 'кэш: өөрт нь гүйцэтгүүлэх хүсэлт кэшлэгдэнэ');
    ok(seen.indexOf('b') === -1, 'кэш: бусдын хүсэлт кэшлэгдэхгүй');
    ok(seen.indexOf('d') === -1, 'кэш: бусдын гүйлгээ кэшлэгдэхгүй');

    // localStorage-д бодитоор юу бичигдэв
    localStorage.removeItem('financeRequests');
    SAVE();
    const written = JSON.parse(localStorage.getItem('financeRequests') || '[]');
    ok(!written.some(r => r.id === 'b'), 'кэш: localStorage-д бусдын гүйлгээ БАЙХГҮЙ');
    ok(JSON.stringify(written).indexOf('9000000') === -1, 'кэш: бусдын дүн localStorage-д алга');

    // CEO — бүгд хэвээр
    st.isCEO = true;
    eq(VIS(rows).length, 4, 'кэш: CEO бүх гүйлгээг кэшлэнэ');

    // Нэвтрээгүй — кэш ОГТ хөндөгдөхгүй (хоосон бичиж датаг устгахгүй)
    st.isCEO = false; st.me = '';
    localStorage.setItem('financeRequests', '[{"id":"keep"}]');
    SAVE();
    eq(JSON.parse(localStorage.getItem('financeRequests')).map(r => r.id), ['keep'],
       'кэш: нэвтрээгүй үед кэш устгагдахгүй');
    eq(VIS(rows), [], 'кэш: нэвтрээгүй бол харагдах мөр 0');

    // Түүхий бичилт кодод эргэж ирээгүй эсэх
    ok(src.indexOf("localStorage.setItem('financeRequests', JSON.stringify(state.financeRequests))") === -1,
       'кэш: шүүлтгүй түүхий бичилт кодод байхгүй');
    // Гарахад цэвэрлэгдэнэ
    const lo = src.slice(src.indexOf('async function logout()'));
    ok(lo.slice(0, lo.indexOf('\n}')).indexOf("removeItem('financeRequests')") > -1,
       'кэш: гарахад санхүүгийн кэш устгагдана');

    localStorage.removeItem('financeRequests');
    st.me = saved.me; st.isCEO = saved.ceo; st.financeRequests = saved.fr; st.finBranchPerms = saved.perms;
  }

  // ── Түүхийн тайлан: мөрд орлого хуваарилах дүрэм ──
  {
    const R = F.histLineRevenue;
    // Хөнгөлөлт: мөрийн нийлбэр 100, цэвэр дүн 80 → мөр бүр 80%-аар
    ok(R(50, 100, 80) === 40, 'хуваарилалт: хөнгөлөлтөөр харьцангуй буурна');
    // Нэмэлт төлбөр (хүргэлт): цэвэр дүн 150 > мөрийн нийлбэр 100 → мөр ӨСӨХГҮЙ
    ok(R(50, 100, 150) === 50, 'хуваарилалт: хүргэлт/нэмэлт мөрд тарахгүй');
    ok(R(50, 100, 100) === 50, 'хуваарилалт: яг таарвал мөрийн дүн');
    ok(R(50, 0, 100) === 0, 'хуваарилалт: мөргүй бол 0');
    ok(R(50, 100, 0) === 0, 'хуваарилалт: дүнгүй захиалга → 0');
    ok(Math.abs((R(60, 100, 80) + R(40, 100, 80)) - 80) < 1e-9, 'хуваарилалт: нийлбэр цэвэр дүнтэй тэнцэнэ');
    // Цэвэр орлогын дүрэм — orderRevenue: барьцаа хасна, ГЭХДЭЭ Booqable-д хасахгүй
    ok(F.orderRevenue({ total_mnt: 200, deposit_mnt: 120 }, 'accrual') === 80, 'орлого: барьцаа хасагдана');
    ok(F.orderRevenue({ total_mnt: 200, deposit_mnt: 120, source: 'booqable' }, 'accrual') === 200,
       'орлого: Booqable-д барьцаа total-д ОРООГҮЙ тул хасахгүй');
    ok(F.orderRevenue({ total_mnt: 375000, deposit_mnt: 3375000, source: 'booqable' }, 'accrual') === 375000,
       'орлого: барьцаа дүнгээс их байсан ч Booqable 0 болохгүй');

    // Задаргаа — тайлангийн тоотой ижил гарах ёстой
    const orders = [
      { id: 'o1', number: 11, customer: 'А', status: 'returned', starts_at: '2026-05-01', stops_at: '2026-05-01',
        total_mnt: 10000000, deposit_mnt: 0,
        items: [{ name: 'Аяны ор', qty: 100, price: 20000 }, { name: 'Ширээ', qty: 10, price: 10000 }] },
      { id: 'o2', number: 12, customer: 'Б', status: 'rented', starts_at: '2026-05-05', stops_at: '2026-05-05',
        total_mnt: 5000000, deposit_mnt: 4000000,   // барьцаа ихтэй — хэтрэх ёсгүй
        items: [{ name: 'Аяны ор', qty: 10, price: 20000 }] },
    ];
    const d = F.histProductOrders(orders, 'Аяны ор');
    ok(d.rows.length === 2 && d.totals.orders === 2, 'задаргаа: захиалга бүр гарна');
    ok(d.totals.qty === 110, 'задаргаа: ширхэг');
    ok(d.rows[0].number === 11 && d.rows[0].rev === 2000000, 'задаргаа: мөрийн дүн хэвээр (нэмэлт тарахгүй)');
    ok(d.rows[1].rev === 200000, 'задаргаа: барьцаа мөрд нэмэгдэхгүй');
    ok(d.totals.rev === 2200000, 'задаргаа: нийлбэр');
    ok(F.histProductOrders(orders, 'аяны  ОР').rows.length === 2, 'задаргаа: нэр том/жижиг, зай ялгаагүй');
    ok(F.histProductOrders(orders, 'Байхгүй бараа').rows.length === 0, 'задаргаа: олдохгүй бол хоосон');
  }

  // ── Үйлчилгээний задаргаа: хүргэлт / угсралт / бусад ──
  {
    ok(F.serviceKind('2 талдаа Хүргэлт  (машины төрөл дунд)') === 'delivery', 'үйлчилгээ: хүргэлт танигдана');
    ok(F.serviceKind('Хүргэлт 1 талдаа') === 'delivery', 'үйлчилгээ: хүргэлтийн өөр бичилт');
    ok(F.serviceKind('Угсралт суурилуулалт') === 'setup', 'үйлчилгээ: угсралт танигдана');
    ok(F.serviceKind('Суурилуулалт') === 'setup', 'үйлчилгээ: суурилуулалт');
    ok(F.serviceKind('Оператор') === 'other', 'үйлчилгээ: бусад');

    // ⟦DLV⟧ хүргэлтийн төлбөр — зөвхөн төлбөртэй, идэвхтэй захиалга
    const orders = [
      { id: 'a', number: 1, customer: 'А', status: 'returned', starts_at: '2026-08-01', note: '⟦DLV|city|0|150000⟧' },
      { id: 'b', number: 2, customer: 'Б', status: 'rented',   starts_at: '2026-08-02', note: '⟦DLV|out|30|450000⟧' },
      { id: 'c', number: 3, customer: 'В', status: 'returned', starts_at: '2026-08-03', note: '⟦DLV|pickup|0|0⟧' },
      { id: 'd', number: 4, customer: 'Г', status: 'draft',    starts_at: '2026-08-04', note: '⟦DLV|city|0|150000⟧' },
      { id: 'e', number: 5, customer: 'Д', status: 'returned', starts_at: '2026-08-05', note: '' },
    ];
    const dlv = F.deliveryFeeRows(orders);
    ok(dlv.rows.length === 2 && dlv.total === 600000, 'хүргэлт: төлбөртэй идэвхтэй захиалга л орно');
    ok(dlv.rows[0].number === 2 && dlv.rows[0].km === 30, 'хүргэлт: дүнгээр эрэмбэ, км уншигдана');
    ok(!dlv.rows.some(r => r.number === 4), 'хүргэлт: ноорог орохгүй');
    ok(!dlv.rows.some(r => r.number === 3), 'хүргэлт: очиж авах (0₮) орохгүй');

    const bd = F.serviceBreakdown([
      { product: '2 талдаа Хүргэлт', revenue_mnt: 31700000, times_rented: 304, total_qty: 835 },
      { product: 'Угсралт суурилуулалт', revenue_mnt: 1900000, times_rented: 9, total_qty: 9 },
      { product: 'Оператор', revenue_mnt: 100000, times_rented: 1, total_qty: 1 },
    ], dlv);
    ok(bd.groups.length === 3, 'задаргаа: гурван бүлэг');
    ok(bd.groups[0].key === 'delivery' && bd.groups[0].rows.length === 2, 'задаргаа: хүргэлтэд ⟦DLV⟧ мөр нэмэгдэнэ');
    ok(bd.groups[0].total === 31700000 + 600000, 'задаргаа: хүргэлтийн нийлбэрт ⟦DLV⟧ орно');
    ok(bd.groups[1].key === 'setup' && bd.groups[1].total === 1900000, 'задаргаа: угсралт тусдаа');
    ok(bd.total === 31700000 + 600000 + 1900000 + 100000, 'задаргаа: нийт дүн');
    ok(F.serviceBreakdown([], { rows: [], total: 0 }).groups.length === 0, 'задаргаа: хоосон бол бүлэггүй');
  }

  // ── Салбарын ленз «Миний ажил»-ыг шүүхгүй ──
  {
    const LA = F.lensAppliesToView;
    // Хувийн жагсаалт — ленз ямар ч байсан шүүхгүй
    ['camp', 'm-event', 'catering', 'capital'].forEach(l => {
      eq(LA('mine', l), false, `ленз: «Миний ажил» ${l} лензэд шүүгдэхгүй`);
      eq(LA('finance', l), false, `ленз: Санхүү ${l} лензэд энд шүүгдэхгүй (dept_branch-аар тусад нь)`);
    });
    // Удирдлагын жагсаалтууд урьдын адил шүүгдэнэ
    ['all', 'today', 'overdue', 'done', 'delegated'].forEach(v => {
      eq(LA(v, 'camp'), true, `ленз: «${v}» урьдын адил шүүгдэнэ`);
    });
    // 'all' ленз = бүх салбар → хаана ч шүүхгүй
    eq(LA('all', 'all'), false, 'ленз: «Бүгд» ленз юу ч шүүхгүй');
    eq(LA('mine', 'all'), false, 'ленз: «Бүгд» ленз + Миний ажил');

    // Тоймын ХУВИЙН блок лензээс салсан эсэх (эх кодоор)
    const dash = src.slice(src.indexOf('function renderDashboard()'));
    const head = dash.slice(0, dash.indexOf('const myDone'));
    ok(/const myBase = \(state\.tasks \|\| \[\]\)/.test(head),
       'ленз: Тоймын хувийн KPI лензгүй суурьтай');
    ok(head.indexOf('const mineTasks = myBase.filter') > -1,
       'ленз: mineTasks нь лензээр шүүгдээгүй суурьнаас');
    // Компанийн тоо урьдын адил лензээр шүүгдсэн хэвээр
    ok(/const tasks = \(state\.tasks \|\| \[\]\)[\s\S]*branchInLens\(taskBranch\(t\)\)/.test(head),
       'ленз: Тоймын компанийн тоо урьдын адил лензээр шүүгдэнэ');
  }

  // ── ХАМГИЙН ЧУХАЛ ИНВАРИАНТ: Түүхийн «Нийт орлого» = Захиалгын жагсаалтын «борлуулалт» ──
  {
    const orders = [
      { id: '1', number: 1, customer: 'А', status: 'returned', starts_at: '2026-05-01',
        total_mnt: 1000000, deposit_mnt: 200000, paid_mnt: 1000000, items: [{ name: 'x', qty: 1, price: 800000 }] },
      { id: '2', number: 2, customer: 'Б', status: 'rented', source: 'booqable', starts_at: '2026-05-02',
        total_mnt: 500000, deposit_mnt: 3000000, paid_mnt: 500000, items: [{ name: 'y', qty: 1, price: 500000 }] },
      { id: '3', number: 3, customer: 'В', status: 'deleted', starts_at: '2026-05-03',
        total_mnt: 9000000, deposit_mnt: 0, paid_mnt: 0, items: [{ name: 'z', qty: 1, price: 9000000 }] },
      { id: '4', number: 4, customer: 'Г', status: 'draft', starts_at: '2026-05-04',
        total_mnt: 7000000, deposit_mnt: 0, paid_mnt: 0, items: [{ name: 'w', qty: 1, price: 7000000 }] },
    ];
    // Жагсаалтын дүрэм
    const listSum = orders.filter(o => !['draft', 'canceled', 'deleted'].includes(o.status))
      .reduce((s2, o) => s2 + F.orderRevenue(o, 'accrual'), 0);
    const comp = F._histCompute(orders, null, () => 'Бусад');
    ok(listSum === 800000 + 500000, 'инвариант: жагсаалтын дүрэм (барьцаа хасах, booqable-д хасахгүй)');
    ok(comp.summary.net_revenue_mnt === listSum, 'ИНВАРИАНТ: түүхийн нийт орлого = жагсаалтын борлуулалт');
    ok(comp.summary.real_orders === 2, 'инвариант: устгасан/ноорог тоологдохгүй');
    ok(!comp.customers.some(c => c.customer === 'В'), 'инвариант: устгасан захиалга харилцагчид ч орохгүй');
    ok(comp.customers.find(c => c.customer === 'Б').revenue_mnt === 500000,
       'инвариант: Booqable харилцагчийн орлогоос барьцаа хасагдахгүй');
    const may = comp.monthly.find(m => m.month === '2026-05');
    ok(may && may.net_mnt === listSum, 'инвариант: сарын график ч ижил дүнтэй');
  }

  // ── Түүхийн дата татах select-д ХЭРЭГТЭЙ бүх талбар байх ёстой ──
  // (2026-09-02: note дутсанаас ⟦DLV⟧ хүргэлтийн 6.8сая₮ тайланд огт харагдахгүй байв —
  //  талбар мартагдахад алдаа гардаггүй, зүгээр л тоо чимээгүй алга болдог.)
  {
    const m = src.match(/rest\/v1\/app_orders\?select=([^&]+)&status=not\.in\.\(draft,canceled,deleted\)/);
    ok(!!m, 'түүх: захиалга татах хүсэлт олдов');
    const need = ['id', 'number', 'customer', 'status', 'source', 'starts_at', 'stops_at',
      'total_mnt', 'paid_mnt', 'deposit_mnt', 'note', 'items'];
    need.forEach(f => ok(m && m[1].split(',').includes(f), `түүх: select-д «${f}» талбар байна`));
  }

  // ── «Хадгаллаа» гэж ХУДАЛ хэлэхгүй — 4 бичилт алдаагаа харуулна ──
  {
    const st = vm.runInContext('state', sandbox);
    const savedFetch = sandbox.fetch;
    // showToast-ыг барьж авна (эх функцийг нь буцааж тавина)
    const toasts = [];
    const realToast = vm.runInContext('showToast', sandbox);
    vm.runInContext('showToast = function(m, k){ globalThis.__toasts.push([m, k]); };', sandbox);
    sandbox.__toasts = toasts;

    // (1) Дуут заавар
    const SV = vm.runInContext('saveTaskVoice', sandbox);
    const savedVoice = { v: st._taskVoice, d: st._taskVoiceDur, dirty: st._taskVoiceDirty };
    st._taskVoice = 'data:audio/webm;base64,AAAA'; st._taskVoiceDur = 5; st._taskVoiceDirty = true;

    sandbox.fetch = () => Promise.resolve({ ok: true, status: 201 });
    toasts.length = 0;
    ok(await SV('t1', true), 'дуут заавар: амжилттай үед true');
    eq(toasts.length, 0, 'дуут заавар: амжилттай үед анхааруулга гарахгүй');

    sandbox.fetch = () => Promise.resolve({ ok: false, status: 500 });
    toasts.length = 0;
    ok(!(await SV('t1', true)), 'дуут заавар: HTTP алдаанд false');
    eq(toasts.length, 1, 'дуут заавар: алдааг ХЭЛНЭ');
    ok(/ХАДГАЛАГДСАНГҮЙ/.test(toasts[0][0]), 'дуут заавар: мессеж хадгалагдаагүйг тодорхой хэлнэ');
    eq(toasts[0][1], 'error', 'дуут заавар: алдааны төрлөөр гарна');

    sandbox.fetch = () => Promise.reject(new Error('offline'));
    toasts.length = 0;
    ok(!(await SV('t1', true)), 'дуут заавар: сүлжээ тасрахад false');
    eq(toasts.length, 1, 'дуут заавар: сүлжээ тасрахад ч хэлнэ');

    st._taskVoice = savedVoice.v; st._taskVoiceDur = savedVoice.d; st._taskVoiceDirty = savedVoice.dirty;

    // (2) Банкны PDF баримт
    const UR = vm.runInContext('uploadReceiptFileOrWarn', sandbox);
    sandbox.fetch = () => Promise.resolve({ ok: false, status: 500 });
    toasts.length = 0;
    ok(!(await UR('rid-1', null, {}, '#77')), 'PDF баримт: файлгүй/алдаатай үед false');
    eq(toasts.length, 1, 'PDF баримт: хадгалагдаагүйг ХЭЛНЭ');
    ok(/ХАДГАЛАГДСАНГҮЙ/.test(toasts[0][0]) && /#77/.test(toasts[0][0]),
       'PDF баримт: мессежид аль баримт болох нь бий');

    sandbox.__realToast = realToast;
    vm.runInContext('showToast = globalThis.__realToast;', sandbox);
    ok(typeof vm.runInContext('showToast', sandbox) === 'function', 'тест: showToast буцаан сэргэв');
    sandbox.fetch = savedFetch;

    // (3)+(4) Профайл (цалингийн данс) ба иргэний үнэмлэх — эх кодоор
    const prof = src.slice(src.indexOf('let _profileOk = true, _docOk = true;'));
    const blk = prof.slice(0, prof.indexOf("showToast('Профайл хадгалагдсан'"));
    ok(/if \(!rp\.ok\) throw/.test(blk), 'цалингийн данс: r.ok шалгагдана');
    ok(blk.indexOf('setEmployeeDoc(oldPhoneD, _doc).catch(() => {})') === -1,
       'иргэний үнэмлэх: чимээгүй catch арилсан');
    ok(/if \(_docOk\) state\._pendingDoc = null;/.test(blk),
       'иргэний үнэмлэх: амжилтгүй бол файл ДАХИН оролдоход үлдэнэ');
    ok(/if \(!_profileOk\) \{ showToast\(/.test(blk) && /if \(!_docOk\) \{ showToast\(/.test(blk),
       'профайл: аль аль нь унавал анхааруулна');
    ok(/if \(!_profileOk\) \{[^}]*return; \}/.test(blk),
       'профайл: унавал модал хаагдахгүй (дахин оролдох боломж)');
    // Бүртгэлийн үеийн үнэмлэх
    ok(src.indexOf("fileToDoc(_idf.files[0]).then(doc => doc && setEmployeeDoc(phone, doc)).catch(() => {})") === -1,
       'бүртгэл: иргэний үнэмлэхийн чимээгүй catch арилсан');
  }

  // ── «Хуваарилсан ажил» badge — CEO биш хүнд ч зөв тоолно ──
  {
    const D = F.delegatedOpenCount;
    const ME = '99112233';
    const tasks = [
      { id: '1', createdBy: ME, assignee: '88001122', status: 'open' },              // ✓ үүргэсэн
      { id: '2', createdBy: ME, assignee: '88003344', status: 'in_progress' },       // ✓ үүргэсэн
      { id: '3', createdBy: ME, assignee: ME,        status: 'open' },               // ✗ өөрийн ажил
      { id: '4', createdBy: ME, assignee: '88001122', status: 'done' },              // ✗ дууссан
      { id: '5', createdBy: ME, assignee: '88001122', status: 'deleted' },           // ✗ устгасан
      { id: '6', createdBy: '77000000', assignee: '88001122', status: 'open' },      // ✗ өөр хүн үүргэсэн
    ];
    eq(D(tasks, ME), 2, 'badge: үүргэсэн идэвхтэй ажлыг тоолно (CEO биш хүнд ч)');
    eq(D(tasks, '88001122'), 0, 'badge: гүйцэтгэгчид үүргэсэн ажил байхгүй');
    eq(D(tasks, ''), 0, 'badge: нэвтрээгүй бол 0');
    eq(D(null, ME), 0, 'badge: жагсаалт байхгүй бол 0');
    // хамтран гүйцэтгэгчээр орсон бол «үүргэсэн» биш (жагсаалттай ижил дүрэм)
    eq(D([{ id: '7', createdBy: ME, assignee: '88001122', co_assignees: ME, status: 'open' }], ME), 0,
       'badge: өөрөө хамтран гүйцэтгэгч бол үүргэсэнд тооцогдохгүй');
  }

  // ── NOMAAD дата: эрх нь ХАРУУЛАХАД, ТАТАХАД БИШ ──
  {
    // loadNomaadOrders нь nomaad ДЭЛГЭЦИЙН эрхээр дата татахаа зогсоодог байв. Дата нь
    // авлага / тайлан / НӨАТ / COO цалин / катерингийг тэжээдэг тул m-event салбарын
    // нягтлан кемпийн орлогыг 0 гэж хараад компани ХУДАЛ алдагдалтай харагддаг байв.
    const body = src.slice(src.indexOf('async function loadNomaadOrders()'));
    const head = body.slice(0, body.indexOf('const url'));
    ok(head.indexOf('!canSeeNomaadOrders()') === -1,
       'NOMAAD дата: татах нь зөвхөн nomaad дэлгэцийн эрхээр хаагдахгүй');
    ok(head.indexOf('canUseNomaadData()') > -1,
       'NOMAAD дата: хэрэглэгч дэлгэцүүдийн нэгдсэн эрхээр шалгана');
    // Гэхдээ БҮРЭН хаалтгүй болгосонгүй — эрхгүй хүн лүү PII татахгүй
    ok(/if\s*\(!canUseNomaadData\(\)\)\s*return;/.test(head),
       'NOMAAD дата: эрхгүй хүнд дата ТАТАХГҮЙ хэвээр');
    // ДЭЛГЭЦИЙН эрх хэвээр хүчинтэй
    ok(/state\.view === 'nomaad' && !canSeeNomaadOrders\(\)/.test(src),
       'NOMAAD дэлгэц: харуулах эрх хэвээр шалгагдана');
    // Нэгдэлд орсон дэлгэц бүр бодитоор дата хэрэглэдэг
    const cu = src.slice(src.indexOf('function canUseNomaadData()'));
    ['canSeeNomaadOrders', 'canSeeReceivables', 'canSeeReports', 'canSeeVat', 'canSeeCatering', 'canSeeCooSalary']
      .forEach(f => ok(cu.slice(0, cu.indexOf('}')).indexOf(f) > -1, `NOMAAD дата: нэгдэлд «${f}» багтсан`));
  }

  // ── Эрхийн матрицын нэр sidebar-ын нэртэй таарах ──
  // (Эрх олгож буй хүн «Агуулах» гэсэн чагт аль цэсийг нээж байгааг таах ёсгүй.
  //  Хаалтан доторх тодотгол — «Цалин (сарын)», «Ажилчид (удирдах)» — зөвшөөрөгдөнө:
  //  тэдгээр нь sidebar-ын нэрээр эхэлж, ямар эрх болохыг л тодруулна.)
  {
    const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
    const navLabel = {};
    for (const m of html.matchAll(/data-view="([a-z]+)"[^>]*>([\s\S]*?)<\/div>/g)) {
      const txt = m[2].replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim().replace(/\s*\d*$/, '').trim();
      if (txt && !navLabel[m[1]]) navLabel[m[1]] = txt;
    }
    const menus = vm.runInContext('PERM_MENUS', sandbox);
    ok(menus.length > 10, 'эрх: PERM_MENUS уншигдав');
    menus.forEach(m => {
      const nav = navLabel[m.key];
      if (!nav) return;   // sidebar-т тусдаа цэсгүй (hourly, workload, history) — шалгахгүй
      ok(m.label === nav || m.label.startsWith(nav + ' ('),
         `эрх: «${m.key}» матрицын нэр «${m.label}» нь sidebar-ын «${nav}»-тэй нийцнэ`);
    });
  }

  // ── Захиалгын дэд гарчиг БҮХ захиалгыг сайтынх мэт харуулахгүй ──
  // (orderSourceKey нь site / booqable / app гэсэн 3 эх сурвалж ялгадаг атал дэд гарчиг
  //  «M Event сайтаас ирсэн түрээсийн захиалгууд» гэж бичдэг байв — ажилтны үүсгэсэн ба
  //  Booqable түүхийн захиалгыг сайтынх гэж хэлэх нь эх сурвалжийн шинжилгээг төөрөгдүүлнэ.)
  {
    const block = src.slice(src.indexOf('function renderTitle()'));
    const line = block.slice(block.indexOf('orders:'), block.indexOf('products:'));
    ok(line.indexOf('M Event сайтаас ирсэн түрээсийн захиалгууд') === -1,
       'захиалга: дэд гарчиг бүх захиалгыг «сайтаас ирсэн» гэж хэлэхгүй');
    ok(/booqable/i.test(line) && /ажилтны/i.test(line),
       'захиалга: дэд гарчигт бусад эх сурвалж дурдагдана');
  }

  // ── Sidebar-ын БҮХ цэс дэлгэцийн гарчигтай байх ёстой ──
  // (Гарчиггүй бол renderTitle нь `t || ['', 'Бүгд', 'Бүх']` уналтад орж дэлгэц толгойдоо
  //  «Бүгд / Бүх» гэж бичдэг байв — Данс & Карт, Постер & брэнд, Миний зардал, COO цалин,
  //  Катеринг 5 дэлгэц ингэж «Бүгд» нэртэй байлаа.)
  {
    const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
    const navViews = [...new Set((html.match(/data-view="([a-z]+)"/g) || []).map(s => s.slice(11, -1)))];
    ok(navViews.length > 15, 'гарчиг: sidebar-аас цэсүүд уншигдав');
    const block = src.slice(src.indexOf('function renderTitle()'));
    const titlesSrc = block.slice(0, block.indexOf('let t = titles[state.view]'));
    navViews.forEach(v => ok(new RegExp('(^|[\\s{,])' + v + '\\s*:').test(titlesSrc),
      `гарчиг: «${v}» дэлгэц renderTitle-д гарчигтай`));
  }

  // ── NOMAAD badge = орлого бүртгэгдээгүй ГЭРЭЭ (бүх үнийн санал БИШ) ──
  {
    const st = vm.runInContext('state', sandbox);
    const C = vm.runInContext('nomaadUnbilledContractCount', sandbox);
    const savedPays = st.nomaadPayments;
    st.nomaadPayments = {};
    const future = new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10);
    const rows = [
      { quote_no: 'A', status: 'ГЭРЭЭ',        date_start: future, total_amount: 1000000 },   // ✓ гэрээ, орлогогүй
      { quote_no: 'B', status: 'ШИНЭ',         date_start: future },                          // ✗ зүгээр сонирхсон
      { quote_no: 'C', status: 'ИЛГЭЭСЭН',     date_start: future },                          // ✗ санал илгээсэн
      { quote_no: 'D', status: 'БАТАЛГААЖУУЛАЛТ', date_start: future },                       // ✗ баталгаажуулалт
      { quote_no: 'E', status: 'ГЭРЭЭ', date_start: future, total_amount: 1000000, income_amount: 400000 }, // ✗ орлоготой гэрээ
      { quote_no: 'F', status: 'БОЛЬСОН',      date_start: future },                          // ✗ больсон
    ];
    eq(C(rows), 1, 'NOMAAD badge: зөвхөн орлого бүртгэгдээгүй гэрээ тоологдоно');
    eq(C([]), 0, 'NOMAAD badge: хоосон бол 0');
    eq(C(null), 0, 'NOMAAD badge: жагсаалт байхгүй бол 0');
    // төлбөр зөвхөн логт байсан ч гэрээ badge-ээс гарна
    st.nomaadPayments = { A: [{ total: 250000, pay_date: '2026-09-01' }] };
    eq(C(rows), 0, 'NOMAAD badge: логоор төлсөн гэрээ badge-ээс хасагдана');
    st.nomaadPayments = savedPays;
  }

  // ── orderCanonStatus: badge ↔ жагсаалт нэг эх сурвалжаас ──
  {
    const cs = vm.runInContext('orderCanonStatus', sandbox);
    eq(cs({ status: 'reserved', paid_mnt: 500000 }), 'reserved', 'канон төлөв: төлсөн reserved хэвээр');
    eq(cs({ status: 'reserved', paid_mnt: 0, starts_at: '2099-01-01' }), 'draft', 'канон төлөв: төлбөргүй reserved = Ноорог');
    eq(cs({ status: 'preparation', paid_mnt: 100 }), 'prepared', 'канон төлөв: legacy статус нормчилогдоно');
    eq(cs({ status: 'draft', paid_mnt: 0, stops_at: '2020-01-01' }), 'deleted', 'канон төлөв: хугацаа хэтэрсэн төлбөргүй ноорог = устгасан');
  }

  // ── last7Days: local огноогоор, UTC гулсалтгүй ──
  {
    const l7 = F.last7Days('2026-09-02');
    eq(l7.length, 7, '7 хоног: 7 өдөр');
    eq(l7.map(x => x.ds), ['2026-08-27', '2026-08-28', '2026-08-29', '2026-08-30', '2026-08-31', '2026-09-01', '2026-09-02'],
       '7 хоног: өнөөдрөөр төгсөж 7 хоногийг тоолно');
    eq(l7[6].isToday, true, '7 хоног: сүүлийн багана = өнөөдөр');
    ok(!l7.slice(0, 6).some(x => x.isToday), '7 хоног: зөвхөн нэг «өнөөдөр»');
    eq(l7.map(x => x.day), ['Пү', 'Ба', 'Бя', 'Ня', 'Да', 'Мя', 'Лх'], '7 хоног: гаригийн нэр огноондоо таарна');
    // сар/жилийн зааг дамжина
    eq(F.last7Days('2027-01-02').map(x => x.ds)[0], '2026-12-27', '7 хоног: жилийн зааг дамжина');
    // огноогүй дуудвал өнөөдрөөр
    eq(F.last7Days()[6].ds, F.todayStr(), '7 хоног: аргументгүй бол өнөөдөр');
  }

  // ── nomaadExpiredLead: төлбөрийг nomaadPaid()-ээр шалгана ──
  // (Хугацаа хэтэрсэн ТӨЛСӨН захиалга "автомат больсон" болж жагсаалт/календарь/badge-аас
  //  алга болдог байв — running total (income_amount) хадгалагдалгүй, төлбөр зөвхөн логт байхад.)
  {
    const st = vm.runInContext('state', sandbox);
    const expired = vm.runInContext('nomaadExpiredLead', sandbox);
    const cancelled = vm.runInContext('nomaadIsCancelled', sandbox);
    const savedPays = st.nomaadPayments;
    const past = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);
    const future = new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10);

    st.nomaadPayments = { Q1: [{ total: 900000, pay_date: past }] };
    const paidViaLog = { quote_no: 'Q1', status: 'ИЛГЭЭСЭН', date_start: past, income_amount: 0, income_advance: 0 };
    ok(!expired(paidViaLog), 'NOMAAD үхсэн санал: логоор төлсөн захиалга больсон болохгүй');
    ok(!cancelled(paidViaLog), 'NOMAAD: логоор төлсөн захиалга жагсаалтаас алга болохгүй');

    const paidViaField = { quote_no: 'Q2', status: 'ИЛГЭЭСЭН', date_start: past, income_amount: 500000 };
    ok(!expired(paidViaField), 'NOMAAD үхсэн санал: income_amount-тай нь мөн больсон болохгүй');

    const unpaidPast = { quote_no: 'Q3', status: 'ИЛГЭЭСЭН', date_start: past, income_amount: 0, income_advance: 0 };
    ok(expired(unpaidPast), 'NOMAAD үхсэн санал: хугацаа хэтэрсэн, төлбөргүй = больсон');

    const unpaidFuture = { quote_no: 'Q4', status: 'ИЛГЭЭСЭН', date_start: future, income_amount: 0 };
    ok(!expired(unpaidFuture), 'NOMAAD үхсэн санал: ирээдүйн огноо больсон биш');

    st.nomaadPayments = savedPays;
  }

  // ── Авлага: канон төлөвөөр шүүнэ (түүхий o.status БИШ) ──
  {
    const st = vm.runInContext('state', sandbox);
    const RD = vm.runInContext('receivablesData', sandbox);
    const saved = { ao: st.appOrders, no: st.nomaadOrders };
    st.nomaadOrders = [];
    const bal = (rows) => { st.appOrders = rows; return RD().items.filter(i => i.branch === 'bq'); };

    // (1) Төлбөргүй reserved = харагдацаар «Ноорог» → авлага БИШ (өмнө бүтэн дүнгээр ордог байв)
    eq(bal([{ id: '1', number: 1, status: 'reserved', total_mnt: 900000, paid_mnt: 0, starts_at: '2099-01-01' }]).length, 0,
       'авлага: төлбөргүй reserved (=Ноорог) авлагад ОРОХГҮЙ');
    // Төлбөр орсон reserved — үлдэгдэл авлага мөн
    eq(bal([{ id: '2', number: 2, status: 'reserved', total_mnt: 900000, paid_mnt: 300000 }])
        .map(i => i.balance), [600000], 'авлага: хэсэгчлэн төлсөн reserved = үлдэгдэл авлага');

    // (2) Дамжлагын дунд шат — өмнө ОГТ тоологддоггүй байв
    ['preparation', 'cleaning', 'ready', 'prepared', 'delivering', 'installing', 'teardown', 'returning'].forEach(s => {
      eq(bal([{ id: 'x', number: 9, status: s, total_mnt: 500000, paid_mnt: 200000 }]).map(i => i.balance), [300000],
         `авлага: дамжлагын «${s}» шатны үлдэгдэл тоологдоно`);
    });
    // Дууссан шат — урьдын адил тоологдоно
    ['returned', 'stopped', 'rented', 'started'].forEach(s => {
      eq(bal([{ id: 'y', number: 8, status: s, total_mnt: 500000, paid_mnt: 200000 }]).length, 1,
         `авлага: «${s}» урьдын адил тоологдоно`);
    });
    // Хаагдсан/устгасан — авлага БИШ
    ['archived', 'canceled', 'deleted', 'draft'].forEach(s => {
      eq(bal([{ id: 'z', number: 7, status: s, total_mnt: 500000, paid_mnt: 200000 }]).length, 0,
         `авлага: «${s}» авлагад орохгүй`);
    });
    // Танигдахгүй төлөв — чимээгүй нэмэгдэхгүй (bucketOf default 'active' болдгийг тойрсон)
    eq(bal([{ id: 'q', number: 6, status: 'ямар_ч_биш', total_mnt: 500000, paid_mnt: 200000 }]).length, 0,
       'авлага: танигдахгүй төлөв авлагад орохгүй');
    // Бүтэн төлсөн — үлдэгдэлгүй тул мөр үүсэхгүй
    eq(bal([{ id: 'p', number: 5, status: 'rented', total_mnt: 500000, paid_mnt: 500000 }]).length, 0,
       'авлага: бүтэн төлсөн захиалга авлагад орохгүй');

    st.appOrders = saved.ao; st.nomaadOrders = saved.no;
  }

  // ── Алдааны хурууны хээ (fingerprint) — бүлэглэлийн үндэс ──
  {
    const F1 = F.errFingerprint;
    ok(F1('Cannot read x', 'app.js:100') === F1('Cannot read x', 'app.js:100'), 'fp: ижил алдаа ижил хээ');
    ok(F1('Cannot read x', 'app.js:100') !== F1('Cannot read y', 'app.js:100'), 'fp: өөр мессеж → өөр хээ');
    ok(F1('Cannot read x', 'app.js:100') !== F1('Cannot read x', 'app.js:200'), 'fp: өөр байрлал → өөр хээ');
    // Query string нь хувилбар бүрд өөр байдаг тул хээнд ОРОХГҮЙ
    ok(F1('E', 'app.js?v=1') === F1('E', 'app.js?v=2'), 'fp: ?v= хувилбар хээг задлахгүй');
    ok(/^[0-9a-f]{12}$/.test(F1('E', 's')), 'fp: 12 тэмдэгт hex');
    ok(F1(null, null) === F1(undefined, undefined), 'fp: хоосон утга аюулгүй');
    ok(F1('a', 'b') !== F1('b', 'a'), 'fp: талбарууд солигдвол өөр');
    // Урт мессеж таслагдсан ч тогтвортой
    const long = 'x'.repeat(500);
    ok(F1(long, 's') === F1(long + 'ZZZ', 's'), 'fp: 300 тэмдэгтээс хойш ялгаагүй (таслалттай нийцнэ)');
  }

  // ── Алдааны төлөвийн шошго (түүхэн харагдац) ──
  {
    const L = F.errStatusLabel;
    eq(L('fixed').text, 'Зассан', 'errStatusLabel: fixed → Зассан');
    eq(L('fixing').text, 'Засаж байна', 'errStatusLabel: fixing → Засаж байна');
    eq(L('ignored').text, 'Үл хамаарах', 'errStatusLabel: ignored → Үл хамаарах');
    eq(L('new').text, 'Шинэ', 'errStatusLabel: new → Шинэ');
    eq(L(undefined).text, 'Шинэ', 'errStatusLabel: тодорхойгүй → Шинэ (default)');
    eq(L('zzz').text, 'Шинэ', 'errStatusLabel: танихгүй төлөв → Шинэ (default)');
    ok(/^var\(--/.test(L('fixed').color), 'errStatusLabel: өнгө токеноор (хатуу hex биш)');
    ok(L('fixed').icon && L('new').icon, 'errStatusLabel: дүрс тэмдэгтэй');
  }

  // ── Ирц: баталгаатай (менежер уншуулсан) vs өөрөө бүртгүүлсэн өдөр ──
  // Энэ тоо шууд цалин болдог тул буруу тоолвол илүү/дутуу төлбөр гарна.
  {
    const A = F.attAggregateMonth;
    const r = (key, day, source) => ({ member_key: key, day, source, ts: day + 'T01:00:00.000Z' });

    const both = A([r('99', '2026-09-01', 'scan'), r('99', '2026-09-02', 'qr')]).out['99'];
    ok(both.days === 2, 'ирц: 2 өдөр ажилласан');
    ok(both.selfDays === 1, 'ирц: 1 өдөр нь уншуулаагүй');

    // Нэг өдөр хоёуланг нь бүртгүүлсэн бол УНШУУЛСАНД тооцно (баталгаа байгаа).
    const mixed = A([r('7', '2026-09-01', 'qr'), r('7', '2026-09-01', 'scan')]).out['7'];
    ok(mixed.days === 1 && mixed.selfDays === 0, 'ирц: нэг өдөр уншуулсан бол баталгаатай');

    const allScan = A([r('1', '2026-09-01', 'scan'), r('1', '2026-09-02', 'scan')]).out['1'];
    ok(allScan.selfDays === 0, 'ирц: бүгд уншуулсан → сануулга гарахгүй');

    const allSelf = A([r('2', '2026-09-01', 'qr'), r('2', '2026-09-02', 'qr')]).out['2'];
    ok(allSelf.selfDays === 2, 'ирц: бүгд өөрөө → 2 өдөр сануулна');

    // source байхгүй хуучин мөр = баталгаагүйд тооцно (уншуулсан гэж БҮҮ таамагла).
    ok(A([r('3', '2026-09-01', undefined)]).out['3'].selfDays === 1, 'ирц: source байхгүй → баталгаагүй');

    // Давхардсан өдөр нэг л удаа тоологдоно
    ok(A([r('4', '2026-09-01', 'scan'), r('4', '2026-09-01', 'scan')]).out['4'].days === 1, 'ирц: давхар мөр нэг өдөр');

    // Гэмтэлтэй өгөгдөл унагаахгүй
    ok(Object.keys(A([null, {}, { member_key: 'x' }]).out).length === 0, 'ирц: гэмтэлтэй мөр алгасана');
    ok(A(null).out && Object.keys(A(null).out).length === 0, 'ирц: хоосон оролт аюулгүй');

    // Цалингийн мөрд сануулга ҮНЭХЭЭР гарч байгаа эсэх (энэ л захиралд харагдана).
    const st = vm.runInContext('state', sandbox), saved = st.attWorkedDays;
    const who = { name: 'Тест', phone: '99999999', daily_rate: 50000 };
    st.attWorkedDays = { [F.personKey(who)]: { days: 5, selfDays: 2, lastDay: '2026-09-02' } };
    const warned = F.attWorkedLine(who);
    ok(/5 өдөр/.test(warned), 'цалин: ажилласан өдөр гарна');
    ok(/2 өдөр нь уншуулаагүй/.test(warned), 'цалин: баталгаагүй өдрийн сануулга гарна');

    st.attWorkedDays = { [F.personKey(who)]: { days: 5, selfDays: 0, lastDay: '2026-09-02' } };
    ok(!/уншуулаагүй/.test(F.attWorkedLine(who)), 'цалин: бүгд уншуулсан бол сануулга ГАРАХГҮЙ');
    st.attWorkedDays = saved;
  }

// ── БАРААНЫ ХЭСГИЙН ЭРХ (2026-09-04) ────────────────────────────────────────
// Барааны карт 4 хэсэгт хуваагдсан, хэсэг бүр өөрийн эрхтэй. Хоёр зүйл эвдэрч
// БОЛОХГҮЙ: (1) шинэ түлхүүр чимээгүй нээгдэх, (2) эрхгүй хэсгийн утга дарагдах.
{
  const TEAM = vm.runInContext('TEAM', sandbox);
  const st = vm.runInContext('state', sandbox);
  const sv = { team: TEAM.slice(), me: st.me, ceo: st.isCEO, mp: st.memberPerms, rp: st.rolePerms };
  TEAM.length = 0;
  TEAM.push({ name: 'Зөөгч Тест', phone: '80000001', role: 'Зөөгч' });
  st.me = '80000001'; st.isCEO = false;
  st.rolePerms = { 'зөөгч': { 'products.edit': false } };   // шүхэр эрх ИЛ хаагдсан
  st.memberPerms = {};

  // «Зөөгч» роль нь ROLE_PRESETS-ийн аль ч загварт таарахгүй. Тийм хүнд can() нь
  // «тохируулаагүй = зөвшөөрнө» гэж ҮНЭН буцаана — яг энэ нь занга: шинэ түлхүүр
  // дээр can() ашиглавал эрх чимээгүй нээгдэнэ. canProductPart үүнийг хаана.
  ok(F.can('products.stock') === true, 'эрх: can() тохируулаагүй шинэ түлхүүрийг ЗӨВШӨӨРНӨ (занга)');
  ok(F.canProductPart('stock') === false, 'эрх: canProductPart ил олгоогүй бол ХОРИГЛОНО');
  ok(F.canEditAnyProductPart() === false, 'эрх: нэг ч хэсэг нээлттэй биш → карт нээгдэхгүй');

  st.memberPerms = { '80000001': { 'products.stock': true } };   // ЗӨВХӨН нөөц олгов
  ok(F.canProductPart('stock') === true,  'эрх: ил олгосон хэсэг нээгдэнэ');
  ok(F.canProductPart('price') === false, 'эрх: олгоогүй хэсэг хаалттай хэвээр');
  ok(F.canProductPart('cost') === false,  'эрх: өртөг тусдаа — нөөцийн эрхээр нээгдэхгүй');
  ok(F.canEditAnyProductPart() === true,  'эрх: нэг хэсэг нээлттэй бол карт нээгдэнэ');

  st.memberPerms = { '80000001': { 'products.edit': true } };    // ХУУЧИН шүхэр
  ['catalog', 'price', 'cost', 'stock'].forEach(k =>
    ok(F.canProductPart(k) === true, 'эрх: products.edit шүхэр «' + k + '» хэсгийг нээнэ'));

  TEAM.length = 0; sv.team.forEach(x => TEAM.push(x));
  st.me = sv.me; st.isCEO = sv.ceo; st.memberPerms = sv.mp; st.rolePerms = sv.rp;
}

// Эрхгүй хэсгийн утга ХЭЗЭЭ Ч формоос бичигдэхгүй (үнэ 0 / нөөц 0 = мөнгөний алдаа)
{
  const orig = { name: 'Майхан', name_en: 'Tent', category: 'Майхан', all_categories: ['Майхан'],
    description: 'хуучин', photos: ['a'], photo: 'a', source_url: 's', supplier: 's', media_url: '',
    price: 132000, deposit: 50000, setup_fee: 0, type: 'rental', bundle_items: [],
    cost: 1000000, purchase_date: '2024-01-15',
    stock: 106, broken: 2, maintenance: 3, qty_mevent: 86, qty_chimun: 0, qty_nomaad: 20, qty_catering: 0 };
  const form = { ...orig, name: 'ШИНЭ нэр', description: 'шинэ', price: 1, deposit: 0,
    cost: 0, purchase_date: null, stock: 0, broken: 0, maintenance: 0, qty_mevent: 0, qty_nomaad: 0 };

  const onlyStock = F.restrictProductEdit(form, orig, ['stock']);
  eq(onlyStock.price, 132000, 'хязгаар: эрхгүй үнэ эх утгаараа үлдэнэ');
  eq(onlyStock.cost, 1000000, 'хязгаар: эрхгүй өртөг эх утгаараа үлдэнэ');
  eq(onlyStock.purchase_date, '2024-01-15', 'хязгаар: эрхгүй худалдан авсан огноо үлдэнэ');
  eq(onlyStock.name, 'Майхан', 'хязгаар: эрхгүй каталог эх утгаараа үлдэнэ');
  eq(onlyStock.stock, 0, 'хязгаар: эрхтэй нөөц формын утгаар шинэчлэгдэнэ');
  eq(onlyStock.qty_mevent, 0, 'хязгаар: эрхтэй салбарын тоо шинэчлэгдэнэ');

  const all = F.restrictProductEdit(form, orig, ['catalog', 'price', 'cost', 'stock']);
  eq(all.price, 1, 'хязгаар: бүрэн эрхтэй бол үнэ формоор');
  eq(all.name, 'ШИНЭ нэр', 'хязгаар: бүрэн эрхтэй бол нэр формоор');
  eq(F.restrictProductEdit(form, null, []).price, 1, 'хязгаар: шинэ бараа (orig алга) хөндөгдөхгүй');
  eq(F.restrictProductEdit({ ...orig, cost: 0 }, orig, ['catalog']).cost, 1000000,
     'хязгаар: эрхгүй үед өртөг 0 болж ЧИМЭЭГҮЙ дарагдахгүй');
}

// ── ХӨРӨНГИЙН БАГЦ (2026-09-04) ─────────────────────────────────────────────
// Нэг бараа = олон удаагийн худалдан авалт. Дундаж өртөг ЖИГНЭСЭН байх ёстой:
// энгийн дундаж нь 60ш×950,000-г 6ш×1,150,000-тай адил жинтэй болгож 1.19
// тэрбум₮-ийн хөрөнгийн үнэ цэнийг гуйвуулна.
{
  const B = (q, c, d, off) => ({ qty: q, unit_cost: c, purchased_at: d, written_off: off || 0 });
  const list = [B(64, 950000, '2024-01-15', 4), B(40, 1080000, '2025-06-02'), B(6, 1150000, '2026-03-20')];
  const total = 60 * 950000 + 40 * 1080000 + 6 * 1150000;
  const st = F.batchStats(list, '2026-09-04');

  eq(st.qty, 106, 'багц: үлдэгдэл нийлбэр (актлагдсаныг хасна)');
  eq(st.total, total, 'багц: нийт хөрөнгө');
  eq(st.avgCost, Math.round(total / 106), 'багц: ЖИГНЭСЭН дундаж өртөг');
  ok(st.avgCost !== Math.round((950000 + 1080000 + 1150000) / 3), 'багц: энгийн дундаж БИШ (жин харгалзана)');
  eq(st.firstDate, '2024-01-15', 'багц: хамгийн эртний худалдан авалтын огноо');
  eq(st.avgAgeMonths, 23, 'багц: жигнэсэн дундаж нас (сар)');

  eq(F.batchReconcile(list, 106), { sum: 106, stock: 106, diff: 0, ok: true }, 'багц: нөөцтэй тэнцэв');
  eq(F.batchReconcile(list, 100).ok, false, 'багц: зөрүүтэй бол ok=false');
  eq(F.batchReconcile(list, 100).diff, 6, 'багц: 6ш илүү');
  eq(F.batchReconcile([], 0), { sum: 0, stock: 0, diff: 0, ok: true }, 'багц: хоосон жагсаалт');

  // Бүрэн актлагдсан багц хөрөнгөнд ОРОХГҮЙ — эс бөгөөс байхгүй барааг данслана
  const gone = [B(10, 500000, '2024-01-01', 10)];
  eq(F.batchStats(gone, '2026-09-04').qty, 0, 'багц: бүрэн актлагдсан нь тоологдохгүй');
  eq(F.batchStats(gone, '2026-09-04').total, 0, 'багц: актлагдсаны өртөг хөрөнгөөс хасагдана');
  eq(F.batchStats([], '2026-09-04').avgCost, 0, 'багц: багцгүй бол дундаж 0 (тэгд хуваахгүй)');

  eq(F.batchLeft({ qty: 64, written_off: 4 }), 60, 'багц: үлдэгдэл = авсан − актлагдсан');
  eq(F.batchLeft({ qty: 5, written_off: 9 }), 0, 'багц: үлдэгдэл сөрөг болохгүй');
  eq(F._monthsSince('2024-01-15', '2026-09-04'), 31, 'багц: сарын зөрүү');
  eq(F._monthsSince('2026-09-04', '2024-01-15'), 0, 'багц: ирээдүйн огноо → 0');
  eq(F._monthsSince('', '2026-09-04'), 0, 'багц: хоосон огноо → 0');
}

// ── ТООЛЛОГО (2026-09-04) ───────────────────────────────────────────────────
// Няравын ажил = тоолж БҮРТГЭХ, нөөцийг дарж бичих БИШ. Хоёр зүйл эвдэрч
// болохгүй: (1) нэг барааг хоёр удаа тоолоход хоёулаа тоологдох,
// (2) тооллогын эрх нь нөөц засах эрхийг дагаж нээгдэх.
{
  const R = (sku, sys, cnt, at, applied) => ({ sku, system_qty: sys, counted_qty: cnt, counted_at: at, applied: !!applied });

  eq(F.countDiff(R('a', 104, 102, '1')), -2, 'тооллого: зөрүү = тоолсон − системд');
  eq(F.countDiff(R('a', 100, 106, '1')), 6, 'тооллого: илүү гарсан нь эерэг');
  eq(F.countDiff(null), 0, 'тооллого: хоосон мөр 0');

  // Нэг бараа дахин тоологдвол СҮҮЛЧИЙНХ хүчинтэй — эс бөгөөс зөрүү давхарлана
  const twice = [R('a', 104, 90, '2026-09-04T08:00:00Z'), R('a', 104, 102, '2026-09-04T09:30:00Z')];
  const latest = F.countLatestBySku(twice);
  eq(latest.size, 1, 'тооллого: нэг бараа нэг л мөр');
  eq(latest.get('a').counted_qty, 102, 'тооллого: СҮҮЛЧИЙН тоолол хүчинтэй');

  const rows = [
    R('a', 104, 102, '2026-09-04T08:00:00Z'),          // −2, залруулаагүй
    R('b', 67, 67, '2026-09-04T08:10:00Z'),            // тэнцсэн
    R('c', 100, 94, '2026-09-04T08:20:00Z', true),     // −6, залруулсан
    R('d', 10, 13, '2026-09-04T08:30:00Z'),            // +3, залруулаагүй
  ];
  const st = F.countStats(rows, 294);
  eq(st.counted, 4, 'тооллого: тоологдсон бараа');
  eq(st.total, 294, 'тооллого: нийт бараа');
  eq(st.diffs, 3, 'тооллого: зөрүүтэй бараа (тэнцсэн нь ороогүй)');
  eq(st.pending, 2, 'тооллого: залруулаагүй зөрүү (залруулсан нь хасагдана)');
  eq(st.short, 8, 'тооллого: дутсан нийлбэр (2 + 6)');
  eq(st.over, 3, 'тооллого: илүү гарсан нийлбэр');
  eq(F.countStats([], 294), { counted: 0, total: 294, diffs: 0, pending: 0, over: 0, short: 0, rep: 0, wo: 0, dmgItems: 0 }, 'тооллого: хоосон сесс');

  // ── Тооллого = БАГИЙН ажил (2026-09-04 засвар) ──────────────────────────
  // Регресс: `loadStockCounts` нь `session_id=eq.<өдөр|би>`-ээр татдаг байсан тул
  // хүн бүр ЗӨВХӨН ӨӨРИЙНХӨӨ тоолсныг хардаг байв. Хоёр нярав нэг агуулах тоолоход
  // бие биенийхээ ажлыг харахгүй → нэг барааг давхар тоолж, «тоологдоогүй» гэж
  // бүхэл өдрийн ажил дахин хийгддэг. Мөн «хэн тоолсон» хаана ч харагдахгүй байв.
  // ── Сесс = КАМПАНИТ АЖИЛ, өдөр ч хүн ч БИШ (2026-09-04) ──────────────────
  // 294 бараа нэг өдөрт тоологдохгүй. Сесс өдрөөр солигдвол маргааш нээхэд
  // өчигдрийн ажил алга болж прогресс тэглэгдэнэ; хүнээр салгавал хоёр нярав
  // бие биенийхээ ажлыг харахгүй давхар тоолно.
  eq(F.scQuarterOf('2026-01-15'), '2026-Q1', 'улирал: 1-р сар → Q1');
  eq(F.scQuarterOf('2026-03-31'), '2026-Q1', 'улирал: 3-р сар → Q1');
  eq(F.scQuarterOf('2026-04-01'), '2026-Q2', 'улирал: 4-р сар → Q2');
  eq(F.scQuarterOf('2026-09-04'), '2026-Q3', 'улирал: 9-р сар → Q3');
  eq(F.scQuarterOf('2026-12-31'), '2026-Q4', 'улирал: 12-р сар → Q4');
  eq(F.scQuarterOf('муу'), '', 'улирал: буруу огноо → хоосон');
  eq(F.scSessionLabel('2026-Q3'), '2026 оны III улирал', 'улирал: хүнд уншигдах нэр');
  eq(F.scSessionLabel('2026-Q3-2'), '2026 оны III улирал (2)', 'улирал: давтсан тооллого дугаартай');
  eq(F.scSessionLabel('2026-09-04|880'), '2026-09-04|880', 'улирал: хуучин түлхүүр хэвээр');

  eq(F.scNewSessionId('2026-09-04', []), '2026-Q3', 'сесс: анхны дугаар');
  eq(F.scNewSessionId('2026-09-04', ['2026-Q3']), '2026-Q3-2', 'сесс: нэг улиралд 2 дахь тооллого');
  eq(F.scNewSessionId('2026-09-04', ['2026-Q3', '2026-Q3-2']), '2026-Q3-3', 'сесс: 3 дахь');
  eq(F.scNewSessionId('2026-09-04', ['2026-Q2']), '2026-Q3', 'сесс: өөр улирал саад болохгүй');

  eq(F.scNormalizeConfig(null), { active: null, history: [] }, 'тохиргоо: хоосон → жигдэрнэ');
  eq(F.scNormalizeConfig({ active: {} }).active, null, 'тохиргоо: id-гүй active хүчингүй');
  eq(F.scNormalizeConfig({ history: 'муу' }).history, [], 'тохиргоо: буруу түүх → хоосон массив');
  eq(F.scAllSessionIds({ active: { id: 'a' }, history: [{ id: 'b' }, { id: 'c' }] }), ['a', 'b', 'c'], 'тохиргоо: бүх сессийн дугаар');
  eq(F.scAllSessionIds(null), [], 'тохиргоо: хоосон → дугаар алга');

  // Хэн тоолсон — counted_by нь эх сурвалж, дутвал сессийн түлхүүрээс сэргээнэ
  eq(F.countRowPerson({ counted_by: '99112233', session_id: '2026-09-04|88006790' }), '99112233', 'тооллого: counted_by эрхэм');
  eq(F.countRowPerson({ counted_by: '', session_id: '2026-09-04|88006790' }), '88006790', 'тооллого: counted_by дутвал ХУУЧИН түлхүүрээс');
  eq(F.countRowPerson({ counted_by: '', session_id: '2026-Q3' }), '', 'тооллого: шинэ сесст хүн байхгүй');
  eq(F.countRowPerson({ counted_by: '   ', session_id: '2026-09-04|88006790' }), '88006790', 'тооллого: хоосон зайг тооцохгүй');
  eq(F.countRowPerson(null), '', 'тооллого: хоосон мөр унахгүй');

  // Хоёр хүний бичилт НЭГ жагсаалтад нийлж, сүүлчийнх хүчинтэй байх ёстой
  const team = [
    { sku: 'a', system_qty: 10, counted_qty: 10, counted_at: '2026-09-04T08:00:00Z', counted_by: '88006790', session_id: '2026-09-04|88006790' },
    { sku: 'b', system_qty: 5,  counted_qty: 4,  counted_at: '2026-09-04T08:05:00Z', counted_by: '99112233', session_id: '2026-09-04|99112233' },
    { sku: 'a', system_qty: 10, counted_qty: 9,  counted_at: '2026-09-04T09:00:00Z', counted_by: '99112233', session_id: '2026-09-04|99112233' },
  ];
  eq(F.countStats(team, 294).counted, 2, 'тооллого: 2 хүний бичилт нэг жагсаалт (a давхарлахгүй)');
  eq(F.countLatestBySku(team).get('a').counted_by, '99112233', 'тооллого: өөр хүний СҮҮЛЧИЙН тоолол хүчинтэй');
  eq([...new Set(team.map(F.countRowPerson))], ['88006790', '99112233'], 'тооллого: оролцсон хүмүүс');

  // ── Скан хийхээс өмнө: БҮХ бараа жагсаалтад, төлвөөр ялгарна (2026-09-04) ──
  // Бар код хараахан наагаагүй тул нярав хайж бичихийн оронд жагсаалтаас сонгоно.
  // «Тоолоогүй» аль нь болохыг апп хэлэхгүй бол ажлыг цаасан дээр тэмдэглэнэ.
  const prods = [
    { sku: 'a', name: 'Майхан', code: 'M-1', stock: 10 },
    { sku: 'b', name: 'Ширээ',  code: 'M-2', stock: 5 },
    { sku: 'c', name: 'Сандал', code: 'M-3', stock: 7 },
  ];
  const cRows = [
    { sku: 'a', system_qty: 10, counted_qty: 10, counted_at: '2026-09-04T08:00:00Z', counted_by: '88006790' },
    { sku: 'b', system_qty: 5,  counted_qty: 3,  counted_at: '2026-09-04T08:05:00Z', counted_by: '99112233' },
  ];
  const mg = F.countMergeProducts(prods, cRows);
  eq(mg.length, 3, 'тооллого: тоолоогүй бараа ч жагсаалтад үлдэнэ');
  eq(mg.map(x => x.st), ['ok', 'diff', 'todo'], 'тооллого: төлөв = тэнцсэн / зөрүүтэй / тоолоогүй');
  eq(mg[2].row, null, 'тооллого: тоолоогүй барааны мөр хоосон');
  eq(F.countRowState(null), 'todo', 'тооллого: мөргүй = тоолоогүй');
  eq(F.countRowState({ system_qty: 4, counted_qty: 4 }), 'ok', 'тооллого: тэнцсэн');
  eq(F.countRowState({ system_qty: 4, counted_qty: 1 }), 'diff', 'тооллого: зөрүүтэй');

  eq(F.countFilterList(mg, 'all', '').length, 3, 'шүүлт: Бүгд = 3');
  eq(F.countFilterList(mg, 'todo', '').map(x => x.p.sku), ['c'], 'шүүлт: Тоолоогүй');
  eq(F.countFilterList(mg, 'done', '').map(x => x.p.sku), ['a', 'b'], 'шүүлт: Тоолсон (зөрүүтэй нь ч тоологдсон)');
  eq(F.countFilterList(mg, 'diff', '').map(x => x.p.sku), ['b'], 'шүүлт: Зөрүүтэй');
  eq(F.countFilterList(mg, 'all', 'сандал').map(x => x.p.sku), ['c'], 'шүүлт: нэрээр хайх');
  eq(F.countFilterList(mg, 'all', 'M-2').map(x => x.p.sku), ['b'], 'шүүлт: кодоор хайх');
  eq(F.countFilterList(mg, 'todo', 'майхан').length, 0, 'шүүлт: шүүлт + хайлт хамт үйлчилнэ');
  eq(F.countFilterList(null, 'all', '').length, 0, 'шүүлт: хоосон оролт унахгүй');
}

// SCAN — тооллого өдрөөрөө татагдана, нэг хүнээр БИШ (2026-09-04)
// `session_id=eq.` руу буцвал бусдын тоолол дахин алга болно. Прозоор бичсэн
// дүрэм мартагддаг тул эх кодыг шалгана.
{
  const src = fs.readFileSync(path.join(__dirname, '..', 'app.js'), 'utf8');
  const fn = src.slice(src.indexOf('async function loadStockCounts('));
  const body = fn.slice(0, fn.indexOf('\n}'));
  ok(/session_id=eq\.\$\{encodeURIComponent\(sessionId\)\}/.test(body),
     'scan: loadStockCounts кампанит сессээр татна');
  ok(!/state\.me|counted_by=|'\|'|"\|"/.test(body),
     'scan: шүүлтэд ХҮН орохгүй (бүх хүний бичилт нэг дор)');
  // Сесс нь тохиргооноос ирнэ — өдрөөр дахин үүсгэвэл прогресс өдөр бүр тэглэгдэнэ
  const boot = src.slice(src.indexOf("if (v === 'stockcount'"));
  ok(!/state\.me|todayStr\(\)/.test(boot.slice(0, 700)),
     'scan: тооллогын сесс өдөр/хүнээр үүсэхгүй (тохиргооноос ирнэ)');
}

// Тооллогын эрх нь нөөц засах эрхээс ТУСДАА — нярав тоолно, нөөц дарж бичихгүй
{
  const TEAM = vm.runInContext('TEAM', sandbox);
  const st = vm.runInContext('state', sandbox);
  const sv = { team: TEAM.slice(), me: st.me, ceo: st.isCEO, mp: st.memberPerms, rp: st.rolePerms };
  TEAM.length = 0;
  TEAM.push({ name: 'Нярав Тест', phone: '80000002', role: 'Зөөгч' });
  st.me = '80000002'; st.isCEO = false;
  st.rolePerms = { 'зөөгч': { 'products.edit': false } };

  st.memberPerms = {};
  ok(F.canCountStock() === false, 'тооллого: ил олгоогүй бол ХОРИГЛОНО');

  st.memberPerms = { '80000002': { 'products.count': true } };   // ЗӨВХӨН тоолох
  ok(F.canCountStock() === true, 'тооллого: ил олгосон бол тоолж чадна');
  ok(F.canProductPart('stock') === false, 'тооллого: тоолох эрх нь НӨӨЦ засах эрхийг нээхгүй');
  ok(F.canProductPart('cost') === false, 'тооллого: тоолох эрх нь өртөг засах эрхийг нээхгүй');

  st.memberPerms = { '80000002': { 'products.stock': true } };   // нөөц засагч
  ok(F.canCountStock() === false, 'тооллого: нөөц засах эрх нь тоолох эрхийг нээхгүй (тусдаа ажил)');

  TEAM.length = 0; sv.team.forEach(x => TEAM.push(x));
  st.me = sv.me; st.isCEO = sv.ceo; st.memberPerms = sv.mp; st.rolePerms = sv.rp;
}

// ── НӨАТ ЗАДАРГАА (2026-09-04) ──────────────────────────────────────────────
// Тайлангийн мөр дарахад ТУХАЙН мөрийг бүрдүүлж буй баримтууд гарна. Шүүлт
// буруу бол CEO өөр захиалгын баримтыг хараад буруу шийдвэр гаргана.
{
  const r = (id, ord, dt, total, vat, name, reg) =>
    ({ id, matched_id: ord, dt, total, vat, buyer_name: name, buyer_reg: reg, matched_label: ord ? 'Захиалга ' + ord : '' });
  const R = [
    r('a', '1486', '2026-06-03', 45690000, 4569000, 'Netcapital', '2090007'),
    r('b', '1486', '2026-06-05', 13200000, 1320000, 'Netcapital', '2090007'),
    r('c', '1309', '2026-07-11', 337000, 33700, 'Б.Пүрэвдулам', ''),
    r('d', null,   '2026-06-03', 49500, 4500, 'Энэрэл-Эрдэм', '5011922'),
  ];
  const buyers = [{ name: 'Netcapital', reg: '2090007' }, { name: 'Энэрэл-Эрдэм', reg: '5011922' }];

  eq(F.vatReceiptsFor('ord:1486', R, buyers).map(x => x.id), ['a', 'b'], 'НӨАТ: захиалгын баримтууд');
  eq(F.vatReceiptsFor('ord:1309', R, buyers).map(x => x.id), ['c'], 'НӨАТ: өөр захиалгынх холилдохгүй');
  eq(F.vatReceiptsFor('ord:9999', R, buyers), [], 'НӨАТ: байхгүй захиалга → хоосон');
  eq(F.vatReceiptsFor('unmatched', R, buyers).map(x => x.id), ['d'], 'НӨАТ: тулгаагүй баримт');
  eq(F.vatReceiptsFor('matched', R, buyers).map(x => x.id), ['a', 'b', 'c'], 'НӨАТ: тулгасан баримт');
  eq(F.vatReceiptsFor('all', R, buyers).length, 4, 'НӨАТ: бүх баримт');
  eq(F.vatReceiptsFor('month:2026-06', R, buyers).map(x => x.id), ['a', 'b', 'd'], 'НӨАТ: сараар шүүнэ');
  eq(F.vatReceiptsFor('buyer:0', R, buyers).map(x => x.id), ['a', 'b'], 'НӨАТ: худалдан авагчаар');
  eq(F.vatReceiptsFor('buyer:1', R, buyers).map(x => x.id), ['d'], 'НӨАТ: өөр худалдан авагч');
  eq(F.vatReceiptsFor('buyer:9', R, buyers), [], 'НӨАТ: байхгүй худалдан авагч → хоосон');
  eq(F.vatReceiptsFor('', R, buyers), [], 'НӨАТ: танихгүй түлхүүр → хоосон (санамсаргүй бүгдийг харуулахгүй)');

  // Нэр ижил ч РД өөр байгууллага ХОЛИЛДОХГҮЙ
  const dup = [r('x', null, '2026-06-01', 100, 10, 'Toki', '111'), r('y', null, '2026-06-02', 200, 20, 'Toki', '222')];
  eq(F.vatReceiptsFor('buyer:0', dup, [{ name: 'Toki', reg: '222' }]).map(x => x.id), ['y'], 'НӨАТ: нэр ижил ч РД өөр бол ялгана');
}

// ── СИСТЕМ ШАЛГАЛТ — аль workflow «апп эвдэрсэн» гэсэн үг вэ (2026-09-04) ────
// Бодит алдаа: CEO-д «Апп 🔴» гарч атлаа алдааны жагсаалт хоосон байв. Шалтгаан нь
// үзүүлэлт main дээрх СҮҮЛИЙН ямар ч ажиллагааг уншдаг байсан — дата унших (гараар),
// алдааны шүүлт (цагаар) унасан ч апп улаан болно. Тэдгээр аппын эрүүл мэнд БИШ.
{
  const run = (p, c) => ({ path: '.github/workflows/' + p, conclusion: c, name: p });
  const runs = [run('data-query.yml', 'failure'), run('lint.yml', 'success')];

  eq(F._ciPickRun(runs, ['lint.yml']).path, '.github/workflows/lint.yml',
    'CI: дата унших унасан ч апп улаан болохгүй (хамаарахгүй workflow алгасна)');
  eq(F._ciPickRun([run('error-triage.yml', 'failure')], ['lint.yml']), null,
    'CI: зөвхөн хамаарахгүй ажиллагаа байвал «мэдээлэлгүй» (null) — худал улаан гаргахгүй');
  eq(F._ciPickRun([run('lint.yml', 'failure'), run('data-query.yml', 'success')], ['lint.yml']).conclusion,
    'failure', 'CI: кэшийн хувилбар унавал апп улаан (шинэ код утсанд хүрэхгүй)');
  eq(F._ciPickRun(runs, null).path, '.github/workflows/data-query.yml', 'CI: шүүлтгүй бол эхнийхийг авна (сайтын smoke)');
  eq(F._ciPickRun([], ['lint.yml']), null, 'CI: ажиллагаа алга → null');
  eq(F._ciPickRun(null, ['lint.yml']), null, 'CI: буруу оролт → null (унахгүй)');
}

// ── ХУУЛГЫН ИМПОРТ — «зардал дутуу орно» (2026-09-06) ──────────────────────
// Хэрэглэгчийн мэдээлсэн алдаа: дансны хуулга оруулахад зарим гүйлгээ (M-Event
// ажилтнуудын цалин) Зарлага хэсэгт огт орж ирэхгүй / буруу салбарт ордог.
// Гурван бодит шалтгаан — гурвуулаа энд түгжигдэв.
{
  // ① ДАВХЦАЛЫН ХЭЭ (fp) нь ижил өдөр + ижил дүнтэй хоёр гүйлгээнд ДАВХЦДАГ.
  //    Хуулгын «Харьцсан данс» багана хоосон байвал хээ нь утгаас бүрдэх тул
  //    хоёр ажилтанд ижил цалин шилжүүлбэл яг ижил хээтэй болно.
  const a = { date: '2026-08-05', memo: '8 сарын цалин', account: '', debit: 1200000 };
  const b = { date: '2026-08-05', memo: '8 сарын цалин', account: '', debit: 1200000 };
  ok(F.expenseFp(a) === F.expenseFp(b), 'хуулга: данс хоосон үед 2 мөрийн хээ давхцана (баримт)');
  // Set-ээр шалгавал 2 дахь мөр «орсон» гэж хаягдана. Тоогоор шалгах нь зөв:
  ok(F.fpAlreadyImported(1, 1) === true, 'хуулга: 1 бүртгэлтэй хээний 1 дэх мөр = орсон');
  ok(F.fpAlreadyImported(2, 1) === false, 'хуулга: 1 бүртгэлтэй хээний 2 дахь мөр = ШИНЭ (алгасахгүй)');
  ok(F.fpAlreadyImported(2, 2) === true, 'хуулга: 2 бүртгэлтэй хээний 2 дахь мөр = орсон (давхардуулахгүй)');
  ok(F.fpAlreadyImported(1, 0) === false, 'хуулга: бүртгэлгүй хээ = шинэ');
  ok(F.fpAlreadyImported(undefined, undefined) === false, 'хуулга: утга дутуу → шинэ (чимээгүй алгасахгүй)');

  // ② ОГНООГҮЙ МӨР чимээгүй хаягдахгүй — skipped-д шалтгаантай бүртгэгдэнэ.
  const m = [
    ['Гүйлгээний огноо', 'Гүйлгээний утга', 'Харьцсан дансны нэр', 'Харьцсан данс', 'Ханш', 'Орлого', 'Зарлага'],
    ['2026-08-05', '8 сарын цалин', 'А', '5001', '', 0, 1200000],
    ['05/08/26', 'Бензин', 'Б', '5002', '', 0, 50000],          // огноо танигдахгүй хэлбэр
    ['', 'Нийт дүн', '', '', '', 0, 1250000],                    // footer — чимээгүй алгасна
  ];
  const p = F.parseStatement(m);
  eq(p.rows.length, 1, 'хуулга: огноотой мөр л зардал болно');
  eq(p.skipped.length, 1, 'хуулга: огноо уншигдаагүй ЗАРДЛЫН мөр бүртгэгдэнэ');
  eq(p.skipped[0].memo, 'Бензин', 'хуулга: хаягдсан мөрийн утга хадгалагдана');
  ok(/огноо/.test(p.skipped[0].why), 'хуулга: хаягдсан мөрийн шалтгаан бий');
  ok(!p.skipped.some(x => /Нийт/.test(x.memo)), 'хуулга: footer «Нийт» мөрийг анхааруулга болгож шуугихгүй');
  eq(F.parseStatement([['зүйлгүй']]).skipped, [], 'хуулга: толгой олдоогүй → skipped хоосон');

  // ③ ЦАЛИНГИЙН САЛБАР — тодорхойгүй бол ХООСОН. Өмнө нь `|| 'КЕМП'` байсан тул
  //    салбар нь бүртгэгдээгүй M-Event ажилтны цалин бүхэлдээ NOMAAD-д ордог байв.
  eq(F.salaryBranchOf('8 сарын цалин', ''), '', 'цалин: салбар тодорхойгүй → ХООСОН (КЕМП биш)');
  eq(F.salaryBranchOf('8 сарын цалин', '', 'ИВЕНТ'), 'ИВЕНТ', 'цалин: дансны салбар байвал түүнийг авна');
  eq(F.salaryBranchOf('8 сарын цалин', '', 'ЗАХ'), '', 'цалин: буруу салбарын код → хоосон');
  eq(F.salaryBranchOf('кемп цалин', ''), 'КЕМП', 'цалин: утгын түлхүүрээр КЕМП');
  eq(F.salaryBranchOf('m-event цалин', ''), 'ИВЕНТ', 'цалин: утгын түлхүүрээр ИВЕНТ');
}

// SCAN — цалинг САЛБАРГҮЙ үед сохроор КЕМП-д буулгах хэв маяг эргэж ирэхгүй (2026-09-06)
{
  const codeLines = src.split('\n').filter(l => !/^\s*(\/\/|\*)/.test(l)).join('\n');
  eq((codeLines.match(/\|\|\s*'КЕМП'/g) || []).length, 0,
    "scan: `|| 'КЕМП'` сохор өгөгдмөл байхгүй (M-Event цалинг NOMAAD-д буулгадаг байв)");
  eq((codeLines.match(/importedFpSet/g) || []).length, 0,
    'scan: Set-ээр давхцал шалгахгүй (ижил хээтэй 2 дахь гүйлгээ алгасагддаг) — fpAlreadyImported ашигла');
}

// Тооллогын эвдрэл — «тоолсны дотроос N засварт, M актлах» (2026-09-06)
{
  eq(F.countDamage({ note: '⟦DMG|1|2⟧' }), { rep: 1, wo: 2 }, 'эвдрэл: токен уншина');
  eq(F.countDamage({ note: null }), { rep: 0, wo: 0 }, 'эвдрэл: тэмдэглэлгүй = 0');
  eq(F.countDamage(null), { rep: 0, wo: 0 }, 'эвдрэл: мөргүй = 0 (унахгүй)');
  eq(F.countDamageNote(1, 2), '⟦DMG|1|2⟧', 'эвдрэл: токен бичнэ');
  eq(F.countDamageNote(0, 0), null, 'эвдрэл: 0 бол токен бичихгүй');
  eq(F.countDamageNote(0, 0, 'гар тэмдэглэл ⟦DMG|3|1⟧'), 'гар тэмдэглэл', 'эвдрэл: 0 болгоход бусад текст үлдэнэ');
  eq(F.countDamageNote(2, 0, 'хуучин ⟦DMG|3|1⟧ текст'), 'хуучин текст ⟦DMG|2|0⟧', 'эвдрэл: токен солигдож, текст хэвээр');
  // Жишээ: 3 талт матриц гэрэл — 4 ш байна, 3 хэвийн, 1 засварт
  eq(F.countOkQty({ counted_qty: 4, note: '⟦DMG|1|0⟧' }), 3, 'эвдрэл: хэвийн = тоолсон − засвар − актлах');
  eq(F.countOkQty({ counted_qty: 2, note: '⟦DMG|5|5⟧' }), 0, 'эвдрэл: хэвийн сөрөг болохгүй');
  ok(F.countHasDamage({ note: '⟦DMG|0|1⟧' }) === true, 'эвдрэл: актлах ч эвдрэл гэж тооцно');
  ok(F.countHasDamage({ note: '' }) === false, 'эвдрэл: тэмдэглэлгүй = эвдрэлгүй');

  // Нэгтгэл — сүүлчийн бичилтээр (дахин тоолсон нь дардаг)
  const rows = [
    { sku: 'A', counted_at: '2026-09-06T01:00:00Z', system_qty: 4, counted_qty: 4, note: '⟦DMG|1|0⟧' },
    { sku: 'A', counted_at: '2026-09-06T02:00:00Z', system_qty: 4, counted_qty: 4, note: '⟦DMG|2|1⟧' },
    { sku: 'B', counted_at: '2026-09-06T01:00:00Z', system_qty: 5, counted_qty: 5, note: null },
  ];
  const st2 = F.countStats(rows, 10);
  eq(st2.rep, 2, 'эвдрэл: сүүлчийн бичилтийн засвар тоологдоно (давхардахгүй)');
  eq(st2.wo, 1, 'эвдрэл: актлах нийлбэр');
  eq(st2.dmgItems, 1, 'эвдрэл: эвдрэлтэй барааны тоо');

  // Шүүлт «🔧 Эвдрэлтэй»
  const merged = F.countMergeProducts([{ sku: 'A', name: 'Гэрэл' }, { sku: 'B', name: 'Ширээ' }], rows);
  eq(F.countFilterList(merged, 'dmg', '').length, 1, 'эвдрэл: шүүлт зөвхөн эвдрэлтэйг үзүүлнэ');
  eq(F.countFilterList(merged, 'all', '').length, 2, 'эвдрэл: бусад шүүлт хэвээр');
}

// Сарын муж — «-31» гэсэн БАЙХГҮЙ огноо (2026-09-06, ирцийн сарын тойм гацсан алдаа)
{
  eq(F.nextMonthStr('2026-09'), '2026-10', 'сар: 09 → 10');
  eq(F.nextMonthStr('2026-12'), '2027-01', 'сар: 12 → дараа оны 01');
  eq(F.nextMonthStr('2026-01'), '2026-02', 'сар: 01 → 02');
  eq(F.nextMonthStr(''), '', 'сар: хоосон → хоосон (унахгүй)');
  eq(F.nextMonthStr('2026-13'), '2026-13', 'сар: буруу утга → өөрөө (унахгүй)');
}

// SCAN — DB-ээс сарын мужийг «<сар>-31» гэж татахгүй (2026-09-06)
// Postgres-т 2026-09-31 БАЙХГҮЙ → 400 → сарын тойм мөнхөд «Ачаалж байна…» гэж гацдаг байв.
// Зөв хэлбэр: `day=gte.<сар>-01&day=lt.<nextMonthStr(сар)>-01`.
{
  const codeLines = src.split('\n').filter(l => !/^\s*(\/\/|\*)/.test(l)).join('\n');
  eq((codeLines.match(/(?:lte|lt)\.\$\{[^}]*\}-31/g) || []).length, 0,
    'scan: сарын шүүлтэд `-31` хатуу огноо байхгүй (nextMonthStr ашигла)');
}


// ── ИРЦ: гарахаа бүртгүүлээгүй өдрийг удирдлага гараар нөхнө (2026-09-06) ────
// Асуудал: QR-аа «явлаа» гэж уншуулаагүй бол тэр өдрийн нээлттэй сесс тоологдохгүй
// → бүтэн өдөр ажилласан хүн 0 цаг харагдаж, цалин нь буруу гарна.
{
  // Одоогийн зан төлөв (баримт): гарах бүртгэлгүй ӨНГӨРСӨН өдөр = 0 минут
  const day = [
    { kind: 'in', ts: '2026-09-01T01:00:00.000Z' },   // УБ 09:00
  ];
  const past = F.attMemberSummary(day, false);
  eq(past.mins, 0, 'ирц: гарах бүртгэлгүй өнгөрсөн өдөр = 0 цаг (нөхөх шалтгаан)');
  ok(past.noOut === true, 'ирц: noOut туг гарна');
  eq(past.openTs, '2026-09-01T01:00:00.000Z', 'ирц: нээлттэй сессийн ирсэн цаг буцна');

  // Гараар оруулсан «out» нэмэгдвэл цаг тоологдоно
  const fixed = F.attMemberSummary(day.concat([{ kind: 'out', ts: F.attManualOutTs('2026-09-01', '18:00') }]), false);
  eq(fixed.mins, 540, 'ирц: 09:00→18:00 = 9 цаг (540 мин)');
  ok(fixed.noOut === false, 'ирц: нөхсний дараа noOut арилна');

  // УБ цаг (UTC+8) — түүхий new Date() бичвэл бүсээс хамаарч гулсдаг
  eq(F.attManualOutTs('2026-09-01', '18:00'), '2026-09-01T10:00:00.000Z', 'ирц: 18:00 УБ = 10:00 UTC');
  eq(F.attManualOutTs('2026-09-01', '03:00'), '2026-08-31T19:00:00.000Z', 'ирц: 03:00 УБ = өмнөх өдрийн 19:00 UTC');
  eq(F.attManualOutTs('2026-09-01', '9:30'), '2026-09-01T01:30:00.000Z', 'ирц: 1 оронтой цаг ажиллана');
  eq(F.attManualOutTs('2026-09-01', ''), '', 'ирц: хоосон цаг → хоосон');
  eq(F.attManualOutTs('', '18:00'), '', 'ирц: хоосон өдөр → хоосон');
  eq(F.attManualOutTs('2026-09-01', '25:00'), '', 'ирц: боломжгүй цаг → хоосон');
  eq(F.attManualOutTs('2026-09-01', '18:70'), '', 'ирц: боломжгүй минут → хоосон');

  // Шалгалт — сөрөг эсвэл утгагүй үргэлжлэл орохгүй
  const IN = '2026-09-01T01:00:00.000Z';   // УБ 09:00
  ok(F.attManualOutCheck(IN, F.attManualOutTs('2026-09-01', '18:00')).ok, 'ирц: 18:00 зөвшөөрнө');
  eq(F.attManualOutCheck(IN, F.attManualOutTs('2026-09-01', '18:00')).mins, 540, 'ирц: тооцсон минут');
  ok(!F.attManualOutCheck(IN, F.attManualOutTs('2026-09-01', '08:00')).ok, 'ирц: ирсэн цагаас ӨМНӨХ цаг ТАТГАЛЗАНА (0 болгохгүй)');
  ok(!F.attManualOutCheck(IN, F.attManualOutTs('2026-09-01', '09:00')).ok, 'ирц: ирсэн цагтай ЯГ ижил → татгалзана');
  ok(!F.attManualOutCheck(IN, '').ok, 'ирц: цаггүй → татгалзана');
  ok(!F.attManualOutCheck('', F.attManualOutTs('2026-09-01', '18:00')).ok, 'ирц: ирсэн цаг байхгүй → татгалзана');
  // 20 цагийн дээд хязгаар — бичих алдаанаас хамгаална
  ok(!F.attManualOutCheck('2026-09-01T00:00:00.000Z', '2026-09-02T00:00:00.000Z').ok, 'ирц: 24 цаг = бичих алдаа, татгалзана');
  ok(F.attManualOutCheck('2026-09-01T00:00:00.000Z', '2026-09-01T19:00:00.000Z').ok, 'ирц: 19 цаг зөвшөөрнө (шөнийн ээлж)');
}


// ── ТООЛЛОГО: ТҮРЭЭСЭНД ГАРСАН БАРАА (2026-09-04) ───────────────────────────
// Улирлын үед нөөцийн тал нь эвентэд гарсан байдаг. Агуулахад тоолсныг НИЙТ
// нөөцтэй харьцуулбал гарсан бараа бүр «дутуу» гэж улаанаар гарч, нярав
// байхгүй барааг хайж цаг алдана. Тооллого «агуулахад байх ёстой»-той тулгана.
{
  const o = (status, items) => ({ status, paid_mnt: 1000, items });
  const it = (sku, qty) => ({ sku, name: sku, qty });
  const ctx = { bySku: { 'M-1': { sku: 'M-1' }, 'M-2': { sku: 'M-2' } }, byName: {}, aliases: {} };

  const orders = [
    o('rented',     [it('M-1', 10), it('M-2', 4)]),   // гадаа
    o('delivering', [it('M-1', 5)]),                   // гадаа (замд)
    o('returning',  [it('M-1', 2)]),                   // гадаа (буцаж яваа)
    o('returned',   [it('M-1', 100)]),                 // АГУУЛАХАД ирсэн — тоологдохгүй
    o('archived',   [it('M-1', 100)]),                 // дууссан — тоологдохгүй
    o('reserved',   [it('M-1', 100)]),                 // хараахан гараагүй — тоологдохгүй
    o('ready',      [it('M-1', 100)]),                 // бэлдсэн, гараагүй — тоологдохгүй
  ];
  const m = F.outNowBySku(orders, ctx);
  eq(m.get('M-1'), 17, 'тооллого: гадаа байгаа = 10 + 5 + 2 (буцсан/захиалсан ороогүй)');
  eq(m.get('M-2'), 4, 'тооллого: өөр бараа тусдаа');
  eq(m.get('M-9'), undefined, 'тооллого: гараагүй бараа алга');
  eq(F.outNowBySku([], ctx).size, 0, 'тооллого: захиалгагүй бол хоосон');

  // Хүргэлт / НӨАТ мөр — бараа БИШ тул тоологдохгүй
  const noSku = F.outNowBySku([o('rented', [{ sku: '', name: 'Хүргэлт', qty: 1 }])], ctx);
  eq(noSku.size, 0, 'тооллого: бараа биш мөр (хүргэлт) тоологдохгүй');

  eq(F.expectedInWarehouse(106, 40), 66, 'тооллого: агуулахад байх ёстой = нийт − гадаа');
  eq(F.expectedInWarehouse(106, 0), 106, 'тооллого: гадаа юу ч байхгүй бол нийтээрээ');
  eq(F.expectedInWarehouse(10, 25), 0, 'тооллого: сөрөг болохгүй (дата зөрчилтэй ч 0)');
  eq(F.expectedInWarehouse(null, null), 0, 'тооллого: хоосон утга 0');
}

// ── ТООЛЛОГЫН ЗӨРҮҮ — МӨНГӨӨР (2026-09-04) ─────────────────────────────────
// «6 ширхэг дутуу» гэдэг шийдвэр гаргуулдаггүй, «1.2 сая₮» гаргуулдаг.
{
  const R = (sku, sys, cnt, at, note) => ({ sku, system_qty: sys, counted_qty: cnt, counted_at: at, note: note || null });
  const cost = { 'M-1': 200000, 'M-2': 50000, 'M-3': 0 };
  const costOf = (sku) => cost[sku] || 0;

  const rows = [
    R('M-1', 100, 94, '2026-09-04T08:00:00Z'),                 // −6 → 1,200,000
    R('M-2', 20, 24, '2026-09-04T08:10:00Z'),                  // +4 илүү (алдагдал БИШ)
    R('M-3', 10, 7, '2026-09-04T08:20:00Z'),                   // −3 ч өртөг 0
  ];
  const v = F.countLossValue(rows, costOf);
  eq(v.shortQty, 9, 'зөрүү: дутсан ширхэг (6 + 3)');
  eq(v.shortVal, 6 * 200000, 'зөрүү: дутсаны дүн (өртөггүй бараа 0 нэмнэ)');
  eq(v.overQty, 4, 'зөрүү: илүү гарсан ширхэг');
  eq(v.totalVal, 1200000, 'зөрүү: нийт алдагдал');

  // Засвар / актлах — тэмдэглэлийн токеноос
  const dmg = [R('M-1', 100, 100, '2026-09-04T09:00:00Z', '⟦DMG|2|3⟧')];
  const d = F.countLossValue(dmg, costOf);
  eq(d.repQty, 2, 'зөрүү: засварт өгөх ширхэг');
  eq(d.woQty, 3, 'зөрүү: актлах ширхэг');
  eq(d.woVal, 3 * 200000, 'зөрүү: актлахын дүн');
  eq(d.shortQty, 0, 'зөрүү: тоо тэнцсэн тул дутуу алга');
  eq(d.totalVal, 600000, 'зөрүү: нийт = актлахын дүн');

  // Нэг бараа дахин тоологдвол СҮҮЛЧИЙНХ (давхар тоологдохгүй)
  const twice = [R('M-1', 100, 90, '2026-09-04T08:00:00Z'), R('M-1', 100, 98, '2026-09-04T09:00:00Z')];
  eq(F.countLossValue(twice, costOf).shortQty, 2, 'зөрүү: сүүлчийн тоолол хүчинтэй (10 биш 2)');

  eq(F.countLossValue([], costOf).totalVal, 0, 'зөрүү: хоосон сесс 0');
  eq(F.countLossValue(rows, null).shortVal, 0, 'зөрүү: өртөг мэдэгдэхгүй бол 0 (хуурамч дүн гаргахгүй)');
}

// ── ТООЛЛОГЫН АКТ (2026-09-04) ─────────────────────────────────────────────
// Хаагдсан тооллого гарын үсэгтэй баримт үлдээнэ. Актад ЗӨРҮҮТЭЙ бараа л орно —
// 294 мөрийн хүснэгт цаасан дээр утгагүй.
{
  const R = (sku, sys, cnt, at, note) => ({ sku, system_qty: sys, counted_qty: cnt, counted_at: at, note: note || null });
  const cost = { 'M-1': 200000, 'M-2': 50000 };
  const opt = (rows) => ({ org: { name: '"ЧИМУН" ХХК', reg: '6614337', directorTitle: 'Гүйцэтгэх захирал' },
    rows, total: 294, startedAt: '2026-09-01', finishedAt: '2026-09-04',
    counters: ['Б.Нярав'], nameOf: (k) => ({ 'M-1': 'Цагаан ширээ', 'M-2': 'Стакан' })[k] || k,
    costOf: (k) => cost[k] || 0 });

  const html = F.countActHtml(opt([
    R('M-1', 100, 94, '2026-09-02T08:00:00Z'),   // −6
    R('M-2', 20, 20, '2026-09-02T08:10:00Z'),    // тэнцсэн — АКТАД ОРОХГҮЙ
  ]));
  ok(/БАРААНЫ ТООЛЛОГЫН АКТ/.test(html), 'акт: гарчигтай');
  ok(html.includes('Цагаан ширээ'), 'акт: зөрүүтэй бараа орсон');
  ok(!html.includes('Стакан'), 'акт: тэнцсэн бараа ОРООГҮЙ');
  ok(html.includes('6614337'), 'акт: байгууллагын РД');
  ok(html.includes('Б.Нярав'), 'акт: тоолсон хүн');
  ok(html.includes('294'), 'акт: нийт барааны тоо');
  ok(/1,200,000/.test(html), 'акт: алдагдлын дүн тооцогдсон');
  ok(html.includes('Гүйцэтгэх захирал'), 'акт: гарын үсгийн мөр');

  const clean = F.countActHtml(opt([R('M-2', 20, 20, '2026-09-02T08:10:00Z')]));
  ok(/Зөрүү гараагүй/.test(clean), 'акт: зөрүүгүй бол тодорхой хэлнэ');

  // Эвдрэл — тоо тэнцсэн ч актад орно (актлах нь мөнгөний бичлэг)
  const dmg = F.countActHtml(opt([R('M-1', 100, 100, '2026-09-02T08:00:00Z', '⟦DMG|0|3⟧')]));
  ok(dmg.includes('3 ш актлах'), 'акт: тоо тэнцсэн ч актлах бүртгэгдэнэ');
  ok(dmg.includes('600,000'), 'акт: актлахын дүн МӨРӨНД харагдана (багана нийт дүнтэй нийлнэ)');

  // Мөрүүдийн дүнгийн нийлбэр = «Алдагдлын дүн». Нягтлан нэмээд таарах ёстой.
  {
    const h = F.countActHtml(opt([
      R('M-1', 100, 94, '2026-09-02T08:00:00Z'),          // −6 × 200,000 = 1,200,000
      R('M-2', 20, 20, '2026-09-02T08:10:00Z', '⟦DMG|0|2⟧'), // актлах 2 × 50,000 = 100,000
    ]));
    ok(h.includes('1,200,000') && h.includes('100,000'), 'акт: мөр бүрийн дүн гарсан');
    ok(h.includes('1,300,000'), 'акт: нийт = мөрүүдийн нийлбэр');
  }
}

// ── ДАХИН ТООЛУУЛАХ (2026-09-04) ───────────────────────────────────────────
// Буруу тоолсныг «алдагдсан» гэж бичих нь мөнгө устгахтай адил. Том зөрүүг
// ӨӨР хүн дахин тоолж баталгаажуулсны дараа л нөөцөөс хасна.
{
  const R = (sku, sys, cnt, by, at, note) =>
    ({ sku, system_qty: sys, counted_qty: cnt, counted_by: by, counted_at: at, note: note || null });

  // Жижиг зөрүү — баталгаа шаардахгүй
  ok(F.countNeedsRecount(R('a', 100, 98, 'x', '1'), 1000) === false, 'дахин: жижиг зөрүү шууд залруулагдана');
  // Ширхгээр том
  ok(F.countNeedsRecount(R('a', 100, 93, 'x', '1'), 1000) === true, 'дахин: 5+ ширхэг зөрүү баталгаа шаарна');
  // Дүнгээр том (ганц ширхэг ч үнэтэй)
  ok(F.countNeedsRecount(R('a', 10, 9, 'x', '1'), 1010377) === true, 'дахин: үнэтэй бараа 1 ширхэг ч баталгаа шаарна');
  // ИЛҮҮ гарсан нь эрсдэлгүй — нөөц нэмэгдэх нь мөнгө устгахгүй
  ok(F.countNeedsRecount(R('a', 10, 30, 'x', '1'), 1010377) === false, 'дахин: илүү гарсан баталгаа шаардахгүй');
  // Актлах ч алдагдал
  ok(F.countNeedsRecount(R('a', 10, 10, 'x', '1', '⟦DMG|0|1⟧'), 1010377) === true, 'дахин: үнэтэй бараа актлахад баталгаа шаарна');

  // Баталгаажуулалт
  const one = [R('a', 100, 93, 'нярав', '2026-09-04T08:00:00Z')];
  ok(F.countRecountDone(one) === false, 'дахин: нэг хүн тоолсон нь баталгаа биш');
  const sameMan = one.concat([R('a', 100, 93, 'нярав', '2026-09-04T09:00:00Z')]);
  ok(F.countRecountDone(sameMan) === false, 'дахин: НЭГ хүн хоёр удаа тоолсон нь баталгаа биш');
  const twoDiff = one.concat([R('a', 100, 95, 'ахлах', '2026-09-04T09:00:00Z')]);
  ok(F.countRecountDone(twoDiff) === false, 'дахин: өөр хүн ӨӨР тоо гаргавал баталгаажаагүй');
  const twoSame = one.concat([R('a', 100, 93, 'ахлах', '2026-09-04T09:00:00Z')]);
  ok(F.countRecountDone(twoSame) === true, 'дахин: өөр хүн ИЖИЛ тоо гаргавал баталгаажив');

  // Залруулж болох эсэх
  const small = [R('b', 100, 98, 'нярав', '2026-09-04T08:00:00Z')];   // −2, хямд бараа
  ok(F.countCanApply(small[0], small, 1000) === true, 'дахин: жижиг зөрүү шууд залруулна');
  ok(F.countCanApply(one[0], one, 1010377) === false, 'дахин: том зөрүү баталгаагүйгээр залруулагдахгүй');
  ok(F.countCanApply(twoSame[1], twoSame, 1010377) === true, 'дахин: баталгаажсаны дараа залруулагдана');
}

// ── ТООЛЛОГЫН ХАМРАХ ХҮРЭЭ (2026-09-04) ────────────────────────────────────
// 294 барааг бүтнээр тоолох нь улиралд нэг л удаа боломжтой. Сар бүр хөрөнгийн
// 80%-ийг эзлэх цөөн барааг тоолох нь бодит ачаалалд тохирно (ABC зарчим).
{
  const P = (sku, cat, stock, cost) => ({ sku, category: cat, stock, cost });
  const prods = [
    P('M-1', 'Майхан', 100, 1000000),   // 100.0 сая — 79.4%
    P('M-2', 'Ширээ',   100, 200000),   //  20.0 сая — 15.9%
    P('M-3', 'Ширээ',   100, 50000),    //   5.0 сая —  4.0%
    P('M-4', 'Стакан',  100, 1000),     //   0.1 сая —  0.1%
    P('M-5', 'Стакан',  100, 0),        // өртөггүй
  ];
  const costOf = (sku) => (prods.find(p => p.sku === sku) || {}).cost || 0;

  eq(F.countScopeProducts(prods, 'all', costOf).length, 5, 'хүрээ: бүгд');
  eq(F.countScopeProducts(prods, 'cat:Ширээ', costOf).map(p => p.sku), ['M-2', 'M-3'], 'хүрээ: ангиллаар');
  eq(F.countScopeProducts(prods, 'cat:Байхгүй', costOf), [], 'хүрээ: байхгүй ангилал → хоосон');

  // ABC — хөрөнгийн 80% хүрэх хүртэл. M-1 дангаараа 79.4% тул M-2 хүртэл авна.
  eq(F.countScopeProducts(prods, 'abc', costOf).map(p => p.sku), ['M-1', 'M-2'], 'хүрээ: ABC — хөрөнгийн 80%');
  ok(!F.countScopeProducts(prods, 'abc', costOf).some(p => p.sku === 'M-5'), 'хүрээ: өртөггүй бараа ABC-д орохгүй');
  eq(F.countScopeProducts(prods, 'abc', () => 0), [], 'хүрээ: өртөг огт мэдэгдэхгүй бол ABC хоосон');
  eq(F.countScopeProducts([], 'abc', costOf), [], 'хүрээ: бараагүй');
  eq(F.countScopeProducts(prods, 'танихгүй', costOf).length, 5, 'хүрээ: танихгүй утга → бүгд (бараа алдагдахгүй)');

  eq(F.countScopeLabel('abc'), 'Үнэтэй бараа (хөрөнгийн 80%)', 'хүрээ: ABC нэр');
  eq(F.countScopeLabel('cat:Майхан'), 'Майхан', 'хүрээ: ангиллын нэр');
  eq(F.countScopeLabel(''), 'Бүх бараа', 'хүрээ: анхдагч нэр');
}

  finish();
})();

// ── ХУВИЙН ДАНСНААС ГАРСАН КОМПАНИЙН ЗАРДАЛ (2026-09-07) ────────────────────
// Компанийн зардлын багагүй хэсэг эзний хувийн данс/картаар гардаг байсан ч
// хуулга зөвхөн компанийн данснаас ордог тул тэр зардал огт бүртгэгддэггүй байв.
{
  // ① Токен — зардал аль ХУВИЙН данснаас гарсныг санана.
  eq(F.encodePrsnToken('5400145457'), '⟦PRSN|5400145457⟧', 'хувийн: токен бичнэ');
  eq(F.encodePrsnToken(''), '', 'хувийн: данс хоосон → токен бичихгүй');
  eq(F.parsePrsnToken('Хуулгаар орсон ⟦PRSN|5400145457⟧ [#EXP-1]'), '5400145457', 'хувийн: токен уншина');
  eq(F.parsePrsnToken('Хуулгаар орсон [#EXP-1]'), '', 'хувийн: токенгүй → хоосон');
  eq(F.stripPrsnToken('Хуулгаар орсон ⟦PRSN|540⟧ данс'), 'Хуулгаар орсон данс', 'хувийн: токен арилгана');

  // ② Бүртгэлд «зорилго: хувийн» гэсэн данс л хувийн гэж тооцогдоно.
  const runIn = (code) => vm.runInContext(code, sandbox);
  const _ba = runIn('state.bankAccounts');
  sandbox.__ba = [
    { id: 'p1', account_no: '5400145457', purpose: 'хувийн', owner_key: '99119911' },
    { id: 'c1', account_no: '3635185058', purpose: 'зарлага' },
  ];
  runIn('state.bankAccounts = __ba;');
  ok(F.isPersonalAcct('5400145457') === true, 'хувийн: зорилго=хувийн данс таарна');
  ok(F.isPersonalAcct('3635185058') === false, 'хувийн: компанийн данс хувийн БИШ');
  ok(F.isPersonalAcct('') === false, 'хувийн: данс хоосон → үгүй');
  ok(F.companyAcctSet().has('3635185058') === true, 'хувийн: компанийн дансны багцад компанийнх бий');
  ok(F.companyAcctSet().has('5400145457') === false, 'хувийн: компанийн дансны багцад хувийнх БАЙХГҮЙ (нөхөн олголт танигдана)');

  // ③ Өр = хувийн данснаас гарсан компанийн зардал − буцаан төлсөн.
  const reqs = [
    { amount: 6587700, status: 'done', justification: 'Хуулгаар орсон [#a] ⟦PRSN|5400145457⟧' },
    { amount: 1000000, status: 'done', justification: 'Хуулгаар орсон [#b] ⟦PRSN|5400145457⟧' },
    { amount: 500000, status: 'deleted', justification: 'Хуулгаар орсон [#c] ⟦PRSN|5400145457⟧' },   // устгасан — тоологдохгүй
    { amount: 300000, status: 'done', justification: 'Хуулгаар орсон [#d] ⟦SRC|3635185058⟧' },        // компанийн данс — хамаагүй
  ];
  const settle = { s1: { acct: '5400145457', date: '2026-08-20', amount: 5000000 } };
  const d = F.personalAcctDebt('5400145457', reqs, settle);
  eq(d.n, 2, 'өр: зөвхөн идэвхтэй PRSN зардал тоологдоно');
  eq(d.spent, 7587700, 'өр: хувийн данснаас гарсан зардлын нийлбэр');
  eq(d.paid, 5000000, 'өр: буцаан төлсөн нийлбэр');
  eq(d.owed, 2587700, 'өр: компани эзэнд өртэй үлдэгдэл');
  eq(F.personalAcctDebt('3635185058', reqs, settle).spent, 0, 'өр: өөр данс → 0');
  eq(F.personalAcctDebt('', reqs, settle), { spent: 0, n: 0, paid: 0, pn: 0, owed: 0 }, 'өр: данс хоосон → 0 (унахгүй)');

  // ④ Компанийн зардал байх САНАЛ — ангилал таарсан эсвэл салбарын түлхүүр үгтэй мөр.
  ok(F.personalRowSuggest('nomaad camp mah 7.31-8/2', '1300') === true, 'санал: ангилал таарсан мөр → компанийн санал');
  ok(F.personalRowSuggest('nomaad хүнс', '') === true, 'санал: салбарын түлхүүр үгтэй мөр → компанийн санал');
  ok(F.personalRowSuggest('Охины хэрэглээний талбөр', '') === false, 'санал: хувийн зарлага → санал болгохгүй');
  sandbox.__ba = _ba; runIn('state.bankAccounts = __ba;');
}

// SCAN — хувийн данснаас гарсан зардал ЗӨВХӨН токентой орно (2026-09-07)
// Токен байхгүй бол өр тооцогдохгүй, компани эзэндээ өртэйгөө мэдэхгүй үлдэнэ.
{
  ok(/r\.personal \? ' ' \+ encodePrsnToken\(r\.src\)/.test(src),
    'scan: хуулгын импорт хувийн мөрд PRSN токен бичдэг');
  ok(/!\(r\.personal && !r\.biz\)/.test(src),
    'scan: «компанийн» гэж сонгоогүй хувийн мөр зардал болохгүй');
}

// ── ИМПОРТ БУЦААХ — зөвхөн ТУХАЙН хуулгын мөрүүд (2026-09-07) ────────────────
// Буруу хуулга оруулчихвал сэргээх ганц зам. Бусад данс / бусад сарын зардлыг
// хөндвөл сүйрэл болно — тиймээс хээ (fp) ЯГ таарсан бүртгэлийг л сонгоно.
{
  const reqs = [
    { id: 1, amount: 20000, status: 'done', justification: 'Хуулгаар орсон [#EXP-20000-20260801-x] ⟦SRC|5400145457⟧' },
    { id: 2, amount: 32000, status: 'done', justification: 'Хуулгаар орсон [#EXP-32000-20260801-y] ⟦SRC|5400145457⟧' },
    { id: 3, amount: 99000, status: 'done', justification: 'Хуулгаар орсон [#EXP-99000-20260801-z] ⟦SRC|3635185058⟧' },  // өөр данс
    { id: 4, amount: 20000, status: 'deleted', justification: 'Хуулгаар орсон [#EXP-20000-20260801-x]' },                 // аль хэдийн устсан
    { id: 5, amount: 50000, status: 'done', justification: 'Гараар бүртгэсэн — хээгүй' },                                  // импортын биш
  ];
  const fps = new Set(['EXP-20000-20260801-x', 'EXP-32000-20260801-y']);
  const hit = F.stmtImportedByFps(reqs, fps);
  eq(hit.map(r => r.id), [1, 2], 'буцаах: зөвхөн энэ хуулгын хээтэй ИДЭВХТЭЙ бүртгэл');
  eq(F.stmtImportedByFps(reqs, new Set()).length, 0, 'буцаах: хээ хоосон → юу ч сонгогдохгүй');
  eq(F.stmtImportedByFps(null, fps).length, 0, 'буцаах: бүртгэл байхгүй → унахгүй');
  eq(F.stmtImportedByFps(reqs, ['EXP-99000-20260801-z']).map(r => r.id), [3], 'буцаах: массиваар ч ажиллана');
}

// ── НӨАТ = ЗАРДАЛ, САЛБАР ТУС ТУСДАА (2026-09-07) ───────────────────────────
// Борлуулалтын НӨАТ орлогод багтаж ирдэг ч компанид үлддэггүй. Ашгийн тайлан
// түүнийг хасдаггүй байсан тул ашиг хиймлээр өндөр харагдаж байв.
{
  const R = [
    { dt: '2026-08-03T10:00:00', total: 11000000, vat: 1000000, matched_type: 'event' },
    { dt: '2026-08-15T10:00:00', total: 22000000, vat: 2000000, matched_type: 'nomaad' },
    { dt: '2026-08-20T10:00:00', total: 3300000, vat: 300000, matched_type: null },      // тулгагдаагүй → ХХК
    { dt: '2026-08-25T10:00:00', total: 5500000, vat: 500000, matched_type: 'nomaad', returned: true },  // буцаасан
    { dt: '2026-07-30T10:00:00', total: 1100000, vat: 100000, matched_type: 'event' },   // өөр сар
  ];
  const b = F.vatByBranchMonth(R, '2026-08');
  eq(b['ИВЕНТ'], 1000000, 'НӨАТ: M-Event салбарын НӨАТ');
  eq(b['КЕМП'], 2000000, 'НӨАТ: NOMAAD салбарын НӨАТ (буцаасан ОРОХГҮЙ)');
  eq(b['ХХК'], 300000, 'НӨАТ: тулгагдаагүй баримт → Чимун ХХК');
  eq(b.total, 3300000, 'НӨАТ: сарын нийлбэр');
  eq(F.vatByBranchMonth(R, '2026-07').total, 100000, 'НӨАТ: өөр сар тусдаа');
  eq(F.vatByBranchMonth(R, '2026-01').total, 0, 'НӨАТ: баримтгүй сар = 0');
  eq(F.vatByBranchMonth(null, '2026-08').total, 0, 'НӨАТ: баримт байхгүй → 0 (унахгүй)');

  eq(F.vatReceiptBranch({ matched_type: 'event' }), 'ИВЕНТ', 'НӨАТ: event → ИВЕНТ');
  eq(F.vatReceiptBranch({ matched_type: 'nomaad' }), 'КЕМП', 'НӨАТ: nomaad → КЕМП');
  eq(F.vatReceiptBranch({}), 'ХХК', 'НӨАТ: тулгагдаагүй → ХХК');
  eq(F.vatReceiptBranch(null), 'ХХК', 'НӨАТ: мөргүй → ХХК (унахгүй)');

  // Давхар тооллого: банкаар төлсөн НӨАТ (5100) тайлангийн зардлаас хасагдана
  ok(F.finIsVatPayment({ category: '5100' }) === true, 'НӨАТ: 5100 = НӨАТ төлөлт');
  ok(F.finIsVatPayment({ category: '5200' }) === false, 'НӨАТ: ААНОАТ нь НӨАТ төлөлт БИШ');
  ok(F.finIsVatPayment({}) === false, 'НӨАТ: ангилалгүй = төлөлт биш');
  ok(F.finIsVatPayment(null) === false, 'НӨАТ: мөргүй = төлөлт биш (унахгүй)');
}

// SCAN — ноогдуулсан НӨАТ нэмсэн газар бүрт банкны НӨАТ төлөлт хасагдсан байх (2026-09-07)
// Эс бөгөөс нэг НӨАТ хоёр удаа зардал болж ашиг буруу буурна.
{
  const codeLines = src.split('\n').filter(l => !/^\s*(\/\/|\*)/.test(l));
  const addVat = codeLines.filter(l => /vatExpenseFor\(|vatByBranchMonth\(vatReceiptsActive/.test(l)).length;
  const skipPay = codeLines.filter(l => /finIsVatPayment\(t\)/.test(l)).length;
  ok(addVat >= 2 && skipPay >= 3,
    'scan: НӨАТ зардал нэмэгддэг бүх зам дээр 5100 төлөлт хасагдсан (давхар тоологдохгүй)');
}

// ── ХХБ (TDB) ВАЛЮТ ХУУЛГА — .xls, серийн огноо, USD→₮ (2026-09-07) ─────────
// Голомт/Хаан-аас 3 зүйлээр ялгаатай: merged багана (толгойн индекс дата мөрд
// таарахгүй), Excel серийн огноо, валют данс. Тусдаа задлагчаар уншина.
{
  eq(F.xlsSerialToDate(46235.10900462963), '2026-08-01', 'TDB: серийн огноо → 2026-08-01');
  eq(F.xlsSerialToDate(46268.44430555555), '2026-09-03', 'TDB: серийн огноо → 2026-09-03');
  eq(F.xlsSerialToDate(46268.99), '2026-09-03', 'TDB: өдрийн сүүл цаг ч огноо гулсахгүй (UTC+8 занга)');
  eq(F.xlsSerialToDate('юу ч биш'), '', 'TDB: тоо биш → хоосон');
  eq(F.xlsSerialToDate(5), '', 'TDB: боломжгүй серийн тоо → хоосон');

  // Бодит хуулгын бүтэц: merged нүднээс болж толгой ба дата ±1-2 гулсдаг
  const m = [
    ['', '', '', '', '', '', '', '', '', 'Депозит дансны хуулга - Иргэн', ''],
    ['', 'Дансны дугаар:  456084193 USD', '', '', '', '', '', '', '', '', ''],
    ['', 'Огноо', '', 'Теллер', '', '', '', '', 'Орлого', '', '', '', 'Зарлага', '', '', '', '', '', 'Ханш', '', '', '', 'Харьцсан данс', '', '', '', '', 'Үлдэгдэл', '', 'Гүйлгээний утга'],
    [46237.457604166666, '', '', '', '490 - 1090', '', '', 0, '', '', '', 64, '', '', '', '', 3592.73, '', '', '', '', '', '', 'ХХБ ӨГЛӨГИЙН ТҮР ДАНС ВИЗА КАРТ /USD ISSUER', '', '', 145.6, '', 'К.Б: P10 - Purchase FACEBK *CESCGWRT62'],
    [46244.794537037036, '', '', '', '490 - 50', '', '', 139.08, '', '', '', 0, '', '', '', '', 3595, '', '', '', '', '', '', '456089634', '', 'МӨНХ-УЧРАЛ ГАНБАТ', 148.68, '', 'EB -boost'],
    ['Нийт:', '', '', '', '', '', 139.08, '', '', '', '', '', '', 64, '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', ''],
  ];
  const meta = F.tdbMeta(m);
  ok(meta.isTdb === true, 'TDB: «Теллер» баганаар ХХБ хуулга гэж танина');
  eq(meta.acct, '456084193', 'TDB: дансны дугаар уншина');
  eq(meta.ccy, 'USD', 'TDB: дансны валют уншина');
  eq(F.detectStatementAccount(m), '456084193', 'TDB: эх данс 7 дахь мөрөөс ч олдоно');

  const p = F.parseStatement(m);
  eq(p.rows.length, 2, 'TDB: 2 гүйлгээ (толгой/нийт мөр орохгүй)');
  eq(p.rows[0].date, '2026-08-03', 'TDB: огноо');
  eq(p.rows[0].debit, 229935, 'TDB: 64 USD × 3592.73 = 229,935₮ (₮ рүү хөрвүүлнэ)');
  eq(p.rows[0].memo, 'К.Б: P10 - Purchase FACEBK *CESCGWRT62', 'TDB: гүйлгээний утга = сүүлийн текст');
  eq(p.rows[0].name, '', 'TDB: «ВИЗА КАРТ түр данс» нь харьцагчийн нэр БИШ');
  eq(p.rows[0].fx, { ccy: 'USD', amt: 64, rate: 3592.73 }, 'TDB: эх валютын дүн хадгалагдана');
  eq(p.rows[1].credit, 499993, 'TDB: орлого мөр ч хөрвүүлэгдэнэ');
  eq(p.rows[1].debit, 0, 'TDB: орлого мөрд зарлага 0');
  eq(p.rows[1].account, '456089634', 'TDB: харьцсан данс (зөвхөн цифр) таньна');
  eq(p.rows[1].name, 'МӨНХ-УЧРАЛ ГАНБАТ', 'TDB: харьцагчийн нэр');

  // ₮ данс бол хөрвүүлэлт хийхгүй (ханшаар үржүүлэхгүй)
  const mnt = m.map(r => r.slice());
  mnt[1] = ['', 'Дансны дугаар:  3635185058 MNT', ''];
  const pm = F.parseStatement(mnt);
  eq(pm.rows[0].debit, 64, '₮ данс: ханшаар үржүүлэхгүй');
  eq(pm.rows[0].fx, undefined, '₮ данс: валютын тэмдэглэгээгүй');

  // Голомт/Хаан формат ХЭВЭЭР (TDB задлагч тэднийг барьж авахгүй)
  const g = F.parseStatement([
    ['Гүйлгээний огноо', 'Гүйлгээний утга', 'Харьцсан дансны нэр', 'Харьцсан данс', 'Ханш', 'Орлого', 'Зарлага'],
    ['2026-08-05', 'Бензин', 'А', '5001', '', 0, 50000],
  ]);
  eq(g.rows.length, 1, 'Голомт: хуучин формат хэвээр уншигдана');
  eq(g.rows[0].debit, 50000, 'Голомт: дүн хэвээр');

  // Валют картын түгээмэл зардал — авто ангилал
  eq(F.classifyExpense('К.Б: P10 - Purchase FACEBK *CESCGWRT62', ''), '4100', 'ангилал: FACEBK → цахим зар сурталчилгаа');
  eq(F.classifyExpense('К.Б: P10 - Purchase APPLE.COM/BILL', ''), '2400', 'ангилал: APPLE.COM → онлайн програм');
}
