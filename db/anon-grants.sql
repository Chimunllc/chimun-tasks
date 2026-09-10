-- ═══════════════════════════════════════════════════════════════════════
-- НИЙТИЙН (anon) ЭРХИЙН ХИЛ — юуг интернэтээс уншиж/бичиж болох вэ
-- Сүүлд шинэчилсэн: 2026-09-10
--
-- ⚠ ЭНЭ ФАЙЛ ОДООГИЙН БАЙДЛЫГ БАРИМТЖУУЛНА. Дахин ажиллуулах шаардлагагүй —
--   эрх аль хэдийн ийм байна. Файл нь (а) VPS дахин байгуулахад сэргээх заавар,
--   (б) хил хаана байгааг агентад хэлэх баримт.
--
-- ЯАГААД ХЭРЭГТЭЙ ВЭ
--   PostgREST-д JWT байхгүй хүсэлт `anon` үүрэг болдог. Өөрөөр хэлбэл
--   **ямар ч түлхүүргүйгээр** anon-д нээлттэй бүх зүйлийг интернэтээс уншиж
--   болно — сайтын түлхүүрийг солих нь юуг ч засахгүй.
--   2026-09-09-нд аудитаар илэрсэн: 244 барааны худалдан авалтын өртөг
--   (нийт 366,172,168₮), 69 нийлүүлэгч, 11 ажилтны утас ба эрхийн матриц,
--   NOMAAD-ийн 85 төлбөрийн мөр (харилцагчийн нэртэйгээ), `app_config`-ийн
--   бүх түлхүүр (хувийн данснаас гарсан зардал, актласан хөрөнгө) бүгд
--   нээлттэй байв.
--
-- ОДООГИЙН ХИЛ — anon-д зөвшөөрөгдсөн БҮГД:
--   УНШИХ:  public_catalog · public_availability · app_config_public
--           + products-ын 26 багана (ХОЦРОГДСОН — доорх «Дараагийн алхам» үз)
--   БИЧИХ:  app_errors (алдааны лог) · attendance (checkin.html — ирц)
--
--   Бусад БҮХ хүснэгт anon-д ХААЛТТАЙ. Апп бүх уншилт/бичилтээ нэвтэрсэн
--   ажилтны токеноор (`pgrstBearer()`) хийдэг тул эвдрэхгүй.
-- ═══════════════════════════════════════════════════════════════════════

begin;

-- ── Нийтэд нээлттэй 3 харагдац ──────────────────────────────────────────
-- (Харагдацын тодорхойлолт: db/public_availability.sql ба
--  m-event-website-ready/db/{public_catalog,app_config_public}.sql)
grant select on public.public_catalog       to anon;
grant select on public.public_availability  to anon;
grant select on public.app_config_public    to anon;

-- ── Нийтэд бичих 2 зам ──────────────────────────────────────────────────
-- app_errors: сайт ба апп хоёулаа алдаагаа энд бичнэ (унших эрх БАЙХГҮЙ —
--   нэвтэрсэн CEO л уншина). Энэ логоос өдөрт 2 удаа GitHub Issue үүсдэг.
grant insert on public.app_errors to anon;
-- attendance: checkin.html нэвтрэлтгүйгээр ирц бүртгэдэг (зориудынх).
grant insert on public.attendance to anon;

-- ── Сайт уншдаггүй бүх хүснэгтээс хасах ─────────────────────────────────
-- 2026-09-09-нд ажиллуулсан. Дахин ажиллуулахад эвдрэхгүй (аль хэдийн хасагдсан).
revoke select on public.member_perms       from anon;   -- ажилтны утас + эрхийн матриц
revoke select on public.role_perms         from anon;
revoke select on public.member_branches    from anon;
revoke select on public.nomaad_payments    from anon;   -- харилцагчийн төлбөрийн түүх
revoke select on public.product_transfers  from anon;
revoke select on public.product_aliases    from anon;
revoke select on public.repairs            from anon;
revoke select on public.task_audio         from anon;
revoke select on public.brand_kit          from anon;
revoke select on public.catering_jobs      from anon;
revoke select on public.catering_menu      from anon;
revoke select on public.email_optout       from anon;
revoke select on public.expense_learn      from anon;
revoke select, insert, update on public.stock_counts    from anon;
revoke select, insert, update on public.product_batches from anon;
revoke select on public.app_config from anon;           -- хувийн данс, актласан хөрөнгө

commit;

notify pgrst, 'reload schema';

-- ═══════════════════════════════════════════════════════════════════════
-- ДАРААГИЙН АЛХАМ (хараахан ажиллуулаагүй)
--
-- `products` хүснэгтэд anon-д 26 баганын SELECT эрх ХЭВЭЭР байна. 2026-09-09-нд
-- сайт тэр хүснэгтээс шууд уншдаг байсан тул хэрэгтэй байв. 2026-09-10-нд сайт
-- зөвхөн харагдацаас уншдаг болсон (`db/`-ийн харагдацууд эзнийхээ эрхээр
-- ажилладаг тул үндсэн хүснэгтийн эрх шаардахгүй) — өөрөөр хэлбэл эдгээр эрх
-- одоо ХОЦРОГДСОН.
--
-- Хасах бол:
--     revoke all on public.products from anon;
--     notify pgrst, 'reload schema';
--
-- Эрсдэл: хэрэглэгчийн браузерт кэшлэгдсэн ХУУЧИН сайт (харагдац руу шилжихээс
-- өмнөх хувилбар) `products`-оос уншихыг оролдоно. Тэр тохиолдолд каталог
-- `products.json` руу унаж ажиллана, барааны олон зургийн галерей л дутуу болно
-- (код `if (!r.ok) return` гэж эелдэг унадаг). Хэдэн өдөр хүлээвэл кэш арилна.
--
-- Хасахын ӨМНӨ шалга:
--     node tools/contract-check.js     # «сайт зөвхөн нийтийн харагдацаас уншина»
-- ═══════════════════════════════════════════════════════════════════════
