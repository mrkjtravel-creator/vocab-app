const COLORS = {
  noun:          { bg: '#dbeafe', text: '#1d4ed8' },
  verb:          { bg: '#dcfce7', text: '#15803d' },
  adjective:     { bg: '#fef3c7', text: '#b45309' },
  adverb:        { bg: '#ede9fe', text: '#7c3aed' },
  pronoun:       { bg: '#fee2e2', text: '#b91c1c' },
  preposition:   { bg: '#fce7f3', text: '#be185d' },
  conjunction:   { bg: '#e0f2fe', text: '#0369a1' },
  interjection:  { bg: '#ffedd5', text: '#c2410c' },
  'phrasal verb':{ bg: '#f0fdf4', text: '#166534' },
  idiom:         { bg: '#fdf4ff', text: '#7e22ce' },
}

export default function Badge({ pos }) {
  if (!pos) return null
  const c = COLORS[pos] ?? { bg: '#f3f4f6', text: '#374151' }
  return (
    <span className="badge" style={{ background: c.bg, color: c.text }}>
      {pos}
    </span>
  )
}
