const POS_ZH = {
  noun: '名詞', verb: '動詞', adjective: '形容詞', adverb: '副詞',
  pronoun: '代名詞', preposition: '介系詞', conjunction: '連接詞',
  interjection: '感嘆詞', 'phrasal verb': '片語動詞', idiom: '慣用語',
}

export default function Summary({ words }) {
  const total = words.length
  const starred = words.filter(w => w.starred).length
  const starredWords = words.filter(w => w.starred)

  const posCounts = words.reduce((acc, w) => {
    const k = w.pos || 'other'
    acc[k] = (acc[k] || 0) + 1
    return acc
  }, {})
  const posEntries = Object.entries(posCounts).sort((a, b) => b[1] - a[1])
  const maxCount = posEntries.length ? Math.max(...posEntries.map(e => e[1])) : 1

  return (
    <div className="summary-page">
      {/* Stats row */}
      <div className="stats-row">
        <div className="stat-card">
          <span className="stat-num">{total}</span>
          <span className="stat-label">總單字數</span>
        </div>
        <div className="stat-card">
          <span className="stat-num starred-num">{starred}</span>
          <span className="stat-label">重點單字</span>
        </div>
        <div className="stat-card">
          <span className="stat-num">{posEntries.length}</span>
          <span className="stat-label">詞性種類</span>
        </div>
      </div>

      {/* Bar chart */}
      {posEntries.length > 0 && (
        <section className="chart-section">
          <h3 className="section-title">詞性分佈</h3>
          <div className="bar-chart">
            {posEntries.map(([pos, count]) => (
              <div key={pos} className="bar-row">
                <span className="bar-label">{POS_ZH[pos] ?? pos}</span>
                <div className="bar-track">
                  <div
                    className="bar-fill"
                    style={{ width: `${(count / maxCount) * 100}%` }}
                  />
                </div>
                <span className="bar-count">{count}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* All words */}
      <section className="word-list-section">
        <h3 className="section-title">全部單字 ({total})</h3>
        {total === 0 ? (
          <p className="empty-msg">尚無單字</p>
        ) : (
          <div className="word-table">
            {words.map(w => (
              <div key={w.word} className={`word-row${w.starred ? ' starred' : ''}`}>
                <span className="wr-word">{w.word}</span>
                <span className="wr-pos">{w.pos}</span>
                <span className="wr-zh">{w.chinese_meaning}</span>
                {w.starred && <span className="wr-star">★</span>}
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Starred words */}
      {starredWords.length > 0 && (
        <section className="word-list-section">
          <h3 className="section-title">⭐ 重點單字 ({starred})</h3>
          <div className="word-table">
            {starredWords.map(w => (
              <div key={w.word} className="word-row starred">
                <span className="wr-word">{w.word}</span>
                <span className="wr-pos">{w.pos}</span>
                <span className="wr-zh">{w.chinese_meaning}</span>
                <span className="wr-star">★</span>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
