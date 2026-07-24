import { useMemo, useState } from 'react'
import type { Team } from '../types'
import { STUDIUM_KREDIT } from '../types'
import { useStore } from '../store'
import { berufChoiceCount, isDiplomJob, sampleDistinct, takenJobTitles } from '../util'

type Pfad = 'ausbildung' | 'studium'

/**
 * Berufswahl in zwei Schritten als großes Vollbild-Modal:
 * 1. Zweiteilung des Bildschirms – links Ausbildung, rechts Studium.
 * 2. Je nach Pfad 2 Ausbildungs- bzw. 3 Diplom-Berufe (Studium) zur Auswahl,
 *    jeweils mit Kurzbeschreibung. Bereits vergebene Berufe (max. 1 pro Team)
 *    fallen weg – wer später wählt, hat weniger Auswahl.
 */
export function BerufChooser({ team, onClose }: { team: Team; onClose: () => void }) {
  const { state, chooseJob } = useStore()
  const berufeDeck = state.decks.find((d) => d.type === 'job')
  const [pfad, setPfad] = useState<Pfad | null>(null)
  const [msg, setMsg] = useState<string | null>(null)

  // Beim Wählen des Pfads einmal auslosen, damit die Optionen stabil bleiben.
  // Pfadwechsel (zurück + neu wählen) lost bewusst neu.
  const options = useMemo(() => {
    if (!pfad || !berufeDeck) return []
    const taken = takenJobTitles(state.teams, team.id)
    const pool = berufeDeck.cards.filter(
      (c) => !taken.has(c.title) && isDiplomJob(c.title) === (pfad === 'studium'),
    )
    return sampleDistinct(pool, berufChoiceCount(pfad))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pfad])

  // Live geprüft: falls ein anderes Gerät währenddessen einen Beruf nimmt,
  // verschwindet er aus der Auswahl (jeder Beruf max. 1×).
  const takenLive = takenJobTitles(state.teams, team.id)
  const shown = options.filter((c) => !takenLive.has(c.title))

  const choose = (title: string) => {
    if (!pfad) return
    if (takenLive.has(title)) {
      setMsg(`„${title}“ ist inzwischen vergeben.`)
      return
    }
    chooseJob(team.id, pfad, title)
    onClose()
  }

  return (
    <div className="beruf-screen" role="dialog" aria-modal="true">
      <div className="beruf-screen-head">
        <button
          className="btn ghost small"
          onClick={() => (pfad ? setPfad(null) : onClose())}
        >
          ‹ Zurück
        </button>
        <h3>💼 Beruf wählen · {team.name}</h3>
        <button className="icon-btn" onClick={onClose} aria-label="Schließen">
          ✕
        </button>
      </div>

      {pfad === null ? (
        <div className="beruf-split">
          <button className="beruf-split-half ausbildung" onClick={() => setPfad('ausbildung')}>
            <span className="beruf-split-icon">🔧</span>
            <span className="beruf-split-title">Ausbildung</span>
            <span className="beruf-split-sub">2 Berufe zur Auswahl</span>
          </button>
          <button className="beruf-split-half studium" onClick={() => setPfad('studium')}>
            <span className="beruf-split-icon">🎓</span>
            <span className="beruf-split-title">Studium</span>
            <span className="beruf-split-sub">
              3 Diplom-Berufe zur Auswahl · −{STUDIUM_KREDIT} KK Kredit
            </span>
          </button>
        </div>
      ) : (
        <div className="beruf-pick">
          <p className="muted small">
            {pfad === 'studium'
              ? `🎓 Studium – such dir einen Diplom-Beruf aus. Beim Wählen werden sofort ${STUDIUM_KREDIT} KK Studienkredit abgezogen.`
              : '🔧 Ausbildung – such dir einen Beruf aus.'}{' '}
            Bereits vergebene Berufe fallen weg.
          </p>

          {shown.length === 0 ? (
            <p className="muted small">
              Kein Beruf mehr frei – alle {pfad === 'studium' ? 'Diplom-Berufe' : 'Ausbildungsberufe'}{' '}
              sind bereits vergeben.
            </p>
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

          {shown.length > 0 && shown.length < berufChoiceCount(pfad) && (
            <p className="muted small">Nur noch {shown.length} Beruf(e) frei.</p>
          )}
        </div>
      )}
    </div>
  )
}
