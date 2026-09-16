#!/usr/bin/env node
/*
 * Дизайны гэрээний ӨРИЙГ ТООГООР хэмжинэ (tools/debt-check.js).
 *
 * Яагаад хэрэгтэй болов: CLAUDE.md-д «шинэ inline style нэмэхгүй» гэж бичээстэй
 * байсан ч 2026-08-29-нд 2,050 байсан тоо 09-16-нд 2,259 болтлоо ӨССӨН. Дүрэм
 * бичээстэй байсан, гэхдээ ХЭН Ч ХЭМЖЭЭГҮЙ тул чимээгүй зөрчигдсөн. Прозоор
 * бичсэн дүрэм мартагддаг — тоо мартагддаггүй.
 *
 * ХРАПОВИК (нэг тал руу л эргэдэг):
 *   ① хэмжсэн тоо  ≤ tools/debt-baseline.json  (PR өрийг ӨСГӨЖ болохгүй)
 *   ② PR-ын baseline ≤ суурь салбарын baseline (зарласан шалгуур сулрахгүй)
 * Хоёулаа lint.yml-д шалгагдана. Зориуд өсгөх бол PR-д
 * `дизайны-өр-өсөхийг-зөвшөөрөв` шошго тавина.
 *
 * Хэрэглээ:
 *   node tools/debt-check.js            # хэмжиж baseline-тай тулгана
 *   node tools/debt-check.js --json     # зөвхөн тоо (JSON)
 *   node tools/debt-check.js --update   # baseline-ыг одоогийн тоогоор бичнэ
 *   node tools/debt-check.js --suggest  # шөнийн агентад нэг тодорхой ажил санал болгоно
 */
'use strict';
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const BASELINE = path.join(__dirname, 'debt-baseline.json');
const read = (f) => fs.readFileSync(path.join(ROOT, f), 'utf8');

const COLOR_RE = /#[0-9a-fA-F]{3,8}\b|rgba?\([^)]*\)/g;

// Метрик бүр: { тайлбар, хэмжигч }. Тоо нь БУУРАХ ёстой зүйлс.
const METRICS = {
  important: {
    label: '!important (styles.css)',
    measure: (f) => (f.css.match(/!important/g) || []).length,
  },
  inline_style: {
    label: 'inline style= (app.js)',
    measure: (f) => (f.js.match(/style="/g) || []).length,
  },
  colors_distinct: {
    label: 'өөр өнгө (styles.css)',
    measure: (f) => new Set((f.css.match(COLOR_RE) || []).map((c) => c.toLowerCase())).size,
  },
  colors_in_js: {
    label: 'хатуу өнгө (app.js)',
    measure: (f) => (f.js.match(COLOR_RE) || []).length,
  },
  font_px: {
    label: 'хатуу px фонт (styles.css)',
    measure: (f) => (f.css.match(/font-size:\s*[\d.]+px/g) || []).length,
  },
  breakpoints: {
    label: 'өөр breakpoint (styles.css)',
    measure: (f) => new Set(
      (f.css.match(/\((?:min|max)-width:\s*[\d.]+px\)/g) || []).map((s) => s.replace(/\s+/g, ''))
    ).size,
  },
};

function files() {
  return { js: read('app.js'), css: read('styles.css') };
}

function measure() {
  const f = files();
  const out = {};
  for (const [k, m] of Object.entries(METRICS)) out[k] = m.measure(f);
  return out;
}

function loadBaseline() {
  try { return JSON.parse(fs.readFileSync(BASELINE, 'utf8')); } catch { return null; }
}

/* ── --suggest: агентад НЭГ тодорхой, хүрээтэй ажил өгнө ──
   «inline style багасга» гэвэл агент 2,259 мөрийг хөөж цаг/токен үрнэ. Тиймээс
   хамгийн их хуримтлагдсан ГАЗРЫГ нэрлэж өгнө — нэг функц, нэг класс. */
function suggest() {
  const js = read('app.js');
  const lines = js.split('\n');
  // Мөр бүрийн хамгийн дээд түвшний функцийн нэрийг ол.
  let fn = '(файлын дээд хэсэг)';
  const owner = [];
  const DECL = /^\s{0,2}(?:async\s+)?function\s+([A-Za-z_$][\w$]*)|^\s{0,2}(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*(?:async\s*)?(?:function|\()/;
  for (const line of lines) {
    const m = line.match(DECL);
    if (m) fn = m[1] || m[2];
    owner.push(fn);
  }
  const tally = new Map();
  lines.forEach((line, i) => {
    const n = (line.match(/style="/g) || []).length;
    if (!n) return;
    const key = owner[i];
    const cur = tally.get(key) || { n: 0, first: i + 1 };
    cur.n += n;
    tally.set(key, cur);
  });
  const top = [...tally.entries()].sort((a, b) => b[1].n - a[1].n).slice(0, 5);
  return { metric: 'inline_style', top: top.map(([name, v]) => ({ fn: name, count: v.n, line: v.first })) };
}

function main() {
  const arg = process.argv[2] || '';
  const now = measure();

  if (arg === '--json') { console.log(JSON.stringify(now, null, 2)); return; }

  if (arg === '--update') {
    fs.writeFileSync(BASELINE, JSON.stringify(now, null, 2) + '\n');
    console.log('✓ baseline шинэчлэв:', BASELINE);
    return;
  }

  if (arg === '--suggest') {
    const s = suggest();
    console.log('Хамгийн их inline style хуримтлагдсан газрууд:');
    for (const r of s.top) console.log(`  ${r.fn}  —  ${r.count} inline style  (app.js:${r.line})`);
    console.log('\nНэг ажил = нэг функц. Тэр функцийн inline style-ыг styles.css-ийн класс болго.');
    return;
  }

  const base = loadBaseline();
  const rows = Object.keys(METRICS).map((k) => {
    const b = base ? base[k] : null;
    const d = b == null ? null : now[k] - b;
    return { k, label: METRICS[k].label, now: now[k], base: b, d };
  });

  const w = Math.max(...rows.map((r) => r.label.length));
  console.log('Метрик'.padEnd(w) + '   одоо   суурь   зөрүү');
  let bad = 0;
  for (const r of rows) {
    const mark = r.d == null ? '—' : r.d > 0 ? `🔴 +${r.d}` : r.d < 0 ? `🟢 ${r.d}` : '→ 0';
    if (r.d != null && r.d > 0) bad++;
    console.log(
      r.label.padEnd(w) + String(r.now).padStart(7) +
      String(r.base ?? '—').padStart(8) + '   ' + mark
    );
  }
  if (!base) {
    console.log('\nsuurь файл байхгүй. `node tools/debt-check.js --update` ажиллуул.');
    process.exit(0);
  }
  if (bad) {
    console.log(`\n❌ ${bad} метрик ӨССӨН. Дизайны гэрээ: шинэ !important / inline style / хатуу өнгө нэмэхгүй.`);
    console.log('   Зориуд бол PR-д `дизайны-өр-өсөхийг-зөвшөөрөв` шошго тавь.');
    process.exit(1);
  }
  console.log('\n✅ Өр өсөөгүй.');
}

if (require.main === module) main();
module.exports = { measure, METRICS };
