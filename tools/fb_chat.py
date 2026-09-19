#!/usr/bin/env python3
"""Messenger чатын төлвийг татаж `fb_chats`-д бичнэ.

ЯАГААД: «Хэдэн чат хариугүй үлдэж байна» гэдгийг хэн ч хэмждэггүй байв. Энэ
татагч тэр тоог гаргана — аппын 💬 дэлгэц эндээс уншина.

⛔ ХАРИУЛАХ АЖИЛ ЭНД БАЙХГҮЙ (2026-09-17). Өмнө нь энэ скрипт Claude-аар
   хариулт бэлдэж илгээдэг байсан. Meta Business Agent тэр ажлыг хийдэг болсон
   тул хасав — хоёр бот нэг чатад хариулах нь харилцагчийг төөрүүлнэ.
   Энд үлдсэн нь ЗӨВХӨН хэмжилт: Meta-гийн бот үнэхээр ажиллаж байгаа эсэхийг
   яг энэ датагаар л мэднэ (хариулсан хувь, хүлээлгийн хугацаа).

Ажиллах: VPS cron, 15 минут тутам.
Гараар:  python3 fb_chat.py [--full] [--selftest]
"""
import fcntl, json, subprocess, sys, urllib.error, urllib.parse, urllib.request
from datetime import datetime, timedelta, timezone

ENV = '/opt/chimun/marketing/fb.env'
API = 'https://graph.facebook.com/v21.0'
CONTAINER = 'vps-deploy-postgres-1'
UB = timezone(timedelta(hours=8))
SEP = '\x1f'

# ⚠ Бүтэн татац 2 минут орчим болдог (300 яриа). Ажлын жагсаалтад хамгийн
#   сүүлд хөдөлсөн 50 яриа хангалттай (өдөрт ~6.5 шинэ чат).
QUICK_PAGES = 1
FULL_PAGES = 6
MSG_LIMIT = 25
WINDOW_H = 24             # Meta-гийн чөлөөт бичвэрийн цонх

FULL = '--full' in sys.argv


# ── Цэвэр функцууд (--selftest шалгана) ────────────────────────────────────

def parse_ts(s):
    """Facebook «2026-09-17T04:15:08+0000» → datetime. Уншигдахгүй бол None."""
    s = str(s or '').strip()
    if not s:
        return None
    try:
        return datetime.strptime(s, '%Y-%m-%dT%H:%M:%S%z')
    except ValueError:
        try:
            return datetime.fromisoformat(s.replace('Z', '+00:00'))
        except ValueError:
            return None


def in_window(last_in, now, hours=WINDOW_H):
    """Meta-гийн чөлөөт бичвэрийн цонх нээлттэй эсэх.

    ⚠ Хаагдсан чатыг жагсаалтаас ХАСАХГҮЙ — тэр нь алдагдсан лид, нуувал
      «бүгд хариулагдсан» гэсэн худал дүр зураг гарна.
    """
    if not last_in or not now:
        return False
    return (now - last_in) <= timedelta(hours=hours)


def waiting(msgs, page_id):
    """Харилцагч СҮҮЛД бичсэн үү — бид хариулаагүй юу."""
    ms = sorted(msgs or [], key=lambda m: m.get('created_time') or '')
    if not ms:
        return False
    return (ms[-1].get('from') or {}).get('id') != page_id


def first_reply_min(msgs, page_id):
    """Эхний ирсэн мессежээс эхний хариулт хүртэлх минут.

    ⛔ Хариулаагүй бол None, 0 БИШ — 0 гэвэл «шууд хариулсан» гэж уншигдана.
    """
    ms = sorted(msgs or [], key=lambda m: m.get('created_time') or '')
    a = next((parse_ts(m.get('created_time')) for m in ms
              if (m.get('from') or {}).get('id') != page_id), None)
    if not a:
        return None
    for m in ms:
        if (m.get('from') or {}).get('id') != page_id:
            continue
        b = parse_ts(m.get('created_time'))
        if b and b > a:
            return int((b - a).total_seconds() // 60)
    return None


def sq(v):
    return 'null' if v is None or v == '' else "'" + str(v).replace("'", "''") + "'"


def sq_ts(dt):
    return 'null' if not dt else "'" + dt.astimezone(timezone.utc).isoformat() + "'"


# ── I/O ────────────────────────────────────────────────────────────────────

def cfg():
    out = {}
    with open(ENV) as f:
        for ln in f:
            ln = ln.strip()
            if ln and not ln.startswith('#') and '=' in ln:
                k, v = ln.split('=', 1)
                out[k.strip()] = v.strip()
    return out


def psql(sql, rows=False):
    cmd = ['docker', 'exec', '-i', CONTAINER, 'psql', '-U', 'chimun', '-d', 'chimun',
           '-v', 'ON_ERROR_STOP=1']
    cmd += ['-t', '-A', '-F', SEP, '-c', sql] if rows else ['-c', sql]
    p = subprocess.run(cmd, capture_output=True, text=True)
    if p.returncode:
        raise SystemExit('psql: ' + p.stderr.strip()[:300])
    if not rows:
        return p.stdout
    # ⛔ .strip() нь `\x1f`-ийг ХАСдаг тул сүүлийн багана алдагдана.
    return [ln.split(SEP) for ln in p.stdout.strip('\n').split('\n') if ln]


def api_get(url):
    with urllib.request.urlopen(url, timeout=90) as r:
        return json.loads(r.read().decode())


def fetch_threads(tok, page_id):
    q = urllib.parse.urlencode({
        'fields': ('id,updated_time,participants,messages.limit(%d)'
                   '{id,created_time,from,message}') % MSG_LIMIT,
        'limit': 50, 'access_token': tok})
    url = API + '/' + page_id + '/conversations?' + q
    cap = FULL_PAGES if FULL else QUICK_PAGES
    out, n = [], 0
    while url and n < cap:
        r = api_get(url)
        out += r.get('data', [])
        n += 1
        url = (r.get('paging') or {}).get('next')
    return out


def upsert_chat(c):
    psql(
        "insert into fb_chats (thread_id,psid,name,first_at,last_at,last_in_at,last_in_mid,"
        "last_out_at,msgs_in,msgs_out,state,updated_at) values ("
        + ','.join([sq(c['thread_id']), sq(c['psid']), sq(c['name']), sq_ts(c['first_at']),
                    sq_ts(c['last_at']), sq_ts(c['last_in_at']), sq(c['last_in_mid']),
                    sq_ts(c['last_out_at']), str(c['msgs_in']), str(c['msgs_out']),
                    sq('open')]) + ",now()) "
        "on conflict (thread_id) do update set psid=excluded.psid, name=excluded.name, "
        "first_at=least(fb_chats.first_at,excluded.first_at), last_at=excluded.last_at, "
        "last_in_at=excluded.last_in_at, last_in_mid=excluded.last_in_mid, "
        "last_out_at=excluded.last_out_at, msgs_in=excluded.msgs_in, "
        "msgs_out=excluded.msgs_out, updated_at=now(), "
        # ⛔ `done` нь ХҮНИЙ шийдвэр — татагч түүнийг дарж бичихгүй.
        "state=case when fb_chats.state='done' then 'done' else 'open' end;")


def main():
    # ⛔ Нэг л хувилбар ажиллана — бүтэн татац удаан тул cron давхарлаж болно.
    lock = open('/tmp/fb_chat.lock', 'w')
    try:
        fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
    except OSError:
        print('өмнөх ажиллалт дуусаагүй — алгаслаа')
        return
    c = cfg()
    tok, page = c['FB_PAGE_TOKEN'], c['FB_PAGE_ID']
    now = datetime.now(timezone.utc)
    stamp = now.astimezone(UB).strftime('%Y-%m-%d %H:%M')

    threads = fetch_threads(tok, page)
    wait_n = open_n = 0
    for cv in threads:
        msgs = (cv.get('messages') or {}).get('data', [])
        parts = [p for p in ((cv.get('participants') or {}).get('data') or [])
                 if p.get('id') != page]
        who = parts[0] if parts else {}
        ins = [m for m in msgs if (m.get('from') or {}).get('id') != page]
        outs = [m for m in msgs if (m.get('from') or {}).get('id') == page]
        last_in = max([parse_ts(m.get('created_time')) for m in ins] or [None],
                      key=lambda x: (x is not None, x))
        last_out = max([parse_ts(m.get('created_time')) for m in outs] or [None],
                       key=lambda x: (x is not None, x))
        last_in_m = sorted(ins, key=lambda m: m.get('created_time') or '')[-1] if ins else {}
        ordered = sorted(msgs, key=lambda m: m.get('created_time') or '')
        upsert_chat({
            'thread_id': cv.get('id'), 'psid': who.get('id'), 'name': who.get('name'),
            'first_at': parse_ts((ordered or [{}])[0].get('created_time')),
            'last_at': parse_ts(cv.get('updated_time')),
            'last_in_at': last_in, 'last_in_mid': last_in_m.get('id'),
            'last_out_at': last_out, 'msgs_in': len(ins), 'msgs_out': len(outs)})
        if waiting(msgs, page):
            wait_n += 1
            if in_window(last_in, now):
                open_n += 1
    print('[%s] чат %d%s | хариу хүлээж буй %d (цонх нээлттэй %d)'
          % (stamp, len(threads), '' if FULL else ' (түргэн)', wait_n, open_n))


# ── Өөрийгөө шалгах ────────────────────────────────────────────────────────

def selftest():
    n = [0]

    def eq(a, b, label):
        n[0] += 1
        if a != b:
            raise SystemExit('FAIL %s: %r != %r' % (label, a, b))

    P = 'PAGE'
    t0 = '2026-09-17T04:00:00+0000'
    t1 = '2026-09-17T04:05:00+0000'
    ms = [{'id': 'a', 'created_time': t0, 'from': {'id': 'U'}, 'message': 'сайн уу'},
          {'id': 'b', 'created_time': t1, 'from': {'id': P}, 'message': 'сайн байна уу'}]
    eq(waiting(ms, P), False, 'бид сүүлд бичсэн')
    eq(waiting([ms[0]], P), True, 'харилцагч хүлээж байна')
    eq(waiting([], P), False, 'мессежгүй')
    eq(first_reply_min(ms, P), 5, 'эхний хариулт 5 мин')
    eq(first_reply_min([ms[0]], P), None, 'хариулаагүй → None')
    eq(first_reply_min([], P), None, 'мессежгүй → None')

    now = parse_ts('2026-09-17T10:00:00+0000')
    eq(in_window(parse_ts('2026-09-17T04:00:00+0000'), now), True, '6 цаг — нээлттэй')
    eq(in_window(parse_ts('2026-09-15T04:00:00+0000'), now), False, '2 хоног — хаалттай')
    eq(in_window(None, now), False, 'мессежгүй — хаалттай')
    eq(sq("O'Neil"), "'O''Neil'", 'хашилт хамгаалагдав')
    eq(sq(''), 'null', 'хоосон → null')
    print('fb_chat selftest: %d тест OK' % n[0])


if __name__ == '__main__':
    selftest() if '--selftest' in sys.argv else main()
