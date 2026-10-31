// Meldet, was in der App passiert, an Supabase (Tabelle app_log) – damit Claude Fehler auf dem iPhone sehen kann.
import { supabase } from './supabase.js'

export const VERSION = __VERSION__

export function log(ereignis, details = {}) {
  try {
    console.info('[protokoll]', ereignis, details)
    supabase.from('app_log').insert({
      version: VERSION, ereignis,
      details: { ...details, standalone: !!navigator.standalone, ua: navigator.userAgent.slice(0, 160) },
    }).then(() => {}, () => {})
  } catch { /* Protokoll darf nie etwas kaputt machen */ }
}

export const fehlerText = (e) => (e && (e.name ? `${e.name}: ${e.message}` : String(e))) || 'unbekannt'
