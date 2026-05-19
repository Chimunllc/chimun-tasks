# n8n Staff Sync workflow — алхам алхмын setup заавар

**Зорилго:** Master Sheet өөрчлөгдөхөд App дотор автомат шинэчлэгдэх (5 минутын кэш-той).
**Хугацаа:** ~10 минут
**Урьдчилсан нөхцөл:** n8n Cloud account идэвхтэй (`chimunllc.app.n8n.cloud`) + Google Sheets credential тохируулсан байх.

---

## ❶ n8n Cloud нээх

Browser-аас: https://chimunllc.app.n8n.cloud

CEO эрхээр нэвтрэх (хэрэв энэ workflow-уудыг өмнө импорт хийсэн бол нэг л account).

---

## ❷ Workflow import хийх

1. Дээд талын Workflows жагсаалтаас → **Add workflow** товч баруун дээд буланд
2. Дарж дараа эсвэл → **Import from File** сонгох (зарим UI-д эхлээд **+** товч → **Import**)
3. Файлыг сонгох: `/Users/munkhuchralganbat/Desktop/web site & app/АПП ЧИМУН ХХК/n8n-workflow-staff-sync.json`
4. **Import** дарах

4 node-той workflow нээгдэнэ:

```
Webhook GET /staff  →  Sheets · Read Master Roster  →  Map Sheet → TEAM  →  Respond JSON
```

---

## ❸ Google Sheets credential холбох

1. **Sheets · Read Master Roster** node дээр товшоод нээх
2. Доод хэсэгт **"Credential to connect with"** гэсэн талбар — улаан "!" анхааруулга харагдах магадгүй
3. Доош сонгох → **Google Sheets account** (хэрэв өмнөх workflow-уудаас credential байгаа бол сонгох), эсвэл **Create new credential** → Google OAuth-ээр баталгаажуулах

**Анхааруулга:** энэхүү credential нь `ceo@nomaadcamp.com` Workspace account-аар нэвтэрсэн байх ёстой (Master Sheet тэр account-нх).

---

## ❹ Sheet + Tab нэр баталгаажуулах

`Sheets · Read Master Roster` node дотор:

1. **Document** талбар — URL/ID болж "Чимун_ХХК_Ажилтны_бүртгэл_Master" гэсэн нэр харагдах ёстой
   - Хэрэв олдохгүй бол **From list** → Master Sheet-ийг хайж сонгох
   - Эсвэл **By ID** → `1so0IBwfok7_Tss3y25a-40qybGe9SGHimkuXrihuWvM` хуулах
2. **Sheet** талбар — `Хуудас1` гэсэн утга байгаа эсэхийг шалга
   - Хэрэв default нэр нь өөр бол (Sheet1 г.м.) **From list** dropdown-аас сонгох. n8n нь Sheet-ийн бүх tab-ыг автомат жагсаана.

Шинэ Sheet үүсгэхэд Google нь Mongolian Workspace дээр default tab нэрийг "Хуудас1" гэж нэрлэдэг — өөрчлөөгүй бол тэр нэр зөв.

---

## ❺ Workflow execute (туршилт) хийх

1. Workflow дотор дээд талын **Execute Workflow** товч (▶) дарах
2. Доош **Output** хэсэгт `Map Sheet → TEAM` node-ын output харагдах ёстой
3. Output-д:
   ```json
   {
     "team": [
       { "id": "CEO", "name": "Г.Мөнх-Учрал", "role": "CEO", ... },
       ...
     ],
     "count": 13,
     "generated_at": "2026-05-16T..."
   }
   ```
4. **count: 13** (эсвэл 14) гэж харагдаж байх ёстой. Үгүй бол → ❹ алхам дахин шалгах.

---

## ❻ Workflow Active болгох + URL хуулах

1. Workflow-ийн title-ийн ойролцоо дээд буланд → **Inactive → Active** toggle солих
2. Энэ нь webhook идэвхтэй болсон гэсэн үг
3. **Webhook GET /staff** node дээр товшоод → **Production URL** хэсгийн URL-ыг хуулах

URL хэлбэр:
```
https://chimunllc.app.n8n.cloud/webhook/staff
```

---

## ❼ Webhook туршилт (заавал биш, гэхдээ зөв ажиллаж байгаа эсэхийг шалгахад тустай)

Browser-ын address bar-д webhook URL тавиад Enter:

```
https://chimunllc.app.n8n.cloud/webhook/staff
```

Хариу JSON харагдах ёстой:
```json
{"team":[{"id":"CEO","name":"Г.Мөнх-Учрал",...}],"count":13,"generated_at":"2026-05-16T07:..."}
```

Эсвэл terminal-аас:
```bash
curl https://chimunllc.app.n8n.cloud/webhook/staff | python3 -m json.tool
```

---

## ❽ App-ын Settings-д URL тавих

1. Утсаараа эсвэл browser-аар нээх: https://gmunkhuchral-debug.github.io/chimun-tasks/
2. CEO PIN: **1234** оруулж нэвтрэх
3. Дээд баруун буланд **⚙ Тохиргоо** дарах
4. **n8n Staff Webhook URL** талбарт URL тавих: `https://chimunllc.app.n8n.cloud/webhook/staff`
5. **Хадгалах** дарах
6. Page автомат reload хийгдэнэ. Browser console (F12)-д "Staff sync OK: 13 members from Master Sheet" гэж бичигдсэн байх ёстой.

---

## ❾ App дээр шалгах

1. **+ Шинэ** даалгавар нээх
2. **Хариуцагч** dropdown-ийг нээх — Master Sheet дахь 13 хүний нэр харагдах ёстой:
   - CEO Г.Мөнх-Учрал
   - Н.Анужин (Кемпийн менежер)
   - О.Түвдэндаржаа (Туслах нягтлан)
   - И.Алтансүх
   - Г.Сайнжаргал
   - Д.Нинждолгор
   - Б.Пүрэвдавга
   - Д.Баясгалан
   - О.Эрдэнэхүү
   - Хишигтогтох
   - Б.Дэлгэрбат
   - Б.Батжаргал
   - Цэлмэг

Хэрэв бүгд харагдаж байвал sync ажиллаж байна.

---

## ⓘ Цаашид

**Sheet өөрчилөөд app-руу reflect хийх:**
- Sheet-д засвар хийнэ үү
- ~5 минутын дотор автомат update хийгдэнэ (Cache-Control: max-age=300)
- Шууд reflect хийхийг хүсвэл app-ын Settings-ийг нээгээд **Хадгалах** дарах → fresh fetch хийнэ

**Workflow execution monitoring:**
- n8n дотор **Executions** хэсэгт хэн, хэзээ /staff endpoint-ыг дуудсан түүх харагдана
- Алдаа гарвал улаан тэмдэглэгээтэй харагдана — execution дээр товшиж error message-ийг харах

**Webhook URL хадгалалт (хуваалцах ёсгүй):**
- Энэ URL-аар хэн ч staff жагсаалтыг харах боломжтой (тиймээс ZIN code, salary гэх мэт нууц мэдээллийг агуулна)
- URL-ыг ажилтнуудтай хуваалцахгүй — зөвхөн app дотор хадгалагдсан. Гэхдээ app-ын Settings нь ажилтан бүрд харагдах учир тэр URL мэдэгдэх боломжтой.
- Илүү аюулгүй хэрэглэхийн тулд дараа нь `?key=SECRET` нэмэх боломжтой (одоохондоо хэрэгтэй биш — staff sheet хувийн нуцт мэдээлэл багатай)

---

## ⚠ Хэрэв алхам алдсан бол

**"Couldn't authenticate":** Google credential alduluulj байна. n8n credentials → Google Sheets account → Reconnect.

**"count: 0" эсвэл хоосон team:**
- Sheet дотор `Төлөв` багана `идэвхтэй`/`улирлын` биш — `гарсан` / `нээлттэй` бол filter-д орохгүй
- Эсвэл column name-ууд spelling алдаатай. Sheet-ийн header row-ыг шалгаарай.

**"Cannot read property 'ID' of undefined":** Эхний мөр header байх ёстой. Хэрэв header алга бол error гарна.

**404 webhook:** Workflow Active болоогүй байна. ❻ дахин шалгах.

**App дотор шинэ ажилтан харагдахгүй:**
- 5 минутын кэш — Settings-ийг нээж Хадгалах дарах → fresh fetch
- Эсвэл browser console-д "Staff sync failed" гэж байгаа эсэхийг харах
- Workflow execution log-аас алдааг харах

---

Гацвал хэлээрэй, шууд тусална.
