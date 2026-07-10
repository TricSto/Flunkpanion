import { useState, type CSSProperties } from 'react'
import { useStore } from '../store'
import type { Card, Deck } from '../types'
import { ALL_GAME_FIELDS, gameFieldColor } from '../data/gameFields'
import { formatMoney } from '../util'
import { Modal } from './Modal'
import { DECK_ICON_KIND, FieldIcon } from './FieldIcon'

/**
 * Karten-Seite (rechts neben dem Spielbrett): Hier lassen sich alle Inhalte
 * der Spiel-Seite bearbeiten – die Farbe jedes Felds und die Karten der
 * einzelnen Decks (Berufe, Gehalt, Aktionskarten, Game Changer, Challenges,
 * Ereignisse). Alle Änderungen werden global auf dem Server gespeichert
 * (Tabelle app_content) und gelten dauerhaft – auch für alle zukünftigen
 * Spiele/Sessions, nicht nur für die laufende.
 */
export function KartenView() {
  const { state, setFieldColor, resetFieldColors, resetDecks } = useStore()
  const [openDeckId, setOpenDeckId] = useState<string | null>(null)
  const [edit, setEdit] = useState<{ deckId: string; cardId: string } | null>(null)
  const [confirmReset, setConfirmReset] = useState(false)

  const hasColorOverrides = Object.keys(state.fieldColors).length > 0

  // Die bearbeitete Karte immer frisch aus dem Zustand lesen, damit das
  // Editor-Fenster Live-Änderungen (auch von anderen Geräten) zeigt.
  const editDeck = edit ? state.decks.find((d) => d.id === edit.deckId) ?? null : null
  const editCard = editDeck ? editDeck.cards.find((c) => c.id === edit!.cardId) ?? null : null

  return (
    <section className="karten">
      <p className="muted small feedback-intro">
        Inhalte der Spiel-Seite bearbeiten: Feldfarben einstellen und die
        Karten der einzelnen Decks anpassen. Alles wird automatisch dauerhaft
        gespeichert – auch für zukünftige Spiele – und live geteilt.
      </p>

      {/* ---- Feldfarben ---------------------------------------------------- */}
      <div className="settings-table">
        <div className="karten-section-head">
          <h3 className="karten-section-title">🎨 Feldfarben</h3>
          {hasColorOverrides && (
            <button className="btn small ghost" onClick={resetFieldColors}>
              ↩︎ Alle zurücksetzen
            </button>
          )}
        </div>
        <p className="muted small">
          Farbe der Felder auf der Spiel-Seite – gilt für alle Geräte.
        </p>
        <div className="karten-color-list">
          {ALL_GAME_FIELDS.map((f) => {
            const color = gameFieldColor(f, state.fieldColors)
            const overridden = state.fieldColors[f.key] != null
            return (
              <div key={f.key} className="karten-color-row">
                <span
                  className="karten-color-tile"
                  style={{ '--tile': color } as CSSProperties}
                >
                  <FieldIcon kind={f.icon} size="20px" />
                </span>
                <span className="karten-color-name">
                  {f.label}
                  <span className="muted small">{f.sub}</span>
                </span>
                {overridden && (
                  <button
                    className="btn small ghost"
                    title="Standardfarbe wiederherstellen"
                    onClick={() => setFieldColor(f.key, null)}
                  >
                    ↩︎
                  </button>
                )}
                <input
                  type="color"
                  className="karten-color-input"
                  value={color}
                  aria-label={`Farbe für ${f.label}`}
                  onChange={(e) => setFieldColor(f.key, e.target.value)}
                />
              </div>
            )
          })}
        </div>
      </div>

      {/* ---- Karteninhalte -------------------------------------------------- */}
      <div className="settings-table">
        <div className="karten-section-head">
          <h3 className="karten-section-title">🃏 Karteninhalte</h3>
          <button className="btn small ghost" onClick={() => setConfirmReset(true)}>
            ↩︎ Alle zurücksetzen
          </button>
        </div>
        <p className="muted small">
          Deck antippen, dann eine Karte wählen, um Titel, Beschreibung und
          Werte zu ändern.
        </p>
        {state.decks.map((deck) => (
          <DeckPanel
            key={deck.id}
            deck={deck}
            open={openDeckId === deck.id}
            onToggle={() => setOpenDeckId((cur) => (cur === deck.id ? null : deck.id))}
            onEditCard={(cardId) => setEdit({ deckId: deck.id, cardId })}
          />
        ))}
      </div>

      {editDeck && editCard && (
        <CardEditor deck={editDeck} card={editCard} onClose={() => setEdit(null)} />
      )}

      {confirmReset && (
        <Modal title="↩︎ Decks zurücksetzen?" onClose={() => setConfirmReset(false)}>
          <p className="sheet-info">
            Alle Decks werden auf die mitgelieferten Karten zurückgesetzt.
            Selbst geänderte und hinzugefügte Karten gehen verloren.
          </p>
          <div className="event-actions">
            <button className="btn big ghost" onClick={() => setConfirmReset(false)}>
              Abbrechen
            </button>
            <button
              className="btn big minus"
              onClick={() => {
                resetDecks()
                setConfirmReset(false)
              }}
            >
              ↩︎ Zurücksetzen
            </button>
          </div>
        </Modal>
      )}
    </section>
  )
}

// ---------------------------------------------------------------------------

/** Kompakte Wert-Anzeige einer Karte für die Listenzeile. */
function cardMeta(deck: Deck, card: Card): string | null {
  if (deck.type === 'salary') {
    return `💶 ${formatMoney(card.salary ?? 0)} · BS ${card.beerTax ?? 0}`
  }
  if (card.amount != null && card.amount !== 0) {
    return `${card.amount > 0 ? '+' : ''}${formatMoney(card.amount)}`
  }
  return null
}

/** Auf-/zuklappbares Deck mit seiner Kartenliste. */
function DeckPanel({
  deck,
  open,
  onToggle,
  onEditCard,
}: {
  deck: Deck
  open: boolean
  onToggle: () => void
  onEditCard: (cardId: string) => void
}) {
  const { addDeckCard } = useStore()

  return (
    <div className="karten-deck">
      <button className="settings-deck-head" onClick={onToggle}>
        <span className="karten-deck-name">
          <FieldIcon kind={DECK_ICON_KIND[deck.type]} /> {deck.name}
          <span className="muted small"> · {deck.cards.length} Karten</span>
        </span>
        <span className="karten-deck-chevron">{open ? '▾' : '▸'}</span>
      </button>
      {open && (
        <div className="settings-deck-body">
          <div className="karten-card-list">
            {deck.cards.map((card, i) => {
              const meta = cardMeta(deck, card)
              return (
                <button
                  key={card.id}
                  className="karten-card-row"
                  onClick={() => onEditCard(card.id)}
                >
                  <span className="karten-card-num">{i + 1}</span>
                  <span className="karten-card-text">
                    <span className="karten-card-title">{card.title}</span>
                    {card.detail && (
                      <span className="karten-card-detail">{card.detail}</span>
                    )}
                  </span>
                  {meta && (
                    <span
                      className={
                        (card.amount ?? 0) < 0
                          ? 'karten-card-meta neg'
                          : 'karten-card-meta'
                      }
                    >
                      {meta}
                    </span>
                  )}
                </button>
              )
            })}
          </div>
          <button
            className="btn small ghost add-card-btn"
            onClick={() => onEditCard(addDeckCard(deck.id))}
          >
            ＋ Karte hinzufügen
          </button>
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------

/** Sheet zum Bearbeiten einer Karte: Titel, Beschreibung, Werte, Löschen. */
function CardEditor({
  deck,
  card,
  onClose,
}: {
  deck: Deck
  card: Card
  onClose: () => void
}) {
  const { updateDeckCard, removeDeckCard } = useStore()

  // Zahleneingabe: leeres Feld = kein Wert (null), sonst ganze Zahl.
  const toNumber = (raw: string): number | null => {
    if (raw.trim() === '' || raw === '-') return null
    const n = Math.round(Number(raw))
    return Number.isFinite(n) ? n : null
  }

  return (
    <Modal
      title={
        <>
          <FieldIcon kind={DECK_ICON_KIND[deck.type]} /> {deck.name} bearbeiten
        </>
      }
      onClose={onClose}
    >
      <label className="field">
        <span>Titel</span>
        <input
          type="text"
          value={card.title}
          onChange={(e) => updateDeckCard(deck.id, card.id, { title: e.target.value })}
        />
      </label>

      <label className="field">
        <span>Beschreibung / Effekt</span>
        <textarea
          rows={3}
          value={card.detail}
          onChange={(e) => updateDeckCard(deck.id, card.id, { detail: e.target.value })}
        />
      </label>

      {deck.type === 'salary' ? (
        <div className="karten-number-row">
          <label className="field">
            <span>Gehalt (KK)</span>
            <input
              type="number"
              value={card.salary ?? ''}
              onChange={(e) =>
                updateDeckCard(deck.id, card.id, { salary: toNumber(e.target.value) ?? 0 })
              }
            />
          </label>
          <label className="field">
            <span>Biersteuer (KK)</span>
            <input
              type="number"
              value={card.beerTax ?? ''}
              onChange={(e) =>
                updateDeckCard(deck.id, card.id, { beerTax: toNumber(e.target.value) ?? 0 })
              }
            />
          </label>
        </div>
      ) : deck.type === 'event' ? (
        <label className="field">
          <span>KK-Effekt (+ Gutschrift / − Abzug, leer = keiner)</span>
          <input
            type="number"
            value={card.amount ?? ''}
            onChange={(e) =>
              updateDeckCard(deck.id, card.id, { amount: toNumber(e.target.value) })
            }
          />
        </label>
      ) : null}

      <button
        className="btn danger block"
        onClick={() => {
          removeDeckCard(deck.id, card.id)
          onClose()
        }}
      >
        🗑️ Karte löschen
      </button>

      <button className="btn ghost block sheet-done" onClick={onClose}>
        ✓ Fertig
      </button>
    </Modal>
  )
}
