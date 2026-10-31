import { useMemo, useState } from 'react'
import Kugel from './Kugel.jsx'
import { ART, STATUS, Icon, Note, titelVon, wann, wer } from './teile.jsx'

const FILTER = [
  ['alle', 'Alle', () => true],
  ['content', 'Content', (i) => i.art === 'content'],
  ['business', 'Business', (i) => i.art === 'business'],
  ['tiago', 'Tiago', (i) => i.von === 'tiago'],
  ['keanu', 'Keanu', (i) => i.von === 'keanu'],
  ['weiter', 'Weiterverfolgt', (i) => i.status === 'weiterverfolgen'],
  ['verworfen', 'Verworfen', (i) => i.status === 'verworfen'],
]

export default function Cockpit({ name, ideen, nachtraege, wartend, seit, onAufnehmen, onTippen, onOeffnen, onAntworten }) {
  const [filter, setFilter] = useState('alle')

  const zahlen = useMemo(() => {
    const woche = Date.now() - 7 * 24 * 3600 * 1000
    const fertig = ideen.filter((i) => i.status !== 'neu')
    const bewertet = fertig.filter((i) => i.bewertung != null)
    const weiter = ideen.filter((i) => i.status === 'weiterverfolgen')
    return {
      gesamt: ideen.length + wartend.length,
      woche: ideen.filter((i) => new Date(i.erstellt_am) > woche).length + wartend.length,
      fertig: fertig.length,
      warten: ideen.length - fertig.length + wartend.length,
      weiter: weiter.length,
      schnitt: bewertet.length
        ? (bewertet.reduce((s, i) => s + i.bewertung, 0) / bewertet.length).toLocaleString('de-DE', { maximumFractionDigits: 1 })
        : '–',
    }
  }, [ideen, wartend])

  const neu = useMemo(() => ideen
    .filter((i) => i.status !== 'neu' && i.ausgearbeitet_am && (!seit || i.ausgearbeitet_am > seit))
    .sort((a, b) => b.ausgearbeitet_am.localeCompare(a.ausgearbeitet_am))
    .slice(0, 6), [ideen, seit])

  const fragen = useMemo(() => {
    const beantwortet = new Set(nachtraege.filter((n) => n.art === 'antwort').map((n) => n.idee_id + '|' + n.frage))
    const liste = []
    for (const i of ideen) {
      if (i.status !== 'ausgearbeitet' && i.status !== 'weiterverfolgen') continue
      for (const f of Array.isArray(i.rueckfragen) ? i.rueckfragen : []) {
        if (!beantwortet.has(i.id + '|' + f)) liste.push({ idee: i, frage: f })
      }
    }
    return liste.slice(0, 4)
  }, [ideen, nachtraege])

  const gefiltert = ideen.filter(FILTER.find(([k]) => k === filter)[2])

  return (
    <main className="inhalt">
      <div className="kopf">
        <div>
          <h1>Ideen-Cockpit</h1>
          <p className="gruss">
            Hi {wer(name)} – {neu.length
              ? <>seit deinem letzten Besuch hat Claude <b>{neu.length} {neu.length === 1 ? 'Idee' : 'Ideen'}</b> ausgearbeitet.</>
              : 'seit deinem letzten Besuch gibt es nichts Neues.'}
          </p>
        </div>
      </div>

      <div className="zahlen">
        <Zahl name="Ideen gesamt" icon={Icon.birne} wert={zahlen.gesamt} delta={`+${zahlen.woche} diese Woche`} />
        <Zahl name="Ausgearbeitet" icon={Icon.dokument} wert={zahlen.fertig}
          delta={zahlen.warten ? `${zahlen.warten} ${zahlen.warten === 1 ? 'wartet' : 'warten'} auf Claude` : 'alles erledigt'} />
        <Zahl name="Weiterverfolgt" icon={Icon.pfeil} wert={zahlen.weiter} delta="werden zu Folgen" />
        <Zahl name="Ø Bewertung" icon={Icon.stern} wert={zahlen.schnitt} delta="von 10" />
      </div>

      <section className="karte claude bereich-claude">
        <h2>Claude</h2>
        <div className="blase">Was ist dir eingefallen?<br /><span>Tipp auf die Kugel und sprich einfach los.</span></div>
        <button className="kugel-knopf" onClick={onAufnehmen} aria-label="Idee einsprechen">
          <Kugel className="kugel-klein" punkte={1500} />
          <span className="mic">{Icon.mic}</span>
        </button>
        <div className="fuss"><span>Wird bald ausgearbeitet</span><button className="textknopf" onClick={onTippen}>Lieber tippen</button></div>
      </section>

      {neu.length > 0 && (
        <section className="karte bereich-neu">
          <div className="kartenkopf"><div><h2>Seit deinem letzten Besuch</h2>
            <div className="unter">{neu.length} {neu.length === 1 ? 'Idee hat' : 'Ideen hat'} Claude ausgearbeitet</div></div></div>
          <div className="neu-liste">
            {neu.map((i) => (
              <button key={i.id} className="ideekarte" onClick={() => onOeffnen(i.id)}>
                <div className="reihe"><h3>{titelVon(i)}</h3><Note wert={i.bewertung} /></div>
                {i.kurz && <p>{i.kurz}</p>}
                <div className="chips">
                  {i.art && <span className={`chip ${i.art}`}>{ART[i.art]}</span>}
                  <span className="chip">von {wer(i.von)}</span>
                  {i.skript && <span className="chip">Skript fertig</span>}
                </div>
              </button>
            ))}
          </div>
        </section>
      )}

      {fragen.length > 0 && (
        <section className="karte bereich-fragen">
          <div className="kartenkopf"><div><h2>Claude fragt nach</h2><div className="unter">Eine Antwort hilft beim Weiterdenken</div></div></div>
          {fragen.map(({ idee, frage }) => (
            <div className="frage" key={idee.id + frage}>
              <div className="zu">zu „{titelVon(idee)}“</div>
              <div className="text">{frage}</div>
              <button className="kleinknopf" onClick={() => onAntworten(idee, frage)}>🎙 Antworten</button>
            </div>
          ))}
        </section>
      )}

      <section className="karte bereich-liste">
        <div className="kartenkopf"><div><h2>Alle Ideen</h2><div className="unter">Neueste zuerst</div></div></div>
        <div className="filter">
          {FILTER.map(([k, label]) => (
            <button key={k} className={filter === k ? 'an' : ''} onClick={() => setFilter(k)}>{label}</button>
          ))}
        </div>
        {gefiltert.length === 0 && wartend.length === 0 ? (
          <p className="leer">{ideen.length ? 'Hier ist noch nichts.' : 'Noch keine Ideen. Tipp auf die Kugel und sprich die erste ein.'}</p>
        ) : (
          <table>
            <thead><tr><th>Idee</th><th className="nur-breit">Von</th><th className="nur-breit">Art</th><th>Bewertung</th><th className="nur-breit">Status</th></tr></thead>
            <tbody>
              {filter === 'alle' && wartend.filter((w) => w.typ === 'idee').map((w) => (
                <tr key={w.id} className="wartend">
                  <td className="titel">{w.text ? titelVon({ transkript: w.text }) : 'Sprachaufnahme'}<small>{Icon.wolke} wird hochgeladen, sobald Netz da ist</small></td>
                  <td className="nur-breit">{wer(name)}</td><td className="nur-breit">–</td>
                  <td><span className="note offen">wartet</span></td><td className="nur-breit">Auf dem Handy</td>
                </tr>
              ))}
              {gefiltert.map((i) => (
                <tr key={i.id} className={i.status === 'verworfen' ? 'verworfen' : ''} onClick={() => onOeffnen(i.id)}>
                  <td className="titel">{titelVon(i)}<small>{i.status === 'neu' ? wann(i.erstellt_am) : (i.kurz || wann(i.erstellt_am))}</small></td>
                  <td className="nur-breit">{wer(i.von)}</td>
                  <td className="nur-breit">{ART[i.art] || '–'}</td>
                  <td>
                    <div className="balken">
                      <Note wert={i.bewertung} />
                      {i.bewertung != null && <span className="spur"><i style={{ width: `${i.bewertung * 10}%` }} /></span>}
                    </div>
                  </td>
                  <td className="nur-breit">{STATUS[i.status]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </main>
  )
}

function Zahl({ name, icon, wert, delta }) {
  return (
    <div className="karte zahl">
      <div className="oben"><span className="name">{name}</span>{icon}</div>
      <div className="wert">{wert}</div>
      <div className="delta">{delta}</div>
    </div>
  )
}
