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
    """Загвар зарын байршлын тохиргоог ХАСНА — өөр зорилготой зарт таарахгүй
    байж болно (Messenger байршил вэб зард утгагүй)."""
    drop = ('publisher_platforms', 'facebook_positions', 'instagram_positions',
            'messenger_positions', 'audience_network_positions', 'device_platforms')
    return {k: v for k, v in (t or {}).items() if k not in drop}


def main():
    c = cfg()
    # ⛔ PAGE токен — creative ба ad хоёулаа хуудасны эрх шаарддаг.
    tok, acct = c.get('FB_PAGE_TOKEN', ''), c.get('FB_ACCT', '')
    if not tok or not acct:
        raise SystemExit('fb.env-д FB_PAGE_TOKEN эсвэл FB_ACCT алга')

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
    sets = [a for a in get(f'{acct}/adsets',
                           {'fields': 'status,targeting,billing_event', 'limit': 50,
                            'access_token': tok}).get('data', [])
            if a.get('status') == 'ACTIVE' and a.get('targeting')]
    if not sets:
        print(f'[{stamp}] boost: идэвхтэй зар алга — зорилтот бүлгийн загвар авах боломжгүй')
        return
    tpl = sets[0]
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
        except urllib.error.HTTPError as e:
            detail = err_text(e)
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

    # ⛔ Хоёр төрөл ЗААВАЛ өөр зорилготой байна — холбоосгүй постыг вэб зар
    #    болговол Facebook татгалзана.
    eq(KINDS['site']['dest'], 'WEBSITE', 'төрөл: сайт → WEBSITE')
    eq(KINDS['engage']['dest'], 'ON_POST', 'төрөл: хандалт → ON_POST')
    eq(KINDS['site']['objective'] != KINDS['engage']['objective'], True,
       'төрөл: зорилго ялгаатай')

    if f:
        print(f'❌ BOOST FAIL — {n[0] - len(f)}/{n[0]}')
        for x in f:
            print('   · ' + x)
        sys.exit(1)
    print(f'✅ BOOST OK — {n[0]} тест')


if __name__ == '__main__':
    selftest() if '--selftest' in sys.argv else main()
