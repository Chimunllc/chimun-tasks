-- ═══════════════════════════════════════════════════════════════════════
-- УНШИГЧИЙН ДУУДЛАГЫН ХАРАГДАЦ (2026-10-09)
--
-- `tools/plan_measure.py` (Claude санаачлагын үр дүнг хэмждэг) нь `data_reader`
-- үүргээр ЗӨВХӨН уншдаг. Дуудлагатай холбоотой санаачлага («буцаж залгах») хэмжигдэх
-- боломжгүй байсан тул дуудлагын бүртгэлийг УТАСГҮЙгээр нээнэ.
--
-- ⛔ Утас (`peer`) ГАРАХГҮЙ — оронд нь `caller` = md5(утас + нууц давс). Давс нь
--    `reader_salt` хүснэгтэд, `data_reader` уншиж чадахгүй (харагдац эзний эрхээр
--    уншина) — тиймээс хашаас утсыг тааж чадахгүй, гэхдээ «хэдэн өөр хүн» тоолж болно.
-- ⛔ Ажилтны утас (`by_key`), тэмдэглэл (`note`) ОРОХГҮЙ.
-- ГАРААР ажиллуулна. ДАХИН ажиллуулж болно.
-- ═══════════════════════════════════════════════════════════════════════

create table if not exists reader_salt (salt text not null);
insert into reader_salt (salt)
  select md5(random()::text || clock_timestamp()::text) where not exists (select 1 from reader_salt);
revoke all on reader_salt from public, anon, authenticated;
revoke delete on reader_salt from authenticated;

create or replace view v_pbx_calls_safe as
  select c.started_at, c.direction, c.ext, c.answer_sec, c.call_sec,
         md5(c.peer || s.salt) as caller
  from pbx_calls c cross join (select salt from reader_salt limit 1) s;

create or replace view v_pbx_callbacks_safe as
  select md5(b.peer || s.salt) as caller, b.status, b.tries, b.upto, b.updated_at
  from pbx_callbacks b cross join (select salt from reader_salt limit 1) s;

revoke all on v_pbx_calls_safe, v_pbx_callbacks_safe from public, anon, authenticated;
grant select on v_pbx_calls_safe, v_pbx_callbacks_safe to data_reader;

notify pgrst, 'reload schema';

-- ── Шалгах ──────────────────────────────────────────────────────────────
-- set role data_reader; select count(*), count(distinct caller) from v_pbx_calls_safe; reset role;
