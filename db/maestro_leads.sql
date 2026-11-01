-- ═════════════════════════════════════════════════════════════════════════
-- MAESTRO САЙТЫН ХҮСЭЛТ (LEAD) → ERP (2026-11-01, CEO)
--
-- Сайтын «Үнийн санал авах» form-оос ирсэн хүсэлтийг ERP-д хадгална.
--
-- ЯАГААД ТУСДАА ХҮСНЭГТ (catering_jobs / app_orders БИШ):
--   • app_orders — M-Event-ийн захиалга, 140+ газар уншдаг (⛔ тэнд оруулахгүй).
--   • catering_jobs — БАТАЛГААЖСАН ажил. Хүсэлт нь ажил биш: «төлөвлөсөн ажил»
--     гэж дашбоардад (upcoming) тоологдож, орлогын тооцоонд орно. Тиймээс хүсэлт
--     эхлээд энд; баталгаажсаны дараа ажил болгож шилжүүлнэ (дараагийн шат).
--
-- ЯАГААД n8n WEBHOOK БИШ, DB ФУНКЦ:
--   Webhook-ийн түлхүүр нууц биш (сайтын эх кодод ил). Хамгаалалт нь шалгалт ба
--   хязгаарлалтад л байх ёстой — тэдгээрийг DB дотор бичвэл өгөгдөлтэй НЭГ газар,
--   атомар, бүрэн тест хийгддэг. `submit_maestro_lead(json)` нь:
--     • бүх талбарыг шалгана (нэр, утас, имэйл, огноо, хүний тоо, урт)
--     • honeypot (`website`) бөглөгдсөн бол чимээгүй хаяна
--     • 15 минутын дотор ижил хүсэлтийг ДАВХАРДУУЛАХГҮЙ (дахин дарсан бол өмнөх дугаар)
--     • хязгаар: утас бүр 3/цаг, IP бүр 8/цаг, нийт 60/10 минут
--     • багцын нэр, үнийг ДБ-ээс авна (сайтаас илгэсэнд итгэхгүй)
--     • дугаар (MC-0001) буцаана. Дугаар ирээгүй бол сайт «амжилттай» гэж харуулахгүй.
--   SQL injection боломжгүй: динамик SQL байхгүй, бүх утга параметр.
--
-- ХИЛ (db/README.md):
--   ⛔ Хүснэгт anon-д ХААЛТТАЙ. anon зөвхөн ФУНКЦ дуудна (security definer).
--   ⛔ Хатуу устгал хаалттай (төлөв: spam / test / lost).
--   Унших/засах: `sec.cap('catering')` (тохируулаагүй бол CEO / түвшин ≥ 80).
--   ⚠ Хүсэлтийн бичвэр (нэр, тайлбар) — ЭЗЭНГҮЙ хүний оруулсан. ERP-ийн UI-д
--     үргэлж escapeHtml хийж харуул.
--
-- ПРЕРЕКВИЗИТ: db/maestro_menu.sql (maestro_lines, maestro_packages).
-- ГАРААР ажиллуулна. ДАХИН ажиллуулж болно (идемпотент).
--   ssh chimun-vps 'docker exec -i vps-deploy-postgres-1 psql -U chimun -d chimun -v ON_ERROR_STOP=1' < db/maestro_leads.sql
-- ═════════════════════════════════════════════════════════════════════════

begin;

create sequence if not exists maestro_leads_number_seq;

create table if not exists maestro_leads (
  id            bigserial primary key,
  number        integer not null default nextval('maestro_leads_number_seq'),
  ref           text generated always as ('MC-' || lpad(number::text, 4, '0')) stored,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  status        text not null default 'new',        -- new | contacted | quoted | won | lost | spam | test
  source        text not null default 'maestro-site', -- maestro-site | maestro-preview | manual
  line_id       text,                                -- үйлчилгээ (maestro_lines.id)
  line_name     text not null default '',
  package_id    text,                                -- багц (maestro_packages.id), мэдэгдэж байвал
  package_name  text not null default '',
  quoted_price  integer,                             -- хүсэлтийн үеийн нэгж үнэ (₮), багцаас
  name          text not null,
  phone         text not null,                       -- зөвхөн тоо (+ эхэнд байж болно)
  email         text not null default '',
  event_date    date,
  guests        integer,
  venue         text not null default '',
  note          text not null default '',
  ip_hash       text not null default '',            -- IP-ийн богино хэш (зөвхөн хязгаарлалтад; IP өөрөө хадгалагдахгүй)
  ua            text not null default '',
  assigned_to   text not null default '',
  handled_note  text not null default '',
  notified_at   timestamptz,                         -- мэдэгдэл явуулсан эсэх (дараагийн шат)
  constraint maestro_leads_status_chk check (status in ('new','contacted','quoted','won','lost','spam','test')),
  constraint maestro_leads_source_chk check (source in ('maestro-site','maestro-preview','manual')),
  constraint maestro_leads_name_chk   check (char_length(btrim(name)) between 1 and 80),
  constraint maestro_leads_phone_chk  check (phone ~ '^\+?[0-9]{8,15}$'),
  constraint maestro_leads_guests_chk check (guests is null or guests between 1 and 5000),
  constraint maestro_leads_note_chk   check (char_length(note) <= 1000 and char_length(venue) <= 200)
);
alter sequence maestro_leads_number_seq owned by maestro_leads.number;
create unique index if not exists maestro_leads_number_uidx on maestro_leads (number);
create index if not exists maestro_leads_created_idx on maestro_leads (created_at desc);
create index if not exists maestro_leads_phone_idx   on maestro_leads (phone, created_at desc);
create index if not exists maestro_leads_ip_idx      on maestro_leads (ip_hash, created_at desc);
create index if not exists maestro_leads_new_idx     on maestro_leads (created_at) where status = 'new';

create or replace function maestro_touch() returns trigger
language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end;
$$;
drop trigger if exists maestro_leads_touch on maestro_leads;
create trigger maestro_leads_touch before update on maestro_leads for each row execute function maestro_touch();

-- ── Нийтийн хүсэлт хүлээн авах функц ─────────────────────────────────────
-- PostgREST: POST /rpc/submit_maestro_lead   (Prefer: params=single-object → body нь `payload`)
-- Буцаах: {"ok":true,"number":"MC-0001"} эсвэл {"ok":false,"reason":"…"}
create or replace function public.submit_maestro_lead(payload json)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  p          jsonb;
  v_today    date := (now() at time zone 'Asia/Ulaanbaatar')::date;
  v_name     text;
  v_phone    text;
  v_digits   integer;
  v_email    text;
  v_venue    text;
  v_note     text;
  v_guests   integer;
  v_date     date;
  v_src      text;
  v_status   text := 'new';
  v_line     text;
  v_linename text := '';
  v_pkg      text;
  v_pkgname  text := '';
  v_price    integer;
  v_hdr      jsonb;
  v_ip       text;
  v_hash     text := '';
  v_ua       text := '';
  v_dup      maestro_leads%rowtype;
  v_new      maestro_leads%rowtype;
begin
  begin
    p := payload::jsonb;
  exception when others then
    p := null;
  end;
  if p is null or jsonb_typeof(p) <> 'object' then
    return jsonb_build_object('ok', false, 'reason', 'Хүсэлтийн хэлбэр буруу байна.');
  end if;

  -- Bot хориг (honeypot). Бодит хүн үүнийг харахгүй → бөглөгдсөн бол чимээгүй хаяна.
  if btrim(coalesce(p->>'website', '')) <> '' then
    return jsonb_build_object('ok', true, 'number', 'MC-0000');
  end if;

  -- Нэр
  v_name := btrim(regexp_replace(coalesce(p->>'name', ''), '[\x01-\x1f\x7f]', ' ', 'g'));
  if char_length(v_name) < 1 then
    return jsonb_build_object('ok', false, 'reason', 'Нэрээ оруулна уу.');
  end if;
  if char_length(v_name) > 80 then
    return jsonb_build_object('ok', false, 'reason', 'Нэр хэт урт байна.');
  end if;

  -- Утас: зөвхөн тоо; эхэнд «+» байж болно. «+976 9911 2233» ба «99112233» нь НЭГ дугаар
  -- (давхардал, хязгаарлалт хоёр өөр бичлэгээр тойрогдохгүй).
  v_phone := regexp_replace(coalesce(p->>'phone', ''), '[^0-9]', '', 'g');
  v_digits := char_length(v_phone);
  if v_digits < 8 or v_digits > 15 then
    return jsonb_build_object('ok', false, 'reason', 'Утасны дугаараа бүтнээр оруулна уу.');
  end if;
  if v_digits = 11 and left(v_phone, 3) = '976' then
    v_phone := right(v_phone, 8);
  elsif left(btrim(coalesce(p->>'phone', '')), 1) = '+' then
    v_phone := '+' || v_phone;
  end if;

  -- Имэйл (заавал биш)
  v_email := lower(btrim(coalesce(p->>'email', '')));
  if v_email <> '' and (char_length(v_email) > 120 or v_email !~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$') then
    return jsonb_build_object('ok', false, 'reason', 'Имэйл хаяг буруу байна.');
  end if;

  -- Хүний тоо (заавал биш; 0 = хоосон)
  v_guests := null;
  if btrim(coalesce(p->>'guests', '')) not in ('', '0') then
    begin
      v_guests := (p->>'guests')::numeric::integer;
    exception when others then
      return jsonb_build_object('ok', false, 'reason', 'Хүний тоо буруу байна.');
    end;
    if v_guests < 1 or v_guests > 5000 then
      return jsonb_build_object('ok', false, 'reason', 'Хүний тоо буруу байна.');
    end if;
  end if;

  -- Огноо (заавал биш)
  v_date := null;
  if btrim(coalesce(p->>'date', '')) <> '' then
    begin
      v_date := (p->>'date')::date;
    exception when others then
      return jsonb_build_object('ok', false, 'reason', 'Огнооны хэлбэр буруу байна.');
    end;
    if v_date < v_today - 1 or v_date > v_today + 730 then
      return jsonb_build_object('ok', false, 'reason', 'Огноо буруу байна. Ирээдүйн огноо сонгоно уу.');
    end if;
  end if;

  v_venue := btrim(regexp_replace(coalesce(p->>'venue', ''), '[\x01-\x1f\x7f]', ' ', 'g'));
  v_note  := btrim(regexp_replace(coalesce(p->>'note', ''), '[\x01-\x08\x0b\x0c\x0e-\x1f\x7f]', ' ', 'g'));
  if char_length(v_venue) > 200 then
    return jsonb_build_object('ok', false, 'reason', 'Байршлын тайлбар хэт урт байна.');
  end if;
  if char_length(v_note) > 1000 then
    return jsonb_build_object('ok', false, 'reason', 'Нэмэлт тайлбар хэт урт байна (1000 тэмдэгтээс бага).');
  end if;

  -- Эх сурвалж: preview-ээс ирсэн нь «test» төлөвтэй (ажилтан үл тоомсорлоно)
  v_src := case when p->>'source' in ('maestro-site', 'maestro-preview') then p->>'source' else 'maestro-site' end;
  if v_src = 'maestro-preview' then v_status := 'test'; end if;

  -- Багц/үйлчилгээ: нэр, үнийг ДБ-ээс (сайтаас ирсэнд итгэхгүй)
  select pk.id, pk.name, pk.price, pk.line_id, l.name
    into v_pkg, v_pkgname, v_price, v_line, v_linename
    from maestro_packages pk join maestro_lines l on l.id = pk.line_id
   where pk.id = btrim(coalesce(p->>'package', '')) and pk.active and l.active;
  if not found then
    v_pkg := null; v_price := null; v_line := null; v_linename := '';
    v_pkgname := left(btrim(regexp_replace(coalesce(p->>'packageName', ''), '[\x01-\x1f\x7f]', ' ', 'g')), 120);
    select l.id, l.name into v_line, v_linename
      from maestro_lines l where l.id = btrim(coalesce(p->>'line', '')) and l.active;
    if not found then
      v_line := null;
      v_linename := left(btrim(regexp_replace(coalesce(p->>'lineName', ''), '[\x01-\x1f\x7f]', ' ', 'g')), 80);
    end if;
  end if;

  -- Хүсэлт ирсэн орчин (PostgREST: request.headers). IP-ийг хэшлээд л хадгална.
  begin
    v_hdr := coalesce(nullif(current_setting('request.headers', true), '')::jsonb, '{}'::jsonb);
  exception when others then
    v_hdr := '{}'::jsonb;
  end;
  v_ip := btrim(split_part(coalesce(v_hdr->>'x-forwarded-for', v_hdr->>'x-real-ip', ''), ',', 1));
  if v_ip <> '' then v_hash := left(md5('maestro:' || v_ip), 12); end if;
  v_ua := left(regexp_replace(coalesce(v_hdr->>'user-agent', ''), '[\x01-\x1f\x7f]', ' ', 'g'), 200);

  -- Нэг дугаараас зэрэг ирсэн хоёр хүсэлт хоёулаа давхардал/хязгаарыг тойрохгүй:
  -- дугаар тус бүрээр дараалалд оруулна (гүйлгээ дуустал түгжинэ).
  perform pg_advisory_xact_lock(hashtext('maestro_lead:' || v_phone));

  -- Давхардал: 15 минутын дотор ижил хүн, ижил багц, ижил огноо → өмнөх дугаарыг буцаана
  select * into v_dup from maestro_leads
   where phone = v_phone
     and package_id is not distinct from v_pkg
     and package_name = v_pkgname
     and event_date is not distinct from v_date
     and created_at > now() - interval '15 minutes'
   order by id desc limit 1;
  if found then
    return jsonb_build_object('ok', true, 'number', v_dup.ref);
  end if;

  -- Хязгаарлалт (спам/халдлагаас): шалгалтуудын ДАРАА, оруулахын ӨМНӨ
  if (select count(*) from maestro_leads where phone = v_phone and created_at > now() - interval '1 hour') >= 3 then
    return jsonb_build_object('ok', false, 'reason', 'Энэ дугаараас хэт олон хүсэлт ирлээ. Утсаар холбогдоно уу.');
  end if;
  if v_hash <> '' and (select count(*) from maestro_leads where ip_hash = v_hash and created_at > now() - interval '1 hour') >= 8 then
    return jsonb_build_object('ok', false, 'reason', 'Хэт олон хүсэлт ирлээ. Утсаар холбогдоно уу.');
  end if;
  if (select count(*) from maestro_leads where created_at > now() - interval '10 minutes') >= 60 then
    return jsonb_build_object('ok', false, 'reason', 'Систем түр ачаалалтай байна. Утсаар холбогдоно уу.');
  end if;

  insert into maestro_leads (status, source, line_id, line_name, package_id, package_name, quoted_price,
                             name, phone, email, event_date, guests, venue, note, ip_hash, ua)
  values (v_status, v_src, v_line, coalesce(v_linename, ''), v_pkg, coalesce(v_pkgname, ''), v_price,
          v_name, v_phone, v_email, v_date, v_guests, v_venue, v_note, v_hash, v_ua)
  returning * into v_new;

  return jsonb_build_object('ok', true, 'number', v_new.ref);
end;
$$;

comment on function public.submit_maestro_lead(json) is
  'maestro сайтын хүсэлт хүлээн авна (нийтэд нээлттэй, security definer). Шалгалт, давхардал, хязгаарлалтыг энд л хийнэ.';

-- Функцийг ЗӨВХӨН нэрлэсэн эрхтэй хүмүүс дуудна (PUBLIC-аас хураана)
revoke all on function public.submit_maestro_lead(json) from public;
grant execute on function public.submit_maestro_lead(json) to anon, authenticated;

commit;

-- ── Эрх ───────────────────────────────────────────────────────────────────
alter table maestro_leads enable row level security;
grant select, insert, update on maestro_leads to authenticated;
grant usage, select on sequence maestro_leads_number_seq, maestro_leads_id_seq to authenticated;
drop policy if exists maestro_leads_sel on maestro_leads;
create policy maestro_leads_sel on maestro_leads for select to authenticated
  using (coalesce(sec.cap('catering'), sec.is_ceo() or sec.lvl() >= 80));
drop policy if exists maestro_leads_ins on maestro_leads;
create policy maestro_leads_ins on maestro_leads for insert to authenticated
  with check (coalesce(sec.cap('catering'), sec.is_ceo() or sec.lvl() >= 80));
drop policy if exists maestro_leads_upd on maestro_leads;
create policy maestro_leads_upd on maestro_leads for update to authenticated
  using (coalesce(sec.cap('catering'), sec.is_ceo() or sec.lvl() >= 80))
  with check (coalesce(sec.cap('catering'), sec.is_ceo() or sec.lvl() >= 80));

-- ⛔ DELETE ИЛ ХУРААНА (2026-09-16): эзний DEFAULT PRIVILEGES нь ШИНЭ хүснэгт
--    бүрд `authenticated`-д устгах эрхийг ч автоматаар олгодог. Спам бол status='spam'.
revoke delete on maestro_leads from authenticated;
-- ⛔ anon-д хүснэгт БҮРЭН хаалттай; зөвхөн дээрх ФУНКЦ нээлттэй.
revoke all on maestro_leads from anon;
revoke all on sequence maestro_leads_number_seq, maestro_leads_id_seq from anon;

notify pgrst, 'reload schema';

-- ═════════════════════════════════════════════════════════════════════════
-- ШАЛГАХ (ажиллуулсны дараа):
--   1) Функц нийтэд дуудагдана (preview тэмдэгтэй туршилтын хүсэлт, status='test'):
--      curl -sS -X POST 'https://n8n.nomaadcamp.com/db/rest/v1/rpc/submit_maestro_lead' \
--        -H 'Content-Type: application/json' -H 'Prefer: params=single-object' \
--        -d '{"source":"maestro-preview","name":"Туршилт","phone":"99112233"}'
--      → {"ok":true,"number":"MC-0001"}
--   2) Хүснэгт anon-д ХААЛТТАЙ (401 байх ёстой):
--      curl -sS -o /dev/null -w '%{http_code}\n' 'https://n8n.nomaadcamp.com/db/rest/v1/maestro_leads?select=id&limit=1'
--   3) Туршилтын мөрийг эзний холболтоор арилгах:
--      delete from maestro_leads where status = 'test';
--
-- БУЦААХ (хүсэлт ороогүй бол):
--   drop function if exists public.submit_maestro_lead(json);
--   drop table if exists maestro_leads;   -- дарааллыг хамт устгана
--   notify pgrst, 'reload schema';
-- ═════════════════════════════════════════════════════════════════════════
