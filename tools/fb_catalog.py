#!/usr/bin/env python3
"""Манай каталогийг Meta-гийн бүтээгдэхүүний каталог руу синк хийнэ.

ЯАГААД: Meta Business AI нь холбогдсон каталог, үнийн жагсаалтаас л уншдаг.
2026-09-17-нд тэнд ердөө 1 бараа байсан тул AI «10 гаруй төрлийн сандал»,
«www.meventrent.com» гэх мэт ЗОХИОСОН хариулт өгч байв. Гараар 194 бараа
оруулах нь нэг удаагийн ажил бөгөөд үнэ солигдмогц хуучирна — иймд API.

⛔ ҮНЭ = 1 ХОНОГИЙН ТҮРЭЭС. Meta-гийн каталог нь ХУДАЛДААНД зориулагдсан тул
   юу ч бичихгүй бол AI «худалдаж авна» гэж ойлгоно. Гарчиг, тайлбар хоёуланд
   «түрээс» гэдгийг ИЛ бичнэ.

⛔ СУЛ ҮЛДЭГДЛИЙН ТООГ БИЧИХГҮЙ. Өдөр бүр өөрчлөгддөг тул каталогт бичвэл
   хуучирч, AI буруу тоо хэлнэ. Зөвхөн «байгаа/байхгүй» гэсэн төлөв явна.

Ажиллах: VPS cron, өдөрт нэг удаа.
Гараар:  python3 fb_catalog.py [--dry] [--selftest]
"""
import json, re, subprocess, sys, urllib.error, urllib.parse, urllib.request

ENV = '/opt/chimun/marketing/fb.env'
API = 'https://graph.facebook.com/v21.0'
CONTAINER = 'vps-deploy-postgres-1'
SEP = '\x1f'
BIZ = '1009860685032632'
CAT_NAME = 'M event түрээс'
BATCH = 300               # нэг хүсэлтэд явуулах барааны тоо
SITE = 'https://mevent.mn'

DRY = '--dry' in sys.argv


# ── Цэвэр функцууд ─────────────────────────────────────────────────────────

def price_str(mnt):
    """Meta-гийн каталогийн үнэ = «<дүн> <валют>». Бутархай авахгүй."""
    try:
        v = int(round(float(mnt)))
    except (TypeError, ValueError):
        return ''
    return '%d MNT' % v if v > 0 else ''


def avail(stock):
    """⛔ ТОО БИШ, ЗӨВХӨН ТӨЛӨВ. Тоо өдөр бүр өөрчлөгддөг."""
    try:
        return 'in stock' if int(stock) > 0 else 'out of stock'
    except (TypeError, ValueError):
        return 'out of stock'


def item_link(sku):
    s = re.sub(r'[^a-zA-Z0-9-]', '', str(sku or '')).lower()
    return SITE + '/products/' + s + '/' if s else SITE


def title_of(name):
    """Гарчигт «түрээс» гэдгийг ил хийнэ — Meta-гийн каталог худалдааных."""
    n = ' '.join(str(name or '').split())[:140]
    return (n + ' (түрээс)') if n and 'түрээс' not in n.lower() else n


def desc_of(name, price, cat):
    """Тайлбар нь AI-д ЯГ юу хэлэхийг зааж өгнө."""
    bits = ['%s — 1 хоногийн түрээсийн үнэ %s₮ (НӨАТ багтсан).'
            % (' '.join(str(name or '').split()), format(int(price or 0), ','))]
    if cat:
        bits.append('Ангилал: %s.' % cat)
    bits.append('Олон хоног түрээслэхэд хөнгөлөлттэй: 2+ хоног 20%, '
                '7+ хоног 40%, 30+ хоног 55%.')
    bits.append('Тухайн өдөр сул эсэхийг mevent.mn-ээс шалгана. Утас 7755-1010.')
    return ' '.join(bits)[:4000]


def build_item(row):
    """DB-ийн мөр → Meta-гийн каталогийн бараа. Дутуу бол None."""
    sku, name, price, stock, cat, photo = row
    if not sku or not name:
        return None
    p = price_str(price)
    if not p:
        return None                      # ⛔ үнэгүй бараа каталогт орохгүй
    return {
        'id': str(sku),
        'title': title_of(name),
        'description': desc_of(name, price, cat),
        'availability': avail(stock),
        'condition': 'used',             # түрээсийн эд — шинэ гэж бичих нь худал
        'price': p,
        'link': item_link(sku),
        'image_link': str(photo or ''),
        'brand': 'M event',
    }


def chunks(seq, n):
    for i in range(0, len(seq), n):
        yield seq[i:i + n]


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
    # ⛔ .strip() нь `\x1f`-ийг хасдаг тул сүүлийн багана алдагдана.
    return [ln.split(SEP) for ln in p.stdout.strip('\n').split('\n') if ln]


def api(path, params, method='GET'):
    if method == 'GET':
        url = API + '/' + path + '?' + urllib.parse.urlencode(params)
        req = urllib.request.Request(url)
    else:
        req = urllib.request.Request(API + '/' + path,
                                     data=urllib.parse.urlencode(params).encode())
    try:
        with urllib.request.urlopen(req, timeout=120) as r:
            return json.loads(r.read().decode()), None
    except urllib.error.HTTPError as e:
        return None, json.loads(e.read().decode()).get('error', {}).get('message', '?')[:220]


def catalog_id(tok):
    """Байгаа каталогийг олно, байхгүй бол ҮҮСГЭНЭ. Id нь `app_config`-д."""
    r = psql("select coalesce(value #>> '{id}','') from app_config where key='fb_catalog';", rows=True)
    saved = r[0][0] if r and r[0][0] else ''
    if saved:
        chk, err = api(saved, {'fields': 'id,name', 'access_token': tok})
        if chk:
            return chk['id'], False
    lst, err = api(BIZ + '/owned_product_catalogs',
                   {'fields': 'id,name', 'limit': 50, 'access_token': tok})
    if err:
        raise SystemExit('каталог уншиж чадсангүй: ' + err)
    for c in lst.get('data', []):
        if c.get('name') == CAT_NAME:
            return c['id'], False
    new, err = api(BIZ + '/owned_product_catalogs',
                   {'name': CAT_NAME, 'access_token': tok}, 'POST')
    if err:
        raise SystemExit('каталог үүсгэж чадсангүй: ' + err)
    return new['id'], True


def rows_from_db():
    return psql(
        "select sku, name, coalesce(price,0)::bigint, coalesce(stock,0)::int, "
        "coalesce(category,''), coalesce(photo,'') from public_catalog "
        "where coalesce(price,0) > 0 order by sku;", rows=True)


def main():
    c = cfg()
    tok = c['FB_PAGE_TOKEN']
    rows = [r for r in rows_from_db() if len(r) >= 6]
    items = [x for x in (build_item(r) for r in rows) if x]
    noimg = sum(1 for x in items if not x['image_link'])
    print('каталогт илгээх бараа: %d (зурaггүй %d)' % (len(items), noimg))
    if DRY:
        print(json.dumps(items[:2], ensure_ascii=False, indent=1)[:900])
        return
    cid, created = catalog_id(tok)
    print('каталог:', cid, '(шинэ)' if created else '(байсан)')
    if created:
        psql("insert into app_config (key,value) values ('fb_catalog', "
             + "'" + json.dumps({'id': cid}).replace("'", "''") + "'::jsonb) "
             "on conflict (key) do update set value=excluded.value, updated_at=now();")
    sent = 0
    for part in chunks(items, BATCH):
        reqs = [{'method': 'UPDATE', 'data': it} for it in part]
        r, err = api(cid + '/items_batch',
                     {'item_type': 'PRODUCT_ITEM', 'requests': json.dumps(reqs),
                      'access_token': tok}, 'POST')
        if err:
            raise SystemExit('илгээх алдаа: ' + err)
        sent += len(part)
        print('  илгээв %d/%d  handle=%s' % (sent, len(items), (r or {}).get('handles', ['-'])[:1]))
    print('дууслаа')


def selftest():
    n = [0]

    def eq(a, b, label):
        n[0] += 1
        if a != b:
            raise SystemExit('FAIL %s: %r != %r' % (label, a, b))

    eq(price_str(6600), '6600 MNT', 'үнэ')
    eq(price_str(6600.4), '6600 MNT', 'бутархай тоймлоно')
    eq(price_str(0), '', 'үнэгүй')
    eq(price_str(None), '', 'хоосон үнэ')
    # ⛔ Тоо БИШ, төлөв — нөөц өдөр бүр өөрчлөгддөг.
    eq(avail(5), 'in stock', 'байгаа')
    eq(avail(0), 'out of stock', 'дууссан')
    eq(avail('x'), 'out of stock', 'уншигдаагүй → дууссан')
    eq(item_link('M-007'), 'https://mevent.mn/products/m-007/', 'холбоос')
    eq(item_link(''), 'https://mevent.mn', 'sku алга')
    eq(title_of('Эвхэгддэг сандал'), 'Эвхэгддэг сандал (түрээс)', 'гарчигт түрээс')
    eq(title_of('Асар түрээс 12м'), 'Асар түрээс 12м', 'аль хэдийн бичсэн бол давтахгүй')
    d = desc_of('Сандал', 6600, 'Ширээ, сандал')
    eq('1 хоногийн түрээсийн үнэ 6,600₮' in d, True, 'тайлбарт хоногийн үнэ')
    eq('mevent.mn' in d, True, 'тайлбарт сайт')
    eq(build_item(('M-1', 'Сандал', 6600, 3, 'Ширээ', 'http://i/1.jpg'))['availability'],
       'in stock', 'бараа бүрдэв')
    eq(build_item(('M-1', 'Сандал', 0, 3, '', '')), None, 'үнэгүй бараа орохгүй')
    eq(build_item(('', 'Сандал', 100, 1, '', '')), None, 'sku-гүй орохгүй')
    eq(len(list(chunks(list(range(7)), 3))), 3, 'багцлалт')
    print('fb_catalog selftest: %d тест OK' % n[0])


if __name__ == '__main__':
    selftest() if '--selftest' in sys.argv else main()
