-- Хуудсанд ГАРААР нийтэлсэн постуудын толь + бүүстын хүсэлт.
-- `tools/fb_posts_pull.py` (VPS cron) бичнэ. Гараар бичигддэггүй.
--
-- ЯАГААД: Аппын өөрөө нийтэлсэн постыг Facebook-ийн зарын систем ХАРДАГГҮЙ
-- (апп Development горимд байгаа тул). Гэтэл CEO өөрөө гараар нийтэлсэн пост
-- бүрэн бүүстлэгддэг — 2026-09-17-нд амьд туршиж баталсан. Тиймээс урсгал нь
-- эргэв: хүн постоо хийнэ → апп жагсаана → хүн сонгоно → апп бүүст хийнэ.
--
-- ⚠ `published_posts` edge нь ЗӨВХӨН бүүстлэгдэх боломжтой постыг буцаадаг —
--   аппын үүсгэсэн пост тэнд ОГТ ГАРЧ ИРДЭГГҮЙ. Тиймээс энэ хүснэгтэд байгаа
--   бүх мөр бүүстлэгдэх боломжтой гэж үзэж болно.
create table if not exists fb_page_posts (
  post_id      text primary key,
  created_time timestamptz,
  message      text,
  picture      text,
  permalink    text,
  status_type  text,                    -- added_photos | added_video | shared_story …
  link_url     text,                    -- холбоостой пост бол сайтын хаяг
  -- ⛔ Бүүстын төлөв. Татагч эдгээрийг ХЭЗЭЭ Ч дарж бичихгүй (upsert-д
  --    зөвхөн контентын багана шинэчлэгдэнэ) — эс бөгөөс хүний хүсэлт
  --    дараагийн татацаар чимээгүй арилна.
  boost        text,                    -- null | requested | done | error
  boost_kind   text,                    -- site | engage
  campaign_id  text,
  requested_by text,
  requested_at timestamptz,
  error        text,
  fetched_at   timestamptz not null default now(),
  -- ⛔ Пост ХААНААС гарсан бэ: null/'page' = хуудсанд гараар нийтэлсэн (татагч
  --    олно), 'app' = аппын постер үүсгэгчээс (`fb_publish.py` ӨӨРӨӨ бүртгэнэ —
  --    Facebook аппын постыг жагсаалтдаа ОРУУЛДАГГҮЙ, Graph-аар ч уншуулдаггүй).
  source       text
);
alter table fb_page_posts add column if not exists source text;
create index if not exists fb_page_posts_time_idx on fb_page_posts (created_time desc);
create index if not exists fb_page_posts_boost_idx on fb_page_posts (boost) where boost is not null;

-- ⛔ anon-д ОГТ нээхгүй.
grant select, insert, update on fb_page_posts to authenticated;
-- ⛔ DELETE ИЛ ХУРААНА — эзний default privileges `arwd`-г автоматаар олгодог.
revoke delete on fb_page_posts from authenticated;

-- ⛔ ХҮСНЭГТ ҮҮСГЭСЭН НЬ ХАНГАЛТГҮЙ — PostgREST схемээ КЭШЛЭДЭГ тул шинэ
--    хүснэгтийг мэдэхгүй, апп нь **404** авна (2026-09-17-нд яг ингэсэн:
--    кэш 78 relation дээр зогссон байсныг 81 болгож зассан).
notify pgrst, 'reload schema';
