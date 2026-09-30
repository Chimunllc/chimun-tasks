-- Баримтын ХАВТАС.
-- Тусдаа хүснэгт үүсгээгүй: хавтас нь зөвхөн ЗАМЫН МӨР («Гэрээнүүд/2026»).
-- Яагаад: хавтас нь өөрөө эзэмшигчгүй, эрхгүй, түүхгүй зүйл — зөвхөн бүлэглэх
-- хэрэгсэл. Хүснэгт болговол хоосон хавтас, устгах дараалал, RLS гэсэн гурван
-- шинэ асуудал төрнө. Мөр нь хоосон/NULL бол «үндсэн хавтас».
alter table public.company_docs add column if not exists folder text;
create index if not exists company_docs_folder_idx on public.company_docs (folder);

notify pgrst, 'reload schema';
