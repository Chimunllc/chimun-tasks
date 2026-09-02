#!/usr/bin/env node
// Надад (эсвэл өгсөн хүнд) оноогдсон дуусаагүй даалгаврыг n8n-ээс татаж уншихад
// бэлэн текстээр хэвлэнэ. Зорилго: даалгаврыг Claude Code-д хуулж өгөхгүйгээр шууд
// уншуулж, дүгнэлт гаргуулах. Апп руу юу ч бичихгүй — зөвхөн унших.
//
//   node tools/my-tasks.js                  # Г.Мөнх-Учрал, дуусаагүй
//   node tools/my-tasks.js "И.Алтансүх"     # өөр хүн
//   node tools/my-tasks.js --all            # дууссаныг нь ч оруулна
//
// API түлхүүрийг app.js-ээс уншина — энд давхардуулж бичихгүй (repo нь public).

const fs = require('fs');
const path = require('path');

const APP = path.join(__dirname, '..', 'app.js');
const src = fs.readFileSync(APP, 'utf8');
const key = (src.match(/const N8N_API_KEY\s*=\s*'([^']+)'/) || [])[1];
const base = (src.match(/const DEFAULT_API_URL\s*=\s*'([^']+)'/) || [])[1];
if (!key || !base) { console.error('app.js-ээс API түлхүүр/URL олдсонгүй'); process.exit(1); }

const args = process.argv.slice(2);
const showAll = args.includes('--all');
const who = args.find(a => !a.startsWith('--')) || 'Г.Мөнх-Учрал';

// created нь ISO мөр (эсвэл хуучин мөрүүдэд ms тоо) байж болно. Дэлгэцэнд орон нутгийн
// цагаар харуулна — түүхий toISOString нь UTC+8-д нэг өдрөөр буурдаг.
const d = ts => {
  if (!ts) return '—';
  const v = new Date(typeof ts === 'number' || /^\d+$/.test(String(ts)) ? Number(ts) : ts);
  if (isNaN(v)) return String(ts);
  const p2 = n => String(n).padStart(2, '0');
  return `${v.getFullYear()}-${p2(v.getMonth() + 1)}-${p2(v.getDate())}`;
};
const sortKey = t => String(t.created || '');

(async () => {
  const r = await fetch(`${base}?action=list&t=${Date.now()}&key=${encodeURIComponent(key)}`,
    { headers: { 'Cache-Control': 'no-cache' } });
  if (!r.ok) { console.error('n8n HTTP ' + r.status); process.exit(1); }
  const all = (await r.json()).tasks || [];

  // Гүйцэтгэгч эсвэл хамтран гүйцэтгэгчээр нь тааруулна (нэрийн хэсэгчилсэн тохирол).
  const mine = all.filter(t =>
    String(t.assignee || '').includes(who) ||
    JSON.stringify(t.co_assignees || []).includes(who));
  const list = (showAll ? mine : mine.filter(t => t.status !== 'done'))
    .sort((a, b) => sortKey(b).localeCompare(sortKey(a)));

  console.log(`# ${who} — ${showAll ? 'бүх' : 'дуусаагүй'} даалгавар (${list.length}/${mine.length})\n`);
  for (const t of list) {
    console.log(`## ${t.title || '(гарчиггүй)'}`);
    console.log(`- id: ${t.id} · үүсгэсэн: ${t.createdBy || '—'} · ${d(t.created)}`);
    console.log(`- төлөв: ${t.status || '—'} · чухал: ${t.priority || '—'} · салбар: ${t.branch || '—'} · эцсийн хугацаа: ${t.due || '—'}`);
    if (t.desc) console.log(`\n${String(t.desc).trim()}`);
    console.log('\n---\n');
  }
  if (!list.length) console.log('_Шинэ даалгавар алга._');
})().catch(e => { console.error(e.message); process.exit(1); });
