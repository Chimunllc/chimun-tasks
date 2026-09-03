#!/usr/bin/env node
// Бизнесийн шийдвэрт хэрэгтэй тоог VPS Postgres-оос НЭГ дор гаргаж хэвлэнэ.
// Зорилго: шинэ бизнесийн санааг таамгаар биш, өөрийн датаар шалгах.
// Зөвхөн УНШИНА (SELECT) — юу ч бичихгүй, юу ч устгахгүй.
//
//   node tools/biz-snapshot.js              # хураангуй хэвлэнэ
//   node tools/biz-snapshot.js --json       # мөн biz-snapshot.json бичнэ (Claude-д хуулж өгөхөд)
//
// ⚠ Үүлэн (claude.ai/code) сессээс АЖИЛЛАХГҮЙ — тэнд n8n.nomaadcamp.com прокси дээр
// хаагддаг. Нотебүүк дээрх Claude Code desktop эсвэл терминалаас ажиллуулна.
//
// Түлхүүр/URL-ыг app.js-ээс уншина — энд давхардуулж бичихгүй (repo public).

const fs = require('fs');
const path = require('path');

const src = fs.readFileSync(path.join(__dirname, '..', 'app.js'), 'utf8');
const BASE = (src.match(/const DB_URL\s*=\s*'([^']+)'/) || [])[1];
const KEY = (src.match(/const DB_ANON_KEY\s*=\s*'([^']+)'/) || [])[1];
if (!BASE || !KEY) { console.error('app.js-ээс DB_URL/DB_ANON_KEY олдсонгүй'); process.exit(1); }

const H = { apikey: KEY, Authorization: 'Bearer ' + KEY };
const PAGE = 1000;   // PostgREST-ийн нэг хуудасны дээд хэмжээ

// Хүснэгтийг бүтнээр татна (Range-ээр хуудаслаж). Хүснэгт байхгүй бол null.
async function fetchAll(table, select) {
  const out = [];
  for (let from = 0; ; from += PAGE) {
    const url = `${BASE}/rest/v1/${table}?select=${encodeURIComponent(select || '*')}`;
    let r;
    try {
      r = await fetch(url, { headers: Object.assign({ Range: `${from}-${from + PAGE - 1}` }, H) });
    } catch (e) { console.error(`  ✗ ${table}: сүлжээ — ${e.message}`); return null; }
    if (!r.ok) { if (from === 0) console.error(`  ✗ ${table}: HTTP ${r.status}`); return from ? out : null; }
    const rows = await r.json();
    out.push(...rows);
    if (rows.length < PAGE) return out;
  }
}

const ym = (d) => (d ? String(d).slice(0, 7) : '');            // 2026-08
const mon = (d) => (d ? Number(String(d).slice(5, 7)) : 0);     // 8
const money = (n) => (Math.round(n) || 0).toLocaleString('en-US') + '₮';
const sum = (a) => a.reduce((s, x) => s + (Number(x) || 0), 0);
const bar = (v, max, w = 28) => '█'.repeat(Math.max(0, Math.round((v / (max || 1)) * w)));

// Сар бүрийн нийлбэрийг хэвлэнэ (сүүлийн n сар).
function printMonthly(title, byMonth, n = 24) {
  const keys = Object.keys(byMonth).filter(Boolean).sort().slice(-n);
  if (!keys.length) return console.log(`${title}: дата алга`);
  const max = Math.max(...keys.map(k => byMonth[k]));
  console.log(`\n${title}`);
  for (const k of keys) console.log(`  ${k}  ${String(money(byMonth[k])).padStart(14)}  ${bar(byMonth[k], max)}`);
}

(async function main() {
  const wantJson = process.argv.includes('--json');
  const R = { generated_at: new Date().toISOString() };
  console.log(`Эх: ${BASE}\n`);

  // ── 1. Эвентийн орлого (Booqable түүх + одоогийн) — төлбөрөөр
  const pays = await fetchAll('bq_payments', 'amount_in_cents,ptype,status,succeeded_at');
  if (pays) {
    const ok = pays.filter(p => (p.status || '').toLowerCase() === 'succeeded' && p.succeeded_at);
    const isRefund = (p) => /refund/i.test(p.ptype || '');
    const amt = (p) => (Number(p.amount_in_cents) || 0) / 100 * (isRefund(p) ? -1 : 1);
    const byM = {}, bySeason = {};
    for (const p of ok) {
      byM[ym(p.succeeded_at)] = (byM[ym(p.succeeded_at)] || 0) + amt(p);
      const m = mon(p.succeeded_at); (bySeason[m] = bySeason[m] || []).push(amt(p));
    }
    R.event_revenue_by_month = byM;
    console.log(`Эвент (bq_payments): ${ok.length} амжилттай төлбөр · цэвэр ${money(sum(ok.map(amt)))}`);
    printMonthly('Эвентийн орлого — сар бүр', byM);

    // Улирал: календарийн сар бүрийн ДУНДАЖ (хэдэн жилийн дунджаар)
    const years = new Set(Object.keys(byM).map(k => k.slice(0, 4)));
    const avg = {};
    for (let m = 1; m <= 12; m++) avg[m] = sum(bySeason[m] || []) / Math.max(1, years.size);
    R.event_season_avg = avg;
    const mx = Math.max(...Object.values(avg));
    console.log('\nУлирал — сарын дундаж орлого (эвент)');
    for (let m = 1; m <= 12; m++) console.log(`  ${String(m).padStart(2)}-р сар ${String(money(avg[m])).padStart(14)}  ${bar(avg[m], mx)}`);
    const low = Object.entries(avg).sort((a, b) => a[1] - b[1]).slice(0, 4).map(([m]) => m + '-р сар');
    console.log(`  → Хамгийн хоосон 4 сар: ${low.join(', ')}`);
    R.event_low_months = low;
  }

  // ── 2. Кемп (NOMAAD) орлого
  const nom = await fetchAll('nomaad_payments', '*');
  if (nom && nom.length) {
    const f = Object.keys(nom[0]);
    const amtF = ['income_amount', 'amount', 'paid_amount'].find(k => f.includes(k));
    const dateF = ['recorded_at', 'paid_date', 'created_at', 'date'].find(k => f.includes(k));
    if (amtF && dateF) {
      const byM = {};
      for (const p of nom) byM[ym(p[dateF])] = (byM[ym(p[dateF])] || 0) + (Number(p[amtF]) || 0);
      R.camp_revenue_by_month = byM;
      console.log(`\nКемп (nomaad_payments): ${nom.length} мөр · нийт ${money(sum(nom.map(p => p[amtF])))}`);
      printMonthly('Кемпийн орлого — сар бүр', byM);
    } else console.log(`\nnomaad_payments багана: ${f.join(', ')} (дүн/огнооны багана танигдсангүй)`);
  }

  // ── 3. Харилцагчийн давтамж — шинэ vs давтан
  const ords = await fetchAll('bq_orders', 'id,customer_id,status,starts_at,created_at');
  if (ords && ords.length) {
    const live = ords.filter(o => !/cancel|archiv/i.test(o.status || ''));
    const cnt = {};
    for (const o of live) if (o.customer_id) cnt[o.customer_id] = (cnt[o.customer_id] || 0) + 1;
    const ids = Object.keys(cnt), rep = ids.filter(k => cnt[k] > 1);
    R.customers = { total: ids.length, repeat: rep.length, repeat_pct: +(rep.length / Math.max(1, ids.length) * 100).toFixed(1) };
    console.log(`\nХарилцагч: ${ids.length} нийт · ${rep.length} давтан (${R.customers.repeat_pct}%) · ${live.length} захиалга`);
    const top = ids.sort((a, b) => cnt[b] - cnt[a]).slice(0, 5).map(k => cnt[k]);
    console.log(`  Топ 5 харилцагчийн захиалгын тоо: ${top.join(', ')}`);
  }

  // ── 4. Хөрөнгийн ашиглалт — өртөг байгаа ч орлого багатай бараа
  const prods = await fetchAll('products', '*');
  const lines = await fetchAll('bq_order_lines', '*');
  if (prods && prods.length) {
    const f = Object.keys(prods[0]);
    const costF = ['cost', 'unit_cost', 'purchase_cost'].find(k => f.includes(k));
    const stockF = ['stock', 'quantity', 'qty'].find(k => f.includes(k));
    const nameF = ['name', 'title'].find(k => f.includes(k));
    const invested = costF && stockF ? sum(prods.map(p => (Number(p[costF]) || 0) * (Number(p[stockF]) || 0))) : null;
    console.log(`\nБараа: ${prods.length}${invested != null ? ` · хөрөнгийн өртөг ${money(invested)}` : ''}`);
    R.products = { count: prods.length, invested };

    if (lines && lines.length && nameF && costF) {
      const lf = Object.keys(lines[0]);
      const lnF = ['product_name', 'name', 'title'].find(k => lf.includes(k));
      const lvF = ['total_in_cents', 'price_in_cents', 'amount_in_cents'].find(k => lf.includes(k));
      if (lnF && lvF) {
        const rev = {};
        const norm = (s) => String(s || '').trim().toLowerCase();
        for (const l of lines) rev[norm(l[lnF])] = (rev[norm(l[lnF])] || 0) + (Number(l[lvF]) || 0) / 100;
        const rows = prods.map(p => {
          const c = (Number(p[costF]) || 0) * (Number(p[stockF]) || 1);
          return { name: p[nameF], cost: c, revenue: rev[norm(p[nameF])] || 0, roi: c > 0 ? (rev[norm(p[nameF])] || 0) / c : null };
        }).filter(r => r.cost > 0);
        const dead = rows.filter(r => r.roi !== null && r.roi < 1).sort((a, b) => b.cost - a.cost);
        R.frozen_assets = { count: dead.length, capital: sum(dead.map(r => r.cost)) };
        console.log(`  ROI<1 (өртгөө нөхөөгүй): ${dead.length} бараа · ${money(sum(dead.map(r => r.cost)))} царцсан`);
        for (const r of dead.slice(0, 10)) console.log(`    ${String(r.name).slice(0, 40).padEnd(42)} өртөг ${String(money(r.cost)).padStart(13)}  ROI ${r.roi.toFixed(2)}×`);
      }
    }
  }

  if (wantJson) {
    const out = path.join(__dirname, '..', 'biz-snapshot.json');
    fs.writeFileSync(out, JSON.stringify(R, null, 2));
    console.log(`\n→ ${out} бичлээ. Claude-д энэ файлыг өг.`);
  }
})();
