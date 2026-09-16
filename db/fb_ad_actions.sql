-- Зарын АВТОМАТ шийдвэрийн бүртгэл + кампанит ажлын одоогийн төлөв.
-- `tools/fb_budget.py` (10 минут тутам) бичнэ. Гараар бичигддэггүй.
--
-- ⚠ Өмнө нь энэ бүхэн VPS-ийн текст лог файлд л байсан тул хэрэглэгч
--   «систем яагаад ийм шийдвэр гаргав» гэдгийг ХЭЗЭЭ Ч харж чаддаггүй байв.

-- ⛔ ЗӨВХӨН ӨӨРЧЛӨЛТ бичигдэнэ. Скрипт өдөрт 144 удаа ажилладаг тул тоо
--    хэвээр байхад мөр нэмбэл бүртгэл ашиггүй болно (144 мөр/өдөр/зар).
create table if not exists fb_ad_actions (
  id            bigserial   primary key,
  at            timestamptz not null default now(),
  kind          text        not null,   -- budget | pause | cap | error
  campaign_id   text,
  campaign_name text,
  old_val       numeric,                -- ам.доллар (cap-д ч мөн)
  new_val       numeric,
  reason        text        not null,
  source        text        not null default 'auto'
);
create index if not exists fb_ad_actions_at_idx on fb_ad_actions (at desc);

-- Одоогийн төлөв — «ямар зар яг одоо идэвхтэй вэ». Мөр бүр ОРЛУУЛАГДАНА.
-- ⚠ `status` = бидний тавьсан төлөв, `effective_status` = Facebook-ийн бодит
--   төлөв (татгалзсан зар, төлбөрийн алдаа г.м. ЭНД л харагдана).
create table if not exists fb_campaign_state (
  campaign_id      text primary key,
  name             text,
  status           text,
  effective_status text,
  daily_usd        numeric,
  updated_at       timestamptz not null default now()
);

-- ⛔ anon-д ОГТ нээхгүй (зарцуулалт = санхүүгийн мэдээлэл).
grant select on fb_ad_actions, fb_campaign_state to authenticated;

-- ⛔ DELETE ИЛ ХУРААНА (2026-09-16). Эзний DEFAULT PRIVILEGES нь ШИНЭ хүснэгт
--    бүрд `authenticated`-д `arwd` (устгах ч) автоматаар олгодог тул `grant`
--    бичээд орхивол хатуу устгал нээлттэй үлдэнэ. `db/rls.sql` бүгдээс хураадаг
--    ч тэр нь ДАХИН ажиллуулж байж хүчинтэй — VPS-ийг сэргээхэд энэ файл дангаараа
--    зөв байх ёстой.
revoke delete on fb_ad_actions from authenticated;
revoke delete on fb_campaign_state from authenticated;
