import { useState, useMemo } from 'react'
import WordCard from './WordCard.jsx'
import { fetchWordData } from '../api.js'

const POS_OPTIONS = [
  '全部', 'noun', 'verb', 'adjective', 'adverb',
  'pronoun', 'preposition', 'conjunction', 'interjection', 'phrasal verb', 'idiom',
]

export default function ListPage({ words, onAdd, onDelete, onStar, offline }) {
  const [input, setInput] = useState('')
  const [looking, setLooking] = useState(false)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [posFilter, setPosFilter] = useState('全部')
  const [starOnly, setStarOnly] = useState(false)

  async function handleLookup() {
    const word = input.trim()
    if (!word || looking) return
    setLooking(true)
    setError('')
    try {
      const data = await fetchWordData(word)
      await onAdd(data)
      setInput('')
    } catch (e) {
      setError(e.message)
    } finally {
      setLooking(false)
    }
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter') handleLookup()
  }

  const filtered = useMemo(() => {
    return words.filter(w => {
      if (starOnly && !w.starred) return false
      if (posFilter !== '全部' && w.pos !== posFilter) return false
      if (search && !w.word.toLowerCase().includes(search.toLowerCase())) return false
      return true
    })
  }, [words, search, posFilter, starOnly])

  const starredCount = words.filter(w => w.starred).length

  return (
    <div className="list-page">
      {/* Lookup bar */}
      <div className="lookup-bar">
        <input
          type="text"
          className="lookup-input"
          placeholder="輸入英文單字或片語..."
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={looking}
          autoFocus
        />
        <button
          className="lookup-btn"
          onClick={handleLookup}
          disabled={looking || !input.trim() || offline}
        >
          {looking ? <span className="loading-spinner small" /> : '查詢'}
        </button>
      </div>
      {error && <p className="error-msg">⚠ {error}</p>}

      {/* Filter bar */}
      <div className="filter-bar">
        <div className="filter-group">
          <button
            className={`filter-pill${!starOnly ? ' active' : ''}`}
            onClick={() => setStarOnly(false)}
          >全部 <span className="pill-count">{words.length}</span></button>
          <button
            className={`filter-pill${starOnly ? ' active' : ''}`}
            onClick={() => setStarOnly(true)}
          >⭐ 重點 <span className="pill-count">{starredCount}</span></button>
        </div>
        <input
          type="text"
          className="search-input"
          placeholder="搜尋..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <select
          className="pos-select"
          value={posFilter}
          onChange={e => setPosFilter(e.target.value)}
        >
          {POS_OPTIONS.map(p => <option key={p} value={p}>{p}</option>)}
        </select>
      </div>

      {/* Cards */}
      {filtered.length === 0 ? (
        <div className="empty-state">
          {words.length === 0
            ? '還沒有單字，輸入單字開始查詢吧！'
            : '沒有符合條件的單字'}
        </div>
      ) : (
        <div className="cards-grid">
          {filtered.map(w => (
            <WordCard
              key={w.word}
              data={w}
              onDelete={onDelete}
              onStar={onStar}
            />
          ))}
        </div>
      )}
    </div>
  )
}
