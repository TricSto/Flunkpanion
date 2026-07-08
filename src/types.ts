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

/** Getrunkene Biere eines Teams – Grundlage für die Endstatistik. */
export interface BeerCounts {
  /** Normale Biere. */
  normal: number
  /** Spaßbiere (freiwillig getrunken). */
  fun: number
  /** Strafbiere. */
  penalty: number
}

/**
 * Ausbildungsstand – steuert, aus wie vielen Berufen bei der Berufswahl
 * ausgewählt werden darf (kein Studium/Ausbildung = 1, Ausbildung = 2,
 * Studium = 3).
 */
export type Education = 'none' | 'ausbildung' | 'studium'

/** Für die Endstatistik gezählte Ereignisse pro Team. */
export interface TeamStats {
  /** Ausgespielte (benutzte) Aktionskarten. */
  actionCardsUsed: number
  /** Gewonnene Flunk-Runden. */
  flunkWins: number
  /** Gewonnene Challenges. */
  challengeWins: number
  /** Gewonnene Minigames. */
  minigameWins: number
}

export interface Team {
  id: string
  name: string
  color: string
  cash: number
  /** Anzahl der Spieler im Team (bei der Erstellung gezählt). */
  players: number
  job: Job | null
  /** Ausbildungsstand für die Berufswahl. */
  education: Education
  /** Besitzt das Team eine Aktie? (max. 1 pro Team, kostet 20 KK). */
  stock: boolean
  actionCards: ActionCard[]
  transactions: Transaction[]
  /** Gezählte Biere (normal / Spaß / Strafe). */
  beers: BeerCounts
  /** Zähler für die Endstatistik. */
  stats: TeamStats
  createdAt: number
}

/** Preis einer Aktie in KK. */
export const STOCK_PRICE = 20

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

/** Ein ausgelostes Flunk-Match. `b = null` bedeutet Freilos. */
export interface FlunkMatch {
  a: string
  b: string | null
  /** Gewinner-Team (null = noch nicht entschieden). */
  winnerId: string | null
}

/**
 * Eine laufende Flunk-Runde. Liegt im geteilten Zustand, damit alle Geräte
 * Bereit-Status, ausgeloste Matches und Sieger live sehen.
 */
export interface FlunkRound {
  id: string
  /** Teams, die auf dem Flunk-Feld angekommen und bereit sind. */
  readyIds: string[]
  /** Ausgeloste Matches; null = noch in der Ankommens-/Warte-Phase. */
  matches: FlunkMatch[] | null
  at: number
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
  /** Aktuell laufende Flunk-Runde (geteilt, live). */
  flunk: FlunkRound | null
  /** Live-Nachrichten an die Teams (geteilt). */
  announcements: Announcement[]
}

/**
 * Der Teil des Zustands, der zwischen allen Geräten geteilt wird.
 * `currentTeamId` ist bewusst NICHT dabei – jedes Gerät wählt sein eigenes Team.
 */
export type SharedState = Omit<AppState, 'currentTeamId'>
