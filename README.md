# M Event · Checklist App

Жижигхэн, Asana шиг checklist app. M Event багт зориулсан.

- **Frontend:** Цэвэр HTML + JS (нэг файл, build хэрэггүй)
- **Backend:** n8n + Google Sheets (`tasks` хүснэгт)
- **Notifications:** Апп доторх мэдэгдэл (client-side, бүтэн офлайн ажиллана)
- **Hosting:** GitHub Pages (үнэгүй)

---

## Юу багтаж байгаа вэ?

```
index.html                       ← аппликейшн өөрөө
n8n-workflow-sync.json           ← Tasks → Google Sheets data sync workflow
n8n-workflow-finance.json        ← Санхүүгийн хүсэлт + баримт upload workflow
n8n-workflow-staff-sync.json     ← Master Sheet → app /staff endpoint workflow
n8n-workflow-staff-register.json ← Шинэ ажилтан бүртгэл workflow
README.md                        ← энэ файл
```

App нь 2 горимтой:

1. **Локал режим** — `index.html`-г browser дээр нээхэд шууд ажиллана. Data зөвхөн тухайн browser-д хадгалагдана. (Туршихад тохиромжтой.)
2. **n8n sync режим** — Settings → n8n Webhook URL оруулсан үед бүх багийн data Google Sheet дээр хадгалагдана. Холболт тасрахад өөрчлөлт локалд хадгалагдаж, сэргэхэд автоматаар sync хийгдэнэ.

---

## 📋 5-дамжлагат акт template (M Event-ийн гол урсгал)

M Event салбарт `📋 Шинэ захиалга` товчоор нэг товчоор бүхэл захиалгын урсгалыг үүсгэнэ. Дараах 5 sub-task автоматаар үүсэх ба өмнөх дамжлага дуустал дараагийнх нь идэвхгүй (lock) байна.

| Дамжлага | Үүрэг | Default хариуцагч | Due огноо |
|---|---|---|---|
| **D1** | Акт үүсгэх + захиалгын мэдээлэл | Захиалгын ажилтан (Ш.Шижирсаран) | Event-ээс 7 хоногийн өмнө |
| **D2** | Тоног төхөөрөмж бэлдэх + тест | Засвар-Агуулахын ахлах (Б.Пүрэвдавга) | Event-ээс 1 хоногийн өмнө |
| **D3** | Газар дээр хүргэх + setup | Агуулах-Логистик (Д.Баясгалан) | Event-ийн өдөр |
| **D4** | Буцаалт + цэвэрлэгээ + чанарын шалгалт | Цэврэлгээ (Хишигтогтох) | Event-ээс 1 хоногийн дараа |
| **D5** | Бүртгэл хаах + санхүүгийн бүртгэл | Нярав (Д.Нинждолгор) | Event-ээс 2 хоногийн дараа |

**Логик:**
- 5 sub-task бүгд дуусахад парент захиалга **автоматаар "Дууссан"** болно
- Алхам алгасаж болохгүй (D3-г D2-гүйгээр дуусгах боломжгүй)
- Хариуцагч нь өөрийн дамжлагынхаа карт + парент-ыг харна (бусад хүний дамжлагыг харахгүй)
- CEO бүх 5 дамжлагыг нэгэн зэрэг харна

---

## 1-р алхам — App-аа эхлэн туршиж үзэх (5 минут)

GitHub-гүй ч ажиллана:

1. `index.html` файлыг **double-click**.
2. Browser нээгдэнэ. 5 жишээ даалгавар харагдах ёстой.
3. Зүүн доод буланд "Би хэн бэ?" → өөрийгөө сонгоно.
4. "+ Шинэ даалгавар" дарж нэмж үзнэ үү.
5. Чек тэмдэглэх, засах, устгах нь ажиллана.

> Энэ нь зөвхөн чиний browser дээр data хадгална. Бусад хүнтэй хуваалцахад дараах GitHub + n8n алхмууд хэрэгтэй.

---

## 2-р алхам — GitHub дээр оруулах

GitHub бол кодоо хадгалдаг газар, GitHub Pages нь түүнийг үнэгүй вэб болгон хост хийдэг.

### А. GitHub account үүсгэх

1. https://github.com/signup → email + password
2. Username сонгох (жишээ нь: `m-event`, `mevent-mongolia`)
3. Email баталгаажуулна

### Б. Шинэ repository үүсгэх

1. Орой баруун буланд `+` → **New repository**
2. Repository name: `m-event-checklist`
3. **Public** сонгоно (GitHub Pages үнэгүй ажиллахын тулд)
4. **Add a README** сонгох ШААРДЛАГАГҮЙ (бид өөрсдийнхөө нэмнэ)
5. **Create repository** дарна

### В. Файлуудыг upload хийх (хамгийн амархан арга)

1. Шинээр үүссэн repo хуудсан дээрх **"uploading an existing file"** дарна
2. Бүх файлыг (`index.html`, `README.md`, `n8n-workflow-*.json`, icon-ууд, `manifest.json`, `sw.js`) чирж тавина
3. Доод талд **Commit changes** товч дарна

### Г. GitHub Pages идэвхжүүлэх

1. Repo дотор → **Settings** табыг сонгох
2. Зүүн талд → **Pages**
3. **Source** → "Deploy from a branch"
4. **Branch** → `main` сонгоод `/ (root)` → **Save**
5. 1-2 минут хүлээгээд дээд талд `Your site is live at https://USERNAME.github.io/m-event-checklist/` гэж гарна

Тэр URL-аа багийн хүмүүст явуулна. Бүгд нээгээд ашиглаж эхэлнэ.

> **Анхаар:** Энэ үе шатанд app ажиллаж байгаа ч data зөвхөн тухайн browser-д хадгалагдсаар байна. Data хуваалцахын тулд n8n тохируулах ёстой.

---

## 3-р алхам — n8n + Google Sheets backend

### А. Google Sheet бэлдэх

1. https://sheets.google.com → шинэ хүснэгт үүсгэх
2. Нэр өгөх: `M Event Tasks`
3. Эхний sheet-н нэрийг `tasks` болгох (доор зүүн талаас)
4. Эхний мөрөнд багана нэрс бичих:

   ```
   id | title | desc | branch | project | assignee | due | priority | status | kpi_code | createdBy | parent_id | kind | stage | created | updated
   ```

   **Багана тус бүрийн утга:**
   - `branch` — `m-event` / `camp` / `store` / `shared` / `production`
   - `kpi_code` — `K01`–`K04` эсвэл хоосон (KPI-той холбогдсон даалгавар бол)
   - `createdBy` — даалгаврыг үүсгэсэн хүний ID (hierarchical delete check-д ашиглана)
   - `parent_id` — 5-дамжлагат актын sub-task бол парент task-ийн ID, бусад үед хоосон
   - `kind` — `act_parent` (парент захиалга), `act_stage` (1 дамжлага), хоосон (энгийн даалгавар)
   - `stage` — 1–5 (act_stage үед), хоосон (бусад үед)

   > **Хуучин Sheet-тэй бол:** одоо байгаа `tasks` хүснэгтийн баруун талд `parent_id`, `kind`, `stage` гэсэн 3 шинэ багана нэмэхэд хангалттай. Хуучин мөрүүд хоосон утгатай үлдэх ба энгийн даалгавраар ажиллана.

5. URL-аас Sheet ID-г хуулж авна. URL-н хэлбэр:
   `https://docs.google.com/spreadsheets/d/SHEET_ID_ХЭСЭГ_ЭНД/edit`

### Б. n8n дээр workflow import хийх

1. n8n нээх → дээр баруун буланд **`...`** → **Import from file**
2. `n8n-workflow-sync.json` сонгох → Import
3. Workflow дотор:
   - **Sheets · Read All / Upsert / Delete** node бүр дээр дарж `documentId` талбарт өөрийн Sheet ID-г оруулна
   - Google Sheets credentials шинээр холбоно (anh oauth) — n8n-ий заавар дагана
4. Дээр баруун буланд **Active** toggle-г асаана
5. **Webhook /checklist** node дээр дарж URL-г хуулна (Production URL). Энэ URL дараа хэрэгтэй.

### В. App-д Webhook URL оруулах

1. Browser-аас `https://USERNAME.github.io/m-event-checklist/` нээх
2. Дээр баруун буланд **⚙ Тохиргоо**
3. **n8n Webhook URL** хэсэгт дөнгөж хуулсан URL-г тавьж **Хадгалах**
4. Доод баруун буланд "n8n холбогдсон" гэж гарвал амжилттай.

Одоо багийн бүх хүмүүс ижилхэн тохиргоог хийсэн үед нэг ижил data харна.

---

## Мэдэгдэл (notification)

Мэдэгдэл нь **аппын дотор** (client-side) үүсдэг тул тусдаа workflow болон тохиргоо шаардахгүй. Апп хариуцагчид оноогдсон шинэ даалгавар, хугацаа хэтрэлт, өнөөдөр дуусах ёстой ажил, дамжлага идэвхжсэн зэргийг хонхны дүрсээр харуулна. Энэ нь офлайн ч ажиллана.

---

## Багтаа танилцуулах

Багийн хүмүүст явуулах зурвасны жишээ:

> Сайн уу, өнөөдрөөс эхлэн checklist энд хийе:
> https://USERNAME.github.io/m-event-checklist/
>
> Эхний удаа ороод "Би хэн бэ?" доороо өөрийгөө сонгоорой.
> Тохиргоо → энэ webhook-г оруул: `https://your-n8n.../webhook/checklist`
> Дараа нь даалгаваруудыг хамт хийж эхэлнэ. ✅

---

## Тогтвортой ажиллуулах зөвлөгөө

- **Mobile дээр:** GitHub Pages URL-г утсаараа нээгээд "Add to Home Screen" хийнэ. App шиг ажиллана.
- **Олон төсөл:** Зүүн талаас "+ Шинэ төсөл" дарж нэмнэ. Жишээ нь "2026 6-р сарын хурим", "Хятад худалдан авалт" гэх мэт.
- **Backup:** Google Sheet өөрөө автоматаар хадгалагддаг. Тооцоолохдоо File → Make a copy сар бүр.
- **Хандах эрх хязгаарлах:** Public GitHub Pages бүгд хардаг (URL мэдэх ёстой). Илүү аюулгүй болгох бол n8n webhook дээр Header Auth тавьж, app-д ч мөн ижил key оруулна.

---

## Асуудал гарвал

| Асуудал | Шийдэл |
|---|---|
| App нээгдэнэ, гэхдээ "Локал режим" гэж гарч байна | Тохиргоо → Webhook URL зөв оруулсан эсэхийг шалга. n8n workflow-г Active болгосон уу? |
| n8n дээр "Authorization required" гэж гарна | Google Sheets credentials дахин холбоно уу? |
| Mongolia үсэг гажиж харагдах | UTF-8 BOM. `index.html`-г UTF-8 encoding-оор хадгалах. |

---

Хийсэн: Cowork mode (Anthropic Claude). Бичсэн: 2026/05.
