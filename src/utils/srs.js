// Simplified SM-2 spaced repetition algorithm
// interval unit: days

const STORAGE_KEY = 'vocab-app-reviews'

export function loadReviews() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}') } catch { return {} }
}

export function saveReviews(reviews) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(reviews)) } catch {}
}

// Calculate next interval after rating
// rating: 'again' | 'hard' | 'good' | 'easy'
export function calcNextReview(current, rating) {
  const ease = current?.ease ?? 2.5
  const reps = current?.reps ?? 0
  const interval = current?.interval ?? 0

  let newInterval, newEase, newReps

  if (rating === 'again') {
    newInterval = 10 / 1440   // 10 minutes
    newEase     = Math.max(1.3, ease - 0.2)
    newReps     = 0
  } else if (reps === 0) {
    // First successful review
    newInterval = { hard: 1 / 24, good: 1, easy: 4 }[rating]
    newEase     = ease
    newReps     = 1
  } else {
    const multiplier = { hard: 1.2, good: ease, easy: ease * 1.3 }[rating]
    newInterval = Math.max(1, interval * multiplier)
    newEase = {
      hard: Math.max(1.3, ease - 0.15),
      good: ease,
      easy: Math.min(4.0, ease + 0.15),
    }[rating]
    newReps = reps + 1
  }

  return {
    interval: newInterval,
    ease: newEase,
    reps: newReps,
    dueDate: Date.now() + newInterval * 86400000,
  }
}

// Preview next interval without saving (for button labels)
export function previewInterval(current, rating) {
  return calcNextReview(current, rating).interval
}

export function formatInterval(days) {
  const mins = days * 1440
  if (mins < 60)    return `${Math.round(mins)} 分鐘`
  if (mins < 1440)  return `${+(mins / 60).toFixed(1)} 小時`
  if (days < 30)    return `${Math.round(days)} 天`
  return `${Math.round(days / 30)} 個月`
}

// Build quiz queue: due words first, then new words, capped at limit
export function buildQueue(words, reviews, limit = 30) {
  const now = Date.now()
  const due = [], fresh = []

  for (const w of words) {
    const r = reviews[w.word]
    if (!r) {
      fresh.push(w)
    } else if (r.dueDate <= now) {
      due.push(w)
    }
  }

  // Shuffle each group
  shuffle(due)
  shuffle(fresh)
  return [...due, ...fresh].slice(0, limit)
}

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]]
  }
}
