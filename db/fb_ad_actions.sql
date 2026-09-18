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
  updated_at       timestamptz not null default now(),
  -- ⛔ НЭГ ЗАРЫГ ЗОГСООХ ХҮСЭЛТ (2026-09-18). Апп Facebook руу ШУУД хандаж
  --    чадахгүй (токен VPS дээр) тул хүсэлтийг энд тэмдэглэнэ; `fb_budget.py`
  --    10 минут тутам биелүүлээд талбарыг цэвэрлэнэ.
  -- ⚠ ЗӨВХӨН ЗОГСООХ чиглэлтэй — аппаас дахин асаах зам ЗОРИУД байхгүй
  --   (мөнгө гаргах шийдвэр Ads Manager-ээс). Тиймээс энэ талбар нь мөнгө
  --   зарцуулах эрсдэлгүй: хамгийн муудаа зар зогсоно.
  stop_req         timestamptz,
  stop_by          text
);
alter table fb_campaign_state add column if not exists stop_req timestamptz;
alter table fb_campaign_state add column if not exists stop_by text;

-- ⛔ anon-д ОГТ нээхгүй (зарцуулалт = санхүүгийн мэдээлэл).
grant select on fb_ad_actions, fb_campaign_state to authenticated;
-- ⛔ БАГАНААР олгоно — нэвтэрсэн хүн зөвхөн «зогсоо» гэж хүсэж чадна, төлөв
--    эсвэл төсвийг гараар өөрчилж ЧАДАХГҮЙ (тэдгээр нь Facebook-ийн бодит
--    төлөв; гараар бичвэл дэлгэц худал харагдана).
grant update (stop_req, stop_by) on fb_campaign_state to authenticated;

-- ⛔ DELETE ИЛ ХУРААНА (2026-09-16). Эзний DEFAULT PRIVILEGES нь ШИНЭ хүснэгт
--    бүрд `authenticated`-д `arwd` (устгах ч) автоматаар олгодог тул `grant`
--    бичээд орхивол хатуу устгал нээлттэй үлдэнэ. `db/rls.sql` бүгдээс хураадаг
--    ч тэр нь ДАХИН ажиллуулж байж хүчинтэй — VPS-ийг сэргээхэд энэ файл дангаараа
--    зөв байх ёстой.
revoke delete on fb_ad_actions from authenticated;
revoke delete on fb_campaign_state from authenticated;

-- ⛔ Шинэ багана нэмэхэд ч PostgREST схемээ кэшлэсэн хэвээр байдаг — сэргээхгүй
--    бол апп PATCH хийхэд «column not found» гэж унана.
notify pgrst, 'reload schema';
