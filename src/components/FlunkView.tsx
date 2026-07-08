import { useState } from 'react'
import { useStore } from '../store'
import { pickRandom } from '../util'

interface Match {
  a: string
  b: string | null
}

/**
 * Erste Version des Flunk-Ablaufs (host-seitig, noch nicht live geteilt):
 * Teams kommen an → warten eine Runde → bekommen eine Aktionskarte. Sind
 * mindestens zwei Teams bereit, lost der Host die Matches aus (neu auslosbar).
 * Danach je Match: Gewinner wählen (zählt als Flunk-Sieg) + Strafbiere für den
 * Verlierer zählen.
 */
export function FlunkView() {
  const { state, addActionCard, addBeer, bumpStat } = useStore()
  const teams = state.teams
  const aktionsDeck = state.decks.find((d) => d.id === 'aktionskarten')

  const [ready, setReady] = useState<Set<string>>(new Set())
  const [matches, setMatches] = useState<Match[] | null>(null)
  const [winners, setWinners] = useState<Record<number, string>>({})

  const name = (id: string | null) => teams.find((t) => t.id === id)?.name ?? 'Freilos'

  const arrive = (id: string) => {
    const team = teams.find((t) => t.id === id)
    if (!team) return
    // Belohnung fürs Warten: eine Aktionskarte (keine Doppelten).
    if (aktionsDeck && aktionsDeck.cards.length > 0) {
      const held = new Set(team.actionCards.map((c) => c.title))
      const card =
        pickRandom(aktionsDeck.cards.filter((c) => !held.has(c.title))) ??
        pickRandom(aktionsDeck.cards)
      if (card) addActionCard(id, card.title, card.detail)
    }
    setReady((s) => new Set(s).add(id))
  }

  const unready = (id: string) =>
    setReady((s) => {
      const n = new Set(s)
      n.delete(id)
      return n
    })

  // Alle bereits gezählten Flunk-Siege wieder abziehen (vor Neu-Auslosen/Reset).
  const clearRecordedWins = () => {
    Object.values(winners).forEach((id) => bumpStat(id, 'flunkWins', -1))
  }

  const recordWinner = (i: number, teamId: string) => {
    const prev = winners[i]
    if (prev === teamId) return
    if (prev) bumpStat(prev, 'flunkWins', -1)
    bumpStat(teamId, 'flunkWins', 1)
    setWinners((w) => ({ ...w, [i]: teamId }))
  }

  const clearWinner = (i: number) => {
    const prev = winners[i]
    if (prev) bumpStat(prev, 'flunkWins', -1)
    setWinners((w) => {
      const n = { ...w }
      delete n[i]
      return n
    })
  }

  const drawMatches = () => {
    clearRecordedWins()
    const ids = [...ready]
    for (let i = ids.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[ids[i], ids[j]] = [ids[j], ids[i]]
    }
    const ms: Match[] = []
    for (let i = 0; i < ids.length; i += 2) {
      ms.push({ a: ids[i], b: ids[i + 1] ?? null })
    }
    setMatches(ms)
    setWinners({})
  }

  const backToSetup = () => {
    clearRecordedWins()
    setWinners({})
    setMatches(null)
  }

  const reset = () => {
    clearRecordedWins()
    setReady(new Set())
    setMatches(null)
    setWinners({})
  }

  const readyCount = ready.size

  // --- Match-Phase ---------------------------------------------------------
  if (matches) {
    return (
      <section className="flunk">
        <div className="flunk-bar">
          <span className="muted small">
            {matches.length} Match{matches.length === 1 ? '' : 'es'}
          </span>
          <div className="sheet-actions">
            <button className="btn small" onClick={drawMatches}>
              ↻ Neu auslosen
            </button>
            <button className="btn small ghost" onClick={backToSetup}>
              ‹ Zurück
            </button>
          </div>
        </div>

        <div className="flunk-matches">
          {matches.map((m, i) => {
            const winnerId = winners[i] ?? null
            const loserId = winnerId && m.b ? (winnerId === m.a ? m.b : m.a) : null
            const loser = teams.find((t) => t.id === loserId) ?? null
            return (
              <div key={i} className="flunk-match">
                <div className="flunk-vs">
                  <span className="flunk-team">{name(m.a)}</span>
                  <span className="vs-badge">VS</span>
                  <span className="flunk-team">{name(m.b)}</span>
                </div>

                {m.b == null ? (
                  <p className="muted small center">Freilos – kein Gegner.</p>
                ) : winnerId == null ? (
                  <div className="flunk-win-buttons">
                    <button className="btn primary big" onClick={() => recordWinner(i, m.a)}>
                      🏆 {name(m.a)}
                    </button>
                    <button className="btn primary big" onClick={() => recordWinner(i, m.b!)}>
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
                          Strafbiere für {loser.name}: <strong>{loser.beers.penalty}</strong>
                        </span>
                        <div className="quick-pair">
                          <button
                            className="btn small minus"
                            onClick={() => addBeer(loser.id, 'penalty', -1)}
                          >
                            −
                          </button>
                          <button
                            className="btn small plus"
                            onClick={() => addBeer(loser.id, 'penalty', 1)}
                          >
                            +
                          </button>
                        </div>
                      </div>
                    )}
                    <button className="btn tiny ghost" onClick={() => clearWinner(i)}>
                      Sieger ändern
                    </button>
                  </div>
                )}
              </div>
            )
          })}
        </div>

        <div className="danger-zone">
          <button className="btn ghost" onClick={reset}>
            Flunk-Runde zurücksetzen
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
        Jedes Team, das auf dem Flunk-Feld ankommt, wartet eine Runde und bekommt
        dann eine Aktionskarte. Sind alle da, werden die Matches ausgelost.
      </p>

      <ul className="flunk-teams">
        {teams.map((t) => {
          const isReady = ready.has(t.id)
          return (
            <li key={t.id} className="flunk-team-row" style={{ borderLeftColor: t.color }}>
              <span className="flunk-team-name">{t.name}</span>
              {isReady ? (
                <span className="flunk-ready">
                  <span className="flunk-ok">✓ bereit</span>
                  <button className="btn tiny ghost" onClick={() => unready(t.id)}>
                    zurück
                  </button>
                </span>
              ) : (
                <button className="btn small" onClick={() => arrive(t.id)}>
                  Runde gewartet → 🃏 Karte
                </button>
              )}
            </li>
          )
        })}
      </ul>

      <button
        className="btn primary block flunk-draw"
        disabled={readyCount < 2}
        onClick={drawMatches}
      >
        🎲 Matches auslosen ({readyCount} bereit)
      </button>
      {readyCount < 2 && (
        <p className="muted small center">Mindestens zwei bereite Teams nötig.</p>
      )}
    </section>
  )
}
