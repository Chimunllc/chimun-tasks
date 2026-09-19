-- Google Analytics 4 — сайтын зочид өдөр × сувгаар.
-- `tools/ga_pull.py` (VPS cron) бичнэ. Гараар бичигддэггүй.
--
-- ЯАГААД: Search Console «ямар үгээр хайж байна» гэдгийг хэлдэг ч «сайтад
-- хэдэн хүн орж, хэд нь холбоо барьсан» гэдгийг хэлдэггүй. Зар мөнгө иддэг,
-- SEO цаг иддэг — хоёулангийнх нь үр дүн ЭНД хэмжигдэнэ.
--
-- ⚠ `leads` = GA4-д «key event» гэж тэмдэглэсэн үйлдлийн тоо. Одоогоор ганц
--   `generate_lead` (холбоо барих) тэмдэглэгдсэн. GA4-д ШИНЭ key event
--   нэмбэл энэ тоо утгаа өөрчилнө — нэмэхээсээ өмнө бод.
-- ⚠ GA4 дата ~48 цаг тогтворжино тул татагч сүүлийн 10 хоногийг ДАХИН татаж
--   орлуулна (`gsc_pull.py`-тай ижил санаа).
create table if not exists ga_daily (
  day        date not null,
  channel    text not null,          -- Organic Search / Direct / Paid Social …
  sessions   int  not null default 0,
  users      int  not null default 0,
  engaged    int  not null default 0,
  leads      int  not null default 0,
  fetched_at timestamptz not null default now(),
  primary key (day, channel)
);
create index if not exists ga_daily_day_idx on ga_daily (day desc);

-- ⛔ anon-д ОГТ нээхгүй (маркетингийн үзүүлэлт).
grant select on ga_daily to authenticated;
-- ⛔ DELETE ИЛ ХУРААНА — эзний default privileges шинэ хүснэгт бүрд
--    `authenticated`-д `arwd` автоматаар олгодог.
revoke delete on ga_daily from authenticated;
