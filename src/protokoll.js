// Meldet, was in der App passiert, an Supabase (Tabelle app_log) – damit Claude Fehler auf dem iPhone sehen kann.
// Schreiben dürfen nur Tiago und Keanu (Datenbank-Regel), lesen kann es nur Claude per SQL.
import { supabase } from './supabase.js'

export const VERSION = __VERSION__

// Links und alles, was nach Schlüssel aussieht, kommt nie ins Protokoll
function schwaerzen(text) {
  return String(text)
    .replace(/https?:\/\/\S+/g, '[link]')
    .replace(/(access_token|refresh_token|token|apikey|key|signature|password|passwort)=\S*/gi, '$1=[weg]')
    .replace(/eyJ[\w-]{10,}\.[\w-]+\.[\w-]+/g, '[jwt]')
    .slice(0, 300)
}

function kuerzen(details) {
  const aus = {}
  for (const [k, v] of Object.entries(details)) aus[k] = typeof v === 'string' ? schwaerzen(v) : v
  return aus
}

export function log(ereignis, details = {}) {
  try {
    console.info('[protokoll]', ereignis, details)
    supabase.from('app_log').insert({
      version: VERSION, ereignis,
      details: { ...kuerzen(details), standalone: !!navigator.standalone, ua: navigator.userAgent.slice(0, 160) },
    }).then(() => {}, () => {})
  } catch { /* Protokoll darf nie etwas kaputt machen */ }
}

export const fehlerText = (e) => schwaerzen((e && (e.name ? `${e.name}: ${e.message}` : String(e))) || 'unbekannt')
