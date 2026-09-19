#!/usr/bin/env python3
"""Google Search Console — нэг удаагийн зөвшөөрөл авах (CEO-гийн Mac дээр).

ЯАГААД MAC ДЭЭР: Google нь 2022-оос хойш «код хуулах» (OOB) урсгалыг хаасан —
зөвшөөрөл нь `http://localhost` руу л буцдаг. VPS дээр браузер байхгүй тул
зөвшөөрлийг энд авч, гарсан refresh token-ыг VPS рүү хуулна.

  python3 tools/gsc_auth.py           # браузер нээж, refresh token хэвлэнэ

Түлхүүрийг Google Cloud → Clients → gsc-pull → ⬇ гэж татсаны дараа скрипт
`~/Downloads/client_secret_*.json`-г ӨӨРӨӨ олно (шинийг нь эхэлж). Өөр зам
бол argv-д өг. Хувьсагчаар ч болно: GSC_CLIENT_ID / GSC_CLIENT_SECRET.

⛔ ТҮЛХҮҮР Ч, ТОКЕН Ч ДЭЛГЭЦЭД ХЭВЛЭГДЭХГҮЙ — шууд файлд бичигдэнэ.
"""
import glob, http.server, json, os, secrets, socketserver, sys, threading
import urllib.parse, urllib.request, webbrowser

# Хоёр scope НЭГ токенд: Search Console (хайлтын үг) + Analytics (сайтын зочид).
# ⚠ Аль нэгийг нь нэмбэл ХУУЧИН токен тэр эрхийг АВАХГҮЙ — дахин Allow хийнэ.
SCOPE = ('https://www.googleapis.com/auth/webmasters.readonly'
         ' https://www.googleapis.com/auth/analytics.readonly')
AUTH = 'https://accounts.google.com/o/oauth2/v2/auth'
TOKEN = 'https://oauth2.googleapis.com/token'
OUT = os.path.expanduser('~/.chimun/gsc.env')
PORT = 8765
REDIRECT = f'http://localhost:{PORT}/'

SITE = os.environ.get('GSC_SITE', 'https://mevent.mn/').strip()


def client_from_json(path):
    """Google-ийн татуулдаг клиентийн JSON-оос id/secret-ийг гаргана."""
    with open(path) as f:
        d = json.load(f)
    d = d.get('installed') or d.get('web') or {}
    return d.get('client_id', '').strip(), d.get('client_secret', '').strip()


cid = os.environ.get('GSC_CLIENT_ID', '').strip()
csec = os.environ.get('GSC_CLIENT_SECRET', '').strip()
if not cid or not csec:
    # ⚠ Түлхүүрийг гараар хуулуулахгүй — татсан файлаас уншина.
    args = [a for a in sys.argv[1:] if not a.startswith('-')]
    for p in args or sorted(glob.glob(os.path.expanduser('~/Downloads/client_secret_*.json')),
                            key=os.path.getmtime, reverse=True):
        try:
            cid, csec = client_from_json(p)
        except (OSError, ValueError):
            continue
        if cid and csec:
            print('Клиент: ' + os.path.basename(p))
            break
if not cid or not csec:
    raise SystemExit('Клиентийн JSON олдсонгүй. Google Cloud → Clients → gsc-pull → ⬇ дарж '
                     'татаад дахин ажиллуул (эсвэл файлын замыг argv-д өг).')

state = secrets.token_urlsafe(16)
got = {}


class H(http.server.BaseHTTPRequestHandler):
    def do_GET(self):
        q = urllib.parse.parse_qs(urllib.parse.urlparse(self.path).query)
        got.update({k: v[0] for k, v in q.items()})
        ok = got.get('state') == state and 'code' in got
        self.send_response(200)
        self.send_header('Content-Type', 'text/html; charset=utf-8')
        self.end_headers()
        self.wfile.write(('<h2 style="font-family:system-ui">'
                          + ('✅ Боллоо. Терминал руугаа буцаарай.' if ok
                             else '❌ Амжилтгүй: ' + str(got.get('error', 'тодорхойгүй')))
                          + '</h2>').encode())
        threading.Thread(target=self.server.shutdown, daemon=True).start()

    def log_message(self, *a):
        pass


url = AUTH + '?' + urllib.parse.urlencode({
    'client_id': cid, 'redirect_uri': REDIRECT, 'response_type': 'code',
    'scope': SCOPE, 'access_type': 'offline', 'prompt': 'consent', 'state': state,
})
print('Браузерт нээж байна. Google дээр «Allow» дарна уу:\n' + url + '\n')
webbrowser.open(url)
with socketserver.TCPServer(('127.0.0.1', PORT), H) as s:
    s.serve_forever()

if 'code' not in got:
    raise SystemExit('зөвшөөрөл авагдсангүй: ' + str(got.get('error', '')))

body = urllib.parse.urlencode({
    'code': got['code'], 'client_id': cid, 'client_secret': csec,
    'redirect_uri': REDIRECT, 'grant_type': 'authorization_code'}).encode()
with urllib.request.urlopen(urllib.request.Request(TOKEN, data=body), timeout=30) as r:
    tok = json.loads(r.read().decode())
if 'refresh_token' not in tok:
    raise SystemExit('refresh_token ирсэнгүй: ' + json.dumps(tok)[:200])

os.makedirs(os.path.dirname(OUT), exist_ok=True)
with open(OUT, 'w') as f:
    f.write(f'GSC_CLIENT_ID={cid}\nGSC_CLIENT_SECRET={csec}\n'
            f'GSC_REFRESH_TOKEN={tok["refresh_token"]}\nGSC_SITE={SITE}\n')
os.chmod(OUT, 0o600)
print(f'✅ Хадгалагдлаа: {OUT} (эрх 600). Токен дэлгэцэд хэвлэгдээгүй.')
