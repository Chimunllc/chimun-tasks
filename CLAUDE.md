# CLAUDE.md — Claude-д зориулсан санах ой

> Энэ нь хүнд зориулсан README биш. Claude (Cowork туслах) шинэ сесс эхлэх бүрд
> энэ аппыг тэгээс судлахгүйн тулд бичсэн дотоод тэмдэглэл. Богино, үнэн зөв байлгана.
> Хэрэглэгчид харагдах баримт биш — кодын дэргэдэх тохиргооны файл.

## Хэн юунд ажиллаж байна

- Хэрэглэгч: Чимун ХХК / nomaadcamp-ийн CEO (ceo@nomaadcamp.com).
- Хөгжүүлэгч баг, агентлаг ашигладаггүй — **бүх кодыг AI агентаар (Cowork/Claude Code) бүтээдэг**.
- Claude бол түүний туслах. Хүн хөгжүүлэгчийн оронд ажиллана.

## Апп — "Чимун ХХК · Дотоод даалгавар"

Компанийн дотоод даалгавар / ажлын урсгалын менежментийн PWA. Байршил: repo-гийн үндэс (root).

- **Frontend:** нэг файлын `app.js` (~22,700 мөр) + `index.html` + `styles.css`. Build систем байхгүй.
- **Backend (2026-06-28 шинэчлэв):** **бүх дата өөрийн Contabo VPS дээр** (n8n + Postgres + PostgREST + Caddy, `n8n.nomaadcamp.com`). Google Sheets БА Supabase cloud-аас БҮРЭН гарсан. Дэлгэрэнгүй: ↓ "2026-06-28 МИГРАЦ".
- **PWA:** service worker, Web Push (VAPID), офлайн ажиллагаа.
- **Чадвар:** роль/эрх, PIN нэвтрэлт, санхүүгийн хүсэлт, KPI, 5-дамжлагат "акт" урсгал, аппын доторх + push мэдэгдэл, **захиалгын самбар (Booqable, CEO)**.
- **Hosting:** GitHub Pages.
- **⚠ mevent.mn сайт нь ӨӨР repo:** `Chimunllc/m-event-website-ready` (нэг файлын `index.html` ~257KB + `products.json`). Сайтын алдаа энэ репод БАЙХГҮЙ — тусад нь clone/PR хийнэ.

### ⭐ 2026-06-28 МИГРАЦ — бүх дата VPS Postgres-д (доорх ХУУЧИН хэсгүүдийг дарна)
> Доорх "M-Event захиалга", "Барааны зураг — Supabase Storage", "Түрээсийн түүх" зэрэг хэсгүүд нь Google Sheets/Supabase cloud гэж бичсэн — **ХОЦРОГДСОН**. Бодит байдал:
- **Дата = VPS Postgres `chimun` DB** (Contabo 62.146.232.100). Sheets ч, Supabase cloud ч ХЭРЭГЛЭХГҮЙ.
- **Унших:** апп `SUPABASE_URL='https://n8n.nomaadcamp.com/db'` (Caddy `/db/rest/v1/*`→PostgREST), `SUPABASE_ANON_KEY`=VPS anon JWT. Tasks/finance/staff/nomaad = n8n webhook-оор (бүгд Postgres). products/bq_* = PostgREST шууд.
- **Бичих:** anon grant (Supabase-тэй адил) — products/bq_orders(status,total_paid)/bq_payments/nomaad_payments.
- **Захиалга = ЗӨВХӨН Booqable** (M-Event давхарга цуцлагдсан). `unifiedOrders()` зөвхөн `state.bqOrders`. `loadOrders` no-op. M-Event функцууд (`openNewMeventOrder`/`orderCardHtml`/`openOrderPaymentModal`/`renderOrdersBoard`/`reconcileOrders`) ҮХСЭН КОД — хүрэлцэхгүй. Захиалгын карт=`bqOrderCard` (төлбөр/гаргах/буцаах/скан). `openOrderScanModal` Booqable-аар.
- **Зураг:** хуучин 228 = VPS Caddy (`n8n.nomaadcamp.com/img/`). Шинэ upload = base64 data URL (products.photo-д). Supabase Storage ХЭРЭГЛЭХГҮЙ.
- **Файл (нэхэмжлэх/ажлын зураг):** Google Drive-д ХЭВЭЭР (n8n→Drive, `driveThumbUrl`/lh3). Supabase-тэй хамаагүй.
- **⚠ VPS:** SSH=агентын `claude-chimun-migration` түлхүүр. CORS gotcha: Caddy `header_down`-ийг `caddy reload` БИШ, зөвхөн `docker compose restart caddy` хэрэгжүүлдэг. VPS root нууц үг чатад ил болсон → солих. Дэлгэрэнгүй memory: [[project_vps_selfhost]], [[project_booqable_history]].

### M-Event захиалга (backoffice эхлэл, 2026-05-31)
- M-Event түрээсийн сайт (`chimunllc.github.io/m-event-website-ready`) захиалгыг хүлээж авах backoffice.
- **Архитектур шийдэгдсэн:** website дээр админ БАЙХГҮЙ — бүх админ Чимун апп дотор, admin (CEO) эрхээр. Бараа/захиалга Google Sheets-д амьдарна.
- **Дата:** `MEVENT_Orders_DB` Sheet id `1MxI9jkC06XyNNzyW2nsSNpH8CUKL9GlHDzVHwA65MR8`, tab `orders` (21 багана: order_no, status, customer_*, items_json, total, assigned_to, task_id...). MEVENT Drive фолдер: `1-zJ7OM1uEVb04JCptvJgbYh4VawN5b_c`.
- **n8n workflow:** `MEVENT · Site order capture` (POST /webhook/m-event-site-order, id `YGrBDw0wZ7O9xMPW`) — сайт → Sheet append. `MEVENT · Orders API (read+update)` (id `9Jh8Qw2XYJwzH9Ho`) — GET /webhook/mevent-orders унших, POST статус/хариуцагч шинэчлэх. Auth: app.js webhook key `1YP4RCfL...`.
- **App код:** `state.orders`, `loadOrders`, `renderOrders`, `updateOrderStatus`, view `orders` (зөвхөн CEO). config `ordersUrl`.
- **Захиалгын самбар UI (2026-06-23 шинэчлэв):** менежерийн харагдац = анхаарлын чипүүд (батлах хүлээж буй / өнөөдөр хүргэх / идэвхтэй + сарын түрээс) + статус шүүлтүүр таб (`ORDER_PHASES`: new/prep/deliver/done/cancelled) + хайлт + Жагсаалт⇄Самбар(kanban) toggle. Карт = `orderCardHtml` (stepper `orderStepper`, яаралтай тэмдэг `orderUrgency`, эвхэгддэг бараа, холбоотой даалгавар). Статус удирдлага хамгаалагдсан: урагшлуулах=`data-order-advance` нэг товч, буцаах/цуцлах=⋯ кебаб (`showConfirm`-тэй) — хуучин чөлөөт `<select>`-ийг сольсон. Шүүлт төлөв: `state.ordersFilter`/`ordersView`/`ordersSearch`. `renderOrdersBoard` board харагдац. Зөвхөн frontend.
- **Бараа backoffice (2026-05-31):** `products` tab (sheet id мөн `1MxI9jkC...`), 249 бараа seed хийсэн. n8n `MEVENT · Products API (read+upsert)` (id `t8JsCudKPGKtP0KW`): GET /webhook/mevent-products (сайт + апп уншина, bare array буцаана), POST бараа нэмэх/засах. **Merge-safe:** POST үед эхлээд Sheet уншиж байгаа мөртэй merge хийдэг — хэсэгчилсэн засвар (зөвхөн үнэ) бусад талбарыг хоослохгүй. Setup workflow: `MEVENT · setup products tab` (id `uO2UJFdT2pNnMgdX`, tab үүсгэх, дахин хэрэггүй). App: `state.products`, `loadProductsCatalog`, `saveProduct`, `renderProducts`, view `products`, config `productsUrl`. Сайт: `CONFIG.PRODUCTS_URL` (live), `loadProducts` нь products.json-ийг fallback болгоно.
- **Барааны зураг — Supabase Storage (2026-06-23 шилжүүлсэн):** Бараа бүрийн `photo` өмнө Booqable CDN (`content.booqablecdn.com`) линк байсныг **Supabase Storage** руу шилжүүлэв (Booqable-аас бүрэн салах). 228 unique зураг (`data booqable/product-images/<photo_id>.jpg` локал backup) → **`product-images` public bucket** (project `pydgnbzntldpzzjhtaal`). Шинэ URL: `https://pydgnbzntldpzzjhtaal.supabase.co/storage/v1/object/public/product-images/<photo_id>.jpg`. Лайв Sheet `photo` багана (248) + сайтын `products.json` хоёуланг bulk merge-safe POST-оор шинэчилсэн (0 Booqable үлдсэн). Зураг хадгалах эх загвар: photo_id-аар нэрлэнэ.
- **Аппаас зураг upload (2026-06-23):** Шинэ барааны форм (`newProductFormHtml`)-д "📷 Зураг оруулах" товч → `uploadProductImage(file)` нь зургийг `resizeImageToBase64`-аар шахаж Supabase Storage `product-images` bucket-д **anon key**-ээр шууд upload хийж public URL-г `photo`-д оруулна. Тогтмол: `SUPABASE_URL`, `SUPABASE_ANON_KEY` (PUBLIC, frontend-safe — service_role БИШ), `PRODUCT_IMAGE_BUCKET`. **Storage policy:** anon-д `product-images` bucket-д INSERT+UPDATE зөвшөөрсөн (`storage.objects` RLS). **Эрсдэл:** anon key public тул bucket-д хэн ч зураг upload хийж болно (зураг 10MB+mime хязгаартай, эрсдэл бага). Илүү хатуу бол n8n proxy (service_role сервер талд) болгож болно. Postgres-ийн `service_role`-д `GRANT ... ON ALL TABLES IN SCHEMA public` олгосон (PostgREST-ээр засах боломжтой болгох). **service_role түлхүүрийг rotate хийх ёстой** (чатад орсон).
- **Агуулах/хөрөнгө — "Түрээслэх боломжтой" чагт (2026-06-23):** Барааны хэсэг = агуулах/хөрөнгийн бүртгэл. **`type` талбар** ялгана: `rental`(эсвэл хоосон)=түрээсийн, `asset`=Чимун ХХК-ийн дотоод хөрөнгө. `isRentable(p)` = `type!=='asset'`. Аппын барааны мөр + шинэ барааны формд "Түрээслэх" чагт (чагт→rental, чагтгүй→asset). Шүүлтүүр таб: Бүгд/Түрээсийн/Хөрөнгө (`state.prodFilter`). **Сайт (`loadProducts`) зөвхөн `type!=='asset'` барааг харуулна** — хөрөнгө сайтад харагдахгүй. Шинэ багана/backend хэрэггүй (одоо байгаа type ашигласан). Үнэ оруулаагүй шинэ бараа = asset болговол сайтад 0₮-өөр харагдахгүй (менежер үнэ оруулаад чагтлахад л гарна). Жишээ: K3-ACTIVE/KS28-ACTIVE (Lase Sound, нэгж өртөг ~5сая₮) asset-ээр нэмсэн, түрээсийн үнэ хүлээж буй.
- **Барааны UI (2026-06-23 дахин зохиомж):** `productRowHtml` = АВСААРХАН, харах зориулалттай мөр (нэр, ангилал/SKU, ашиглалт+ROI, 💰 нэгж өртөг, үнэ/нөөц/төрөл badge) → дартал `openProductModal(p)` нээгдэнэ (нэмэх/засах нэгдсэн модал). Inline input/`newProductFormHtml` хасагдсан. `submitProductModal`: каталог→Sheet (`saveProduct`), өртөг→Supabase Postgres (`saveProductCost`, PostgREST PATCH anon key-ээр). **ROI/өртөг (2026-06-23):** `loadProductCosts` нь Postgres `products.cost`-ийг anon SELECT-ээр уншиж `state.productCosts`(sku→cost). `productUtilization(name)` орлого; ROI%=revenue/(cost×stock). Хөрөнгийн нийт үнэ цэнэ толгойд. **Booqable-аас 205 барааны өртөг backfill хийсэн** (~218сая₮, `default_purchase_cost_in_cents`). Каталог Sheet-д, өртөг Postgres-д (миграцийн дундах hybrid). Өртөг засахад anon UPDATE policy шаардана.
- **Анхаарах (n8n appendOrUpdate gotcha 2):** defineBelow-д БҮХ багана map хийвэл дутуу талбар '' болж жинхэнэ мөрийг хоослоно. Хэсэгчилсэн засвар хийх бол эхлээд Sheet уншиж merge хий (Products API-д хийсэн).
- **Захиалгын гүйцэтгэлийн урсгал (2026-06-23 шинэчлэв — төлбөрийн алхам нэгтгэв):** Шинэ (эвент ажилтан үүсгэв эсвэл сайтаас) → нягтлан/CEO "💵 Төлбөр авах" дарна → **төлбөрийн модал** (`openOrderPaymentModal`/`submitOrderPayment`): дүн + төрөл (бүтэн/урьдчилгаа) + хэлбэр (данс/бэлэн/карт) + огноо → баталгаажуулмагц **status=Төлбөр авсан** + **3 даалгавар автоматаар** үүснэ (Түрээс бэлдэх, Цэвэрлэгээ, Хүргэлт; branch m-event, project event, эзэн=Эвент менежер) → Эвент менежер ажилтан хуваарилна. **Хуучин «Баталсан» статус хасагдсан** (төлбөр авах = захиалга батлах нэг алхам болов; өмнө "Гүйлгээ амжилттай"→Баталсан ба нягтлан→Төлбөр авсан гэсэн 2 давхар алхам байсан). `normalizeOrder` нь хуучин дата дахь «Баталсан»-г «Төлбөр авсан» болгож буудна. **Төлбөрийн дэлгэрэнгүй (paid_amount/type/method/date/ref)** одоогоор `note` дотор `⟦PAY|дүн|төрөл|хэлбэр|огноо|гүйлгээний_утга⟧` токеноор кодлогдоно (хямдрал/НӨАТ кодлодогтой ижил арга; `parsePayment`/`encodePaymentNote`/`stripPaymentNote`, `cleanOrderNote` нь токеныг нууна; ref-д `|⟦⟧` цэвэрлэгдэнэ) — backend багана нэмэхгүйгээр ажиллана. **`paid_ref` = банкны гүйлгээний утга** — нягтлан төлбөр бүртгэх үед банкнаас ЯГ хуулна (үйлчлүүлэгчид захиалгын дугаар бичдэггүй, "ITZONE -SHIREE SANDAL-нэр" гэх мэт эмх замбараагүй бичдэг тул). Картад 🔖-ээр харагдана. **Банкны тулгалт (2026-06-23 хийсэн):** Захиалга дотор "📊 Тулгалт" горим (`state.ordersRecon`). Голомтын дансны хуулга (.xlsx/.csv) оруулна → `statementFileToMatrix` (xlsx-д SheetJS jsdelivr-ээс lazy-load, SW cross-origin дамжуулна) → `parseStatement` (толгойн мөрийг автоматаар олно: «Гүйлгээний огноо | утга | Харьцсан дансны нэр | данс | Ханш | Орлого | Зарлага»; огноо ISO `...T...`, footer/огноогүй мөр алгасна) → `reconcileOrders` (Орлого=ирсэн мөрийг paid_ref/нэр/дүн/огноогоор тулгана, score≥3) → 4 хуваарь: ✓баталгаажсан/⚠дүн зөрүүтэй/❓дансанд алга/💰захиалгагүй орлого (`renderReconcilePanel`). AI-гүй, frontend дангаар — утга банкнаас яг хуулагдсан тул шууд таарна. Engine нь бодит Голомт файлаар тестлэгдсэн. **Дараагийн (сонголттой):** AI нөхөлт (Claude API, зөвхөн таараагүй мөрд, n8n); тулгасан төлбөрийг verified болгож тэмдэглэх persist. Мөн сонголт: MEVENT_Orders_DB-д paid_* багана нэмж n8n-д map → цэвэр хадгалалт + санхүүгийн орлоготой холбох. "💵 Төлбөр авах"/"✎ төлбөр засах" зөвхөн нягтлан/CEO-д. "✎ Засах" зөвхөн Шинэ төлөвт. `orderToWire` нь paid_* талбарыг мөн илгээдэг (багана нэмэгдэхэд шууд persist).
- **Үнийн санал — монгол + АНГЛИ (2026-08-29):** `openOrderQuote(oid, lang)` нь баримт (PDF эх) + имэйлийн их биеийг ХОЁР хэлээр зэрэг үүсгэнэ (`MEV_QUOTE_T.mn` / `.en` толь). Popup-ийн toolbar-т «🇬🇧 English ⇄ 🇲🇳 Монгол» toggle — сонгосон хэл нь PDF, имэйлийн гарчиг/их бие, файлын нэр бүгдэд мөрдөгдөнө (`QD[CUR]`, webhook-д `lang` талбар нэмж илгээнэ). Дата (барааны нэр, албан тушаал, хүргэлтийн тэмдэглэл) орчуулагдахгүй; аппын товч/сануулга ажилтанд зориулагдсан тул монголоороо. EN-д гүйлгээний утга = `Order N` (MN-д `Захиалга N`).
- **20% хямдрал:** 2+ хоног түрээслэвэл түрээсийн дүнгээс 20% (апп форм + сайт хоёуланд). НӨАТ хасах чагт = түрээсээс −5%.
- **Давхар захиалга сэргийлэх (availability, 2026-06-23):** `availabilityFor(name,start,end,excludeOrderNo)`={stock,booked,avail}. `bookedQtyForRange` нь огноо давхцах ИДЭВХТЭЙ захиалгуудын (`_ORDER_OCCUPYING`: Шинэ→Хүргэсэн) item тоог нэрээр (case-insensitive `_normProdName`) нэмнэ; Буцаан ирсэн/Дууссан/Цуцалсан=чөлөөтэй. `productStockByName` (null=каталогт алга). `orderShortages`=over-booked жагсаалт. Захиалгын формд (`updateAvail`) мөр бүрт "✓/⚠ N сул"; хадгалахад баталгаажуулна; төлбөрийн модалд (сайтын захиалга) анхааруулна. Frontend дангаар.
- **Дараагийн ажил:** бараа архивлах UI; тестийн мөр (`ME-20260531-062727`) устгах; MEVENT_Orders_DB-г MEVENT фолдер руу зөөх + давхардсан sheet устгах (хэрэглэгч гараар).

### Түрээсийн түүх — Booqable аналитик (2026-06-23)
- Booqable-ийн 2024–2026 БҮРЭН түрээсийн түүхийг (1354 захиалга, 1941 төлбөр, 3375 захиалгын мөр, 4149 хуваарь, 245 бараа, 1288 харилцагч) Supabase Postgres-ийн **`bq_*` read-only хүснэгт** + **`bq_v_*` аналитик view** болгон оруулав (project `pydgnbzntldpzzjhtaal`). Орлогын үнэн эх = `bq_payments` (charge−refund, succeeded_at). **Цэвэр орлого ~668сая₮.** Booqable бол ГАРАХ систем — энэ нь түүхэн дата, амьд биш.
- **Апп:** CEO-only view `booqable` ("Түрээсийн түүх"). `loadBooqable` нь 7 view-г PostgREST anon SELECT-ээр **lazy** татна (статик тул polling-д ОРООГҮЙ; `bq_v_product_roi` нь `.catch(()=>[])`-тэй tolerant). `renderBooqable` 4 таб: **Орлого** (KPI + 📌`bqInsights` автомат дүгнэлт банер + сар бүрийн bar + `bqSeasonChart` улирлын дундаж + төлбөрийн хэлбэр) / **Бараа·ROI** (`bq_v_product_roi`-аас ROI×=орлого÷өртөг, 🟢≥3/🟡1-3/🔴<1 + "Анхаарах: ROI<1" хэсэг; view байхгүй бол хуучин жагсаалтаар fallback) / **Харилцагч** / **Ашиглалт**. `state.booqable`/`bqTab`. `bqInsights`: YoY өсөлт (дуусаагүй сарыг хасч өнгөрсөн оны мөн сартай), топ5/топ10 төвлөрөл, царцсан хөрөнгө, оргил улирал.
- **Дата урсгал:** `data booqable/full-export-<TODAY>/` (download_all_fresh.py, Booqable API v4) → `postgres-migration/bq_gen.js` → `bq_02..07_*.sql` (500мөр/statement batched upsert, id-аар дедуп — lines export-д ~24% давхардал бий). `bq_01_schema.sql`(хүснэгт+view), `bq_08_product_roi.sql`(ROI view) — DDL зөвхөн SQL Editor-т RUN. **Ачаалал:** `bq_load.js` (PostgREST bulk upsert, `SUPABASE_SERVICE_KEY` env, локалд — томруу SQL хуулахгүй) ЭСВЭЛ bq_02..07 SQL гараар. **Дараалал: 01(схем)→bq_load.js эсвэл 02-07(дата)→08(ROI view).** 2026-06-23-нд live ачаалсан (173 ROI бараа, 8 царцсан хөрөнгө).
- **Захиалга — бүгд НЭГ нэгдсэн жагсаалт (2026-06-23):** Booqable UI-аас БҮР МӨСӨН халж, M-Event(идэвхтэй) + Booqable түүх(1354) НЭГ жагсаалтад нэгтгэв (toggle БИШ, филтерээр). `unifiedOrders()`: M-Event → `orderCardHtml` (interactive workflow), Booqable түүх → `bqOrderCard` (read-only, аппын `order-card` CSS-ээр ЯГ адил). **Төлвийн badge (2026-06-23 UI/UX):** `BQ_STATUS` = 6 Booqable төлөв ТУСДАА (Ноорог/Захиалсан/Эхэлсэн/Дууссан/Архивласан/Цуцалсан), `bqStatusBadge`=цэг+бараан текст pill (WCAG AA, өнгөнд бус текст+цэгээр). M-Event карт өөрийн badge хэвээр; шүүлтэд `meStatusKey`-ээр 6-ийн нэгэнд буулгана (`e.skey`). **Шүүлт:** төлөв таб (Бүгд + 6 төлөв логик дараалал, нэгдсэн тоо, сонгогдсон=тод) + **он-сар dropdown** (`state.ordersYM`) + хайлт(нэр/утас/имэйл/дугаар) → шүүсэн бүрд "N захиалга · нийт X₮". Жагсаалт 200-аар cap (нийлбэр бүгдээр); kanban=зөвхөн M-Event. `loadBooqableOrders`/`loadBooqableOrderItems`→`state.bqOrders`/`bqOrderItems` (lazy). **SQL:** `bq_09_orders.sql` + `bq_10_contact.sql` (харилцагчийн утас 1057/имэйл/хаяг backfill `properties.phone`/`main_address`/`delivery_address`-ээс, bq_v_orders+bq_v_order_items view). Booqable нэр UI-д АЛГА.
- **Салбар таб (#4, 2026-06-23):** "🏢 Салбар" таб = компанийн орлого 2 салбараар. **Бизнесийн бүтэц (хэрэглэгч баталсан):** ① M-Event/Booqable = эвентийн түрээс (нэг салбар, Booqable хуучин backend, M-Event шинэ front-door, 2026-06-д ердөө 10 захиалга, харилцагч давхцдаг тул Booqable+M-Event-ийг НЭМЭХГҮЙ), ② NOMAAD = кемп (тусдаа салбар). **Орлого/зарлага салбар бүрд тусдаа, агуулах НЭГ дундын** (нийт барааг 2 салбар хуваан ашигладаг). Таб: 2 KPI (Эвент=Booqable цэвэр vs Кемп=NOMAAD `income_amount` нийлбэр) + сүүлийн 12 сар зэрэгцсэн багана. Зөвхөн frontend (bq view + `state.nomaadOrders`). NOMAAD кемп 2026-06-д ~148-166сая (эвентийн June-ээс их).
- **⚠ АЮУЛГҮЙ БАЙДАЛ:** repo PUBLIC + GitHub Pages app.js-ийг нийтэд server хийдэг тул anon key **үргэлж public**. `bq_01_schema`-ийн `grant select to anon`-аар `bq_v_revenue_by_customer` (харилцагчийн нэр+орлого) RUN хийсний дараа **нийтэд queryable** болно. Дата backfill (bq_02–07) PII тул **gitignore** (commit-д ОРОХГҮЙ, локалд RUN). Хатуу болгох сонголт: харилцагчийн view-г anon-аас хасах / нэр нуух, эсвэл n8n proxy (service_role сервер талд).

### NOMAAD захиалга аппд орох төлөв (2026-06-19 шинэчлэв)
- Аппын NOMAAD жагсаалт `/webhook/nomaad-orders` (n8n id `2z4L2lJtTL5fRzG4`, "Shape" Code node)-оор Quote Log-оос татна. **АНХААР: webhook нь БҮХ төлөвийг буцаадаг** (ИЛГЭЭСЭН/ГЭРЭЭ/ДУУССАН/БОЛЬСОН/АПП-д нэмэх г.м. — 2026-06-19-нд live дата шалгаж тогтоов; хуучин "зөвхөн АПП агуулсан" тэмдэглэл ХОЦРОГДСОН). Тиймээс статус солих (update_quote) нь захиалгыг webhook-оос унагахгүй.
- **Цуцалсан зохицуулалт:** `renderNomaadOrders` (жагсаалт) ба `renderNomaadCalendar` нь `nomaadIsCancelled(o)` (БОЛЬСОН/Цуцл) -ээр шүүж **цуцалсныг нуудаг**. Pipeline-д "Больсон" шатанд (эвхэгдсэн) хэвээр. Sidebar badge ч цуцалсныг хасна.
- **Үнийн санал устгах** = статусыг `БОЛЬСОН` болгоно (`deleteNomaadQuote`, зөвхөн урьдчилгаа/орлогогүй үед) → дээрх цуцалсан-шүүлтээр жагсаалтаас алга (hard delete биш, Quote Log-д түүх үлдэнэ).
- **Шатын нэршил (2026-06-19):** Шинэ → Үнийн санал илгээсэн → **Баталгаажуулалт хүлээж буй** (статус `БАТАЛГААЖУУЛАЛТ`→`confirming`; амаар тохирсон, гэрээ хүлээж буй) → Урьдчилгаа төлсөн → Гэрээ хийгдсэн → Гүйцэтгэсэн → Больсон. `NOMAAD_STAGES`/`NOMAAD_STATUSES`/`nomaadStage`.
- Quote Log: `16pHiShilnG-QdZtc2ciB5JeP_aslZRcqpQqEJvD-0wA`.

### NOMAAD арга хэмжээний бэлтгэл (2026-06-10, нэгтгэсэн)
- NOMAAD картын **"📋 Бэлтгэл"** ганц товч → нэгдсэн модал 2 хэсэгтэй: **(1) Үйл ажиллагааны чеклист** (`NOMAAD_PREP_CHECKLIST`, 30 ажил, зүйл бүрд 1 ажил) + **(2) Захиалгын бараа** (`o.items` түрээсийн эд, хүнээр бүлэглэж 1 ажил/хүн). Хуучин 2 товч ("Бэлтгэл үүсгэх" + "Ажил хувиарлах") давхцаж байсныг 2026-06-10-нд нэгтгэв (`openNomaadAssign`/`sendNomaadAssignments` устсан).
- Загвар = **30 ажил, 11 бүлэг** (Хог, Ариун цэвэр, Ус, Тайз/гэрэл, Хоолны асар, Хоол, Майхан, Цахилгаан, Гал, Нэмэлт захиалга, Тайлан) — хэрэглэгчийн Excel-ээс импортлосон (2026-06-10). Засах бол `NOMAAD_PREP_CHECKLIST` array.
- Товчоор гараар үүсгэнэ (авто биш). Модалд зүйл бүрт хүн сонгож болно (**хоосон = хариуцагчгүй**, дараа хувиарлана — өөрт оноохгүй). Аль хэдийн үүссэн ажлыг таниж "✓ үүссэн" гэж алгасна (давхардахгүй). Гарчиг `prepTaskTitle(c)` — модал/үүсгэх ижил (idempotent). Бичилт await биш арын гинжээр (UI гацахгүй). Үүсгэх: branch=camp, due=арга хэмжээний өдөр (date_start), requires_photo=true, priority=high, deadline ("09:00-аас өмнө") гарчигт. createdBy=менежер → гүйцэтгэл/чанарын системд автоматаар орно (удирдлагаас өгсөн + зурагтай баталгаажих + чанар үнэлэгдэх).

### Глобал салбар ленз (2026-06-16, үргэлжилж буй)
- Толгойн **`#branch-lens`** сонгогч (Бүгд / M-Event / NOMAAD Camp) → `state.branchLens` (localStorage). `effectiveBranchLens()`: хоосон бол хэрэглэгчийн салбар (нэг салбартай бол түүгээр, CEO/2 салбартай бол 'all'). `setBranchLens(v)`.
- **Ленз = тухайн салбар + нэгдсэн (shared)** хоёуланд. `filteredTasks`-д шүүгдэнэ (task жагсаалт бүгд) + Тойм (`renderDashboard`). 
- **Дагасан:** task жагсаалтууд, Тойм. **Дараагийн (хийх):** Санхүү/Ажилтан лензэд захируулах, Календарь, Гүйцэтгэл, Цагийн цалин (одоо Санхүү+Ажилтан зөвхөн салбараар БҮЛЭГЛЭГДСЭН, лензэд шүүгддэггүй). Аяндаа нэг салбарынх: NOMAAD захиалга/M-Event захиалга/Бараа.

### Санхүүгийн салбар (dept_branch) дүрэм (2026-06-16)
- **Зардлын салбар = хүсэлт илгээсэн хүний салбар.** `createFinanceRequest`: ажилтан өөрөө илгээвэл `dept_branch`=өөрийн салбар автоматаар (форм сонголтыг үл хэрэгсэнэ); нягтлан/CEO (role /нягтлан/ эсвэл level≥100) өмнөөс оруулбал формоор сонгосон.
- **Хөрөнгийн зардал (ангилал 6000) → ҮРГЭЛЖ "Чимун ХХК"** тайлан/жагсаалт/утганд (`finEffBranch`) — хадгалсан салбараас үл хамаарна (салбарын OPEX-оос хасна). Салбар сонгогчид "Чимун ХХК (хөрөнгө)" код `ХХК` бий.
- 2026-06-16: хуучин 140 хүсэлтийн ангилал (утгаар) + 47 хүсэлтийн салбар (дүрмээр) bulk засав.

### Санхүү салбар-засах эрх (self-service, 2026-06-17)
- Тусгай ажилтнуудад **бүх санхүүгийн гүйлгээг ХАРАХ + зөвхөн САЛБАРЫГ нь засах** эрх (бусад бүх зүйл read-only — дүн/ангилал/батлах/төлөх/устгах БОЛОХГҮЙ).
- **Эрх олгох газар:** Ажилтны удирдлага → хүн бүрийн доор **"🏦 Санхүү: салбар засах эрх"** чагт (зөвхөн CEO харна/тааруулна). `saveFinanceBranchPerm(key,name,grant)`.
- **Хадгалалт:** Master Sheet хөндөхгүйгээр **`fin_categories` tab-д** `type='fin_branch_perm'`, `code=personKey`(утас), `active=1/0` мөрөөр. `loadFinanceCategories` нь ангилалтай хамт уншиж `state.finBranchPerms` (Set) болгоно. POST нь fin-categories endpoint руу (upsert by code).
- **Шалгалт:** `isFinanceBranchEditor(key)` = CEO эсвэл finBranchPerms.has(key). Тайлан (`renderFinanceReport`) editor-т бүх гүйлгээ; модал (`openFinanceModal`) editor-т `f-accountant-only` хэсгийг харуулж зөвхөн `f-dept-branch`-ийг идэвхжүүлж авто хадгална (ангилал disabled).
- 2026-06-17: О.Түвдэндаржаа, И.Алтансүх, Н.Анужин, Г.Сайнжаргал, Б.Дэлгэрбат-д урьдчилан олгов (CEO аль хэдийн эрхтэй).

### Санхүүгийн ангилал — Sheet-ээс татна (2026-06-16)
- Үндсэн/дэд ангилал (`FINANCE_MAIN_CATEGORIES`/`FINANCE_SUB_CATEGORIES`) одоо **`let`** — `loadFinanceCategories()` нь **n8n `/webhook/fin-categories`** (workflow id `syQBuTvHE9H4Gssk`, "CHIMUN · Finance Categories API")-оос татаж орлоно. Татаж чадахгүй бол кодын default → localStorage кэш fallback (апп эвдрэхгүй). Эхлэлд `loadFinanceCategories()` дуудна.
- **Хадгалалт:** Чимун_Tasks_DB (`1dWEAkx2KkIEwfJ3ERmCpWpQF7sxdqyag7hevsv39ZRc`) дотор **`fin_categories` tab**. Багана: `type` (main/sub), `code`, `name`, `parent` (дэдийн үндсэн код), `active` (0=нуух). 64 мөр seed хийсэн.
- **Засах:** CEO Sheet-д шууд мөр нэмж/нэр засаж/`active`=0 болгоно → апп дараагийн ачаалалд авна. (n8n GET унших + POST seed/append; CORS=*.)
- Кодын `const FINANCE_*_CATEGORIES` нь зөвхөн default/fallback.

## Урт хугацааны зорилго

Энэ аппыг **компанийн бүрэн ERP** болгон ургуулах. Одоо ERP-ийн ~30% хэмжээнд (цөм
чиглэл — даалгавар/урсгал — ~90%). Дутуу: санхүү бүртгэл, цалин, агуулах, худалдан авалт.
Стратеги: цөм урсгалаа өөрөө бүтээх, "хатуу дүрэмтэй" модулиудыг (нягтлан, татвар, цалин)
бэлэн системд даатгах эсэхийг хэрэглэгчтэй ярих.

### Identity түлхүүр (2026-06-02)
Ажилтны дотоод түлхүүр = **утасны дугаар** (`personKey(m)` = phone digits ‖ email ‖ name).
Өмнө нь email байсан ч и-мэйлгүй ажилтан (цагийн ажилтан)-д хоосон болж, хүсэлт буруугаар
CEO-д онооддог байсан. Sheet-д НЭР хадгална (хүн уншихад). `findMember(key)` нь утас/email/нэрээр
resilient хайдаг. `emailToName`/`nameToEmail` (toWire/fromWire seam), getCEOEmail,
getFinanceExecutorEmail, findMemberEmailByRole, getFinanceApprover, member picker-ууд бүгд
personKey буцаана/ашиглана. `state.me === t.assignee` гэх мэт харьцуулалт бүгд phone===phone.
**Үлдсэн gap:** staff-update webhook (Хугацаа сунгах/Гарсан) мөрийг `email`-ээр тааруулдаг —
и-мэйлгүй ажилтанд sync хийгдэхгүй (backend засвар хэрэгтэй).

## Git — зөвшөөрөл асуухгүй (2026-08-28)

- Хэрэглэгч **commit + push-ыг урьдчилан зөвшөөрсөн**. Ажил дуусмагц асуухгүйгээр
  `npm test` → commit → push хий. "Push хийх үү?" гэж бүү асуу.
- Push зөвхөн **өөрийн ажлын салбарт**. `main`-д ШУУД БҮҮ ТҮЛХ.
- **PR нээх, merge хийх ч зөвшөөрөгдсөн** (2026-08-28). Тест ногоон бол PR нээгээд
  шууд merge хий. Хэрэглэгч юу ч дарах шаардлагагүй — зөвхөн үр дүнг хэлнэ.
- Merge = GitHub Pages дээр шууд лайв гарч бүх ажилтанд хүрнэ. Тиймээс merge хийхээс
  ӨМНӨ `npm test` заавал ногоон, UI засвар бол Chromium-аар (`/opt/pw-browsers/chromium-1194`)
  утасны өргөнд шалгасан байх.

## Дизайны гэрээ (2026-08-28) — UI код бичих бүрд ДАГА

Аудитаар илэрсэн: 1,758 CSS дүрмийн **1,096 нь `!important`**, app.js-д **2,050 inline
`style=`**, **28 өөр фонтын хэмжээ**, **106 өвөрмөц өнгө**. НӨАТ шошго дугуй болсон,
доод цэс 2 мөр болсон алдаанууд бүгд эндээс төрсөн. Цоорхойг өргөсгөхгүйн тулд:

**1. Шинэ `!important` БИЧИХГҮЙ.** Хэрэгтэй санагдвал сонгогч давхардсан гэсэн үг —
   давхардлыг нь нэгтгэ. (Одоо байгааг нэг бүрчлэн хөөх шаардлагагүй, зөвхөн шинээр нэмэхгүй.)

**2. Хатуу өнгө, хатуу px БИЧИХГҮЙ** — зөвхөн токен (`var(--text)`, `var(--space-3)`,
   `var(--fs-md)`). Токен байхгүй бол `styles.css`-ийн эхэн дэх ЦОРЫН ГАНЦ `:root` блокт нэм.
   Өнгө 5 давхаргад тархаж байсныг 2026-08-28-нд нэг болгосон — дахин бүү тарааж эхэл.

**3. Шинэ inline `style=` НЭМЭХГҮЙ** — класс үүсгэ. Одоо байгаа 2,050-ийг нэг дор
   засахгүй, харин тэр газарт хүрэх бүрдээ хөрвүүл.

**4. Фонтын хэмжээ = 7 шатны нэг:** `--fs-xs` 11 · `--fs-sm` 12 · `--fs-md` 13 ·
   `--fs-base` 15 · `--fs-lg` 17 · `--fs-xl` 22 · `--fs-2xl` 30. Дунд утга (10.5, 12.5,
   13.5) шинээр бүү нэм.

**5. UI засвар бүрийг утсанд шалга** — Chromium (`/opt/pw-browsers/chromium-1194/chrome-linux/chrome`),
   **320px ба 390px**. Баримт хэвтээ гүйхгүй байх (`scrollWidth === clientWidth`).

**6. Токен/CSS бүтэц өөрчилвөл пиксэлээр батал** — өмнөх/дараах дэлгэцийн зургийг
   light/dark × 390/1200px-д авч `cmp`-ээр харьцуул. Токен нэгтгэлийг ингэж баталсан (8/8 ижил).

**Одоогийн үзүүлэлт → зорилт:** `!important` 1,032→<200 · inline style 2,050→<900 ·
фонтын хэмжээ 28→7 · өнгө 106→~24 · breakpoint 14→2.
Дэлгэрэнгүй аудит: claude.ai/code/artifact/74b8ba33-807d-4651-9cdf-1b74a66649f2

## Хэрэглэгчийн ажиллах арга барил — ЭНИЙГ ДАГА

- **Прагматик, over-engineering-ийг үл тэвчинэ.** "Ном ёсны best practice" гэж бүү
  тулга. "Ажиллаж байгаа бол чигээрээ яв" зарчмыг баримтална.
- **Нэг файлын архитектур нь санаатай сонголт.** `app.js`-г модуль болгож БҮҮ хувraa —
  зөвхөн жинхэнэ удирдах боломжгүй болоход (~12-15 мянган мөр), эсвэл агент засвар
  хийхдээ өөр газар давтан эвдэж эхэлбэл л дахин ярь.
- **Хог, хоцрогдсон файлыг үл тэвчинэ.** Буруу/хоцрогдсон баримт байснаас байхгүй нь дээр.
  README төрлийн хүний баримт шаардлагагүй (2026-05-25-нд README.md, N8N-SETUP.md,
  УТСАНД-СУУЛГАХ.md-г хоцрогдсон тул устгасан — git түүхэд бий).
- **Зардалд хянамгай.** Build-vs-buy, өртгийг тоогоор гаргахыг хүсдэг.
- **Хурдан, давталттай ажилладаг.** 3 долоо хоногт 174 commit. Тасралтгүй сайжруулдаг.
- **Харилцаа:** Монгол хэлээр, маш товч, шийдэмгий. Шууд заавар өгдөг, шууд үйлдэл хүлээдэг.
  Урт тайлбар биш — хийсэн зүйл, шийдэл хүсдэг.
- **Бичлэгийн өнгө аяс (хэрэглэгчийн нэрийн өмнөөс бичих мессеж, зарлал, ажилтнуудад
  явуулах текст):** хатуу, шууд, чимэг үггүй. "Хамт олон,", "— CEO" гэх мэт мэндчилгээ /
  гарын үсэг бүү нэм. Урам зориг өгөх / маркетинг өнгө аяс БҮҮ хий ("цаг болсон",
  "хэвшүүлэх цаг" гэх мэт). Bold-ыг хэт олон газар БҮҮ тавь — нэг л чухал өгүүлбэрт.
  Богино, тэг өгүүлбэр, шаардлагаа жагсаасан bullet, эцсийн хугацаа — энэ л
  бүтэц. Хэрэглэгч 2026-05-26-нд "цаашид иймэрхүү хэв маягаар бичдэг санаарай" гэж
  баталсан.

## Ажилтны таних — утас (ID БИШ, 2026-06-03)

- Ажилтныг **утсаар** таних (`personKey` = утас→email→нэр). Master Sheet-ийн "ID" багана **вестижиал** — шинэ ажилтан ID хоосон үүсдэг (апп `assigned_id` илгээдэггүй).
- **ID баганыг бие махбодоор БҮҮ устга** — register(append)/staff-list(read) schema-д бүртгэлтэй, устгавал schema gotcha. Хоосон орхи.
- staff-update (`/staff-update`, төлөв leave/restore) ба `/staff-role` (албан тушаал засах) хоёулаа **Утас баганаар тааруулдаг**. Master Sheet: `1so0IBwfok7_Tss3y25a-40qybGe9SGHimkuXrihuWvM`, gid 451955481, толгой 27 багана (ID, Овог нэр, РД, Албан тушаал, ...).
- Role засах: Ажилтны удирдлага → ✎ → inline select (`editStaffRole`/`saveStaffRole`). HR sheet бичилтийг агентаар тест хийх боломжгүй (classifier хориглодог) — хэрэглэгч UI-аар тестэлнэ.

## Гүйцэтгэлийн үнэлгээ (Объектив + Ажлын чанар + 360° + бонус, 2026-06-10 шинэчлэв)

- **Нэгдсэн оноо** = Объектив 40% + **Ажлын чанар 40%** + 360° 20% → +20% хүртэл бонус (`PERF_WEIGHTS`). (Өмнө 55/20/25 + роль-KPI байсан — KPI-г ажлын чанараар сольсон.)
- **Объектив:** `objectiveMetrics()` — сарын task on-time гүйцэтгэл (хугацаандаа дуусгасан). completion timestamp = `completed_at` (Sheet-д persist хийгддэггүй → reload-д `updated`-руу унана). **Зөвхөн удирдлагаас өгсөн ажил** (`createdBy && createdBy !== key`) — өөртөө оноосон ажлаар оноо нэмэхээс сэргийлнэ. **Цөөн ажилтай (<`MIN_OBJ_TASKS`=3) бол `lowData`=true → нэгдсэн онооноос хасна.** UI-д ⚠.
- **Ажлын чанар:** `taskQualityScore()` — **даалгавар өгөгч (удирдлага/CEO) дуусгасан ажил бүрийг 1-5★ үнэлнэ** (task detail modal-д ⭐, `saveTaskQuality`). Үнэлгээ **`task.kpi_code` баганд** хадгалагдана (Sheet "KPI код", _backend засваргүй persist_ — энэ багана өмнө vestigial байсан). Сарын дундаж ×20 → 0-100. Зөвхөн `createdBy !== key` ажил. Объектив (цагтаа)-оос ӨӨР хэмжүүр: чанар.
- **360°:** `eval360Score()` — менежер(×2)+хамт(×1), 4 чадвар (хариуцлага/чанар/баг/санаачлага) 1-5★. Anti-gaming: 3+ хамт бол outlier trim. Нэргүй нэгтгэл. (Self цуглуулдаг ч оноонд ороогүй.)
- **Бонус:** `bonusPctForScore` — 90+→20%, 80-89→15%, 70-79→10%, 60-69→5%. CEO баталгаажуулна (автомат төлбөр биш). **`eligibleBonus(u)`: бонус авахад дор хаяж `BONUS_MIN_PARTS`=2 бүрэлдэхүүн (объектив + ажлын чанар эсвэл 360°) шаардана** — дан объективаас +20% олгохгүй. (Анхаар: чанар/360° хийгдтэл бараг бүгд partsUsed=1 → бонус 0. Менежерүүд ажил үнэлж эхэлснээр бонус нээгдэнэ — энэ нь зориудын.) Доош нь оноо харагдана, бонус 0 + "хэсэгчилсэн дата" тайлбар.
- **Хэсэгчилсэн дата:** `unifiedScore` нь `partsUsed` (0-3) буцаана. <3 бол UI-д ⚠ "хэсэгчилсэн дата" тэмдэглэнэ — 1 бүрэлдэхүүнээс гарсан оноог 3-аас гарсантай адил харахаас сэргийлнэ.
- **App:** view `performance` (бүх ажилтан), 3 tab: Миний оноо / Бүх ажилтан (менежер) / Үнэлэх. `state.evaluations`, `loadEvaluations`, `saveEvaluation`, config `evalUrl`.
- **n8n:** `CHIMUN · Evaluations API (360)` — GET/POST `/webhook/evaluations` (upsert id=`period|rater|ratee`, body flatten-тэй). Sheet: Чимун_Tasks_DB-ийн `evaluations` tab (12 багана).
- **Тестийн мөр:** `2026-06|99|88` (хуурамч түлхүүр, оноонд нөлөөлөхгүй) — устгаж болно.
- **Дараагийн:** CEO calibration UI (харилцан өндөр оноо илрүүлэх), бонус баталгаажуулах→цалин workflow холбох.

## Анхаарах эрсдэл (яаралтай биш, мартаж болохгүй)

- Google Sheets-ийг өгөгдлийн сан болгосон → хэдэн мянган мөрт хүрвэл удааширна.
  "Sheet too large" алдаа эсвэл удаашрал гарвал жинхэнэ DB рүү шилжих цаг.
- Автомат тест (2026-08-28 нэмсэн): `test/run.js` — гуравдагч сангүй Node `vm` harness, app.js-г mock-той ачаалж ЦЭВЭР функцуудыг (мөнгө/токен/үнэ/цалин/давхцал/НӨАТ) шалгана. Ажиллуулах: `npm test` эсвэл `node test/run.js`. 66 тест. Код өөрчилсний дараа заавал ажиллуулах. Зөвхөн DOM-гүй цэвэр логик (UI тест байхгүй). state-ээс уншдаг функц тестлэхэд жижиг цэвэр функц салгах хэрэгтэй (жишээ `_rangesOverlap`).
- Өгөгдлийн backup-аа тогтмол хийж байгаа эсэхийг хянах.

## Сесс бүрийн төгсгөлд

Шинэ чухал шийдвэр, хэрэглэгчийн арга барилын талаар олж мэдсэн зүйл гарвал
энэ файлыг богино, үнэн зөв байлгаж шинэчилнэ.

_Сүүлд шинэчилсэн: 2026-08-29_
