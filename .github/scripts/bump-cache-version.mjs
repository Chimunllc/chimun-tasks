#!/usr/bin/env node
// sw.js-ийн CACHE_VERSION-ыг АВТОМАТААР нэмэгдүүлнэ (main дээр merge хийгдсэний дараа).
//
// Яагаад: хувилбарыг гараар засдаг байсан тул зэрэгцээ ажилладаг салбар бүр
// ЯГ ТЭР МӨРИЙГ өөрчилж, merge бүрд конфликт үүсгэдэг байв (2026-09-04-нд нэг
// PR дээр 4 удаа). Одоо салбарууд sw.js-д ХҮРЭХГҮЙ — CI өөрөө бөглөнө.
//
// Ажиллуулах:  node .github/scripts/bump-cache-version.mjs [шошго]
//   Гаралт: өөрчилсөн бол шинэ хувилбарыг stdout-д бичээд 0-ээр гарна.
//           Кэшлэгддэг файл өөрчлөгдөөгүй бол юу ч хийхгүй.
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';

const git = (...a) => execFileSync('git', a, { encoding: 'utf8' });
const label = (process.argv[2] || 'auto').replace(/[^0-9A-Za-z-]/g, '-').slice(0, 28) || 'auto';

const sw = readFileSync('sw.js', 'utf8');
const cur = /const CACHE_VERSION = '([^']+)';/.exec(sw);
if (!cur) { console.error('❌ sw.js-ээс CACHE_VERSION олдсонгүй'); process.exit(1); }

// Хамгаалах файлын жагсаалтыг sw.js-ээс өөрөөс нь (check-cache-version-тэй ижил эх)
const shell = /SHELL_FILES\s*=\s*\[([\s\S]*?)\]/.exec(sw);
if (!shell) { console.error('❌ sw.js-ээс SHELL_FILES олдсонгүй'); process.exit(1); }
const watched = [...shell[1].matchAll(/'\.\/([^']+)'/g)].map(m => m[1]).filter(Boolean);

// Энэ push-д кэшлэгддэг файл өөрчлөгдсөн үү?
let changed = '';
try {
  changed = git('diff', '--name-only', 'HEAD~1', 'HEAD', '--', ...watched).trim();
} catch { changed = watched.join('\n'); }   // эхний commit г.м. — аюулгүй тал руу
if (!changed) { console.error('Кэшлэгддэг файл өөрчлөгдөөгүй — хувилбар хэвээр'); process.exit(0); }

const n = Number(/v(\d+)/.exec(cur[1])?.[1] || 0) + 1;
const d = new Date().toISOString().slice(0, 10);
const next = `chimun-tasks-v${n}-${label}-${d}`;
writeFileSync('sw.js', sw.replace(cur[0], `const CACHE_VERSION = '${next}';`));
console.error(`✓ ${cur[1]} → ${next}\n  (өөрчлөгдсөн: ${changed.replace(/\n/g, ', ')})`);
console.log(next);
