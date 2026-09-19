-- ═══════════════════════════════════════════════════════════════════════
-- ИРЦИЙН ЗАСВАРЫН ХҮСЭЛТ — `app_config` blob-оос хүснэгт болов (2026-09-18)
--
-- ЯАГААД: хүсэлтүүд `app_config['att_requests']` гэсэн НЭГ JSON мөрөнд
--   хадгалагдаж байв (6.3КБ болтлоо өссөн). Гурван бодит асуудал:
--   ① Хоёр хүн зэрэг хадгалбал нэгнийх нь бичилт дарагдана (уншиж→нэгтгэж→бичдэг
--      тул эрсдэл багассан ч атомик БИШ).
--   ② `app_config` нь нэвтэрсэн бүх ажилтанд уншигддаг — өөрөөр хэлбэл хэн ч
--      бусдын ирцийн хүсэлт, тайлбарыг харж чадна.
--   ③ 120 хоногийн дараа шийдэгдсэн хүсэлт БҮРМӨСӨН хасагддаг байв — цалингийн
--      маргаан гарахад «хэн батлав» гэдэг түүх алга болно.
--   Мөр бүр өөрийн эрхтэй, өөрийн бичилттэй болсноор гурвуулаа шийдэгдэнэ.
--
-- ГАРААР ажиллуулна. ДАХИН ажиллуулж болно (`app_config`-оос хуулах нь idempotent).
-- ═══════════════════════════════════════════════════════════════════════

begin;

create table if not exists att_requests (
  id          text primary key,        -- «утас|өдөр» → нэг өдөрт нэг хүсэлт
  member_key  text not null,           -- ажилтны утас (personKey)
  day         date not null,
  status      text not null default 'pending',   -- pending | approved | rejected
  req         jsonb not null,          -- хүсэлтийн бүтэн бичлэг (аппын хэлбэрээр)
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);
create index if not exists att_requests_member_idx on att_requests (member_key, day desc);
create index if not exists att_requests_pending_idx on att_requests (status) where status = 'pending';

-- Багана нь `req`-ээс ГАРНА — хоёр эх сурвалж зөрөхөөс сэргийлнэ. Ингэснээр
-- клиент `member_key`-г хуурч бичиж чадахгүй (RLS шалгалт нь гарсан утга дээр).
create or replace function att_requests_sync() returns trigger
language plpgsql as $$
begin
  new.member_key := coalesce(nullif(regexp_replace(coalesce(new.req->>'key',''),'\D','','g'),''), new.member_key);
  new.day        := coalesce((nullif(new.req->>'day',''))::date, new.day);
  new.status     := coalesce(nullif(new.req->>'status',''), new.status, 'pending');
  new.updated_at := now();
  return new;
end;
$$;
drop trigger if exists att_requests_sync_trg on att_requests;
create trigger att_requests_sync_trg before insert or update on att_requests
  for each row execute function att_requests_sync();

commit;

-- ── `app_config`-оос хуулна. Хуучин мөрийг ХЭВЭЭР үлдээнэ (буцах зам). ──
insert into att_requests (id, member_key, day, status, req)
select e.key,
       regexp_replace(coalesce(e.value->>'key',''), '\D', '', 'g'),
       (e.value->>'day')::date,
       coalesce(e.value->>'status', 'pending'),
       e.value
from app_config c, jsonb_each(c.value) e
where c.key = 'att_requests'
  and (e.value->>'day') ~ '^\d{4}-\d{2}-\d{2}$'
on conflict (id) do nothing;

-- ── Эрх: өөрийн хүсэлтээ хүн бүр, бусдынхыг зөвхөн ирц засах эрхтэй ─────
-- Толь: аппын `canEditAttendance()` = isCEO || capValue('attendance.edit') === true.
-- ⚠ `sec.can` (өгөгдмөл ХОРИГ) — `sec.can_act` БИШ: ирц засах нь мөнгө болдог тул
--   танихгүй шинэ албан тушаалд автоматаар нээгдэх ёсгүй.
alter table att_requests enable row level security;

drop policy if exists att_requests_sel on att_requests;
create policy att_requests_sel on att_requests for select to authenticated
  using (sec.can('attendance.edit') or member_key = sec.phone());

-- Ажилтан ЗӨВХӨН өөрийн нэрээр, зөвхөн «хүлээгдэж буй» хүсэлт нэмнэ.
drop policy if exists att_requests_ins on att_requests;
create policy att_requests_ins on att_requests for insert to authenticated
  with check (sec.can('attendance.edit')
              or (member_key = sec.phone() and status = 'pending'));

-- Батлах/татгалзах = зөвхөн эрхтэй хүн. Ажилтан өөрийнхөө хүсэлтийг
-- «approved» болгож чадахгүй (with check мөн эрх шаардана).
drop policy if exists att_requests_upd on att_requests;
create policy att_requests_upd on att_requests for update to authenticated
  using (sec.can('attendance.edit')) with check (sec.can('attendance.edit'));

grant select, insert, update on att_requests to authenticated;
revoke delete on att_requests from authenticated;   -- түүх устахгүй
revoke all on att_requests from anon;

notify pgrst, 'reload schema';

-- ── Шалгах ──────────────────────────────────────────────────────────────
-- select status, count(*) from att_requests group by 1;
