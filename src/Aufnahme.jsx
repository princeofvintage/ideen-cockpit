import { useEffect, useRef, useState } from 'react'
import Kugel from './Kugel.jsx'
import { MAX_SEKUNDEN } from './config.js'

const Erkennung = typeof window !== 'undefined' && (window.SpeechRecognition || window.webkitSpeechRecognition)

function bestesFormat() {
  if (typeof MediaRecorder === 'undefined') return ''
  for (const t of ['audio/mp4', 'audio/webm;codecs=opus', 'audio/webm', 'audio/ogg']) {
    if (MediaRecorder.isTypeSupported?.(t)) return t
  }
  return ''
}

const uhrzeit = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`

// modus: { titel, nurText } – liefert onSpeichern({ text, blob, mime })
export default function Aufnahme({ titel = 'Neue Idee', nurText = false, onSpeichern, onAbbruch }) {
  const [phase, setPhase] = useState(nurText ? 'fertig' : 'start')
  const [sekunden, setSekunden] = useState(0)
  const [live, setLive] = useState('')
  const [text, setText] = useState('')
  const [hinweis, setHinweis] = useState('')
  const [blob, setBlob] = useState(null)

  const pegel = useRef(0)
  const res = useRef({})
  const endgueltig = useRef('')

  useEffect(() => {
    if (nurText) return
    let abgebrochen = false
    const r = res.current

    async function starten() {
      let stream
      try {
        stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      } catch {
        if (abgebrochen) return
        setHinweis('Kein Zugriff aufs Mikrofon. Du kannst die Idee unten eintippen – oder in den Einstellungen das Mikrofon für diese App erlauben.')
        setPhase('fertig')
        return
      }
      if (abgebrochen) return stream.getTracks().forEach((t) => t.stop())
      r.stream = stream

      // Lautstärke für die Kugel
      try {
        const AC = window.AudioContext || window.webkitAudioContext
        r.audio = new AC()
        const quelle = r.audio.createMediaStreamSource(r.stream)
        const analyse = r.audio.createAnalyser()
        analyse.fftSize = 512
        quelle.connect(analyse)
        const daten = new Uint8Array(analyse.fftSize)
        r.pegelUhr = setInterval(() => {
          analyse.getByteTimeDomainData(daten)
          let summe = 0
          for (const v of daten) summe += ((v - 128) / 128) ** 2
          pegel.current = Math.min(1, Math.sqrt(summe / daten.length) * 6)
        }, 60)
      } catch { /* Kugel bewegt sich dann einfach ruhig */ }

      // Audio wird immer aufgenommen
      const mime = bestesFormat()
      r.recorder = new MediaRecorder(r.stream, mime ? { mimeType: mime } : undefined)
      r.stuecke = []
      r.recorder.ondataavailable = (e) => e.data.size && r.stuecke.push(e.data)
      r.recorder.onstop = () => {
        const typ = r.recorder.mimeType || mime || 'audio/mp4'
        setBlob({ blob: new Blob(r.stuecke, { type: typ }), mime: typ })
      }
      r.recorder.start(1000)

      // Live-Text, wo Safari das kann – sonst tippt Claude es abends aus der Aufnahme ab
      if (Erkennung) {
        try {
          const erk = new Erkennung()
          erk.lang = 'de-DE'
          erk.continuous = true
          erk.interimResults = true
          erk.onresult = (e) => {
            let zwischen = ''
            for (let i = e.resultIndex; i < e.results.length; i++) {
              const t = e.results[i][0].transcript
              if (e.results[i].isFinal) endgueltig.current += (endgueltig.current ? ' ' : '') + t.trim()
              else zwischen += t
            }
            setLive((endgueltig.current + ' ' + zwischen).trim())
          }
          erk.onerror = () => {}
          erk.onend = () => { if (r.aufnehmend) { try { erk.start() } catch { /* läuft schon */ } } }
          erk.start()
          r.erkennung = erk
        } catch { r.erkennung = null }
      }

      r.aufnehmend = true
      setPhase('laeuft')
      const beginn = Date.now()
      r.uhr = setInterval(() => {
        const s = Math.floor((Date.now() - beginn) / 1000)
        setSekunden(s)
        if (s >= MAX_SEKUNDEN) stoppen()
      }, 250)
    }
    starten()

    return () => {
      abgebrochen = true
      aufraeumen()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function aufraeumen() {
    const r = res.current
    r.aufnehmend = false
    clearInterval(r.uhr); clearInterval(r.pegelUhr)
    try { r.erkennung?.stop() } catch { /* schon aus */ }
    if (r.recorder?.state === 'recording') r.recorder.stop()
    r.stream?.getTracks().forEach((t) => t.stop())
    r.audio?.close?.().catch(() => {})
  }

  function stoppen() {
    aufraeumen()
    setText((endgueltig.current || '').trim() || res.current.letzterLive || '')
    setPhase('fertig')
  }

  // Den letzten Live-Stand merken, falls Safari den Satz nicht mehr "fertig" meldet
  useEffect(() => { res.current.letzterLive = live }, [live])

  const ohneText = !text.trim() && !blob

  return (
    <div className="ebene offen">
      <div className="aufnahme">
        <div className="oben">
          <button className="leiseknopf" onClick={() => { aufraeumen(); onAbbruch() }}>Abbrechen</button>
          <span className="titel">{titel}</span>
          <span style={{ width: 70 }} />
        </div>

        {phase !== 'fertig' && (
          <div className="laeuft">
            <Kugel className="kugel-gross" punkte={2200} energie={() => 0.2 + pegel.current * 0.8} />
            <div className="zeit">{uhrzeit(sekunden)}</div>
            <div className="live">{phase === 'start' ? 'Mikrofon startet …' : live}</div>
            {phase === 'laeuft' && !Erkennung && (
              <p className="hilfe">Der Text erscheint nicht live – die Aufnahme wird abends abgetippt.</p>
            )}
            <button className="stopp" onClick={stoppen} disabled={phase !== 'laeuft'} aria-label="Aufnahme beenden"><span /></button>
            <div className="hilfe">Tippen zum Beenden</div>
          </div>
        )}

        {phase === 'fertig' && (
          <div className="fertig">
            {hinweis && <p className="warnung">{hinweis}</p>}
            {!nurText && !hinweis && (
              <p>
                {text
                  ? 'Passt der Text? Du kannst ihn kurz korrigieren. Die Aufnahme selbst wird immer mitgespeichert.'
                  : 'Die Aufnahme ist gespeichert und wird heute Abend abgetippt. Du kannst unten trotzdem ein paar Worte dazuschreiben.'}
              </p>
            )}
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={nurText || hinweis ? 'Idee eintippen …' : 'Optional: ein paar Worte dazu …'}
              autoFocus={nurText || !!hinweis}
            />
            <button
              className="hauptknopf"
              disabled={ohneText || (!nurText && !hinweis && !blob)}
              onClick={() => onSpeichern({ text: text.trim(), blob: blob?.blob || null, mime: blob?.mime || null })}
            >
              Speichern
            </button>
            <button className="leiseknopf" onClick={() => { aufraeumen(); onAbbruch() }}>Verwerfen</button>
          </div>
        )}
      </div>
    </div>
  )
}
