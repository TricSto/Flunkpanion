import { useStore } from '../store'
import { formatMoney } from '../util'
import { TeamCard } from './TeamCard'

export function TeamsView() {
  const { state, setCurrentTeam } = useStore()

  const current = state.teams.find((t) => t.id === state.currentTeamId) ?? null

  if (state.teams.length === 0) {
    return (
      <div className="empty">
        <p className="empty-emoji">🍺</p>
        <p>Noch keine Teams.</p>
        <p className="muted">Lege im Tab „Setup“ die Teams für euer Spiel an.</p>
      </div>
    )
  }

  return (
    <section>
      <div className="join-picker">
        <label>
          Ich spiele als Team:
          <select
            value={state.currentTeamId ?? ''}
            onChange={(e) => setCurrentTeam(e.target.value || null)}
          >
            <option value="">— Team wählen —</option>
            {state.teams.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </label>
      </div>

      {current && <TeamCard team={current} defaultOpen />}

      <div className="overview">
        <h3 className="overview-h">Alle Teams</h3>
        <ul className="overview-list">
          {state.teams.map((t) => {
            const beers = t.beers.normal + t.beers.fun + t.beers.penalty
            return (
              <li key={t.id} className="overview-row" style={{ borderLeftColor: t.color }}>
                <div className="overview-main">
                  <span className="overview-name">
                    {t.name}
                    <span className="muted small"> · {t.players}👤</span>
                  </span>
                  <span className="overview-job muted small">
                    {t.job?.title ? t.job.title : 'Kein Beruf'}
                    {t.job && t.job.salary > 0
                      ? ` · ${formatMoney(t.job.salary)}${t.job.beerTax ? ` · BS ${t.job.beerTax}` : ''}`
                      : ''}
                  </span>
                </div>
                <div className="overview-side">
                  <span className="overview-cash">{formatMoney(t.cash)}</span>
                  <span className="overview-beers muted small">🍺 {beers}</span>
                </div>
              </li>
            )
          })}
        </ul>
      </div>
    </section>
  )
}
