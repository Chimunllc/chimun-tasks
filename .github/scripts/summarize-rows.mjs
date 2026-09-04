// PostgREST-ийн хариуг лог руу бичихийн өмнө хураангуйлна.
//
// Яагаад: PostgREST дээр нэгтгэл (aggregate) хаалттай (PGRST123) тул сар бүрийн
// орлого гэх мэт зүйлийг мэдэхийн тулд мянган мөр татах шаардлагатай болдог.
// Тэр бүхнийг лог руу хэвлэвэл уншигдахгүй бөгөөд үүлэн агентын контекстыг
// дүүргэнэ. Тиймээс мөр олон бол мөрүүдийн ОРОНД дүнг хэвлэнэ.
//
//   ≤ ROW_LIMIT мөр  → мөрүүдийг бүтнээр (одоогийнхтой ижил)
//   >  ROW_LIMIT мөр → тоо, тоон баганы нийлбэр, огноогоор сар бүрийн задаргаа,
//                      + эхний 2 мөр (баганын нэрийг харах дээж)
//
// stdin-ээс JSON уншиж stdout руу бичнэ. JSON биш бол түүхийгээр нь дамжуулна.

const ROW_LIMIT = 40;
const isDate = (v) => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}/.test(v);
const isNum = (v) => typeof v === 'number' && Number.isFinite(v);
const fmt = (n) => (Math.round(n) || 0).toLocaleString('en-US');

let s = '';
process.stdin.on('data', (d) => { s += d; });
process.stdin.on('end', () => {
  let j;
  try { j = JSON.parse(s); } catch { console.log(s); return; }

  if (!Array.isArray(j) || j.length <= ROW_LIMIT) {
    console.log(JSON.stringify(j, null, 1));
    console.log('\n— мөр:', Array.isArray(j) ? j.length : 1);
    return;
  }

  const keys = Object.keys(j[0] || {});
  const numKeys = keys.filter((k) => j.some((r) => isNum(r[k])));
  const dateKey = keys.find((k) => j.some((r) => isDate(r[k])));

  console.log('Дээж (эхний 2 мөр):');
  console.log(JSON.stringify(j.slice(0, 2), null, 1));
  console.log(`\n— мөр: ${j.length}`);

  if (numKeys.length) {
    console.log('\n— НИЙТ:');
    for (const k of numKeys) console.log(`  ${k}: ${fmt(j.reduce((a, r) => a + (Number(r[k]) || 0), 0))}`);
  }

  if (dateKey) {
    // Сараар (YYYY-MM) — мөрийн тоо + тоон баганын нийлбэр
    const by = new Map();
    for (const r of j) {
      if (!isDate(r[dateKey])) continue;
      const m = String(r[dateKey]).slice(0, 7);
      const cur = by.get(m) || { n: 0 };
      cur.n++;
      for (const k of numKeys) cur[k] = (cur[k] || 0) + (Number(r[k]) || 0);
      by.set(m, cur);
    }
    console.log(`\n— САР БҮР (${dateKey}):`);
    for (const m of [...by.keys()].sort()) {
      const v = by.get(m);
      console.log(`  ${m}  n=${String(v.n).padStart(4)}  ` + numKeys.map((k) => `${k}=${fmt(v[k])}`).join('  '));
    }
  }

  // Цөөн өвөрмөц утгатай текст багана (төлөв, суваг г.м.) — задаргаа
  for (const k of keys) {
    if (numKeys.includes(k) || k === dateKey) continue;
    const vals = new Map();
    for (const r of j) {
      const v = r[k];
      if (v == null || typeof v === 'object') continue;
      vals.set(String(v), (vals.get(String(v)) || 0) + 1);
    }
    if (vals.size === 0 || vals.size > 12) continue;
    console.log(`\n— ${k}:`);
    for (const [v, n] of [...vals.entries()].sort((a, b) => b[1] - a[1])) console.log(`  ${v}: ${n}`);
  }
});
