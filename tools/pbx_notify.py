#!/usr/bin/env python3
"""
pbx_notify.py — «Өчигдөр хэдэн хүн холбогдож чадаагүй вэ» гэдгийг өглөө бүр
утсанд нь мэдэгддэг.

ЯАГААД: 8 сард ажлын цагаар 466 дуудлагын 221-г л хүн авсан (47%), 139 хүн
хүлээгээд буцаж залгуулаагүй — буцаж залгасан нь **0**. Аппын 📵 дэлгэц
дарааллыг аль хэдийн хэлж өгдөг ч хэн ч нээхээ санадаггүй байв. Энэ скрипт
ажлыг «санаж нээх»-ээс «өөрөө ирдэг» болгоно.

Ажиллах: VPS cron, өглөө 09:10 (дуудлагын татагч өмнөх өдрийн 21:05 хүртэл
татаж дуусгасан байна).

⛔ ХООСОН ӨДӨР МЭДЭГДЭЛ ИЛГЭЭХГҮЙ. Өдөр бүр дуугардаг мэдэгдлийг хүн 3 хоногт
   дуугүй болгодог — тэгвэл жинхэнэ өдөр нь ч хүрэхгүй.
⛔ `email` шүүлтгүй илгээж БОЛОХГҮЙ. push-broadcast нь шүүлт хоосон үед
   бүртгэлтэй 50 ажилтан БҮГДЭД нь илгээдэг.
⚠ Хүлээн авагч нь `app_config['pbx_notify']` → `{"to": ["99112233", …]}`.
  Кодод хатуу бичихгүй — утас солигдоход код засахгүйн тулд.

Тест: python3 tools/pbx_notify.py --selftest   (test/run.js дууддаг)
Хуурай: python3 tools/pbx_notify.py --dry      (тоог хэлнэ, push илгээхгүй)
"""
import json
import subprocess
import sys
import urllib.error
import urllib.request
from datetime import datetime, timedelta, timezone

ENV = '/opt/chimun/marketing/fb.env'
CONTAINER = 'vps-deploy-postgres-1'
PUSH_URL = 'https://n8n.nomaadcamp.com/webhook/push-broadcast'
UB = timezone(timedelta(hours=8))

# ⚠ app.js-ийн `PBX_WAIT_SEC`-тэй ИЖИЛ байх ёстой — test/run.js хоёрыг тулгана.
#   Үүнээс богино тасалсан нь лид БИШ (CEO, 2026-09-16).
PBX_WAIT_SEC = 13
# Дотоод/богино дугаар — хүн биш.
MIN_PEER_LEN = 6
# Мэдэгдэлд хэдэн дугаар багтаах вэ (мэдэгдлийн мөр богино байх ёстой).
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
    # ⛔ `.strip()` нь `\x1f`-ийг ЧУ ХАСДАГ (Python-д тэр нь «зай» гэж тооцогддог) —
    #    сүүлийн багана ХООСОН байхад тусгаарлагч нь идэгдэж мөр нэг талбараар
    #    дутуу задардаг. Амьд системд яг ингэж «хүсэлт алга» гэж худал гарсан.
    return [r.split('\x1f') for r in p.stdout.strip('\n').split('\n') if r.strip()]


# ── Цэвэр функцууд (тестлэгдэнэ) ────────────────────────────────────────────
def work_hours(tariffs):
    """Ажлын цаг = app_config['tariffs']. Уншигдахгүй бол 9–18.
    ⚠ Дэлгэцэд ч, энд ч хатуу бичихгүй — тариф нэг эх сурвалж."""
    ws, we = 9, 18
    try:
        v = tariffs or {}
        if isinstance(v.get('work_start'), (int, float)) and 0 <= v['work_start'] <= 23:
            ws = int(v['work_start'])
        if isinstance(v.get('work_end'), (int, float)) and 0 <= v['work_end'] <= 23:
            we = int(v['work_end'])
    except Exception:
        pass
    return ws, we


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


def mask(peer):
    """Дугаарыг бүтнээр нь харуулна — буцаж залгахад хэрэгтэй. Зөвхөн
    хэлбэржүүлнэ (8 орон бол 4+4)."""
    d = ''.join(ch for ch in str(peer) if ch.isdigit())
    return d[:4] + '-' + d[4:] if len(d) == 8 else (d or str(peer))


def compose(n, peers, day):
    """Мэдэгдлийн гарчиг/бие. n = 0 бол None → ЮУ Ч ИЛГЭЭХГҮЙ."""
    if not n:
        return None
    head = f'📵 Өчигдөр {n} хүн холбогдож чадаагүй'
    nums = ', '.join(mask(p) for p in (peers or [])[:SHOW_N])
    more = f' +{n - SHOW_N}' if n > SHOW_N else ''
    tail = f'{nums}{more} · буцаж залга' if nums else 'Аппын 📵 дэлгэцээс хараарай'
    return {'kind': 'pbx', 'title': head, 'body': tail, 'url': './'}


# ── Датанаас уншина ─────────────────────────────────────────────────────────
def cfg_json(key):
    rows = psql(f"select value from app_config where key = '{key}'")
    if not rows or not rows[0] or not rows[0][0]:
        return {}
    try:
        return json.loads(rows[0][0])
    except Exception:
        return {}


def missed(day, ws, we):
    """Тухайн өдөр ажлын цагаар залгаад ХҮН аваагүй, PBX_WAIT_SEC-ээс удаан
    хүлээсэн хүмүүс. app.js-ийн `pbxFollowups`-тай ижил дүрэм — гэхдээ энд
    ЗӨВХӨН нэг өдрийн шинэ тохиолдол (буцаж залгасан эсэх нь аппын хэрэг)."""
    sql = f"""
      with c as (
        select peer,
               max(call_sec) as maxsec,
               sum(case when answer_sec > 0 then 1 else 0 end) as answered,
               max(started_at) as last_at
        from pbx_calls
        where direction = 'in'
          and length(peer) >= {MIN_PEER_LEN}
          and (started_at at time zone 'Asia/Ulaanbaatar')::date = date '{day}'
          and extract(hour from (started_at at time zone 'Asia/Ulaanbaatar'))
              between {ws} and {we}
        group by peer
      )
      select peer from c
      where answered = 0 and maxsec >= {PBX_WAIT_SEC}
      order by last_at desc
    """
    return [r[0] for r in psql(sql) if r and r[0]]


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

    eq('ажлын цаг өгөгдмөл', work_hours({}), (9, 18))
    eq('ажлын цаг тарифаас', work_hours({'work_start': 10, 'work_end': 20}), (10, 20))
    eq('буруу цагийг үл тоох', work_hours({'work_start': 99}), (9, 18))

    eq('хүлээн авагч цифрлэнэ', recipients({'to': ['9911-2233', '88445566']}),
       ['99112233', '88445566'])
    eq('богино дугаар хасагдана', recipients({'to': ['123']}), [])
    eq('хоосон тохиргоо', recipients({}), [])
    eq('давхардал хасагдана', recipients({'to': ['99112233', '99112233']}), ['99112233'])

    eq('дугаар хэлбэржинэ', mask('99112233'), '9911-2233')

    # ⛔ Хоосон өдөр мэдэгдэл БАЙХГҮЙ.
    eq('0 бол илгээхгүй', compose(0, [], '2026-09-16'), None)

    m = compose(3, ['99112233', '88445566', '90112233'], '2026-09-16')
    eq('гарчигт тоо орно', '3 хүн' in (m or {}).get('title', ''), True)
    eq('биед дугаар орно', '9911-2233' in (m or {}).get('body', ''), True)

    m5 = compose(5, ['99112233', '88445566', '90112233', '80112233', '70112233'], '2026-09-16')
    eq('илүүг +N гэж хураана', '+2' in (m5 or {}).get('body', ''), True)

    if f:
        print('❌ PBX NOTIFY FAIL')
        for x in f:
            print('   ·', x)
        raise SystemExit(1)
    print('✅ PBX NOTIFY OK — 11 тест')


def main():
    if '--selftest' in sys.argv:
        return selftest()

    env = load_env(ENV)
    secret = env.get('PUSH_INTERNAL_KEY', '')
    ws, we = work_hours(cfg_json('tariffs'))
    to = recipients(cfg_json('pbx_notify'))
    day = (datetime.now(UB) - timedelta(days=1)).date().isoformat()

    peers = missed(day, ws, we)
    msg = compose(len(peers), peers, day)
    if not msg:
        print(f'{day}: алдсан дуудлага алга — мэдэгдэл илгээсэнгүй')
        return
    if not to:
        print(f'{day}: {len(peers)} алдсан — ХҮЛЭЭН АВАГЧ ТОХИРУУЛААГҮЙ '
              "(app_config['pbx_notify'] → {\"to\":[\"утас\"]})")
        return
    if DRY or not secret:
        print(f'{day}: {len(peers)} алдсан → {to} | {msg["title"]} / {msg["body"]}'
              + ('' if secret else ' | ⚠ PUSH_INTERNAL_KEY алга'))
        return

    okc = 0
    for phone in to:
        try:
            push(secret, phone, msg)
            okc += 1
        except urllib.error.URLError as e:
            print(f'  ⚠ {phone}: {e}')
    print(f'{day}: {len(peers)} алдсан → {okc}/{len(to)} хүнд илгээв')


if __name__ == '__main__':
    main()
