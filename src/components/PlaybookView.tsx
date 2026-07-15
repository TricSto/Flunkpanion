import { useState } from 'react'
import {
  PLAYBOOK_PLAYS,
  PLAYBOOK_CATEGORIES,
  PLAYBOOK_TITLE,
  categoryOf,
  type PlaybookPlay,
  type PlaybookCategoryKey,
  type PlaybookStatus,
} from '../data/playbook'
import { pickRandom } from '../util'

// Die Playbook-Seite (ganz rechts): eine Hommage an Barney Stinsons
// „Playbook" aus How I Met Your Mother. Man zieht einen zufälligen „Flunk"
// (optional gefiltert nach Equipment-Kategorie), der wie ein Blatt aus einem
// alten Playbook dargestellt wird. Ein Tipp auf das Blatt zieht den nächsten.

/** 'alle' = keine Filterung, sonst ein Kategorie-Schlüssel. */
type Filter = 'alle' | PlaybookCategoryKey

/** Anzeige-Info je Ausarbeitungsstand (fertige Varianten ohne Badge). */
const STATUS_BADGE: Record<PlaybookStatus, { icon: string; label: string } | null> = {
  fertig: null,
  'in-arbeit': { icon: '🔧', label: 'In Arbeit' },
  idee: { icon: '💡', label: 'Idee' },
}

/** Pool für die aktuelle Filterwahl. */
function poolFor(filter: Filter): PlaybookPlay[] {
  return filter === 'alle'
    ? PLAYBOOK_PLAYS
    : PLAYBOOK_PLAYS.filter((p) => p.category === filter)
}

/** Zufälligen Flunk ziehen – möglichst nicht denselben wie zuletzt. */
function drawFrom(pool: PlaybookPlay[], current: PlaybookPlay | null): PlaybookPlay | null {
  const options =
    current && pool.length > 1 ? pool.filter((p) => p.id !== current.id) : pool
  return pickRandom(options) ?? null
}

export function PlaybookView() {
  const [filter, setFilter] = useState<Filter>('alle')
  const [play, setPlay] = useState<PlaybookPlay | null>(null)
  // Nummer des aktuellen Blatts – rein kosmetischer „Seiten-Stempel".
  const [pageNo, setPageNo] = useState(0)
  // Kurzer Umblätter-Effekt beim Ziehen.
  const [flipping, setFlipping] = useState(false)

  const draw = (f: Filter = filter) => {
    setFlipping(true)
    setPlay((cur) => drawFrom(poolFor(f), cur))
    setPageNo((n) => n + 1)
    window.setTimeout(() => setFlipping(false), 260)
  }

  const chooseFilter = (f: Filter) => {
    setFilter(f)
    // Nach einem Wechsel direkt einen passenden Flunk ziehen, wenn schon
    // eines offen ist – sonst wartet der Startbildschirm auf den Button.
    if (play !== null) draw(f)
  }

  const status = play ? STATUS_BADGE[play.status] : null

  return (
    <section className="playbook">
      <h3 className="admin-h">📕 {PLAYBOOK_TITLE}</h3>

      <div className="kind-chips playbook-filter">
        <button
          className={filter === 'alle' ? 'kind-chip active' : 'kind-chip'}
          onClick={() => chooseFilter('alle')}
        >
          🎲 Alle
        </button>
        {PLAYBOOK_CATEGORIES.map((c) => (
          <button
            key={c.key}
            className={filter === c.key ? 'kind-chip active' : 'kind-chip'}
            onClick={() => chooseFilter(c.key)}
          >
            {c.icon} {c.label}
          </button>
        ))}
      </div>

      {play === null ? (
        <div className="playbook-intro">
          <p className="muted small">
            Alle Flunk-Varianten, gesammelt in einem legendären Playbook. Zieh
            einen zufälligen Flunk und schlag zu wie ein Profi.
          </p>
          <button className="btn primary block playbook-draw" onClick={() => draw()}>
            🎩 Zufälligen Flunk ziehen
          </button>
        </div>
      ) : (
        <div className="playbook-stage">
          <button
            type="button"
            className={flipping ? 'playbook-sheet flipping' : 'playbook-sheet'}
            onClick={() => draw()}
            aria-label="Nächsten Flunk ziehen"
          >
            <div className="playbook-sheet-inner">
              <div className="playbook-brand">{PLAYBOOK_TITLE}</div>
              <div className="playbook-stamp">Nr. {pageNo}</div>

              <div className="playbook-cat">
                {categoryOf(play.category).icon} {categoryOf(play.category).label}
                {status && (
                  <span className="playbook-badge">
                    {status.icon} {status.label}
                  </span>
                )}
              </div>

              <h2 className="playbook-title">{play.title}</h2>
              <div className="playbook-rule" />
              <p className="playbook-desc">{play.description}</p>

              <div className="playbook-equip">
                <span className="playbook-equip-label">🎒 Equipment</span>
                <span>{play.equipment.join(' · ')}</span>
              </div>
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
