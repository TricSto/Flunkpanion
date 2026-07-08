// Zentrale Datentypen für die Flunk-des-Lebens-App.

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
}

export interface Team {
  id: string
  name: string
  color: string
  cash: number
  job: Job | null
  actionCards: ActionCard[]
  properties: Property[]
  createdAt: number
}

/**
 * Ein Eintrag in einer Würfeltabelle. `roll` ist die Augenzahl (1-6),
 * `label` der angezeigte Titel und `detail` eine optionale Erklärung.
 * `amount` ist optional ein Geldbetrag, der beim Anwenden gutgeschrieben
 * werden kann (z.B. Gehalt oder Ereignis-Auszahlung).
 */
export interface DiceEntry {
  roll: number
  label: string
  detail: string
  amount: number | null
}

export interface DiceTable {
  id: string
  name: string
  entries: DiceEntry[]
}

export interface AppState {
  teams: Team[]
  diceTables: DiceTable[]
}
