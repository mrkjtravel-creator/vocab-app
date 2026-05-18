import { useState, useEffect, useCallback } from 'react'
import { getAudioUrl } from '../api.js'
import {
  loadReviews, saveReviews,
  calcNextReview, previewInterval, formatInterval, buildQueue,
} from '../utils/srs.js'

const RATINGS = [
  { key: 'again', label: '重來',  color: '#ef4444' },
  { key: 'hard',  label: '困難',  color: '#f59e0b' },
  { key: 'good',  label: '良好',  color: '#3b82f6' },
  { key: 'easy',  label: '簡單',  color: '#10b981' },
]

function speakWord(word) {
  const u = new SpeechSynthesisUtterance(word)
  u.lang = 'en-US'
  window.speechSynthesis.cancel()
  window.speechSynthesis.speak(u)
}

export default function Quiz({ words }) {
  const [reviews, setReviews] = useState(loadReviews)
  const [queue, setQueue] = useState([])
  const [index, setIndex] = useState(0)
  const [showAnswer, setShowAnswer] = useState(false)
  const [done, setDone] = useState(false)
  const [sessionLog, setSessionLog] = useState([]) // [{word, rating}]
  const [audioUrl, setAudioUrl] = useState(null)
  const [playing, setPlaying] = useState(false)

  // Build queue on mount / when words change
  useEffect(() => {
    const q = buildQueue(words, reviews)
    setQueue(q)
    setIndex(0)
    setShowAnswer(false)
    setDone(q.length === 0)
  }, [words]) // eslint-disable-line

  const current = queue[index]

  // Pre-fetch audio when card changes
  useEffect(() => {
    if (!current) return
    setAudioUrl(null)
    getAudioUrl(current.word, 'us').then(url => setAudioUrl(url || null))
  }, [current?.word])

  // Auto-play audio when card appears
  useEffect(() => {
    if (!current || showAnswer) return
    if (audioUrl) {
      playAudio()
    } else {
      const t = setTimeout(() => speakWord(current.word), 300)
      return () => clearTimeout(t)
    }
  }, [current?.word, audioUrl]) // eslint-disable-line

  async function playAudio() {
    if (playing) return
    setPlaying(true)
    try {
      if (audioUrl) {
        const audio = new Audio(audioUrl)
        audio.onended = () => setPlaying(false)
        audio.onerror = () => { speakWord(current.word); setPlaying(false) }
        await audio.play()
      } else {
        speakWord(current.word)
        setPlaying(false)
      }
    } catch {
      speakWord(current.word)
      setPlaying(false)
    }
  }

  function handleReveal() {
    setShowAnswer(true)
  }

  function handleRate(rating) {
    const next = calcNextReview(reviews[current.word], rating)
    const newReviews = { ...reviews, [current.word]: next }
    setReviews(newReviews)
    saveReviews(newReviews)
    setSessionLog(prev => [...prev, { word: current.word, rating }])

    const nextIndex = index + 1
    if (nextIndex >= queue.length) {
      setDone(true)
    } else {
      setIndex(nextIndex)
      setShowAnswer(false)
    }
  }

  // Summary screen
  if (done) {
    const counts = { again: 0, hard: 0, good: 0, easy: 0 }
    sessionLog.forEach(l => counts[l.rating]++)
    return (
      <div className="quiz-page">
        <div className="quiz-summary">
          <div className="summary-icon">🎉</div>
          <h2>本次完成！</h2>
          <p className="summary-sub">共複習 {sessionLog.length} 個單字</p>
          <div className="summary-stats">
            {RATINGS.map(r => (
              <div key={r.key} className="summary-stat">
                <span className="stat-label" style={{ color: r.color }}>{r.label}</span>
                <span className="stat-val">{counts[r.key]}</span>
              </div>
            ))}
          </div>
          <button
            className="restart-btn"
            onClick={() => {
              const q = buildQueue(words, loadReviews())
              setQueue(q)
              setIndex(0)
              setShowAnswer(false)
              setSessionLog([])
              setDone(q.length === 0)
              setReviews(loadReviews())
            }}
          >
            再來一輪
          </button>
        </div>
      </div>
    )
  }

  // No words at all
  if (words.length === 0) {
    return (
      <div className="quiz-page">
        <div className="quiz-empty">先到字典頁查幾個單字，再來測驗吧！</div>
      </div>
    )
  }

  // All words reviewed and not due yet
  if (queue.length === 0) {
    return (
      <div className="quiz-page">
        <div className="quiz-empty">
          <div style={{ fontSize: '2.5rem', marginBottom: '.5rem' }}>✅</div>
          今天的單字都複習完了！<br />
          <span style={{ fontSize: '.85rem', color: 'var(--text-muted)' }}>明天再來</span>
        </div>
      </div>
    )
  }

  const progress = index / queue.length

  return (
    <div className="quiz-page">
      {/* Progress */}
      <div className="quiz-progress-row">
        <span className="quiz-progress-text">{index + 1} / {queue.length}</span>
        <div className="quiz-progress-bar">
          <div className="quiz-progress-fill" style={{ width: `${progress * 100}%` }} />
        </div>
      </div>

      {/* Card */}
      <div className={`quiz-card ${showAnswer ? 'revealed' : ''}`}>

        {/* Front: word + audio */}
        <div className="quiz-front-section">
          <h1 className="quiz-word">{current.word}</h1>
          <button
            className={`quiz-audio-btn ${playing ? 'playing' : ''}`}
            onClick={playAudio}
            disabled={playing}
          >
            🔊 發音
          </button>
        </div>

        {/* Back: revealed on click */}
        {showAnswer ? (
          <>
            <div className="quiz-divider" />
            <div className="quiz-back-section">
              <div className="quiz-pos-badge">{current.pos}</div>
              <p className="quiz-chinese">{current.chinese_meaning}</p>
              <p className="quiz-def">{current.definition_en}</p>
              {current.example_en && (
                <blockquote className="quiz-example">
                  <p className="quiz-ex-en">"{current.example_en}"</p>
                  <p className="quiz-ex-zh">{current.example_zh}</p>
                </blockquote>
              )}
            </div>

            {/* Rating buttons */}
            <div className="rating-row">
              {RATINGS.map(r => {
                const days = previewInterval(reviews[current.word], r.key)
                return (
                  <button
                    key={r.key}
                    className="rating-btn"
                    style={{ '--rating-color': r.color }}
                    onClick={() => handleRate(r.key)}
                  >
                    <span className="rating-interval">{formatInterval(days)}</span>
                    <span className="rating-label">{r.label}</span>
                  </button>
                )
              })}
            </div>
          </>
        ) : (
          <button className="reveal-btn" onClick={handleReveal}>
            顯示答案
          </button>
        )}
      </div>
    </div>
  )
}
