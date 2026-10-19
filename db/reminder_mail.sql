-- Давтан үйлчлүүлэгчид ӨӨРӨӨ илгээгддэг сануулга имэйл (2026-10-19).
-- Гараар ажиллуулна (psql). Идемпотент — дахин ажиллуулахад аюулгүй.
--
-- Хэн, хэзээ, ямар дүрмээр илгээхийг НЭГ газар (энэ функц) шийднэ. n8n талд
-- `MEVENT · Reminder mail (repeat)` workflow зөвхөн `select * from reminder_pick()`
-- дуудаж, бичвэр угсарч, илгээж, тэмдэглэнэ — дүрэм нь тэнд ДАВХАРДАХГҮЙ.
--
-- Тохиргоо: app_config['reminder_mail'] (байхгүй бол mode = 'off', юу ч явахгүй)
--   mode         off | test | on
--   days         хаагдсанаас хойш хэдэн хоногт сануулах (өгөгдмөл 40)
--   window       хоцорсон өдрүүдийг барих хугацаа (өгөгдмөл 15)
--   cap          нэг ажиллагаанд дээд тал нь хэдэн имэйл (өгөгдмөл 25)
--   holdout_pct  имэйлээр хэш хийж, энэ хувийг ХЭЗЭЭ Ч илгээхгүй (сануулга ажиллаж
--                байгааг хэмжих хяналтын бүлэг; өгөгдмөл 20)
--   test_to      mode='test' үед БҮХ имэйл энэ хаяг руу (бодит харилцагчид очихгүй)
--   test_order   mode='test' үед бичвэрийг энэ захиалгаар жишээлнэ

create or replace function reminder_pick()
returns table (
  mode text, order_id text, number int, customer text, email text,
  starts_at text, stops_at text, items text, closed_at timestamptz, test_to text
)
language sql stable security definer set search_path = public as $$
with cfg as (
  select coalesce((select value::jsonb from app_config where key = 'reminder_mail'), '{}'::jsonb) as v
), p as (
  select coalesce(v->>'mode', 'off')                         as mode,
         coalesce((v->>'days')::int, 40)                     as days,
         coalesce((v->>'window')::int, 15)                   as win,
         coalesce((v->>'cap')::int, 25)                      as cap,
         coalesce((v->>'holdout_pct')::int, 20)              as holdout,
         nullif(v->>'test_to', '')                           as test_to,
         nullif(v->>'test_order', '')                        as test_order
    from cfg
), base as (
  -- Хаагдсан имэйл (талархал) явсан захиалга: тэр нь сануулгын ЭХЛЭХ цэг.
  select o.id, o.number, o.customer, lower(btrim(o.email)) as email,
         regexp_replace(coalesce(o.phone, ''), '[^0-9]', '', 'g') as ph,
         o.starts_at, o.stops_at, o.items, o.total_mnt, o.paid_mnt, o.deposit_mnt,
         o.stage_meta, (o.stage_meta->'mail'->>'closed')::timestamptz as closed_at
    from app_orders o
   where o.stage_meta->'mail' ? 'closed'
     and coalesce(o.status, '') not in ('deleted', 'canceled', 'draft')
     and o.email ~* '^[^\s@]+@[^\s@]+\.[^\s@]{2,}$'
), eligible as (
  select b.*
    from base b, p
   where b.closed_at <= now() - make_interval(days => p.days)
     and b.closed_at >  now() - make_interval(days => p.days + p.win)
     -- Өөрсдийн, туршилтын хаяг
     and b.email !~* '@(mevent\.mn|nomaadcamp\.com|chimun[a-z.]*)$'
     and b.email !~* '^(test|demo)'
     -- Хасуулсан хүн
     and not exists (select 1 from email_optout x where lower(btrim(x.email)) = b.email)
     -- Төлбөр дутуу. Барьцаа буцаасан үед paid = total − барьцаа болдог тул барьцааг
     -- тооцож, 1,000₮-өөс дээш зөрүү л «өр» гэж үзнэ. Эргэлзвэл ИЛГЭЭХГҮЙ.
     and b.total_mnt - b.paid_mnt - b.deposit_mnt <= 1000
     -- Хэн нэгэн нэгэнт сануулсан бол 120 хоногийн дотор дахин сануулахгүй
     and not exists (
       select 1 from app_orders r
        where lower(btrim(r.email)) = b.email
          and (r.stage_meta->'mail'->>'reminder')::timestamptz > now() - interval '120 days')
     -- Тэр л захиалгад сануулга явсан (алдаатай ч) бол дахин оролдохгүй
     and not (coalesce(b.stage_meta->'mail', '{}'::jsonb) ? 'reminder')
     and not (coalesce(b.stage_meta->'mail', '{}'::jsonb) ? 'reminder_err')
     -- 1-2 одтой үнэлгээ өгсөн хүнд «дахин ирээрэй» гэж бичихгүй (эхлээд залгана)
     and not exists (
       select 1 from app_orders r
        where lower(btrim(r.email)) = b.email
          and coalesce((r.stage_meta->'review'->>'stars')::int, 5) <= 2)
     -- Аль хэдийн дараагийн захиалга өгсөн / хэлэлцэж байгаа хүн (имэйл БА утсаар).
     -- Ноорог нь зөвхөн саяхных бол тооцно, хуучин ноорог мөнхөд хаахгүй.
     and not exists (
       select 1 from app_orders r
        where r.id <> b.id
          and (lower(btrim(r.email)) = b.email
               or (length(b.ph) >= 8 and right(regexp_replace(coalesce(r.phone, ''), '[^0-9]', '', 'g'), 8) = right(b.ph, 8)))
          and coalesce(r.status, '') not in ('deleted', 'canceled')
          and (r.starts_at > b.starts_at
               and (r.status <> 'draft' or r.created_at > now() - interval '45 days')))
     -- Хяналтын бүлэг: имэйлийн хэшээр тогтмол (нэг хүн үргэлж нэг бүлэгт)
     and abs(hashtext(b.email)) % 100 >= p.holdout
), one_per_person as (
  select distinct on (email) *
    from eligible
   order by email, closed_at desc
)
select 'on', e.id, e.number, e.customer, e.email,
       e.starts_at::text, e.stops_at::text, e.items::text, e.closed_at, null::text
  from one_per_person e, p
 where p.mode = 'on'
 order by e.closed_at
 limit (select cap from p)
$$;

-- test горим: бодит харилцагчид БИШ, зөвхөн test_to хаягт, test_order захиалгаар жишээлнэ.
create or replace function reminder_test_pick()
returns table (
  mode text, order_id text, number int, customer text, email text,
  starts_at text, stops_at text, items text, closed_at timestamptz, test_to text
)
language sql stable security definer set search_path = public as $$
with cfg as (
  select coalesce((select value::jsonb from app_config where key = 'reminder_mail'), '{}'::jsonb) as v
)
select 'test', o.id, o.number, o.customer, lower(btrim(o.email)),
       o.starts_at::text, o.stops_at::text, o.items::text,
       (o.stage_meta->'mail'->>'closed')::timestamptz, c.v->>'test_to'
  from app_orders o, cfg c
 where c.v->>'mode' = 'test'
   and o.id = c.v->>'test_order'
   and coalesce(c.v->>'test_to', '') ~ '^[^\s@]+@[^\s@]+\.[^\s@]{2,}$'
$$;

-- ⛔ Харилцагчийн имэйл буцаадаг тул ЗӨВХӨН эзэн (n8n-ийн холболт) дуудна.
-- Функц үүсэхэд EXECUTE нь PUBLIC-д автоматаар олгогддог — PostgREST RPC-ээр
-- анон/нэвтэрсэн ажилтан бүгд уншиж чадахаас сэргийлж ЗААВАЛ хураана.
revoke all on function reminder_pick() from public, anon, authenticated;
revoke all on function reminder_test_pick() from public, anon, authenticated;

notify pgrst, 'reload schema';
