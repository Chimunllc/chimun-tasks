-- products.purchase_ref — барааг ХӨРӨНГИЙН ЗАРДЛЫН МӨРТЭЙ холбоно (2026-09-13)
--
-- ЯАГААД: 280 барааны 270-ын `cost` ГАРААР бичигдсэн, `supplier` ердөө 69-д бий.
-- Худалдан авалтын бодит баримт (огноо · нийлүүлэгч · дүн) банкны хуулгаас
-- `finance` хүснэгтэд аль хэдийн ирдэг. Холбоос тавимагц барааны өртөг, авсан
-- огноо, нийлүүлэгч тэр мөрөөс БОДИТООР бөглөгдөнө — таамаг биш.
--
-- ⛔ Шинэ хүснэгт ҮҮСГЭХГҮЙ. Гараар шивүүлдэг бүртгэл үхдэг (product_batches
--    3 сард 0 мөртэй үхсэн). Энэ бол ганц багана — ажлын дундаас үүснэ.
--
-- Утга = `finance.id` (ж: 't_rosl28jymtw6h2f1'). Гадаад түлхүүр ЗОРИУД тавиагүй:
-- санхүүгийн мөр устгагдвал бараа хадгалалт унах ёсгүй (холбоос л тасарна).
--
-- ⚠ anon-д ОГТ нээхгүй — нийлүүлэгч, өртөг бол дотоод мэдээлэл.
--   `products`-ийн anon эрх БАГАНААР олгогддог тул шинэ багана автоматаар
--   нээгдэхгүй; доор зөвхөн `authenticated`-д олгож байна.

alter table public.products add column if not exists purchase_ref text;

comment on column public.products.purchase_ref is
  'finance.id — энэ барааг худалдаж авсан хөрөнгийн зардлын мөр (2026-09-13)';

grant select (purchase_ref), insert (purchase_ref), update (purchase_ref)
  on public.products to authenticated;

create index if not exists idx_products_purchase_ref
  on public.products (purchase_ref) where purchase_ref is not null;
