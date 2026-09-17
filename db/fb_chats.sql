-- Messenger чатын ТӨЛӨВ + ботын аудит. `tools/fb_chat.py` (VPS cron) бичнэ.
--
-- ЯАГААД: Facebook чат 2026-09-17 хүртэл бидний хувьд ХАРАГДДАГГҮЙ байсан
-- (`pages_messaging` эрх байхгүй). Одоо нээгдсэн: 30 хоногт 195 чат, тэдгээрийн
-- 43 нь хариу хүлээж байв — алдсан дуудлагатай ижил асуудал, зөвхөн илүү том.
--
-- ⛔ БҮХ ЯРИАГ ХУУЛЖ ХАДГАЛАХГҮЙ. Чатын бичвэр = харилцагчийн хувийн мэдээлэл.
--    Энд зөвхөн (а) төлөв (б) БОТ юу хэлснийг үлдээнэ — бот компанийн нэрээр
--    ярьдаг тул хэлсэн үг нь заавал шалгагдах ёстой. Бүтэн яриаг үзэх бол
--    Facebook Inbox дээр байна, тэр л эх сурвалж.
create table if not exists fb_chats (
  thread_id     text primary key,       -- t_123…
  psid          text,                   -- харилцагчийн page-scoped id
  name          text,
  first_at      timestamptz,
  last_at       timestamptz,            -- сүүлийн мессежийн цаг (аль ч талын)
  last_in_at    timestamptz,            -- харилцагчийн сүүлийн мессеж
  last_in_mid   text,                   -- түүний id — бот давхар хариулахаас хамгаална
  last_out_at   timestamptz,
  msgs_in       int  not null default 0,
  msgs_out      int  not null default 0,
  -- ⛔ ТӨЛӨВ = хэн энэ чатыг эзэмшиж байна.
  --    bot   — бот хариулж болно
  --    human — ХҮН гарт авсан. Бот ДАХИН ОРОХГҮЙ (ажилтан бичсэн тэр мөчид
  --            автоматаар ингэж тэмдэглэгдэнэ — ажилтан товч дарах шаардлагагүй).
  --    done  — хаагдсан
  state         text not null default 'bot',
  handoff_at    timestamptz,
  handoff_why   text,                   -- яагаад хүнд шилжсэн (үнэ хэлэлцээр, гомдол…)
  turns         int  not null default 0,-- ботын дараалсан хариултын тоо
  order_id      text,                   -- тулгагдсан захиалга (нэр/утсаар)
  updated_at    timestamptz not null default now()
);
create index if not exists fb_chats_last_idx  on fb_chats (last_at desc);
create index if not exists fb_chats_state_idx on fb_chats (state);

-- Ботын хэлсэн үг бүр. Хүн ШАЛГАХ боломжтой байх ёстой.
-- `in_text` = ботыг ажиллуулсан харилцагчийн мессеж (контекстгүй бол хариултыг
-- дүгнэх боломжгүй). Бусад мессежийг ХАДГАЛАХГҮЙ.
create table if not exists fb_chat_bot_log (
  id         bigserial primary key,
  thread_id  text not null,
  at         timestamptz not null default now(),
  in_text    text,
  out_text   text,
  -- ⛔ Илгээсэн мессежийн id ЗААВАЛ хадгалагдана. Энэ нь «энэ мессежийг бот
  --    бичсэн үү, ажилтан бичсэн үү» гэдгийн ЦОРЫН ГАНЦ дохио — Facebook
  --    хоёрыг ялгаж өгдөггүй. Алдвал бот ажилтны яриа руу дундуур нь орно.
  out_mid    text,
  tools      text,                      -- ямар өгөгдөл уншсан (catalog/tariff/stock)
  model      text,
  sent       boolean not null default false,  -- үнэхээр илгээгдсэн үү
  review     boolean not null default false,  -- хүний баталгаа хүлээсэн үү
  approved_by text,
  error      text,
  -- Зардлыг ТААМАГЛАХГҮЙ хэмжинэ — «сард хэд болох вэ» гэдэг нь бодит тоо
  -- байх ёстой, миний тооцоо биш.
  tok_in     int not null default 0,
  tok_out    int not null default 0
);
create index if not exists fb_chat_bot_log_thread_idx on fb_chat_bot_log (thread_id, at desc);
create index if not exists fb_chat_bot_log_at_idx     on fb_chat_bot_log (at desc);

-- ⚠ `create table if not exists` нь БАЙГАА хүснэгтэд шинэ багана НЭМДЭГГҮЙ —
--    файлыг дахин ажиллуулахад чимээгүй өнгөрөөд, бичилт «column does not
--    exist» гэж унана. Шинэ багана бүрийг ИЛ нэмнэ.
alter table fb_chat_bot_log add column if not exists out_mid text;
alter table fb_chat_bot_log add column if not exists tok_in  int not null default 0;
alter table fb_chat_bot_log add column if not exists tok_out int not null default 0;

-- ⛔ anon-д ОГТ нээхгүй — нэр, PSID, яриа = хувийн мэдээлэл.
grant select, insert, update on fb_chats to authenticated;
grant select, insert, update on fb_chat_bot_log to authenticated;
grant usage, select on sequence fb_chat_bot_log_id_seq to authenticated;
-- ⛔ DELETE ИЛ ХУРААНА — эзний default privileges `arwd`-г автоматаар олгодог.
revoke delete on fb_chats from authenticated;
revoke delete on fb_chat_bot_log from authenticated;

-- ⛔ ХҮСНЭГТ ҮҮСГЭСЭН НЬ ХАНГАЛТГҮЙ — PostgREST схемээ кэшлэдэг тул апп 404 авна.
notify pgrst, 'reload schema';
