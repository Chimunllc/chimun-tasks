// n8n `MEVENT · Reminder mail (repeat)` workflow-ийн «Имэйл бэлдэх» Code node-ийн эх код.
// Энэ файл нь ЭХ СУРВАЛЖ: n8n-д `tools/build_reminder_wf.py` суулгана (workflow JSON репод ҮГҮЙ).
// ХЭНД, ХЭЗЭЭ явахыг db/reminder_mail.sql-ийн reminder_pick() шийднэ. БИЧВЭРИЙГ ажилтан
// аппаас (Маркетинг → Имэйл → Автомат сануулга) засна, `app_config['reminder_mail_text']`-д
// хадгалагдаж, `r.txt` болж ирнэ. Энд зөвхөн угсарна.
//
// ⛔ Аппын `reminderTextPreview()`-тэй ЯГ ИЖИЛ дүрэмтэй байх ёстой (урьдчилан харах = бодит имэйл).
//    test/run.js хоёуланг тулгаж шалгана — нэгийг засвал нөгөөг ЗЭРЭГ зас.
// ⛔ Хэрэглэгчийн бичсэн бичвэр ЗӨВХӨН энгийн текст: esc()-ээр HTML болгоно, холбоос/HTML орохгүй.
const C = { navy: '#0B1F3A', orange: '#E95400', text: '#17171B', muted: '#5C5C63', line: '#ECE9E2', cream: '#FAF9F5' };
const OPTOUT = 'https://n8n.nomaadcamp.com/webhook/email-optout';
const LIM = { subject: 120, heading: 120, greeting: 100, intro: 300, body: 1500 };
const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

// «9 сарын 12-нд»
const dayText = s => {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(s || ''));
  return m ? `${+m[2]} сарын ${+m[3]}-нд` : '';
};
// Нэр нь цэвэр кирилл хүний нэр бол л нэрээр нь мэндэлнэ. «Баянжаргал v», «H&A Travel»,
// байгууллага, хоосон бол нэргүй (буруу бичигдсэн нэрийг хэнд ч харуулахгүй).
const cleanName = s => {
  s = String(s || '').trim();
  if (!s || s.length > 30) return '';
  if (!/^[А-ЯӨҮЁа-яөүё][А-ЯӨҮЁа-яөүё.\- ]*$/.test(s)) return '';
  if (s.split(/\s+/).length > 3) return '';
  if (/(^|\s)(хк|ххк|хххк|компани|групп|холбоо|төв|сан)(\s|$)/i.test(s)) return '';
  return s;
};
// Бичвэр: хязгаар, танихгүй {…} үлдээхгүй (хүнд буруу placeholder харагдахгүй)
const clip = (s, n) => String(s == null ? '' : s).replace(/\r/g, '').slice(0, n);
const strip = s => s.replace(/\{[^{}]*\}/g, '').replace(/[ \t]{2,}/g, ' ').trim();

return $input.all().map((it, i) => {
  const r = it.json || {};
  const test = r.mode === 'test';
  const real = String(r.email || '').trim().toLowerCase();
  const to = test ? String(r.test_to || '').trim().toLowerCase() : real;
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(to) || !r.order_id) return null;

  // Бичвэр аппаас ирнэ. Байхгүй/эвдэрсэн бол ЯВУУЛАХГҮЙ (буруу бичвэрээр илгээхээс дээр).
  let T = null;
  try { T = JSON.parse(r.txt || 'null'); } catch (e) { T = null; }
  if (!T || !String(T.subject || '').trim() || !String(T.heading || '').trim() || !String(T.body || '').trim()) return null;

  let items = [];
  try { items = JSON.parse(r.items || '[]'); } catch (e) { items = []; }
  const seen = new Set();
  const names = (Array.isArray(items) ? items : []).map(x => String((x && x.name) || '').trim())
    .filter(n => n && !seen.has(n) && seen.add(n)).slice(0, 4);
  const when = dayText(r.starts_at);
  const nm = cleanName(r.customer);
  const paras = (txt, n) => clip(txt, n).split('\n').map(x => x.trim()).filter(x => x && (!x.includes('{огноо}') || when))
    .map(x => strip(x.split('{огноо}').join(when))).filter(Boolean);

  const subject = strip(clip(T.subject, LIM.subject).split('\n')[0]);
  const heading = strip(clip(T.heading, LIM.heading).split('\n')[0]);
  const g = clip(T.greeting, LIM.greeting).split('\n')[0].trim() || 'Сайн байна уу, {нэр}.';
  const greeting = strip(nm ? g.split('{нэр}').join(nm) : g.replace(/[,\s]*\{нэр\}/g, '').replace(/\s+([.!?])/g, '$1'));
  const intro = paras(T.intro, LIM.intro);
  const body = paras(T.body, LIM.body);
  if (!subject || !heading || !body.length) return null;

  // Хасуулах холбоос: тест үед жинхэнэ харилцагчийг хасуулахгүйн тулд тест хаягаар
  const unsub = OPTOUT + '?e=' + encodeURIComponent(to);
  const P = (t, mb) => `<p style="margin:0 0 ${mb}px;font-size:15px;line-height:1.6;">${esc(t)}</p>`;

  const prev = names.length ? `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;background:${C.cream};border:1px solid ${C.line};border-radius:12px;margin:0 0 18px;">
      <tr><td style="padding:14px 16px;">
        <div style="font-size:11px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:${C.muted};padding:0 0 6px;">Өмнөх захиалга №${esc(r.number)}</div>
        <div style="font-size:14px;line-height:1.6;color:${C.text};">${names.map(esc).join(', ')}</div>
      </td></tr>
    </table>` : '';

  const banner = test ? `<div style="background:#FFF3CD;border:1px solid #F0D58A;border-radius:10px;padding:10px 14px;margin:0 0 16px;font-size:13px;color:#7A5B00;">
      ТЕСТ имэйл. Жинхэнэ үед энэ нь ${esc(real || 'харилцагчийн хаяг')} руу, ${esc(String(r.customer || ''))} гэсэн нэртэйгээр явна. Энэ тестээс хасуулах холбоос бүртгэл үүсгэх боломжтой тул дарахгүй байхыг хүснэ.
    </div>` : '';

  const html = `<div style="background:#F4F2ED;padding:24px 12px;">
<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;max-width:560px;margin:0 auto;background:#fff;border-radius:16px;padding:26px 24px 22px;color:${C.text};">

  <div style="font-weight:800;font-size:18px;letter-spacing:.04em;color:${C.navy};padding:0 0 18px;">M<span style="color:${C.orange};">·</span>EVENT</div>
  ${banner}
  <div style="font-size:22px;font-weight:800;letter-spacing:-.01em;padding:0 0 14px;line-height:1.3;">${esc(heading)}</div>

  ${P(greeting, 10)}
  ${intro.map((t, k) => P(t, k === intro.length - 1 ? 18 : 10)).join('\n  ')}

  ${prev}

  ${body.map((t, k) => P(t, k === body.length - 1 ? 20 : 10)).join('\n  ')}

  <div style="text-align:center;margin:0 0 6px;">
    <a href="tel:+97677551010" style="display:inline-block;background:${C.orange};color:#fff;text-decoration:none;padding:13px 28px;border-radius:10px;font-weight:700;font-size:15px;">📞 7755-1010 руу залгах</a>
    <p style="margin:12px 0 0;font-size:13px;color:${C.muted};">эсвэл <a href="https://mevent.mn" style="color:${C.navy};">mevent.mn</a> дээрээс барааг харна уу</p>
  </div>

  <p style="margin:22px 0 0;padding:14px 0 0;border-top:1px solid ${C.line};font-size:12px;line-height:1.6;color:${C.muted};">M-Event · mevent.mn · hello@mevent.mn<br>
    Энэ сануулгыг дахин авахыг хүсэхгүй бол <a href="${unsub}" style="color:${C.muted};">энд дарна уу</a>.</p>
</div></div>`;

  return { json: {
    order_id: String(r.order_id), to, test,
    subject: (test ? '[ТЕСТ] ' : '') + subject,
    html,
  }, pairedItem: { item: i } };
}).filter(Boolean);
