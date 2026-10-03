-- ═══════════════════════════════════════════════════════════════════════
-- КАТЕРИНГИЙН ЗАХИАЛГА = catering_jobs + мөнгөний багана (2026-10-03)
--
-- ЯАГААД: катерингийн ажил (цэс, зочны тоо) бүртгэгддэг байсан ч МӨНГӨ
--   огт бүртгэгддэггүй байв — амьд датаар 9 сард 18,375,000₮-ийн катерингийн
--   орлого банкинд орсон атлаа тайланд НЭГ Ч төгрөг ороогүй («бусад орлого»).
--   Одоо M-Event-тэй ижил: нийт дүн + PDF баримтаар төлбөр.
--
-- ⚠ ТУСДАА ХҮСНЭГТ (app_orders БИШ): app_orders-ийг 140+ газар уншдаг —
--   дамжлага, нөөц, имэйл, FB conversion, COO-гийн 30% бүгд M-Event гэж үзнэ.
-- ⚠ NOMAAD-аас татсан ажлын (source='nomaad') мөнгө NOMAAD-ийн үнийн саналд
--   аль хэдийн багтсан тул тэнд дүн ОРУУЛАХГҮЙ (апп хаадаг) — давхар орлого.
--
-- ГАРААР ажиллуулна. ДАХИН ажиллуулж болно.
-- ═══════════════════════════════════════════════════════════════════════
begin;
alter table catering_jobs add column if not exists phone     text;
alter table catering_jobs add column if not exists total_mnt bigint not null default 0;
alter table catering_jobs add column if not exists paid_mnt  bigint not null default 0;
alter table catering_jobs add column if not exists paid_ref  text   not null default '';
alter table catering_jobs add column if not exists paid_date text;
create sequence if not exists catering_jobs_number_seq;
alter table catering_jobs add column if not exists number integer;
update catering_jobs j set number = s.n
  from (select id, row_number() over (order by created_at, id) as n from catering_jobs where number is null) s
 where j.id = s.id and j.number is null;
select setval('catering_jobs_number_seq', greatest(1, coalesce((select max(number) from catering_jobs), 0)));
alter table catering_jobs alter column number set default nextval('catering_jobs_number_seq');
grant usage, select on sequence catering_jobs_number_seq to authenticated;
-- ⛔ Хатуу устгал ХААЛТТАЙ хэвээр (цуцлах = status 'cancelled').
revoke delete on catering_jobs from authenticated;
commit;
notify pgrst, 'reload schema';
