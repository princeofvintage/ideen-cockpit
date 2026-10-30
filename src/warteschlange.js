// Alles, was gespeichert werden soll, landet zuerst hier auf dem Handy (IndexedDB).
// Erst wenn Supabase es sicher hat, wird es hier gelöscht. So geht bei Funkloch nichts verloren.
import { supabase } from './supabase.js'

const DB_NAME = 'ideen-cockpit'
const STORE = 'warteschlange'

function oeffnen() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1)
    req.onupgradeneeded = () => req.result.createObjectStore(STORE, { keyPath: 'id' })
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

async function mitStore(modus, fn) {
  const db = await oeffnen()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, modus)
    const ergebnis = fn(tx.objectStore(STORE))
    tx.oncomplete = () => resolve(ergebnis?.result ?? ergebnis)
    tx.onerror = () => reject(tx.error)
  })
}

export const hinzufuegen = (eintrag) => mitStore('readwrite', (s) => s.put(eintrag))
export const entfernen = (id) => mitStore('readwrite', (s) => s.delete(id))
export async function alle() {
  const liste = await mitStore('readonly', (s) => s.getAll())
  return (liste || []).sort((a, b) => a.erstellt_am.localeCompare(b.erstellt_am))
}

function endung(mime = '') {
  if (mime.includes('mp4') || mime.includes('m4a') || mime.includes('aac')) return 'm4a'
  if (mime.includes('webm')) return 'webm'
  if (mime.includes('ogg')) return 'ogg'
  if (mime.includes('mpeg')) return 'mp3'
  if (mime.includes('wav')) return 'wav'
  return 'audio'
}

async function audioHochladen(eintrag, name) {
  if (!eintrag.blob) return { audio_pfad: null, audio_link: null }
  const pfad = `${name}/${eintrag.id}.${endung(eintrag.mime)}`
  const { error } = await supabase.storage.from('aufnahmen').upload(pfad, eintrag.blob, {
    contentType: (eintrag.mime || 'audio/mp4').split(';')[0],
    upsert: false,
  })
  // Schon da = beim letzten Versuch hochgeladen, aber nicht aus der Warteschlange gelöscht
  if (error && !/exist|duplicate/i.test(error.message)) throw error
  // Geschützter Link (30 Tage), damit Claude die Aufnahme abends abtippen lassen kann
  const { data } = await supabase.storage.from('aufnahmen').createSignedUrl(pfad, 30 * 24 * 3600)
  return { audio_pfad: pfad, audio_link: data?.signedUrl || null }
}

async function senden(eintrag, name) {
  if (eintrag.typ === 'idee') {
    const audio = await audioHochladen(eintrag, name)
    const { error } = await supabase.from('ideen').upsert(
      { id: eintrag.id, transkript: eintrag.text || null, ...audio, erstellt_am: eintrag.erstellt_am },
      { onConflict: 'id', ignoreDuplicates: true },
    )
    if (error) throw error
  } else if (eintrag.typ === 'nachtrag') {
    const audio = await audioHochladen(eintrag, name)
    const { error } = await supabase.from('nachtraege').upsert(
      {
        id: eintrag.id, idee_id: eintrag.idee_id, art: eintrag.art, frage: eintrag.frage || null,
        text: eintrag.text || null, ...audio, erstellt_am: eintrag.erstellt_am,
      },
      { onConflict: 'id', ignoreDuplicates: true },
    )
    if (error) throw error
  } else if (eintrag.typ === 'status') {
    const { error } = await supabase.from('ideen').update({
      status: eintrag.status, status_von: name, offen_fuer_claude: true, aktualisiert_am: eintrag.erstellt_am,
    }).eq('id', eintrag.idee_id)
    if (error) throw error
  }
}

let laeuft = false

// Schickt alles los, was noch auf dem Handy liegt. Gibt zurück, wie viel noch übrig ist.
export async function abschicken(name) {
  if (laeuft || !name) return (await alle()).length
  laeuft = true
  try {
    for (const eintrag of await alle()) {
      try {
        await senden(eintrag, name)
        await entfernen(eintrag.id)
      } catch (e) {
        console.warn('Noch nicht gesendet, neuer Versuch später:', e)
        break
      }
    }
  } finally {
    laeuft = false
  }
  return (await alle()).length
}
