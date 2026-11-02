-- ═══════════════════════════════════════════════════════════════════════
-- ЧИМҮН ХХК-ийн бараа → M-EVENT салбар руу шилжүүлэх — 2026-11-02 (CEO шийдвэр)
--
-- ЮУ ХИЙХ: `qty_chimun > 0` бүх барааны Чимүн ХХК-ийн тоог `qty_mevent`-д нэмж,
--   `qty_chimun`-г 0 болгоно. `stock` (нийт) ӨӨРЧЛӨГДӨХГҮЙ — нийлбэр хэвээр.
--
-- БҮРТГЭЛ (буцаах боломжтой): аппын «шилжүүлэх» товчтой ИЖИЛ дүрмээр
--   · `product_transfers` — барааны мөр бүрд 1 мөр (from=chimun, to=mevent, qty)
--   · `stock_moves`       — барааны мөр бүрд 2 мөр (chimun −N, mevent +N), reason='transfer'
--   БУЦААХ: ref='MOVE:chimun>mevent:2026-11-02' мөрүүдээр эсрэг шилжүүлэг хийнэ.
--
-- ⚠ ЯАГААД ЧУХАЛ (ажиллуулахаас өмнө уншина уу):
--   1. САЙТ: `public_catalog` нь `qty_mevent>0` БА `price>0` бараа бүрийг mevent.mn-д
--      гаргана. Шилжсэн бараанд үнэ (price>0) байвал САЙТАД ХАРАГДАНА. Доорх
--      ТАНИЛЦУУЛГА (1-р хэсэг) тэдний жагсаалтыг NOTICE-ээр гаргана.
--   2. ЭЛЭГДЭЛ: Чимүн ХХК-ийн элэгдэл `ХХК` мөрөнд байсан бол одооноос M-Event/NOMAAD
--      50/50-д очно (app.js `deprecByBranch`, 2026-11-02). Нээлттэй (хараахан
--      хаагаагүй) сарын ашиг өөрчлөгдөнө; ХААСАН сар `closed_months[m].dep` зургаар хөлдүү.
--   3. ТООЛЛОГО: Чимүн ХХК-ийн (`@chimun`) тооллого явж байвал түүнийг дуусгасны дараа
--      ажиллуул — системийн тоо хөдөлнө.
--
-- АЖИЛЛУУЛАХ (гараар, db/-ийн бусадтай ижил). Идемпотент: дахин ажиллуулбал
--   `qty_chimun>0` бараа үлдээгүй тул юу ч хийхгүй.
--   ssh chimun-vps 'docker exec -i vps-deploy-postgres-1 psql -U chimun -d chimun -v ON_ERROR_STOP=1' < db/chimun_to_mevent_2026-11-02.sql
--
-- ЗӨВХӨН ХАРАХ (юу ч өөрчлөхгүй):
--   ssh chimun-vps "docker exec -i vps-deploy-postgres-1 psql -U chimun -d chimun -c \"select sku, left(name,40) name, price, cost, stock, qty_mevent qm, qty_nomaad qn, qty_catering qk, qty_chimun qc from products where qty_chimun>0 order by qty_chimun desc\""
-- ═══════════════════════════════════════════════════════════════════════

-- ТҮР ҮНЭТЭЙ БАРААГ ҮЛДЭЭНЭ: `0 < price < hold_below` (өгөгдмөл 1000₮) бараа нь 1₮/55₮ гэх мэт
-- түр үнэтэй байж болох тул mevent.mn-д (сайт `public_catalog`-оос ШУУД уншдаг)
-- гаргахгүйн тулд Чимүн ХХК-д үлдээнэ. Үнийг засаад (эсвэл CEO «гарсан ч яахав» гэвэл)
-- бүгдийг нь шилжүүлэх: `psql -v hold_below=0 …`
\if :{?hold_below}
\else
\set hold_below 1000
\endif

begin;

-- Шилжих мөрүүдийг түгжинэ (аппаас зэрэг бичигдэхээс сэргийлнэ).
do $$ begin perform 1 from products where coalesce(qty_chimun, 0) > 0 for update; end $$;

create temp table _mv on commit drop as
  select sku, id, qty_chimun as moved,
         coalesce(qty_mevent, 0) as qm_before,
         coalesce(qty_mevent, 0) + coalesce(qty_nomaad, 0) + coalesce(qty_catering, 0) + coalesce(qty_chimun, 0) as total_before,
         price
  from products
  where coalesce(qty_chimun, 0) > 0
    and not (coalesce(price, 0) > 0 and coalesce(price, 0) < :hold_below);

-- Үлдээсэн (шилжүүлээгүй) бараа — түр үнэтэй.
select sku, left(name, 40) as name, price, qty_chimun as held_units
  from products
 where coalesce(qty_chimun, 0) > 0
   and coalesce(price, 0) > 0 and coalesce(price, 0) < :hold_below
 order by sku;

-- 1) ТАНИЛЦУУЛГА — юу шилжихийг хэвлэнэ (NOTICE).
do $$
declare n int; u int; pub int; r record;
begin
  select count(*), coalesce(sum(moved), 0), count(*) filter (where coalesce(price, 0) > 0)
    into n, u, pub from _mv;
  raise notice 'Шилжих бараа: % төрөл, нийт % ш; үүнээс price>0 (mevent.mn-д харагдах): %', n, u, pub;
  for r in select sku, moved, price from _mv where coalesce(price, 0) > 0 order by sku loop
    raise notice '  САЙТАД ХАРАГДАНА: % — %ш · үнэ %', r.sku, r.moved, r.price;
  end loop;
end $$;

-- 2) Дэвтэр (append-only) — шилжүүлэхээс ӨМНӨ, өмнөх тоог барьж.
insert into stock_moves (sku, branch, delta, qty_before, qty_after, reason, ref, "by", note)
  select sku, 'chimun', -moved, moved, 0, 'transfer',
         'MOVE:chimun>mevent:2026-11-02', 'CEO', 'Чимүн ХХК → M-Event (CEO шийдвэр 2026-11-02)'
  from _mv
  union all
  select sku, 'mevent', moved, qm_before, qm_before + moved, 'transfer',
         'MOVE:chimun>mevent:2026-11-02', 'CEO', 'Чимүн ХХК → M-Event (CEO шийдвэр 2026-11-02)'
  from _mv;

-- 3) Шилжүүлгийн түүх (аппын «⇄ Шилжүүлэх»-тэй ижил хүснэгт).
insert into product_transfers (id, product_id, sku, from_branch, to_branch, qty, note, moved_by, created_at)
  select gen_random_uuid()::text, id, sku, 'chimun', 'mevent', moved,
         'Чимүн ХХК → M-Event (CEO шийдвэр 2026-11-02)', 'CEO', now()
  from _mv;

-- 4) Нөөцийг шилжүүлнэ. `stock` (нийт) хөндөгдөхгүй.
update products p
   set qty_mevent = coalesce(p.qty_mevent, 0) + m.moved,
       qty_chimun = 0,
       updated_at = now()
  from _mv m
 where p.sku = m.sku;

-- 5) ХАМГААЛАЛТ — барааны нийт тоо (бүх салбарын нийлбэр) өөрчлөгдөөгүй байх ёстой.
--    Зөрвөл бүх зүйл БУЦААГДАНА (rollback).
do $$
declare bad int;
begin
  select count(*) into bad
    from _mv m join products p using (sku)
   where coalesce(p.qty_mevent, 0) + coalesce(p.qty_nomaad, 0) + coalesce(p.qty_catering, 0) + coalesce(p.qty_chimun, 0)
         <> m.total_before
      or coalesce(p.qty_chimun, 0) <> 0;
  if bad > 0 then
    raise exception 'Шилжүүлэг % барааны нийт тоог өөрчиллөө — БУЦААВ', bad;
  end if;
  raise notice 'OK: нийт тоо хэвээр, qty_chimun = 0 (шалгав)';
end $$;

commit;

-- Үр дүн: Чимүн ХХК-д үлдсэн бараа (hold_below=0 үед 0; өгөгдмөлөөр түр үнэтэй барааны тоо).
select count(*) as chimun_left, coalesce(sum(qty_chimun), 0) as chimun_units_left
  from products where coalesce(qty_chimun, 0) > 0;
