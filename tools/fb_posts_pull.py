#!/usr/bin/env python3
"""Хуудсанд ГАРААР нийтэлсэн постуудыг татаж `fb_page_posts`-д бичнэ.

ЯАГААД: Аппын өөрөө нийтэлсэн постыг Facebook-ийн зарын систем ХАРДАГГҮЙ (апп
Development горимд). CEO гараар нийтэлсэн пост харин бүрэн бүүстлэгддэг. Тиймээс
апп постуудыг жагсааж, хүн сонгож, апп бүүст хийдэг болов.

⚠ `published_posts` edge нь бүүстлэгдэх боломжтой постыг л буцаадаг — аппынх
  тэнд ОГТ гарч ирэхгүй. Энэ нь бидний хувьд шүүлт болж өгч байна.

Ажиллах: VPS cron, 15 минут тутам.  Гараар: python3 fb_posts_pull.py [--dry]
"""
import json, re, subprocess, sys, urllib.error, urllib.parse, urllib.request
from datetime import datetime, timedelta, timezone

ENV = '/opt/chimun/marketing/fb.env'
API = 'https://graph.facebook.com/v21.0'
CONTAINER = 'vps-deploy-postgres-1'
LIMIT = 25          # сүүлийн N пост — хуучин постыг бүүстлэх нь ховор
UB = timezone(timedelta(hours=8))
DRY = '--dry' in sys.argv


def cfg():
    out = {}
    with open(ENV) as f:
        for ln in f:
            ln = ln.strip()
            if ln and not ln.startswith('#') and '=' in ln:
                k, v = ln.split('=', 1)
                out[k.strip()] = v.strip()
    return out


def psql(sql):
    p = subprocess.run(['docker', 'exec', '-i', CONTAINER, 'psql', '-U', 'chimun',
                        '-d', 'chimun', '-v', 'ON_ERROR_STOP=1', '-c', sql],
                       capture_output=True, text=True)
    if p.returncode:
        raise SystemExit('psql: ' + p.stderr.strip()[:300])
    return p.stdout


def sq(v):
    return 'null' if v is None or v == '' else "'" + str(v).replace("'", "''") + "'"


# ── Цэвэр функцууд (тестлэгдэнэ) ────────────────────────────────────────────
def attach_of(post):
    """Постын хавсралтын төрөл ба гадаад холбоос."""
    d = ((post.get('attachments') or {}).get('data') or [{}])[0]
    return (d.get('type') or ''), (d.get('unshimmed_url') or d.get('url') or '')


def site_link(url):
    """mevent.mn руу заасан холбоос уу. Facebook-ийн дотоод хаягийг ХАСНА —
    зургийн/reel-ийн хаяг нь сайт БИШ, түүнийг вэб зар гэж үзвэл зар унана."""
    u = str(url or '')
    return u if re.match(r'^https?://([a-z0-9-]+\.)?mevent\.mn(/|$)', u, re.I) else ''


def boost_kind(status_type, link):
    """Постыг ЯМАР зорилгоор бүүстлэх боломжтой вэ. Цэвэр функц.
    `site`   = сайт руу хүн оруулна (зөвхөн mevent.mn холбоостой пост)
    `engage` = хандалт/сэтгэгдэл (зураг, видео)
    ⛔ Холбоосгүй постыг `site` гэж үзвэл Facebook «Non-Website Ad in Website
       Ad Set» гэж ТАТГАЛЗана — 2026-09-17-нд амьд туршиж баталсан."""
    return 'site' if site_link(link) else 'engage'


def rows_from(data):
    out = []
    for p in (data or []):
        pid = str(p.get('id') or '')
        if not pid:
            continue
        typ, url = attach_of(p)
        link = site_link(url)
        out.append({
            'post_id': pid,
            'created_time': (p.get('created_time') or '')[:25] or None,
            'message': (p.get('message') or '')[:600],
            'picture': (p.get('full_picture') or '')[:500],
            'permalink': (p.get('permalink_url') or '')[:400],
            'status_type': (p.get('status_type') or typ or '')[:40],
            'link_url': link[:400],
            'kind': boost_kind(p.get('status_type'), link),
        })
    return out


def main():
    c = cfg()
    tok, page = c.get('FB_PAGE_TOKEN', ''), c.get('FB_PAGE_ID', '')
    if not tok or not page:
        raise SystemExit('fb.env-д FB_PAGE_TOKEN эсвэл FB_PAGE_ID алга')
    q = urllib.parse.urlencode({
        'fields': 'id,created_time,message,full_picture,permalink_url,status_type,'
                  'attachments{type,unshimmed_url}',
        'limit': LIMIT, 'access_token': tok})
    try:
        with urllib.request.urlopen(f'{API}/{page}/published_posts?{q}', timeout=60) as r:
            data = json.loads(r.read().decode()).get('data', [])
    except urllib.error.HTTPError as e:
        raise SystemExit(f'FB АЛДАА {e.code}: {e.read().decode()[:300]}')

    rows = rows_from(data)
    stamp = datetime.now(UB).strftime('%Y-%m-%d %H:%M')
    if not rows:
        # ⚠ Чимээгүй 0 бичихгүй — токен хүчингүй болсон байж болно.
        print(f'[{stamp}] posts: мөр ирсэнгүй (токен хүчингүй байж магадгүй)')
        return
    if DRY:
        print(f'[{stamp}] DRY — {len(rows)} пост')
        for r in rows[:5]:
            print(f"   {r['created_time'][:10]} {r['kind']:7} {(r['message'] or '')[:40]!r}")
        return

    vals = ','.join(
        f"({sq(r['post_id'])},{sq(r['created_time'])}::timestamptz,{sq(r['message'])},"
        f"{sq(r['picture'])},{sq(r['permalink'])},{sq(r['status_type'])},{sq(r['link_url'])})"
        for r in rows)
    # ⛔ БҮҮСТЫН БАГАНЫГ ХӨНДӨХГҮЙ — зөвхөн контент шинэчлэгдэнэ. Эс бөгөөс
    #    хүний «бүүст хий» хүсэлт дараагийн татацаар чимээгүй арилна.
    psql('insert into fb_page_posts '
         '(post_id,created_time,message,picture,permalink,status_type,link_url) '
         f'values {vals} on conflict (post_id) do update set '
         'created_time=excluded.created_time, message=excluded.message, '
         'picture=excluded.picture, permalink=excluded.permalink, '
         'status_type=excluded.status_type, link_url=excluded.link_url, '
         'fetched_at=now();')
    n_site = sum(1 for r in rows if r['kind'] == 'site')
    print(f'[{stamp}] posts: {len(rows)} пост ({n_site} нь сайтын холбоостой)')


def selftest():
    f, n = [], [0]

    def eq(got, want, name):
        n[0] += 1
        if got != want:
            f.append(f'{name}: хүлээсэн {want!r}, ирсэн {got!r}')

    eq(site_link('https://mevent.mn/'), 'https://mevent.mn/', 'холбоос: сайт')
    eq(site_link('https://mevent.mn/turees/asar/'), 'https://mevent.mn/turees/asar/', 'холбоос: дэд хуудас')
    eq(site_link('http://www.mevent.mn/x'), 'http://www.mevent.mn/x', 'холбоос: www ба http')
    # ⛔ Facebook-ийн дотоод хаяг нь САЙТ БИШ — вэб зар гэж үзвэл зар УНАНА.
    eq(site_link('https://www.facebook.com/reel/17146335496051'), '', 'холбоос: reel → биш')
    eq(site_link('https://www.facebook.com/1052318227707997/posts/x'), '', 'холбоос: пост → биш')
    eq(site_link('https://mevent.mn.evil.com/'), '', 'холбоос: хуурамч домэйн → биш')
    eq(site_link(''), '', 'холбоос: хоосон')
    eq(site_link(None), '', 'холбоос: None → унахгүй')

    eq(boost_kind('shared_story', 'https://mevent.mn/'), 'site', 'төрөл: холбоостой → сайт')
    eq(boost_kind('added_photos', ''), 'engage', 'төрөл: зураг → хандалт')
    eq(boost_kind('added_video', 'https://www.facebook.com/reel/1'), 'engage', 'төрөл: reel → хандалт')

    eq(attach_of({'attachments': {'data': [{'type': 'share', 'unshimmed_url': 'u'}]}}),
       ('share', 'u'), 'хавсралт: төрөл+хаяг')
    eq(attach_of({}), ('', ''), 'хавсралт: байхгүй → хоосон')

    rs = rows_from([{'id': 'p1', 'created_time': '2026-09-17T01:00:00+0000',
                     'message': 'сайн', 'status_type': 'shared_story',
                     'attachments': {'data': [{'type': 'share', 'unshimmed_url': 'https://mevent.mn/'}]}},
                    {'no_id': 1}])
    eq(len(rs), 1, 'мөр: id-гүйг алгасна')
    eq(rs[0]['kind'], 'site', 'мөр: төрөл тодорхойлогдоно')
    eq(rows_from([]), [], 'мөр: хоосон')
    eq(rows_from(None), [], 'мөр: None → унахгүй')

    if f:
        print(f'❌ POSTS FAIL — {n[0] - len(f)}/{n[0]}')
        for x in f:
            print('   · ' + x)
        sys.exit(1)
    print(f'✅ POSTS OK — {n[0]} тест')


if __name__ == '__main__':
    selftest() if '--selftest' in sys.argv else main()
