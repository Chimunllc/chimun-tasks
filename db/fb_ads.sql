-- Facebook зарын өдрийн үзүүлэлт — Meta Marketing API-аас өдөр бүр татагдана.
-- Гараар бичигддэггүй (CLAUDE.md: «гараар нэмэлт бичүүлдэг боломж үхдэг»).
-- Нэг мөр = нэг өдөр × нэг зар (ad). Дахин татахад ОРЛУУЛНА (upsert).
create table if not exists fb_ads_daily (
  day            date        not null,
  ad_id          text        not null,
  ad_name        text,
  adset_id       text,
  campaign_id    text,
  campaign_name  text,
  post_id        text,
  spend_usd      numeric(12,2) not null default 0,
  spend_mnt      bigint      not null default 0,
  impressions    bigint      not null default 0,
  reach          bigint      not null default 0,
  clicks         bigint      not null default 0,
  messages       int         not null default 0,
  leads          int         not null default 0,
  raw            jsonb,
  fetched_at     timestamptz not null default now(),
  primary key (day, ad_id)
);
create index if not exists fb_ads_daily_day_idx on fb_ads_daily (day desc);
create index if not exists fb_ads_daily_camp_idx on fb_ads_daily (campaign_id, day desc);

-- ⛔ anon-д ОГТ нээхгүй (зарын зарцуулалт = санхүүгийн мэдээлэл).
grant select on fb_ads_daily to authenticated;
