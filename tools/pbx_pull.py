#!/usr/bin/env python3
# Unitel PBX (pbxuc.unitel.mn) — дуудлагын тоог татаж `pbx_calls_hourly` руу бичнэ.
# Cron-оос өдөр бүр ажиллана.
#
# ⚠ Unitel-д API БАЙХГҮЙ. Портал нь Yii (PHP) веб апп тул энэ скрипт нэвтэрч
#   «Call Details» хуудсыг уншина. Дараах зүйл эвдэрвэл АЛДАА гарган зогсоно
#   (чимээгүй 0 бичихгүй): нэвтрэлт амжилтгүй · хүснэгт олдохгүй · багана дутуу.
#
# ⛔ ЭНЭ СКРИПТ VPS ДЭЭР АЖИЛЛАХГҮЙ — Unitel-ийн галт хана гадаад IP-г хааж
#   өөрийн WatchGuard сертификатаа буцаадаг. CEO-гийн Mac дээрээс ажиллана
#   (launchd `com.chimun.pbxpull`, өдөр бүр 09:30), DB рүү `PG_SSH`-ээр бичнэ.
# ⚠ launchd нь Desktop доторх файлыг уншиж ЧАДАХГҮЙ (macOS TCC) тул ажиллаж
#   буй хуулбар нь `~/.chimun/pbx_pull.py`. ЭНЭ файлыг зассан бол
#   `cp tools/pbx_pull.py ~/.chimun/` хийхээ мартаж болохгүй.
# ⛔ Нэвтрэх нэр/нууц үг зөвхөн `~/.chimun/pbx.env`-д (chmod 600). Репод БАЙХГҮЙ.
# ⛔ Нэг л удаа нэвтэрнэ, амжилтгүй бол ДАХИН ОРОЛДОХГҮЙ — портал хэрэглэгчийг
#   түгждэг (dashboard дээр «Locked User» тоолуур бий).
import http.cookiejar
import os
import subprocess
import sys
import urllib.parse
import urllib.request
from datetime import date, timedelta
from html.parser import HTMLParser

ENV = os.environ.get('PBX_ENV', '/opt/chimun/marketing/pbx.env')
cfg = {}
with open(ENV) as f:
    for line in f:
        line = line.strip()
        if line and not line.startswith('#') and '=' in line:
            k, v = line.split('=', 1)
            cfg[k.strip()] = v.strip()

BASE = cfg.get('PBX_URL', 'https://pbxuc.unitel.mn').rstrip('/')
USER = cfg['PBX_USER']
PASS = cfg['PBX_PASS']
TENANT = cfg.get('PBX_TENANT', '0')
DAYS = int(cfg.get('PBX_DAYS', '7'))
# Түүх нөхөх (backfill): `PBX_FROM`/`PBX_TO` (YYYY-MM-DD) эсвэл argv-ээр хугацаа
# ЗААЖ өгнө. Заагаагүй бол өнөөдрөөс буцаад `PBX_DAYS` хоног — өдөр тутмын горим.
# ⚠ Нэг удаад НЭГ САР татна. Портал нэг хуудсанд л буцаадаг тул урт хугацаа
#   чимээгүй таслагдана — доорх `PAGE_SIZE` хамгаалалтыг үз.
PAGE_SIZE = 2000
CONTAINER = cfg.get('PG_CONTAINER', 'vps-deploy-postgres-1')
# ⚠ Unitel-ийн галт хана ГАДААД IP-г хаадаг (VPS-ээс портал руу орохгүй — өөрийнх
#   нь WatchGuard сертификат ирнэ). Тиймээс энэ скрипт Монгол дахь машин дээр
#   ажиллаж, DB рүү ssh-ээр бичнэ. `PG_SSH` тавибал psql-ийг тэр хостоор дамжуулна.
PG_SSH = cfg.get('PG_SSH', '')

CDR = f'{BASE}/index.php/{TENANT}/tenant/callRecordBillingTenant/admin'
LOGIN = f'{BASE}/index.php/site/login'

opener = urllib.request.build_opener(
    urllib.request.HTTPCookieProcessor(http.cookiejar.CookieJar()))
opener.addheaders = [('User-Agent', 'chimun-pbx-pull/1')]


def get(url, data=None):
    body = urllib.parse.urlencode(data).encode() if data else None
    with opener.open(url, body, timeout=90) as r:
        return r.read().decode('utf-8', 'replace')


class Grid(HTMLParser):
    """Эхний <table>-ийн мөр/нүдийг цуглуулна (grid-ийн эхлэлээс хойш тэжээнэ)."""

    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.depth, self.rows, self.cur, self.cell, self.done = 0, [], None, None, False

    def handle_starttag(self, tag, attrs):
        if self.done:
            return
        if tag == 'table':
            self.depth += 1
        elif tag == 'tr' and self.depth:
            self.cur = []
        elif tag in ('td', 'th') and self.cur is not None:
            self.cell = []

    def handle_endtag(self, tag):
        if self.done:
            return
        if tag in ('td', 'th') and self.cell is not None:
            self.cur.append(' '.join(''.join(self.cell).split()))
            self.cell = None
        elif tag == 'tr' and self.cur is not None:
            self.rows.append(self.cur)
            self.cur = None
        elif tag == 'table':
            self.depth -= 1
            if self.depth <= 0:
                self.done = True

    def handle_data(self, d):
        if self.cell is not None:
            self.cell.append(d)


def die(msg):
    sys.stderr.write('pbx_pull: ' + msg + '\n')
    sys.exit(2)


# ── Нэвтрэх ───────────────────────────────────────────────────────────────────
get(LOGIN)                                    # сессийн cookie авах
get(LOGIN, {
    'LoginForm[acc_type]': 'ADMIN_LOGIN',
    'LoginForm[username]': USER,
    'LoginForm[password]': PASS,
    'LoginForm[reseller_id]': '0',
    'LoginForm[applyCaptcha]': '0',
    'yt0': 'Login',
})

# ── CDR татах ─────────────────────────────────────────────────────────────────
_args = [a for a in sys.argv[1:] if not a.startswith('-')]
_from = os.environ.get('PBX_FROM') or (_args[0] if len(_args) > 0 else '')
_to = os.environ.get('PBX_TO') or (_args[1] if len(_args) > 1 else '')
BACKFILL = bool(_from)
if BACKFILL:
    start_d = date.fromisoformat(_from)
    end_d = date.fromisoformat(_to) if _to else start_d
    if end_d < start_d:
        die('PBX_TO нь PBX_FROM-оос өмнө байна')
else:
    end_d = date.today()
    start_d = end_d - timedelta(days=DAYS - 1)
q = urllib.parse.urlencode({
    'pageSize': str(PAGE_SIZE),
    'CallRecordBillingTenant[start]': start_d.strftime('%m-%d-%Y') + ' 00:00:00',
    'CallRecordBillingTenant[end]': end_d.strftime('%m-%d-%Y') + ' 23:59:59',
})
html = get(f'{CDR}?{q}')

if 'LoginForm[password]' in html:
    die('нэвтэрч чадсангүй (нэр/нууц үг буруу, эсвэл хэрэглэгч түгжигдсэн). ДАХИН оролдохгүй.')

i = html.find('call-record-billing-tenant-grid')
if i < 0:
    die('CDR хүснэгт олдсонгүй — Unitel портал өөрчлөгдсөн байж магадгүй.')

g = Grid()
g.feed(html[i:])
head = next((r for r in g.rows if 'Call ID' in r), None)
if not head:
    die('хүснэгтийн толгой олдсонгүй — багана нуугдсан байж магадгүй («Manage Column»).')

col = {name: n for n, name in enumerate(head)}
NEED = ('Start Time', 'Callee Answer Second', 'Call ID', 'Caller', 'Callee')
for c in NEED:
    if c not in col:
        die(f'«{c}» багана алга. Порталын «Manage Column»-оос буцааж асаана уу.')

# ── Дуудлага бүрийн мөр ─────────────────────────────────────────────────────
# Порталын «Call Direction» багана ХООСОН ирдэг (амьд датаар батлав) тул
# чиглэлийг дугаарын уртаар тодорхойлно: дотоод дугаар = 3-5 орон.
def _is_ext(n):
    s = ''.join(ch for ch in str(n or '') if ch.isdigit())
    return 1 <= len(s) <= 5


def _digits(n):
    return ''.join(ch for ch in str(n or '') if ch.isdigit())


def _sq(v):
    return "null" if v in (None, '') else "'" + str(v).replace("'", "''") + "'"


# ── Өдөр × цагаар нэгтгэх ────────────────────────────────────────────────────
agg = {}
rows_raw = []
bad = 0
for r in g.rows:
    if len(r) < len(head) or r is head:
        continue
    ts = r[col['Start Time']]                 # MM-DD-YYYY HH:MM:SS
    if len(ts) < 19 or ts[:2] == '00':
        continue
    try:
        day = f'{ts[6:10]}-{ts[0:2]}-{ts[3:5]}'
        hour = int(ts[11:13])
        ans = int(r[col['Callee Answer Second']] or 0)
    except ValueError:
        bad += 1
        continue
    a = agg.setdefault((day, hour), [0, 0, 0])
    a[0] += 1                                  # ирсэн
    if ans > 0:                                # ХҮН авсан (PBX биш)
        a[1] += 1
        a[2] += ans

    cid = _digits(r[col['Call ID']])
    if not cid:
        continue
    caller, callee = r[col['Caller']], r[col['Callee']]
    if _is_ext(caller) and _is_ext(callee):
        direc, peer, ext = 'internal', '', _digits(caller)
    elif _is_ext(callee):
        direc, peer, ext = 'in', _digits(caller), _digits(callee)
    else:
        direc, peer, ext = 'out', _digits(callee), _digits(caller)
    rows_raw.append((cid, f'{day} {ts[11:19]}+08', direc, peer, ext,
                     _digits(r[col['Forward']]) if 'Forward' in col else '',
                     ans,
                     int(r[col['Call Second']] or 0) if 'Call Second' in col else 0))

# ⛔ ХУУДАС ДҮҮРВЭЛ ДАТА ТАСАРСАН. Портал нэг хуудас буцаадаг тул мөрийн тоо
#   хязгаарт хүрсэн бол цаана нь дахиад мөр бий — чимээгүй дутуу импортлохоос
#   илүү ЗОГСООД хугацааг богиносгуулсан нь дээр.
_data_rows = sum(1 for r in g.rows if len(r) >= len(head) and r is not head)
if _data_rows >= PAGE_SIZE:
    die(f'{_data_rows} мөр = хуудасны хязгаар. Хугацааг богиносго (сараар нь тат).')

if not agg:
    if BACKFILL:
        print(f'pbx_pull: {start_d}…{end_d} · дуудлага алга (тэр үед бичлэг байхгүй)')
        sys.exit(0)
    die('дуудлага олдсонгүй. Хоосон гэж бичихгүй — эвдэрсэн эсэхийг шалгана уу.')

# ── Бичих: тухайн хугацааны мөрийг устгаад шинээр (idempotent) ───────────────
vals = ',\n  '.join(
    f"('{d}',{h},{v[0]},{v[1]},{v[2]},now())" for (d, h), v in sorted(agg.items()))
# Дуудлага бүрийн мөр — call_id-аар ОРЛУУЛНА (Unitel хожим залруулж болно).
raw_sql = ''
if rows_raw:
    rv = ',\n  '.join(
        f"({_sq(c[0])},{_sq(c[1])}::timestamptz,{_sq(c[2])},{_sq(c[3])},{_sq(c[4])},"
        f"{_sq(c[5])},{c[6]},{c[7]},now())" for c in rows_raw)
    raw_sql = f"""
insert into pbx_calls (call_id, started_at, direction, peer, ext, fwd,
                       answer_sec, call_sec, fetched_at) values
  {rv}
on conflict (call_id) do update set
  started_at = excluded.started_at, direction = excluded.direction,
  peer = excluded.peer, ext = excluded.ext, fwd = excluded.fwd,
  answer_sec = excluded.answer_sec, call_sec = excluded.call_sec, fetched_at = now();
"""

SQL = f"""
begin;
delete from pbx_calls_hourly where day between '{start_d}' and '{end_d}';
insert into pbx_calls_hourly (day, hour, calls, answered, talk_sec, fetched_at) values
  {vals};
{raw_sql}
commit;
"""

cmd = ['docker', 'exec', '-i', CONTAINER,
       'psql', '-U', 'chimun', '-d', 'chimun', '-v', 'ON_ERROR_STOP=1']
if PG_SSH:
    cmd = ['ssh', PG_SSH] + cmd
p = subprocess.run(cmd, input=SQL, text=True, capture_output=True)
sys.stdout.write(p.stdout)
sys.stderr.write(p.stderr)
calls = sum(v[0] for v in agg.values())
ans = sum(v[1] for v in agg.values())
print(f'pbx_pull: {start_d}…{end_d} · {calls} дуудлага ({ans} хүн авсан) · {len(agg)} мөр'
      + (f' · {bad} мөр уншигдсангүй' if bad else ''))
sys.exit(p.returncode)
