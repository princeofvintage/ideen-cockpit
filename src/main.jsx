import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'
import './styles.css'

const zeigen = (Wurzel) => createRoot(document.getElementById('root')).render(<StrictMode><Wurzel /></StrictMode>)

// Nur beim Entwickeln: ?test-aufnahme zeigt die Aufnahme ohne Anmeldung
if (import.meta.env.DEV && location.search.includes('test-aufnahme')) {
  import('./Testseite.jsx').then((m) => zeigen(m.default))
} else {
  zeigen(App)
}

// App auch ohne Netz öffnen können
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`)
}
