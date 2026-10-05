-- Ажилтны УТАС = хүний түлхүүр (personKey). Утас солигдох эсвэл давхар бүртгэл
-- нэгтгэгдэх үед түүгээр холбогдсон БҮХ бичлэгийг шинэ дугаар руу шилжүүлнэ (2026-10-05).
--
-- ЯАГААД: утас 60 гаруй баганад түлхүүр болж хадгалагддаг (цалин, олголт, эрх, салбар,
-- ирц, push, дамжлага, тооллого …). Утас DB дээр ШУУД засагддаг тул app/n8n-ийн ямар ч
-- hook барихгүй — ганц найдвартай газар нь энэ trigger. Өмнө нь хуучин дугаар дээр үлдсэн
-- эрх/цалин чимээгүй «эзэнгүй» болдог байв.
--
-- ⛔ ХАРИЛЦАГЧИЙН утас (customers.phone, app_orders.phone, pbx_*) ХӨНДӨХГҮЙ — ажилтны
--   дугаартай санамсаргүй таарч болно. Лог (app_errors) ба нөөц хүснэгт ч хөндөхгүй.
-- ⛔ Шинэ баганад утсаар хүн холбох бол ЭНД НЭМ — эс бөгөөс утас солигдоход тэр нь хоцорно.
-- ⚠ Давхцах түлхүүртэй хүснэгтэд (эрх, цалин, салбар…) шинэ дугаар дээр мөр аль хэдийн
--   байвал ХУУЧНЫГ ҮЛДЭЭНЭ (дарж бичихгүй, устгахгүй) — хүн шийднэ.
-- ⚠ Алдаа гарвал утасны засварыг ХААХГҮЙ (WARNING) — HR засвар тасалдах ёсгүй.
-- Ажиллуулах: гараар (psql -f). Идемпотент.

create or replace function public.person_rekey(p_old text, p_new text) returns jsonb
language plpgsql as $$
declare
  o text := regexp_replace(coalesce(p_old, ''), '\D', '', 'g');
  n text := regexp_replace(coalesce(p_new, ''), '\D', '', 'g');
  r record; cnt int; out jsonb := '{}'::jsonb;
  oq text; nq text;
begin
  if length(o) < 8 or length(n) < 8 or o = n then return out; end if;
  oq := '"' || o || '"'; nq := '"' || n || '"';

  -- ① Энгийн багана: утас ЯГ тэнцүү
  for r in select * from (values
    ('evaluations','rater'), ('evaluations','ratee'),
    ('pbx_callbacks','by_key'),
    ('products','stock_opened_by'), ('products','stock_approved_by'), ('products','stock_locked_by'),
    ('invoices','created_by'), ('product_transfers','moved_by'),
    ('bank_income','decided_by'), ('bank_statements','imported_by'),
    ('app_error_state','updated_by'), ('push_subscriptions','email'),
    ('fb_page_posts','requested_by'),
    ('member_perms','updated_by'), ('role_perms','updated_by'),
    ('company_docs','uploaded_by'), ('brand_kit','updated_by'),
    ('stock_counts','counted_by'), ('product_aliases','created_by'),
    ('catering_jobs','created_by'),
    ('hourly_ratings','worker_phone'), ('hourly_ratings','rater_phone'),
    ('bank_accounts','updated_by'), ('bank_accounts','owner_key'),
    ('staff_salary','updated_by'),
    ('salary_payments','person_key'), ('salary_payments','paid_by'),
    ('bank_cards','owner_key'), ('bank_cards','updated_by'),
    ('nomaad_payments','recorded_by'),
    ('attendance','member_key'), ('attendance','member_phone'),
    ('nomaad_quotes','Орлого бүртгэсэн'),
    ('bank_receipts','recorded_by'),
    ('ads_posts','created_by'), ('ads_posts','approved_by'),
    ('repairs','reported_by'), ('repairs','assignee'), ('repairs','fixed_by'),
    ('stock_moves','by'), ('receipt_files','uploaded_by'),
    ('member_branches','updated_by'), ('expense_learn','updated_by'),
    ('app_orders','created_by')
  ) v(t, c) loop
    if to_regclass('public.' || quote_ident(r.t)) is null then continue; end if;
    execute format('update %I set %I = $2 where %I = $1', r.t, r.c, r.c) using o, n;
    get diagnostics cnt = row_count;
    if cnt > 0 then out := out || jsonb_build_object(r.t || '.' || r.c, cnt); end if;
  end loop;

  -- ② Түлхүүр нь утас (давхцахгүй бол л шилжүүлнэ)
  for r in select * from (values
    ('member_perms','person_key'), ('staff_salary','person_key'),
    ('member_branches','person_key'), ('employee_docs','member_key')
  ) v(t, c) loop
    execute format('update %I set %I = $2 where %I = $1 and not exists (select 1 from %I x where x.%I = $2)',
                   r.t, r.c, r.c, r.t, r.c) using o, n;
    get diagnostics cnt = row_count;
    if cnt > 0 then out := out || jsonb_build_object(r.t || '.' || r.c, cnt); end if;
  end loop;
  update fin_categories set code = n
   where type = 'fin_branch_perm' and code = o
     and not exists (select 1 from fin_categories x where x.code = n);
  get diagnostics cnt = row_count;
  if cnt > 0 then out := out || jsonb_build_object('fin_categories.code', cnt); end if;

  -- ③ Утас шингэсэн дугаар: evaluations.id = «сар|үнэлэгч|үнэлэгдэгч», att_requests.id = «утас|өдөр»
  update evaluations e set id = regexp_replace(e.id, '(^|\|)' || o || '(\||$)', '\1' || n || '\2', 'g')
   where e.id ~ ('(^|\|)' || o || '(\||$)')
     and not exists (select 1 from evaluations x
                      where x.id = regexp_replace(e.id, '(^|\|)' || o || '(\||$)', '\1' || n || '\2', 'g'));
  get diagnostics cnt = row_count;
  if cnt > 0 then out := out || jsonb_build_object('evaluations.id', cnt); end if;
  update att_requests a set id = regexp_replace(a.id, '(^|\|)' || o || '(\||$)', '\1' || n || '\2', 'g'),
                            req = replace(a.req::text, oq, nq)::jsonb
   where a.id ~ ('(^|\|)' || o || '(\||$)')
     and not exists (select 1 from att_requests x
                      where x.id = regexp_replace(a.id, '(^|\|)' || o || '(\||$)', '\1' || n || '\2', 'g'));
  get diagnostics cnt = row_count;
  if cnt > 0 then out := out || jsonb_build_object('att_requests', cnt); end if;

  -- ④ JSON дотор: «"утас"» (хашилттай — өөр тоон дотор таарахгүй). Түлхүүр ч, утга ч.
  update app_orders set stage_meta = replace(stage_meta::text, oq, nq)::jsonb where stage_meta::text like '%' || oq || '%';
  get diagnostics cnt = row_count;
  if cnt > 0 then out := out || jsonb_build_object('app_orders.stage_meta', cnt); end if;
  update app_orders set deposit_log = replace(deposit_log::text, oq, nq)::jsonb where deposit_log::text like '%' || oq || '%';
  get diagnostics cnt = row_count;
  if cnt > 0 then out := out || jsonb_build_object('app_orders.deposit_log', cnt); end if;
  update app_config set value = replace(value::text, oq, nq)::jsonb where value::text like '%' || oq || '%';
  get diagnostics cnt = row_count;
  if cnt > 0 then out := out || jsonb_build_object('app_config.value', cnt); end if;
  update att_requests set req = replace(req::text, oq, nq)::jsonb where req::text like '%' || oq || '%';
  get diagnostics cnt = row_count;
  if cnt > 0 then out := out || jsonb_build_object('att_requests.req', cnt); end if;

  return out;
end $$;

create or replace function public.employees_rekey_trg() returns trigger
language plpgsql as $$
declare res jsonb; win text;
begin
  begin
    -- Утас солигдсон
    if new.merged_into is null
       and regexp_replace(coalesce(old.phone, ''), '\D', '', 'g') <> regexp_replace(coalesce(new.phone, ''), '\D', '', 'g') then
      res := person_rekey(old.phone, new.phone);
      raise notice 'person_rekey % → %: %', old.phone, new.phone, res;
    end if;
    -- Давхар бүртгэл нэгтгэгдсэн — ялагдагчийн утас ялагчийнх руу
    if new.merged_into is not null and old.merged_into is null then
      select phone into win from employees where pk = new.merged_into;
      res := person_rekey(new.phone, win);
      raise notice 'person_rekey (merge) % → %: %', new.phone, win, res;
    end if;
  exception when others then
    raise warning 'person_rekey амжилтгүй (%): утас/нэгтгэл хадгалагдсан, холбоос хоцорсон байж болно', sqlerrm;
  end;
  return new;
end $$;

drop trigger if exists employees_rekey_trg on employees;
create trigger employees_rekey_trg after update of phone, merged_into on employees
  for each row execute function public.employees_rekey_trg();

revoke all on function public.person_rekey(text, text) from public, anon, authenticated;

-- ⑤ Нэг удаагийн нөхөлт: өмнө солигдсон утас (employee_aliases) дээр үлдсэн холбоос.
--   ⛔ Хуучин дугаар ОДОО өөр ажилтных бол (оператор дахин олгосон) ХӨНДӨХГҮЙ.
do $$
declare r record; res jsonb;
begin
  for r in
    select distinct substring(a.alias from 7) as old_phone, cur.phone as new_phone
    from employee_aliases a
    join lateral (
      with recursive w(pk, phone, merged_into) as (
        select e.pk, e.phone, e.merged_into from employees e where e.pk = a.pk
        union all
        select e.pk, e.phone, e.merged_into from employees e join w on e.pk = w.merged_into
      ) select phone from w where merged_into is null limit 1
    ) cur on true
    where a.alias like 'phone:%'
      and regexp_replace(substring(a.alias from 7), '\D', '', 'g') <> regexp_replace(coalesce(cur.phone, ''), '\D', '', 'g')
      and not exists (select 1 from employees e2 where e2.merged_into is null
                        and regexp_replace(e2.phone, '\D', '', 'g') = regexp_replace(substring(a.alias from 7), '\D', '', 'g'))
  loop
    res := person_rekey(r.old_phone, r.new_phone);
    if res <> '{}'::jsonb then raise notice 'нөхөлт % → %: %', r.old_phone, r.new_phone, res; end if;
  end loop;
end $$;
