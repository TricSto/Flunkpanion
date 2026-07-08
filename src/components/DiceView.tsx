import { useState } from 'react'
import { useStore } from '../store'
import type { Card, Deck } from '../types'
import { formatMoney } from '../util'

export function DiceView() {
  const { state } = useStore()
  const [teamId, setTeamId] = useState<string>('')

  const selectedTeam = state.teams.find((t) => t.id === teamId) ?? null

  // Beruf, Gehalt und Aktionskarten werden direkt auf der Teamkarte gewürfelt.
  // Hier nur die gemeinsamen Decks für alle Teams.
  const sharedDecks = state.decks.filter((d) =>
    ['event', 'challenge'].includes(d.type),
  )

  return (
    <section>
      <div className="dice-team-picker">
        <label>
          Ergebnisse anwenden auf:
          <select value={teamId} onChange={(e) => setTeamId(e.target.value)}>
            <option value="">— kein Team —</option>
            {state.teams.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </label>
        {state.teams.length === 0 && (
          <p className="muted small">
            Lege zuerst im Tab „Admin“ ein Team an, um Ergebnisse direkt zu übernehmen.
          </p>
        )}
      </div>

      <div className="dice-tables">
        {sharedDecks.map((deck) => (
          <DeckCard key={deck.id} deck={deck} teamId={selectedTeam?.id ?? null} />
        ))}
      </div>
    </section>
  )
}

function DeckCard({ deck, teamId }: { deck: Deck; teamId: string | null }) {
  const [index, setIndex] = useState<number | null>(null)
  const [rolling, setRolling] = useState(false)

  const drawn: Card | undefined = index != null ? deck.cards[index] : undefined
  const isRoll = deck.mode === 'roll'

  const pick = () => deck.cards.length ? Math.floor(Math.random() * deck.cards.length) : 0

  const go = () => {
    if (deck.cards.length === 0) return
    setRolling(true)
    let ticks = 0
    const interval = setInterval(() => {
      setIndex(pick())
      ticks++
      if (ticks >= 8) {
        clearInterval(interval)
        setIndex(pick())
        setRolling(false)
      }
    }, 60)
  }

  return (
    <div className="dice-card">
      <div className="dice-card-head">
        <h3>
          <span className="deck-icon">{deck.icon}</span> {deck.name}
        </h3>
        <button className="btn primary dice-roll-btn" onClick={go} disabled={rolling}>
          <span className={rolling ? 'die spinning' : 'die'}>{isRoll ? '🎲' : '🃏'}</span>
          {index == null ? (isRoll ? 'Würfeln' : 'Ziehen') : 'Nochmal'}
        </button>
      </div>

      {drawn && (
        <div className={rolling ? 'drawn-card rolling' : 'drawn-card'}>
          <div className="drawn-top">
            {isRoll && <span className="drawn-roll">{index! + 1}</span>}
            <strong className="drawn-title">{drawn.title}</strong>
            {drawn.salary != null && (
              <span className="drawn-salary">
                {formatMoney(drawn.salary)}
                {drawn.beerTax ? ` · BS ${drawn.beerTax}` : ''}
              </span>
            )}
            {drawn.amount != null && drawn.amount !== 0 && (
              <span className={drawn.amount > 0 ? 'dice-amount pos' : 'dice-amount neg'}>
                {drawn.amount > 0 ? '+' : ''}
                {formatMoney(drawn.amount)}
              </span>
            )}
          </div>
          {drawn.detail && <p className="drawn-detail">{drawn.detail}</p>}

          {teamId && !rolling && <ApplyButtons deck={deck} card={drawn} teamId={teamId} />}
        </div>
      )}

      {deck.cards.length === 0 && <p className="muted small">Dieses Deck ist leer.</p>}
    </div>
  )
}

function ApplyButtons({
  deck,
  card,
  teamId,
}: {
  deck: Deck
  card: Card
  teamId: string
}) {
  const { adjustCash, setJob, addActionCard } = useStore()

  const buttons: React.ReactNode[] = []

  if (deck.type === 'job') {
    buttons.push(
      <button
        key="job"
        className="btn small"
        onClick={() =>
          setJob(teamId, {
            title: card.title,
            salary: card.salary ?? 0,
            beerTax: card.beerTax ?? 0,
          })
        }
      >
        Als Job setzen
      </button>,
    )
  }

  if (card.amount != null && card.amount !== 0) {
    buttons.push(
      <button
        key="cash"
        className="btn small"
        onClick={() => adjustCash(teamId, card.amount!, `${deck.name}: ${card.title}`)}
      >
        {card.amount > 0 ? 'KK gutschreiben' : 'KK abziehen'}
      </button>,
    )
  }

  if (deck.type !== 'job') {
    buttons.push(
      <button
        key="card"
        className="btn small ghost"
        onClick={() => addActionCard(teamId, card.title, card.detail)}
      >
        Als Aktionskarte
      </button>,
    )
  }

  return <div className="dice-apply">{buttons}</div>
}
