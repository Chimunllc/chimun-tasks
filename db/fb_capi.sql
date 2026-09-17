-- Meta Conversions API — сервер талаас илгээсэн худалдан авалтын бүртгэл.
-- `tools/fb_capi.py` (VPS, цаг тутам) бичнэ. Гараар бичигддэггүй.
--
-- ЯАГААД ХЭРЭГТЭЙ: Pixel нь браузерт л ажилладаг тул (а) adblock/iOS хаадаг,
-- (б) утсаар, биечлэн ирж захиалсан хүн Facebook-т ОГТ хүрдэггүй. Манай
-- захиалгын дийлэнх нь яг тэр — иймд Facebook «ямар хүн үнэхээр мөнгө төлдөг
-- вэ» гэдгийг сурч чадахгүй байв. Энэ хүснэгт нь давхар илгээхээс хамгаална.
--
-- ⛔ НЭГ ЗАХИАЛГА = НЭГ МӨР. Урьдчилгаа, дараа нь үлдэгдэл гэж хоёр удаа
--    төлсөн ч Purchase НЭГ УДАА явна — эс бөгөөс зарын үр дүн хоёр дахин их
--    харагдаж, төсөв худал тоон дээр хуваарилагдана.
create table if not exists fb_capi_sent (
  order_id    text        primary key,
  event_name  text        not null default 'Purchase',
  event_id    text        not null,
  value_usd   numeric(12,2) not null default 0,
  matched     text,                    -- ямар түлхүүрээр тулгагдсан: ph,em,fbp,fbc
  sent_at     timestamptz not null default now(),
  response    text                     -- Meta-гийн хариу (алдаа оношлоход)
);
create index if not exists fb_capi_sent_at_idx on fb_capi_sent (sent_at desc);

-- ⛔ anon-д ОГТ нээхгүй (захиалгын дүн + тулгалтын түлхүүр).
grant select, insert, update on fb_capi_sent to authenticated;
-- ⛔ DELETE ИЛ ХУРААНА. Эзний DEFAULT PRIVILEGES нь ШИНЭ хүснэгт бүрд
--    `authenticated`-д `arwd` автоматаар олгодог тул `grant` бичээд орхивол
--    хатуу устгал нээлттэй үлдэнэ. Мөр уствал ижил захиалга ДАХИН илгээгдэнэ.
revoke delete on fb_capi_sent from authenticated;

-- ⛔ ХҮСНЭГТ ҮҮСГЭСЭН НЬ ХАНГАЛТГҮЙ — PostgREST схемээ КЭШЛЭДЭГ тул шинэ
--    хүснэгтийг мэдэхгүй, апп нь **404** авна (2026-09-17-нд яг ингэсэн:
--    кэш 78 relation дээр зогссон байсныг 81 болгож зассан).
notify pgrst, 'reload schema';
