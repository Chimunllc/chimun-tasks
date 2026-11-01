-- ═════════════════════════════════════════════════════════════════════════
-- MAESTRO CATERING — САЙТЫН МЕНЮ (2026-11-01, CEO)
--
-- ЮУНД ХЭРЭГТЭЙ ВЭ
--   maestro сайтын меню (үйлчилгээ → багц → үнэ → зураг) одоо сайтын кодод
--   бичигдсэн. Үнэ засахад код засна. Энэ 3 хүснэгт нь менюг ERP-д хадгалж,
--   сайт нь `public_maestro_menu` харагдацаар (db/public_maestro_menu.sql)
--   уншдаг болгоно. Үнэ/нэр/зураг өөрчлөх = энд мөр засах, сайтын код БИШ.
--
-- ХҮСНЭГТҮҮД
--   maestro_lines     үйлчилгээ (ажилчдын хоол / байгууллагын катеринг / хурим)
--   maestro_packages  багц (нэр, тайлбар, найрлага, үнэ, зураг)
--   maestro_week      ажилчдын хоолны долоо хоногийн меню (Даваа…Баасан)
--
-- ХИЛ (ERP-ийн дүрэм: db/README.md, anon-grants.sql)
--   ⛔ Эдгээр хүснэгт anon-д ХААЛТТАЙ. Сайт зөвхөн `public_maestro_menu`
--      харагдацыг уншина (эзнийхээ эрхээр ажилладаг, дотор нь юу гарахыг тэр
--      л шийднэ). Шинэ хүснэгтийг anon-д БҮҮ нээ.
--   ⛔ Хатуу устгал ХААГДСАН. Устгахын оронд `active = false` болгоно.
--   Унших/засах: нэвтэрсэн ажилтан, `sec.cap('catering')` (тохируулаагүй бол
--   CEO эсвэл түвшин ≥ 80) — апп «Катеринг» цэсийн эрхтэй нийцнэ.
--
-- `sample = true` мөр нь ЖИШЭЭ (db/maestro_menu_seed.sql). Сайт `PROTOTYPE=false`
--   үед жишээ мөрийг харуулахгүй. Бодит меню оруулсны дараа:
--       delete from maestro_packages where sample;   -- (эзний холболтоор)
--       delete from maestro_week     where sample;
--
-- ГАРААР ажиллуулна. ДАХИН ажиллуулж болно (идемпотент).
--   ssh chimun-vps 'docker exec -i vps-deploy-postgres-1 psql -U chimun -d chimun -v ON_ERROR_STOP=1' < db/maestro_menu.sql
-- ═════════════════════════════════════════════════════════════════════════

begin;

-- ── 1. Үйлчилгээ ─────────────────────────────────────────────────────────
create table if not exists maestro_lines (
  id          text primary key,                    -- 'workplace' | 'corporate' | 'wedding'
  name        text not null,                       -- «Ажилчдын хоол»
  tagline     text not null default '',            -- нэг өгүүлбэр
  cta         text not null default 'Үнийн санал авах',
  hero        text not null default '',            -- hero зураг (URL эсвэл img/…)
  week_title  text not null default '',            -- долоо хоногийн меню байвал
  week_note   text not null default '',
  sort        integer not null default 0,
  active      boolean not null default true,
  updated_at  timestamptz not null default now(),
  constraint maestro_lines_id_chk   check (id ~ '^[a-z0-9-]{2,40}$'),
  constraint maestro_lines_name_chk check (char_length(btrim(name)) between 1 and 80),
  constraint maestro_lines_hero_chk check (hero = '' or hero ~* '^(https://|img/)')
);

-- ── 2. Багц ──────────────────────────────────────────────────────────────
create table if not exists maestro_packages (
  id          text primary key,                    -- 'wp-standard'
  line_id     text not null references maestro_lines(id) on update cascade on delete restrict,
  name        text not null,
  descr       text not null default '',
  items       jsonb not null default '[]'::jsonb,  -- ["Шөл","Үндсэн хоол",…]
  price       integer,                             -- ₮ (null = «Үнийн санал»)
  price_note  text not null default '',            -- 'эхлэх' бол «Эхлэх үнэ»
  unit        text not null default '',            -- 'хүн / өдөр'
  min_note    text not null default '',            -- '20 хүнээс'
  photo       text not null default '',            -- зураг: URL (VPS /img/…) эсвэл img/…
  focus       text not null default '',            -- зургийн төв: '50% 40%'
  cta         text not null default '',            -- үнэгүй багцын товчны текст
  featured    boolean not null default false,      -- «Онцлох багц» (үйлчилгээ бүрд нэг)
  sort        integer not null default 0,
  active      boolean not null default true,
  sample      boolean not null default false,      -- ЖИШЭЭ мөр
  updated_at  timestamptz not null default now(),
  constraint maestro_packages_id_chk    check (id ~ '^[a-z0-9-]{2,60}$'),
  constraint maestro_packages_name_chk  check (char_length(btrim(name)) between 1 and 120),
  constraint maestro_packages_price_chk check (price is null or (price >= 0 and price <= 1000000000)),
  constraint maestro_packages_items_chk check (jsonb_typeof(items) = 'array'),
  constraint maestro_packages_photo_chk check (photo = '' or photo ~* '^(https://|img/)')
);
create index if not exists maestro_packages_line_idx on maestro_packages (line_id, sort);

-- ── 3. Ажилчдын хоолны долоо хоногийн меню ───────────────────────────────
create table if not exists maestro_week (
  line_id     text not null references maestro_lines(id) on update cascade on delete restrict,
  day_no      smallint not null,                   -- 1 = Даваа … 7 = Ням
  day         text not null,                       -- «Даваа»
  soup        text not null default '',
  main        text not null default '',
  salad       text not null default '',
  active      boolean not null default true,
  sample      boolean not null default false,      -- ЖИШЭЭ мөр
  updated_at  timestamptz not null default now(),
  primary key (line_id, day_no),
  constraint maestro_week_day_chk check (day_no between 1 and 7)
);

-- updated_at өөрөө шинэчлэгдэнэ
create or replace function maestro_touch() returns trigger
language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end;
$$;
drop trigger if exists maestro_lines_touch    on maestro_lines;
create trigger maestro_lines_touch    before update on maestro_lines    for each row execute function maestro_touch();
drop trigger if exists maestro_packages_touch on maestro_packages;
create trigger maestro_packages_touch before update on maestro_packages for each row execute function maestro_touch();
drop trigger if exists maestro_week_touch     on maestro_week;
create trigger maestro_week_touch     before update on maestro_week     for each row execute function maestro_touch();

commit;

-- ── Эрх ───────────────────────────────────────────────────────────────────
-- ⚠ `sec.cap` тохируулаагүй бол null буцаана — тэр үед CEO / түвшин ≥ 80 рүү унана
--   (аппын «Катеринг» цэсийн эрхтэй ижил логик; DB нь UI-аас ЧАНГА байж болохгүй).
alter table maestro_lines enable row level security;
grant select, insert, update on maestro_lines to authenticated;
drop policy if exists maestro_lines_sel on maestro_lines;
create policy maestro_lines_sel on maestro_lines for select to authenticated
  using (coalesce(sec.cap('catering'), sec.is_ceo() or sec.lvl() >= 80));
drop policy if exists maestro_lines_ins on maestro_lines;
create policy maestro_lines_ins on maestro_lines for insert to authenticated
  with check (coalesce(sec.cap('catering'), sec.is_ceo() or sec.lvl() >= 80));
drop policy if exists maestro_lines_upd on maestro_lines;
create policy maestro_lines_upd on maestro_lines for update to authenticated
  using (coalesce(sec.cap('catering'), sec.is_ceo() or sec.lvl() >= 80))
  with check (coalesce(sec.cap('catering'), sec.is_ceo() or sec.lvl() >= 80));

alter table maestro_packages enable row level security;
grant select, insert, update on maestro_packages to authenticated;
drop policy if exists maestro_packages_sel on maestro_packages;
create policy maestro_packages_sel on maestro_packages for select to authenticated
  using (coalesce(sec.cap('catering'), sec.is_ceo() or sec.lvl() >= 80));
drop policy if exists maestro_packages_ins on maestro_packages;
create policy maestro_packages_ins on maestro_packages for insert to authenticated
  with check (coalesce(sec.cap('catering'), sec.is_ceo() or sec.lvl() >= 80));
drop policy if exists maestro_packages_upd on maestro_packages;
create policy maestro_packages_upd on maestro_packages for update to authenticated
  using (coalesce(sec.cap('catering'), sec.is_ceo() or sec.lvl() >= 80))
  with check (coalesce(sec.cap('catering'), sec.is_ceo() or sec.lvl() >= 80));

alter table maestro_week enable row level security;
grant select, insert, update on maestro_week to authenticated;
drop policy if exists maestro_week_sel on maestro_week;
create policy maestro_week_sel on maestro_week for select to authenticated
  using (coalesce(sec.cap('catering'), sec.is_ceo() or sec.lvl() >= 80));
drop policy if exists maestro_week_ins on maestro_week;
create policy maestro_week_ins on maestro_week for insert to authenticated
  with check (coalesce(sec.cap('catering'), sec.is_ceo() or sec.lvl() >= 80));
drop policy if exists maestro_week_upd on maestro_week;
create policy maestro_week_upd on maestro_week for update to authenticated
  using (coalesce(sec.cap('catering'), sec.is_ceo() or sec.lvl() >= 80))
  with check (coalesce(sec.cap('catering'), sec.is_ceo() or sec.lvl() >= 80));

-- ⛔ DELETE ИЛ ХУРААНА (2026-09-16). Эзний DEFAULT PRIVILEGES нь ШИНЭ хүснэгт
--    бүрд `authenticated`-д `arwd` (устгах ч) автоматаар олгодог тул `grant`
--    бичээд орхивол хатуу устгал нээлттэй үлдэнэ. Устгахын оронд active=false.
revoke delete on maestro_lines    from authenticated;
revoke delete on maestro_packages from authenticated;
revoke delete on maestro_week     from authenticated;

-- ⛔ anon-д БҮРЭН хаалттай (сайт харагдацаар л уншина).
revoke all on maestro_lines    from anon;
revoke all on maestro_packages from anon;
revoke all on maestro_week     from anon;

notify pgrst, 'reload schema';
