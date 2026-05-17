/**
 * Чимун_ХХК_Ажилтны_бүртгэл_Master — ID-уудыг канон код руу буцаах
 *
 * Master Sheet-д ID багана нь нэр болж сольсон үед энэ скрипт нь
 * "Овог нэр" баганаар хүн бүрийг таниж, A баганын ID-г канон код
 * (CEO, S01, M02, г.м.)-аар сольж бичнэ.
 *
 * АШИГЛАХ:
 * 1. Sheet нээх: https://docs.google.com/spreadsheets/d/1so0IBwfok7_Tss3y25a-40qybGe9SGHimkuXrihuWvM/edit
 * 2. Extensions → Apps Script
 * 3. Бүх кодыг устгаад энэ файлыг paste
 * 4. Save → Function dropdown-аас `fixMasterIds` сонгох → Run
 * 5. Authorize зөвшөөрөл өгөх
 * 6. ~3 секундын дотор бүх ID канон код руу буцна
 *
 * Дахин ажиллуулж болно (idempotent — ижил нэртэй мөрүүдийг таних нь баталгаатай).
 */

// Канон ID-нэрийн mapping (Чимун ХХК — 14 ажилтан)
// Тэмдэглэл: нэр дотор "Г.Мөнх-Учрал" гэх Mongolian тэмдэгт байгаа учир hard-match хийнэ
const NAME_TO_ID = {
  'Г.Мөнх-Учрал':    'CEO',
  'Н.Анужин':         'S01',
  'О.Түвдэндаржаа':   'S03',
  'И.Алтансүх':       '001',
  'Г.Сайнжаргал':     'M02',
  'Д.Нинждолгор':     '003',
  'Б.Пүрэвдавга':     '004',
  'Д.Баясгалан':      '005',
  'О.Эрдэнэхүү':      'M07',
  'Хишигтогтох':      '006',
  'Б.Дэлгэрбат':      'C01',
  'Б.Батжаргал':      'C02',
  'Цэлмэг':           'C06',
  'Содхүү':           'T01',
};

function fixMasterIds() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheets()[0];
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) {
    Logger.log('Sheet хоосон.');
    return;
  }

  // A багана (ID) + B багана (Овог нэр) уншиж сольж бичнэ
  const range = sheet.getRange(2, 1, lastRow - 1, 2);
  const values = range.getValues();

  let updated = 0;
  let unmatched = [];

  for (let i = 0; i < values.length; i++) {
    const currentId = String(values[i][0] || '').trim();
    const name = String(values[i][1] || '').trim();
    if (!name) continue;

    const canonId = NAME_TO_ID[name];
    if (!canonId) {
      unmatched.push(`Мөр ${i + 2}: "${name}" — mapping олдсонгүй`);
      continue;
    }

    if (currentId !== canonId) {
      values[i][0] = canonId;
      updated++;
      Logger.log(`Мөр ${i + 2}: "${currentId}" → "${canonId}" (${name})`);
    }
  }

  range.setValues(values);
  SpreadsheetApp.flush();

  const msg = `ID цэвэрлэгээ: ${updated} мөр шинэчилсэн` +
              (unmatched.length ? `, ${unmatched.length} мөр таарсангүй` : '');
  Logger.log(msg);
  if (unmatched.length) {
    Logger.log('Таарсангүй мөрүүд:\n' + unmatched.join('\n'));
  }

  SpreadsheetApp.getActiveSpreadsheet().toast(
    msg,
    unmatched.length ? '⚠ Анхааруулга' : '✅ Амжилттай',
    6
  );
}

/**
 * НЭМЭЛТ — Хэрэв шинэ ажилтан Sheet-д нэмсэн ч NAME_TO_ID-д mapping байхгүй бол
 * энэ функцийг ажиллуулж шинэ ID санал болгуулна (M08, S04, C07 г.м.).
 */
function suggestIdsForNewStaff() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheets()[0];
  const lastRow = sheet.getLastRow();
  const values = sheet.getRange(2, 1, lastRow - 1, 4).getValues();
  const existing = new Set(Object.values(NAME_TO_ID));
  const suggestions = [];

  for (let i = 0; i < values.length; i++) {
    const id = String(values[i][0] || '').trim();
    const name = String(values[i][1] || '').trim();
    const group = String(values[i][3] || '').trim();
    if (!name) continue;
    if (NAME_TO_ID[name]) continue;       // already mapped

    // Suggest based on group
    let prefix = 'X';
    if (group === 'Нэгдсэн') prefix = 'S';
    else if (group === 'M Event') prefix = 'M';
    else if (group === 'Camp') prefix = 'C';

    // Find next available number
    let n = 1;
    while (existing.has(prefix + String(n).padStart(2, '0'))) n++;
    const newId = prefix + String(n).padStart(2, '0');
    existing.add(newId);
    suggestions.push(`Мөр ${i + 2}: "${name}" (${group}) → санал болгох ID: ${newId}`);
  }

  if (!suggestions.length) {
    Logger.log('Шинэ ажилтан байхгүй — бүх mapping бүрэн.');
    return;
  }
  Logger.log('Шинэ ажилтны санал:\n' + suggestions.join('\n'));
  SpreadsheetApp.getActiveSpreadsheet().toast(
    suggestions.length + ' шинэ ажилтанд ID санал болгоход бэлэн',
    'Apps Script log харна уу',
    8
  );
}
