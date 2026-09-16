#!/usr/bin/env python3
# Сарын төсвийг өдрийн төсөв болгон хувааж, үр дүнтэй зар руу шилжүүлнэ.
# VPS: /opt/chimun/marketing/fb_budget.py, cron 10 минут тутам.
# Төсөв нь аппын «Зар & үр дүн» дэлгэцээс тавигдана (app_config['ads_budget']).
#
# ⛔ ГУРВАН ХААЛТ (аль нэг нь ажиллахаа больсон ч мөнгө хамгаалагдана):
#   ① Meta-гийн ДАНСНЫ hard cap — энэ скрипт унасан ч Facebook өөрөө зогсооно
#   ② Өдрийн төсөв — нэг шөнөдөө сарын төсөв шатахгүй
#   ③ enabled=false (аппын «Бүх зар зогсоо») — бүх кампанит ажил PAUSED
#
# ⚠ ШИНЭ ЗАР ҮҮСГЭХГҮЙ. Зөвхөн БАЙГАА кампанит ажлуудын хооронд төсөв
#   шилжүүлнэ. Зураг/бичвэр зохиох нь хүний ажил — тэнд мөнгө үрэгддэг.
import json, subprocess, sys, urllib.parse, urllib.request
from datetime import date, timedelta

ENV = '/opt/chimun/marketing/fb.env'
cfg = {}
with open(ENV) as f:
    for line in f:
        line = line.strip()
        if line and not line.startswith('#') and '=' in line:
            k, v = line.split('=', 1)
            cfg[k.strip()] = v.strip()

TOKEN, ACCT = cfg['FB_TOKEN'], cfg['FB_ACCT']
RATE = float(cfg.get('FX_USD_MNT', '3600'))
API = 'https://graph.facebook.com/v21.0'
MIN_MSG = 3            # үүнээс цөөн чаттай зарын өртөг = шуугиан
MIN_DAILY_USD = 1.0    # Meta-гийн доод хязгаар


def api_get(path, params):
    url = f'{API}/{path}?' + urllib.parse.urlencode(dict(params, access_token=TOKEN))
    with urllib.request.urlopen(url, timeout=60) as r:
        return json.load(r)


def api_post(path, params):
    data = urllib.parse.urlencode(dict(params, access_token=TOKEN)).encode()
    req = urllib.request.Request(f'{API}/{path}', data=data, method='POST')
    with urllib.request.urlopen(req, timeout=60) as r:
        return json.load(r)


def psql(sql):
    p = subprocess.run(['docker', 'exec', '-i', 'vps-deploy-postgres-1', 'psql',
                        '-U', 'chimun', '-d', 'chimun', '-At', '-F', '|', '-c', sql],
                       text=True, capture_output=True)
    if p.returncode:
        raise SystemExit('psql: ' + p.stderr.strip())
    return p.stdout.strip()


def log(msg):
    print(f'{date.today()} fb_budget: {msg}', flush=True)


# ── Шийдвэрийн бүртгэл (`fb_ad_actions`) ─────────────────────────────────────
# ⛔ ЗӨВХӨН ӨӨРЧЛӨЛТ бичнэ. Скрипт 10 минут тутам ажилладаг тул тоо хэвээр
#   байхад мөр нэмбэл өдөрт 144 мөр хуримтлагдаж бүртгэл ашиггүй болно.
ACTIONS = []


def sq(v):
    """SQL мөрийн утга — хашилтыг хамгаална (зарын нэрэнд " ба ' байдаг)."""
    return 'null' if v is None else "'" + str(v).replace("'", "''") + "'"


def sn(v):
    return 'null' if v is None else repr(round(float(v), 2))


def record(kind, cid, name, old, new, reason):
    ACTIONS.append((kind, cid, name, old, new, reason))


def changed(old, new):
    """Мөнгөн дүн үнэхээр өөрчлөгдсөн үү (1 центээс бага зөрүүг тоохгүй)."""
    if old is None:
        return True
    return abs(float(old) - float(new)) >= 0.01


# ⛔ АЛДААГ ДАВТАЖ БИЧИХГҮЙ. Алдаа нь өөрчлөлт биш ТӨЛӨВ — засагдтал 10 минут
#   тутам давтагдана (өдөрт 144 ижил мөр). Тиймээс ижил алдаа сүүлийн 6 цагт
#   бүртгэгдсэн бол дахин бичихгүй. Төсөв/зогсоолт нь аль хэдийн
#   `changed()`-ээр хаалттай тул энэ нь зөвхөн алдаанд хэрэгтэй.
ERR_QUIET_H = 6


def flush_actions():
    if not ACTIONS:
        return
    stmts = []
    for k, c, nm, o, nv, r in ACTIONS:
        row = (f'select {sq(k)},{sq(c)},{sq(nm)},{sn(o)},{sn(nv)},{sq(r)}')
        if k == 'error':
            row += (f" where not exists (select 1 from fb_ad_actions"
                    f" where kind='error' and coalesce(campaign_id,'')=coalesce({sq(c)},'')"
                    f" and reason={sq(r)} and at > now() - interval '{ERR_QUIET_H} hours')")
        stmts.append('insert into fb_ad_actions '
                     '(kind,campaign_id,campaign_name,old_val,new_val,reason) ' + row + ';')
    psql('\n'.join(stmts))


def save_state(camps, plan):
    if not camps:
        return
    vals = ',\n  '.join(
        f'({sq(c["id"])},{sq(c.get("name"))},{sq(c.get("status"))},'
        f'{sq(c.get("effective_status"))},{sn(plan.get(c["id"]))},now())'
        for c in camps)
    psql('insert into fb_campaign_state (campaign_id,name,status,effective_status,daily_usd,updated_at) '
         f'values\n  {vals} '
         'on conflict (campaign_id) do update set name=excluded.name, status=excluded.status, '
         'effective_status=excluded.effective_status, daily_usd=excluded.daily_usd, '
         'updated_at=excluded.updated_at;')


def pause_all(camps, why):
    n = 0
    for c in camps:
        if c.get('status') == 'ACTIVE':
            try:
                api_post(c['id'], {'status': 'PAUSED'}); n += 1
                record('pause', c['id'], c.get('name'), None, None, why)
            except Exception as e:
                log(f'⚠ {c["name"]} зогссонгүй: {e}')
                record('error', c['id'], c.get('name'), None, None, f'зогссонгүй: {e}')
    log(f'{why} → {n} кампанит ажил зогсоов')


raw = psql("select coalesce(value::text,'') from app_config where key='ads_budget'")
if not raw:
    log('төсөв тавиагүй — юу ч хийхгүй'); sys.exit(0)
budget = json.loads(raw)
today = date.today()
month = today.strftime('%Y-%m')
enabled = bool(budget.get('enabled'))
plan_mnt = float(budget.get('mnt') or 0)
plan_month = str(budget.get('month') or '')

camps = api_get(f'{ACCT}/campaigns',
                {'fields': 'name,status,effective_status,daily_budget', 'limit': 100})['data']

# ③ Унтраалт / өөр сарын төсөв / 0 төсөв — бүгдийг зогсооно
if not enabled or plan_month != month or plan_mnt <= 0:
    why = ('унтраалттай' if not enabled
           else 'өөр сарын төсөв' if plan_month != month else 'төсөв 0')
    pause_all(camps, why)
    save_state(camps, {}); flush_actions(); sys.exit(0)

ins = api_get(f'{ACCT}/insights', {'fields': 'spend', 'time_range': json.dumps(
    {'since': today.replace(day=1).isoformat(), 'until': today.isoformat()})})
spent_usd = float((ins.get('data') or [{}])[0].get('spend') or 0)
plan_usd = plan_mnt / RATE
left_usd = max(0.0, plan_usd - spent_usd)
nxt = (today.replace(day=28) + timedelta(days=4)).replace(day=1)
days_left = (nxt - today).days                      # өнөөдрийг оруулаад

# ① Дансны hard cap — cap нь ХУРИМТЛАГДСАН тоо тул нийт зарцуулалт дээр нэмнэ
acct = api_get(ACCT, {'fields': 'amount_spent,spend_cap'})
cap_old = float(acct.get('spend_cap') or 0) / 100.0
cap_usd = round(float(acct.get('amount_spent') or 0) / 100.0 + left_usd, 2)
try:
    if changed(cap_old, cap_usd):
        api_post(ACCT, {'spend_cap': int(round(cap_usd * 100))})
        record('cap', None, None, cap_old, cap_usd, 'сарын төсвийн дээд хязгаар')
except Exception as e:
    log(f'⚠ hard cap тавигдсангүй: {e}')
    record('error', None, None, cap_old, cap_usd,
           'дансны хатуу хязгаар тавигдсангүй — систем хэрэглэгчид дансны бүрэн эрх алга')

if left_usd <= 0.01:
    pause_all(camps, f'сарын төсөв дууссан (${spent_usd:.2f}/${plan_usd:.2f})')
    save_state(camps, {}); flush_actions(); sys.exit(0)

daily_total = left_usd / max(1, days_left)

since = (today - timedelta(days=14)).isoformat()
perf = {}
for ln in psql(f"""select campaign_id, sum(spend_usd), sum(messages)
                   from fb_ads_daily where day >= '{since}' group by 1""").splitlines():
    if ln.strip():
        cid, sp, msg = ln.split('|')
        perf[cid] = {'spend': float(sp or 0), 'msg': int(msg or 0)}

active = [c for c in camps if c.get('status') == 'ACTIVE']
if not active:
    log('идэвхтэй кампанит ажил алга'); sys.exit(0)

# Жин = 1 доллараар хэдэн чат ирсэн. Хангалттай чатгүй бол дунджийн 60%
# (шинэ зарыг бүрэн хаахгүй — тест хийх зай үлдээнэ).
weights = {}
for c in active:
    p = perf.get(c['id'], {})
    weights[c['id']] = (p['msg'] / p['spend']) if (p.get('msg', 0) >= MIN_MSG and p.get('spend', 0) > 0) else None
known = [w for w in weights.values() if w]
avg = sum(known) / len(known) if known else 1.0
for k in weights:
    if weights[k] is None:
        weights[k] = avg * 0.6
wsum = sum(weights.values()) or 1.0
plan = {c['id']: max(MIN_DAILY_USD, round(daily_total * weights[c['id']] / wsum, 2)) for c in active}

# ② Өдрийн төсөв — кампанит ажил дээр (CBO) эсвэл түүний adset-үүд дээр
by_camp = {}
for a in api_get(f'{ACCT}/adsets',
                 {'fields': 'campaign_id,status,daily_budget', 'limit': 200})['data']:
    if a.get('status') == 'ACTIVE':
        by_camp.setdefault(a['campaign_id'], []).append(a)

for c in active:
    want = plan[c['id']]
    p = perf.get(c['id'], {})
    why = (f'1$ = {p["msg"] / p["spend"]:.2f} чат (14 хоног)'
           if p.get('msg', 0) >= MIN_MSG and p.get('spend', 0) > 0
           else f'чат {p.get("msg", 0)} — дүгнэхэд хангалтгүй, дунджийн 60%')
    try:
        if c.get('daily_budget'):
            old = float(c['daily_budget']) / 100.0
            if changed(old, want):
                api_post(c['id'], {'daily_budget': int(round(want * 100))})
                record('budget', c['id'], c.get('name'), old, want, why)
        else:
            sets = by_camp.get(c['id']) or []
            if not sets:
                log(f'⚠ {c["name"]}: идэвхтэй adset алга — төсөв тавигдсангүй')
                record('error', c['id'], c.get('name'), None, want, 'идэвхтэй adset алга')
                continue
            each = max(MIN_DAILY_USD, round(want / len(sets), 2))
            old_tot = sum(float(a.get('daily_budget') or 0) for a in sets) / 100.0
            hit = False
            for a in sets:
                if changed(float(a.get('daily_budget') or 0) / 100.0, each):
                    api_post(a['id'], {'daily_budget': int(round(each * 100))}); hit = True
            if hit:
                record('budget', c['id'], c.get('name'), old_tot, each * len(sets), why)
    except Exception as e:
        log(f'⚠ {c["name"]}: төсөв тавигдсангүй — {e}')
        record('error', c['id'], c.get('name'), None, want, f'төсөв тавигдсангүй: {e}')

log(f'төсөв {plan_mnt:,.0f}₮ · зарцуулсан ${spent_usd:.2f} · үлдсэн ${left_usd:.2f} · '
    f'{days_left} хоног · өдөрт ${daily_total:.2f} · cap ${cap_usd:.2f}')
for c in active:
    log(f'  {c["name"]}: ${plan[c["id"]]:.2f}/өдөр')

save_state(camps, plan)
flush_actions()
