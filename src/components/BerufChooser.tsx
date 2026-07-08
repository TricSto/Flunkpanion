import { useMemo, useState } from 'react'
import type { Team } from '../types'
import { useStore } from '../store'
import { berufChoiceCount, sampleDistinct, takenJobTitles } from '../util'
import { Modal } from './Modal'

/**
 * Berufswahl mit Ausbildungs-Logik: ohne Ausbildung 1 Beruf, mit Ausbildung 2,
 * mit Studium 3 zur Auswahl. Bereits vergebene Berufe (max. 1 pro Team) fallen
 * weg – wer später wählt, hat also weniger Auswahl.
 */
export function BerufChooser({ team, onClose }: { team: Team; onClose: () => void }) {
  const { state, setJobTitle } = useStore()
  const berufeDeck = state.decks.find((d) => d.type === 'job')
  const count = berufChoiceCount(team.education)
  const [msg, setMsg] = useState<string | null>(null)

  // Einmal beim Öffnen auslosen, damit die Optionen stabil bleiben.
  const options = useMemo(() => {
    const taken = takenJobTitles(state.teams, team.id)
    const available = (berufeDeck?.cards ?? []).filter((c) => !taken.has(c.title))
    return sampleDistinct(available, count)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Live geprüft: falls ein anderes Gerät währenddessen einen Beruf nimmt,
  // verschwindet er aus der Auswahl (jeder Beruf max. 1×).
  const takenLive = takenJobTitles(state.teams, team.id)
  const shown = options.filter((c) => !takenLive.has(c.title))

  const choose = (title: string) => {
    if (takenLive.has(title)) {
      setMsg(`„${title}“ ist inzwischen vergeben.`)
      return
    }
    setJobTitle(team.id, title)
    onClose()
  }

  const eduLabel =
    team.education === 'studium'
      ? 'Studium – Auswahl aus bis zu 3 Berufen.'
      : team.education === 'ausbildung'
        ? 'Ausbildung – Auswahl aus bis zu 2 Berufen.'
        : 'Ohne Ausbildung – 1 Beruf.'

  return (
    <Modal title="💼 Beruf wählen" onClose={onClose}>
      <p className="muted small">{eduLabel} Bereits vergebene Berufe fallen weg.</p>

      {shown.length === 0 ? (
        <p className="muted small">Kein Beruf mehr frei – alle bereits vergeben.</p>
      ) : (
        <div className="beruf-options">
          {shown.map((c) => (
            <button key={c.id} className="beruf-option" onClick={() => choose(c.title)}>
              <strong>{c.title}</strong>
              {c.detail && <span className="muted small">{c.detail}</span>}
            </button>
          ))}
        </div>
      )}

      {msg && <p className="form-error">{msg}</p>}

      {shown.length > 0 && shown.length < count && (
        <p className="muted small">Nur noch {shown.length} Beruf(e) frei.</p>
      )}
    </Modal>
  )
}
