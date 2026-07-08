import { useState } from 'react'
import type { Card, Team } from '../types'
import { useStore } from '../store'
import { formatMoney, formatTime } from '../util'
import { Modal } from './Modal'

const QUICK_AMOUNTS = [5, 10, 15, 20]

function pickRandom<T>(items: T[]): T | undefined {
  if (items.length === 0) return undefined
  return items[Math.floor(Math.random() * items.length)]
}

export function TeamCard({ team, defaultOpen = true }: { team: Team; defaultOpen?: boolean }) {
  const {
    state,
    adjustCash,
    undoTransaction,
    setJobTitle,
    setSalary,
    payBeerTax,
    addActionCard,
    removeActionCard,
    renameTeam,
  } = useStore()

  const [open, setOpen] = useState(defaultOpen)
  const [modal, setModal] = useState<null | 'cash'>(null)
  const [flash, setFlash] = useState<string | null>(null)

  const berufe = state.decks.find((d) => d.type === 'job')
  const gehalt = state.decks.find((d) => d.type === 'salary')
  const actionDecks = state.decks.filter((d) => d.type === 'action' || d.type === 'special')

  const heldTitles = new Set(team.actionCards.map((c) => c.title))

  const showFlash = (msg: string) => {
    setFlash(msg)
    window.setTimeout(() => setFlash((f) => (f === msg ? null : f)), 2500)
  }

  const rollBeruf = () => {
    const card = pickRandom(berufe?.cards ?? [])
    if (!card) return
    setJobTitle(team.id, card.title)
    showFlash(`Beruf: ${card.title}`)
  }

  const rollGehalt = () => {
    const card = pickRandom(gehalt?.cards ?? [])
    if (!card) return
    setSalary(team.id, card.salary ?? 0, card.beerTax ?? 0)
    showFlash(`Gehalt: ${formatMoney(card.salary ?? 0)} · BS ${card.beerTax ?? 0}`)
  }

  const drawAction = (deckId: string) => {
    const deck = state.decks.find((d) => d.id === deckId)
    if (!deck) return
    // Keine Doppelten: nur Karten ziehen, die das Team noch nicht hat.
    const available = deck.cards.filter((c) => !heldTitles.has(c.title))
    if (available.length === 0) {
      showFlash(`Alle Karten aus „${deck.name}“ bereits im Team`)
      return
    }
    const card = pickRandom(available) as Card
    addActionCard(team.id, card.title, card.detail)
    showFlash(`Gezogen: ${card.title}`)
  }

  return (
    <article className="team-card" style={{ borderTopColor: team.color }}>
      <header className="team-card-head">
        <button
          className="team-name"
          onClick={() => setOpen((o) => !o)}
          style={{ color: team.color }}
        >
          <span className="chevron">{open ? '▾' : '▸'}</span>
          {team.name}
        </button>
        <div className="team-cash">
          <span className="cash-value">{formatMoney(team.cash)}</span>
          <span className="cash-label">Kronkorken</span>
        </div>
      </header>

      {flash && <div className="flash">{flash}</div>}

      {open && (
        <div className="team-body">
          {/* Beruf & Gehalt (separat würfelbar) */}
          <div className="row">
            <div className="row-main">
              <span className="row-label">💼 Beruf</span>
              {team.job && team.job.title ? (
                <span className="row-value">{team.job.title}</span>
              ) : (
                <span className="row-value muted">Kein Beruf</span>
              )}
            </div>
            <button className="btn small" onClick={rollBeruf}>
              🎲 Beruf
            </button>
          </div>

          <div className="row">
            <div className="row-main">
              <span className="row-label">💶 Gehalt</span>
              {team.job && team.job.salary > 0 ? (
                <span className="row-value">
                  {formatMoney(team.job.salary)}
                  {team.job.beerTax > 0 && (
                    <span className="muted"> · BS {team.job.beerTax}</span>
                  )}
                </span>
              ) : (
                <span className="row-value muted">Kein Gehalt</span>
              )}
            </div>
            <div className="row-actions">
              <button className="btn small" onClick={rollGehalt}>
                🎲 Gehalt
              </button>
            </div>
          </div>

          {team.job && team.job.salary > 0 && (
            <div className="cash-controls">
              <button
                className="btn small plus"
                onClick={() =>
                  adjustCash(team.id, team.job!.salary, `Gehalt: ${team.job!.title || 'Job'}`)
                }
              >
                Gehalt auszahlen +{team.job.salary}
              </button>
              {team.job.beerTax > 0 && (
                <button className="btn small minus" onClick={() => payBeerTax(team.id)}>
                  Biersteuer −{team.job.beerTax}
                </button>
              )}
            </div>
          )}

          {/* Kronkorken-Buttons */}
          <div className="cash-controls">
            <button className="btn small" onClick={() => setModal('cash')}>
              💰 Betrag buchen
            </button>
            {QUICK_AMOUNTS.map((amt) => (
              <span key={amt} className="quick-pair">
                <button
                  className="btn small plus"
                  onClick={() => adjustCash(team.id, amt, 'Schnellbuchung')}
                >
                  +{amt}
                </button>
                <button
                  className="btn small minus"
                  onClick={() => adjustCash(team.id, -amt, 'Schnellbuchung')}
                >
                  −{amt}
                </button>
              </span>
            ))}
          </div>

          {/* Aktionskarten – direkt ziehen, keine Doppelten */}
          <div className="section">
            <div className="section-head">
              <h4>🃏 Aktionskarten ({team.actionCards.length})</h4>
            </div>
            <div className="draw-controls">
              {actionDecks.map((deck) => (
                <button
                  key={deck.id}
                  className="btn small"
                  onClick={() => drawAction(deck.id)}
                >
                  {deck.icon} {deck.name} ziehen
                </button>
              ))}
            </div>
            {team.actionCards.length === 0 ? (
              <p className="muted small">Noch keine Karten gezogen.</p>
            ) : (
              <ul className="chip-list">
                {team.actionCards.map((c) => (
                  <li key={c.id} className="chip">
                    <span className="chip-text">
                      <strong>{c.title}</strong>
                      {c.note && <em> — {c.note}</em>}
                    </span>
                    <button
                      className="chip-x"
                      onClick={() => removeActionCard(team.id, c.id)}
                      title="Karte benutzen / ablegen (wird wieder ziehbar)"
                      aria-label="Karte benutzen"
                    >
                      ✕
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Verlauf */}
          <div className="section">
            <div className="section-head">
              <h4>🧾 Verlauf ({team.transactions.length})</h4>
            </div>
            {team.transactions.length === 0 ? (
              <p className="muted small">Noch keine Buchungen.</p>
            ) : (
              <ul className="tx-list">
                {team.transactions.slice(0, 8).map((tx) => (
                  <li key={tx.id} className="tx">
                    <span className="tx-time">{formatTime(tx.at)}</span>
                    <span className="tx-reason">{tx.reason}</span>
                    <span className={tx.delta >= 0 ? 'tx-delta pos' : 'tx-delta neg'}>
                      {tx.delta > 0 ? '+' : ''}
                      {formatMoney(tx.delta)}
                    </span>
                    <button
                      className="tx-undo"
                      title="Buchung rückgängig machen"
                      onClick={() => undoTransaction(team.id, tx.id)}
                    >
                      ↩
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Fußzeile */}
          <div className="team-footer">
            <div className="team-footer-actions">
              <button
                className="btn tiny ghost"
                onClick={() => {
                  const next = prompt('Neuer Teamname', team.name)
                  if (next != null) renameTeam(team.id, next)
                }}
              >
                Umbenennen
              </button>
            </div>
          </div>
        </div>
      )}

      {modal === 'cash' && (
        <CashModal
          onClose={() => setModal(null)}
          onSubmit={(delta, reason) => {
            adjustCash(team.id, delta, reason)
            setModal(null)
          }}
        />
      )}
    </article>
  )
}

// ---- Modals ----------------------------------------------------------------

function CashModal({
  onClose,
  onSubmit,
}: {
  onClose: () => void
  onSubmit: (delta: number, reason: string) => void
}) {
  const [value, setValue] = useState('')
  const [reason, setReason] = useState('')
  const num = Number(value)
  return (
    <Modal title="Betrag buchen" onClose={onClose}>
      <label className="field">
        <span>Betrag in KK (negativ = Ausgabe)</span>
        <input
          type="number"
          inputMode="numeric"
          autoFocus
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="z. B. 10 oder -5"
        />
      </label>
      <label className="field">
        <span>Grund (optional)</span>
        <input
          type="text"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="z. B. Miete, Bonus…"
        />
      </label>
      <div className="modal-actions">
        <button className="btn ghost" onClick={onClose}>
          Abbrechen
        </button>
        <button
          className="btn primary"
          disabled={!value || Number.isNaN(num)}
          onClick={() => onSubmit(num, reason.trim() || 'Buchung')}
        >
          Buchen
        </button>
      </div>
    </Modal>
  )
}
