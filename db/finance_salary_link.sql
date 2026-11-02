-- Цалингийн гүйлгээ ↔ ажилтан холбоосын хамгаалалт (2026-11-02, CEO хүсэлт)
--
-- ЯАГААД: цалин өөр хүний дансаар (ээж, нөхөр) авагддаг тул банкны хуулгын «хүлээн авагч» нь
-- ажилтны нэр биш байж болно. Тэр үед цалингийн «Олгосон» дутуу харагддаг байв (Э.Очбаяр: 5
-- гүйлгээ 1,800,000₮-ийн ганцхан нь тоологдож, үлдэгдэл 2,401,104₮ биш 3,701,104₮ гарсан).
-- Одоо Гүйлгээ засахдаа ангилал 7100/7200 үед «Ажилтан» + «Цалингийн сар» сонгоно.
--
-- ХАДГАЛАХ ЗАМ: ШИНЭ БАГАНА БИШ. Холбоос нь `finance.justification` дахь ⟦EMP|ажилтны түлхүүр⟧
-- токен (⟦ACCR|YYYY-MM⟧ ноогдох сартай ижил загвар). Банкны гүйлгээг `n8n.../webhook/finance`
-- бичдэг тул багана нэмбэл n8n-ийн mapping хөндөгдөнө; токен нь аль хэдийн тэр замаар явдаг.
--   · НЭГ гүйлгээ = НЭГ ажилтан: нэг мөрд ГАНЦ токен (доорх CHECK; апп `withSalaryLinkToken`-оор
--     хуучныг хасч шинийг тавина).
--   · НЭГ гүйлгээ = НЭГ сар: сар нь ⟦ACCR⟧ (ноогдох сар) — тусдаа сар хадгалахгүй.
--
-- ⛔ NOT VALID — одоо байгаа мөрийг ШАЛГАХГҮЙ (түүхэн мөр хэзээ ч эвдрэхгүй); зөвхөн ШИНЭ бичилтийг.
-- ⚠ Харагдац (`public.v_salary_fin`) ажилтанд өөрийн холбосон мөрийг харуулдаг — `db/salary_fin.sql`-ийг
--   ДАХИН ажиллуулна (идемпотент). Тэрийг ажиллуулаагүй ч апп ажиллана: CEO/нягтлан бүгдийг, харин
--   энгийн ажилтан зөвхөн өөрийн дансны мөрийг (холбосон мөрийг биш) харна.
-- Идемпотент. ГАРААР ажиллуулна (db/-ийн бусадтай ижил):
--   ssh chimun-vps 'docker exec -i vps-deploy-postgres-1 psql -U chimun -d chimun -v ON_ERROR_STOP=1' < db/finance_salary_link.sql

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'finance_one_emp_link') then
    alter table public.finance
      add constraint finance_one_emp_link
      check ((length(coalesce(justification, '')) - length(replace(coalesce(justification, ''), '⟦EMP|', ''))) <= length('⟦EMP|'))
      not valid;
  end if;
end $$;

comment on constraint finance_one_emp_link on public.finance is
  'Нэг гүйлгээ = нэг ажилтан: justification-д ⟦EMP|түлхүүр⟧ токен ХАМГИЙН ИХДЭЭ нэг. (2026-11-02)';

notify pgrst, 'reload schema';
