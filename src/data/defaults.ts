import type { AppState, DiceTable } from '../types'

export const TEAM_COLORS = [
  '#ef4444', // rot
  '#f59e0b', // orange
  '#eab308', // gelb
  '#22c55e', // grün
  '#06b6d4', // cyan
  '#6366f1', // indigo
  '#a855f7', // violett
  '#ec4899', // pink
]

// Standard-Würfeltabellen als Startpunkt. Alles ist in der App
// editierbar – das hier sind nur sinnvolle Beispielwerte.
const defaultDiceTables: DiceTable[] = [
  {
    id: 'jobs',
    name: 'Jobs & Gehalt',
    entries: [
      { roll: 1, label: 'Praktikant:in', detail: 'Erste Erfahrung sammeln', amount: 1000 },
      { roll: 2, label: 'Handwerker:in', detail: 'Solides Handwerk', amount: 2000 },
      { roll: 3, label: 'Lehrer:in', detail: 'Bildung zahlt sich aus', amount: 3000 },
      { roll: 4, label: 'Ingenieur:in', detail: 'Technik & Zukunft', amount: 4000 },
      { roll: 5, label: 'Ärztin/Arzt', detail: 'Viel Verantwortung', amount: 5000 },
      { roll: 6, label: 'Start-up-Gründer:in', detail: 'Alles oder nichts', amount: 6000 },
    ],
  },
  {
    id: 'events',
    name: 'Ereignisse',
    entries: [
      { roll: 1, label: 'Strafzettel', detail: 'Falsch geparkt', amount: -500 },
      { roll: 2, label: 'Flunk!', detail: 'Trink einen – kein Geld', amount: 0 },
      { roll: 3, label: 'Lottogewinn', detail: 'Glück gehabt', amount: 1500 },
      { roll: 4, label: 'Aktionskarte ziehen', detail: 'Zieh eine Aktionskarte', amount: 0 },
      { roll: 5, label: 'Steuerrückzahlung', detail: 'Das Amt zahlt zurück', amount: 800 },
      { roll: 6, label: 'Erbschaft', detail: 'Reicher Onkel', amount: 3000 },
    ],
  },
]

export const initialState: AppState = {
  teams: [],
  diceTables: defaultDiceTables,
}
