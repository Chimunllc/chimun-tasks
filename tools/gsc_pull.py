#!/usr/bin/env python3
"""Google Search Console — хайлтын үр дүн татаж `gsc_daily`-д бичнэ.

ЯАГААД: Facebook дээр бид хүнд өөрөө очдог. Google дээр хүн БИДНИЙГ хайж
байна — «асар түрээс» гэж бичсэн хүн бол хамгийн худалдан авах хүсэлтэй лид.
Аль үгээр олдож байгаагаа мэдэхгүй бол ямар бараанд зар тавихаа мэдэхгүй.

Ажиллах: VPS cron, өдөрт нэг.  Гараар: python3 gsc_pull.py [--dry] [--selftest]

⚠ GSC дата 2-3 хоног хоцорч, дараа нь ЗАЛРУУЛАГДДАГ тул сүүлийн `WINDOW`
  хоногийг ДАХИН татаж орлуулна — зөвхөн өчигдрийг татвал буруу тоо хөлддөнө.
"""
import json, re, subprocess, sys, urllib.error, urllib.parse, urllib.request
from datetime import date, datetime, timedelta, timezone

ENV = '/opt/chimun/marketing/gsc.env'
TOKEN_URL = 'https://oauth2.googleapis.com/token'
API = 'https://searchconsole.googleapis.com/webmasters/v3/sites'
CONTAINER = 'vps-deploy-postgres-1'
WINDOW = 10          # сүүлийн хэдэн хоногийг дахин татах
PAGE = 25000         # API-ийн нэг хуудасны дээд хэмжээ
UB = timezone(timedelta(hours=8))

DRY = '--dry' in sys.argv


def load_env(path):
    out = {}
    try:
        with open(path) as f:
            for ln in f:
                ln = ln.strip()
                if ln and not ln.startswith('#') and '=' in ln:
                    k, v = ln.split('=', 1)
                    out[k.strip()] = v.strip().strip('"').strip("'")
    except FileNotFoundError:
        pass
    return out


def psql(sql):
    p = subprocess.run(['docker', 'exec', '-i', CONTAINER, 'psql', '-U', 'chimun',
                        '-d', 'chimun', '-v', 'ON_ERROR_STOP=1', '-c', sql],
                       capture_output=True, text=True)
    if p.returncode:
        raise SystemExit('psql: ' + p.stderr.strip())
    return p.stdout


def sq(v):
    return "'" + str(v).replace("'", "''") + "'"


# ── Цэвэр функцууд (тестлэгдэнэ) ────────────────────────────────────────────
def window_dates(today, window=WINDOW):
    """GSC 2-3 хоног хоцордог тул өнөөдрийг ч оруулаад буцаж татна."""
    end = today
    return (end - timedelta(days=window)).isoformat(), end.isoformat()


def norm_page(url, site):
    """Домэйныг хасаж зөвхөн замыг үлдээнэ — хүснэгт богино, уншихад хялбар."""
    u = str(url or '')
    for pre in (str(site or ''), 'https://mevent.mn', 'http://mevent.mn'):
        if pre and u.startswith(pre):
            u = u[len(pre):]
            break
    u = re.sub(r'^https?://[^/]+', '', u)
    return (u or '/')[:300]


def to_records(rows, site):
    """API-ийн мөрүүд → DB-д бичих бичлэгүүд. Хоосон түлхүүр үг алгасагдана."""
    out = []
    for r in (rows or []):
        k = (r or {}).get('keys') or []
        if len(k) < 3:
            continue
        day, query, page = str(k[0])[:10], str(k[1] or '').strip()[:200], norm_page(k[2], site)
        if not re.match(r'^\d{4}-\d{2}-\d{2}$', day) or not query:
            continue
        out.append({
            'day': day, 'query': query, 'page': page,
            'clicks': int(r.get('clicks') or 0),
            'impressions': int(r.get('impressions') or 0),
            'position': round(float(r.get('position') or 0), 2),
        })
    return out


def top_queries(recs, n=10):
    """Түлхүүр үгийг товшилтоор эрэмбэлж нэгтгэнэ — дэлгэцэд юу гаргахыг шийднэ."""
    by = {}
    for r in (recs or []):
        b = by.setdefault(r['query'], {'query': r['query'], 'clicks': 0, 'impressions': 0})
        b['clicks'] += r['clicks']
        b['impressions'] += r['impressions']
    return sorted(by.values(), key=lambda x: (-x['clicks'], -x['impressions']))[:n]


# ── Гүйцэтгэл ───────────────────────────────────────────────────────────────
def access_token(env):
    body = urllib.parse.urlencode({
        'client_id': env['GSC_CLIENT_ID'], 'client_secret': env['GSC_CLIENT_SECRET'],
        'refresh_token': env['GSC_REFRESH_TOKEN'], 'grant_type': 'refresh_token'}).encode()
    with urllib.request.urlopen(urllib.request.Request(TOKEN_URL, data=body), timeout=30) as r:
        return json.loads(r.read().decode())['access_token']


def fetch(site, tok, start, end):
    rows, start_row = [], 0
    while True:
        body = json.dumps({
            'startDate': start, 'endDate': end,
            'dimensions': ['date', 'query', 'page'],
            'rowLimit': PAGE, 'startRow': start_row,
            'dataState': 'all',
        }).encode()
        req = urllib.request.Request(
            f'{API}/{urllib.parse.quote(site, safe="")}/searchAnalytics/query',
            data=body, headers={'Authorization': 'Bearer ' + tok,
                                'Content-Type': 'application/json'})
        with urllib.request.urlopen(req, timeout=120) as r:
            got = json.loads(r.read().decode()).get('rows', [])
        rows += got
        if len(got) < PAGE:
            return rows
        start_row += PAGE


def main():
    env = load_env(ENV)
    site = env.get('GSC_SITE', '').strip()
    for k in ('GSC_CLIENT_ID', 'GSC_CLIENT_SECRET', 'GSC_REFRESH_TOKEN'):
        if not env.get(k):
            raise SystemExit(f'{ENV}-д {k} алга')
    if not site:
        raise SystemExit(f'{ENV}-д GSC_SITE алга (жиш. sc-domain:mevent.mn)')

    start, end = window_dates(date.today())
    try:
        recs = to_records(fetch(site, access_token(env), start, end), site)
    except urllib.error.HTTPError as e:
        raise SystemExit(f'GSC АЛДАА {e.code}: {e.read().decode()[:300]}')

    stamp = datetime.now(UB).strftime('%Y-%m-%d %H:%M')
    if not recs:
        # ⚠ Чимээгүй 0 бичихгүй — баталгаажуулаагүй эсвэл эрх унтарсан байж болно.
        print(f'[{stamp}] gsc: {start}…{end} хооронд мөр ирсэнгүй')
        return
    if DRY:
        print(f'[{stamp}] gsc DRY — {len(recs)} мөр. Шилдэг түлхүүр үг:')
        for q in top_queries(recs):
            print(f"   {q['clicks']:>4} товшилт · {q['impressions']:>6} харагдалт · {q['query']}")
        return

    vals = ','.join(
        f"({sq(r['day'])},{sq(r['query'])},{sq(r['page'])},{r['clicks']},"
        f"{r['impressions']},{r['position']})" for r in recs)
    psql('insert into gsc_daily (day,query,page,clicks,impressions,position) '
         f'values {vals} on conflict (day,query,page) do update set '
         'clicks=excluded.clicks, impressions=excluded.impressions, '
         'position=excluded.position, fetched_at=now();')
    tq = top_queries(recs, 3)
    print(f'[{stamp}] gsc: {len(recs)} мөр ({start}…{end}). Шилдэг: '
          + ' · '.join(f"{q['query']} ({q['clicks']})" for q in tq))


def selftest():
    f, n = [], [0]

    def eq(got, want, name):
        n[0] += 1
        if got != want:
            f.append(f'{name}: хүлээсэн {want!r}, ирсэн {got!r}')

    eq(window_dates(date(2026, 9, 16), 10), ('2026-09-06', '2026-09-16'), 'цонх: 10 хоног')
    eq(window_dates(date(2026, 1, 3), 10), ('2025-12-24', '2026-01-03'), 'цонх: жил дамжина')

    eq(norm_page('https://mevent.mn/products/m-101/', 'sc-domain:mevent.mn'),
       '/products/m-101/', 'хуудас: домэйн хасагдана')
    eq(norm_page('https://mevent.mn/', 'https://mevent.mn/'), '/', 'хуудас: үндэс')
    eq(norm_page('', ''), '/', 'хуудас: хоосон → үндэс')

    rows = [
        {'keys': ['2026-09-10', 'асар түрээс', 'https://mevent.mn/products/m-101/'],
         'clicks': 5, 'impressions': 120, 'position': 3.456},
        {'keys': ['2026-09-10', '', 'https://mevent.mn/'], 'clicks': 1, 'impressions': 2, 'position': 9},
        {'keys': ['муу-огноо', 'x', 'https://mevent.mn/'], 'clicks': 1, 'impressions': 2, 'position': 9},
        {'keys': ['2026-09-11']},
    ]
    recs = to_records(rows, 'https://mevent.mn')
    eq(len(recs), 1, 'бичлэг: зөвхөн бүрэн мөр')
    eq(recs[0]['position'], 3.46, 'бичлэг: байр 2 орон')
    eq(recs[0]['page'], '/products/m-101/', 'бичлэг: зам')
    eq(to_records([], ''), [], 'бичлэг: хоосон')
    eq(to_records(None, ''), [], 'бичлэг: None → унахгүй')

    tq = top_queries([
        {'query': 'а', 'clicks': 1, 'impressions': 50},
        {'query': 'б', 'clicks': 3, 'impressions': 10},
        {'query': 'а', 'clicks': 2, 'impressions': 50},
    ])
    eq(tq[0]['query'], 'а', 'шилдэг: давхардсан түлхүүр нийлнэ (3 товшилт)')
    eq(tq[0]['clicks'], 3, 'шилдэг: товшилт нийлнэ')
    eq(len(top_queries([], 5)), 0, 'шилдэг: хоосон')

    if f:
        print(f'❌ GSC FAIL — {n[0] - len(f)}/{n[0]}')
        for x in f:
            print('   · ' + x)
        raise SystemExit(1)
    print(f'✅ GSC OK — {n[0]} тест')


if __name__ == '__main__':
    selftest() if '--selftest' in sys.argv else main()
