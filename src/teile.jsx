// Kleine Bausteine, die mehrere Bildschirme brauchen
import { NAMEN } from './config.js'

export function noteKlasse(n) {
  if (n == null) return 'offen'
  if (n >= 7) return 'stark'
  if (n >= 5) return 'mittel'
  return 'schwach'
}

export function Note({ wert }) {
  if (wert == null) return <span className="note offen">wartet</span>
  const k = noteKlasse(wert)
  return <span className={`note ${k}`}>{k === 'stark' ? '▲' : k === 'mittel' ? '●' : '▼'} {wert}</span>
}

export const ART = { content: 'Content', business: 'Business', sonstiges: 'Sonstiges' }
export const STATUS = {
  neu: 'Wartet auf Claude', ausgearbeitet: 'Ausgearbeitet', weiterverfolgen: 'Weiterverfolgt', verworfen: 'Verworfen',
}

export const wer = (von) => NAMEN[von] || von

export function wann(iso) {
  const d = new Date(iso)
  const jetzt = new Date()
  const min = Math.round((jetzt - d) / 60000)
  if (min < 1) return 'gerade eben'
  if (min < 60) return `vor ${min} Min.`
  if (min < 24 * 60 && d.getDate() === jetzt.getDate()) return `heute, ${d.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}`
  return d.toLocaleDateString('de-DE', { weekday: 'short', day: '2-digit', month: '2-digit' }) +
    ', ' + d.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })
}

// Titel einer Idee, auch wenn Claude sie noch nicht ausgearbeitet hat
export function titelVon(idee) {
  if (idee.titel) return idee.titel
  const t = (idee.transkript || '').trim()
  if (!t) return 'Sprachaufnahme'
  return t.length > 60 ? t.slice(0, 57).trimEnd() + ' …' : t
}

export const Icon = {
  mic: <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 15a3.5 3.5 0 0 0 3.5-3.5v-6a3.5 3.5 0 1 0-7 0v6A3.5 3.5 0 0 0 12 15Zm6-3.5a1 1 0 1 0-2 0 4 4 0 0 1-8 0 1 1 0 1 0-2 0 6 6 0 0 0 5 5.91V20H8.5a1 1 0 1 0 0 2h7a1 1 0 1 0 0-2H13v-2.59a6 6 0 0 0 5-5.91Z"/></svg>,
  cockpit: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M9 3v18M9 12h12"/></svg>,
  birne: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M9 18h6M10 22h4M12 2a7 7 0 0 0-4 12.7V17h8v-2.3A7 7 0 0 0 12 2Z"/></svg>,
  dokument: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8zM14 2v6h6M9 15l2 2 4-4"/></svg>,
  pfeil: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg>,
  stern: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"><path d="m12 2 3.1 6.3 6.9 1-5 4.9 1.2 6.8L12 17.8 5.8 21l1.2-6.8-5-4.9 6.9-1z"/></svg>,
  raus: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/></svg>,
  wolke: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M12 13v8M8 17l4 4 4-4M20 16.6A5 5 0 0 0 18 7h-1.3A8 8 0 1 0 4 15.3"/></svg>,
}
