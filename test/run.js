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
  'rentalDiscount', 'rentalDays', 'orderRentalDays', 'salaryNet', 'salaryNextYm', 'vatNum', 'vatNorm', 'vatDateIso', 'vatRegNorm', 'vatNameMatch', 'vatAutoScore', '_rangesOverlap', 'fmtMoney', 'fmtMoneyShort', 'attMemberSummary', 'buildReconAiPayload', 'applyReconAiSuggestions', '_isInternalCredit']);

// ═══════════════════ ТЕСТҮҮД ═══════════════════

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

// 4) Эхлэх/дуусах цаг токен
{
  const enc = F.encodeOrderTimes(9, 18);
  const t = F.parseOrderTimes('note ' + enc);
  eq({ sh: t.sh, eh: t.eh }, { sh: 9, eh: 18 }, 'Цаг токен: encode→parse');
}

// 5) cleanAppNote — токенуудыг цэвэрлэнэ, үндсэн текст үлдэнэ
{
  const note = 'Жинхэнэ тэмдэглэл ' + F.encodeVat(5000) + ' ' + F.encodeDelivery('out', 10, 50000);
  const clean = F.cleanAppNote(note);
  ok(clean.indexOf('Жинхэнэ тэмдэглэл') === 0, 'cleanAppNote: үндсэн текст үлдэнэ');
  ok(!/⟦VAT/.test(clean) && !/⟦DLV/.test(clean), 'cleanAppNote: токенууд арилна');
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

// 11) rentalDays / orderRentalDays — түрээсийн хоног тооцоо
eq(F.rentalDays(0, 24 * 3600000), 1, 'Хоног: 24 цаг = 1 хоног');
eq(F.rentalDays(0, 25 * 3600000), 2, 'Хоног: 25 цаг = 2 хоног (дээш бөөрөнхийлнө)');
eq(F.rentalDays(0, 0), 1, 'Хоног: 0 = хамгийн багадаа 1');
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

  finish();
})();
