#!/usr/bin/env python3
"""
night_notify.py — «Шөнө агент юу хийсэн бэ» гэдгийг өглөө бүр утсанд мэдэгдэнэ.

ЯАГААД: шөнийн агент 02:00-д ажиллаж, алдаа зассан PR-аа өөрөө merge хийдэг
болсон (agent-night.yml). Үр дүн нь GitHub Issue-д нэг мөр болж үлддэг ч
хэн ч тэр линкийг өглөө бүр нээхээ санахгүй. Ажил «санаж нээх»-ээс «өөрөө
ирдэг» болгоно — pbx_notify.py-тай ижил зарчим.

Ажиллах: VPS cron, өглөө 09:15 (pbx_notify 09:10-ын дараа).

⛔ ЮУ Ч БОЛООГҮЙ БОЛ ИЛГЭЭХГҮЙ. Шөнө ажил гараагүй БА хүн шийдэх алдаа
   байхгүй бол чимээгүй. Өдөр бүр дуугардаг мэдэгдлийг хүн 3 хоногт унтраадаг.
⛔ `email` шүүлтгүй илгээж БОЛОХГҮЙ — push-broadcast нь шүүлт хоосон үед
   бүртгэлтэй БҮХ ажилтанд илгээнэ.
⚠ Хүлээн авагч = `app_config['night_notify']` → `{"to": ["99112233", …]}`.
  Тохируулаагүй бол `pbx_notify`-гийнхыг ашиглана (нэг хүн хоёр газар бичихгүй).
⚠ GitHub-аас токенгүй уншина — репо НИЙТИЙН. Тиймээс VPS дээр GitHub-ийн
  нууц хадгалах шаардлагагүй.

Тест: python3 tools/night_notify.py --selftest   (test/run.js дууддаг)
Хуурай: python3 tools/night_notify.py --dry      (мессежийг хэлнэ, илгээхгүй)
"""
import json
import re
import subprocess
import sys
import urllib.error
import urllib.parse
import urllib.request
from datetime import datetime, timedelta, timezone

ENV = '/opt/chimun/marketing/fb.env'
CONTAINER = 'vps-deploy-postgres-1'
PUSH_URL = 'https://n8n.nomaadcamp.com/webhook/push-broadcast'
REPO = 'Chimunllc/chimun-tasks'
GH_API = 'https://api.github.com'
UB = timezone(timedelta(hours=8))

# Шөнийн агентын түүхийн Issue-г шошгоор олно (дугаар нь хожим өөрчлөгдөж болно).
HIST_LABEL = 'шөнийн-агент'
ERR_LABEL = 'алдаа'

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
    # ⛔ `.strip()` нь `\x1f`-ийг хасдаг тул зөвхөн мөрийн төгсгөлийг тайрна.
    return [r.split('\x1f') for r in p.stdout.strip('\n').split('\n') if r.strip()]


# ── Цэвэр функцууд (тестлэгдэнэ) ────────────────────────────────────────────
def recipients(cfg, fallback=None):
    """Хүлээн авагчид. Буруу/хоосон утгаас болж БҮГДЭД илгээхээс сэргийлж
    зөвхөн цифэрлэг дугаарыг үлдээнэ. Тохируулаагүй бол нөөц жагсаалт."""
    out = []
    for src in (cfg, fallback):
        try:
            for v in (src or {}).get('to') or []:
                d = ''.join(ch for ch in str(v) if ch.isdigit())
                if len(d) >= 6 and d not in out:
                    out.append(d)
        except Exception:
            pass
        if out:
            break
    return out


def parse_summary(body):
    """Шөнийн агентын нэг мөрийг задлана → {day, ok, text}.
    Хэлбэр: `**2026-09-18** · ✅ ... ` / `· ❌ Унасан ...` / ажил байхгүй.
    ⚠ Огноогүй мөр НАЙДВАРГҮЙ — None буцаана (хуучин мөрийг өнөөдрийнх гэж
      андуурвал «шөнө ажилласан» гэсэн худал мэдэгдэл явна)."""
    t = str(body or '').strip()
    m = re.search(r'\*\*(\d{4}-\d{2}-\d{2})\*\*', t)
    if not m:
        return None
    day = m.group(1)
    rest = t[m.end():].lstrip(' ·').strip()
    return {'day': day, 'ok': '✅' in t, 'fail': '❌' in t, 'text': rest}


def short(text, n=110):
    """Мэдэгдлийн бие богино байх ёстой — утасны дэлгэц нэг мөр л харуулна."""
    t = ' '.join(str(text or '').split())
    t = re.sub(r'[`*]', '', t)
    return t if len(t) <= n else t[:n - 1].rstrip() + '…'


def compose(summary, today, open_errors):
    """Мэдэгдэл. Шөнө юу ч болоогүй БА хүлээгдэж буй алдаа байхгүй бол None.

    ⛔ Өчигдрийн мөрийг дахин илгээхгүй — `summary.day` нь ӨНӨӨДӨР байх ёстой.
       Эс бөгөөс агент ажиллаагүй өдөр бүр хуучин үр дүн дахин дуугарна."""
    fresh = bool(summary) and summary.get('day') == today
    waiting = f'{open_errors} алдаа хүнд үлдэв' if open_errors else ''

    if fresh and summary.get('ok'):
        title = '🌙 Шөнө засвар хийгдлээ'
        body = short(summary.get('text'))
    elif fresh and summary.get('fail'):
        title = '🌙 Шөнийн агент унав'
        body = short(summary.get('text')) or 'Логоос шалтгааныг хараарай.'
    elif waiting:
        title = f'⚠ {open_errors} алдаа хүлээж байна'
        body = 'Агент засаж чадаагүй — өөрөө шийднэ үү.'
    else:
        return None

    if waiting and 'алдаа хүлээж' not in title:
        body = (body + ' · ' if body else '') + waiting
    return {'kind': 'night', 'title': title, 'body': body, 'url': './'}


# ── GitHub (токенгүй, репо нийтийн) ─────────────────────────────────────────
def gh(path):
    req = urllib.request.Request(GH_API + path,
                                 headers={'Accept': 'application/vnd.github+json',
                                          'User-Agent': 'chimun-night-notify'})
    with urllib.request.urlopen(req, timeout=30) as r:
        return json.loads(r.read().decode())


def merge_summaries(rows):
    """Нэг шөнийн ОЛОН мөрийг нэг болгоно.

    ⛔ СҮҮЛИЙН МӨРИЙГ ГАНЦААР АВЧ БОЛОХГҮЙ (2026-09-24). Шөнө хоёр зам
       (алдаа · өр) ЗЭРЭГ явдаг тул сэтгэгдэл 2 болсон. Аль нь сүүлд
       бичигдэх нь санамсаргүй — «өр зассан» мөр «алдаа засаагүй» мөрөөр
       дарагдвал утсанд ажил хийгдээгүй мэт мэдэгдэнэ.
    Хамгийн сүүлийн ӨДРИЙН бүх мөрийг нэгтгэнэ: аль нэг нь амжилттай бол
    амжилттай, аль нэг нь унасан бол унасан гэж тэмдэглэнэ."""
    rows = [r for r in rows if r]
    if not rows:
        return None
    day = rows[-1]['day']
    same = [r for r in rows if r['day'] == day]
    return {
        'day': day,
        'ok': any(r.get('ok') for r in same),
        'fail': any(r.get('fail') for r in same),
        'text': ' · '.join(r['text'] for r in same if r.get('text')),
    }


def last_summary():
    """Түүхийн Issue-ийн ХАМГИЙН СҮҮЛИЙН ӨДРИЙН бүх мөр. Байхгүй бол None."""
    issues = gh(f'/repos/{REPO}/issues?labels={urllib.parse.quote(HIST_LABEL)}&state=open&per_page=1')
    if not issues:
        return None
    num = issues[0]['number']
    # Сүүлийн хуудсыг шууд авах арга байхгүй тул эрэмбийг эргүүлж 1 л мөр авна.
    cs = gh(f'/repos/{REPO}/issues/{num}/comments?per_page=100')
    if not cs:
        return parse_summary(issues[0].get('body'))
    return merge_summaries([parse_summary(c.get('body')) for c in cs[-6:]])


def open_error_count():
    rows = gh(f'/repos/{REPO}/issues?labels={urllib.parse.quote(ERR_LABEL)}&state=open&per_page=100')
    # ⚠ PR нь ч «issue» болж ирдэг — тэднийг хасна.
    return len([r for r in rows if 'pull_request' not in r])


def cfg_json(key):
    rows = psql(f"select value from app_config where key = '{key}'")
    if not rows or not rows[0] or not rows[0][0]:
        return {}
    try:
        return json.loads(rows[0][0])
    except Exception:
        return {}


def push(secret, phone, body):
    body = dict(body)
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

    eq('хүлээн авагч цифрлэнэ', recipients({'to': ['9911-2233', '88445566']}),
       ['99112233', '88445566'])
    eq('богино дугаар хасагдана', recipients({'to': ['123']}), [])
    eq('давхардал хасагдана', recipients({'to': ['99112233', '99112233']}), ['99112233'])
    eq('нөөц жагсаалт', recipients({}, {'to': ['99112233']}), ['99112233'])
    eq('үндсэн нь давуу', recipients({'to': ['88445566']}, {'to': ['99112233']}), ['88445566'])

    s = parse_summary('**2026-09-18** · ✅ `foo` — 3→1 · PR #12 · merge хийгдсэн')
    eq('огноо уншигдана', (s or {}).get('day'), '2026-09-18')
    eq('амжилт танигдана', (s or {}).get('ok'), True)
    eq('огноогүй мөр найдваргүй', parse_summary('ямар нэг текст'), None)
    eq('унасныг таьна', parse_summary('**2026-09-18** · ❌ Унасан (бай: x)').get('fail'), True)

    # ⛔ Юу ч болоогүй бол мэдэгдэл БАЙХГҮЙ.
    eq('хоосон бол илгээхгүй', compose(None, '2026-09-18', 0), None)
    eq('зөвхөн хуучин мөр бол илгээхгүй',
       compose({'day': '2026-09-17', 'ok': True, 'text': 'x'}, '2026-09-18', 0), None)

    m = compose({'day': '2026-09-18', 'ok': True, 'fail': False, 'text': 'алдаа #360 зассан'},
                '2026-09-18', 0)
    eq('засвар мэдэгдэнэ', 'Шөнө засвар' in (m or {}).get('title', ''), True)

    w = compose(None, '2026-09-18', 2)
    eq('хүлээгдэж буй алдаа мэдэгдэнэ', '2 алдаа' in (w or {}).get('title', ''), True)

    both = compose({'day': '2026-09-18', 'ok': True, 'fail': False, 'text': 'зассан'},
                   '2026-09-18', 1)
    eq('засвар + үлдсэн алдаа хоёул', 'хүнд үлдэв' in (both or {}).get('body', ''), True)

    eq('урт бичвэр хураагдана', len(short('a' * 300)), 110)
    eq('markdown цэвэрлэгдэнэ', short('`foo` **bar**'), 'foo bar')

    # ⛔ Хоёр зам зэрэг явдаг тул нэг шөнө 2 мөр бичигдэнэ. Сүүлийн мөр нь
    #    «засаагүй» байхад нөгөө зам ажил хийсэн бол АМЖИЛТ гэж тоологдоно.
    two = merge_summaries([
        parse_summary('**2026-09-24** · 🎨 өр · ✅ `foo` — PR #12 · merge хийгдсэн'),
        parse_summary('**2026-09-24** · 🐞 алдаа · 🔍 засах боломжгүй гэж үзэв'),
    ])
    eq('хоёр замын нэг амжилт хангалттай', (two or {}).get('ok'), True)
    eq('хоёр мөр нэг өдөр болж нэгдэнэ', (two or {}).get('day'), '2026-09-24')
    eq('хоёр мөрийн бичвэр хоёулаа үлдэнэ',
       'foo' in (two or {}).get('text', '') and 'боломжгүй' in (two or {}).get('text', ''), True)
    old_day = merge_summaries([
        parse_summary('**2026-09-23** · 🎨 өр · ✅ өчигдөр'),
        parse_summary('**2026-09-24** · 🐞 алдаа · ❌ Унасан'),
    ])
    eq('өчигдрийн амжилт өнөөдрийнх болохгүй', (old_day or {}).get('ok'), False)
    eq('өнөөдрийн уналт танигдана', (old_day or {}).get('fail'), True)
    eq('хоосон жагсаалт None', merge_summaries([None, None]), None)

    if f:
        print('❌ NIGHT NOTIFY FAIL')
        for x in f:
            print('   ·', x)
        raise SystemExit(1)
    print('✅ NIGHT NOTIFY OK — 22 тест')


def main():
    if '--selftest' in sys.argv:
        return selftest()

    today = datetime.now(UB).date().isoformat()
    try:
        summary = last_summary()
        errs = open_error_count()
    except (urllib.error.URLError, urllib.error.HTTPError) as e:
        print(f'GitHub уншигдсангүй: {e}')
        return

    msg = compose(summary, today, errs)
    if not msg:
        print(f'{today}: шөнө ажил гараагүй, хүлээгдэж буй алдаа алга — илгээсэнгүй')
        return

    env = load_env(ENV)
    secret = env.get('PUSH_INTERNAL_KEY', '')
    to = recipients(cfg_json('night_notify'), cfg_json('pbx_notify'))
    if not to:
        print(f'{today}: ХҮЛЭЭН АВАГЧ ТОХИРУУЛААГҮЙ '
              "(app_config['night_notify'] → {\"to\":[\"утас\"]})")
        return
    if DRY or not secret:
        print(f'{today}: {to} | {msg["title"]} / {msg["body"]}'
              + ('' if secret else ' | ⚠ PUSH_INTERNAL_KEY алга'))
        return

    okc = 0
    for phone in to:
        try:
            push(secret, phone, msg)
            okc += 1
        except urllib.error.URLError as e:
            print(f'  ⚠ {phone}: {e}')
    print(f'{today}: {okc}/{len(to)} хүнд илгээв — {msg["title"]}')


if __name__ == '__main__':
    main()
