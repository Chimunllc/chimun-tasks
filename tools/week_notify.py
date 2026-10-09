#!/usr/bin/env python3
"""
week_notify.py — Даваа өглөө CEO-д «долоо хоногийн тойм» мэдэгдэл.

Үлгэр: EOS-ийн долоо хоногийн хурлын эхний минут — онооны самбар + шийдвэр
хүлээж буй зүйл + хоцорсон ажил. Хурал хийхгүй; мэдэгдэл дарахад Төлөвлөгөө
дэлгэц (`./#plan`) нээгдэж, дээд талд нь 8 тоо, доор нь шийдвэр/явц харагдана.

⛔ Тоонуудын дүрэм нь аппын `planBoard`-тай ИЖИЛ байх ёстой — test/run.js нэг
   өгөгдлийг хоёуланд нь өгч тулгана (`--counts`). Нэг газар зассан бол нөгөөг.
⛔ Онооны самбарын 8 тоог энд ДАХИН БОДОХГҮЙ — тэдгээрийн дүрэм аппад (авлага,
   дуудлага, цагтаа хүрэлт …). Мэдэгдэл зөвхөн тоолж болох 2 зүйлийг хэлнэ.
⚠ Долоо хоногт НЭГ удаа тул юу ч хүлээгдээгүй ч илгээнэ (хэмнэл нь өөрөө зорилго).
⚠ Хүлээн авагч `app_config['week_notify']` → байхгүй бол `pbx_notify`-гийнх.

Тест:   python3 tools/week_notify.py --selftest
Тулгалт: python3 tools/week_notify.py --counts fixture.json   (test/run.js дууддаг)
Хуурай: python3 tools/week_notify.py --dry
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
DRY = '--dry' in sys.argv


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


def psql_json(sql):
    p = subprocess.run(['docker', 'exec', '-i', CONTAINER, 'psql', '-U', 'chimun', '-d', 'chimun',
                        '-v', 'ON_ERROR_STOP=1', '-t', '-A', '-c', sql], capture_output=True, text=True)
    if p.returncode:
        raise SystemExit('psql: ' + p.stderr.strip())
    out = p.stdout.strip()
    return json.loads(out) if out else None


# ── Цэвэр функцууд (аппын planBoard-ийн толь) ─────────────────────────────────
def applied(x):
    return bool(x.get('done_by') == 'applied' or x.get('applied_at'))


def pending(x):
    return x.get('sec') == 'idea' and x.get('status') != 'done' and not applied(x)


def board_counts(plan, tasks, today):
    """{decide, late} — decide = таны шийдвэр хүлээж буй санаачлага (planBoard.decide),
    late = хоцорсон ажилтай санаачлага (planProgress.late > 0)."""
    rows = [x for x in (plan or []) if isinstance(x, dict) and x.get('id')]
    ids = {str(x['id']) for x in rows}
    by_task = {str(t.get('id')): t for t in (tasks or []) if isinstance(t, dict) and t.get('id')}

    def is_step(x):
        p = str(x.get('parent') or '')
        return bool(p) and p in ids and p != str(x['id'])

    kids = {}
    for x in rows:
        if is_step(x):
            kids.setdefault(str(x['parent']), []).append(x)
    decide = late = 0
    for x in rows:
        if is_step(x):
            continue
        ks = kids.get(str(x['id']), [])
        if x.get('sec') != 'no' and (pending(x) or any(pending(k) for k in ks)):
            decide += 1
        n_late = 0
        for r in [x] + ks:
            tid = str((r.get('undo') or {}).get('task_id') or '') if applied(r) else ''
            t = by_task.get(tid) if tid else None
            if not t or t.get('status') in ('done', 'deleted'):
                continue
            due = str(t.get('due') or '')[:10]
            if due and due < today:
                n_late += 1
        if n_late:
            late += 1
    return {'decide': decide, 'late': late}


def compose(c):
    d, l = c['decide'], c['late']
    parts = []
    if d:
        parts.append(f'{d} санал таны шийдвэрийг хүлээж байна')
    if l:
        parts.append(f'{l} санаачлагын ажил хоцорсон')
    body = (' · '.join(parts) + '. ') if parts else 'Шийдвэр хүлээж буй, хоцорсон ажил алга. '
    body += 'Долоо хоногийн 8 тоог Төлөвлөгөөний дээд талаас хараарай.'
    return {'kind': 'plan', 'title': '📊 Долоо хоногийн тойм', 'body': body[:160], 'url': './#plan'}


def recipients(cfg):
    out = []
    for v in (cfg or {}).get('to') or []:
        d = re.sub(r'\D', '', str(v))
        if len(d) >= 6 and d not in out:
            out.append(d)
    return out


def push(secret, phone, payload):
    body = dict(payload, internal=secret, email=phone)   # ⛔ email хоосон = БҮГДЭД
    req = urllib.request.Request(PUSH_URL, data=json.dumps(body).encode(),
                                 headers={'Content-Type': 'application/json'}, method='POST')
    with urllib.request.urlopen(req, timeout=30) as r:
        return r.status


def main():
    today = datetime.now(UB).strftime('%Y-%m-%d')
    plan = psql_json("select value from app_config where key = 'plan'") or []
    tids = sorted({str((x.get('undo') or {}).get('task_id')) for x in plan
                   if isinstance(x, dict) and (x.get('undo') or {}).get('task_id')})
    tasks = []
    if tids:
        lit = ','.join("'" + re.sub(r'[^A-Za-z0-9_\-]', '', t) + "'" for t in tids)
        tasks = psql_json(f"select coalesce(json_agg(json_build_object('id', id, 'status', status, 'due', due)), '[]') "
                          f"from tasks where id in ({lit})") or []
    c = board_counts(plan, tasks, today)
    msg = compose(c)
    if DRY:
        print(json.dumps({'counts': c, 'push': msg}, ensure_ascii=False))
        return
    secret = load_env(PUSH_ENV).get('PUSH_INTERNAL_KEY')
    cfg_w = psql_json("select value from app_config where key = 'week_notify'") or {}
    cfg_p = psql_json("select value from app_config where key = 'pbx_notify'") or {}
    to = recipients(cfg_w) or recipients(cfg_p)
    if not (secret and to):
        print(f'{today} week_notify: нууц эсвэл хүлээн авагч алга')
        return
    for ph in to:
        try:
            push(secret, ph, msg)
        except Exception as e:
            print(f'{today} week_notify: push алдаа: {e}')
    print(f'{today} week_notify: илгээв ({c["decide"]} шийдвэр, {c["late"]} хоцорсон)')


def selftest():
    f = []

    def eq(name, got, want):
        if got != want:
            f.append(f'{name}: хүлээсэн {want!r}, ирсэн {got!r}')

    tasks = [{'id': 't1', 'status': 'done'}, {'id': 't2', 'status': 'open', 'due': '2026-10-01'},
             {'id': 't3', 'status': 'open', 'due': '2026-12-01'}, {'id': 't4', 'status': 'deleted', 'due': '2026-01-01'}]
    plan = [
        {'id': 'A', 'sec': 'idea'},
        {'id': 'B', 'sec': 'now'}, {'id': 'B1', 'parent': 'B', 'sec': 'idea', 'do': {'kind': 'task'}},
        {'id': 'C', 'sec': 'now'},
        {'id': 'C1', 'parent': 'C', 'done_by': 'applied', 'undo': {'task_id': 't1'}},
        {'id': 'C2', 'parent': 'C', 'done_by': 'applied', 'undo': {'task_id': 't2'}},
        {'id': 'C3', 'parent': 'C', 'done_by': 'applied', 'undo': {'task_id': 't4'}},
        {'id': 'E', 'sec': 'next', 'status': 'done', 'done_by': 'applied', 'undo': {'task_id': 't3'}},
        {'id': 'F', 'sec': 'no', 'title': 'үгүй'},
        {'id': 'N', 'sec': 'idea', 'status': 'done'},
    ]
    eq('шийдвэр ба хоцролт', board_counts(plan, tasks, '2026-10-09'), {'decide': 2, 'late': 1})
    eq('хоосон', board_counts(None, None, '2026-10-09'), {'decide': 0, 'late': 0})
    eq('устсан ажил хоцрохгүй', board_counts([{'id': 'Z', 'sec': 'now', 'done_by': 'applied',
       'undo': {'task_id': 't4'}}], tasks, '2026-10-09')['late'], 0)
    m = compose({'decide': 2, 'late': 1})
    eq('мэдэгдэлд тоо', '2 санал' in m['body'] and '1 санаачлагын' in m['body'], True)
    eq('төлөвлөгөө рүү холбоос', m['url'], './#plan')
    eq('юу ч алгад ч илгээнэ', 'алга' in compose({'decide': 0, 'late': 0})['body'], True)
    eq('хүлээн авагч', recipients({'to': ['9911-2233', 'x']}), ['99112233'])
    if f:
        print('❌ week_notify selftest:\n  ' + '\n  '.join(f))
        sys.exit(1)
    print('✅ week_notify selftest OK')


if __name__ == '__main__':
    if '--selftest' in sys.argv:
        selftest()
    elif '--counts' in sys.argv:
        d = json.load(open(sys.argv[sys.argv.index('--counts') + 1]))
        print(json.dumps(board_counts(d.get('plan'), d.get('tasks'), d.get('today'))))
    else:
        main()
