-- Давтан үйлчлүүлэгчид ӨӨРӨӨ илгээгддэг сануулга имэйл (2026-10-19).
-- Гараар ажиллуулна (psql). Идемпотент — дахин ажиллуулахад аюулгүй.
--
-- Хэн, хэзээ, ямар дүрмээр илгээхийг НЭГ газар (энэ функц) шийднэ. n8n талд
-- `MEVENT · Reminder mail (repeat)` workflow зөвхөн `select * from reminder_pick()`
-- дуудаж, бичвэр угсарч, илгээж, тэмдэглэнэ — дүрэм нь тэнд ДАВХАРДАХГҮЙ.
--
-- ХОЁР БҮЛЭГ (segment), тус бүр өөрийн бичвэртэй:
--   new  Захиалга хаагдаж «баярлалаа» имэйл (stage_meta.mail.closed, 9/13-аас) явснаас `days` хоногийн дараа.
--   old  9/13-аас ӨМНӨ хаагдсан (тэр имэйлгүй) захиалгын эзэд. Эхлэх цэг = эвент дууссан өдөр (stops_at).
--        ⛔ `old_mode`='on' үед л. Өдөрт `old_cap` хүнээр аажим явна (эхлээд хамгийн сүүлд захиалсан нь).
--
-- Тохиргоо: app_config['reminder_mail'] (байхгүй бол mode = 'off', юу ч явахгүй)
--   mode         off | test | on
--   days         хаагдсанаас хойш хэдэн хоногт сануулах (өгөгдмөл 30)
--   window       new-д хоцорсон өдрүүдийг барих хугацаа (өгөгдмөл 15)
--   cap          нэг ажиллагаанд new бүлгээс дээд тал нь хэдэн имэйл (өгөгдмөл 25)
--   old_mode     off | on — хуучин хүнд явуулах эсэх (өгөгдмөл off)
--   old_cap      нэг ажиллагаанд old бүлгээс хэдэн имэйл (өгөгдмөл 10)
--   old_from     old-д хамгийн эртний эвентийн огноо (өгөгдмөл 2026-01-01)
--   holdout_pct  имэйлээр хэш хийж, энэ хувийг ХЭЗЭЭ Ч илгээхгүй (сануулга ажиллаж
--                байгааг хэмжих хяналтын бүлэг; өгөгдмөл 20)
--   test_to      mode='test' үед БҮХ имэйл энэ хаяг руу (бодит харилцагчид очихгүй)
--   test_order   mode='test' үед бичвэрийг энэ захиалгаар жишээлнэ
--   test_segment mode='test' үед аль бүлгийн бичвэрээр жишээлэх (new | old)

-- ⛔ Буцаах багана нэмэгдсэн тул `create or replace` хангалтгүй (төрөл солигдохгүй) — эхлээд устгана.
drop function if exists reminder_pick();
drop function if exists reminder_test_pick();

create function reminder_pick()
returns table (
  segment text, mode text, order_id text, number int, customer text, email text,
  starts_at text, stops_at text, items text, closed_at timestamptz, test_to text
)
language sql stable security definer set search_path = public as $$
with cfg as (
  select coalesce((select value::jsonb from app_config where key = 'reminder_mail'), '{}'::jsonb) as v
), p as (
  select coalesce(v->>'mode', 'off')                         as mode,
         coalesce(v->>'old_mode', 'off')                     as old_mode,
         coalesce((v->>'days')::int, 30)                     as days,
         coalesce((v->>'window')::int, 15)                   as win,
         coalesce((v->>'cap')::int, 25)                      as cap,
         coalesce((v->>'old_cap')::int, 10)                  as old_cap,
         coalesce((v->>'old_from')::date, date '2026-01-01') as old_from,
         coalesce((v->>'holdout_pct')::int, 20)              as holdout,
         nullif(v->>'test_to', '')                           as test_to,
         nullif(v->>'test_order', '')                        as test_order
    from cfg
), base as (
  -- new: Хаагдсан имэйл (талархал) явсан захиалга нь сануулгын ЭХЛЭХ цэг.
  select 'new'::text as segment, o.id, o.number, o.customer, lower(btrim(o.email)) as email,
         regexp_replace(coalesce(o.phone, ''), '[^0-9]', '', 'g') as ph,
         o.starts_at, o.stops_at, o.items, o.total_mnt, o.paid_mnt, o.deposit_mnt, o.source,
         o.stage_meta, (o.stage_meta->'mail'->>'closed')::timestamptz as closed_at
    from app_orders o, p
   where o.stage_meta->'mail' ? 'closed'
     and coalesce(o.status, '') not in ('deleted', 'canceled', 'draft')
     and o.email ~* '^[^\s@]+@[^\s@]+\.[^\s@]{2,}$'
     and (o.stage_meta->'mail'->>'closed')::timestamptz <= now() - make_interval(days => p.days)
     and (o.stage_meta->'mail'->>'closed')::timestamptz >  now() - make_interval(days => p.days + p.win)
  union all
  -- old: тэр имэйл хэзээ ч очоогүй хуучин захиалга. Эхлээд ДУУССАН төлөвтэй л (rented/reserved хүнийг оруулахгүй).
  select 'old'::text, o.id, o.number, o.customer, lower(btrim(o.email)),
         regexp_replace(coalesce(o.phone, ''), '[^0-9]', '', 'g'),
         o.starts_at, o.stops_at, o.items, o.total_mnt, o.paid_mnt, o.deposit_mnt, o.source,
         o.stage_meta, (o.stops_at::timestamp at time zone 'Asia/Ulaanbaatar')
    from app_orders o, p
   where p.old_mode = 'on'
     and not coalesce(o.stage_meta->'mail' ? 'closed', false)
     and o.status in ('archived', 'returned', 'stowed', 'stopped', 'done')
     and o.email ~* '^[^\s@]+@[^\s@]+\.[^\s@]{2,}$'
     and o.stops_at >= p.old_from
     and o.stops_at <= (now() at time zone 'Asia/Ulaanbaatar')::date - p.days
), eligible as (
  select b.*
    from base b, p
   where true
     -- Өөрсдийн, туршилтын хаяг
     and b.email !~* '@(mevent\.mn|nomaadcamp\.com|chimun[a-z.]*)$'
     and b.email !~* '^(test|demo)'
     -- Хасуулсан хүн
     and not exists (select 1 from email_optout x where lower(btrim(x.email)) = b.email)
     -- Төлбөр дутуу. Апп/сайтын захиалгад барьцаа буцаасан үед paid = total − барьцаа болдог тул барьцааг
     -- тооцно; Booqable-д барьцаа total-д ОРООГҮЙ тул тооцохгүй (хатуу). 1,000₮-өөс дээш зөрүү л «өр».
     -- Эргэлзвэл ИЛГЭЭХГҮЙ.
     and (case when b.source = 'booqable' then b.total_mnt - b.paid_mnt
               else b.total_mnt - b.paid_mnt - b.deposit_mnt end) <= 1000
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
  -- Нэг хүнд нэг имэйл. Хоёр бүлэгт зэрэг орвол new нь давуу.
  select distinct on (email) *
    from eligible
   order by email, (segment = 'new') desc, closed_at desc
), picked as (
  (select * from one_per_person where segment = 'new' order by closed_at limit (select cap from p))
  union all
  (select * from one_per_person where segment = 'old' order by closed_at desc, number desc limit (select old_cap from p))
)
select e.segment, 'on', e.id, e.number, e.customer, e.email,
       e.starts_at::text, e.stops_at::text, e.items::text, e.closed_at, null::text
  from picked e, p
 where p.mode = 'on'
$$;

-- test горим: бодит харилцагчид БИШ, зөвхөн test_to хаягт, test_order захиалгаар жишээлнэ.
create function reminder_test_pick()
returns table (
  segment text, mode text, order_id text, number int, customer text, email text,
  starts_at text, stops_at text, items text, closed_at timestamptz, test_to text
)
language sql stable security definer set search_path = public as $$
with cfg as (
  select coalesce((select value::jsonb from app_config where key = 'reminder_mail'), '{}'::jsonb) as v
)
select case when c.v->>'test_segment' = 'old' then 'old' else 'new' end,
       'test', o.id, o.number, o.customer, lower(btrim(o.email)),
       o.starts_at::text, o.stops_at::text, o.items::text,
       (o.stage_meta->'mail'->>'closed')::timestamptz, c.v->>'test_to'
  from app_orders o, cfg c
 where c.v->>'mode' = 'test'
   and o.id = c.v->>'test_order'
   and coalesce(c.v->>'test_to', '') ~ '^[^\s@]+@[^\s@]+\.[^\s@]{2,}$'
$$;

-- Имэйлийн БИЧВЭР: ажилтан аппаас (Маркетинг → Имэйл → Автомат сануулга) засна. Энд зөвхөн анхны утга —
-- байгаа бол ДАРАХГҮЙ. Аппын REMINDER_TEXT_DEFAULT / REMINDER_TEXT_OLD_DEFAULT-тай ЯГ ИЖИЛ байх ёстой (test/run.js тулгана).
insert into app_config(key, value) values ('reminder_mail_text', '{"subject": "Та ойрын хугацаанд эвент төлөвлөж байна уу? M-Event", "heading": "Та ойрын хугацаанд эвент төлөвлөж байна уу?", "greeting": "Сайн байна уу, {нэр}.", "intro": "Та {огноо} манай түрээсийн үйлчилгээг сонгосон байна.", "body": "Ойрын хугацаанд дахиад эвент, арга хэмжээ төлөвлөж байгаа бол манай түрээсийн үйлчилгээтэй хамтран ажиллахыг хүсэж байна. Бид үйл ажиллагаагаа илүү мэргэжлийн түвшинд хүргэхийн төлөө өдөр бүр сайжруулж, шинэ бараа бүтээгдэхүүн нэмсээр байна.\nАрга хэмжээнийхээ огноо, хэрэгтэй зүйлсээ хэлэхэд л болно. Бид танд үйлчилгээ үзүүлэхдээ үргэлж баяртай байх болно."}'::jsonb)
on conflict (key) do nothing;
insert into app_config(key, value) values ('reminder_mail_text_old', '{"subject": "Дахин арга хэмжээ төлөвлөж байна уу? M-Event", "heading": "Дахин арга хэмжээ төлөвлөж байна уу?", "greeting": "Сайн байна уу, {нэр}.", "intro": "Та {огноо} манайхаас түрээсийн үйлчилгээ авч байсан. Түүнээс хойш хэсэг хугацаа өнгөрчээ.", "body": "Бид энэ хугацаанд бараа бүтээгдэхүүнээ нэмж, үйлчилгээгээ сайжруулсан. LED дэлгэц, тайз, хөгжим, сандал ширээ, гэрэл, асар, тохижилтын түрээсийг нэг дороос авах боломжтой.\nДараагийн арга хэмжээнийхээ огноо, хэрэгцээгээ хэлээрэй. Нөөц, үнийг бид шууд хэлж өгнө."}'::jsonb)
on conflict (key) do nothing;

-- ⛔ Харилцагчийн имэйл буцаадаг тул ЗӨВХӨН эзэн (n8n-ийн холболт) дуудна.
-- Функц үүсэхэд EXECUTE нь PUBLIC-д автоматаар олгогддог — PostgREST RPC-ээр
-- анон/нэвтэрсэн ажилтан бүгд уншиж чадахаас сэргийлж ЗААВАЛ хураана.
revoke all on function reminder_pick() from public, anon, authenticated;
revoke all on function reminder_test_pick() from public, anon, authenticated;

notify pgrst, 'reload schema';
