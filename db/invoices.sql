-- ═══════════════════════════════════════════════════════════════════════
-- НЭХЭМЖЛЭХ (invoices) — 2026-09-13
--
-- ЯАГААД: апп үнийн санал ба гэрээ гаргадаг ч НЭХЭМЖЛЭХ гаргаж чаддаггүй
--   байв (хуучин Booqable-ийн нэхэмжлэхийг зөвхөн ХАРУУЛДАГ). Байгууллагын
--   захиалагчид төлбөр хийхийн тулд нэхэмжлэх шаарддаг.
--
-- ⚠ ЭНЭ НЬ НӨАТ-ЫН БАРИМТ БИШ. Татварын баримт (e-barimt) тусдаа системээр
--   гардаг — `vat_receipts` хүснэгтийг үз. Энэ бол ТӨЛБӨРИЙН нэхэмжлэх.
--
-- ГАРААР ажиллуулна (db/-ийн бусадтай ижил).
-- ═══════════════════════════════════════════════════════════════════════

begin;

-- Дугаарыг DB өгнө — хоёр хүн зэрэг гаргахад давхцахгүй.
create sequence if not exists invoice_no_seq start 1;

create table if not exists invoices (
  id          text primary key default ('inv_' || substr(md5(random()::text || clock_timestamp()::text), 1, 10)),
  no          bigint not null unique default nextval('invoice_no_seq'),
  order_id    text,
  order_no    bigint,
  customer_id text,
  issued_at   date default ((now() at time zone 'Asia/Ulaanbaatar')::date),
  due_at      date,
  -- СНАПШОТ: гаргасан үеийн байдал. Захиалга хожим өөрчлөгдсөн ч
  -- ӨГСӨН нэхэмжлэх өөрчлөгдөх ЁСГҮЙ — тиймээс жагсаалт/худалдан авагчийг
  -- энд хөлдөөж хадгална, захиалгаас дахин уншихгүй.
  buyer       jsonb not null default '{}'::jsonb,
  lines       jsonb not null default '[]'::jsonb,
  totals      jsonb not null default '{}'::jsonb,
  total       numeric,
  status      text default 'issued',   -- issued | paid | void  (ХАТУУ УСТГАХГҮЙ)
  note        text,
  created_by  text,
  created_at  timestamptz default now()
);

create index if not exists invoices_order_idx    on invoices (order_id);
create index if not exists invoices_customer_idx on invoices (customer_id);

commit;

-- anon-д ОГТ нээхгүй (худалдан авагчийн нэр, РД, дүн).
grant select, insert, update on invoices to authenticated;
grant usage on sequence invoice_no_seq to authenticated;
-- delete ЗОРИУД алга: буруу гаргасан нэхэмжлэхийг `status='void'` болгоно.
notify pgrst, 'reload schema';
