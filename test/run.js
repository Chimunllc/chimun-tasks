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
need(['parseVat', 'encodeVat', 'custInfoOf', 'setCustInfo', 'parsePaidRef', 'parseDelivery', 'encodeDelivery', 'cleanAppNote', 'receiptFingerprint', 'parseBankReceipt', 'mapsHref', 'parseOrderTimes', 'encodeOrderTimes']);

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

// ═══════════════════ ДҮН ═══════════════════
console.log('');
if (fails.length) { console.log(fails.join('\n')); console.log(''); }
console.log(`${failed === 0 ? '✅' : '❌'}  Тест: ${passed} амжилттай, ${failed} унасан (нийт ${passed + failed})`);
process.exit(failed === 0 ? 0 : 1);
