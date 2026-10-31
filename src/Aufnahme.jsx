import { useEffect, useRef, useState } from 'react'
import Kugel from './Kugel.jsx'
import { MAX_SEKUNDEN } from './config.js'
import { log, fehlerText, VERSION } from './protokoll.js'

const erkennungHolen = () => window.SpeechRecognition || window.webkitSpeechRecognition

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
  const [ohneLive, setOhneLive] = useState(false)

  const pegel = useRef(0)
  const res = useRef({})
  const endgueltig = useRef('')

  useEffect(() => {
    if (nurText) return
    let abgebrochen = false
    const r = res.current

    async function starten() {
      let stream
      log('aufnahme_start', { erkennung: !!erkennungHolen(), recorder: typeof MediaRecorder !== 'undefined', format: bestesFormat() })
      try {
        stream = await navigator.mediaDevices.getUserMedia({ audio: true })
        log('mikrofon_ok')
      } catch (e) {
        log('mikrofon_fehler', { fehler: fehlerText(e) })
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
      r.recorder.ondataavailable = (e) => { if (e.data && e.data.size) r.stuecke.push(e.data) }
      r.recorder.onerror = (e) => log('recorder_fehler', { fehler: fehlerText(e?.error || e) })
      r.recorder.onstop = () => {
        const typ = r.recorder.mimeType || mime || 'audio/mp4'
        const b = new Blob(r.stuecke, { type: typ })
        log('recorder_fertig', { bytes: b.size, stuecke: r.stuecke.length, typ })
        setBlob(b.size ? { blob: b, mime: typ } : { blob: null, mime: null, leer: true })
      }
      r.recorder.start(1000)

      log('recorder_laeuft', { typ: r.recorder.mimeType })
      r.aufnehmend = true
      setPhase('laeuft')
      const beginn = Date.now()
      r.uhr = setInterval(() => {
        const s = Math.floor((Date.now() - beginn) / 1000)
        setSekunden(s)
        if (s >= MAX_SEKUNDEN) stoppen()
      }, 250)

      // Live-Text, wo Safari das kann – sonst tippt Claude es abends aus der Aufnahme ab.
      // Auf dem iPhone scheitert das oft, während gleichzeitig aufgenommen wird: dann still aufgeben,
      // nie in schneller Schleife neu starten.
      const Erkennung = erkennungHolen()
      if (Erkennung) {
        let neustarts = 0
        const erk = new Erkennung()
        erk.lang = 'de-DE'
        erk.continuous = true
        erk.interimResults = true
        erk.onresult = (e) => {
          neustarts = 0
          let zwischen = ''
          for (let i = e.resultIndex; i < e.results.length; i++) {
            const t = e.results[i][0].transcript
            if (e.results[i].isFinal) endgueltig.current += (endgueltig.current ? ' ' : '') + t.trim()
            else zwischen += t
          }
          setLive((endgueltig.current + ' ' + zwischen).trim())
        }
        erk.onerror = (e) => {
          log('erkennung_fehler', { fehler: e.error, neustarts })
          if (e.error !== 'no-speech' && e.error !== 'aborted') { r.erkennungAus = true; setOhneLive(true) }
        }
        erk.onend = () => {
          if (!r.aufnehmend || r.erkennungAus) return
          if (++neustarts > 5) { r.erkennungAus = true; setOhneLive(true); return }
          setTimeout(() => { if (r.aufnehmend && !r.erkennungAus) { try { erk.start() } catch { /* läuft schon */ } } }, 500)
        }
        r.erkennung = erk
        try { erk.start(); log('erkennung_start') } catch (e) { log('erkennung_startfehler', { fehler: fehlerText(e) }); r.erkennungAus = true; setOhneLive(true) }
      } else {
        setOhneLive(true)
      }
    }
    starten().catch((e) => {
      log('aufnahme_fehler', { fehler: fehlerText(e) })
      if (abgebrochen) return
      aufraeumen()
      setHinweis('Die Aufnahme ließ sich nicht starten (' + (e?.message || e) + '). Du kannst die Idee unten eintippen.')
      setPhase('fertig')
    })

    return () => {
      abgebrochen = true
      aufraeumen()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Jeder Schritt einzeln abgesichert – Stopp und Abbrechen müssen immer funktionieren
  function aufraeumen() {
    const r = res.current
    r.aufnehmend = false
    clearInterval(r.uhr); clearInterval(r.pegelUhr)
    try { r.erkennung?.abort?.() } catch { /* schon aus */ }
    try { if (r.recorder && r.recorder.state !== 'inactive') r.recorder.stop() } catch { /* schon aus */ }
    try { r.stream?.getTracks().forEach((t) => t.stop()) } catch { /* schon aus */ }
    try { Promise.resolve(r.audio?.close?.()).catch(() => {}) } catch { /* schon zu */ }
  }

  function stoppen() {
    const r = res.current
    log('stopp_gedrueckt', { recorder: r.recorder?.state || 'keiner', liveZeichen: (res.current.letzterLive || '').length })
    if (!r.recorder) setBlob({ blob: null, mime: null, leer: true })
    // Falls Safari die fertige Aufnahme nie meldet, nicht ewig warten
    setTimeout(() => setBlob((b) => b ?? { blob: null, mime: null, leer: true }), 3000)
    aufraeumen()
    setText((endgueltig.current || '').trim() || res.current.letzterLive || '')
    setPhase('fertig')
  }

  // Den letzten Live-Stand merken, falls Safari den Satz nicht mehr "fertig" meldet
  useEffect(() => { res.current.letzterLive = live }, [live])

  const mitAudio = !!blob?.blob
  const wartetAufAudio = !nurText && !hinweis && blob === null

  return (
    <div className="ebene offen">
      <div className="aufnahme">
        <div className="oben">
          <button className="leiseknopf" onClick={() => { aufraeumen(); onAbbruch() }}>Abbrechen</button>
          <span className="titel">{titel}</span>
          <span className="version">v {VERSION}</span>
        </div>

        {phase !== 'fertig' && (
          <div className="laeuft">
            <Kugel className="kugel-gross" punkte={2200} energie={() => 0.2 + pegel.current * 0.8} />
            <div className="zeit">{uhrzeit(sekunden)}</div>
            <div className="live">{phase === 'start' ? 'Mikrofon startet …' : (live || (ohneLive ? 'Ich höre zu …' : ''))}</div>
            {phase === 'laeuft' && ohneLive && (
              <p className="hilfe">Der Text erscheint nicht live – die Aufnahme wird abends abgetippt.</p>
            )}
            <button className="stopp" onClick={stoppen} aria-label="Aufnahme beenden"><span /></button>
            <div className="hilfe">Tippen zum Beenden</div>
          </div>
        )}

        {phase === 'fertig' && (
          <div className="fertig">
            {hinweis && <p className="warnung">{hinweis}</p>}
            {!nurText && !hinweis && (
              <p>
                {blob?.leer
                  ? 'Die Aufnahme ist leider leer geblieben. Tipp die Idee bitte unten ein.'
                  : text
                    ? 'Passt der Text? Du kannst ihn kurz korrigieren. Die Aufnahme selbst wird immer mitgespeichert.'
                    : 'Die Aufnahme wird heute Abend abgetippt. Du kannst unten trotzdem ein paar Worte dazuschreiben.'}
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
              disabled={wartetAufAudio || (!text.trim() && !mitAudio)}
              onClick={() => onSpeichern({ text: text.trim(), blob: blob?.blob || null, mime: blob?.mime || null })}
            >
              {wartetAufAudio ? 'Aufnahme wird gesichert …' : 'Speichern'}
            </button>
            <button className="leiseknopf" onClick={() => { aufraeumen(); onAbbruch() }}>Verwerfen</button>
          </div>
        )}
      </div>
    </div>
  )
}
