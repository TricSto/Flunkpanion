// Kleine Hilfsfunktionen.

const eur = new Intl.NumberFormat('de-DE', {
  style: 'currency',
  currency: 'EUR',
  maximumFractionDigits: 0,
})

export function formatMoney(value: number): string {
  return eur.format(value)
}

export function rollDie(sides = 6): number {
  return Math.floor(Math.random() * sides) + 1
}
