-- ЦАЛИНГИЙН БАНКНЫ МӨР — санхүүгийн бүрэн эрхгүй ч цалин хардаг хүнд (2026-10-03).
--
-- Асуудал: цалингийн самбар хоёр зүйлийг САНХҮҮГИЙН бүртгэлээс уншдаг —
--   ① олголт АЛЬ САРЫНХ вэ (`[#fp]` → санхүүгийн мөрийн ноогдох сар)
--   ② хуулгаас шууд орсон, `salary_payments`-д бичигдээгүй олголт (7100).
-- Санхүүгийн бүртгэл зөвхөн бүрэн эрхтэй хүнд (CEO/нягтлан) ирдэг тул нярав зэрэг
-- цалингийн эрхтэй хүнд «8 сар 2р хагас» олголт 9 сард орж, 9/21-ний олголт огт
-- харагдахгүй байв (амьд датаар яг давтаж баталсан). Ажилтан ӨӨРИЙН цалингийн
-- картад ч мөн адил — авсан мөнгө нь «олголт бүртгэгдээгүй» гэж харагдана.
--
-- ⛔ ЗӨВХӨН ЦАЛИНГИЙН АНГИЛАЛ (7100/7200/7300/7600). 6900 (эзний зээл), 7700 (COO
--    ашгийн урамшуулал) болон бусад зардал ЭНД ОРОХГҮЙ.
-- ⛔ Хил = `salary_payments`-тай ИЖИЛ: `salary` эрхтэй хүн бүх цалингийн мөрийг,
--    бусад нь ЗӨВХӨН өөрийн бүртгэлтэй данс руу явсан мөрийг харна.
--    Утсыг ЗӨВХӨН токеноос (`sec.phone()`) — параметр авахгүй.
-- ⚠ Данс урт/цөм хоёр хэлбэртэй (`880004000434123912` ↔ `434123912`) тул
--   суффиксээр тулгана — app.js-ийн `acctSame` (`ACCT_MATCH_MIN` = 9) -тай ИЖИЛ.
-- ⚠ Харагдац эзнийхээ эрхээр ажилладаг (`security_invoker` OFF) тул `finance`-ийн
--   RLS-ийг тойрно — шүүлт нь ДООРХ where. `security_invoker=on` болговол унана.

create or replace function sec.acct_same(a text, b text) returns boolean
  language sql immutable as $$
  select case
    when x = '' or y = '' then false
    when x = y then true
    when length(x) < 9 or length(y) < 9 then false
    else right(x, length(y)) = y or right(y, length(x)) = x
  end
  from (select regexp_replace(coalesce(a, ''), '\D', '', 'g') as x,
               regexp_replace(coalesce(b, ''), '\D', '', 'g') as y) t
$$;

create or replace view public.v_salary_fin as
select f.id, f.requested_at, f.amount, f.beneficiary, f.account_number, f.category,
       f.status, f.decision, f.justification, f.purpose
from public.finance f
where coalesce(f.status, '') <> 'deleted'
  and f.category ~ '^7[1236]00'
  and (
    sec.can('salary')
    or exists (
      select 1 from public.employees e
      where regexp_replace(coalesce(e.phone, ''), '\D', '', 'g') = sec.phone()
        and sec.phone() <> ''
        and e.merged_into is null
        and (sec.acct_same(f.account_number, e.bank_account)
             or sec.acct_same(f.beneficiary, e.bank_account))
    )
  );

revoke all on public.v_salary_fin from public, anon;
grant select on public.v_salary_fin to authenticated;

notify pgrst, 'reload schema';
