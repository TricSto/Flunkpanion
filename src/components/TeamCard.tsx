import { useState, type CSSProperties } from 'react'
import type { ActionCard, ActionCardKind, Team } from '../types'
import { STOCK_NUMBERS, STOCK_PRICE } from '../types'
import { useStore } from '../store'
import { formatMoney, formatTime, pickRandom } from '../util'
import { Modal } from './Modal'
import { FlashPopover } from './FlashPopover'
import { BerufChooser } from './BerufChooser'
import { FieldIcon } from './FieldIcon'

/** Karten, die jünger sind, bekommen die „gerade gezogen"-Animation. */
const JUST_ADDED_MS = 1500

export function TeamCard({ team, defaultOpen = true }: { team: Team; defaultOpen?: boolean }) {
  const {
    state,
    adjustCash,
    undoTransaction,
    removeActionCard,
    renameTeam,
    setPlayers,
    addBeer,
    buyStock,
    removeStock,
    payoutStockCard,
    setSalary,
  } = useStore()

  const [open, setOpen] = useState(defaultOpen)
  const [modal, setModal] = useState<null | 'cash' | 'beruf' | 'stock' | 'stockbuy' | 'jobinfo'>(
    null,
  )
  const [flash, setFlash] = useState<string | null>(null)

  const berufeDeck = state.decks.find((d) => d.type === 'job')
  const jobCard = team.job ? berufeDeck?.cards.find((c) => c.title === team.job!.title) : null

  const normalCards = team.actionCards.filter((c) => c.kind !== 'special')
  const specialCards = team.actionCards.filter((c) => c.kind === 'special')

  // Anfangsgehalt: einmalig direkt auf der Gehalt-Kachel würfeln (#57).
  // Sobald ein Gehalt gesetzt ist, wird die Kachel zur reinen Anzeige.
  const rollStartGehalt = () => {
    const card = pickRandom(state.decks.find((d) => d.type === 'salary')?.cards ?? [])
    if (!card) return
    setSalary(team.id, card.salary ?? 0, card.beerTax ?? 0)
    setFlash(`💶 Anfangsgehalt: ${formatMoney(card.salary ?? 0)} · BS ${card.beerTax ?? 0}`)
  }


  return (
    <article
      className="team-card"
      style={{ '--team': team.color } as CSSProperties}
    >
      <header className="team-card-head">
        <button className="team-name" onClick={() => setOpen((o) => !o)}>
          <span className="chevron">{open ? '▾' : '▸'}</span>
          {team.name}
        </button>
        <div className="head-cash">
          <span className="cash-value">{formatMoney(team.cash)}</span>
          <span className="cash-label">Kronkorken</span>
        </div>
      </header>

      {flash && <FlashPopover message={flash} onClose={() => setFlash(null)} />}

      {open && (
        <div className="team-body">
          {/* Das Wichtigste auf einen Blick: Beruf, Gehalt, Spieler, Aktie */}
          <div className="stat-grid">
            <button
              className="stat-tile tap"
              onClick={() => setModal(team.job?.title ? 'jobinfo' : 'beruf')}
            >
              <span className="stat-tile-icon">💼</span>
              <span className="stat-tile-body">
                <span className="stat-tile-label">Beruf</span>
                <span className={team.job?.title ? 'stat-tile-value' : 'stat-tile-value choose'}>
                  {team.job?.title || 'wählen'}
                </span>
              </span>
            </button>

            {team.job && team.job.salary > 0 ? (
              <div className="stat-tile">
                <span className="stat-tile-icon">💶</span>
                <span className="stat-tile-body">
                  <span className="stat-tile-label">Gehalt</span>
                  <span className="stat-tile-value">
                    {formatMoney(team.job.salary)}
                    {/* Dauerhafter Bonus („Gehaltserhöhung") – zählt bei jeder Auszahlung. */}
                    {team.salaryBonus > 0 && (
                      <span className="salary-bonus">+{team.salaryBonus}</span>
                    )}
                    {team.job.beerTax > 0 && <span className="muted"> · BS {team.job.beerTax}</span>}
                  </span>
                </span>
              </div>
            ) : (
              // Anfangsgehalt einmalig direkt auf der Kachel würfeln (#57);
              // danach ist die Kachel wieder eine reine Anzeige.
              <button className="stat-tile tap" onClick={rollStartGehalt}>
                <span className="stat-tile-icon">💶</span>
                <span className="stat-tile-body">
                  <span className="stat-tile-label">Gehalt</span>
                  <span className="stat-tile-value choose">würfeln</span>
                </span>
              </button>
            )}

            <div className="stat-tile">
              <span className="stat-tile-icon">👥</span>
              <span className="stat-tile-body">
                <span className="stat-tile-label">Spieler</span>
                <span className="stat-tile-value">{team.players}</span>
              </span>
              <span className="stat-tile-btns">
                <button
                  className="btn tiny minus"
                  onClick={() => setPlayers(team.id, team.players - 1)}
                  aria-label="Ein Spieler weniger"
                >
                  −
                </button>
                <button
                  className="btn tiny plus"
                  onClick={() => setPlayers(team.id, team.players + 1)}
                  aria-label="Ein Spieler mehr"
                >
                  +
                </button>
              </span>
            </div>

            <button
              className="stat-tile tap"
              onClick={() => setModal(team.stockNumber != null ? 'stock' : 'stockbuy')}
            >
              <span className="stat-tile-icon">📈</span>
              <span className="stat-tile-body">
                <span className="stat-tile-label">Aktie</span>
                {team.stockNumber != null ? (
                  <span className="stat-tile-value stock-owned">Nr. {team.stockNumber} ✓</span>
                ) : (
                  <span className="stat-tile-value choose">kaufen (−{STOCK_PRICE} KK)</span>
                )}
              </span>
            </button>
          </div>

          {/* Gehalt würfeln/auszahlen & Biersteuer laufen bewusst NUR über die
              Spiel-Seite (Feedback #23) – hier keine Buttons mehr dafür. */}

          {/* Kronkorken buchen: −1 · Betrag · +1 */}
          <div className="cash-controls">
            <button
              className="btn small minus"
              onClick={() => adjustCash(team.id, -1, 'Schnellbuchung')}
            >
              −1
            </button>
            <button className="btn small book" onClick={() => setModal('cash')}>
              <FieldIcon kind="zahltag" /> Betrag buchen
            </button>
            <button
              className="btn small plus"
              onClick={() => adjustCash(team.id, 1, 'Schnellbuchung')}
            >
              +1
            </button>
          </div>

          {/* Aktionskarten – getrennt nach normal & Game Changer. Gezogen
              wird nur über die Spiel-Seite (Feedback #24), hier werden die
              Karten nur angezeigt und ausgespielt. */}
          <CardSection
            title="Aktionskarten"
            kind="action"
            cards={normalCards}
            onRemove={(id) => removeActionCard(team.id, id)}
          />
          <CardSection
            title="Game Changer"
            kind="special"
            cards={specialCards}
            onRemove={(id) => removeActionCard(team.id, id)}
          />

          {/* Bierzähler (für die Endstatistik) */}
          <div className="section">
            <div className="section-head">
              <h4>
                <FieldIcon kind="flunk" /> Biere
              </h4>
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
              setFlash(`Aktie Nr. ${nr} gekauft (−${STOCK_PRICE} KK)`)
            }
          }}
        />
      )}

      {modal === 'stock' && (
        <StockModal
          stockNumber={team.stockNumber!}
          onClose={() => setModal(null)}
          onRemove={() => {
            removeStock(team.id)
            setModal(null)
            setFlash('Aktie abgegeben')
          }}
          onDraw={() => payoutStockCard(team.id)}
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
  onRemove,
}: {
  title: string
  kind: ActionCardKind
  cards: ActionCard[]
  onRemove: (cardId: string) => void
}) {
  return (
    <div className="section">
      <div className="section-head">
        <h4>
          <FieldIcon kind={kind === 'special' ? 'gamechanger' : 'aktion'} /> {title} (
          {cards.length})
        </h4>
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
              <span className="chip-icon" aria-hidden="true">
                <FieldIcon kind={kind === 'special' ? 'gamechanger' : 'aktion'} size="16px" />
              </span>
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
  stockNumber,
  onClose,
  onRemove,
  onDraw,
}: {
  stockNumber: number
  onClose: () => void
  onRemove: () => void
  /** Zieht die Aktionskarten-Belohnung und gibt sie zurück (Feedback #30/#31). */
  onDraw: () => ActionCard | null
}) {
  const [drawn, setDrawn] = useState<ActionCard | null>(null)
  return (
    <Modal title={`📈 Aktie Nr. ${stockNumber}`} onClose={onClose}>
      {drawn === null ? (
        <>
          <p className="muted small">
            Wurde eure Zahl <strong>{stockNumber}</strong> geworfen? Dann gibt es
            dafür eine zufällige Aktionskarte.
          </p>
          <button className="btn primary block" onClick={() => setDrawn(onDraw())}>
            🎲 Zahl {stockNumber} geworfen – Aktionskarte ziehen
          </button>
          <div className="modal-actions">
            <button className="btn danger ghost" onClick={onRemove}>
              Aktie abgeben
            </button>
            <button className="btn ghost" onClick={onClose}>
              Abbrechen
            </button>
          </div>
        </>
      ) : (
        <>
          <div className="drawn-card reward-card">
            <strong className="drawn-title">{drawn.title}</strong>
            {drawn.note && <p className="drawn-detail">{drawn.note}</p>}
          </div>
          <p className="muted small">Die Karte liegt im Team-Inventar.</p>
          <div className="modal-actions">
            <button className="btn primary" onClick={onClose}>
              Alles klar
            </button>
          </div>
        </>
      )}
    </Modal>
  )
}
