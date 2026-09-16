-- ═══════════════════════════════════════════════════════════════════════════
-- ЭРХИЙН ХИЛ ӨГӨГДЛИЙН САНД (2026-09-14)
--
-- АСУУДАЛ: нэвтэрсэн БҮХ ажилтан Postgres-ийн НЭГ `authenticated` үүрэг
-- хуваалцдаг байв. Аппын дотор «Цалин харах эрхгүй» гэж хаасан хүн ч
-- токеноороо PostgREST рүү шууд хандвал цалин, иргэний үнэмлэхийн зураг,
-- банкны карт, бүх гүйлгээг уншиж, бүр УСТГАЖ чаддаг байсныг амьд системд
-- баталсан (lvl=10 токеноор 12 хүснэгт нээгдэв, 8 бичих зам нээлттэй байв).
--
-- ШИЙДЭЛ: нэвтрэх үед олгогддог PostgREST JWT нь `phone` ба `lvl` claim-ийг
-- аль хэдийн агуулдаг (n8n `CHIMUN · Login` гаргадаг, серверийн нууцаар
-- гарын үсэг зурагдсан тул клиент хуурч чадахгүй). Түүн дээр тулгуурлаж
-- ЭМЗЭГ хүснэгтүүдэд мөрийн түвшний хамгаалалт тавина.
--
-- ⚠ ЗАРЧИМ: өгөгдлийн сангийн дүрэм нь аппын UI-аас ЧАНГА байж БОЛОХГҮЙ —
--   эс бөгөөс эрхтэй хүн хоосон дэлгэц харна. RLS нь алдаа шиддэггүй,
--   зүгээр л мөрийг шүүдэг тул буруу дүрэм ЧИМЭЭГҮЙ хоосролт үүсгэнэ.
--
-- ⚠ `force row level security` ТАВИХГҮЙ. Хүснэгтийн эзэн (`chimun`) RLS-ийг
--   алгасдаг — n8n яг тэр холболтоор ажилладаг тул webhook-ууд хэвээр ажиллана.
--
-- ⚠ Энэ файл ГАРААР ажиллуулагдана (db/README.md-г үз). Идемпотент.
-- ═══════════════════════════════════════════════════════════════════════════

create schema if not exists sec;
grant usage on schema sec to authenticated, anon;

-- ── 1. Токены claim ────────────────────────────────────────────────────────
-- `request.jwt.claims` нь PostgREST тавьдаг. Нэвтрээгүй (anon) үед хоосон.

create or replace function sec.phone() returns text
  language sql stable as $$
    select nullif(nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'phone', '')
  $$;

create or replace function sec.lvl() returns int
  language sql stable as $$
    select coalesce(
      (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'lvl')::int, 0)
  $$;

create or replace function sec.is_ceo() returns boolean
  language sql stable as $$ select sec.lvl() >= 100 $$;

-- ── 2. Албан тушаалын багц — app.js-ийн `ROLE_PRESETS`-ийн ТОЛЬ ────────────
-- ⚠ Энэ бол ДАВХАРДСАН дата. `test/run.js` нь app.js-ийн ROLE_PRESETS ба энэ
--   файлын мөрүүдийг тулгадаг — зөрвөл CI УНАНА. Аль нэгийг засвал НӨГӨӨГ нь
--   ЗЭРЭГ зас. (`db/public_availability.sql` ↔ `_ORDER_OCCUPYING`-тэй ижил хэв.)
-- ⚠ Дараалал ЧУХАЛ: эхний тохирсноор авна (тодорхойгоос ерөнхий рүү).

create table if not exists sec.role_presets (
  ord     int primary key,
  pattern text   not null,
  views   text[] not null,
  actions text[] not null
);

truncate sec.role_presets;
insert into sec.role_presets (ord, pattern, views, actions) values
 (1, 'үйл ажиллагааны захирал|үах захирал|coo',
     '{orders,products,nomaad,catering,reports,receivables,workload,access,history,vat,documents,marketing}',
     '{tasks.create,tasks.delete,orders.pay,orders.prepare,orders.clean,orders.dispatch,orders.deliver,orders.setup,orders.advance,orders.skip,orders.revert,orders.cancel,products.edit,products.opening,nomaad.income,nomaad.cancel,catering.edit,documents.edit,access.delegate}'),
 (2, 'нягтлан',
     '{reports,receivables,vat,salary}',
     '{orders.pay,salary.pay,salary.edit}'),
 (3, 'эвент',
     '{orders,workload}',
     '{tasks.create,tasks.delete,orders.pay,orders.clean,orders.advance}'),
 (4, 'менежер|manager',
     '{orders,products,nomaad,reports,workload}',
     '{tasks.create,tasks.delete,orders.pay,orders.prepare,orders.clean,orders.dispatch,orders.deliver,orders.setup,orders.advance,orders.cancel,products.edit,nomaad.income}'),
 (5, 'нярав|агуулахын\s*ахлах|агуулахын\s*менежер',
     '{orders,products,hourly}',
     '{orders.prepare,orders.clean,orders.dispatch,products.edit}'),
 (6, 'агуулах',
     '{orders,products}',
     '{orders.prepare,orders.clean,orders.dispatch}'),
 (7, 'цэвэрл',
     '{orders}',
     '{orders.clean}'),
 (8, 'жолооч|хүргэ|түгээ',
     '{orders}',
     '{orders.clean,orders.deliver,orders.setup}'),
 (9, 'бармен|тогооч|катеринг|кейтеринг',
     '{catering,orders}',
     '{orders.clean}'),
 (10, 'маркетинг|market|дизайн|контент',
     '{marketing}',
     '{}');

-- ── 3. Эрх шалгах ──────────────────────────────────────────────────────────
-- Дараалал = app.js `capValue()`: CEO → member_perms → role_perms → багц.
-- ⚠ app.js-д НЭМЭЛТ алхам бий: цагийн ажилтан (`isDailyWorker`) зөвхөн
--   бүлгийн загвараар хязгаарлагддаг. Энд ТУСГААГҮЙ — тэр алхам нь ЗӨВХӨН
--   хориглодог тул энэ функц аппаас арай СУЛ байна. Хоосон дэлгэц үүсгэхгүй
--   (аюулгүй тал руу), гэхдээ цагийн ажилтныг DB талд нэмж хумиагүй.

create or replace function sec.preset_cap(p_role text, p_key text)
  returns boolean language sql stable as $$
    select case
      when p.views @> array[p_key] then true
      when p.actions @> array[p_key] then true
      else false
    end
    from sec.role_presets p
    where lower(trim(coalesce(p_role, ''))) ~ p.pattern
    order by p.ord
    limit 1
  $$;

create or replace function sec.can(p_key text)
  returns boolean
  language plpgsql stable
  security definer set search_path = public, sec, pg_temp as $$
declare v_ph text; v jsonb; v_role text;
begin
  if sec.lvl() >= 100 then return true; end if;              -- CEO бүгдийг
  v_ph := sec.phone();
  if v_ph is null then return false; end if;                 -- нэвтрээгүй

  select mp.perms into v from member_perms mp where mp.person_key = v_ph;
  if v is not null and v ? p_key then
    return coalesce((v ->> p_key)::boolean, false);           -- хувь хүний онцгой эрх
  end if;

  select e.role into v_role from employees e
   where regexp_replace(coalesce(e.phone, ''), '\D', '', 'g') = v_ph
     and e.merged_into is null
   order by e.pk limit 1;
  if v_role is null then return false; end if;

  select rp.perms into v from role_perms rp where lower(rp.role) = lower(v_role);
  if v is not null and v ? p_key then
    return coalesce((v ->> p_key)::boolean, false);           -- албан тушаалын загвар
  end if;

  return coalesce(sec.preset_cap(v_role, p_key), false);      -- багц
end $$;

-- Нягтлан — app.js `isFinanceAccountant()` (албан тушаалд «нягтлан» орсон эсэх).
create or replace function sec.is_accountant() returns boolean
  language sql stable security definer set search_path = public, pg_temp as $$
    select exists (
      select 1 from employees e
       where regexp_replace(coalesce(e.phone, ''), '\D', '', 'g') = sec.phone()
         and e.merged_into is null
         and e.role ~* 'нягтлан')
  $$;

-- Санхүүг БҮТНЭЭР харах — app.js `canSeeAllFinance()`:
-- CEO ∪ нягтлан ∪ «санхүү: салбар засах эрх» (fin_categories-д бүртгэгдсэн).
create or replace function sec.fin_full() returns boolean
  language sql stable security definer set search_path = public, pg_temp as $$
    select sec.is_ceo()
        or sec.is_accountant()
        or exists (select 1 from fin_categories f
                    where f.type = 'fin_branch_perm'
                      and f.code = sec.phone()
                      and coalesce(f.active::text, '1') in ('1','true','t'))
  $$;

revoke all on function sec.can(text), sec.preset_cap(text, text),
                       sec.is_accountant(), sec.fin_full(),
                       sec.phone(), sec.lvl(), sec.is_ceo() from public;
grant execute on function sec.can(text), sec.preset_cap(text, text),
                          sec.is_accountant(), sec.fin_full(),
                          sec.phone(), sec.lvl(), sec.is_ceo() to authenticated, anon;

-- ⚠ ИДЕМПОТЕНТ БАЙХ ЁСТОЙ. Бодлого бүрийн өмнө өөрийнх нь нэрээр `drop policy
--   if exists` байна — эс бөгөөс ХОЁР ДАХЬ удаа ажиллуулахад «policy already
--   exists» гэж дунд нь унаж, доорх хэсгүүд ОГТ хэрэгжихгүй (2026-09-14-нд яг
--   ингэж болсон: багцын толь шинэчлэхээр дахин ажиллуулахад 4-14 хэсэг
--   алгасагдаж, ҮАХ захирал батлах эрхгүй хэвээр үлдэв). Доорх «_read» /
--   «_write» / «_all» нэрс нь ХУУЧИН нэрсийг цэвэрлэдэг — бүү устга.

-- ═══ 4. ЦАЛИН ═════════════════════════════════════════════════════════════
-- Хамгийн эмзэг. Өөрийн цалингаа хүн бүр харна — бусдынхыг зөвхөн эрхтэй нь.

alter table public.staff_salary enable row level security;
drop policy if exists staff_salary_read  on public.staff_salary;
drop policy if exists staff_salary_write on public.staff_salary;
drop policy if exists staff_salary_sel on public.staff_salary;
create policy staff_salary_sel on public.staff_salary for select to authenticated
  using (sec.can('salary') or person_key = sec.phone());
drop policy if exists staff_salary_ins on public.staff_salary;
create policy staff_salary_ins on public.staff_salary for insert to authenticated
  with check (sec.can('salary.edit'));
drop policy if exists staff_salary_upd on public.staff_salary;
create policy staff_salary_upd on public.staff_salary for update to authenticated
  using (sec.can('salary.edit')) with check (sec.can('salary.edit'));

alter table public.salary_payments enable row level security;
drop policy if exists salary_payments_read  on public.salary_payments;
drop policy if exists salary_payments_write on public.salary_payments;
drop policy if exists salary_payments_sel on public.salary_payments;
create policy salary_payments_sel on public.salary_payments for select to authenticated
  using (sec.can('salary') or person_key = sec.phone());
drop policy if exists salary_payments_ins on public.salary_payments;
create policy salary_payments_ins on public.salary_payments for insert to authenticated
  with check (sec.can('salary.pay'));
drop policy if exists salary_payments_upd on public.salary_payments;
create policy salary_payments_upd on public.salary_payments for update to authenticated
  using (sec.can('salary.pay')) with check (sec.can('salary.pay'));

-- ═══ 5. ИРГЭНИЙ ҮНЭМЛЭХ ═══════════════════════════════════════════════════
-- `employee_docs.id_doc` нь үнэмлэхийн PDF-ийг base64-ээр агуулдаг.
-- Хүн бүр ӨӨРИЙНХӨӨ бичлэгийг оруулна/харна; бусдынхыг зөвхөн HR эрхтэй.

alter table public.employee_docs enable row level security;
drop policy if exists employee_docs_all on public.employee_docs;
drop policy if exists employee_docs_sel on public.employee_docs;
create policy employee_docs_sel on public.employee_docs for select to authenticated
  using (sec.can('access') or member_key = sec.phone());
drop policy if exists employee_docs_ins on public.employee_docs;
create policy employee_docs_ins on public.employee_docs for insert to authenticated
  with check (sec.can('access') or member_key = sec.phone());
drop policy if exists employee_docs_upd on public.employee_docs;
create policy employee_docs_upd on public.employee_docs for update to authenticated
  using (sec.can('access') or member_key = sec.phone())
  with check (sec.can('access') or member_key = sec.phone());

-- ═══ 6. БАНКНЫ ДАНС / КАРТ ════════════════════════════════════════════════
-- Дансны дугаар, картын мэдээлэл. Бичих эрх нь өмнө нь CEO байсан — унших
-- нь БҮГДЭД нээлттэй байсныг хаана.

alter table public.bank_accounts enable row level security;
drop policy if exists bank_accounts_read on public.bank_accounts;
drop policy if exists bank_accounts_sel on public.bank_accounts;
create policy bank_accounts_sel on public.bank_accounts for select to authenticated
  using (sec.fin_full());

alter table public.bank_cards enable row level security;
drop policy if exists bank_cards_read on public.bank_cards;
drop policy if exists bank_cards_sel on public.bank_cards;
create policy bank_cards_sel on public.bank_cards for select to authenticated
  using (sec.fin_full());

-- ═══ 7. МӨНГӨНИЙ ДЭЛГЭРЭНГҮЙ ══════════════════════════════════════════════
-- Хуулга, орсон мөнгө, баримт. Төлбөр бүртгэдэг хүн баримтад хүрэх ёстой тул
-- `orders.pay` эрхтэйг мөн оруулна (эс бөгөөс төлбөрийн урсгал тасарна).

alter table public.bank_statements enable row level security;
drop policy if exists bank_statements_all on public.bank_statements;
drop policy if exists bank_statements_rw on public.bank_statements;
create policy bank_statements_rw on public.bank_statements for all to authenticated
  using (sec.fin_full()) with check (sec.fin_full());

alter table public.bank_income enable row level security;
drop policy if exists bank_income_all on public.bank_income;
drop policy if exists bank_income_rw on public.bank_income;
create policy bank_income_rw on public.bank_income for all to authenticated
  using (sec.fin_full()) with check (sec.fin_full());

alter table public.bank_receipts enable row level security;
drop policy if exists bank_receipts_all on public.bank_receipts;
drop policy if exists bank_receipts_rw on public.bank_receipts;
create policy bank_receipts_rw on public.bank_receipts for all to authenticated
  using (sec.fin_full() or sec.can('orders.pay'))
  with check (sec.fin_full() or sec.can('orders.pay'));

alter table public.vat_receipts enable row level security;
drop policy if exists vat_receipts_all on public.vat_receipts;
drop policy if exists vat_receipts_rw on public.vat_receipts;
create policy vat_receipts_rw on public.vat_receipts for all to authenticated
  using (sec.fin_full() or sec.can('vat'))
  with check (sec.fin_full() or sec.can('vat'));

alter table public.nomaad_payments enable row level security;
drop policy if exists nomaad_payments_all on public.nomaad_payments;
drop policy if exists nomaad_payments_rw on public.nomaad_payments;
create policy nomaad_payments_rw on public.nomaad_payments for all to authenticated
  using (sec.fin_full() or sec.can('nomaad'))
  with check (sec.fin_full() or sec.can('nomaad.income'));

-- ═══ 8. app_config — ТҮЛХҮҮРЭЭР ХУВААНА ═══════════════════════════════════
-- Дотор нь эзний хувийн данс (`personal_settlements`), ашгийн хуваарилалт
-- (`coo_share`), зарын сарын төсөв (`ads_budget`) байдаг. Үлдсэн түлхүүр
-- (тариф, хаасан сар, ирцийн хүсэлт …) нь ажлын урсгалд ЗААВАЛ хэрэгтэй тул
-- нээлттэй хэвээр.
-- ⛔ `ads_budget` = БОДИТ МӨНГӨ (Facebook зар автоматаар зарцуулна) тул зөвхөн
--    CEO бичнэ. Уншихыг хаагаагүй — маркетингийн хүн төсвөө харах ёстой.
--    app.js-ийн `adsBudgetEditable()` ижил дүрэмтэй байх ёстой (scan-тест хардаг).

alter table public.app_config enable row level security;
drop policy if exists app_config_all on public.app_config;
drop policy if exists app_config_sel on public.app_config;
create policy app_config_sel on public.app_config for select to authenticated
  using (key not in ('coo_share', 'personal_settlements') or sec.fin_full());
drop policy if exists app_config_ins on public.app_config;
create policy app_config_ins on public.app_config for insert to authenticated
  with check (case key when 'coo_share' then sec.is_ceo()
                       when 'personal_settlements' then sec.fin_full()
                       when 'ads_budget' then sec.is_ceo()
                       else true end);
drop policy if exists app_config_upd on public.app_config;
create policy app_config_upd on public.app_config for update to authenticated
  using (case key when 'coo_share' then sec.is_ceo()
                  when 'personal_settlements' then sec.fin_full()
                  when 'ads_budget' then sec.is_ceo()
                  else true end)
  with check (case key when 'coo_share' then sec.is_ceo()
                       when 'personal_settlements' then sec.fin_full()
                       when 'ads_budget' then sec.is_ceo()
                       else true end);

-- ═══ 9. ХАТУУ УСТГАЛ = БҮГДЭД ХОРИГЛОНО ═══════════════════════════════════
-- CLAUDE.md-ийн дүрэм: «Хатуу устгал ХЭЗЭЭ Ч ҮГҮЙ». Одоог хүртэл зөвхөн
-- аппын кодоор баригдаж байсныг өгөгдлийн санд хатууруулна. Апп үнэхээр
-- DELETE дууддаг 5 зам үлдэнэ (бараа, эрхийн мөр, баримтын файл, толь).

do $$
declare t record;
begin
  for t in
    select c.relname
      from pg_class c join pg_namespace n on n.oid = c.relnamespace
     where n.nspname = 'public' and c.relkind = 'r'
       and c.relname not in ('products', 'member_perms', 'role_perms',
                             'company_docs', 'product_aliases')
  loop
    execute format('revoke delete on public.%I from authenticated', t.relname);
  end loop;
end $$;

-- ═══ 10. ҮХСЭН ХҮСНЭГТЭЭС ЭРХ ХУРААХ ══════════════════════════════════════
-- Ашиглагдахаа больсон: нүүлгэлтийн нөөц хуулбар, хоосон legacy `quotes`
-- (жинхэнэ нь `nomaad_quotes`), устгагдсан багцын модуль.

revoke all on public._sku_mig_backup_20260827 from authenticated;
revoke all on public.product_batches         from authenticated;
revoke all on public.quotes                  from authenticated;

-- ═══ 11. АППЫН ӨГӨГДМӨЛТЭЙ ТААРУУЛАХ — `sec.cap` / `sec.can_act` ══════════
-- ⛔ АСИММЕТР: app.js-ийн `can(үйлдэл)` нь ТОХИРУУЛААГҮЙ үед ЗӨВШӨӨРНӨ, харин
--    дээрх `sec.can()` нь ХОРИГЛОНО. Өнөөдөр хохирогч алга (бүх ажилтан
--    member_perms/role_perms/багц эсвэл lvl=100-тай — амьд датаар баталсан),
--    гэхдээ ТАНИГДАХГҮЙ албан тушаалтай ШИНЭ ажилтан бүртгэгдмэгц апп нь
--    зөвшөөрч, DB нь хориглож ЧИМЭЭГҮЙ хоосон дэлгэц үүсгэнэ.
-- Тиймээс аппын гурван өгөгдмөлийг ТУСАД нь дуурайлгана:
--   `sec.cap(k)`     = app `capValue(k)` — тохируулаагүй бол NULL
--   `sec.can(k)`     = хориглох өгөгдмөл (дээрх бодлогууд хэвээр)
--   `sec.can_act(k)` = app `can(k)` — зөвшөөрөх өгөгдмөл (ШИНЭ бодлогууд)

-- Цагийн ажилтан — app `isDailyMember()` + `app_config['worker_type_overrides']`.
-- ⚠ Энэ клампыг МАРТВАЛ 124 цагийн ажилтан `can_act`-аар бүх зүйл рүү нээгдэнэ.
create or replace function sec.is_daily() returns boolean
  language sql stable security definer set search_path = public, pg_temp as $$
    select case
      when ov.v is not null then ov.v = 'daily'
      when e.worker_type = 'daily' then true
      else coalesce(e.role ~* 'өдрийн\s*ажил|цагийн\s*ажил', false)
    end
    from (select sec.phone() as ph) q
    left join lateral (
      select e2.role, e2.worker_type from employees e2
       where regexp_replace(coalesce(e2.phone, ''), '\D', '', 'g') = q.ph
         and e2.merged_into is null
       order by e2.pk limit 1) e on true
    left join lateral (
      select c.value ->> q.ph as v from app_config c
       where c.key = 'worker_type_overrides') ov on true
  $$;

-- app `capValue()`-ийн ТОЛЬ. Дараалал ЧУХАЛ:
-- CEO → member_perms → (цагийн ажилтан бол зөвхөн бүлгийн загвар) → role_perms → багц.
create or replace function sec.cap(p_key text)
  returns boolean
  language plpgsql stable
  security definer set search_path = public, sec, pg_temp as $$
declare v_ph text; v jsonb; v_role text;
begin
  if sec.lvl() >= 100 then return true; end if;
  v_ph := sec.phone();
  if v_ph is null then return null; end if;

  select mp.perms into v from member_perms mp where mp.person_key = v_ph;
  if v is not null and v ? p_key then
    return coalesce((v ->> p_key)::boolean, false);
  end if;

  -- Цагийн ажилтан: бүлгийн загварт байгаагаас өөр ЮУ Ч үгүй (NULL буцаахгүй —
  -- эс бөгөөс `can_act` зөвшөөрөх өгөгдмөл рүү унана).
  if sec.is_daily() then
    select rp.perms into v from role_perms rp where lower(rp.role) = 'цагийн ажилтан';
    return coalesce((v ->> p_key)::boolean, false);
  end if;

  select e.role into v_role from employees e
   where regexp_replace(coalesce(e.phone, ''), '\D', '', 'g') = v_ph
     and e.merged_into is null
   order by e.pk limit 1;
  if v_role is null then return null; end if;

  select rp.perms into v from role_perms rp where lower(rp.role) = lower(v_role);
  if v is not null and v ? p_key then
    return coalesce((v ->> p_key)::boolean, false);
  end if;

  return sec.preset_cap(v_role, p_key);   -- таарахгүй бол NULL
end $$;

create or replace function sec.can_act(p_key text) returns boolean
  language sql stable as $$ select coalesce(sec.cap(p_key), true) $$;

revoke all on function sec.cap(text), sec.can_act(text), sec.is_daily() from public;
grant execute on function sec.cap(text), sec.can_act(text), sec.is_daily()
  to authenticated, anon;

-- ═══ 12. ХАРИЛЦАГЧ ════════════════════════════════════════════════════════
-- Нэр · утас · РД · захиалгын түүх. Өмнө нь нэвтэрсэн ХЭН Ч (цагийн ажилтан ч)
-- бүх харилцагчийн жагсаалтыг уншиж, бүр ЗАСАЖ чаддаг байв.
-- Толь: app `canSeeCustomers()` = canAccessView('customers', isCEO || can('orders.pay')).
create or replace function sec.can_customers() returns boolean
  language sql stable as $$
    select coalesce(sec.cap('customers'), sec.is_ceo() or sec.can_act('orders.pay'))
  $$;
revoke all on function sec.can_customers() from public;
grant execute on function sec.can_customers() to authenticated, anon;

alter table public.customers enable row level security;
drop policy if exists customers_all on public.customers;
drop policy if exists customers_rw on public.customers;
create policy customers_rw on public.customers for all to authenticated
  using (sec.can_customers()) with check (sec.can_customers());

-- ═══ 13. НЭХЭМЖЛЭХ ════════════════════════════════════════════════════════
-- Худалдан авагчийн мэдээлэл + дүнгийн снапшот. Толь: картын «🧾 Нэхэмжлэх»
-- товч = `can('orders.pay') || isCEO`.
alter table public.invoices enable row level security;
drop policy if exists invoices_all on public.invoices;
drop policy if exists invoices_rw on public.invoices;
create policy invoices_rw on public.invoices for all to authenticated
  using (sec.is_ceo() or sec.can_act('orders.pay'))
  with check (sec.is_ceo() or sec.can_act('orders.pay'));

-- ═══ 14. ЗӨВХӨН ХАРАГДАЦААР УНШИГДДАГ ХҮСНЭГТЭЭС ЭРХ ХУРААХ ═══════════════
-- Апп эдгээрийн ҮНДСЭН хүснэгтэд ОГТ хүрдэггүй — зөвхөн `v_employee_aliases`
-- ба `rh_v_documents` харагдацаар уншина. Харагдац нь `security_invoker=off`
-- (эзний эрхээр ажиллана) тул үндсэн хүснэгтийг бүрэн хаах нь аюулгүй.
-- ⚠ Харагдацыг хожим `security_invoker=on` болговол эдгээр УНШИЛТ УНАНА.
revoke all on public.employee_aliases from authenticated;   -- ажилтны хуучин утас/имэйл
revoke all on public.bq_documents     from authenticated;   -- Booqable түүхэн баримт
