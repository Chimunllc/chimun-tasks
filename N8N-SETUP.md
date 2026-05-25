# n8n тохиргооны гарын авлага

Энэ файл нь Чимун Tasks PWA-н бүх n8n workflow-уудыг жагсааж, дэлгэрэнгүй тохируулах заавартай.

## 🗂 Бүх workflow-уудын жагсаалт

| # | URL Path | Зориулалт | JSON файл |
|---|---|---|---|
| 1 | `POST /checklist` | Task CRUD (sync) | `n8n-workflow-sync.json` |
| 2 | `GET /staff` | TEAM roster (бүх ажилтан) | `n8n-workflow-staff-sync.json` |
| 3 | `POST /staff-register` | Шинэ ажилтны хүсэлт + Drive selfie upload | `n8n-workflow-staff-register.json` |
| 4 | `POST /staff-update` | CEO ажилтан гарсан/идэвхтэй тэмдэглэх | `n8n-workflow-staff-update.json` |
| 5 | `POST /staff-approve` | CEO бүртгэлийн хүсэлт зөвшөөрөх/татгалзах | `n8n-workflow-staff-approve.json` |
| 6 | `POST /finance` | Санхүүгийн хүсэлт | `n8n-workflow-finance.json` |
| 7 | `POST /weekly-digest` | CEO-д долоо хоногийн тойм email | `n8n-workflow-weekly-digest.json` |

---

## 🎯 Settings → app-д тохируулах URL-ууд

Аппын Settings → Advanced хэсэгт:

| Талбар | Үнэлгээ |
|---|---|
| **n8n Webhook URL** (apiUrl) | `https://chimunllc.app.n8n.cloud/webhook/checklist` |
| **n8n Staff Webhook URL** | `https://chimunllc.app.n8n.cloud/webhook/staff` |
| **n8n Finance Webhook URL** | `https://chimunllc.app.n8n.cloud/webhook/finance` |
| **n8n Upload Webhook URL** | `https://chimunllc.app.n8n.cloud/webhook/upload-receipt` |

Бусад endpoint-уудыг апп өөрөө **path-ыг сольж** дуудна:
- `/staff-register` ← `registerUrl` (constant `DEFAULT_REGISTER_URL`)
- `/staff-update` ← `staffUrl`-ын сүүлийн path-ыг солино
- `/staff-approve` ← `staffUrl`-ын сүүлийн path-ыг солино
- `/weekly-digest` ← `apiUrl`-ын сүүлийн path-ыг солино

---

## 📋 Master Sheet — Бүх багана

Google Sheet: `1so0IBwfok7_Tss3y25a-40qybGe9SGHimkuXrihuWvM`, tab GID: `451955481`

**Ажилтны хуудас** (бүх дараах баганууд байх ёстой):

| Багана | Тайлбар |
|---|---|
| ID | M01, C07 г.м. CEO тохируулна |
| Овог нэр | Б.Энх |
| Албан тушаал | Кемп туслах |
| Бүлэг | M Event / Camp / Удирдлага |
| Утас | 99112233 |
| И-мэйл | name@example.com |
| PIN | 4 оронтой тоо |
| Зэрэглэл | 40/60/80/100 |
| РД | АБ12345678 |
| Гэрийн хаяг | бүтэн хаяг |
| Яаралтай нэр | "Эх — Долгормаа" |
| Яаралтай утас | 99887766 |
| Зургийн URL | Drive линк (selfie) |
| Төлөв | идэвхтэй / гарсан / хүлээж буй / татгалзсан |
| Хүсэлтийн ID | REQ_xxx (системийн) |
| Хүсэлт өгсөн | timestamp |
| Орсон огноо | YYYY-MM-DD |
| Гарсан огноо | YYYY-MM-DD |
| Цалин | сар бүрийн ₮ |
| CEO тэмдэглэл | дотоод |
| Зөвшөөрсөн | CEO ID |
| Зөвшөөрсөн огноо | timestamp |
| Татгалзсан | CEO ID |
| Татгалзсан огноо | timestamp |
| Татгалзах шалтгаан | text |

---

## 🚀 Эхлэхийн өмнө

1. **Google Sheets credential** n8n-д тохируулсан байх (`googleSheetsOAuth2Api`)
2. **Google Drive credential** (zурагтай ажиллахад)
3. **Gmail credential** (weekly-digest email-д)
4. **Sheet-д шинэ багана нэмэх** (дээрх жагсаалт)
5. **Drive folder** нь `Anyone with link can view` (selfie preview-д)

---

## 1️⃣ POST /checklist — Task sync

**App дуудах:**
- `GET /checklist?action=list` → бүх task буцаана
- `POST /checklist` body `{ action: 'upsert'|'delete', task }` → бичих

**Workflow:** `n8n-workflow-sync.json`
**Sheet tab:** Tasks tab (өөр GID байна)

---

## 2️⃣ GET /staff — Team roster

**App дуудах:** `GET /staff?t=<ts>` (cache-bust)

**Хариу формат:**
```json
{
  "team": [
    { "id":"M01", "name":"...", "role":"...", "pin":"1111", "phone":"99112233", "email":"...",
      "branches":["m-event"], "status":"идэвхтэй", "level":60, "left_at":null, "joined_at":null }
  ],
  "count": 13,
  "generated_at": "2026-..."
}
```

**Шаардлагатай:**
- `гарсан` статустайг ✅ үлдээх (CEO Staff Management-д харагдах)
- `нээлттэй` (бичигдээгүй позиц)-ыг ❌ хасах
- "Удирдлага" → `shared` branch mapping

**Workflow:** `n8n-workflow-staff-sync.json`

---

## 3️⃣ POST /staff-register — Шинэ хүсэлт + Selfie upload

**App илгээх:**
```json
{
  "name":"Б.Энх", "role":"...", "group":"Camp",
  "phone":"99112233", "email":"...", "pin":"4321",
  "rd":"АА12345678", "address":"УБ, ...",
  "photo":"data:image/jpeg;base64,/9j/...",
  "emergency_name":"...", "emergency_phone":"...",
  "status":"хүлээж буй", "requested_at":"2026-..."
}
```

**N8n хийх:**
1. Photo-г base64-аас decode хийж Google Drive folder руу upload
2. File нэр: `Овог_Нэр_Утас.jpg` (Жишээ: `Болд_Энх_99112233.jpg`)
3. **Drive folder ID:** `1yNTOivF-wBoSVrx5MHj8X0kQY-YZsl6G`
4. Sheet-д шинэ мөр append — Зургийн URL талбартай
5. Хариу: `{ ok, request_id, photo_url }`

**Workflow:** `n8n-workflow-staff-register.json`

---

## 4️⃣ POST /staff-update — Гарсан/Сэргээх

**App илгээх:**
```json
{
  "action":"update_status", "id":"M03", "status":"гарсан",
  "left_date":"2026-05-25", "joined_date":"",
  "requested_by":"CEO", "timestamp":"2026-..."
}
```

**N8n хийх:** Sheet-д ID-аар олж `Төлөв`, `Гарсан огноо`, `Орсон огноо` багануудыг шинэчилнэ.

**Workflow:** `n8n-workflow-staff-update.json`

---

## 5️⃣ POST /staff-approve — Хүсэлт зөвшөөрөх/татгалзах

**App илгээх (approve):**
```json
{
  "action":"approve_registration", "request_id":"REQ_xxx",
  "assigned_id":"C07", "salary":"1500000", "level":40,
  "notes":"...", "status":"идэвхтэй",
  "approved_by":"CEO", "approved_at":"2026-..."
}
```

**App илгээх (reject):**
```json
{
  "action":"reject_registration", "request_id":"REQ_xxx",
  "status":"татгалзсан", "rejected_by":"CEO", "rejected_at":"2026-..."
}
```

**N8n хийх:** Sheet-д `Хүсэлтийн ID`-аар row олж дараах баганыг шинэчилнэ:
- approve: ID, Төлөв, Цалин, Зэрэглэл, CEO тэмдэглэл, Орсон огноо, Зөвшөөрсөн, Зөвшөөрсөн огноо
- reject: Төлөв, Татгалзсан, Татгалзсан огноо, Татгалзах шалтгаан

**Workflow:** `n8n-workflow-staff-approve.json`

---

## 6️⃣ POST /finance — Санхүүгийн хүсэлт

Үндсэн санхүүгийн CRUD endpoint. (Одоо ажиллаж байгаа — өөрчлөлт хэрэггүй.)

**Workflow:** `n8n-workflow-finance.json`

---

## 7️⃣ POST /weekly-digest — Долоо хоногийн email

**App илгээх:**
```json
{
  "type":"weekly_digest",
  "stats": { "period":{...}, "tasks":{...}, "finance":{...}, "by_staff":[...] },
  "requested_by":"ceo@nomaadcamp.com"
}
```

**N8n хийх:** HTML email формат + Gmail/SMTP-ээр илгээнэ.

**Workflow:** `n8n-workflow-weekly-digest.json`

---

## 🔐 CORS

Бүх webhook-д `allowedOrigins: "https://chimunllc.github.io"` тавьсан.

Локал тестлэх бол үүнийг `*` болгож OR Chrome-аас CORS саатуулагдсан message харагдвал устгана.

---

## ✅ Шалгах list

- [ ] Бүх 7 workflow import хийсэн
- [ ] Бүгд `Activate` хийгдсэн
- [ ] Master Sheet-д бүх багана нэмэгдсэн
- [ ] Google Drive folder share зөв
- [ ] Gmail/SMTP credential бэлэн
- [ ] App-н Settings-д URL зөв тохируулсан
- [ ] PIN-ээр нэвтрэн тест хийсэн
- [ ] Шинэ ажилтан бүртгүүлж тестлэх
- [ ] CEO хянах modal-аас зөвшөөрч тестлэх
- [ ] Гарсан → сэргээх тестлэх
- [ ] Долоо хоногийн тойм email явуулж тестлэх

---

## 📞 Алдаа гарвал

n8n workflow execution log → алдаатай step олно. Сонгож "Settings" → "Execution data" → debug.

Sheet column нэр буруу бол → "schema refresh" (3 цэг → Refresh) хийх.
