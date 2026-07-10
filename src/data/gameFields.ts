import type { BoardFieldType, FieldColors } from '../types'
import type { IconKind } from '../lib/boardArt'

/**
 * Die Felder der Spiel-Seite (BoardView). Zentral definiert, damit die
 * Karten-Seite dieselben Felder zum Einstellen der Farben anbieten kann.
 */
export type GameFieldKey =
  | 'zahltag'
  | 'biersteuer'
  | 'aktionskarten'
  | 'spielveraendernd'
  | 'ereignis'
  | 'challenge'
  | 'gehaltswechsel'
  | 'edward'
  | 'kingstabelle'
  | 'minigames'
  | 'flunk'

export interface GameFieldDef {
  key: GameFieldKey
  label: string
  /** Vektor-Icon vom Spielbrett (siehe FieldIcon). */
  icon: IconKind
  /** Standard-Farbe der Kachel (überschreibbar via fieldColors). */
  color: string
  sub: string
}

// 5×2-Raster (10 Felder). Flunk bekommt darunter eine eigene große Reihe.
export const GAME_GRID_FIELDS: GameFieldDef[] = [
  { key: 'zahltag', label: 'Zahltag', icon: 'zahltag', color: '#22c55e', sub: 'Gehalt aufs Konto' },
  { key: 'biersteuer', label: 'Biersteuer', icon: 'biersteuer', color: '#f59e0b', sub: 'Steuer abziehen' },
  { key: 'aktionskarten', label: 'Aktionskarten', icon: 'aktion', color: '#6366f1', sub: 'Karte ziehen' },
  { key: 'spielveraendernd', label: 'Game Changer', icon: 'gamechanger', color: '#a855f7', sub: 'Karte ziehen' },
  { key: 'ereignis', label: 'Ereignis', icon: 'ereignis', color: '#06b6d4', sub: 'Vorlesen & buchen' },
  { key: 'challenge', label: 'Challenge', icon: 'challenge', color: '#ec4899', sub: 'Gegner fordern' },
  { key: 'gehaltswechsel', label: 'Berufswechsel', icon: 'berufswechsel', color: '#eab308', sub: 'Beruf & Gehalt neu' },
  { key: 'edward', label: 'Edward 20 Hands', icon: 'edward', color: '#14b8a6', sub: 'Dose antapen' },
  { key: 'kingstabelle', label: 'Kingstabelle', icon: 'crown', color: '#f97316', sub: 'Am Brett würfeln' },
  { key: 'minigames', label: 'Minigames', icon: 'minigame', color: '#8b5cf6', sub: 'Am Brett würfeln' },
]

export const GAME_FLUNK_FIELD: GameFieldDef = {
  key: 'flunk',
  label: 'Flunk-Feld',
  icon: 'flunk',
  color: '#ef4444',
  sub: 'Warten · Match · gewinnen',
}

/** Alle Felder der Spiel-Seite in Anzeige-Reihenfolge. */
export const ALL_GAME_FIELDS: GameFieldDef[] = [...GAME_GRID_FIELDS, GAME_FLUNK_FIELD]

/** Farbe eines Felds – individuell eingestellte Farbe vor der Standardfarbe. */
export function gameFieldColor(def: GameFieldDef, overrides: FieldColors): string {
  return overrides[def.key] ?? def.color
}

/**
 * Welcher Spielbrett-Feldtyp zu welchem Spiel-Feld gehört – darüber
 * schlagen die auf der Karten-Seite eingestellten Farben auch auf dem
 * Spielbrett (Editor-Ansicht und PDF-Export) durch. Edward und die
 * Kingstabelle haben kein eigenes Brett-Feld.
 */
const FIELD_BOARD_TYPE: Partial<Record<GameFieldKey, BoardFieldType>> = {
  zahltag: 'zahltag',
  biersteuer: 'biersteuer',
  aktionskarten: 'aktion',
  spielveraendernd: 'gamechanger',
  ereignis: 'ereignis',
  challenge: 'challenge',
  gehaltswechsel: 'berufswechsel',
  minigames: 'minigame',
  flunk: 'flunk',
}

/** Eingestellte Feldfarben in Brett-Feldtyp-Farben übersetzen. */
export function boardColorOverrides(
  colors: FieldColors,
): Partial<Record<BoardFieldType, string>> {
  const out: Partial<Record<BoardFieldType, string>> = {}
  for (const [key, type] of Object.entries(FIELD_BOARD_TYPE) as Array<
    [GameFieldKey, BoardFieldType]
  >) {
    const color = colors[key]
    if (color) out[type] = color
  }
  return out
}
