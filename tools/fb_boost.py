#!/usr/bin/env python3
"""Хүний сонгосон постыг бүүст хийнэ (`fb_page_posts.boost = 'requested'`).

ЯАГААД ИНГЭЖ: Аппын өөрөө нийтэлсэн постыг зарын систем ХАРДАГГҮЙ (апп
Development горимд) — гараар нийтэлсэн пост харин бүрэн ажилладаг. Тиймээс
хүн постоо хийнэ, аппаас сонгоно, энэ скрипт зар болгоно.

⛔ ХОЁР ЗҮЙЛ АМЬД ТУРШИЖ БАТАЛСАН (2026-09-17):
   ① creative БА ad хоёулаа **PAGE токеноор** үүснэ. Системийн хэрэглэгчээр
      оролдвол «No Advertiser Permission On Page» — хуудас өөр бизнес багцын
      мэдэлд тул систем хэрэглэгчид хуудасны эрх өгөх зам хаалттай.
   ② Постын ТӨРӨЛ зорилготойгоо таарах ёстой. Холбоосгүй постыг вэб зар
      болгох гэвэл «Non-Website Ad in Website Ad Set» гэж ТАТГАЛЗана.

Ажиллах: VPS cron, 10 минут тутам.  Гараар: python3 fb_boost.py [--dry]
"""
import json, subprocess, sys, urllib.error, urllib.parse, urllib.request
from datetime import datetime, timedelta, timezone

ENV = '/opt/chimun/marketing/fb.env'
API = 'https://graph.facebook.com/v21.0'
CONTAINER = 'vps-deploy-postgres-1'
START_USD = 3.00
UB = timezone(timedelta(hours=8))
DRY = '--dry' in sys.argv

# Постын төрөл → зарын тохиргоо. Цэвэр тогтмол, тестлэгдэнэ.
KINDS = {
    'site':   {'objective': 'OUTCOME_TRAFFIC',    'goal': 'LANDING_PAGE_VIEWS',
               'dest': 'WEBSITE'},
    'engage': {'objective': 'OUTCOME_ENGAGEMENT', 'goal': 'POST_ENGAGEMENT',
               'dest': 'ON_POST'},
}


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
                        '-d', 'chimun', '-t', '-A', '-F', '\x1f',
                        '-v', 'ON_ERROR_STOP=1', '-c', sql],
                       capture_output=True, text=True)
    if p.returncode:
        raise SystemExit('psql: ' + p.stderr.strip()[:300])
    # ⛔ `.strip()` нь `\x1f`-ийг ЧУ ХАСДАГ (Python-д тэр нь «зай» гэж тооцогддог) —
    #    сүүлийн багана ХООСОН байхад тусгаарлагч нь идэгдэж мөр нэг талбараар
    #    дутуу задардаг. Амьд системд яг ингэж «хүсэлт алга» гэж худал гарсан.
    return [r.split('\x1f') for r in p.stdout.strip('\n').split('\n') if r.strip()]


def sq(v):
    return 'null' if v is None or v == '' else "'" + str(v).replace("'", "''") + "'"


def get(path, params):
    with urllib.request.urlopen(f'{API}/{path}?' + urllib.parse.urlencode(params),
                                timeout=60) as r:
        return json.loads(r.read().decode())


def post(path, params):
    req = urllib.request.Request(f'{API}/{path}',
                                 data=urllib.parse.urlencode(params).encode())
    with urllib.request.urlopen(req, timeout=90) as r:
        return json.loads(r.read().decode())


def err_text(e):
    try:
        d = json.loads(e.read().decode())['error']
        return (d.get('error_user_msg') or d.get('message') or '')[:300]
    except Exception:
        return f'HTTP {getattr(e, "code", "?")}'


# ── Цэвэр функцууд ──────────────────────────────────────────────────────────
def camp_name(msg, post_id):
    """Кампанит ажлын нэр = постын эхний мөр. Хоосон бол постын дугаар."""
    first = (str(msg or '').strip().split('\n') or [''])[0].strip()
    # Постын дугаар нь `<хуудас>_<пост>` хэлбэртэй — ардах хэсэг нь постынх.
    tail = str(post_id or '').split('_')[-1]
    return ('Бүүст: ' + first[:50]) if first else ('Бүүст: ' + tail)


def clean_targeting(t):
    """Загвар зарын БАЙРШЛЫН (placement) тохиргоог хасна — өөр зорилготой зарт
    таарахгүй байж болно (Messenger байршил вэб зард утгагүй).

    ⛔ ГАЗАРЗҮЙН хамрах хүрээг (`geo_locations`) БҮҮ ХУМИ. «Улаанбаатар руу
       төвлөрүүл» гэж бодогдож болох ч амьд дата ЭСРЭГИЙГ хэлнэ (180 хоног):
         · хотод хүргэсэн  30 захиалга — 44.1 сая₮ (дунджаар 1.5 сая)
         · ХӨДӨӨ хүргэсэн  7 захиалга — 44.1 сая₮ (дунджаар **6.3 сая**, 148 км)
       Хөдөөгийн захиалга тоогоор 4 дахин цөөн атлаа НИЙТ ОРЛОГО нь ижил;
       нэг захиалга нь 4 дахин том. Хот руу хумивал хамгийн үнэтэй сегмент
       таслагдана. Тиймээс улс даяар ҮЛДЭНЭ — scan-тест хамгаална."""
    drop = ('publisher_platforms', 'facebook_positions', 'instagram_positions',
            'messenger_positions', 'audience_network_positions', 'device_platforms')
    out = {k: v for k, v in (t or {}).items() if k not in drop}
    # ⚠ Хот/бүсээр хумисан загвар ирвэл ч улс даяар болгоно (дээрх шалтгаан).
    g = out.get('geo_locations')
    if isinstance(g, dict) and (g.get('cities') or g.get('regions')):
        out['geo_locations'] = {'countries': g.get('countries') or ['MN']}
    return out


# ⛔ ТӨЛБӨРТ ЗАРЫН ЛИНК = ӨӨР МЕДИУМ (2026-09-17). Органик пост `utm_medium=post`
#    -оор явдаг; тэр чигээр нь зар болговол GA4 дээр төлбөртэй урсгал үнэгүйтэй
#    ХОЛИЛДОНО — «зар ажиллаж байна уу» гэдгийг хэзээ ч ялгаж чадахгүй.
AD_MEDIUM = 'cpc'


def ad_link(url, campaign=''):
    """Зарын холбоос: utm_source/campaign нь байвал ХЭВЭЭР, medium нь ҮРГЭЛЖ `cpc`.
    utm огт байхгүй линкийг ч тэмдэглэнэ — эс бөгөөс тэр урсгал «шууд орсон»
    болж, зарын үр дүн 0 харагдана."""
    u = str(url or '').strip()
    if not u:
        return u
    base, _, frag = u.partition('#')
    head, _, qs = base.partition('?')
    kv, seen = [], set()
    for part in qs.split('&'):
        if not part:
            continue
        k = part.split('=', 1)[0]
        seen.add(k)
        kv.append(f'utm_medium={AD_MEDIUM}' if k == 'utm_medium' else part)
    if 'utm_medium' not in seen:
        kv.append(f'utm_medium={AD_MEDIUM}')
    if 'utm_source' not in seen:
        kv.insert(0, 'utm_source=facebook')
    if 'utm_campaign' not in seen:
        kv.append('utm_campaign=' + (urllib.parse.quote(str(campaign or 'boost')) or 'boost'))
    out = head + '?' + '&'.join(kv)
    return out + ('#' + frag if frag else '')


def head_line(msg, n=40):
    """Зарын гарчиг = бичвэрийн эхний мөр (богиносгосон)."""
    first = (str(msg or '').strip().split('\n') or [''])[0].strip()
    return first[:n]


# ── Graph дуудлагууд ────────────────────────────────────────────────────────
def post_media(post_id, tok):
    """Постын БҮТЭН бичвэр, зураг, хавсралтын төрөл. Бичвэрийг DB-ээс биш эндээс
    авна — psql мөр таслалтад задалдаг тул тэнд зөвхөн эхний мөр байдаг."""
    d = get(post_id, {'fields': 'message,full_picture,attachments{type}',
                      'access_token': tok})
    typ = ((d.get('attachments') or {}).get('data') or [{}])[0].get('type') or ''
    return str(d.get('message') or ''), str(d.get('full_picture') or ''), str(typ)


def upload_image(acct, tok, img_url):
    """Зургийг зарын санд байршуулж `image_hash` буцаана.
    ⚠ Facebook-ийн CDN зураг гадны ХУУДСАНД 403 буцаадаг ч сервер талаас
      татахад асуудалгүй."""
    raw = urllib.request.urlopen(img_url, timeout=90).read()
    bd = '----chimun' + datetime.now(UB).strftime('%H%M%S%f')
    body = (f'--{bd}\r\nContent-Disposition: form-data; name="access_token"\r\n\r\n'
            f'{tok}\r\n--{bd}\r\nContent-Disposition: form-data; name="source"; '
            'filename="post.jpg"\r\nContent-Type: image/jpeg\r\n\r\n').encode() \
        + raw + f'\r\n--{bd}--\r\n'.encode()
    req = urllib.request.Request(f'{API}/{acct}/adimages', data=body,
                                 headers={'Content-Type': 'multipart/form-data; boundary=' + bd})
    with urllib.request.urlopen(req, timeout=120) as r:
        d = json.loads(r.read().decode())
    for v in (d.get('images') or {}).values():
        if v.get('hash'):
            return v['hash']
    raise RuntimeError('adimages: hash ирсэнгүй')


def main():
    c = cfg()
    # ⛔ PAGE токен — creative ба ad хоёулаа хуудасны эрх шаарддаг.
    tok, acct = c.get('FB_PAGE_TOKEN', ''), c.get('FB_ACCT', '')
    page = c.get('FB_PAGE_ID', '')
    if not tok or not acct or not page:
        raise SystemExit('fb.env-д FB_PAGE_TOKEN / FB_ACCT / FB_PAGE_ID алга')

    # ⛔ БИЧВЭРИЙГ ТҮҮХИЙГЭЭР БҮҮ СОНГО — постын мөр таслалт нь psql-ийн мөрийг
    #    хоёр хуваадаг тул задлалт унана («not enough values to unpack», амьд
    #    туршихад яг ингэсэн). Кампанит ажлын нэрэнд эхний мөр л хэрэгтэй.
    rows = [r for r in psql(
        "select post_id, split_part(replace(coalesce(message,''), chr(13), ''), chr(10), 1), "
        "coalesce(boost_kind,'engage'), coalesce(link_url,'') from fb_page_posts "
        "where boost = 'requested' order by requested_at limit 5") if len(r) == 4]
    stamp = datetime.now(UB).strftime('%Y-%m-%d %H:%M')
    if not rows:
        print(f'[{stamp}] boost: хүсэлт алга')
        return

    # Зорилтот бүлгийг ЗОХИОХГҮЙ — ажиллаж байгаа зарынхыг хуулна.
    # ⛔ ЗАГВАРЫГ [0]-ООС БҮҮ АВ — тэр нь ердөө API-гийн буцаасан эхний мөр,
    #    зогссон кампанит ажлынх ч байж болно. ХАМГИЙН ТОМ ӨДРИЙН ТӨСӨВТЭЙГ
    #    сонгоно: бодит мөнгө зарцуулж байгаа нь л батлагдсан тохиргоо.
    sets = [a for a in get(f'{acct}/adsets',
                           {'fields': 'status,targeting,billing_event,daily_budget',
                            'limit': 50, 'access_token': tok}).get('data', [])
            if a.get('status') == 'ACTIVE' and a.get('targeting')]
    if not sets:
        print(f'[{stamp}] boost: идэвхтэй зар алга — зорилтот бүлгийн загвар авах боломжгүй')
        return
    tpl = max(sets, key=lambda a: float(a.get('daily_budget') or 0))
    targeting = clean_targeting(tpl.get('targeting'))

    ok = bad = 0
    for post_id, msg, kind, link in rows:
        k = KINDS.get(kind) or KINDS['engage']
        name = camp_name(msg, post_id)
        if DRY:
            print(f'   DRY {kind:7} {name}')
            continue
        try:
            # ⚠ PAUSED-аар үүсгээд бүх хэсэг бүрдсэний ДАРАА асаана — дунд нь
            #   унавал зargүй идэвхтэй кампанит ажил төсвөөс хувь авна.
            camp = post(f'{acct}/campaigns', {
                'name': name, 'objective': k['objective'], 'status': 'PAUSED',
                'special_ad_categories': '[]',
                'is_adset_budget_sharing_enabled': 'false', 'access_token': tok})
            aset = post(f'{acct}/adsets', {
                'name': name, 'campaign_id': camp['id'],
                'daily_budget': int(START_USD * 100),
                'bid_strategy': 'LOWEST_COST_WITHOUT_CAP',
                'billing_event': tpl.get('billing_event') or 'IMPRESSIONS',
                'optimization_goal': k['goal'], 'destination_type': k['dest'],
                'targeting': json.dumps(targeting),
                'status': 'ACTIVE', 'access_token': tok})
            # ⛔ ЗУРАГТАЙ ПОСТЫГ ПОСТООР НЬ ВЭБ ЗАР БОЛГОХ БОЛОМЖГҮЙ — Facebook
            #    «Non-Website Ad in Website Ad Set» гэж татгалздаг. Тиймээс сайт
            #    руу чиглүүлэх зарыг постын ЗУРАГ + ЛИНКЭЭС дахин угсарна
            #    (link_data). Энэ нь ШИНЭ зар болох тул органик постын таалагдсан
            #    тоо/сэтгэгдэл ШИЛЖИХГҮЙ — тэр нь энэ замын үнэ.
            full_msg, pic, atyp = ('', '', '')
            if kind == 'site':
                full_msg, pic, atyp = post_media(post_id, tok)
            if kind == 'site' and atyp != 'share':
                ld = {'link': ad_link(link, head_line(msg, 30)),
                      'message': full_msg or msg,
                      'name': head_line(msg) or 'M-Event түрээс',
                      'call_to_action': {'type': 'LEARN_MORE'}}
                # Зураг олдохгүй бол ЛИНКИЙН урьдчилсан харагдацыг Facebook өөрөө
                # татна — зар зогсоохгүй.
                if pic:
                    ld['image_hash'] = upload_image(acct, tok, pic)
                cre = post(f'{acct}/adcreatives', {
                    'name': name, 'access_token': tok,
                    'object_story_spec': json.dumps({'page_id': page, 'link_data': ld})})
            else:
                cre = post(f'{acct}/adcreatives', {
                    'name': name, 'object_story_id': post_id, 'access_token': tok})
            post(f'{acct}/ads', {
                'name': name, 'adset_id': aset['id'],
                'creative': json.dumps({'creative_id': cre['id']}),
                'status': 'ACTIVE', 'access_token': tok})
            post(camp['id'], {'status': 'ACTIVE', 'access_token': tok})

            psql(f"update fb_page_posts set boost='done', campaign_id={sq(camp['id'])}, "
                 f"error=null where post_id={sq(post_id)};")
            psql('insert into fb_ad_actions (kind,campaign_id,campaign_name,reason,source) '
                 f"values ('budget',{sq(camp['id'])},{sq(name)},"
                 f"{sq('хүний сонгосон постыг бүүст хийв (' + kind + ')')},'manual');")
            ok += 1
            print(f'[{stamp}] бүүст хийв [{kind}]: {name} → {camp["id"]}')
        except Exception as e:
            detail = err_text(e) if isinstance(e, urllib.error.HTTPError) else str(e)[:300]
            # ⚠ Алдааг АППАД бүртгэнэ — эс бөгөөс хүн «дарсан ч юу ч болохгүй»
            #   гэж бодно. `requested` хэвээр үлдээхгүй: дахин дахин оролдвол
            #   ижил алдаа 10 минут тутам давтагдана.
            psql(f"update fb_page_posts set boost='error', error={sq(detail)} "
                 f"where post_id={sq(post_id)};")
            bad += 1
            print(f'[{stamp}] ⚠ бүүст бүтсэнгүй: {name} — {detail}')
    if not DRY:
        print(f'[{stamp}] boost: {ok} амжилттай, {bad} алдаа')


def selftest():
    f, n = [], [0]

    def eq(got, want, name):
        n[0] += 1
        if got != want:
            f.append(f'{name}: хүлээсэн {want!r}, ирсэн {got!r}')

    eq(camp_name('Ширээ сандал түрээс\nдэлгэрэнгүй', 'p1'),
       'Бүүст: Ширээ сандал түрээс', 'нэр: эхний мөр')
    eq(camp_name('', '105205905758163_1051355584470928'),
       'Бүүст: 1051355584470928', 'нэр: хоосон → постын дугаар')
    eq(camp_name(None, 'abcdefghijklmn'), 'Бүүст: abcdefghijklmn', 'нэр: None → унахгүй')
    eq(len(camp_name('я' * 200, 'p')), len('Бүүст: ') + 50, 'нэр: 50 тэмдэгтээр тасарна')

    eq(clean_targeting({'geo_locations': 1, 'publisher_platforms': ['x'],
                        'messenger_positions': ['y'], 'age_min': 18}),
       {'geo_locations': 1, 'age_min': 18}, 'таргет: байршил хасагдана')
    eq(clean_targeting(None), {}, 'таргет: None → хоосон')

    # ⛔ ХОТООР ХУМИХГҮЙ — хөдөөгийн 7 захиалга нь хотын 30-тай ижил орлоготой
    #    (дунджаар 4 дахин том). Хумивал хамгийн үнэтэй сегмент таслагдана.
    eq(clean_targeting({'geo_locations': {'countries': ['MN'],
                                          'cities': [{'key': '123', 'name': 'Ulaanbaatar'}]}}),
       {'geo_locations': {'countries': ['MN']}}, 'таргет: хот хасагдаж улс үлдэнэ')
    eq(clean_targeting({'geo_locations': {'countries': ['MN']}}),
       {'geo_locations': {'countries': ['MN']}}, 'таргет: улс байвал хэвээр')

    # ⛔ Хоёр төрөл ЗААВАЛ өөр зорилготой байна — холбоосгүй постыг вэб зар
    #    болговол Facebook татгалзана.
    # ⛔ ТӨЛБӨРТ УРСГАЛ = `utm_medium=cpc`. Органик постын `post` медиумтай
    #    холилдвол «зар ажиллаж байна уу» гэдгийг GA4-д ялгах аргагүй болно.
    eq(ad_link('https://mevent.mn/products/m-007/?utm_source=facebook&utm_medium=post&utm_campaign=m-007'),
       'https://mevent.mn/products/m-007/?utm_source=facebook&utm_medium=cpc&utm_campaign=m-007',
       'линк: медиум cpc болно, бусад нь хэвээр')
    eq(ad_link('https://mevent.mn/'),
       'https://mevent.mn/?utm_source=facebook&utm_medium=cpc&utm_campaign=boost',
       'линк: utm огт байхгүй бол бүрэн тэмдэглэнэ')
    eq(ad_link('https://mevent.mn/?a=1', 'Асар'),
       'https://mevent.mn/?utm_source=facebook&a=1&utm_medium=cpc&utm_campaign=%D0%90%D1%81%D0%B0%D1%80',
       'линк: байгаа параметр хэвээр, кампанит нэр кодлогдоно')
    eq(ad_link('https://mevent.mn/x#top'),
       'https://mevent.mn/x?utm_source=facebook&utm_medium=cpc&utm_campaign=boost#top',
       'линк: fragment төгсгөлдөө үлдэнэ')
    eq(ad_link(''), '', 'линк: хоосон → хоосон')
    eq(ad_link(None), '', 'линк: None → унахгүй')

    eq(head_line('Асар майхан түрээс\nдэлгэрэнгүй'), 'Асар майхан түрээс', 'гарчиг: эхний мөр')
    eq(len(head_line('я' * 100)), 40, 'гарчиг: 40 тэмдэгтээр таслана')
    eq(head_line(None), '', 'гарчиг: None → хоосон')

    eq(KINDS['site']['dest'], 'WEBSITE', 'төрөл: сайт → WEBSITE')
    eq(KINDS['engage']['dest'], 'ON_POST', 'төрөл: хандалт → ON_POST')
    eq(KINDS['site']['objective'] != KINDS['engage']['objective'], True,
       'төрөл: зорилго ялгаатай')

    # ⛔ Загвар нь хамгийн ТОМ төсөвтэй зар — [0] нь санамсаргүй мөр.
    sets = [{'daily_budget': '100', 'targeting': {'a': 1}},
            {'daily_budget': '900', 'targeting': {'b': 2}},
            {'daily_budget': None, 'targeting': {'c': 3}}]
    eq(max(sets, key=lambda a: float(a.get('daily_budget') or 0))['targeting'],
       {'b': 2}, 'загвар: хамгийн том төсөвтэй нь')

    if f:
        print(f'❌ BOOST FAIL — {n[0] - len(f)}/{n[0]}')
        for x in f:
            print('   · ' + x)
        sys.exit(1)
    print(f'✅ BOOST OK — {n[0]} тест')


if __name__ == '__main__':
    selftest() if '--selftest' in sys.argv else main()
