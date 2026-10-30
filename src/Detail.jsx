import { useEffect, useState } from 'react'
import { supabase } from './supabase.js'
import Text from './Text.jsx'
import { ART, noteKlasse, titelVon, wann, wer } from './teile.jsx'

function Abspielen({ pfad }) {
  const [url, setUrl] = useState(null)
  useEffect(() => {
    let weg = false
    if (pfad) supabase.storage.from('aufnahmen').createSignedUrl(pfad, 3600).then(({ data }) => { if (!weg) setUrl(data?.signedUrl || null) })
    return () => { weg = true }
  }, [pfad])
  if (!pfad) return null
  return url ? <audio className="player" controls preload="none" src={url} /> : <p className="pfad">Aufnahme wird geladen …</p>
}

export default function Detail({ idee, nachtraege, onZurueck, onStatus, onDazusagen, onAntworten }) {
  if (!idee) return null
  const fragen = Array.isArray(idee.rueckfragen) ? idee.rueckfragen : []
  const beantwortet = new Set(nachtraege.filter((n) => n.art === 'antwort').map((n) => n.frage))
  const fertig = idee.status !== 'neu'

  return (
    <div className="ebene offen">
      <div className="schleier" onClick={onZurueck} />
      <div className="blatt">
        <div className="kopfzeile">
          <button className="zurueck" onClick={onZurueck}>‹ Zurück</button>
          {idee.art && <span className={`chip ${idee.art}`}>{ART[idee.art]}</span>}
        </div>
        <div className="innen">
          <div className="pfad">von {wer(idee.von)} · {wann(idee.erstellt_am)}</div>
          <h1>{titelVon(idee)}</h1>

          {idee.status === 'weiterverfolgen' && <div className="banner gruen">✓ Weiterverfolgt{idee.status_von ? ` von ${wer(idee.status_von)}` : ''}{idee.offen_fuer_claude ? ' – Claude macht heute Abend eine Folge daraus' : ''}</div>}
          {idee.status === 'verworfen' && <div className="banner">✕ Verworfen{idee.status_von ? ` von ${wer(idee.status_von)}` : ''}</div>}
          {!fertig && <div className="banner">Claude arbeitet diese Idee heute Abend aus.</div>}

          <div className="karte block">
            <h4>{idee.von ? `Was ${wer(idee.von)} gesagt hat` : 'Original'}</h4>
            {idee.transkript
              ? <p className="zitat">„{idee.transkript}“</p>
              : <p className="zitat">Wird heute Abend aus der Aufnahme abgetippt.</p>}
            <Abspielen pfad={idee.audio_pfad} />
          </div>

          {idee.bewertung != null && (
            <div className="karte block">
              <h4>Bewertung</h4>
              <div className="bewertung">
                <div className={`grossnote ${noteKlasse(idee.bewertung)}`}>{idee.bewertung}</div>
                <Text md={idee.begruendung} />
              </div>
            </div>
          )}

          {idee.ausarbeitung && (
            <div className="karte block"><h4>Ausarbeitung</h4><Text md={idee.ausarbeitung} /></div>
          )}

          {idee.skript && (
            <div className="karte block">
              <details>
                <summary>Skript-Entwurf</summary>
                <div className="skript"><Text md={idee.skript} /></div>
              </details>
            </div>
          )}

          {fragen.length > 0 && (
            <div className="karte block">
              <h4>Claude fragt nach</h4>
              {fragen.map((f) => (
                <div className="frage" key={f}>
                  <div className="text">{f}</div>
                  {beantwortet.has(f)
                    ? <span className="pfad">✓ beantwortet</span>
                    : <button className="kleinknopf" onClick={() => onAntworten(idee, f)}>🎙 Antworten</button>}
                </div>
              ))}
            </div>
          )}

          {nachtraege.length > 0 && (
            <div className="karte block">
              <h4>Nachträge</h4>
              {nachtraege.map((n) => (
                <div className="frage" key={n.id}>
                  <div className="zu">{wer(n.von)} · {wann(n.erstellt_am)}{n.art === 'antwort' ? ' · Antwort' : ''}{n.verarbeitet ? '' : ' · kommt heute Abend dazu'}</div>
                  {n.frage && <div className="zu">auf: {n.frage}</div>}
                  <div className="text">{n.text || 'Sprachaufnahme – wird heute Abend abgetippt'}</div>
                  <Abspielen pfad={n.audio_pfad} />
                </div>
              ))}
            </div>
          )}

          {idee.brain_seite && <div className="pfad">Liegt im Brain unter <code>{idee.brain_seite}</code></div>}
        </div>

        <div className="aktionen">
          {idee.status === 'weiterverfolgen' || idee.status === 'verworfen' ? (
            <button className="nein breit" onClick={() => onStatus(idee, idee.ausgearbeitet_am ? 'ausgearbeitet' : 'neu')}>↺ Entscheidung zurücknehmen</button>
          ) : (
            <>
              <button className="ja" disabled={!fertig} onClick={() => onStatus(idee, 'weiterverfolgen')}>✓ Weiterverfolgen</button>
              <button className="nein" onClick={() => onStatus(idee, 'verworfen')}>✕ Verwerfen</button>
            </>
          )}
          <button className="dazu" onClick={() => onDazusagen(idee)}>🎙 Noch was dazusagen</button>
        </div>
      </div>
    </div>
  )
}
