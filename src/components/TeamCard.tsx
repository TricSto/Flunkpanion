import { useState } from 'react'
import type { Card, Education, Team } from '../types'
import { STOCK_PRICE } from '../types'
import { useStore } from '../store'
import { formatMoney, formatTime, pickRandom } from '../util'
import { Modal } from './Modal'
import { BerufChooser } from './BerufChooser'

const QUICK_AMOUNTS = [5, 10, 15, 20]

const EDU_OPTIONS: { value: Education; label: string }[] = [
  { value: 'none', label: 'Ohne' },
  { value: 'ausbildung', label: 'Ausbildung' },
  { value: 'studium', label: 'Studium' },
]

export function TeamCard({ team, defaultOpen = true }: { team: Team; defaultOpen?: boolean }) {
  const {
    state,
    adjustCash,
    undoTransaction,
    setSalary,
    payBeerTax,
    addActionCard,
    removeActionCard,
    renameTeam,
    setPlayers,
    addBeer,
    setEducation,
    buyStock,
    removeStock,
    payoutStock,
  } = useStore()

  const [open, setOpen] = useState(defaultOpen)
  const [modal, setModal] = useState<null | 'cash' | 'beruf' | 'stock'>(null)
  const [flash, setFlash] = useState<string | null>(null)

  const gehalt = state.decks.find((d) => d.type === 'salary')
  const actionDecks = state.decks.filter((d) => d.type === 'action' || d.type === 'special')

  const heldTitles = new Set(team.actionCards.map((c) => c.title))

  const showFlash = (msg: string) => {
    setFlash(msg)
    window.setTimeout(() => setFlash((f) => (f === msg ? null : f)), 2500)
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

  const tryBuyStock = () => {
    if (!buyStock(team.id)) showFlash(`Zu wenig KK – Aktie kostet ${STOCK_PRICE} KK.`)
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
          {/* Spieleranzahl */}
          <div className="row">
            <div className="row-main">
              <span className="row-label">👤 Spieler</span>
              <span className="row-value">{team.players}</span>
            </div>
            <div className="quick-pair">
              <button
                className="btn small minus"
                onClick={() => setPlayers(team.id, team.players - 1)}
              >
                −
              </button>
              <button
                className="btn small plus"
                onClick={() => setPlayers(team.id, team.players + 1)}
              >
                +
              </button>
            </div>
          </div>

          {/* Beruf mit Ausbildungs-Auswahl */}
          <div className="row">
            <div className="row-main">
              <span className="row-label">💼 Beruf</span>
              {team.job && team.job.title ? (
                <span className="row-value">{team.job.title}</span>
              ) : (
                <span className="row-value muted">Kein Beruf</span>
              )}
            </div>
            <button className="btn small" onClick={() => setModal('beruf')}>
              💼 Wählen
            </button>
          </div>

          <div className="edu-toggle">
            <span className="edu-label muted small">Ausbildung:</span>
            {EDU_OPTIONS.map((o) => (
              <button
                key={o.value}
                className={team.education === o.value ? 'edu-opt active' : 'edu-opt'}
                onClick={() => setEducation(team.id, o.value)}
              >
                {o.label}
              </button>
            ))}
          </div>

          {/* Gehalt */}
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

          {/* Aktie (max. 1 pro Team) */}
          <div className="section">
            <div className="section-head">
              <h4>📈 Aktie</h4>
            </div>
            {team.stock ? (
              <div className="cash-controls">
                <span className="stock-owned">Aktie im Besitz ✓</span>
                <button className="btn small plus" onClick={() => setModal('stock')}>
                  💸 Auszahlung buchen
                </button>
                <button className="btn tiny ghost" onClick={() => removeStock(team.id)}>
                  entfernen
                </button>
              </div>
            ) : (
              <button
                className="btn small"
                disabled={team.cash < STOCK_PRICE}
                onClick={tryBuyStock}
              >
                📈 Aktie kaufen (−{STOCK_PRICE} KK)
              </button>
            )}
          </div>

          {/* Biere zählen (für die Endstatistik) */}
          <div className="section">
            <div className="section-head">
              <h4>🍺 Biere</h4>
            </div>
            <div className="beer-counters">
              <BeerCounter
                label="Biere"
                value={team.beers.normal}
                onChange={(d) => addBeer(team.id, 'normal', d)}
              />
              <BeerCounter
                label="Spaß"
                value={team.beers.fun}
                onChange={(d) => addBeer(team.id, 'fun', d)}
              />
              <BeerCounter
                label="Strafe"
                value={team.beers.penalty}
                onChange={(d) => addBeer(team.id, 'penalty', d)}
              />
            </div>
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
                      title="Karte benutzen / ablegen (zählt als ausgespielt)"
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

      {modal === 'beruf' && <BerufChooser team={team} onClose={() => setModal(null)} />}

      {modal === 'stock' && (
        <StockModal
          onClose={() => setModal(null)}
          onSubmit={(amount) => {
            payoutStock(team.id, amount)
            setModal(null)
            showFlash(`Aktien-Auszahlung +${amount} KK`)
          }}
        />
      )}
    </article>
  )
}

// ---- Kleine Bausteine ------------------------------------------------------

function BeerCounter({
  label,
  value,
  onChange,
}: {
  label: string
  value: number
  onChange: (delta: number) => void
}) {
  return (
    <div className="beer-counter">
      <span className="beer-count">{value}</span>
      <span className="beer-label muted small">{label}</span>
      <div className="beer-btns">
        <button className="btn tiny minus" onClick={() => onChange(-1)} aria-label={`${label} weniger`}>
          −
        </button>
        <button className="btn tiny plus" onClick={() => onChange(1)} aria-label={`${label} mehr`}>
          +
        </button>
      </div>
    </div>
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

function StockModal({
  onClose,
  onSubmit,
}: {
  onClose: () => void
  onSubmit: (amount: number) => void
}) {
  const [value, setValue] = useState('')
  const num = Number(value)
  const valid = value !== '' && !Number.isNaN(num) && num > 0
  return (
    <Modal title="📈 Aktien-Auszahlung" onClose={onClose}>
      <p className="muted small">
        Wenn die Aktien-Zahl gewürfelt wurde: gib die Auszahlung in KK ein.
      </p>
      <label className="field">
        <span>Betrag in KK</span>
        <input
          type="number"
          inputMode="numeric"
          autoFocus
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="z. B. 30"
        />
      </label>
      <div className="modal-actions">
        <button className="btn ghost" onClick={onClose}>
          Abbrechen
        </button>
        <button className="btn primary" disabled={!valid} onClick={() => onSubmit(num)}>
          Gutschreiben
        </button>
      </div>
    </Modal>
  )
}
