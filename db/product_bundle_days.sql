-- ═══════════════════════════════════════════════════════════════════════
-- products.bundle_days — БАГЦЫН «N ХОНОГИЙН ҮНЭ»
-- Сүүлд шинэчилсэн: 2026-10-22
--
-- ЮУНД ХЭРЭГТЭЙ
--   Багцын үнэ нь N хоногийг БАГТААСАН тогтмол дүн (жиш. «Өвлийн майхан багц»
--   390,000₮ = 3 хоног). NULL эсвэл 1 = ӨДРИЙН үнэ (хуучин шигээ хоногоор үржинэ).
--   Тооцооны дүрэм = app.js-ийн `itemRentLine` (хоног ≤ N → үнэ; илүү хоног тус бүр
--   үнэ ÷ N; олон хоногийн авто хямдралд ороогүй).
--
-- ⚠ Зөвхөн багцын (type='package') мөрд утгатай. Захиалгын мөр N-ийг өөрт нь хуулж
--   хадгалдаг (`items[].bdays`) тул энэ баганыг хожим солиход хуучин захиалга өөрчлөгдөхгүй.
-- ⚠ Нэмэлт багана, NULL зөвшөөрнө — хуучин код/сайтад нөлөөгүй. anon-д НЭЭГЭЭГҮЙ
--   (`products`-ийн эрх БАГАНААР олгогддог); сайт уншихаар болох үед `public_catalog`
--   харагдацад багана нэмж (сайтын репо) тэр харагдацыг нээнэ.
-- ⚠ PostgREST схемээ кэшлэдэг тул төгсгөлд `notify pgrst` заавал.
--
-- Ажиллуулах:
--   ssh chimun-vps 'docker exec -i vps-deploy-postgres-1 psql -U chimun -d chimun -v ON_ERROR_STOP=1' < db/product_bundle_days.sql
-- ═══════════════════════════════════════════════════════════════════════

alter table public.products
  add column if not exists bundle_days integer
  check (bundle_days is null or (bundle_days between 1 and 30));

comment on column public.products.bundle_days is
  'Багцын үнэ хэдэн хоногийнх (NULL/1 = өдрийн үнэ). Тооцоо: app.js itemRentLine.';

notify pgrst, 'reload schema';
