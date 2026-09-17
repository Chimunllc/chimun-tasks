#!/usr/bin/env python3
"""Meta Business AI-д зориулсан үнийн жагсаалтыг Google Drive руу бичнэ.

ЯАГААД: Meta Business AI нь дөрвөн эх сурвалжаас л уншдаг — өөрийн барааны
жагсаалт (гараар, нэг нэгээр), бичвэр бичлэгүүд (2000 тэмдэгтийн хязгаартай),
Pricelist, ба **Google Drive**. Эдгээрээс зөвхөн Drive нь бөөнөөр бөгөөд
АВТОМАТААР шинэчлэгддэг (Meta-гийн баримтаар синк 12 цаг хүртэл).

⛔ Commerce каталогийг Business AI УНШДАГГҮЙ. `tools/fb_catalog.py` нь тусдаа
   зорилготой (динамик барааны зар) — хоёрыг андуурч болохгүй.

⛔ СУЛ ҮЛДЭГДЛИЙН ТОО БИЧИХГҮЙ. Файл өдөрт нэг удаа шинэчлэгдэж, Meta 12 цаг
   хүртэл синк хийдэг тул тоо нь ирэхдээ аль хэдийн хуучирсан байна. Зөвхөн үнэ.

Ажиллах: VPS cron, өдөрт нэг удаа.
Гараар:  python3 meta_pricelist.py [--dry] [--selftest]
"""
import subprocess, sys, tempfile, os

CONTAINER = 'vps-deploy-postgres-1'
SEP = '\x1f'
REMOTE = 'gdrive:M-event-AI'
FNAME = 'M-event-turees-une.md'
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


def build_doc(rows, today):
    """Мөрүүд → Meta-гийн AI уншихад тохирсон баримт.

    ⚠ Гарчигт «1 ХОНОГИЙН түрээс» гэдгийг ил бичнэ — эс бөгөөс AI нийт үнэ
      гэж ойлгож, олон хоногийн захиалгад буруу тоо хэлнэ.
    """
    buckets = {}
    for r in rows:
        if len(r) < 4:
            continue
        sku, name, price, cat = r[0], r[1], r[2], r[3]
        m = money(price)
        if not name or not m or m == '0₮':
            continue
        buckets.setdefault(group_of(cat), []).append((name.strip(), m))
    out = ['# M event — түрээсийн үнийн жагсаалт',
           '',
           'Шинэчилсэн: %s. Бүх үнэ **1 ХОНОГИЙН** түрээсийн үнэ, НӨАТ багтсан.' % today,
           '',
           'Сул үлдэгдэл өдөр бүр өөрчлөгддөг тул энд бичээгүй. Тухайн өдөр '
           'захиалах боломжтой эсэхийг mevent.mn сайтаас эсвэл 7755-1010 утсаар шалгана.',
           '']
    n = 0
    order = [g[0] for g in GROUPS] + ['Бусад']
    for g in order:
        items = buckets.get(g)
        if not items:
            continue
        out.append('## ' + g)
        out.append('')
        for name, m in sorted(items):
            out.append('- %s — %s' % (name, m))
            n += 1
        out.append('')
    out.append(TERMS)
    return '\n'.join(out), n


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
    eq(money(None), '', 'хоосон мөнгө')
    doc, n = build_doc([('M-1', 'Сандал', 6600, 'Ширээ, сандал, бүтээлэг'),
                        ('M-2', 'Асар', 825000, 'Асар'),
                        ('M-3', 'Үнэгүй', 0, 'Асар')], '2026-09-17')
    eq(n, 2, 'үнэгүй бараа орохгүй')
    eq('1 ХОНОГИЙН' in doc, True, 'хоногийн үнэ гэж ил бичигдэнэ')
    eq('Сул үлдэгдэл өдөр бүр' in doc, True, 'нөөцийн тоо биш, заавар')
    eq('- Сандал — 6,600₮' in doc, True, 'мөр зөв')
    eq(doc.index('## Ширээ') < doc.index('## Асар'), True, 'бүлгийн дараалал')
    eq('7755-1010' in doc, True, 'холбоо барих')
    print('meta_pricelist selftest: %d тест OK' % k[0])


def main():
    rows = psql("select sku, name, coalesce(price,0)::bigint, coalesce(category,'') "
                "from public_catalog where coalesce(price,0) > 0 order by name;")
    today = subprocess.run(['date', '+%Y-%m-%d'], capture_output=True, text=True).stdout.strip()
    doc, n = build_doc(rows, today)
    print('үнийн жагсаалт: %d бараа, %d тэмдэгт' % (n, len(doc)))
    if DRY:
        print(doc[:600])
        return
    d = tempfile.mkdtemp()
    p = os.path.join(d, FNAME)
    with open(p, 'w', encoding='utf-8') as f:
        f.write(doc)
    # ⚠ `--drive-import-formats` БИЧИХГҮЙ — rclone .md-г Google Doc руу хөрвүүлэх
    #   гэж оролдоод «can't convert» гэж унана. Энгийн файлаар байршуулна.
    r = subprocess.run(['rclone', 'copy', p, REMOTE], capture_output=True, text=True)
    os.remove(p)
    os.rmdir(d)
    if r.returncode:
        raise SystemExit('rclone: ' + (r.stderr or '')[:300])
    print('Drive руу байршуулав:', REMOTE + '/' + FNAME)


if __name__ == '__main__':
    selftest() if '--selftest' in sys.argv else main()
