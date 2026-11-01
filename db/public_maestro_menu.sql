-- ═════════════════════════════════════════════════════════════════════════
-- public_maestro_menu — MAESTRO сайтад юу харагдахын ЦОРЫН ГАНЦ дүрэм
-- (2026-11-01, CEO)
--
-- Сайт (`Maestro-website/index.html`) энэ харагдацыг л уншина:
--     GET https://n8n.nomaadcamp.com/db/rest/v1/public_maestro_menu?select=data
--   → [ { "data": { "lines": [ { id, name, tagline, cta, hero, packages:[…], weekly:{…} } ] } } ]
-- Хэлбэр нь сайтын `menu-data` JSON-тай ЯГ ИЖИЛ — сайтын render код өөрчлөгдөхгүй.
--
-- ХАРАГДАХ ДҮРЭМ (өөрчлөх = ЭНЭ харагдацыг, сайтын кодыг БИШ):
--   • үйлчилгээ идэвхтэй (`active`) БА дор хаяж 1 идэвхтэй багцтай
--   • багц идэвхтэй (`active`); үнэ null бол «Үнийн санал» болж харагдана
--   • `sample = true` багц ГАРНА (JSON-д `sample:true`) — сайт PROTOTYPE=false үед
--     өөрөө нууна
--   • долоо хоногийн меню: идэвхтэй өдөр дор хаяж 1 байвал; өдрийн аль нэг нь
--     `sample` бол `weekly.sample:true` (сайт PROTOTYPE=false үед нууна)
--   ЗАДРАХГҮЙ: хүснэгтийн бусад багана (updated_at, active гэх мэт ), хувийн мэдээлэл.
--
-- ⚠ `security_invoker`-ыг ЗОРИУД тавихгүй: харагдац эзнийхээ эрхээр хүснэгтийг
--   уншина. Ингэснээр anon-д хүснэгтийн эрх огт өгөх шаардлагагүй.
-- ⚠ `create or replace view` нь баганыг зөвхөн ТӨГСГӨЛД нэмнэ (одоо ганц `data`).
--
-- ПРЕРЕКВИЗИТ: db/maestro_menu.sql (хүснэгтүүд) өмнө нь ажилласан байх.
-- ГАРААР ажиллуулна. ДАХИН ажиллуулж болно.
--   ssh chimun-vps 'docker exec -i vps-deploy-postgres-1 psql -U chimun -d chimun -v ON_ERROR_STOP=1' < db/public_maestro_menu.sql
-- ═════════════════════════════════════════════════════════════════════════

begin;

create or replace view public.public_maestro_menu as
select jsonb_build_object('lines', coalesce((
  select jsonb_agg(
    jsonb_strip_nulls(jsonb_build_object(
      'id',       l.id,
      'name',     l.name,
      'tagline',  l.tagline,
      'cta',      l.cta,
      'hero',     nullif(l.hero, ''),
      'packages', pk.packages,
      'weekly',   w.weekly
    )) order by l.sort, l.id)
  from public.maestro_lines l
  join lateral (
    select jsonb_agg(
      jsonb_strip_nulls(jsonb_build_object(
        'id',         p.id,
        'name',       p.name,
        'desc',       p.descr,
        'items',      p.items,
        'price',      p.price,
        'price_note', p.price_note,
        'unit',       p.unit,
        'min',        p.min_note,
        'photo',      nullif(p.photo, ''),
        'focus',      nullif(p.focus, ''),
        'cta',        nullif(p.cta, ''),
        'featured',   case when p.featured then true end,
        'sample',     case when p.sample   then true end
      )) order by p.sort, p.id) as packages
    from public.maestro_packages p
    where p.line_id = l.id and p.active
  ) pk on pk.packages is not null
  left join lateral (
    select jsonb_build_object(
      'title', coalesce(nullif(l.week_title, ''), 'Долоо хоногийн меню'),
      'note',  l.week_note,
      'sample', case when bool_or(d.sample) then true end,
      'days',  jsonb_agg(jsonb_build_object(
                 'day', d.day, 'soup', d.soup, 'main', d.main, 'salad', d.salad
               ) order by d.day_no)) as weekly
    from public.maestro_week d
    where d.line_id = l.id and d.active
    having count(*) > 0
  ) w on true
  where l.active
), '[]'::jsonb)) as data;

comment on view public.public_maestro_menu is
  'maestro сайтад юу харагдахын ЦОРЫН ГАНЦ дүрэм. Сайт энэ харагдацаас л уншина. Дүрэм өөрчлөх = ЭНЭ харагдацыг өөрчлөх, сайтын кодыг БИШ.';

-- Нийтэд нээгдэх ГАНЦ объект (хүснэгтүүд хаалттай).
grant select on public.public_maestro_menu to anon, authenticated;

commit;

notify pgrst, 'reload schema';

-- ═════════════════════════════════════════════════════════════════════════
-- ШАЛГАХ (ажиллуулсны дараа):
--   1) Харагдац хариу өгч байна (200, 1 мөр):
--      curl -sS 'https://n8n.nomaadcamp.com/db/rest/v1/public_maestro_menu?select=data' | head -c 400
--   2) Хүснэгт anon-д ХААЛТТАЙ (401/403/42501 байх ёстой, өгөгдөл БИШ):
--      curl -sS -o /dev/null -w '%{http_code}\n' 'https://n8n.nomaadcamp.com/db/rest/v1/maestro_packages?select=id&limit=1'
--   3) Сайтын эх орноос уншигдана (CORS): GitHub Pages хаягаас сайт нээж меню харагдах.
--
-- БУЦААХ (ашиглаж эхлээгүй бол):
--   drop view if exists public.public_maestro_menu;  notify pgrst, 'reload schema';
-- ═════════════════════════════════════════════════════════════════════════
