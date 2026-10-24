-- ═══════════════════════════════════════════════════════════════════════
-- products.bundle_addons — БАГЦЫН «САНАЛ БОЛГОХ НЭМЭЛТ»
-- Сүүлд шинэчилсэн: 2026-10-24
--
-- ЮУНД ХЭРЭГТЭЙ
--   Багцад ШУУД нэмэхгүй, захиалгад багц орвол «нэмэх үү?» гэж САНАЛ болгох бараа
--   (жиш. «Өвлийн майхан багц»-д мишок). JSON массив: [{sku, qty, price}]
--     · qty   = нэг багцад санал болгох ширхэг
--     · price = 1 ширхгийн үнэ, багцын «N хоног»-ийг БАГТААСАН (bundle_days-тай ижил хоног)
--   NULL = нэмэлтгүй. Багцын нөөц/үнэ/бүрэлдэхүүнд ОРОХГҮЙ.
--   Нэмэлтийг сонговол захиалгад энгийн бараа болж орно (price = энэ үнэ, bdays = багцын N) —
--   тооцоо app.js-ийн `itemRentLine`, сайтад адил (сагсны мөр).
--
-- ⚠ Зөвхөн багцын (type='package') мөрд утгатай. Нэмэлт багана, NULL зөвшөөрнө —
--   хуучин код/сайтад нөлөөгүй. anon-д НЭЭГЭЭГҮЙ (`products`-ийн эрх БАГАНААР олгогддог);
--   сайт `public_catalog` харагдацаар уншина (сайтын репо: db/public_catalog.sql).
-- ⚠ PostgREST схемээ кэшлэдэг тул төгсгөлд `notify pgrst` заавал.
--
-- Ажиллуулах:
--   ssh chimun-vps 'docker exec -i vps-deploy-postgres-1 psql -U chimun -d chimun -v ON_ERROR_STOP=1' < db/product_bundle_addons.sql
-- ═══════════════════════════════════════════════════════════════════════

alter table public.products
  add column if not exists bundle_addons jsonb
  check (bundle_addons is null or jsonb_typeof(bundle_addons) = 'array');

comment on column public.products.bundle_addons is
  'Багцын санал болгох нэмэлт: [{sku, qty, price}] (price = 1ш, багцын bundle_days-ийг багтаасан). Захиалгад ШУУД орохгүй, санал болгоно.';

notify pgrst, 'reload schema';
