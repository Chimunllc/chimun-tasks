-- ═══════════════════════════════════════════════════════════════════════
-- НЭГ УДААГИЙН (ЗАРЦУУЛАГДДАГ) БАРАА — ҮЛДЭГДЛИЙН БҮРТГЭЛ (2026-11-18, CEO)
--
-- ЯАГААД: утааны шингэн, хөөс, конфетти, соронзон тууз, батарей гэх мэт нэг удаа
--   ашиглагдаад дуусдаг зүйл нь ТҮРЭЭСИЙН БАРАА БИШ. Тэднийг `products`-д оруулбал
--   түрээс, элэгдэл, ROI, каталог, тооллогод хуурамч бараа болж орно.
--   CEO шийдвэр: ① үнэ нь ЗАРДАЛ (хөрөнгө, элэгдэл БИШ) ② бараа болгож ОРУУЛАХГҮЙ
--   ③ зөвхөн ҮЛДЭГДЛИЙГ хянана (хэдийг эвентэд зарцуулсныг биш).
--
-- ЗАГВАР:
--   consumables       = материалын нэр, нэгж (ш, литр…) — үлдэгдэл ЭНД ХАДГАЛАГДАХГҮЙ.
--   consumable_moves  = ДЭВТЭР (append-only). delta: + хүлээн авсан/эхний үлдэгдэл, − зарцуулсан.
--                       reason: purchase | use | adjust.
--                       Худалдан авалтаас: ref = 'PO:<худалдан авалтын id>:<мөр>' (давхар нэмэхээс сэргийлэх толь).
--   consumable_stock  = харагдац: материал + үлдэгдэл (= дэвтрийн нийлбэр). Үлдэгдэл ХЭЗЭЭ Ч дэвтрээс
--                       өөр газар хадгалагдахгүй тул зөрөх боломжгүй (trigger, давхар бичилт хэрэггүй).
--
-- ⛔ Худалдан авалтын (`purchases`) нэг удаагийн хүсэлтийн мөнгө = ЗАРДЛЫН ангилал (банкны хуулгад
--   нягтлан 1xxx-д ангилна), хөрөнгө (6xxx) БИШ — тиймээс элэгдэл тооцогдохгүй, салбарын ашиг хиймлээр өсөхгүй.
-- ⛔ Хатуу устгал, дэвтрийн засвар БАЙХГҮЙ. Алдааг эсрэг мөр (adjust) болон архиваар залруулна.
-- ⚠ Харагдац эзнийхээ эрхээр ажиллана (`security_invoker` OFF) → эрхийн шүүлт нь ДООРХ where
--   (`purchases` хүснэгтийн бодлоготой ИЖИЛ: CEO ∪ санхүү бүтнээр ∪ `purchases` цэс ∪ `products.edit`).
--
-- ГАРААР ажиллуулна (db/README.md): идемпотент. `purchases.sql`-ээс хамаарахгүй.
-- ═══════════════════════════════════════════════════════════════════════

begin;

create table if not exists consumables (
  id          text primary key,                       -- 'cs_' + санамсаргүй
  name        text not null,
  unit        text not null default 'ш',              -- ш, литр, хайрцаг, боодол…
  note        text not null default '',
  archived    boolean not null default false,
  created_by  text not null default '',
  created_at  timestamptz not null default now()
);

-- Нэг нэр хоёр удаа үүсэхгүй (архивлагдсан нь тооцогдохгүй — ижил нэрээр дахин эхлүүлж болно).
create unique index if not exists consumables_name_uniq
  on consumables (lower(btrim(name))) where not archived;

create table if not exists consumable_moves (
  id             bigserial primary key,
  consumable_id  text not null references consumables(id),
  delta          numeric not null check (delta <> 0),   -- + орлого / − зарлага
  reason         text not null check (reason in ('purchase', 'use', 'adjust')),
  ref            text,                                  -- 'PO:<id>:<мөр>' (хүлээн авалт)
  note           text not null default '',
  by             text not null default '',
  at             timestamptz not null default now()
);

create index if not exists consumable_moves_item_idx on consumable_moves (consumable_id, at desc);
create index if not exists consumable_moves_ref_idx  on consumable_moves (ref) where ref is not null;

commit;

-- Эрх: аппын `canSeePurchases()`-ийн толь (DB нь аппаас ЧАНГА байж болохгүй).
alter table consumables enable row level security;
drop policy if exists consumables_rw on consumables;
create policy consumables_rw on consumables for all to authenticated
  using      (sec.is_ceo() or sec.fin_full() or sec.can('purchases') or sec.can('products.edit'))
  with check (sec.is_ceo() or sec.fin_full() or sec.can('purchases') or sec.can('products.edit'));

alter table consumable_moves enable row level security;
drop policy if exists consumable_moves_sel on consumable_moves;
create policy consumable_moves_sel on consumable_moves for select to authenticated
  using (sec.is_ceo() or sec.fin_full() or sec.can('purchases') or sec.can('products.edit'));
drop policy if exists consumable_moves_ins on consumable_moves;
create policy consumable_moves_ins on consumable_moves for insert to authenticated
  with check (sec.is_ceo() or sec.fin_full() or sec.can('purchases') or sec.can('products.edit'));

-- Үлдэгдэл = дэвтрийн нийлбэр. Эрхгүй хүнд мөр буцаахгүй (дээрх шалтгаанаар where-д).
create or replace view public.consumable_stock as
select c.id, c.name, c.unit, c.note, c.archived, c.created_at,
       coalesce(sum(m.delta), 0)                                 as qty,
       max(m.at) filter (where m.reason = 'use')                 as last_use_at,
       max(m.at) filter (where m.reason = 'purchase')            as last_purchase_at
from public.consumables c
left join public.consumable_moves m on m.consumable_id = c.id
where sec.is_ceo() or sec.fin_full() or sec.can('purchases') or sec.can('products.edit')
group by c.id;

-- anon-д ОГТ нээхгүй (дотоод мэдээлэл).
revoke all on consumables, consumable_moves from anon;
revoke all on public.consumable_stock from public, anon;
grant select, insert, update on consumables to authenticated;
grant select, insert on consumable_moves to authenticated;
grant usage, select on sequence consumable_moves_id_seq to authenticated;
grant select on public.consumable_stock to authenticated;

-- ⛔ DELETE ИЛ ХУРААНА — эзний DEFAULT PRIVILEGES шинэ хүснэгт бүрд `arwd` олгодог.
--    Дэвтэр append-only тул UPDATE-ийг ч хураана.
revoke delete on consumables from authenticated;
revoke delete on consumable_moves from authenticated;
revoke update on consumable_moves from authenticated;

notify pgrst, 'reload schema';
