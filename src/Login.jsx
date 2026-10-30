import { useState } from 'react'
import { supabase } from './supabase.js'
import Kugel from './Kugel.jsx'

export default function Login() {
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [schritt, setSchritt] = useState('email')
  const [fehler, setFehler] = useState('')
  const [warte, setWarte] = useState(false)

  async function codeSchicken(e) {
    e.preventDefault()
    setFehler(''); setWarte(true)
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim().toLowerCase(),
      options: { shouldCreateUser: true },
    })
    setWarte(false)
    if (error) {
      setFehler(/freigeschaltet|database error/i.test(error.message)
        ? 'Diese E-Mail-Adresse ist nicht freigeschaltet.'
        : /rate|seconds/i.test(error.message)
          ? 'Gerade wurden zu viele Codes verschickt. Warte kurz und versuch es nochmal.'
          : 'Das hat nicht geklappt: ' + error.message)
      return
    }
    setSchritt('code')
  }

  async function codePruefen(e) {
    e.preventDefault()
    setFehler(''); setWarte(true)
    const { error } = await supabase.auth.verifyOtp({ email: email.trim().toLowerCase(), token: code.trim(), type: 'email' })
    setWarte(false)
    if (error) setFehler('Der Code stimmt nicht oder ist abgelaufen.')
  }

  return (
    <div className="login">
      <Kugel className="login-kugel" punkte={1400} />
      <h1>Ideen-Cockpit</h1>
      {schritt === 'email' ? (
        <form onSubmit={codeSchicken}>
          <p>Gib deine E-Mail-Adresse ein. Du bekommst einen Code zum Anmelden.</p>
          <input type="email" inputMode="email" autoComplete="email" placeholder="deine@email.de"
            value={email} onChange={(e) => setEmail(e.target.value)} required />
          <button className="hauptknopf" disabled={warte}>{warte ? 'Schicke Code …' : 'Code schicken'}</button>
        </form>
      ) : (
        <form onSubmit={codePruefen}>
          <p>Wir haben dir einen Code an <b>{email}</b> geschickt. Schau auch im Spam-Ordner.</p>
          <input inputMode="numeric" autoComplete="one-time-code" placeholder="Code" maxLength={10}
            value={code} onChange={(e) => setCode(e.target.value)} required />
          <button className="hauptknopf" disabled={warte}>{warte ? 'Prüfe …' : 'Anmelden'}</button>
          <button type="button" className="leiseknopf" onClick={() => { setSchritt('email'); setCode('') }}>Andere E-Mail</button>
        </form>
      )}
      {fehler && <p className="warnung">{fehler}</p>}
    </div>
  )
}
