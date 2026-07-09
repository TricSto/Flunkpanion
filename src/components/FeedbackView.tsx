import { useState } from 'react'
import { useStore } from '../store'
import { formatTime } from '../util'
import type { FeedbackKind } from '../types'

// Temporäre Feedback-Seite: sammelt Rückmeldungen zur App direkt im Spiel.
// Die Einträge liegen im geteilten Zustand und kommen so live beim Host an.

const KINDS: { kind: FeedbackKind; icon: string; label: string }[] = [
  { kind: 'fehler', icon: '🐞', label: 'Fehler' },
  { kind: 'idee', icon: '💡', label: 'Idee' },
  { kind: 'sonstiges', icon: '💬', label: 'Sonstiges' },
]

function kindOf(kind: FeedbackKind) {
  return KINDS.find((k) => k.kind === kind) ?? KINDS[2]
}

export function FeedbackView() {
  const { state, addFeedback, removeFeedback, isHost, connectionStatus } = useStore()
  const currentTeam = state.teams.find((t) => t.id === state.currentTeamId) ?? null

  const [kind, setKind] = useState<FeedbackKind>('idee')
  const [text, setText] = useState('')
  // Absender mit dem eigenen Team vorbelegen, bleibt aber frei änderbar.
  const [author, setAuthor] = useState(currentTeam?.name ?? '')
  const [sent, setSent] = useState(false)

  const submit = () => {
    if (!text.trim()) return
    addFeedback(kind, text, author)
    setText('')
    setSent(true)
  }

  const date = new Intl.DateTimeFormat('de-DE', { day: '2-digit', month: '2-digit' })

  return (
    <section>
      <h3 className="admin-h">💬 Feedback zur App</h3>
      <p className="muted small feedback-intro">
        Was nervt, was fehlt, was ist gut? Einfach hier eintragen –
        {connectionStatus === 'live'
          ? ' das Feedback wird live mit allen Geräten geteilt.'
          : ' das Feedback wird auf diesem Gerät gespeichert.'}
      </p>

      <div className="kind-chips">
        {KINDS.map((k) => (
          <button
            key={k.kind}
            className={kind === k.kind ? 'kind-chip active' : 'kind-chip'}
            onClick={() => setKind(k.kind)}
          >
            {k.icon} {k.label}
          </button>
        ))}
      </div>

      <label className="field">
        <span>Dein Feedback</span>
        <textarea
          value={text}
          placeholder="z. B. „Beim Aktienkauf fehlt …“"
          rows={4}
          onChange={(e) => {
            setText(e.target.value)
            setSent(false)
          }}
        />
      </label>

      <label className="field">
        <span>Von (Team oder Name, optional)</span>
        <input
          value={author}
          placeholder="z. B. Team Pilsator"
          onChange={(e) => setAuthor(e.target.value)}
        />
      </label>

      <button className="btn primary block" disabled={!text.trim()} onClick={submit}>
        Feedback senden
      </button>
      {sent && <p className="feedback-sent">✅ Danke, dein Feedback ist gespeichert!</p>}

      <div className="overview">
        <h3 className="overview-h">Bisheriges Feedback ({state.feedback.length})</h3>
        {state.feedback.length === 0 ? (
          <p className="muted small">Noch keine Einträge.</p>
        ) : (
          <ul className="feedback-list">
            {state.feedback.map((f) => (
              <li key={f.id} className="feedback-row">
                <div className="feedback-main">
                  <span className="feedback-meta muted small">
                    {kindOf(f.kind).icon} {kindOf(f.kind).label}
                    {f.author ? ` · ${f.author}` : ''} · {date.format(new Date(f.at))}{' '}
                    {formatTime(f.at)}
                  </span>
                  <p className="feedback-text">{f.text}</p>
                </div>
                {isHost && (
                  <button
                    className="btn tiny ghost danger"
                    onClick={() => removeFeedback(f.id)}
                    aria-label="Feedback löschen"
                  >
                    ✕
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  )
}
