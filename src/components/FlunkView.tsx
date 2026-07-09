import { useState } from 'react'
import type { ActionCard } from '../types'
import { useStore } from '../store'
import { Modal } from './Modal'
import { FlashPopover } from './FlashPopover'

/** KK, die ein Match-Sieger beim Beenden der Runde standardmäßig bekommt. */
const DEFAULT_WIN_REWARD = 5

/**
 * Flunk-Ablauf – live geteilt über den gemeinsamen Zustand (state.flunk):
 * Teams kommen an („bereit") oder warten Runden – pro gewarteter Runde gibt es
 * eine Aktionskarte (bei „zurück" werden sie wieder eingezogen). Sind
 * mindestens zwei Teams bereit, werden die Matches ausgelost. Danach je Match:
 * Gewinner wählen (zählt als Flunk-Sieg) + Biere für den Verlierer zählen.
 * Während der ganzen Runde sieht jedes Gerät nur die Kartenhand des eigenen
 * (beigetretenen) Teams; „Benutzen" spielt eine Karte aus und meldet dem
 * Gegner-Team live „Aktionskarte aktiviert" samt Effekt. „Flunk-Runde beenden"
 * schreibt den Siegern ihre KK gut und schickt allen Geräten eine Nachricht.
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
  // Meldung zur einmaligen Gehalts-Gutschrift beim „Bereit" (Feedback #33).
  const [paidMsg, setPaidMsg] = useState<string | null>(null)
  // KK-Gutschrift pro Flunk-Sieg – wird beim „Runde beenden" gebucht.
  const [reward, setReward] = useState(String(DEFAULT_WIN_REWARD))

  const name = (id: string | null) => teams.find((t) => t.id === id)?.name ?? 'Freilos'

  const waitRound = (id: string) => {
    const team = teams.find((t) => t.id === id)
    const card = flunkWaitRound(id)
    if (team && card) setWaitDrawn({ teamName: team.name, card })
  }

  const arrive = (id: string) => {
    const team = teams.find((t) => t.id === id)
    const paid = flunkArrive(id)
    if (team && paid) {
      setPaidMsg(`💰 ${team.name}: Gehalt +${paid} KK gutgeschrieben (1× pro Flunk-Runde)`)
    }
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

        {/* Eigene Kartenhand – nur das Team dieses Geräts. */}
        <MyActionCards />

        <div className="flunk-matches">
          {matches.map((m, i) => {
            const winnerId = m.winnerId
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
        Auf dem Flunk-Feld angekommen? „Bereit zum Spielen" drücken – dabei
        gibt es einmal pro Flunk-Runde das aktuelle Gehalt aufs Konto. Muss ein
        Team auf die anderen warten, gibt es pro gewarteter Runde eine
        Aktionskarte. Sind alle da, werden die Matches ausgelost.
      </p>

      {paidMsg && <FlashPopover message={paidMsg} onClose={() => setPaidMsg(null)} />}

      <ul className="flunk-teams">
        {teams.map((t) => {
          const isReady = ready.has(t.id)
          // „Runde gewartet"/„Bereit" nur fürs eigene Team (#59). Geräte ohne
          // beigetretenes Team (Spielleitung) dürfen weiterhin alle steuern.
          const canControl =
            state.currentTeamId == null || state.currentTeamId === t.id
          const waited = waitCardIds[t.id]?.length ?? 0
          return (
            <li key={t.id} className="flunk-team-row" style={{ borderLeftColor: t.color }}>
              <span className="flunk-team-name">
                {t.name}
                {waited > 0 && <span className="muted small"> · {waited}× gewartet</span>}
              </span>
              <span className="flunk-ready">
                {canControl ? (
                  <>
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
                      <button className="btn small primary" onClick={() => arrive(t.id)}>
                        ✅ Bereit zum Spielen
                      </button>
                    )}
                  </>
                ) : // Andere Teams: nur Status anzeigen, keine Bedienung (#59).
                isReady ? (
                  <span className="flunk-ok">✓ bereit</span>
                ) : (
                  <span className="muted small">wartet noch …</span>
                )}
              </span>
            </li>
          )
        })}
      </ul>

      {/* Eigene Kartenhand – nur das Team dieses Geräts. */}
      <MyActionCards />

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
 * Kartenhand des eigenen (beigetretenen) Teams fürs Flunk-Spiel: normale
 * Aktionskarten und Game Changer (⚡) in zwei getrennten Blöcken.
 * „Benutzen" spielt die Karte nach kurzer Bestätigung aus und
 * meldet dem Gegner-Team live „Aktionskarte aktiviert" samt Effekt.
 * Geräte ohne beigetretenes Team sehen keine Kartenhand.
 */
function MyActionCards() {
  const { state, playActionCard } = useStore()
  const [confirm, setConfirm] = useState<ActionCard | null>(null)
  const team = state.teams.find((t) => t.id === state.currentTeamId) ?? null
  if (!team) return null

  const normal = team.actionCards.filter((c) => c.kind !== 'special')
  const specials = team.actionCards.filter((c) => c.kind === 'special')

  const play = () => {
    if (!confirm) return
    playActionCard(team.id, confirm.id)
    setConfirm(null)
  }

  const cardList = (cards: ActionCard[]) => (
    <ul className="hand-list">
      {cards.map((c) => (
        <li
          key={c.id}
          className={c.kind === 'special' ? 'hand-card hand-special' : 'hand-card'}
        >
          <div className="hand-card-text">
            <strong className="hand-card-title">{c.title}</strong>
            {c.note && <p className="hand-card-note">{c.note}</p>}
          </div>
          <button className="btn small primary" onClick={() => setConfirm(c)}>
            Benutzen
          </button>
        </li>
      ))}
    </ul>
  )

  return (
    <section className="flunk-hand" style={{ borderLeftColor: team.color }}>
      <div className="hand-group">
        <h3 className="flunk-hand-title">🃏 Deine Aktionskarten ({normal.length})</h3>
        {normal.length === 0 ? (
          <p className="muted small flunk-hand-empty">Keine Aktionskarten auf der Hand.</p>
        ) : (
          cardList(normal)
        )}
      </div>
      {specials.length > 0 && (
        <div className="hand-group hand-group-special">
          <h3 className="flunk-hand-title">⚡ Game Changer ({specials.length})</h3>
          {cardList(specials)}
        </div>
      )}

      {confirm && (
        <Modal title="🃏 Karte benutzen?" onClose={() => setConfirm(null)}>
          <div className="drawn-card reward-card">
            <strong className="drawn-title">
              {confirm.kind === 'special' ? '⚡ ' : ''}
              {confirm.title}
            </strong>
            {confirm.note && <p className="drawn-detail">{confirm.note}</p>}
          </div>
          <p className="muted small">
            Die Karte wird ausgespielt und dem Gegner-Team live als
            „Aktionskarte aktiviert" mit dem Effekt angezeigt.
          </p>
          <div className="modal-actions">
            <button className="btn ghost" onClick={() => setConfirm(null)}>
              Abbrechen
            </button>
            <button className="btn primary" onClick={play}>
              ✅ Jetzt benutzen
            </button>
          </div>
        </Modal>
      )}
    </section>
  )
}
