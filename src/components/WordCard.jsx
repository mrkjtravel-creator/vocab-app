import { useState } from 'react'
import Badge from './Badge.jsx'
import { getAudioUrl } from '../api.js'

const TABS = ['字典', '變化', '同義詞典']

const INFLECTION_LABELS = {
  past_tense:          '過去式',
  past_participle:     '過去分詞',
  present_participle:  '現在分詞',
  third_person:        '第三人稱單數',
  plural:              '複數',
  comparative:         '比較級',
  superlative:         '最高級',
}

function speakFallback(word, accent) {
  const u = new SpeechSynthesisUtterance(word)
  u.lang = accent === 'us' ? 'en-US' : 'en-GB'
  window.speechSynthesis.cancel()
  window.speechSynthesis.speak(u)
}

export default function WordCard({ data, onDelete, onStar }) {
  const [tab, setTab] = useState(0)
  const [playing, setPlaying] = useState(null) // 'us' | 'uk' | null

  async function playAudio(accent) {
    if (playing) return
    setPlaying(accent)
    try {
      const url = await getAudioUrl(data.word, accent)
      if (url) {
        const audio = new Audio(url)
        audio.onended = () => setPlaying(null)
        audio.onerror = () => { speakFallback(data.word, accent); setPlaying(null) }
        await audio.play()
      } else {
        speakFallback(data.word, accent)
        setPlaying(null)
      }
    } catch {
      speakFallback(data.word, accent)
      setPlaying(null)
    }
  }

  const inflections = data.inflections ?? {}
  const hasInflections = Object.values(inflections).some(v => v)
  const synonyms = data.synonyms ?? []
  const antonyms = data.antonyms ?? []
  const thesaurus = data.thesaurus_examples ?? []

  return (
    <article className={`word-card${data.starred ? ' starred' : ''}`}>
      {/* Header */}
      <div className="card-head">
        <div className="word-main">
          <h2 className="word-text">{data.word}</h2>
          <div className="pron-row">
            <span className="ipa">US {data.pronunciation?.us}</span>
            <button
              className={`audio-btn${playing === 'us' ? ' playing' : ''}`}
              onClick={() => playAudio('us')}
              aria-label="美式發音"
              disabled={!!playing}
            >
              🔊 US
            </button>
            <span className="ipa sep">·</span>
            <span className="ipa">UK {data.pronunciation?.uk}</span>
            <button
              className={`audio-btn${playing === 'uk' ? ' playing' : ''}`}
              onClick={() => playAudio('uk')}
              aria-label="英式發音"
              disabled={!!playing}
            >
              🔊 UK
            </button>
          </div>
        </div>
        <div className="card-actions">
          <Badge pos={data.pos} />
          <button
            className={`star-btn${data.starred ? ' active' : ''}`}
            onClick={() => onStar(data.word)}
            aria-label={data.starred ? '取消重點' : '標記重點'}
          >★</button>
          <button
            className="delete-btn"
            onClick={() => onDelete(data.word)}
            aria-label="刪除單字"
          >✕</button>
        </div>
      </div>

      {/* Tabs */}
      <div className="card-tabs" role="tablist">
        {TABS.map((t, i) => (
          <button
            key={t}
            role="tab"
            aria-selected={tab === i}
            className={`tab-btn${tab === i ? ' active' : ''}`}
            onClick={() => setTab(i)}
          >{t}</button>
        ))}
      </div>

      {/* Tab content */}
      <div className="card-body">

        {/* 字典 */}
        {tab === 0 && (
          <div className="tab-dict">
            <p className="meaning-zh">{data.chinese_meaning}</p>
            <p className="definition-en">{data.definition_en}</p>
            <blockquote className="example-block">
              <p className="ex-en">"{data.example_en}"</p>
              <p className="ex-zh">{data.example_zh}</p>
            </blockquote>
            {data.cambridge_url && (
              <a
                href={data.cambridge_url}
                target="_blank"
                rel="noopener noreferrer"
                className="cambridge-link"
              >劍橋字典 →</a>
            )}
          </div>
        )}

        {/* 變化 */}
        {tab === 1 && (
          <div className="tab-inflections">
            {hasInflections ? (
              <table className="inflect-table">
                <tbody>
                  {Object.entries(INFLECTION_LABELS).map(([key, label]) =>
                    inflections[key] ? (
                      <tr key={key}>
                        <td className="inflect-label">{label}</td>
                        <td className="inflect-value">{inflections[key]}</td>
                      </tr>
                    ) : null
                  )}
                </tbody>
              </table>
            ) : (
              <p className="empty-msg">此詞無變化形式</p>
            )}
          </div>
        )}

        {/* 同義詞典 */}
        {tab === 2 && (
          <div className="tab-thesaurus">
            {synonyms.length > 0 && (
              <section className="thes-section">
                <h4 className="thes-heading">同義詞</h4>
                <div className="tag-list">
                  {synonyms.map(s => <span key={s} className="syn-tag">{s}</span>)}
                </div>
              </section>
            )}
            {antonyms.length > 0 && (
              <section className="thes-section">
                <h4 className="thes-heading">反義詞</h4>
                <div className="tag-list">
                  {antonyms.map(a => <span key={a} className="ant-tag">{a}</span>)}
                </div>
              </section>
            )}
            {thesaurus.length > 0 && (
              <section className="thes-section">
                <h4 className="thes-heading">同義詞例句</h4>
                <div className="thes-examples">
                  {thesaurus.map((t, i) => (
                    <div key={i} className="thes-item">
                      <span className="syn-tag">{t.synonym}</span>
                      <p className="thes-ex">"{t.example}"</p>
                    </div>
                  ))}
                </div>
              </section>
            )}
            {!synonyms.length && !antonyms.length && !thesaurus.length && (
              <p className="empty-msg">無同義詞資料</p>
            )}
          </div>
        )}
      </div>
    </article>
  )
}
