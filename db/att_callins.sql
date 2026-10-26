-- ═══════════════════════════════════════════════════════════════════════
-- АЖИЛД ДУУДАХ — «хаана, хэдэн цагт ирэх» (2026-10-26)
--
-- ЯАГААД: ажилтныг тодорхой өдөр, тодорхой цагт, тодорхой газар дуудах (захиалгын ажил, өвлийн
--   ээлж гэх мэт) нь одоо хаана ч БҮРТГЭГДЭХГҮЙ байв. Байсан ганц зүйл — явахдаа сонгосон «маргааш
--   ирэх цаг» (`app_config['next_arrival']`) — ХҮН БҮРД НЭГ л мөр, маргааш дуусмагц ДАРАГДАНА, газар
--   байхгүй. Тиймээс тэр цагтаа ирээгүй/хоцорсон нь хожим нотлогдохгүй, хариуцлага тооцох боломжгүй.
--   Энэ хүснэгт нь тэр дуудлагыг ТҮҮХТЭЙ хадгална — торгууль (`pay_rules`) зөвхөн эндээс уншина.
--
-- ⛔ Мөр БҮР өөрийн эрхтэй (хэнийг хаана дуудсан = ажлын хувийн мэдээлэл) — `app_config` blob БИШ.
-- ⛔ ХОЙНО НЬ ДУУДЛАГА ҮҮСГЭХГҮЙ: өнөөдөр эсвэл ирээдүйн өдөр л. Тэгэхгүй бол «хоцорсон» гэдгийг
--   өнгөрсөн өдрөөр зохиож, торгуулийг ХОЙНО НЬ бий болгох боломжтой болно.
-- ⛔ Өнгөрсөн өдрийн цаг/газрыг ӨӨРЧИЛЖ БОЛОХГҮЙ (болих = status 'void' л болно).
-- ⛔ Хаасан сарын дуудлагыг өөрчилж болохгүй (тэмдэглэгээтэй ИЖИЛ — `att_marks.sql`).
-- ⛔ ХАТУУ УСТГАЛ БАЙХГҮЙ — болих = 'void', өмнөх утга `history`-д үлдэнэ.
--
-- ГАРААР ажиллуулна. Идемпотент (дахин ажиллуулж болно).
-- ═══════════════════════════════════════════════════════════════════════

begin;

create table if not exists att_callins (
  id          text primary key,                     -- «утас|өдөр» → нэг өдөрт нэг дуудлага
  member_key  text not null,                        -- дуудагдсан ажилтны утас (personKey)
  day         date not null,
  at_time     text not null check (at_time ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'),   -- «HH:MM» (УБ-ийн цаг)
  place       text check (place is null or length(place) <= 120),
  status      text not null default 'active' check (status in ('active', 'void')),
  called_by   text,                                 -- сүүлд хэн дуудсан (токеноос, клиент хуурч чадахгүй)
  history     jsonb not null default '[]'::jsonb,   -- өмнөх утгууд (append-only)
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);
create index if not exists att_callins_member_idx on att_callins (member_key, day desc);
create index if not exists att_callins_day_idx on att_callins (day);

create or replace function att_callins_guard() returns trigger
language plpgsql security definer set search_path = public, sec, pg_temp as $$
declare cfg jsonb; ym text; closed boolean := false; cut text; ub date := (now() at time zone 'Asia/Ulaanbaatar')::date;
begin
  new.member_key := regexp_replace(coalesce(new.member_key, ''), '\D', '', 'g');
  if length(new.member_key) < 8 then
    raise exception 'Ажилтны утас буруу байна';
  end if;
  if tg_op = 'UPDATE' and new.day is distinct from old.day then
    raise exception 'Дуудлагын өдрийг солихгүй — болиод шинээр дуудна';
  end if;
  if tg_op = 'INSERT' then
    new.id := new.member_key || '|' || to_char(new.day, 'YYYY-MM-DD');
    -- ⛔ Хойно нь дуудлага үүсгэж торгуулийг зохиож болохгүй
    if new.day < ub then
      raise exception 'Өнгөрсөн өдрөөр дуудлага үүсгэхгүй — өнөөдөр эсвэл ирээдүйн өдрийг сонгоно уу';
    end if;
  end if;
  -- Өнгөрсөн өдрийн цаг/газрыг өөрчлөхгүй (болих л боломжтой)
  if tg_op = 'UPDATE' and old.day < ub
     and (new.at_time is distinct from old.at_time or new.place is distinct from old.place) then
    raise exception 'Өнгөрсөн өдрийн дуудлагын цаг/газрыг өөрчлөхгүй — зөвхөн болино';
  end if;

  -- Утас солигдоход (person_rekey) цаг/газар/төлөв өөрчлөгдөхгүй → түгжээнд баригдахгүй.
  if tg_op = 'INSERT'
     or new.at_time is distinct from old.at_time
     or new.place is distinct from old.place
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
      raise exception '🔒 % сар хаагдсан — дуудлага өөрчлөх боломжгүй. Шаардлагатай бол CEO сарыг нээнэ (Санхүү → Тайлан).', ym;
    end if;
    new.called_by := coalesce(sec.phone(), new.called_by);
  end if;

  -- Өмнөх утгыг түүхэнд хадгална
  if tg_op = 'UPDATE' and (new.at_time is distinct from old.at_time or new.place is distinct from old.place
                           or new.status is distinct from old.status) then
    new.history := coalesce(old.history, '[]'::jsonb) || jsonb_build_array(jsonb_build_object(
      'time', old.at_time, 'place', old.place, 'status', old.status, 'by', old.called_by, 'at', old.updated_at));
  end if;
  new.updated_at := now();
  return new;
end;
$$;
drop trigger if exists att_callins_guard_trg on att_callins;
create trigger att_callins_guard_trg before insert or update on att_callins
  for each row execute function att_callins_guard();

-- ── Эрх ────────────────────────────────────────────────────────────────
-- Унших: ирц засах эрхтэй (дууддаг), цалин харах эрхтэй (торгууль бодогдоно), дуудагдсан хүн өөрөө.
-- Бичих: ЗӨВХӨН `attendance.edit` (өгөгдмөл ХОРИГ — `sec.can`). Ажилтан өөрийгөө дуудаж/болиулж чадахгүй.
-- ⚠ Салбарын хаалт (өөрийн салбарын ажилтныг л дуудах) нь аппын дэлгэц дээр — ирцтэй ижил.
alter table att_callins enable row level security;

drop policy if exists att_callins_sel on att_callins;
create policy att_callins_sel on att_callins for select to authenticated
  using (sec.can('attendance.edit') or sec.can('salary') or member_key = sec.phone());

drop policy if exists att_callins_ins on att_callins;
create policy att_callins_ins on att_callins for insert to authenticated
  with check (sec.can('attendance.edit'));

drop policy if exists att_callins_upd on att_callins;
create policy att_callins_upd on att_callins for update to authenticated
  using (sec.can('attendance.edit')) with check (sec.can('attendance.edit'));

grant select, insert, update on att_callins to authenticated;
revoke delete on att_callins from authenticated;   -- түүх устахгүй
revoke all on att_callins from anon;

commit;

notify pgrst, 'reload schema';

-- ── Шалгах ──────────────────────────────────────────────────────────────
-- select day, at_time, place, status from att_callins order by day desc limit 20;
