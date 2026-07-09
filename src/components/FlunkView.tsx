import { useState } from 'react'
import type { ActionCard, Team } from '../types'
import { useStore } from '../store'
import { Modal } from './Modal'

/** KK, die ein Match-Sieger beim Beenden der Runde standardmäßig bekommt. */
const DEFAULT_WIN_REWARD = 5

/**
 * Flunk-Ablauf – live geteilt über den gemeinsamen Zustand (state.flunk):
 * Teams kommen an („bereit") oder warten Runden – pro gewarteter Runde gibt es
 * eine Aktionskarte (bei „zurück" werden sie wieder eingezogen). Sind
 * mindestens zwei Teams bereit, werden die Matches ausgelost. Danach je Match:
 * Gewinner wählen (zählt als Flunk-Sieg) + Biere für den Verlierer zählen.
 * Während der ganzen Runde sind die Aktionskarten der Teams (inkl. Game
 * Changer) einsehbar und spielbar. „Flunk-Runde beenden" schreibt den Siegern
 * ihre KK gut und schickt allen Geräten eine Nachricht.
 */
export function FlunkView() {
  const {
    state,
    addBeer,
    flunkArrive,
    flunkWaitRound,
    flunkUnready,
    flunkDrawMatches,
    flunkSetWinner,
    flunkBackToSetup,
    flunkFinish,
    flunkReset,
  } = useStore()
  const teams = state.teams

  const ready = new Set(state.flunk?.readyIds ?? [])
  const matches = state.flunk?.matches ?? null
  const waitCardIds = state.flunk?.waitCardIds ?? {}

  const [waitDrawn, setWaitDrawn] = useState<{ teamName: string; card: ActionCard } | null>(null)
  // KK-Gutschrift pro Flunk-Sieg – wird beim „Runde beenden" gebucht.
  const [reward, setReward] = useState(String(DEFAULT_WIN_REWARD))

  const name = (id: string | null) => teams.find((t) => t.id === id)?.name ?? 'Freilos'

  const waitRound = (id: string) => {
    const team = teams.find((t) => t.id === id)
    const card = flunkWaitRound(id)
    if (team && card) setWaitDrawn({ teamName: team.name, card })
  }

  const readyCount = ready.size

  // --- Match-Phase ---------------------------------------------------------
  if (matches) {
    const allDecided = matches.every((m) => m.b == null || m.winnerId != null)
    return (
      <section className="flunk">
        <div className="flunk-bar">
          <span className="muted small">
            {matches.length} Match{matches.length === 1 ? '' : 'es'}
          </span>
          <div className="sheet-actions">
            <button className="btn small" onClick={flunkDrawMatches}>
              ↻ Neu auslosen
            </button>
            <button className="btn small ghost" onClick={flunkBackToSetup}>
              ‹ Zurück
            </button>
          </div>
        </div>

        <div className="flunk-matches">
          {matches.map((m, i) => {
            const winnerId = m.winnerId
            const loserId = winnerId && m.b ? (winnerId === m.a ? m.b : m.a) : null
            const loser = teams.find((t) => t.id === loserId) ?? null
            const teamA = teams.find((t) => t.id === m.a) ?? null
            const teamB = m.b ? teams.find((t) => t.id === m.b) ?? null : null
            return (
              <div key={i} className="flunk-match">
                <div className="flunk-vs">
                  <span className="flunk-team">{name(m.a)}</span>
                  <span className="vs-badge">VS</span>
                  <span className="flunk-team">{name(m.b)}</span>
                </div>

                {/* Aktionskarten beider Teams – während des Matchs spielbar. */}
                {teamA && <TeamActionCards team={teamA} />}
                {teamB && <TeamActionCards team={teamB} />}

                {m.b == null ? (
                  <p className="muted small center">Freilos – kein Gegner.</p>
                ) : winnerId == null ? (
                  <div className="flunk-win-buttons">
                    <button className="btn primary big" onClick={() => flunkSetWinner(i, m.a)}>
                      🏆 {name(m.a)}
                    </button>
                    <button className="btn primary big" onClick={() => flunkSetWinner(i, m.b!)}>
                      🏆 {name(m.b)}
                    </button>
                  </div>
                ) : (
                  <div className="flunk-result">
                    <p className="center">
                      🏆 <strong>{name(winnerId)}</strong> gewinnt gegen {name(loserId)}
                    </p>
                    {loser && (
                      <div className="flunk-beer">
                        <span className="muted small">
                          Biere für {loser.name}: <strong>{loser.beers.normal}</strong>
                        </span>
                        <div className="quick-pair">
                          <button
                            className="btn small minus"
                            onClick={() => addBeer(loser.id, 'normal', -1)}
                          >
                            −
                          </button>
                          <button
                            className="btn small plus"
                            onClick={() => addBeer(loser.id, 'normal', 1)}
                          >
                            +
                          </button>
                        </div>
                      </div>
                    )}
                    <button className="btn tiny ghost" onClick={() => flunkSetWinner(i, null)}>
                      Sieger ändern
                    </button>
                  </div>
                )}
              </div>
            )
          })}
        </div>

        <label className="field flunk-reward">
          <span>🏆 KK-Gutschrift pro Flunk-Sieg (beim Beenden gebucht)</span>
          <input
            type="number"
            inputMode="numeric"
            min={0}
            value={reward}
            onChange={(e) => setReward(e.target.value)}
          />
        </label>

        <button
          className="btn primary block"
          disabled={!allDecided}
          onClick={() => flunkFinish(Math.max(0, Number(reward) || 0))}
          title="Beendet die Runde, schreibt den Siegern ihre KK gut und benachrichtigt alle Geräte"
        >
          🏁 Flunk-Runde beenden
        </button>
        {!allDecided && (
          <p className="muted small center">Erst alle Sieger eintragen, dann beenden.</p>
        )}

        <div className="danger-zone">
          <button className="btn ghost" onClick={flunkReset}>
            Abbrechen (verwirft Siege)
          </button>
        </div>
      </section>
    )
  }

  // --- Ankommen / Warten ---------------------------------------------------
  if (teams.length === 0) {
    return (
      <div className="empty">
        <p className="empty-emoji">🚩</p>
        <p>Noch keine Teams.</p>
        <p className="muted">Lege sie im Tab „Setup“ an.</p>
      </div>
    )
  }

  return (
    <section className="flunk">
      <p className="muted small settings-intro">
        Auf dem Flunk-Feld angekommen? „Bereit zum Spielen" drücken. Muss ein
        Team auf die anderen warten, gibt es pro gewarteter Runde eine
        Aktionskarte. Sind alle da, werden die Matches ausgelost.
      </p>

      <ul className="flunk-teams">
        {teams.map((t) => {
          const isReady = ready.has(t.id)
          const waited = waitCardIds[t.id]?.length ?? 0
          return (
            <li key={t.id} className="flunk-team-row" style={{ borderLeftColor: t.color }}>
              <span className="flunk-team-name">
                {t.name}
                {waited > 0 && <span className="muted small"> · {waited}× gewartet</span>}
              </span>
              <span className="flunk-ready">
                <button className="btn small" onClick={() => waitRound(t.id)}>
                  🃏 Runde gewartet
                </button>
                {isReady ? (
                  <>
                    <span className="flunk-ok">✓ bereit</span>
                    <button
                      className="btn tiny ghost"
                      onClick={() => flunkUnready(t.id)}
                      title="Bereit zurücknehmen – Warte-Karten werden wieder entfernt"
                    >
                      zurück
                    </button>
                  </>
                ) : (
                  <button className="btn small primary" onClick={() => flunkArrive(t.id)}>
                    ✅ Bereit zum Spielen
                  </button>
                )}
              </span>
              <TeamActionCards team={t} />
            </li>
          )
        })}
      </ul>

      <button
        className="btn primary block flunk-draw"
        disabled={readyCount < 2}
        onClick={flunkDrawMatches}
      >
        🎲 Matches auslosen ({readyCount} bereit)
      </button>
      {readyCount < 2 && (
        <p className="muted small center">Mindestens zwei bereite Teams nötig.</p>
      )}

      {waitDrawn && (
        <Modal
          title={`🃏 Karte für ${waitDrawn.teamName}`}
          onClose={() => setWaitDrawn(null)}
        >
          <div className="drawn-card reward-card">
            <strong className="drawn-title">{waitDrawn.card.title}</strong>
            {waitDrawn.card.note && <p className="drawn-detail">{waitDrawn.card.note}</p>}
          </div>
          <p className="muted small">
            Die Karte liegt im Team-Inventar. Drückt das Team „zurück", wird sie
            wieder entfernt.
          </p>
          <div className="modal-actions">
            <button className="btn primary" onClick={() => setWaitDrawn(null)}>
              Alles klar
            </button>
          </div>
        </Modal>
      )}
    </section>
  )
}

/**
 * Aufklappbare Kartenhand eines Teams fürs Flunk-Spiel: normale Aktionskarten
 * und Game Changer (⚡). ✕ spielt die Karte aus (zählt für die Statistik).
 */
function TeamActionCards({ team }: { team: Team }) {
  const { removeActionCard } = useStore()
  if (team.actionCards.length === 0) return null
  const specials = team.actionCards.filter((c) => c.kind === 'special').length
  return (
    <details className="flunk-cards">
      <summary>
        🃏 Karten von {team.name} ({team.actionCards.length}
        {specials > 0 ? `, davon ${specials} ⚡ Game Changer` : ''})
      </summary>
      <ul className="chip-list">
        {team.actionCards.map((c) => (
          <li
            key={c.id}
            className={c.kind === 'special' ? 'chip chip-special' : 'chip chip-action'}
          >
            <span className="chip-text">
              <strong>
                {c.kind === 'special' ? '⚡ ' : ''}
                {c.title}
              </strong>
              {c.note && <em> — {c.note}</em>}
            </span>
            <button
              className="chip-x"
              onClick={() => removeActionCard(team.id, c.id)}
              title="Karte benutzen / ablegen (zählt als ausgespielt)"
              aria-label="Karte benutzen"
            >
              ✕
            </button>
          </li>
        ))}
      </ul>
    </details>
  )
}
