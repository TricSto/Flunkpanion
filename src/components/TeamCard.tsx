import { useState } from 'react'
import type { ActionCard, ActionCardKind, Team } from '../types'
import { STOCK_NUMBERS, STOCK_PRICE } from '../types'
import { useStore } from '../store'
import { formatMoney, formatTime, pickRandom } from '../util'
import { Modal } from './Modal'
import { BerufChooser } from './BerufChooser'

const QUICK_AMOUNTS = [5, 10, 15, 20]

/** Karten, die jünger sind, bekommen die „gerade gezogen"-Animation. */
const JUST_ADDED_MS = 1500

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
    buyStock,
    removeStock,
    payoutStock,
  } = useStore()

  const [open, setOpen] = useState(defaultOpen)
  const [modal, setModal] = useState<null | 'cash' | 'beruf' | 'stock' | 'stockbuy' | 'jobinfo'>(
    null,
  )
  const [flash, setFlash] = useState<string | null>(null)

  const gehalt = state.decks.find((d) => d.type === 'salary')
  const berufeDeck = state.decks.find((d) => d.type === 'job')
  const jobCard = team.job ? berufeDeck?.cards.find((c) => c.title === team.job!.title) : null

  const heldTitles = new Set(team.actionCards.map((c) => c.title))
  const normalCards = team.actionCards.filter((c) => c.kind !== 'special')
  const specialCards = team.actionCards.filter((c) => c.kind === 'special')

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

  const drawAction = (kind: ActionCardKind) => {
    const deck = state.decks.find((d) => d.type === kind)
    if (!deck) return
    // Keine Doppelten: nur Karten ziehen, die das Team noch nicht hat.
    const available = deck.cards.filter((c) => !heldTitles.has(c.title))
    if (available.length === 0) {
      showFlash(`Alle Karten aus „${deck.name}“ bereits im Team`)
      return
    }
    const card = pickRandom(available)!
    addActionCard(team.id, card.title, card.detail, kind)
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
        {!open && <span className="cash-value">{formatMoney(team.cash)}</span>}
      </header>

      {flash && <div className="flash">{flash}</div>}

      {open && (
        <div className="team-body">
          {/* Kopfzeile: links Beruf & Gehalt, rechts Kronkorken & Spieler */}
          <div className="head-grid">
            <div className="head-left">
              <button
                className="head-stat tappable"
                onClick={() => setModal(team.job?.title ? 'jobinfo' : 'beruf')}
              >
                <span className="row-label">💼 Beruf</span>
                <span className={team.job?.title ? 'row-value' : 'row-value choose'}>
                  {team.job?.title || 'wählen'}
                </span>
              </button>
              <div className="head-stat">
                <span className="row-label">💶 Gehalt</span>
                {team.job && team.job.salary > 0 ? (
                  <span className="row-value">
                    {formatMoney(team.job.salary)}
                    {team.job.beerTax > 0 && <span className="muted"> · BS {team.job.beerTax}</span>}
                  </span>
                ) : (
                  <span className="row-value muted">—</span>
                )}
              </div>
            </div>
            <div className="head-right">
              <div className="head-cash">
                <span className="cash-value">{formatMoney(team.cash)}</span>
                <span className="cash-label">Kronkorken</span>
              </div>
              <div className="head-players">
                <button
                  className="btn tiny minus"
                  onClick={() => setPlayers(team.id, team.players - 1)}
                  aria-label="Ein Spieler weniger"
                >
                  −
                </button>
                <span className="head-players-value">👤 {team.players}</span>
                <button
                  className="btn tiny plus"
                  onClick={() => setPlayers(team.id, team.players + 1)}
                  aria-label="Ein Spieler mehr"
                >
                  +
                </button>
              </div>
            </div>
          </div>

          {/* Zeile 2: links Aktie, rechts Gehalt (daumenfreundlich) */}
          <div className="mid-grid">
            <div className="mid-col">
              <span className="row-label">📈 Aktie</span>
              {team.stockNumber != null ? (
                <>
                  <span className="stock-owned">Nr. {team.stockNumber} ✓</span>
                  <button className="btn small plus" onClick={() => setModal('stock')}>
                    💸 Auszahlung
                  </button>
                  <button className="btn tiny ghost" onClick={() => removeStock(team.id)}>
                    entfernen
                  </button>
                </>
              ) : (
                <button className="btn small" onClick={() => setModal('stockbuy')}>
                  📈 kaufen (−{STOCK_PRICE} KK)
                </button>
              )}
            </div>
            <div className="mid-col">
              <span className="row-label">💶 Gehalt</span>
              <button className="btn small" onClick={rollGehalt}>
                🎲 würfeln
              </button>
              {team.job && team.job.salary > 0 && (
                <>
                  <button
                    className="btn small plus"
                    onClick={() =>
                      adjustCash(team.id, team.job!.salary, `Gehalt: ${team.job!.title || 'Job'}`)
                    }
                  >
                    auszahlen +{team.job.salary}
                  </button>
                  {team.job.beerTax > 0 && (
                    <button className="btn small minus" onClick={() => payBeerTax(team.id)}>
                      Biersteuer −{team.job.beerTax}
                    </button>
                  )}
                </>
              )}
            </div>
          </div>

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

          {/* Aktionskarten – getrennt nach normal & spielverändernd */}
          <CardSection
            title="🃏 Aktionskarten"
            kind="action"
            cards={normalCards}
            onDraw={() => drawAction('action')}
            onRemove={(id) => removeActionCard(team.id, id)}
          />
          <CardSection
            title="⚡ Spielverändernd"
            kind="special"
            cards={specialCards}
            onDraw={() => drawAction('special')}
            onRemove={(id) => removeActionCard(team.id, id)}
          />

          {/* Bierzähler (für die Endstatistik) */}
          <div className="section">
            <div className="section-head">
              <h4>🍺 Biere</h4>
            </div>
            <div className="beer-counters single">
              <BeerCounter
                label="Biere"
                value={team.beers.normal}
                onChange={(d) => addBeer(team.id, 'normal', d)}
              />
            </div>
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

      {modal === 'jobinfo' && team.job && (
        <Modal title={`💼 ${team.job.title}`} onClose={() => setModal(null)}>
          <p className="jobinfo-detail">
            {jobCard?.detail || 'Keine Beschreibung hinterlegt.'}
          </p>
          <div className="modal-actions">
            <button
              className="btn ghost"
              onClick={() => setModal('beruf')}
              title="Neuen Beruf über Ausbildung/Studium wählen"
            >
              Beruf neu wählen
            </button>
            <button className="btn primary" onClick={() => setModal(null)}>
              Alles klar
            </button>
          </div>
        </Modal>
      )}

      {modal === 'stockbuy' && (
        <StockPickerModal
          team={team}
          teams={state.teams}
          onClose={() => setModal(null)}
          onPick={(nr) => {
            if (buyStock(team.id, nr)) {
              setModal(null)
              showFlash(`Aktie Nr. ${nr} gekauft (−${STOCK_PRICE} KK)`)
            }
          }}
        />
      )}

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

function CardSection({
  title,
  kind,
  cards,
  onDraw,
  onRemove,
}: {
  title: string
  kind: ActionCardKind
  cards: ActionCard[]
  onDraw: () => void
  onRemove: (cardId: string) => void
}) {
  return (
    <div className="section">
      <div className="section-head">
        <h4>
          {title} ({cards.length})
        </h4>
        <button className="btn small" onClick={onDraw}>
          🎲 ziehen
        </button>
      </div>
      {cards.length === 0 ? (
        <p className="muted small">Noch keine Karten gezogen.</p>
      ) : (
        <ul className="chip-list">
          {cards.map((c) => (
            <li
              key={c.id}
              className={[
                'chip',
                kind === 'special' ? 'chip-special' : 'chip-action',
                Date.now() - c.createdAt < JUST_ADDED_MS ? 'chip-in' : '',
              ]
                .filter(Boolean)
                .join(' ')}
            >
              <span className="chip-text">
                <strong>{c.title}</strong>
                {c.note && <em> — {c.note}</em>}
              </span>
              <button
                className="chip-x"
                onClick={() => onRemove(c.id)}
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
  )
}

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

function StockPickerModal({
  team,
  teams,
  onClose,
  onPick,
}: {
  team: Team
  teams: Team[]
  onClose: () => void
  onPick: (nr: number) => void
}) {
  const ownerOf = (nr: number) => teams.find((t) => t.id !== team.id && t.stockNumber === nr)
  const affordable = team.cash >= STOCK_PRICE
  return (
    <Modal title="📈 Aktie kaufen" onClose={onClose}>
      <p className="muted small">
        Such dir eine freie Zahl aus (kostet {STOCK_PRICE} KK). Vergebene Zahlen
        gehören schon anderen Teams.
      </p>
      {!affordable && (
        <p className="form-error">Zu wenig KK – eine Aktie kostet {STOCK_PRICE} KK.</p>
      )}
      <div className="stock-grid">
        {STOCK_NUMBERS.map((nr) => {
          const owner = ownerOf(nr)
          return (
            <button
              key={nr}
              className={owner ? 'stock-num taken' : 'stock-num'}
              disabled={Boolean(owner) || !affordable}
              onClick={() => onPick(nr)}
            >
              <span className="stock-num-value">{nr}</span>
              {owner && <span className="stock-num-owner">{owner.name}</span>}
            </button>
          )
        })}
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
