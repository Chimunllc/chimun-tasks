#!/usr/bin/env python3
"""Meta Conversions API — төлбөр орсон захиалгыг Facebook руу буцаана.

ЯАГААД: Pixel зөвхөн браузерт ажилладаг. Манай захиалгын дийлэнх нь утсаар,
биечлэн ирж хийгддэг тул Facebook «ямар хүн үнэхээр мөнгө төлдөг вэ» гэдгийг
сурч чаддаггүй байв. Энэ скрипт бодит худалдан авалтыг буцаана — зар үүн дээр
суралцаж, төстэй хүмүүсийг олно.

Ажиллах: VPS-ийн cron, цаг тутам.  Гараар: python3 fb_capi.py [--dry] [--test]

⛔ ХУВИЙН МЭДЭЭЛЭЛ ТҮҮХИЙГЭЭР ЯВАХГҮЙ — утас, и-мэйл, нэр бүгд SHA-256-аар
   хэшлэгдэнэ (Meta-гийн шаардлага бөгөөд манай ч дүрэм).
⛔ НЭГ ЗАХИАЛГА = НЭГ PURCHASE. `fb_capi_sent` хүснэгт давхардлыг хаана.
"""
import hashlib, json, re, subprocess, sys, time, urllib.error, urllib.parse, urllib.request
from datetime import date, datetime, timedelta, timezone

ENV = '/opt/chimun/marketing/fb.env'
API = 'https://graph.facebook.com/v21.0'
CONTAINER = 'vps-deploy-postgres-1'
# Meta нь 7 хоногоос хуучин үйл явдлыг ТАТГАЛЗДАГ. 6 хоногоор барина —
# скрипт нэг өдөр унасан ч захиалга алдагдахгүй зай үлдээв.
MAX_AGE_DAYS = 6
UB = timezone(timedelta(hours=8))          # Улаанбаатар

DRY = '--dry' in sys.argv
TEST = '--test' in sys.argv


def load_env(path):
    out = {}
    try:
        with open(path) as f:
            for ln in f:
                ln = ln.strip()
                if not ln or ln.startswith('#') or '=' not in ln:
                    continue
                k, v = ln.split('=', 1)
                out[k.strip()] = v.strip().strip('"').strip("'")
    except FileNotFoundError:
        pass
    return out


def psql(sql):
    p = subprocess.run(['docker', 'exec', '-i', CONTAINER, 'psql', '-U', 'chimun',
                        '-d', 'chimun', '-t', '-A', '-F', '\x1f', '-v', 'ON_ERROR_STOP=1', '-c', sql],
                       capture_output=True, text=True)
    if p.returncode:
        raise SystemExit('psql: ' + p.stderr.strip())
    return [r.split('\x1f') for r in p.stdout.strip().split('\n') if r.strip()]


def sq(v):
    return "'" + str(v).replace("'", "''") + "'"


# ── Цэвэр функцууд (тестлэгдэнэ) ────────────────────────────────────────────
def sha(v):
    """Meta-гийн шаардлагаар: хоосон зайгүй, жижиг үсэг, дараа нь SHA-256."""
    v = str(v or '').strip().lower()
    return hashlib.sha256(v.encode('utf-8')).hexdigest() if v else ''


def norm_phone(v):
    """Монгол дугаарыг E.164 (улсын кодтой, +-гүй) болгоно. Таньж чадвал хоосон."""
    d = re.sub(r'\D', '', str(v or ''))
    if len(d) == 8:
        return '976' + d
    if len(d) == 11 and d.startswith('976'):
        return d
    # 0-оор эхэлсэн дотоодын бичлэг (09911…) — тэгийг хасна
    if len(d) == 9 and d.startswith('0'):
        return '976' + d[1:]
    return ''


def norm_email(v):
    v = str(v or '').strip().lower()
    return v if re.match(r'^[^@\s]+@[^@\s]+\.[^@\s]+$', v) else ''


def given_name(v):
    """«Ч.Амри» → «амри». Монгол нэр нь эцгийн нэрийн эхний үсэг + өөрийн нэр."""
    s = re.sub(r'[^\w\s.\-]', ' ', str(v or '')).strip()
    if not s:
        return ''
    if '.' in s:
        s = s.split('.')[-1]
    return s.split()[0].lower() if s.split() else ''


def parse_fbq(note):
    """note доторх ⟦FBQ|fbp|fbc⟧ → (fbp, fbc). Байхгүй бол хоосон."""
    m = re.search(r'⟦FBQ\|([^|⟧]*)\|([^⟧]*)⟧', str(note or ''))
    return (m.group(1).strip(), m.group(2).strip()) if m else ('', '')


def action_source(src):
    """Сайтаас ирсэн бол website, бусад нь утсаар/биечлэн."""
    s = str(src or '').lower()
    return 'website' if ('site' in s or 'website' in s) else 'phone_call'


def revenue_mnt(total, deposit):
    """Барьцаа орлого БИШ (CLAUDE.md: орлогын ганц дүрэм). Сөрөг болгохгүй."""
    return max(0, int(total or 0) - int(deposit or 0))


def event_time(paid_date, updated_at, now=None):
    """Мөнгө орсон өдрийн UB-ийн үд (unix). Огноо уншигдахгүй бол шинэчилсэн цаг."""
    s = str(paid_date or '')[:10]
    if re.match(r'^\d{4}-\d{2}-\d{2}$', s):
        y, m, d = (int(x) for x in s.split('-'))
        return int(datetime(y, m, d, 12, 0, tzinfo=UB).timestamp())
    try:
        return int(datetime.fromisoformat(str(updated_at).replace(' ', 'T')).timestamp())
    except Exception:
        return int((now or time.time()))


def too_old(ts, now, max_days=MAX_AGE_DAYS):
    return (now - ts) > max_days * 86400


def build_event(row, fx, now):
    """Нэг захиалга → Meta-гийн үйл явдал. Цэвэр функц (сүлжээгүй)."""
    (oid, num, cust, phone, email, src, note, total, deposit, paid_date, updated_at) = row
    mnt = revenue_mnt(total, deposit)
    if mnt <= 0 or not fx:
        return None, 'дүн 0'
    ts = event_time(paid_date, updated_at, now)
    if too_old(ts, now):
        return None, 'хэт хуучин'
    fbp, fbc = parse_fbq(note)
    ph, em, fn = norm_phone(phone), norm_email(email), given_name(cust)
    ud = {}
    if ph:
        ud['ph'] = [sha(ph)]
    if em:
        ud['em'] = [sha(em)]
    if fn:
        ud['fn'] = [sha(fn)]
    if fbp:
        ud['fbp'] = fbp
    if fbc:
        ud['fbc'] = fbc
    ud['country'] = [sha('mn')]
    # ⛔ Тулгах түлхүүр огт байхгүй бол ИЛГЭЭХГҮЙ — Meta хэнтэй ч холбож
    #    чадахгүй тул зөвхөн шуугиан нэмнэ (нэр + улс нь хүн таньдаггүй).
    if not (ph or em or fbp or fbc):
        return None, 'тулгах түлхүүргүй'
    ev = {
        'event_name': 'Purchase',
        'event_time': ts,
        'event_id': 'ord-' + str(oid),
        'action_source': action_source(src),
        'user_data': ud,
        'custom_data': {
            # ⚠ Meta нь ₮ (MNT) валютыг ДЭМЖДЭГГҮЙ — ам.доллар болгож явуулна.
            #   Ханш нь VPS-ийн fb.env дэх ГАНЦ эх сурвалж (FX_USD_MNT).
            'currency': 'USD',
            'value': round(mnt / fx, 2),
            'order_id': str(num or oid),
        },
    }
    if ev['action_source'] == 'website':
        ev['event_source_url'] = 'https://mevent.mn/'
    matched = ','.join(k for k in ('ph', 'em', 'fbp', 'fbc') if k in ud)
    return (ev, matched), None


# ── Гүйцэтгэл ───────────────────────────────────────────────────────────────
def main():
    env = load_env(ENV)
    token = env.get('FB_TOKEN', '')
    pixel = env.get('FB_PIXEL', '')
    fx = float(env.get('FX_USD_MNT') or 0)
    if not token or not pixel:
        raise SystemExit('fb.env-д FB_TOKEN эсвэл FB_PIXEL алга')
    if not fx:
        raise SystemExit('fb.env-д FX_USD_MNT алга — дүн хөрвүүлэх боломжгүй')

    # ⛔ ШҮҮЛТ нь `event_time`-ТАЙ ЯГ ИЖИЛ өдрөөр явна. Өмнө нь `updated_at`-ыг
    #    ч тооцдог байсан тул 7-р сард төлөгдсөн атлаа саяхан хөндөгдсөн захиалга
    #    45-аар татагдаж, бүгд «хэт хуучин» гэж хаягддаг байв — `limit`-д хүрвэл
    #    ЖИНХЭНЭ шинэ худалдан авалт шахагдаж гарах эрсдэлтэй.
    since = (date.today() - timedelta(days=MAX_AGE_DAYS)).isoformat()
    rows = psql(f"""
        select o.id, coalesce(o.number,0), coalesce(o.customer,''), coalesce(o.phone,''),
               coalesce(o.email,''), coalesce(o.source,''), coalesce(o.note,''),
               coalesce(o.total_mnt,0), coalesce(o.deposit_mnt,0),
               coalesce(o.paid_date,''), coalesce(o.updated_at::text,'')
          from app_orders o
          left join fb_capi_sent s on s.order_id = o.id
         where s.order_id is null
           and coalesce(o.paid_mnt,0) > 0
           and coalesce(o.source,'') <> 'booqable'
           and coalesce(o.status,'') not in ('deleted','canceled','draft')
           and coalesce(nullif(o.paid_date,'')::date, o.updated_at::date) >= date {sq(since)}
         order by o.updated_at
         limit 200""")

    now = int(time.time())
    events, meta, skipped = [], [], {}
    for r in rows:
        built, why = build_event(r, fx, now)
        if not built:
            skipped[why] = skipped.get(why, 0) + 1
            continue
        ev, matched = built
        events.append(ev)
        meta.append((r[0], ev['event_id'], ev['custom_data']['value'], matched))

    stamp = datetime.now(UB).strftime('%Y-%m-%d %H:%M')
    if not events:
        print(f'[{stamp}] capi: илгээх захиалга алга'
              + (f' (алгассан: {skipped})' if skipped else ''))
        return

    if DRY:
        print(f'[{stamp}] capi DRY — {len(events)} үйл явдал, алгассан {skipped}')
        print(json.dumps(events[:3], ensure_ascii=False, indent=2))
        return

    form = {'data': json.dumps(events), 'access_token': token}
    # `--test` үед Events Manager-ийн «Test events» таб дээр шууд харагдана —
    # амьд датаг бохирдуулахгүйгээр холболтоо шалгах цорын ганц зам.
    if TEST and env.get('FB_TEST_CODE'):
        form['test_event_code'] = env['FB_TEST_CODE']
    body = urllib.parse.urlencode(form).encode()
    req = urllib.request.Request(f'{API}/{pixel}/events', data=body)
    try:
        with urllib.request.urlopen(req, timeout=60) as r:
            resp = json.loads(r.read().decode())
    except urllib.error.HTTPError as e:
        detail = e.read().decode()[:400]
        print(f'[{stamp}] capi АЛДАА {e.code}: {detail}')
        # ⚠ Алдааг бүртгэхгүй — дараагийн удаа ДАХИН оролдоно. Бүртгэвэл
        #   нэг удаагийн сүлжээний алдаанаас болж захиалга бүрмөсөн алдагдана.
        raise SystemExit(1)

    received = resp.get('events_received', 0)
    # ⚠ Илгээгдсэний ДАРАА л бүртгэнэ — эс бөгөөс алдаа гарахад давхар явна.
    vals = ','.join(
        f"({sq(oid)},'Purchase',{sq(eid)},{val},{sq(m)},{sq(json.dumps(resp)[:500])})"
        for (oid, eid, val, m) in meta)
    psql('insert into fb_capi_sent (order_id,event_name,event_id,value_usd,matched,response) '
         f'values {vals} on conflict (order_id) do nothing;')
    total_usd = round(sum(m[2] for m in meta), 2)
    print(f'[{stamp}] capi: {received}/{len(events)} үйл явдал илгээгдэв '
          f'(${total_usd})' + (f', алгассан {skipped}' if skipped else ''))


# ── Өөрийн тест (`--selftest`) ──────────────────────────────────────────────
# `test/run.js` үүнийг дуудна. Сүлжээ, DB шаардахгүй — зөвхөн цэвэр функцууд.
def selftest():
    f, n = [], [0]

    def eq(got, want, name):
        n[0] += 1
        if got != want:
            f.append(f'{name}: хүлээсэн {want!r}, ирсэн {got!r}')

    # Утас — E.164 (Монгол 8 орон)
    eq(norm_phone('99112233'), '97699112233', 'утас: 8 орон')
    eq(norm_phone('+976 9911-2233'), '97699112233', 'утас: улсын код + тэмдэгт')
    eq(norm_phone('976 9911 2233'), '97699112233', 'утас: зайтай')
    eq(norm_phone('099112233'), '97699112233', 'утас: 0-оор эхэлсэн')
    eq(norm_phone('123'), '', 'утас: богино → хоосон')
    eq(norm_phone(''), '', 'утас: хоосон')
    eq(norm_phone(None), '', 'утас: None → унахгүй')

    # И-мэйл
    eq(norm_email(' A@B.mn '), 'a@b.mn', 'мэйл: цэвэрлэгээ')
    eq(norm_email('буруу'), '', 'мэйл: буруу → хоосон')
    eq(norm_email(None), '', 'мэйл: None → унахгүй')

    # Хэш — ижил утга ижил хэш, хоосон бол хоосон
    eq(sha('A@b.MN '), sha('a@b.mn'), 'хэш: том/жижиг үсэг ялгахгүй')
    eq(sha(''), '', 'хэш: хоосон → хоосон')
    eq(len(sha('x')), 64, 'хэш: SHA-256 урт')

    # Монгол нэр
    eq(given_name('Ч.Амри'), 'амри', 'нэр: эцгийн үсэг хасагдана')
    eq(given_name('Болд Баатар'), 'болд', 'нэр: эхний үг')
    eq(given_name(''), '', 'нэр: хоосон')

    # ⟦FBQ⟧ токен
    eq(parse_fbq('сайн ⟦FBQ|fb.1.1.p|fb.1.2.c⟧ байна'), ('fb.1.1.p', 'fb.1.2.c'), 'fbq: хоёулаа')
    eq(parse_fbq('⟦FBQ|fb.1.1.p|⟧'), ('fb.1.1.p', ''), 'fbq: зөвхөн fbp')
    eq(parse_fbq('⟦DLV|city|0|0⟧'), ('', ''), 'fbq: өөр токен → хоосон')
    eq(parse_fbq(''), ('', ''), 'fbq: хоосон')
    eq(parse_fbq(None), ('', ''), 'fbq: None → унахгүй')

    # Барьцаа орлогод ОРОХГҮЙ
    eq(revenue_mnt(1000000, 200000), 800000, 'орлого: барьцаа хасагдана')
    eq(revenue_mnt(100, 500), 0, 'орлого: сөрөг болохгүй')
    eq(revenue_mnt(None, None), 0, 'орлого: хоосон → 0')

    # Сурвалж
    eq(action_source('m-event-website'), 'website', 'сурвалж: сайт')
    eq(action_source('app'), 'phone_call', 'сурвалж: апп → утсаар')
    eq(action_source(''), 'phone_call', 'сурвалж: хоосон → утсаар')

    # Цаг — төлсөн өдрийн UB үд
    t = event_time('2026-09-10', '')
    eq(datetime.fromtimestamp(t, UB).strftime('%Y-%m-%d %H'), '2026-09-10 12', 'цаг: UB үд')
    eq(event_time('', '2026-09-10 05:00:00+08') > 0, True, 'цаг: огноогүй бол updated_at')
    eq(event_time('', '', 1700000000), 1700000000, 'цаг: аль нь ч байхгүй бол одоо')

    # Хугацаа — Meta 7 хоногоос хуучныг ТАТГАЛЗДАГ
    now = 1_700_000_000
    eq(too_old(now - 5 * 86400, now), False, 'хугацаа: 5 хоног — зөв')
    eq(too_old(now - 7 * 86400, now), True, 'хугацаа: 7 хоног — хуучин')

    # Бүтэн үйл явдал
    row = ('o1', 1470, 'Ч.Амри', '99112233', 'a@b.mn', 'm-event-website',
           '⟦FBQ|fb.1.1.p|fb.1.2.c⟧', 3_600_000, 600_000, '2026-09-10', '')
    built, why = build_event(row, 3600.0, event_time('2026-09-10', '') + 3600)
    eq(why, None, 'үйл явдал: алдаагүй')
    ev, matched = built
    eq(ev['event_name'], 'Purchase', 'үйл явдал: Purchase')
    eq(ev['event_id'], 'ord-o1', 'үйл явдал: дугаар давхардахгүй')
    eq(ev['custom_data']['currency'], 'USD', 'үйл явдал: ам.доллар (Meta ₮ дэмждэггүй)')
    eq(ev['custom_data']['value'], 833.33, 'үйл явдал: (3.6сая−600мян)/3600')
    eq(ev['action_source'], 'website', 'үйл явдал: сайтаас')
    eq(ev['event_source_url'], 'https://mevent.mn/', 'үйл явдал: сайтын хаяг заавал')
    eq(matched, 'ph,em,fbp,fbc', 'үйл явдал: 4 түлхүүрээр тулгагдана')
    # ⛔ Түүхий утас/мэйл ХЭЗЭЭ Ч явахгүй
    eq('99112233' in json.dumps(ev), False, 'үйл явдал: түүхий утас явахгүй')
    eq('a@b.mn' in json.dumps(ev), False, 'үйл явдал: түүхий мэйл явахгүй')

    # Тулгах түлхүүргүй бол ИЛГЭЭХГҮЙ
    bare = ('o2', 2, 'Нэр', '', '', 'app', '', 1000, 0, '2026-09-10', '')
    b2, w2 = build_event(bare, 3600.0, event_time('2026-09-10', ''))
    eq(b2, None, 'үйл явдал: түлхүүргүй → илгээхгүй')
    eq(w2, 'тулгах түлхүүргүй', 'үйл явдал: шалтгаан хэлнэ')

    # Дүн 0 бол илгээхгүй
    z = ('o3', 3, 'Нэр', '99112233', '', 'app', '', 500_000, 500_000, '2026-09-10', '')
    b3, w3 = build_event(z, 3600.0, event_time('2026-09-10', ''))
    eq(b3, None, 'үйл явдал: бүхэлдээ барьцаа → илгээхгүй')

    if f:
        print(f'❌ CAPI FAIL — {n[0] - len(f)}/{n[0]}')
        for x in f:
            print('   · ' + x)
        raise SystemExit(1)
    print(f'✅ CAPI OK — {n[0]} тест')


if __name__ == '__main__':
    if '--selftest' in sys.argv:
        selftest()
    else:
        main()
