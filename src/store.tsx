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
  DiceTable,
  Job,
  Property,
  Team,
  Transaction,
} from './types'
import { initialState, TEAM_COLORS } from './data/defaults'

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
    return {
      // Ältere gespeicherte Teams besitzen evtl. noch kein transactions-Feld.
      teams: (parsed.teams ?? []).map((t) => ({ ...t, transactions: t.transactions ?? [] })),
      diceTables: parsed.diceTables ?? initialState.diceTables,
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
  // Aktionskarten
  addActionCard: (teamId: string, title: string, note: string) => void
  removeActionCard: (teamId: string, cardId: string) => void
  // Besitz / Properties
  addProperty: (teamId: string, name: string, value: number, note: string) => void
  removeProperty: (teamId: string, propId: string) => void
  // Würfeltabellen
  updateDiceTables: (tables: DiceTable[]) => void
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
            properties: [],
            transactions: [],
            createdAt: Date.now(),
          }
          return { ...s, teams: [...s.teams, team] }
        }),

      removeTeam: (teamId) =>
        setState((s) => ({ ...s, teams: s.teams.filter((t) => t.id !== teamId) })),

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

      addProperty: (teamId, name, value, note) =>
        mutateTeam(teamId, (t) => {
          const prop: Property = {
            id: uid(),
            name: name.trim() || 'Besitz',
            value: Number.isFinite(value) ? value : 0,
            note: note.trim(),
          }
          return { ...t, properties: [prop, ...t.properties] }
        }),

      removeProperty: (teamId, propId) =>
        mutateTeam(teamId, (t) => ({
          ...t,
          properties: t.properties.filter((p) => p.id !== propId),
        })),

      updateDiceTables: (tables) => setState((s) => ({ ...s, diceTables: tables })),

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
