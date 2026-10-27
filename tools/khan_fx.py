#!/usr/bin/env python3
"""
khan_fx.py — Хаан банкны ЮАНИЙН ХАНШ (бэлэн бус ЗАРАХ) → app_config['fx_cny'].

Худалдан авалтын өртгийн суурь = Хаан банкны тухайн өдрийн «бэлэн бус зарах» ханш (CEO, 2026-10-27).
Хаан банкны сайт өөрөө нийтэд нээлттэй `GET https://www.khanbank.com/api/back/rates?date=YYYY-MM-DD`
дууддаг (captcha/нэвтрэлтгүй) — түүнийг л уншина. Апп ЗӨВХӨН уншина, ханш гараар оруулахгүй.

  · `sellRate` = бэлэн бус ЗАРАХ (CNY: 541.2) · `cashSellRate` = бэлэн зарах (543.9) — ХОЁР ӨӨР тоо.
  ⛔ Андуурахгүйн тулд бэлэн бус нь бэлнээс ДООР байх ёстой гэж шалгана; эс бөгөөс талбар солигдсон гэж үзээд
     БИЧИХГҮЙ (чимээгүй буруу ханш бичихээс гарсан нь дээр — апп «ханш татагдаагүй» гэж ил хэлнэ).
  ⛔ Хэмжээ/бүтэц эвдэрсэн (100–2000 ₮/¥-ээс гадуур) ханш бичихгүй.

⛔ ХААН БАНК bot-хамгаалалттай (validate.khanbank.com/bot/captcha). Олон хүсэлтийг ар араасаа илгээвэл (амьд туршилтаар баталсан:
   16 хүсэлт 2 минутад) captcha руу чиглүүлж IP-г түр хаадаг. Тиймээс: өдөрт цөөхөн удаа, нэг ажиллагаанд ≤ 2 хүсэлт, хооронд нь
   завсар. ⛔ Captcha/хамгаалалтыг ХЭЗЭЭ Ч тойроход оролдохгүй (өөр IP, хуурамч браузер, cookie г.м.) — хориглосон бол ЗОГСОЖ,
   `BLOCK_HOURS` цаг хүлээнэ. Ханш татагдаагүй үед апп ил хэлж, ханшийг гараар оруулахыг хүснэ.

Бичлэг: `{ rates: { 'YYYY-MM-DD': { r, cash, by:'khanbank', at } } }`. Өдөрт нэг мөр, өдрийн дотор ханш солигдвол
дарж бичнэ (`at` = сүүлд татсан цаг). Өнөөдрөөс гадна өнгөрсөн 7 хоногийн дутуу өдрийг нөхнө; 45 хоногоос хуучныг хаяна.

Cron (VPS): `5 9,12,15,18 * * * python3 /opt/chimun/marketing/khan_fx.py >> /opt/chimun/marketing/fb.log 2>&1`
Тест:  python3 tools/khan_fx.py --selftest        Хуурай: python3 tools/khan_fx.py --dry
"""
import json
import os
import subprocess
import sys
import time
import urllib.error
import urllib.request
from datetime import datetime, timedelta, timezone

CONTAINER = 'vps-deploy-postgres-1'
URL = 'https://www.khanbank.com/api/back/rates?date=%s'
UB = timezone(timedelta(hours=8))
KEEP_DAYS = 45
BACKFILL_DAYS = 7
BACKFILL_PER_RUN = 1   # банк ар араасаа олон хүсэлтийг captcha-аар таслан хаадаг — нэг ажиллагаанд ≤ 2 хүсэлт (өнөөдөр + 1)
PAUSE_SEC = 20         # хүсэлт хоорондын завсар (өгөөмөр хандана; хязгаарлалтыг тойрохгүй)
BLOCK_HOURS = 6        # captcha руу чиглүүлсэн бол энэ хугацаанд ЯМАР Ч хүсэлт илгээхгүй
BLOCK_FILE = '/tmp/khan_fx.block'
RETRIES = 1            # шууд дахин оролдохгүй (оролдлого бүр хязгаарлалтад тоологдоно)
DRY = '--dry' in sys.argv


def pick_cny(rows):
    """Хаан банкны жагсаалтаас (бэлэн бус зарах, бэлэн зарах). Бүтэц/утга эргэлзээтэй бол None."""
    for x in rows if isinstance(rows, list) else []:
        if not isinstance(x, dict) or x.get('currency') != 'CNY':
            continue
        try:
            sell = float(x['sellRate'])
            cash = float(x['cashSellRate'])
        except (KeyError, TypeError, ValueError):
            return None
        if not (100 <= sell <= 2000) or not (100 <= cash <= 2000):
            return None
        if sell > cash:   # бэлэн бус зарах нь бэлэн зарахаас ДООР — зөрвөл талбар солигдсон
            return None
        return round(sell, 2), round(cash, 2)
    return None


def wanted_dates(today, have):
    """Өнөөдөр ҮРГЭЛЖ (өдрийн дотор солигддог), өнгөрсөн өдрүүдээс зөвхөн дутууг (ажиллагаа бүрд цөөхөн, хамгийн сүүлийнхээс)."""
    out = [today.isoformat()]
    miss = [(today - timedelta(days=i)).isoformat() for i in range(1, BACKFILL_DAYS + 1)]
    out += [d for d in miss if d not in have][:BACKFILL_PER_RUN]
    return out


def upsert_sql():
    """psql хувьсагчаар (:'d' …) — утгыг SQL-д шууд наахгүй."""
    return """
insert into app_config(key, value)
values ('fx_cny', jsonb_build_object('rates', jsonb_build_object(:'d',
        jsonb_build_object('r', (:'r')::numeric, 'cash', (:'c')::numeric, 'by', 'khanbank', 'at', :'at'))))
on conflict (key) do update
  set value = jsonb_set(
        jsonb_set(coalesce(app_config.value, '{}'::jsonb), '{rates}', coalesce(app_config.value->'rates', '{}'::jsonb), true),
        array['rates', :'d'], excluded.value #> array['rates', :'d'], true),
      updated_at = now();
update app_config
   set value = jsonb_set(value, '{rates}',
        coalesce((select jsonb_object_agg(k, v) from jsonb_each(value->'rates') as e(k, v) where k >= :'cut'), '{}'::jsonb))
 where key = 'fx_cny' and jsonb_typeof(value->'rates') = 'object';
"""


def psql(sql, vars_=None, tuples=False):
    cmd = ['docker', 'exec', '-i', CONTAINER, 'psql', '-U', 'chimun', '-d', 'chimun', '-v', 'ON_ERROR_STOP=1']
    if tuples:
        cmd += ['-t', '-A']
    for k, v in (vars_ or {}).items():
        cmd += ['-v', f'{k}={v}']
    cmd += ['-f', '-']
    p = subprocess.run(cmd, input=sql, capture_output=True, text=True)
    if p.returncode:
        raise RuntimeError('psql: ' + p.stderr.strip())
    return p.stdout.strip()


class Blocked(Exception):
    """Банк bot-хамгаалалтаар (captcha) хориглосон."""


def is_captcha(location):
    return 'captcha' in str(location or '').lower() or '/bot/' in str(location or '').lower()


class _NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, *a, **k):   # captcha хуудас руу дагахгүй — зөвхөн хориглосныг таних
        return None


def fetch(day):
    req = urllib.request.Request(URL % day, headers={'User-Agent': 'Mozilla/5.0 (chimun-fx)', 'Accept': 'application/json'})
    opener = urllib.request.build_opener(_NoRedirect)
    last = None
    for i in range(RETRIES):
        try:
            with opener.open(req, timeout=20) as r:
                return json.loads(r.read().decode('utf-8'))
        except urllib.error.HTTPError as e:
            if e.code in (301, 302, 303, 307, 308) and is_captcha(e.headers.get('Location')):
                raise Blocked('captcha')
            last = e
        except Blocked:
            raise
        except Exception as e:   # хоосон хариу / таслагдсан холболт — банк хязгаарласан байж болно, шууд дахин оролдохгүй
            last = e
    raise last


def blocked_now(now_ts=None, path=BLOCK_FILE):
    try:
        return ((now_ts or time.time()) - os.path.getmtime(path)) < BLOCK_HOURS * 3600
    except OSError:
        return False


def stored_dates():
    out = psql("select coalesce(value->'rates', '{}'::jsonb) from app_config where key = 'fx_cny';", tuples=True)
    try:
        return set((json.loads(out) if out else {}).keys())
    except ValueError:
        return set()


def main():
    now = datetime.now(UB)
    today = now.date()
    if blocked_now() and not DRY:
        print(f'khan_fx: банкны bot-хамгаалалт саяхан хориглосон — {BLOCK_HOURS} цаг хүлээнэ, хүсэлт илгээсэнгүй')
        return
    have = set() if DRY else stored_dates()
    failed_today = False
    for n, day in enumerate(wanted_dates(today, have)):
        if n:
            time.sleep(PAUSE_SEC)
        try:
            got = pick_cny(fetch(day))
        except Blocked:
            print(f'khan_fx: {day} банк captcha руу чиглүүлэв — ЗОГСЛОО ({BLOCK_HOURS} цаг хүсэлт илгээхгүй). Хамгаалалтыг тойрохгүй.')
            if not DRY:
                open(BLOCK_FILE, 'w').write(str(time.time()))
            sys.exit(1)
        except Exception as e:   # сүлжээ/JSON — өнөөдрийнх бол exit 1, өнгөрсөн өдөр бол зөвхөн лог
            print(f'khan_fx: {day} татаж чадсангүй: {e}')
            failed_today = failed_today or day == today.isoformat()
            continue
        if not got:
            print(f'khan_fx: {day} CNY мөр олдсонгүй эсвэл бүтэц эргэлзээтэй — БИЧИХГҮЙ')
            failed_today = failed_today or day == today.isoformat()
            continue
        sell, cash = got
        print(f'khan_fx: {day} ¥1 = {sell}₮ (бэлэн бус зарах; бэлэн {cash})' + (' [хуурай]' if DRY else ''))
        if DRY:
            continue
        cut = (today - timedelta(days=KEEP_DAYS)).isoformat()
        psql(upsert_sql(), {'d': day, 'r': sell, 'c': cash, 'at': now.astimezone(timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ'), 'cut': cut})
    if failed_today:
        sys.exit(1)


def selftest():
    row = lambda sell, cash: {'currency': 'CNY', 'sellRate': sell, 'cashSellRate': cash, 'buyRate': 537, 'cashBuyRate': 537}
    assert pick_cny([{'currency': 'USD', 'sellRate': 3599, 'cashSellRate': 3617}, row(541.2, 543.9)]) == (541.2, 543.9), 'бэлэн бус зарах'
    assert pick_cny([row(543.9, 541.2)]) is None, 'талбар солигдсон (бэлэн бус > бэлэн) → бичихгүй'
    assert pick_cny([row(5.4, 5.5)]) is None and pick_cny([row(54120, 54390)]) is None, 'хэмжээ эвдэрсэн → бичихгүй'
    assert pick_cny([row('x', 1)]) is None and pick_cny([{'currency': 'CNY'}]) is None, 'бүтэц эвдэрсэн → бичихгүй'
    assert pick_cny([{'currency': 'USD', 'sellRate': 3599, 'cashSellRate': 3617}]) is None and pick_cny({'a': 1}) is None and pick_cny(None) is None, 'CNY олдохгүй'
    assert pick_cny([row(541.2, 541.2)]) == (541.2, 541.2), 'тэнцүү байж болно'
    assert is_captcha('https://validate.khanbank.com/bot/captcha?ssa=x') and not is_captcha('https://www.khanbank.com/api/back/rates') and not is_captcha(None), 'captcha чиглүүлгийг таних'
    import tempfile
    with tempfile.NamedTemporaryFile() as tf:
        assert blocked_now(path=tf.name) and not blocked_now(time.time() + BLOCK_HOURS * 3600 + 5, tf.name), 'хориг BLOCK_HOURS хүртэл'
    assert not blocked_now(path='/nonexistent/khan.block'), 'хориг файл байхгүй бол саадгүй'
    t = datetime(2026, 10, 27).date()
    ds = wanted_dates(t, {'2026-10-26', '2026-10-24'})
    assert ds == ['2026-10-27', '2026-10-25'], 'өнөөдөр үргэлж + дутуу өнгөрсөн өдрөөс ГАНЦ нэгийг (банкийг дарамтлахгүй)'
    assert len(wanted_dates(t, set())) == 1 + BACKFILL_PER_RUN
    assert wanted_dates(t, {'2026-10-27'})[0] == '2026-10-27', 'өнөөдөр хадгалагдсан ч дахин татна (өдрийн дотор ханш солигдоно)'
    s = upsert_sql()
    assert ":'d'" in s and ":'r'" in s and "'{rates}'" in s and "k >= :'cut'" in s, 'SQL хувьсагчтай, rates байхгүй үед ч үүсгэнэ, хуучныг хаяна'
    assert 'sellRate' not in s and 'khanbank' in s
    print('khan_fx selftest OK')


if __name__ == '__main__':
    if '--selftest' in sys.argv:
        selftest()
    else:
        main()
