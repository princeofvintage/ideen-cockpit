// Zeigt den Markdown-Text, den Claude schreibt (Überschriften, Listen, **fett**).
// Bewusst klein gehalten und ohne HTML aus dem Text – es wird nur als React-Text gesetzt.

function Inline({ text }) {
  const teile = text.split(/(\*\*[^*]+\*\*)/g)
  return teile.map((t, i) =>
    t.startsWith('**') && t.endsWith('**') ? <b key={i}>{t.slice(2, -2)}</b> : <span key={i}>{t}</span>,
  )
}

export default function Text({ md }) {
  if (!md) return null
  const bloecke = []
  let liste = null
  for (const roh of md.split('\n')) {
    const zeile = roh.trimEnd()
    const punkt = zeile.match(/^\s*(?:[-*]|\d+\.)\s+(.*)$/)
    if (punkt) {
      if (!liste) { liste = []; bloecke.push({ typ: 'liste', punkte: liste }) }
      liste.push(punkt[1])
      continue
    }
    liste = null
    if (!zeile.trim()) continue
    const ueber = zeile.match(/^#{1,6}\s+(.*)$/)
    bloecke.push(ueber ? { typ: 'ueber', text: ueber[1] } : { typ: 'absatz', text: zeile })
  }
  return (
    <div className="md">
      {bloecke.map((b, i) =>
        b.typ === 'liste' ? (
          <ul key={i}>{b.punkte.map((p, j) => <li key={j}><Inline text={p} /></li>)}</ul>
        ) : b.typ === 'ueber' ? (
          <h5 key={i}><Inline text={b.text} /></h5>
        ) : (
          <p key={i}><Inline text={b.text} /></p>
        ),
      )}
    </div>
  )
}
