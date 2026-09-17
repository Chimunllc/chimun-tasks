#!/usr/bin/env python3
"""Сайт руу чиглэсэн ТУРШИЛТЫН зар — нэг удаа үүсгэнэ.

ЯАГААД: Идэвхтэй зар БҮГД Messenger рүү чиглэдэг тул сайт долоо хоногт ердөө
20 зочинтой. Гэтэл сайт зар огт авалгүйгээр захиалгын 14%-ийг өгдөг — том
захиалгыг жижигтэй ижил сайн (13.5% ба 14.7%). Тиймээс «сайт руу зар явуулбал
1 захиалга хямд гарах уу?» гэдгийг ХЭМЖИХ ёстой.

⚠ ШИНЭ МӨНГӨ ГАРГАХГҮЙ. Төсөв нь `fb_budget.py`-ийн сангаас хуваарилагдана —
  шинэ кампанит ажил «дунджийн 60%» жинтэй эхэлнэ (≈төсвийн 20%).

⛔ ИДЕМПОТЕНТ: ижил нэртэй кампанит ажил байвал ЮУ Ч ХИЙХГҮЙ гарна. Хоёр
   удаа ажиллуулбал хоёр зар үүсэж төсөв хуваагдана.

Ажиллуулах:  python3 fb_site_test.py [--dry]
"""
import json, subprocess, sys, urllib.error, urllib.parse, urllib.request
from datetime import datetime, timedelta, timezone

ENV = '/opt/chimun/marketing/fb.env'
API = 'https://graph.facebook.com/v21.0'
CONTAINER = 'vps-deploy-postgres-1'
UB = timezone(timedelta(hours=8))

CAMP_NAME = 'SITE-TEST · Ширээ сандал'
LAND = ('https://mevent.mn/turees/shiree-sandal/'
        '?utm_source=facebook&utm_medium=cpc&utm_campaign=site-test')
HEADLINE = 'Ширээ, сандал түрээс'
DESCR = '700+ сандал, ширээ. Улаанбаатар доторх хүргэлттэй.'
BODY = ('Арга хэмжээндээ ширээ, сандал хэрэгтэй юу? Үнэ, сул үлдэгдлийг '
        'сайтаас шууд хараад захиалаарай.')
IMAGE = 'https://n8n.nomaadcamp.com/img/bc492060-39d2-4090-ad2d-f8746ab411d4.jpg'
START_USD = 3.00

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


def get(path, params):
    with urllib.request.urlopen(f'{API}/{path}?' + urllib.parse.urlencode(params), timeout=60) as r:
        return json.loads(r.read().decode())


def post(path, params):
    req = urllib.request.Request(f'{API}/{path}', data=urllib.parse.urlencode(params).encode())
    try:
        with urllib.request.urlopen(req, timeout=90) as r:
            return json.loads(r.read().decode())
    except urllib.error.HTTPError as e:
        raise SystemExit(f'{path} → {e.code}: {e.read().decode()[:400]}')


def psql(sql):
    p = subprocess.run(['docker', 'exec', '-i', CONTAINER, 'psql', '-U', 'chimun',
                        '-d', 'chimun', '-v', 'ON_ERROR_STOP=1', '-c', sql],
                       capture_output=True, text=True)
    if p.returncode:
        print('psql:', p.stderr.strip()[:200])


def sq(v):
    return "'" + str(v).replace("'", "''") + "'"


def main():
    c = cfg()
    tok, acct = c['FB_TOKEN'], c['FB_ACCT']
    page = c['FB_PAGE_ID']
    stamp = datetime.now(UB).strftime('%Y-%m-%d %H:%M')

    # ⛔ ДАВХАРДЛЫН ХААЛТ нь ЗАР (ad) байгаа эсэхээр шийднэ, кампанит ажлаар БИШ.
    #   Анхны оролдлого кампанит ажил + adset үүсгээд creative дээр унасан; зөвхөн
    #   нэрээр шалгадаг байсан тул дахин ажиллуулахад «аль хэдийн байна» гээд
    #   дутуу хэсгийг нөхөхгүй, ХООСОН кампанит ажил мөнхөд үлдэнэ.
    found = None
    for camp in get(f'{acct}/campaigns', {'fields': 'name,effective_status',
                                          'limit': 200, 'access_token': tok})['data']:
        if camp.get('name') == CAMP_NAME:
            found = camp
            break
    if found:
        if get(f'{found["id"]}/ads', {'fields': 'id', 'limit': 5,
                                      'access_token': tok}).get('data'):
            print(f'[{stamp}] туршилтын зар аль хэдийн байна: {found["id"]} '
                  f'({found.get("effective_status")})')
            return
        print(f'[{stamp}] хагас үүссэн кампанит ажил ({found["id"]}) — дутууг нөхнө')

    # Зорилтот бүлгийг ЗОХИОХГҮЙ — ажиллаж байгаа зарынхыг хуулна.
    sets = [a for a in get(f'{acct}/adsets',
                           {'fields': 'status,targeting,billing_event',
                            'limit': 50, 'access_token': tok})['data']
            if a.get('status') == 'ACTIVE' and a.get('targeting')]
    if not sets:
        raise SystemExit('идэвхтэй зар алга — зорилтот бүлгийн загвар авах боломжгүй')
    tpl = sets[0]
    # ⚠ Messenger-т зориулсан байршлыг ХАСНА — вэб рүү чиглэсэн зарт таарахгүй.
    targeting = {k: v for k, v in (tpl.get('targeting') or {}).items()
                 if k not in ('publisher_platforms', 'facebook_positions',
                              'instagram_positions', 'messenger_positions',
                              'audience_network_positions', 'device_platforms')}

    if DRY:
        print(f'[{stamp}] DRY — үүсгэх байсан:')
        print(json.dumps({'campaign': CAMP_NAME, 'link': LAND,
                          'daily_usd': START_USD, 'targeting': targeting},
                         ensure_ascii=False, indent=2)[:900])
        return

    # ⚠ Шинээр үүсгэхдээ PAUSED — бүх хэсэг бүрдсэний ДАРАА л асаана. Эс бөгөөс
    #   дунд нь унавал ЗАРГҮЙ идэвхтэй кампанит ажил үлдэж, `fb_budget.py`-ийн
    #   төсвөөс хувь аваад ажиллаж байгаа зар өлсөнө (2026-09-17-нд яг ингэсэн).
    camp = found or post(f'{acct}/campaigns', {
        'name': CAMP_NAME, 'objective': 'OUTCOME_TRAFFIC', 'status': 'PAUSED',
        'special_ad_categories': '[]', 'is_adset_budget_sharing_enabled': 'false',
        'access_token': tok})

    have = get(f'{camp["id"]}/adsets', {'fields': 'id', 'limit': 5,
                                        'access_token': tok}).get('data', [])
    aset = have[0] if have else post(f'{acct}/adsets', {
        'name': CAMP_NAME, 'campaign_id': camp['id'],
        'daily_budget': int(START_USD * 100),
        'bid_strategy': 'LOWEST_COST_WITHOUT_CAP',
        'billing_event': tpl.get('billing_event') or 'IMPRESSIONS',
        # ⚠ LANDING_PAGE_VIEWS = хуудас ҮНЭХЭЭР нээгдсэнийг тоолно (LINK_CLICKS нь
        #   дарсныг л тоолдог тул хагас нь ачаалагдаж ч амждаггүй).
        'optimization_goal': 'LANDING_PAGE_VIEWS',
        'destination_type': 'WEBSITE',
        'targeting': json.dumps(targeting),
        'status': 'ACTIVE', 'access_token': tok})

    # ⛔ Зургийг `/adimages`-ээр БАЙРШУУЛАХГҮЙ — тэр дуудлага аппын түвшний
    #   чадвар шаарддаг («does not have the capability»). `picture` нь URL-ээр
    #   шууд ажиллана.
    # ⛔ Creative нь ХУУДСАН дээр бичлэг үүсгэдэг тул PAGE токеноор явна —
    #   систем хэрэглэгчид хуудасны «Advertiser» эрх БАЙХГҮЙ (хуудас нь өөр
    #   бизнес багцын мэдэлд). Кампанит ажил/adset/ad нь системийн токеноор.
    cre = post(f'{acct}/adcreatives', {
        'name': CAMP_NAME,
        'object_story_spec': json.dumps({
            'page_id': page,
            'link_data': {'link': LAND, 'message': BODY, 'name': HEADLINE,
                          'description': DESCR, 'picture': IMAGE,
                          'call_to_action': {'type': 'ORDER_NOW',
                                             'value': {'link': LAND}}},
        }),
        'access_token': c['FB_PAGE_TOKEN']})

    post(f'{acct}/ads', {
        'name': CAMP_NAME, 'adset_id': aset['id'],
        'creative': json.dumps({'creative_id': cre['id']}),
        'status': 'ACTIVE', 'access_token': tok})

    # Бүх хэсэг бүрдлээ — ОДОО л асаана.
    post(camp['id'], {'status': 'ACTIVE', 'access_token': tok})
    psql('insert into fb_ad_actions (kind,campaign_id,campaign_name,reason,source) values '
         f"('budget',{sq(camp['id'])},{sq(CAMP_NAME)},"
         f"{sq('сайт руу чиглэсэн туршилтын зар үүсгэв (2 долоо хоног)')},'manual');")
    print(f'[{stamp}] туршилтын зар үүсэж ИДЭВХЖЛЭЭ: {camp["id"]} → {LAND}')


if __name__ == '__main__':
    main()
