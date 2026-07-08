import { useState } from 'react'
import { useStore } from '../store'
import type { Theme } from '../theme'

/**
 * Setup-Seite – bewusst simpel: Team erstellen oder einem bestehenden Team
 * beitreten (führt direkt zur Teamseite) und das Erscheinungsbild wählen.
 * Host-Aktionen (Auswertung, Zurücksetzen) sieht nur der Spielleiter.
 */
export function AdminView({
  onEndGame,
  onGoToTeams,
  theme,
  onThemeChange,
}: {
  onEndGame: () => void
  onGoToTeams: () => void
  theme: Theme
  onThemeChange: (theme: Theme) => void
}) {
  const { state, isHost, addTeam, removeTeam, setCurrentTeam, resetAll } = useStore()
  const [name, setName] = useState('')

  const join = (teamId: string) => {
    setCurrentTeam(teamId)
    onGoToTeams()
  }

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return
    const id = addTeam(name)
    setName('')
    // Direkt dem neuen Team beitreten und zur Teamseite wechseln.
    join(id)
  }

  return (
    <section>
      {/* Team erstellen / beitreten */}
      <h2 className="admin-h">Teams</h2>
      <p className="muted small settings-intro">
        Erstellt euer Team oder tretet einem bestehenden bei – ihr landet direkt
        auf eurer Teamseite. Spieleranzahl &amp; Co. stellt ihr dort ein.
      </p>

      <form className="add-team" onSubmit={submit}>
        <input
          type="text"
          placeholder="Teamname eingeben…"
          value={name}
          onChange={(e) => setName(e.target.value)}
          aria-label="Teamname"
        />
        <button type="submit" className="btn primary">
          + Team
        </button>
      </form>

      {state.teams.length === 0 ? (
        <p className="muted small">Noch keine Teams angelegt.</p>
      ) : (
        <ul className="admin-team-list">
          {state.teams.map((t) => {
            const isMine = state.currentTeamId === t.id
            return (
              <li key={t.id} className="admin-team-row">
                <span className="other-dot" style={{ background: t.color }} />
                <span className="admin-team-name">
                  {t.name}
                  <span className="muted small"> · {t.players}👤</span>
                </span>
                {isMine ? (
                  <button className="btn tiny" onClick={onGoToTeams}>
                    ✓ Mein Team
                  </button>
                ) : (
                  <button className="btn tiny primary" onClick={() => join(t.id)}>
                    Beitreten
                  </button>
                )}
                {isHost && (
                  <button
                    className="btn tiny danger ghost"
                    onClick={() => {
                      if (confirm(`Team „${t.name}“ wirklich löschen?`)) removeTeam(t.id)
                    }}
                  >
                    Löschen
                  </button>
                )}
              </li>
            )
          })}
        </ul>
      )}

      {/* Erscheinungsbild (gerätelokal) */}
      <h2 className="admin-h">Erscheinungsbild</h2>
      <div className="theme-toggle">
        <button
          className={theme === 'light' ? 'edu-opt active' : 'edu-opt'}
          onClick={() => onThemeChange('light')}
        >
          🌞 Hell
        </button>
        <button
          className={theme === 'dark' ? 'edu-opt active' : 'edu-opt'}
          onClick={() => onThemeChange('dark')}
        >
          🌙 Dunkel
        </button>
        <span className="muted small">gilt nur für dieses Gerät</span>
      </div>

      {/* Host-Aktionen – nur für den Spielleiter */}
      {isHost && (
        <>
          <h2 className="admin-h">Host</h2>
          <button className="btn primary block end-game-btn" onClick={onEndGame}>
            🏁 FDL beenden &amp; Siegesauswertung
          </button>

          <div className="danger-zone">
            <button
              className="btn danger"
              onClick={() => {
                if (
                  confirm(
                    'Wirklich alles zurücksetzen? Alle Teams und Anpassungen gehen verloren.',
                  )
                ) {
                  resetAll()
                }
              }}
            >
              Alles zurücksetzen
            </button>
          </div>
        </>
      )}
    </section>
  )
}
