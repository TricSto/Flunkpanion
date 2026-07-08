// Zentrale Datentypen für die Flunk-des-Lebens-App.
// Währung im Spiel: KK = Kronkorken.

export interface ActionCard {
  id: string
  title: string
  note: string
  createdAt: number
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
  transactions: Transaction[]
  createdAt: number
}

/**
 * Art eines Decks – steuert, welche „Anwenden“-Aktionen beim Ziehen
 * angeboten werden (Job setzen, KK gutschreiben, Aktionskarte …).
 */
export type DeckType =
  | 'job'
  | 'salary'
  | 'event'
  | 'action'
  | 'special'
  | 'challenge'

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

/**
 * Eine laufende Challenge zwischen zwei Teams. Liegt im geteilten Zustand,
 * damit alle Geräte dieselbe ausgeloste Challenge live sehen.
 */
export interface Challenge {
  id: string
  /** Team, das herausfordert. */
  challengerId: string
  /** Gegner-Team. */
  opponentId: string
  /** Titel der ausgelosten Challenge-Karte. */
  title: string
  /** Beschreibung der Challenge-Karte. */
  detail: string
  status: 'active' | 'resolved'
  /** Gewinner-Team (erst nach Auflösung gesetzt). */
  winnerId: string | null
  /** Was der Gewinner bekommen hat. */
  reward: ChallengeReward | null
  at: number
}

export interface ChallengeReward {
  kind: 'card' | 'cash' | 'none'
  /** Bei 'cash': gutgeschriebene KK. */
  amount?: number
}

/**
 * Eine live an alle Geräte verteilte Nachricht (z. B. „Team X hat die
 * Challenge gewonnen"). Wird beim Empfänger als Banner angezeigt.
 */
export interface Announcement {
  id: string
  /** Ziel-Team (Gewinner). null = an alle. */
  teamId: string | null
  title: string
  message: string
  at: number
}

export interface AppState {
  teams: Team[]
  decks: Deck[]
  /** Das aktuell „beigetretene“ Team dieses Geräts (nicht geteilt). */
  currentTeamId: string | null
  /** Version der mitgelieferten Decks – steuert Content-Updates. */
  decksVersion: number
  /** Aktuell laufende/aufgelöste Challenge (geteilt, live). */
  challenge: Challenge | null
  /** Live-Nachrichten an die Teams (geteilt). */
  announcements: Announcement[]
}

/**
 * Der Teil des Zustands, der zwischen allen Geräten geteilt wird.
 * `currentTeamId` ist bewusst NICHT dabei – jedes Gerät wählt sein eigenes Team.
 */
export type SharedState = Omit<AppState, 'currentTeamId'>
