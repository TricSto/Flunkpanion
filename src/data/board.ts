import type { BoardBranch, BoardField, BoardFieldType, BoardState } from '../types'

/**
 * Definition eines Spielbrett-Feldtyps. Bewusst nur die Feldtypen, die im
 * aktuellen Spiel vorkommen – die alten Canva-Felder (Kronkorken, Börse,
 * Kingstabelle, Edward, Lebensstil …) sind Geschichte. Farben sind eine
 * kräftige, moderne Party-Palette im Stil von Spiel des Lebens/Mario Party.
 */
export interface BoardFieldDef {
  type: BoardFieldType
  label: string
  icon: string
  /** Feldfarbe auf dem Brett. */
  color: string
  /** Kurzbeschreibung für den Editor. */
  hint: string
}

export const BOARD_FIELD_DEFS: BoardFieldDef[] = [
  { type: 'ereignis', label: 'Ereignis', icon: '📣', color: '#5bc8f5', hint: 'Ereigniskarte ziehen' },
  { type: 'aktion', label: 'Aktionskarte', icon: '❗', color: '#ffc53d', hint: 'Aktionskarte ziehen' },
  { type: 'gamechanger', label: 'Game Changer', icon: '⚡', color: '#c68ef9', hint: 'Game-Changer-Karte ziehen' },
  { type: 'challenge', label: 'Challenge', icon: '⚔️', color: '#4fd8c6', hint: 'Gegner herausfordern' },
  { type: 'minigame', label: 'Minigame', icon: '🎮', color: '#ff8fcf', hint: 'Minigame am Brett' },
  { type: 'flunk', label: 'Flunk-Feld', icon: '🍻', color: '#ff5d5d', hint: 'Flunk-Runde spielen' },
  { type: 'zahltag', label: 'Zahltag', icon: '💰', color: '#5ad584', hint: 'Gehalt aufs Konto' },
  { type: 'biersteuer', label: 'Biersteuer', icon: '💸', color: '#ff9f45', hint: 'Biersteuer zahlen' },
  { type: 'berufswechsel', label: 'Berufs-/Gehaltswechsel', icon: '🔄', color: '#7ea6ff', hint: 'Beruf & Gehalt neu' },
  { type: 'start', label: 'Start', icon: '🏁', color: '#e8e2d2', hint: 'Startfeld eines Wegs' },
  { type: 'rente', label: 'Rente (Ziel)', icon: '🏖️', color: '#ffd166', hint: 'Zielfeld' },
]

const DEF_BY_TYPE = new Map(BOARD_FIELD_DEFS.map((d) => [d.type, d]))

/** Definition zu einem Feldtyp (Fallback: Ereignis). */
export function boardFieldDef(type: BoardFieldType): BoardFieldDef {
  return DEF_BY_TYPE.get(type) ?? BOARD_FIELD_DEFS[0]
}

/** Ist der (evtl. aus Altdaten stammende) Typ ein bekannter Feldtyp? */
export function isBoardFieldType(type: string): type is BoardFieldType {
  return DEF_BY_TYPE.has(type as BoardFieldType)
}

/** Icon eines Felds – Startfelder zeigen das Symbol ihres Wegs. */
export function boardFieldIcon(field: BoardField): string {
  if (field.type === 'start') return field.branch === 'studium' ? '🎓' : '🛠️'
  return boardFieldDef(field.type).icon
}

// Bei inhaltlichen Änderungen am Standard-Brett erhöhen – gespeicherte
// Bretter älterer Versionen werden dann durch das neue Layout ersetzt.
export const BOARD_VERSION = 2

/** Felder pro Reihe im Serpentinen-Layout des Hauptwegs. */
export const BOARD_COLS = 8

// Kompakte Brett-Spezifikation. Es gibt zwei getrennte Startwege –
// Ausbildung (kurz, schnell im Berufsleben) und Studium (länger bis zur
// ersten Flunk-Runde) – die beide in Feld 1 des Hauptwegs münden.
type Spec = Array<[BoardFieldType, string?]>

const AUSBILDUNG_SPEC: Spec = [
  ['start', 'Ausbildung'],
  ['ereignis'],
  ['aktion'],
  ['zahltag', '1. Gehalt'],
]

const STUDIUM_SPEC: Spec = [
  ['start', 'Studium'],
  ['ereignis'],
  ['gamechanger'],
  ['aktion'],
  ['challenge'],
  ['ereignis'],
  ['zahltag', '1. Gehalt'],
]

// Hauptweg: 6 Reihen à 8 Felder, Reihenfolge = Laufweg, endet in der Rente.
const MAIN_SPEC: Spec = [
  // Reihe 1
  ['ereignis'],
  ['aktion'],
  ['challenge'],
  ['gamechanger'],
  ['minigame'],
  ['flunk'],
  ['ereignis'],
  ['biersteuer'],
  // Reihe 2
  ['aktion'],
  ['gamechanger'],
  ['zahltag'],
  ['ereignis'],
  ['challenge'],
  ['berufswechsel'],
  ['minigame'],
  ['flunk'],
  // Reihe 3
  ['ereignis'],
  ['aktion'],
  ['gamechanger'],
  ['biersteuer'],
  ['challenge'],
  ['zahltag'],
  ['ereignis'],
  ['minigame'],
  // Reihe 4
  ['flunk'],
  ['aktion'],
  ['gamechanger'],
  ['ereignis'],
  ['berufswechsel', 'Pflicht'],
  ['challenge'],
  ['biersteuer'],
  ['minigame'],
  // Reihe 5
  ['zahltag'],
  ['ereignis'],
  ['flunk'],
  ['aktion'],
  ['gamechanger'],
  ['challenge'],
  ['ereignis'],
  ['berufswechsel'],
  // Reihe 6
  ['minigame'],
  ['biersteuer'],
  ['zahltag'],
  ['ereignis'],
  ['flunk'],
  ['aktion'],
  ['gamechanger'],
  ['rente', 'Rente'],
]

/**
 * Das mitgelieferte Standard-Brett. Deterministische IDs – die Funktion
 * läuft auch bei der Normalisierung empfangener Zustände (kein Zufall!).
 */
export function defaultBoard(): BoardState {
  const fields: BoardField[] = []
  const push = (spec: Spec, branch?: BoardBranch) => {
    for (const [type, text] of spec) {
      fields.push({
        id: `bf${fields.length + 1}`,
        type,
        ...(text ? { text } : {}),
        ...(branch ? { branch } : {}),
      })
    }
  }
  push(AUSBILDUNG_SPEC, 'ausbildung')
  push(STUDIUM_SPEC, 'studium')
  push(MAIN_SPEC)
  return { fields, cols: BOARD_COLS, version: BOARD_VERSION }
}

/** Felder nach Weg gruppiert, jeweils mit ihrem Index im flachen Array. */
export interface BoardEntry {
  field: BoardField
  index: number
}

export function splitBoardFields(fields: BoardField[]): {
  ausbildung: BoardEntry[]
  studium: BoardEntry[]
  main: BoardEntry[]
} {
  const ausbildung: BoardEntry[] = []
  const studium: BoardEntry[] = []
  const main: BoardEntry[] = []
  fields.forEach((field, index) => {
    if (field.branch === 'ausbildung') ausbildung.push({ field, index })
    else if (field.branch === 'studium') studium.push({ field, index })
    else main.push({ field, index })
  })
  return { ausbildung, studium, main }
}
