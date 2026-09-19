-- ═══════════════════════════════════════════════════════════════════════
-- ХАРИЛЦАГЧИЙН БҮРТГЭЛ (customers) — 2026-09-13
--
-- ЯАГААД: харилцагч гэдэг нь өнөөдөр `app_orders`-ийн `customer`/`phone`/`email`
--   гэсэн ЧӨЛӨӨТ ТЕКСТ. Захиалга бүрд дахин бичигддэг тул «энэ хүн өмнө хэдэн
--   удаа захиалсан», «хэн хэр өртэй», «хэнд эргэж залгах» гэдгийг систем
--   хэлж чадахгүй. Нэхэмжлэх, төлбөрийн мөр, авлага бүгд энэ дээр байрлана.
--
-- ГАРААР ажиллуулна (db/-ийн бусад файлтай ижил). ДАХИН ажиллуулж болно —
--   id нь утас/нэрээс детерминистикээр гардаг тул давхардал үүсгэхгүй.
--
-- АМЬД ДАТААС (2026-09-13 хэмжсэн):
--   1,049 захиалга · 302 нь нормчлогдох утастай (264 ялгаатай)
--   11 нь утасгүй ч бодит нэртэй (9 ялгаатай)
--   736 нь `customer='?'` + утасгүй → Booqable түүх, таних мэдээлэл БАЙХГҮЙ.
--     Эдгээр ЗОРИУД холбогдохгүй (`customer_id` null). Нэг хиймэл «?» харилцагч
--     үүсгэвэл түүх, авлага, давтамжийн тоо бүгд утгагүй болно.
--   2 захиалгын утас нормчлогдохгүй (12/15 оронтой) → гараар засна.
-- ═══════════════════════════════════════════════════════════════════════

begin;

create table if not exists customers (
  id          text primary key,
  name        text not null,
  -- ⚠ `id`-г АПП ҮҮСГЭХГҮЙ — DB өгөгдмөлөөр гарна. Нөхөн дүүргэлт нь утаснаас
  --   детерминистик id хийдэг тул дахин ажиллуулж болно; аппаас шинэ харилцагч
  --   нэмэхэд `saveCustomer` эхлээд УТСААР ХАЙЖ, байвал түүн дээр бичнэ.
  phone       text,          -- НОРМЧИЛСОН 8 орон (976/0 угтвар хасагдсан)
  email       text,
  company     text,          -- байгууллагын захиалагч
  rd          text,          -- регистр — нэхэмжлэх гаргахад шаардлагатай
  address     text,
  note        text,
  merged_into text,          -- давхардлыг нэгтгэх. ХАТУУ УСТГАХГҮЙ (employees-тэй ижил хэв маяг)
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);

-- Нэг утас = нэг идэвхтэй харилцагч. Нэгтгэсэн мөрийг хасна.
create unique index if not exists customers_phone_uniq
  on customers (phone) where phone is not null and merged_into is null;
create index if not exists customers_name_idx on customers (lower(name));
alter table customers alter column id set default ('c_' || substr(md5(random()::text || clock_timestamp()::text), 1, 10));

alter table app_orders add column if not exists customer_id text;
create index if not exists app_orders_customer_idx on app_orders (customer_id);

commit;

-- ── Нормчлолт — НЭГ ГАЗАР бичигдэнэ ─────────────────────────────────────
-- ⚠ Аппын `custPhoneKey()` нь ЯГ ЭНЭ дүрмийг давтана. Хоёуланг зэрэг зас.
create or replace function cust_phone_norm(raw text) returns text language sql immutable as $$
  select case
    when regexp_replace(coalesce(raw,''),'\D','','g') ~ '^976[0-9]{8}$' then right(regexp_replace(raw,'\D','','g'),8)
    when regexp_replace(coalesce(raw,''),'\D','','g') ~ '^0?[0-9]{8}$'  then right(regexp_replace(raw,'\D','','g'),8)
    else null end;
$$;

-- ── Нөхөн дүүргэлт ──────────────────────────────────────────────────────
begin;

-- ① Утастай захиалгууд → утсаар бүлэглэнэ.
--    Нэр/имэйлийг ХАМГИЙН СҮҮЛИЙН бодит утгаас авна («?» тоохгүй).
with src as (
  select cust_phone_norm(phone) ph,
         nullif(btrim(regexp_replace(coalesce(customer,''),'\s+',' ','g')),'') nm,
         nullif(btrim(coalesce(email,'')),'') em,
         coalesce(created_at, now()) at
  from app_orders
  where cust_phone_norm(phone) is not null
), pick as (
  select ph,
         (array_remove(array_agg(nm order by at desc), null))[1] any_nm,
         (array_remove(array_agg(case when nm is distinct from '?' then nm end order by at desc), null))[1] real_nm,
         (array_remove(array_agg(em order by at desc), null))[1] em,
         min(at) first_at
  from src group by ph
)
insert into customers (id, name, phone, email, created_at)
select 'c_' || substr(md5(ph), 1, 10), coalesce(real_nm, any_nm, ph), ph, em, first_at
from pick
on conflict (id) do nothing;

-- ② Утасгүй ч БОДИТ нэртэй (9 ялгаатай) → нэрээр бүлэглэнэ.
with src as (
  select lower(btrim(regexp_replace(customer,'\s+',' ','g'))) key,
         btrim(regexp_replace(customer,'\s+',' ','g')) nm,
         nullif(btrim(coalesce(email,'')),'') em,
         coalesce(created_at, now()) at
  from app_orders
  where cust_phone_norm(phone) is null
    and nullif(btrim(coalesce(customer,'')),'') is not null
    and btrim(customer) <> '?'
), pick as (
  select key, (array_agg(nm order by at desc))[1] nm,
         (array_remove(array_agg(em order by at desc), null))[1] em, min(at) first_at
  from src group by key
)
insert into customers (id, name, email, created_at)
select 'c_n' || substr(md5(key), 1, 9), nm, em, first_at
from pick
on conflict (id) do nothing;

-- ③ Захиалгуудыг холбоно. `?` + утасгүй нь ЗОРИУД null үлдэнэ.
update app_orders o set customer_id = 'c_' || substr(md5(cust_phone_norm(o.phone)), 1, 10)
 where cust_phone_norm(o.phone) is not null;

update app_orders o set customer_id =
       'c_n' || substr(md5(lower(btrim(regexp_replace(o.customer,'\s+',' ','g')))), 1, 9)
 where cust_phone_norm(o.phone) is null
   and nullif(btrim(coalesce(o.customer,'')),'') is not null
   and btrim(o.customer) <> '?';

commit;

-- ── Эрх — anon-д ОГТ НЭЭХГҮЙ (нэр/утас/РД = хувийн мэдээлэл) ────────────
grant select, insert, update on customers to authenticated;
-- delete ЗОРИУД алга: давхардлыг `merged_into`-оор нэгтгэнэ.
notify pgrst, 'reload schema';

-- ── Шалгах ──────────────────────────────────────────────────────────────
-- select count(*) from customers;                            -- ~273
-- select count(*) from app_orders where customer_id is null;  -- ~736 (Booqable '?')

-- ⛔ DELETE ИЛ ХУРААНА (2026-09-16). Эзний DEFAULT PRIVILEGES нь ШИНЭ хүснэгт
--    бүрд `authenticated`-д `arwd` (устгах ч) автоматаар олгодог тул `grant`
--    бичээд орхивол хатуу устгал нээлттэй үлдэнэ. `db/rls.sql` бүгдээс хураадаг
--    ч тэр нь ДАХИН ажиллуулж байж хүчинтэй — VPS-ийг сэргээхэд энэ файл дангаараа
--    зөв байх ёстой.
revoke delete on customers from authenticated;
