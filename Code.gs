// Google Apps Script — 部署為 Web App（執行身分: Me, 存取: Anyone）
// 設定後取得 Web App URL 填入 .env 的 VITE_GAS_URL

const SHEET_NAME = 'Vocabulary'
const HEADERS = [
  'word', 'pronunciation_us', 'pronunciation_uk', 'pos', 'chinese_meaning',
  'definition_en', 'example_en', 'example_zh', 'inflections', 'synonyms',
  'antonyms', 'thesaurus_examples', 'cambridge_url', 'starred', 'addedAt'
]

function getOrCreateSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet()
  let sheet = ss.getSheetByName(SHEET_NAME)
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME)
    sheet.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS])
    sheet.getRange(1, 1, 1, HEADERS.length).setFontWeight('bold')
    sheet.setFrozenRows(1)
  }
  return sheet
}

function doGet() {
  return ContentService
    .createTextOutput(JSON.stringify({ status: 'ok', message: 'Vocabulary GAS is running' }))
    .setMimeType(ContentService.MimeType.JSON)
}

function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents)
    const sheet = getOrCreateSheet()

    let result
    switch (data.action) {
      case 'getAll':   result = getAll(sheet); break
      case 'add':      result = addWord(sheet, data.word); break
      case 'delete':   result = deleteWord(sheet, data.word); break
      case 'star':     result = starWord(sheet, data.word, data.starred); break
      default:         result = { success: false, error: 'Unknown action: ' + data.action }
    }

    return ContentService
      .createTextOutput(JSON.stringify(result))
      .setMimeType(ContentService.MimeType.JSON)
  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ success: false, error: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON)
  }
}

function getAll(sheet) {
  const data = sheet.getDataRange().getValues()
  if (data.length <= 1) return { success: true, words: [] }

  const headers = data[0]
  const words = data.slice(1).map(row => {
    const obj = {}
    headers.forEach((h, i) => { obj[h] = row[i] })

    obj.pronunciation = {
      us: obj.pronunciation_us || '',
      uk: obj.pronunciation_uk || ''
    }
    try { obj.inflections = JSON.parse(obj.inflections || '{}') } catch { obj.inflections = {} }
    try { obj.synonyms = JSON.parse(obj.synonyms || '[]') } catch { obj.synonyms = [] }
    try { obj.antonyms = JSON.parse(obj.antonyms || '[]') } catch { obj.antonyms = [] }
    try { obj.thesaurus_examples = JSON.parse(obj.thesaurus_examples || '[]') } catch { obj.thesaurus_examples = [] }
    obj.starred = obj.starred === true || obj.starred === 'TRUE'

    return obj
  })

  return { success: true, words }
}

function addWord(sheet, word) {
  // Remove existing entry with same word first
  deleteWord(sheet, word.word)

  const row = [
    word.word || '',
    word.pronunciation?.us || '',
    word.pronunciation?.uk || '',
    word.pos || '',
    word.chinese_meaning || '',
    word.definition_en || '',
    word.example_en || '',
    word.example_zh || '',
    JSON.stringify(word.inflections || {}),
    JSON.stringify(word.synonyms || []),
    JSON.stringify(word.antonyms || []),
    JSON.stringify(word.thesaurus_examples || []),
    word.cambridge_url || '',
    word.starred || false,
    word.addedAt || Date.now(),
  ]

  sheet.appendRow(row)
  return { success: true }
}

function deleteWord(sheet, wordStr) {
  const data = sheet.getDataRange().getValues()
  for (let i = data.length - 1; i >= 1; i--) {
    if (data[i][0] === wordStr) {
      sheet.deleteRow(i + 1)
      break
    }
  }
  return { success: true }
}

function starWord(sheet, wordStr, starred) {
  const data = sheet.getDataRange().getValues()
  const starredColIndex = HEADERS.indexOf('starred') + 1

  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === wordStr) {
      sheet.getRange(i + 1, starredColIndex).setValue(starred)
      break
    }
  }
  return { success: true }
}
