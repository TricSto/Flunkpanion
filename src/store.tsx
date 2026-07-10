import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import type {
  ActionCard,
  ActionCardKind,
  AppState,
  Announcement,
  BeerCounts,
  BoardBranch,
  BoardField,
  BoardFieldType,
  BoardState,
  BoardTableKey,
  BoardTables,
  Card,
  Challenge,
  ChallengeReward,
  Deck,
  Education,
  FeedbackEntry,
  FeedbackKind,
  FieldColors,
  FlunkMatch,
  FlunkRound,
  Job,
  SharedState,
  Team,
  TeamStats,
  Transaction,
} from './types'
import { FLUNK_BEER_BONUS, STOCK_NUMBERS, STOCK_PRICE } from './types'
import { DECKS_VERSION, initialState, TEAM_COLORS } from './data/defaults'
import { BOARD_COLS, BOARD_VERSION, defaultBoard, isBoardFieldType } from './data/board'
import { defaultTables } from './data/tables'
import { CONTENT_ID, CONTENT_TABLE, GAMES_TABLE, isRemoteConfigured, supabase } from './lib/supabase'
import { effectiveSalary, isDiplomJob, pickRandom, sampleDistinct } from './util'

const STORAGE_KEY = 'flunk-des-lebens/state/v1'
const SESSION_KEY = 'flunk-des-lebens/session/v1'

/** Verbindungszustand zum Server. */
export type ConnectionStatus = 'local' | 'connecting' | 'live' | 'error'

/** Ergebnis des Berufswechsels für ein Team (title null = kein Beruf frei). */
export interface BerufswechselResult {
  teamId: string
  teamName: string
  studium: boolean
  title: string | null
  salary: number
  beerTax: number
}

/** Aktuelle Online-Sitzung (welchem Spiel-Code dieses Gerät beigetreten ist). */
export interface Session {
  code: string
  /** Hat dieses Gerät das Spiel erstellt? Nur der Host sieht Host-Aktionen. */
  isHost: boolean
}

// Eindeutige ID ohne externe Abhängigkeit.
function uid(): string {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36)
}

/**
 * JSON-Stringify mit sortierten Schlüsseln. Nötig für den Echo-Vergleich beim
 * Sync: Postgres (jsonb) sortiert Objekt-Schlüssel um, wodurch der vom Server
 * zurückkommende Zustand bei normalem JSON.stringify nie dem lokal
 * geschriebenen glich. Folge: eigene Writes wurden als "fremde" Änderung
 * erneut angewendet und überschrieben dabei frisch gemachte lokale Änderungen
 * (Buttons "blinkten", aber nichts passierte).
 */
function stableStringify(value: unknown): string {
  return JSON.stringify(sortKeysDeep(value))
}

function sortKeysDeep(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortKeysDeep)
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.keys(value as Record<string, unknown>)
        .sort()
        .map((k) => [k, sortKeysDeep((value as Record<string, unknown>)[k])]),
    )
  }
  return value
}

// Kurzer, gut lesbarer Spiel-Code (ohne leicht verwechselbare Zeichen).
const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
function generateCode(len = 4): string {
  let out = ''
  for (let i = 0; i < len; i++) {
    out += CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)]
  }
  return out
}

/**
 * Sorgt dafür, dass geladene/empfangene Teams alle neueren Felder besitzen
 * (players, beers, transactions) – schützt vor Abstürzen bei älteren Ständen.
 */
function emptyStats(): TeamStats {
  return { actionCardsUsed: 0, flunkWins: 0, challengeWins: 0, minigameWins: 0 }
}

/**
 * WICHTIG: Diese Normalisierung läuft auf jedem Gerät über den empfangenen
 * Remote-Zustand – sie muss deterministisch sein (kein Zufall), sonst
 * schaukeln sich die Geräte gegenseitig hoch (Sync-Ping-Pong).
 */
function normalizeTeams(teams: Team[] | undefined, decks: Deck[]): Team[] {
  // Titel der Game-Changer-Karten, um Alt-Karten ohne `kind` einzuordnen.
  const specialTitles = new Set(
    decks.filter((d) => d.type === 'special').flatMap((d) => d.cards.map((c) => c.title)),
  )
  // Bereits vergebene Aktien-Nummern (neue Feld-Variante).
  const usedNumbers = new Set(
    (teams ?? []).map((t) => t.stockNumber).filter((n): n is number => typeof n === 'number'),
  )
  return (teams ?? []).map((t) => {
    // Altdaten: `stock: true` (boolean) → deterministisch kleinste freie Nummer.
    const legacy = t as Team & { stock?: boolean }
    let stockNumber = typeof t.stockNumber === 'number' ? t.stockNumber : null
    if (stockNumber == null && legacy.stock === true) {
      const free = STOCK_NUMBERS.find((n) => !usedNumbers.has(n))
      if (free != null) {
        stockNumber = free
        usedNumbers.add(free)
      }
    }
    const { stock: _legacyStock, ...rest } = legacy
    void _legacyStock
    return {
      ...rest,
      transactions: t.transactions ?? [],
      players: t.players ?? 1,
      education: t.education ?? 'none',
      stockNumber,
      salaryBonus: t.salaryBonus ?? 0,
      actionCards: (t.actionCards ?? []).map((c) => ({
        ...c,
        kind: c.kind ?? (specialTitles.has(c.title) ? 'special' : 'action'),
      })),
      beers: t.beers ?? { normal: 0, fun: 0, penalty: 0 },
      stats: { ...emptyStats(), ...(t.stats ?? {}) },
    }
  })
}

/** Ergänzt fehlende Felder älterer Flunk-Runden (z. B. `waitCardIds`). */
function normalizeFlunk(flunk: FlunkRound | null | undefined): FlunkRound | null {
  if (!flunk) return null
  return { ...flunk, waitCardIds: flunk.waitCardIds ?? {}, paidIds: flunk.paidIds ?? [] }
}

/**
 * Ergänzt fehlende/kaputte Spielbrett-Daten älterer Stände. Muss wie
 * normalizeTeams deterministisch sein (läuft über empfangene Remote-Zustände).
 */
function normalizeBoard(board: BoardState | null | undefined): BoardState {
  // Ältere Brett-Versionen komplett durch das neue Standard-Layout ersetzen –
  // dort gibt es noch die alten Canva-Feldtypen und keine zwei Startwege.
  if (!board || !Array.isArray(board.fields) || board.version !== BOARD_VERSION) {
    return defaultBoard()
  }
  return {
    fields: board.fields.filter(
      (f): f is BoardField => Boolean(f && f.id && f.type && isBoardFieldType(f.type)),
    ),
    cols: typeof board.cols === 'number' && board.cols >= 3 ? board.cols : BOARD_COLS,
    version: BOARD_VERSION,
  }
}

/**
 * Ergänzt fehlende/kaputte Feldfarben älterer Stände. Deterministisch –
 * läuft wie normalizeTeams auch über empfangene Remote-Zustände.
 */
function normalizeFieldColors(colors: FieldColors | null | undefined): FieldColors {
  if (!colors || typeof colors !== 'object' || Array.isArray(colors)) return {}
  return Object.fromEntries(
    Object.entries(colors).filter(([, v]) => typeof v === 'string' && v.length > 0),
  )
}

/**
 * Ergänzt das Feld `usedBerufswechsel` älterer Stände. Deterministisch –
 * läuft wie normalizeTeams auch über empfangene Remote-Zustände.
 */
function normalizeUsedBerufswechsel(ids: string[] | null | undefined): string[] {
  if (!Array.isArray(ids)) return []
  return ids.filter((id): id is string => typeof id === 'string')
}

/**
 * Ergänzt fehlende/kaputte Tabellen-Inhalte älterer Stände. Deterministisch –
 * läuft wie normalizeTeams auch über empfangene Remote-Zustände.
 */
function normalizeTables(tables: BoardTables | null | undefined): BoardTables {
  const defaults = defaultTables()
  const rows = (value: unknown, fallback: string[]): string[] =>
    Array.isArray(value) ? value.filter((t): t is string => typeof t === 'string') : fallback
  if (!tables || typeof tables !== 'object') return defaults
  return {
    kingstabelle: rows(tables.kingstabelle, defaults.kingstabelle),
    minigames: rows(tables.minigames, defaults.minigames),
  }
}

/** Frische Flunk-Runde in der Ankommens-Phase. */
function emptyFlunk(): FlunkRound {
  return { id: uid(), readyIds: [], matches: null, waitCardIds: {}, paidIds: [], at: Date.now() }
}

/**
 * Nur die Felder, die zwischen allen Geräten geteilt werden.
 * decks/decksVersion/fieldColors/tables werden zusätzlich global gespeichert
 * (app_content) und beim Empfangen NICHT mehr aus dem Spielzustand gelesen –
 * sie stehen hier nur noch drin, damit ältere App-Versionen weiter laufen.
 */
function sharedOf(state: AppState): SharedState {
  return {
    teams: state.teams,
    decks: state.decks,
    decksVersion: state.decksVersion,
    challenge: state.challenge,
    flunk: state.flunk,
    announcements: state.announcements,
    feedback: state.feedback,
    board: state.board,
    usedBerufswechsel: state.usedBerufswechsel,
    fieldColors: state.fieldColors,
    tables: state.tables,
  }
}

/**
 * Die global auf dem Server hinterlegten Inhalte der Karten-Seite. Liegen in
 * einer einzigen Zeile (Tabelle app_content) und gelten – anders als der
 * Spielzustand pro Spiel-Code – dauerhaft für alle zukünftigen Spiele.
 */
interface GlobalContent {
  decks: Deck[]
  decksVersion: number
  fieldColors: FieldColors
  /** Bearbeitbare Kingstabelle & Minigames-Tabelle (fehlt in Alt-Zeilen). */
  tables?: BoardTables
}

function contentOf(state: AppState): GlobalContent {
  return {
    decks: state.decks,
    decksVersion: state.decksVersion,
    fieldColors: state.fieldColors,
    tables: state.tables,
  }
}

function loadState(): AppState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return initialState
    const parsed = JSON.parse(raw) as Partial<AppState>
    // Bei neuer Deck-Version die mitgelieferten Karten übernehmen, Teams behalten.
    const decksCurrent = parsed.decksVersion === DECKS_VERSION && parsed.decks
    const decks = decksCurrent ? parsed.decks! : initialState.decks
    return {
      // Ältere gespeicherte Teams besitzen evtl. noch keine neuen Felder.
      teams: normalizeTeams(parsed.teams, decks),
      decks,
      currentTeamId: parsed.currentTeamId ?? null,
      decksVersion: DECKS_VERSION,
      challenge: parsed.challenge ?? null,
      flunk: normalizeFlunk(parsed.flunk),
      announcements: parsed.announcements ?? [],
      feedback: parsed.feedback ?? [],
      board: normalizeBoard(parsed.board),
      usedBerufswechsel: normalizeUsedBerufswechsel(parsed.usedBerufswechsel),
      fieldColors: normalizeFieldColors(parsed.fieldColors),
      tables: normalizeTables(parsed.tables),
    }
  } catch {
    return initialState
  }
}

function loadSession(): Session | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as Partial<Session>
    return parsed.code ? { code: parsed.code, isHost: Boolean(parsed.isHost) } : null
  } catch {
    return null
  }
}

interface Store {
  state: AppState
  // Online / Sitzung
  session: Session | null
  connectionStatus: ConnectionStatus
  isRemoteConfigured: boolean
  /**
   * Ist dieses Gerät der Spielleiter? Host wird man erst durch „Spiel
   * erstellen" – Beitreter und Geräte ohne Spiel sehen keine Host-Aktionen.
   * (Ohne konfigurierten Server gibt es kein „Spiel erstellen", dann ist das
   * einzelne Gerät automatisch der Host.)
   */
  isHost: boolean
  /** Neues Online-Spiel erstellen; gibt den Spiel-Code zurück (oder null bei Fehler). */
  createGame: () => Promise<string | null>
  /** Einem Online-Spiel per Code beitreten. */
  joinGame: (code: string) => Promise<{ ok: boolean; error?: string }>
  /** Online-Spiel verlassen (zurück in den lokalen Modus). */
  leaveGame: () => void
  // Teams
  /** Team anlegen; gibt die ID des neuen Teams zurück (z. B. zum Direkt-Beitreten). */
  addTeam: (name: string, players?: number) => string
  removeTeam: (teamId: string) => void
  renameTeam: (teamId: string, name: string) => void
  /** Teamfarbe einstellen (UI nur für den Host; synct live an alle Geräte). */
  setTeamColor: (teamId: string, color: string) => void
  setPlayers: (teamId: string, players: number) => void
  addBeer: (teamId: string, kind: keyof BeerCounts, delta: number) => void
  /**
   * Aktie mit Wunsch-Nummer (1–8) kaufen. Gibt false zurück, wenn die Nummer
   * vergeben ist, das Team schon eine Aktie hat oder die KK nicht reichen.
   */
  buyStock: (teamId: string, stockNumber: number) => boolean
  /** Aktie entfernen (Korrektur, ohne Rückerstattung). */
  removeStock: (teamId: string) => void
  /**
   * Aktien-Auszahlung: Wurde die Aktien-Zahl geworfen, zieht das Team eine
   * zufällige Aktionskarte (keine KK – Feedback #31). Gibt die gezogene
   * Karte zurück (null ohne Aktie oder bei leerem Deck).
   */
  payoutStockCard: (teamId: string) => ActionCard | null
  /** Statistik-Zähler ändern (z. B. Flunk-/Minigame-Siege). */
  bumpStat: (teamId: string, key: keyof TeamStats, delta: number) => void
  adjustCash: (teamId: string, delta: number, reason?: string) => void
  undoTransaction: (teamId: string, txId: string) => void
  setJob: (teamId: string, job: Job | null) => void
  setJobTitle: (teamId: string, title: string, effect?: string) => void
  /**
   * Berufswahl über den Ausbildung/Studium-Flow: setzt Bildungsweg und Beruf
   * atomar in einem Update (bleibt so auch im Live-Modus konsistent).
   */
  chooseJob: (teamId: string, education: Education, title: string) => void
  /**
   * Berufswechsel-Feld auslösen: setzt Beruf & Gehalt ALLER Teams zurück
   * und würfelt beides neu – der Bildungsweg bleibt wie zuvor (Studium →
   * Diplom-Beruf, sonst Ausbildungsberuf, keine Doppelten). Alle Geräte
   * bekommen eine Live-Nachricht mit den neuen Berufen. Jedes Brett-Feld
   * (`fieldId`) löst nur EINMAL aus – nur das erste vorbeikommende Team
   * zählt. Gibt null zurück, wenn das Feld schon verbraucht ist; sonst
   * die Ergebnisse pro Team. Läuft atomar in einem Update.
   */
  triggerBerufswechsel: (fieldId: string) => BerufswechselResult[] | null
  setSalary: (teamId: string, salary: number, beerTax: number) => void
  /**
   * Dauerhaften Gehalts-Bonus erhöhen (Ereigniskarte „Gehaltserhöhung").
   * Der Bonus bleibt beim Neuwürfeln des Gehalts erhalten und wird bei
   * jeder Gehaltsauszahlung mitgezahlt.
   */
  addSalaryBonus: (teamId: string, delta: number) => void
  payBeerTax: (teamId: string) => void
  // Team-Auswahl („Beitreten“)
  setCurrentTeam: (teamId: string | null) => void
  // Aktionskarten
  addActionCard: (teamId: string, title: string, note: string, kind: ActionCardKind) => void
  removeActionCard: (teamId: string, cardId: string) => void
  /**
   * Aktionskarte in der Flunk-Runde benutzen: entfernt die Karte, zählt sie
   * als ausgespielt und schickt eine Live-Nachricht „Aktionskarte aktiviert"
   * mit dem Effekt – gerichtet an das Gegner-Team im selben Flunk-Match
   * (bzw. an alle, solange noch keine Matches ausgelost sind).
   */
  playActionCard: (teamId: string, cardId: string) => void
  // Challenges
  startChallenge: (challengerId: string, opponentId: string, card: Card) => void
  resolveChallenge: (winnerId: string, reward: ChallengeReward, message: string) => void
  clearChallenge: () => void
  // Flunk-Runde (geteilt, live)
  /**
   * Team ist auf dem Flunk-Feld angekommen und bereit. Schreibt dabei einmal
   * pro Flunk-Runde das aktuelle Gehalt gut und gibt den Betrag zurück
   * (null, wenn schon gezahlt, kein Gehalt oder bereits bereit).
   */
  flunkArrive: (teamId: string) => number | null
  /**
   * Team hat (eine weitere) Runde gewartet: zieht eine zufällige normale
   * Aktionskarte als Belohnung und merkt sie sich in der Flunk-Runde, damit
   * „zurück" sie wieder entfernen kann. Gibt die gezogene Karte zurück
   * (null, wenn das Deck leer ist).
   */
  flunkWaitRound: (teamId: string) => ActionCard | null
  /**
   * Bereit-Status eines Teams zurücknehmen (nur vor der Auslosung).
   * Entfernt auch alle in dieser Runde durchs Warten erhaltenen Karten.
   */
  flunkUnready: (teamId: string) => void
  /** Matches aus den bereiten Teams auslosen (auch neu auslosen). */
  flunkDrawMatches: () => void
  /** Sieger eines Matches setzen bzw. mit null zurücknehmen (pflegt flunkWins). */
  flunkSetWinner: (matchIndex: number, teamId: string | null) => void
  /**
   * Bier-Zahlen eines Matches für die Abrechnung setzen (#62): nicht
   * ausgetrunkene bzw. leer getrunkene Biere des Verlierers. Geteilt/live.
   */
  flunkSetMatchBeers: (
    matchIndex: number,
    patch: { unfinished?: number; finished?: number },
  ) => void
  /** Zurück zur Ankommens-Phase (nimmt gezählte Siege zurück). */
  flunkBackToSetup: () => void
  /**
   * Flunk-Runde regulär beenden: Sieger bleiben gezählt, jeder Match-Sieger
   * bekommt `rewardPerWin` KK gutgeschrieben, alle Geräte bekommen eine
   * Broadcast-Nachricht, danach ist die Runde geschlossen.
   */
  flunkFinish: (rewardPerWin?: number) => void
  /** Flunk-Runde abbrechen/zurücksetzen (nimmt gezählte Siege zurück). */
  flunkReset: () => void
  // Feedback (temporäre Feedback-Seite)
  /** Feedback-Eintrag speichern (synct live an alle Geräte). */
  addFeedback: (kind: FeedbackKind, text: string, author: string) => void
  /** Feedback-Eintrag löschen (nur Host). */
  removeFeedback: (feedbackId: string) => void
  // Spielbrett (temporäre Editor-Seite)
  /**
   * Feld im Laufweg verschieben (Index → Index, synct live). Das Feld
   * übernimmt dabei den Weg (Startweg/Hauptweg) des Ziel-Felds.
   */
  moveBoardField: (fromIndex: number, toIndex: number) => void
  /** Typ/Text/Weg eines Felds ändern. */
  updateBoardField: (fieldId: string, patch: Partial<Pick<BoardField, 'type' | 'text' | 'branch'>>) => void
  /** Neues Feld an einer Position einfügen (optional auf einem Startweg). */
  insertBoardField: (index: number, type: BoardFieldType, branch?: BoardBranch) => void
  /** Feld vom Brett entfernen. */
  removeBoardField: (fieldId: string) => void
  /** Spielbrett auf das mitgelieferte Standard-Brett zurücksetzen. */
  resetBoard: () => void
  // Karten-Seite (Feldfarben & Karteninhalte)
  /**
   * Farbe eines Spiel-Felds einstellen (synct live an alle Geräte).
   * `null` setzt das Feld auf seine Standardfarbe zurück.
   */
  setFieldColor: (key: string, color: string | null) => void
  /** Alle Feldfarben auf die Standardfarben zurücksetzen. */
  resetFieldColors: () => void
  /** Titel/Beschreibung/Werte einer Karte in einem Deck ändern. */
  updateDeckCard: (deckId: string, cardId: string, patch: Partial<Omit<Card, 'id'>>) => void
  /** Neue (leere) Karte an ein Deck anhängen; gibt ihre ID zurück. */
  addDeckCard: (deckId: string) => string
  /** Karte aus einem Deck löschen. */
  removeDeckCard: (deckId: string, cardId: string) => void
  /** Alle Decks auf die mitgelieferten Karten zurücksetzen. */
  resetDecks: () => void
  /** Text einer Zeile in Kingstabelle/Minigames ändern (synct live). */
  setTableRow: (table: BoardTableKey, index: number, text: string) => void
  /** Neue Zeile ans Ende einer Brett-Tabelle anhängen. */
  addTableRow: (table: BoardTableKey) => void
  /** Zeile aus einer Brett-Tabelle löschen (Nummern rücken nach). */
  removeTableRow: (table: BoardTableKey, index: number) => void
  /** Eine Brett-Tabelle auf die mitgelieferten Inhalte zurücksetzen. */
  resetTable: (table: BoardTableKey) => void
  // Decks / Würfeltabellen
  updateDecks: (decks: Deck[]) => void
  /**
   * Neues Spiel mit denselben Teams starten (Siegesauswertung): KK, Berufe,
   * Karten, Biere, Zähler, Challenge/Flunk-Runde und die verbrauchten
   * Berufswechsel-Felder werden zurückgesetzt – Teams (Name, Farbe,
   * Spieleranzahl) bleiben bestehen. Alle Geräte bekommen eine Nachricht.
   */
  newGame: () => void
  resetAll: () => void
}

const StoreContext = createContext<Store | null>(null)

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AppState>(loadState)
  const [session, setSession] = useState<Session | null>(loadSession)
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>(() =>
    supabase && loadSession() ? 'connecting' : 'local',
  )

  // Immer aktueller Zustand für Callbacks/Async-Code.
  const stateRef = useRef(state)
  stateRef.current = state
  // JSON des geteilten Zustands, der zuletzt mit dem Server abgeglichen wurde.
  // Verhindert Echo-Schleifen (eigene Writes lösen kein erneutes Setzen aus).
  const lastSyncedRef = useRef<string | null>(null)
  // Dito für die globalen Inhalte (app_content). null = Startabgleich steht
  // noch aus – solange wird bewusst nichts geschrieben, damit der lokale
  // Stand die Server-Inhalte beim Start nicht überschreibt.
  const lastContentSyncedRef = useRef<string | null>(null)

  // Zustand & Sitzung lokal spiegeln (Offline-Fallback + Cache).
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
    } catch {
      // Speicher voll o.ä. – bewusst ignorieren.
    }
  }, [state])

  useEffect(() => {
    try {
      if (session) localStorage.setItem(SESSION_KEY, JSON.stringify(session))
      else localStorage.removeItem(SESSION_KEY)
    } catch {
      // ignorieren
    }
  }, [session])

  // Eingehenden Server-Zustand übernehmen (currentTeamId bleibt gerätelokal).
  const applyRemote = (shared: SharedState) => {
    const json = stableStringify(shared)
    if (json === lastSyncedRef.current) return
    // Gibt es lokale, noch nicht geschriebene Änderungen (Debounce läuft),
    // den Remote-Stand nicht anwenden: Der eigene anstehende Write gewinnt
    // ohnehin (Last-Write-Wins) – sonst würde ein gerade gedrückter Button
    // von einem älteren Server-Stand sofort wieder zurückgesetzt.
    if (
      lastSyncedRef.current !== null &&
      stableStringify(sharedOf(stateRef.current)) !== lastSyncedRef.current
    ) {
      return
    }
    lastSyncedRef.current = json
    setState((s) => {
      let teams = normalizeTeams(shared.teams, s.decks)
      // Merge-Schutz: Der Sync schreibt immer den ganzen Zustand (Last-Write-
      // Wins). Ein gerade lokal angelegtes Team könnte ein zeitgleicher Write
      // eines anderen Geräts sonst verschlucken – junge lokale Teams, die im
      // Remote-Stand fehlen, deshalb wieder anhängen. Der Debounce-Writer
      // synct den zusammengeführten Stand automatisch zurück.
      const remoteIds = new Set(teams.map((t) => t.id))
      const rescued = s.teams.filter(
        (t) => !remoteIds.has(t.id) && Date.now() - t.createdAt < 15_000,
      )
      if (rescued.length > 0) teams = [...teams, ...rescued]
      return {
        ...s,
        ...shared,
        teams,
        flunk: normalizeFlunk(shared.flunk),
        // Ältere Stände ohne Feedback-Feld dürfen lokales Feedback nicht löschen.
        feedback: shared.feedback ?? s.feedback,
        // Dito: Stände älterer Clients ohne Spielbrett behalten das lokale Brett.
        board: normalizeBoard(shared.board ?? s.board),
        // Dito: ältere Clients ohne das Feld dürfen es nicht zurücksetzen.
        usedBerufswechsel: normalizeUsedBerufswechsel(
          shared.usedBerufswechsel ?? s.usedBerufswechsel,
        ),
        // Karteninhalte, Feldfarben & Brett-Tabellen sind global gespeichert
        // (app_content) und kommen NICHT aus dem Spielzustand – sonst würde
        // ein altes Spiel die dauerhaft bearbeiteten Inhalte überschreiben.
        decks: s.decks,
        decksVersion: s.decksVersion,
        fieldColors: s.fieldColors,
        tables: s.tables,
        currentTeamId: s.currentTeamId,
      }
    })
  }

  // Eingehende globale Inhalte (Karten-Seite) übernehmen.
  const applyRemoteContent = (content: GlobalContent) => {
    const json = stableStringify(content)
    if (json === lastContentSyncedRef.current) return
    // Lokale, noch nicht geschriebene Änderungen gewinnen (wie beim
    // Spielzustand): den Remote-Stand dann nicht anwenden, der eigene
    // anstehende Write überschreibt ihn ohnehin (Last-Write-Wins).
    if (
      lastContentSyncedRef.current !== null &&
      stableStringify(contentOf(stateRef.current)) !== lastContentSyncedRef.current
    ) {
      return
    }
    lastContentSyncedRef.current = json
    setState((s) => {
      // Bei einer neuen mitgelieferten Deck-Version die aktuellen (lokalen)
      // Decks behalten – der Debounce-Writer hebt die Server-Zeile danach
      // automatisch auf den neuen Stand.
      const decksCurrent =
        content.decksVersion === DECKS_VERSION && Array.isArray(content.decks)
      return {
        ...s,
        decks: decksCurrent ? content.decks : s.decks,
        decksVersion: DECKS_VERSION,
        fieldColors: normalizeFieldColors(content.fieldColors),
        // Alt-Zeilen ohne Tabellen behalten die lokalen Tabellen-Inhalte.
        tables: normalizeTables(content.tables ?? s.tables),
      }
    })
  }

  // --- Realtime: abonnieren & Startzustand laden --------------------------
  useEffect(() => {
    const client = supabase
    if (!client || !session) {
      setConnectionStatus('local')
      return
    }
    const code = session.code
    let cancelled = false
    setConnectionStatus('connecting')

    void (async () => {
      const { data, error } = await client
        .from(GAMES_TABLE)
        .select('state')
        .eq('code', code)
        .maybeSingle()
      if (cancelled) return
      if (error) {
        setConnectionStatus('error')
        return
      }
      if (data?.state) {
        applyRemote(data.state as SharedState)
      } else {
        // Spielzeile existiert noch nicht → mit lokalem Stand anlegen.
        const shared = sharedOf(stateRef.current)
        lastSyncedRef.current = stableStringify(shared)
        const { error: writeErr } = await client
          .from(GAMES_TABLE)
          .upsert({ code, state: shared, updated_at: new Date().toISOString() })
        if (writeErr) {
          console.error('[flunk sync] Anlegen fehlgeschlagen –', writeErr.message, writeErr)
          lastSyncedRef.current = null
          if (!cancelled) setConnectionStatus('error')
          return
        }
      }
      if (!cancelled) setConnectionStatus('live')
    })()

    const channel = client
      .channel(`game:${code}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: GAMES_TABLE, filter: `code=eq.${code}` },
        (payload) => {
          const next = (payload.new as { state?: SharedState } | null)?.state
          if (next) applyRemote(next)
        },
      )
      .subscribe((st) => {
        if (cancelled) return
        if (st === 'SUBSCRIBED') setConnectionStatus('live')
        else if (st === 'CHANNEL_ERROR' || st === 'TIMED_OUT') setConnectionStatus('error')
      })

    return () => {
      cancelled = true
      void client.removeChannel(channel)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.code])

  // --- Globale Inhalte (Karten-Seite): laden & live abonnieren ------------
  // Läuft unabhängig von einer Spiel-Sitzung: Karteninhalte und Feldfarben
  // liegen dauerhaft auf dem Server und gelten für alle zukünftigen Spiele.
  useEffect(() => {
    const client = supabase
    if (!client) return
    let cancelled = false

    void (async () => {
      const { data, error } = await client
        .from(CONTENT_TABLE)
        .select('content')
        .eq('id', CONTENT_ID)
        .maybeSingle()
      if (cancelled) return
      if (error) {
        // Ohne Startabgleich bleibt lastContentSyncedRef null → es wird
        // nichts geschrieben (Schutz vor Überschreiben der Server-Inhalte).
        console.error('[flunk sync] Inhalte laden fehlgeschlagen –', error.message, error)
        return
      }
      if (data?.content) {
        applyRemoteContent(data.content as GlobalContent)
      } else {
        // Inhalte-Zeile existiert noch nicht → mit lokalem Stand anlegen.
        const content = contentOf(stateRef.current)
        lastContentSyncedRef.current = stableStringify(content)
        const { error: writeErr } = await client
          .from(CONTENT_TABLE)
          .upsert({ id: CONTENT_ID, content, updated_at: new Date().toISOString() })
        if (writeErr) {
          console.error('[flunk sync] Inhalte anlegen fehlgeschlagen –', writeErr.message, writeErr)
          lastContentSyncedRef.current = null
        }
      }
    })()

    const channel = client
      .channel('app-content')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: CONTENT_TABLE, filter: `id=eq.${CONTENT_ID}` },
        (payload) => {
          const next = (payload.new as { content?: GlobalContent } | null)?.content
          if (next) applyRemoteContent(next)
        },
      )
      .subscribe()

    return () => {
      cancelled = true
      void client.removeChannel(channel)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // --- Geänderte globale Inhalte an den Server schreiben (entprellt) ------
  useEffect(() => {
    const client = supabase
    if (!client) return
    // Vor dem ersten erfolgreichen Abgleich nichts schreiben – sonst würde
    // der lokale Start-Zustand die gespeicherten Server-Inhalte platt machen.
    if (lastContentSyncedRef.current === null) return
    const content = contentOf(state)
    const json = stableStringify(content)
    if (json === lastContentSyncedRef.current) return
    const timer = setTimeout(() => {
      // Optimistisch merken, um Echo-Schleifen zu vermeiden.
      lastContentSyncedRef.current = json
      void client
        .from(CONTENT_TABLE)
        .upsert({ id: CONTENT_ID, content, updated_at: new Date().toISOString() })
        .then(({ error }) => {
          if (error) {
            console.error('[flunk sync] Inhalte schreiben fehlgeschlagen –', error.message, error)
            // Marker statt null (null würde alle weiteren Writes sperren):
            // die nächste Änderung versucht das Schreiben dann erneut.
            lastContentSyncedRef.current = 'retry'
          }
        })
    }, 200)
    return () => clearTimeout(timer)
  }, [state])

  // --- Änderungen an den Server schreiben (leicht entprellt) --------------
  useEffect(() => {
    const client = supabase
    if (!client || !session) return
    const shared = sharedOf(state)
    const json = stableStringify(shared)
    if (json === lastSyncedRef.current) return
    const code = session.code
    const timer = setTimeout(() => {
      // Optimistisch merken, um Echo-Schleifen zu vermeiden.
      lastSyncedRef.current = json
      void client
        .from(GAMES_TABLE)
        .upsert({ code, state: shared, updated_at: new Date().toISOString() })
        .then(({ error }) => {
          if (error) {
            // Sichtbar machen: sonst „verschwinden" Änderungen lautlos.
            console.error(
              '[flunk sync] Schreiben fehlgeschlagen –',
              error.message,
              error,
            )
            // Zurücksetzen, damit die nächste Änderung erneut versucht wird.
            lastSyncedRef.current = null
            setConnectionStatus('error')
          }
        })
    }, 200)
    return () => clearTimeout(timer)
  }, [state, session])

  const store = useMemo<Store>(() => {
    const mutateTeam = (teamId: string, fn: (t: Team) => Team) =>
      setState((s) => ({
        ...s,
        teams: s.teams.map((t) => (t.id === teamId ? fn(t) : t)),
      }))

    // Bereits gezählte Flunk-Siege dieser Matches wieder abziehen
    // (vor Neu-Auslosen / Zurück / Reset der Flunk-Runde).
    const revertFlunkWins = (teams: Team[], matches: FlunkMatch[] | null): Team[] => {
      if (!matches) return teams
      const wins = new Map<string, number>()
      for (const m of matches) {
        if (m.winnerId) wins.set(m.winnerId, (wins.get(m.winnerId) ?? 0) + 1)
      }
      if (wins.size === 0) return teams
      return teams.map((t) =>
        wins.has(t.id)
          ? {
              ...t,
              stats: {
                ...t.stats,
                flunkWins: Math.max(0, t.stats.flunkWins - wins.get(t.id)!),
              },
            }
          : t,
      )
    }

    return {
      state,
      session,
      connectionStatus,
      isRemoteConfigured,
      isHost: session ? session.isHost : !isRemoteConfigured,

      createGame: async () => {
        const client = supabase
        if (!client) return null
        const shared = sharedOf(stateRef.current)
        for (let attempt = 0; attempt < 6; attempt++) {
          const code = generateCode()
          const { error } = await client
            .from(GAMES_TABLE)
            .insert({ code, state: shared, updated_at: new Date().toISOString() })
          if (!error) {
            lastSyncedRef.current = stableStringify(shared)
            setSession({ code, isHost: true })
            return code
          }
          // 23505 = unique_violation → Code kollidiert, neu würfeln.
          if ((error as { code?: string }).code !== '23505') {
            console.error('[flunk sync] Spiel erstellen fehlgeschlagen –', error.message, error)
            return null
          }
        }
        return null
      },

      joinGame: async (rawCode) => {
        const client = supabase
        if (!client) return { ok: false, error: 'Kein Server konfiguriert.' }
        const code = rawCode.trim().toUpperCase()
        if (!code) return { ok: false, error: 'Bitte einen Code eingeben.' }
        const { data, error } = await client
          .from(GAMES_TABLE)
          .select('state')
          .eq('code', code)
          .maybeSingle()
        if (error) return { ok: false, error: 'Verbindungsfehler. Bitte erneut versuchen.' }
        if (!data) return { ok: false, error: 'Spiel nicht gefunden. Code prüfen.' }
        lastSyncedRef.current = stableStringify(data.state)
        const shared = data.state as SharedState
        setState((s) => ({
          ...s,
          ...shared,
          teams: normalizeTeams(shared.teams, s.decks),
          flunk: normalizeFlunk(shared.flunk),
          board: normalizeBoard(shared.board ?? s.board),
          usedBerufswechsel: normalizeUsedBerufswechsel(
            shared.usedBerufswechsel ?? s.usedBerufswechsel,
          ),
          // Karteninhalte, Feldfarben & Brett-Tabellen sind global gespeichert
          // (app_content) – nicht aus dem (evtl. alten) Spielzustand übernehmen.
          decks: s.decks,
          decksVersion: s.decksVersion,
          fieldColors: s.fieldColors,
          tables: s.tables,
          currentTeamId: null,
        }))
        setSession({ code, isHost: false })
        return { ok: true }
      },

      leaveGame: () => {
        lastSyncedRef.current = null
        setSession(null)
        setConnectionStatus('local')
      },

      addTeam: (name, players = 1) => {
        const id = uid()
        setState((s) => {
          const color = TEAM_COLORS[s.teams.length % TEAM_COLORS.length]
          const team: Team = {
            id,
            name: name.trim() || `Team ${s.teams.length + 1}`,
            color,
            cash: 0,
            players: Math.max(1, Math.round(players) || 1),
            job: null,
            education: 'none',
            stockNumber: null,
            salaryBonus: 0,
            actionCards: [],
            transactions: [],
            beers: { normal: 0, fun: 0, penalty: 0 },
            stats: emptyStats(),
            createdAt: Date.now(),
          }
          return { ...s, teams: [...s.teams, team] }
        })
        return id
      },

      setPlayers: (teamId, players) =>
        mutateTeam(teamId, (t) => ({
          ...t,
          players: Math.max(1, Math.round(players) || 1),
        })),

      addBeer: (teamId, kind, delta) =>
        mutateTeam(teamId, (t) => ({
          ...t,
          beers: { ...t.beers, [kind]: Math.max(0, t.beers[kind] + delta) },
        })),

      buyStock: (teamId, stockNumber) => {
        const s = stateRef.current
        const team = s.teams.find((t) => t.id === teamId)
        if (!team || team.stockNumber != null || team.cash < STOCK_PRICE) return false
        if (!STOCK_NUMBERS.includes(stockNumber)) return false
        // Jede Zahl nur einmal – auch bei parallelen Käufen im Live-Modus.
        if (s.teams.some((t) => t.id !== teamId && t.stockNumber === stockNumber)) return false
        mutateTeam(teamId, (t) => ({
          ...t,
          stockNumber,
          cash: t.cash - STOCK_PRICE,
          transactions: [
            {
              id: uid(),
              delta: -STOCK_PRICE,
              reason: `Aktie Nr. ${stockNumber} gekauft`,
              at: Date.now(),
            },
            ...t.transactions,
          ],
        }))
        return true
      },

      removeStock: (teamId) => mutateTeam(teamId, (t) => ({ ...t, stockNumber: null })),

      payoutStockCard: (teamId) => {
        const s = stateRef.current
        const team = s.teams.find((t) => t.id === teamId)
        if (!team || team.stockNumber == null) return null
        const deck = s.decks.find((d) => d.type === 'action')
        if (!deck || deck.cards.length === 0) return null
        // Keine Doppelten; hat das Team schon alle, notfalls doppelt ziehen.
        const held = new Set(team.actionCards.map((c) => c.title))
        const drawn =
          pickRandom(deck.cards.filter((c) => !held.has(c.title))) ??
          pickRandom(deck.cards)
        if (!drawn) return null
        const card: ActionCard = {
          id: uid(),
          title: drawn.title,
          note: drawn.detail,
          kind: 'action',
          createdAt: Date.now(),
        }
        mutateTeam(teamId, (t) => ({ ...t, actionCards: [card, ...t.actionCards] }))
        return card
      },

      bumpStat: (teamId, key, delta) =>
        mutateTeam(teamId, (t) => ({
          ...t,
          stats: { ...t.stats, [key]: Math.max(0, t.stats[key] + delta) },
        })),

      removeTeam: (teamId) =>
        setState((s) => ({
          ...s,
          teams: s.teams.filter((t) => t.id !== teamId),
          currentTeamId: s.currentTeamId === teamId ? null : s.currentTeamId,
          // Gelöschte Teams aus der laufenden Flunk-Runde nehmen.
          flunk: s.flunk
            ? {
                ...s.flunk,
                readyIds: s.flunk.readyIds.filter((id) => id !== teamId),
                waitCardIds: Object.fromEntries(
                  Object.entries(s.flunk.waitCardIds).filter(([id]) => id !== teamId),
                ),
              }
            : null,
        })),

      setCurrentTeam: (teamId) => setState((s) => ({ ...s, currentTeamId: teamId })),

      renameTeam: (teamId, name) =>
        mutateTeam(teamId, (t) => ({ ...t, name: name.trim() || t.name })),

      setTeamColor: (teamId, color) =>
        mutateTeam(teamId, (t) => ({ ...t, color: color.trim() || t.color })),

      adjustCash: (teamId, delta, reason = 'Buchung') =>
        mutateTeam(teamId, (t) => {
          const tx: Transaction = {
            id: uid(),
            delta,
            reason: reason.trim() || 'Buchung',
            at: Date.now(),
          }
          return {
            ...t,
            cash: t.cash + delta,
            transactions: [tx, ...t.transactions],
          }
        }),

      undoTransaction: (teamId, txId) =>
        mutateTeam(teamId, (t) => {
          const tx = t.transactions.find((x) => x.id === txId)
          if (!tx) return t
          return {
            ...t,
            cash: t.cash - tx.delta,
            transactions: t.transactions.filter((x) => x.id !== txId),
          }
        }),

      setJob: (teamId, job) => mutateTeam(teamId, (t) => ({ ...t, job })),

      setJobTitle: (teamId, title) =>
        setState((s) => {
          // Jeder Beruf max. 1×: hält ihn bereits ein anderes Team, nicht zuweisen
          // (schützt auch bei parallelen Zugriffen im Live-Modus).
          if (s.teams.some((t) => t.id !== teamId && t.job?.title === title)) return s
          return {
            ...s,
            teams: s.teams.map((t) =>
              t.id === teamId
                ? { ...t, job: { title, salary: t.job?.salary ?? 0, beerTax: t.job?.beerTax ?? 0 } }
                : t,
            ),
          }
        }),

      chooseJob: (teamId, education, title) =>
        setState((s) => {
          // Jeder Beruf max. 1× – schützt auch bei parallelen Zugriffen live.
          if (s.teams.some((t) => t.id !== teamId && t.job?.title === title)) return s
          return {
            ...s,
            teams: s.teams.map((t) =>
              t.id === teamId
                ? {
                    ...t,
                    education,
                    job: {
                      title,
                      salary: t.job?.salary ?? 0,
                      beerTax: t.job?.beerTax ?? 0,
                    },
                  }
                : t,
            ),
          }
        }),

      triggerBerufswechsel: (fieldId) => {
        const s = stateRef.current
        // Jedes Brett-Feld nur einmal – nur das erste Team zählt.
        if (s.usedBerufswechsel.includes(fieldId)) return null
        const jobDeck = s.decks.find((d) => d.type === 'job')
        const salaryDeck = s.decks.find((d) => d.type === 'salary')
        if (!jobDeck || s.teams.length === 0) return null
        // Gemischte Stapel je Bildungsweg – pop() vergibt jeden Beruf nur 1×.
        const diplom = sampleDistinct(
          jobDeck.cards.filter((c) => isDiplomJob(c.title)),
          jobDeck.cards.length,
        )
        const normal = sampleDistinct(
          jobDeck.cards.filter((c) => !isDiplomJob(c.title)),
          jobDeck.cards.length,
        )
        const results: BerufswechselResult[] = []
        const updates = new Map<string, { job: Job | null; education: Education }>()
        for (const t of s.teams) {
          const studium = t.education === 'studium'
          const card = (studium ? diplom : normal).pop() ?? null
          const g = pickRandom(salaryDeck?.cards ?? [])
          const salary = g?.salary ?? 0
          const beerTax = g?.beerTax ?? 0
          updates.set(t.id, {
            job: card ? { title: card.title, salary, beerTax } : null,
            education: studium ? 'studium' : 'ausbildung',
          })
          results.push({
            teamId: t.id,
            teamName: t.name,
            studium,
            title: card?.title ?? null,
            salary,
            beerTax,
          })
        }
        // Live-Nachricht an alle Geräte mit den neuen Berufen & Gehältern.
        const announcement: Announcement = {
          id: uid(),
          teamId: null,
          title: '🔄 Berufswechsel!',
          message: `Beruf & Gehalt aller Teams wurden neu gewürfelt – ${results
            .map((r) => `${r.teamName}: ${r.title ?? 'kein Beruf frei'} (💶 ${r.salary})`)
            .join(' · ')}`,
          at: Date.now(),
        }
        setState((prev) => ({
          ...prev,
          teams: prev.teams.map((t) =>
            updates.has(t.id) ? { ...t, ...updates.get(t.id)! } : t,
          ),
          usedBerufswechsel: prev.usedBerufswechsel.includes(fieldId)
            ? prev.usedBerufswechsel
            : [...prev.usedBerufswechsel, fieldId],
          announcements: [announcement, ...prev.announcements].slice(0, 20),
        }))
        return results
      },

      setSalary: (teamId, salary, beerTax) =>
        mutateTeam(teamId, (t) => ({
          ...t,
          job: { title: t.job?.title ?? '', salary, beerTax },
        })),

      addSalaryBonus: (teamId, delta) =>
        mutateTeam(teamId, (t) => ({
          ...t,
          salaryBonus: Math.max(0, (t.salaryBonus ?? 0) + delta),
        })),

      payBeerTax: (teamId) =>
        mutateTeam(teamId, (t) => {
          if (!t.job || !t.job.beerTax) return t
          const tx: Transaction = {
            id: uid(),
            delta: -t.job.beerTax,
            reason: 'Biersteuer',
            at: Date.now(),
          }
          return {
            ...t,
            cash: t.cash - t.job.beerTax,
            transactions: [tx, ...t.transactions],
          }
        }),

      addActionCard: (teamId, title, note, kind) =>
        mutateTeam(teamId, (t) => {
          const card: ActionCard = {
            id: uid(),
            title: title.trim() || 'Aktionskarte',
            note: note.trim(),
            kind,
            createdAt: Date.now(),
          }
          return { ...t, actionCards: [card, ...t.actionCards] }
        }),

      removeActionCard: (teamId, cardId) =>
        mutateTeam(teamId, (t) => {
          // Karte ablegen = ausgespielt → für die Statistik zählen.
          if (!t.actionCards.some((c) => c.id === cardId)) return t
          return {
            ...t,
            actionCards: t.actionCards.filter((c) => c.id !== cardId),
            stats: { ...t.stats, actionCardsUsed: t.stats.actionCardsUsed + 1 },
          }
        }),

      playActionCard: (teamId, cardId) =>
        setState((s) => {
          const team = s.teams.find((t) => t.id === teamId)
          const card = team?.actionCards.find((c) => c.id === cardId)
          if (!team || !card) return s
          // Gegner = das andere Team im selben Flunk-Match (falls ausgelost).
          const match = s.flunk?.matches?.find((m) => m.a === teamId || m.b === teamId)
          const opponentId = match ? (match.a === teamId ? match.b : match.a) : null
          const opponent = s.teams.find((t) => t.id === opponentId) ?? null
          const announcement: Announcement = {
            id: uid(),
            teamId: opponentId,
            title: '🃏 Aktionskarte aktiviert!',
            message: `${team.name} spielt „${card.title}"${
              opponent ? ` gegen ${opponent.name}` : ''
            }.${card.note ? ` Effekt: ${card.note}` : ''}`,
            at: Date.now(),
          }
          return {
            ...s,
            teams: s.teams.map((t) =>
              t.id === teamId
                ? {
                    ...t,
                    actionCards: t.actionCards.filter((c) => c.id !== cardId),
                    stats: { ...t.stats, actionCardsUsed: t.stats.actionCardsUsed + 1 },
                  }
                : t,
            ),
            announcements: [announcement, ...s.announcements].slice(0, 20),
          }
        }),

      startChallenge: (challengerId, opponentId, card) =>
        setState((s) => {
          const challenge: Challenge = {
            id: uid(),
            challengerId,
            opponentId,
            title: card.title,
            detail: card.detail,
            status: 'active',
            winnerId: null,
            reward: null,
            at: Date.now(),
          }
          return { ...s, challenge }
        }),

      resolveChallenge: (winnerId, reward, message) =>
        setState((s) => {
          if (!s.challenge) return s
          const ch = s.challenge
          const winner = s.teams.find((t) => t.id === winnerId)

          let teams = s.teams
          if (reward.kind === 'cash' && reward.amount) {
            teams = teams.map((t) =>
              t.id === winnerId
                ? {
                    ...t,
                    cash: t.cash + reward.amount!,
                    transactions: [
                      {
                        id: uid(),
                        delta: reward.amount!,
                        reason: `Challenge: ${ch.title}`,
                        at: Date.now(),
                      },
                      ...t.transactions,
                    ],
                  }
                : t,
            )
          } else if (reward.kind === 'card' && reward.cardTitle) {
            // Belohnung ist eine zufällig gezogene normale Aktionskarte
            // (nicht die Challenge selbst). Keine Doppelten pro Team.
            teams = teams.map((t) => {
              if (t.id !== winnerId) return t
              if (t.actionCards.some((c) => c.title === reward.cardTitle)) return t
              return {
                ...t,
                actionCards: [
                  {
                    id: uid(),
                    title: reward.cardTitle!,
                    note: reward.cardNote ?? '',
                    kind: 'action' as const,
                    createdAt: Date.now(),
                  },
                  ...t.actionCards,
                ],
              }
            })
          }

          // Challenge-Sieg für die Statistik zählen.
          teams = teams.map((t) =>
            t.id === winnerId
              ? { ...t, stats: { ...t.stats, challengeWins: t.stats.challengeWins + 1 } }
              : t,
          )

          const rewardText =
            reward.kind === 'cash' && reward.amount
              ? ` (+${reward.amount} KK)`
              : reward.kind === 'card' && reward.cardTitle
                ? ` (Aktionskarte „${reward.cardTitle}")`
                : ''

          const announcement: Announcement = {
            id: uid(),
            teamId: winnerId,
            title: '🏆 Challenge gewonnen!',
            message:
              message.trim() ||
              `${winner?.name ?? 'Team'} gewinnt „${ch.title}"${rewardText}`,
            at: Date.now(),
          }

          return {
            ...s,
            teams,
            challenge: { ...ch, status: 'resolved', winnerId, reward },
            announcements: [announcement, ...s.announcements].slice(0, 20),
          }
        }),

      clearChallenge: () => setState((s) => ({ ...s, challenge: null })),

      flunkArrive: (teamId) => {
        // Beim Ankommen gibt es einmal pro Flunk-Runde das Gehalt (Feedback
        // #33) – ob schon gezahlt wurde, steht in flunk.paidIds.
        const s0 = stateRef.current
        const team = s0.teams.find((t) => t.id === teamId)
        // Inkl. dauerhaftem Bonus aus „Gehaltserhöhung".
        const salary = team ? effectiveSalary(team) : 0
        const alreadyPaid = s0.flunk?.paidIds?.includes(teamId) ?? false
        const alreadyReady = s0.flunk?.readyIds.includes(teamId) ?? false
        if (alreadyReady) return null
        const pay = !alreadyPaid && salary > 0
        setState((s) => {
          const flunk = s.flunk ?? emptyFlunk()
          if (flunk.readyIds.includes(teamId)) return s
          return {
            ...s,
            teams: pay
              ? s.teams.map((t) =>
                  t.id === teamId
                    ? {
                        ...t,
                        cash: t.cash + salary,
                        transactions: [
                          {
                            id: uid(),
                            delta: salary,
                            reason: 'Flunk-Feld: Gehalt',
                            at: Date.now(),
                          },
                          ...t.transactions,
                        ],
                      }
                    : t,
                )
              : s.teams,
            flunk: {
              ...flunk,
              readyIds: [...flunk.readyIds, teamId],
              paidIds: pay ? [...flunk.paidIds, teamId] : flunk.paidIds,
            },
          }
        })
        return pay ? salary : null
      },

      flunkWaitRound: (teamId) => {
        const s = stateRef.current
        const team = s.teams.find((t) => t.id === teamId)
        // Nach der Auslosung gibt es kein Warten mehr.
        if (!team || s.flunk?.matches) return null
        const deck = s.decks.find((d) => d.id === 'aktionskarten')
        if (!deck || deck.cards.length === 0) return null
        const held = new Set(team.actionCards.map((c) => c.title))
        const drawn =
          pickRandom(deck.cards.filter((c) => !held.has(c.title))) ??
          pickRandom(deck.cards)
        if (!drawn) return null
        const card: ActionCard = {
          id: uid(),
          title: drawn.title,
          note: drawn.detail,
          kind: 'action',
          createdAt: Date.now(),
        }
        setState((prev) => {
          const flunk = prev.flunk ?? emptyFlunk()
          if (flunk.matches) return prev
          return {
            ...prev,
            teams: prev.teams.map((t) =>
              t.id === teamId ? { ...t, actionCards: [card, ...t.actionCards] } : t,
            ),
            flunk: {
              ...flunk,
              waitCardIds: {
                ...flunk.waitCardIds,
                [teamId]: [...(flunk.waitCardIds[teamId] ?? []), card.id],
              },
            },
          }
        })
        return card
      },

      flunkUnready: (teamId) =>
        setState((s) => {
          // Nach der Auslosung nicht mehr abmelden (Matches blieben sonst hängen).
          if (!s.flunk || s.flunk.matches) return s
          // Fürs Warten erhaltene Karten wieder einziehen – ohne sie als
          // „ausgespielt" zu zählen (das war der Karten-bleibt-drin-Bug).
          const waitIds = new Set(s.flunk.waitCardIds[teamId] ?? [])
          const restWaitCards = { ...s.flunk.waitCardIds }
          delete restWaitCards[teamId]
          return {
            ...s,
            teams:
              waitIds.size === 0
                ? s.teams
                : s.teams.map((t) =>
                    t.id === teamId
                      ? { ...t, actionCards: t.actionCards.filter((c) => !waitIds.has(c.id)) }
                      : t,
                  ),
            flunk: {
              ...s.flunk,
              readyIds: s.flunk.readyIds.filter((id) => id !== teamId),
              waitCardIds: restWaitCards,
            },
          }
        }),

      flunkDrawMatches: () =>
        setState((s) => {
          const flunk = s.flunk
          if (!flunk) return s
          // Nur noch existierende Teams auslosen.
          const ids = flunk.readyIds.filter((id) => s.teams.some((t) => t.id === id))
          if (ids.length < 2) return s
          for (let i = ids.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1))
            ;[ids[i], ids[j]] = [ids[j], ids[i]]
          }
          const matches: FlunkMatch[] = []
          for (let i = 0; i < ids.length; i += 2) {
            matches.push({ a: ids[i], b: ids[i + 1] ?? null, winnerId: null })
          }
          // Siege einer evtl. vorherigen Auslosung zurücknehmen.
          return { ...s, teams: revertFlunkWins(s.teams, flunk.matches), flunk: { ...flunk, matches } }
        }),

      flunkSetWinner: (matchIndex, teamId) =>
        setState((s) => {
          const matches = s.flunk?.matches
          const match = matches?.[matchIndex]
          if (!matches || !match || match.winnerId === teamId) return s
          // flunkWins im selben Update pflegen – bleibt so auch im Live-Modus konsistent.
          const bump = (teams: Team[], id: string, delta: number) =>
            teams.map((t) =>
              t.id === id
                ? { ...t, stats: { ...t.stats, flunkWins: Math.max(0, t.stats.flunkWins + delta) } }
                : t,
            )
          let teams = s.teams
          if (match.winnerId) teams = bump(teams, match.winnerId, -1)
          if (teamId) teams = bump(teams, teamId, 1)
          return {
            ...s,
            teams,
            flunk: {
              ...s.flunk!,
              matches: matches.map((m, i) => (i === matchIndex ? { ...m, winnerId: teamId } : m)),
            },
          }
        }),

      flunkSetMatchBeers: (matchIndex, patch) =>
        setState((s) => {
          const matches = s.flunk?.matches
          if (!matches || !matches[matchIndex]) return s
          return {
            ...s,
            flunk: {
              ...s.flunk!,
              matches: matches.map((m, i) =>
                i === matchIndex
                  ? {
                      ...m,
                      loserUnfinished:
                        patch.unfinished != null
                          ? Math.max(0, patch.unfinished)
                          : m.loserUnfinished,
                      loserFinished:
                        patch.finished != null
                          ? Math.max(0, patch.finished)
                          : m.loserFinished,
                    }
                  : m,
              ),
            },
          }
        }),

      flunkBackToSetup: () =>
        setState((s) =>
          s.flunk
            ? {
                ...s,
                teams: revertFlunkWins(s.teams, s.flunk.matches),
                flunk: { ...s.flunk, matches: null },
              }
            : s,
        ),

      flunkFinish: (rewardPerWin = 0) =>
        setState((s) => {
          if (!s.flunk) return s
          const matches = s.flunk.matches ?? []
          // Abrechnung pro Match (#62): Sieger bekommt die Basis-Gutschrift
          // plus Bonus je nicht ausgetrunkenem Bier des Verlierers; der
          // Verlierer bekommt Bonus je leer getrunkenem Bier (ohne Strafbiere).
          const credits = new Map<string, { amount: number; reasons: string[] }>()
          const credit = (teamId: string, amount: number, reason: string) => {
            if (amount <= 0) return
            const cur = credits.get(teamId) ?? { amount: 0, reasons: [] }
            cur.amount += amount
            cur.reasons.push(reason)
            credits.set(teamId, cur)
          }
          for (const m of matches) {
            if (!m.winnerId) continue
            const unfinished = m.loserUnfinished ?? 0
            const winAmount = rewardPerWin + unfinished * FLUNK_BEER_BONUS
            credit(
              m.winnerId,
              winAmount,
              unfinished > 0
                ? `Flunk-Sieg (+${unfinished}× Bier-Bonus)`
                : 'Flunk-Sieg',
            )
            const loserId = m.b ? (m.winnerId === m.a ? m.b : m.a) : null
            const finished = m.loserFinished ?? 0
            if (loserId && finished > 0) {
              credit(loserId, finished * FLUNK_BEER_BONUS, `Flunk: ${finished}× Bier leer`)
            }
          }
          let teams = s.teams
          if (credits.size > 0) {
            teams = teams.map((t) => {
              const c = credits.get(t.id)
              if (!c || c.amount <= 0) return t
              const tx: Transaction = {
                id: uid(),
                delta: c.amount,
                reason: c.reasons.join(' · '),
                at: Date.now(),
              }
              return { ...t, cash: t.cash + c.amount, transactions: [tx, ...t.transactions] }
            })
          }
          const winnerNames = matches
            .map((m) => s.teams.find((t) => t.id === m.winnerId)?.name)
            .filter((n): n is string => Boolean(n))
          const rewardText =
            rewardPerWin > 0 && winnerNames.length > 0 ? ` (+${rewardPerWin} KK pro Sieg)` : ''
          const announcement: Announcement = {
            id: uid(),
            // Broadcast: auch Teams, die nicht mitgespielt haben, sollen es sehen.
            teamId: null,
            title: '🚩 Flunk-Runde beendet',
            message:
              winnerNames.length > 0
                ? `Sieger: ${winnerNames.join(', ')} 🏆${rewardText}`
                : 'Die Flunk-Runde ist vorbei.',
            at: Date.now(),
          }
          return {
            ...s,
            teams,
            flunk: null,
            announcements: [announcement, ...s.announcements].slice(0, 20),
          }
        }),

      flunkReset: () =>
        setState((s) =>
          s.flunk
            ? { ...s, teams: revertFlunkWins(s.teams, s.flunk.matches), flunk: null }
            : s,
        ),

      addFeedback: (kind, text, author) =>
        setState((s) => {
          const entry: FeedbackEntry = {
            id: uid(),
            kind,
            text: text.trim(),
            author: author.trim(),
            at: Date.now(),
          }
          if (!entry.text) return s
          // Deckel gegen unbegrenztes Wachstum des geteilten Zustands.
          return { ...s, feedback: [entry, ...s.feedback].slice(0, 100) }
        }),

      removeFeedback: (feedbackId) =>
        setState((s) => ({
          ...s,
          feedback: s.feedback.filter((f) => f.id !== feedbackId),
        })),

      moveBoardField: (fromIndex, toIndex) =>
        setState((s) => {
          const fields = [...s.board.fields]
          if (
            fromIndex === toIndex ||
            fromIndex < 0 ||
            fromIndex >= fields.length ||
            toIndex < 0 ||
            toIndex >= fields.length
          ) {
            return s
          }
          // Beim Verschieben den Weg des Ziel-Felds übernehmen, damit Felder
          // per Drag zwischen Startwegen und Hauptweg wandern können.
          const targetBranch = s.board.fields[toIndex]?.branch
          const moved = { ...fields.splice(fromIndex, 1)[0] }
          if (targetBranch) moved.branch = targetBranch
          else delete moved.branch
          fields.splice(toIndex, 0, moved)
          return { ...s, board: { ...s.board, fields } }
        }),

      updateBoardField: (fieldId, patch) =>
        setState((s) => ({
          ...s,
          board: {
            ...s.board,
            fields: s.board.fields.map((f) => (f.id === fieldId ? { ...f, ...patch } : f)),
          },
        })),

      insertBoardField: (index, type, branch) =>
        setState((s) => {
          const fields = [...s.board.fields]
          const at = Math.max(0, Math.min(fields.length, index))
          fields.splice(at, 0, { id: uid(), type, ...(branch ? { branch } : {}) })
          return { ...s, board: { ...s.board, fields } }
        }),

      removeBoardField: (fieldId) =>
        setState((s) => ({
          ...s,
          board: { ...s.board, fields: s.board.fields.filter((f) => f.id !== fieldId) },
        })),

      resetBoard: () => setState((s) => ({ ...s, board: defaultBoard() })),

      setFieldColor: (key, color) =>
        setState((s) => {
          const fieldColors = { ...s.fieldColors }
          if (color) fieldColors[key] = color
          else delete fieldColors[key]
          return { ...s, fieldColors }
        }),

      resetFieldColors: () => setState((s) => ({ ...s, fieldColors: {} })),

      updateDeckCard: (deckId, cardId, patch) =>
        setState((s) => ({
          ...s,
          decks: s.decks.map((d) =>
            d.id === deckId
              ? {
                  ...d,
                  cards: d.cards.map((c) => (c.id === cardId ? { ...c, ...patch } : c)),
                }
              : d,
          ),
        })),

      addDeckCard: (deckId) => {
        const id = uid()
        setState((s) => ({
          ...s,
          decks: s.decks.map((d) =>
            d.id === deckId
              ? {
                  ...d,
                  cards: [
                    ...d.cards,
                    // Gehalts-Karten brauchen ihre Zahlenwerte von Anfang an.
                    d.type === 'salary'
                      ? { id, title: 'Gehalt', detail: '', amount: null, salary: 10, beerTax: 5 }
                      : { id, title: 'Neue Karte', detail: '', amount: null },
                  ],
                }
              : d,
          ),
        }))
        return id
      },

      removeDeckCard: (deckId, cardId) =>
        setState((s) => ({
          ...s,
          decks: s.decks.map((d) =>
            d.id === deckId ? { ...d, cards: d.cards.filter((c) => c.id !== cardId) } : d,
          ),
        })),

      resetDecks: () =>
        setState((s) => ({ ...s, decks: initialState.decks, decksVersion: DECKS_VERSION })),

      setTableRow: (table, index, text) =>
        setState((s) => ({
          ...s,
          tables: {
            ...s.tables,
            [table]: s.tables[table].map((t, i) => (i === index ? text : t)),
          },
        })),

      addTableRow: (table) =>
        setState((s) => ({
          ...s,
          tables: { ...s.tables, [table]: [...s.tables[table], ''] },
        })),

      removeTableRow: (table, index) =>
        setState((s) => ({
          ...s,
          tables: { ...s.tables, [table]: s.tables[table].filter((_, i) => i !== index) },
        })),

      resetTable: (table) =>
        setState((s) => ({
          ...s,
          tables: { ...s.tables, [table]: defaultTables()[table] },
        })),

      updateDecks: (decks) => setState((s) => ({ ...s, decks })),

      newGame: () =>
        setState((s) => {
          const announcement: Announcement = {
            id: uid(),
            teamId: null,
            title: '🔄 Neues Spiel!',
            message:
              'Kronkorken, Berufe, Karten und Zähler wurden zurückgesetzt – die Teams bleiben. Viel Spaß!',
            at: Date.now(),
          }
          return {
            ...s,
            teams: s.teams.map((t) => ({
              ...t,
              cash: 0,
              job: null,
              education: 'none' as Education,
              stockNumber: null,
              salaryBonus: 0,
              actionCards: [],
              transactions: [],
              beers: { normal: 0, fun: 0, penalty: 0 },
              stats: emptyStats(),
            })),
            challenge: null,
            flunk: null,
            usedBerufswechsel: [],
            // Alte Nachrichten gehören zum alten Spiel – nur der Neustart bleibt.
            announcements: [announcement],
          }
        }),

      resetAll: () => setState({ ...initialState }),
    }
  }, [state, session, connectionStatus])

  return <StoreContext.Provider value={store}>{children}</StoreContext.Provider>
}

export function useStore(): Store {
  const ctx = useContext(StoreContext)
  if (!ctx) throw new Error('useStore muss innerhalb von StoreProvider genutzt werden')
  return ctx
}
