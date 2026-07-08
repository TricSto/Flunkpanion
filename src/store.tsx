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
  AppState,
  Announcement,
  BeerCounts,
  Card,
  Challenge,
  ChallengeReward,
  Deck,
  Job,
  SharedState,
  Team,
  Transaction,
} from './types'
import { DECKS_VERSION, initialState, TEAM_COLORS } from './data/defaults'
import { GAMES_TABLE, isRemoteConfigured, supabase } from './lib/supabase'

const STORAGE_KEY = 'flunk-des-lebens/state/v1'
const SESSION_KEY = 'flunk-des-lebens/session/v1'

/** Verbindungszustand zum Server. */
export type ConnectionStatus = 'local' | 'connecting' | 'live' | 'error'

/** Aktuelle Online-Sitzung (welchem Spiel-Code dieses Gerät beigetreten ist). */
export interface Session {
  code: string
}

// Eindeutige ID ohne externe Abhängigkeit.
function uid(): string {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36)
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
function normalizeTeams(teams: Team[] | undefined): Team[] {
  return (teams ?? []).map((t) => ({
    ...t,
    transactions: t.transactions ?? [],
    players: t.players ?? 1,
    beers: t.beers ?? { normal: 0, fun: 0, penalty: 0 },
  }))
}

/** Nur die Felder, die zwischen allen Geräten geteilt werden. */
function sharedOf(state: AppState): SharedState {
  return {
    teams: state.teams,
    decks: state.decks,
    decksVersion: state.decksVersion,
    challenge: state.challenge,
    announcements: state.announcements,
  }
}

function loadState(): AppState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return initialState
    const parsed = JSON.parse(raw) as Partial<AppState>
    // Bei neuer Deck-Version die mitgelieferten Karten übernehmen, Teams behalten.
    const decksCurrent = parsed.decksVersion === DECKS_VERSION && parsed.decks
    return {
      // Ältere gespeicherte Teams besitzen evtl. noch keine neuen Felder.
      teams: normalizeTeams(parsed.teams),
      decks: decksCurrent ? parsed.decks! : initialState.decks,
      currentTeamId: parsed.currentTeamId ?? null,
      decksVersion: DECKS_VERSION,
      challenge: parsed.challenge ?? null,
      announcements: parsed.announcements ?? [],
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
    return parsed.code ? { code: parsed.code } : null
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
  /** Neues Online-Spiel erstellen; gibt den Spiel-Code zurück (oder null bei Fehler). */
  createGame: () => Promise<string | null>
  /** Einem Online-Spiel per Code beitreten. */
  joinGame: (code: string) => Promise<{ ok: boolean; error?: string }>
  /** Online-Spiel verlassen (zurück in den lokalen Modus). */
  leaveGame: () => void
  // Teams
  addTeam: (name: string, players?: number) => void
  removeTeam: (teamId: string) => void
  renameTeam: (teamId: string, name: string) => void
  setPlayers: (teamId: string, players: number) => void
  addBeer: (teamId: string, kind: keyof BeerCounts, delta: number) => void
  adjustCash: (teamId: string, delta: number, reason?: string) => void
  undoTransaction: (teamId: string, txId: string) => void
  setJob: (teamId: string, job: Job | null) => void
  setJobTitle: (teamId: string, title: string, effect?: string) => void
  setSalary: (teamId: string, salary: number, beerTax: number) => void
  payBeerTax: (teamId: string) => void
  // Team-Auswahl („Beitreten“)
  setCurrentTeam: (teamId: string | null) => void
  // Aktionskarten
  addActionCard: (teamId: string, title: string, note: string) => void
  removeActionCard: (teamId: string, cardId: string) => void
  // Challenges
  startChallenge: (challengerId: string, opponentId: string, card: Card) => void
  resolveChallenge: (winnerId: string, reward: ChallengeReward, message: string) => void
  clearChallenge: () => void
  // Decks / Würfeltabellen
  updateDecks: (decks: Deck[]) => void
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
    const json = JSON.stringify(shared)
    if (json === lastSyncedRef.current) return
    lastSyncedRef.current = json
    setState((s) => ({
      ...s,
      ...shared,
      teams: normalizeTeams(shared.teams),
      currentTeamId: s.currentTeamId,
    }))
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
        lastSyncedRef.current = JSON.stringify(shared)
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

  // --- Änderungen an den Server schreiben (leicht entprellt) --------------
  useEffect(() => {
    const client = supabase
    if (!client || !session) return
    const shared = sharedOf(state)
    const json = JSON.stringify(shared)
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

    return {
      state,
      session,
      connectionStatus,
      isRemoteConfigured,

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
            lastSyncedRef.current = JSON.stringify(shared)
            setSession({ code })
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
        lastSyncedRef.current = JSON.stringify(data.state)
        setState((s) => ({
          ...s,
          ...(data.state as SharedState),
          teams: normalizeTeams((data.state as SharedState).teams),
          currentTeamId: null,
        }))
        setSession({ code })
        return { ok: true }
      },

      leaveGame: () => {
        lastSyncedRef.current = null
        setSession(null)
        setConnectionStatus('local')
      },

      addTeam: (name, players = 1) =>
        setState((s) => {
          const color = TEAM_COLORS[s.teams.length % TEAM_COLORS.length]
          const team: Team = {
            id: uid(),
            name: name.trim() || `Team ${s.teams.length + 1}`,
            color,
            cash: 0,
            players: Math.max(1, Math.round(players) || 1),
            job: null,
            actionCards: [],
            transactions: [],
            beers: { normal: 0, fun: 0, penalty: 0 },
            createdAt: Date.now(),
          }
          return { ...s, teams: [...s.teams, team] }
        }),

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

      removeTeam: (teamId) =>
        setState((s) => ({
          ...s,
          teams: s.teams.filter((t) => t.id !== teamId),
          currentTeamId: s.currentTeamId === teamId ? null : s.currentTeamId,
        })),

      setCurrentTeam: (teamId) => setState((s) => ({ ...s, currentTeamId: teamId })),

      renameTeam: (teamId, name) =>
        mutateTeam(teamId, (t) => ({ ...t, name: name.trim() || t.name })),

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
        mutateTeam(teamId, (t) => ({
          ...t,
          job: { title, salary: t.job?.salary ?? 0, beerTax: t.job?.beerTax ?? 0 },
        })),

      setSalary: (teamId, salary, beerTax) =>
        mutateTeam(teamId, (t) => ({
          ...t,
          job: { title: t.job?.title ?? '', salary, beerTax },
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

      addActionCard: (teamId, title, note) =>
        mutateTeam(teamId, (t) => {
          const card: ActionCard = {
            id: uid(),
            title: title.trim() || 'Aktionskarte',
            note: note.trim(),
            createdAt: Date.now(),
          }
          return { ...t, actionCards: [card, ...t.actionCards] }
        }),

      removeActionCard: (teamId, cardId) =>
        mutateTeam(teamId, (t) => ({
          ...t,
          actionCards: t.actionCards.filter((c) => c.id !== cardId),
        })),

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
          } else if (reward.kind === 'card') {
            teams = teams.map((t) =>
              t.id === winnerId
                ? {
                    ...t,
                    actionCards: [
                      { id: uid(), title: ch.title, note: ch.detail, createdAt: Date.now() },
                      ...t.actionCards,
                    ],
                  }
                : t,
            )
          }

          const rewardText =
            reward.kind === 'cash' && reward.amount
              ? ` (+${reward.amount} KK)`
              : reward.kind === 'card'
                ? ' (Aktionskarte erhalten)'
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

      updateDecks: (decks) => setState((s) => ({ ...s, decks })),

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
