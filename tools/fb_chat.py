#!/usr/bin/env python3
"""Messenger чатыг татаж төлөвийг бүртгэнэ; зөвшөөрөгдсөн бол БОТ хариулна.

ЯАГААД: 2026-09-17-нд `pages_messaging` нээгдэв. Эхний хэмжилтээр 30 хоногт
195 чатын 43 нь хариу хүлээж байсан — алдсан дуудлагатай ижил алдагдал.

ХОЁР АЖИЛ:
  ① ТАТАХ  — чат бүрийн төлөв `fb_chats`-д (хэн эзэмшиж байна, хэдэн мессеж,
             хэзээ хариулсан). Дэлгэцийн ажлын жагсаалт эндээс гарна.
  ② ХАРИУЛАХ — `app_config['fb_bot'].enabled` үнэн бол Claude-аар хариулт
             бэлдэж илгээнэ. Үнэ, сул үлдэгдэл, хүргэлтийн төлбөрийг ЗОХИОХГҮЙ —
             манай өөрийн DB-ээс хэрэгслээр уншина.

⛔ ХҮН ОРВОЛ БОТ ГАРНА. Ажилтан Inbox-оос нэг ч мессеж бичвэл тэр чат
   `state='human'` болж бот дахин ОРОХГҮЙ. Ажилтан юу ч дарах шаардлагагүй —
   бот өөрийн илгээсэн мессежийн id-г мэддэг тул «энэ миний биш» гэдгийг таьна.

⛔ META-ГИЙН 24 ЦАГИЙН ЦОНХ. Харилцагчийн сүүлийн мессежээс хойш 24 цаг
   өнгөрвөл чөлөөт бичвэр илгээх БОЛОМЖГҮЙ (Meta татгалзана). Хугацаа
   хэтэрсэн чат хүний жагсаалтад үлдэнэ.

Ажиллах: VPS cron, 2 минут тутам.
Гараар:  python3 fb_chat.py [--dry] [--pull-only] [--selftest]
"""
import json, os, re, subprocess, sys, urllib.error, urllib.parse, urllib.request
from datetime import datetime, timedelta, timezone

ENV = '/opt/chimun/marketing/fb.env'
# ⚠ Anthropic түлхүүр нь маркетингийн env-д БИШ, VPS-ийн үндсэн стекийн .env-д
#   аль хэдийн байдаг (`ANTHROPIC_API_KEY`). Түүнийг ХУУЛЖ БҮҮ БИЧ — нэг нууц
#   хоёр файлд байвал нэгийг нь эргүүлэхэд нөгөө нь чимээгүй хуучирна.
STACK_ENV = '/opt/chimun/vps-deploy/.env'
LLM_KEYS = ('ANTHROPIC_API_KEY', 'ANTHROPIC_KEY')
API = 'https://graph.facebook.com/v21.0'
CONTAINER = 'vps-deploy-postgres-1'
UB = timezone(timedelta(hours=8))
SEP = '\x1f'

CONV_PAGES = 6            # 50×6 = сүүлийн 300 яриа хангалттай
# ⚠ 30 хоногийн 195 чатын 36 нь 20-оос олон мессежтэй (20 нь 40-өөс олон).
#    20-оор таслахад бот ярианы эхлэлийг — ямар эвент, хэдэн хүн, ямар огноо
#    гэдгийг — ХАРАХГҮЙ өнгөрдөг байв. Токен нэмэгдэх нь хямд (1 хариулт
#    ~1 центээс ~2 цент), буруу хариулт үүнээс хамаагүй үнэтэй.
MSG_LIMIT = 60            # контекстэд авах сүүлийн мессеж
HIST_TURNS = 25           # Claude руу явах эргэлтийн дээд тоо
WINDOW_H = 24             # Meta-гийн чөлөөт бичвэрийн цонх
MAX_TURNS_DEF = 4         # дараалсан ботын хариултын дээд хязгаар
# ⛔ HAIKU БОЛОХГҮЙ (2026-09-17, амьд ноорогоор баталсан). Монгол хэл нь
#    эвдэрсэн гардаг: «хэрэгсэл худалдавлаж байна», «дэмжин арсан хэрэгтэй
#    юу», «Эргүүлэг, төрийн ёслол» г.м. Харилцагч руу явах бичвэр тул
#    хэлний чанар нь тохиргооны асуудал БИШ, бүтээгдэхүүний асуудал.
MODEL = 'claude-sonnet-5'

DRY = '--dry' in sys.argv
PULL_ONLY = '--pull-only' in sys.argv


# ── Цэвэр функцууд (--selftest шалгана) ────────────────────────────────────

def parse_ts(s):
    """Facebook «2026-09-17T04:15:08+0000» → datetime. Уншигдахгүй бол None."""
    s = str(s or '').strip()
    if not s:
        return None
    try:
        return datetime.strptime(s, '%Y-%m-%dT%H:%M:%S%z')
    except ValueError:
        try:
            return datetime.fromisoformat(s.replace('Z', '+00:00'))
        except ValueError:
            return None


HUMAN_TTL_H = 12          # ажилтны эзэмшил хэдэн цагийн дараа тайлагдах вэ


def thread_state(msgs, page_id, bot_mids, now=None, ttl_h=HUMAN_TTL_H):
    """Чатыг хэн эзэмшиж байна вэ.

    ⛔ Ажилтан Inbox-оос бичсэн мессеж нь бидний ЛОГТ БАЙХГҮЙ — тэр л «хүн
       оролцсон» гэдгийн цорын ганц найдвартай дохио. Ажилтан ярьж байхад бот
       дундуур нь орох нь хамгийн муу алдаа.

    ⛔ ГЭХДЭЭ ЭЗЭМШИЛ ХУГАЦААТАЙ. Эхний татацад 300 чатын 294 нь «human» болсон —
       учир нь бүх хуучин яриаг ажилтан хаасан байсан. Хугацаагүй бол тэр 294
       харилцагч бот руу ХЭЗЭЭ Ч эргэж орохгүй: өнгөрсөн сард нэг удаа
       үйлчлүүлсэн хүн шинээр бичихэд хариугүй үлдэнэ. Иймд ажилтны сүүлийн
       мессежээс `ttl_h` цаг өнгөрсөн бол ШИНЭ ярианы эхлэл гэж үзнэ.
       (Трипвайрын шилжүүлэг нь өөр — тэр нь DB-д `handoff_at`-аар наалдана.)
    """
    now = now or datetime.now(timezone.utc)
    for m in reversed(sorted(msgs, key=lambda x: x.get('created_time') or '')):
        if (m.get('from') or {}).get('id') != page_id:
            continue
        if m.get('id') in bot_mids:
            return 'bot'
        at = parse_ts(m.get('created_time'))
        if at and (now - at) > timedelta(hours=ttl_h):
            return 'bot'
        return 'human'
    return 'bot'


def bot_turns(msgs, page_id, bot_mids):
    """Харилцагч сүүлд бичсэнээс хойш бот хэдэн удаа дараалан хариулсан бэ.

    Хязгаарлахгүй бол бот өөртэйгөө ярьж, чат мөнхөд хаагдахгүй үлдэнэ.
    Харилцагч ДАХИН бичмэгц тоолуур 0 болно — тэр нь яриа үргэлжилж байгаагийн
    шинж, зогсоох шалтгаан биш.
    """
    n = 0
    for m in reversed(sorted(msgs, key=lambda x: x.get('created_time') or '')):
        if (m.get('from') or {}).get('id') != page_id:
            break
        if m.get('id') in bot_mids:
            n += 1
    return n


def in_window(last_in, now, hours=WINDOW_H):
    """Meta-гийн чөлөөт бичвэрийн цонх нээлттэй эсэх."""
    if not last_in or not now:
        return False
    return (now - last_in) <= timedelta(hours=hours)


# ⛔ ТРИПВАЙР — эдгээр үг гарвал бот ОГТ хариулахгүй, шууд хүнд шилжинэ.
#    Мөнгө буцаах, гомдол, хохирол, хөнгөлөлт — эдгээрийг машин шийдэх ёсгүй.
#    Үгийн ҮНДСЭЭР тааруулна («гомдол», «гомдолтой», «гомдоллож» бүгд таарна).
TRIPWIRES = [
    ('гомдол', 'гомдол'), ('гомдоллॊ', 'гомдол'),
    ('хохирол', 'хохирол'), ('хохироо', 'хохирол'), ('эвдэр', 'эвдрэл'),
    ('буцаа', 'мөнгө буцаалт'), ('цуцл', 'цуцлалт'), ('цуцал', 'цуцлалт'),
    ('хямдр', 'хөнгөлөлт'), ('хөнгөлөл', 'хөнгөлөлт'), ('хонголол', 'хөнгөлөлт'),
    ('хямдхан бол', 'хөнгөлөлт'), ('хямд болго', 'хөнгөлөлт'),
    ('гэрээ', 'гэрээ'), ('нэхэмжлэ', 'нэхэмжлэх'), ('төлбөрөө буцаа', 'мөнгө буцаалт'),
    ('шүүх', 'ноцтой'), ('хуульч', 'ноцтой'), ('залилан', 'ноцтой'),
    ('дарга', 'удирдлага хүссэн'), ('захирал', 'удирдлага хүссэн'),
]


def tripwire(text):
    """Хүнд заавал шилжүүлэх шалтгаан буцаана, эс бөгөөс ''."""
    t = str(text or '').lower()
    for needle, why in TRIPWIRES:
        if needle in t:
            return why
    return ''


def clip(text, n=900):
    """Мессежийг таслах — Messenger 2000 тэмдэгт авдаг ч урт хариулт уншигддаггүй."""
    t = re.sub(r'\s+\n', '\n', str(text or '').strip())
    if len(t) <= n:
        return t
    cut = t[:n]
    dot = max(cut.rfind('. '), cut.rfind('.\n'), cut.rfind('! '), cut.rfind('? '))
    return (cut[:dot + 1] if dot > n * 0.5 else cut).strip()


def work_now(hour, ws, we):
    """Ажлын цаг мөн үү (УБ-ийн цагаар)."""
    try:
        ws, we = int(ws), int(we)
    except (TypeError, ValueError):
        ws, we = 9, 18
    return ws <= int(hour) < we


def phone_in(text):
    """Бичвэрээс Монголын гар утас. Байхгүй бол ''."""
    m = re.search(r'(?:^|[^0-9])((?:8|9|7)[0-9]{7})(?:[^0-9]|$)', str(text or ''))
    return m.group(1) if m else ''


def sq(v):
    return 'null' if v is None or v == '' else "'" + str(v).replace("'", "''") + "'"


def sq_ts(dt):
    return 'null' if not dt else "'" + dt.astimezone(timezone.utc).isoformat() + "'"


# ── I/O ────────────────────────────────────────────────────────────────────

def _read_env(path, keys=None):
    out = {}
    try:
        with open(path) as f:
            for ln in f:
                ln = ln.strip()
                if not ln or ln.startswith('#') or '=' not in ln:
                    continue
                k, v = ln.split('=', 1)
                k = k.strip()
                if keys is None or k in keys:
                    out[k] = v.strip().strip('"').strip("'")
    except OSError:
        pass
    return out


def cfg():
    out = _read_env(ENV)
    # LLM түлхүүрийг зөвхөн НЭРЭЭР нь стекийн .env-ээс авна (бусад нууцыг
    # уншихгүй). fb.env-д байвал тэр нь давуу — тусад нь тавьсан бол
    # зориудаар тавьсан гэсэн үг.
    stack = _read_env(STACK_ENV, set(LLM_KEYS))
    for k in LLM_KEYS:
        if out.get(k) or stack.get(k):
            out.setdefault('ANTHROPIC_KEY', out.get(k) or stack.get(k))
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
    # ⛔ .strip() нь `\x1f`-ийг ХАСдаг (`'\x1f'.isspace()` = True) тул сүүлийн
    #    багана хоосон байхад мөр нэг талбараар дутуу задарна.
    return [ln.split(SEP) for ln in p.stdout.strip('\n').split('\n') if ln]


def api_get(url):
    with urllib.request.urlopen(url, timeout=60) as r:
        return json.loads(r.read().decode())


def api_post(path, params):
    req = urllib.request.Request(API + '/' + path,
                                 data=urllib.parse.urlencode(params).encode())
    with urllib.request.urlopen(req, timeout=60) as r:
        return json.loads(r.read().decode())


def bot_config():
    r = psql("select coalesce(value::text,'{}') from app_config where key='fb_bot';", rows=True)
    try:
        return json.loads(r[0][0]) if r and r[0][0] else {}
    except (ValueError, IndexError):
        return {}


def tariffs():
    r = psql("select coalesce(value::text,'{}') from app_config where key='tariffs';", rows=True)
    try:
        return json.loads(r[0][0]) if r and r[0][0] else {}
    except (ValueError, IndexError):
        return {}


def pending_threads():
    """Батлагдахыг хүлээж буй нооргийн чатууд.

    ⛔ Ноорог хүлээж байхад ШИНЭ ноорог үүсгэж БОЛОХГҮЙ. Cron 2 минут тутам
       ажилладаг тул нэг хариугүй чат цагт 30 ноорог үүсгэж, батлах дараалал
       дүүрч, мөнгө дэмий шатна (2026-09-17-нд эхний ажиллалтад 2 хүнд
       5-5 ноорог үүссэн). Хүн шийдтэл тэр чат ХҮЛЭЭНЭ.
    """
    r = psql("select distinct thread_id from fb_chat_bot_log "
             "where review and not sent and approved_by is null and error is null;", rows=True)
    return {x[0] for x in r if x and x[0]}


def known_bot_mids():
    """Ботын өөрийн илгээсэн мессежийн id — «хүн орсон уу» гэдгийг ингэж таьна."""
    r = psql("select coalesce(out_mid,'') from fb_chat_bot_log where sent and out_mid is not null;", rows=True)
    return {x[0] for x in r if x and x[0]}


def fetch_threads(tok, page_id):
    q = urllib.parse.urlencode({
        # ⚠ `attachments` ЗААВАЛ — эс бөгөөс `has_attach()` үргэлж худал буцааж,
        #   зурган мессежийн хамгаалалт ЧИМЭЭГҮЙ унтарна.
        'fields': ('id,updated_time,participants,messages.limit(%d)'
                   '{id,created_time,from,message,attachments{mime_type}}') % MSG_LIMIT,
        'limit': 50, 'access_token': tok})
    url = API + '/' + page_id + '/conversations?' + q
    out, pages = [], 0
    while url and pages < CONV_PAGES:
        r = api_get(url)
        out += r.get('data', [])
        pages += 1
        url = (r.get('paging') or {}).get('next')
    return out


# ── БОТЫН ХЭРЭГСЭЛ — ҮНЭ, СУЛ ҮЛДЭГДЭЛ ЗОХИОХГҮЙ ──────────────────────────
# ⛔ Бот үнэ, тоо ширхэг, хүргэлтийн төлбөрийг ӨӨРӨӨ бодохыг ХОРИГЛОНО.
#    Бүгд манай өөрийн DB-ээс (`public_catalog` = сайт юу харуулж байгаатай
#    ЯГ ижил эх сурвалж, `app_config['tariffs']` = тарифын ганц эх сурвалж).
#    Эс бөгөөс бот сайтаас өөр үнэ хэлж, компани түүнийг барих үүрэгтэй болно.

def tool_search(query):
    q = str(query or '').strip()
    if len(q) < 2:
        return []
    rows = psql(
        "select sku, name, coalesce(price,0)::bigint, coalesce(stock,0)::int "
        "from public_catalog where name ilike " + sq('%' + q + '%') +
        " order by coalesce(stock,0) desc, price desc limit 6;", rows=True)
    out = []
    for r in rows:
        if len(r) < 4:
            continue
        out.append({'sku': r[0], 'name': r[1], 'price_mnt': int(r[2] or 0),
                    'free_now': int(r[3] or 0),
                    'url': 'https://mevent.mn/products/' + str(r[0]).lower() + '/'})
    return out


def tool_delivery(km, t):
    """Хүргэлтийн төлбөр — тарифын JSON-оос. Хот доторх нэг үнэ + км тутмын нэмэлт."""
    city = int(t.get('delivery_city_fee') or 0)
    per = int(t.get('delivery_per_km') or 0)
    try:
        km = float(km or 0)
    except (TypeError, ValueError):
        km = 0.0
    if km <= 0:
        return {'city_fee_mnt': city, 'per_km_mnt': per,
                'note': 'Улаанбаатар доторх нэг талын үнэ. Хот гадуур бол км-ээр.'}
    return {'km': km, 'one_way_mnt': city + int(per * km),
            'note': 'Нэг талын үнэ. Буцаалт тусдаа тооцогдоно.'}


TOOLS = [
    {'name': 'search_products',
     'description': 'Түрээсийн барааг нэрээр хайж ҮНЭ ба сул үлдэгдлийг буцаана. '
                    'Үнэ хэлэхээсээ өмнө ЗААВАЛ дуудна.',
     'input_schema': {'type': 'object',
                      'properties': {'query': {'type': 'string', 'description': 'барааны нэр, ж: "сандал"'}},
                      'required': ['query']}},
    {'name': 'delivery_price',
     'description': 'Хүргэлтийн төлбөрийг тарифаас буцаана. km=0 бол хот доторх үнэ.',
     'input_schema': {'type': 'object',
                      'properties': {'km': {'type': 'number', 'description': 'хот төвөөс км, хот дотор бол 0'}},
                      'required': ['km']}},
    {'name': 'handoff',
     'description': 'Хүн рүү шилжүүлнэ. Хөнгөлөлт, гомдол, гэрээ, том/ер бусын '
                    'захиалга, эсвэл итгэлгүй байвал ЗААВАЛ дуудна.',
     'input_schema': {'type': 'object',
                      'properties': {'reason': {'type': 'string'}},
                      'required': ['reason']}},
]

SYSTEM = """Чи M event (mevent.mn) арга хэмжээний хэрэгсэл ТҮРЭЭСИЙН компанийн
Facebook чатын ажилтан. Улаанбаатарт майхан, асар, ширээ, сандал, тайз,
дулаацуулагч зэргийг түрээслүүлдэг.

ЯАЖ БИЧИХ:
- Монголоор, ЭНГИЙН бөгөөд ТОВЧ. 1-2 өгүүлбэр. Урт тайлбар бичихгүй.
- Жинхэнэ ажилтан шиг практик өнгө аяс.
- ЭМОДЗИ, ОД (**), ДООГУУР ЗУРААС, ЖАГСААЛТЫН ТЭМДЭГ хэрэглэхгүй — Messenger
  тэдгээрийг харагдуулдаггүй, түүхийгээр нь хэвлэнэ.
- Мэндчилгээ, компанийн танилцуулга БИЧИХГҮЙ. Харилцагч аль хэдийн манай
  хуудсан дээр байгаа — «сайн байна уу, бид ийм компани» гэж эхлэх нь цаг
  алдуулна. ШУУД асуултад нь хари.
- «Үйлчилгээ эрхэлдэг», «хамгийн сайн үнэ», «баяртай байна» гэх мэт
  маркетингийн хэллэг ХЭРЭГЛЭХГҮЙ.

ХАТУУ ДҮРЭМ:
1. ҮНЭ, СУЛ ҮЛДЭГДЭЛ, БАРААНЫ НЭР дурдахын ӨМНӨ search_products-ыг ЗААВАЛ
   дуудна. Хэрэгсэл дуудалгүйгээр тоо, үнэ, нэр бичихийг ХОРИГЛОНО.
2. Хүргэлтийн төлбөрийг delivery_price-аас л авна.
3. Хөнгөлөлт ОГТ амлахгүй. Хямдрал асуувал handoff.
4. Захиалгыг БАТАЛГААЖУУЛАХГҮЙ — огноо, тоо тодорхой болмогц handoff.
5. Мэдэхгүй зүйлээ таамаглахгүй. Итгэлгүй бол handoff.
6. Харилцагч МОНГОЛООР БИШ бичсэн, эсвэл юу хүсэж байгаа нь ойлгомжгүй бол
   таамаглахгүй — handoff дуудна.
6б. Ярианд «[зураг илгээв]» гэж байвал ЧИ ТЭР ЗУРГИЙГ ХАРААГҮЙ. Зурган дээр
   юу байгааг ТААМАГЛАХГҮЙ. Хариулт нь тэр зургаас хамаарч байвал handoff.
7. Боломжтой бол mevent.mn дээрх тухайн барааны холбоосыг өгнө.
8. Утасны дугаараа үлдээхийг санал болгож болно.

ЗОРИЛГО: хүнийг сайт руу оруулах, эсвэл утсаа үлдээлгэх. Хоёулаа болохгүй бол
ажилтанд цэвэр мэдээлэлтэйгээр дамжуулах."""


def ask_claude(key, history, name):
    """Claude-аар хариулт бэлдэнэ.

    (text, tools_used, handoff_reason, [оролт, гаралт] токен) буцаана.
    """
    msgs = list(history)
    used, hand = [], ''
    used_tok = [0, 0]           # [оролт, гаралт] — зардлыг таамаглахгүй хэмжинэ
    for _ in range(4):                      # хэрэгслийн эргэлтийн хязгаар
        body = json.dumps({
            'model': MODEL, 'max_tokens': 700, 'system': SYSTEM,
            'tools': TOOLS, 'messages': msgs}).encode()
        req = urllib.request.Request(
            'https://api.anthropic.com/v1/messages', data=body,
            headers={'content-type': 'application/json', 'x-api-key': key,
                     'anthropic-version': '2023-06-01'})
        with urllib.request.urlopen(req, timeout=90) as r:
            out = json.loads(r.read().decode())
        u = out.get('usage') or {}
        used_tok[0] += int(u.get('input_tokens') or 0)
        used_tok[1] += int(u.get('output_tokens') or 0)
        blocks = out.get('content', [])
        calls = [b for b in blocks if b.get('type') == 'tool_use']
        if not calls:
            txt = ' '.join(b.get('text', '') for b in blocks if b.get('type') == 'text')
            return txt.strip(), used, hand, used_tok
        msgs.append({'role': 'assistant', 'content': blocks})
        results = []
        t = tariffs()
        for c in calls:
            nm, arg = c.get('name'), (c.get('input') or {})
            used.append(nm)
            if nm == 'search_products':
                res = tool_search(arg.get('query'))
            elif nm == 'delivery_price':
                res = tool_delivery(arg.get('km'), t)
            elif nm == 'handoff':
                hand = str(arg.get('reason') or 'бот шилжүүлэв')[:120]
                res = {'ok': True}
            else:
                res = {'error': 'unknown tool'}
            results.append({'type': 'tool_result', 'tool_use_id': c.get('id'),
                            'content': json.dumps(res, ensure_ascii=False)})
        msgs.append({'role': 'user', 'content': results})
        if hand:
            break
    return '', used, (hand or 'хэрэгслийн хязгаарт хүрэв'), used_tok


def has_attach(m):
    """Мессежид зураг/файл хавсаргасан уу."""
    a = (m or {}).get('attachments')
    return bool((a or {}).get('data') if isinstance(a, dict) else a)


def blind_on_photo(msgs, page_id):
    """Харилцагчийн СҮҮЛИЙН мессеж нь зөвхөн зураг бол бот СОХОР.

    ⛔ Бот зураг ХАРДАГГҮЙ. 30 хоногийн 195 чатын 25-д нь харилцагчийн сүүлийн
       мессеж зөвхөн зураг байв («энэ хэд вэ?» гэж зураг илгээх нь түгээмэл).
       Тэдэнд бот өмнөх бичвэрт тулгуурлаж ТААМАГЛАН хариулдаг байв — хамгийн
       аюултай хэлбэр, учир нь итгэлтэй сонсогдоно. Хүнд шилжүүлнэ.
    """
    ins = [m for m in sorted(msgs, key=lambda x: x.get('created_time') or '')
           if (m.get('from') or {}).get('id') != page_id]
    if not ins:
        return False
    last = ins[-1]
    return has_attach(last) and not (last.get('message') or '').strip()


def history_for(msgs, page_id):
    """Facebook мессежүүдийг Claude-ийн хэлбэрт.

    ⚠ Зурган мессежийг ЧИМЭЭГҮЙ алгасахгүй — «[зураг илгээв]» гэж тэмдэглэнэ.
      Алгасвал бот «би чамд зураг илгээсэн» гэсэн хариуг ойлгохгүй, ярианы
      утга тасарна.
    """
    out = []
    for m in sorted(msgs, key=lambda x: x.get('created_time') or ''):
        txt = (m.get('message') or '').strip()
        if not txt and has_attach(m):
            txt = '[зураг илгээв]'
        if not txt:
            continue
        role = 'assistant' if (m.get('from') or {}).get('id') == page_id else 'user'
        if out and out[-1]['role'] == role:
            out[-1]['content'] += '\n' + txt
        else:
            out.append({'role': role, 'content': txt})
    while out and out[0]['role'] == 'assistant':
        out.pop(0)                          # Claude эхний мессежийг user байхыг шаардана
    return out[-HIST_TURNS:]


def upsert_chat(c):
    psql(
        "insert into fb_chats (thread_id,psid,name,first_at,last_at,last_in_at,last_in_mid,"
        "last_out_at,msgs_in,msgs_out,state,turns,updated_at) values ("
        + ','.join([sq(c['thread_id']), sq(c['psid']), sq(c['name']), sq_ts(c['first_at']),
                    sq_ts(c['last_at']), sq_ts(c['last_in_at']), sq(c['last_in_mid']),
                    sq_ts(c['last_out_at']), str(c['msgs_in']), str(c['msgs_out']),
                    sq(c['state']), str(c['turns'])]) + ",now()) "
        "on conflict (thread_id) do update set psid=excluded.psid, name=excluded.name, "
        "first_at=least(fb_chats.first_at,excluded.first_at), last_at=excluded.last_at, "
        "last_in_at=excluded.last_in_at, last_in_mid=excluded.last_in_mid, "
        "last_out_at=excluded.last_out_at, msgs_in=excluded.msgs_in, "
        "msgs_out=excluded.msgs_out, turns=excluded.turns, updated_at=now(), "
        # ⛔ `done` нь ХҮНИЙ шийдвэр; `handoff_at` нь трипвайрын шилжүүлэг —
        #    хоёуланг татагч дарж бичихгүй. Трипвайр (гомдол, хөнгөлөлт) нь
        #    12 цагаар тайлагддаггүй: асуудал шийдэгдтэл хүнийх хэвээр.
        "state=case when fb_chats.state='done' then 'done' "
        "when fb_chats.handoff_at is not null then 'human' else excluded.state end;")


def log_bot(thread, in_text, out_text, tools, sent, mid, review, err, tok=None):
    tk = tok or [0, 0]
    psql("insert into fb_chat_bot_log (thread_id,in_text,out_text,tools,model,sent,out_mid,review,error,tok_in,tok_out) "
         "values (" + ','.join([sq(thread), sq(clip(in_text, 400)), sq(out_text),
                                sq(','.join(tools) or None), sq(MODEL),
                                'true' if sent else 'false', sq(mid),
                                'true' if review else 'false', sq(err),
                                str(int(tk[0])), str(int(tk[1]))]) + ");")


def send_approved(tok, page, now):
    """Аппаас БАТЛАГДСАН ноорог хариултуудыг илгээнэ.

    Баталгааны горимд бот хариултаа `fb_chat_bot_log`-д бичээд ЗОГСДОГ. CEO
    аппаас «Батлаад илгээх» дарахад тэр мөрд `approved_by` бичигдэнэ — энэ
    функц түүнийг олж илгээнэ. (Апп өөрөө Facebook руу хандаж ЧАДАХГҮЙ:
    токен зөвхөн VPS дээр байдаг. Бүүстын урсгалтай ижил зохион байгуулалт.)

    ⚠ Батлах хүртэлх хугацаанд Meta-гийн 24 цагийн цонх хаагдсан байж болно —
      илгээхийн ӨМНӨ дахин шалгана, эс бөгөөс Meta татгалзаад мөр «алдаатай»
      болж хүнд ойлгомжгүй болно.
    """
    rows = psql(
        "select l.id, l.thread_id, l.out_text, c.psid, c.last_in_at "
        "from fb_chat_bot_log l join fb_chats c using (thread_id) "
        "where l.review and not l.sent and l.approved_by is not null and l.error is null "
        "order by l.id limit 40;", rows=True)
    n = 0
    for r in rows:
        if len(r) < 5:
            continue
        rid, tid, text, psid, last_in = r[0], r[1], r[2], r[3], parse_ts(r[4])
        if not psid or not text:
            psql("update fb_chat_bot_log set error='хүлээн авагч тодорхойгүй' where id=" + rid + ";")
            continue
        if not in_window(last_in, now):
            psql("update fb_chat_bot_log set error='24 цагийн цонх хаагдсан' where id=" + rid + ";")
            handoff(tid, 'цонх хаагдсан — залгах')
            continue
        try:
            res = api_post(page + '/messages', {
                'recipient': json.dumps({'id': psid}),
                'message': json.dumps({'text': text}),
                'messaging_type': 'RESPONSE', 'access_token': tok})
            psql("update fb_chat_bot_log set sent=true, out_mid=" + sq(res.get('message_id'))
                 + " where id=" + rid + ";")
            n += 1
        except urllib.error.HTTPError as e:
            psql("update fb_chat_bot_log set error=" + sq('send %d %s' % (e.code, e.read().decode()[:150]))
                 + " where id=" + rid + ";")
            handoff(tid, 'илгээх алдаа')
    return n


def main():
    c = cfg()
    tok, page = c['FB_PAGE_TOKEN'], c['FB_PAGE_ID']
    now = datetime.now(timezone.utc)
    stamp = now.astimezone(UB).strftime('%Y-%m-%d %H:%M')
    conf = bot_config()
    bot_mids = known_bot_mids()
    pend = pending_threads()

    threads = fetch_threads(tok, page)
    todo = []
    for cv in threads:
        msgs = (cv.get('messages') or {}).get('data', [])
        parts = [p for p in ((cv.get('participants') or {}).get('data') or [])
                 if p.get('id') != page]
        who = parts[0] if parts else {}
        ins = [m for m in msgs if (m.get('from') or {}).get('id') != page]
        outs = [m for m in msgs if (m.get('from') or {}).get('id') == page]
        last_in = max([parse_ts(m.get('created_time')) for m in ins] or [None],
                      key=lambda x: (x is not None, x))
        last_out = max([parse_ts(m.get('created_time')) for m in outs] or [None],
                       key=lambda x: (x is not None, x))
        last_in_m = sorted(ins, key=lambda m: m.get('created_time') or '')[-1] if ins else {}
        st = thread_state(msgs, page, bot_mids, now)
        row = {'thread_id': cv.get('id'), 'psid': who.get('id'), 'name': who.get('name'),
               'first_at': parse_ts((sorted(msgs, key=lambda m: m.get('created_time') or '') or [{}])[0].get('created_time')),
               'last_at': parse_ts(cv.get('updated_time')),
               'last_in_at': last_in, 'last_in_mid': last_in_m.get('id'),
               'last_out_at': last_out, 'msgs_in': len(ins), 'msgs_out': len(outs),
               'state': st, 'turns': bot_turns(msgs, page, bot_mids)}
        if not DRY:
            upsert_chat(row)
        # Хариу хэрэгтэй юу: сүүлийн мессеж харилцагчийнх БА цонх нээлттэй.
        newest = sorted(msgs, key=lambda m: m.get('created_time') or '')[-1] if msgs else {}
        if (newest.get('from') or {}).get('id') != page and in_window(last_in, now):
            todo.append((row, msgs, (last_in_m.get('message') or '')))

    waiting = len(todo)
    print('[%s] чат %d | хариу хүлээж буй %d' % (stamp, len(threads), waiting))
    if PULL_ONLY:
        return

    # ⚠ Батлагдсан ноорог нь ботын горимоос ХАМААРАХГҮЙ илгээгдэнэ. CEO «батла»
    #   гээд дараа нь ботыг унтраасан ч тэр нэг хариулт явах ёстой — хүн шийдсэн.
    if not DRY:
        ap = send_approved(tok, page, now)
        if ap:
            print('       батлагдсан хариулт илгээв: %d' % ap)

    if not conf.get('enabled'):
        print('       бот УНТРААЛТТАЙ (app_config.fb_bot.enabled) — зөвхөн жагсаалт шинэчлэв')
        return
    key = c.get('ANTHROPIC_KEY')
    if not key:
        print('       ⚠ ANTHROPIC_KEY алга (fb.env) — бот хариулж чадахгүй')
        return

    review = bool(conf.get('review'))
    max_turns = int(conf.get('max_turns') or MAX_TURNS_DEF)
    sent_n = held_n = skip_n = 0
    for row, msgs, in_text in todo:
        tid = row['thread_id']
        if tid in pend:
            skip_n += 1
            continue                                    # ноорог хүлээж байна — давхардуулахгүй
        if row['state'] == 'human':
            skip_n += 1
            continue                                    # хүн гарт авсан — бот орохгүй
        if row['turns'] >= max_turns:
            handoff(tid, 'бот %d удаа хариулсан' % row['turns'])
            skip_n += 1
            continue
        if blind_on_photo(msgs, page):
            handoff(tid, 'зураг илгээсэн — бот харахгүй')
            skip_n += 1
            continue
        why = tripwire(in_text)
        if why:
            handoff(tid, why)
            skip_n += 1
            continue
        hist = history_for(msgs, page)
        if not hist:
            skip_n += 1
            continue
        try:
            text, tools, hand, tok_n = ask_claude(key, hist, row.get('name'))
        except urllib.error.HTTPError as e:
            log_bot(tid, in_text, None, [], False, None, False,
                    'claude %d %s' % (e.code, e.read().decode()[:120]))
            skip_n += 1
            continue
        if hand or not text:
            handoff(tid, hand or 'бот хариулт гаргаагүй')
            log_bot(tid, in_text, None, tools, False, None, False, hand or 'хоосон хариулт', tok_n)
            skip_n += 1
            continue
        text = clip(text)
        if DRY or review:
            log_bot(tid, in_text, text, tools, False, None, True, None, tok_n)
            held_n += 1
            print('   [хүлээлгэ] %s: %s' % ((row.get('name') or '?')[:16], text[:80]))
            continue
        try:
            r = api_post(page + '/messages', {
                'recipient': json.dumps({'id': row['psid']}),
                'message': json.dumps({'text': text}),
                'messaging_type': 'RESPONSE', 'access_token': tok})
            log_bot(tid, in_text, text, tools, True, r.get('message_id'), False, None, tok_n)
            sent_n += 1
        except urllib.error.HTTPError as e:
            log_bot(tid, in_text, text, tools, False, None, False,
                    'send %d %s' % (e.code, e.read().decode()[:150]), tok_n)
            handoff(tid, 'илгээх алдаа')
            skip_n += 1
    print('       илгээсэн %d | баталгаа хүлээж буй %d | хүнд үлдсэн %d'
          % (sent_n, held_n, skip_n))


def handoff(thread, why):
    psql("update fb_chats set state='human', handoff_at=now(), handoff_why=" + sq(why[:120])
         + ", updated_at=now() where thread_id=" + sq(thread) + " and state<>'done';")


# ── Өөрийгөө шалгах ────────────────────────────────────────────────────────

def selftest():
    n = [0]

    def eq(a, b, label):
        n[0] += 1
        if a != b:
            raise SystemExit('FAIL %s: %r != %r' % (label, a, b))

    P = 'PAGE'
    t0 = '2026-09-17T04:00:00+0000'
    t1 = '2026-09-17T04:05:00+0000'
    t2 = '2026-09-17T04:10:00+0000'
    ms = [{'id': 'a', 'created_time': t0, 'from': {'id': 'U'}, 'message': 'сайн уу'},
          {'id': 'b', 'created_time': t1, 'from': {'id': P}, 'message': 'сайн байна уу'}]
    fresh = parse_ts('2026-09-17T05:00:00+0000')      # ажилтны мессежээс 55 мин
    later = parse_ts('2026-09-18T05:00:00+0000')      # 24 цагийн дараа
    eq(thread_state(ms, P, {'b'}, fresh), 'bot', 'сүүлийн хариулт ботынх')
    eq(thread_state(ms, P, set(), fresh), 'human', 'ажилтан саяхан бичсэн бол human')
    # ⛔ Хугацаа өнгөрвөл ЭЗЭМШИЛ ТАЙЛАГДАНА — эс бөгөөс өнгөрсөн сард
    #    үйлчлүүлсэн 294 харилцагч бот руу хэзээ ч эргэж орохгүй.
    eq(thread_state(ms, P, set(), later), 'bot', 'ажилтны эзэмшил 12 цагийн дараа тайлагдана')
    eq(thread_state([ms[0]], P, set(), fresh), 'bot', 'хариулаагүй бол bot')
    eq(bot_turns(ms, P, {'b'}), 1, 'нэг эргэлт')
    eq(bot_turns(ms + [{'id': 'c', 'created_time': t2, 'from': {'id': P}}], P, {'b', 'c'}), 2, 'хоёр эргэлт')
    eq(bot_turns(ms + [{'id': 'c', 'created_time': t2, 'from': {'id': 'U'}}], P, {'b'}), 0,
       'харилцагч бичвэл тоолуур 0')

    now = parse_ts('2026-09-17T10:00:00+0000')
    eq(in_window(parse_ts('2026-09-17T04:00:00+0000'), now), True, '6 цаг — нээлттэй')
    eq(in_window(parse_ts('2026-09-15T04:00:00+0000'), now), False, '2 хоног — хаалттай')
    eq(in_window(None, now), False, 'мессежгүй — хаалттай')

    eq(tripwire('мөнгөө буцаагаад өгөөч'), 'мөнгө буцаалт', 'буцаалт')
    eq(tripwire('Хямдрал байна уу?'), 'хөнгөлөлт', 'хөнгөлөлт')
    eq(tripwire('гомдолтой байна'), 'гомдол', 'гомдол')
    eq(tripwire('Даргатай ярья'), 'удирдлага хүссэн', 'удирдлага')
    eq(tripwire('100 сандал хэрэгтэй'), '', 'энгийн асуулт дамжина')

    eq(clip('нэг. хоёр. гурав.', 12), 'нэг. хоёр.', 'өгүүлбэрийн төгсгөлөөр таслана')
    # Цэг хэт эрт байвал өгүүлбэрээр таслахгүй — эс бөгөөс хариулт утгагүй богиноно.
    eq(clip('нэг. хоёр. гурав.', 10), 'нэг. хоёр.', 'цэг хагасаас өмнө бол хатуу таслана')
    eq(clip('богино'), 'богино', 'богиныг хөндөхгүй')
    eq(work_now(10, 9, 18), True, 'ажлын цаг')
    eq(work_now(20, 9, 18), False, 'орой')
    eq(work_now(9, None, None), True, 'тариф уншигдаагүй — 9-18 нөөц')

    eq(phone_in('утас 99112233 байна'), '99112233', 'утас олдоно')
    eq(phone_in('2026 онд'), '', 'он утас биш')

    A = {'data': [{'mime_type': 'image/jpeg'}]}
    eq(has_attach({'attachments': A}), True, 'хавсралт таньдаг')
    eq(has_attach({'message': 'х'}), False, 'хавсралтгүй')
    # ⛔ Сүүлийн мессеж нь ЗӨВХӨН зураг бол бот сохор — 195 чатын 25 нь ийм.
    eq(blind_on_photo([{'id': 'a', 'created_time': t0, 'from': {'id': 'U'}, 'message': 'үнэ хэд вэ'},
                       {'id': 'b', 'created_time': t1, 'from': {'id': 'U'}, 'attachments': A}], P),
       True, 'зөвхөн зураг → сохор')
    eq(blind_on_photo([{'id': 'a', 'created_time': t0, 'from': {'id': 'U'}, 'attachments': A,
                        'message': 'энэ хэд вэ'}], P), False, 'зураг+бичвэр → сохор биш')
    eq(blind_on_photo([{'id': 'a', 'created_time': t0, 'from': {'id': 'U'}, 'attachments': A},
                       {'id': 'b', 'created_time': t1, 'from': {'id': P}, 'message': 'за'}], P),
       True, 'бид хариулсан ч харилцагчийн сүүлийнх зураг хэвээр')
    # Зурган мессеж ЧИМЭЭГҮЙ алгасагдахгүй — ярианы утга тасрахаас.
    hp = history_for([{'id': '1', 'created_time': t0, 'from': {'id': 'U'}, 'attachments': A}], P)
    eq(hp[0]['content'], '[зураг илгээв]', 'зураг тэмдэглэгдэнэ')

    h = history_for([{'id': '1', 'created_time': t0, 'from': {'id': P}, 'message': 'урьдын хариу'},
                     {'id': '2', 'created_time': t1, 'from': {'id': 'U'}, 'message': 'үнэ хэд вэ'},
                     {'id': '3', 'created_time': t2, 'from': {'id': 'U'}, 'message': 'сандал'}], P)
    eq(len(h), 1, 'дараалсан ижил талыг нэгтгэнэ')
    eq(h[0]['role'], 'user', 'эхнийх нь user байх ёстой')
    eq(h[0]['content'], 'үнэ хэд вэ\nсандал', 'бичвэр нэгдэв')

    eq(tool_delivery(0, {'delivery_city_fee': 50000, 'delivery_per_km': 2000})['city_fee_mnt'],
       50000, 'хот доторх төлбөр')
    eq(tool_delivery(10, {'delivery_city_fee': 50000, 'delivery_per_km': 2000})['one_way_mnt'],
       70000, 'км-ийн тооцоо')
    eq(sq("O'Neil"), "'O''Neil'", 'хашилт хамгаалагдав')
    print('fb_chat selftest: %d тест OK' % n[0])


if __name__ == '__main__':
    if '--selftest' in sys.argv:
        selftest()
    else:
        main()
