-- Дуудлага бүрийн мөр — Unitel PBX-ийн CDR-ээс (`tools/pbx_pull.py`).
-- `pbx_calls_hourly` нь зөвхөн ТОО хадгалдаг тул «алдагдсан дуудлага буцаж
-- холбогдсон уу», «энэ хоёр дуудлага нэг хүн үү» гэдгийг хэлж чаддаггүй байв.
-- Энэ хүснэгт дугаар хадгалснаар тэр хоёрыг хоёуланг нь барина.
--
-- ⚠ Дугаар = ХУВИЙН МЭДЭЭЛЭЛ. anon-д ОГТ нээхгүй; `customers`-тэй ижил
--   хамгаалалт (нэвтэрсэн ажилтан уншина).
-- ⚠ Дахин татахад ОРЛУУЛНА (upsert by call_id) — Unitel хожим залруулж болно.
create table if not exists pbx_calls (
  call_id     text        primary key,
  started_at  timestamptz not null,
  direction   text        not null,           -- in | out | internal
  peer        text,                           -- ГАДААД дугаар (in: залгасан, out: залгуулсан)
  ext         text,                           -- дотоод дугаар
  fwd         text,                           -- шилжүүлсэн дугаар (ажилтны гар утас)
  -- ⛔ Порталын «Call Status» ХАДГАЛАХГҮЙ — тэр нь PBX өөрөө авсныг (дуут
  --    мэндчилгээ) «Answered» гэдэг тул хүн авсантай андуурагдана. Хүн авсныг
  --    ЗӨВХӨН `answer_sec > 0` хэлнэ (scan-тест татагчийг хардаг).
  answer_sec  int         not null default 0, -- ХҮН ярьсан секунд (0 = аваагүй)
  call_sec    int         not null default 0,
  fetched_at  timestamptz not null default now()
);
create index if not exists pbx_calls_started_idx on pbx_calls (started_at desc);
-- «Энэ дугаараас хэзээ дуудлага ирсэн бэ» — буцаж холбогдсоныг хайхад хэрэгтэй.
create index if not exists pbx_calls_peer_idx on pbx_calls (peer, started_at desc);

grant select on pbx_calls to authenticated;
