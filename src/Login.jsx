import { useState } from 'react'
import { supabase } from './supabase.js'
import Kugel from './Kugel.jsx'

const APP_URL = window.location.origin + import.meta.env.BASE_URL

function fehlerText(error) {
  const m = error.message || ''
  if (/freigeschaltet|database error/i.test(m)) return 'Diese E-Mail-Adresse ist nicht freigeschaltet.'
  if (/not confirmed/i.test(m)) return 'Bitte tipp zuerst auf den Link in der Bestätigungs-Mail (auch im Spam-Ordner schauen).'
  if (/invalid login/i.test(m)) return 'E-Mail oder Passwort stimmt nicht.'
  if (/already registered/i.test(m)) return 'Für diese E-Mail gibt es schon ein Konto – melde dich einfach an.'
  if (/rate|seconds/i.test(m)) return 'Gerade wurden zu viele Mails verschickt. Warte ein paar Minuten und versuch es nochmal.'
  return 'Das hat nicht geklappt: ' + m
}

// modus: anmelden | registrieren | vergessen
export default function Login() {
  const [modus, setModus] = useState('anmelden')
  const [email, setEmail] = useState('')
  const [passwort, setPasswort] = useState('')
  const [fehler, setFehler] = useState('')
  const [info, setInfo] = useState('')
  const [warte, setWarte] = useState(false)

  const wechseln = (m) => { setModus(m); setFehler(''); setInfo('') }
  const mail = () => email.trim().toLowerCase()

  async function absenden(e) {
    e.preventDefault()
    setFehler(''); setInfo(''); setWarte(true)
    let error
    if (modus === 'anmelden') {
      ({ error } = await supabase.auth.signInWithPassword({ email: mail(), password: passwort }))
    } else if (modus === 'registrieren') {
      const antwort = await supabase.auth.signUp({ email: mail(), password: passwort, options: { emailRedirectTo: APP_URL } })
      error = antwort.error
      if (!error && antwort.data.user && antwort.data.user.identities?.length === 0) {
        error = { message: 'already registered' }
      }
      if (!error && !antwort.data.session) {
        setInfo('Fast geschafft: Wir haben dir eine Mail geschickt. Tipp auf den Link darin (egal, wo er aufgeht) und melde dich danach hier mit deinem Passwort an.')
        setModus('anmelden')
      }
    } else {
      ({ error } = await supabase.auth.resetPasswordForEmail(mail(), { redirectTo: APP_URL }))
      if (!error) {
        setInfo('Wir haben dir eine Mail geschickt. Tipp auf den Link darin, dann kannst du ein neues Passwort festlegen.')
        setModus('anmelden')
      }
    }
    setWarte(false)
    if (error) setFehler(fehlerText(error))
  }

  return (
    <div className="login">
      <Kugel className="login-kugel" punkte={1400} />
      <h1>Ideen-Cockpit</h1>
      <form onSubmit={absenden}>
        <p>
          {modus === 'anmelden' && 'Melde dich mit deiner E-Mail und deinem Passwort an.'}
          {modus === 'registrieren' && 'Zum ersten Mal hier? Lege dein Passwort fest (mindestens 8 Zeichen).'}
          {modus === 'vergessen' && 'Gib deine E-Mail ein – du bekommst einen Link für ein neues Passwort.'}
        </p>
        <input type="email" inputMode="email" autoComplete="email" placeholder="deine@email.de"
          value={email} onChange={(e) => setEmail(e.target.value)} required />
        {modus !== 'vergessen' && (
          <input type="password" placeholder="Passwort" minLength={modus === 'registrieren' ? 8 : undefined}
            autoComplete={modus === 'registrieren' ? 'new-password' : 'current-password'}
            value={passwort} onChange={(e) => setPasswort(e.target.value)} required />
        )}
        <button className="hauptknopf" disabled={warte}>
          {warte ? 'Moment …' : modus === 'anmelden' ? 'Anmelden' : modus === 'registrieren' ? 'Konto anlegen' : 'Link schicken'}
        </button>
      </form>
      {info && <p className="info">{info}</p>}
      {fehler && <p className="warnung">{fehler}</p>}
      <div className="login-links">
        {modus !== 'anmelden' && <button className="leiseknopf" onClick={() => wechseln('anmelden')}>Zur Anmeldung</button>}
        {modus !== 'registrieren' && <button className="leiseknopf" onClick={() => wechseln('registrieren')}>Zum ersten Mal hier?</button>}
        {modus !== 'vergessen' && <button className="leiseknopf" onClick={() => wechseln('vergessen')}>Passwort vergessen</button>}
      </div>
    </div>
  )
}

// Nach dem Link aus "Passwort vergessen"
export function NeuesPasswort({ onFertig }) {
  const [passwort, setPasswort] = useState('')
  const [fehler, setFehler] = useState('')
  const [warte, setWarte] = useState(false)

  async function speichern(e) {
    e.preventDefault()
    setWarte(true)
    const { error } = await supabase.auth.updateUser({ password: passwort })
    setWarte(false)
    if (error) setFehler(fehlerText(error))
    else onFertig()
  }

  return (
    <div className="login">
      <h1>Neues Passwort</h1>
      <form onSubmit={speichern}>
        <p>Leg dein neues Passwort fest (mindestens 8 Zeichen).</p>
        <input type="password" autoComplete="new-password" minLength={8} placeholder="Neues Passwort"
          value={passwort} onChange={(e) => setPasswort(e.target.value)} required />
        <button className="hauptknopf" disabled={warte}>{warte ? 'Moment …' : 'Speichern'}</button>
      </form>
      {fehler && <p className="warnung">{fehler}</p>}
    </div>
  )
}
