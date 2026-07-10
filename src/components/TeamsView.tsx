import { useEffect, useState } from 'react'
import { useStore } from '../store'
import { formatMoney } from '../util'
import { TeamCard } from './TeamCard'
import { FieldIcon } from './FieldIcon'

export function TeamsView({
  focusBeers = false,
  onFocusDone,
}: {
  /** Nach der Weiterleitung (z. B. Edward 20 Hands) den Bierzähler zeigen. */
  focusBeers?: boolean
  onFocusDone?: () => void
}) {
  const { state, setCurrentTeam } = useStore()
  const [switching, setSwitching] = useState(false)

  // Zum Bierzähler scrollen und ihn kurz hervorheben, damit klar ist,
  // warum man auf die Teamseite weitergeleitet wurde.
  useEffect(() => {
    if (!focusBeers) return
    const timer = window.setTimeout(() => {
      const el = document.querySelector('.beer-counters')
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' })
        el.classList.add('beer-focus')
        window.setTimeout(() => el.classList.remove('beer-focus'), 2600)
      }
      onFocusDone?.()
    }, 350) // kurz warten, bis die Seiten-Animation durch ist
    return () => window.clearTimeout(timer)
  }, [focusBeers, onFocusDone])

  const current = state.teams.find((t) => t.id === state.currentTeamId) ?? null
  const showPicker = !current || switching

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
      {showPicker ? (
        <div className="join-picker">
          <label>
            Ich spiele als Team:
            <select
              value={state.currentTeamId ?? ''}
              onChange={(e) => {
                setCurrentTeam(e.target.value || null)
                setSwitching(false)
              }}
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
      ) : (
        // Eigenes Team im Fokus – der Auswahlblock verschwindet nach der Wahl.
        <div className="my-team-bar">
          <span className="muted small">Mein Team</span>
          <button className="btn tiny ghost" onClick={() => setSwitching(true)}>
            Team wechseln
          </button>
        </div>
      )}

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
                    {t.stockNumber != null && (
                      <span className="muted small"> · 📈 Nr. {t.stockNumber}</span>
                    )}
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
                  <span className="overview-beers muted small">
                    <FieldIcon kind="flunk" /> {beers}
                  </span>
                </div>
              </li>
            )
          })}
        </ul>
      </div>
    </section>
  )
}
