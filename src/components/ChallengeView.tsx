import { useMemo, useState } from 'react'
import { useStore } from '../store'
import type { Card, ChallengeReward } from '../types'
import { formatMoney, pickRandom } from '../util'
import { Modal } from './Modal'

export function ChallengeView() {
  const { state, startChallenge } = useStore()
  const [challengerId, setChallengerId] = useState('')
  const [opponentId, setOpponentId] = useState('')
  const [rolling, setRolling] = useState(false)

  const challengeDeck = state.decks.find((d) => d.type === 'challenge')
  const challenge = state.challenge

  const teamById = (id: string | null | undefined) =>
    state.teams.find((t) => t.id === id) ?? null

  if (state.teams.length < 2) {
    return (
      <div className="empty">
        <p className="empty-emoji">⚔️</p>
        <p>Für Challenges braucht ihr mindestens zwei Teams.</p>
        <p className="muted">Legt sie im Tab „Setup“ an.</p>
      </div>
    )
  }

  const canRoll =
    challengerId && opponentId && challengerId !== opponentId && challengeDeck

  const roll = () => {
    if (!canRoll || !challengeDeck) return
    setRolling(true)
    let ticks = 0
    let last: Card | undefined
    const interval = setInterval(() => {
      last = pickRandom(challengeDeck.cards)
      ticks++
      if (ticks >= 8) {
        clearInterval(interval)
        setRolling(false)
        if (last) startChallenge(challengerId, opponentId, last)
      }
    }, 70)
  }

  // Läuft gerade eine Challenge? Dann Auslos-/Ergebnis-Ansicht zeigen.
  if (challenge) {
    return (
      <ActiveChallenge
        challengerName={teamById(challenge.challengerId)?.name ?? 'Team A'}
        opponentName={teamById(challenge.opponentId)?.name ?? 'Team B'}
      />
    )
  }

  return (
    <section className="challenge-setup">
      <p className="muted small settings-intro">
        Wähle die zwei Teams, lose eine Challenge aus – alle Geräte sehen sie
        live. Der Gewinner bekommt eine zufällige Aktionskarte.
      </p>

      <div className="challenge-vs">
        <label className="field">
          <span>Team A (Herausforderer)</span>
          <select value={challengerId} onChange={(e) => setChallengerId(e.target.value)}>
            <option value="">— Team wählen —</option>
            {state.teams.map((t) => (
              <option key={t.id} value={t.id} disabled={t.id === opponentId}>
                {t.name}
              </option>
            ))}
          </select>
        </label>

        <span className="vs-badge">VS</span>

        <label className="field">
          <span>Team B (Gegner)</span>
          <select value={opponentId} onChange={(e) => setOpponentId(e.target.value)}>
            <option value="">— Team wählen —</option>
            {state.teams.map((t) => (
              <option key={t.id} value={t.id} disabled={t.id === challengerId}>
                {t.name}
              </option>
            ))}
          </select>
        </label>
      </div>

      {!challengeDeck || challengeDeck.cards.length === 0 ? (
        <p className="muted small">
          Kein Challenge-Deck mit Karten gefunden. Lege im Tab „Setup“ welche an.
        </p>
      ) : (
        <button
          className="btn primary challenge-roll-btn"
          onClick={roll}
          disabled={!canRoll || rolling}
        >
          <span className={rolling ? 'die spinning' : 'die'}>🎯</span>
          {rolling ? 'Lose…' : 'Challenge auslosen'}
        </button>
      )}
    </section>
  )
}

function ActiveChallenge({
  challengerName,
  opponentName,
}: {
  challengerName: string
  opponentName: string
}) {
  const { state, resolveChallenge, clearChallenge } = useStore()
  const challenge = state.challenge!
  const [rewardFor, setRewardFor] = useState<string | null>(null)

  const winner =
    challenge.winnerId != null
      ? state.teams.find((t) => t.id === challenge.winnerId) ?? null
      : null

  return (
    <section className="challenge-active">
      <div className="challenge-vs-head">
        <span className="challenge-team a">{challengerName}</span>
        <span className="vs-badge">VS</span>
        <span className="challenge-team b">{opponentName}</span>
      </div>

      <div className="challenge-card-big">
        <span className="challenge-card-icon">🎯</span>
        <strong className="challenge-card-title">{challenge.title}</strong>
        {challenge.detail && <p className="challenge-card-detail">{challenge.detail}</p>}
      </div>

      {challenge.status === 'active' ? (
        <>
          <p className="muted small center">Wer hat gewonnen?</p>
          <div className="challenge-winner-buttons">
            <button className="btn primary big" onClick={() => setRewardFor(challenge.challengerId)}>
              🏆 {challengerName}
            </button>
            <button className="btn primary big" onClick={() => setRewardFor(challenge.opponentId)}>
              🏆 {opponentName}
            </button>
          </div>
          <button
            className="btn ghost small center-btn"
            onClick={clearChallenge}
            title="Challenge ohne Sieger ablegen – niemand bekommt eine Karte"
          >
            Fertig – ohne Sieger ablegen
          </button>
        </>
      ) : (
        <div className="challenge-result">
          <p className="challenge-result-line">
            🏆 <strong>{winner?.name ?? 'Team'}</strong> hat gewonnen!
          </p>
          {challenge.reward?.kind === 'card' && challenge.reward.cardTitle ? (
            <div className="drawn-card reward-card">
              <strong className="drawn-title">🃏 {challenge.reward.cardTitle}</strong>
              {challenge.reward.cardNote && (
                <p className="drawn-detail">{challenge.reward.cardNote}</p>
              )}
            </div>
          ) : challenge.reward?.kind === 'cash' && challenge.reward.amount ? (
            <p className="muted">Belohnung: {formatMoney(challenge.reward.amount)}</p>
          ) : (
            <p className="muted">Keine Belohnung.</p>
          )}
          <button className="btn primary" onClick={clearChallenge}>
            Neue Challenge
          </button>
        </div>
      )}

      {rewardFor && (
        <RewardModal
          winnerId={rewardFor}
          onClose={() => setRewardFor(null)}
          onConfirm={(reward, message) => {
            resolveChallenge(rewardFor, reward, message)
            setRewardFor(null)
          }}
        />
      )}
    </section>
  )
}

/**
 * Belohnung für den Challenge-Sieger: eine zufällig gezogene normale
 * Aktionskarte (keine spielverändernde, keine Doppelten). Die Karte wird
 * direkt angezeigt, bevor sie mit „Bestätigen" ins Inventar wandert.
 */
function RewardModal({
  winnerId,
  onClose,
  onConfirm,
}: {
  winnerId: string
  onClose: () => void
  onConfirm: (reward: ChallengeReward, message: string) => void
}) {
  const { state } = useStore()
  const [message, setMessage] = useState('')

  const winner = state.teams.find((t) => t.id === winnerId)
  const winnerName = winner?.name ?? 'Team'

  // Einmal beim Öffnen ziehen, damit die Karte stabil angezeigt wird.
  const card = useMemo(() => {
    const deck = state.decks.find((d) => d.type === 'action')
    if (!deck) return null
    // Keine Doppelten: hält der Sieger schon alle Karten, gibt es keine.
    const held = new Set(winner?.actionCards.map((c) => c.title) ?? [])
    return pickRandom(deck.cards.filter((c) => !held.has(c.title))) ?? null
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const reward: ChallengeReward = card
    ? { kind: 'card', cardTitle: card.title, cardNote: card.detail }
    : { kind: 'none' }

  return (
    <Modal title={`🏆 ${winnerName} gewinnt`} onClose={onClose}>
      {card ? (
        <>
          <p className="muted small">Belohnung – zufällig gezogene Aktionskarte:</p>
          <div className="drawn-card reward-card">
            <strong className="drawn-title">🃏 {card.title}</strong>
            {card.detail && <p className="drawn-detail">{card.detail}</p>}
          </div>
        </>
      ) : (
        <p className="muted small">
          Keine Aktionskarte verfügbar – {winnerName} hat schon alle Karten (oder
          das Deck ist leer). Der Sieg wird trotzdem gezählt.
        </p>
      )}

      <label className="field">
        <span>Nachricht an den Gewinner (optional)</span>
        <input
          type="text"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="z. B. Stark gespielt! 🍺"
        />
      </label>

      <div className="modal-actions">
        <button className="btn ghost" onClick={onClose}>
          Abbrechen
        </button>
        <button className="btn primary" onClick={() => onConfirm(reward, message)}>
          Gewinner bestätigen
        </button>
      </div>
    </Modal>
  )
}
