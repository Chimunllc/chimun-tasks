# Google Sheets → Postgres шилжих төлөвлөгөө

_Боловсруулсан: 2026-06-18 · Чимун ХХК дотоод систем_

---

## 1. Дүгнэлт (эхэнд)

**Яаралтай биш — мөрийн тоо хязгаараас хол хол байна.** Гэхдээ хийх нь зөв,
учир нь Sheets-ийн жинхэнэ эрсдэл нь хэмжээ биш, **зэрэг бичилт** (чиний аль
хэдийн тулгарсан "appendOrUpdate gotcha").

Хамгийн чухал ойлголт: **Sheets→Postgres шилжихэд n8n-ийн hosting-ийг хөндөх
шаардлагагүй, апп болон сайтуудыг ч өөрчлөхгүй.** Зөвхөн n8n workflow доторх
"Google Sheets" node-ийг "Postgres" node-оор солино. Бусад бүх зүйл хэвээр.

---

## 2. Одоогийн өгөгдлийн хэмжээ (хэмжсэн, 2026-06-18)

| Sheet / tab | Файл | Мөрийн тоо (ойролцоо) | Бичилтийн эрчим |
|---|---|---|---|
| MEVENT_Orders_DB · orders | 67 KB | ~30–50 захиалга | Дунд (сайт+апп) |
| MEVENT_Orders_DB · products | (мөн) | 249 бараа | Бага (ихэвчлэн унших) |
| Чимун_Tasks_DB · tasks | 30 KB | ~150–250 ажил | **Өндөр** (өдөр тутам) |
| Чимун_Tasks_DB · evaluations / fin_categories | (мөн) | хэдэн арав–зуу | Бага–дунд |
| Master · ажилтан | 13 KB | ~30 ажилтан | Бага |
| nomaad_quote_log | 31 KB | ~30–40 үнийн санал | Дунд |

> Файл томрсон нь мөрөөс биш — захиалгын `items_json`, quote-ийн `raw_json` зэрэг
> том JSON блобоос. Жинхэнэ мөрийн тоо **бүгд хэдэн зуугаар** хэмжигдэж байна.
> (Тодорхой тоог Sheet тус бүрийн доод буланд харж болно.)

---

## 3. "Хэзээ шилжих вэ" — тоогоор

**Sheets-ийн хязгаар:**
- Хатуу хязгаар: 10 сая нүд / spreadsheet → ~21 баганатай захиалгад ~476,000 мөр. **Олон жилийн зайтай.**
- Бодит удаашрал: нэг tab **~10,000–50,000 мөрөөс** мэдрэгдэж эхэлдэг.
- API квот: ~60 хүсэлт/мин/хэрэглэгч, ~300/мин/төсөл.

**Чиний хувьд жинхэнэ ойрын тааз — мөр БИШ:**

1. **Зэрэг бичилтийн эвдрэл** (аль хэдийн тулгарсан) — хэрэглэгч олшрох тусам нэмэгдэнэ.
2. **API rate limit (429)** — апп 45 секунд тутам poll хийдэг. 20–30 хэрэглэгч зэрэг ажиллавал минутын квотад ойртоно.

**Шилжих гох (аль нэг тохиолдвол):**
- [ ] Зэрэг бичилтээс мөр дарж бичих/алдах дахин гарвал
- [ ] Апп `429`/quota алдаа өгч эхэлбэл
- [ ] Аль нэг tab **10,000 мөр** давбал
- [ ] Аппын ачаалал тогтмол **2–3 сек+** удаашрах

> Дүгнэлт: **энэ улирлын дотор аажмаар, эрсдэлгүй сайжруулалт** болгож хийх нь зөв
> (зэрэг бичилтийн алдааг үүрд засна). Гэхдээ "яаралтай" биш.

---

## 4. Хамгийн чухал — хоёр шийдвэрийг салга

Өмнөх ярианд **n8n-ийн hosting** ба **өгөгдлийн сан** хоёр холилдсон. Энэ хоёр
бие даасан:

| Асуудал | Шийдэл | Апп/сайт хөндөх үү |
|---|---|---|
| Sheets эрсдэлтэй (зэрэг бичилт, масштаб) | Sheets → **Postgres** | **Үгүй** |
| n8n cloud үнэтэй болж магадгүй | n8n → **self-host** | Тийм (URL солих) |

**Жинхэнэ эрсдэл = өгөгдлийн сан.** Үүнийг n8n дотор засна — hosting, апп, сайтыг
огт хөндөхгүй. Self-host бол тусдаа, сонголттой, дараа ярих асуудал.

---

## 5. Хамгийн бага эрсдэлтэй арга — "n8n дотор node солих"

Чиний архитектур үүнд маш тохиромжтой: **апп бүр өгөгдлийг webhook-аар авдаг.**
Тиймээс webhook-ийн ард Sheets уу, Postgres уу — апп мэдэхгүй. Алхам:

1. **Postgres босгох.** Зөвлөмж: **Supabase** (managed Postgres, үнэгүй tier 500MB —
   чиний өгөгдөл одоо <1MB). Backup, шинэчлэлт тэдэн дээр → ops дарамтгүй.
   (Эсвэл VPS дээр өөрөө host хийж болно — гэхдээ managed нь дарамтгүй.)
2. **Схем үүсгэх** (доор §6) — нэг удаа.
3. **Одоогийн өгөгдлийг нэг удаа backfill** (Sheets → Postgres) — скрипт би бичнэ.
4. **n8n workflow бүрд** "Google Sheets" node-ийг **"Postgres" node**-оор солих
   (n8n-д native Postgres node бий). Webhook, response хэлбэр хэвээр.
5. **Нэг workflow-оор нэг нэгээр** солиж тест. Апп ямар ч өөрчлөлт мэдрэхгүй.

**Rollback хялбар:** node-оо буцааж Sheets руу залгахад л болно. Sheets-ийг хэдэн
долоо хоног зэрэг бичээд (dual-write) баталгаажуулж болно.

---

## 6. Postgres схем (Sheets tab → хүснэгт)

```sql
-- M-EVENT захиалга
create table orders (
  order_no      text primary key,
  created_at    timestamptz default now(),
  status        text not null default 'Шинэ',
  customer_name text, phone text, address text, email text,
  company text, register text,
  date_start timestamptz, date_end timestamptz, days int,
  subtotal numeric, deposit numeric, total numeric,
  note text, source text, assigned_to text, task_id text
);
create table order_items (         -- items_json-г задлав (хайлт/тайлан хялбар)
  id bigserial primary key,
  order_no text references orders(order_no) on delete cascade,
  name text, qty numeric, price numeric, deposit numeric
);

-- M-EVENT бараа
create table products (
  id text primary key, sku text, name text, category text,
  all_categories jsonb, type text,
  price numeric, deposit numeric, stock int,
  photo text, description text,
  archived boolean default false, updated_at timestamptz default now()
);

-- Даалгавар (цөм)
create table tasks (
  id text primary key, title text, description text,
  branch text, project text,
  assignee text, co_assignee text,
  due_date date, priority text, status text,
  kpi_code text,                 -- ажлын чанарын ★ үнэлгээ энд хадгалагддаг
  created_by text, source_id text, type text, stage text,
  created_at timestamptz default now(), updated_at timestamptz,
  task_photo text, completion_photo text, requires_photo boolean
);

-- Ажилтан (утас = түлхүүр)
create table employees (
  phone text primary key,        -- personKey
  name text, reg_no text, position text, branch text, level int,
  emergency_contact text, phone2 text, email text, pin text,
  status text, home_address text,
  hired_at date, left_at date, base_salary numeric,
  kpi_codes text, jd_link text, photo text, note text,
  employee_type text, bank text, account_no text, account_holder text
);

-- NOMAAD үнийн санал
create table quotes (
  quote_no text primary key, created_at timestamptz,
  company text, reg_no text, contact text, phone text, email text,
  camp text, package text, guest_count int,
  date_start timestamptz, date_end timestamptz,
  total numeric, deposit30 numeric, pdf text, note text,
  counter int, status text, sent_at timestamptz,
  addons text, transport text,
  raw jsonb,                     -- raw_json энд
  meeting_date date, discount numeric, meeting_note text,
  final_amount numeric, contract_signed_date date, location text,
  income_deposit numeric, income_balance numeric, income_extra numeric,
  income_damage numeric, income_date date, income_by text
);

-- Бусад tab-ууд: finance, evaluations, fin_categories, hourly_ratings,
-- checklist — мөн адил зарчмаар (дараа дэлгэрэнгүй).
```

**Sheets-ээс илүү давуу тал:** индекс (хурд), гадаад түлхүүр (бүрэн бүтэн байдал),
транзакц (зэрэг бичилт аюулгүй), `jsonb` (JSON блобыг шууд хадгалж бас query хийнэ).

---

## 7. Шилжих дараалал (нэг нэгээр, downtime-гүй)

Бага эрсдэлтэйгээс эхэлж, цөм рүү:

1. **Туршилт — M-Event products** (ихэвчлэн унших, эрсдэл бага) → загвар батлах.
2. **M-Event orders** (зэрэг бичилтийн gotcha-г энд үүрд засна).
3. **NOMAAD quotes**.
4. **Цөм — tasks** (хамгийн өндөр бичилт, хамгийн чухал).
5. **employees, finance, evaluations** — үлдсэн.

Алхам бүр: backfill → n8n node солих → нэг workflow тест → батлагдвал дараагийнх.
Аль нэг алхам гацвал зөвхөн тэр модуль Sheets дээрээ үлдэнэ, бусад нь яваад байна.

---

## 8. Өртөг ба хугацаа

| Зүйл | Өртөг | Хугацаа |
|---|---|---|
| Supabase (managed Postgres) | **₮0** (үнэгүй tier, <500MB) | — |
| Схем + backfill скрипт | (би хийнэ) | ~0.5 өдөр |
| n8n node солих + тест (модуль тус бүр) | (би+чи) | ~1–2 цаг × ~10 = 2–3 өдөр зэрэгцээ |
| **Нийт** | **бараг ₮0** | **~1 долоо хоног, хэсэгчлэн** |

Апп, сайт, n8n hosting — **огт хөндөхгүй.** Downtime 0.

---

## 9. Зөвлөмж (прагматик)

1. **Одоо:** яаралтай зүйл алга. Sheets дээрээ үргэлжлүүл.
2. **Энэ улиралд:** Supabase босгож, **эхлээд products + orders-ийг** Postgres руу
   шилжүүл (зэрэг бичилтийн алдааг үүрд засна). Үлдсэнийг ачааллаар нь.
3. **n8n self-host** — энэ migration-аас **тусдаа**, зөвхөн execution квот үнэхээр
   дарамт болоход ярь. Хоёрыг хольж нэг дор бүү хий.
4. Шийдвэр гаргахын тулд эхлээд n8n cloud дашбордоос **execution тоо** болон апп дээр
   **429/quota алдаа гарч байгаа эсэхийг** хар — энэ хоёр л жинхэнэ "цаг боллоо" дохио.

---

_Дараагийн алхам бэлэн болбол: Supabase төсөл нээх → схемийг ажиллуулах → backfill
скриптийг бичих. Эхэлвэл гэж хэлэхэд бүгдийг хөтлөн хийе._
