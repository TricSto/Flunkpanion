import { useState } from 'react'
import { useStore } from '../store'
import type { Card, Deck } from '../types'

export function AdminView() {
  const { state, addTeam, renameTeam, removeTeam, setPlayers, updateDecks, resetAll } =
    useStore()
  const [name, setName] = useState('')
  const [players, setPlayersInput] = useState('2')
  const [openDeck, setOpenDeck] = useState<string | null>(null)

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return
    addTeam(name, Number(players) || 1)
    setName('')
    setPlayersInput('2')
  }

  const updateDeck = (id: string, fn: (d: Deck) => Deck) =>
    updateDecks(state.decks.map((d) => (d.id === id ? fn(d) : d)))

  const updateCard = (deckId: string, cardId: string, patch: Partial<Card>) =>
    updateDeck(deckId, (d) => ({
      ...d,
      cards: d.cards.map((c) => (c.id === cardId ? { ...c, ...patch } : c)),
    }))

  const addCard = (deck: Deck) =>
    updateDeck(deck.id, (d) => ({
      ...d,
      cards: [
        ...d.cards,
        {
          id: `c${Date.now()}${d.cards.length}`,
          title: 'Neue Karte',
          detail: '',
          amount: null,
          ...(d.type === 'job' || d.type === 'salary' ? { salary: 0, beerTax: 0 } : {}),
        },
      ],
    }))

  const removeCard = (deckId: string, cardId: string) =>
    updateDeck(deckId, (d) => ({ ...d, cards: d.cards.filter((c) => c.id !== cardId) }))

  return (
    <section>
      {/* Teams verwalten */}
      <h2 className="admin-h">Teams</h2>
      <p className="muted small settings-intro">
        Legt hier die Teams für euer Spiel an und zählt die Spieler. Die Spieler
        wählen ihr Team dann im Tab „Teams“.
      </p>

      <form className="add-team" onSubmit={submit}>
        <input
          type="text"
          placeholder="Teamname eingeben…"
          value={name}
          onChange={(e) => setName(e.target.value)}
          aria-label="Teamname"
        />
        <input
          className="players-input"
          type="number"
          inputMode="numeric"
          min={1}
          value={players}
          onChange={(e) => setPlayersInput(e.target.value)}
          aria-label="Anzahl Spieler"
          title="Anzahl Spieler"
        />
        <button type="submit" className="btn primary">
          + Team
        </button>
      </form>

      {state.teams.length === 0 ? (
        <p className="muted small">Noch keine Teams angelegt.</p>
      ) : (
        <ul className="admin-team-list">
          {state.teams.map((t) => (
            <li key={t.id} className="admin-team-row">
              <span className="other-dot" style={{ background: t.color }} />
              <span className="admin-team-name">{t.name}</span>
              <span className="muted small admin-players">
                <button
                  className="btn tiny"
                  onClick={() => setPlayers(t.id, t.players - 1)}
                  aria-label="Ein Spieler weniger"
                >
                  −
                </button>
                {t.players}👤
                <button
                  className="btn tiny"
                  onClick={() => setPlayers(t.id, t.players + 1)}
                  aria-label="Ein Spieler mehr"
                >
                  +
                </button>
              </span>
              <button
                className="btn tiny ghost"
                onClick={() => {
                  const next = prompt('Neuer Teamname', t.name)
                  if (next != null) renameTeam(t.id, next)
                }}
              >
                Umbenennen
              </button>
              <button
                className="btn tiny danger"
                onClick={() => {
                  if (confirm(`Team „${t.name}“ wirklich löschen?`)) removeTeam(t.id)
                }}
              >
                Löschen
              </button>
            </li>
          ))}
        </ul>
      )}

      {/* Decks & Karten */}
      <h2 className="admin-h">Decks &amp; Karten</h2>
      <p className="muted small settings-intro">
        Passt Berufe, Gehälter und alle Kartenstapel an. Änderungen werden
        automatisch gespeichert.
      </p>

      {state.decks.map((deck) => {
        const hasSalary = deck.type === 'job' || deck.type === 'salary'
        const open = openDeck === deck.id
        return (
          <div key={deck.id} className="settings-table">
            <button
              className="settings-deck-head"
              onClick={() => setOpenDeck(open ? null : deck.id)}
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
                      {hasSalary ? (
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
                  onClick={() => addCard(deck)}
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
