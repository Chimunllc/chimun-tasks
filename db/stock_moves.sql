-- ═══════════════════════════════════════════════════════════════════════
-- НӨӨЦИЙН ХӨДӨЛГӨӨНИЙ ДЭВТЭР (stock_moves) — 2026-09-13
--
-- ЯАГААД: `products.qty_*` нь ОДООГИЙН тоог л хадгалдаг, дарж бичигддэг.
--   Иймд «өнгөрсөн сард 120 сандал байсан, одоо 112 — юу болов?» гэдэгт
--   систем хариулж чаддаггүй. Тооллогын зөрүүг батлах ч арга байхгүй.
--   Агуулах модуль 30% байгаагийн гол шалтгаан.
--
-- ⚠ APPEND-ONLY. `update`/`delete` эрх ЗОРИУД олгоогүй — дэвтэр засагддаг
--   бол дэвтэр биш. Алдаатай мөрийг эсрэг мөрөөр залруулна.
--
-- ГАРААР ажиллуулна (db/-ийн бусадтай ижил).
-- ═══════════════════════════════════════════════════════════════════════

begin;

create table if not exists stock_moves (
  id         bigserial primary key,
  sku        text not null,
  branch     text not null,          -- mevent | chimun | nomaad | catering
  delta      numeric not null,       -- +орлого / −зарлага
  qty_before numeric,                -- ⚠ клиентийн кэшээс — хуучирсан байж болно
  qty_after  numeric,                -- бичигдсэн утга (найдвартай)
  reason     text,                   -- manual | count | writeoff | transfer | damage | purchase
  ref        text,                   -- захиалгын дугаар, актын id г.м.
  by         text,
  note       text,
  at         timestamptz default now()
);

create index if not exists stock_moves_sku_idx on stock_moves (sku, at desc);
create index if not exists stock_moves_at_idx  on stock_moves (at desc);

commit;

-- anon-д ОГТ нээхгүй (өртөг/нөөцийн мэдээлэл).
grant select, insert on stock_moves to authenticated;
grant usage, select on sequence stock_moves_id_seq to authenticated;
-- ⛔ update/delete ЗОРИУД алга — append-only дэвтэр.
notify pgrst, 'reload schema';

-- ⛔ DELETE ИЛ ХУРААНА (2026-09-16). Эзний DEFAULT PRIVILEGES нь ШИНЭ хүснэгт
--    бүрд `authenticated`-д `arwd` (устгах ч) автоматаар олгодог тул `grant`
--    бичээд орхивол хатуу устгал нээлттэй үлдэнэ. `db/rls.sql` бүгдээс хураадаг
--    ч тэр нь ДАХИН ажиллуулж байж хүчинтэй — VPS-ийг сэргээхэд энэ файл дангаараа
--    зөв байх ёстой.
revoke delete on stock_moves from authenticated;
