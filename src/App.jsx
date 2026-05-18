import { useState, useEffect } from 'react'
import ListPage from './components/ListPage.jsx'
import Summary from './components/Summary.jsx'
import Quiz from './components/Quiz.jsx'
import { syncToSheets } from './api.js'

const STORAGE_KEY = 'vocab-app-words'

function loadLocal() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]') } catch { return [] }
}
function saveLocal(words) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(words)) } catch {}
}

export default function App() {
  const [words, setWords] = useState(loadLocal)
  const [view, setView] = useState('list')
  const [syncing, setSyncing] = useState(false)
  const [offline, setOffline] = useState(!navigator.onLine)
  const [installPrompt, setInstallPrompt] = useState(null)
  const [installed, setInstalled] = useState(false)

  // Online / offline detection
  useEffect(() => {
    const on = () => setOffline(false)
    const off = () => setOffline(true)
    window.addEventListener('online', on)
    window.addEventListener('offline', off)
    return () => { window.removeEventListener('online', on); window.removeEventListener('offline', off) }
  }, [])

  // Install prompt capture
  useEffect(() => {
    const handler = e => { e.preventDefault(); setInstallPrompt(e) }
    window.addEventListener('beforeinstallprompt', handler)
    window.addEventListener('appinstalled', () => { setInstalled(true); setInstallPrompt(null) })
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  // Initial sync from Sheets (non-blocking — local data shows immediately)
  useEffect(() => {
    if (offline) return
    setSyncing(true)
    syncToSheets('getAll')
      .then(result => {
        if (result?.words?.length) {
          setWords(result.words)
          saveLocal(result.words)
        }
      })
      .catch(() => {}) // Local data already loaded
      .finally(() => setSyncing(false))
  }, []) // eslint-disable-line

  function updateWords(next) {
    setWords(next)
    saveLocal(next)
  }

  async function addWord(wordData) {
    const entry = { ...wordData, starred: false, addedAt: Date.now() }
    const next = [entry, ...words.filter(w => w.word !== entry.word)]
    updateWords(next)
    await syncToSheets('add', { word: entry })
  }

  async function deleteWord(word) {
    updateWords(words.filter(w => w.word !== word))
    await syncToSheets('delete', { word })
  }

  async function toggleStar(word) {
    let newStarred = false
    const next = words.map(w => {
      if (w.word !== word) return w
      newStarred = !w.starred
      return { ...w, starred: newStarred }
    })
    updateWords(next)
    await syncToSheets('star', { word, starred: newStarred })
  }

  async function handleInstall() {
    if (!installPrompt) return
    installPrompt.prompt()
    const { outcome } = await installPrompt.userChoice
    if (outcome === 'accepted') setInstallPrompt(null)
  }

  return (
    <div className="app">
      {/* Offline banner */}
      {offline && (
        <div className="banner banner-offline" role="status">
          離線模式 — 顯示本機快取資料，查詢功能暫不可用
        </div>
      )}

      {/* Header */}
      <header className="app-header">
        <div className="header-left">
          <h1 className="app-title">英文生詞表</h1>
          {syncing && <span className="sync-dot" title="同步中…" />}
        </div>
        <nav className="app-nav">
          <button
            className={`nav-btn ${view === 'list' ? 'active' : ''}`}
            onClick={() => setView('list')}
          >字典</button>
          <button
            className={`nav-btn ${view === 'summary' ? 'active' : ''}`}
            onClick={() => setView('summary')}
          >總表</button>
          <button
            className={`nav-btn ${view === 'quiz' ? 'active' : ''}`}
            onClick={() => setView('quiz')}
          >測驗</button>
        </nav>
        {installPrompt && !installed && (
          <button className="install-btn" onClick={handleInstall} title="安裝 App">
            ⬇ 安裝
          </button>
        )}
      </header>

      <main className="app-main">
        {view === 'list' && (
          <ListPage
            words={words}
            onAdd={addWord}
            onDelete={deleteWord}
            onStar={toggleStar}
            offline={offline}
          />
        )}
        {view === 'summary' && <Summary words={words} />}
        {view === 'quiz' && <Quiz words={words} />}
      </main>
    </div>
  )
}
