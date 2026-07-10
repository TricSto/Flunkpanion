import { createClient, type SupabaseClient } from '@supabase/supabase-js'

// Zugangsdaten kommen aus der .env (siehe .env.example).
// Sind sie nicht gesetzt, läuft die App weiter rein lokal (Offline-Modus).
const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

/** true, wenn ein Server (Supabase) konfiguriert ist. */
export const isRemoteConfigured = Boolean(url && anonKey)

/**
 * Der Supabase-Client – oder null, falls keine Zugangsdaten hinterlegt sind.
 * Dann bleibt die App im lokalen Modus.
 */
export const supabase: SupabaseClient | null = isRemoteConfigured
  ? createClient(url!, anonKey!, {
      realtime: { params: { eventsPerSecond: 5 } },
    })
  : null

/** Tabellenname für die geteilten Spielstände. */
export const GAMES_TABLE = 'games'

/**
 * Tabellenname für die global gespeicherten App-Inhalte (Karten-Seite:
 * Karteninhalte & Feldfarben). Eine einzige Zeile – gilt für alle Spiele.
 */
export const CONTENT_TABLE = 'app_content'

/** ID der einen Inhalte-Zeile in CONTENT_TABLE. */
export const CONTENT_ID = 'karten'
