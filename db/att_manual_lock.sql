-- ═══════════════════════════════════════════════════════════════════════
-- ИРЦИЙН ГАР ЗАСВАР ХААСАН САРД БИЧИГДЭХГҮЙ (2026-10-30)
--
-- ЯАГААД: цалин ирцээс тэр дор дахин бодогддог. 11 сард 9 сарын өдрийн гарах цаг нэмбэл
--   олгочихсон цалин чимээгүй өөрчлөгдөнө. Апп (`attSaveManualOut`) шалгадаг ч аппын эрх
--   ЗӨВХӨН UI дээр байвал токен барьсан хэн ч PostgREST рүү шууд бичиж чадна — тиймээс ЭНД
--   (trigger) мөн хаана. `att_marks`, `att_callins`-тай ИЖИЛ дүрэм.
--
-- ЗӨВХӨН `manual` (гараар гарах цаг нэмсэн) БА `request` (батлагдсан хүсэлт) мөр. Киоск/сканы
--   (`qr`, `scan`) бичилт `WHEN` нөхцөлд ОРОХГҮЙ — trigger тэдэнд хэзээ ч ажиллахгүй тул ирц
--   бүртгэх үндсэн урсгал эвдрэх боломжгүй.
-- Шалгах сар = `day` (цалин өдрөөр тооцогддог), `ts` БИШ: 9-р сарын 30-ны шөнийн ээлж 10-р
--   сарын 1-нд дуусвал ч 9 сарынх.
-- Хаалтын дүрэм = `app_config['closed_months']` — аппын `monthIsClosed`-тэй ИЖИЛ: сар бүр БА
--   `__cutover.before`-оос өмнөх бүх сар.
--
-- ГАРААР ажиллуулна. Идемпотент (дахин ажиллуулж болно).
-- ═══════════════════════════════════════════════════════════════════════

begin;

create or replace function att_manual_lock() returns trigger
language plpgsql security definer set search_path = public, pg_temp as $$
declare cfg jsonb; ym text; closed boolean := false; cut text;
begin
  ym := to_char(coalesce(new.day, (new.ts at time zone 'Asia/Ulaanbaatar')::date), 'YYYY-MM');
  select value into cfg from app_config where key = 'closed_months';
  if cfg is not null then
    if (cfg ->> ym) is not null and (cfg ->> ym) not in ('false', 'null') then closed := true; end if;
    cut := substr(coalesce(cfg #>> '{__cutover,before}', ''), 1, 7);
    if cut <> '' and ym < cut then closed := true; end if;
  end if;
  if closed then
    raise exception '🔒 % сар хаагдсан — ирц засах боломжгүй. Шаардлагатай бол CEO сарыг нээнэ (Санхүү → Тайлан).', ym;
  end if;
  return new;
end;
$$;

drop trigger if exists attendance_manual_lock_trg on attendance;
create trigger attendance_manual_lock_trg
  before insert on attendance
  for each row
  when (new.source in ('manual', 'request'))
  execute function att_manual_lock();

notify pgrst, 'reload schema';

commit;
