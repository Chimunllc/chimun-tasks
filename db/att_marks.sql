-- ═══════════════════════════════════════════════════════════════════════
-- ИРЦИЙН ТЭМДЭГЛЭГЭЭ — Амралт / Чөлөө / Тасалсан (2026-10-26)
--
-- ЯАГААД: ирц зөвхөн «ирсэн/явсан» бүртгэдэг тул ирээгүй өдрийн ШАЛТГААН (амралт
--   авсан уу, чөлөө авсан уу, тасалсан уу) хаана ч байхгүй байв. Гурав нь мөнгөөр ӨӨР:
--     rest   Амралт   — цалинтай (гэрээгээр жилд 15 ажлын өдөр) → тэр хүний сарын НОРМ
--                       8 цагаар буурна, суурь цалин хасагдахгүй
--     leave  Чөлөө    — цалингүй → норм буурахгүй (ажилласан цагаар бодогдох хэвээр)
--     absent Тасалсан — цалингүй, зөвхөн бүртгэнэ (торгууль энд БАЙХГҮЙ)
--
-- ⛔ Мөр БҮР өөрийн эрхтэй (хувийн мэдээлэл: хэн чөлөө авсан, хэн тасалсан) —
--   `app_config`-ийн blob-д БҮҮ бич. Нэвтэрсэн бүх ажилтан тэр blob-ыг уншдаг
--   (ирцийн засварын хүсэлтийг 2026-09-18-д яг ийм шалтгаанаар хүснэгт болгосон).
-- ⛔ ХААСАН САРД БИЧИГДЭХГҮЙ — зөвхөн аппын шалгалт биш, ЭНД (trigger) мөн хаана.
--   Цалин ирцээс тэр дор нь дахин бодогддог тул 11 сард 9 сарын өдрийг «Амралт»
--   гэж тэмдэглэвэл олгочихсон цалин чимээгүй өөрчлөгдөнө. Засах бол CEO сарыг
--   нээж (Санхүү → Тайлан), засаад, дахин хаана.
-- ⛔ ХАТУУ УСТГАЛ БАЙХГҮЙ — «болих» = status 'void', өмнөх утга `history`-д үлдэнэ.
--
-- ГАРААР ажиллуулна. Идемпотент (дахин ажиллуулж болно).
-- ═══════════════════════════════════════════════════════════════════════

begin;

create table if not exists att_marks (
  id          text primary key,                     -- «утас|өдөр» → нэг өдөрт нэг тэмдэглэгээ
  member_key  text not null,                        -- ажилтны утас (personKey)
  day         date not null,
  kind        text not null check (kind in ('rest', 'leave', 'absent')),
  status      text not null default 'active' check (status in ('active', 'void')),
  marked_by   text,                                 -- сүүлд хэн тэмдэглэсэн (токеноос, клиент хуурч чадахгүй)
  history     jsonb not null default '[]'::jsonb,   -- өмнөх утгууд (append-only)
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);
create index if not exists att_marks_member_idx on att_marks (member_key, day desc);
create index if not exists att_marks_day_idx on att_marks (day);

create or replace function att_marks_guard() returns trigger
language plpgsql security definer set search_path = public, sec, pg_temp as $$
declare cfg jsonb; ym text; closed boolean := false; cut text;
begin
  new.member_key := regexp_replace(coalesce(new.member_key, ''), '\D', '', 'g');
  if length(new.member_key) < 8 then
    raise exception 'Ажилтны утас буруу байна';
  end if;
  if tg_op = 'UPDATE' and new.day is distinct from old.day then
    raise exception 'Тэмдэглэгээний өдрийг солихгүй — болиод шинээр тэмдэглэнэ';
  end if;
  -- id нь ҮРГЭЛЖ «утас|өдөр» (клиент өөр хүний мөрийг дарж бичиж чадахгүй)
  if tg_op = 'INSERT' then
    new.id := new.member_key || '|' || to_char(new.day, 'YYYY-MM-DD');
  end if;

  -- Утас солигдоход (person_rekey) kind/status/өдөр өөрчлөгдөхгүй → түгжээнд баригдахгүй.
  if tg_op = 'INSERT'
     or new.kind is distinct from old.kind
     or new.status is distinct from old.status then
    -- ── ХААСАН САР: app_config['closed_months'] — аппын `monthIsClosed`-тэй ИЖИЛ дүрэм ──
    select value into cfg from app_config where key = 'closed_months';
    ym := to_char(new.day, 'YYYY-MM');
    if cfg is not null then
      if (cfg ->> ym) is not null and (cfg ->> ym) not in ('false', 'null') then closed := true; end if;
      cut := substr(coalesce(cfg #>> '{__cutover,before}', ''), 1, 7);
      if cut <> '' and ym < cut then closed := true; end if;
    end if;
    if closed then
      raise exception '🔒 % сар хаагдсан — ирцийн тэмдэглэгээ хийх боломжгүй. Шаардлагатай бол CEO сарыг нээнэ (Санхүү → Тайлан).', ym;
    end if;
    new.marked_by := coalesce(sec.phone(), new.marked_by);
  end if;

  -- Өмнөх утгыг түүхэнд хадгална (хэн юуг хэзээ тэмдэглэснийг хожим тулгана)
  if tg_op = 'UPDATE' and (new.kind is distinct from old.kind or new.status is distinct from old.status) then
    new.history := coalesce(old.history, '[]'::jsonb) || jsonb_build_array(jsonb_build_object(
      'kind', old.kind, 'status', old.status, 'by', old.marked_by, 'at', old.updated_at));
  end if;
  new.updated_at := now();
  return new;
end;
$$;
drop trigger if exists att_marks_guard_trg on att_marks;
create trigger att_marks_guard_trg before insert or update on att_marks
  for each row execute function att_marks_guard();

-- ── Эрх ────────────────────────────────────────────────────────────────
-- Унших: ирц засах эрхтэй (тэмдэглэнэ), цалин харах эрхтэй (норм бодогдоно), өөрөө өөрийнхөө.
-- Бичих: ЗӨВХӨН `attendance.edit` (өгөгдмөл ХОРИГ — `sec.can`). Ажилтан өөрийгөө тэмдэглэж чадахгүй.
-- ⚠ Салбарын хаалт (өөрийн салбарын ажилтныг л тэмдэглэх) нь аппын дэлгэц дээр — ирцтэй ижил.
alter table att_marks enable row level security;

drop policy if exists att_marks_sel on att_marks;
create policy att_marks_sel on att_marks for select to authenticated
  using (sec.can('attendance.edit') or sec.can('salary') or member_key = sec.phone());

drop policy if exists att_marks_ins on att_marks;
create policy att_marks_ins on att_marks for insert to authenticated
  with check (sec.can('attendance.edit'));

drop policy if exists att_marks_upd on att_marks;
create policy att_marks_upd on att_marks for update to authenticated
  using (sec.can('attendance.edit')) with check (sec.can('attendance.edit'));

grant select, insert, update on att_marks to authenticated;
revoke delete on att_marks from authenticated;   -- түүх устахгүй
revoke all on att_marks from anon;

commit;

notify pgrst, 'reload schema';

-- ── Шалгах ──────────────────────────────────────────────────────────────
-- select kind, status, count(*) from att_marks group by 1, 2;
