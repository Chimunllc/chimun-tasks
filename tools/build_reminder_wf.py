#!/usr/bin/env python3
"""n8n `MEVENT · Reminder mail (repeat)` workflow-ийн JSON-г угсарна (workflow JSON репод ҮГҮЙ).

    python3 tools/build_reminder_wf.py /tmp/reminder_wf.json
    scp /tmp/reminder_wf.json <vps>:/tmp/ ; docker cp … <n8n>:/tmp/ ; n8n import:workflow --input=…

⛔ `n8n import:workflow` нь workflow-г ИДЭВХГҮЙ болгодог → дараа нь
   `n8n update:workflow --id=mevReminderMail1 --active=true` + n8n restart.
   Ажиллаж буй n8n дахин асах хүртэл ХУУЧИН хувилбар санах ойд үлддэг.
Бичвэр угсрах код = tools/reminder_compose.js (ганц эх сурвалж). Хэнд явахыг db/reminder_mail.sql шийднэ.
"""
import json, os, sys

HERE = os.path.dirname(os.path.abspath(__file__))
out = sys.argv[1] if len(sys.argv) > 1 else 'reminder_wf.json'
compose = open(os.path.join(HERE, 'reminder_compose.js'), encoding='utf8').read()
PG = {'postgres': {'id': 'MVmRjZ8xNatbLGVQ', 'name': 'Postgres account'}}
GM = {'gmailOAuth2': {'id': 'pl7UuqQzfyUujc8P', 'name': 'Gmail account'}}

gate_js = """// Эзэмшсэн (claim) л бол илгээнэ. Тест горимд тэмдэглэгээ хийгддэггүй тул шууд өнгөрнө.
const out = [];
$input.all().forEach((it, i) => {
  const mail = $('Имэйл бэлдэх').itemMatching(i).json;
  if (mail.test === true || Number(it.json.claimed) === 1) out.push({ json: mail, pairedItem: { item: i } });
});
return out;
"""

# Бичвэр (txt) аппаас засагддаг тул илгээх бүрд DB-ээс шинээр уншина.
pick_sql = """select r.*, (select value::text from app_config where key = 'reminder_mail_text') as txt
  from (select * from reminder_pick()
        union all
        select * from reminder_test_pick()) r"""

claim_sql = """-- Илгээхээс ӨМНӨ эзэмшинэ (at-most-once): давхар ажиллаж ч, илгээлт унаж ч нэг захиалгад 2 имэйл явахгүй.
with c as (
  update app_orders
     set stage_meta = coalesce(stage_meta,'{}'::jsonb)
                    || jsonb_build_object('mail',
                         coalesce(stage_meta->'mail','{}'::jsonb) || jsonb_build_object('reminder', now()::text))
   where id = $1
     and $2::boolean = false
     and not jsonb_exists(coalesce(stage_meta->'mail','{}'::jsonb), 'reminder')
  returning id)
select (select count(*) from c)::int as claimed"""

err_sql = """-- Илгээлт унасан бол захиалгад тэмдэглэнэ (дахин оролдохгүй, ил харагдана). Амжилттай бол юу ч хийхгүй.
update app_orders
   set stage_meta = coalesce(stage_meta,'{}'::jsonb)
                  || jsonb_build_object('mail',
                       coalesce(stage_meta->'mail','{}'::jsonb) || jsonb_build_object('reminder_err', left($2, 300)))
 where id = $1 and $2 <> '' and $3::boolean = false"""

nodes = [
 {"parameters": {"rule": {"interval": [{"field": "cronExpression", "expression": "0 0 10 * * 1-5"}]}},
  "id": "rm-trigger", "name": "Ажлын өдөр 10:00", "type": "n8n-nodes-base.scheduleTrigger", "typeVersion": 1.2, "position": [0, 0]},
 {"parameters": {"inputSource": "passthrough"},
  "id": "rm-manual", "name": "Гараар (CLI)", "type": "n8n-nodes-base.executeWorkflowTrigger", "typeVersion": 1.1, "position": [0, 160]},
 {"parameters": {"operation": "executeQuery", "query": pick_sql, "options": {}},
  "id": "rm-pick", "name": "Сонгох", "type": "n8n-nodes-base.postgres", "typeVersion": 2.6, "position": [240, 0], "credentials": PG},
 {"parameters": {"jsCode": compose},
  "id": "rm-compose", "name": "Имэйл бэлдэх", "type": "n8n-nodes-base.code", "typeVersion": 2, "position": [480, 0]},
 {"parameters": {"operation": "executeQuery", "query": claim_sql,
                 "options": {"queryReplacement": "={{ [String($json.order_id), String($json.test === true)] }}"}},
  "id": "rm-claim", "name": "Эзэмших", "type": "n8n-nodes-base.postgres", "typeVersion": 2.6, "position": [720, 0], "credentials": PG},
 {"parameters": {"jsCode": gate_js},
  "id": "rm-gate", "name": "Хаалга", "type": "n8n-nodes-base.code", "typeVersion": 2, "position": [960, 0]},
 {"parameters": {"sendTo": "={{ $json.to }}", "subject": "={{ $json.subject }}", "message": "={{ $json.html }}",
                 "emailType": "html", "resource": "message", "operation": "send",
                 "options": {"replyTo": "hello@mevent.mn", "senderName": "M-Event", "appendAttribution": False}},
  "id": "rm-send", "name": "Илгээх", "type": "n8n-nodes-base.gmail", "typeVersion": 2.1, "position": [1200, 0],
  "credentials": GM, "onError": "continueRegularOutput"},
 {"parameters": {"operation": "executeQuery", "query": err_sql,
                 "options": {"queryReplacement": "={{ [String($('Хаалга').item.json.order_id), ($json.error ? (typeof $json.error === 'string' ? $json.error : String($json.error.message || JSON.stringify($json.error))) : ''), String($('Хаалга').item.json.test === true)] }}"}},
  "id": "rm-err", "name": "Алдаа тэмдэглэх", "type": "n8n-nodes-base.postgres", "typeVersion": 2.6, "position": [1440, 0], "credentials": PG},
]
conn = {n: {"main": [[{"node": m, "type": "main", "index": 0}]]} for n, m in [
  ("Ажлын өдөр 10:00", "Сонгох"), ("Гараар (CLI)", "Сонгох"), ("Сонгох", "Имэйл бэлдэх"), ("Имэйл бэлдэх", "Эзэмших"),
  ("Эзэмших", "Хаалга"), ("Хаалга", "Илгээх"), ("Илгээх", "Алдаа тэмдэглэх")]}
wf = {"id": "mevReminderMail1", "name": "MEVENT · Reminder mail (repeat)", "active": False,
      "nodes": nodes, "connections": conn,
      "settings": {"executionOrder": "v1", "timezone": "Asia/Ulaanbaatar"}, "pinData": {}}
json.dump(wf, open(out, 'w', encoding='utf8'), ensure_ascii=False, indent=1)
print('OK', out, os.path.getsize(out), 'bytes')
