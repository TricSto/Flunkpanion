// Zentrale Datentypen für die Flunk-des-Lebens-App.
// Währung im Spiel: KK = Kronkorken.

/** Kategorie einer Aktionskarte: normal ('action') oder Game Changer ('special'). */
export type ActionCardKind = 'action' | 'special'

export interface ActionCard {
  id: string
  title: string
  note: string
  /** Aus welcher Deck-Kategorie die Karte stammt. */
  kind: ActionCardKind
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
 * Ausbildungsstand – wird bei der Berufswahl mitgewählt: Ausbildung bietet
 * 2 normale Berufe, Studium 3 Diplom-Berufe. 'none' = noch nichts gewählt.
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
  /**
   * Gekaufte Aktie als Zahl 1–8 (null = keine). Jede Zahl kann nur von einem
   * Team gehalten werden.
   */
  stockNumber: number | null
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

/** Die kaufbaren Aktien-Zahlen. */
export const STOCK_NUMBERS = [1, 2, 3, 4, 5, 6, 7, 8]

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
  /** Bei 'cash' (Altdaten): gutgeschriebene KK. */
  amount?: number
  /** Bei 'card': Titel der zufällig gezogenen Aktionskarte. */
  cardTitle?: string
  /** Bei 'card': Beschreibung der gezogenen Aktionskarte. */
  cardNote?: string
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
  /**
   * Fürs Runden-Warten vergebene Aktionskarten dieser Flunk-Runde:
   * teamId → IDs der Karten. Nötig, um sie bei „zurück" wieder zu entfernen.
   */
  waitCardIds: Record<string, string[]>
  /**
   * Teams, die in dieser Runde beim „Bereit" schon ihr Gehalt gutgeschrieben
   * bekommen haben – die Auszahlung gibt es pro Flunk-Runde nur einmal.
   */
  paidIds: string[]
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

/** Kategorie eines Feedback-Eintrags. */
export type FeedbackKind = 'fehler' | 'idee' | 'sonstiges'

/**
 * Umsetzungsstatus eines Feedback-Eintrags. Wird NICHT in der App gesetzt,
 * sondern von der Feedback-Pipeline (GitHub-Workflow) anhand des
 * zugehörigen Issues nach Supabase zurückgeschrieben:
 * kein Status = eingereicht, Issue offen = 'in-arbeit',
 * Issue erledigt = 'umgesetzt', Issue verworfen = 'verworfen'.
 */
export type FeedbackStatus = 'in-arbeit' | 'umgesetzt' | 'verworfen'

/**
 * Ein Feedback-Eintrag von der (temporären) Feedback-Seite. Liegt im
 * geteilten Zustand, damit Feedback aller Geräte live beim Host ankommt.
 */
export interface FeedbackEntry {
  id: string
  kind: FeedbackKind
  text: string
  /** Absender (frei eingegeben, z. B. Team- oder Spielername). */
  author: string
  at: number
  /** Umsetzungsstatus – siehe FeedbackStatus (fehlt bei neuen Einträgen). */
  status?: FeedbackStatus
}

// ---- Spielbrett (temporäre Editor-Seite) -----------------------------------

/**
 * Art eines Spielbrett-Felds. Farben/Icons orientieren sich am alten
 * Canva-Brett (docs/altes-spielbrett.pdf): Megafon = Ereignis,
 * Einhorn = Game Changer, Schwerter = Challenge, Kronkorken = KK kassieren,
 * TAX-Beutel = Biersteuer usw.
 */
export type BoardFieldType =
  | 'start'
  | 'ereignis'
  | 'aktion'
  | 'gamechanger'
  | 'challenge'
  | 'kronkorken'
  | 'biersteuer'
  | 'zahltag'
  | 'berufswechsel'
  | 'boerse'
  | 'minigame'
  | 'kingstabelle'
  | 'edward'
  | 'flunk'
  | 'aussetzen'
  | 'text'
  | 'rente'

/** Ein einzelnes Feld auf dem Spielbrett (Reihenfolge = Laufweg). */
export interface BoardField {
  id: string
  type: BoardFieldType
  /** Optionale Zusatz-Beschriftung (z. B. „−2 KK“ oder ein Aussetzen-Text). */
  text?: string
}

/**
 * Das bearbeitbare Spielbrett. Liegt im geteilten Zustand, damit alle
 * Geräte dieselbe Anordnung sehen und Änderungen gespeichert bleiben.
 */
export interface BoardState {
  /** Felder in Laufweg-Reihenfolge (Serpentinen-Layout beim Rendern). */
  fields: BoardField[]
  /** Felder pro Reihe im Serpentinen-Layout. */
  cols: number
  /** Version des mitgelieferten Standard-Bretts – steuert Content-Updates. */
  version: number
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
  /** Feedback-Einträge der temporären Feedback-Seite (geteilt). */
  feedback: FeedbackEntry[]
  /** Das bearbeitbare Spielbrett (temporäre Editor-Seite, geteilt). */
  board: BoardState
}

/**
 * Der Teil des Zustands, der zwischen allen Geräten geteilt wird.
 * `currentTeamId` ist bewusst NICHT dabei – jedes Gerät wählt sein eigenes Team.
 */
export type SharedState = Omit<AppState, 'currentTeamId'>
