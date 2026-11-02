-- products.dep_years — БАРАА ТУС БҮРИЙН элэгдлийн нас (жил), 2026-11-02 (CEO шийдвэр)
--
-- ЯАГААД: элэгдлийн насыг нэрийн үг → ангилал → «Бусад» гэсэн 3 давхар дүрмээр ТААМАГЛАДАГ
-- байсан тул CEO «ангилалд 3 жил оруулсан ч 12 майханы 3-д л хүрсэн» гэх мэт гайхсан. Бараа бүр
-- өөрийн өртөг, авсан огноотой — насыг нь ч бараа бүр дээр нь шууд заах нь бодитой, амар.
-- Элэгдлийн 53% нь дээд 10 бараанд, 65% нь дээд 20-д төвлөрдөг тул бүгдийг шивэх шаардлагагүй.
--
-- УТГА: NULL/хоосон = «авто» (одоогийн дүрэм: нэрийн төрөл → ангилал → «Бусад»). Тоо (1–100)
--   заасан бол ТЭР ЯЛНА. Тиймээс баганыг нэмэх нь нийт элэгдлийг ӨӨРЧЛӨХГҮЙ.
--
-- ⛔ Шинэ хүснэгт ҮҮСГЭХГҮЙ — ганц багана (`purchase_ref`-тэй ижил загвар).
-- ⚠ anon-д ОГТ нээхгүй: `products`-ийн anon эрх БАГАНААР олгогддог тул шинэ багана
--   автоматаар нээгдэхгүй; доор зөвхөн `authenticated`-д олгож байна.
-- Идемпотент. ГАРААР ажиллуулна (db/-ийн бусадтай ижил):
--   ssh chimun-vps 'docker exec -i vps-deploy-postgres-1 psql -U chimun -d chimun -v ON_ERROR_STOP=1' < db/product_dep_years.sql

alter table public.products add column if not exists dep_years numeric;

-- Утга зөвхөн 1–100 (тооцоог эвдэх 0/сөрөг/хэт том утга DB-д орохгүй). NULL зөвшөөрнө.
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'products_dep_years_range') then
    alter table public.products
      add constraint products_dep_years_range check (dep_years is null or (dep_years >= 1 and dep_years <= 100));
  end if;
end $$;

comment on column public.products.dep_years is
  'Барааны элэгдлийн нас (жил). NULL = авто (нэрийн төрөл → ангилал → Бусад). Заасан бол ялна. (2026-11-02)';

grant select (dep_years), insert (dep_years), update (dep_years)
  on public.products to authenticated;

notify pgrst, 'reload schema';
