#!/usr/bin/env node
/*
 * БУЦААХ ХАРУУЛ — оношлох хэсэг (tools/revert-watch.js).
 *
 * Яагаад хэрэгтэй: main-д merge хийсэн секундэд GitHub Pages дээр 150+ ажилтанд
 * шууд гарна. Алдааны триаж өдөрт 2 удаа л ажилладаг тул эвдэрсэн апп хагас
 * өдөр амьд байж болно. Автомат merge хийх бол ЭНЭ харуул заавал байна.
 *
 * Энэ скрипт ЗӨВХӨН шийдвэр гаргана (git-д хүрэхгүй) — тул локал тестлэж болно.
 * Гаралт = нэг мөр JSON: { revert, reason, errors }.
 *
 * Хэрэглээ:
 *   ERR_READ_JWT=… DEPLOY_TIME=2026-09-16T10:00:00Z node tools/revert-watch.js
 *   node tools/revert-watch.js --selftest     # сүлжээгүй, дүрмийг шалгана
 */
'use strict';

const BASE = 'https://n8n.nomaadcamp.com/db/rest/v1';

// ── Хязгаарууд. Хэт мэдрэг бол ХУДАЛ буцаалт болно (өөрөө эвдрэл). ──
const MIN_HITS = 3;      // нэг шинэ алдаа дор хаяж 3 удаа давтагдсан байх
const MIN_USERS = 2;     // дор хаяж 2 ӨӨР ажилтанд тохиолдсон байх (нэг хүний
                         // онцгой тохиолдол буцаалт хийхэд хүрэхгүй)
const WINDOW_H = 6;      // merge-ээс хойш хичнээн цаг харах

/* Цэвэр дүрэм: шинэ алдааны жагсаалтаас буцаах эсэхийг шийднэ.
   Гаднаас дата авахгүй тул тестлэгдэнэ. */
function decide(errors, opts = {}) {
  const minHits = opts.minHits ?? MIN_HITS;
  const minUsers = opts.minUsers ?? MIN_USERS;
  const hit = (errors || []).filter(
    (e) => Number(e.hits) >= minHits && Number(e.users) >= minUsers
  );
  if (!hit.length) {
    return { revert: false, reason: `Шинэ алдаа ${(errors || []).length} — хязгаарт хүрээгүй`, errors: [] };
  }
  const worst = hit.slice().sort((a, b) => Number(b.hits) - Number(a.hits));
  return {
    revert: true,
    reason: `${hit.length} шинэ алдаа хязгаар давсан (≥${minHits} удаа, ≥${minUsers} ажилтан)`,
    errors: worst.map((e) => ({ fp: e.fp, msg: String(e.msg || '?').slice(0, 120), hits: Number(e.hits), users: Number(e.users), view: e.view || '' })),
  };
}

async function fetchNewErrors(jwt, sinceIso) {
  const q = `v_app_errors?first_at=gte.${encodeURIComponent(sinceIso)}` +
            `&select=fp,msg,hits,users,view,first_at&order=hits.desc&limit=50`;
  const r = await fetch(`${BASE}/${q}`, {
    headers: { apikey: jwt, Authorization: `Bearer ${jwt}` },
  });
  if (!r.ok) throw new Error(`v_app_errors ${r.status}: ${(await r.text()).slice(0, 200)}`);
  return r.json();
}

function selftest() {
  const t = [];
  const ok = (c, n) => t.push([!!c, n]);
  ok(decide([]).revert === false, 'алдаагүй → буцаахгүй');
  ok(decide([{ fp: 'a', hits: 9, users: 1 }]).revert === false, 'нэг ажилтны алдаа → буцаахгүй');
  ok(decide([{ fp: 'a', hits: 2, users: 5 }]).revert === false, 'цөөн давтсан → буцаахгүй');
  ok(decide([{ fp: 'a', hits: 3, users: 2 }]).revert === true, 'хязгаарт хүрсэн → буцаана');
  const many = decide([{ fp: 'a', hits: 4, users: 2 }, { fp: 'b', hits: 20, users: 7 }]);
  ok(many.revert === true && many.errors[0].fp === 'b', 'хамгийн олон давтсан нь эхэлнэ');
  ok(decide([{ fp: 'a', hits: 1, users: 1 }], { minHits: 1, minUsers: 1 }).revert === true, 'хязгаар тохируулж болно');
  const bad = t.filter(([p]) => !p);
  for (const [p, n] of t) console.log(`${p ? '✓' : '✗'} ${n}`);
  console.log(bad.length ? `\n❌ ${bad.length} унасан` : `\n✅ ${t.length} тест OK`);
  process.exit(bad.length ? 1 : 0);
}

async function main() {
  if (process.argv.includes('--selftest')) return selftest();

  const jwt = process.env.ERR_READ_JWT || '';
  const deployTime = process.env.DEPLOY_TIME || '';
  const out = (o) => console.log(JSON.stringify(o));

  if (!jwt) return out({ revert: false, reason: 'ERR_READ_JWT байхгүй — харуул унтраалттай', errors: [] });
  if (!deployTime) return out({ revert: false, reason: 'DEPLOY_TIME байхгүй', errors: [] });

  const age = (Date.now() - Date.parse(deployTime)) / 3600000;
  if (!Number.isFinite(age)) return out({ revert: false, reason: `DEPLOY_TIME уншигдсангүй: ${deployTime}`, errors: [] });
  if (age > WINDOW_H) return out({ revert: false, reason: `Сүүлийн merge ${age.toFixed(1)} цагийн өмнө — харах хугацаа дууссан`, errors: [] });

  try {
    const errs = await fetchNewErrors(jwt, deployTime);
    out(decide(errs));
  } catch (e) {
    // Сүлжээ/токен унавал БУЦААХГҮЙ. Харуул унасныг буцаах шалтгаан болгож
    // болохгүй — эс бөгөөс токен хугацаа дуусахад бүх deploy буцаагдана.
    out({ revert: false, reason: `Алдааны лог уншигдсангүй: ${String(e.message).slice(0, 150)}`, errors: [] });
  }
}

if (require.main === module) main();
module.exports = { decide };
