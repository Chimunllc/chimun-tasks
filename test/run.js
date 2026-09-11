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
  'finIsDepositReturn', 'encodeSetup', 'setupFlagOf', 'setupFeeOf', 'setupFeeForItems', 'setupRateForName', 'setupUnitFee', 'cooShareAmount', 'quoteDiscountFromTotal', '_histCompute', 'isOrderAutoTask', '_nomaadMonthSum', 'orderDiscountAmount', 'orderMoneyBreakdown', 'calcDeliveryFee', 'tariffOffhoursFee', 'tariffDeliveryCity', 'tariffPerKm', 'parseRefund', 'encodeRefundNote', 'productUtilization', 'errStatusLabel', 'productStockByName', 'availabilityFor', 'orderShortages', 'stripFormTokens', 'canProductPart', 'canEditAnyProductPart', 'productPartFields', 'restrictProductEdit', 'warehouseCapital', 'orderMailKind', 'orderReview', 'histDayList', 'histFilterOrders', '_histCompute', 'packageSplit', '_histCatResolver', 'countRowPerson', 'scQuarterOf', 'scSessionLabel', 'scNewSessionId', 'scNormalizeConfig', 'scAllSessionIds', 'countRowState', 'countMergeProducts', 'countFilterList',
  'parseStatement', 'expenseFp', 'salaryBranchOf', 'fpAlreadyImported', 'isInternalTransfer',
  'attManualOutTs', 'attManualOutCheck', 'attReqValidate', 'attReqKey', 'attReqPrune', 'attReqApprovalCheck',
  'unknownPersonRefs', 'personNameFix', 'catListFromGroups', 'catOrphans', 'catRenamePlan', 'writeOffBranchPatch', 'countDamage', 'countDamageNote', 'nextMonthStr', '_histItemResolver']);

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
  // Гарын үсгээс ХАМААРАЛГҮЙ (openProductModal(p) → (p, opts) болоход тест унасан)
  const openSrc = src.slice(src.indexOf('function openProductModal('), src.indexOf('async function submitProductModal('));
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

  ok(CL({ paid_mnt: 0 }).indexOf('Больсон') > -1, 'хаах: төлбөргүйд товч «Больсон» (устгах БИШ — хэлцэл больсон)');
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
  eq(FIR({ decision: 'approved', category: '6950' }), false, 'зардал: зээлийн үндсэн төлбөр(6950) хасагдана');
  eq(FIR({ decision: 'approved', category: '6100' }), true, 'зардал: хөрөнгө(6100) нь 69xx БИШ — хэвээр тооцогдоно');
  eq(FIR({ decision: 'approved', category: '3100' }), true, 'зардал: жинхэнэ зардал(3100) тоологдоно');

  // COO цалин — цэвэр ашгаас хувь (алдагдалтай бол 0, дугуйрна)
  const COO = vm.runInContext('cooShareAmount', sandbox);
  eq(COO(12000000, 30), 3600000, 'COO: 12сая ашгийн 30% = 3.6сая');
  eq(COO(-5000000, 30), 0, 'COO: алдагдалтай сард 0 (сөрөг цалин үгүй)');
  eq(COO(0, 30), 0, 'COO: 0 ашигт 0');
  eq(COO(10000000, 0), 0, 'COO: 0% = 0');

  // ── COO-гийн ашгийн эрх = ЗӨВХӨН ТУХАЙН САЛБАР (2026-09-10) ────────────────
  // Өмнө нь бүх салбарын нийлбэрээр (M-Event + NOMAAD + ХХК) тооцож, M-Event-ийн
  // захирал NOMAAD-ийн ашгаас хувь авах болж байв.
  {
    const st = vm.runInContext('state', sandbox);
    const savedCfg = st.cooShare;
    const CB = vm.runInContext('cooBranch', sandbox);
    const CN = vm.runInContext('cooNetForMonths', sandbox);
    const BRS = vm.runInContext('COO_BRANCHES', sandbox);

    st.cooShare = {}; eq(CB(), 'M-Event', 'COO: салбар заагаагүй бол өгөгдмөл M-Event');
    st.cooShare = { branch: 'NOMAAD' }; eq(CB(), 'NOMAAD', 'COO: тохируулсан салбар мөрдөгдөнө');
    st.cooShare = { branch: 'Чимун ХХК' }; eq(CB(), 'M-Event', 'COO: ХХК-г салбар гэж авахгүй (M-Event руу уналт)');
    st.cooShare = { branch: 'хог' }; eq(CB(), 'M-Event', 'COO: танигдахгүй салбар → M-Event');
    ok(!BRS.includes('Чимун ХХК'), 'COO: ХХК салбарын жагсаалтад БАЙХГҮЙ');

    // finBranchPnl-ийг mock-лож салбараар шүүхийг батална
    const realPnl = vm.runInContext('finBranchPnl', sandbox);
    vm.runInContext('finBranchPnl = function () { return { rows: ['
      + '{ k: "M-Event", inc: 10000000, exp: 4000000 },'
      + '{ k: "NOMAAD", inc: 90000000, exp: 20000000 },'
      + '{ k: "Чимун ХХК", inc: 0, exp: 7000000 } ] }; }', sandbox);
    eq(CN(['2026-09'], 'M-Event'), { inc: 10000000, exp: 4000000, net: 6000000 },
       'COO: ЗӨВХӨН M-Event мөр тоологдоно (NOMAAD/ХХК орохгүй)');

    // ── ХОЁР СУУРЬ: ноогдох vs орсон мөнгө (2026-09-10) ──
    // Хураагдаагүй авлага ноогдохд орж, орсон мөнгөнд ОРОХГҮЙ — COO цалин зөрнө.
    vm.runInContext('finBranchPnl = function (m, basis) { return { rows: ['
      + '{ k: "M-Event", inc: basis === "cash" ? 6000000 : 10000000, exp: basis === "cash" ? 3000000 : 4000000 } ] }; }', sandbox);
    eq(CN(['2026-09'], 'M-Event', 'accrual'), { inc: 10000000, exp: 4000000, net: 6000000 },
       'COO: ноогдох суурь');
    eq(CN(['2026-09'], 'M-Event', 'cash'), { inc: 6000000, exp: 3000000, net: 3000000 },
       'COO: орсон мөнгө суурь');
    eq(CN(['2026-09'], 'M-Event').inc, 10000000, 'COO: суурь заахгүй бол ноогдохоор (өгөгдмөл)');
    eq(CN(['2026-09'], 'M-Event', 'хог').inc, 10000000, 'COO: танигдахгүй суурь → ноогдох');
    vm.runInContext('finBranchPnl = function () { return { rows: ['
      + '{ k: "M-Event", inc: 10000000, exp: 4000000 },'
      + '{ k: "NOMAAD", inc: 90000000, exp: 20000000 },'
      + '{ k: "Чимун ХХК", inc: 0, exp: 7000000 } ] }; }', sandbox);
    eq(CN(['2026-09'], 'NOMAAD'), { inc: 90000000, exp: 20000000, net: 70000000 },
       'COO: NOMAAD салбар сонговол зөвхөн тэр');
    eq(CN(['2026-09', '2026-08'], 'M-Event'), { inc: 20000000, exp: 8000000, net: 12000000 },
       'COO: олон сар нэмэгдэнэ');
    st.cooShare = {};
    eq(CN(['2026-09']).net, 6000000, 'COO: салбар заахгүй бол өгөгдмөл M-Event-ээр');
    eq(CN([], 'M-Event'), { inc: 0, exp: 0, net: 0 }, 'COO: сар алга → 0');
    eq(CN(null, 'M-Event'), { inc: 0, exp: 0, net: 0 }, 'COO: сар null → 0 (унахгүй)');
    // ── Ашиг тоолж ЭХЛЭХ САР = 2026-06 (түүнээс өмнө зардал бүртгэгдээгүй) ──
    const YT = vm.runInContext('cooMonthsYtd', sandbox);
    const CS = vm.runInContext('cooStartMonth', sandbox);
    st.cooShare = {};
    eq(CS(), '2026-06', 'COO: эхлэх сарын өгөгдмөл = 2026-06');
    st.cooShare = { start: '2026-07' }; eq(CS(), '2026-07', 'COO: тохируулсан эхлэх сар мөрдөгдөнө');
    st.cooShare = { start: '2026-13' }; eq(CS(), '2026-06', 'COO: хүчингүй сар → өгөгдмөл');
    st.cooShare = { start: 'хог' }; eq(CS(), '2026-06', 'COO: хог утга → өгөгдмөл');
    st.cooShare = {};
    eq(YT('2026-09'), ['2026-06', '2026-07', '2026-08', '2026-09'], 'COO: 6-9 сар (1-5 сар ОРОХГҮЙ)');
    eq(YT('2026-06'), ['2026-06'], 'COO: эхлэх сар өөрөө орно');
    eq(YT('2026-05'), [], 'COO: эхлэхээсээ өмнөх сар → хоосон');
    eq(YT('2026-01'), [], 'COO: 1-р сар → хоосон (зардал бүртгэгдээгүй үе)');
    eq(YT('2027-02', '2026-11'), ['2026-11', '2026-12', '2027-01', '2027-02'], 'COO: он давсан хуримтлал');
    eq(YT(''), [], 'COO: сар хоосон → хоосон (унахгүй)');
    eq(YT(null), [], 'COO: сар null → хоосон (унахгүй)');
    eq(YT('хог'), [], 'COO: буруу хэлбэр → хоосон');

    // ── COO-Д ОЛГОСОН ЦАЛИН + ҮЛДЭГДЭЛ (2026-09-10) ──
    // finance.beneficiary нь НЭР (утас БИШ), олон хэлбэртэй, үсгийн алдаатай ч байдаг.
    eq(F.cooNameKey('И.Алтансүх'), 'АЛТАНСҮ', 'цалин: нэрийн цөмийн угтвар (овгийн акроним хаягдана)');
    eq(F.cooNameKey('Алтансүх'), 'АЛТАНСҮ', 'цалин: овоггүй нэр ижил түлхүүр');
    eq(F.cooNameKey('Г.Мөнх-Учрал'), 'УЧРАЛ', 'цалин: хамгийн урт хэсгийг авна');
    eq(F.cooNameKey('А.Б'), '', 'цалин: хэт богино нэр → түлхүүргүй (сохроор тулгахгүй)');
    eq(F.cooNameKey(''), '', 'цалин: нэр хоосон → түлхүүргүй');
    eq(F.cooNameKey(null), '', 'цалин: нэр null → түлхүүргүй (унахгүй)');

    ok(F.cooIsSalaryCat('7100'), 'цалин: 7100 = цалин');
    ok(F.cooIsSalaryCat('7600 Цагийн цалин'), 'цалин: 7600 = цалин');
    ok(!F.cooIsSalaryCat('1800'), 'цалин: 1800 (шатахуун) цалин БИШ');
    ok(!F.cooIsSalaryCat('7400'), 'цалин: 7400 цалингийн код БИШ');
    ok(!F.cooIsSalaryCat(''), 'цалин: ангилалгүй → цалин биш');
    // Ашгийн эрхийн олголт нь ЗАРДАЛ БИШ тул 6900-аар бүртгэгддэг — гэхдээ COO-гийн
    // «олгосон/үлдэгдэл» тооцоонд ЗААВАЛ орно (эс бол бүтэн дүн төлөгдөөгүй мэт харагдана).
    ok(F.cooIsSalaryCat('7700'), 'цалин: 7700 (ашгийн урамшуулал) олголтод ОРНО');
    ok(F.cooIsSalaryCat('7700 Ашгийн урамшуулал'), 'цалин: 7700 нэртэй мөр ч орно');
    ok(F.cooIsSalaryCat('6900'), 'цалин: 6900 (эзний зээлээр олгосон) олголтод ОРНО');
    ok(F.cooIsSalaryCat('6900 Эзний зээл / захирлын авалт'), 'цалин: 6900 нэртэй мөр ч орно');
    ok(!F.cooIsSalaryCat('6100'), 'цалин: 6100 (тоног төхөөрөмж) олголт БИШ');

    ok(F.finIsNonExpense('6900'), 'зардал биш: 6900 эзний зээл');
    ok(F.finIsNonExpense('6950 Зээлийн үндсэн төлбөр'), 'зардал биш: 6950 зээлийн үндсэн төлбөр');
    ok(!F.finIsNonExpense('6100'), 'зардал биш: 6100 хөрөнгө нь 69xx БИШ');
    ok(!F.finIsNonExpense('7700'), 'зардал биш: 7700 ашгийн урамшуулал нь ЗАРДАЛ (татвар ногдоно)');
    ok(!F.finIsNonExpense(''), 'зардал биш: ангилалгүй → жинхэнэ зардал');
    ok(!F.finIsNonExpense(null), 'зардал биш: null → унахгүй');

    const _pay = (o) => Object.assign({ decision: 'approved', status: 'open', category: '7100',
      requested_at: '2026-07-05T00:00:00Z', beneficiary: 'Алтансүх', amount: 1000000, purpose: '' }, o);
    let r = F.cooSalaryPaid([
      _pay({ requested_at: '2026-06-13T00:00:00Z', amount: 2009400, purpose: 'Алтансүх 5 сарын цалин үлдэгдэл' }),
      _pay({ requested_at: '2026-08-03T00:00:00Z', amount: 1000000, beneficiary: '5009711612', purpose: 'EB-И.Алтансүр 7 сар цалин' }),
      _pay({ requested_at: '2026-07-21T00:00:00Z', amount: 3000000 }),
    ], 'И.Алтансүх', '2026-06', '2026-08');
    eq(r.total, 6009400, 'цалин: нийт олгосон (дансаар бичигдсэн + үсгийн алдаатай мөр ч баригдана)');
    eq(r.list.length, 3, 'цалин: 3 гүйлгээ');
    eq(r.list.map(x => x.d), ['2026-06-13', '2026-07-21', '2026-08-03'], 'цалин: огноогоор эрэмбэлэгдэнэ');

    // Хамрах хүрээ + шүүлтүүр
    eq(F.cooSalaryPaid([_pay({ requested_at: '2026-05-29T00:00:00Z' })], 'Алтансүх', '2026-06', '2026-08').total, 0,
       'цалин: эхлэх сараас өмнөх олголт ОРОХГҮЙ');
    eq(F.cooSalaryPaid([_pay({ requested_at: '2026-09-06T00:00:00Z' })], 'Алтансүх', '2026-06', '2026-08').total, 0,
       'цалин: сонгосон сараас хойших олголт ОРОХГҮЙ');
    eq(F.cooSalaryPaid([_pay({ category: '1800', purpose: 'Портор түлш Алтансүх' })], 'Алтансүх', '2026-06', '2026-08').total, 0,
       'цалин: шатахууны нөхөх гүйлгээ цалинд ОРОХГҮЙ');
    eq(F.cooSalaryPaid([_pay({ decision: 'rejected' })], 'Алтансүх', '2026-06', '2026-08').total, 0,
       'цалин: батлагдаагүй мөр орохгүй');
    eq(F.cooSalaryPaid([_pay({ status: 'deleted' })], 'Алтансүх', '2026-06', '2026-08').total, 0,
       'цалин: устгасан мөр орохгүй');
    eq(F.cooSalaryPaid([_pay({ beneficiary: 'Түвдэндаржаа', purpose: 'цалин' })], 'Алтансүх', '2026-06', '2026-08').total, 0,
       'цалин: ӨӨР хүний цалин орохгүй');
    eq(F.cooSalaryPaid([_pay({ category: '7700', purpose: 'Ашгийн урамшуулал 7 сар' })], 'Алтансүх', '2026-06', '2026-08').total, 1000000,
      'цалин: 7700-аар олгосон ашгийн урамшуулал үлдэгдлээс хасагдана');
    eq(F.cooSalaryPaid([_pay({ category: '6900', purpose: 'Ашгийн эрх урьдчилгаа' })], 'Алтансүх', '2026-06', '2026-08').total, 1000000,
      'цалин: 6900-аар олгосон ашгийн эрх үлдэгдлээс хасагдана');
    eq(F.cooSalaryPaid([_pay({ amount: 0 })], 'Алтансүх', '2026-06', '2026-08').total, 0, 'цалин: 0 дүн орохгүй');
    eq(F.cooSalaryPaid([_pay({ requested_at: '' })], 'Алтансүх', '2026-06', '2026-08').total, 0, 'цалин: огноогүй мөр орохгүй');
    eq(F.cooSalaryPaid([], 'Алтансүх', '2026-06', '2026-08').total, 0, 'цалин: мөргүй → 0');
    eq(F.cooSalaryPaid(null, 'Алтансүх', '2026-06', '2026-08').total, 0, 'цалин: null → 0 (унахгүй)');
    eq(F.cooSalaryPaid([_pay({})], '', '2026-06', '2026-08').total, 0, 'цалин: нэргүй бол ЮУ Ч тоолохгүй (сохроор нэмэхгүй)');
    eq(F.cooSalaryPaid([_pay({})], 'Алтансүх').total, 1000000, 'цалин: хугацаа заахгүй бол бүгд');

    // ── ДАНСААР тулгах: хуулгаас ирсэн мөрд хүлээн авагч нь НЭР биш ДАНС ──
    eq(F.cooAcctDigits('5009711612'), '5009711612', 'цалин: дансны цифр');
    eq(F.cooAcctDigits('1400 0500 5009711612'), '140005005009711612', 'цалин: зай хасагдана');
    eq(F.cooAcctDigits('12345'), '', 'цалин: 6-аас бага цифр = данс биш');
    eq(F.cooAcctDigits(''), '', 'цалин: хоосон → данс биш');
    eq(F.cooAcctDigits(null), '', 'цалин: null → данс биш (унахгүй)');

    // Нэр огт таарахгүй мөр — зөвхөн данснаас баригдана
    const _byAcct = [
      _pay({ beneficiary: '5009711612', purpose: 'EB-Цалин', amount: 700000 }),
      _pay({ beneficiary: 'ЗАРЛАГА: EB', account_number: '140005005009711612', purpose: 'Цалин', amount: 300000 }),
      _pay({ beneficiary: 'Түвдэндаржаа', account_number: '1234567890', purpose: 'Цалин', amount: 900000 }),
    ];
    eq(F.cooSalaryPaid(_byAcct, 'Хэнбишүү', null, null, '5009711612').total, 1000000,
       'цалин: данснаас баригдана (нэр таарахгүй ч), өөр данс орохгүй');
    eq(F.cooSalaryPaid(_byAcct, 'Хэнбишүү', null, null, '').total, 0,
       'цалин: данс заахгүй + нэр таарахгүй → 0');
    eq(F.cooSalaryPaid(_byAcct, '', null, null, '5009711612').list.length, 2,
       'цалин: нэргүй ч данстай бол тоологдоно');
    eq(F.cooSalaryPaid(_byAcct, '', null, null, '').total, 0,
       'цалин: нэр ч, данс ч алга → сохроор ЮУ Ч тоолохгүй');
    // Нэр БА данс хоёулаа таарсан мөр ХОЁР удаа тоологдохгүй
    eq(F.cooSalaryPaid([_pay({ beneficiary: 'Алтансүх', account_number: '5009711612', amount: 500000 })],
       'И.Алтансүх', null, null, '5009711612').total, 500000, 'цалин: нэр+данс таарсан мөр давхардахгүй');
    // Данс таарсан ч ангилал цалин биш бол орохгүй
    eq(F.cooSalaryPaid([_pay({ beneficiary: '5009711612', category: '1800', purpose: 'Түлш' })],
       '', null, null, '5009711612').total, 0, 'цалин: данс таарсан ч түлшний зардал орохгүй');

    vm.runInContext('finBranchPnl = __realPnl;', Object.assign(sandbox, { __realPnl: realPnl }));
    st.cooShare = savedCfg;
  }

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

  // СУУРИЛУУЛАЛТЫН ЦОНХ — ачаа үйлчлүүлэгч дээр байхад нөөц ЧӨЛӨӨТ харагдаж байв.
  // `installing` = хүргэсэн, суурилуулж байгаа; `teardown` = буулгасан, агуулахад
  // хараахан ирээгүй. 2026-09-09 хүртэл _ORDER_OCCUPYING-д ороогүй байсан.
  for (const stt of ['installing', 'teardown']) {
    st.appOrders = [{
      number: 1478, status: stt, paid_mnt: 100000, starts_at: '2026-09-16', stops_at: '2026-09-17',
      items: [{ sku: 'f83fc516-aaaa', name: 'Асар 6м өргөн', qty: 2 }],
    }];
    eq(BQR('Асар 6м*12м', '2026-09-16', '2026-09-17'), 2,
       `нөөц: '${stt}' шатанд байгаа бараа нөөц ЭЗЭЛНЭ (агуулахад байхгүй)`);
  }

  st.products = saved.p; st.appOrders = saved.o;
}

// 40h-2) SCAN: аппын нөөц эзлэх жагсаалт ↔ VPS харагдацын жагсаалт зөрөх ёсгүй.
// Хоёр тал нэг ижил байх ёстой; зөрвөл апп ба mevent.mn өөр сул үлдэгдэл харуулна.
// Харагдацыг өөрчлөхөд энэ жагсаалтыг ЗЭРЭГ шинэчилнэ (эсрэгээр нь ч мөн адил).
{
  const occ = vm.runInContext('_ORDER_OCCUPYING', sandbox);
  for (const stt of ['installing', 'teardown']) {
    ok(occ.includes(stt), `SCAN: _ORDER_OCCUPYING-д '${stt}' байна (харагдацтай ижил)`);
  }
  // Агуулахаас гарсан бүх шат нөөц ч эзэлнэ — эс бөгөөс тооллого ба сул үлдэгдэл зөрнө.
  const out = vm.runInContext('STOCK_OUT_STATUSES', sandbox);
  const missing = out.filter(s => !occ.includes(s));
  ok(missing.length === 0, `SCAN: STOCK_OUT_STATUSES бүгд нөөц эзэлнэ (дутуу: ${missing.join(',') || '—'})`);
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
      // Багцын мөр өөрөө тайланд ГАРАХГҮЙ — орлого нь бүрэлдэхүүн рүү задарна.
      const sp = F.pricingStats(
        [{ number: 9, status: 'returned', starts_at: '2026-02-01', stops_at: '2026-02-01', total_mnt: 780000,
           items: [{ sku: 'PK', name: 'Өвлийн багц', qty: 2, price: 390000 }] }],
        [pkg, st0.products[0], st0.products[1]], { from: '2026-01-01', to: '2026-12-31',
                 ctx: { bySku: { PK: pkg }, byName: {}, aliases: {} } });
      ok(!sp.rows.some(r => r.sku === 'PK'), 'багц: үнийн шинжилгээнд өөрийн мөр гарахгүй');
      const _p1 = sp.rows.find(r => r.sku === 'P1'), _p2 = sp.rows.find(r => r.sku === 'P2');
      ok(_p1 && _p1.qty === 2 && _p2 && _p2.qty === 4, 'багц: бүрэлдэхүүний тоо (2 багц)');
      ok(Math.round(_p1.revenue + _p2.revenue) === 780000, 'багц: орлого бүтнээрээ бүрэлдэхүүнд');
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

    // НЭГТГЭЛ — нэг үйлчилгээ олон нэрээр бичигдсэн байдаг (2026-09-07)
    const bd2 = F.serviceBreakdown([
      { product: '2 талдаа Хүргэлт (машины төрөл дунд)', revenue_mnt: 31000000, times_rented: 304, total_qty: 835 },
      { product: 'Хүргэлт 1 талдаа', revenue_mnt: 1100000, times_rented: 18, total_qty: 20 },
      { product: '1 талдаа хүргэлт (ван)', revenue_mnt: 640611, times_rented: 28, total_qty: 32 },
      { product: 'Угсралт суурилуулалт', revenue_mnt: 1800000, times_rented: 9, total_qty: 9 },
      { product: 'Суурилуулалт', revenue_mnt: 205000, times_rented: 5, total_qty: 5 },
    ], dlv);
    const gDlv = bd2.groups.find(g => g.key === 'delivery'), gSet = bd2.groups.find(g => g.key === 'setup');
    eq(gDlv.total, 31000000 + 1100000 + 640611 + 600000, 'нэгтгэл: хүргэлтийн бүх нэр + ⟦DLV⟧ нэг дүн');
    eq(gDlv.times, 304 + 18 + 28 + 2, 'нэгтгэл: удаа нийлнэ');
    eq(gDlv.qty, 835 + 20 + 32 + 2, 'нэгтгэл: ширхэг нийлнэ');
    eq(gDlv.names.length, 3, 'нэгтгэл: захиалгын мөрөөр ирсэн 3 нэр (⟦DLV⟧ нь мөр биш тул ороогүй)');
    eq(gDlv.dlvTotal, 600000, 'нэгтгэл: аппын хүргэлтийн төлбөр тусад нь мэдэгдэнэ');
    eq(gSet.total, 2005000, 'нэгтгэл: угсралтын 2 нэр нэг дүн');
    eq(gSet.dlvTotal, 0, 'нэгтгэл: угсралтад ⟦DLV⟧ байхгүй');
    eq(gSet.names, ['Угсралт суурилуулалт', 'Суурилуулалт'], 'нэгтгэл: нэрс дүнгээр эрэмбэлэгдэнэ');

    // Нэгтгэсэн мөр дархад — БҮХ нэрийн захиалга нэг жагсаалтад
    const svcOrders = [
      { id: 'o1', number: 1, status: 'done', total_mnt: 200000, items: [{ name: '2 талдаа Хүргэлт (машины төрөл дунд)', qty: 1, price: 150000 }, { name: 'Ширээ', qty: 1, price: 50000 }] },
      { id: 'o2', number: 2, status: 'done', total_mnt: 90000, items: [{ name: 'Хүргэлт 1 талдаа', qty: 1, price: 90000 }] },
    ];
    eq(F.histProductOrders(svcOrders, '2 талдаа Хүргэлт (машины төрөл дунд)').rows.length, 1, 'нэгтгэл: нэг нэрээр хайхад хуучин зан төлөв хэвээр');
    const merged = F.histProductOrders(svcOrders, ['2 талдаа Хүргэлт (машины төрөл дунд)', 'Хүргэлт 1 талдаа']);
    eq(merged.rows.length, 2, 'нэгтгэл: нэрсийн жагсаалтаар хоёулангийнх нь мөр ирнэ');
    eq(merged.totals.orders, 2, 'нэгтгэл: захиалгын тоо нийлнэ');
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
    // Цуцалсан/больсон/ноорог — авлага БИШ
    ['canceled', 'cancelled', 'deleted', 'draft'].forEach(s => {
      eq(bal([{ id: 'z', number: 7, status: s, total_mnt: 500000, paid_mnt: 200000 }]).length, 0,
         `авлага: «${s}» авлагад орохгүй`);
    });
    // ⚠ АРХИВЛАСАН нь авлага ХЭВЭЭР — архивлах = «ажлын жагсаалтаас хал», өр тэглэдэггүй.
    //   Сараар багц архивласны дараа 963,500₮ авлага чимээгүй алга болж байв (#1470).
    eq(bal([{ id: 'ar', number: 1470, status: 'archived', total_mnt: 1927000, paid_mnt: 963500 }]).map(i => i.balance),
       [963500], 'авлага: АРХИВЛАСАН захиалгын үлдэгдэл хэвээр харагдана');
    eq(bal([{ id: 'ar2', number: 5, status: 'archived', total_mnt: 500000, paid_mnt: 500000 }]).length, 0,
       'авлага: архивласан бүтэн төлсөн захиалга авлагад орохгүй');
    // ИНВАРИАНТ: архивлах нь авлагын дүнг ХӨНДӨХГҮЙ
    {
      const one = { id: 'inv', number: 11, status: 'returned', total_mnt: 800000, paid_mnt: 300000 };
      const before = bal([one]).reduce((t, i) => t + i.balance, 0);
      const after = bal([{ ...one, status: 'archived' }]).reduce((t, i) => t + i.balance, 0);
      eq(after, before, 'ИНВАРИАНТ: архивласны дараа авлагын дүн өөрчлөгдөхгүй');
    }
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

// Тайлангийн мөр НЭГТГЭЛ — нэг бараа хоёр нэрээр задрахгүй (2026-09-07)
// Хоёр платформ (Booqable + апп) хэрэглэсний үлдэц: «Эвхдэг Сандал (Цагаан)» ба
// «Эвхэгддэг сандал Цагаан» нь нэг бараа. Тайланд орлого/ROI хоёр тийш хуваагдаж байв.
{
  const prods = [
    { sku: 'M-234', name: 'Эвхэгддэг сандал Цагаан' },
    { sku: 'M-165', name: 'Тайз (1,2 м²)' },
    { sku: 'M-121', name: 'Ус, цай халуун баригч 13 л' },
  ];
  const al = { 'name:эвхдэгсандалцагаан': 'M-234', 'sku:6fa1e4f7': 'M-165' };
  const R = F._histItemResolver(prods, al);
  eq(R('M-234', 'юу ч байсан'), { sku: 'M-234', name: 'Эвхэгддэг сандал Цагаан' }, 'нэгтгэл: sku шууд таарна');
  eq(R('', 'Эвхдэг Сандал (Цагаан)'), { sku: 'M-234', name: 'Эвхэгддэг сандал Цагаан' }, 'нэгтгэл: толь(нэр)-ээр каталогийн бараанд');
  eq(R('6FA1E4F7', 'Тайз (1,2мкв)'), { sku: 'M-165', name: 'Тайз (1,2 м²)' }, 'нэгтгэл: толь(хуучин sku)-гээр');
  eq(R('', 'Ус, цай халуун баригч 13л'), { sku: 'M-121', name: 'Ус, цай халуун баригч 13 л' }, 'нэгтгэл: зай/цэгийн зөрүү өөрөө нийлнэ');
  eq(R('', 'Огт байхгүй бараа'), { sku: '', name: 'Огт байхгүй бараа' }, 'нэгтгэл: олдохгүй бол нэрээрээ үлдэнэ');

  const ords = [
    { id: 'o1', number: 1, status: 'done', total_mnt: 300000, starts_at: '2026-08-01', stops_at: '2026-08-02',
      items: [{ name: 'Эвхдэг Сандал (Цагаан)', qty: 10, price: 20000 }, { name: 'Тайз (1,2мкв)', sku: '6FA1E4F7', qty: 1, price: 100000 }] },
    { id: 'o2', number: 2, status: 'done', total_mnt: 200000, starts_at: '2026-08-03', stops_at: '2026-08-04',
      items: [{ name: 'Эвхэгддэг сандал Цагаан', qty: 5, price: 20000 }, { name: 'Тайз (1,2 м²)', qty: 1, price: 100000 }] },
  ];
  const catOf = () => 'Бусад';
  const plain = F._histCompute(ords, null, catOf);
  const merged = F._histCompute(ords, null, catOf, R);
  eq(plain.products.length, 4, 'нэгтгэл: хөрвүүлэгчгүй бол 4 мөр (хуучин зан төлөв)');
  eq(merged.products.length, 2, 'нэгтгэл: хөрвүүлэгчтэй бол 2 мөр');
  const chair = merged.products.find(x => x.sku === 'M-234');
  eq(chair.product, 'Эвхэгддэг сандал Цагаан', 'нэгтгэл: каталогийн нэрээр харагдана');
  eq(chair.total_qty, 15, 'нэгтгэл: ширхэг нийлнэ (10 + 5)');
  eq(chair.times_rented, 2, 'нэгтгэл: 2 захиалга');
  eq(chair.names.sort(), ['Эвхдэг Сандал (Цагаан)', 'Эвхэгддэг сандал Цагаан'], 'нэгтгэл: хуучин нэрс хадгалагдана (дарж хайхад)');
  // Ширхэг/бараа-өдөр алдагдах ЁСГҮЙ
  const qs = a => a.reduce((s, x) => s + x.total_qty, 0);
  eq(qs(merged.products), qs(plain.products), 'нэгтгэл: нийт ширхэг өөрчлөгдөхгүй');
}

// Нэгтгэлийн ХОЙШЛОГДСОН 2 алдаа (2026-09-07, тайлан дээр илэрсэн)
{
  const prods = [{ sku: 'M-077', name: 'Зуны Bell tent майхан 5 м' }, { sku: 'M-219', name: 'Саарал хөлтэй сандал' }];
  const al = { 'name:зуныbelltentмайхан5м': 'M-077', 'name:сааралхлтэйчанартайсандал': 'M-219' };
  const R = F._histItemResolver(prods, al);
  const ords = [{ id: 'o1', number: 1, status: 'done', total_mnt: 100000, starts_at: '2026-08-01', stops_at: '2026-08-02',
    items: [{ name: 'Саарал хөлтэй / чанартай сандал /', qty: 2, price: 50000 }] }];
  // (1) Мөр НЭГ хуучин нэртэй ч байсан жинхэнэ нэрээ хадгална — эс бөгөөс мөрийг дархад
  //     каталогийн нэрээр хайж «захиалга олдсонгүй» гэсэн хоосон цонх гарна.
  const c1 = F._histCompute(ords, null, () => 'Бусад', R);
  const row = c1.products[0];
  eq(row.product, 'Саарал хөлтэй сандал', 'нэгтгэл: каталогийн нэрээр харагдана');
  eq(row.names, ['Саарал хөлтэй / чанартай сандал /'], 'нэгтгэл: нэр 1 ч байсан ЖИНХЭНЭ нэр хадгалагдана');
  eq(F.histProductOrders(ords, row.names).rows.length, 1, 'нэгтгэл: хуучин нэрээр захиалга олдоно');
  eq(F.histProductOrders(ords, row.product).rows.length, 0, 'нэгтгэл: каталогийн нэрээр хайвал ХООСОН (яагаад нэрсээ хадгалдгийн шалтгаан)');

  // (2) Өртөг/ROI — rh_roi_fix нь ХУУЧИН нэрээр түлхүүрлэгдсэн тул хуучин нэрсээр ч хайна
  const roiFix = { bySku: {}, byName: { 'саарал хөлтэй / чанартай сандал /': { c: 80000, o: 32 } } };
  const c2 = F._histCompute(ords, roiFix, () => 'Бусад', R);
  eq(c2.products[0].unit_cost_mnt, 80000, 'нэгтгэл: өртөг хуучин нэрээр олдоно (өртөг ? болохгүй)');
  eq(c2.products[0].owned_qty, 32, 'нэгтгэл: эзэмшсэн тоо мөн олдоно');
}

// SCAN — ангилал ГАРААР бичигддэггүй (2026-09-08)
// Чөлөөт талбар байсан тул шинэ нэр бичихэд бүлэгт ороогүй ангилал үүсч, сайт дээр
// цэсний доор өлгөөтэй харагддаг байв (60 бараа ингэж унасан). Одоо зөвхөн сонголт.
{
  ok(!/id="pm-cat" list=/.test(src), 'scan: барааны модалын ангилал чөлөөт бичлэг БИШ');
  ok(!/class="ps-in ps-cat ui-raw" list=/.test(src), 'scan: каталог хуудасны ангилал чөлөөт бичлэг БИШ');
  ok(/<select id="pm-cat">/.test(src) && /catSelectOpts/.test(src), 'scan: ангилал сонголтоор өгөгдөнө');
}

// SCAN — тайлангийн мөрийн «жинхэнэ нэрс» зураглалыг хязгаарлахгүй (2026-09-07)
// `names.length > 1` гэж шүүсэн тул НЭГ хуучин нэртэй бүлэг зураглалд ороогүй →
// мөр дархад каталогийн нэрээр хайж «захиалга олдсонгүй» болж байв.
{
  const i = src.indexOf('state._histNameMap = {}');
  ok(i > 0, 'scan: _histNameMap зураглал байна');
  ok(!/names\.length > 1/.test(src.slice(i, i + 400)),
     'scan: нэрсийн зураглал `length > 1`-ээр хязгаарлагдахгүй');
}

// SCAN — «өртөг оруулаагүй» тооноос шууд ажил руу үсэрнэ (2026-09-09)
// Тоо хэлээд орхивол хүн 280 барааны алийг нь гэж хайх шаардлагатай болно.
{
  ok(/id="hist-nocost"/.test(src), 'scan: өртөггүй барааны тоо ТОВЧ болсон');
  const i = src.indexOf("getElementById('hist-nocost')");
  ok(i > 0 && /prodMissing = 'nocost'/.test(src.slice(i, i + 400)),
     'scan: тэр товч Бараа хуудсыг «өртөггүй» шүүлтээр нээнэ');
}

// Хүний нэр солигдоход даалгавар өнчрөх эрсдэл (2026-09-09)
// Даалгавар/санхүү нь хүнийг НЭРЭЭР хадгалдаг. Нэр солиход хуучин мөр эзэнгүй болдог —
// эхлээд DB толь (employee_aliases), дараа нь гараар холбосон нэр барина; аль нь ч
// бариагүйг ИЛ жагсаана.
{
  const TEAMv = vm.runInContext('TEAM', sandbox);
  const st = vm.runInContext('state', sandbox);
  const sv = { team: TEAMv.slice(), al: st.empAliases, fx: st.personFixes };
  TEAMv.length = 0;
  TEAMv.push({ name: 'Б.Дэлгэрмаа', phone: '99110022', role: 'Менежер' });
  TEAMv.push({ name: 'Г.Сайнжаргал', phone: '88220033', role: 'Ажилтан' });
  st.empAliases = { 'name:б.болормаа': '99110022' };   // DB толь: хуучин нэр → одоогийн түлхүүр
  st.personFixes = {};

  ok(F.findMember('Б.Дэлгэрмаа') !== null, 'нэр: одоогийн нэрээр олдоно');
  ok(F.findMember('Б.Болормаа') !== null, 'нэр: ХУУЧИН нэрээр (DB толь) олдоно — нэр солиход түүх тасрахгүй');
  ok(F.findMember('Ц.Танихгүй') === null, 'нэр: огт танихгүй бол null');

  const tasks = [
    { id: 't1', status: 'open', assignee: 'Б.Болормаа', createdBy: 'Г.Сайнжаргал' },
    { id: 't2', status: 'open', assignee: 'Ц.Танихгүй', createdBy: 'Г.Сайнжаргал' },
    { id: 't3', status: 'deleted', assignee: 'Ө.Устсан', createdBy: 'Г.Сайнжаргал' },
    { id: 't4', status: 'open', assignee: 'Г.Сайнжаргал', createdBy: 'SYSTEM', co_assignees: ['Ц.Танихгүй'] },
  ];
  const fin = [{ id: 'f1', requested_by: 'Ц.Танихгүй' }, { id: 'f2', requested_by: 'Б.Болормаа' }];
  const unk = F.unknownPersonRefs(tasks, fin, F.findMember);
  eq(unk, [{ name: 'Ц.Танихгүй', tasks: 2, finance: 1 }],
     'нэр: зөвхөн үнэхээр танигдахгүй нь (устгасан мөр, SYSTEM, толиор олдсон нь орохгүй)');

  // Гараар холбосны дараа өнчин үлдэхгүй
  st.personFixes = { 'ц.танихгүй': 'Г.Сайнжаргал' };
  ok(F.findMember('Ц.Танихгүй') !== null, 'нэр: гараар холбосон нэр ажиллана');
  eq(F.unknownPersonRefs(tasks, fin, F.findMember).length, 0, 'нэр: холбосны дараа өнчин алга');

  st.personFixes = {};
  eq(F.unknownPersonRefs([], [], F.findMember), [], 'нэр: хоосон дата → хоосон жагсаалт');

  TEAMv.length = 0; sv.team.forEach(x => TEAMv.push(x));
  st.empAliases = sv.al; st.personFixes = sv.fx;
}

// Ангиллын мастер жагсаалт — бүлэгт ороогүй ангилал, нэр солих төлөвлөгөө (2026-09-08)
{
  const groups = [
    { name: 'Тайз, хөгжим, гэрэлтүүлэг', subs: ['Тайз', 'Гэрэлтүүлэг'] },
    { name: 'Ширээ, тавилга', subs: ['Ширээ, сандал, бүтээлэг'] },
  ];
  eq(F.catListFromGroups(groups), ['Тайз', 'Гэрэлтүүлэг', 'Ширээ, сандал, бүтээлэг'], 'ангилал: бүлгээс жагсаалт гарна');
  eq(F.catListFromGroups([{ name: 'A', subs: ['X', ' X ', 'Y'] }]), ['X', 'Y'], 'ангилал: давхардал/зай цэвэрлэгдэнэ');
  eq(F.catListFromGroups(null), [], 'ангилал: хоосон бол хоосон (унахгүй)');

  const prods = [
    { sku: 'M-1', category: 'Тайз' },
    { sku: 'M-2', category: 'Тайзны гэрэлтүүлэг' },
    { sku: 'M-3', category: 'Тайзны гэрэлтүүлэг' },
    { sku: 'M-4', category: 'Сүүдрэвч' },
    { sku: 'M-5', category: '' },
  ];
  eq(F.catOrphans(prods, groups), [{ cat: 'Тайзны гэрэлтүүлэг', count: 2 }, { cat: 'Сүүдрэвч', count: 1 }],
     'ангилал: бүлэгт ороогүй нь олноороо эрэмбэлэгдэнэ (ангилалгүй бараа орохгүй)');
  eq(F.catOrphans(prods, [{ name: 'Бүгд', subs: ['Тайз', 'Тайзны гэрэлтүүлэг', 'Сүүдрэвч'] }]), [],
     'ангилал: бүгд бүлэгт орсон бол өнчин алга');

  const plan = F.catRenamePlan(prods, { 'Тайзны гэрэлтүүлэг': 'Гэрэлтүүлэг', 'Тайз': 'Тайз', 'Сүүдрэвч': '  ' });
  eq(plan, [{ from: 'Тайзны гэрэлтүүлэг', to: 'Гэрэлтүүлэг', count: 2 }],
     'ангилал: зөвхөн бодитоор өөрчлөгдсөн нэр (хоосон/ижил нэр орохгүй) + хөндөгдөх барааны тоо');
}

// Бөөн актлалт — салбарын нөөцөөс хасах төлөвлөгөө (2026-09-07)
// Зөвхөн `stock`-ыг хасвал салбарын нийлбэр зөрж, шилжүүлэг/тооллого буруу тоо үзүүлнэ.
{
  const p = { sku: 'M-1', stock: 10, qty_mevent: 6, qty_chimun: 3, qty_nomaad: 1 };
  eq(F.writeOffBranchPatch(p, 2).patch, { qty_mevent: 4 }, 'актлалт: M-Event-ээс эхэлж хасна');
  eq(F.writeOffBranchPatch(p, 8).patch, { qty_mevent: 0, qty_chimun: 1 }, 'актлалт: хүрэлцэхгүй бол дараагийн салбараас');
  eq(F.writeOffBranchPatch(p, 2, 'nomaad').patch, { qty_nomaad: 0, qty_mevent: 5 }, 'актлалт: сонгосон салбараас ЭХЭЛНЭ');
  eq(F.writeOffBranchPatch(p, 10).patch, { qty_mevent: 0, qty_chimun: 0, qty_nomaad: 0 }, 'актлалт: бүх салбар цэвэрлэгдэнэ');
  eq(F.writeOffBranchPatch(p, 12).unallocated, 2, 'актлалт: салбарт хуваарилагдаагүй үлдэгдлийг хэлнэ');
  eq(F.writeOffBranchPatch({ sku: 'M-2', stock: 4 }, 3).patch, {}, 'актлалт: хуваарилаагүй бараанд салбарын өөрчлөлт байхгүй');
  eq(F.writeOffBranchPatch(p, 0).patch, {}, 'актлалт: 0 бол юу ч хасахгүй');
  eq(F.writeOffBranchPatch(p, -5).patch, {}, 'актлалт: сөрөг тоо аюулгүй');
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

// ── БАГЦ ҮҮСГЭХ ТУСДАА ТОВЧ (2026-09-07) ───────────────────────────────────
// Багц үүсгэх нь барааны картын гүнд нуугдсан чагт байсныг тусдаа товч болгов.
// scan: товч, багц горим, нөөц нуугдах логик бүрэн байгаа эсэх.
{
  const openSrc = src.slice(src.indexOf('function openProductModal('), src.indexOf('async function submitProductModal('));
  ok(/id="prod-new-pkg"/.test(src), 'багц: жагсаалтад тусдаа товч байна');
  ok(/prod-new-pkg'\)\?\.addEventListener\('click', \(\) => openProductModal\(null, \{ asPackage: true \}\)\)/.test(src),
     'багц: товч багц горимоор нээнэ');
  ok(/asPkg = !!\(opts && opts\.asPackage\)/.test(openSrc), 'багц: горимын тугийг уншина');
  ok(/isPackage\(p\) \|\| asPkg \? 'checked'/.test(openSrc), 'багц: чагт урьдчилан тавигдана');
  ok(/if \(asPkg\) pmGo\('price'\)/.test(openSrc), 'багц: шууд бүрэлдэхүүн рүү үсэрнэ');
  ok(/Шинэ багц/.test(openSrc), 'багц: гарчиг ялгаатай');

  // Багцын нөөцийг ГАРААР оруулдаггүй (бүрэлдэхүүнээс тооцогдоно) — тэр хэсэг нуугдана.
  ok(/_pkgEl\.checked \|\| _svcEl\.checked/.test(openSrc), 'багц: нөөц хэсэг багц/үйлчилгээнд нуугдана');
  const css = fs.readFileSync(path.join(__dirname, '..', 'styles.css'), 'utf8');
  ok(/\.pm-menu-row\[hidden\]/.test(css), 'багц: нуусан менюгийн мөр үнэхээр нуугдана (display:flex-ийг дардаг)');
}

// ── БАРАА АРХИВЛАХ — ЗӨВХӨН CEO, ХАТУУ УСТГАЛ БИШ (2026-09-07) ─────────────
// Дүрэм: ямар ч дата хатуугаар устгахгүй. Товч нь `archived=true` болгоно.
{
  const openSrc = src.slice(src.indexOf('function openProductModal('), src.indexOf('async function submitProductModal('));
  ok(/isEdit && state\.isCEO/.test(openSrc), 'архив: товч зөвхөн CEO-д, зөвхөн байгаа бараанд');
  ok(/id="pm-archive"/.test(openSrc), 'архив: товч байна');
  ok(/setProductArchived\(p\.sku, true\)/.test(openSrc), 'архив: archived=true болгоно');
  ok(!/DELETE.*products|method: 'DELETE'[^}]*products/.test(openSrc), 'архив: ХАТУУ устгал дуудахгүй');
  ok(/showConfirm/.test(openSrc), 'архив: баталгаажуулалт асууна');

  // Сэргээх зам ЗААВАЛ байх — буцаах аргагүй устгал аюултай
  ok(/loadArchivedProducts/.test(src), 'архив: архивласныг татах функц байна');
  ok(/archived=eq\.true/.test(src), 'архив: архивласныг тусад нь татна (жагсаалт eq.false шүүдэг)');
  ok(/data-unarch/.test(src), 'архив: сэргээх товч байна');
  ok(/setProductArchived\(b\.dataset\.unarch, false\)/.test(src), 'архив: сэргээхэд archived=false');
}


// ── ТАЙЛАНГИЙН АНГИЛАЛ — толиор тулгах (2026-09-07) ─────────────────────────
// Бодит алдаа: «Хиймэл зүлэг 100 м²»-ийн ангиллыг «Засал, тохижилт» болгож зассан
// боловч тайланд «Хөгжөөнт тоглоом» хэвээр байв. Шалтгаан: захиалгын мөрийн нэр
// («Хиймэл зүлэг 100m2») каталогийн нэртэй таарахгүй тул түлхүүр үгээр таамагладаг,
// тэр жагсаалтад `зүлэг` нь ТОГЛООМ гэж бүртгэлтэй байсан. 280 мөрийн 56% ингэж
// таамаглалаар ангилагдаж байсныг хэмжив.
{
  const prods = [
    { sku: 'M-054', name: 'Хиймэл зүлэг 100 м²', category: 'Засал, тохижилт' },
    { sku: 'M-165', name: 'Тайз (1,2 м²)',       category: 'Тайз' },
  ];

  // (а) Толгүй үед — нэр таарахгүй тул таамаглана
  const noAlias = F._histCatResolver(prods, {});
  eq(noAlias('', 'Хиймэл зүлэг 100m2'), 'Засал, тохижилт',
     'ангилал: зүлэг ТОГЛООМ биш тохижилт (түлхүүр үг засварласан)');
  eq(noAlias.stats.guess, 1, 'ангилал: таамаг тоологдов');

  // (б) Толь байвал — хүн баталгаажуулсан зураглал ялна
  const withAlias = F._histCatResolver(prods, { 'name:хиймэлзлэг100м2': 'M-054' });
  const got = withAlias('', 'Хиймэл зүлэг 100m2');
  ok(got === 'Засал, тохижилт', 'ангилал: толиор зөв ангилал олдов — ' + got);
  eq(withAlias.stats.alias, 1, 'ангилал: толиор тодорхойлсон нь тоологдов');
  eq(withAlias.stats.guess, 0, 'ангилал: толь байвал таамаглахгүй');

  // (в) SKU шууд таарвал толь ч хэрэггүй
  const r3 = F._histCatResolver(prods, {});
  eq(r3('M-165', 'ямар ч нэр'), 'Тайз', 'ангилал: SKU шууд ялна');
  eq(r3.stats.exact, 1, 'ангилал: шууд таарсан нь тоологдов');

  // (г) Огт танигдахгүй бол «Бусад», тоологдоно
  const r4 = F._histCatResolver(prods, {});
  eq(r4('', 'зузаан юмны нэр'), 'Бусад', 'ангилал: танихгүй → Бусад');
  eq(r4.stats.none, 1, 'ангилал: танигдаагүй нь тоологдов');

  // (д) Толь ХООСОН sku заасан (=«бараа биш») бол таамаг руу унахгүй байх
  const r5 = F._histCatResolver(prods, { 'sku:xyz': '' });
  ok(typeof r5('xyz', 'НӨАТ') === 'string', 'ангилал: хоосон толь унахгүй');

  // (е) Хоосон оролт
  const r6 = F._histCatResolver(null, null);
  eq(r6('', ''), 'Бусад', 'ангилал: хоосон оролт унахгүй');
}

// SCAN — тайлангийн ангилал ТОЛИЙГ ашиглана (2026-09-07)
// Толь бол хүн баталгаажуулсан цорын ганц найдвартай зураглал. Түүнийг алгасвал
// бараа нэрээ соливол тайлан чимээгүй буруу бүлэглэнэ.
{
  const src = fs.readFileSync(path.join(__dirname, '..', 'app.js'), 'utf8');
  const fn = src.slice(src.indexOf('function _histCatResolver('));
  const body = fn.slice(0, fn.indexOf('\nfunction '));
  ok(/aliases/.test(body), 'scan: _histCatResolver толь хүлээж авна');
  ok(/normItemKey/.test(body), 'scan: толийн түлхүүр normItemKey-ээр (resolveItemSku-тэй нэг)');
  ok(/stats/.test(body), 'scan: таамаглалын тоог гаргана (чимээгүй буруу ангилахгүй)');
  // Бараа зассаны дараа тайлангийн кэш хүчингүй болох ёстой
  const sp = src.slice(src.indexOf('async function saveProduct('));
  ok(/state\.history = null/.test(sp.slice(0, 6000)),
     'scan: saveProduct тайлангийн кэшийг хүчингүй болгоно');
  // `зүлэг` тоглоомын түлхүүр үгэнд БУЦАЖ ОРОХГҮЙ
  const kw = src.slice(src.indexOf('const _HIST_CAT_KW'), src.indexOf('function _histNormAgg'));
  const toyLine = kw.split('\n').find(l => /Хөгжөөнт тоглоом/.test(l)) || '';
  ok(!/зүлэг/.test(toyLine), 'scan: зүлэг нь тоглоомын түлхүүр үгэнд байхгүй');
}


// ── productOf нь ТОЛИЙГ ашиглана (2026-09-07) ───────────────────────────────
// Нөөцийн сул үлдэгдэл (bookedQtyForRange), ROI (productUtilization), барааны
// орлого (meventIncome) БҮГД productOf-оор явдаг. Бараа нэрээ соливол хуучин
// захиалгын мөр таслагдаж: нөөц эзлэхгүй → ДАВХАР ЗАХИАЛГА, ROI/орлого дутуу.
// 2026-09-02-нд яг ийм нүх үүсч зассан. Одоо толь нөөцлөлт болно.
{
  const runIn = (code) => vm.runInContext(code, sandbox);
  const save = runIn('[state.products, state.itemAliases]');
  runIn("state.products = [{ id:'M-054', sku:'M-054', name:'Хиймэл зүлэг 100 м²', stock:6 }];");
  runIn("state._pidx = null; state._productsStamp = (state._productsStamp||0)+1;");

  // (а) Толгүй бол хуучин нэртэй мөр ОЛДОХГҮЙ — энэ л алдааны эх сурвалж
  runIn("state.itemAliases = {};");
  const noAl = runIn('productOf')({ sku: '', name: 'Хиймэл зүлэг 100m2' });
  ok(!noAl, 'productOf: толгүй үед хуучин нэр олдохгүй (алдааны эх)');

  // (б) Толь байвал олдоно
  runIn("state.itemAliases = { 'name:хиймэлзлэг100м2': 'M-054' };");
  const withAl = runIn('productOf')({ sku: '', name: 'Хиймэл зүлэг 100m2' });
  ok(withAl && withAl.sku === 'M-054', 'productOf: толиор хуучин нэр олдов');

  // (в) sku-гаар толь
  runIn("state.itemAliases = { 'sku:old-123': 'M-054' };");
  const bySku = runIn('productOf')({ sku: 'OLD-123', name: 'огт өөр нэр' });
  ok(bySku && bySku.sku === 'M-054', 'productOf: sku толиор олдов (том/жижиг үсэг хамаарахгүй)');

  // (г) Толинд «бараа биш» (хоосон sku) гэж тэмдэглэснийг бараа болгож БУЦААХГҮЙ
  runIn("state.itemAliases = { 'sku:dlv': '' };");
  ok(!runIn('productOf')({ sku: 'DLV', name: 'Хүргэлт' }), 'productOf: «бараа биш» толь бараа буцаахгүй');

  // (д) Шууд таарвал толь хэрэггүй
  runIn("state.itemAliases = {};");
  ok(runIn('productOf')({ sku: 'M-054', name: '' }).sku === 'M-054', 'productOf: шууд sku ялна');
  ok(!runIn('productOf')(null), 'productOf: хоосон оролт унахгүй');

  runIn('state.products = ' + JSON.stringify(save[0] || []) + '; state.itemAliases = ' + JSON.stringify(save[1] || {}) + ';');
  runIn("state._pidx = null;");
}

// SCAN — productOf толийг алгасаж БОЛОХГҮЙ (2026-09-07)
{
  const src = fs.readFileSync(path.join(__dirname, '..', 'app.js'), 'utf8');
  const fn = src.slice(src.indexOf('function productOf('));
  const body = fn.slice(0, fn.indexOf('\n}') + 2);
  ok(/resolveItemSku/.test(body), 'scan: productOf толиор нөөцлөнө (resolveItemSku)');
  ok(/r\.sku/.test(body), "scan: productOf «бараа биш» толийг шүүнэ");
  // Толь эрт ачаалагдана — зөвхөн агуулахын дэлгэцээс хамаарахгүй
  const boot = src.indexOf("loadVatReceipts();    // НӨАТ баримт");
  ok(boot > 0 && /loadItemAliases\(\);/.test(src.slice(boot, boot + 700)),
     'scan: барааны толь эхлэхэд ачаалагдана');
}


// ── БАГЦЫН ОРЛОГО ЗАДЛАЛТ (2026-09-07) ─────────────────────────────────────
// Багцын бүтэн дүн багцын нэр дээр сууж, бодит хөрөнгө (майхан, ор, зуух, чанга
// яригч) 0₮ харагддаг байв. Амьд датаар 22.5 сая₮ ингэж тархаагүй.
// ⚠ Хуваалт нь ҮНЭЭР жигнэнэ (өртгөөр БИШ) ба нийлбэр нь мөрийн орлоготой ЯГ
//   тэнцэнэ — эс бөгөөс «түүхийн нийт орлого = жагсаалтын борлуулалт» унана.
{
  const bySku = {
    'M-089': { sku: 'M-089', name: 'Өвлийн майхан 6-8 хүний', price: 132000 },
    'M-064': { sku: 'M-064', name: 'Аяны ор',                 price: 27500 },
    'M-060': { sku: 'M-060', name: 'Аяны зуух',               price: 44000 },
  };
  const pkg = { sku: 'M-328', name: 'Өвлийн майхан багц', type: 'package',
    bundle_items: [{ sku: 'M-089', qty: 1 }, { sku: 'M-064', qty: 4 }, { sku: 'M-060', qty: 1 }] };

  // Бодит жишээ: 390,000₮ (3 хоногийн багц) → 180,000 / 150,000 / 60,000
  const r = F.packageSplit(pkg, bySku, 1, 390000);
  eq(r.map(x => x.name), ['Өвлийн майхан 6-8 хүний', 'Аяны ор', 'Аяны зуух'], 'багц: бүрэлдэхүүн дараалал');
  eq(r.map(x => x.revenue), [180000, 150000, 60000], 'багц: үнээр жигнэсэн хуваарилалт');
  eq(r.reduce((a2, x) => a2 + x.revenue, 0), 390000, 'багц: нийлбэр ЯГ тэнцэнэ');
  eq(r.map(x => x.qty), [1, 4, 1], 'багц: бүрэлдэхүүний тоо');

  // Мөрийн тоо ширхэг үржинэ
  const r2 = F.packageSplit(pkg, bySku, 2, 780000);
  eq(r2.map(x => x.qty), [2, 8, 2], 'багц: 2 багц = бүрэлдэхүүн 2 дахин');
  eq(r2.reduce((a2, x) => a2 + x.revenue, 0), 780000, 'багц: 2 багцын нийлбэр тэнцэнэ');

  // Бутархай гарах дүн — үлдэгдэл алдагдахгүй
  for (const v of [1, 7, 999, 100001, 333333]) {
    const rr = F.packageSplit(pkg, bySku, 1, v);
    eq(rr.reduce((a2, x) => a2 + x.revenue, 0), v, 'багц: ' + v + '₮ нийлбэр тэнцэнэ (бөөрөнхийлөлт алдагдахгүй)');
  }

  // Бүрэлдэхүүн бүр үнэгүй бол тоогоор жигнэнэ (бүгд 0 болохгүй)
  const free = { 'A': { sku: 'A', name: 'A', price: 0 }, 'B': { sku: 'B', name: 'B', price: 0 } };
  const pf = { bundle_items: [{ sku: 'A', qty: 1 }, { sku: 'B', qty: 3 }] };
  const rf = F.packageSplit(pf, free, 1, 400000);
  eq(rf.reduce((a2, x) => a2 + x.revenue, 0), 400000, 'багц: үнэгүй бүрэлдэхүүн — нийлбэр тэнцэнэ');
  ok(rf[1].revenue > rf[0].revenue, 'багц: үнэгүй үед тоо ширхэгээр жигнэнэ');

  // Каталогт байхгүй бүрэлдэхүүн — sku нэрээр, жин 0
  const rm = F.packageSplit({ bundle_items: [{ sku: 'M-089', qty: 1 }, { sku: 'ALGA', qty: 1 }] }, bySku, 1, 100000);
  eq(rm.map(x => x.name), ['Өвлийн майхан 6-8 хүний', 'ALGA'], 'багц: олдоогүй бүрэлдэхүүн sku-гаараа');
  eq(rm.reduce((a2, x) => a2 + x.revenue, 0), 100000, 'багц: олдоогүй байсан ч нийлбэр тэнцэнэ');

  eq(F.packageSplit({ bundle_items: [] }, bySku, 1, 100), null, 'багц: бүрэлдэхүүнгүй → задлахгүй');
  eq(F.packageSplit(null, null, 1, 100), null, 'багц: хоосон оролт унахгүй');
}

// ── БАГЦ = бүтээгдэхүүн БИШ: үнийн шинжилгээнд мөр болж гарахгүй (2026-09-09)
// Багц нь өөрийн өртөг/хөрөнгөгүй тул ROI/эргэлт утгагүй; орлого нь бүрэлдэхүүн
// рүү задарсан байх ёстой. Багц мөр болж үлдвэл орлого ДАВХАР тоологдоно.
{
  const prods = [
    { sku: 'M-089', code: 'M-089', name: 'Өвлийн майхан', price: 132000, cost: 500000, stock: 10, qty_mevent: 10 },
    { sku: 'M-064', code: 'M-064', name: 'Аяны ор',       price: 27500,  cost: 90000,  stock: 40, qty_mevent: 40 },
    { sku: 'M-328', code: 'M-328', name: 'Өвлийн багц',   price: 390000, cost: 0, stock: 10, qty_mevent: 10,
      type: 'package', bundle_items: [{ sku: 'M-089', qty: 1 }, { sku: 'M-064', qty: 4 }] },
  ];
  const ctx = { aliases: {}, byName: {}, bySku: { 'M-089': { sku: 'M-089' }, 'M-064': { sku: 'M-064' }, 'M-328': { sku: 'M-328' } } };
  const orders = [{ number: 1, status: 'confirmed', starts_at: '2026-03-01', stops_at: '2026-03-02',
    total_mnt: 390000, items: [{ sku: 'M-328', name: 'Өвлийн багц', qty: 1, price: 390000 }] }];
  const st = F.pricingStats(orders, prods, { from: '2026-01-01', to: '2026-12-31', ctx });
  const bySku = {}; st.rows.forEach(r => { bySku[r.sku] = r; });
  eq(bySku['M-328'], undefined, 'багц: үнийн шинжилгээнд мөр болж ГАРАХГҮЙ');
  eq(Math.round(bySku['M-089'].revenue + bySku['M-064'].revenue), 390000,
     'багц: орлого бүрэлдэхүүн рүү бүтнээрээ шилжинэ');
  eq(bySku['M-089'].qty, 1, 'багц: майхны тоо');
  eq(bySku['M-064'].qty, 4, 'багц: орны тоо (4 × 1 багц)');
  eq(Math.round(st.totals.revenue), 390000, 'багц: нийт орлого давхардахгүй');
  ok(bySku['M-089'].roi > 0, 'багц: бүрэлдэхүүн ROI-тай болно');
  // Багц ORDER-т орсон ч түүний өртөг хөрөнгөд нэмэгдэхгүй
  eq(st.totals.capital, 500000 * 10 + 90000 * 40, 'багц: хөрөнгөд өөрийн мөр нэмэхгүй');
}

// ── SCAN: bqOrderCard дотор хувьсагчийг ЗАРЛАХААС ӨМНӨ ашиглахгүй (2026-09-10)
// `const _cardMoney` нь түүнийг ашигладаг `_depAccts`-ийн ДООР бичигдсэнээс болж
// «Cannot access '_cardMoney' before initialization» гарч, M-Event захиалгын БҮХ
// дэлгэц хоосон болсон. Тест байгаагүй тул CI ногоон хэвээр merge хийгдсэн.
// bqOrderCard бол хамгийн олон гар хүрдэг функц — тиймээс тусад нь хамгаална.
{
  const start = src.indexOf('function bqOrderCard(');
  ok(start > 0, 'scan: bqOrderCard олдов');
  const body = src.slice(start, src.indexOf('\nfunction ', start + 10));
  // Тайлбар мөрүүдийг хасна — тайлбарт дурдсан нэр «ашиглалт» биш.
  const clean = body.split('\n').map(l => l.replace(/\/\/.*$/, '')).join('\n');
  const decl = /(?:^|\n)\s*(?:const|let)\s+(_[A-Za-z0-9]+)\s*=/g;
  const bad = [];
  let m;
  while ((m = decl.exec(clean)) !== null) {
    const name = m[1];
    const at = m.index + m[0].indexOf(name);
    const first = clean.search(new RegExp('\\b' + name + '\\b'));
    if (first >= 0 && first < at) bad.push(name);
  }
  eq(bad.length, 0, 'scan: bqOrderCard — зарлахаас өмнө ашигласан хувьсагч байхгүй' +
     (bad.length ? ' → ' + bad.join(', ') : ''));
}

// ── ХЭРЭГЛЭГЧИД ЯВАХ ИМЭЙЛ: зөвхөн 3 шат (2026-09-10) ──────────────────────
// 9 шат бүрд бичвэл спам болно. Шинэ шат нэмэхээр бол ЗОРИУД шийдэх ёстой.
{
  eq(F.orderMailKind('reserved'), 'confirmed', 'имэйл: захиалга баталгаажлаа');
  eq(F.orderMailKind('delivering'), 'dispatched', 'имэйл: агуулахаас гарлаа');
  eq(F.orderMailKind('returned'), 'closed', 'имэйл: хаагдлаа');
  ['draft', 'prepared', 'ready', 'installing', 'rented', 'teardown', 'returning',
   'stopped', 'archived', 'canceled', 'deleted', '', null].forEach(st => {
    eq(F.orderMailKind(st), null, 'имэйл: «' + st + '» шатанд БИЧИХГҮЙ');
  });

  const src = fs.readFileSync(path.join(__dirname, '..', 'app.js'), 'utf8');
  // Клиент нь имэйл хаяг/бичвэр илгээвэл webhook нээлттэй спам илгээгч болно
  // (app.js нь public repo). Зөвхөн order_id + kind явна.
  const fn = src.slice(src.indexOf('function notifyCustomerMail('), src.indexOf('async function bqUpdateStatus('));
  ok(/order_id: String\(oid\), kind/.test(fn), 'scan: имэйл webhook-д зөвхөн order_id+kind явна');
  ok(!/\bemail\b|\bhtml\b|subject/i.test(fn), 'scan: имэйл хаяг/бичвэрийг клиентээс илгээхгүй');
  ok(/dataLoadFailed\('order-mail/.test(fn), 'scan: имэйл унавал чимээгүй биш, серверт мэдэгдэнэ');
  ok(!/await fetchWithTimeout\(DEFAULT_ORDER_MAIL_URL/.test(fn), 'scan: имэйл шатны шилжилтийг хүлээлгэхгүй');
}

// ── ХЭРЭГЛЭГЧИЙН ★ ҮНЭЛГЭЭ — захиалгын stage_meta.review (2026-09-10) ───────
{
  const R = o => F.orderReview(o);
  eq(R(null), null, 'үнэлгээ: хоосон захиалга');
  eq(R({}), null, 'үнэлгээ: stage_meta алга');
  eq(R({ stage_meta: {} }), null, 'үнэлгээ: review алга');
  eq(R({ stage_meta: { review: { stars: 0 } } }), null, 'үнэлгээ: 0 од = үнэлгээгүй');
  eq(R({ stage_meta: { review: { stars: 4, text: ' Сайн ', at: '2026-09-10T05:00:00' } } }),
     { stars: 4, text: 'Сайн', at: '2026-09-10' }, 'үнэлгээ: од·бичвэр·огноо');
  eq(R({ stage_meta: { review: { stars: 9 } } }).stars, 5, 'үнэлгээ: 5-аас дээш тасарна');
  eq(R({ stage_meta: { review: { stars: -3 } } }), null, 'үнэлгээ: сөрөг = үнэлгээгүй');
  // Ажилтны дотоод үнэлгээ (шатны rate) -тэй ХУТГАЛДАХГҮЙ
  eq(R({ stage_meta: { clean: { by: '99', rate: 5 } } }), null, 'үнэлгээ: шатны rate нь хэрэглэгчийнх БИШ');
}

// SCAN — тайлан ба ROI хоёулаа багцыг задлана (2026-09-07)
{
  const src = fs.readFileSync(path.join(__dirname, '..', 'app.js'), 'utf8');
  const hc = src.slice(src.indexOf('function _histCompute('));
  ok(/packageSplit\(/.test(hc.slice(0, 6000)), 'scan: _histCompute багцыг задална');
  const ui = src.slice(src.indexOf('function buildProductUtilIndex('));
  ok(/packageSplit\(/.test(ui.slice(0, 2500)), 'scan: buildProductUtilIndex багцыг задална');
  // Багцын нөөц DB-д ХАДГАЛАГДАХГҮЙ — бүрэлдэхүүнээс тухайн агшинд бодогдоно.
  // Хадгалсан хуулбар бүрэлдэхүүн өөрчлөгдөхөд хоцорч, байхгүй багц зарагдана.
  ok(/stock: isPkg \? 0 :/.test(src), 'scan: багцын нөөц хадгалагдахгүй (0)');
  ok(!/stock: isPkg \? packageStock\(/.test(src), 'scan: багцын нөөцийн snapshot бичихгүй');
  const ps = src.slice(src.indexOf('function pricingStats('));
  ok(/packageSplit\(/.test(ps.slice(0, 3000)), 'scan: pricingStats багцыг задална');
  ok(/'service', 'asset', 'package'/.test(ps.slice(0, 4000)), 'scan: pricingStats багцыг мөрөөс хасна');
  const mi = src.slice(src.indexOf('function meventIncome('));
  ok(/packageSplit\(/.test(mi.slice(0, 2500)), 'scan: meventIncome багцыг задална');
  // Багц задлахад бүрэлдэхүүний ҮНЭ хэрэгтэй — loadHistory татаж байх ёстой
  const lh = src.slice(src.indexOf('async function loadHistory('));
  ok(/select=sku,name,category,price,type,bundle_items/.test(lh.slice(0, 4000)),
     'scan: loadHistory багцын үнэ/бүрэлдэхүүнийг татна');
}


// ── ROI ӨРТӨГ: амьд каталог > хуучин snapshot (2026-09-07) ─────────────────
// `rh_roi_fix` бол 2026 эхний snapshot бөгөөд ЭВДЭРСЭН: bySku-гийн түлхүүр нь SKU
// биш МӨРИЙН ДУГААР ('0','1','2'…) тул тоон sku-тай мөрд САНАМСАРГҮЙ өртөг
// оногдоно (амьд датаар 103 мөр). byName-ийн 240 нэрийн 118 нь л таарна, таарсан
// нь ч зөрнө (Урт модон сандал: амьд 200,000 vs snapshot 2,000,000 — 10 дахин).
// Тиймээс products.cost × products.stock ЭХЛЭЭД, snapshot зөвхөн нөөц.
{
  const runIn = (code) => vm.runInContext(code, sandbox);
  const orders = [{ id: 'o1', number: 1, source: 'app', status: 'done',
    starts_at: '2026-05-01', stops_at: '2026-05-02', total_mnt: 400000, paid_mnt: 400000,
    items: [{ sku: '2', name: 'Урт модон сандал', qty: 1, price: 400000 }] }];
  const bySku = { 'M-500': { sku: 'M-500', name: 'Урт модон сандал', category: 'Ширээ, сандал, бүтээлэг', price: 400000, cost: 200000, stock: 13 } };
  const resolveItem = () => ({ sku: 'M-500', name: 'Урт модон сандал' });
  const catOf = () => 'Ширээ, сандал, бүтээлэг';
  // Хог snapshot: түлхүүр '2' (мөрийн дугаар) + 10 дахин том өртөг
  const rfix = { bySku: { '2': { c: 2000000, o: 1 } }, byName: {} };

  const comp = runIn('_histCompute')(orders, rfix, catOf, resolveItem, bySku);
  const row = (comp.products || []).find(r => r.product === 'Урт модон сандал');
  ok(!!row, 'ROI: бүлэг үүсэв');
  eq(row.unit_cost_mnt, 200000, 'ROI: АМЬД өртөг ялна (snapshot-ын 2,000,000 БИШ)');
  eq(row.owned_qty, 13, 'ROI: амьд нөөц ялна (snapshot-ын 1 БИШ)');
  eq(row.total_cost_mnt, 2600000, 'ROI: хөрөнгө = 200,000 × 13');
  eq(row.cost_src, 'live', 'ROI: эх сурвалж = амьд');

  // Амьд өртөг байхгүй бол snapshot руу унана
  const noCost = { 'M-500': { sku: 'M-500', name: 'Урт модон сандал', cost: 0, stock: 13 } };
  const r2 = runIn('_histCompute')(orders, { bySku: {}, byName: { 'урт модон сандал': { c: 150000, o: 4 } } },
                                   catOf, resolveItem, noCost);
  const row2 = (r2.products || []).find(r => r.product === 'Урт модон сандал');
  eq(row2.unit_cost_mnt, 150000, 'ROI: өртөггүй бол snapshot нөөц болно');
  eq(row2.cost_src, 'snapshot', 'ROI: эх сурвалж = snapshot');

  // Хоёулаа байхгүй бол «өртөг ?» (ROI бодохгүй)
  const r3 = runIn('_histCompute')(orders, { bySku: {}, byName: {} }, catOf, resolveItem, noCost);
  const row3 = (r3.products || []).find(r => r.product === 'Урт модон сандал');
  eq(row3.total_cost_mnt, 0, 'ROI: өртөг мэдэгдэхгүй бол 0');
  eq(row3.roi_x, null, 'ROI: өртөггүй бол ROI бодохгүй');
}

// SCAN — ROI өртөг амьд каталогоос (2026-09-07)
{
  const src = fs.readFileSync(path.join(__dirname, '..', 'app.js'), 'utf8');
  const fin = src.slice(src.indexOf('const finalize = (obj)'));
  const body = fin.slice(0, 2200);
  ok(/liveP.*cost|CAT\[String\(p\.rsku\)\]/.test(body), 'scan: ROI амьд каталогийн өртгийг эхлээд харна');
  ok(/!live && !fx && rfix\.byName/.test(body), 'scan: snapshot зөвхөн амьд өртөггүй үед');
  const lh = src.slice(src.indexOf('async function loadHistory('));
  ok(/bundle_items,cost,stock/.test(lh.slice(0, 4000)), 'scan: loadHistory амьд өртөг/нөөцийг татна');
}


// ── ТҮҮХИЙН ХУГАЦААНЫ ШҮҮЛТ (2026-09-07) ───────────────────────────────────
// Тайлан зөвхөн БҮХ цаг үеийг харуулдаг байсныг өдрийн мужаар шүүдэг болгов.
// Захиалга санах ойд байгаа тул дахин ТАТАХГҮЙ — `_histCompute`-ыг шүүсэн
// олонлог дээр дахин ажиллуулна.
{
  const ord = (n, d) => ({ id: 'o' + n, number: n, source: 'app', status: 'done',
    starts_at: d, stops_at: d, total_mnt: 100000, paid_mnt: 100000,
    items: [{ sku: 'M-1', name: 'Ширээ', qty: 1, price: 100000 }] });
  const orders = [ord(1, '2026-01-05'), ord(2, '2026-03-10'), ord(3, '2026-06-20'), ord(4, '2026-09-01')];

  const days = F.histDayList(orders);
  eq(days[0], '2026-01-05', 'хугацаа: эхний өдөр');
  eq(days[days.length - 1], '2026-09-01', 'хугацаа: сүүлийн өдөр');
  eq(days.length, 240, 'хугацаа: тасралтгүй өдрийн жагсаалт');

  // Бүтэн муж — бүх захиалга
  eq(F.histFilterOrders(orders, days, 0, days.length - 1).length, 4, 'шүүлт: бүтэн муж = бүгд');
  // Эхний хагас
  const half = days.indexOf('2026-05-01');
  eq(F.histFilterOrders(orders, days, 0, half).map(o => o.number), [1, 2], 'шүүлт: 5-р сар хүртэл 2 захиалга');
  // Нэг өдөр
  const d3 = days.indexOf('2026-06-20');
  eq(F.histFilterOrders(orders, days, d3, d3).map(o => o.number), [3], 'шүүлт: ганц өдөр');
  // Захиалгагүй муж
  const e1 = days.indexOf('2026-07-01'), e2 = days.indexOf('2026-08-01');
  eq(F.histFilterOrders(orders, days, e1, e2).length, 0, 'шүүлт: захиалгагүй муж хоосон');

  // Огноогүй захиалга — шүүлт идэвхтэй үед ХАСАГДАНА (чимээгүй нэмэгдэхгүй)
  const withNull = orders.concat([{ id: 'ox', number: 9, status: 'done', starts_at: '', items: [] }]);
  eq(F.histFilterOrders(withNull, days, 0, half).map(o => o.number), [1, 2], 'шүүлт: огноогүй захиалга орохгүй');
  eq(F.histFilterOrders(withNull, days, 0, days.length - 1).length, 5, 'шүүлт: бүтэн мужид огноогүй ч үлдэнэ');

  // Хоосон оролт
  eq(F.histDayList([]).length, 0, 'хугацаа: захиалгагүй бол хоосон');
  eq(F.histFilterOrders(orders, [], 0, 0).length, 4, 'шүүлт: өдрийн жагсаалт хоосон бол шүүхгүй');

  // Шүүсний дараа орлого зөв дахин тооцоологдоно
  const resolveItem = () => ({ sku: 'M-1', name: 'Ширээ' });
  const c1 = F._histCompute(orders, null, () => 'Ширээ, сандал, бүтээлэг', resolveItem, {});
  const c2 = F._histCompute(F.histFilterOrders(orders, days, 0, half), null, () => 'Ширээ, сандал, бүтээлэг', resolveItem, {});
  eq(c1.summary.net_revenue_mnt, 400000, 'шүүлт: бүтэн үеийн орлого');
  eq(c2.summary.net_revenue_mnt, 200000, 'шүүлт: шүүсний дараа орлого хагасална');
}

// SCAN — хугацааны шүүлт дахин ТАТАХГҮЙ (2026-09-07)
{
  const src = fs.readFileSync(path.join(__dirname, '..', 'app.js'), 'utf8');
  const hv = src.slice(src.indexOf('function histView('));
  const body = hv.slice(0, hv.indexOf('\nfunction '));
  ok(/_histCompute\(sub/.test(body), 'scan: шүүлт санах ойн захиалгаар дахин тооцоолно');
  ok(!/fetch|loadHistory\(/.test(body), 'scan: шүүлт дахин ТАТАХГҮЙ (сүлжээ дуудахгүй)');
  ok(/_fns/.test(src.slice(src.indexOf('async function loadHistory('), src.indexOf('async function loadHistory(') + 5000)),
     'scan: loadHistory шийдэгчдийг хадгална (дахин тооцоолоход)');
}


// ── АГУУЛАХЫН ХӨРӨНГӨ (2026-09-07) ─────────────────────────────────────────
// «Хөрөнгийн нөхөлт» нь ТҮРЭЭСЛЭГДСЭН барааны жагсаалтаас тооцогддог байв тул
// хэзээ ч түрээслэгдээгүй хөрөнгө огт харагдахгүй → нөхөлтийн хувь хиймлээр
// өндөр. Амьд датаар M-Event 943.7 сая₮ байхад тайлан 636.6 сая гэж харуулж байв.
{
  const prods = [
    { sku: 'A', name: 'Ширээ',   cost: 100000, stock: 10, qty_mevent: 6, qty_nomaad: 4 },
    { sku: 'B', name: 'Сандал',  cost: 20000,  stock: 100, qty_mevent: 100, qty_nomaad: 0 },
    { sku: 'C', name: 'Өртөггүй', cost: 0,     stock: 5,  qty_mevent: 5,   qty_nomaad: 0 },
    { sku: 'D', name: 'Архивласан', cost: 999999, stock: 9, qty_mevent: 9, archived: true },
    { sku: 'E', name: 'Үйлчилгээ', type: 'service', cost: 50000, stock: 3, qty_mevent: 3 },
    { sku: 'F', name: 'Багц', type: 'package', cost: 70000, stock: 2, qty_mevent: 2 },
  ];

  const all = F.warehouseCapital(prods, null);
  eq(all.capital, 100000 * 10 + 20000 * 100, 'хөрөнгө: нийт нөөцөөр (100к×10 + 20к×100)');
  eq(all.withCost, 2, 'хөрөнгө: өртөгтэй бараа 2');
  eq(all.noCost, 1, 'хөрөнгө: өртөггүй бараа тоологдоно');

  const mev = F.warehouseCapital(prods, 'mevent');
  eq(mev.capital, 100000 * 6 + 20000 * 100, 'хөрөнгө: M-Event салбарын тоогоор');
  const nom = F.warehouseCapital(prods, 'nomaad');
  eq(nom.capital, 100000 * 4, 'хөрөнгө: NOMAAD салбарын тоогоор');

  // Хасагдах ёстой: архивласан · үйлчилгээ · багц (бүрэлдэхүүнээ давхар тоолно)
  eq(F.warehouseCapital([prods[3]], null).capital, 0, 'хөрөнгө: архивласан бараа ОРОХГҮЙ');
  eq(F.warehouseCapital([prods[4]], null).capital, 0, 'хөрөнгө: үйлчилгээ орохгүй');
  eq(F.warehouseCapital([prods[5]], null).capital, 0, 'хөрөнгө: багц орохгүй (давхар тооллого)');

  // Тухайн салбарт нөөцгүй бараа орохгүй
  eq(F.warehouseCapital([{ sku: 'X', cost: 5000, stock: 9, qty_mevent: 0 }], 'mevent').capital, 0,
     'хөрөнгө: салбарт хуваарилаагүй бараа орохгүй');
  eq(F.warehouseCapital(null, null).capital, 0, 'хөрөнгө: хоосон оролт унахгүй');
}

// SCAN — хөрөнгө КАТАЛОГООС тооцогдоно, ROI жагсаалтаас БИШ (2026-09-07)
{
  const src = fs.readFileSync(path.join(__dirname, '..', 'app.js'), 'utf8');
  const i = src.indexOf('const _lens = (typeof effectiveBranchLens');
  const seg = src.slice(i, i + 900);
  ok(/warehouseCapital\(state\.products/.test(seg), 'scan: хөрөнгө каталогоос тооцогдоно');
  ok(!/const invest = costed\.reduce/.test(seg), 'scan: ROI жагсаалтаас тооцохоо больсон');
  const rh = src.slice(src.indexOf('function renderHistory('));
  ok(/loadProductsCatalog/.test(rh.slice(0, 600)), 'scan: тайлан каталогийг ачаална (хөрөнгө 0 болохгүй)');
}

// ── ИРЦИЙН ХҮСЭЛТ — ажилтан өөрөө мэдүүлнэ (2026-09-09) ─────────────────────
// Удирдлага л засаж чаддаг байсан тул ажилтан хэлэхээ мартвал тэр өдөр 0 цаг
// үлддэг байв. Одоо хүсэлт гаргаж, удирдлага батална.
{
  const T = '2026-09-09';
  const okReq = { day: '2026-09-05', inTime: '09:00', outTime: '18:00' };

  // Огт бүртгэлгүй өдөр — ирсэн ба явсан цаг хоёуланг авна
  const v = F.attReqValidate(okReq, T);
  ok(v.ok, 'хүсэлт: бүрэн өдөр зөвшөөрнө');
  eq(v.mins, 540, 'хүсэлт: 09:00→18:00 = 9 цаг');
  ok(v.newIn === true, 'хүсэлт: ирсэн бүртгэлгүй бол шинэ «in» үүснэ');

  // Ирсэн нь бүртгэгдсэн бол зөвхөн явсан цаг
  const inTs = F.attManualOutTs('2026-09-05', '09:00');
  const v2 = F.attReqValidate({ day: '2026-09-05', outTime: '18:00', existingInTs: inTs }, T);
  ok(v2.ok && v2.newIn === false, 'хүсэлт: ирсэн бүртгэлтэй бол «in» дахин үүсгэхгүй');
  eq(v2.mins, 540, 'хүсэлт: байгаа ирсэн цагаас тооцно');

  // Шөнийн ээлж — явсан цаг ирсэнээс өмнө бол МАРГААШИЙНХ
  const v3 = F.attReqValidate({ day: '2026-09-05', inTime: '18:41', outTime: '02:00' }, T);
  ok(v3.ok && v3.nextDay === true, 'хүсэлт: 18:41→02:00 = шөнийн ээлж, маргаашийн гарц');
  eq(v3.mins, 439, 'хүсэлт: шөнийн ээлжийн минут');

  // Хил хязгаар
  ok(!F.attReqValidate({ day: '2026-09-10', inTime: '09:00', outTime: '18:00' }, T).ok, 'хүсэлт: ирээдүйн өдөр болохгүй');
  ok(!F.attReqValidate({ day: '2026-06-01', inTime: '09:00', outTime: '18:00' }, T).ok, 'хүсэлт: 45 хоногоос хуучин болохгүй');
  ok(F.attReqValidate({ day: '2026-09-09', inTime: '09:00', outTime: '18:00' }, T).ok, 'хүсэлт: өнөөдөр зөвшөөрнө');
  ok(!F.attReqValidate({ day: '', inTime: '09:00', outTime: '18:00' }, T).ok, 'хүсэлт: огноогүй болохгүй');
  ok(!F.attReqValidate({ day: '2026-09-05', outTime: '18:00' }, T).ok, 'хүсэлт: ирсэн цаггүй, бүртгэл ч байхгүй → болохгүй');
  ok(!F.attReqValidate({ day: '2026-09-05', inTime: '09:00', outTime: '' }, T).ok, 'хүсэлт: явсан цаггүй болохгүй');
  ok(!F.attReqValidate({ day: '2026-09-05', inTime: '09:00', outTime: '08:30' }, T).ok, 'хүсэлт: 23.5 цаг = хэт урт, болохгүй');

  // Түлхүүр = утас|өдөр (нэг өдөрт нэг хүсэлт)
  eq(F.attReqKey('9911-2233', '2026-09-05'), '99112233|2026-09-05', 'хүсэлт: түлхүүр утасны цифр + өдөр');
  eq(F.attReqKey('99112233', '2026-09-05'), F.attReqKey('9911 2233', '2026-09-05'), 'хүсэлт: утасны формат түлхүүрт нөлөөлөхгүй');

  // Батлах шалгалт нь хүсэлт дотор хадгалсан inTs-ээс тооцно (сервер рүү дахин хандахгүй)
  const stored = { day: '2026-09-05', newIn: false, inTs, inTime: '09:00', outTime: '18:00' };
  const av = F.attReqApprovalCheck(stored);
  ok(av.ok && av.newIn === false && av.mins === 540, 'батлах: хадгалсан inTs-ээр тооцно, «in» давхардуулахгүй');
  const stored2 = { day: '2026-09-05', newIn: true, inTime: '09:00', outTime: '18:00' };
  ok(F.attReqApprovalCheck(stored2).newIn === true, 'батлах: бүртгэлгүй өдөрт «in» бичлэг үүснэ');

  // Хусалт — ХҮЛЭЭГДЭЖ БУЙГ хэзээ ч хасахгүй (хариу аваагүй хүсэлт алга болбол хамгийн муу)
  const map = {
    'a|2026-01-01': { day: '2026-01-01', status: 'pending' },
    'b|2026-01-01': { day: '2026-01-01', status: 'approved' },
    'c|2026-09-01': { day: '2026-09-01', status: 'approved' },
  };
  const pruned = F.attReqPrune(map, T);
  ok(pruned['a|2026-01-01'], 'хусалт: хуучин ч ХҮЛЭЭГДЭЖ буй хүсэлт үлдэнэ');
  ok(!pruned['b|2026-01-01'], 'хусалт: 120 хоногоос хуучин шийдэгдсэн хүсэлт хасагдана');
  ok(pruned['c|2026-09-01'], 'хусалт: саяхны хүсэлт үлдэнэ');
  eq(F.attReqPrune(null, T), {}, 'хусалт: хоосон оролт → хоосон');
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

// ── ВАЛЮТ ДАНСНЫ ХУУЛГА (Голомт USD) — ₮ рүү хөрвүүлнэ (2026-09-07) ─────────
// Компанийн долларын дансыг ₮ гэж уншиж 100 USD-г 100₮ болгож, зардлыг
// 3,600 дахин дутуу харуулж байв.
{
  const H = ['', 'Гүйлгээний огноо', 'Гүйлгээний утга', 'Харьцсан дансны нэр', 'Харьцсан данс', 'Ханш', 'Орлого', 'Зарлага'];
  const usd = [
    ['', '', '', '', '', 'Хуулганы огноо', '', '2026-09-07'],
    ['', 'Дансны дугаар', '3635181410 [USD]', 'IBAN', '', 'MN21 0015 0036 3518 1410', '', ''],
    H,
    ['', '2026-08-01T22:07:25', '420733******3313:VSA:ANTHROPIC', '', '', 1, '', 100],       // хөрвүүлэлтгүй мөр (ханш=1)
    ['', '2026-08-29T09:24:14', 'Данс хөтөлсний шимтгэл', '', '', 3595.38, '', 0.28],        // бодит ханш энд бий
    ['', '', '', 'Нийт зарлага', '', 100.28, '', ''],
  ];
  eq(F.statementCurrency(usd), 'USD', 'валют: «[USD]» тэмдэглэгээг уншина');
  const p = F.parseStatement(usd);
  eq(p.ccy, 'USD', 'валют: задлагч валютаа буцаана');
  eq(p.rows.length, 2, 'валют: 2 гүйлгээ');
  eq(p.rows[0].debit, 359538, 'валют: 100 USD → ойролцоо мөрийн ханшаар ₮ (ханш=1 мөрд ч)');
  eq(p.rows[0].fx, { ccy: 'USD', amt: 100, rate: 3595.38 }, 'валют: эх дүн + ханш үлдэнэ');
  eq(p.rows[1].debit, 1007, 'валют: шимтгэл ч хөрвүүлэгдэнэ');

  // Ханш огт байхгүй бол ТААМАГЛАХГҮЙ — мөр орохгүй, шалтгаан ил гарна
  const noRate = usd.map(r => r.slice());
  noRate[4][5] = 1;
  const p2 = F.parseStatement(noRate);
  eq(p2.rows.length, 0, 'валют: ханшгүй бол мөр ОРОХГҮЙ (буруу дүн бичихгүй)');
  ok(p2.skipped.length === 2 && /ханш/.test(p2.skipped[0].why), 'валют: шалтгаан ил бүртгэгдэнэ');

  // ₮ хуулгын УТГАД «USD» байвал валют гэж АНДУУРАХГҮЙ (3,600 дахин үрэгдэхээс хамгаална)
  const mnt = [
    ['', 'Дансны дугаар', '3635185058', 'IBAN', '', 'MN77 0015 0036 3518 5058', '', ''],
    H,
    ['', '2026-08-05', 'ХХБ ӨГЛӨГИЙН ТҮР ДАНС ВИЗА КАРТ /USD ISSUER', 'А', '5001', 1, '', 50000],
  ];
  eq(F.statementCurrency(mnt), 'MNT', 'валют: гүйлгээний утгад «USD» байхад ₮ хэвээр');
  eq(F.parseStatement(mnt).rows[0].debit, 50000, '₮: дүн үржигдэхгүй');

  // Сервер/програмын төлбөр — авто ангилал
  eq(F.classifyExpense('420733******3313:VSA:ANTHROPIC', ''), '2400', 'ангилал: ANTHROPIC → онлайн програм');
  eq(F.classifyExpense('420733******3313:VSA:GOOGLE WO', ''), '2400', 'ангилал: GOOGLE WO(rkspace) → онлайн програм');
  eq(F.classifyExpense('ЗАРЛАГА CANTABO СЕРВЕР ТӨЛБӨР', ''), '2400', 'ангилал: CANTABO сервер → онлайн програм');
}

// ── ИРЦ: ШӨНӨ ДҮЛ ХҮРТЭЛ ҮРГЭЛЖИЛСЭН ЭЭЛЖ (2026-09-07) ─────────────────────
// 18:41-д ирээд 02:00-д гарах нь эвентийн ажилд энгийн зүйл. Өмнө нь «гарсан цаг
// ирсэн цагаас хойш байх ёстой» гэж хориглодог тул тэр өдөр 0 цаг тоологдож байв.
{
  const inTs = F.attManualOutTs('2026-09-06', '18:41');   // 18:41 УБ цагаар
  ok(!!inTs, 'ирц: ирсэн цаг ISO болов');

  // ① Ижил өдрийн хожуу цаг — маргаашийнх БИШ
  const a = F.attManualOutResolve('2026-09-06', '22:00', inTs);
  eq(a.nextDay, false, 'ирц: 22:00 нь ижил өдөр');
  eq(F.attManualOutCheck(inTs, a.ts).mins, 199, 'ирц: 18:41→22:00 = 3ц19м');

  // ② Ирсэн цагаас ӨМНӨХ цаг = МАРГААШ (шөнийн ээлж)
  const b = F.attManualOutResolve('2026-09-06', '02:00', inTs);
  eq(b.nextDay, true, 'ирц: 02:00 нь МАРГААШ гэж тооцогдоно');
  ok(b.ts.slice(0, 10) === '2026-09-06' || b.ts.slice(0, 10) === '2026-09-07', 'ирц: маргаашийн ISO (UTC+8 тул огноо шилжиж болно)');
  const chk = F.attManualOutCheck(inTs, b.ts);
  ok(chk.ok === true, 'ирц: шөнийн гарц ЗӨВШӨӨРӨГДӨНӨ (өмнө хориглодог байв)');
  eq(chk.mins, 439, 'ирц: 18:41→02:00 = 7ц19м');

  // ③ Яг ирсэн цаг = маргааш (24 цаг) → 20 цагийн таазанд баригдана
  const c = F.attManualOutResolve('2026-09-06', '18:41', inTs);
  eq(c.nextDay, true, 'ирц: ижил цаг → маргааш гэж тооцно');
  ok(F.attManualOutCheck(inTs, c.ts).ok === false, 'ирц: 24 цаг = алдаа (20ц тааз)');

  // ④ 00:00 — шөнө дунд
  const d = F.attManualOutResolve('2026-09-06', '00:00', inTs);
  eq(d.nextDay, true, 'ирц: 00:00 нь маргааш');
  eq(F.attManualOutCheck(inTs, d.ts).mins, 319, 'ирц: 18:41→00:00 = 5ц19м');

  // ⑤ Өглөө ирсэн бол оройн цаг ижил өдөр хэвээр
  const morn = F.attManualOutTs('2026-09-06', '09:00');
  eq(F.attManualOutResolve('2026-09-06', '18:00', morn).nextDay, false, 'ирц: 09:00→18:00 ижил өдөр');
  eq(F.attManualOutCheck(morn, F.attManualOutResolve('2026-09-06', '18:00', morn).ts).mins, 540, 'ирц: 9 цаг');

  // ⑥ Буруу оролт
  eq(F.attManualOutResolve('2026-09-06', '', inTs).ts, '', 'ирц: цаг хоосон → хоосон');
  ok(F.attManualOutCheck(inTs, '').ok === false, 'ирц: цаггүй = алдаа');
}

// ── АСАР = 5м МОДУЛЬ (2026-09-07) ───────────────────────────────────────────
// Урт бүрийг тусдаа бараа болговол (12×20, 12×25, 18×45 …) нэг иж бүрдлийг
// нэг өдөр хоёр газар зэрэг зарж болох давхар захиалгын нүх үүсдэг.
{
  eq(F.asarSizeLabel('M-315', 5), '18×25м', 'асар: 5 модуль = 18×25м');
  eq(F.asarSizeLabel('M-315', 8), '18×40м', 'асар: 8 модуль = 18×40м (A иж бүрдлийн дээд)');
  eq(F.asarSizeLabel('M-313', 5), '12×25м', 'асар: 12м өргөн 5 модуль');
  eq(F.asarSizeLabel('M-313', 1), '12×5м', 'асар: 1 модуль');
  eq(F.asarSizeLabel('M-018', 3), '', 'асар: модуль биш бараанд хэмжээ гарахгүй');
  eq(F.asarSizeLabel('M-315', 0), '18×5м', 'асар: 0 → доод хязгаар 1 модуль');

  // Иж бүрдэл бүрийн дээд урт — өөр үйлдвэрийн профиль нийлдэггүй тул тусдаа
  eq(F.asarLengthOptions('M-315'), [10, 15, 20, 25, 30, 35, 40], 'асар: 18м A → 10м-ээс 40м хүртэл');
  eq(F.asarLengthOptions('M-312'), [10, 15, 20, 25, 30], 'асар: 18м B → 30м хүртэл (18×70 БОЛОХГҮЙ)');
  eq(F.asarLengthOptions('M-313'), [10, 15, 20, 25], 'асар: 12м A → 25м хүртэл');
  eq(F.asarLengthOptions('M-314'), [10, 15, 20, 25], 'асар: 12м B → 25м хүртэл');
  eq(F.asarLengthOptions('M-001'), [10, 15, 20], 'асар: 10м өргөн → 10м-ээс 20м хүртэл');
  // ХАМГИЙН БАГА 10 метр — нэг модуль (5м) дангаараа асар болдоггүй тул сонголтод гарахгүй
  ok(F.asarLengthOptions('M-315').every(L => L >= 10), 'асар: 5м сонголт БАЙХГҮЙ (доод хязгаар 10м)');
  eq(F.asarMinBays(5), 2, 'доод хязгаар: 5м модульд 2 модуль = 10м');
  eq(F.asarMinBays(10), 1, 'доод хязгаар: 10м модульд 1 модуль хангалттай');
  eq(F.asarSizeLabel('M-001', 4), '10×20м', 'асар: 10м өргөн 4 модуль = 10×20м');
  eq(F.asarLengthOptions('M-018'), [], 'асар: модуль биш бараанд урт сонголт байхгүй');

  eq(F.asarModuleOf('M-312'), { w: 18, mod: 5, bays: 6, set: 'B' }, 'асар: иж бүрдлийн тодорхойлолт');   // eslint-disable-line
  eq(F.asarModuleOf('байхгүй'), null, 'асар: танихгүй sku → null');
  eq(F.asarModuleOf(null), null, 'асар: sku хоосон → null (унахгүй)');

  // Үнэ модулиар — одоогийн урт бүрийн үнэтэй ЯГ таарах ёстой
  const G = (n) => vm.runInContext(n, sandbox);
  const MODP = G('ASAR_MODULE_PRODUCTS'), LEG = G('ASAR_LEGACY_SKUS'), MODS = G('ASAR_MODULES');
  const p12 = MODP.find(x => x.sku === 'M-313');
  const p18 = MODP.find(x => x.sku === 'M-315');
  // Үнэ = ТАЛБАЙГААР: 15м хүртэл 15,000₮/м², 16м-ээс дээш 20,000₮/м²
  eq(F.asarM2Rate(12), 15000, 'тариф: 12м өргөн → 15,000₮/м²');
  eq(F.asarM2Rate(15), 15000, 'тариф: 15м өргөн → 15,000₮/м² (заагийн утга)');
  eq(F.asarM2Rate(18), 20000, 'тариф: 18м өргөн → 20,000₮/м²');
  eq(F.asarM2Rate(16), 20000, 'тариф: 16м-ээс дээш → өргөн тариф');
  eq(F.asarM2Rate(0), 15000, 'тариф: утга дутуу → нарийн тариф (унахгүй)');
  eq(F.asarPriceFor(12, 25), 4500000, 'үнэ: 12×25 = 300 м² × 15,000 = 4.5 сая');
  eq(F.asarPriceFor(18, 25), 9000000, 'үнэ: 18×25 = 450 м² × 20,000 = 9 сая');
  eq(F.asarPriceFor(18, 40), 14400000, 'үнэ: 18×40 = 720 м² × 20,000 = 14.4 сая');
  eq(F.asarPriceFor(10, 20), 3000000, 'үнэ: 10×20 = 200 м² × 15,000 = 3 сая');
  eq(F.asarPriceFor(10, 5), 750000, 'үнэ: 10м модуль = 50 м² × 15,000 = 750,000₮');
  eq(F.asarPriceFor(6, 12), 1080000, 'үнэ: 6×12 = 72 м² × 15,000 = 1.08 сая');
  // Модулийн үнэ нь тарифаас гарна — гараар бичсэн тоо ҮЛДЭЭГҮЙ
  eq(p12.price, F.asarPriceFor(12, 5), 'үнэ: 12м модуль тарифаас');
  eq(p18.price, F.asarPriceFor(18, 5), 'үнэ: 18м модуль тарифаас');
  eq(p12.price * 5, 4500000, 'үнэ: 5 модуль = 12×25 = 4.5 сая');
  eq(p18.price * 8, 14400000, 'үнэ: 8 модуль = 18×40 = 14.4 сая');
  eq(p12.stock, 5, 'нөөц: 12м A = 5 модуль');
  eq(MODP.find(x => x.sku === 'M-315').stock, 8, 'нөөц: 18м A = 8 модуль');
  eq(MODP.find(x => x.sku === 'M-312').stock, 6, 'нөөц: 18м B = 6 модуль');

  // Хуучин уртын SKU-нууд нь модулийн SKU-тай ДАВХЦАХГҮЙ (өөрийгөө 0 болгохгүй)
  ok(!LEG.some(x => MODS[x]), 'цэгцлэлт: хуучин жагсаалтад модулийн sku байхгүй');
  eq(LEG.length, 19, 'цэгцлэлт: 19 хуучин уртын бүртгэл');
}

// ── АСРЫН ЦЭГЦЛЭЛТ: түүх тасрахгүй байх (2026-09-07) ───────────────────────
// Хуучин уртын бүртгэлийг АРХИВЛАВАЛ каталогоос унана (loadProductsCatalog нь
// archived=eq.false татдаг) → хуучин захиалгын мөрүүд «тулгагдаагүй» болно.
// Тиймээс архивлахын өмнө толинд (product_aliases) шинэ модуль бараа руу заана.
{
  const G = (n) => vm.runInContext(n, sandbox);
  const LEG = G('ASAR_LEGACY_SKUS'), MAP = G('ASAR_LEGACY_MAP'), MODP = G('ASAR_MODULE_PRODUCTS'), MODS = G('ASAR_MODULES');
  const modSkus = new Set(Object.keys(MODS));

  ok(LEG.every(k => MAP[k]), 'цэгцлэлт: архивлагдах бараа БҮР шинэ бараа руу зураглагдсан');
  ok(Object.values(MAP).every(v => modSkus.has(v)), 'цэгцлэлт: зураглал зөвхөн модуль бараа руу заана');
  eq(MAP['M-005'], 'M-313', 'цэгцлэлт: 12×25 → 12м A');
  eq(MAP['M-002'], 'M-314', 'цэгцлэлт: 12×10 → 12м B');
  eq(MAP['M-297'], 'M-312', 'цэгцлэлт: 18×30 → 18м B (Guyun)');
  eq(MAP['M-278'], 'M-315', 'цэгцлэлт: 18×40 → 18м A (Maisite)');

  // Гарал үүсэл, өртөг, ашиглалтын хугацаа — бүх модуль бараанд байх ёстой
  MODP.forEach(m => {
    ok(!!m.supplier && /Хятад/.test(m.supplier), `гарал үүсэл: ${m.sku} нийлүүлэгчтэй`);
    ok(/^\d{4}-\d{2}-\d{2}$/.test(m.purchase_date), `${m.sku}: худалдан авсан огноо`);
    // ⚠ M-001 (10м) — худалдан авалтын өртөг ₮-өөр бүртгэгдээгүй (гэрээнд ¥35,000).
    // Таамаглаж бичихгүй: хэрэглэгч бодит дүнг хэлэхэд оруулна.
    if (m.sku !== 'M-001') ok(m.cost > 0, `${m.sku}: нэг модулийн өртөг`);
    ok(m.photos && m.photos.length > 0, `${m.sku}: зурагтай`);
    ok(/Ашиглалтын хугацаа/.test(m.description), `${m.sku}: ашиглалтын хугацаа бичигдсэн`);
    ok(/Гарал үүсэл/.test(m.description), `${m.sku}: гарал үүсэл бичигдсэн`);
  });
  // Нийт өртөг = гэрээний дүнтэй таарна
  eq(MODP.find(m => m.sku === 'M-313').cost * 5, 35000000, 'өртөг: 12м A иж бүрдэл 35 сая');
  eq(MODP.find(m => m.sku === 'M-315').cost * 8, 82300000, 'өртөг: 18м A иж бүрдэл 82.3 сая');
}

// SCAN — модулийн SKU-г ӨӨР бараа эзэлсэн бол дарж бичихгүй (2026-09-07)
// M-309-ийг «Зүлэг 2м*25м» эзэлчихсэн байхад цэгцлэлт дарж бичих гэсэн — тэр
// бараа бүрмөсөн алдагдах байсан. Хамгаалалт нь код дотор БАЙХ ЁСТОЙ.
{
  ok(/dargaагүй|ХЭЗЭЭ Ч дарж бичихгүй/.test(src) || /clash\.push/.test(src),
    'scan: цэгцлэлт SKU мөргөлдөөнийг шалгадаг');
  ok(/!\/асар\\s\*\\d\+\\s\*м\\s\*өргөн\/i\.test\(String\(cur\.name/.test(src),
    'scan: өөр нэртэй бараатай мөргөлдвөл алгасна');
}

// ── ШИНЭ БАРААНЫ M-ДУГААР ДАВХЦАХГҮЙ (2026-09-07) ──────────────────────────
// nextProductCode нь зөвхөн `code`-оос үздэг байсан тул код нь хоосон (автоматаар
// үүсгэсэн) бараатай дугаар давхцаж, шинэ бараа хуучныг ДАРЖ БИЧСЭН:
// «Хиймэл Зүлэг» M-310-ыг авахад тэр дугаартай асрын бараа алга болов.
{
  const runIn = (code) => vm.runInContext(code, sandbox);
  const set = (arr) => { sandbox.__pp = arr; runIn('state.products = __pp;'); };
  const prev = runIn('state.products');

  set([{ sku: 'M-005', code: 'M-005' }, { sku: 'M-309', code: 'M-309' }]);
  eq(F.nextProductCode(), 'M-310', 'дугаар: хамгийн томоос нэгээр нэмнэ');

  // Кодгүй боловч sku нь M-311 бараа байхад дараагийнх нь M-312 байх ЁСТОЙ
  set([{ sku: 'M-309', code: 'M-309' }, { sku: 'M-311', code: null }]);
  eq(F.nextProductCode(), 'M-312', 'дугаар: КОДГҮЙ ч sku нь M-311 бол дарж бичихгүй');

  set([{ sku: 'M-313', code: null }, { sku: 'M-002', code: 'M-002' }]);
  eq(F.nextProductCode(), 'M-314', 'дугаар: sku-гаар хамгийн томыг олно');

  set([]);
  eq(F.nextProductCode(), 'M-001', 'дугаар: бараагүй үед M-001');
  set([{ sku: 'P-xyz', code: '' }]);
  eq(F.nextProductCode(), 'M-001', 'дугаар: M- хэлбэргүй sku нөлөөлөхгүй');

  sandbox.__pp = prev; runIn('state.products = __pp;');
}

// ── ХУУЧИН АСРЫН БҮРТГЭЛИЙГ БҮРМӨСӨН ХАСАХ — хамгаалалт (2026-09-07) ────────
// Хатуу хасалт нь буцаагдахгүй тул ЗӨВХӨН: (а) жагсаалтад байгаа sku,
// (б) хуучин захиалгын мөр тулгагдсаар үлдэхийн тулд толины зураглалтай байх.
{
  const G = (n) => vm.runInContext(n, sandbox);
  const LEG = G('ASAR_LEGACY_SKUS'), DUP = G('ASAR_ASSET_DUPES');

  const rows = [
    { sku: 'M-005', name: 'Асар 12м 12×25' },      // зураглалтай → хасна
    { sku: 'M-296', name: 'Асар 18м 18×25' },      // зураглалгүй → АЛГАСНА
    { sku: 'M-273', name: '18x30 асар (хөрөнгө)' },// хөрөнгийн давхардал → хасна
    { sku: 'M-006', name: 'асар 4×4' },            // жагсаалтад алга → хөндөхгүй
    { sku: 'M-315', name: 'Асар 18м модуль' },     // ШИНЭ бараа → хөндөхгүй
  ];
  const al = { 'sku:m-005': 'M-313' };
  const plan = F.asarPurgePlan(rows, al);
  eq(plan.go.map(p => p.sku), ['M-005', 'M-273'], 'хасалт: зөвхөн зураглалтай + хөрөнгийн давхардал');
  eq(plan.skip.map(p => p.sku), ['M-296', 'M-006', 'M-315'], 'хасалт: зураглалгүй ба жагсаалтын гадна бүгд алгасагдана');

  ok(!plan.go.some(p => /модуль/i.test(p.name)), 'хасалт: ШИНЭ модуль бараа хэзээ ч хасагдахгүй');
  eq(F.asarPurgePlan([], al).go.length, 0, 'хасалт: мөргүй → юу ч хасагдахгүй');
  eq(F.asarPurgePlan(rows, null).go.map(p => p.sku), ['M-273'], 'хасалт: толь ачаалагдаагүй бол уртын бүртгэл хөндөгдөхгүй');
  eq(F.asarPurgeSkus().length, LEG.length + DUP.length, 'хасалт: жагсаалт = хуучин уртууд + хөрөнгийн давхардал');
  ok(!F.asarPurgeSkus().some(k => G('ASAR_MODULES')[k]), 'хасалт: жагсаалтад модулийн sku БАЙХГҮЙ');
}

// НЭГ ҮГСИЙН САН — төлөв/шийдвэр/зэрэг англи кодоор БИЧИГДЭНЭ (2026-09-11)
// Sheets-ийн үед хүн уншихын тулд монгол болгож бичдэг байсан. Дата DB рүү шилжсэн ч
// орчуулга үлдсэн тул нэг утга хоёр хэлээр хадгалагдаж, DB-г ШУУД уншдаг бүхэн
// (тайлан, SQL, үүлэн агент) устгасан мөрийг устгаагүй гэж үзэж байв.
// БИЧИХ = англи код. УНШИХ = хуучин монгол утгыг хөрвүүлсээр (хуучин мөр эвдрэхгүй).
{
  const TW = vm.runInContext('taskToWire', sandbox);
  const TF = vm.runInContext('taskFromWire', sandbox);
  const RW = vm.runInContext('requestToWire', sandbox);
  const RF = vm.runInContext('normalizeFinance', sandbox);

  eq(TW({ status: 'done' }).status, 'done', 'үгсийн сан: ажлын төлөв англиар бичигдэнэ');
  eq(TW({ status: 'deleted' }).status, 'deleted', 'үгсийн сан: устгасан төлөв ч англиар');
  eq(TW({ priority: 'high' }).priority, 'high', 'үгсийн сан: зэрэг англиар бичигдэнэ');
  eq(TW({ branch: 'm-event' }).branch, 'm-event', 'үгсийн сан: салбар ленз код хэвээр');
  eq(RW({ status: 'done' }).status, 'done', 'үгсийн сан: санхүүгийн төлөв англиар');
  eq(RW({ decision: 'approved' }).decision, 'approved', 'үгсийн сан: шийдвэр англиар');

  // УНШИХ тал — хуучин монгол утга хөрвөсөөр байна
  eq(TF({ status: 'Дууссан' }).status, 'done', 'үгсийн сан: хуучин «Дууссан» уншигдана');
  eq(TF({ status: 'Устгасан' }).status, 'deleted', 'үгсийн сан: хуучин «Устгасан» уншигдана');
  eq(TF({ priority: 'Яаралтай' }).priority, 'high', 'үгсийн сан: хуучин «Яаралтай» уншигдана');
  eq(TF({ status: 'done' }).status, 'done', 'үгсийн сан: шинэ англи утга дамжин өнгөрнө');
  eq(RF({ status: 'Устгасан' }).status, 'deleted', 'үгсийн сан: санхүү «Устгасан» уншигдана');
  eq(RF({ decision: 'Зөвшөөрсөн' }).decision, 'approved', 'үгсийн сан: санхүү «Зөвшөөрсөн» уншигдана');
  eq(RF({ status: 'deleted' }).status, 'deleted', 'үгсийн сан: санхүү англи утга дамжин өнгөрнө');

  // ЭРГЭХ АЯЛАЛ: бичээд уншихад анхны утга буцаж ирнэ
  ['open', 'done', 'deleted'].forEach(v =>
    eq(TF(TW({ status: v })).status, v, `үгсийн сан: ажил «${v}» эргэж ирнэ`));
  ['pending', 'approved', 'rejected', 'deferred'].forEach(v =>
    eq(RF(RW({ decision: v })).decision, v, `үгсийн сан: шийдвэр «${v}» эргэж ирнэ`));
}

// SCAN — бичих замд монгол болгох орчуулга буцаж ирэхгүй (2026-09-11)
{
  ok(!/out\.status\s*=\s*_xlate\(out\.status,\s*_(FIN_)?STATUS_E2M\)/.test(src),
    'scan: төлөвийг монгол болгож бичихгүй');
  ok(!/out\.decision\s*=\s*_xlate\(out\.decision,\s*_(FIN_)?DEC(ISION)?_E2M\)/.test(src),
    'scan: шийдвэрийг монгол болгож бичихгүй');
  ok(!/out\.priority\s*=\s*_xlate\(out\.priority,\s*_PRIORITY_E2M\)/.test(src),
    'scan: зэргийг монгол болгож бичихгүй');
  ok(/_xlate\(out\.status,\s*_STATUS_M2E\)/.test(src), 'scan: унших хөрвүүлэлт ХЭВЭЭР');
}

// КИРИЛЛ ҮГИЙН ХИЛ — JS-ийн \b кирилл дээр ажиллахгүй (2026-09-11)
// /\bасар\b/.test('Том асар боолт') === false. «асар» бол M-Event-ийн ГОЛ бараа;
// энэ түлхүүр үхсэн байсан тул асартай холбоотой зардал салбаргүй үлдэж байв.
{
  const GB = vm.runInContext('guessBranch', sandbox);
  const CW = vm.runInContext('cyrWord', sandbox);
  const st = vm.runInContext('state', sandbox);
  const savedLearn = st.memoBranchLearn, savedExp = st.expenseLearn;
  st.memoBranchLearn = {}; st.expenseLearn = {};   // суралцлага таамгийг дарахгүй байг

  eq(GB('Том асар боолт'), 'ИВЕНТ', 'кирилл: «Том асар боолт» → ИВЕНТ');
  eq(GB('Асар хүндрүүлэгч'), 'ИВЕНТ', 'кирилл: мөрийн эхэнд байгаа үг ч танигдана');
  eq(GB('асар'), 'ИВЕНТ', 'кирилл: ганц үг');
  eq(GB('Асар барих ажилчид хоол'), 'ИВЕНТ', 'кирилл: дунд нь байгаа үг');
  eq(GB('гэр буудал'), 'КЕМП', 'кирилл: «гэр» → КЕМП');
  eq(GB('шинэ меню хэвлэв'), 'КАТЕРИНГ', 'кирилл: «меню» → КАТЕРИНГ');

  // Үгийн ХИЛ хэвээр — урт үгийн дотор байвал таарахгүй (\b-ийн анхны зорилго)
  eq(GB('гэрээний дүн'), '', 'кирилл: «гэрээ» нь «гэр» гэж танигдахгүй');
  eq(GB('асаргаа'), '', 'кирилл: «асаргаа» нь «асар» гэж танигдахгүй');
  eq(GB('гэрээ буцаалт'), 'ИВЕНТ', 'кирилл: гэрээ буцаалт → ИВЕНТ (КЕМП руу буухгүй)');

  ok(new RegExp(CW('асар'), 'i').test('Том асар боолт'), 'кирилл: cyrWord туслах ажиллана');
  ok(!new RegExp(CW('асар'), 'i').test('асаргаа'), 'кирилл: cyrWord хилээ барина');

  st.memoBranchLearn = savedLearn; st.expenseLearn = savedExp;
}

// SCAN — кирилл түлхүүрт \b ашиглахгүй (2026-09-11)
{
  const bad = (src.match(/\\b[А-Яа-яЁёӨөҮү]/g) || []).length;
  eq(bad, 0, 'scan: кирилл үсгийн өмнө \\b байхгүй — cyrWord() ашиглана');
}

// САЛБАР ХУВААРИЛАЛТ — танихгүй салбар ХХК-д НУУГДАХГҮЙ (2026-09-11)
// Катерингийн зардалд хайрцаг байгаагүй тул 2.1 сая₮ чимээгүй Чимун ХХК дээр нэмэгдэж,
// хоёр тоо зэрэг худал болж байв. Мөн салбаргүй/танихгүй кодтой 89 гүйлгээ (75.8 сая₮)
// мөн адил ХХК руу унаж, эзэнгүй зардал хэн ч анзаарахгүй алга болж байсан.
{
  const st = vm.runInContext('state', sandbox);
  const PNL = vm.runInContext('finBranchPnl', sandbox);
  const saved = { fr: st.financeRequests, ao: st.appOrders, no: st.nomaadOrders, vr: st.vatReceipts };
  st.appOrders = []; st.nomaadOrders = []; st.vatReceipts = [];
  const E = (o) => Object.assign({ id: 'x', decision: 'approved', status: 'open',
    requested_at: '2026-08-10T00:00:00.000Z', amount: 1000000, category: '1300' }, o);

  st.financeRequests = [E({ id: '1', dept_branch: 'КАТЕРИНГ', amount: 2100000 })];
  let p = PNL('2026-08', 'cash');
  eq((p.rows.find(r => r.k === 'Катеринг') || {}).exp, 2100000, 'салбар: катеринг ӨӨРИЙН мөртэй');
  eq((p.rows.find(r => r.k === 'Чимун ХХК') || {}).exp, 0, 'салбар: катеринг ХХК-д нэмэгдэхгүй');

  st.financeRequests = [E({ id: '2', dept_branch: '', amount: 500000 }),
                        E({ id: '3', dept_branch: 'shared', amount: 300000 })];
  p = PNL('2026-08', 'cash');
  eq(p.unknownExp, 800000, 'салбар: хоосон ба танихгүй код тусдаа тоологдоно');
  eq(p.unknownN, 2, 'салбар: танихгүй гүйлгээний ТОО ч гарна');
  eq((p.rows.find(r => r.k === 'Чимун ХХК') || {}).exp, 0, 'салбар: танихгүй нь ХХК-д НУУГДАХГҮЙ');
  ok(p.rows.some(r => r.unknown), 'салбар: танихгүй мөр тэмдэглэгдэнэ');

  // Хуучин ленз код зөв хөрвөнө (m-event/camp) — энэ нь өмнөх ч зөв байсан, хамгаалъя
  st.financeRequests = [E({ id: '4', dept_branch: 'm-event', amount: 2620000 }),
                        E({ id: '5', dept_branch: 'camp', amount: 7610000 })];
  p = PNL('2026-08', 'cash');
  eq((p.rows.find(r => r.k === 'M-Event') || {}).exp, 2620000, 'салбар: ленз код m-event → M-Event');
  eq((p.rows.find(r => r.k === 'NOMAAD') || {}).exp, 7610000, 'салбар: ленз код camp → NOMAAD');
  eq(p.unknownExp, 0, 'салбар: ленз код танихгүйд ОРОХГҮЙ');

  // Хөрөнгө (6000) нь салбараас үл хамааран ХХК
  st.financeRequests = [E({ id: '6', dept_branch: 'ИВЕНТ', category: '6100', amount: 9000000 })];
  p = PNL('2026-08', 'cash');
  eq((p.rows.find(r => r.k === 'Чимун ХХК') || {}).exp, 9000000, 'салбар: хөрөнгө(6000) → ХХК хэвээр');
  eq((p.rows.find(r => r.k === 'M-Event') || {}).exp, 0, 'салбар: хөрөнгө салбарын зардал БИШ');

  // ИНВАРИАНТ: нийт зардал өөрчлөгдөхгүй — зөвхөн аль мөрөнд харагдах нь өөрчлөгдөнө
  st.financeRequests = [E({ id: '7', dept_branch: 'ИВЕНТ', amount: 1000000 }),
                        E({ id: '8', dept_branch: 'КАТЕРИНГ', amount: 2000000 }),
                        E({ id: '9', dept_branch: '', amount: 3000000 })];
  p = PNL('2026-08', 'cash');
  eq(p.rows.reduce((a, r) => a + r.exp, 0), 6000000, 'ИНВАРИАНТ: нийт зардал бүтэн хэвээр');

  // Катеринг/танихгүй байхгүй бол нэмэлт мөр ГАРАХГҮЙ (хоосон мөр эвгүй)
  st.financeRequests = [E({ id: '10', dept_branch: 'ИВЕНТ' })];
  p = PNL('2026-08', 'cash');
  eq(p.rows.length, 3, 'салбар: хоосон бол катеринг/танихгүй мөр гарахгүй');
  ok(p.rows.some(r => r.k === 'M-Event') && p.rows.some(r => r.k === 'NOMAAD') && p.rows.some(r => r.k === 'Чимун ХХК'),
    'салбар: үндсэн 3 мөр үргэлж байна (COO тооцоо тэднээс уншина)');

  st.financeRequests = saved.fr; st.appOrders = saved.ao; st.nomaadOrders = saved.no; st.vatReceipts = saved.vr;
}

// МАРГААНТАЙ БАРЬЦАА — цуцалсан захиалгад орсон атлаа буцаагаагүй мөнгө (2026-09-11)
// Захиалга №1136 (Тавантолгой): 31.2 сая₮ орсон, гэрээ цуцлагдсан, маргаан шийдэгдээгүй.
// Орлогод орох ЁСГҮЙ (хуурамч ашиг), гэхдээ данснаас алга болох ч ЁСГҮЙ.
{
  const O = (o) => Object.assign({ id: 'o1', number: 1136, customer: 'Тавантолгой',
    status: 'canceled', paid_mnt: 31200000, starts_at: '2026-07-22' }, o);
  const R = (o) => Object.assign({ status: 'open', decision: 'approved', category: '5800',
    link_type: 'order', link_id: 'o1', amount: 0 }, o);

  eq(F.disputedHeldMoney([O({})], []).total, 31200000, 'маргаан: цуцалсан ч орсон мөнгө харагдана');
  eq(F.disputedHeldMoney([O({})], []).list[0].number, 1136, 'маргаан: захиалгын дугаар гарна');
  eq(F.disputedHeldMoney([O({ status: 'archived' })], []).total, 0, 'маргаан: цуцлаагүй захиалга орохгүй');
  eq(F.disputedHeldMoney([O({ paid_mnt: 0 })], []).total, 0, 'маргаан: мөнгө ороогүй бол 0');
  eq(F.disputedHeldMoney([O({})], [R({ amount: 31200000 })]).total, 0,
    'маргаан: бүтэн буцаасан бол харагдахгүй');
  eq(F.disputedHeldMoney([O({})], [R({ amount: 11200000 })]).total, 20000000,
    'маргаан: хэсэгчлэн буцаасан бол үлдсэн нь харагдана');
  eq(F.disputedHeldMoney([O({})], [R({ amount: 31200000, link_type: 'general' })]).total, 31200000,
    'маргаан: захиалгад ХОЛБООГҮЙ буцаалт хасагдахгүй (өөр гүйлгээ)');
  eq(F.disputedHeldMoney([O({})], [R({ amount: 31200000, category: '1800' })]).total, 31200000,
    'маргаан: буцаалтын БУС ангилал хасагдахгүй');
  eq(F.disputedHeldMoney([O({})], [R({ amount: 31200000, status: 'deleted' })]).total, 31200000,
    'маргаан: устгасан буцаалт хасагдахгүй');
  eq(F.disputedHeldMoney([O({})], [R({ amount: 31200000, decision: 'rejected' })]).total, 31200000,
    'маргаан: батлагдаагүй буцаалт хасагдахгүй');
  eq(F.disputedHeldMoney([], []).total, 0, 'маргаан: захиалгагүй → 0');
  eq(F.disputedHeldMoney(null, null).total, 0, 'маргаан: null → 0 (унахгүй)');
  eq(F.disputedHeldMoney([O({ id: 'a', number: 1, paid_mnt: 100 }), O({ id: 'b', number: 2, paid_mnt: 900 })], []).list[0].number, 2,
    'маргаан: том дүн эхэлж жагсана');

  // ИНВАРИАНТ: маргаантай мөнгө ОРЛОГОД орохгүй — _orderActive цуцалсныг хасдаг хэвээр
  ok(!F._orderActive({ status: 'canceled' }), 'маргаан: цуцалсан захиалга орлогод ОРОХГҮЙ хэвээр');
}

// SCAN — «зардал БИШ» шалгалт нэг газраас (2026-09-11)
// 6900 (эзний зээл) дээр 6950 (зээлийн үндсэн төлбөр) нэмэгдсэн. Түүхий
// `startsWith('6900')` нь 6950-г алддаг тул зээлийн үндсэн төлбөр зардал болж
// ашгийг буруу бууруулна. Ганц эх сурвалж = finIsNonExpense().
{
  eq((src.match(/startsWith\('6900'\)/g) || []).length, 0,
    'scan: түүхий 6900 шалгалт байхгүй — finIsNonExpense() ашиглана');
  ok(/function finIsNonExpense\(cat\)/.test(src), 'scan: finIsNonExpense тодорхойлогдсон');
}

// SCAN — merge conflict тэмдэглэгээ ЭХ КОДОД үлдэхгүй (2026-09-07)
// `<<<<<<< HEAD` нь template literal дотор орсон тул `node --check` барихгүй,
// lint ч өнгөрөөсөн — хэрэглэгчийн дэлгэц дээр ТЕКСТЭЭР харагдаж байв.
{
  eq((src.match(/^<<<<<<< |^=======$|^>>>>>>> /gm) || []).length, 0,
    'scan: app.js-д merge conflict тэмдэглэгээ байхгүй');
}

// SCAN — хасах товч зураглалыг ӨӨРӨӨ нөхөж бичнэ (2026-09-07)
// Цэгцлэх товч дээр бичигддэг байсан ч тэр үед бараа архивлагдсан бол
// (каталогт ирэхгүй) давхиж өнгөрдөг тул зураглал хоосон үлдэж, хасалт
// мөнхөд «зураглал алга» гэж зогсдог байв.
{
  ok(/for \(const p of rows\) \{[\s\S]{0,400}saveItemAlias\('sku:'/.test(src),
    'scan: хасах товч дутуу зураглалыг өөрөө бичдэг');
  ok(/if \(wrote\) \{ try \{ await loadItemAliases\(\)/.test(src),
    'scan: бичсэн зураглалаа DB-ээс баталгаажуулдаг');
}

// ── АКТ — түрээслэх боломжгүй бараа (2026-09-07) ────────────────────────────
// Хэт хуучирсан / эвдэрсэн / өгөөжгүй барааг актаар нөөцөөс гаргана. Зарж
// болох бол зараад орлогыг нь тусад нь (түрээсийн орлогод НЭМЭЛГҮЙ) бүртгэнэ.
{
  // Нөөцөөс хасалт — хамгийн их үлдэгдэлтэй салбараас эхэлнэ
  const p = { qty_mevent: 5, qty_nomaad: 2, qty_catering: 0, qty_chimun: 1 };
  eq(F.woDeductQty(p, 3), { qty_mevent: 2, qty_nomaad: 2, qty_catering: 0, qty_chimun: 1, stock: 5 }, 'акт: их үлдэгдэлтэй салбараас хасна');
  eq(F.woDeductQty(p, 8).stock, 0, 'акт: бүгдийг хасвал нөөц 0');
  eq(F.woDeductQty(p, 99).stock, 0, 'акт: нөөцөөс их хасахад сөрөг болохгүй');
  eq(F.woDeductQty(p, 0), { qty_mevent: 5, qty_nomaad: 2, qty_catering: 0, qty_chimun: 1, stock: 8 }, 'акт: 0 хасахад хэвээр');
  eq(F.woDeductQty({}, 2).stock, 0, 'акт: нөөцгүй бараа → 0 (унахгүй)');

  // Нэгтгэл
  const rows = [
    { status: 'pending', qty: 2, at: '2026-09-01T00:00:00Z' },
    { status: 'written', qty: 3, at: '2026-09-02T00:00:00Z' },
    { status: 'written', qty: 1, at: '2026-08-15T00:00:00Z' },
    { status: 'sold', qty: 1, amount: 250000, at: '2026-09-03T00:00:00Z', sold_at: '2026-09-03T00:00:00Z' },
    { status: 'sold', qty: 2, amount: 400000, at: '2026-08-20T00:00:00Z', sold_at: '2026-08-20T00:00:00Z' },
  ];
  eq(F.woStats(rows), { pending: 1, written: 2, writtenQty: 4, sold: 2, soldSum: 650000 }, 'акт: нийт нэгтгэл');
  eq(F.woStats(rows, '2026-09'), { pending: 1, written: 1, writtenQty: 3, sold: 1, soldSum: 250000 }, 'акт: сараар шүүнэ');
  eq(F.woStats([]), { pending: 0, written: 0, writtenQty: 0, sold: 0, soldSum: 0 }, 'акт: хоосон → 0');
  eq(F.woStats(null).sold, 0, 'акт: мөргүй → унахгүй');
}

// SCAN — хөрөнгө зарсан орлого нь ТҮРЭЭСИЙН орлогод нэмэгддэггүй (2026-09-07)
// Нэмбэл ашгийн марж гажиж, түрээсийн гүйцэтгэл буруу харагдана.
{
  const codeLines = src.split('\n').filter(l => !/^\s*(\/\/|\*)/.test(l));
  eq(codeLines.filter(l => /(income|evInc|noInc)\s*\+=\s*woSoldIncome/.test(l)).length, 0,
    'scan: хөрөнгө зарсан орлого түрээсийн орлогод нэмэгддэггүй');
  ok(/woSoldIncome\(month\)/.test(src), 'scan: хөрөнгө зарсан орлого тайланд тусад нь харагдана');
}

// ── АРХИВЫГ БҮРМӨСӨН УСТГАХ — түүхэнд юу нөлөөлөхийг УРЬДЧИЛАН хэлнэ (2026-09-07)
// Хэрэглэгч нэг удаа зөвшөөрсөн. Устгахын өмнө «хэд нь хуучин захиалгад орсон»
// гэдгийг ил хэлж, толинд «бараа биш» гэж тэмдэглэн тулгалтын шуугиан үүсгэхгүй.
{
  const arch = [{ sku: 'M-100' }, { sku: 'M-101' }, { sku: 'M-102' }];
  const orders = [
    { items: [{ sku: 'M-100', name: 'а' }, { sku: 'M-999' }] },
    { items: [{ sku: 'M-102' }] },
    { items: null },
    null,
  ];
  const plan = F.archiveDeletePlan(arch, orders);
  eq(plan.inOrders.map(p => p.sku), ['M-100', 'M-102'], 'архив: захиалгад орсон нь тодорхойлогдоно');
  eq(plan.free.map(p => p.sku), ['M-101'], 'архив: хаана ч ороогүй нь тусдаа');
  eq(F.archiveDeletePlan(arch, []).inOrders.length, 0, 'архив: захиалгагүй → бүгд чөлөөтэй');
  eq(F.archiveDeletePlan(arch, null).free.length, 3, 'архив: захиалга ачаалагдаагүй → унахгүй');
  eq(F.archiveDeletePlan(null, orders).free.length, 0, 'архив: хоосон архив → 0');
  eq(F.archiveDeletePlan([{ name: 'sku-гүй' }], orders).free.length, 0, 'архив: sku-гүй мөр хөндөгдөхгүй');
}

// SCAN — актын жагсаалт сүлжээний алдаанд ХООСОН болохгүй (2026-09-07)
// loadAppConfig нь «алдаа» ба «мөр байхгүй» хоёрыг ялгадаггүй (хоёулаа null).
// Хэрэв null ирэхэд шууд [] гэж дарж бичвэл refresh дээр акт алга болно.
{
  ok(/if \(Array\.isArray\(v\)\) \{ state\.writeoffs = v; woCacheWrite\(\); \}/.test(src),
    'scan: акт зөвхөн МАССИВ ирэхэд дарж бичигдэнэ');
  ok(/else if \(!Array\.isArray\(state\.writeoffs\)\) state\.writeoffs = woCacheRead\(\) \|\| \[\];/.test(src),
    'scan: сүлжээ унахад сүүлийн мэдэгдэж байсан жагсаалт үлдэнэ');
  ok(/async function saveWriteoffs\(\) \{ await saveAppConfig\(WO_KEY, woList\(\)\); woCacheWrite\(\); \}/.test(src),
    'scan: хадгалахад локал кэш ч шинэчлэгдэнэ');
}

// ── БАРААНЫ ЗОРИЛГЫН ДЭЛГЭЦҮҮД (2026-09-07) ────────────────────────────────
// Каталог / Үнэ / Өртөг / Нөөц нь өөр өөр ажил, өөр өөр хүн хийдэг тул
// тус тусдаа дэлгэц болов. Хайлт нь нэр, ангилал, код, sku-гаар ажиллана.
{
  const list = [
    { sku: 'M-001', code: 'M-001', name: 'Асар 18м өргөн', category: 'Асар', type: 'rental' },
    { sku: 'M-002', code: 'M-002', name: 'Хар сандал', category: 'Ширээ, сандал', type: 'rental' },
    { sku: 'S-001', code: 'S-001', name: 'Хүргэлт', category: 'Үйлчилгээ', type: 'service' },
    { name: 'sku-гүй мөр', type: 'rental' },
  ];
  eq(F.psFilter(list, '').map(p => p.sku), ['M-001', 'M-002'], 'хуудас: үйлчилгээ ба sku-гүй мөр орохгүй');
  eq(F.psFilter(list, 'асар').map(p => p.sku), ['M-001'], 'хуудас: нэрээр хайна');
  eq(F.psFilter(list, 'ширээ').map(p => p.sku), ['M-002'], 'хуудас: ангиллаар хайна');
  eq(F.psFilter(list, 'm-002').map(p => p.sku), ['M-002'], 'хуудас: кодоор хайна (том/жижиг үсэг хамаагүй)');
  eq(F.psFilter(list, 'олдохгүй').length, 0, 'хуудас: тохирохгүй → хоосон');
  eq(F.psFilter(null, 'а').length, 0, 'хуудас: жагсаалтгүй → унахгүй');

  // Мөнгөн утга — таслал, ₮ тэмдэгтэй бичсэн ч зөв тоо болно
  eq(F.psNum('1,800,000₮'), 1800000, 'хуудас: тасалтай мөнгө уншина');
  eq(F.psNum(''), 0, 'хуудас: хоосон → 0');
  eq(F.psNum('-5'), 0, 'хуудас: сөрөг → 0 (нөөц/үнэ сөрөг байж болохгүй)');
  eq(F.psNum('12.6'), 13, 'хуудас: бутархай → бүхэл');

  // Эрх — дэлгэц бүр өөрийн түлхүүртэй
  eq(Object.keys(vm.runInContext('PSHEET', sandbox)).sort(), ['catalog', 'cost', 'price', 'stock'], 'хуудас: 4 зорилго');
  eq(vm.runInContext('PSHEET', sandbox).stock.perm, 'products.stock', 'хуудас: Нөөц дэлгэц products.stock эрхтэй');
  eq(vm.runInContext('PSHEET', sandbox).cost.perm, 'products.cost', 'хуудас: Өртөг дэлгэц products.cost эрхтэй');
}

// ── ХАДГАЛАХ ТОВЧ — санамсаргүй засвар чимээгүй бичигдэхгүй (2026-09-07) ────
// Өмнө нь талбараас гармагц шууд бичдэг байсан тул санамсаргүй хүрсэн зүйл
// мэдэгдэлгүй хадгалагдаж байв. Одоо засвар хуримтлагдаж, товч дарж байж бичнэ.
{
  const runIn = (c) => vm.runInContext(c, sandbox);
  runIn('state.psDirty = {};');
  const p = { sku: 'M-001', name: 'Асар', price: 1000000, qty_mevent: 3, qty_chimun: 1, qty_nomaad: 0, qty_catering: 0, stock: 4 };

  eq(F.psStage(p, 'price', '1,500,000₮'), 1, 'товч: өөрчлөлт хуримтлагдана');
  eq(F.psVal(p, 'price'), 1500000, 'товч: харагдах утга нь хүлээгдэж буй засвар');
  eq(F.psStage(p, 'price', '1000000'), 0, 'товч: анхны утга руу буцаавал «цэвэр» болно');
  eq(F.psVal(p, 'price'), 1000000, 'товч: буцаасны дараа хадгалагдсан утга харагдана');

  eq(F.psStage(p, 'name', ' Асар '), 0, 'товч: зөвхөн зай нэмэх нь өөрчлөлт биш');
  eq(F.psStage(p, 'name', 'Асар 18м'), 1, 'товч: нэр өөрчлөгдвөл хуримтлагдана');
  eq(F.psStage({ sku: 'M-002', category: 'Асар' }, 'category', 'Майхан'), 2, 'товч: өөр бараа тусдаа тоологдоно');
  eq(F.psDirtyCount(), 2, 'товч: 2 бараа хүлээгдэж байна');

  // Тоо ширхэг өөрчлөгдвөл нийт нөөц дахин бодогдоно
  eq(F.psPatchOf(p, { qty_mevent: 5 }).stock, 6, 'товч: нөөц = салбаруудын нийлбэр');
  eq(F.psPatchOf(p, { price: 2 }).stock, 4, 'товч: үнэ өөрчлөхөд нөөц хөндөгдөхгүй');
  eq(F.psStage(null, 'price', 1), 2, 'товч: бараагүй → тоо өөрчлөгдөхгүй (унахгүй)');
  runIn('state.psDirty = {};');
  eq(F.psDirtyCount(), 0, 'товч: цэвэрлэсний дараа 0');
}

// SCAN — барааны хуудсууд талбар бүрийг ШУУД бичихгүй (2026-09-07)
{
  eq((src.match(/addEventListener\('change', \(\) => \{\s*psSaveField/g) || []).length, 0,
    'scan: талбараас гармагц шууд хадгалдаг хуучин зам байхгүй');
  ok(/document\.getElementById\('ps-save'\)\?\.addEventListener\('click', \(\) => psSaveAll\(\)\)/.test(src),
    'scan: хадгалах товчоор л бичигдэнэ');
}

// ── NOMAAD түүх (2023–2025 архив) — Excel-ийн «НИЙТ ДҮН»-тэй тулгана ────────
// Мөр гараар хуулагдсан тул нэг тоо буруу бичигдвэл чимээгүй өнгөрөх аюултай.
{
  const H = vm.runInContext('NOMAAD_HISTORY', sandbox);
  eq(H.length, 130, 'nomaad түүх: 130 арга хэмжээ');
  const sum = (y) => H.filter(r => r[0].slice(0, 4) === y).reduce((s, r) => s + r[6], 0);
  const cnt = (y) => H.filter(r => r[0].slice(0, 4) === y).length;
  eq([cnt('2023'), sum('2023')], [31, 379862681], 'nomaad түүх: 2023 = 31 захиалга / 379,862,681₮');
  eq([cnt('2024'), sum('2024')], [56, 716036950], 'nomaad түүх: 2024 = 56 захиалга / 716,036,950₮');
  eq([cnt('2025'), sum('2025')], [43, 885025551], 'nomaad түүх: 2025 = 43 захиалга / 885,025,551₮');
  eq(H.reduce((s, r) => s + r[6], 0), 1980925182, 'nomaad түүх: нийт 1,980,925,182₮');
  ok(H.every(r => /^\d{4}-\d{2}(-\d{2})?$/.test(r[0])), 'nomaad түүх: огноо бүр зөв хэлбэртэй');
  // Кемпийн бичилт нэг болно (кирилл «С camp» ч мөн)
  eq(F.nhKind('a CAMP'), 'A camp', 'nomaad түүх: кемпийн бичилт нэгдэнэ');
  eq(F.nhKind('С camp'), 'C camp', 'nomaad түүх: кирилл С → C camp');
}

// ── БУУЛГАЛТ ⟦CMP⟧ — манай буруугаас өгсөн хөнгөлөлт (2026-09-09) ───────────
// Хоцорсон/эвдэрсэн/ашиглагдаагүй тохиолдолд өгсөн хөнгөлөлт нь ЗАРДАЛ БИШ,
// ОРЛОГЫН БУУРАЛТ. Зардал талд бичвэл орлого бүтэн харагдаж марж гажина.
{
  eq(F.encodeOrderCmp('Хоцорч хүргэсэн', 50000), '⟦CMP|Хоцорч хүргэсэн|50000⟧', 'буулгалт: токен бичнэ');
  eq(F.encodeOrderCmp('Бусад', 0), '', 'буулгалт: 0 бол токен бичихгүй');
  eq(F.parseOrderCmp('захиалга ⟦CMP|Хоцорч хүргэсэн|50000⟧ тайлбар'), { reason: 'Хоцорч хүргэсэн', amount: 50000, receipt: '', date: '' }, 'буулгалт: токен уншина');
  eq(F.parseOrderCmp('⟦CMP|Ашиглагдаагүй|30000|KH12345⟧').receipt, 'KH12345', 'буулгалт: баримтын дугаар токенд үлдэнэ');
  eq(F.encodeOrderCmp('Бусад', 500, 'KH9'), '⟦CMP|Бусад|500|KH9⟧', 'буулгалт: баримттай токен');
  eq(F.setOrderCmpNote('т', 'Бусад', 500, 'KH9'), 'т ⟦CMP|Бусад|500|KH9⟧', 'буулгалт: баримт хадгалагдана');
  eq(F.parseOrderCmp('токенгүй'), null, 'буулгалт: токенгүй → null');
  eq(F.orderCmpAmount({ note: '⟦CMP|Бусад|1200⟧' }), 1200, 'буулгалт: дүн');
  eq(F.orderCmpAmount({}), 0, 'буулгалт: тэмдэглэлгүй → 0');
  eq(F.setOrderCmpNote('хуучин ⟦CMP|Бусад|100⟧ текст', 'Ашиглагдаагүй', 5000), 'хуучин текст ⟦CMP|Ашиглагдаагүй|5000⟧', 'буулгалт: токен солигдож текст үлдэнэ');
  eq(F.setOrderCmpNote('текст ⟦CMP|Бусад|100⟧', '', 0), 'текст', 'буулгалт: 0 болгоход токен арилна');
  eq(F.setOrderCmpNote('⟦DLV|city|0|150000⟧', 'Хоцорч хүргэсэн', 30000), '⟦DLV|city|0|150000⟧ ⟦CMP|Хоцорч хүргэсэн|30000⟧', 'буулгалт: бусад токен хөндөгдөхгүй');

  // ОРЛОГО — буулгалт хасагдана
  const o = { source: 'app', total_mnt: 315000, deposit_mnt: 0, paid_mnt: 315000, note: '⟦CMP|Хоцорч хүргэсэн|60000⟧' };
  eq(F.orderRevenue(o, 'accrual'), 255000, 'орлого: буулгалт хасагдана');
  eq(F.orderRevenue(o, 'cash'), 255000, 'орлого: мөнгөн суурьт ч хасагдана');
  eq(F.orderRevenue({ ...o, note: '' }, 'accrual'), 315000, 'орлого: буулгалтгүй бол бүтэн');
  eq(F.orderRevenue({ ...o, note: '⟦CMP|Бусад|999999⟧' }, 'accrual'), 0, 'орлого: буулгалт нийтээс их бол 0 (сөрөг болохгүй)');
  const b = { source: 'booqable', total_mnt: 100000, deposit_mnt: 20000, paid_mnt: 100000, note: '⟦CMP|Бусад|10000⟧' };
  eq(F.orderRevenue(b, 'accrual'), 90000, 'орлого: booqable-д барьцаа хасахгүй ч буулгалт хасагдана');

  // САНХҮҮ — захиалгад холбогдсон 5800 нь ЗАРДАЛ БИШ (давхар тоологдохгүй)
  ok(F.finIsCustomerRefund({ category: '5800', link_type: 'order' }) === true, 'буцаалт: захиалгад холбогдсон 5800 = зардал биш');
  ok(F.finIsCustomerRefund({ category: '5800', justification: 'x ⟦LNK|order|1492|#1492⟧' }) === true, 'буцаалт: LNK токеноор ч танина');
  ok(F.finIsCustomerRefund({ category: '5800', link_type: 'general' }) === false, 'буцаалт: холбоогүй 5800 (торгууль) нь ЖИНХЭНЭ зардал');
  ok(F.finIsCustomerRefund({ category: '5810', link_type: 'order' }) === false, 'буцаалт: барьцаа буцаалт нь өөр дүрэмтэй');
  ok(F.finIsCustomerRefund(null) === false, 'буцаалт: мөргүй → false (унахгүй)');
  ok(F.finIsRealExpense({ decision: 'approved', category: '5800', link_type: 'order', amount: 1 }) === false, 'буцаалт: тайлангийн зардалд ОРОХГҮЙ');
  ok(F.finIsRealExpense({ decision: 'approved', category: '5800', link_type: 'general', amount: 1 }) === true, 'буцаалт: торгууль зардал хэвээр');
}

// SCAN — буулгалтын дүн ГАРААР бичигдэхгүй, ЗӨВХӨН PDF баримтаас (2026-09-09)
// Гар оруулга нь «санхүү = баримт суурьтай» зарчмыг зөрчинө.
{
  const cmp = src.slice(src.indexOf('async function openOrderCmpModal'), src.indexOf('// ⟦VAT|amount⟧ note token'));
  ok(/parseBankReceipt\(await extractPdfText\(file\)\)/.test(cmp), 'scan: буулгалт PDF баримтаас дүн уншина');
  ok(/чимун\/i\.test\(d\.senderName/.test(cmp), 'scan: Чимун ИЛГЭЭГЧ байх шалгалт (орлогын баримт орохгүй)');
  ok(/receiptDupReason\(refKey, fpKey/.test(cmp), 'scan: нэг баримт хоёр удаа бүртгэгдэхгүй');
  ok(!/moneyVal\(amtEl\)/.test(cmp), 'scan: гар оруулгын талбар алга');
  ok(/reserveReceipt\(rec\.receiptId/.test(cmp), 'scan: баримт ledger-т нөөцлөгдөнө');
}

// ── БУУЛГАЛТ ДАВХАР ТООЛОГДОХГҮЙ: хуулгын мөр → захиалга (2026-09-09) ──────
// Буулгалт нь орлогоос аль хэдийн хасагдсан. Тэр мөнгө банкнаас гарахад хуулга
// оруулбал ЗАРДАЛ болж давхар хасагдана. Тиймээс мөрийг захиалгад холбож,
// «захиалгад холбогдсон 5800» болгоно → finIsCustomerRefund зардлаас хасна.
{
  const runIn = (c) => vm.runInContext(c, sandbox);
  const prev = runIn('state.appOrders');
  sandbox.__oo = [
    { id: 'a1', number: 1492, status: 'returned', total_mnt: 315000, note: '⟦CMP|Хоцорч хүргэсэн|60000⟧' },
    { id: 'a2', number: 1493, status: 'returned', total_mnt: 200000, note: '' },
    { id: 'a3', number: 1494, status: 'draft', total_mnt: 60000, note: '⟦CMP|Бусад|60000⟧' },   // ноорог — идэвхгүй
  ];
  runIn('state.appOrders = __oo;');

  eq(F.cmpMatchForStmt('1492 буулгалт', 60000), { id: 'a1', number: 1492, amount: 60000, how: 'дугаар' }, 'буулгалт: дугаар+дүнгээр таарна');
  eq(F.cmpMatchForStmt('хөнгөлөлт буцаалт', 60000), { id: 'a1', number: 1492, amount: 60000, how: 'дүн' }, 'буулгалт: дүн ЯГ таарсан ганц захиалга бол дугааргүй ч таарна');
  eq(F.cmpMatchForStmt('1492 буулгалт', 59000), null, 'буулгалт: дүн зөрвөл таарахгүй');
  eq(F.cmpMatchForStmt('1493 төлбөр', 200000), null, 'буулгалт: буулгалтгүй захиалга таарахгүй');
  eq(F.cmpMatchForStmt('юу ч', 0), null, 'буулгалт: дүнгүй → null');

  // Хоёр захиалга ижил дүнтэй бол ХҮН шийднэ (автоматаар буруу холбохгүй)
  sandbox.__oo2 = [
    { id: 'b1', number: 1500, status: 'returned', total_mnt: 100000, note: '⟦CMP|Бусад|50000⟧' },
    { id: 'b2', number: 1501, status: 'returned', total_mnt: 100000, note: '⟦CMP|Бусад|50000⟧' },
  ];
  runIn('state.appOrders = __oo2;');
  eq(F.cmpMatchForStmt('буцаалт', 50000), null, 'буулгалт: ижил дүнтэй 2 захиалга → автоматаар холбохгүй');
  eq(F.cmpMatchForStmt('1501 буцаалт', 50000).number, 1501, 'буулгалт: дугаар заасан бол зөв нь холбогдоно');

  // ОГНООГООР ялгах — ижил дүнтэй 2 захиалга ч PDF-ийн огноогоор нь салгана
  sandbox.__oo4 = [
    { id: 'c1', number: 1600, status: 'returned', total_mnt: 100000, note: '⟦CMP|Бусад|50000|KH1|2026-09-02⟧' },
    { id: 'c2', number: 1601, status: 'returned', total_mnt: 100000, note: '⟦CMP|Бусад|50000|KH2|2026-09-20⟧' },
  ];
  runIn('state.appOrders = __oo4;');
  eq(F.cmpMatchForStmt('буцаалт', 50000, '2026-09-03').number, 1600, 'буулгалт: огноогоор зөв захиалга олдоно');
  eq(F.cmpMatchForStmt('буцаалт', 50000, '2026-09-21').number, 1601, 'буулгалт: хоёр дахь нь ч огноогоор олдоно');
  eq(F.cmpMatchForStmt('буцаалт', 50000, '2026-10-15'), null, 'буулгалт: огноо аль алинд нь ойрхон биш → хүн шийднэ');
  eq(F.cmpMatchForStmt('буцаалт', 50000), null, 'буулгалт: огноогүй бол хоёрдмол хэвээр');
  eq(F.parseOrderCmp('⟦CMP|Бусад|50000|KH1|2026-09-02⟧').date, '2026-09-02', 'буулгалт: баримтын огноо токенд');
  eq(F.encodeOrderCmp('Бусад', 500, 'KH9', '2026-09-09'), '⟦CMP|Бусад|500|KH9|2026-09-09⟧', 'буулгалт: огноотой токен');

  sandbox.__oo3 = prev; runIn('state.appOrders = __oo3;');
}

// SCAN — буулгалтын хуулгын мөр ЗАХИАЛГАД холбогдож зардлаас хасагдана
{
  ok(/const _dm = r\.depMatch \|\| r\.cmpMatch;/.test(src), 'scan: буулгалтын мөр захиалгад холбогдоно');
  ok(/r\.cmpMatch \? '5800'/.test(src), 'scan: буулгалтын мөр 5800 ангилалтай болно');
}

// ── НООРОГ = ҮНИЙН САНАЛЫН ШАТ (2026-09-10) ────────────────────────────────
// Ноорог захиалга нь илгээсэн/илгээгээгүй үнийн санал. Илгээгээгүй нь чимээгүй
// мартагддаг (42 саяын санал сар гүйцэд хэвтсэн) тул ил тэмдэглэгдэнэ.
{
  eq(F.quotesOf({ stage_meta: { quotes: [{ at: '2026-09-01', amount: 100 }] } }).length, 1, 'ноорог: илгээсэн саналын лог');
  eq(F.quotesOf({ stage_meta: {} }).length, 0, 'ноорог: илгээгээгүй → 0');
  eq(F.quotesOf({}).length, 0, 'ноорог: stage_meta байхгүй → 0 (унахгүй)');
  eq(F.quotesOf(null).length, 0, 'ноорог: мөргүй → 0');

  // Боломжит борлуулалт = ноорогуудын дүн. ⚠ Орлого БИШ.
  const orders = [
    { status: 'draft', source: 'app', total_mnt: 100000, deposit_mnt: 0, note: '' },
    { status: 'draft', source: 'app', total_mnt: 42240000, deposit_mnt: 0, note: '' },
    { status: 'returned', source: 'app', total_mnt: 500000, deposit_mnt: 0, note: '' },
  ];
  eq(F.draftPipelineTotal(orders), 42340000, 'ноорог: боломжит борлуулалт = зөвхөн ноорогууд');
  eq(F.draftPipelineTotal([]), 0, 'ноорог: хоосон → 0');
  ok(F.draftPipelineTotal(orders) !== 0 && F.orderRevenue(orders[0], 'accrual') === 100000,
    'ноорог: ноорогийн дүн тооцогддог ч _orderActive нь draft-ыг орлогоос хасдаг');
}

// SCAN — илгээгээгүй ноорог ил тэмдэглэгдэнэ (2026-09-10)
{
  ok(/📭 Илгээгээгүй/.test(src), 'scan: илгээгээгүй ноорогт тэмдэг гарна');
  ok(/sum-unsent/.test(src), 'scan: илгээгээгүйн тоо тоймын мөрөнд бий');
}

// ── РЕПО ХООРОНДЫН ГЭРЭЭ — сайттай (mevent.mn) хуваалцдаг зүйлс ──────────────
// Хоёр репо нэг өгөгдлийн санг хуваалцдаг ч хамтын код байхгүй. Доорх утгууд
// ХОЁУЛАНД нь давхардсан тул зөрч эхэлбэл чимээгүй эвдрэл үүснэ. Сайтын талд
// (m-event-website-ready/test/logic.mjs) ЯГ ИЖИЛ утгууд бичигдсэн — аль нэг
// тал өөрчлөгдвөл тэр талын CI улаан болно.
{
  // 1) Алдааны хээ. Зөрвөл нэг алдаа хоёр тусдаа GitHub Issue болно.
  eq(F.errFingerprint('boom', 'https://mevent.mn/app.js'), '0788b3feaf14',
     'гэрээ: errFingerprint алтан утга (сайттай ижил)');
  eq(F.errFingerprint('boom', 'https://mevent.mn/app.js?v=9'),
     F.errFingerprint('boom', 'https://mevent.mn/app.js'),
     'гэрээ: хувилбарын дугаар хээнд ОРОХГҮЙ');

  // 2) Тарифын нөөц утга. Хоёр репо ижил байх ёстой; хоёулаа app_config['tariffs']-аас
  //    амьдаар татдаг тул эдгээр нь зөвхөн DB хүрэхгүй үеийн нөөц.
  const T = vm.runInContext('RENTAL_TIERS', sandbox);
  eq(T.length, 3, 'гэрээ: хямдралын шат 3');
  eq(T.map(x => `${x.min}:${x.pct}`).join(','), '30:0.55,7:0.4,2:0.2',
     'гэрээ: хямдралын шатлалын нөөц утга (сайттай ижил)');
  eq(vm.runInContext('DELIVERY_CITY_FEE', sandbox), 150000, 'гэрээ: хот доторх хүргэлт (сайттай ижил)');
  eq(vm.runInContext('DELIVERY_PER_KM', sandbox), 5000, 'гэрээ: км тариф (сайттай ижил)');
  eq(vm.runInContext('ORDER_OFFHOURS_FEE', sandbox), 20000, 'гэрээ: ажлын бус цагийн хөлс (сайттай ижил)');

  // 3) Нөөц эзлэх шатууд — VPS дээрх public_availability харагдацтай ижил байх ёстой.
  //    Сайт тэр харагдацаас уншдаг тул зөрвөл апп ба сайт өөр сул үлдэгдэл харуулна.
  const OCC = vm.runInContext('_ORDER_OCCUPYING', sandbox);
  eq(OCC.slice().sort().join(','),
     ['reserved','preparation','cleaning','ready','started','prepared','delivering','installing','rented','teardown','returning'].sort().join(','),
     'гэрээ: нөөц эзлэх шатууд (public_availability харагдацтай ижил)');
}

// ── УРЬДЧИЛАН ЗАХИАЛАХ ХУГАЦАА (2026-09-10) ────────────────────────────────
// Жагсаалт зөвхөн эвентийн огноог харуулдаг тул «хэзээ ирсэн, хэдэн өдрийн
// өмнө баталгаажсан» гэдэг харагдахгүй байв. Маркетинг/нөөц төлөвлөлтөд хэрэгтэй.
{
  eq(F.orderLeadDays({ created_at: '2025-12-27T07:39:41Z', starts_at: '2026-01-02' }), 6, 'хугацаа: 6 хоногийн өмнө');
  eq(F.orderLeadDays({ created_at: '2026-01-03T03:42:27Z', starts_at: '2026-01-03' }), 0, 'хугацаа: тэр өдрөө');
  eq(F.orderLeadDays({ created_at: '2026-01-12T07:39:55Z', starts_at: '2026-01-29' }), 17, 'хугацаа: 17 хоног');
  eq(F.orderLeadDays({ created_at: '2026-01-10', starts_at: '2026-01-05' }), null, 'хугацаа: эвент болсны дараа бүртгэсэн → null');
  eq(F.orderLeadDays({ starts_at: '2026-01-05' }), null, 'хугацаа: ирсэн огноогүй → null');
  eq(F.orderLeadDays({}), null, 'хугацаа: талбаргүй → null (унахгүй)');
  eq(F.orderLeadDays(null), null, 'хугацаа: мөргүй → null');

  const os = [
    { created_at: '2026-01-01', starts_at: '2026-01-01' },   // 0
    { created_at: '2026-01-01', starts_at: '2026-01-03' },   // 2
    { created_at: '2026-01-01', starts_at: '2026-01-06' },   // 5
    { created_at: '2026-01-01', starts_at: '2026-01-21' },   // 20
    { created_at: '', starts_at: '2026-01-21' },             // тоологдохгүй
  ];
  const st = F.leadStats(os);
  eq(st.n, 4, 'хугацаа: огноотой мөр л тоологдоно');
  eq(st.median, 4, 'хугацаа: медиан (2 ба 5-ийн дундаж)');
  eq(st.sameDay, 1, 'хугацаа: тэр өдрөө ирсэн');
  eq(st.within2, 2, 'хугацаа: 2 хоногийн дотор');
  eq(st.over14, 1, 'хугацаа: 2 долоо хоногоос эрт');
  eq(F.leadStats([]).median, null, 'хугацаа: хоосон → null');
  eq(F.leadStats(null).n, 0, 'хугацаа: мөргүй → 0');
  eq(F.leadStats([{ created_at: '2026-01-01', starts_at: '2026-01-08' }]).median, 7, 'хугацаа: нэг мөрийн медиан');
}

// ── db/ — харагдацын SQL эх бичиг репод байгаа эсэх ─────────────────────────
// ⚠ Харагдацын SQL зөвхөн VPS дээр байсан бол VPS дахин байгуулахад дүрэм алга
//   болно. `db/` фолдер нь эх бичиг; уствал/хоосорвол энэ тест унана.
{
  const dbDir = path.join(__dirname, '..', 'db');
  const availSql = fs.readFileSync(path.join(dbDir, 'public_availability.sql'), 'utf8');
  const grantsSql = fs.readFileSync(path.join(dbDir, 'anon-grants.sql'), 'utf8');
  const noSql = (t) => String(t).replace(/--[^\n]*/g, '');   // SQL тайлбар нь `--`

  ok(/create or replace view public\.public_availability/.test(availSql),
     'db: public_availability.sql харагдац үүсгэдэг');

  // ХАМГИЙН ЧУХАЛ: SQL файлын төлвийн жагсаалт ба аппын _ORDER_OCCUPYING ЯГ ИЖИЛ
  // байх ёстой. Зөрвөл апп ба mevent.mn өөр сул үлдэгдэл харуулж давхар захиалга
  // үүснэ. Хоёрыг зэрэг өөрчлөхийг үүгээр эрхшээнэ.
  const clean = noSql(availSql);
  const arrAfter = (label) => {
    const at = clean.indexOf(label);
    if (at < 0) return null;
    const open = clean.indexOf('[', at), close = clean.indexOf(']', open);
    return [...clean.slice(open, close).matchAll(/'([a-z_-]+)'/g)].map(m => m[1]).sort();
  };
  const sqlStates = arrAfter('status = any (array[');
  const appStates = vm.runInContext('_ORDER_OCCUPYING', sandbox).slice().sort();
  eq((sqlStates || []).join(','), appStates.join(','),
     'db: public_availability.sql-ийн төлөв app.js-ийн _ORDER_OCCUPYING-тэй ИЖИЛ');

  // Сайтаас ирсэн ноорог нөөц эзэлдэг — SQL ба апп ижил эх сурвалжийн жагсаалттай.
  const sqlSources = arrAfter('source = any (array[');
  const appSources = vm.runInContext('_ORDER_OCCUPYING_DRAFT_SOURCES', sandbox).slice().sort();
  eq((sqlSources || []).join(','), appSources.join(','),
     'db: ноорог нөөц эзлэх эх сурвалж app.js-тэй ИЖИЛ');
  ok(/status = 'draft' and source = any/.test(clean),
     'db: харагдац сайтын ноорогийг нөөц эзлүүлдэг');

  // Харилцагчийн мэдээлэл харагдацад ОРОХГҮЙ.
  for (const col of ['customer', 'phone', 'email', 'delivery_address', 'total_mnt', 'paid_mnt']) {
    ok(!new RegExp('\\b' + col + '\\b').test(noSql(availSql)),
       `db: public_availability «${col}»-ыг задлаагүй`);
  }

  // Нийтийн эрхийн хил баримтжуулагдсан эсэх.
  ok(/grant select on public\.public_catalog\s+to anon/.test(grantsSql),
     'db: anon-grants нийтийн каталогийг нээдэг');
  ok(/revoke select on public\.app_config from anon/.test(grantsSql),
     'db: anon-grants app_config-ыг хаадаг');
  ok(/revoke select on public\.member_perms\s+from anon/.test(grantsSql),
     'db: anon-grants ажилтны эрхийн матрицыг хаадаг');
}

// ── ДАГАЖ АСУУХ — санал илгээгээд дуугүй болохоос сэргийлэх (2026-09-10) ────
// «Та үнийн санал авсан уу, захиалга хийх үү?» гэж асуусан эсэхийг бүртгэж,
// асуугаагүй/хариугүй байвал жагсаалтад ил тэмдэглэнэ.
{
  const q = (d) => ({ stage_meta: { quotes: [{ at: d + 'T05:00:00Z', amount: 1 }] } });
  const base = (extra) => ({ status: 'draft', paid_mnt: 0, ...q('2026-09-01'), ...extra });

  eq(F.quoteFollowupDue(base(), '2026-09-05'), { days: 4, asked: 0 }, 'дагах: 4 хоног хариугүй');
  eq(F.quoteFollowupDue(base(), '2026-09-02'), null, 'дагах: 1 хоног бол хараахан биш');
  eq(F.quoteFollowupDue(base(), '2026-09-03'), { days: 2, asked: 0 }, 'дагах: 2 хоногт л сануулна');

  // Санал илгээгээгүй бол өөр асуудал (📭 илгээгээгүй), энд орохгүй
  eq(F.quoteFollowupDue({ status: 'draft', paid_mnt: 0, stage_meta: {} }, '2026-09-30'), null, 'дагах: санал илгээгээгүй → сануулахгүй');
  // Төлбөр орсон бол асуух шаардлагагүй
  eq(F.quoteFollowupDue(base({ paid_mnt: 500 }), '2026-09-30'), null, 'дагах: төлбөр орсон → сануулахгүй');
  // Ноорог биш бол хамаагүй
  eq(F.quoteFollowupDue({ status: 'reserved', paid_mnt: 0, ...q('2026-09-01') }, '2026-09-30'), null, 'дагах: ноорог биш → сануулахгүй');

  // Асуусан бол хугацаа ТЭР өдрөөс дахин тоологдоно
  const asked = base({ stage_meta: { quotes: [{ at: '2026-09-01T05:00:00Z', amount: 1 }], followups: [{ at: '2026-09-05T05:00:00Z', result: 'Бодож байна' }] } });
  eq(F.quoteFollowupDue(asked, '2026-09-06'), null, 'дагах: сая асуусан бол дахин шаардахгүй');
  eq(F.quoteFollowupDue(asked, '2026-09-08'), { days: 3, asked: 1 }, 'дагах: асуусны дараа 3 хоног → дахин сануулна');

  // Татгалзсан бол хөөхөө болино
  const refused = base({ stage_meta: { quotes: [{ at: '2026-09-01T05:00:00Z', amount: 1 }], followups: [{ at: '2026-09-02T05:00:00Z', result: 'Татгалзсан' }] } });
  eq(F.quoteFollowupDue(refused, '2026-09-30'), null, 'дагах: татгалзсан → сануулга хаагдана');

  eq(F.followupsOf({ stage_meta: { followups: [{}, {}] } }).length, 2, 'дагах: лог уншина');
  eq(F.followupsOf({}).length, 0, 'дагах: логгүй → 0');
  eq(F.followupsOf(null).length, 0, 'дагах: мөргүй → 0 (унахгүй)');
  eq(F.quoteFollowupDue(null, '2026-09-05'), null, 'дагах: мөргүй → null');
  eq(vm.runInContext('FOLLOWUP_RESULTS', sandbox).length, 4, 'дагах: 4 хариу');
}

// ── ЗАХИАЛГЫН ТЭМДЭГЛЭЛ — append-only лог (2026-09-10) ──────────────────────
// Ажилтан захиалганд чөлөөт тэмдэглэл бичих газар БАЙХГҮЙ байв. `note` багана нь
// токенуудад эзэмдүүлсэн тул тэмдэглэл `stage_meta.notes`-д лог болж хадгалагдана.
{
  eq(F.orderNotesOf({ stage_meta: { notes: [{ text: 'a' }, { text: 'b' }] } }).length, 2, 'тэмдэглэл: лог уншина');
  eq(F.orderNotesOf({}).length, 0, 'тэмдэглэл: логгүй → 0');
  eq(F.orderNotesOf(null).length, 0, 'тэмдэглэл: мөргүй → 0 (унахгүй)');
  eq(F.orderNotesOf({ stage_meta: { notes: 'хог' } }).length, 0, 'тэмдэглэл: массив биш → 0');
  eq(F.orderNotesOf({ stage_meta: { notes: [{ text: '   ' }, { text: 'зөв' }] } }).length, 1,
     'тэмдэглэл: хоосон бичвэртэй мөр гарахгүй');

  // Нэмэх — append-only, хуучин дарагдахгүй
  const l1 = F.appendOrderNote([], 'эхний', '9911', '2026-09-10T01:00:00Z');
  eq(l1.length, 1, 'тэмдэглэл: нэмэгдэнэ');
  eq(l1[0].text, 'эхний', 'тэмдэглэл: бичвэр хадгалагдана');
  eq(l1[0].by, '9911', 'тэмдэглэл: бичсэн хүн хадгалагдана');
  eq(l1[0].at, '2026-09-10T01:00:00Z', 'тэмдэглэл: огноо хадгалагдана');
  const l2 = F.appendOrderNote(l1, 'хоёрдугаар', '9922', '2026-09-11T01:00:00Z');
  eq(l2.length, 2, 'тэмдэглэл: хоёр дахь нь НЭМЭГДЭНЭ (дарахгүй)');
  eq(l2[0].text, 'эхний', 'тэмдэглэл: хуучин мөр хэвээр');
  eq(l1.length, 1, 'тэмдэглэл: эх массив хөндөгдөхгүй (мутац үгүй)');

  // Хоосон бичвэр — шинэ мөр үүсгэхгүй
  eq(F.appendOrderNote(l1, '', '9911').length, 1, 'тэмдэглэл: хоосон → нэмэгдэхгүй');
  eq(F.appendOrderNote(l1, '   \n  ', '9911').length, 1, 'тэмдэглэл: зөвхөн зай → нэмэгдэхгүй');
  eq(F.appendOrderNote(l1, null, '9911').length, 1, 'тэмдэглэл: null → нэмэгдэхгүй');
  eq(F.appendOrderNote(null, 'а', '9911').length, 1, 'тэмдэглэл: логгүй захиалгад ч нэмэгдэнэ');
  eq(F.appendOrderNote(undefined, '', '9911').length, 0, 'тэмдэглэл: логгүй + хоосон → 0 (унахгүй)');
  eq(F.appendOrderNote([], '  зайтай  ', '99')[0].text, 'зайтай', 'тэмдэглэл: урд хойно зай хасагдана');
  const MAXN = vm.runInContext('ORDER_NOTE_MAX', sandbox);
  eq(F.appendOrderNote([], 'x'.repeat(MAXN + 500), '99')[0].text.length, MAXN, 'тэмдэглэл: дээд урт хязгаарлагдана');

  // Сүүлийн тэмдэглэл — картан дээр харагдах
  eq(F.lastOrderNote({ stage_meta: { notes: l2 } }).text, 'хоёрдугаар', 'тэмдэглэл: сүүлийнх нь картад');
  eq(F.lastOrderNote({}), null, 'тэмдэглэл: логгүй → null');
  eq(F.lastOrderNote(null), null, 'тэмдэглэл: мөргүй → null (унахгүй)');

  // SCAN — тэмдэглэл нь `note` баганад БИШ, stage_meta-д хадгалагдана (токен эвдэхгүй)
  const nsrc = fs.readFileSync(path.join(__dirname, '..', 'app.js'), 'utf8');
  const nbody = (nsrc.match(/async function openOrderNoteModal\([\s\S]*?\n}/) || [''])[0];
  ok(/sm\.notes = appendOrderNote/.test(nbody), 'тэмдэглэл: модал stage_meta.notes-д нэмнэ');
  ok(!/note:/.test(nbody), 'тэмдэглэл: `note` баганад БИЧИХГҮЙ (⟦DLV⟧/⟦CX⟧ токен эвдэхгүй)');
}


// ── Сайтаас ирсэн ноорог нөөц эзэлнэ; дотоод ноорог эзлэхгүй ─────────────────
// ⚠ Сайтын захиалга ҮРГЭЛЖ `draft` төлөвтэй ирдэг (харилцагч онлайн төлдөггүй).
//   2026-09-10 хүртэл ноорог нөөц эздэггүй байсан тул сайт нэг барааг ХЯЗГААРГҮЙ
//   олон удаа зарч чаддаг байв: нэг зочин 10 сандал захиалсан ч дараагийнхад
//   тэр 10 сандал бүрэн сул харагдана.
{
  const st = vm.runInContext('state', sandbox);
  const BQR = vm.runInContext('bookedQtyForRange', sandbox);
  const saved = { p: st.products, o: st.appOrders };
  st.products = [{ id: 'dr-1', sku: 'M-777', name: 'Шилэн сандал', stock: 10 }];
  const line = [{ sku: 'M-777', name: 'Шилэн сандал', qty: 10 }];

  st.appOrders = [{ number: 9001, status: 'draft', paid_mnt: 0, source: 'm-event-website',
                    starts_at: '2026-09-24', stops_at: '2026-09-24', items: line }];
  eq(BQR('Шилэн сандал', '2026-09-24', '2026-09-24'), 10,
     'нөөц: САЙТААС ирсэн ноорог нөөц ЭЗЭЛНЭ (давхар зарахаас хамгаална)');

  st.appOrders = [{ number: 9002, status: 'draft', paid_mnt: 0, source: 'app',
                    starts_at: '2026-09-24', stops_at: '2026-09-24', items: line }];
  eq(BQR('Шилэн сандал', '2026-09-24', '2026-09-24'), 0,
     'нөөц: ДОТООД ноорог (ажилтны үнийн санал) нөөц ЭЗЛЭХГҮЙ');

  // Төлбөргүй `reserved` нь canon-оор `draft` болдог — эх сурвалж нь шийднэ.
  st.appOrders = [{ number: 9003, status: 'reserved', paid_mnt: 0, source: 'm-event-website',
                    starts_at: '2026-09-24', stops_at: '2026-09-24', items: line }];
  eq(BQR('Шилэн сандал', '2026-09-24', '2026-09-24'), 10,
     'нөөц: сайтын төлбөргүй reserved ч нөөц эзэлнэ');

  st.appOrders = [{ number: 9004, status: 'canceled', paid_mnt: 0, source: 'm-event-website',
                    starts_at: '2026-09-24', stops_at: '2026-09-24', items: line }];
  eq(BQR('Шилэн сандал', '2026-09-24', '2026-09-24'), 0,
     'нөөц: цуцалсан сайтын захиалга эзлэхгүй');

  st.products = saved.p; st.appOrders = saved.o;
}

// ── УСТГАХ ШАЛТГААН ХАЯГДАХГҮЙ (2026-09-10) ────────────────────────────────
// Устгахад хэрэглэгчээс шалтгаан асуудаг ч зөвхөн 'canceled'-д бичигддэг байсан
// тул УСТГАСАН захиалгын шалтгаан чимээгүй хаягдаж байв (төлбөргүй устсан
// 50.8 сая₮-ийн шалтгаан алга болсон).
{
  eq(F.setCancelReason('', 'давхардсан'), '⟦CX|давхардсан⟧', 'шалтгаан: токен бичнэ');
  eq(F.cancelReasonOf('⟦CX|тест захиалга⟧'), 'тест захиалга', 'шалтгаан: токен уншина');
  eq(F.cancelReasonOf('токенгүй'), '', 'шалтгаан: токенгүй → хоосон');
  eq(F.cancelReasonOf(''), '', 'шалтгаан: хоосон → хоосон');
  eq(F.cancelReasonOf(F.setCancelReason('хуучин ⟦CX|а⟧ текст', 'б')), 'б', 'шалтгаан: солигдож шинэ нь уншигдана');
  eq(F.cancelReasonOf(F.setCancelReason('⟦DLV|city|0|150000⟧', 'харилцагч больсон')), 'харилцагч больсон',
     'шалтгаан: бусад токентой зэрэгцэнэ');
}

// SCAN — устгах шалтгаан бичигдэж, ХАРАГДАНА (2026-09-10)
{
  ok(/\['canceled', 'deleted'\]\.includes\(to\) \? setCancelReason/.test(src),
    'scan: устгахад ч шалтгаан note-д бичигдэнэ');
  ok(/\['canceled', 'deleted'\]\.includes\(st\) && isApp && cancelReasonOf/.test(src),
    'scan: устгасан захиалгын шалтгаан картан дээр харагдана');
  ok(/br-cxreason/.test(src), 'scan: шалтгаан жагсаалтын мөрөнд ч харагдана');
}

// ── ЦУЦЛАХ/УСТГАХ ШАЛТГААН = СОНГОЛТ (2026-09-10) ──────────────────────────
// Чөлөөт текст бүртгэгддэг ч ТООЛОГДДОГГҮЙ тул «яагаад алдаж байна вэ?» гэсэн
// асуултад хариулж чадахгүй байв. Одоо тогтсон сонголт → шалтгаанаар тоолно.
{
  const G = (n) => vm.runInContext(n, sandbox);
  const R = G('ORDER_CX_REASONS');
  ok(R.length >= 8, 'шалтгаан: хүрэлцэхүйц сонголт бий');
  ok(R.some(x => /үнэтэй/i.test(x.k)), 'шалтгаан: «түрээс үнэтэй» сонголт бий');
  ok(R.some(x => /Өөр компани/i.test(x.k)), 'шалтгаан: «өөр компаниас авсан» сонголт бий');
  ok(R.filter(x => x.admin).length === 2, 'шалтгаан: 2 нь бүртгэлийн шуугиан (давхардал/тест)');

  eq(F.cxReasonKey('⟦CX|Түрээс үнэтэй санагдсан⟧'), 'Түрээс үнэтэй санагдсан', 'шалтгаан: каноник уншина');
  eq(F.cxReasonKey('⟦CX|Түрээс үнэтэй санагдсан · 20% хямд санал авсан⟧'), 'Түрээс үнэтэй санагдсан',
     'шалтгаан: чөлөөт тайлбартай ч каноник хэсэг гарна');
  eq(F.cxReasonKey('⟦CX|гараар бичсэн хуучин текст⟧'), 'Бусад', 'шалтгаан: хуучин чөлөөт текст → «Бусад»');
  eq(F.cxReasonKey('токенгүй'), '', 'шалтгаан: шалтгаангүй → хоосон');
  ok(F.cxIsAdmin('⟦CX|Тест захиалга⟧') === true, 'шалтгаан: тест = бүртгэлийн шуугиан');
  ok(F.cxIsAdmin('⟦CX|Давхардсан бүртгэл⟧') === true, 'шалтгаан: давхардал = шуугиан');
  ok(F.cxIsAdmin('⟦CX|Түрээс үнэтэй санагдсан⟧') === false, 'шалтгаан: үнэтэй = ЖИНХЭНЭ алдагдал');

  const os = [
    { status: 'deleted', total_mnt: 10000000, note: '⟦CX|Түрээс үнэтэй санагдсан⟧' },
    { status: 'deleted', total_mnt: 5000000, note: '⟦CX|Түрээс үнэтэй санагдсан · хямд санал⟧' },
    { status: 'canceled', total_mnt: 3000000, note: '⟦CX|Өөр компаниас авсан⟧' },
    { status: 'deleted', total_mnt: 9000000, note: '⟦CX|Тест захиалга⟧' },
    { status: 'returned', total_mnt: 7000000, note: '⟦CX|Түрээс үнэтэй санагдсан⟧' },   // хаагдаагүй — орохгүй
  ];
  const st = F.cxStats(os);
  eq(st.lostN, 3, 'нэгтгэл: жинхэнэ алдсан 3 (тест орохгүй)');
  eq(st.lostSum, 18000000, 'нэгтгэл: алдсан дүн (тестийн 9 сая ОРООГҮЙ)');
  eq(st.adminN, 1, 'нэгтгэл: шуугиан 1');
  eq(st.by['Түрээс үнэтэй санагдсан'], { n: 2, sum: 15000000 }, 'нэгтгэл: шалтгаанаар тоо ба дүн');
  eq(F.cxStats([]).lostN, 0, 'нэгтгэл: хоосон → 0');
  eq(F.cxStats(null).lostSum, 0, 'нэгтгэл: мөргүй → 0 (унахгүй)');
  eq(F.cxStats([{ status: 'deleted', total_mnt: 100, note: '' }]).by['— шалтгаан бичээгүй'].n, 1,
     'нэгтгэл: шалтгаангүй нь тусад нь тоологдоно');
}

// SCAN — шалтгаан чөлөөт текстээр биш, СОНГОЛТООР авагдана (2026-09-10)
{
  const fn = src.slice(src.indexOf('async function cancelOrderWithReason'), src.indexOf('async function bqUpdateStatus'));
  ok(/pickCancelReason\(num, isDel, o\)/.test(fn), 'scan: шалтгаан сонгох цонх ашиглагдана');
  ok(!/showPrompt\(/.test(fn), 'scan: чөлөөт текстийн prompt хасагдсан');
}

// ── ЧИМЭЭГҮЙ УНАЛТ: ирцийн дата + «гэнэт дахин эхэлсэн» дохио (2026-09-11) ──
{
  // Уналтын шалтгааныг хүний хэлээр — хэрэглэгч программист биш
  eq(F.attFailMsg(new Error('эрх хүрэхгүй (401)')), 'Сесс хуучирсан — дахин нэвтэрнэ үү', 'ирц: 401 → сесс хуучирсан');
  eq(F.attFailMsg(new Error('offline')), 'Сүлжээ холбогдсонгүй', 'ирц: offline → сүлжээ');
  eq(F.attFailMsg(new Error('Failed to fetch')), 'Сүлжээ холбогдсонгүй', 'ирц: fetch унав → сүлжээ');
  eq(F.attFailMsg(new Error('timeout')), 'Сервер хариу өгсөнгүй', 'ирц: timeout → сервер');
  ok(/Ачаалагдсангүй/.test(F.attFailMsg(new Error('HTTP 500'))), 'ирц: бусад → ерөнхий тайлбар');
  ok(/Ачаалагдсангүй/.test(F.attFailMsg(null)), 'ирц: null → унахгүй');

  const esrc = fs.readFileSync(path.join(__dirname, '..', 'app.js'), 'utf8');

  // SCAN — loadAttendanceMonth нь HTTP алдааг ЧИМЭЭГҮЙ өнгөрүүлэхгүй
  const lam = (esrc.match(/async function loadAttendanceMonth\(\)[\s\S]*?\n}/) || [''])[0];
  ok(/if \(!r\.ok\) throw/.test(lam), 'ирц: !r.ok → throw (401/500 чимээгүй өнгөрөхгүй)');
  ok(/state\.attMonthFail = /.test(lam), 'ирц: уналтын төлөв хадгалагдана (дахин оролдох боломж)');
  ok(/dataLoadFailed\('loadAttendanceMonth'/.test(lam), 'ирц: алдаа серверт мэдэгдэнэ');

  // SCAN — «гэнэт дахин эхэлсэн» нь НЭГ хурууны хээтэй (дэлгэц бүрээр лог дүүргэхгүй)
  const cur = (esrc.match(/function checkUncleanRestart\(\)[\s\S]*?\n}/) || [''])[0];
  ok(/_reportErrToServer\('Апп гэнэт дахин эхэлсэн', 'restart',/.test(cur),
     'дахин эхлэлт: src ТОГТМОЛ «restart» (дэлгэц бүрээр өөр хээ болохгүй)');
  // ⚠ Энэ шалгуур урьд нь ЗӨВХӨН кодын ХЭЛБЭРийг («d.ver» бичигдсэн эсэх) шалгадаг байсан
  //   тул `globalThis.CACHE_TAG` хаана ч оноогдоогүй, шалгуур бүрэн үхмэл байхад ногоон
  //   хэвээр байв (fp d17c741186f5). Одоо ЗАН ҮЙЛЭЭР шалгагдана — доорх
  //   «Апп гэнэт дахин эхэлсэн» блокийг үз.
  ok(/uncleanRestart\(d, Date\.now\(\)/.test(cur),
     'дахин эхлэлт: хувилбарын шалгуур цэвэр функцэд шилжсэн (зан үйлээр тестлэгддэг)');
  ok(/дэлгэц: /.test(cur), 'дахин эхлэлт: дэлгэц нь stack-д (хээнд орохгүй)');

  // Хурууны хээ — тогтмол src нь дэлгэц ялгаатай ч ИЖИЛ хээ гаргана
  const FP = vm.runInContext('errFingerprint', sandbox);
  eq(FP('Апп гэнэт дахин эхэлсэн', 'restart'), FP('Апп гэнэт дахин эхэлсэн', 'restart'),
     'дахин эхлэлт: ижил хээ (нэг бүлэг)');
  ok(FP('Апп гэнэт дахин эхэлсэн', 'restart:orders') !== FP('Апп гэнэт дахин эхэлсэн', 'restart:mine'),
     'дахин эхлэлт: хуучин хэлбэр дэлгэц бүрээр өөр хээ гаргадаг байв');
}

// ── БАРЬЦАА БУЦААХ ГҮЙЛГЭЭНИЙ УТГА (2026-09-11) ─────────────────────────────
// Гараар бичихэд дугаар/нэр андуурч харилцагч төлбөрөө танихгүй болдог.
{
  eq(F.depositRefundMemo(1470, 'Ч.Амри'), 'Барьцаа буцаалт / Захиалга №1470 / Ч.Амри', 'утга: стандарт хэлбэр');
  eq(F.depositRefundMemo(1470, ''), 'Барьцаа буцаалт / Захиалга №1470', 'утга: нэргүй бол дугаараар');
  eq(F.depositRefundMemo(1470, null), 'Барьцаа буцаалт / Захиалга №1470', 'утга: нэр null (унахгүй)');
  eq(F.depositRefundMemo(null, 'Ч.Амри'), 'Барьцаа буцаалт / Захиалга №— / Ч.Амри', 'утга: дугааргүй бол —');
  eq(F.depositRefundMemo(1470, '  Ч.   Амри  '), 'Барьцаа буцаалт / Захиалга №1470 / Ч. Амри', 'утга: илүү зай нэгтгэгдэнэ');
  const MX = vm.runInContext('REFUND_MEMO_MAX', sandbox);
  const long = F.depositRefundMemo(1470, 'Х'.repeat(200));
  ok(long.length <= MX, 'утга: банкны хязгаараас хэтрэхгүй');
  ok(long.indexOf('№1470') > 0, 'утга: хэтэрсэн ч ЗАХИАЛГЫН ДУГААР бүтэн үлдэнэ');
  ok(F.depositRefundMemo('1470', 'А').indexOf('№1470') > 0, 'утга: дугаар тексттэй ч ажиллана');

  // Банк — зөвхөн бүртгэгдсэн бол; дансны дугаараас ТААМАГЛАХГҮЙ
  eq(F.refundBankOf('Ч.Амри · 5009711612 · банк:Хаан · 1470'), 'Хаан', 'банк: утгаас уншина');
  eq(F.refundBankOf('банк: Голомт'), 'Голомт', 'банк: зайтай ч уншина');
  eq(F.refundBankOf('Ч.Амри · 5009711612 · 1470'), '', 'банк: хуучин бичлэгт байхгүй → хоосон');
  eq(F.refundBankOf(''), '', 'банк: хоосон → хоосон');
  eq(F.refundBankOf(null), '', 'банк: null → хоосон (унахгүй)');

  // SCAN — шинэ төлбөрт банк paid_ref-д бичигдэнэ
  const msrc = fs.readFileSync(path.join(__dirname, '..', 'app.js'), 'utf8');
  ok(/r\.bank && \('банк:' \+ r\.bank\)/.test(msrc), 'банк: захиалгын төлбөрийн paid_ref-д бичигдэнэ');
  ok(/bank: d\.bank \|\| ''/.test(msrc), 'банк: баримт задлахад bank талбар дамжина');
}

// ── ДУУССАН ЗАХИАЛГЫГ САРААР АРХИВЛАХ (2026-09-10) ─────────────────────────
// Нэг нэгээр архивлах нь 100 захиалгад 100 дарлага. Сараар нэг товчоор.
// ⚠ Зөвхөн ДУУССАН захиалга — идэвхтэй ажил жагсаалтаас алга болохгүй.
{
  const os = [
    { id: 'a', status: 'returned', starts_at: '2026-08-05' },
    { id: 'b', status: 'stopped', starts_at: '2026-08-20' },
    { id: 'c', status: 'rented', starts_at: '2026-08-25' },
    { id: 'd', status: 'returned', starts_at: '2026-09-01' },
    { id: 'e', status: 'reserved', starts_at: '2026-08-10' },     // идэвхтэй — архивлахгүй
    { id: 'f', status: 'draft', starts_at: '2026-08-11' },        // ноорог — архивлахгүй
    { id: 'g', status: 'archived', starts_at: '2026-08-12' },     // аль хэдийн архивт
    { id: 'h', status: 'deleted', starts_at: '2026-08-13' },      // устгасан
  ];
  eq(F.archivableOrders(os).map(o => o.id), ['a', 'b', 'c', 'd'], 'архив: зөвхөн дууссан захиалга');
  eq(F.archivableOrders(os, '2026-08').map(o => o.id), ['a', 'b', 'c'], 'архив: сараар шүүнэ');
  eq(F.archivableOrders(os, '2026-09').map(o => o.id), ['d'], 'архив: өөр сар');
  eq(F.archivableOrders(os, '2026-07').length, 0, 'архив: захиалгагүй сар → 0');
  eq(F.archivableOrders([]).length, 0, 'архив: хоосон → 0');
  eq(F.archivableOrders(null).length, 0, 'архив: мөргүй → 0 (унахгүй)');
  eq(F.archivableOrders([{ status: 'returned', created_at: '2026-08-01T00:00:00Z' }], '2026-08').length, 1,
     'архив: эвентийн огноогүй бол ирсэн огноогоор');
  const R = vm.runInContext('ORDER_ARCHIVABLE', sandbox);
  ok(!R.includes('reserved') && !R.includes('draft') && !R.includes('deleted'),
     'архив: идэвхтэй/ноорог/устгасан төлөв архивлах жагсаалтад БАЙХГҮЙ');

  // Архивлахаас ӨМНӨ төлбөр дутуугийн сэрэмжлүүлэг (өр тэглэгдэхгүй ч хэрэглэгч мэдэх ёстой)
  const up = F.archUnpaid([
    { total_mnt: 1927000, paid_mnt: 963500 },   // 963,500 дутуу
    { total_mnt: 500000, paid_mnt: 500000 },    // бүтэн төлсөн
    { total_mnt: 300000, paid_mnt: 400000 },    // хэтрүүлж төлсөн → дутуу биш
    { total_mnt: 200000, paid_mnt: 0 },         // 200,000 дутуу
  ]);
  eq(up.n, 2, 'архив: төлбөр дутуу захиалгын тоо');
  eq(up.sum, 1163500, 'архив: төлбөр дутуу нийт дүн');
  eq(F.archUnpaid([]).n, 0, 'архив: хоосон → дутуу 0');
  eq(F.archUnpaid(null).sum, 0, 'архив: мөргүй → 0 (унахгүй)');
  eq(F.archUnpaid([{}]).n, 0, 'архив: дүнгүй мөр → дутуу биш');

  const RCV = vm.runInContext('RECEIVABLE_ORDER_ST', sandbox);
  ok(RCV.has('archived'), 'архив: архивласан төлөв авлагын Set-д БАЙНА (өр алга болохгүй)');
  // SCAN — сараар архивлах confirm нь төлбөр дутуугийн сэрэмжлүүлэг харуулах (чимээгүй архивлахгүй)
  {
    const asrc = fs.readFileSync(path.join(__dirname, '..', 'app.js'), 'utf8');
    const body = (asrc.match(/async function archiveDoneMonth\([\s\S]*?\n}/) || [''])[0];
    ok(/archUnpaid\(list\)/.test(body), 'архив: archiveDoneMonth нь archUnpaid-аар дутууг тоолно');
    ok(/төлбөр дутуу/.test(body), 'архив: confirm мессежид «төлбөр дутуу» сэрэмжлүүлэг бий');
  }
}

// SCAN — архивлалт ЗӨӨЛӨН (дата устгахгүй) 2026-09-10
{
  ok(/status: 'archived'/.test(src), 'scan: архивлалт зөвхөн төлөв солино');
  ok(/bulkArchiveOrders/.test(src) && /archiveDoneMonth/.test(src), 'scan: бөөн ба сарын архивлалт бий');
}

// SCAN — «Устгасан» биш «Больсон» (2026-09-10)
// Захиалга «устдаггүй», ХЭЛЦЭЛ больдог. DB төлөв `deleted` хэвээр (дата, түүх,
// код хөндөгдөхгүй) — зөвхөн хэрэглэгчид харагдах нэр солигдов.
{
  const buckets = src.slice(src.indexOf("{ key: 'deleted'"), src.indexOf("{ key: 'deleted'") + 140);
  ok(/label: 'Больсон'/.test(buckets), 'нэр: бүлгийн шошго «Больсон»');
  ok(/orderCloseLabel\(o\) \{ return orderCloseAction\(o\) === 'deleted' \? '🚫 Больсон'/.test(src),
     'нэр: хаах товч «🚫 Больсон»');
  ok(/status: 'deleted'/.test(src), 'нэр: DB төлөв `deleted` ХЭВЭЭР (зөвхөн шошго солигдсон)');
  // Захиалгын жагсаалт/картанд «Устгасан» гэсэн шошго үлдээгүй
  const ui = src.slice(src.indexOf('function orderListRow('), src.indexOf('function attachOrdersHandlers('));
  ok(!/Устгасан/.test(ui), 'нэр: захиалгын жагсаалтад «Устгасан» шошго үлдээгүй');
}

// ── Сайтын ноорог 72 цагийн дараа нөөцөө сулална ────────────────────────────
// ⚠ Хугацаагүй барьвал нэг халдагч (эсвэл ирээгүй нэг харилцагч) каталогийг
//   тодорхойгүй хугацаагаар блоклоно. Ямар ч үер 72 цагийн дараа өөрөө арилна.
{
  const st = vm.runInContext('state', sandbox);
  const BQR = vm.runInContext('bookedQtyForRange', sandbox);
  const HOLD = vm.runInContext('_SITE_DRAFT_HOLD_H', sandbox);
  const saved = { p: st.products, o: st.appOrders };
  st.products = [{ id: 'h-1', sku: 'M-888', name: 'Түр сандал', stock: 10 }];
  const line = [{ sku: 'M-888', name: 'Түр сандал', qty: 4 }];
  const ago = (h) => new Date(Date.now() - h * 3600 * 1000).toISOString();
  const mk = (extra) => [Object.assign({
    number: 9100, status: 'draft', paid_mnt: 0, source: 'm-event-website',
    starts_at: '2026-12-24', stops_at: '2026-12-24', items: line,
  }, extra)];

  eq(HOLD, 72, 'ноорог: хугацаа 72 цаг (SQL-тэй ижил)');

  st.appOrders = mk({ created_at: ago(1) });
  eq(BQR('Түр сандал', '2026-12-24', '2026-12-24'), 4, 'ноорог: 1 цагийн өмнөх нөөц ЭЗЭЛНЭ');

  st.appOrders = mk({ created_at: ago(71) });
  eq(BQR('Түр сандал', '2026-12-24', '2026-12-24'), 4, 'ноорог: 71 цагийн өмнөх бас эзэлнэ');

  st.appOrders = mk({ created_at: ago(73) });
  eq(BQR('Түр сандал', '2026-12-24', '2026-12-24'), 0, 'ноорог: 73 цагийн өмнөх нөөцөө СУЛАЛНА');

  // Хэвийн бус гэж тэмдэглэсэн захиалга хэзээ ч нөөц эзлэхгүй.
  st.appOrders = mk({ created_at: ago(1), note: 'сайт ⟦SUSPECT⟧' });
  eq(BQR('Түр сандал', '2026-12-24', '2026-12-24'), 0, 'ноорог: ⟦SUSPECT⟧ тэмдэгтэй нь эзлэхгүй');

  // Огноогүй хуучин мөр — хуучин зан үйл (эзэлнэ), чимээгүй алдагдахгүй.
  st.appOrders = mk({});
  eq(BQR('Түр сандал', '2026-12-24', '2026-12-24'), 4, 'ноорог: created_at байхгүй бол эзэлсээр');

  // Төлбөртэй захиалгад хугацаа хамаарахгүй.
  st.appOrders = mk({ status: 'reserved', paid_mnt: 500000, created_at: ago(500) });
  eq(BQR('Түр сандал', '2026-12-24', '2026-12-24'), 4, 'ноорог: төлбөртэй захиалгад хугацаа хамаарахгүй');

  st.products = saved.p; st.appOrders = saved.o;
}

// ── SQL ба апп: хугацаа ба ⟦SUSPECT⟧ дүрэм ижил эсэх ───────────────────────
{
  const sql = fs.readFileSync(path.join(__dirname, '..', 'db', 'public_availability.sql'), 'utf8');
  const m = sql.match(/created_at > now\(\) - interval '(\d+) hours'/);
  ok(!!m, 'db: харагдацад ноорогийн хугацааны хязгаар бий');
  eq(Number(m && m[1]), vm.runInContext('_SITE_DRAFT_HOLD_H', sandbox),
     'db: харагдацын цаг app.js-ийн _SITE_DRAFT_HOLD_H-тэй ИЖИЛ');
  ok(/not like '%⟦SUSPECT⟧%'/.test(sql), 'db: харагдац ⟦SUSPECT⟧ захиалгыг нөөцөөс хасдаг');
}

// ── push-broadcast нэвтрэлт — токен заавал явна ─────────────────────────────
// ⚠ 2026-09-10 хүртэл push-broadcast нь сайтын кодод ИЛ байгаа түлхүүрээр л
//   хамгаалагдаж байсан: интернэтээс хэн ч 49 ажилтны утсанд дурын мэдэгдэл
//   илгээх боломжтой байв. Одоо нэвтэрсэн ажилтны токен шаардана.
{
  const U = vm.runInContext('_sessionTokenUsable', sandbox);
  const mk = (expMs) => Buffer.from(JSON.stringify({ ph: '99001122', lvl: 50, exp: expMs }))
    .toString('base64url') + '.xxxxsig';
  ok(U(mk(Date.now() + 30 * 86400000)), 'push: хүчинтэй токен ашиглагдана');
  ok(!U(mk(Date.now() - 1000)), 'push: хугацаа дууссан токен ашиглагдахгүй');
  ok(!U(''), 'push: хоосон токен ашиглагдахгүй');
  ok(!U('хог'), 'push: эвдэрсэн токен ашиглагдахгүй');
  ok(!U(mk(undefined)), 'push: exp-гүй токен ашиглагдахгүй');

  const fn = src.slice(src.indexOf('function pushBroadcast'), src.indexOf('function uid()'));
  ok(/if \(!token \|\| !_sessionTokenUsable\(token\)\) return;/.test(fn),
     'scan: токенгүй бол push илгээхийг оролдохгүй');
  ok(/JSON\.stringify\(\{ email, token, \.\.\.payload \}\)/.test(fn),
     'scan: push биед токен явна');
}

// SCAN — дата ачаалалт ЧИМЭЭГҮЙ унахыг хориглох (2026-09-10)
// Алдаа: `loadMyAttendance` серверийн 403-ыг `catch (e) {}`-ээр залгиж, ажилтны
// «Миний ирц» дэлгэц зүгээр ХООСОН харагдаж байв. Алдаа хаана ч бүртгэгдээгүй тул
// ажилтан амаар хэлэх хүртэл хэн ч мэдээгүй. `app_errors` хүснэгтэд бүх цаг үеийн
// ганц мөр байсны шалтгаан нь ийм 23 хоосон catch (нийт аппад 141).
// Дүрэм: `load*` функц дотор хоосон `catch` БАЙХГҮЙ — `dataLoadFailed(нэр, e)` дуудна.
{
  const lines = src.split('\n');
  const empty = /catch\s*\([A-Za-z_]*\)\s*\{\s*(?:\/\*[^*]*\*\/)?\s*\}/;
  const fnre = /^(?:async\s+)?function\s+(load[A-Za-z0-9_]*)/;
  let fn = null, depth = 0; const bad = [];
  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(fnre);
    if (m) { fn = m[1]; depth = 0; }
    if (!fn) continue;
    depth += (lines[i].match(/\{/g) || []).length - (lines[i].match(/\}/g) || []).length;
    if (empty.test(lines[i])) bad.push(fn + ':' + (i + 1));
    if (depth <= 0 && i > 0 && /^\}/.test(lines[i])) fn = null;
  }
  eq(bad.length, 0, 'scan: load* дотор хоосон catch байхгүй (dataLoadFailed ашигла)' +
     (bad.length ? ' → ' + bad.slice(0, 5).join(', ') : ''));
  ok(/function dataLoadFailed\(/.test(src), 'scan: dataLoadFailed тодорхойлогдсон');
}

// ── SCAN: алдааны лог ЧИМЭЭ БАГАТАЙ байх (2026-09-10) ─────────────────────
// Хуудсыг шинэчлэхэд нисэж яваа fetch бүр «унасан» болж бүртгэгддэг байв
// (loadMyAttendance-ийн анхны дохио яг ингэж гарсан). 49 ажилтан F5 дарах бүрд
// лог дүүрч, дунд нь байгаа БОДИТ алдаа алга болно.
{
  ok(/if \(_pageUnloading\) return;/.test(src), 'scan: хаагдаж буй хуудсанд алдаа бүртгэхгүй');
  ok(/navigator\.onLine === false\) return;/.test(src), 'scan: офлайн үед алдаа бүртгэхгүй');
  ok(/addEventListener\('pageshow'/.test(src), 'scan: bfcache-аас буцвал дахин бүртгэнэ');
  // Сервер 403/401 буцаахад ЧИМЭЭГҮЙ өнгөрөхгүй — «Миний ирц» хоосон харагдаж байсан шалтгаан
  const fn = src.slice(src.indexOf('async function loadMyAttendance('));
  ok(/else dataLoadFailed\('loadMyAttendance'/.test(fn.slice(0, 900)),
     'scan: loadMyAttendance серверийн алдааг мэдээлнэ');
}

// SCAN — сесс хуучирахад ХООСОН дэлгэц биш, нэвтрэх дэлгэц (2026-09-10)
// `pgrstBearer()` нь токенгүй бол anon руу чимээгүй уналаа. Аюулгүй байдлын
// түгжээний дараа anon-д уншилтын эрх БАЙХГҮЙ болсон тул аппын PostgREST
// асуулгууд 401 буцаж, дэлгэцүүд хоосон харагдаж эхэлсэн. Эхлэхэд exp-г шалгана.
{
  ok(/function pgrstTokenValid\(/.test(src), 'scan: pgrstTokenValid тодорхойлогдсон');
  ok(/if \(!pgrstTokenValid\(\) && navigator\.onLine !== false\)/.test(src),
     'scan: эхлэхэд токен хүчингүй бол дахин нэвтрүүлнэ (офлайнд хөндөхгүй)');
  ok(/Сесс хуучирсан/.test(src), 'scan: хэрэглэгчид ойлгомжтой мессеж харуулна');
}

// SCAN — «Гэнэт дахин эхэлсэн» дохио (2026-09-10)
// Зураг оруулахаар камер нээхэд PWA систем санах ойноос устгагдаж апп дахин
// эхэлдэг гэсэн мэдээлэл ирсэн. JS алдаа шидэгддэггүй тул одоогийн бүртгэл
// барихгүй. «Амьд» тэмдэглэгээ үлдээж, цэвэр хаагдаагүйг илрүүлж мэдээлнэ.
{
  ok(/function checkUncleanRestart\(/.test(src), 'scan: checkUncleanRestart тодорхойлогдсон');
  ok(/function markAlive\(/.test(src) && /function clearAlive\(/.test(src),
     'scan: markAlive/clearAlive хосоороо байна');
  ok(/^function render\(\) \{\n  markAlive\(\);/m.test(src), 'scan: render дээр markAlive холбогдсон');
  ok(/addEventListener\('pagehide', \(\) => \{ _pageUnloading = true; clearAlive\(\); \}\)/.test(src),
     'scan: цэвэр хаалтад тэмдэглэгээ арилна');
  ok(/Апп гэнэт дахин эхэлсэн/.test(src), 'scan: дохио серверт мэдэгддэг');
}

// ── БАРЬЦАА БУЦААХ — мөнгө ирсэн данс руугаа буцна (2026-09-10) ──────────────
// Орлогын PDF задлахад шилжүүлэгчийн данс `paid_ref`-д үлддэг. Буцаалтыг өөр данс
// руу хийвэл хэн авсан нь нотлогдохгүй тул модалд эх дансыг харуулж, гарах баримтын
// хүлээн авагчийн данс таарахгүй бол анхааруулна.
{
  need(['refundAcctDigits']);
  eq(F.refundAcctDigits('5041 234 567'), '5041234567', 'буцаалт: данс зөвхөн цифрээр харьцуулагдана');
  eq(F.refundAcctDigits('3001-234-567'), '3001234567', 'буцаалт: зураас цэвэрлэгдэнэ');
  eq(F.refundAcctDigits('Данс: 3001-234-567'), '', 'буцаалт: үсэгтэй утга данс болохгүй (гүйлгээний утгыг данс гэж харуулахгүй)');
  eq(F.refundAcctDigits('12345'), '', 'буцаалт: 6-аас бага цифр = данс биш');
  eq(F.refundAcctDigits(''), '', 'буцаалт: хоосон → хоосон');
  eq(F.refundAcctDigits('Бямбаа'), '', 'буцаалт: нэр данс болохгүй');

  // paid_ref-ээс эх данс задарна (олон төлбөр бол бүгд)
  const ref = '[#GL123] Бямбаа · 5041234567 · түрээс  |  [#GL124] Болд · 3001234567 · үлдэгдэл';
  const list = F.parsePaidRef(ref);
  eq(list.map(r => r.acct), ['5041234567', '3001234567'], 'буцаалт: эх данснууд baримтаас гарна');
  eq(list.map(r => r.sender), ['Бямбаа', 'Болд'], 'буцаалт: шилжүүлэгчийн нэр гарна');

  // SCAN — модал эх дансыг харуулж, гарах баримтыг тулгадаг эсэх
  ok(/data-rf-copy=/.test(src), 'scan: буцаалтын модалд эх данс харагдана');
  ok(/⚠ орлого орсон данс биш/.test(src), 'scan: өөр данс руу буцаавал анхааруулна');
}

// ── БАРЬЦААТАЙ ЗАХИАЛГА — буцаах данс картад шууд (2026-09-10) ──────────────
// Барьцаа нь мөнгө ирсэн данс руугаа буцна. Данс нь орлогын PDF-ээс `paid_ref`-д
// орсон байдаг тул картад шууд харуулна — ажилтан баримт нээж хайхгүй.
{
  ok(/data-copy-text="\$\{escapeHtml\(a\.acct\)\}"/.test(src), 'scan: барьцаатай картад буцаах данс харагдана (дарж хуулна)');
  ok(/data-copy-label="Дансны дугаар хууллаа"/.test(src), 'scan: данс хуулахад тодорхой мессеж');
  // Гүйлгээний утга — гараар бичихгүй, автоматаар + хуулах товч
  ok(/depositRefundMemo\(o\.number, o\.customer\)/.test(src), 'scan: гүйлгээний утга АВТОМАТААР үүснэ');
  ok(/data-copy-label="Гүйлгээний утга хууллаа"/.test(src), 'scan: гүйлгээний утгыг дарж хуулна');
  ok(!/data-acct-copy/.test(src), 'scan: хуучин data-acct-copy үлдээгүй (үхсэн handler хасагдсан)');
  ok(/Буцаах данс тодорхойгүй/.test(src), 'scan: данс уншигдаагүй бол ил хэлнэ (чимээгүй хоосон биш)');
  // Буцаасны дараа харуулахгүй + мөнгө харах эрхгүй ажилтанд харуулахгүй
  ok(/_dep > 0 && !_depRet && isApp && _cardMoney/.test(src), 'scan: зөвхөн буцаагаагүй барьцаанд, мөнгө харах эрхтэйд');
}

// ── БУЦААЛТЫН ДҮН ↔ БАРИМТ (2026-09-10) ────────────────────────────────────
// Гараар бичсэн дүн PDF-ийн дүнтэй зөрвөл чимээгүй бүртгэгддэг байв — мөнгө буруу
// бичигдвэл хуулга тулгахад олдохгүй, барьцаа «буцаасан» болж дуусна.
{
  need(['rfAmtMismatch']);
  eq(F.rfAmtMismatch(50000, 50000), false, 'буцаалт: дүн таарвал зөрүүгүй');
  eq(F.rfAmtMismatch(50000, 45000), true, 'буцаалт: зөрвөл илэрнэ');
  eq(F.rfAmtMismatch(50000, 0), false, 'буцаалт: баримтын дүн уншигдаагүй бол тулгахгүй (худал сэрэмжлүүлэг өгөхгүй)');
  eq(F.rfAmtMismatch(0, 50000), false, 'буцаалт: дүн бичээгүй үед сэрэмжлүүлэхгүй (хадгалах товч аль хэдийн хаана)');
  eq(F.rfAmtMismatch('50,000', 50000), false, 'буцаалт: тоо болгож харьцуулна');
  ok(/⚠ Дүн баримттай зөрж байна/.test(src), 'scan: зөрүүтэй бол хүнээр баталгаажуулна');
  ok(/дүн уншигдсангүй, гараар бичсэн дүнгээр бүртгэнэ/.test(src), 'scan: PDF дүн уншигдаагүйг ил хэлнэ');
}

// ── n8n webhook дуудлага БҮР нэвтэрсэн ажилтны токен явуулна ────────────────
// ⚠ Сайтын кодод ил байгаа түлхүүр нь n8n-ий дата webhook-уудыг хамгаалдаг
//   ЦОРЫН ГАНЦ зүйл байсан: түүгээр 158 ажилтны нэр/утас/албан тушаал,
//   112 NOMAAD үнийн санал (2.39 тэрбум₮), 435 дотоод ажил татагдана.
//   Токеныг ЗАДРАХГҮЙ хэлбэрээр (query биш, header-ээр) илгээнэ — n8n нь
//   гүйцэтгэлийн түүхэнд бүх query параметрийг хадгалдаг.
{
  const lines = src.split('\n');
  const missing = [];
  for (let i = 0; i < lines.length; i++) {
    if (!lines[i].includes('withKey(') || lines[i].includes('function withKey')) continue;
    // `window.open` ба HTML угсрах мөрүүд fetch БИШ — толгой явуулах боломжгүй.
    if (/window\.open|<!DOCTYPE|innerHTML/.test(lines[i])) continue;
    const win = lines.slice(i, i + 8).join('\n');
    if (!/fetchWithTimeout|fetch\(/.test(win)) continue;
    if (!win.includes('n8nAuthHeaders')) missing.push(i + 1);
  }
  ok(missing.length === 0,
     `scan: n8n webhook дуудлага бүр n8nAuthHeaders ашиглана (дутуу мөр: ${missing.join(',') || '—'})`);

  // ⚠ PostgREST дуудлагад X-Session-Token НЭМЭХГҮЙ — Caddy-ийн CORS түүнийг
  //   зөвшөөрөөгүй бол браузер блоклож АПП БҮХЭЛДЭЭ унана.
  const bad = src.split('\n').filter(l => l.includes('n8nAuthHeaders') && /apikey|rest\/v1/.test(l));
  ok(bad.length === 0, 'scan: PostgREST дуудлагад session толгой нэмэгдээгүй');

  // Токен query-д БҮҮ яв (n8n гүйцэтгэлийн түүхэнд үлдэнэ).
  ok(!/[?&]token=\$\{|[?&]token=' \+/.test(src), 'scan: токен URL query-д яваагүй');
}

// ── ГОЛОМТЫН ХҮСНЭГТЭН БАРИМТ — данс/нэр уншигдана (2026-09-10) ─────────────
// Цахим баримтын шинэ загварт шошгууд эгнээгээрээ, утгууд нь дараа нь ордог тул
// «шошгийн дараагийн мөр» дүрэм хоосон буцааж, барьцаа буцаах данс алга болж байв.
{
  const tableTxt = [
    'Цахим гүйлгээний баримт',
    'Хүсэлтийн лавлах дугаар:', 'S18532103202609032',
    'Татсан огноо:', '2026-09-03 14:01',
    'Шилжүүлэгчийн дансны дугаар', 'Хүлээн авагчийн данс', 'Гүйлгээний дүн', 'Гүйлгээний төлөв',
    '5309576444', '3635161180', 'MN24001503635161180', '826,680.00 MNT', 'Амжилттай',
    'Шилжүүлэгчийн нэр', 'Хүлээн авагчийн нэр', 'Гүйлгээний утга',
    'БАДАРЧ ОЮУНЖАРГАЛ', 'ЧИМУН ХХК', '1483-БАДАРЧ ОЮУНЖАРГАЛ',
    'Хүлээн авагчийн банк', 'Гүйлгээний огноо', 'Голомт Банк', '2026-09-03',
  ].join('\n');
  const t = F.parseBankReceipt(tableTxt);
  eq(t.senderAcct, '5309576444', 'баримт(хүснэгт): шилжүүлэгчийн данс уншигдана');
  eq(t.receiverAcct, '3635161180', 'баримт(хүснэгт): хүлээн авагчийн данс уншигдана');
  eq(t.senderName, 'БАДАРЧ ОЮУНЖАРГАЛ', 'баримт(хүснэгт): шилжүүлэгчийн нэр');
  eq(t.receiverName, 'ЧИМУН ХХК', 'баримт(хүснэгт): хүлээн авагчийн нэр');
  eq(t.amount, 826680, 'баримт(хүснэгт): дүн');
  eq(t.bankRef, 'GLS18532103202609032', 'баримт(хүснэгт): лавлах дугаар');
  ok(!/\d/.test(t.senderName), 'баримт(хүснэгт): нэрэнд тоо холилдоогүй');

  // Хуучин мөр-мөрөөр байрлалтай баримт ХЭВЭЭР ажиллана (регресс хамгаалалт)
  const lineTxt = [
    'Хүлээн авагчийн банк', 'Голомт Банк',
    'Хүлээн авагчийн данс', '3635161180',
    'Хүлээн авагчийн нэр', 'ЧИМУН ХХК',
    'Шилжүүлэгчийн нэр', 'ДОРЖ БАТ',
    'Шилжүүлэгчийн дансны дугаар', '5111222333',
    'Гүйлгээний утга', '1400-ДОРЖ',
    'Гүйлгээний дүн', '150,000.00 MNT',
    'Гүйлгээний төлөв', 'Амжилттай',
    'Гүйлгээний огноо', '2026-08-01',
  ].join('\n');
  const l = F.parseBankReceipt(lineTxt);
  eq([l.senderAcct, l.receiverAcct, l.senderName, l.ref], ['5111222333', '3635161180', 'ДОРЖ БАТ', '1400-ДОРЖ'], 'баримт(мөр): хуучин загвар хэвээр');
}

// ── ХУУЧИН БАРИМТААС ДАНС НӨХӨХ (2026-09-10) ────────────────────────────────
// paid_ref-ийг дахин бичихдээ бусад мэдээллийг АЛДАХГҮЙ байх нь чухал — тэнд
// баримтын дугаар, шилжүүлэгчийн нэр, гүйлгээний утга сууна.
{
  need(['refWithAccts']);
  const F1 = { GL1: { acct: '5309576444', sender: 'БАДАРЧ ОЮУНЖАРГАЛ' } };

  // Данс огт байхгүй бичлэг → нөхөгдөнө
  let r = F.refWithAccts('[#GL1] БАДАРЧ ОЮУНЖАРГАЛ', F1);
  eq([r.changed, r.ref], [1, '[#GL1] БАДАРЧ ОЮУНЖАРГАЛ · 5309576444'], 'нөхөх: данс нэмэгдэнэ');

  // Данс байрлалд ГҮЙЛГЭЭНИЙ УТГА орсон хуучин бичлэг — утга хойшоо, алдагдахгүй
  r = F.refWithAccts('[#GL1] БАДАРЧ · 1483-БАДАРЧ', F1);
  eq(r.ref, '[#GL1] БАДАРЧ · 5309576444 · 1483-БАДАРЧ', 'нөхөх: утга данс болж андуурагдахгүй, хадгалагдана');

  // Аль хэдийн данстай бол ХӨНДӨХГҮЙ
  r = F.refWithAccts('[#GL1] БАДАРЧ · 9999999999 · утга', F1);
  eq([r.changed, r.ref], [0, '[#GL1] БАДАРЧ · 9999999999 · утга'], 'нөхөх: данстай бичлэг хэвээр');

  // Олон баримт — зөвхөн дутууг нөхөж, бусдыг хэвээр үлдээнэ
  r = F.refWithAccts('[#GL1] БАДАРЧ  |  [#GL2] БОЛД · 3001234567 · тайлбар', F1);
  eq(r.ref, '[#GL1] БАДАРЧ · 5309576444  |  [#GL2] БОЛД · 3001234567 · тайлбар', 'нөхөх: бусад баримт хөндөгдөхгүй');

  // Олдоогүй баримт / хоосон
  eq(F.refWithAccts('[#GLX] БАТ', F1).changed, 0, 'нөхөх: олдоогүй баримтыг хөндөхгүй');
  eq(F.refWithAccts('', F1).ref, '', 'нөхөх: хоосон paid_ref → хоосон');
  eq(F.refWithAccts('[#GL1] БАДАРЧ', { GL1: { acct: '123' } }).changed, 0, 'нөхөх: данс биш утгаар бичихгүй');

  ok(/backfillReceiptAccounts/.test(src), 'scan: нөхөх үйлдэл байна');
  ok(/select=paid_ref/.test(src), 'scan: бичихийн өмнө серверийн сүүлийн paid_ref-ийг уншина');
}

// ── БАНК ТАНИХ — хүлээн авагчийн банкаар БИШ (2026-09-10) ───────────────────
// Голомтоос ХААН банк руу шилжүүлсэн баримтад «Хаан Банк» гэж бичигддэг тул
// Голомтын баримтыг Хааных гэж андуурч, буруу задлагчаар уншиж данс хоосон гардаг байв.
{
  const golomtToKhan = [
    'Цахим гүйлгээний баримт',
    'Хүсэлтийн лавлах дугаар:', 'S1900000000001',
    'Шилжүүлэгчийн дансны дугаар', 'Хүлээн авагчийн данс', 'Гүйлгээний дүн', 'Гүйлгээний төлөв',
    '5309576444', '5041234567', '500,000.00 MNT', 'Амжилттай',
    'Шилжүүлэгчийн нэр', 'Хүлээн авагчийн нэр', 'Гүйлгээний утга',
    'БАТ ДОРЖ', 'ЧИМУН ХХК', '1500-БАТ',
    'Хүлээн авагчийн банк', 'Гүйлгээний огноо', 'Хаан Банк', '2026-09-05',
  ].join('\n');
  const g = F.parseBankReceipt(golomtToKhan);
  eq(g.bank, 'Голомт', 'банк таних: Голомтын баримт Хаан руу явсан ч Голомт хэвээр');
  eq(g.senderAcct, '5309576444', 'банк таних: шилжүүлэгчийн данс уншигдана');
  eq(g.senderName, 'БАТ ДОРЖ', 'банк таних: шилжүүлэгчийн нэр уншигдана');

  // Хааны жинхэнэ баримт хэвээр Хаан гэж танигдана
  const khan = 'ХААН БАНК Transaction information Journal No: 12345 5041112223 БАТ ДОРЖ 500,000.00 MNT Transaction description: 1500-БАТ амжилттай';
  const k = F.parseBankReceipt(khan);
  eq(k.bank, 'Хаан', 'банк таних: Хааны баримт хэвээр');
  eq(k.senderAcct, '5041112223', 'банк таних: Хааны данс уншигдана');

  // Загвар өөрчлөгдсөн Хааны баримт — тоон нөөц замаар данс олдоно
  const khanOdd = 'ХААН БАНК Journal No: 999 Гүйлгээ 700,000.00 MNT данс 5049998887 хүлээн авагч 3635161180 огноо 2026-09-01';
  eq(F.parseBankReceipt(khanOdd).senderAcct, '5049998887', 'банк таних: Хаан — загвар өөрчлөгдсөн ч данс олдоно');

  ok(/showReceiptParseDebug/.test(src), 'scan: данс уншигдаагүй бол шалтгааныг харуулна');
}

// ── ГОЛОМТЫН БОДИТ БАЙРЛАЛ (эх PDF-ийн текстээр, 2026-09-10) ────────────────
// ⚠ Энэ бол ЖИНХЭНЭ баримтаас гарсан бүтэц (нэр, данс нь ЗОХИОМОЛ — repo public).
// Онцлог: утга нь шошгынхоо ӨМНӨ гарч, «Шилжүүлэгчийн дансны дугаар» шошго нь
// баримтын төгсгөлд, дансныхаа хол доор бичигддэг.
{
  const real = (ref, acct, name, memo, amt, date) => [
    'Цахим гүйлгээний баримт', '', ref, 'Хүсэлтийн лавлах дугаар:', ' ', 'Татсан огноо:', ' ', date + ' 14:01', '',
    acct, '', 'Хүлээн авагчийн данс', '', '3635161180', '', 'Гүйлгээний утга', '', memo, '',
    'Гүйлгээний дүн', '', amt + ' MNT', '', 'Гүйлгээний төлөв', '', 'Амжилттай', '',
    'Шилжүүлэгчийн дансны дугаар', 'Шилжүүлэгчийн нэр', '', name, '', 'Хүлээн авагчийн нэр', '', 'ЧИМУН ХХК', '',
    'Хүлээн авагчийн банк', '', 'Голомт Банк', '', 'Бүх эрх хуулиар хамгаалагдсан ©. Голомтбанк ХК.', '',
    'MN240015003635161180', '', 'Гүйлгээний огноо', '', date,
  ].join('\n');

  const a = F.parseBankReceipt(real('S18532103202609032', '5309576444', 'БАТ ДОРЖ', '1483-БАТ ДОРЖ', '826,680.00', '2026-09-03'));
  eq(a.senderAcct, '5309576444', 'Голомт(бодит): шилжүүлэгчийн данс — шошгоос ДЭЭШ байдаг');
  eq(a.receiverAcct, '3635161180', 'Голомт(бодит): хүлээн авагчийн данс');
  eq(a.senderName, 'БАТ ДОРЖ', 'Голомт(бодит): шилжүүлэгчийн нэр');
  eq(a.ref, '1483-БАТ ДОРЖ', 'Голомт(бодит): гүйлгээний утга');
  eq(a.amount, 826680, 'Голомт(бодит): дүн');
  eq(a.date, '2026-09-03', 'Голомт(бодит): огноо');
  eq(a.bank, 'Голомт', 'Голомт(бодит): банк');
  eq(a.bankRef, 'GLS18532103202609032', 'Голомт(бодит): лавлах дугаар');

  // Лавлах дугаар нь өөр угтвартай (GB…) ба SocialPay гүйлгээ ч мөн адил
  const b = F.parseBankReceipt(real('GB177671202608292', '3665136465', 'ДОРЖ БАТ', 'SOCIALPAY ГҮЙЛГЭЭ', '1,177,400.00', '2026-08-29'));
  eq([b.senderAcct, b.amount], ['3665136465', 1177400], 'Голомт(бодит): SocialPay гүйлгээ ч уншигдана');

  // Огноо, лавлах, IBAN нь данс болж андуурагдахгүй
  ok(a.senderAcct !== '2026' && a.senderAcct !== '240015003635161180', 'Голомт(бодит): огноо/IBAN данс болохгүй');
}
// Лавлах дугаар шошгынхоо ӨМНӨ байрлах шинэ загвар — dedup энэ дугаараар ажилладаг
{
  const two = ['Цахим гүйлгээний баримт', 'GB177671202608292', 'Хүсэлтийн лавлах дугаар:', ' ', 'Татсан огноо:', '2026-08-29 14:25',
    '3665136465', 'Хүлээн авагчийн данс', '3635161180', 'Гүйлгээний дүн', '1,177,400.00 MNT',
    'Шилжүүлэгчийн дансны дугаар', 'Шилжүүлэгчийн нэр', 'ДОРЖ БАТ', 'Гүйлгээний огноо', '2026-08-29'].join('\n');
  eq(F.parseBankReceipt(two).bankRef, 'GLGB177671202608292', 'Голомт: лавлах дугаар шошгын өмнөөс уншигдана');
  // Хуучин загвар (шошгын дараа) хэвээр
  const old = 'Хүсэлтийн лавлах дугаар: S123456789 Хүлээн авагчийн данс 3635161180';
  eq(F.parseBankReceipt(old).bankRef, 'GLS123456789', 'Голомт: хуучин загварын лавлах дугаар хэвээр');
}

// ── ДАНС уу, ГҮЙЛГЭЭНИЙ УТГА юу (2026-09-10) ────────────────────────────────
// Харилцагчид гүйлгээний утгад «утас-нэр» бичдэг («98939696-МӨНХСАЙХАН ЗАНАБАЗАР»).
// «6+ цифртэй бол данс» гэж үзсэнээс болж утгыг «Буцаах данс» гэж харуулж байв.
{
  eq(F.refundAcctDigits('98939696-МӨНХСАЙХАН ЗАНАБАЗАР'), '', 'данс: утас-нэр утга данс болохгүй');
  eq(F.refundAcctDigits('1483-БАДАРЧ ОЮУНЖАРГАЛ'), '', 'данс: захиалга-нэр утга данс болохгүй');
  eq(F.refundAcctDigits('ЗАХИАЛГА 1476-АРИУНБОЛД'), '', 'данс: текстэн утга данс болохгүй');
  eq(F.refundAcctDigits('SOCIALPAY ГҮЙЛГЭЭ'), '', 'данс: SocialPay утга данс болохгүй');
  eq(F.refundAcctDigits('MN240015003635161180'), '', 'данс: IBAN (үсэгтэй) энэ талбарт данс болохгүй');
  eq(F.refundAcctDigits('5309576444'), '5309576444', 'данс: цэвэр дугаар данс мөн');
  eq(F.refundAcctDigits('5041 234 567'), '5041234567', 'данс: зайтай бичсэн ч данс');
  eq(F.refundAcctDigits('3001-234-567'), '3001234567', 'данс: зураастай ч данс');
  eq(F.refundAcctDigits('12345'), '', 'данс: 6-аас бага орон биш');
  eq(F.refundAcctDigits('123456789012345678901'), '', 'данс: 20-оос их орон биш');

  // Ийм бичлэгийг нөхөхөд утга нь АЛДАГДАХГҮЙ, дансаа урдаа авна
  const r = F.refWithAccts('[#GL9] МӨНХСАЙХАН ЗАНАБАЗАР · 98939696-МӨНХСАЙХАН ЗАНАБАЗАР',
    { GL9: { acct: '5309576444', sender: 'МӨНХСАЙХАН ЗАНАБАЗАР' } });
  eq(r.ref, '[#GL9] МӨНХСАЙХАН ЗАНАБАЗАР · 5309576444 · 98939696-МӨНХСАЙХАН ЗАНАБАЗАР', 'данс: нөхөхөд гүйлгээний утга хадгалагдана');
}

// ── ЦУЦАЛСАН ч ТӨЛСӨН захиалгын мөнгө орлогод үлдэнэ ───────────────────────
// ⚠ ЯГ БОЛСОН АЛДАА: NC-2026-0094 «Мед Монгол ХХК» 4,596,000₮ урьдчилгаа төлж,
//   4 хоногийн дараа бүтнээр буцааж авсан. Буцаалт нь банкны хуулгаар ЗАРДАЛ болж
//   бүртгэгдсэн атлаа ОРЛОГО нь «Больсон» төлөвөөс болж бүх тайлангаас чимээгүй
//   хаягдсан → 2026-06-ын ашиг яг 4,596,000₮-аар дутуу гарч байв.
// ⚠ Цуцалсанд ГЭРЭЭНИЙ дүн ОРОХГҮЙ — эс бөгөөс 3,064,000₮ хуурамч ашиг үүснэ.
{
  const st = vm.runInContext('state', sandbox);
  const F = vm.runInContext('nomaadIncomeMonth', sandbox);
  const saved = { o: st.nomaadOrders, p: st.nomaadPayments };

  const q = {
    quote_no: 'NC-TEST-0094', company: 'Мед Монгол ХХК', status: 'Больсон',
    date_start: '2026-06-12 9:00', grand_total: 7660000,
    income_advance: 4596000, income_amount: 4596000, income_date: '2026-06-05',
  };
  st.nomaadOrders = [q];
  st.nomaadPayments = { 'NC-TEST-0094': [
    { total: 2298000, pay_date: '2026-06-05' },
    { total: 2298000, pay_date: '2026-06-08' },
  ] };

  eq(F(q, '2026-06', 'cash'), 4596000, 'орлого: цуцалсан ч ОРСОН мөнгө 6-р сард тооцогдоно');
  eq(F(q, '2026-06', 'accrual'), 4596000, 'орлого: гүйцэтгэлийн суурьт ч ижил');
  ok(F(q, '2026-06', 'accrual') !== 7660000, 'орлого: цуцалсанд ГЭРЭЭНИЙ дүн ХЭЗЭЭ Ч орохгүй');
  eq(F(q, '2026-07', 'cash'), 0, 'орлого: өөр сард 0 (сар зөв хуваарилагдана)');

  // Цуцалсан + төлбөргүй → 0
  const q2 = { ...q, quote_no: 'NC-TEST-0095', income_advance: 0, income_amount: 0, income_date: '' };
  st.nomaadOrders = [q2]; st.nomaadPayments = {};
  eq(F(q2, '2026-06', 'cash'), 0, 'орлого: цуцалсан + төлбөргүй = 0');

  // Цуцлаагүй, гэрээтэй → гүйцэтгэлийн суурьт гэрээний дүн
  const q3 = { quote_no: 'NC-TEST-0096', status: 'ГЭРЭЭ', contract_date: '2026-06-01',
               date_start: '2026-06-12 9:00', grand_total: 5000000,
               income_advance: 1000000, income_amount: 1000000, income_date: '2026-06-03' };
  st.nomaadOrders = [q3];
  st.nomaadPayments = { 'NC-TEST-0096': [{ total: 1000000, pay_date: '2026-06-03' }] };
  eq(F(q3, '2026-06', 'cash'), 1000000, 'орлого: гэрээтэйд мөнгөн суурь = орсон мөнгө');
  eq(F(q3, '2026-06', 'accrual'), 5000000, 'орлого: гэрээтэйд гүйцэтгэлийн суурь = гэрээний дүн');

  st.nomaadOrders = saved.o; st.nomaadPayments = saved.p;
}

// SCAN — мөнгөний замд «цуцалсан бол буц» шүүлт БУЦАЖ ИРЭХГҮЙ
// Баримт бичиг мартагддаг, тест мартагддаггүй.
{
  const money = ['function finMonthIncome', 'function finAddOrderIncome'];
  for (const fnName of money) {
    const at = src.indexOf(fnName);
    ok(at > 0, `scan: ${fnName} олдов`);
    const body = src.slice(at, at + 1400);
    ok(!/if \(nomaadIsCancelled\(o\)\) return;/.test(body),
       `scan: ${fnName}-д цуцалсныг хаях шүүлт БАЙХГҮЙ`);
  }
  ok(/function nomaadIncomeMonth\(o, ym, basis\)/.test(src),
     'scan: NOMAAD орлогын ганц эх сурвалж бий');
  // Авлагад цуцалсныг хасах нь ЗӨВ — мөнгө буцсан тул авлага байхгүй.
  const rc = src.slice(src.indexOf('function receivablesData'), src.indexOf('function receivablesData') + 2000);
  ok(/nomaadIsCancelled\(o\)\) return;/.test(rc), 'scan: авлагад цуцалсан хасагдсан хэвээр (зөв)');
}

// ═══════════════════════════════════════════════════════════════════════════
// САНХҮҮ: сервер «нуусан» хариуг хоосон датаар бүү андуур (2026-09-10)
//
// n8n нь хүчинтэй session токенгүй хүсэлтэд санхүүг өгөхгүй бөгөөд
// `_finGated: true` + ХООСОН жагсаалт буцаадаг (алдаа шидэхгүй зөөлөн задрал).
// Аппыг тэр хариуг ХҮЛЭЭЖ АВБАЛ кэш хоосноор дарагдаж «бүх гүйлгээ алга
// болчихлоо» гэсэн үзэгдэл гарна. Бодит тохиолдол: n8n-ий bootstrap workflow
// нэвтрэлтийн блокоо солиход `_authed` туг алдагдаж, DB-д 1,280 мөр бүтэн
// байхад дэлгэц 0 гүйлгээ харуулсан.
// ═══════════════════════════════════════════════════════════════════════════
{
  const G = sandbox._finGatedEmpty;
  ok(typeof G === 'function', '_finGatedEmpty: функц бий');

  // Хаалттай + хоосон = ИТГЭЖ БОЛОХГҮЙ (хоёр хэлбэрийн хариуд ч)
  ok(G({ _finGated: true, finance: { requests: [] } }) === true,
     'хаалттай: bootstrap хэлбэр (finance.requests хоосон) → үл тоомсорлоно');
  ok(G({ _finGated: true, requests: [] }) === true,
     'хаалттай: finance webhook хэлбэр (requests хоосон) → үл тоомсорлоно');
  ok(G({ _finGated: true }) === true,
     'хаалттай: жагсаалт огт байхгүй → үл тоомсорлоно');

  // Жинхэнэ хоосон (хаалтгүй) — хүлээж авах ЁСТОЙ, эс бол шинэ компани мөнхөд хоосон
  ok(G({ _finGated: false, finance: { requests: [] } }) === false,
     'хаалтгүй хоосон = ЖИНХЭНЭ хоосон, хүлээж авна');
  ok(G({ finance: { requests: [] } }) === false,
     '_finGated талбаргүй хуучин хариу = хүлээж авна (арагшаа нийцтэй)');

  // Хаалттай гэсэн ч дата ирсэн бол хаяхгүй — дата нь дата
  ok(G({ _finGated: true, requests: [{ id: 1 }] }) === false,
     'хаалттай ч мөр ирвэл хүлээж авна (дата хаяхгүй)');

  // Хог оролт дээр унахгүй
  ok(G(null) === false && G(undefined) === false && G('x') === false,
     'хог оролтод унахгүй');
  ok(G({ _finGated: true, requests: 'юу ч биш' }) === true,
     'хаалттай + массив биш → үл тоомсорлоно');
}

// SCAN — хамгаалалт хоёр татагчаас ХАССАН БАЙХ ЁСГҮЙ
// Баримт мартагддаг; энэ тест мартагддаггүй. Аль нэг татагчаас хамгаалалт
// унавал CI улаан болно.
{
  for (const fnName of ['async function loadBootstrap', 'async function loadFinanceRequests']) {
    const at = src.indexOf(fnName);
    ok(at > 0, `scan: ${fnName} олдов`);
    const body = src.slice(at, at + 1800);
    ok(/_finGatedEmpty\(data\)/.test(body),
       `scan: ${fnName} нь _finGatedEmpty-ээр хамгаалагдсан`);
  }
  // Хаалттай үед кэш ДАРАГДАХГҮЙ байх — saveFinanceCache нөхцөлгүй дуудагдвал
  // хуучин дата хоосноор солигдоно.
  const lb = src.slice(src.indexOf('async function loadBootstrap'),
                       src.indexOf('async function loadBootstrap') + 1800);
  ok(/if \(!finGated\) saveFinanceCache\(\);/.test(lb),
     'scan: loadBootstrap нь хаалттай үед кэш хадгалахгүй');
  // Хэрэглэгчид ҮНЭН шалтгаан харагдана — «зардал алга» гэж худал хэлэхгүй
  ok(/state\.finGated/.test(src) && /Нэвтрэлт хүчингүй болсон тул санхүүгийн дата/.test(src),
     'scan: хоосон дэлгэц дээр жинхэнэ шалтгаан харагдана');
}

// ═══════════════════════════════════════════════════════════════════════════
// ЗАХИАЛГЫН ҮЛДЭГДЭЛ — буцаагдсан барьцаа ӨР болж дахин үүсэхгүй (2026-09-11)
//
// Буцаан олгох модал `paid_mnt`-ыг бууруулдаг ч `total_mnt`-ыг хөнддөггүй тул
// түүхий `total_mnt − paid_mnt` нь буцаагдсан барьцааг өр болгодог байв. #1483
// бүрэн төлөгдсөн атлаа «◐ Дутуу 150,000₮» гэж харагдаж, Авлага ба Санхүү
// тайланд хуурамч авлага болж орсон.
//
// ⚠ ХАМГИЙН АЮУЛТАЙ ЗАМ: `depositReturnState(o)`-оор засвал 'pre'/'stmt' салбарууд
//   `paid_mnt`-ыг хөндөөгүй буцаалтуудыг заадаг тул БОДИТ авлага чимээгүй устана.
//   Доорх «stmt хагас төлсөн» ба «pre» тестүүд яг үүнийг хаана.
// ═══════════════════════════════════════════════════════════════════════════
{
  const owed   = sandbox.orderOwed;
  const billed = sandbox.orderBilled;
  const refDep = sandbox.orderRefundedDeposit;
  ok([owed, billed, refDep].every(f => typeof f === 'function'),
     'үлдэгдэл: ганц эх сурвалжийн 3 функц бий');

  const O = (x) => Object.assign({ total_mnt: 0, paid_mnt: 0, deposit_mnt: 0, note: '' }, x);

  // (1) БОДИТ КЕЙС #1483 — барьцаа буцаасан, бүрэн төлөгдсөн
  const o1483 = O({ total_mnt: 826680, paid_mnt: 676680, deposit_mnt: 150000,
                    note: '⟦DLV|city|0|150000⟧ ⟦VAT|27720⟧ ⟦RF|150000||dep⟧' });
  eq(refDep(o1483), 150000, '#1483: буцаагдсан барьцаа 150,000₮');
  eq(billed(o1483), 676680, '#1483: авах ёстой нийт = борлуулалт (барьцаа хасагдсан)');
  eq(owed(o1483), 0,        '#1483: ҮЛДЭГДЭЛ 0 — «Дутуу» гэж харагдахаа болино');

  // (2) Барьцаа БАРЬЖ БАЙГАА (буцаагаагүй) — үлдэгдэл ХЭВЭЭР
  eq(owed(O({ total_mnt: 826680, paid_mnt: 676680, deposit_mnt: 150000 })), 150000,
     'барьцаа буцаагаагүй: 150,000₮ авах үлдсэн хэвээр');

  // (3) Барьцаагүй захиалга — огт хөндөгдөхгүй
  eq(owed(O({ total_mnt: 676680, paid_mnt: 400000 })), 276680, 'барьцаагүй: үлдэгдэл хэвээр');
  eq(owed(O({ total_mnt: 676680, paid_mnt: 676680 })), 0,      'барьцаагүй бүрэн төлсөн: 0');

  // (4) ХУУЛГААР буцаасан ('stmt' — 5810 санхүүгийн мөр). ⟦RF⟧ токен БАЙХГҮЙ тул
  //     `paid_mnt` хөндөгдөөгүй → давхар хасагдах ЁСГҮЙ.
  eq(owed(O({ total_mnt: 826680, paid_mnt: 826680, deposit_mnt: 150000 })), 0,
     'stmt буцаалт бүрэн төлсөн: 0 (давхар хасагдахгүй)');
  eq(owed(O({ total_mnt: 826680, paid_mnt: 500000, deposit_mnt: 150000 })), 326680,
     '⛔ stmt буцаалт ХАГАС төлсөн: 326,680₮ БҮТЭН хэвээр — бодит авлага устахгүй');

  // (5) 2026-08-01-ЭЭС ӨМНӨХ ('pre' таамаглал) — ⟦RF⟧ токенгүй тул хөндөгдөхгүй.
  //     Хэрэв depositReturnState-ээр зассан бол энэ 150,000₮ чимээгүй устах байсан.
  eq(owed(O({ total_mnt: 826680, paid_mnt: 676680, deposit_mnt: 150000,
              starts_at: '2026-05-01', stops_at: '2026-05-02' })), 150000,
     '⛔ pre-үеийн захиалга: барьцаа ХЭВЭЭР авах ёстой (таамаглалаар устахгүй)');

  // (6) АРИЛЖААНЫ буцаалт (kind ≠ 'dep') — өрийг барагдуулдаггүй
  eq(refDep(O({ total_mnt: 826680, paid_mnt: 300000, deposit_mnt: 150000,
                note: '⟦RF|200000|төлөвлөгөө өөрчлөгдсөн⟧' })), 0,
     'арилжааны буцаалт: барьцааны буцаалт гэж тооцогдохгүй');
  eq(owed(O({ total_mnt: 826680, paid_mnt: 300000, deposit_mnt: 150000,
              note: '⟦RF|200000|төлөвлөгөө өөрчлөгдсөн⟧' })), 526680,
     '⛔ арилжааны буцаалт: өр хэвээр — 200,000₮ чимээгүй уучлагдахгүй');

  // (7) ХЭСЭГЧИЛСЭН барьцаа буцаалт (эвдрэлийн суутгал)
  const oPart = O({ total_mnt: 826680, paid_mnt: 826680, deposit_mnt: 150000,
                    note: '⟦RF|50000||dep⟧' });
  eq(refDep(oPart), 50000,  'хэсэгчилсэн: 50,000₮ буцаагдсан');
  eq(billed(oPart), 776680, 'хэсэгчилсэн: үлдсэн 100,000₮ барьцаа дүнд хэвээр');
  eq(owed(oPart), 0,        'хэсэгчилсэн: илүү төлөгдсөн тул үлдэгдэл 0');

  // (8) Токен барьцаанаас ТОМ — барьцааны хэмжээгээр тагласан байх ёстой
  eq(refDep(O({ total_mnt: 826680, deposit_mnt: 150000, note: '⟦RF|999999||dep⟧' })), 150000,
     '⛔ токен хэт том: барьцааны хэмжээгээр тагласан — бодит өр идэгдэхгүй');

  // (9) Барьцаагүй атлаа dep токентой (гар алдаа) — хасагдахгүй
  eq(refDep(O({ total_mnt: 676680, deposit_mnt: 0, note: '⟦RF|50000||dep⟧' })), 0,
     'барьцаа 0 бол dep токен байсан ч хасагдахгүй');

  // (10) Booqable түүх — барьцаа `total_mnt`-д ОГТ ороогүй, токенгүй → хөндөгдөхгүй
  eq(owed(O({ total_mnt: 800000, paid_mnt: 600000, deposit_mnt: 200000, source: 'booqable' })), 200000,
     '⛔ booqable: барьцаа total_mnt-д байхгүй тул хасагдахгүй — 200,000₮ хэвээр');

  // (11) Хог оролт дээр унахгүй
  eq(owed(null), 0, 'хог оролт: unahgүй');
  eq(owed(O({ total_mnt: 'юу ч биш', paid_mnt: null })), 0, 'тоо биш утга: 0');
  eq(owed(O({ total_mnt: 100000, paid_mnt: 500000 })), 0, 'илүү төлсөн: сөрөг болохгүй');
}

// SCAN — түүхий `total_mnt − paid_mnt` үлдэгдэл БУЦАЖ ИРЭХГҮЙ
// Баримт мартагддаг; энэ тест мартагддаггүй.
{
  const banned = [
    'Math.max(0, (Number(o.total_mnt) || 0) - (Number(o.paid_mnt) || 0))',
    '(Number(o && o.total_mnt) || 0) - (Number(o && o.paid_mnt) || 0)',
    'bal = Math.max(0, total - paid)',
    'const bal = total - paid;',
  ];
  for (const b of banned) {
    ok(!src.includes(b), `scan: түүхий үлдэгдэл буцаж ирээгүй «${b.slice(0, 34)}…»`);
  }
  ok(/function orderRefundedDeposit\(o\)/.test(src) && /function orderBilled\(o\)/.test(src)
     && /function orderOwed\(o\)/.test(src), 'scan: үлдэгдлийн ганц эх сурвалж бий');

  // Карт, Авлага, архивлалт ГУРВУУЛАА ижил функц дуудна — тоо нь хоорондоо зөрөхгүй
  for (const fn of ['function receivablesData', 'function bqOrderCard', 'function archUnpaid']) {
    const at = src.indexOf(fn);
    ok(at > 0, `scan: ${fn} олдов`);
    ok(/orderOwed\(o\)/.test(src.slice(at, at + 4000)), `scan: ${fn} нь orderOwed дуудна`);
  }

  // ⛔ depositReturnState-ээр үлдэгдэл БОДОХГҮЙ — 'pre'/'stmt' салбар бодит авлагыг устгана
  const helpers = src.slice(src.indexOf('function orderRefundedDeposit'),
                            src.indexOf('function orderRefundedDeposit') + 900);
  ok(!/depositReturnState/.test(helpers),
     'scan: үлдэгдэл depositReturnState-ээс хамаарахгүй (pre/stmt урхи хаагдсан)');
  ok(/rf\.kind !== 'dep'/.test(helpers), 'scan: зөвхөн БАРЬЦААНЫ буцаалт хасагдана');
  ok(/Math\.min\(dep,/.test(helpers), 'scan: буцаалт барьцааны хэмжээгээр тагласан');
}

// ═══════════════════════════════════════════════════════════════════════════
// «Апп гэнэт дахин эхэлсэн» — ХУУРАМЧ дохио гаргахгүй  (fp d17c741186f5, 2026-09-11)
//
// Алдааны лог: 1 хүн · 3 удаа · бүгд `ver` ХООСОН. Шалтгаан нь `globalThis.CACHE_TAG`
// репод БҮХЭЛДЭЭ оноогддоггүй байсан (10 уншилт, 0 оноолт) — «шинэ хувилбар тарагдсан
// тул дахин ачаалсан» шалгуур ҮХМЭЛ байв. Мөн гарах/шинэчлэх товчны зориудын
// `location.reload()` нь «амьд» тэмдэглэгээг цэвэрлэдэггүй байсан.
// ═══════════════════════════════════════════════════════════════════════════
{
  const U = sandbox.uncleanRestart;
  ok(typeof U === 'function', 'restart: цэвэр шийдвэрийн функц бий');
  const NOW = 1_757_000_000_000;   // тогтмол мөч (Date.now mock хэрэггүй)
  const V = 'chimun-tasks-v854';

  // ҮНЭН дохио — апп харагдаж байхад үхсэн (камер/файл сонгогч нээхэд PWA устгагддаг)
  ok(U({ at: NOW - 5000, ver: V, hid: 0 }, NOW, V) === true,
     'ҮНЭН: харагдаж байхад үхсэн → мэдээлнэ');
  ok(U({ at: NOW - 5000, hid: NOW - 3000 }, NOW, V) === true,
     'ҮНЭН: далд болсны дараа ШУУД үхсэн (камерын кейс) → мэдээлнэ');

  // ХУУРАМЧ 1 — удаан завсарласан (ердийн хаалт)
  ok(U({ at: NOW - 200000, ver: V }, NOW, V) === false,
     'хуурамч: 3 минутаас удаан завсар → ердийн хаалт');

  // ХУУРАМЧ 2 — хувилбар солигдсон (шинэ код тарагдсан). Энэ шалгуур ver хоосон
  // байснаас болж ХЭЗЭЭ Ч ажилладаггүй байв — одоо ажиллана.
  ok(U({ at: NOW - 5000, ver: 'chimun-tasks-v853' }, NOW, V) === false,
     'хуурамч: хувилбар солигдсон → шинэ код тарагдсан, алдаа БИШ');
  ok(U({ at: NOW - 5000, ver: V }, NOW, 'chimun-tasks-v855') === false,
     'хуурамч: одоогийн хувилбар шинэ → алдаа БИШ');

  // ХУУРАМЧ 3 — удаан далд байгаад OS санах ой чөлөөлсөн
  ok(U({ at: NOW - 100000, ver: V, hid: NOW - 90000 }, NOW, V) === false,
     'хуурамч: 1 минутаас удаан далд → OS цэвэрлэв, алдаа БИШ');

  // Хувилбар МЭДЭГДЭХГҮЙ үед дохиог хаахгүй (хуучин тэмдэглэгээтэй нийцтэй)
  ok(U({ at: NOW - 5000, ver: '' }, NOW, V) === true,
     'хувилбар хоосон: дохио хэвээр (арагшаа нийцтэй)');
  ok(U({ at: NOW - 5000, ver: V }, NOW, '') === true,
     'одоогийн хувилбар хоосон: дохио хэвээр');

  // Хог оролт дээр унахгүй
  ok(U(null, NOW, V) === false && U(undefined, NOW, V) === false && U('x', NOW, V) === false,
     'хог оролт: унахгүй');
  ok(U({ ver: V }, NOW, V) === false, 'at байхгүй: мэдээлэхгүй');
  ok(U({ at: 'юу ч биш' }, NOW, V) === false, 'at тоо биш: мэдээлэхгүй');
}

// SCAN — хоёр үндсэн шалтгаан БУЦАЖ ИРЭХГҮЙ
{
  // (1) CACHE_TAG оноогдсон байх ЁСТОЙ. Оноогдоогүй бол алдааны логийн `ver`/`fixed_ver`
  //     хоосон болж, хувилбарын шалгуур чимээгүй үхнэ (яг ийм алдаа гарсан).
  const assigns = (src.match(/globalThis\.CACHE_TAG\s*=(?!=)/g) || []).length;
  ok(assigns >= 1, 'scan: globalThis.CACHE_TAG оноогдсон (уншилт байгаад оноолт байхгүй байж БОЛОХГҮЙ)');

  // (2) Зориудын дахин ачаалалт бүр «амьд» тэмдэглэгээг цэвэрлэсэн байх
  const relo = [...src.matchAll(/location\.reload\(\)/g)];
  ok(relo.length > 0, 'scan: location.reload() олдов');
  for (const m of relo) {
    const before = src.slice(Math.max(0, m.index - 260), m.index);
    ok(/clearAlive\(\)/.test(before),
       `scan: location.reload()-ийн өмнө clearAlive() бий (offset ${m.index})`);
  }

  // (3) Шийдвэр нь ЦЭВЭР функцэд — тестлэгдэхгүй болж буцахгүй
  ok(/function uncleanRestart\(mark, now, nowVer\)/.test(src), 'scan: цэвэр шийдвэрийн функц бий');
  const chk = src.slice(src.indexOf('function checkUncleanRestart'),
                        src.indexOf('function checkUncleanRestart') + 800);
  ok(/uncleanRestart\(d, Date\.now\(\)/.test(chk), 'scan: checkUncleanRestart нь цэвэр функцийг дуудна');
  ok(/markHidden/.test(src) && /visibilitychange/.test(src), 'scan: далд болсон мөч тэмдэглэгддэг');
}

// ═══ ХУУЛГЫН БҮРТГЭЛ + ОРЛОГЫН МӨР (2026-09-11) ═══════════════════════════════
// Цоорхой: зардал нь хуулгаас бүртгэгддэг байтал орлого нь зөвхөн захиалгаас
// бүртгэгддэг байв → (1) ямар хуулга орсныг апп мэдэхгүй, (2) захиалгад
// холбогдоогүй орсон мөнгө хаана ч үлддэггүй. Эдгээр тест тэр 2-ыг хамгаална.
{
  need(['stmtPeriodDates', 'stmtIdOf', 'stmtIncomeKey', 'stmtIncomeFp', 'buildStatementImport',
    'stmtBalanceCheck', 'stmtChainCheck', 'incomeOpenStats', 'stmtMonthMissingAccts',
    'receiptFpIndex', 'receiptMatchFor', 'incomeStatusOfOwner', 'incomeLinkOfOwner']);

  // ── хугацаа: толгойд бичигдсэн бол түүнээс, эс бол мөрүүдээс ──
  eq(F.stmtPeriodDates('2026-08-01 - 2026-08-31', []), { from: '2026-08-01', to: '2026-08-31' }, 'хуулга: хугацаа толгойноос');
  eq(F.stmtPeriodDates('', [{ date: '2026-08-05' }, { date: '2026-08-02' }, { date: '2026-08-20' }]),
     { from: '2026-08-02', to: '2026-08-20' }, 'хуулга: хугацаагүй бол мөрүүдийн эхний/сүүлийн огноо');
  eq(F.stmtIdOf('5041234567', '2026-08-01', '2026-08-31'), '5041234567|2026-08-01|2026-08-31', 'хуулга: канон id');

  // ── ИНВАРИАНТ: ижил өдөр, ижил дүн, ижил төлөгчтэй ХОЁР гүйлгээ = ХОЁР мөр ──
  // (Хээг дугаарлахгүй бол хоёр дахь нь PK-аар залгигдаж орлого дутуу болно.)
  {
    const r = { credit: 500000, date: '2026-08-05', name: 'Бат', memo: 'түрээс' };
    ok(F.stmtIncomeFp('5041234567', r, 1) !== F.stmtIncomeFp('5041234567', r, 2),
       'орлого: ижил хээтэй 2 мөр ӨӨР fp (дугаарлагдана)');
    ok(F.stmtIncomeKey('5041234567', r) !== F.stmtIncomeKey('3001234567', r),
       'орлого: өөр данс = өөр хээ (хоёр дансны ижил мөр хоорондоо мөргөлдөхгүй)');
  }

  // ── buildStatementImport: нийт дүн, дотоод шилжүүлэг, баримтаар авто хаагдалт ──
  {
    const parsed = { ccy: 'MNT', rows: [
      { date: '2026-08-02', credit: 500000, debit: 0, name: 'Бат',   account: '5049999999', memo: 'түрээс #1470' },
      { date: '2026-08-02', credit: 500000, debit: 0, name: 'Бат',   account: '5049999999', memo: 'түрээс #1471' },  // ижил дүн/өдөр/нэр
      { date: '2026-08-03', credit: 900000, debit: 0, name: 'Дорж',  account: '3001111111', memo: 'урьдчилгаа' },
      { date: '2026-08-04', credit: 200000, debit: 0, name: 'Сүх',   account: '5041234567', memo: 'данс хооронд' },  // ӨӨРИЙН данс
      { date: '2026-08-05', credit: 0,      debit: 300000, name: 'Нийлүүлэгч', account: '4001', memo: 'хүнс' },
    ] };
    const meta = { acct: '5041234567', period: '2026-08-01 - 2026-08-31', opening: 1000000, closing: 2800000 };
    // Бат-ын ПЕРВЫЙ 500,000 нь PDF баримтаар #1470-д бүртгэгдсэн гэж үзье
    const rcpt = F.receiptFpIndex(new Set(['FP-500000-20260802-БАТ']));
    const owners = new Map([['FP-500000-20260802-БАТ', 'mevent:#1470']]);
    const built = F.buildStatementImport(parsed, meta, { fileName: 'golomt.xlsx', own: new Set(['5041234567']), rcpt, owners });

    eq(built.stmt.credit_total, 2100000, 'хуулга: орлогын нийт (дотоод ч тооцогдоно — дансны хөдөлгөөн)');
    eq(built.stmt.debit_total, 300000, 'хуулга: зарлагын нийт');
    eq(built.stmt.closing_calc, 1000000 + 2100000 - 300000, 'хуулга: бодсон эцсийн үлдэгдэл');
    eq(built.stmt.row_count, 5, 'хуулга: мөрийн тоо');
    eq(built.incomes.length, 4, 'орлого: зөвхөн ирсэн мөрүүд (зарлага орохгүй)');
    eq(new Set(built.incomes.map(x => x.fp)).size, 4, 'орлого: 4 мөрийн хээ бүгд ӨӨР (давхардаж залгигдахгүй)');

    const byMemo = {}; built.incomes.forEach(x => { byMemo[x.memo] = x; });
    eq(byMemo['данс хооронд'].status, 'internal', 'орлого: өөрийн данснаас ирсэн = дотоод шилжүүлэг');
    eq(byMemo['түрээс #1470'].status, 'order', 'орлого: PDF баримттай = захиалгын орлого (авто хаагдана)');
    eq(byMemo['түрээс #1470'].link_id, '1470', 'орлого: захиалгын дугаар баримтаас гарна');
    eq(byMemo['түрээс #1471'].status, 'open', 'орлого: баримтгүй 2 дахь мөр ХААГДААГҮЙ хэвээр');
    eq(byMemo['урьдчилгаа'].status, 'open', 'орлого: захиалгад холбогдоогүй мөнгө = хаагдаагүй (алга болохгүй)');
    eq(F.incomeOpenStats(built.incomes).n, 2, 'орлого: хаагдаагүй мөрийн тоо');
    eq(F.incomeOpenStats(built.incomes).sum, 1400000, 'орлого: хаагдаагүй дүн');
    eq(F.incomeOpenStats(built.incomes, '2026-07').n, 0, 'орлого: сараар шүүгдэнэ');
  }

  // ── эзэн → төлөв/холбоос ──
  eq(F.incomeStatusOfOwner('mevent:#1470'), 'order', 'эзэн: mevent → захиалга');
  eq(F.incomeStatusOfOwner('nomaad:NC-2026-0094'), 'nomaad', 'эзэн: nomaad → NOMAAD');
  eq(F.incomeStatusOfOwner('fin:abc'), 'other', 'эзэн: санхүү → бусад орлого');
  eq(F.incomeStatusOfOwner(''), 'other', 'эзэн: тодорхойгүй → бусад (захиалга гэж ХУДЛАА хэлэхгүй)');
  eq(F.incomeLinkOfOwner('nomaad:NC-2026-0094'), { type: 'nomaad', id: 'NC-2026-0094' }, 'эзэн: NOMAAD дугаар гарна');

  // ── хуулгын дотоод тэнцэл ──
  eq(F.stmtBalanceCheck({ ccy: 'MNT', opening: 100, closing_stated: 300, closing_calc: 300 }).ok, true, 'тэнцэл: таарав');
  eq(F.stmtBalanceCheck({ ccy: 'MNT', opening: 100, closing_stated: 300, closing_calc: 250 }).diff, -50, 'тэнцэл: зөрүү гарна (мөр дутуу уншигдсан)');
  eq(F.stmtBalanceCheck({ ccy: 'USD', opening: 100, closing_stated: 300, closing_calc: 999 }).ok, true, 'тэнцэл: валют данс шалгагдахгүй (мөр ₮ болж хөрвүүлэгдсэн)');
  eq(F.stmtBalanceCheck({ ccy: 'MNT', opening: null, closing_stated: null }).ok, true, 'тэнцэл: үлдэгдэл хуулгад алга → шалгахгүй');

  // ── ЗАЛГАА: дутуу хугацаа = мөнгө чимээгүй алга болох цорын ганц бодит эрсдэл ──
  {
    const A = { acct: '504', ccy: 'MNT', id: 'a', period_from: '2026-07-01', period_to: '2026-07-31', opening: 0, closing_stated: 1000, closing_calc: 1000 };
    const B = { acct: '504', ccy: 'MNT', id: 'b', period_from: '2026-08-01', period_to: '2026-08-31', opening: 1000, closing_stated: 2000, closing_calc: 2000 };
    eq(F.stmtChainCheck([A, B]), [], 'залгаа: дараалсан 2 хуулга — цоорхой алга');

    const C = { ...B, id: 'c', period_from: '2026-09-01', period_to: '2026-09-30' };
    const g = F.stmtChainCheck([A, C]);
    eq(g.length, 1, 'залгаа: дунд нь 8-р сар ороогүйг барина');
    eq([g[0].kind, g[0].from, g[0].to], ['gap', '2026-08-01', '2026-08-31'], 'залгаа: дутуу хугацаа ЯГ гарна');

    const D = { ...B, id: 'd', opening: 7000 };   // өмнөх эцсийн 1000 ≠ эхний 7000
    const j = F.stmtChainCheck([A, D]);
    eq(j.map(x => x.kind), ['jump'], 'залгаа: үлдэгдлийн уналт баригдана');
    eq(j[0].diff, 6000, 'залгаа: уналтын дүн');

    const E = { ...A, id: 'e', closing_calc: 900 };   // тэнцэл зөрүүтэй
    eq(F.stmtChainCheck([E]).map(x => x.kind), ['balance'], 'залгаа: тэнцлийн зөрүү бас баригдана');

    // Өөр данс хоорондоо хамаарахгүй
    eq(F.stmtChainCheck([A, { ...C, acct: '300' }]), [], 'залгаа: өөр данс тусад нь шалгагдана');
  }

  // ── Сарын хуулга дутуу — данс бүрээр ──
  {
    const list = [{ acct: '5041234567', period_from: '2026-08-01', period_to: '2026-08-31' }];
    eq(F.stmtMonthMissingAccts(list, '2026-08', ['5041234567', '3001234567']), ['3001234567'], 'хамрах: 8 сард 1 дансны хуулга ороогүй');
    eq(F.stmtMonthMissingAccts(list, '2026-08', ['5041234567']), [], 'хамрах: бүгд орсон');
    eq(F.stmtMonthMissingAccts(list, '2026-09', ['5041234567']).length, 1, 'хамрах: өөр сар — ороогүй гэж гарна');
  }

  // ── SCAN: хүний шийдвэрийг дарж бичихгүй ──
  // Дахин импорт хийхэд гараар хаасан мөр «open» болж буцвал ажил хоосон урсана.
  {
    const at = src.indexOf('async function saveStatementImport');
    ok(at > 0, 'scan: saveStatementImport олдов');
    const body = src.slice(at, at + 1600);
    ok(/bank_income\?on_conflict=fp/.test(body), 'scan: орлогын мөр fp-ээр upsert');
    ok(/resolution=ignore-duplicates/.test(body),
       'scan: орлогын мөр ДАРЖ БИЧИГДЭХГҮЙ (гараар хаасан төлөв дахин импортод устахгүй)');
    ok(/bank_statements\?on_conflict=id[\s\S]{0,200}resolution=merge-duplicates/.test(body),
       'scan: хуулгын мөр нь харин орлуулагдана (ижил данс+хугацаа давхар бүртгэгдэхгүй)');
  }
}

// ── ИНВАРИАНТ: НЭГ PDF БАРИМТ = НЭГ БАНКНЫ МӨР (2026-09-11) ──────────────────
// Баримтын индекс нь дүн+огноо+нэрээр таьдаг. Ижил өдөр ижил дүнгээр хоёр
// төлбөр ирвэл нэг баримт хоёуланг «бүртгэсэн» болгож, бүртгэгдээгүй бодит
// төлбөр чимээгүй хаагдаж байв. Баримт эзэмшигдмэгц дахин таарахгүй.
{
  const rows = [
    { date: '2026-08-02', credit: 500000, debit: 0, name: 'Бат', account: '5049999999', memo: 'a' },
    { date: '2026-08-02', credit: 500000, debit: 0, name: 'Бат', account: '5049999999', memo: 'b' },
  ];
  const idx = F.receiptFpIndex(new Set(['FP-500000-20260802-БАТ']));
  const taken = new Set();
  ok(!!F.receiptMatchFor(rows[0], idx, new Map(), taken), 'баримт: 1-р мөр таарна');
  eq(F.receiptMatchFor(rows[1], idx, new Map(), taken), null, 'баримт: НЭГ баримт 2-р мөрийг ХААХГҮЙ');

  // Тулгалтын цонх ч ижил дүрэмтэй байх (2 мөр = 1 бүртгэсэн + 1 бүртгээгүй)
  const res = F.reconcileByReceipts(rows, {
    usedFps: new Set(['FP-500000-20260802-БАТ']),
    fpOwners: new Map([['FP-500000-20260802-БАТ', 'mevent:#1470']]),
  });
  eq([res.recorded.length, res.unrecorded.length], [1, 1], 'тулгалт: 1 баримт → 1 бүртгэсэн, 1 бүртгээгүй');

  const at = src.indexOf('function receiptMatchFor');
  ok(/taken instanceof Set/.test(src.slice(at, at + 900)), 'scan: баримт эзэмшигдэх механизм хэвээр');
}

// ═══════════════════════════════════════════════════════════════════════════
// ҮНИЙН САНАЛЫН МЭНДЧИЛГЭЭ (2026-09-11)
// «Эрхэм {нэр} танаа,» нь яам/албан бичгийн хуучинсаг өнгө байсан. Түрээсийн
// үнийн санал бол энгийн бизнес имэйл. Мөн нэр байхгүй үед «Эрхэм харилцагч
// танаа,» болж хүйтэн харагддаг байв. Амьд дата: хүлээн авагчийн 142 нь ХҮН,
// 2 нь л байгууллага — хүн рүү бичиж буй мэт бичнэ.
// ═══════════════════════════════════════════════════════════════════════════
{
  // ⚠ vm-д `const` нь контекстийн шинж чанар болдоггүй — runInContext-оор авна.
  const T = vm.runInContext('MEV_QUOTE_T', sandbox);
  ok(T && T.mn && T.en, 'мэндчилгээ: үнийн саналын толь бий');

  eq(T.mn.greet('Б.Оюунжаргал'), 'Сайн байна уу, Б.Оюунжаргал.', 'мэндчилгээ: хүний нэртэй');
  eq(T.mn.greet('Мед Монгол ХХК'), 'Сайн байна уу, Мед Монгол ХХК.', 'мэндчилгээ: байгууллагад ч зөв');
  eq(T.mn.greet(''), 'Сайн байна уу.', 'мэндчилгээ: нэргүй бол нэр БИЧИХГҮЙ');
  eq(T.en.greet('John Smith'), 'Dear John Smith,', 'greeting: EN нэртэй');
  eq(T.en.greet(''), 'Hello,', 'greeting: EN нэргүй');

  // ⛔ Хуучин хэлбэр буцаж ирэхгүй
  ok(!/танаа/.test(T.mn.greet('Б.Болд')), 'мэндчилгээ: «танаа» буцаж ирээгүй');
  ok(!/харилцагч|Customer/.test(T.mn.greet('') + T.en.greet('')),
     'мэндчилгээ: орлуулагч нэр («харилцагч»/«Customer») бичигдэхгүй');

  // ⚠ Эгшгийн зохицол шаарддаг дуудлагын нөхцөл («аа/оо/өө/ээ») ЗОРИУД ХЭРЭГЛЭХГҮЙ —
  //   Болдоо / Төмөрөө / Оюунжаргалаа гэж нэр бүрд өөр байдаг тул кодоор буруу тавибал
  //   сэтгэгдэл муутай харагдана.
  ok(!/ аа\.| оо\.| өө\.| ээ\.$/.test(T.mn.greet('Б.Болд')), 'мэндчилгээ: эгшгийн зохицлын урхи хэрэглээгүй');
}

// ═══ ОРЛОГЫН САРЫН ХАРЬЯАЛАЛ = ГАНЦ ДҮРЭМ (2026-09-11) ════════════════════════
// Өмнө 3 газар 3 өөр дүрэм байв: Санхүү тайлан эвентийн сараар, Тренд график
// NOMAAD-ийн БҮХ мөнгийг income_date сард, Орлогын тайлан paid_date-аар. Иймээс
// НЭГ сарын орлого 3 дэлгэцэд 3 өөр тоо гарч болдог байсан.
{
  need(['orderIncomeMonth', '_nomaadPayMonths', 'finMonthIncome', 'finAddOrderIncome']);
  const runIn = (code) => vm.runInContext(code, sandbox);

  // ── мөнгөн суурь = мөнгө ОРСОН сар, гүйцэтгэл = эвентийн сар ──
  const o1 = { starts_at: '2026-10-05', paid_date: '2026-09-20', created_at: '2026-08-01' };
  eq(F.orderIncomeMonth(o1, 'cash'), '2026-09', 'сар: мөнгөн суурь = төлсөн сар');
  eq(F.orderIncomeMonth(o1, 'accrual'), '2026-10', 'сар: гүйцэтгэл = эвентийн сар');
  // paid_date хоосон (түүхэн Booqable мөр) → орлого АЛГА БОЛОХГҮЙ, эвентийн сард унана
  eq(F.orderIncomeMonth({ starts_at: '2026-07-03', paid_date: '' }, 'cash'), '2026-07',
     'сар: paid_date хоосон бол эвентийн сар (түүхэн мөр чимээгүй алга болохгүй)');
  eq(F.orderIncomeMonth({ created_at: '2026-06-09' }, 'cash'), '2026-06', 'сар: огноо зөвхөн created_at-д байхад ч ажиллана');
  eq(F.orderIncomeMonth(null, 'cash'), '', 'сар: хоосон захиалга → хоосон');

  // ── NOMAAD: орсон мөнгө сараар задарна, Σ = бүх орсон мөнгө ──
  {
    const log = [{ total: 1000000, pay_date: '2026-06-03' }, { total: 2000000, pay_date: '2026-07-11' }];
    const by = F._nomaadPayMonths(log, 3000000, '2026-06-03');
    eq(by, { '2026-06': 1000000, '2026-07': 2000000 }, 'NOMAAD: 2 төлбөр 2 сард тусад нь');
    // Лог дутуу (income_amount илүү) → зөрүү income_date сард
    eq(F._nomaadPayMonths([{ total: 500000, pay_date: '2026-08-02' }], 1200000, '2026-08-20'),
       { '2026-08': 1200000 }, 'NOMAAD: логоос илүү дүн income_date сард нэмэгдэнэ');
    // ИНВАРИАНТ: задаргааны нийлбэр = сар бүрийн нийлбэр (хуучин _nomaadMonthSum-тай нийцтэй)
    eq(F._nomaadMonthSum(log, 3000000, '2026-06-03', '2026-07'), 2000000, 'NOMAAD: сарын дүн хуучин функцтэй ижил');
  }

  // ── ⭐ ИНВАРИАНТ: Тайлан ба Тренд график НЭГ тоо харуулна ──
  {
    const save = runIn('[state.appOrders, state.nomaadOrders, state.nomaadPayments]');
    runIn(`state.appOrders = [
      { id:'a', number:1, source:'app', status:'done', starts_at:'2026-10-05', created_at:'2026-08-01',
        paid_date:'2026-09-20', total_mnt:1000000, paid_mnt:1000000, deposit_mnt:0, items:[] },
      { id:'b', number:2, source:'app', status:'done', starts_at:'2026-09-02', created_at:'2026-09-01',
        paid_date:'2026-09-02', total_mnt:500000, paid_mnt:500000, deposit_mnt:0, items:[] }
    ];`);
    runIn(`state.nomaadOrders = [{ quote_no:'NC-1', status:'ГЭРЭЭ', date_start:'2026-10-10',
      income_amount:3000000, income_date:'2026-09-03', total_amount:5000000 }];`);
    runIn(`state.nomaadPayments = { 'NC-1': [
      { total:1000000, pay_date:'2026-09-03' }, { total:2000000, pay_date:'2026-10-11' } ] };`);

    for (const basis of ['cash', 'accrual']) {
      for (const mo of ['2026-09', '2026-10']) {
        const rep = F.finMonthIncome(mo, basis);
        const inc = {}; F.finAddOrderIncome(inc, null, basis);
        eq(inc[mo] || 0, rep.evInc + rep.noInc,
           `ИНВАРИАНТ: ${mo} ${basis} — Тайлан ба Тренд ижил тоо`);
      }
    }
    // Мөнгөн суурь: 9 сард 1.5сая (эвент 10 сард ч мөнгө 9 сард орсон) + NOMAAD 1сая
    eq(F.finMonthIncome('2026-09', 'cash').evInc, 1500000, 'мөнгөн суурь: 10 сарын эвентийн урьдчилгаа 9 сард тоологдоно');
    eq(F.finMonthIncome('2026-09', 'cash').noInc, 1000000, 'мөнгөн суурь: NOMAAD-ийн 9 сарын төлбөр л 9 сард');
    eq(F.finMonthIncome('2026-10', 'cash').noInc, 2000000, 'мөнгөн суурь: NOMAAD-ийн 10 сарын төлбөр 10 сард (бүгд 9 сард шидэгдэхгүй)');
    // Гүйцэтгэлийн суурь: эвентийн сараар
    eq(F.finMonthIncome('2026-10', 'accrual').evInc, 1000000, 'гүйцэтгэл: эвентийн сараар');
    eq(F.finMonthIncome('2026-09', 'accrual').evInc, 500000, 'гүйцэтгэл: 9 сарын эвент 9 сард');

    runIn('state.appOrders = ' + JSON.stringify(save[0] || []) + ';');
    runIn('state.nomaadOrders = ' + JSON.stringify(save[1] || []) + ';');
    runIn('state.nomaadPayments = ' + JSON.stringify(save[2] || {}) + ';');
  }

  // ── SCAN: дүрэм дахин тархахгүй ──
  {
    const grab = (name) => { const at = src.indexOf('function ' + name); ok(at > 0, 'scan: ' + name + ' олдов'); return src.slice(at, src.indexOf('\n}', at)); };
    for (const fn of ['finMonthIncome', 'finAddOrderIncome']) {
      const body = grab(fn);
      ok(!/starts_at \|\| o\.created_at/.test(body),
         `scan: ${fn} нь орлогын сарыг өөрөө бодохгүй (orderIncomeMonth ашиглана)`);
    }
    ok(!/income_date \|\| ''\)\.slice\(0, 7\); v = nomaadPaid/.test(src),
       'scan: NOMAAD-ийн бүх мөнгө income_date сард шидэгдэхээ болив');
    const rep = src.slice(src.indexOf('const recInc ='), src.indexOf('const recInc =') + 320);
    ok(/finMonthIncome\(yy, 'cash'\)/.test(rep),
       'scan: Орлогын тайлан ч ижил функцээр бодогдоно (өөрийн дүрэм байхгүй)');
  }
}

// ═══ САР ХААХ (2026-09-11) ════════════════════════════════════════════════════
// Хуучин сарын тоо ямар ч үед өөрчлөгдөж, «өнгөрсөн сард харсан тайлан» хүчингүй
// болдог байв. Хаасан сар хөдөлөхгүй; алдаа гарвал дараагийн сард залруулга.
{
  need(['monthIsClosed', 'monthLocked', 'assertMonthOpen', 'closeMonthBlockers', 'setMonthClosed']);
  const runIn = (code) => vm.runInContext(code, sandbox);

  eq(F.monthIsClosed({ '2026-08': { at: 'x' } }, '2026-08'), true, 'сар хаах: хаасан сар танигдана');
  eq(F.monthIsClosed({ '2026-08': { at: 'x' } }, '2026-09'), false, 'сар хаах: бусад сар хөндөгдөхгүй');
  eq(F.monthIsClosed({}, '2026-08'), false, 'сар хаах: хоосон тохиргоо → хаалттай биш');
  eq(F.monthIsClosed(null, ''), false, 'сар хаах: хоосон оролт → хаалттай биш');
  // Огноо (YYYY-MM-DD) дамжуулсан ч сарыг л хардаг
  eq(F.monthIsClosed({ '2026-08': {} }, '2026-08-14'), true, 'сар хаах: бүтэн огноо ч сараар шалгагдана');

  // ── Түгжээ: бичилт ЧИМЭЭГҮЙ бүтэлгүйтэхгүй, ТОДОРХОЙ мессежтэй унана ──
  {
    const saved = runIn('state.closedMonths');
    runIn("state.closedMonths = { '2026-08': { at: '2026-09-01T00:00:00Z', by: 'ceo' } };");
    eq(F.monthLocked('2026-08'), true, 'түгжээ: хаасан сар түгжигдсэн');
    eq(F.monthLocked('2026-09'), false, 'түгжээ: нээлттэй сар чөлөөтэй');
    let msg = '';
    try { F.assertMonthOpen('2026-08', 'зардлын бичилт'); } catch (e) { msg = e.message; }
    ok(/2026-08/.test(msg) && /хаагдсан/.test(msg) && /зардлын бичилт/.test(msg),
       'түгжээ: мессеж нь сар, шалтгаан, юу хийж чадахгүйг хэлнэ → ' + msg);
    let threw = false;
    try { F.assertMonthOpen('2026-09', 'зардлын бичилт'); } catch (e) { threw = true; }
    eq(threw, false, 'түгжээ: нээлттэй сард бичилт зогсохгүй');
    try { F.assertMonthOpen('', 'x'); } catch (e) { threw = true; }
    eq(threw, false, 'түгжээ: огноогүй бичилт хаагдахгүй (чимээгүй блоклохгүй)');
    runIn('state.closedMonths = ' + JSON.stringify(saved === undefined ? null : saved) + ';');
  }

  // ── Хаахад бэлэн эсэх: дутуу хуулга · хаагдаагүй орлого · залгааны эвдрэл ──
  {
    const stmts = [{ id: '504|2026-08-01|2026-08-31', acct: '504', ccy: 'MNT',
      period_from: '2026-08-01', period_to: '2026-08-31', opening: 0, closing_stated: 100, closing_calc: 100 }];
    const income = [{ fp: 'i1', dt: '2026-08-05', amount: 700000, status: 'open' },
      { fp: 'i2', dt: '2026-08-06', amount: 300000, status: 'order' },
      { fp: 'i3', dt: '2026-07-06', amount: 900000, status: 'open' }];

    eq(F.closeMonthBlockers(stmts, [], ['504'], '2026-08'), [], 'хаах: хуулга бүрэн, хаагдаагүй мөр алга → бэлэн');

    const b1 = F.closeMonthBlockers(stmts, income, ['504'], '2026-08');
    eq(b1.map(x => x.kind), ['income'], 'хаах: хаагдаагүй орлого нь саад');
    eq([b1[0].n, b1[0].sum], [1, 700000], 'хаах: зөвхөн ТУХАЙН сарын хаагдаагүй мөр тоологдоно');

    const b2 = F.closeMonthBlockers(stmts, [], ['504', '300'], '2026-08');
    eq(b2.map(x => x.kind), ['stmt'], 'хаах: дансны хуулга дутуу нь саад');
    eq(b2[0].accts, ['300'], 'хаах: аль данс дутуу гэдгийг нэрлэнэ');

    // Тэнцлийн зөрүү — тухайн сарын хуулганд
    const bad = [{ ...stmts[0], closing_calc: 90 }];
    eq(F.closeMonthBlockers(bad, [], ['504'], '2026-08').map(x => x.kind), ['chain'],
       'хаах: хуулгын тэнцэл зөрвөл саад');
    // ӨӨР сарын эвдрэл нь энэ сарыг хаахад саад БОЛОХГҮЙ
    const other = [{ ...stmts[0], id: '504|2026-06-01|2026-06-30', period_from: '2026-06-01', period_to: '2026-06-30', closing_calc: 90 }];
    eq(F.closeMonthBlockers(other, [], [], '2026-08'), [], 'хаах: өөр сарын эвдрэл энэ сарыг хорихгүй');
  }

  // ── SCAN: түгжээ бичих БҮХ гол замд тавигдсан хэвээр ──
  {
    const gate = (fn, needle) => {
      const at = src.indexOf(fn);
      ok(at > 0, 'scan: ' + fn + ' олдов');
      ok(new RegExp(needle).test(src.slice(at, at + 1400)), `scan: ${fn} — хаасан сарын түгжээ тавигдсан`);
    };
    gate('async function saveFinanceRequest', 'assertMonthOpen');
    gate('async function setIncomeStatus', 'assertMonthOpen');
    gate('async function persistStatement', 'assertMonthOpen');
    gate('async function submitBqPayment', 'monthLocked');
    gate('async function clearMonthExpenses', 'monthLocked');
    // Кэш бичихээс ӨМНӨ шалгана — эс бөгөөс локал кэш хаасан сарыг дарна
    const sf = src.slice(src.indexOf('async function saveFinanceRequest'), src.indexOf('async function saveFinanceRequest') + 600);
    ok(sf.indexOf('assertMonthOpen') < sf.indexOf('saveFinanceCache'),
       'scan: түгжээ нь localStorage кэш бичихээс ӨМНӨ шалгагдана');
    // Эхлэхэд ачаалагдана — эс бөгөөс түгжээ «нээлттэй» гэж андуурна
    ok(/loadClosedMonths\(\);/.test(src), 'scan: хаасан сар эхлэхэд ачаалагдана');
  }
}

// ═══ ДОТООД ШИЛЖҮҮЛГИЙГ БҮРТГЭСЭН ДАНСААР ТАНИХ (2026-09-11) ══════════════════
// Орлогын тал нь дотоод шилжүүлгийг ЗӨВХӨН гүйлгээний утга/нэрээр таьдаг байв
// («данс хооронд», «Чимун»). Нэр хоосон ирсэн өөрийн шилжүүлэг «орлого» болж,
// тулгалтын «Банкны нийт орлого» хөөрөгдөж байсан. Зардлын импорт аль хэдийн
// бүртгэсэн дансаар (isInternalTransfer) таьдаг — орлого одоо ижил дүрэмтэй.
{
  need(['creditIsInternal', '_isInternalCredit', 'isInternalTransfer', 'reconcileByReceipts']);
  const own = new Set(['5041234567', '3001234567']);

  // ⭐ Гол кейс: нэр ХООСОН, утга ХООСОН — зөвхөн данснаас нь таних
  const blank = { date: '2026-08-04', credit: 200000, name: '', memo: '', account: '5041234567' };
  eq(F._isInternalCredit(blank), false, 'дотоод: үг-суурьтай хуучин аргад нэр хоосон мөр ТАНИГДАХГҮЙ (алдааны эх)');
  eq(F.creditIsInternal(blank, own), true, 'дотоод: бүртгэсэн данснаас нь танигдана');

  // Данс нь сүүлийн 10 оронгоор ч таарна (IBAN/угтвартай хэлбэр)
  eq(F.creditIsInternal({ credit: 1, name: '', memo: '', account: '99 5041234567' }, own), true,
     'дотоод: сүүлийн 10 оронгоор таарна');

  // Бодит харилцагчийн төлбөр = ОРЛОГО хэвээр (хэт их хасаж орлого нуухгүй)
  eq(F.creditIsInternal({ credit: 500000, name: 'Бат', memo: 'түрээс', account: '5049999999' }, own), false,
     'дотоод: харилцагчийн төлбөр орлого хэвээр');
  // Үг-суурьтай нөөц хэвээр ажиллана (данс бүртгэгдээгүй ч)
  eq(F.creditIsInternal({ credit: 9, name: 'ЧИМУН ХХК', memo: '', account: '7777777777' }, own), true,
     'дотоод: нэрээр таних нөөц хэвээр (данс бүртгэгдээгүй ч)');
  eq(F.creditIsInternal({ credit: 9, name: '', memo: 'данс хооронд', account: '7777777777' }, own), true,
     'дотоод: утгаар таних нөөц хэвээр');
  // Хэт богино/хоосон данс нь «өөрийн данс» гэж андуурагдахгүй
  eq(F.creditIsInternal({ credit: 9, name: 'Дорж', memo: 'төлбөр', account: '' }, own), false,
     'дотоод: данс хоосон + утга цэвэр → орлого');

  // ── Тулгалт ч ижил дүрмээр: нэргүй дотоод шилжүүлэг орлогод ОРОХГҮЙ ──
  {
    const rows = [
      { date: '2026-08-02', credit: 500000, debit: 0, name: 'Бат', account: '5049999999', memo: 'түрээс' },
      { date: '2026-08-04', credit: 200000, debit: 0, name: '', account: '5041234567', memo: '' },   // өөрийн данс
    ];
    const res = F.reconcileByReceipts(rows, { own, usedFps: new Set(), fpOwners: new Map() });
    eq(res.incomeCount, 1, 'тулгалт: нэргүй дотоод шилжүүлэг орлогын мөрд тоологдохгүй');
    eq(res.untracked.map(c => c.credit), [500000], 'тулгалт: зөвхөн бодит төлбөр үлдэнэ');
  }

  // ── SCAN: дүрэм дахин тархахгүй — үг-суурьтай шалгалтыг ШУУД дуудахгүй ──
  {
    const calls = [...src.matchAll(/_isInternalCredit\(/g)].length;
    eq(calls, 2, 'scan: _isInternalCredit нь тодорхойлолт + creditIsInternal дотор ЗӨВХӨН (шууд дуудалт байхгүй)');
    const at = src.indexOf('function creditIsInternal');
    ok(/isInternalTransfer\(r, set\)/.test(src.slice(at, at + 400)),
       'scan: ганц дүрэм нь бүртгэсэн дансыг шалгана');
  }
}
