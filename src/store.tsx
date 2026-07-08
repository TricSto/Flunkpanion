import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import type {
  ActionCard,
  AppState,
  Deck,
  Job,
  Team,
  Transaction,
} from './types'
import { DECKS_VERSION, initialState, TEAM_COLORS } from './data/defaults'

const STORAGE_KEY = 'flunk-des-lebens/state/v1'

// Eindeutige ID ohne externe Abhängigkeit.
function uid(): string {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36)
}

function loadState(): AppState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return initialState
    const parsed = JSON.parse(raw) as Partial<AppState>
    // Bei neuer Deck-Version die mitgelieferten Karten übernehmen, Teams behalten.
    const decksCurrent = parsed.decksVersion === DECKS_VERSION && parsed.decks
    return {
      // Ältere gespeicherte Teams besitzen evtl. noch kein transactions-Feld.
      teams: (parsed.teams ?? []).map((t) => ({ ...t, transactions: t.transactions ?? [] })),
      decks: decksCurrent ? parsed.decks! : initialState.decks,
      currentTeamId: parsed.currentTeamId ?? null,
      decksVersion: DECKS_VERSION,
    }
  } catch {
    return initialState
  }
}

interface Store {
  state: AppState
  // Teams
  addTeam: (name: string) => void
  removeTeam: (teamId: string) => void
  renameTeam: (teamId: string, name: string) => void
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
  // Decks / Würfeltabellen
  updateDecks: (decks: Deck[]) => void
  resetAll: () => void
}

const StoreContext = createContext<Store | null>(null)

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AppState>(loadState)

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
    } catch {
      // Speicher voll o.ä. – bewusst ignorieren.
    }
  }, [state])

  const store = useMemo<Store>(() => {
    const mutateTeam = (teamId: string, fn: (t: Team) => Team) =>
      setState((s) => ({
        ...s,
        teams: s.teams.map((t) => (t.id === teamId ? fn(t) : t)),
      }))

    return {
      state,

      addTeam: (name) =>
        setState((s) => {
          const color = TEAM_COLORS[s.teams.length % TEAM_COLORS.length]
          const team: Team = {
            id: uid(),
            name: name.trim() || `Team ${s.teams.length + 1}`,
            color,
            cash: 0,
            job: null,
            actionCards: [],
            transactions: [],
            createdAt: Date.now(),
          }
          return { ...s, teams: [...s.teams, team] }
        }),

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

      updateDecks: (decks) => setState((s) => ({ ...s, decks })),

      resetAll: () => setState(initialState),
    }
  }, [state])

  return <StoreContext.Provider value={store}>{children}</StoreContext.Provider>
}

export function useStore(): Store {
  const ctx = useContext(StoreContext)
  if (!ctx) throw new Error('useStore muss innerhalb von StoreProvider genutzt werden')
  return ctx
}
