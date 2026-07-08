import { useState } from 'react'
import { useStore } from '../store'
import type { Card, Deck } from '../types'

export function SettingsView() {
  const { state, updateDecks, resetAll } = useStore()
  const [openId, setOpenId] = useState<string | null>(null)

  const updateDeck = (id: string, fn: (d: Deck) => Deck) => {
    updateDecks(state.decks.map((d) => (d.id === id ? fn(d) : d)))
  }

  const updateCard = (deckId: string, cardId: string, patch: Partial<Card>) => {
    updateDeck(deckId, (d) => ({
      ...d,
      cards: d.cards.map((c) => (c.id === cardId ? { ...c, ...patch } : c)),
    }))
  }

  const addCard = (deckId: string, isJob: boolean) => {
    updateDeck(deckId, (d) => ({
      ...d,
      cards: [
        ...d.cards,
        {
          id: `c${Date.now()}${d.cards.length}`,
          title: 'Neue Karte',
          detail: '',
          amount: null,
          ...(isJob ? { salary: 0, beerTax: 0 } : {}),
        },
      ],
    }))
  }

  const removeCard = (deckId: string, cardId: string) => {
    updateDeck(deckId, (d) => ({ ...d, cards: d.cards.filter((c) => c.id !== cardId) }))
  }

  return (
    <section>
      <p className="muted small settings-intro">
        Hier könnt ihr alle Decks und Karten anpassen. Änderungen werden
        automatisch gespeichert.
      </p>

      {state.decks.map((deck) => {
        const isJob = deck.type === 'job'
        const open = openId === deck.id
        return (
          <div key={deck.id} className="settings-table">
            <button
              className="settings-deck-head"
              onClick={() => setOpenId(open ? null : deck.id)}
            >
              <span>
                {deck.icon} <strong>{deck.name}</strong>{' '}
                <span className="muted small">
                  ({deck.cards.length} · {deck.mode === 'roll' ? 'Würfeln' : 'Ziehen'})
                </span>
              </span>
              <span className="chevron">{open ? '▾' : '▸'}</span>
            </button>

            {open && (
              <div className="settings-deck-body">
                <label className="field">
                  <span>Deck-Name</span>
                  <input
                    type="text"
                    value={deck.name}
                    onChange={(e) =>
                      updateDeck(deck.id, (d) => ({ ...d, name: e.target.value }))
                    }
                  />
                </label>

                <div className="settings-entries">
                  {deck.cards.map((card, i) => (
                    <div key={card.id} className="settings-card">
                      <div className="settings-card-head">
                        <span className="settings-roll">{i + 1}</span>
                        <button
                          className="btn tiny danger ghost"
                          onClick={() => removeCard(deck.id, card.id)}
                        >
                          entfernen
                        </button>
                      </div>
                      <input
                        type="text"
                        value={card.title}
                        placeholder="Titel"
                        onChange={(e) =>
                          updateCard(deck.id, card.id, { title: e.target.value })
                        }
                      />
                      <input
                        type="text"
                        value={card.detail}
                        placeholder="Beschreibung (optional)"
                        onChange={(e) =>
                          updateCard(deck.id, card.id, { detail: e.target.value })
                        }
                      />
                      {isJob ? (
                        <div className="settings-inline">
                          <input
                            type="number"
                            inputMode="numeric"
                            value={card.salary ?? ''}
                            placeholder="Gehalt"
                            onChange={(e) =>
                              updateCard(deck.id, card.id, {
                                salary: Number(e.target.value) || 0,
                              })
                            }
                          />
                          <input
                            type="number"
                            inputMode="numeric"
                            value={card.beerTax ?? ''}
                            placeholder="Biersteuer"
                            onChange={(e) =>
                              updateCard(deck.id, card.id, {
                                beerTax: Number(e.target.value) || 0,
                              })
                            }
                          />
                        </div>
                      ) : (
                        <input
                          type="number"
                          inputMode="numeric"
                          value={card.amount ?? ''}
                          placeholder="KK-Betrag (optional)"
                          onChange={(e) =>
                            updateCard(deck.id, card.id, {
                              amount: e.target.value === '' ? null : Number(e.target.value),
                            })
                          }
                        />
                      )}
                    </div>
                  ))}
                </div>

                <button
                  className="btn small ghost add-card-btn"
                  onClick={() => addCard(deck.id, isJob)}
                >
                  + Karte hinzufügen
                </button>
              </div>
            )}
          </div>
        )
      })}

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
    </section>
  )
}
