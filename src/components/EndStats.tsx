import { useStore } from '../store'
import type { Team } from '../types'
import { formatMoney } from '../util'

interface Metric {
  key: string
  icon: string
  label: string
  value: (t: Team) => number
  format: (n: number) => string
  /** true = niedrigster Wert gewinnt (schlechtestes Team). */
  worst?: boolean
}

const beersTotal = (t: Team) => t.beers.normal + t.beers.fun + t.beers.penalty

const METRICS: Metric[] = [
  { key: 'cash', icon: '💰', label: 'Meiste Kronkorken', value: (t) => t.cash, format: formatMoney },
  { key: 'beers', icon: '🍺', label: 'Meiste Biere', value: beersTotal, format: (n) => `${n}` },
  { key: 'cards', icon: '🃏', label: 'Meiste Aktionskarten benutzt', value: (t) => t.stats.actionCardsUsed, format: (n) => `${n}` },
  { key: 'flunk', icon: '🚩', label: 'Meiste Flunk-Siege', value: (t) => t.stats.flunkWins, format: (n) => `${n}` },
  { key: 'challenge', icon: '🎯', label: 'Meiste Challenge-Siege', value: (t) => t.stats.challengeWins, format: (n) => `${n}` },
  { key: 'minigame', icon: '🎮', label: 'Meiste Minigame-Siege', value: (t) => t.stats.minigameWins, format: (n) => `${n}` },
]

function leaders(teams: Team[], metric: Metric): { teams: Team[]; value: number } {
  const vals = teams.map(metric.value)
  const best = metric.worst ? Math.min(...vals) : Math.max(...vals)
  return { teams: teams.filter((t) => metric.value(t) === best), value: best }
}

const nameList = (ts: Team[]) => ts.map((t) => t.name).join(' & ')

export function EndStats() {
  const { state } = useStore()
  const teams = state.teams

  if (teams.length === 0) {
    return (
      <div className="empty">
        <p className="empty-emoji">🏁</p>
        <p>Noch keine Teams für eine Auswertung.</p>
      </div>
    )
  }

  const champion = leaders(teams, METRICS[0]) // meiste KK = Gesamtsieger
  const worst = leaders(teams, { ...METRICS[0], worst: true })

  return (
    <section className="endstats">
      <div className="champion-card">
        <span className="champion-crown">🏆</span>
        <span className="champion-label muted small">Gesamtsieger · meiste Kronkorken</span>
        <strong className="champion-name">{nameList(champion.teams)}</strong>
        <span className="champion-value">{formatMoney(champion.value)}</span>
      </div>

      <div className="stat-cards">
        {METRICS.map((m) => {
          const l = leaders(teams, m)
          const showNames = m.key === 'cash' || l.value > 0
          return (
            <div key={m.key} className="stat-card">
              <span className="stat-icon">{m.icon}</span>
              <div className="stat-main">
                <span className="stat-label muted small">{m.label}</span>
                <strong className="stat-winner">{showNames ? nameList(l.teams) : '—'}</strong>
              </div>
              <span className="stat-value">{showNames ? m.format(l.value) : '–'}</span>
            </div>
          )
        })}

        <div className="stat-card worst">
          <span className="stat-icon">💩</span>
          <div className="stat-main">
            <span className="stat-label muted small">Schlechtestes Team · wenigste KK</span>
            <strong className="stat-winner">{nameList(worst.teams)}</strong>
          </div>
          <span className="stat-value">{formatMoney(worst.value)}</span>
        </div>
      </div>

      <p className="muted small center endstats-note">
        Prost! 🍻 Die Zähler kannst du im Setup mit „Alles zurücksetzen“ leeren.
      </p>
    </section>
  )
}
