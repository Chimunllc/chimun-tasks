#!/usr/bin/env python3
"""
att_notify.py — Ирцийн автомат мэдэгдэл (хэн нэгэн апп нээхийг ХҮЛЭЭХГҮЙ). VPS cron: 10 минут тутам ажлын өдөр, `flock`.

  */10 8-20 * * 1-5 flock -n /tmp/att_notify.lock python3 /opt/chimun/marketing/att_notify.py >> /var/log/att_notify.log 2>&1

Гурван мэдэгдэл (ҮАЗ-ын даалгавар, 2026-11-14):
  ① 10:00 — QR уншуулаагүй, чөлөөгүй ажилтанд ӨӨРТ нь сануулга («чөлөөтэй бол хүсэлт илгээ»). 10:00–12:00 цонхонд л (хожуу ажиллавал
     «10 цаг болсон» гэж орой илгээхгүй).
  ② 19:00-аас — өдөр дуусахад тасалсан болсон бол ажилтанд өөрт нь + ҮАЗ/CEO-д (нэг хүнд НЭГ нэгтгэсэн мэдэгдэл).
  ③ 19:00-аас — 2+ ажлын өдөр дараалан тасалсан хүн байвал ҮАЗ/CEO-д анхааруулга.

⛔ ТӨЛӨВИЙГ ЭНД ЗОХИОХГҮЙ. «Ажиллах өдөр», «чөлөөтэй» гэсэн дүрэм = аппын `attLeaveExpected` / `attDayStatus` (app.js). Энэ скрипт зөвхөн
   «хэзээ, хэнд сануулах» гэдгийг шийднэ. Тиймээс `expected()` ба `covered()` апптай ИЖИЛ байх ёстой — test/run.js нэг өгөгдлийг JS ба
   Python хоёуланд өгч тулгана (`--plan fixture.json`). Нэгийг засвал нөгөөг.
⛔ `app_config['att_leave'].from` хоосон бол ЮУ Ч илгээхгүй (чөлөөний бүртгэл унтраалттай = мэдэгдэл ч үгүй). `from`-оос өмнөх өдөр хөндөгдөхгүй.
⛔ Мэдэгдэл ДАВХАР явахгүй: `app_config['att_notify_sent']` (зөвхөн энэ скрипт бичнэ — эзний эрхээр RLS-ийг алгасдаг). Түлхүүр = төрөл|өдөр|утас.
   Push амжилттай явсны ДАРАА л бичигдэнэ (унавал дараагийн ажиллагаанд дахин оролдоно).
⛔ Push-ийн `email` талбар ЗААВАЛ тодорхой утас — хоосон бол БҮГД ажилтанд очно (`push-broadcast`).
⚠ Хүлээн авагч (ҮАЗ/CEO) = `app_config['att_notify']` → {"to": ["утас", …]}; байхгүй бол `pbx_notify`; байхгүй бол `level >= 100` ажилтан.
⚠ Хүн = `staff_salary.amount > 0` (аппын `attStaffCandidates` — цалинтай үндсэн ажилтан). Цагийн ажилтан орохгүй.

Тест:    python3 tools/att_notify.py --selftest
Хуурай:  python3 tools/att_notify.py --dry          (DB уншина, ЮУ Ч илгээхгүй/бичихгүй)
Тулгалт: python3 tools/att_notify.py --plan fixture.json   (test/run.js дууддаг; DB/сүлжээнд хүрэхгүй)
"""
import json
import re
import subprocess
import sys
import urllib.request
from datetime import datetime, timedelta, timezone

CONTAINER = 'vps-deploy-postgres-1'
PUSH_ENV = '/opt/chimun/marketing/fb.env'
PUSH_URL = 'https://n8n.nomaadcamp.com/webhook/push-broadcast'
UB = timezone(timedelta(hours=8))
DAY_MS = 24 * 3600 * 1000
AM_FROM, AM_TO = '10:00', '12:00'   # ① сануулгын цонх
EVENING = '19:00'                   # ②③ өдрийн төгсгөл
LOOKBACK = 14                       # дараалсан тасалсан өдрийг хэр хойш харах
DRY = '--dry' in sys.argv
COVER_KINDS = ('unpaid', 'paid', 'vacation', 'sick', 'present', 'absent')   # батлагдсан мөр (нөхөлт БИШ)


def digits(s):
    return re.sub(r'\D', '', str(s or ''))


def ub_now(ms):
    return datetime.fromtimestamp(ms / 1000, UB)


def add_days(day, n):
    return (datetime.strptime(day, '%Y-%m-%d') + timedelta(days=n)).strftime('%Y-%m-%d')


def is_weekday(day):
    return datetime.strptime(day, '%Y-%m-%d').weekday() < 5


def valid_day(s):
    return bool(re.match(r'^\d{4}-\d{2}-\d{2}$', str(s or '')))


def cfg_of(raw):
    """`att_leave` тохиргоо → {from, holidays}. Аппын `attLeaveCfg`-ийн толь."""
    c = raw if isinstance(raw, dict) else {}
    hol = [str(x)[:10] for x in (c.get('holidays') or []) if valid_day(str(x)[:10])]
    return {'from': str(c.get('from')) if valid_day(c.get('from')) else '', 'holidays': hol}


def expected(person, day, cfg, callins):
    """Аппын `attLeaveExpected`: идэвхжсэн · ажилд орсноос хойш · баяр биш · Да–Ня эсвэл хуваарьтай."""
    if not cfg['from'] or day < cfg['from']:
        return False
    j = str(person.get('joined') or '')[:10]
    if valid_day(j) and day < j:
        return False
    if day in cfg['holidays']:
        return False
    return is_weekday(day) or (person['phone'], day) in callins


def covered(phone, day, leaves):
    """Батлагдсан мөр (чөлөө, амралт, өвчтэй, гар засвар) тэр өдрийг хамарсан эсэх — хэн нэгэн аль хэдийн шийдсэн."""
    for r in leaves:
        if r.get('phone') == phone and r.get('kind') in COVER_KINDS and str(r.get('from')) <= day <= str(r.get('to')):
            return True
    return False


def absent_on(person, day, cfg, callins, leaves, att):
    """Тасалсан = ажиллах өдөр, ирц БАЙХГҮЙ, хэн ч шийдээгүй."""
    return expected(person, day, cfg, callins) and (person['phone'], day) not in att and not covered(person['phone'], day, leaves)


def streak(person, upto, cfg, callins, leaves, att):
    """`upto` өдрөөс хойш гүйж дараалсан тасалсан АЖЛЫН өдрийн тоо. Ажлын бус өдөр (амралт, баяр) үргэлжлүүлнэ; ирсэн/чөлөөтэй өдөр таслана."""
    n, d = 0, upto
    for _ in range(LOOKBACK + 10):
        if d < cfg['from']:
            break
        if expected(person, d, cfg, callins):
            if absent_on(person, d, cfg, callins, leaves, att):
                n += 1
            else:
                break
        d = add_days(d, -1)
    return n


def names_text(items, n=6):
    names = [x for x in items if x]
    txt = ', '.join(names[:n])
    return txt + (' +%d' % (len(names) - n) if len(names) > n else '')


def plan(ctx):
    """→ [{key, to, kind, title, body, url}]. Цэвэр функц (DB/сүлжээгүй).
    ctx = {now (ms), cfg, people:[{phone,name,joined}], att:[[phone,day]], leaves:[{phone,from,to,kind}], callins:[[phone,day]], sent:{}, managers:[phone]}"""
    now = ub_now(ctx['now'])
    today, hm = now.strftime('%Y-%m-%d'), now.strftime('%H:%M')
    cfg = cfg_of(ctx.get('cfg'))
    if not cfg['from'] or today < cfg['from']:
        return []
    att = {(digits(p), d) for p, d in ctx.get('att', [])}
    callins = {(digits(p), d) for p, d in ctx.get('callins', [])}
    leaves = [dict(r, phone=digits(r.get('phone'))) for r in ctx.get('leaves', [])]
    people = [dict(p, phone=digits(p.get('phone'))) for p in ctx.get('people', []) if len(digits(p.get('phone'))) >= 8]
    sent, mgrs = ctx.get('sent', {}), [digits(m) for m in ctx.get('managers', []) if len(digits(m)) >= 6]
    out = []

    def add(kind, to, title, body, url, key_extra=''):
        key = '%s|%s|%s%s' % (kind, today, to, key_extra)
        if key not in sent:
            out.append({'key': key, 'to': to, 'kind': kind, 'title': title, 'body': body[:160], 'url': url})

    miss = [p for p in people if absent_on(p, today, cfg, callins, leaves, att)]
    if AM_FROM <= hm < AM_TO:
        for p in miss:   # ① 10:00 — өөрт нь
            add('am10', p['phone'], '⏰ Ирц бүртгэгдээгүй байна', 'Өнөөдөр ирцээ бүртгүүлээгүй байна. Чөлөөтэй бол «Миний ирц» дээр хүсэлт илгээнэ үү.', './#myattend')
    if hm >= EVENING:
        for p in miss:   # ② өөрт нь
            add('absent', p['phone'], '❌ Өнөөдөр тасалсан гэж бүртгэгдлээ', 'Ирц бүртгэгдээгүй, чөлөөний хүсэлтгүй. Алдаа бол удирдлагад хэлнэ үү.', './#myattend')
        if miss:         # ② ҮАЗ/CEO-д нэг нэгтгэсэн
            for m in mgrs:
                add('absent_mgr', m, '❌ Өнөөдөр тасалсан: %d' % len(miss), names_text([p.get('name') for p in miss]), './#leaves')
        long = []        # ③ 2+ өдөр дараалан
        for p in people:
            n = streak(p, today, cfg, callins, leaves, att)
            if n >= 2:
                long.append((p.get('name') or p['phone'], n))
        if long:
            for m in mgrs:
                add('streak', m, '⚠ %d ажилтан 2+ өдөр дараалан тасалсан' % len(long),
                    names_text(['%s (%d)' % x for x in sorted(long, key=lambda x: -x[1])]), './#leaves')
    return out


# ── DB / push ────────────────────────────────────────────────────────────────
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
    p = subprocess.run(['docker', 'exec', '-i', CONTAINER, 'psql', '-U', 'chimun', '-d', 'chimun',
                        '-v', 'ON_ERROR_STOP=1', '-t', '-A', '-c', sql], capture_output=True, text=True)
    if p.returncode:
        raise SystemExit('psql: ' + p.stderr.strip())
    return p.stdout.strip()


def psql_json(sql):
    out = psql(sql)
    return json.loads(out) if out else None


def push(secret, phone, payload):
    body = dict(payload, internal=secret, email=phone)   # ⛔ email хоосон = БҮГДЭД
    req = urllib.request.Request(PUSH_URL, data=json.dumps(body).encode(),
                                 headers={'Content-Type': 'application/json'}, method='POST')
    with urllib.request.urlopen(req, timeout=30) as r:
        return r.status


def recipients(cfg):
    out = []
    for v in (cfg or {}).get('to') or []:
        d = digits(v)
        if len(d) >= 6 and d not in out:
            out.append(d)
    return out


def load_ctx(now):
    cfg = psql_json("select value from app_config where key = 'att_leave'") or {}
    ctx = {'now': now, 'cfg': cfg}
    if not cfg_of(cfg)['from']:
        return ctx
    ub = "(now() at time zone 'Asia/Ulaanbaatar')::date"
    ctx['people'] = psql_json(
        "select coalesce(json_agg(json_build_object('phone', p, 'name', n, 'joined', j)), '[]') from ("
        "select distinct on (p) regexp_replace(coalesce(e.phone, ''), '\\D', '', 'g') p, e.name n, e.joined_at j from employees e "
        "join staff_salary s on regexp_replace(coalesce(s.person_key, ''), '\\D', '', 'g') = regexp_replace(coalesce(e.phone, ''), '\\D', '', 'g') "
        "where e.merged_into is null and coalesce(e.status, '') <> 'гарсан' and s.amount > 0 order by p, e.pk) x") or []
    ctx['att'] = psql_json(
        "select coalesce(json_agg(json_build_array(p, d)), '[]') from (select distinct regexp_replace(member_key, '\\D', '', 'g') p, day::text d "
        "from attendance where day >= %s - %d) x" % (ub, LOOKBACK + 10)) or []
    ctx['leaves'] = psql_json(
        "select coalesce(json_agg(json_build_object('phone', regexp_replace(member_key, '\\D', '', 'g'), 'from', from_day::text, 'to', to_day::text, 'kind', kind)), '[]') "
        "from att_leaves where status = 'approved' and kind <> 'makeup' and to_day >= %s - %d" % (ub, LOOKBACK + 10)) or []
    ctx['callins'] = psql_json(
        "select coalesce(json_agg(json_build_array(member_key, day::text)), '[]') from att_callins where status = 'active' and day >= %s - %d"
        % (ub, LOOKBACK + 10)) or []
    mg = recipients(psql_json("select value from app_config where key = 'att_notify'")) or recipients(psql_json("select value from app_config where key = 'pbx_notify'"))
    if not mg:
        rows = psql_json("select coalesce(json_agg(regexp_replace(coalesce(phone, ''), '\\D', '', 'g')), '[]') from employees "
                         "where merged_into is null and coalesce(status, '') <> 'гарсан' and level >= 100") or []
        mg = [d for d in rows if len(d) >= 6]
    ctx['managers'] = mg
    ctx['sent'] = psql_json("select value from app_config where key = 'att_notify_sent'") or {}
    return ctx


def main():
    now = int(datetime.now(UB).timestamp() * 1000)
    ctx = load_ctx(now)
    if not cfg_of(ctx.get('cfg'))['from']:
        print('%s att_notify: чөлөөний бүртгэл унтраалттай (from хоосон) — илгээсэнгүй' % ub_now(now).strftime('%Y-%m-%d'))
        return
    msgs = plan(ctx)
    if DRY:
        print(json.dumps({'now': now, 'messages': msgs}, ensure_ascii=False))
        return
    if not msgs:
        return   # илгээх юм алга — чимээгүй (өдөр бүр лог дүүргэхгүй)
    secret = load_env(PUSH_ENV).get('PUSH_INTERNAL_KEY')
    if not secret:
        print('%s att_notify: PUSH_INTERNAL_KEY алга' % ub_now(now).strftime('%Y-%m-%d'))
        return
    sent, ok, fail = dict(ctx.get('sent') or {}), 0, 0
    for m in msgs:
        try:
            push(secret, m['to'], {'kind': 'attendance', 'title': m['title'], 'body': m['body'], 'url': m['url']})
            sent[m['key']] = now
            ok += 1
        except Exception as e:   # key бичигдээгүй → дараагийн ажиллагаанд дахин оролдоно
            fail += 1
            print('%s att_notify: push алдаа %s: %s' % (ub_now(now).strftime('%Y-%m-%d'), m['key'], e))
    cutoff = now - 45 * DAY_MS
    sent = {k: v for k, v in sent.items() if isinstance(v, (int, float)) and v >= cutoff}
    lit = json.dumps(sent, ensure_ascii=False).replace("'", "''")
    psql("insert into app_config (key, value, updated_at) values ('att_notify_sent', '%s'::jsonb, now()) "
         "on conflict (key) do update set value = excluded.value, updated_at = now()" % lit)
    print('%s att_notify: илгээв %d, алдаа %d' % (ub_now(now).strftime('%Y-%m-%d'), ok, fail))


def at(day, hm):
    return int(datetime.strptime(day + ' ' + hm, '%Y-%m-%d %H:%M').replace(tzinfo=UB).timestamp() * 1000)


def selftest():
    f = []

    def eq(name, got, want):
        if got != want:
            f.append('%s: хүлээсэн %r, ирсэн %r' % (name, want, got))

    P = [{'phone': '99112233', 'name': 'Бат', 'joined': ''}, {'phone': '99112244', 'name': 'Сүх', 'joined': '2026-11-16'}]
    base = {'cfg': {'from': '2026-11-02', 'holidays': ['2026-11-12']}, 'people': P, 'att': [], 'leaves': [], 'callins': [], 'sent': {}, 'managers': ['88001122']}
    T = '2026-11-18'   # Лхагва
    kinds = lambda ctx: sorted((m['kind'], m['to']) for m in plan(ctx))
    # ① 10:00
    eq('09:59 — үгүй', kinds(dict(base, now=at(T, '09:59'))), [])
    eq('10:00 — ирээгүй хоёр ажилтанд өөрт нь', kinds(dict(base, now=at(T, '10:00'))), [('am10', '99112233'), ('am10', '99112244')])
    P2 = [{'phone': '99112233', 'name': 'Бат', 'joined': ''}, {'phone': '99112244', 'name': 'Сүх', 'joined': '2026-12-01'}]
    eq('ажилд орохоос өмнө = ажиллах өдөр биш', [x['to'] for x in plan(dict(base, people=P2, now=at(T, '10:05')))], ['99112233'])
    eq('12:00 — цонх хаагдсан (орой «10 цаг болсон» гэж илгээхгүй)', [x for x in kinds(dict(base, now=at(T, '12:00'))) if x[0] == 'am10'], [])
    eq('ирсэн хүнд үгүй', [x['to'] for x in plan(dict(base, att=[['99112233', T]], now=at(T, '10:05')))], ['99112244'])
    eq('чөлөөтэй хүнд үгүй', [x['to'] for x in plan(dict(base, leaves=[{'phone': '99112233', 'from': T, 'to': T, 'kind': 'paid'}], now=at(T, '10:05')))], ['99112244'])
    eq('нөхөлтийн мөр чөлөө БИШ (аппад дамжуулдаггүй)', len(plan(dict(base, leaves=[], now=at(T, '10:05')))), 2)
    eq('давхар илгээхгүй', plan(dict(base, sent={'am10|%s|99112233' % T: 1, 'am10|%s|99112244' % T: 1}, now=at(T, '10:05'))), [])
    # ажлын бус өдөр, баяр, идэвхжихээс өмнө
    eq('бямба — үгүй', plan(dict(base, now=at('2026-11-21', '10:05'))), [])
    eq('баярын өдөр — үгүй', plan(dict(base, now=at('2026-11-12', '10:05'))), [])
    eq('идэвхжихээс өмнө — үгүй', plan(dict(base, now=at('2026-11-01', '10:05'))), [])
    eq('from хоосон = ЮУ Ч үгүй', plan(dict(base, cfg={}, now=at(T, '19:30'))), [])
    # хуваарьтай бямба = ажиллах өдөр
    eq('хуваарьтай бямба — ажиллах', [x['to'] for x in plan(dict(base, callins=[['99112233', '2026-11-21']], now=at('2026-11-21', '10:05')))], ['99112233'])
    # ② өдрийн төгсгөл
    m = plan(dict(base, now=at(T, '19:00')))
    eq('19:00 — ажилтанд + ҮАЗ-д нэгтгэсэн (+ 11-17, 11-18 дараалан → анхааруулга)', sorted((x['kind'], x['to']) for x in m),
       [('absent', '99112233'), ('absent', '99112244'), ('absent_mgr', '88001122'), ('streak', '88001122')])
    eq('ҮАЗ-д нэг мэдэгдэл, нэр бүгд', [x['body'] for x in m if x['kind'] == 'absent_mgr'], ['Бат, Сүх'])
    eq('18:59 — үгүй', [x for x in kinds(dict(base, now=at(T, '18:59'))) if x[0] != 'am10'], [])
    eq('ирсэн бол тасалсан биш', [x['to'] for x in plan(dict(base, att=[['99112233', T], ['99112244', T]], now=at(T, '19:00')))], [])
    # ③ 2+ өдөр дараалан
    att1 = [['99112233', '2026-11-16']]   # Да ирсэн, Мя (17) ирээгүй, Лх (18) ирээгүй → 2
    m = plan(dict(base, att=att1, people=[P[0]], now=at(T, '19:00')))
    eq('2 өдөр дараалан → ҮАЗ-д анхааруулга', [(x['kind'], x['body']) for x in m if x['kind'] == 'streak'], [('streak', 'Бат (2)')])
    eq('1 өдөр л → анхааруулга үгүй', [x for x in plan(dict(base, att=[['99112233', '2026-11-17']], people=[P[0]], now=at(T, '19:00'))) if x['kind'] == 'streak'], [])
    eq('чөлөөтэй өдөр дараалалыг таслана', [x for x in plan(dict(base, att=[], leaves=[{'phone': '99112233', 'from': '2026-11-17', 'to': '2026-11-17', 'kind': 'paid'}], people=[P[0]], now=at(T, '19:00'))) if x['kind'] == 'streak'], [])
    # Лх 11-11 ирсэн; 11-12 баяр, 11-14/15 амралт — дараалалыг ТАСЛАХГҮЙ; Ба 11-13 + Да 11-16 тасалсан = 2
    eq('амралт, баярын өдөр дараалалыг таслахгүй', [x['body'] for x in plan(dict(base, att=[['99112233', '2026-11-11']], people=[P[0]], now=at('2026-11-16', '19:00'))) if x['kind'] == 'streak'], ['Бат (2)'])
    if f:
        print('❌ att_notify selftest:\n  ' + '\n  '.join(f))
        sys.exit(1)
    print('✅ att_notify selftest OK')


if __name__ == '__main__':
    if '--selftest' in sys.argv:
        selftest()
    elif '--plan' in sys.argv:
        print(json.dumps({'messages': plan(json.load(open(sys.argv[sys.argv.index('--plan') + 1])))}, ensure_ascii=False))
    else:
        main()
