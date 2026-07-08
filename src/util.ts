// Kleine Hilfsfunktionen.

const kk = new Intl.NumberFormat('de-DE', { maximumFractionDigits: 0 })

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
