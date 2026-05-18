const SYSTEM_PROMPT = `You are an English dictionary assistant. When given an English word or phrase, return ONLY a valid JSON object with exactly these fields (no markdown, no extra text):

{
  "word": "the word exactly as given",
  "pronunciation": { "us": "/IPA/", "uk": "/IPA/" },
  "pos": "noun",
  "chinese_meaning": "中文釋義",
  "definition_en": "Clear English definition.",
  "example_en": "A natural example sentence in English.",
  "example_zh": "例句的自然中文翻譯。",
  "inflections": {
    "past_tense": "",
    "past_participle": "",
    "present_participle": "",
    "third_person": "",
    "plural": "",
    "comparative": "",
    "superlative": ""
  },
  "synonyms": ["word1", "word2", "word3"],
  "antonyms": ["word1", "word2"],
  "thesaurus_examples": [
    { "synonym": "word1", "example": "Example sentence using word1." },
    { "synonym": "word2", "example": "Example sentence using word2." }
  ],
  "cambridge_url": "https://dictionary.cambridge.org/dictionary/english/WORD"
}

Rules:
- pos must be one of: noun, verb, adjective, adverb, pronoun, preposition, conjunction, interjection, phrasal verb, idiom
- Only include inflections relevant to the pos; leave others as empty strings
- Provide 3-5 synonyms and 1-3 antonyms when applicable; use empty arrays otherwise
- Provide 2-3 thesaurus_examples; use empty array if no synonyms
- For cambridge_url replace spaces with hyphens (e.g. "give up" → ".../give-up")
- Return ONLY the JSON object, nothing else`

export async function fetchWordData(word) {
  const key = import.meta.env.VITE_GROQ_KEY
  if (!key || key === 'your_groq_api_key_here') {
    throw new Error('請先在 .env 設定 VITE_GROQ_KEY')
  }

  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${key}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      temperature: 0.1,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: `Look up: ${word}` },
      ],
    }),
  })

  if (!response.ok) {
    const err = await response.json().catch(() => ({}))
    throw new Error(err.error?.message || `API 錯誤 ${response.status}`)
  }

  const data = await response.json()
  const text = data.choices?.[0]?.message?.content?.trim()
  if (!text) throw new Error('API 回傳空白，請重試')

  try {
    return JSON.parse(text)
  } catch {
    throw new Error('API 回傳格式錯誤，請重試')
  }
}

// Syncs to Google Sheets via Apps Script.
export async function syncToSheets(action, payload = {}) {
  const url = import.meta.env.VITE_GAS_URL
  if (!url || url === 'your_google_apps_script_web_app_url_here') return null

  try {
    const response = await fetch(url, {
      method: 'POST',
      body: JSON.stringify({ action, ...payload }),
    })
    return response.json()
  } catch (e) {
    console.warn('Google Sheets 同步失敗:', e.message)
    return null
  }
}

// Fetches pronunciation audio URL from Free Dictionary API.
export async function getAudioUrl(word, accent) {
  try {
    const res = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word)}`)
    if (!res.ok) return null
    const data = await res.json()
    const phonetics = data[0]?.phonetics || []

    const match =
      phonetics.find(p => p.audio && (accent === 'us' ? p.audio.includes('-us') : p.audio.includes('-uk'))) ||
      phonetics.find(p => p.audio && (accent === 'us' ? !p.audio.includes('-uk') : !p.audio.includes('-us'))) ||
      phonetics.find(p => p.audio)

    return match?.audio || null
  } catch {
    return null
  }
}
