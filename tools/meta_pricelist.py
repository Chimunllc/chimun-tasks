#!/usr/bin/env python3
"""Meta Business AI-ийн Price list руу үнийн жагсаалтыг Google Sheet-ээр өгнө.

ЯАГААД: Meta Business AI нь дөрвөн эх сурвалжаас л уншдаг — өөрийн барааны
жагсаалт (гараар, нэг нэгээр), бичвэр бичлэгүүд (2000 тэмдэгтийн хязгаартай),
Pricelist, ба **Google Drive**. Эдгээрээс зөвхөн Drive нь бөөнөөр бөгөөд
АВТОМАТААР шинэчлэгддэг (Meta-гийн баримтаар синк 12 цаг хүртэл).

⛔ Commerce каталогийг Business AI УНШДАГГҮЙ. `tools/fb_catalog.py` нь тусдаа
   зорилготой (динамик барааны зар) — хоёрыг андуурч болохгүй.

⛔ ХОЛБООС ТАСРАХААС СЭРГИЙЛ. Meta нь Google Sheet-ийг ХАЯГААР нь холбодог тул
   шинэчлэх бүрд ШИНЭ файл үүсгэвэл холбоос үхнэ. `rclone copy` нь нэрээр нь
   таарсан файлыг ДАРЖ бичдэг — ID хэвээр үлдэнэ (2026-09-17-нд туршиж баталсан).
   Файлын НЭРИЙГ хэзээ ч бүү сольж бай.

⚠ rclone-д `--drive-import-formats csv` БА `--drive-export-formats csv` ХОЁУЛАА
  хэрэгтэй. Зөвхөн эхнийхийг өгвөл тохиргооны өгөгдмөл (xlsx) зөрчилдөж
  «can't convert» гэж унана.

⛔ СУЛ ҮЛДЭГДЛИЙН ТОО БИЧИХГҮЙ. Файл өдөрт нэг удаа шинэчлэгдэж, Meta 12 цаг
   хүртэл синк хийдэг тул тоо нь ирэхдээ аль хэдийн хуучирсан байна. Зөвхөн үнэ.

Ажиллах: VPS cron, өдөрт нэг удаа.
Гараар:  python3 meta_pricelist.py [--dry] [--selftest]
"""
import csv, os, subprocess, sys, tempfile

CONTAINER = 'vps-deploy-postgres-1'
SEP = '\x1f'
REMOTE = 'gdrive:M-event-AI'
FNAME = 'M-event-unijn-jagsaalt.csv'
SHEET_ID = '12tv2KpEsceqkO_YGRyhTpF_n4Ne1mPrB-m9h5x2uOSg'
DRY = '--dry' in sys.argv

# Ангиллыг хүн уншихаар бүлэглэнэ. Жагсаалтад байхгүй ангилал «Бусад» руу.
GROUPS = [
    ('Ширээ, сандал, бүтээлэг', ['Ширээ, сандал, бүтээлэг', 'Засал, тохижилт']),
    ('Асар, майхан, сүүдрэвч', ['Асар', 'Майхан', 'Сүүдрэвч', 'Татдаг асар']),
    ('Аяны хэрэгсэл', ['Аяны хэрэгсэл']),
    ('Тайз, гэрэлтүүлэг, хөгжим', ['Тайз', 'Тайзны гэрэлтүүлэг', 'Гэрэлтүүлэг',
                                   'Чимэглэлийн гэрэл', 'Хөгжим', 'Хөгжмийн багц', 'Эффект']),
    ('Халаалт, цахилгаан', ['Халаалт, агааржуулалт', 'Эрчим хүч, цахилгаан']),
    ('Хоол, гал тогоо', ['Гал тогоо', 'Ресторан хэрэгсэл']),
    ('Хөгжөөнт тоглоом', ['Хөгжөөнт тоглоом']),
]

TERMS = """## Хүргэлт, хөнгөлөлт, нөхцөл

- Хүргэлт: Улаанбаатар дотор 150,000₮ (хүргэж өгөөд буцаан авах багтсан).
- Хот гадуур: нэмэлт 5,000₮/км.
- Олон хоногийн хөнгөлөлт: 2+ хоног 20%, 7+ хоног 40%, 30+ хоног 55%.
- Ажлын цаг 09:00-18:00. Түүнээс гадуур ачилт/буулгалт хийвэл 20,000₮ нэмэгдэнэ.
- Өөрөө ирж авах хаяг: Улаанбаатар, Баянзүрх дүүрэг, 11-р хороо, Ногоон зоорь 1-13.
- Захиалга: mevent.mn сайтаас шууд, эсвэл 7755-1010 утсаар.
- Бүх үнэ НӨАТ багтсан.
"""


def psql(sql):
    p = subprocess.run(['docker', 'exec', '-i', CONTAINER, 'psql', '-U', 'chimun',
                        '-d', 'chimun', '-v', 'ON_ERROR_STOP=1', '-t', '-A', '-F', SEP, '-c', sql],
                       capture_output=True, text=True)
    if p.returncode:
        raise SystemExit('psql: ' + p.stderr.strip()[:300])
    # ⛔ .strip() нь `\x1f`-ийг хасдаг тул сүүлийн багана алдагдана.
    return [ln.split(SEP) for ln in p.stdout.strip('\n').split('\n') if ln]


# ── Цэвэр функцууд ─────────────────────────────────────────────────────────

def group_of(cat):
    """Барааны ангиллыг хүн уншдаг бүлэг рүү. Танихгүй бол «Бусад»."""
    c = str(cat or '').strip()
    for name, cats in GROUPS:
        if c in cats:
            return name
    return 'Бусад'


def money(v):
    try:
        return format(int(round(float(v))), ',') + '₮'
    except (TypeError, ValueError):
        return ''


def build_csv(rows, today):
    """Мөрүүд → Meta-гийн Price list уншдаг CSV.

    ⚠ Баганын толгойг ТОДОРХОЙ бич — Meta «clear column headers» шаарддаг.
    ⚠ Үнэ нь ЗӨВХӨН тоо байна (таслал, ₮ тэмдэггүй) — эс бөгөөс CSV багана
      эвдэрч, Meta үнийг текст гэж уншина.
    """
    out = [['Барааны нэр', '1 хоногийн түрээсийн үнэ (төгрөг)', 'Ангилал', 'Тайлбар']]
    n = 0
    for r in rows:
        if len(r) < 4:
            continue
        name, price, cat = r[1].strip(), r[2], group_of(r[3])
        try:
            v = int(round(float(price)))
        except (TypeError, ValueError):
            continue
        if not name or v <= 0:
            continue
        out.append([name, str(v), cat, '1 хоногийн түрээс, НӨАТ багтсан. Шинэчилсэн %s' % today])
        n += 1
    return out, n


def selftest():
    k = [0]

    def eq(a, b, l):
        k[0] += 1
        if a != b:
            raise SystemExit('FAIL %s: %r != %r' % (l, a, b))

    eq(group_of('Асар'), 'Асар, майхан, сүүдрэвч', 'бүлэглэлт')
    eq(group_of('Юу ч биш'), 'Бусад', 'танихгүй ангилал')
    eq(group_of(None), 'Бусад', 'хоосон ангилал')
    eq(money(6600), '6,600₮', 'мөнгө')
    t, n = build_csv([('M-1', 'Сандал', 6600, 'Ширээ, сандал, бүтээлэг'),
                      ('M-2', 'Асар', 825000, 'Асар'),
                      ('M-3', 'Үнэгүй', 0, 'Асар')], '2026-09-17')
    eq(n, 2, 'үнэгүй бараа орохгүй')
    eq(t[0][0], 'Барааны нэр', 'толгой мөр')
    # ⚠ Үнэ зөвхөн ТОО — таслал, ₮ тэмдэг байвал Meta текст гэж уншина.
    eq(t[1][1], '6600', 'үнэ цэвэр тоо')
    eq(t[2][2], 'Асар, майхан, сүүдрэвч', 'ангилал бүлэглэгдэв')
    eq(len(t[0]), 4, 'дөрвөн багана')
    print('meta_pricelist selftest: %d тест OK' % k[0])


def main():
    rows = psql("select sku, name, coalesce(price,0)::bigint, coalesce(category,'') "
                "from public_catalog where coalesce(price,0) > 0 order by name;")
    today = subprocess.run(['date', '+%Y-%m-%d'], capture_output=True, text=True).stdout.strip()
    table, n = build_csv(rows, today)
    print('үнийн жагсаалт: %d бараа' % n)
    if DRY:
        for r in table[:4]:
            print(' ', r)
        return
    d = tempfile.mkdtemp()
    p = os.path.join(d, FNAME)
    with open(p, 'w', encoding='utf-8', newline='') as f:
        csv.writer(f).writerows(table)
    r = subprocess.run(['rclone', 'copy', p, REMOTE,
                        '--drive-import-formats', 'csv', '--drive-export-formats', 'csv'],
                       capture_output=True, text=True)
    os.remove(p)
    os.rmdir(d)
    if r.returncode:
        raise SystemExit('rclone: ' + (r.stderr or '')[:300])
    print('Google Sheet шинэчлэв: https://docs.google.com/spreadsheets/d/%s/edit' % SHEET_ID)


if __name__ == '__main__':
    selftest() if '--selftest' in sys.argv else main()
