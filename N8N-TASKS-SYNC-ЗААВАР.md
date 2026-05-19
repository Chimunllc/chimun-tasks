# n8n Tasks Sync workflow — алхам алхмын setup заавар

**Зорилго:** App дотор үүсгэсэн даалгавар бүгд Google Sheet-д хадгалагдаж, өөр ажилтны утсаар ч нэгэн зэрэг харагдана.
**Хугацаа:** ~10 минут

---

## Шинэ Tasks DB Sheet — аль хэдийн үүсгэгдсэн

**Файл:** [Чимун_Tasks_DB](https://docs.google.com/spreadsheets/d/1dWEAkx2KkIEwfJ3ERmCpWpQF7sxdqyag7hevsv39ZRc/edit)
**Folder:** Чимун_ХХК
**ID:** `1dWEAkx2KkIEwfJ3ERmCpWpQF7sxdqyag7hevsv39ZRc`

Header row аль хэдийн бэлэн (17 багана): `id, title, desc, branch, project, assignee, co_assignees, due, priority, status, kpi_code, createdBy, parent_id, kind, stage, created, updated`

⚠ **Хуучин "Чимун Tasks DB" Sheet** (`1LJkLV48Wus1uo1CJ9lJyhVYBR4E45IdfSLRGIXG8wI0`, хувийн Drive дотор) одоо ХУУЧИРСАН — `parent_id, kind, stage` багана байхгүй. Шилжсэний дараа архивлаж эсвэл устгах.

---

## ❶ Tab нэр rename (30 секунд)

Шинэ Tasks DB-ийг нээж:

1. Доод зүүн буланд "Хуудас1" гэсэн tab нэр харагдана
2. Tab дээр **давхар товшоод** нэрийг солих: **`tasks`**
3. Enter дарах

(workflow-д tab нэр нь `tasks` гэж заасан болохоор.)

---

## ❷ n8n Cloud дотор workflow import

1. https://chimunllc.app.n8n.cloud → нэвтрэх
2. **+ Add workflow** → **Import from File**
3. Файл сонгох: `/Users/munkhuchralganbat/Desktop/web site & app/АПП ЧИМУН ХХК/n8n-workflow-sync.json`

Workflow дотор 12+ node байх ёстой:
```
Webhook GET /checklist  →  ──┐
Webhook POST /checklist →  ──┴→ Route Action → Switch by Action ─┬→ Sheets · Read All → Aggregate → Respond
                                                                  ├→ Sheets · Upsert → Respond Upsert
                                                                  └→ Mark As Deleted → Sheets · Soft Delete → Respond Delete
```

---

## ❸ Google Sheets credential холбох (3 node-д)

Дараах 3 Sheets node бүрийг товшоод **Credential** dropdown-аас `Google Sheets OAuth2 API` (өмнө /staff-д ашигласан) сонгох:

1. **Sheets · Read All**
2. **Sheets · Upsert**
3. **Sheets · Soft Delete**

Save товч дарах хэрэгтэй болж магадгүй.

---

## ❹ documentId + sheetName баталгаажуулах

3 Sheets node бүрд:

- **documentId** = `1dWEAkx2KkIEwfJ3ERmCpWpQF7sxdqyag7hevsv39ZRc` (баксагдсан байх ёстой)
- **sheetName** = `tasks` (баксагдсан)

Хэрэв олдохгүй гэсэн алдаа гарвал → ❶ алхамыг шалга (tab нэр `tasks` болсон уу?). Эсвэл From list dropdown-аас сонгоход боломжтой.

---

## ❺ Execute Workflow туршилт

1. Workflow-ийн **Execute Workflow** товч (▶) дарах — энэ нь executor mode-д ажиллана
2. `Webhook GET /checklist` node дээр (Production URL биш!) **Test URL** хуулах
3. Browser-аас тэр URL-ыг нээх (test URL нь `?action=list` нэмж туршиж болно)
4. Хариу `{"tasks":[]}` гарах ёстой (Sheet хоосон тул хоосон жагсаалт)

---

## ❻ Workflow Active болгож, Production URL хуулах

1. Toggle: **Inactive → Active**
2. `Webhook POST /checklist` node дээр товшоод **Production URL** хуулах:
   ```
   https://chimunllc.app.n8n.cloud/webhook/checklist
   ```
   (Хэрэв өмнө байсан тасксын workflow-ын адил URL гэвэл — хуучин workflow-ыг **Deactivate**, эсвэл устгах)

---

## ❼ App-ын Settings-д URL тавих

1. https://gmunkhuchral-debug.github.io/chimun-tasks/ нээх → CEO PIN 1234
2. **⚙ Тохиргоо** дарах
3. **n8n Webhook URL (data sync)** талбарт тавих:
   ```
   https://chimunllc.app.n8n.cloud/webhook/checklist
   ```
4. **Хадгалах** дарах
5. App автомат reload хийгдэнэ. Доод баруун буланд "n8n холбогдсон" гэж ногоон status харагдах ёстой (өмнө "Локал режим" гэж улбар шар байсан).

---

## ❽ End-to-end test (туршилт)

1. App дотор **+ Шинэ** товч → жижиг туршилт даалгавар үүсгэх (Title: "Sync тест")
2. **Хадгалах** дарах
3. [Tasks DB Sheet](https://docs.google.com/spreadsheets/d/1dWEAkx2KkIEwfJ3ERmCpWpQF7sxdqyag7hevsv39ZRc/edit) нээж шинэчлэх — энэ task шинэ мөрөнд харагдсан байх ёстой
4. App-аас ✓ checkbox дарж done болгох → Sheet-д status="done" болж шинэчлэгдсэн байх ёстой
5. App-аас × устгал товч → Sheet-д status="deleted" гэж soft-delete хийгдсэн байх (мөр устгахгүй, status талбар л өөрчлөгдөнө)
6. Өөр device эсвэл browser-аас app нээж нэвтэрвэл — ижил task харагдах ёстой

---

## ❾ 5-дамжлагат акт sync шалгах (нэмэлт)

1. App дотор **📋 Шинэ захиалга** товч → захиалга үүсгэх (Үйлчлүүлэгч: "Тест", Огноо: маргааш)
2. Sheet-д **6 шинэ мөр** харагдах ёстой:
   - 1 parent (kind: `act_parent`)
   - 5 sub-tasks (kind: `act_stage`, stage: 1-5, parent_id: same id)
3. App-аас D1-ийг ✓ → Sheet-д status="done" болсон байна
4. D2 одоо unlock болсон (lock icon арилсан)

---

## ⓘ Cache + offline behavior

- App нь tasks-ийг localStorage-д кэшэлдэг — internet алга бол сүүлийн mэдэгдэж байсан жагсаалтыг харуулна (Локал режим)
- Online болсон тэр даруйд автомат sync хийгдэнэ
- Conflict resolution: timestamp-based "last write wins" (`updated` багана)

---

## ⓘ Хуучин Tasks DB-г архив хийх

Шилжилт амжилттай болсныг шалгасны дараа:

1. Хуучин Sheet нээх: https://docs.google.com/spreadsheets/d/1LJkLV48Wus1uo1CJ9lJyhVYBR4E45IdfSLRGIXG8wI0/edit
2. File → **Move to trash** (Drive-ын Архив фолдер бий бол тэнд шилжүүлэх)

Эсвэл хуучин task мэдээллийг хадгалахыг хүсэх бол:
- Бүх мөрийг хуулж шинэ Sheet-ийн зөв баганад paste — гэхдээ id-ууд уу `parent_id, kind, stage` талбаргүй учир 5-дамжлагат акт ажиллахгүй

Туршилт болохоор тэр Sheet-ийг архивлахад асуудалгүй.

---

## ⚠ Гацвал

**"Couldn't authenticate":** Credential reconnect. n8n credentials → Google Sheets account → Reconnect.

**"Sheet 'tasks' not found":** ❶ алхамыг шалга. Tab нэр `tasks` (англиар) байх ёстой, `Хуудас1` биш.

**App дотор "Локал режим" хэвээр:** Settings → URL зөв тавьсан уу шалга. Эсвэл browser console-д error харагдаж байж магадгүй.

**Duplicate Sheets node "REPLACE" credentials:** 3 node бүрд credential дахин сонгох ёстой. Save хийсний дараа node бүрд "Test step" дарж тэстлэх боломжтой.

**Tasks save хийгээд Sheet-д харагдахгүй:** Workflow Active эсэхийг шалга. Эсвэл n8n-ийн **Executions** хэсэгт failed execution-ыг хайж олох.

---

Гацвал шууд хэлээрэй.
