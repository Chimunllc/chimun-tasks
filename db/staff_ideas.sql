-- ═══════════════════════════════════════════════════════════════════════
-- АЖИЛТНЫ САНАЛ / АСУУДАЛ (2026-10-07, CEO)
--
-- Ажилтан бүр компанид тулгарсан асуудал эсвэл сайжруулах санаагаа бичнэ.
-- VPS-ийн `tools/idea_triage.py` (cron 30 мин) Claude-аар шалгаж:
--   plan   → төлөвлөгөөнд «💡 санал» болж орно (`app_config['plan']`, id `s-<id>`)
--   merge  → аль хэдийн байгаа нээлттэй мөртэй ижил — тэр мөрөнд нэгтгэнэ
--   exists → хийгдсэн / аппад бий / захирал хийхгүй гэж шийдсэн
--   drop   → хэрэгжүүлэх зүйлгүй (шалтгааныг зохиогчид бичнэ)
-- Захирал төлөвлөгөөнөөс батлахад ажил АЖИЛТАН дээр үүснэ.
--
-- ЯАГААД ТУСДАА ХҮСНЭГТ (app_config БИШ): `app_config` нь нэвтэрсэн бүх ажилтанд
--   уншигддаг — гомдол, асуудлын бичвэр бусдад ил болно. Энд RLS-ээр зөвхөн
--   зохиогч ба төлөвлөгөө хардаг хүн уншина. Төлөвлөгөөний мөрөнд ЗӨВХӨН id орно.
--
-- ГАРААР ажиллуулна. ДАХИН ажиллуулж болно.
-- ═══════════════════════════════════════════════════════════════════════

begin;

create table if not exists staff_ideas (
  id          bigserial primary key,
  author      text not null default '',          -- ажилтны утас (JWT-ээс trigger тавина)
  kind        text not null default 'idea',      -- problem | idea
  body        text not null,
  status      text not null default 'new',       -- new | plan | merge | exists | drop
  verdict     text,                              -- Claude-ийн тайлбар (зохиогчид харагдана)
  plan_id     text,                              -- app_config['plan'] доторх мөрийн id
  triaged_at  timestamptz,
  created_at  timestamptz not null default now(),
  constraint staff_ideas_kind_chk   check (kind in ('problem', 'idea')),
  constraint staff_ideas_status_chk check (status in ('new', 'plan', 'merge', 'exists', 'drop')),
  constraint staff_ideas_body_chk   check (char_length(btrim(body)) between 3 and 2000)
);
-- Хүний тухай гомдол, цалин, ажилд авалт — бичвэрийг ЗӨВХӨН захирал харна (2026-10-09).
-- Салбарын захирал төлөвлөгөө хардаг болсон тул бусад саналыг уншина, энийг БИШ.
-- `idea_triage.py` (Claude) тавина.
alter table staff_ideas add column if not exists private boolean not null default false;

create index if not exists staff_ideas_new_idx    on staff_ideas (created_at) where status = 'new';
create index if not exists staff_ideas_author_idx on staff_ideas (author, created_at desc);

-- Зохиогчийг клиент хуурч бичиж чадахгүй: нэвтэрсэн хүсэлтэд JWT-ийн утсаар
-- ДАРНА. Эзний холболт (VPS скрипт, `sec.phone()` хоосон) хөндөгдөхгүй.
create or replace function staff_ideas_author() returns trigger
language plpgsql as $$
begin
  if sec.phone() is not null then new.author := sec.phone(); end if;
  new.body := btrim(new.body);
  return new;
end;
$$;
drop trigger if exists staff_ideas_author_trg on staff_ideas;
create trigger staff_ideas_author_trg before insert on staff_ideas
  for each row execute function staff_ideas_author();

commit;

-- ── Эрх ─────────────────────────────────────────────────────────────────
-- Толь: аппын `canSeePlan()` = canAccessView('plan', () => isCEO)
--   = `sec.cap('plan')` (CEO-д үргэлж true), тохируулаагүй бол хориг.
-- ⛔ Үйл ажиллагааны захирал (`plan` харах эрхтэй, 2026-10-09) хувийн саналыг
--    (`private`) УНШИХГҮЙ — гомдол нь түүний тухай ч байж болно.
alter table staff_ideas enable row level security;

drop policy if exists staff_ideas_sel on staff_ideas;
create policy staff_ideas_sel on staff_ideas for select to authenticated
  using (author = sec.phone() or (coalesce(sec.cap('plan'), false) and (not private or sec.is_ceo())));

-- Хэн ч өөрийн нэрээр, зөвхөн «шинэ» санал нэмнэ — дүгнэлтийг өөрөө бичиж чадахгүй.
drop policy if exists staff_ideas_ins on staff_ideas;
create policy staff_ideas_ins on staff_ideas for insert to authenticated
  with check (author = sec.phone() and status = 'new' and not private
              and verdict is null and plan_id is null and triaged_at is null);

-- Дүгнэлтийг засах (Claude буруу хассаныг төлөвлөгөөнд оруулах) = ЗӨВХӨН захирал
-- (аппын `staffIdeaPromote` ч зөвхөн CEO). Салбарын захирал төлөвлөгөө хардаг ч засахгүй.
drop policy if exists staff_ideas_upd on staff_ideas;
create policy staff_ideas_upd on staff_ideas for update to authenticated
  using (sec.is_ceo()) with check (sec.is_ceo());

grant select, insert, update on staff_ideas to authenticated;
grant usage, select on sequence staff_ideas_id_seq to authenticated;
revoke delete on staff_ideas from authenticated;   -- түүх устахгүй
revoke all on staff_ideas from anon;

notify pgrst, 'reload schema';

-- ── Шалгах ──────────────────────────────────────────────────────────────
-- select status, count(*) from staff_ideas group by 1;
