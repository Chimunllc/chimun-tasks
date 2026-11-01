#!/usr/bin/env python3
"""
maestro_notify.py — maestro сайтаас ШИНЭ хүсэлт ирмэгц хариуцсан хүмүүсийн утсанд push явуулна.

ЯАГААД: хүсэлт `maestro_leads`-д орсон ч Катеринг → «📨 Хүсэлт»-ийг хэн ч нээхгүй бол
үйлчлүүлэгч хариугүй хүлээнэ. Хариу өгөх хугацаа = борлуулалт: нэг минутын дотор мэддэг болно.

Ажиллах: VPS cron, МИНУТ бүр (flock-той). Хүсэлт БАЙХГҮЙ үед юу ч хэвлэхгүй, юу ч илгээхгүй.

⛔ Давхар мэдэгдэл БАЙХГҮЙ: хүсэлт бүр `notified_at is null` үед л орно, push АМЖИЛТТАЙ
   явсны ДАРАА л `notified_at` бичигдэнэ. Push унавал дараагийн минутад дахин оролдоно.
⛔ ЗӨВХӨН `status = 'new'`: preview-ээс ирсэн «test», аль хэдийн холбогдсон/спам хүсэлт мэдэгдэхгүй.
⛔ Хуучин хүсэлт мэдэгдэхгүй: зөвхөн сүүлийн WINDOW_H цагийн. (Хүлээн авагч тохируулаагүй байсан
   хугацааны өрийг нэг дор буулгаж, шөнө дундын мэдэгдлийн «үер» үүсгэхгүй.)
⛔ `email` шүүлтгүй илгээж БОЛОХГҮЙ — push-broadcast шүүлт хоосон үед бүртгэлтэй БҮХ ажилтанд илгээдэг.
⚠ Минутад хэдэн хүсэлт ирсэн ч хүн бүрт НЭГ мэдэгдэл (нэгтгэнэ).
⚠ Хүлээн авагч = `app_config['maestro_notify']` → {"to": ["утас", …]}; байхгүй бол `pbx_notify`-гийнх.
  Кодод утас хатуу бичихгүй. Нууц түлхүүр VPS-ийн fb.env-д (репод БАЙХГҮЙ).
⚠ Хүсэлтийн нэр/газар = нийтийн сайтаас ирсэн ЗЭРЭМДЭГ бичвэр: push нь энгийн текст ч урт/хяналтын
  тэмдэгтээс цэвэрлэнэ.

Тест: python3 tools/maestro_notify.py --selftest   (test/run.js дууддаг)
Хуурай: python3 tools/maestro_notify.py --dry      (юу илгээхийг хэлнэ, push илгээхгүй, тэмдэглэхгүй)
"""
import json
import re
import subprocess
import sys
import urllib.error
import urllib.request

ENV = '/opt/chimun/marketing/fb.env'
CONTAINER = 'vps-deploy-postgres-1'
PUSH_URL = 'https://n8n.nomaadcamp.com/webhook/push-broadcast'
# Хэдэн цагийн дотор ирсэн хүсэлтийг л мэдэгдэх вэ (cron удаан зогссон/тохиргоо хоцорсон үеийн үер).
WINDOW_H = 6
# Нэгтгэсэн мэдэгдэлд хэдэн хүний нэр багтаах вэ.
SHOW_N = 3

DRY = '--dry' in sys.argv


def load_env(path):
    out = {}
    try:
        with open(path) as f:
            for ln in f:
                ln = ln.strip()
                if not ln or ln.startswith('#') or '=' not in ln:
                    continue
                k, v = ln.split('=', 1)
                out[k.strip()] = v.strip().strip('"').strip("'")
    except FileNotFoundError:
        pass
    return out


def psql(sql):
    p = subprocess.run(['docker', 'exec', '-i', CONTAINER, 'psql', '-U', 'chimun',
                        '-d', 'chimun', '-t', '-A', '-F', '\x1f', '-v', 'ON_ERROR_STOP=1', '-c', sql],
                       capture_output=True, text=True)
    if p.returncode:
        raise SystemExit('psql: ' + p.stderr.strip())
    # ⛔ `.strip()` нь `\x1f`-ийг ЧУ ХАСДАГ (Python-д тэр нь «зай») — зөвхөн мөр таслалтыг хас.
    return [r.split('\x1f') for r in p.stdout.strip('\n').split('\n') if r.strip()]


# ── Цэвэр функцууд (тестлэгдэнэ) ──────────────────────────────────────────
def recipients(cfg):
    """Хүлээн авагчид. Буруу/хоосон утгаас болж БҮГДЭД илгээхээс сэргийлж
    зөвхөн цифэрлэг дугаарыг үлдээнэ."""
    out = []
    try:
        for v in (cfg or {}).get('to') or []:
            d = ''.join(ch for ch in str(v) if ch.isdigit())
            if len(d) >= 6 and d not in out:
                out.append(d)
    except Exception:
        pass
    return out


def clean(s, n):
    """Нийтийн сайтаас ирсэн бичвэрийг мэдэгдэлд тохирох болгоно: хяналтын тэмдэгт/мөр таслалтыг
    зайгаар солиод, давхар зайг нэгтгэж, n тэмдэгтэд тайрна."""
    t = re.sub(r'[\x00-\x1f\x7f]+', ' ', str(s or ''))
    t = re.sub(r'\s+', ' ', t).strip()
    return t if len(t) <= n else t[:max(0, n - 1)].rstrip() + '…'


def fmt_phone(p):
    d = ''.join(ch for ch in str(p or '') if ch.isdigit())
    return d[:4] + '-' + d[4:] if len(d) == 8 else (str(p or '').strip() or '')


def md(day):
    """2026-12-01 → 12/01 (огноо байхгүй бол хоосон)."""
    m = re.match(r'^\d{4}-(\d{2})-(\d{2})', str(day or ''))
    return f'{m.group(1)}/{m.group(2)}' if m else ''


def compose(leads):
    """leads = [{id, ref, name, phone, line, package, date, guests}]. Хоосон бол None → ЮУ Ч ИЛГЭЭХГҮЙ."""
    n = len(leads or [])
    if not n:
        return None
    if n == 1:
        l = leads[0]
        what = ' · '.join(x for x in [clean(l.get('line'), 30), clean(l.get('package'), 40)] if x)
        guests = str(l.get('guests') or '').strip()
        bits = [what, f'{guests} хүн' if guests.isdigit() and int(guests) > 0 else '', md(l.get('date')), fmt_phone(l.get('phone'))]
        return {'kind': 'leads', 'title': f'📨 Шинэ хүсэлт {clean(l.get("ref"), 12)} · {clean(l.get("name"), 30)}',
                'body': ' · '.join(b for b in bits if b), 'url': './#leads'}
    names = ', '.join(f'{clean(l.get("name"), 18)} {fmt_phone(l.get("phone"))}'.strip() for l in leads[:SHOW_N])
    more = f' +{n - SHOW_N}' if n > SHOW_N else ''
    return {'kind': 'leads', 'title': f'📨 {n} шинэ хүсэлт', 'body': f'{names}{more}', 'url': './#leads'}


def id_list(leads):
    """SQL-д орох id-ууд ЗӨВХӨН бүхэл тоо (DB-ээс ирсэн ч string угсрахдаа баталгаажуулна)."""
    out = []
    for l in leads or []:
        try:
            out.append(int(l.get('id')))
        except (TypeError, ValueError):
            pass
    return out


# ── Датанаас уншина ──────────────────────────────────────────────────────
def cfg_json(key):
    if not re.fullmatch(r'[a-z_]+', key):
        return {}
    rows = psql(f"select value from app_config where key = '{key}'")
    if not rows or not rows[0] or not rows[0][0]:
        return {}
    try:
        return json.loads(rows[0][0])
    except Exception:
        return {}


def fresh_leads():
    """Мэдэгдээгүй ШИНЭ хүсэлтүүд (хуучнаасаа эхлээд)."""
    rows = psql(f"""
      select id, ref, name, phone, line_name, package_name, coalesce(event_date::text, ''), coalesce(guests::text, '')
      from maestro_leads
      where status = 'new' and notified_at is null
        and created_at > now() - interval '{int(WINDOW_H)} hours'
      order by id
    """)
    keys = ['id', 'ref', 'name', 'phone', 'line', 'package', 'date', 'guests']
    return [dict(zip(keys, r)) for r in rows if len(r) == len(keys)]


def mark_notified(ids):
    ids = [int(i) for i in ids]
    if not ids:
        return
    psql('update maestro_leads set notified_at = now() where notified_at is null and id in ('
         + ','.join(str(i) for i in ids) + ')')


def push(secret, phone, payload):
    body = dict(payload)
    body['internal'] = secret
    body['email'] = phone          # ⛔ хоосон бол БҮГДЭД илгээнэ — үргэлж заана
    req = urllib.request.Request(
        PUSH_URL, data=json.dumps(body).encode(),
        headers={'Content-Type': 'application/json'}, method='POST')
    with urllib.request.urlopen(req, timeout=30) as r:
        return r.status


def selftest():
    f = []

    def eq(name, got, want):
        if got != want:
            f.append(f'{name}: хүлээсэн {want!r}, ирсэн {got!r}')

    eq('хүлээн авагч цифрлэнэ', recipients({'to': ['9911-2233', '88445566']}), ['99112233', '88445566'])
    eq('богино дугаар хасагдана', recipients({'to': ['123']}), [])
    eq('хоосон тохиргоо', recipients({}), [])
    eq('тохиргоо байхгүй', recipients(None), [])
    eq('давхардал хасагдана', recipients({'to': ['99112233', '99112233']}), ['99112233'])

    eq('цэвэрлэх: мөр таслалт, хяналтын тэмдэгт', clean('a\nb\x07c\t d', 20), 'a b c d')
    eq('цэвэрлэх: урт тайрна', clean('x' * 50, 10), 'x' * 9 + '…')
    eq('цэвэрлэх: хоосон', clean(None, 10), '')
    eq('утас хэлбэржинэ', fmt_phone('99112233'), '9911-2233')
    eq('гадаад дугаар хэвээр', fmt_phone('+14155552671'), '+14155552671')
    eq('огноо MM/DD', md('2026-12-01'), '12/01')
    eq('огноогүй', md(''), '')

    # ⛔ Хүсэлтгүй бол мэдэгдэл БАЙХГҮЙ.
    eq('0 бол илгээхгүй', compose([]), None)
    eq('None бол илгээхгүй', compose(None), None)

    one = compose([{'id': 7, 'ref': 'MC-0007', 'name': 'Бат', 'phone': '99112233', 'line': 'Байгууллагын катеринг',
                    'package': 'Бизнес үдийн зоог', 'date': '2026-12-01', 'guests': '40'}])
    eq('нэг хүсэлт: гарчиг', one['title'], '📨 Шинэ хүсэлт MC-0007 · Бат')
    eq('нэг хүсэлт: бие', one['body'], 'Байгууллагын катеринг · Бизнес үдийн зоог · 40 хүн · 12/01 · 9911-2233')
    eq('нэг хүсэлт: холбоос нь хүсэлтийн таб', one['url'], './#leads')
    eq('нэг хүсэлт: төрөл', one['kind'], 'leads')

    sparse = compose([{'id': 8, 'ref': 'MC-0008', 'name': 'Сараа', 'phone': '88112233', 'line': '', 'package': '', 'date': '', 'guests': ''}])
    eq('цөөн талбартай: утас л үлдэнэ', sparse['body'], '8811-2233')

    evil = compose([{'id': 9, 'ref': 'MC-0009', 'name': 'А\nБ' + 'х' * 80, 'phone': '99112233', 'line': 'x\ry', 'package': '', 'date': '', 'guests': '0'}])
    ok_ = '\n' not in evil['title'] and '\n' not in evil['body'] and '\r' not in evil['body'] and len(evil['title']) < 80
    eq('зэрэмдэг нэр: нэг мөр, урт нь хязгаарлагдсан', ok_, True)
    eq('0 хүн харуулахгүй', 'хүн' in evil['body'], False)

    many = compose([{'id': i, 'ref': f'MC-{i:04d}', 'name': f'Х{i}', 'phone': '99112233', 'line': '', 'package': '', 'date': '', 'guests': ''} for i in range(1, 6)])
    eq('олон хүсэлт: НЭГ мэдэгдэл', many['title'], '📨 5 шинэ хүсэлт')
    eq('олон хүсэлт: илүүг +N гэж хураана', many['body'].endswith('+2'), True)
    eq('олон хүсэлт: SHOW_N нэр', many['body'].count('9911-2233'), SHOW_N)

    eq('id: зөвхөн бүхэл', id_list([{'id': '5'}, {'id': 6}, {'id': '1; drop table x'}, {'id': None}]), [5, 6])

    if f:
        print('❌ MAESTRO NOTIFY FAIL')
        for x in f:
            print('   ·', x)
        raise SystemExit(1)
    print('✅ MAESTRO NOTIFY OK — 25 тест')


def main():
    if '--selftest' in sys.argv:
        return selftest()

    env = load_env(ENV)
    secret = env.get('PUSH_INTERNAL_KEY', '')
    leads = fresh_leads()
    msg = compose(leads)
    if not msg:
        return                     # шинэ хүсэлт алга — минут бүр дуугүй
    to = recipients(cfg_json('maestro_notify')) or recipients(cfg_json('pbx_notify'))
    if not to:
        print(f'{len(leads)} шинэ хүсэлт — ХҮЛЭЭН АВАГЧ ТОХИРУУЛААГҮЙ '
              "(app_config['maestro_notify'] → {\"to\":[\"утас\"]})")
        return
    if DRY or not secret:
        print(f'{len(leads)} шинэ хүсэлт → {to} | {msg["title"]} / {msg["body"]}'
              + ('' if secret else ' | ⚠ PUSH_INTERNAL_KEY алга'))
        return

    okc = 0
    for phone in to:
        try:
            push(secret, phone, msg)
            okc += 1
        except (urllib.error.URLError, OSError) as e:
            print(f'  ⚠ {phone}: {e}')
    if okc:
        mark_notified(id_list(leads))      # ⛔ зөвхөн push АМЖИЛТТАЙ явсны дараа
    print(f'{len(leads)} шинэ хүсэлт → {okc}/{len(to)} хүнд илгээв' + ('' if okc else ' — тэмдэглээгүй, дахин оролдоно'))


if __name__ == '__main__':
    main()
