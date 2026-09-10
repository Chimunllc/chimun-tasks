#!/usr/bin/env node
/**
 * Репо хоорондын гэрээний харуул — АМЬД mevent.mn ↔ апп ↔ app_config.
 *
 * Яагаад хэрэгтэй вэ:
 *   Хоёр репо нэг өгөгдлийн санг хуваалцдаг ч хамтын код байхгүй. Аль нэг
 *   талыг засахад нөгөө нь чимээгүй хоцордог — «аппад каталог өөрчлөхөд
 *   сайтаас бараа алга болдог» гэсэн бүх алдаа эндээс төрсөн.
 *
 *   Тест бүр өөрийн репод л ажилладаг тул НӨГӨӨ талын гажилтыг барьж чадахгүй.
 *   Энэ скрипт mevent.mn-ий АМЬД HTML-ийг татаж аппын утгатай тулгана —
 *   хоёр репог зэрэг харах цорын ганц газар. Сайт нийтэд нээлттэй тул
 *   хоёр дахь repo checkout ч, токен ч шаардахгүй.
 *
 * Ажиллуулах:  node tools/contract-check.js
 *   0 = таарч байна (эсвэл сүлжээгүй тул алгасав)
 *   1 = ЗӨРЧИЛ — GitHub Action үүнийг Issue болгоно
 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const SITE_URL = 'https://mevent.mn/';
const DB = 'https://n8n.nomaadcamp.com/db/rest/v1';
const ROOT = path.join(__dirname, '..');

// Сайт хандаж болох цорын ганц гадаргуу. Энэ жагсаалтаас гадуур юу ч уншиж
// эхэлбэл дүрэм давхардаж эхэлсэн гэсэн үг.
const ALLOWED_ENDPOINTS = new Set([
  'public_catalog', 'public_availability', 'app_config_public', 'app_errors',
]);

const problems = [];
const note = (t) => problems.push(t);

async function get(url) {
  const r = await fetch(url, { signal: AbortSignal.timeout(20000) });
  if (!r.ok) throw new Error(url + ' → HTTP ' + r.status);
  return r;
}

// Эх кодоос `let X = …` / `const X = …` мөрийг сугалж утгыг нь гаргана.
function valueOf(src, name) {
  // ⚠ Нэг мөрөнд олон зарлалт байж болно: `let WORK_START = 9, OFFHOURS_FEE = 20000;`
  //    Тиймээс түлхүүр үгээр ч, таслалаар ч эхэлсэн зарлалтыг барина.
  const m = src.match(new RegExp('(?:(?:let|const|var)\\s+|,\\s*)' + name + '\\s*=\\s*([^;,\\n]+)'));
  if (!m) return undefined;
  try { return vm.runInNewContext('(' + m[1].replace(/\/\/.*$/, '').trim() + ')'); }
  catch (e) { return undefined; }
}
function tiersOf(src) {
  const m = src.match(/(?:let|const|var)\s+RENTAL_TIERS\s*=\s*(\[[\s\S]*?\]);/);
  if (!m) return undefined;
  try { return vm.runInNewContext('(' + m[1] + ')'); } catch (e) { return undefined; }
}
const tierKey = (t) => (t || []).map((x) => `${Number(x.min)}:${Number(x.pct)}`).join(',');

(async () => {
  let siteSrc, cfg;
  try {
    siteSrc = await (await get(SITE_URL)).text();
    const rows = await (await get(DB + '/app_config_public?key=eq.tariffs&select=value')).json();
    cfg = rows[0] && rows[0].value;
  } catch (e) {
    // Сүлжээ/сайт хүрэхгүй бол ЗӨРЧИЛ гэж мэдээлэхгүй. Байнга улаан болдог
    // харуул хэдхэн хоногийн дараа үл тоомсорлогддог.
    console.log('⏭ Алгасав (амьд эх сурвалж хүрэхгүй): ' + e.message);
    process.exit(0);
  }
  if (!cfg) { console.log('⏭ Алгасав (app_config_public.tariffs хоосон)'); process.exit(0); }

  const appSrc = fs.readFileSync(path.join(ROOT, 'app.js'), 'utf8');

  // ── 1. Тарифын нөөц утга: апп ↔ сайт ↔ амьд тохиргоо ─────────────────────
  const checks = [
    ['Хот доторх хүргэлт', valueOf(appSrc, 'DELIVERY_CITY_FEE'), valueOf(siteSrc, 'DELIVERY_CITY_FEE'), Number(cfg.delivery_city_fee)],
    ['Нэг км тариф', valueOf(appSrc, 'DELIVERY_PER_KM'), valueOf(siteSrc, 'DELIVERY_PER_KM'), Number(cfg.delivery_per_km)],
    ['Ажлын бус цагийн хөлс', valueOf(appSrc, 'ORDER_OFFHOURS_FEE'), valueOf(siteSrc, 'OFFHOURS_FEE'), Number(cfg.offhours_fee)],
  ];
  for (const [label, app, site, live] of checks) {
    if (app === undefined || site === undefined) { note(`${label}: утга олдсонгүй (апп=${app}, сайт=${site})`); continue; }
    if (app !== site) note(`${label}: апп ${app} ↔ сайт ${site} — ЗӨРЧИЛТЭЙ`);
    else if (Number.isFinite(live) && live > 0 && app !== live) note(`${label}: код ${app} ↔ амьд тохиргоо ${live} — код хоцорсон`);
  }

  const appT = tierKey(tiersOf(appSrc)), siteT = tierKey(tiersOf(siteSrc)), liveT = tierKey(cfg.tiers);
  if (!appT || !siteT) note(`Хямдралын шатлал: утга олдсонгүй (апп="${appT}", сайт="${siteT}")`);
  else if (appT !== siteT) note(`Хямдралын шатлал: апп [${appT}] ↔ сайт [${siteT}] — ЗӨРЧИЛТЭЙ`);
  else if (liveT && appT !== liveT) note(`Хямдралын шатлал: код [${appT}] ↔ амьд тохиргоо [${liveT}] — код хоцорсон`);

  // ── 2. Сайтын өгөгдлийн сангийн гадаргуу ────────────────────────────────
  const touched = [...new Set([...siteSrc.matchAll(/rest\/v1\/([a-z_]+)/g)].map((m) => m[1]))];
  const bad = touched.filter((t) => !ALLOWED_ENDPOINTS.has(t));
  if (bad.length) note(`Сайт зөвшөөрөгдөөгүй хүснэгт уншиж байна: ${bad.join(', ')} — «юу харагдах» дүрэм дахин давхардаж эхэлсэн байна`);
  if (!touched.includes('public_catalog')) note('Сайт public_catalog харагдацаас уншихаа больжээ');

  // ── 3. Каталогийн харагдац бодитоор ажиллаж байна уу ────────────────────
  try {
    const rows = await (await get(DB + '/public_catalog?select=sku&limit=1000')).json();
    if (!Array.isArray(rows) || rows.length < 50) note(`public_catalog ердөө ${Array.isArray(rows) ? rows.length : '?'} бараа буцаалаа — шүүлт эвдэрсэн байж болзошгүй`);
  } catch (e) { note('public_catalog уншигдсангүй: ' + e.message); }

  // ── 4. Арилжааны багана нийтэд задраагүй эсэх ───────────────────────────
  for (const col of ['cost', 'supplier', 'market_value']) {
    try { await get(DB + `/public_catalog?select=sku,${col}&limit=1`); note(`public_catalog «${col}» баганыг нийтэд задалж байна`); }
    catch (e) { /* хүлээгдсэн — хаалттай */ }
  }
  for (const col of ['cost', 'supplier']) {
    try { await get(DB + `/products?select=sku,${col}&limit=1`); note(`products «${col}» баганыг түлхүүргүйгээр уншиж болж байна`); }
    catch (e) { /* хүлээгдсэн */ }
  }

  if (!problems.length) { console.log('✅ Гэрээ бүрэн — апп, сайт, тохиргоо гурвуулаа таарч байна.'); process.exit(0); }
  console.log('❌ ЗӨРЧИЛ ОЛДЛОО:\n');
  problems.forEach((p) => console.log(' · ' + p));
  process.exit(1);
})();
