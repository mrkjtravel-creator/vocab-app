import JSZip from 'jszip'
import { getAudioUrl } from '../api.js'

const INFLECTION_LABELS = {
  past_tense: '過去式',
  past_participle: '過去分詞',
  present_participle: '現在分詞',
  third_person: '第三人稱',
  plural: '複數',
  comparative: '比較級',
  superlative: '最高級',
}

function esc(str) {
  return String(str ?? '').replace(/\t/g, ' ').replace(/\r?\n/g, '<br>')
}

// 正面：只有單字 + 音檔標籤（讓學習者先想意思，再翻牌）
function buildFront(w, hasUsAudio, hasUkAudio) {
  const audioTags = [
    hasUsAudio ? `[sound:${w.word}-us.mp3]` : '',
    hasUkAudio ? `[sound:${w.word}-uk.mp3]` : '',
  ].filter(Boolean).join(' ')

  return [
    `<div style="font-size:2em;font-weight:700;margin-bottom:8px">${esc(w.word)}</div>`,
    audioTags,
  ].filter(Boolean).join('')
}

// 背面：IPA + 詞性 + 中文 + 英文釋義 + 例句 + 變化形 + 同義詞反義詞
function buildBack(w, hasUsAudio, hasUkAudio) {
  const parts = []

  // 單字標題 + 音檔（背面重複，方便直接聽）
  const audioTags = [
    hasUsAudio ? `[sound:${w.word}-us.mp3]` : '',
    hasUkAudio ? `[sound:${w.word}-uk.mp3]` : '',
  ].filter(Boolean).join(' ')

  const us = w.pronunciation?.us ?? ''
  const uk = w.pronunciation?.uk ?? ''
  const pron = [us && `US ${us}`, uk && `UK ${uk}`].filter(Boolean).join('　')

  parts.push(
    `<div style="margin-bottom:8px">` +
    `<span style="font-size:1.3em;font-weight:700">${esc(w.word)}</span> ` +
    (audioTags ? `<span style="font-size:.9em">${audioTags}</span>` : '') +
    `</div>`
  )

  if (pron) {
    parts.push(`<div style="color:#6b7280;font-size:.9em;margin-bottom:4px">${esc(pron)}</div>`)
  }

  if (w.pos) {
    parts.push(`<div style="margin-bottom:8px"><span style="background:#dbeafe;color:#1d4ed8;padding:2px 8px;border-radius:4px;font-size:.8em;font-weight:700">${esc(w.pos)}</span></div>`)
  }

  // 中文釋義
  parts.push(`<div style="font-size:1.2em;font-weight:700;margin-bottom:4px">${esc(w.chinese_meaning)}</div>`)

  // 英文釋義
  if (w.definition_en) {
    parts.push(`<div style="color:#374151;margin-bottom:8px">${esc(w.definition_en)}</div>`)
  }

  // 例句
  if (w.example_en) {
    parts.push(`<hr style="border:none;border-top:1px solid #e5e7eb;margin:8px 0">`)
    parts.push(`<div style="color:#374151;font-style:italic">&ldquo;${esc(w.example_en)}&rdquo;</div>`)
    if (w.example_zh) {
      parts.push(`<div style="color:#6b7280;font-size:.9em;margin-top:2px">${esc(w.example_zh)}</div>`)
    }
  }

  // 變化形
  const inflections = Object.entries(w.inflections ?? {})
    .filter(([, v]) => v)
    .map(([k, v]) => `${INFLECTION_LABELS[k] ?? k}: <b>${esc(v)}</b>`)
  if (inflections.length) {
    parts.push(`<hr style="border:none;border-top:1px solid #e5e7eb;margin:8px 0">`)
    parts.push(`<div style="font-size:.85em;color:#6b7280">${inflections.join('　')}</div>`)
  }

  // 同義詞
  const synonyms = (w.synonyms ?? []).filter(Boolean)
  if (synonyms.length) {
    const tags = synonyms.map(s =>
      `<span style="background:#dcfce7;color:#15803d;padding:1px 8px;border-radius:4px;font-size:.8em">${esc(s)}</span>`
    ).join(' ')
    parts.push(`<div style="margin-top:6px">同義詞　${tags}</div>`)
  }

  // 反義詞
  const antonyms = (w.antonyms ?? []).filter(Boolean)
  if (antonyms.length) {
    const tags = antonyms.map(a =>
      `<span style="background:#fee2e2;color:#b91c1c;padding:1px 8px;border-radius:4px;font-size:.8em">${esc(a)}</span>`
    ).join(' ')
    parts.push(`<div style="margin-top:4px">反義詞　${tags}</div>`)
  }

  return parts.join('\n')
}

async function fetchAudioBlob(url) {
  try {
    const res = await fetch(url)
    if (!res.ok) return null
    return await res.blob()
  } catch {
    return null
  }
}

function triggerDownload(blob, filename) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

export async function downloadSingleAudio(word, accent) {
  const url = await getAudioUrl(word, accent)
  if (!url) throw new Error('找不到音檔')
  const blob = await fetchAudioBlob(url)
  if (!blob) throw new Error('音檔下載失敗（CORS 限制）')
  triggerDownload(blob, `${word}-${accent}.mp3`)
}

export async function downloadAnkiPackage(words, onProgress) {
  if (!words.length) return

  const zip = new JSZip()
  const audioResults = {}

  for (let i = 0; i < words.length; i++) {
    const w = words[i]
    onProgress?.({ current: i + 1, total: words.length, word: w.word })

    const [usUrl, ukUrl] = await Promise.all([
      getAudioUrl(w.word, 'us'),
      getAudioUrl(w.word, 'uk'),
    ])
    const [usBlob, ukBlob] = await Promise.all([
      usUrl ? fetchAudioBlob(usUrl) : null,
      ukUrl ? fetchAudioBlob(ukUrl) : null,
    ])

    audioResults[w.word] = { us: !!usBlob, uk: !!ukBlob }
    if (usBlob) zip.file(`${w.word}-us.mp3`, usBlob)
    if (ukBlob) zip.file(`${w.word}-uk.mp3`, ukBlob)
  }

  // 只用兩欄（正面、背面），不加 tags 欄位避免 Anki 欄位對應問題
  const lines = [
    '#separator:tab',
    '#html:true',
    '#notetype:Basic',
    '#deck:英文生詞表',
    ...words.map(w => {
      const r = audioResults[w.word] ?? {}
      return buildFront(w, r.us, r.uk) + '\t' + buildBack(w, r.us, r.uk)
    }),
  ]

  const txtBlob = new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8' })
  triggerDownload(txtBlob, 'vocabulary-anki.txt')

  const hasAudio = Object.values(audioResults).some(r => r.us || r.uk)
  if (hasAudio) {
    await new Promise(r => setTimeout(r, 600))
    const audioBlob = await zip.generateAsync({ type: 'blob' })
    triggerDownload(audioBlob, 'anki-audio.zip')
  }
}
