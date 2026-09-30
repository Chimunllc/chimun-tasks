-- ӨӨРИЙН профайлаа УНШИХ.
--
-- Асуудал: `bank_account`, `rd`, `address`, яаралтай холбоо зэрэг нь ЭМЗЭГ талбар тул
-- `/webhook/staff`-аас БУЦААГДДАГГҮЙ. Тиймээс ажилтан цалингийн дансаа бүртгэсэн ч
-- дараагийн ачаалалтад апп түүнийг мэдэхгүй болж «⚠ Данс бүртгэгдээгүй» гэж ДАХИН
-- шаардана — бүртгэл нь DB-д хэвээр байхад. Дансаа бүртгэсэн хүн өөрөө үүнийг
-- батлах ямар ч арга байхгүй байв.
--
-- ⛔ ПАРАМЕТР АВАХГҮЙ. Утсыг ЗӨВХӨН токеноос (`sec.phone()`) авна — эс бөгөөс энэ
--    функц хэн ч хэний ч данс, РД, хаягийг уншиж болох нүх болно.
create or replace function public.get_my_profile()
returns table (
  phone text, bank text, bank_account text, bank_holder text,
  emergency_name text, emergency_phone text, address text
)
language sql
security definer
set search_path to 'public'
stable
as $$
  select e.phone, e.bank, e.bank_account, e.bank_holder,
         e.emergency_name, e.emergency_phone, e.address
  from public.employees e
  where regexp_replace(coalesce(e.phone,''), '\D', '', 'g') = sec.phone()
    and sec.phone() <> ''
    and e.merged_into is null
  order by e.pk
  limit 1;
$$;

revoke all on function public.get_my_profile() from public, anon;
grant execute on function public.get_my_profile() to authenticated;

notify pgrst, 'reload schema';
