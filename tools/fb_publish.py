#!/usr/bin/env python3
# Аппаас БАТАЛСАН постыг M event хуудсанд нийтэлж, бүүст хийнэ.
# VPS: /opt/chimun/marketing/fb_publish.py, cron 10 минут тутам.
#
# ⛔ ЗӨВХӨН `ads_posts.status = 'approved'` мөрийг хөнднө. Ноорог/болисон
#   постыг хэзээ ч нийтлэхгүй — батлах нь хүний ганц шийдвэр.
# ⛔ ЗАР УНТРААЛТТАЙ ҮЕД ЮУ Ч ХИЙХГҮЙ. Батлагдсан пост хүлээнэ («Бүх зар
#   зогсоо» дарсан хүн пост нийтлэгдэж мөнгө гарна гэж бодохгүй).
# ⛔ ЗОРИЛТОТ БҮЛГИЙГ ЗОХИОХГҮЙ — ажиллаж байгаа хамгийн том зарын тохиргоог
#   хуулна. Таамаглаж бичсэн таргет нь мөнгө үрэх хамгийн хурдан зам.
# ⚠ ХОЁР ТОКЕН: хуудсанд бичихэд FB_PAGE_TOKEN, зар үүсгэхэд FB_TOKEN
#   (систем хэрэглэгч). Хооронд нь андуурвал 200 биш алдаа ирнэ.
# ⚠ ХЭСЭГЧИЛСЭН БҮТЭЛГҮЙТЭЛ: пост нийтлэгдээд зар үүсэхгүй байж болно.
#   Тиймээс `fb_post_id`-г ШУУД хадгална — дараагийн оролдлогод пост ДАХИН
#   нийтлэгдэхгүй, зөвхөн зар үүсгэх хэсэг давтагдана.
import json
import subprocess
import sys
import urllib.parse
import urllib.request
from datetime import date

ENV = '/opt/chimun/marketing/fb.env'
DRY = '--dry-run' in sys.argv

cfg = {}
with open(ENV) as f:
    for line in f:
        line = line.strip()
        if line and not line.startswith('#') and '=' in line:
            k, v = line.split('=', 1)
            cfg[k.strip()] = v.strip()

TOKEN, ACCT = cfg['FB_TOKEN'], cfg['FB_ACCT']
PAGE_TOKEN, PAGE_ID = cfg['FB_PAGE_TOKEN'], cfg['FB_PAGE_ID']
CONTAINER = cfg.get('PG_CONTAINER', 'vps-deploy-postgres-1')
API = 'https://graph.facebook.com/v21.0'
START_USD = 1.0            # эхлэх өдрийн төсөв; 10 минутын дотор хуваарилагч засна


def log(msg):
    print(f'{date.today()} fb_publish: {msg}', flush=True)


def api_get(path, params):
    url = f'{API}/{path}?' + urllib.parse.urlencode(params)
    with urllib.request.urlopen(url, timeout=60) as r:
        return json.load(r)


def api_post(path, params):
    if DRY:
        log(f'[dry-run] POST {path} ← {sorted(params)}')
        return {'id': 'dry_' + path.replace('/', '_')}
    data = urllib.parse.urlencode(params).encode()
    req = urllib.request.Request(f'{API}/{path}', data=data, method='POST')
    with urllib.request.urlopen(req, timeout=90) as r:
        return json.load(r)


def psql(sql):
    p = subprocess.run(['docker', 'exec', '-i', CONTAINER, 'psql', '-U', 'chimun',
                        '-d', 'chimun', '-At', '-F', '|', '-c', sql],
                       text=True, capture_output=True)
    if p.returncode:
        raise SystemExit('psql: ' + p.stderr.strip())
    return p.stdout.strip()


def sq(v):
    return 'null' if v is None else "'" + str(v).replace("'", "''") + "'"


def note(reason):
    """Аппад харагдах тэмдэглэл. Давтагдсаныг 6 цагт нэг л удаа бичнэ."""
    psql('insert into fb_ad_actions (kind,campaign_id,campaign_name,reason) '
         f"select 'error',null,null,{sq(reason)} where not exists (select 1 from fb_ad_actions"
         f" where kind='error' and reason={sq(reason)} and at > now() - interval '6 hours');")


# ── ① Зар асаалттай эсэх ────────────────────────────────────────────────────
raw = psql("select coalesce(value::text,'') from app_config where key='ads_budget'")
budget = json.loads(raw) if raw else {}
month = date.today().strftime('%Y-%m')
on = bool(budget.get('enabled')) and str(budget.get('month') or '') == month \
    and float(budget.get('mnt') or 0) > 0

rows = [r for r in psql(
    "select id, coalesce(sku,''), body, coalesce(image_url,''), coalesce(fb_post_id,'') "
    "from ads_posts where status = 'approved' order by created_at").splitlines() if r.strip()]

if not rows:
    log('батлагдсан пост алга')
    sys.exit(0)

if not on:
    log(f'зар унтраалттай — {len(rows)} пост хүлээнэ')
    note(f'{len(rows)} батлагдсан пост хүлээж байна — зар унтраалттай тул нийтлээгүй')
    sys.exit(0)

# ── ② Ажиллаж байгаа зарын тохиргоог загвар болгоно ─────────────────────────
sets = [a for a in api_get(f'{ACCT}/adsets', {
    'fields': 'status,optimization_goal,billing_event,destination_type,promoted_object,targeting',
    'limit': 50, 'access_token': TOKEN})['data'] if a.get('status') == 'ACTIVE']
if not sets:
    log('идэвхтэй зар алга — загвар авах боломжгүй')
    note('Пост нийтлэгдээгүй: идэвхтэй зар байхгүй тул зорилтот бүлгийн загвар алга')
    sys.exit(0)
tpl = sets[0]

ok = err = 0
for line in rows:
    pid, sku, body, image, post_id = (line.split('|', 4) + [''] * 5)[:5]
    title = body.split('\n')[0][:60]
    try:
        # ③ Хуудсанд нийтлэх (зурагтай пост) — PAGE токеноор.
        if not post_id:
            if not image:
                raise RuntimeError('зураггүй пост — Facebook дээр уншигдахгүй')
            r = api_post(f'{PAGE_ID}/photos', {
                'url': image, 'caption': body, 'published': 'true',
                'access_token': PAGE_TOKEN})
            post_id = r.get('post_id') or f"{PAGE_ID}_{r.get('id')}"
            # ⚠ ШУУД хадгална — доорх зар үүсэхгүй байсан ч пост давхардахгүй.
            if not DRY:
                psql(f'update ads_posts set fb_post_id={sq(post_id)} where id={sq(pid)};')
            log(f'нийтлэв: {title} → {post_id}')

        # ④ Бүүст — зарын данс дээр SYSTEM токеноор.
        camp = api_post(f'{ACCT}/campaigns', {
            'name': f'Post: {title}', 'objective': 'OUTCOME_ENGAGEMENT',
            'status': 'ACTIVE', 'special_ad_categories': '[]', 'access_token': TOKEN})
        aset = api_post(f'{ACCT}/adsets', {
            'name': f'Post: {title}', 'campaign_id': camp['id'],
            'daily_budget': int(START_USD * 100),
            'billing_event': tpl.get('billing_event') or 'IMPRESSIONS',
            'optimization_goal': tpl.get('optimization_goal') or 'CONVERSATIONS',
            'destination_type': tpl.get('destination_type') or 'MESSENGER',
            'promoted_object': json.dumps({'page_id': PAGE_ID}),
            'targeting': json.dumps(tpl.get('targeting') or {}),
            'status': 'ACTIVE', 'access_token': TOKEN})
        cre = api_post(f'{ACCT}/adcreatives', {
            'name': f'Post: {title}', 'object_story_id': post_id, 'access_token': TOKEN})
        api_post(f'{ACCT}/ads', {
            'name': f'Post: {title}', 'adset_id': aset['id'],
            'creative': json.dumps({'creative_id': cre['id']}),
            'status': 'ACTIVE', 'access_token': TOKEN})

        if not DRY:
            psql(f"update ads_posts set status='published', published_at=now(), "
                 f"campaign_id={sq(camp['id'])}, error=null where id={sq(pid)};")
            psql('insert into fb_ad_actions (kind,campaign_id,campaign_name,reason) values '
                 f"('budget',{sq(camp['id'])},{sq('Post: ' + title)},"
                 f"{sq('шинэ пост нийтлэгдэж бүүст хийгдэв')});")
        ok += 1
        log(f'бүүст хийв: {title} → {camp["id"]}')
    except Exception as e:
        msg = str(e)
        if hasattr(e, 'read'):
            try:
                msg = e.read().decode('utf-8', 'replace')[:300]
            except Exception:
                pass
        err += 1
        log(f'⚠ {title}: {msg}')
        if not DRY:
            psql(f"update ads_posts set status='failed', error={sq(msg[:400])} where id={sq(pid)};")

log(f'дуусав: {ok} амжилттай, {err} алдаа' + (' [dry-run]' if DRY else ''))
