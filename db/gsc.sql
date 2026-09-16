-- Google Search Console — хайлтын үр дүн өдөр × түлхүүр үг × хуудсаар.
-- `tools/gsc_pull.py` (VPS cron) бичнэ. Гараар бичигддэггүй.
--
-- ЯАГААД: «асар түрээс», «сандал түрээс» гэж Google-д хайж байгаа хүн бол
-- ХАМГИЙН худалдан авах хүсэлтэй лид. Facebook дээр бид хүнд өөрөө очдог;
-- Google дээр хүн БИДНИЙГ хайж байна. Аль үгээр олдож байгаагаа мэдэхгүй
-- бол ямар бараанд зар тавихаа ч, ямар хуудас бичихээ ч мэдэхгүй.
--
-- ⚠ GSC нь БАТАЛГААЖУУЛСНААС ХОЙШ л цуглуулна — өмнөх түүх БАЙХГҮЙ.
--   Мөн дата 2-3 хоног хоцорч, дараа нь ЗАЛРУУЛАГДДАГ тул татагч сүүлийн
--   10 хоногийг ДАХИН татаж орлуулна (`fb_pull.py`-тай ижил санаа).
create table if not exists gsc_daily (
  day          date   not null,
  query        text   not null,
  page         text   not null,
  clicks       int    not null default 0,
  impressions  int    not null default 0,
  position     numeric(6,2) not null default 0,
  fetched_at   timestamptz not null default now(),
  primary key (day, query, page)
);
create index if not exists gsc_daily_day_idx on gsc_daily (day desc);
create index if not exists gsc_daily_q_idx on gsc_daily (query, day desc);

-- ⛔ anon-д ОГТ нээхгүй (өрсөлдөгчид манай түлхүүр үгийг харах ёсгүй).
grant select on gsc_daily to authenticated;
-- ⛔ DELETE ИЛ ХУРААНА — эзний default privileges шинэ хүснэгт бүрд
--    `authenticated`-д `arwd` автоматаар олгодог.
revoke delete on gsc_daily from authenticated;
