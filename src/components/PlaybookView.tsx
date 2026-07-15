import { useState } from 'react'
import { PLAYBOOK_PLAYS, type PlaybookPlay } from '../data/playbook'
import { pickRandom } from '../util'

// Die Playbook-Seite (ganz rechts): eine Hommage an Barney Stinsons
// „Playbook" aus How I Met Your Mother. Man zieht einen zufälligen „Flunk",
// der wie ein Blatt aus einem alten Playbook dargestellt wird. Ein Tipp auf
// das Blatt zieht den nächsten Flunk. Vorerst nur mit Mock-Daten.

/** Zufälligen Flunk ziehen – möglichst nicht denselben wie zuletzt. */
function drawNext(current: PlaybookPlay | null): PlaybookPlay | null {
  const pool =
    current && PLAYBOOK_PLAYS.length > 1
      ? PLAYBOOK_PLAYS.filter((p) => p.id !== current.id)
      : PLAYBOOK_PLAYS
  return pickRandom(pool) ?? null
}

export function PlaybookView() {
  const [play, setPlay] = useState<PlaybookPlay | null>(null)
  // Nummer des aktuellen Blatts – rein kosmetischer „Seiten-Stempel".
  const [pageNo, setPageNo] = useState(0)
  // Kurzer Umblätter-Effekt beim Ziehen.
  const [flipping, setFlipping] = useState(false)

  const draw = () => {
    setFlipping(true)
    setPlay(drawNext(play))
    setPageNo((n) => n + 1)
    window.setTimeout(() => setFlipping(false), 260)
  }

  return (
    <section className="playbook">
      <h3 className="admin-h">📕 Das Flunk-Playbook</h3>

      {play === null ? (
        <div className="playbook-intro">
          <p className="muted small">
            Legendäre Flunks, gesammelt in einem einzigen Blatt Papier. Zieh
            einen zufälligen Flunk und schlag zu wie ein Profi.
          </p>
          <button className="btn primary block playbook-draw" onClick={draw}>
            🎩 Zufälligen Flunk ziehen
          </button>
        </div>
      ) : (
        <div className="playbook-stage">
          <button
            type="button"
            className={flipping ? 'playbook-sheet flipping' : 'playbook-sheet'}
            onClick={draw}
            aria-label="Nächsten Flunk ziehen"
          >
            <div className="playbook-sheet-inner">
              <div className="playbook-brand">The Playbook</div>
              <div className="playbook-stamp">Nr. {pageNo}</div>

              <h2 className="playbook-title">{play.title}</h2>
              <div className="playbook-rule" />
              <p className="playbook-desc">{play.description}</p>

              <div className="playbook-foot">Streng geheim · nur für Profis</div>
            </div>
          </button>
          <p className="muted small playbook-hint">
            Tipp auf das Blatt für den nächsten Flunk.
          </p>
        </div>
      )}
    </section>
  )
}
