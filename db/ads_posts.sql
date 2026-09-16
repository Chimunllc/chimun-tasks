-- Facebook постын ноорог + батлах дараалал.
-- Апп нооргийг барааны бүртгэлээс УГСАРЧ санал болгоно; хүн нэг товч дарж батална;
-- VPS-ийн нийтлэгч баталсныг нь хуудсанд тавьж бүүст хийнэ.
--
-- ⛔ ХҮНЭЭР БИЧҮҮЛДЭГ ФОРМ ХИЙХГҮЙ (CLAUDE.md: «гараар нэмэлт бичүүлдэг боломж
--   үхдэг»). Бичвэр нь `name`/`description`/`price`/`qty_mevent`-ээс гарна;
--   хүний үүрэг = батлах эсвэл болих.
--
-- ⚠ ТӨСӨВ энд БАЙХГҮЙ — шинэ кампанит ажил байгаа төсвийн санд нэгдэж,
--   `fb_budget.py` түүнд ногдох хувийг өгнө. Ингэснээр нийтлэх нь ШИНЭ мөнгө
--   гаргахгүй: сарын төсөв, өдрийн төсөв, дансны хязгаар гурвуулаа хэвээр хүчинтэй.
create table if not exists ads_posts (
  id           text        primary key,
  sku          text,
  status       text        not null default 'draft',  -- draft|approved|published|failed|discarded
  body         text        not null,
  image_url    text,
  link_url     text,
  created_at   timestamptz not null default now(),
  created_by   text,
  approved_at  timestamptz,
  approved_by  text,
  published_at timestamptz,
  fb_post_id   text,
  campaign_id  text,
  error        text
);
create index if not exists ads_posts_status_idx on ads_posts (status, created_at desc);
create index if not exists ads_posts_sku_idx on ads_posts (sku, created_at desc);

-- ⛔ anon-д ОГТ нээхгүй. Нийтлэх нь ГАДАГШ чиглэсэн үйлдэл тул нэвтэрсэн
--   БҮХ ажилтанд ч нээхгүй — зөвхөн зарын дэлгэц харах эрхтэй хүн.
alter table ads_posts enable row level security;
grant select, insert, update on ads_posts to authenticated;

-- ⚠ `sec.cap` тохируулаагүй бол null буцаана — тэр үед түвшин/CEO рүү унана
--   (аппын `canSeeAds()`-тэй ижил логик; DB нь UI-аас ЧАНГА байж болохгүй).
drop policy if exists ads_posts_read on ads_posts;
create policy ads_posts_read on ads_posts for select
  using (coalesce(sec.cap('ads'), coalesce(sec.cap('marketing'), sec.is_ceo() or sec.lvl() >= 80)));

drop policy if exists ads_posts_write on ads_posts;
create policy ads_posts_write on ads_posts for insert
  with check (coalesce(sec.cap('ads'), coalesce(sec.cap('marketing'), sec.is_ceo() or sec.lvl() >= 80)));

drop policy if exists ads_posts_edit on ads_posts;
create policy ads_posts_edit on ads_posts for update
  using (coalesce(sec.cap('ads'), coalesce(sec.cap('marketing'), sec.is_ceo() or sec.lvl() >= 80)));

-- ⛔ DELETE ИЛ ХУРААНА (2026-09-16). Эзний DEFAULT PRIVILEGES нь ШИНЭ хүснэгт
--    бүрд `authenticated`-д `arwd` (устгах ч) автоматаар олгодог тул `grant`
--    бичээд орхивол хатуу устгал нээлттэй үлдэнэ. `db/rls.sql` бүгдээс хураадаг
--    ч тэр нь ДАХИН ажиллуулж байж хүчинтэй — VPS-ийг сэргээхэд энэ файл дангаараа
--    зөв байх ёстой.
revoke delete on ads_posts from authenticated;
