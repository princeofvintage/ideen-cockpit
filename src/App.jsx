import { useCallback, useEffect, useState } from 'react'
import { supabase } from './supabase.js'
import * as warteschlange from './warteschlange.js'
import Login, { NeuesPasswort } from './Login.jsx'
import Cockpit from './Cockpit.jsx'
import Detail from './Detail.jsx'
import Aufnahme from './Aufnahme.jsx'
import { Icon, wer } from './teile.jsx'
import { log, fehlerText, VERSION } from './protokoll.js'

const SEIT_KEY = 'ideen-cockpit-seit'
const SITZUNG_MS = 30 * 60 * 1000

// "Seit deinem letzten Besuch" bleibt 30 Minuten stehen, auch wenn die App neu lädt
async function seitBestimmen(name) {
  try {
    const gemerkt = JSON.parse(localStorage.getItem(SEIT_KEY) || 'null')
    if (gemerkt && gemerkt.name === name && Date.now() - gemerkt.gesetzt < SITZUNG_MS) return gemerkt.seit
  } catch { /* egal */ }
  const { data } = await supabase.from('profile').select('zuletzt_gesehen').eq('name', name).maybeSingle()
  const seit = data?.zuletzt_gesehen || null
  try { localStorage.setItem(SEIT_KEY, JSON.stringify({ name, seit, gesetzt: Date.now() })) } catch { /* egal */ }
  await supabase.from('profile').update({ zuletzt_gesehen: new Date().toISOString() }).eq('name', name)
  return seit
}

export default function App() {
  const [sitzung, setSitzung] = useState(undefined)
  const [name, setName] = useState(null)
  const [gesperrt, setGesperrt] = useState(false)
  const [ideen, setIdeen] = useState([])
  const [nachtraege, setNachtraege] = useState([])
  const [wartend, setWartend] = useState([])
  const [seit, setSeit] = useState(null)
  const [geladen, setGeladen] = useState(false)
  const [detailId, setDetailId] = useState(null)
  const [aufnahme, setAufnahme] = useState(null)
  const [toast, setToast] = useState('')
  const [passwortNeu, setPasswortNeu] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSitzung(data.session))
    const { data } = supabase.auth.onAuthStateChange((ereignis, s) => {
      setSitzung(s)
      if (ereignis === 'PASSWORD_RECOVERY') setPasswortNeu(true)
    })
    return () => data.subscription.unsubscribe()
  }, [])

  const zeigen = useCallback((t) => { setToast(t); setTimeout(() => setToast(''), 2600) }, [])

  const laden = useCallback(async () => {
    const [i, n] = await Promise.all([
      supabase.from('ideen').select('*').order('erstellt_am', { ascending: false }).limit(500),
      supabase.from('nachtraege').select('*').order('erstellt_am'),
    ])
    if (!i.error) setIdeen(i.data)
    if (!n.error) setNachtraege(n.data)
    setGeladen(true)
  }, [])

  const abschicken = useCallback(async (n) => {
    await warteschlange.abschicken(n)
    setWartend(await warteschlange.alle())
  }, [])

  // Nach dem Anmelden: wer bin ich, Daten holen, Liegengebliebenes losschicken
  useEffect(() => {
    if (!sitzung) return
    let aus = false
    ;(async () => {
      const email = sitzung.user.email?.toLowerCase()
      const { data } = await supabase.from('mitglieder').select('name').eq('email', email).maybeSingle()
      if (aus) return
      if (!data) { setGesperrt(true); return }
      setName(data.name)
      log('app_geoeffnet')
      setWartend(await warteschlange.alle())
      await abschicken(data.name)
      setSeit(await seitBestimmen(data.name))
      await laden()
    })()
    return () => { aus = true }
  }, [sitzung, laden, abschicken])

  // Zurück in der App oder wieder Netz: neu laden und Warteschlange abschicken
  useEffect(() => {
    if (!name) return
    const wiederDa = () => {
      if (document.visibilityState !== 'visible') return
      abschicken(name).then(laden)
    }
    const netz = () => abschicken(name).then(laden)
    document.addEventListener('visibilitychange', wiederDa)
    window.addEventListener('online', netz)
    const uhr = setInterval(() => { if (navigator.onLine) abschicken(name) }, 30000)
    return () => {
      document.removeEventListener('visibilitychange', wiederDa)
      window.removeEventListener('online', netz)
      clearInterval(uhr)
    }
  }, [name, laden, abschicken])

  async function speichern({ text, blob, mime }) {
    const ziel = aufnahme.ziel
    setAufnahme(null)
    log('speichern', { textZeichen: text.length, audioBytes: blob?.size || 0, mime, ziel: ziel.typ })
    const eintrag = {
      id: crypto.randomUUID(), erstellt_am: new Date().toISOString(), text, blob, mime,
      ...(ziel.typ === 'idee' ? { typ: 'idee' } : { typ: 'nachtrag', idee_id: ziel.idee_id, art: ziel.art, frage: ziel.frage }),
    }
    try {
      await warteschlange.hinzufuegen(eintrag)
    } catch (e) {
      log('warteschlange_fehler', { fehler: fehlerText(e) })
      zeigen('Speichern auf dem Handy ging nicht: ' + fehlerText(e))
      return
    }
    setWartend(await warteschlange.alle())
    const rest = await warteschlange.abschicken(name)
    log('abgeschickt', { rest })
    setWartend(await warteschlange.alle())
    zeigen(rest ? 'Auf dem Handy gesichert ✓ – wird hochgeladen, sobald Netz da ist' : 'Gespeichert ✓ – wird heute Abend ausgearbeitet')
    laden()
  }

  async function statusSetzen(idee, status) {
    const jetzt = new Date().toISOString()
    setIdeen((alt) => alt.map((i) => (i.id === idee.id ? { ...i, status, status_von: name, offen_fuer_claude: true } : i)))
    await warteschlange.hinzufuegen({ id: crypto.randomUUID(), typ: 'status', idee_id: idee.id, status, erstellt_am: jetzt })
    const rest = await warteschlange.abschicken(name)
    setWartend(await warteschlange.alle())
    zeigen(status === 'weiterverfolgen' ? 'Weiterverfolgen ✓ – Claude macht heute Abend eine Folge daraus'
      : status === 'verworfen' ? 'Verworfen – kommt im Brain auf „verworfen“'
        : 'Entscheidung zurückgenommen')
    if (status !== 'ausgearbeitet' && status !== 'neu') setDetailId(null)
    if (!rest) laden()
  }

  if (sitzung === undefined) return <div className="laden">Lädt …</div>
  if (!sitzung) return <Login />
  if (passwortNeu) return <NeuesPasswort onFertig={() => { setPasswortNeu(false); zeigen('Neues Passwort gespeichert ✓') }} />
  if (gesperrt) {
    return (
      <div className="login">
        <h1>Kein Zugang</h1>
        <p>{sitzung.user.email} ist für das Ideen-Cockpit nicht freigeschaltet.</p>
        <button className="leiseknopf" onClick={() => supabase.auth.signOut()}>Abmelden</button>
      </div>
    )
  }
  if (!name || !geladen) return <div className="laden">Lädt …</div>

  const detail = ideen.find((i) => i.id === detailId)
  const neueAufnahme = (nurText = false) => setAufnahme({ titel: 'Neue Idee', nurText, ziel: { typ: 'idee' } })
  const antworten = (idee, frage) => setAufnahme({ titel: 'Antwort an Claude', ziel: { typ: 'nachtrag', idee_id: idee.id, art: 'antwort', frage } })
  const dazusagen = (idee) => setAufnahme({ titel: 'Noch was dazusagen', ziel: { typ: 'nachtrag', idee_id: idee.id, art: 'nachtrag' } })

  return (
    <>
      <div className="app">
        <nav className="seitenleiste">
          <div className="logo">{wer(name)[0]}</div>
          <button className="an" title="Cockpit">{Icon.cockpit}</button>
          <button className="unten" title="Abmelden" onClick={() => supabase.auth.signOut()}>{Icon.raus}</button>
        </nav>
        <div className="version-fuss">v {VERSION}</div>
        <Cockpit
          name={name} ideen={ideen} nachtraege={nachtraege} wartend={wartend} seit={seit}
          onAufnehmen={() => neueAufnahme()} onTippen={() => neueAufnahme(true)}
          onOeffnen={setDetailId} onAntworten={antworten}
        />
      </div>

      <div className="mikro-leiste">
        <button onClick={() => neueAufnahme()}>{Icon.mic}Idee einsprechen</button>
      </div>

      {detail && (
        <Detail
          idee={detail} nachtraege={nachtraege.filter((n) => n.idee_id === detail.id)}
          onZurueck={() => setDetailId(null)} onStatus={statusSetzen} onDazusagen={dazusagen} onAntworten={antworten}
        />
      )}
      {aufnahme && <Aufnahme titel={aufnahme.titel} nurText={aufnahme.nurText} onSpeichern={speichern} onAbbruch={() => setAufnahme(null)} />}
      <div className={`toast ${toast ? 'zeigen' : ''}`}>{toast}</div>
    </>
  )
}
