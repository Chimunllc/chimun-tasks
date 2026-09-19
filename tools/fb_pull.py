#!/usr/bin/env python3
# Facebook зарын өдрийн үзүүлэлтийг татаж fb_ads_daily руу бичнэ.
# Cron-оос ЦАГ ТУТАМ ажиллана. Сүүлийн N хоногийг ДАХИН татна — Meta тоогоо
# хожим залруулдаг тул зөвхөн өчигдрийг татвал буруу тоо хөлдөнө.
#
# ⛔ `date_preset=last_Nd` ХЭРЭГЛЭХГҮЙ (2026-09-17). Тэр нь **ӨНӨӨДРИЙГ
#    ОРОЛЦУУЛДАГГҮЙ** тул өдөржин зар мөнгө зарцуулж байхад аппад «өнөөдөр 0»
#    гэж харагдана — амьд системд «зарын үр дүн ерөөсөө шинэчлэгдэхгүй байна»
#    гэсэн гомдол яг эндээс төрсөн. `time_range` нь ӨНӨӨДРИЙГ хамруулна
#    (тоо нь хагас өдрийнх — цаг тутам дахин татагдаж гүйцээгдэнэ).
# ⚠ Өдөр нь **УБ-ийн цагаар** (UTC+8) тооцогдоно — серверийн UTC өдөр шөнө
#   дунд нэг өдрөөр хоцордог.
import csv, datetime, io, json, os, subprocess, sys, urllib.parse, urllib.request

ENV = '/opt/chimun/marketing/fb.env'
SELFTEST = '--selftest' in sys.argv        # тестэд fb.env шаардлагагүй
cfg = {}
if not SELFTEST:
    with open(ENV) as f:
        for line in f:
            line = line.strip()
            if line and not line.startswith('#') and '=' in line:
                k, v = line.split('=', 1)
                cfg[k.strip()] = v.strip()

TOKEN = cfg.get('FB_TOKEN', '')
ACCT = cfg.get('FB_ACCT', '')              # act_XXXX
RATE = float(cfg.get('FX_USD_MNT', '3600'))
DAYS = cfg.get('FB_DAYS', '7')
API = 'https://graph.facebook.com/v21.0'

FIELDS = ('date_start,ad_id,ad_name,adset_id,campaign_id,campaign_name,'
          'spend,impressions,reach,clicks,actions,action_values')


def get(url, params):
    q = urllib.parse.urlencode(params)
    with urllib.request.urlopen(f'{url}?{q}', timeout=90) as r:
        return json.load(r)


def act_val(actions, *types):
    n = 0
    for a in actions or []:
        if a.get('action_type') in types:
            n += int(float(a.get('value') or 0))
    return n


# ⛔ БОРЛУУЛАЛТ = `omni_purchase` (вэб + утсаар + офлайн бүгд), `purchase` нь
#   зөвхөн вэб. Хоёуланг нэмбэл нэг захиалга ХОЁР удаа тоологдоно — тиймээс
#   ИХИЙГ нь авна.
# ⚠ 0 гэдэг нь «борлуулалт болоогүй» гэсэн үг БИШ — Facebook худалдан авагчийг
#   утас/мэйлээр таньж чадаагүй ч байж болно (`fb_capi.py`-ийн тулгалт).
def purchase_n(actions):
    return max(act_val(actions, 'omni_purchase'), act_val(actions, 'purchase'))


def act_sum(values, *types):
    n = 0.0
    for a in values or []:
        if a.get('action_type') in types:
            n += float(a.get('value') or 0)
    return n


def purchase_usd(values):
    return max(act_sum(values, 'omni_purchase'), act_sum(values, 'purchase'))


def win(days, today):
    """Татах хугацааны хүрээ. ӨНӨӨДӨР ЗААВАЛ багтана. Цэвэр функц."""
    n = max(1, int(days or 1))
    return {'since': str(today - datetime.timedelta(days=n - 1)), 'until': str(today)}


def ub_today():
    return (datetime.datetime.now(datetime.timezone.utc)
            + datetime.timedelta(hours=8)).date()


def selftest():
    d = datetime.date(2026, 9, 17)
    bad = []
    if win(30, d) != {'since': '2026-08-19', 'until': '2026-09-17'}:
        bad.append('30 хоногийн хүрээ буруу: ' + str(win(30, d)))
    if win(1, d)['since'] != '2026-09-17':
        bad.append('1 хоног = зөвхөн өнөөдөр байх ёстой')
    if win(0, d)['until'] != '2026-09-17' or win('', d)['since'] != '2026-09-17':
        bad.append('хоосон/0 утга унах ёсгүй')
    # ⛔ Хамгийн чухал нь: ӨНӨӨДӨР хүрээнд багтана.
    if win(7, d)['until'] != str(d):
        bad.append('өнөөдөр багтаагүй — «үр дүн шинэчлэгдэхгүй» алдаа эргэж ирнэ')
    # ⛔ Нэг захиалга ХОЁР удаа тоологдож болохгүй (omni + web).
    acts = [{'action_type': 'purchase', 'value': '3'},
            {'action_type': 'omni_purchase', 'value': '3'}]
    if purchase_n(acts) != 3:
        bad.append('борлуулалт давхар тоологдов: ' + str(purchase_n(acts)))
    if purchase_n([{'action_type': 'omni_purchase', 'value': '5'}]) != 5:
        bad.append('зөвхөн omni ирвэл тоологдох ёстой')
    if purchase_n([]) != 0 or purchase_n(None) != 0:
        bad.append('хоосон үед 0 байх ёстой')
    vals = [{'action_type': 'purchase', 'value': '100.5'},
            {'action_type': 'omni_purchase', 'value': '250.25'}]
    if purchase_usd(vals) != 250.25:
        bad.append('орлого: их утга авах ёстой — ' + str(purchase_usd(vals)))
    if purchase_usd(None) != 0:
        bad.append('орлого: хоосон үед 0')
    if bad:
        print('❌ PULL FAIL')
        for x in bad:
            print('   · ' + x)
        sys.exit(1)
    print(f'✅ PULL OK — {9} тест')


if SELFTEST:
    selftest()
    sys.exit(0)

rows, url, params = [], f'{API}/{ACCT}/insights', {
    'access_token': TOKEN, 'level': 'ad', 'fields': FIELDS,
    'time_increment': 1, 'time_range': json.dumps(win(DAYS, ub_today())),
    'limit': 200,
}
while True:
    d = get(url, params)
    rows += d.get('data', [])
    nxt = (d.get('paging') or {}).get('next')
    if not nxt:
        break
    url, params = nxt, {}

# Бүүст хийсэн постын id — зар бүрийн creative-ээс (аль пост ажиллаж байгааг мэдэх).
posts = {}
for aid in {r['ad_id'] for r in rows}:
    try:
        c = get(f'{API}/{aid}', {'access_token': TOKEN,
                                 'fields': 'creative{effective_object_story_id}'})
        posts[aid] = ((c.get('creative') or {}).get('effective_object_story_id')) or ''
    except Exception:
        posts[aid] = ''

buf = io.StringIO()
w = csv.writer(buf, lineterminator='\n')
for r in rows:
    acts = r.get('actions')
    vals = r.get('action_values')
    rev_usd = purchase_usd(vals)
    spend = float(r.get('spend') or 0)
    w.writerow([json.dumps({
        'day': r['date_start'], 'ad_id': r['ad_id'], 'ad_name': r.get('ad_name'),
        'adset_id': r.get('adset_id'), 'campaign_id': r.get('campaign_id'),
        'campaign_name': r.get('campaign_name'), 'post_id': posts.get(r['ad_id']) or None,
        'spend_usd': spend, 'spend_mnt': round(spend * RATE),
        'impressions': int(r.get('impressions') or 0),
        'reach': int(r.get('reach') or 0),
        'clicks': int(r.get('clicks') or 0),
        'messages': act_val(acts, 'onsite_conversion.messaging_first_reply'),
        'leads': act_val(acts, 'lead', 'onsite_conversion.lead_grouped'),
        'purchases': purchase_n(acts),
        'revenue_usd': round(rev_usd, 2), 'revenue_mnt': round(rev_usd * RATE),
        'raw': acts,
    }, ensure_ascii=False)])

SQL = r"""
create temp table stg (j jsonb);
\copy stg (j) from stdin with (format csv)
__CSV__\.
insert into fb_ads_daily
  (day, ad_id, ad_name, adset_id, campaign_id, campaign_name, post_id,
   spend_usd, spend_mnt, impressions, reach, clicks, messages, leads,
   purchases, revenue_usd, revenue_mnt, raw, fetched_at)
select (j->>'day')::date, j->>'ad_id', j->>'ad_name', j->>'adset_id',
       j->>'campaign_id', j->>'campaign_name', j->>'post_id',
       (j->>'spend_usd')::numeric, (j->>'spend_mnt')::bigint,
       (j->>'impressions')::bigint, (j->>'reach')::bigint, (j->>'clicks')::bigint,
       (j->>'messages')::int, (j->>'leads')::int,
       (j->>'purchases')::int, (j->>'revenue_usd')::numeric, (j->>'revenue_mnt')::bigint,
       j->'raw', now()
from stg
on conflict (day, ad_id) do update set
  ad_name = excluded.ad_name, adset_id = excluded.adset_id,
  campaign_id = excluded.campaign_id, campaign_name = excluded.campaign_name,
  post_id = coalesce(excluded.post_id, fb_ads_daily.post_id),
  spend_usd = excluded.spend_usd, spend_mnt = excluded.spend_mnt,
  impressions = excluded.impressions, reach = excluded.reach,
  clicks = excluded.clicks, messages = excluded.messages,
  leads = excluded.leads, purchases = excluded.purchases,
  revenue_usd = excluded.revenue_usd, revenue_mnt = excluded.revenue_mnt,
  raw = excluded.raw, fetched_at = now();
"""

if not rows:
    print('fb_pull: мөр ирсэнгүй (зар ажиллаагүй байж болно)')
    sys.exit(0)

p = subprocess.run(['docker', 'exec', '-i', 'vps-deploy-postgres-1',
                    'psql', '-U', 'chimun', '-d', 'chimun', '-v', 'ON_ERROR_STOP=1'],
                   input=SQL.replace('__CSV__', buf.getvalue()), text=True, capture_output=True)
sys.stdout.write(p.stdout)
sys.stderr.write(p.stderr)
print(f'fb_pull: {len(rows)} мөр')
sys.exit(p.returncode)
