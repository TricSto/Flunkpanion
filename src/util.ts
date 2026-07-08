// Kleine Hilfsfunktionen.

import type { Team } from './types'

const kk = new Intl.NumberFormat('de-DE', { maximumFractionDigits: 0 })

/** Zufälliges Element aus einer Liste (oder undefined, wenn leer). */
export function pickRandom<T>(items: T[]): T | undefined {
  if (items.length === 0) return undefined
  return items[Math.floor(Math.random() * items.length)]
}

/** Bis zu n zufällige, verschiedene Elemente aus einer Liste. */
export function sampleDistinct<T>(items: T[], n: number): T[] {
  const pool = [...items]
  const out: T[] = []
  while (out.length < n && pool.length > 0) {
    const i = Math.floor(Math.random() * pool.length)
    out.push(pool.splice(i, 1)[0])
  }
  return out
}

/** Wie viele Berufe zur Auswahl stehen – abhängig vom Ausbildungsstand. */
export function berufChoiceCount(education: 'none' | 'ausbildung' | 'studium'): number {
  return education === 'studium' ? 3 : education === 'ausbildung' ? 2 : 1
}

/**
 * Berufe, die bereits von einem Team belegt sind (jeder Beruf max. 1×).
 * `exceptId` schließt ein Team aus (z. B. das Team, das gerade neu würfelt).
 */
export function takenJobTitles(teams: Team[], exceptId?: string): Set<string> {
  return new Set(
    teams
      .filter((t) => t.id !== exceptId && t.job?.title)
      .map((t) => t.job!.title),
  )
}

/** Formatiert einen KK-Betrag (Kronkorken), z. B. "12 KK" oder "-5 KK". */
export function formatMoney(value: number): string {
  return `${kk.format(value)} KK`
}

export function rollDie(sides = 6): number {
  return Math.floor(Math.random() * sides) + 1
}

const time = new Intl.DateTimeFormat('de-DE', {
  hour: '2-digit',
  minute: '2-digit',
})

export function formatTime(ts: number): string {
  return time.format(new Date(ts))
}
