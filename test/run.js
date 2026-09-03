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
  'rentalDiscount', 'rentalDays', 'orderRentalDays', 'salaryNet', 'salaryNextYm', 'vatNum', 'vatNorm', 'vatDateIso', 'vatRegNorm', 'vatNameMatch', 'vatAutoScore', '_rangesOverlap', 'fmtMoney', 'fmtMoneyShort', 'attMemberSummary', 'buildReconAiPayload', 'applyReconAiSuggestions', '_isInternalCredit', 'reconcileOrders', 'parsePaidRef', 'receiptTooOld', 'statementMeta', 'reconcileByReceipts', 'receiptFingerprint', 'reconReceiptOwnerLabel', 'driverBonus', 'finIsRealExpense', 'finIsDepositReturn',
  'encodeSetup', 'setupFlagOf', 'setupFeeOf', 'setupFeeForItems', 'setupRateForName', 'setupUnitFee', 'cooShareAmount', 'quoteDiscountFromTotal', '_histCompute', 'isOrderAutoTask', '_nomaadMonthSum', 'orderDiscountAmount', 'orderMoneyBreakdown', 'calcDeliveryFee', 'tariffOffhoursFee', 'tariffDeliveryCity', 'tariffPerKm', 'parseRefund', 'encodeRefundNote']);

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

  finish();
})();
