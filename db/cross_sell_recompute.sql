-- ═══════════════════════════════════════════════════════════════════════
-- «ХАМТ АВДАГ» САНАЛЫН ДҮРМИЙГ ӨГӨГДЛИЙН САНД БОДНО → app_config['mevent_cross_sell']
-- Үүсгэсэн: 2026-10-24 (CEO: «сайтад л санал болгох нь хамгийн зөв»)
--
-- ЯАГААД DB-Д
--   Сайт захиалгын түүхийг (app_orders) уншиж ЧАДАХГҮЙ — нийтэд хаалттай (хувийн мэдээлэл). Харин «ширээтэй захиалгын 55% нь
--   сандал авсан» гэдэг нь зөвхөн sku хос ба хувь тул нийтэд гаргахад аюулгүй. `mevent_popularity`-тай ЯГ ИЖИЛ загвар:
--   өдөр бүр VPS-ийн cron энэ файлыг ажиллуулж, үр дүнг `app_config`-д бичнэ → `app_config_public` харагдацаар сайт уншина.
--
-- ⚠ ДҮРЭМ = аппын `crossSellRules` / `xsellAccept`-тай ИЖИЛ (app.js). Нэгийг өөрчилбөл НӨГӨӨГ ЗААВАЛ зас:
--     · сүүлийн 365 хоног; ноорог/цуцалсан/устгасан захиалга хасна
--     · захиалгын «сагс» = архивлаагүй, түрээслэх (qty_mevent > 0) бараа; багц бүрэлдэхүүнээрээ; үйлчилгээ/багц ОРОХГҮЙ
--     · 1..12 төрөлтэй сагс л тоологдоно (бүтэн эвент хасагдана)
--     · anchor ≥ 5 захиалга, хос ≥ 3 захиалга
--     · conf ≥ 0.30 БА lift ≥ 1.5 ЭСВЭЛ conf ≥ 0.15 БА lift ≥ 3 (lift ҮРГЭЛЖ шаардана)
--     · тоо = түүхэн харьцаа (b ÷ a) -ын медиан
--   Мөрийн таних = аппын `resolveItemSku`: sku → alias `sku:<жижиг>` → alias `name:<normItemKey>` → барааны нэр (normItemKey).
--   `normItemKey`: жижиг үсэг, ё→е, ижил дүрст латин (a c e p x y k m t b h) → кирилл, үлдсэнээс 0-9a-zа-я бусдыг хасна.
--
-- ГАРЦ: {"M-239": [{"sku":"M-051","conf":0.52,"n":31,"both":16,"ratio":2.9}, …], …}  — anchor бүрд дээд тал нь 5.
--   Хувийн мэдээлэл ОРОХГҮЙ (зөвхөн sku, хувь, тоо). Сайт ИЛ харагдах бараагаар нь л шүүнэ.
--
-- Ажиллуулах (гараар, нэг удаа):
--   ssh chimun-vps 'docker exec -i vps-deploy-postgres-1 psql -U chimun -d chimun -v ON_ERROR_STOP=1' < db/cross_sell_recompute.sql
-- Өдөр бүр: VPS cron (06:10) — `/opt/chimun/cross_sell.sql` (энэ файлын хуулбар). Файлыг засвал `scp`-дэж хуулна.
-- ═══════════════════════════════════════════════════════════════════════

with
oi as (
  select o.id as oid,
         i->>'sku' as isku,
         regexp_replace(translate(lower(coalesce(i->>'name', '')), 'ёacepxykmtbh', 'еасерхукмтвн'), '[^0-9a-zа-я]+', '', 'g') as nk,
         greatest(1, coalesce(nullif(i->>'qty', '')::numeric, 1)) as qty
  from app_orders o
  cross join lateral jsonb_array_elements(case when jsonb_typeof(o.items) = 'array' then o.items else '[]'::jsonb end) i
  where o.status not in ('draft', 'canceled', 'deleted')
    and o.starts_at >= current_date - interval '365 days'
),
res as (
  select oi.oid, oi.qty,
    coalesce(
      (select p.sku from products p where coalesce(p.archived, false) = false and p.sku = oi.isku limit 1),
      (select a.sku from product_aliases a where coalesce(oi.isku, '') <> '' and a.alias = 'sku:' || lower(oi.isku) limit 1),
      (select a.sku from product_aliases a where oi.nk <> '' and a.alias = 'name:' || oi.nk limit 1),
      (select p.sku from products p where coalesce(p.archived, false) = false and oi.nk <> ''
         and regexp_replace(translate(lower(p.name), 'ёacepxykmtbh', 'еасерхукмтвн'), '[^0-9a-zа-я]+', '', 'g') = oi.nk
       order by p.sku limit 1)
    ) as sku
  from oi
),
lines as (
  select r.oid, r.qty, pr.sku, pr.type, pr.bundle_items
  from res r join products pr on pr.sku = r.sku and coalesce(pr.archived, false) = false
),
basket_raw as (
  select oid, sku, qty from lines where type not in ('package', 'service')
  union all
  select l.oid, c->>'sku', l.qty * greatest(1, coalesce(nullif(c->>'qty', '')::numeric, 1))
  from lines l
  cross join lateral jsonb_array_elements(case when jsonb_typeof(l.bundle_items) = 'array' then l.bundle_items else '[]'::jsonb end) c
  where l.type = 'package'
),
basket as (
  select br.oid, br.sku, sum(br.qty) as qty
  from basket_raw br
  join products p on p.sku = br.sku and coalesce(p.archived, false) = false
                 and p.type not in ('package', 'service') and coalesce(p.qty_mevent, 0) > 0
  group by br.oid, br.sku
),
sized as (select oid from basket group by oid having count(*) between 1 and 12),
b as (select bk.* from basket bk join sized s using (oid)),
tot as (select count(*)::numeric as n from sized),
na as (select sku, count(*)::numeric as n from b group by sku),
pair as (
  select x.sku as a, y.sku as b, count(*)::numeric as both_n,
         percentile_disc(0.5) within group (order by y.qty / x.qty) as ratio
  from b x join b y on x.oid = y.oid and x.sku <> y.sku
  group by x.sku, y.sku
  having count(*) >= 3
),
scored as (
  select p.a, p.b, p.both_n, a1.n as n_a, p.ratio,
         p.both_n / a1.n as conf,
         (p.both_n / a1.n) / (a2.n / tot.n) as lift
  from pair p
  join na a1 on a1.sku = p.a
  join na a2 on a2.sku = p.b
  cross join tot
  where a1.n >= 5
),
accepted as (
  select s.*, row_number() over (partition by s.a order by s.conf desc, s.lift desc) as rk
  from scored s
  join products pb on pb.sku = s.b and coalesce(pb.archived, false) = false and coalesce(pb.price, 0) > 0
  where (s.conf >= 0.3 and s.lift >= 1.5) or (s.conf >= 0.15 and s.lift >= 3)
),
per_anchor as (
  select a, jsonb_agg(jsonb_build_object('sku', b, 'conf', round(conf, 3), 'n', n_a::int, 'both', both_n::int, 'ratio', round(ratio, 2)) order by rk) as rules
  from accepted where rk <= 5 group by a
),
obj as (select coalesce(jsonb_object_agg(a, rules), '{}'::jsonb) as v from per_anchor)
insert into app_config (key, value, updated_at)
select 'mevent_cross_sell', v, now() from obj
on conflict (key) do update set value = excluded.value, updated_at = now();

select 'anchors', count(*), 'rules', coalesce(sum(jsonb_array_length(e.value)), 0)
from app_config c, jsonb_each(c.value) e where c.key = 'mevent_cross_sell';
