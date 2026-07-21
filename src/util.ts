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

/** Diplom-Berufe gibt es nur über das Studium. */
export function isDiplomJob(title: string): boolean {
  return title.includes('(Diplom)')
}

/** Wie viele Berufe zur Auswahl stehen: Studium 3, Ausbildung 2. */
export function berufChoiceCount(education: 'ausbildung' | 'studium'): number {
  return education === 'studium' ? 3 : 2
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

/**
 * Titel aller Aktionskarten, die irgendein Team gerade auf der Hand hat.
 * Bereits vergebene Karten dürfen nicht erneut gezogen/ausgelost werden.
 */
export function heldCardTitles(teams: Team[]): Set<string> {
  return new Set(teams.flatMap((t) => t.actionCards.map((c) => c.title)))
}

/**
 * Effektives Gehalt eines Teams: gewürfeltes Gehalt plus dauerhafter Bonus
 * („Gehaltserhöhung"). Ohne gewürfeltes Gehalt zahlt auch der Bonus nichts.
 */
export function effectiveSalary(team: Team): number {
  const base = team.job?.salary ?? 0
  return base > 0 ? base + (team.salaryBonus ?? 0) : 0
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
