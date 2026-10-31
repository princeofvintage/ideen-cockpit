// Nur beim Entwickeln: Aufnahme testen, ohne sich anzumelden.
// ?test-aufnahme&kaputt baut die iPhone-Spracherkennung nach, die sofort abbricht.
import { useState } from 'react'
import Aufnahme from './Aufnahme.jsx'

if (location.search.includes('kaputt')) {
  window.__starts = 0
  class KaputteErkennung {
    start() {
      window.__starts++
      setTimeout(() => { this.onerror?.({ error: 'audio-capture' }); this.onend?.() }, 0)
    }
    stop() {}
    abort() {}
  }
  window.SpeechRecognition = KaputteErkennung
  window.webkitSpeechRecognition = KaputteErkennung
  // Künstliches Mikrofon: ein Ton statt Stimme
  navigator.mediaDevices.getUserMedia = async () => {
    const ac = new AudioContext()
    const ton = ac.createOscillator()
    const ziel = ac.createMediaStreamDestination()
    ton.connect(ziel); ton.start()
    return ziel.stream
  }
}

export default function Testseite() {
  const [offen, setOffen] = useState(false)
  const [ergebnis, setErgebnis] = useState('')
  return (
    <div style={{ padding: 20 }}>
      <button className="hauptknopf" onClick={() => setOffen(true)}>Aufnahme öffnen</button>
      <pre id="ergebnis" style={{ marginTop: 20, whiteSpace: 'pre-wrap' }}>{ergebnis}</pre>
      {offen && (
        <Aufnahme
          onSpeichern={(x) => { setOffen(false); setErgebnis(`gespeichert: text="${x.text}" audio=${x.blob ? x.blob.size + ' Bytes ' + x.mime : 'keins'}`) }}
          onAbbruch={() => { setOffen(false); setErgebnis('abgebrochen') }}
        />
      )}
    </div>
  )
}
