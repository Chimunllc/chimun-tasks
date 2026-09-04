#!/usr/bin/env node
// Кэштэй утсанд өөрчлөлт хүрэх баталгаа.
//
// Аппыг service worker кэшээр өгдөг тул `sw.js`-ийн CACHE_VERSION өөрчлөгдөхгүй
// бол ажилчдын утас ХУУЧИН файлаа үргэлжлүүлэн уншина: PR merge хийгдсэн ч
// «юу ч өөрчлөгдөөгүй» гэж харагдана. 2026-09-04-нд PR #163 яг ингэж алдагдсан.
//
// Энэ шалгалт: sw.js-ийн SHELL_FILES-д багтсан файл өөрчлөгдсөн атлаа
// CACHE_VERSION хэвээр бол PR-ыг унагана.
//
// Ажиллуулах:  node .github/scripts/check-cache-version.mjs <base-ref>
import { execFileSync } from 'node:child_process';

const base = process.argv[2];
if (!base) { console.error('Хэрэглээ: check-cache-version.mjs <base-ref>'); process.exit(2); }
const git = (...a) => execFileSync('git', a, { encoding: 'utf8' });

// Салаалсан цэг — main урагшилсан ч ЗӨВХӨН энэ PR-ын өөрчлөлтийг харна
const forkPoint = git('merge-base', `origin/${base}`, 'HEAD').trim();

// Хамгаалах файлын жагсаалтыг sw.js-ээс ӨӨРӨӨС нь уншина (гараар давхардуулахгүй).
// SHELL_FILES − NETWORK_FIRST = cache-first файлууд. ЗӨВХӨН тэдгээр өөрчлөгдөхөд
// CACHE_VERSION хэрэгтэй: app.js/styles.css/index.html нь `cache:'reload'`-оор
// сүлжээнээс үргэлж шинээр татагддаг тул хувилбараас үл хамааран хүрнэ.
const swNow = git('show', 'HEAD:sw.js');
const shellBlock = /SHELL_FILES\s*=\s*\[([\s\S]*?)\]/.exec(swNow);
if (!shellBlock) { console.error('❌ sw.js-ээс SHELL_FILES олдсонгүй'); process.exit(1); }
const nfBlock = /NETWORK_FIRST\s*=\s*\[([^\]]*)\]/.exec(swNow);
if (!nfBlock) { console.error('❌ sw.js-ээс NETWORK_FIRST олдсонгүй'); process.exit(1); }
const netFirst = new Set([...nfBlock[1].matchAll(/'([^']+)'/g)].map(m => m[1]));
const shell = [...shellBlock[1].matchAll(/'\.\/([^']+)'/g)].map(m => m[1]);
const watched = shell.filter(f => !netFirst.has(f));
if (!shell.length) { console.error('❌ SHELL_FILES хоосон байна'); process.exit(1); }
if (!watched.length) { console.log('✓ Бүх shell файл network-first — CACHE_VERSION шалгах зүйлгүй'); process.exit(0); }

const changed = git('diff', '--name-only', forkPoint, 'HEAD', '--', ...watched).trim();
if (!changed) {
  console.log(`✓ Cache-first файл (${watched.join(', ')}) өөрчлөгдөөгүй — CACHE_VERSION шаардлагагүй`);
  process.exit(0);
}

const readVer = (src, where) => {
  const m = /CACHE_VERSION\s*=\s*'([^']+)'/.exec(src);
  if (!m) { console.error(`❌ ${where}-аас CACHE_VERSION олдсонгүй`); process.exit(1); }
  return m[1];
};
const before = readVer(git('show', `${forkPoint}:sw.js`), 'суурь sw.js');
const after  = readVer(swNow, 'sw.js');

if (before === after) {
  console.error(`❌ Өөрчлөгдсөн: ${changed.split('\n').join(', ')}`);
  console.error(`   Гэвч sw.js-ийн CACHE_VERSION хэвээр: ${after}`);
  console.error('');
  console.error('   Эдгээр нь cache-first тул service worker ХУУЧИН хувилбарыг өгсөөр');
  console.error('   байна — ажилчдын утсанд өөрчлөлт хүрэхгүй.');
  console.error('   sw.js-д CACHE_VERSION-ийн дугаарыг нэмэгдүүл.');
  process.exit(1);
}
console.log(`✓ ${changed.split('\n').join(', ')} өөрчлөгдсөн · CACHE_VERSION ${before} → ${after}`);
