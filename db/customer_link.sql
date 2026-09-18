-- ═══════════════════════════════════════════════════════════════════════
-- ЗАХИАЛГА → ХАРИЛЦАГЧ АВТОМАТ ХОЛБОЛТ — 2026-09-18
--
-- ЯАГААД: `db/customers.sql`-ийн нөхөн дүүргэлт нь НЭГ УДААГИЙН скрипт байв.
--   Аппын захиалга хадгалах зам `customer_id`-г ХЭЗЭЭ Ч бичдэггүй (`saveCustomer`
--   нь зөвхөн харилцагчийн формоос дуудагддаг) тул 09-14-ээс хойших БҮХ шинэ
--   захиалга (19 ширхэг, бүгд утастай) холбоогүй үлдсэн — өдөрт ~4-өөр өсөж байв.
--
-- ЯАГААД АППАД БИШ, DB-Д: захиалга гурван замаар бичигддэг (апп → PostgREST,
--   сайт → n8n webhook, гараар). Аппад бичвэл сайтын захиалга холбогдохгүй
--   үлдэнэ. Trigger нь гурвуулангийнх нь ард сууна.
--
-- ГАРААР ажиллуулна. ДАХИН ажиллуулж болно.
-- ═══════════════════════════════════════════════════════════════════════

begin;

create or replace function app_orders_link_customer() returns trigger
language plpgsql as $$
declare
  ph  text;
  nm  text;
  key text;
  cid text;
  mrg text;
begin
  -- Аль хэдийн холбогдсон бол ХӨНДӨХГҮЙ (гараар залруулсныг дарахгүй).
  if new.customer_id is not null then return new; end if;

  ph := cust_phone_norm(new.phone);
  nm := nullif(btrim(regexp_replace(coalesce(new.customer,''),'\s+',' ','g')), '');

  if ph is not null then
    -- Утас = эрхэм түлхүүр. Байгаа харилцагчийг ЭХЛЭЭД хайна: аппаас нэмэгдсэн
    -- харилцагч санамсаргүй id-тай байж болох тул шууд insert хийвэл
    -- `customers_phone_uniq`-д мөргөж захиалгын хадгалалт унана.
    select id into cid from customers where phone = ph and merged_into is null limit 1;
    if cid is null then
      insert into customers (id, name, phone, email)
      values ('c_' || substr(md5(ph), 1, 10),
              coalesce(nullif(nm, '?'), nm, ph), ph,
              nullif(btrim(coalesce(new.email, '')), ''))
      on conflict do nothing;
      select id into cid from customers where phone = ph and merged_into is null limit 1;
    end if;
  elsif nm is not null and nm <> '?' then
    -- Утасгүй ч бодит нэртэй. `?` = Booqable түүх, ЗОРИУД холбогдохгүй.
    key := lower(nm);
    cid := 'c_n' || substr(md5(key), 1, 9);
    insert into customers (id, name, email)
    values (cid, nm, nullif(btrim(coalesce(new.email, '')), ''))
    on conflict do nothing;
  end if;

  -- Нэгтгэсэн харилцагч руу заасан бол эздийг нь дагана.
  if cid is not null then
    select merged_into into mrg from customers where id = cid;
    if mrg is not null then cid := mrg; end if;
    new.customer_id := cid;
  end if;

  return new;
exception when others then
  -- ⛔ Холболт унасан ч ЗАХИАЛГА ХАДГАЛАГДАНА. Холбоосгүй захиалга нь
  --    хадгалагдаагүй захиалгаас хавьгүй дээр.
  return new;
end;
$$;

drop trigger if exists app_orders_link_customer_trg on app_orders;
create trigger app_orders_link_customer_trg
  before insert or update of phone, customer, email on app_orders
  for each row execute function app_orders_link_customer();

commit;

-- ── Холбогдоогүй үлдсэн захиалгуудыг нөхнө (trigger-ийг ажиллуулна) ─────
update app_orders set phone = phone
 where customer_id is null
   and (cust_phone_norm(phone) is not null
        or (nullif(btrim(coalesce(customer,'')),'') is not null and btrim(customer) <> '?'));

notify pgrst, 'reload schema';

-- ── Шалгах ──────────────────────────────────────────────────────────────
-- select count(*) from app_orders where customer_id is null and source <> 'booqable';  -- 0 байх ёстой
