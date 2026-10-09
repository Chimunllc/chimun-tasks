-- ═══════════════════════════════════════════════════════════════════════
-- ХЭРЭГЖСЭН САНАЛЫН ЭЗЭН (2026-10-09, CEO: «3-р алхам»)
--
-- Үлгэр: Toyota-гийн кайзен — саналын ТООГ биш, БАТЛАГДАЖ хэрэгжсэн саналыг
-- нэрээр нь гаргана. Тоймын «💡 Хэрэгжсэн санал» карт энэ харагдацаас уншина.
--
-- ЯАГААД ХАРАГДАЦ: `staff_ideas` нь RLS-тэй (ажилтан зөвхөн өөрийнхөө саналыг
--   хардаг) — Тойм бүх ажилтанд нээлттэй. Харагдац эзний эрхээр ажиллаж ЗӨВХӨН
--   дараах 4 зүйлийг гаргана: зохиогчийн НЭР · төлөвлөгөөний гарчиг (аль хэдийн
--   бүх ажилтанд уншигддаг) · батлагдсан огноо · явц. Саналын БИЧВЭР, утас ГАРАХГҮЙ.
--
-- ⛔ Батлагдаагүй санал ОРОХГҮЙ — `approved_at` нь захирлын батламжаас л гарна:
--    мөрийн `approved_at` (апп батлахад тавина) · `applied_at` (ажил үүссэн) ·
--    алхмуудын хамгийн эрт `applied_at` · хэрэгжиж дууссан тохиргооны `closed_at`.
-- ⛔ «Хийхгүй» (`sec: no`) ба хүлээгдэж буй (`sec: idea`) мөр ОРОХГҮЙ.
-- ⛔ `private: true` мөр ОРОХГҮЙ — хүний тухай гомдол, цалин/ажилд авалт
--    (`idea_triage.py` захиралд шийдүүлэх ийм санааг тэмдэглэнэ).
-- ⚠ Зөвхөн АЖИЛТНЫ саналаас эхэлсэн мөр (`s-<id>`). Аль хэдийн төлөвлөгдсөн
--   ажилд нэгтгэгдсэн санал энд ОРОХГҮЙ — тэр санааг өөр хүн түрүүлж гаргасан.
--
-- ГАРААР ажиллуулна. ДАХИН ажиллуулж болно.
-- ═══════════════════════════════════════════════════════════════════════

create or replace view v_idea_credits as
with plan as (
  select p.value as r, p.value->>'id' as id
  from app_config c, jsonb_array_elements(case when jsonb_typeof(c.value) = 'array' then c.value else '[]'::jsonb end) p
  where c.key = 'plan'
),
top as (
  select r, id from plan
  where id like 's-%'
    and coalesce(r->>'parent', '') = ''
    and coalesce(r->>'sec', '') in ('now', 'next')
    and coalesce(r->>'private', 'false') <> 'true'
),
steps as (   -- санаачлага + түүний алхмууд, холбогдсон ажилтай нь
  select t.id as top_id, s.r
  from top t join plan s on s.id = t.id or s.r->>'parent' = t.id
),
agg as (
  select st.top_id,
         min(nullif(st.r->>'applied_at', '')) as first_applied,
         count(k.id) filter (where k.status is distinct from 'deleted') as tasks_total,
         count(k.id) filter (where k.status = 'done') as tasks_done
  from steps st
  left join tasks k on k.id = st.r->'undo'->>'task_id'
  group by st.top_id
),
credit as (
  select t.id as plan_id,
         t.r->>'title' as title,
         coalesce(nullif(t.r->>'approved_at', ''), nullif(t.r->>'applied_at', ''), a.first_applied,
                  case when t.r->>'status' = 'done' then nullif(t.r->>'closed_at', '') end) as approved_at,
         case when t.r->>'status' = 'done' then nullif(t.r->>'closed_at', '') end as closed_at,
         coalesce(a.tasks_total, 0) as tasks_total,
         coalesce(a.tasks_done, 0) as tasks_done,
         t.r->'measure'->>'verdict' as verdict,
         t.r->'measure'->>'check' as measure_check,
         jsonb_array_elements_text(case when jsonb_typeof(t.r->'from') = 'array' then t.r->'from' else '[]'::jsonb end) as idea_id
  from top t left join agg a on a.top_id = t.id
)
select c.plan_id, c.title, left(c.approved_at, 10) as approved_at, left(c.closed_at, 10) as closed_at,
       c.tasks_total, c.tasks_done, c.verdict, c.measure_check,
       coalesce(e.name, '') as author_name
from credit c
join staff_ideas si on si.id::text = c.idea_id
left join lateral (
  select name from employees
  where merged_into is null and regexp_replace(coalesce(phone, ''), '\D', '', 'g') = regexp_replace(si.author, '\D', '', 'g')
  order by pk limit 1
) e on true
where c.approved_at is not null;

revoke all on v_idea_credits from public, anon;
grant select on v_idea_credits to authenticated;

notify pgrst, 'reload schema';
