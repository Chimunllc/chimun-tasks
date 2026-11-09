#!/usr/bin/env python3
"""
task_notify.py — Даалгаврын сануулга (хэн нэгэн апп нээхийг ХҮЛЭЭХГҮЙ): хугацаа дуусахаас 24 ба 2 цагийн өмнө ажилтанд,
хугацаа хэтэрвэл ажилтан + даалгавар өгсөн хүнд push. VPS cron: 10 минут тутам, `flock`.

  */10 * * * * flock -n /tmp/task_notify.lock python3 /opt/chimun/marketing/task_notify.py >> /var/log/task_notify.log 2>&1

⛔ ОНОО ЭНД БОДОГДОХГҮЙ. Оноо = аппын `taskPtsLedger` (даалгаврын ФАКТААС гарна, давхар тоологдохгүй). Энэ скрипт зөвхөн
   «хэзээ сануулах» гэдгийг шийднэ — тиймээс `due_ts` (хугацаа, сунгалт, чөлөөт өдрийн зогсолт) аппын `taskPtsView`-тэй ИЖИЛ байх
   ёстой: test/run.js нэг өгөгдлийг JS ба Python хоёуланд өгч тулгана (`--plan fixture.json`). Нэгийг засвал нөгөөг.
⛔ Мэдэгдэл ДАВХАР явахгүй: `app_config['task_notify_sent']` (зөвхөн энэ скрипт бичнэ, RLS-ийг алгасдаг эзний эрхээр) — түлхүүр =
   даалгавар|төрөл|хугацаа(ms)|утас. Хугацаа сунгагдвал (ms өөрчлөгдөнө) шинээр сануулна.
⛔ `app_config['task_points'].from` хоосон бол ЮУ Ч илгээхгүй (оноо унтраалттай = мэдэгдэл ч үгүй). Зөвхөн `from`-оос хойш ҮҮССЭН ажил.
⚠ tasks.assignee / created_by нь НЭР хадгалдаг (утас БИШ) → `employees`-аас нэрээр утас олно. Нэр давхцсан/олдоогүй хүнд ИЛГЭЭХГҮЙ
   (таамаглахгүй), тоолж лог руу бичнэ.
⚠ Шинэ ажлын мэдэгдэл (`#ack-`) аппаас шууд явдаг (`notifyTaskAssigned`) — энд давтахгүй.

Тест:    python3 tools/task_notify.py --selftest
Хуурай:  python3 tools/task_notify.py --dry          (DB уншина, ЮУ Ч илгээхгүй/бичихгүй)
Тулгалт: python3 tools/task_notify.py --plan fixture.json   (test/run.js дууддаг; DB/сүлжээнд хүрэхгүй)
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
HOUR = 3600 * 1000
DAY = 24 * HOUR
REMIND_H = (24, 2)           # аппын тохиргоотой ижил биш — сануулгын цаг тогтмол (CEO: 24ц ба 2ц)
DRY = '--dry' in sys.argv

TOKEN_RE = r'⟦%s\|([^⟧]*)⟧'


def tk_get(kpi, name):
    m = re.search(TOKEN_RE % name, kpi or '')
    return m.group(1) if m else ''


def tk_all(kpi, name):
    return re.findall(TOKEN_RE % name, kpi or '')


def ub_ts(day, hm):
    """'2026-11-10','18:00' → ms (УБ, +08:00). Цаггүй бол 23:59. Буруу бол None."""
    if not re.match(r'^\d{4}-\d{2}-\d{2}$', day or ''):
        return None
    hm = hm if re.match(r'^\d{2}:\d{2}$', hm or '') else '23:59'
    try:
        d = datetime.strptime(day + ' ' + hm, '%Y-%m-%d %H:%M').replace(tzinfo=UB)
    except ValueError:
        return None
    return int(d.timestamp() * 1000)


def ub_day(ms):
    return datetime.fromtimestamp(ms / 1000, UB).strftime('%Y-%m-%d')


def ub_hm(ms):
    return datetime.fromtimestamp(ms / 1000, UB).strftime('%H:%M')


def add_days(day, n):
    return (datetime.strptime(day, '%Y-%m-%d') + timedelta(days=n)).strftime('%Y-%m-%d')


def extensions(kpi):
    out = []
    for s in tk_all(kpi, 'XR'):
        f = s.split('|')
        try:
            req = int(float(f[0]))
        except (ValueError, IndexError):
            continue
        if req and len(f) > 1 and re.match(r'^\d{4}-\d{2}-\d{2}$', f[1] or ''):
            out.append({'req': req, 'date': f[1], 'time': f[2] if len(f) > 2 else '', 'st': f[3] if len(f) > 3 else 'p',
                        'prev_date': f[5] if len(f) > 5 else '', 'prev_time': f[6] if len(f) > 6 else ''})
    return sorted(out, key=lambda x: x['req'])


def due_chain(task):
    """(due_ms, hold) — аппын `taskDueChain`-ийн толь: сунгалт хугацаа дуусахаас ӨМНӨ ирсэн бол л хүчинтэй; хүлээгдэж буй = hold."""
    kpi = task.get('kpi_code') or ''
    xs = extensions(kpi)
    due = ub_ts(xs[0]['prev_date'], xs[0]['prev_time']) if xs else None
    if due is None:
        due = ub_ts(str(task.get('due') or '')[:10], tk_get(kpi, 'DT'))
    if due is None:
        return None, False
    hold = False
    for x in xs:
        if x['req'] > due:
            continue
        if x['st'] == 'a':
            nd = ub_ts(x['date'], x['time'])
            if nd is not None and nd > due:
                due = nd
        elif x['st'] == 'p':
            hold = True
    return due, hold


def eff_due(due, person, created_ms, off_day):
    """Чөлөөт өдөр хугацаа 24ц хойшилно (аппын `taskEffDueTs`)."""
    if due is None or off_day is None:
        return due
    eff, d = due, ub_day(created_ms or due)
    for _ in range(120):
        if d > ub_day(eff):
            break
        if off_day(person, d):
            eff += DAY
        d = add_days(d, 1)
    return eff


def make_off_day(callins):
    """callins = {(phone, 'YYYY-MM-DD')} идэвхтэй хуваарь. Тухайн 7 хоногт (Да–Ня) хуваарьтай атлаа ЭНЭ өдөр хуваарьгүй = чөлөөт."""
    if callins is None:
        return None
    on = {(re.sub(r'\D', '', k), d) for k, d in callins}

    def off(person, day):
        p = re.sub(r'\D', '', person or '')
        if (p, day) in on:
            return False
        wd = datetime.strptime(day, '%Y-%m-%d').weekday()   # 0 = Даваа
        return any((p, add_days(day, i - wd)) in on for i in range(7) if i != wd)
    return off


def created_ms(task):
    c = task.get('created')
    try:
        n = float(c)
        return int(n)
    except (TypeError, ValueError):
        pass
    try:
        return int(datetime.fromisoformat(str(c).replace('Z', '+00:00')).timestamp() * 1000)
    except (TypeError, ValueError):
        return 0


def eligible(task, frm):
    if not frm or not task:
        return False
    if task.get('kind') in ('act_parent', 'finance_request') or str(task.get('id', '')).startswith('ordstage__'):
        return False
    if not task.get('created_by') or re.match(r'^(SYSTEM|Claude)$', str(task['created_by']), re.I):
        return False
    if task.get('status') in ('done', 'deleted', 'declined'):
        return False
    c = created_ms(task)
    return bool(c) and ub_day(c) >= frm and bool(re.match(r'^\d{4}-\d{2}-\d{2}', str(task.get('due') or '')))


def participants(task):
    out = [task.get('assignee')] if task.get('assignee') else []
    co = task.get('co_assignees')
    if isinstance(co, str):
        try:
            co = json.loads(co)
        except ValueError:
            co = [x for x in co.split(',')]
    for x in co or []:
        x = str(x).strip()
        if x and x not in out:
            out.append(x)
    return [p for p in out if p != task.get('created_by')]   # өөртөө өгсөн ажилд сануулахгүй


def plan(tasks, now, sent, frm, phones, callins=None):
    """→ [{key, to, kind, task, title, body}] — илгээх ёстой мэдэгдлүүд. Цэвэр функц (DB/сүлжээгүй).
    phones = {нэр: утас} (давхцсан/олдоогүй нэр орохгүй)."""
    off = make_off_day(callins)
    msgs, dues = [], {}
    for t in tasks:
        if not eligible(t, frm):
            continue
        due0, hold = due_chain(t)
        if due0 is None:
            continue
        people = participants(t)
        if not people:
            continue
        # Хүн бүрийн хугацаа ӨӨР (чөлөөт өдрийн зогсолт) — нэр бүрээр, утсаар хуваарь хайна
        for name in people:
            ph = phones.get(name)
            if not ph:
                continue
            due = eff_due(due0, ph, created_ms(t), off)
            dues[t['id'] + '|' + ph] = {'due': due, 'hold': hold}
            if hold:
                continue   # хүлээгдэж буй сунгалттай — хасалт зогссон тул сануулахгүй
            tail = '%s %s' % (ub_day(due), ub_hm(due))
            kind = None
            if now >= due:
                kind = 'over'
            elif now >= due - 2 * HOUR:
                kind = 'r2'
            elif now >= due - 24 * HOUR:
                kind = 'r24'
            if not kind:
                continue
            for k in ('r24', 'r2', 'over'):
                if k == kind:
                    break
                sent.setdefault('%s|%s|%d|%s' % (t['id'], k, due, ph), now)   # алгассан сануулга — хожим бүү илгээ
            key = '%s|%s|%d|%s' % (t['id'], kind, due, ph)
            if key in sent:
                continue
            title = {'r24': '⏰ Хугацаа дуусахад 24 цаг', 'r2': '⏰ Хугацаа дуусахад 2 цаг', 'over': '⚠ Хугацаа хэтэрлээ'}[kind]
            body = ('%s · %s' % (t.get('title') or '', tail)) if kind != 'over' else ('%s. Оноо хасагдаж эхэллээ.' % (t.get('title') or ''))
            msgs.append({'key': key, 'to': ph, 'kind': kind, 'task': t['id'], 'title': title, 'body': body[:160]})
            if kind == 'over':   # даалгавар өгсөн хүнд ч мэдэгдэнэ
                cph = phones.get(t.get('created_by'))
                if cph and cph != ph:
                    ckey = '%s|over_c|%d|%s' % (t['id'], due, ph)
                    if ckey not in sent:
                        msgs.append({'key': ckey, 'to': cph, 'kind': 'over_c', 'task': t['id'], 'title': '⚠ Даалгавар хоцорлоо',
                                     'body': ('%s: %s' % (name, t.get('title') or ''))[:160]})
    return msgs, dues


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


def phone_map():
    """нэр → утас. Нэг нэрээр 2+ хүн байвал ОРУУЛАХГҮЙ (таамаглахгүй)."""
    rows = psql_json("select coalesce(json_agg(json_build_object('n', name, 'p', phone)), '[]') "
                     "from employees where merged_into is null and coalesce(status, '') <> 'гарсан'") or []
    seen, bad = {}, set()
    for r in rows:
        n, p = (r.get('n') or '').strip(), re.sub(r'\D', '', r.get('p') or '')
        if not n or not p:
            continue
        if n in seen and seen[n] != p:
            bad.add(n)
        seen[n] = p
    return {n: p for n, p in seen.items() if n not in bad}, bad


def main():
    now = int(datetime.now(UB).timestamp() * 1000)
    cfg = psql_json("select value from app_config where key = 'task_points'") or {}
    frm = str(cfg.get('from') or '')
    if not re.match(r'^\d{4}-\d{2}-\d{2}$', frm):
        print('%s task_notify: оноо унтраалттай (from хоосон) — илгээсэнгүй' % ub_day(now))
        return
    tasks = psql_json("select coalesce(json_agg(t), '[]') from (select id, title, assignee, co_assignees, due, status, kpi_code, "
                      "created_by, kind, created from tasks where status not in ('done','deleted','declined') "
                      "and created_by is not null and due is not null) t") or []
    cal = psql("select member_key || '|' || day::text from att_callins where status = 'active' and day >= current_date - 60")
    callins = {tuple(x.split('|', 1)) for x in cal.splitlines() if '|' in x}
    phones, bad = phone_map()
    sent = psql_json("select value from app_config where key = 'task_notify_sent'") or {}
    msgs, _ = plan(tasks, now, sent, frm, phones, callins)
    if DRY:
        print(json.dumps({'now': now, 'messages': msgs, 'ambiguous_names': sorted(bad)}, ensure_ascii=False))
        return
    secret = load_env(PUSH_ENV).get('PUSH_INTERNAL_KEY')
    if not secret:
        print('%s task_notify: PUSH_INTERNAL_KEY алга' % ub_day(now))
        return
    ok = fail = 0
    for m in msgs:
        try:
            push(secret, m['to'], {'kind': 'tasks', 'title': m['title'], 'body': m['body'], 'url': './#task-' + m['task'], 'id': m['task']})
            sent[m['key']] = now
            ok += 1
        except Exception as e:   # дараагийн ажиллагаанд дахин оролдоно (key бичигдээгүй)
            fail += 1
            print('%s task_notify: push алдаа %s: %s' % (ub_day(now), m['key'], e))
    cutoff = now - 45 * DAY
    sent = {k: v for k, v in sent.items() if isinstance(v, (int, float)) and v >= cutoff}
    lit = json.dumps(sent, ensure_ascii=False).replace("'", "''")
    psql("insert into app_config (key, value, updated_at) values ('task_notify_sent', '%s'::jsonb, now()) "
         "on conflict (key) do update set value = excluded.value, updated_at = now()" % lit)
    print('%s task_notify: илгээв %d, алдаа %d, нэр давхцсан %d' % (ub_day(now), ok, fail, len(bad)))


def selftest():
    f = []

    def eq(name, got, want):
        if got != want:
            f.append('%s: хүлээсэн %r, ирсэн %r' % (name, want, got))

    t0 = ub_ts('2026-11-10', '18:00')
    eq('УБ цаг', ub_hm(t0) + ' ' + ub_day(t0), '18:00 2026-11-10')
    eq('цаггүй = 23:59', ub_hm(ub_ts('2026-11-10', '')), '23:59')
    mk = lambda **kw: dict({'id': 't1', 'title': 'Тест', 'assignee': 'Бат', 'created_by': 'Сүх', 'status': 'open', 'due': '2026-11-10',
                           'kpi_code': '⟦DT|18:00⟧', 'created': str(ub_ts('2026-11-09', '09:00')), 'kind': ''}, **kw)
    ph = {'Бат': '99112233', 'Сүх': '88112233'}
    frm = '2026-11-09'
    # 24ц
    m, _ = plan([mk()], t0 - 23 * HOUR, {}, frm, ph)
    eq('24ц сануулга', [(x['kind'], x['to']) for x in m], [('r24', '99112233')])
    # 2ц (24ц-ийг алгасна — давхар илгээхгүй)
    s = {}
    m, _ = plan([mk()], t0 - HOUR, s, frm, ph)
    eq('2ц сануулга', [x['kind'] for x in m], ['r2'])
    eq('24ц алгассан гэж тэмдэглэв', any('|r24|' in k for k in s), True)
    # хэтэрсэн: ажилтан + өгсөн хүн
    m, _ = plan([mk()], t0 + HOUR, {}, frm, ph)
    eq('хэтэрсэн: хоёр талд', sorted((x['kind'], x['to']) for x in m), [('over', '99112233'), ('over_c', '88112233')])
    # давхардал: дахин ажиллуулахад илгээхгүй
    s = {}
    m1, _ = plan([mk()], t0 + HOUR, s, frm, ph)
    for x in m1:
        s[x['key']] = 1
    m2, _ = plan([mk()], t0 + 2 * HOUR, s, frm, ph)
    eq('давхар илгээхгүй', m2, [])
    # from хоосон / өмнөх ажил / дууссан / өөртөө өгсөн
    eq('from хоосон = юу ч үгүй', plan([mk()], t0 + HOUR, {}, '', ph)[0], [])
    eq('from-оос өмнө үүссэн', plan([mk(created=str(ub_ts('2026-11-01', '09:00')))], t0 + HOUR, {}, frm, ph)[0], [])
    eq('дууссан', plan([mk(status='done')], t0 + HOUR, {}, frm, ph)[0], [])
    eq('өөртөө өгсөн', plan([mk(created_by='Бат')], t0 + HOUR, {}, frm, ph)[0], [])
    eq('SYSTEM үүсгэсэн', plan([mk(created_by='SYSTEM')], t0 + HOUR, {}, frm, ph)[0], [])
    eq('утас олдоогүй нэр', plan([mk(assignee='Үл мэдэгдэх')], t0 + HOUR, {}, frm, ph)[0], [])
    # сунгалт: батлагдсан → шинэ хугацаа; хэтрээгүй
    ext_a = '⟦DT|18:00⟧⟦XR|%d|2026-11-11|18:00|a|0|2026-11-10|18:00|тест⟧' % (t0 - 5 * HOUR)
    m, _ = plan([mk(kpi_code=ext_a, due='2026-11-11')], t0 + HOUR, {}, frm, ph)
    eq('батлагдсан сунгалт: хэтрээгүй (шинэ хугацаанаас 24ц-ийн өмнө)', [x['kind'] for x in m], ['r24'])
    # сунгалт: хүлээгдэж буй → hold (сануулахгүй)
    ext_p = '⟦DT|18:00⟧⟦XR|%d|2026-11-11|18:00|p|0|2026-11-10|18:00|тест⟧' % (t0 - 5 * HOUR)
    eq('хүлээгдэж буй сунгалт: hold', plan([mk(kpi_code=ext_p)], t0 + HOUR, {}, frm, ph)[0], [])
    # хугацаа ДУУССАНЫ ДАРАА ирсэн хүсэлт хүчингүй
    ext_late = '⟦DT|18:00⟧⟦XR|%d|2026-11-11|18:00|a|0|2026-11-10|18:00|хожуу⟧' % (t0 + HOUR)
    eq('хожуу хүсэлт хүчингүй', [x['kind'] for x in plan([mk(kpi_code=ext_late)], t0 + 2 * HOUR, {}, frm, ph)[0]], ['over', 'over_c'])
    # чөлөөт өдрийн зогсолт: Да-Ня хуваарьтай (Мя 11-12) атлаа 11-10 (Мя 2-р өдөр) хуваарьгүй → 24ц хойшилно
    cal = {('99112233', '2026-11-09'), ('99112233', '2026-11-11')}   # Даваа, Лхагва; Мягмар = чөлөөт
    d, _h = due_chain(mk())
    eq('чөлөөт өдөр: хугацаа +24ц', eff_due(d, '99112233', created_ms(mk()), make_off_day(cal)), d + DAY)
    eq('хуваарьгүй хүнд зогсолт үгүй', eff_due(d, '99112233', created_ms(mk()), make_off_day(set())), d)
    if f:
        print('❌ task_notify selftest:\n  ' + '\n  '.join(f))
        sys.exit(1)
    print('✅ task_notify selftest OK')


if __name__ == '__main__':
    if '--selftest' in sys.argv:
        selftest()
    elif '--plan' in sys.argv:
        d = json.load(open(sys.argv[sys.argv.index('--plan') + 1]))
        cal = {tuple(x) for x in d['callins']} if d.get('callins') is not None else None
        msgs, dues = plan(d.get('tasks', []), d['now'], dict(d.get('sent', {})), d.get('from', ''), d.get('phones', {}), cal)
        print(json.dumps({'messages': msgs, 'dues': dues}, ensure_ascii=False))
    else:
        main()
