#!/usr/bin/env python3
"""Google Analytics 4 — сайтын зочдыг өдөр × сувгаар татаж `ga_daily`-д бичнэ.

ЯАГААД: Search Console «ямар үгээр хайж байна» гэдгийг хэлнэ; GA4 «хэдэн хүн
орж, хэд нь холбоо барьсан» гэдгийг хэлнэ. Хоёул байж л сайтын юүлүүр бүтнээр
харагдана — зар/SEO-д мөнгө хийхийн өмнө энэ хоёр тоог харах ёстой.

Ажиллах: VPS cron, өдөрт нэг.  Гараар: python3 ga_pull.py [--dry] [--selftest]

⚠ Токен нь GSC-тэй ХУВААЛЦСАН (`gsc.env`) — нэг л Google клиент, хоёр scope.
⚠ GA4 дата ~48 цагийн дотор тогтворжино тул сүүлийн `WINDOW` хоногийг ДАХИН
  татаж орлуулна; зөвхөн өчигдрийг татвал буруу тоо хөлддөнө.
"""
import json, re, subprocess, sys, urllib.error, urllib.parse, urllib.request
from datetime import date, datetime, timedelta, timezone

ENV = '/opt/chimun/marketing/gsc.env'
TOKEN_URL = 'https://oauth2.googleapis.com/token'
API = 'https://analyticsdata.googleapis.com/v1beta'
CONTAINER = 'vps-deploy-postgres-1'
WINDOW = 10          # сүүлийн хэдэн хоногийг дахин татах
PAGE = 100000        # нэг хүсэлтийн дээд мөр
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
    return (today - timedelta(days=window)).isoformat(), today.isoformat()


def ga_day(s):
    """GA4 огноог `YYYYMMDD` хэлбэрээр буцаадаг — ISO болгоно."""
    d = str(s or '')
    if re.match(r'^\d{8}$', d):
        return f'{d[0:4]}-{d[4:6]}-{d[6:8]}'
    return d[:10] if re.match(r'^\d{4}-\d{2}-\d{2}', d) else ''


def to_records(resp):
    """runReport хариу → DB бичлэг. Огноогүй/сувгүй мөр АЛГАСАГДАНА."""
    out = {}
    for r in ((resp or {}).get('rows') or []):
        dims = [(d or {}).get('value', '') for d in (r.get('dimensionValues') or [])]
        mets = [(m or {}).get('value', '0') for m in (r.get('metricValues') or [])]
        if len(dims) < 2:
            continue
        day, ch = ga_day(dims[0]), str(dims[1] or '').strip()[:60]
        if not day or not ch:
            continue

        def num(i):
            try:
                return int(float(mets[i]))
            except (IndexError, ValueError):
                return 0
        out[(day, ch)] = {'day': day, 'channel': ch, 'sessions': num(0),
                          'users': num(1), 'engaged': num(2), 'leads': 0}
    return list(out.values())


def merge_leads(recs, resp):
    """Key event (холбоо барих) тоог өдөр × сувгаар нэмнэ.

    ⚠ GA4-д мөр байхгүй = 0 lead. Тийм мөрийг ШИНЭЭР үүсгэхгүй — сесс байхгүй
      сувагт lead гарах боломжгүй, гарвал энэ нь дата зөрчил.
    """
    by = {(r['day'], r['channel']): r for r in recs}
    for r in ((resp or {}).get('rows') or []):
        dims = [(d or {}).get('value', '') for d in (r.get('dimensionValues') or [])]
        mets = [(m or {}).get('value', '0') for m in (r.get('metricValues') or [])]
        if len(dims) < 2:
            continue
        k = (ga_day(dims[0]), str(dims[1] or '').strip()[:60])
        if k in by:
            try:
                by[k]['leads'] = int(float(mets[0]))
            except (IndexError, ValueError):
                pass
    return recs


def top_channels(recs, n=10):
    by = {}
    for r in (recs or []):
        b = by.setdefault(r['channel'], {'channel': r['channel'], 'sessions': 0, 'leads': 0})
        b['sessions'] += r['sessions']
        b['leads'] += r['leads']
    return sorted(by.values(), key=lambda x: (-x['sessions'], -x['leads']))[:n]


# ── Гүйцэтгэл ───────────────────────────────────────────────────────────────
def access_token(env):
    body = urllib.parse.urlencode({
        'client_id': env['GSC_CLIENT_ID'], 'client_secret': env['GSC_CLIENT_SECRET'],
        'refresh_token': env['GSC_REFRESH_TOKEN'], 'grant_type': 'refresh_token'}).encode()
    with urllib.request.urlopen(urllib.request.Request(TOKEN_URL, data=body), timeout=30) as r:
        return json.loads(r.read().decode())['access_token']


def run_report(prop, tok, body):
    req = urllib.request.Request(
        f'{API}/properties/{urllib.parse.quote(str(prop))}:runReport',
        data=json.dumps(body).encode(),
        headers={'Authorization': 'Bearer ' + tok, 'Content-Type': 'application/json'})
    with urllib.request.urlopen(req, timeout=120) as r:
        return json.loads(r.read().decode())


def fetch(prop, tok, start, end):
    dims = [{'name': 'date'}, {'name': 'sessionDefaultChannelGroup'}]
    base = {'dateRanges': [{'startDate': start, 'endDate': end}],
            'dimensions': dims, 'limit': PAGE}
    main_resp = run_report(prop, tok, dict(base, metrics=[
        {'name': 'sessions'}, {'name': 'totalUsers'}, {'name': 'engagedSessions'}]))
    # ⚠ GA4 «conversions»-ыг «keyEvents» болгож нэрлэсэн. Хуучин property дээр
    #   шинэ нэр танигдахгүй байж болзошгүй тул нэрээ солиод дахин оролдоно.
    lead_resp = {}
    for metric in ('keyEvents', 'conversions'):
        try:
            lead_resp = run_report(prop, tok, dict(base, metrics=[{'name': metric}]))
            break
        except urllib.error.HTTPError as e:
            if e.code != 400:
                raise
    return main_resp, lead_resp


def main():
    env = load_env(ENV)
    prop = env.get('GA_PROPERTY', '').strip()
    for k in ('GSC_CLIENT_ID', 'GSC_CLIENT_SECRET', 'GSC_REFRESH_TOKEN'):
        if not env.get(k):
            raise SystemExit(f'{ENV}-д {k} алга')
    if not prop:
        raise SystemExit(f'{ENV}-д GA_PROPERTY алга (GA4 property-ийн дугаар)')

    start, end = window_dates(date.today())
    try:
        main_resp, lead_resp = fetch(prop, access_token(env), start, end)
    except urllib.error.HTTPError as e:
        raise SystemExit(f'GA4 АЛДАА {e.code}: {e.read().decode()[:300]}')
    recs = merge_leads(to_records(main_resp), lead_resp)

    stamp = datetime.now(UB).strftime('%Y-%m-%d %H:%M')
    if not recs:
        # ⚠ Чимээгүй 0 бичихгүй — таг унтарсан эсвэл эрх хасагдсан байж болно.
        print(f'[{stamp}] ga: {start}…{end} хооронд мөр ирсэнгүй')
        return
    if DRY:
        tot = sum(r['sessions'] for r in recs)
        print(f'[{stamp}] ga DRY — {len(recs)} мөр, нийт {tot} сесс. Суваг:')
        for c in top_channels(recs):
            print(f"   {c['sessions']:>6} сесс · {c['leads']:>3} холбоо барив · {c['channel']}")
        return

    vals = ','.join(
        f"({sq(r['day'])},{sq(r['channel'])},{r['sessions']},{r['users']},"
        f"{r['engaged']},{r['leads']})" for r in recs)
    psql('insert into ga_daily (day,channel,sessions,users,engaged,leads) '
         f'values {vals} on conflict (day,channel) do update set '
         'sessions=excluded.sessions, users=excluded.users, '
         'engaged=excluded.engaged, leads=excluded.leads, fetched_at=now();')
    tc = top_channels(recs, 3)
    print(f'[{stamp}] ga: {len(recs)} мөр ({start}…{end}), '
          f"{sum(r['sessions'] for r in recs)} сесс. Шилдэг: "
          + ' · '.join(f"{c['channel']} ({c['sessions']})" for c in tc))


def selftest():
    f, n = [], [0]

    def eq(got, want, name):
        n[0] += 1
        if got != want:
            f.append(f'{name}: хүлээсэн {want!r}, ирсэн {got!r}')

    eq(window_dates(date(2026, 9, 17), 10), ('2026-09-07', '2026-09-17'), 'цонх: 10 хоног')
    eq(ga_day('20260917'), '2026-09-17', 'огноо: GA4 хэлбэр')
    eq(ga_day('2026-09-17'), '2026-09-17', 'огноо: ISO хэвээр')
    eq(ga_day('муу'), '', 'огноо: танихгүй → хоосон')

    resp = {'rows': [
        {'dimensionValues': [{'value': '20260916'}, {'value': 'Organic Search'}],
         'metricValues': [{'value': '120'}, {'value': '95'}, {'value': '80'}]},
        {'dimensionValues': [{'value': '20260916'}, {'value': 'Direct'}],
         'metricValues': [{'value': '40'}, {'value': '38'}, {'value': '21'}]},
        {'dimensionValues': [{'value': 'муу'}, {'value': 'Direct'}],
         'metricValues': [{'value': '9'}]},
        {'dimensionValues': [{'value': '20260916'}], 'metricValues': [{'value': '9'}]},
    ]}
    recs = to_records(resp)
    eq(len(recs), 2, 'бичлэг: зөвхөн бүрэн мөр')
    eq(recs[0]['sessions'], 120, 'бичлэг: сесс')
    eq(recs[0]['engaged'], 80, 'бичлэг: идэвхтэй сесс')
    eq(to_records({}), [], 'бичлэг: хоосон')
    eq(to_records(None), [], 'бичлэг: None → унахгүй')

    leads = {'rows': [
        {'dimensionValues': [{'value': '20260916'}, {'value': 'Organic Search'}],
         'metricValues': [{'value': '3'}]},
        # ⚠ Сесс байхгүй суваг — ШИНЭ мөр үүсгэхгүй
        {'dimensionValues': [{'value': '20260916'}, {'value': 'Email'}],
         'metricValues': [{'value': '7'}]},
    ]}
    merged = merge_leads(recs, leads)
    eq(len(merged), 2, 'lead: шинэ мөр үүсгэхгүй')
    eq([r['leads'] for r in merged], [3, 0], 'lead: зөвхөн таарсан мөрд')

    eq(top_channels(recs)[0]['channel'], 'Organic Search', 'суваг: сессээр эрэмбэлнэ')
    eq(top_channels([]), [], 'суваг: хоосон')

    print(('✅ ga_pull selftest: %d тест' % n[0]) if not f
          else '❌ ga_pull selftest:\n  ' + '\n  '.join(f))
    return 1 if f else 0


if __name__ == '__main__':
    if '--selftest' in sys.argv:
        sys.exit(selftest())
    main()
