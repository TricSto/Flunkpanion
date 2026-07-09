import type { BoardField, BoardFieldType, BoardState } from '../types'

/**
 * Definition eines Spielbrett-Feldtyps. Farben und Icons folgen dem alten
 * Canva-Brett (docs/altes-spielbrett.pdf): Megafon = Ereignis, Einhorn =
 * Game Changer, Schwerter = Challenge, Kronkorken = KK, TAX = Biersteuer.
 */
export interface BoardFieldDef {
  type: BoardFieldType
  label: string
  icon: string
  /** Chevron-Farbe des Felds. */
  color: string
  /** Kurzbeschreibung für den Editor. */
  hint: string
}

export const BOARD_FIELD_DEFS: BoardFieldDef[] = [
  { type: 'ereignis', label: 'Ereignis', icon: '📣', color: '#60a5fa', hint: 'Ereigniskarte ziehen' },
  { type: 'aktion', label: 'Aktionskarte', icon: '❗', color: '#f59e0b', hint: 'Aktionskarte ziehen' },
  { type: 'gamechanger', label: 'Game Changer', icon: '🦄', color: '#e7d3a7', hint: 'Game-Changer-Karte ziehen' },
  { type: 'challenge', label: 'Challenge', icon: '⚔️', color: '#a5f3fc', hint: 'Gegner herausfordern' },
  { type: 'kronkorken', label: 'Kronkorken', icon: '🪙', color: '#22c55e', hint: 'KK kassieren' },
  { type: 'biersteuer', label: 'Biersteuer', icon: '💸', color: '#a3e635', hint: 'Biersteuer zahlen' },
  { type: 'zahltag', label: 'Zahltag', icon: '💰', color: '#86efac', hint: 'Gehalt aufs Konto' },
  { type: 'berufswechsel', label: 'Berufswechsel', icon: '🔄', color: '#c4b5fd', hint: 'Beruf & Gehalt neu' },
  { type: 'boerse', label: 'Börse', icon: '📈', color: '#fde047', hint: 'Aktien-Feld' },
  { type: 'minigame', label: 'Minigame', icon: '🎮', color: '#f9a8d4', hint: 'Minigame am Brett' },
  { type: 'kingstabelle', label: 'Kingstabelle', icon: '👑', color: '#fb923c', hint: 'Am Brett würfeln' },
  { type: 'edward', label: 'Edward 20 Hands', icon: '🖐️', color: '#5eead4', hint: 'Dose antapen' },
  { type: 'flunk', label: 'Flunk-Feld', icon: '🚩', color: '#f87171', hint: 'Flunk-Runde spielen' },
  { type: 'aussetzen', label: 'Aussetzen', icon: '⏸️', color: '#d6d3d1', hint: 'Textfeld: aussetzen' },
  { type: 'text', label: 'Textfeld', icon: '📝', color: '#d6d3d1', hint: 'Freier Text' },
  { type: 'start', label: 'Start', icon: '🎓', color: '#d6d3d1', hint: 'Startfeld' },
  { type: 'rente', label: 'Rente (Ziel)', icon: '🏠', color: '#ef4444', hint: 'Zielfeld' },
]

const DEF_BY_TYPE = new Map(BOARD_FIELD_DEFS.map((d) => [d.type, d]))

/** Definition zu einem Feldtyp (Fallback: Textfeld). */
export function boardFieldDef(type: BoardFieldType): BoardFieldDef {
  return DEF_BY_TYPE.get(type) ?? DEF_BY_TYPE.get('text')!
}

// Bei inhaltlichen Änderungen am Standard-Brett erhöhen – Geräte mit
// unverändertem Brett übernehmen das neue Layout dann automatisch.
export const BOARD_VERSION = 1

/** Felder pro Reihe im Serpentinen-Layout (wie das alte Canva-Brett). */
export const BOARD_COLS = 8

// Kompakte Spezifikation des Standard-Bretts – angelehnt an das alte
// Canva-Brett (Reihenfolge = Laufweg, 9 Reihen à 8 Felder).
const SPEC: Array<[BoardFieldType, string?]> = [
  // Reihe 1
  ['start', 'Studium / Ausbildung'],
  ['text', 'Stipendium +4 KK'],
  ['ereignis'],
  ['gamechanger'],
  ['aktion'],
  ['aussetzen', 'Bierpong-Turnier-Kater: aussetzen'],
  ['challenge'],
  ['ereignis'],
  // Reihe 2
  ['aktion'],
  ['gamechanger'],
  ['ereignis'],
  ['aussetzen', 'STDs checken lassen: aussetzen'],
  ['kronkorken'],
  ['gamechanger'],
  ['challenge'],
  ['aktion'],
  // Reihe 3
  ['ereignis'],
  ['berufswechsel', '−2 KK'],
  ['kronkorken'],
  ['biersteuer'],
  ['ereignis'],
  ['gamechanger'],
  ['flunk'],
  ['aktion'],
  // Reihe 4
  ['challenge'],
  ['kronkorken'],
  ['aktion'],
  ['gamechanger'],
  ['boerse'],
  ['berufswechsel'],
  ['aktion'],
  ['ereignis'],
  // Reihe 5
  ['aussetzen', 'Sonntagsbier leer: aussetzen'],
  ['gamechanger'],
  ['ereignis'],
  ['flunk'],
  ['kronkorken'],
  ['ereignis'],
  ['edward'],
  ['minigame'],
  // Reihe 6
  ['challenge'],
  ['aktion'],
  ['ereignis'],
  ['gamechanger'],
  ['aussetzen', 'Besoffen im Gebüsch geschlafen: aussetzen'],
  ['kronkorken'],
  ['kingstabelle'],
  ['ereignis'],
  // Reihe 7
  ['berufswechsel', 'Pflicht'],
  ['gamechanger'],
  ['ereignis'],
  ['aktion'],
  ['ereignis'],
  ['text', 'Nicht 1.? Nochmal würfeln'],
  ['boerse'],
  ['biersteuer'],
  // Reihe 8
  ['gamechanger'],
  ['aktion'],
  ['kronkorken'],
  ['biersteuer'],
  ['ereignis'],
  ['flunk'],
  ['challenge'],
  ['minigame'],
  // Reihe 9
  ['ereignis'],
  ['aussetzen'],
  ['gamechanger'],
  ['text', 'Nicht 1.? Nochmal würfeln'],
  ['kronkorken'],
  ['edward'],
  ['zahltag'],
  ['rente', 'Rente'],
]

/**
 * Das mitgelieferte Standard-Brett. Deterministische IDs – die Funktion
 * läuft auch bei der Normalisierung empfangener Zustände (kein Zufall!).
 */
export function defaultBoard(): BoardState {
  const fields: BoardField[] = SPEC.map(([type, text], i) => ({
    id: `bf${i + 1}`,
    type,
    ...(text ? { text } : {}),
  }))
  return { fields, cols: BOARD_COLS, version: BOARD_VERSION }
}
