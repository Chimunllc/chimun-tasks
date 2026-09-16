#!/usr/bin/env python3
# Facebook зарын өдрийн үзүүлэлтийг татаж fb_ads_daily руу бичнэ.
# Cron-оос өдөр бүр ажиллана. Сүүлийн 7 хоногийг ДАХИН татна — Meta тоогоо
# хожим залруулдаг тул зөвхөн өчигдрийг татвал буруу тоо хөлдөнө.
import csv, io, json, os, subprocess, sys, urllib.parse, urllib.request

ENV = '/opt/chimun/marketing/fb.env'
cfg = {}
with open(ENV) as f:
    for line in f:
        line = line.strip()
        if line and not line.startswith('#') and '=' in line:
            k, v = line.split('=', 1)
            cfg[k.strip()] = v.strip()

TOKEN = cfg['FB_TOKEN']
ACCT = cfg['FB_ACCT']                      # act_XXXX
RATE = float(cfg.get('FX_USD_MNT', '3600'))
DAYS = cfg.get('FB_DAYS', '7')
API = 'https://graph.facebook.com/v21.0'

FIELDS = ('date_start,ad_id,ad_name,adset_id,campaign_id,campaign_name,'
          'spend,impressions,reach,clicks,actions')


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


rows, url, params = [], f'{API}/{ACCT}/insights', {
    'access_token': TOKEN, 'level': 'ad', 'fields': FIELDS,
    'time_increment': 1, 'date_preset': f'last_{DAYS}d', 'limit': 200,
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
        'raw': acts,
    }, ensure_ascii=False)])

SQL = r"""
create temp table stg (j jsonb);
\copy stg (j) from stdin with (format csv)
__CSV__\.
insert into fb_ads_daily
  (day, ad_id, ad_name, adset_id, campaign_id, campaign_name, post_id,
   spend_usd, spend_mnt, impressions, reach, clicks, messages, leads, raw, fetched_at)
select (j->>'day')::date, j->>'ad_id', j->>'ad_name', j->>'adset_id',
       j->>'campaign_id', j->>'campaign_name', j->>'post_id',
       (j->>'spend_usd')::numeric, (j->>'spend_mnt')::bigint,
       (j->>'impressions')::bigint, (j->>'reach')::bigint, (j->>'clicks')::bigint,
       (j->>'messages')::int, (j->>'leads')::int, j->'raw', now()
from stg
on conflict (day, ad_id) do update set
  ad_name = excluded.ad_name, adset_id = excluded.adset_id,
  campaign_id = excluded.campaign_id, campaign_name = excluded.campaign_name,
  post_id = coalesce(excluded.post_id, fb_ads_daily.post_id),
  spend_usd = excluded.spend_usd, spend_mnt = excluded.spend_mnt,
  impressions = excluded.impressions, reach = excluded.reach,
  clicks = excluded.clicks, messages = excluded.messages,
  leads = excluded.leads, raw = excluded.raw, fetched_at = now();
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
