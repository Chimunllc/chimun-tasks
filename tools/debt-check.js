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
const { execFileSync } = require('node:child_process');

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

/* ── --suggest: агентад НЭГ тодорхой, ДУУСГАЖ БОЛОХ ажил өгнө ──
   «inline style багасга» гэвэл агент 2,259 мөрийг хөөж токен үрнэ. Тиймээс нэг
   функцийг л нэрлэнэ.

   ⛔ ХАМГИЙН ИХ нэгийг БҮҮ сонго. 2026-09-16-нд суггестер `kpi` (200 style)-г
   нэрлээд агент 40 эргэлтийг дуусгаж УНАСАН — бүр дуусгасан ч 500 мөрийн diff
   хязгаараас хэтэрч merge хийгдэхгүй байсан. Суггестер ба merge-ийн хязгаар
   хоёр бие биенийхээ эсрэг ажиллаж байв.
   Тиймээс [SUG_MIN, SUG_MAX] хүрээнээс л сонгоно: нэг шөнөд дуусах, diff нь
   хязгаарт тохирох. 89 функц энэ хүрээнд байгаа тул ажил урт хугацаанд хүрэлцэнэ. */
const SUG_MIN = 5;    // үүнээс бага бол ажил болгох нь үнэ цэнэгүй
const SUG_MAX = 25;   // үүнээс их бол нэг шөнөд дуусахгүй / diff хязгаараас хэтэрнэ
const CHURN_DAYS = 90;

/* ── Сүүлийн CHURN_DAYS хоногт хүрсэн мөрүүд ──
   Яагаад хэрэгтэй: тоос их байгаа өрөөг цэвэрлэх нь чиний хамгийн их явдаг
   өрөөг цэвэрлэхтэй ижил БИШ. Өр бөөгнөрсөн функц нь 2 жил хөдөлгөөнгүй байж
   болно — түүнийг цэвэрлэвэл засвар хурдан болохгүй. Иймд «сүүлд хүрсэн»
   функцийг эрхэмлэнэ: агент чиний бодит ажиллаж буй кодыг цэгцэлнэ.

   `git blame` НЭГ удаа ажиллана — мөр бүрийн СҮҮЛИЙН commit-ийн огноог өгнө.
   ⚠ Доогуур тоолно (нэг мөр 5 удаа өөрчлөгдсөн ч зөвхөн сүүлийнх харагдана),
   гэхдээ «сүүлд хүрсэн эсэх» дохио хангалттай. `git log -L`-ийг 89 функцэд
   ажиллуулбал хэт удаан.
   ⚠ git байхгүй / shallow clone бол `null` буцаана → тооны эрэмбэ руу унана
   (чимээгүй биш, `--suggest` дээр ил бичигдэнэ). */
function blameRecent() {
  try {
    const out = execFileSync('git', ['blame', '--line-porcelain', '--', 'app.js'],
      { cwd: ROOT, encoding: 'utf8', maxBuffer: 1024 * 1024 * 1024, stdio: ['ignore', 'pipe', 'ignore'] });
    const cutoff = Date.now() / 1000 - CHURN_DAYS * 86400;
    const recent = [];
    let pending = 0, idx = 0;
    for (const l of out.split('\n')) {
      if (l.startsWith('author-time ')) pending = Number(l.slice(12));
      else if (l[0] === '\t') recent[idx++] = pending >= cutoff;   // мөрийн агуулга = мөр дуусав
    }
    return idx ? recent : null;
  } catch { return null; }
}

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
  // Функц тус бүрийн «сүүлд хүрсэн мөрийн тоо»
  const recent = blameRecent();
  const churn = new Map();
  if (recent) owner.forEach((fn, i) => { if (recent[i]) churn.set(fn, (churn.get(fn) || 0) + 1); });

  const all = [...tally.entries()]
    .map(([name, v]) => ({ fn: name, count: v.n, line: v.first, churn: churn.get(name) || 0 }))
    .sort((a, b) => b.count - a.count);

  const fit = all.filter((r) => r.count >= SUG_MIN && r.count <= SUG_MAX);
  // ЭРЭМБЭ: сүүлд хүрсэн нь эхэлнэ, дараа нь өр их нь. Churn уншигдаагүй бол
  // бүгд 0 болж зөвхөн тооны эрэмбэ үлдэнэ (хуучин зан чанар).
  fit.sort((a, b) => (b.churn - a.churn) || (b.count - a.count));

  return {
    metric: 'inline_style',
    top: fit.slice(0, 5),                             // сонгож болох ажлууд
    oversize: all.filter((r) => r.count > SUG_MAX),   // нэг шөнөд томдох нь
    remaining: fit.length,
    churnOk: !!recent,                                // git blame ажилласан эсэх
  };
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

  // Зөвхөн нэрийг хэвлэнэ — workflow үүнийг уншина. Хүрээнд юу ч байхгүй бол хоосон.
  if (arg === '--suggest-target') {
    const s = suggest();
    if (s.top[0]) console.log(s.top[0].fn);
    return;
  }

  // ⚠ Нэр дангаараа ХҮРЭЛЦЭХГҮЙ. Churn эрэмбэ нь `v`, `row`, `draw` гэх мэт
  // 1-2 үсэгтэй дотоод функцүүдийг дээш гаргадаг — агент тэр нэрээр хайвал
  // олон таарц гарч буруу газар зална. Мөрийн дугаар нь ганц зөв хаяг.
  // Хүрээнд юу ч байхгүй бол ХООСОН гаралт (workflow түүнийг шалгана).
  if (arg === '--suggest-json') {
    const s = suggest();
    if (s.top[0]) console.log(JSON.stringify(s.top[0]));
    return;
  }

  if (arg === '--suggest') {
    const s = suggest();
    console.log(`Нэг шөнийн ажилд тохирох (${SUG_MIN}–${SUG_MAX} inline style), ` +
                (s.churnOk ? `сүүлийн ${CHURN_DAYS} хоногт хамгийн олон хүрсэн нь эхэлнэ:`
                           : `⚠ git blame уншигдсангүй — зөвхөн тооны эрэмбэ:`));
    for (const r of s.top) {
      console.log(`  ${r.fn}  —  ${r.count} inline style  ·  ${r.churn} мөр сүүлд хүрсэн  (app.js:${r.line})`);
    }
    if (!s.top.length) console.log('  (хүрээнд юу ч байхгүй)');
    console.log(`\nХүрээнд бүгд: ${s.remaining} функц.`);
    if (s.oversize.length) {
      console.log(`Нэг шөнөд томдох (${SUG_MAX}-аас их): ${s.oversize.length} функц — ` +
                  `хамгийн том нь ${s.oversize[0].fn} (${s.oversize[0].count}). Эдгээрийг ГАРААР хувааж зас.`);
    }
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
module.exports = { measure, METRICS, suggest, SUG_MIN, SUG_MAX };
