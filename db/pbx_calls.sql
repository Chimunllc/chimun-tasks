-- Утасны дуудлагын өдөр×цагийн тоо — Unitel PBX порталаас өдөр бүр татагдана.
-- Гараар бичигддэггүй (CLAUDE.md: «гараар нэмэлт бичүүлдэг боломж үхдэг»).
--
-- ⚠ Unitel-д API БАЙХГҮЙ. `tools/pbx_pull.py` нь порталд нэвтэрч CDR хуудсыг
--   уншина. Тиймээс Unitel порталаа шинэчилбэл эвдэрч болно — татагч мөр
--   ирээгүй бол ЧИМЭЭГҮЙ 0 бичихгүй, алдаа гарган зогсоно.
--
-- ⛔ Дуудлагын ДУГААР хадгалахгүй — зөвхөн тоо. Хувийн мэдээлэл DB-д оруулахгүй
--   (хэрэгтэй бол порталаас нь харна).
--
-- Нэг мөр = нэг өдөр × нэг цаг. Дахин татахад тэр хугацааны мөрийг УСТГААД
-- шинээр бичнэ (idempotent) — Unitel хожим залруулж болно.
create table if not exists pbx_calls_hourly (
  day        date     not null,
  hour       smallint not null check (hour between 0 and 23),
  calls      int      not null default 0,  -- нийт ирсэн дуудлага
  answered   int      not null default 0,  -- ХҮН авсан (Callee Answer Second > 0)
  talk_sec   int      not null default 0,  -- хүн ярьсан нийт секунд
  fetched_at timestamptz not null default now(),
  primary key (day, hour)
);
create index if not exists pbx_calls_hourly_day_idx on pbx_calls_hourly (day desc);

-- ⚠ «Авсан» = `Callee Answer Second > 0`, өөрөөр хэлбэл ХҮН утсаа авсан.
--   Порталын «Call Status = Answered» гэдэг нь PBX өөрөө авсныг (IVR/дуут
--   мэндчилгээ) хэлдэг тул бараг бүх дуудлагад «Answered» гэж бичигддэг —
--   түүгээр хэмжвэл «99% хариулсан» гэсэн ХУДАЛ тоо гарна.

-- ⛔ anon-д ОГТ нээхгүй (үйл ажиллагааны мэдээлэл).
grant select on pbx_calls_hourly to authenticated;
