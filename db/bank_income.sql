-- Хуулгын бүртгэл (ямар хуулга орсон) + орлогын мөр (мөнгө бүр хаана хамаарав).
-- Гараар ажиллуулна:  psql -U chimun -d chimun -f db/bank_income.sql
--
-- ЯАГААД: зардал нь хуулгаас бүртгэгддэг ч ОРЛОГО нь зөвхөн захиалгаас бүртгэгддэг байв.
-- Тиймээс (1) ямар хуулга орсныг апп мэдэхгүй, (2) захиалгад холбогдоогүй орсон мөнгө
-- хаана ч үлддэггүй байсан. Эдгээр 2 хүснэгт тэр хоёр цоорхойг хаана.
begin;

create table if not exists bank_statements (
  id             text primary key,        -- <данс>|<эхлэх>|<дуусах>  (дахин оруулахад ОРЛУУЛНА)
  acct           text not null,
  ccy            text not null default 'MNT',
  period_from    date,
  period_to      date,
  file_name      text,
  opening        bigint,                  -- хуулгад бичигдсэн эхний үлдэгдэл
  closing_stated bigint,                  -- хуулгад бичигдсэн эцсийн үлдэгдэл
  closing_calc   bigint,                  -- opening + орлого − зарлага
  credit_total   bigint not null default 0,
  debit_total    bigint not null default 0,
  row_count      int    not null default 0,
  imported_by    text,
  imported_at    timestamptz not null default now()
);
create index if not exists bank_statements_acct_idx on bank_statements (acct, period_from);

create table if not exists bank_income (
  fp          text primary key,            -- IN-<данс>-<дүн>-<огноо>-<нэр>-<дугаар>
  stmt_id     text,
  acct        text,
  dt          date,
  amount      bigint not null,
  payer       text,
  payer_acct  text,
  memo        text,
  status      text not null default 'open',  -- open|order|nomaad|internal|other
  link_type   text,
  link_id     text,
  note        text,
  decided_by  text,
  decided_at  timestamptz,
  created_at  timestamptz not null default now()
);
create index if not exists bank_income_dt_idx     on bank_income (dt);
create index if not exists bank_income_status_idx on bank_income (status);

-- Эрх: ЗӨВХӨН нэвтэрсэн ажилтан. anon-д ОГТ нээхгүй (хэн хэдэн төгрөг төлснийг агуулна).
grant select, insert, update, delete on bank_statements to authenticated;
grant select, insert, update, delete on bank_income     to authenticated;

commit;
