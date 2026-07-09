import type { FieldColors } from '../types'

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
  icon: string
  /** Standard-Farbe der Kachel (überschreibbar via fieldColors). */
  color: string
  sub: string
}

// 5×2-Raster (10 Felder). Flunk bekommt darunter eine eigene große Reihe.
export const GAME_GRID_FIELDS: GameFieldDef[] = [
  { key: 'zahltag', label: 'Zahltag', icon: '💰', color: '#22c55e', sub: 'Gehalt aufs Konto' },
  { key: 'biersteuer', label: 'Biersteuer', icon: '🍺', color: '#f59e0b', sub: 'Steuer abziehen' },
  { key: 'aktionskarten', label: 'Aktionskarten', icon: '🃏', color: '#6366f1', sub: 'Karte ziehen' },
  { key: 'spielveraendernd', label: 'Game Changer', icon: '⚡', color: '#a855f7', sub: 'Karte ziehen' },
  { key: 'ereignis', label: 'Ereignis', icon: '🎲', color: '#06b6d4', sub: 'Vorlesen & buchen' },
  { key: 'challenge', label: 'Challenge', icon: '🎯', color: '#ec4899', sub: 'Gegner fordern' },
  { key: 'gehaltswechsel', label: 'Berufswechsel', icon: '🔄', color: '#eab308', sub: 'Beruf & Gehalt neu' },
  { key: 'edward', label: 'Edward 20 Hands', icon: '🖐️', color: '#14b8a6', sub: 'Dose antapen' },
  { key: 'kingstabelle', label: 'Kingstabelle', icon: '👑', color: '#f97316', sub: 'Am Brett würfeln' },
  { key: 'minigames', label: 'Minigames', icon: '🎮', color: '#8b5cf6', sub: 'Am Brett würfeln' },
]

export const GAME_FLUNK_FIELD: GameFieldDef = {
  key: 'flunk',
  label: 'Flunk-Feld',
  icon: '🚩',
  color: '#ef4444',
  sub: 'Warten · Match · gewinnen',
}

/** Alle Felder der Spiel-Seite in Anzeige-Reihenfolge. */
export const ALL_GAME_FIELDS: GameFieldDef[] = [...GAME_GRID_FIELDS, GAME_FLUNK_FIELD]

/** Farbe eines Felds – individuell eingestellte Farbe vor der Standardfarbe. */
export function gameFieldColor(def: GameFieldDef, overrides: FieldColors): string {
  return overrides[def.key] ?? def.color
}
