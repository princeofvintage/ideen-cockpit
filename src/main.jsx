import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'
import './styles.css'
import { log, fehlerText } from './protokoll.js'

window.addEventListener('error', (e) => log('js_fehler', { fehler: fehlerText(e.error || e.message) }))
window.addEventListener('unhandledrejection', (e) => log('js_fehler', { fehler: fehlerText(e.reason) }))

const zeigen = (Wurzel) => createRoot(document.getElementById('root')).render(<StrictMode><Wurzel /></StrictMode>)

// Nur beim Entwickeln: ?test-aufnahme zeigt die Aufnahme ohne Anmeldung
if (import.meta.env.DEV && location.search.includes('test-aufnahme')) {
  import('./Testseite.jsx').then((m) => zeigen(m.default))
} else {
  zeigen(App)
}

// App auch ohne Netz öffnen können
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`).then((reg) => reg.update()).catch(() => {})
  // Kommt eine neue Version an, einmal neu laden – sonst sieht man sie erst beim übernächsten Öffnen
  let neuGeladen = false
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (neuGeladen) return
    neuGeladen = true
    // Nie mitten in einer Aufnahme oder Detailansicht neu laden – warten, bis sie zu ist
    const wennFrei = () => (document.querySelector('.ebene') ? setTimeout(wennFrei, 2000) : location.reload())
    wennFrei()
  })
}
