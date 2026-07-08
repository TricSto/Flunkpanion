import { useStore } from '../store'
import { formatMoney } from '../util'
import { TeamCard } from './TeamCard'

export function TeamsView() {
  const { state, setCurrentTeam } = useStore()

  const current = state.teams.find((t) => t.id === state.currentTeamId) ?? null
  const others = state.teams.filter((t) => t.id !== state.currentTeamId)

  if (state.teams.length === 0) {
    return (
      <div className="empty">
        <p className="empty-emoji">🍺</p>
        <p>Noch keine Teams.</p>
        <p className="muted">Lege im Tab „Admin“ die Teams für euer Spiel an.</p>
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

      {current ? (
        <TeamCard team={current} defaultOpen />
      ) : (
        <div className="empty">
          <p className="muted">Wähle oben dein Team aus, um loszulegen.</p>
        </div>
      )}

      {others.length > 0 && (
        <details className="other-teams">
          <summary>Andere Teams ({others.length})</summary>
          <ul className="other-list">
            {others.map((t) => {
              const worth =
                t.cash + t.properties.reduce((s, p) => s + p.value, 0)
              return (
                <li key={t.id} className="other-row">
                  <span className="other-dot" style={{ background: t.color }} />
                  <span className="other-name">{t.name}</span>
                  <span className="other-cash">{formatMoney(t.cash)}</span>
                  <span className="other-worth muted">Verm. {formatMoney(worth)}</span>
                </li>
              )
            })}
          </ul>
        </details>
      )}
    </section>
  )
}
