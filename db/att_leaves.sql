-- ═══════════════════════════════════════════════════════════════════════
-- ЧӨЛӨӨ / АМРАЛТ / НӨХӨЛТИЙН ХҮСЭЛТ + ГАР ЗАСВАР (2026-11-14)
--
-- ЯАГААД: «Ажлын өдөр бүр ажилтан бүр автоматаар АЖИЛЛАНА гэж тооцогдоно; чөлөө/амралт зөвхөн урьдчилан
--   батлагдсан хүсэлтээр. Хүсэлтгүй, QR-гүй өдөр автоматаар ТАСАЛСАН» (ҮАЗ-ын даалгавар). Тасалсан өдөр
--   өөрөө бүртгэгдэх тул ГАРААР тэмдэглэх зүйл байхгүй — энэ хүснэгт зөвхөн ХҮСЭЛТ ба онцгой засварыг хадгална.
--
-- Нэг мөр = нэг хүсэлт (хэдэн өдөр байж болно) ЭСВЭЛ нэг өдрийн гар засвар (`source='manual'`).
--   kind: unpaid (цалингүй чөлөө) · paid (цалинтай чөлөө) · vacation (ээлжийн амралт) · sick (өвчтэй, баримттай)
--         makeup (нөхөлт: from_day = тасалсан өдөр, makeup_day = нөхөж ажилласан өдөр)
--         present / absent (ЗӨВХӨН гар засвар: автомат төлвийг «ирсэн»/«тасалсан» болгож солих)
--
-- ⛔ Мөр БҮР өөрийн эрхтэй (шалтгаан, өвчний баримт = хувийн мэдээлэл) — `app_config` blob БИШ.
--    Ажилтан ӨӨРИЙНХӨӨ мөрийг л харна/нэмнэ; шийдэх нь `attendance.edit` эрхтэй хүн.
--    Хамт олонд «хэн амарсан» нь `v_att_leaves_team` харагдацаар (шалтгаан, төрлийн задаргаагүй) харагдана.
-- ⛔ ХАТУУ УСТГАЛ БАЙХГҮЙ — болих = 'cancelled', өмнөх утга `history`-д үлдэнэ.
-- ⛔ ХААСАН САРЫН хүсэлт/засвар үүсэхгүй, өөрчлөгдөхгүй (`app_config['closed_months']`, att_callins-тэй ИЖИЛ).
-- ⛔ Хэзээнээс идэвхжих = `app_config['att_leave'].from` (ХООСОН бол БҮХЭЛДЭЭ унтраалттай — цалин хөндөгдөхгүй).
--
-- ГАРААР ажиллуулна. Идемпотент (дахин ажиллуулж болно).
-- ═══════════════════════════════════════════════════════════════════════

begin;

create table if not exists att_leaves (
  id            text primary key default ('L' || to_char(now() at time zone 'utc', 'YYMMDDHH24MISS') || substr(md5(random()::text), 1, 6)),
  member_key    text not null,                        -- ажилтны утас (personKey)
  from_day      date not null,
  to_day        date not null,
  kind          text not null check (kind in ('unpaid', 'paid', 'vacation', 'sick', 'makeup', 'present', 'absent')),
  reason        text check (reason is null or length(reason) <= 300),
  proof_url     text check (proof_url is null or length(proof_url) <= 400),   -- өвчний баримт (VPS-ийн зургийн файл)
  status        text not null default 'pending' check (status in ('pending', 'approved', 'rejected', 'cancelled')),
  late          boolean not null default false,       -- хугацаандаа илгээгээгүй (ҮАЗ тусгайлан шийднэ)
  source        text not null default 'request' check (source in ('request', 'manual')),
  makeup_day    date,                                 -- нөхөлт: нөхөж ажилласан өдөр
  makeup_mins   integer check (makeup_mins is null or (makeup_mins >= 0 and makeup_mins <= 1440)),
  decided_by    text,
  decided_at    timestamptz,
  decision_note text check (decision_note is null or length(decision_note) <= 300),
  created_by    text,
  history       jsonb not null default '[]'::jsonb,   -- өмнөх утгууд (append-only)
  created_at    timestamptz default now(),
  updated_at    timestamptz default now(),
  check (to_day >= from_day),
  check (to_day - from_day <= 60),
  check (kind <> 'makeup' or (makeup_day is not null and from_day = to_day)),
  check (source = 'request' or from_day = to_day),
  check (kind not in ('present', 'absent') or source = 'manual')
);
create index if not exists att_leaves_member_idx on att_leaves (member_key, from_day desc);
create index if not exists att_leaves_status_idx on att_leaves (status) where status = 'pending';
create index if not exists att_leaves_range_idx on att_leaves (from_day, to_day);

create or replace function att_leaves_guard() returns trigger
language plpgsql security definer set search_path = public, sec, pg_temp as $$
declare cfg jsonb; closed boolean; cut text; d date; ym text; manager boolean := sec.can('attendance.edit');
  mine boolean; ub date := (now() at time zone 'Asia/Ulaanbaatar')::date; clash int;
begin
  new.member_key := regexp_replace(coalesce(new.member_key, ''), '\D', '', 'g');
  if length(new.member_key) < 8 then raise exception 'Ажилтны утас буруу байна'; end if;
  mine := (new.member_key = sec.phone());

  if tg_op = 'INSERT' then
    new.created_by := coalesce(sec.phone(), new.created_by);
    if not manager and sec.phone() is not null then
      -- Ажилтан зөвхөн ӨӨРИЙН, ХҮЛЭЭГДЭЖ БУЙ, ХҮСЭЛТ нэмнэ (өөртөө батлах, гар засвар хийх боломжгүй).
      -- (`sec.phone()` хоосон = токенгүй холболт: нүүр хуудас, `person_rekey` — API-ийн хориг хамаарахгүй)
      if not mine then raise exception 'Зөвхөн өөрийнхөө хүсэлтийг илгээнэ'; end if;
      if new.status <> 'pending' or new.source <> 'request' or new.kind in ('present', 'absent') then
        raise exception 'Хүсэлт зөвхөн «хүлээгдэж буй» төлөвтэй үүснэ';
      end if;
      new.decided_by := null; new.decided_at := null; new.decision_note := null;
    end if;
    if new.source = 'manual' then
      if not manager and sec.phone() is not null then raise exception 'Гар засвар хийх эрхгүй'; end if;
      if new.status <> 'approved' then raise exception 'Гар засвар шууд хүчинтэй бичигдэнэ'; end if;
      if coalesce(length(btrim(new.reason)), 0) < 3 then raise exception 'Гар засварт шалтгаан заавал бичнэ'; end if;
      new.decided_by := coalesce(sec.phone(), new.decided_by); new.decided_at := now();   -- хэн, хэзээ тавьсан нь мөрөнд үлдэнэ
    end if;
    if new.kind = 'sick' and new.source = 'request' and coalesce(new.proof_url, '') = '' then
      raise exception 'Өвчтэй хүсэлтэд баримтын зураг заавал хавсаргана';
    end if;
  else
    -- Өдөр, төрлийг солихгүй (шинээр хүсэлт гаргана) — зөвхөн төлөв, шийдвэр. ⚠ `member_key` солигдохыг ЗӨВШӨӨРНӨ:
    -- утас солигдоход `person_rekey` бичнэ; API-аар өөр хүнд шилжүүлэх нь RLS-ийн `with check`-ээр хаагдана.
    if new.from_day is distinct from old.from_day
       or new.to_day is distinct from old.to_day or new.kind is distinct from old.kind
       or new.makeup_day is distinct from old.makeup_day or new.source is distinct from old.source then
      raise exception 'Хүсэлтийн хүн, өдөр, төрлийг өөрчлөхгүй — болиод шинээр илгээнэ';
    end if;
    if not manager and sec.phone() is not null and (new.status is distinct from old.status or new.decision_note is distinct from old.decision_note
       or new.reason is distinct from old.reason or new.proof_url is distinct from old.proof_url or new.late is distinct from old.late) then
      -- Ажилтан зөвхөн ӨӨРИЙН хүлээгдэж буй хүсэлтийг БОЛИХ боломжтой
      if not (mine and old.status = 'pending' and new.status = 'cancelled') then
        raise exception 'Хүсэлтийг батлах/татгалзах эрхгүй';
      end if;
    end if;
    if new.status is distinct from old.status then
      if old.status in ('rejected', 'cancelled') then raise exception 'Дууссан хүсэлтийг сэргээхгүй — шинээр илгээнэ'; end if;
      if new.status in ('approved', 'rejected', 'cancelled') then   -- болисон хүн, цаг ч түүхэнд үлдэнэ
        new.decided_by := coalesce(sec.phone(), new.decided_by); new.decided_at := now();
      end if;
    end if;
  end if;

  -- ⛔ ХААСАН САР: хүсэлт үүсгэх, төлөв солих, гар засвар — бүгд тэр сар(ууд)-ын түгжээнд баригдана.
  if tg_op = 'INSERT' or new.status is distinct from old.status then
    select value into cfg from app_config where key = 'closed_months';
    if cfg is not null then
      cut := substr(coalesce(cfg #>> '{__cutover,before}', ''), 1, 7);
      for d in select generate_series(date_trunc('month', new.from_day)::date,
                                      date_trunc('month', greatest(new.to_day, coalesce(new.makeup_day, new.to_day)))::date, interval '1 month')::date
      loop
        ym := to_char(d, 'YYYY-MM'); closed := false;
        if (cfg ->> ym) is not null and (cfg ->> ym) not in ('false', 'null') then closed := true; end if;
        if cut <> '' and ym < cut then closed := true; end if;
        if closed then
          raise exception '🔒 % сар хаагдсан — чөлөө/ирцийн төлөв өөрчлөх боломжгүй. Шаардлагатай бол CEO сарыг нээнэ (Санхүү → Тайлан).', ym;
        end if;
      end loop;
    end if;
  end if;

  -- Давхцал: нэг хүний хүлээгдэж буй/батлагдсан ИЖИЛ ТӨРЛИЙН (хүсэлт ↔ хүсэлт, гар засвар ↔ гар засвар) мөр хоорондоо давхцахгүй.
  if new.status in ('pending', 'approved') and new.kind <> 'makeup' and (tg_op = 'INSERT' or new.status is distinct from old.status) then
    select count(*) into clash from att_leaves x
      where x.member_key = new.member_key and x.id <> coalesce(new.id, '') and x.status in ('pending', 'approved')
        and x.kind <> 'makeup' and x.source = new.source
        and x.from_day <= new.to_day and x.to_day >= new.from_day;
    if clash > 0 then raise exception 'Энэ өдрүүдэд өөр хүсэлт аль хэдийн байна'; end if;
  end if;
  if new.kind = 'makeup' and new.status in ('pending', 'approved') and (tg_op = 'INSERT' or new.status is distinct from old.status) then
    select count(*) into clash from att_leaves x
      where x.member_key = new.member_key and x.id <> coalesce(new.id, '') and x.kind = 'makeup'
        and x.status in ('pending', 'approved') and x.from_day = new.from_day;
    if clash > 0 then raise exception 'Энэ өдрийн нөхөлтийн хүсэлт аль хэдийн байна'; end if;
  end if;

  if tg_op = 'UPDATE' and (new.status is distinct from old.status or new.decision_note is distinct from old.decision_note) then
    new.history := coalesce(old.history, '[]'::jsonb) || jsonb_build_array(jsonb_build_object(
      'status', old.status, 'by', old.decided_by, 'at', old.decided_at, 'note', old.decision_note, 'saved', old.updated_at));
  end if;
  new.updated_at := now();
  return new;
end;
$$;
drop trigger if exists att_leaves_guard_trg on att_leaves;
create trigger att_leaves_guard_trg before insert or update on att_leaves
  for each row execute function att_leaves_guard();

-- ── Эрх ────────────────────────────────────────────────────────────────
-- Унших: ирц засах эрхтэй (шийднэ), цалин харах эрхтэй (цалин бодогдоно), ажилтан өөрөө.
-- Бичих: ажилтан өөрийн хүсэлтийг (триггер хязгаарлана), `attendance.edit` бүгдийг.
alter table att_leaves enable row level security;

drop policy if exists att_leaves_sel on att_leaves;
create policy att_leaves_sel on att_leaves for select to authenticated
  using (sec.can('attendance.edit') or sec.can('salary') or member_key = sec.phone());

drop policy if exists att_leaves_ins on att_leaves;
create policy att_leaves_ins on att_leaves for insert to authenticated
  with check (sec.can('attendance.edit') or member_key = sec.phone());

drop policy if exists att_leaves_upd on att_leaves;
create policy att_leaves_upd on att_leaves for update to authenticated
  using (sec.can('attendance.edit') or member_key = sec.phone())
  with check (sec.can('attendance.edit') or member_key = sec.phone());

grant select, insert, update on att_leaves to authenticated;
revoke delete on att_leaves from authenticated;   -- түүх устахгүй
revoke all on att_leaves from anon;

-- ── Хамт олонд харагдах «хэн амарсан» (ШАЛТГААН, ӨВЧНИЙ БАРИМТ ГАРАХГҮЙ) ─────────────────────────
-- Харагдац эзнийхээ эрхээр ажиллана (`security_invoker` АСААХГҮЙ — эс бөгөөс ажилтан бусдын мөрийг уншиж чадахгүй).
-- Төрлийг хоёр ангилалд хураана: vacation (ээлжийн амралт) ба leave (бусад чөлөө) — өвчтэй гэдэг нь бусдад харагдахгүй.
-- Зөвхөн БАТЛАГДСАН, ойрын (өнгөрсөн 7 хоног — ирэх 60 хоног) мөр. `present/absent/makeup` гар засвар орохгүй.
create or replace view v_att_leaves_team as
  select member_key, from_day, to_day,
         case when kind = 'vacation' then 'vacation' else 'leave' end as cls
    from att_leaves
   where status = 'approved' and kind in ('unpaid', 'paid', 'vacation', 'sick')
     and to_day >= (now() at time zone 'Asia/Ulaanbaatar')::date - 7
     and from_day <= (now() at time zone 'Asia/Ulaanbaatar')::date + 60;
grant select on v_att_leaves_team to authenticated;
revoke all on v_att_leaves_team from anon;

commit;

notify pgrst, 'reload schema';

-- ── Шалгах ──────────────────────────────────────────────────────────────
-- select member_key, from_day, to_day, kind, status, late from att_leaves order by created_at desc limit 20;
-- ── Идэвхжүүлэх (CEO, аппын Ирц → «⚙️ Чөлөөний дүрэм» эсвэл гараар) ───────────────────────────────
-- insert into app_config(key, value) values ('att_leave', '{"from":"2026-11-15"}'::jsonb)
--   on conflict (key) do update set value = excluded.value;
