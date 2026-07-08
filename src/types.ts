// Zentrale Datentypen für die Flunk-des-Lebens-App.
// Währung im Spiel: KK = Kronkorken.

export interface ActionCard {
  id: string
  title: string
  note: string
  createdAt: number
}

export interface Property {
  id: string
  name: string
  value: number
  note: string
}

export interface Job {
  title: string
  salary: number
  /** Biersteuer (BS) in KK, gekoppelt an den Beruf. */
  beerTax: number
}

/** Ein Eintrag im Kronkorken-Verlauf eines Teams. */
export interface Transaction {
  id: string
  delta: number
  reason: string
  at: number
}

export interface Team {
  id: string
  name: string
  color: string
  cash: number
  job: Job | null
  actionCards: ActionCard[]
  properties: Property[]
  transactions: Transaction[]
  createdAt: number
}

/**
 * Art eines Decks – steuert, welche „Anwenden“-Aktionen beim Ziehen
 * angeboten werden (Job setzen, KK gutschreiben, Aktionskarte, Besitz …).
 */
export type DeckType =
  | 'job'
  | 'salary'
  | 'event'
  | 'action'
  | 'special'
  | 'challenge'
  | 'lifestyle'
  | 'equipment'

/** Eine einzelne Karte in einem Deck. */
export interface Card {
  id: string
  title: string
  detail: string
  /** KK-Effekt (positiv = Gutschrift, negativ = Abzug), falls vorhanden. */
  amount: number | null
  /** Nur für Job-Karten: Gehalt in KK. */
  salary?: number
  /** Nur für Job-Karten: Biersteuer in KK. */
  beerTax?: number
}

/**
 * Ein Deck bzw. eine Tabelle. `mode` bestimmt, wie gezogen wird:
 * - 'roll': wie ein Würfel – Ergebnis ist der Eintrag Nr. Augenzahl.
 * - 'draw': zufällige Karte aus dem Stapel.
 */
export interface Deck {
  id: string
  name: string
  icon: string
  type: DeckType
  mode: 'roll' | 'draw'
  cards: Card[]
}

export interface AppState {
  teams: Team[]
  decks: Deck[]
  /** Das aktuell „beigetretene“ Team dieses Geräts. */
  currentTeamId: string | null
}
