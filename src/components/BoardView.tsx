import { useState, type CSSProperties } from 'react'
import { useStore, type BerufswechselResult } from '../store'
import type { Card, Team } from '../types'
import {
  ALL_GAME_FIELDS,
  gameFieldColor,
  type GameFieldDef as FieldDef,
} from '../data/gameFields'
import { KINGSTABELLE, MINIGAMES } from '../data/tables'
import { formatMoney, pickRandom } from '../util'
import { Modal } from './Modal'
import { FlashPopover } from './FlashPopover'

function tileStyle(color: string): CSSProperties {
  return { '--tile': color } as CSSProperties
}

/** Wechselt zur Teamseite; mit 'beers' wird dort der Bierzähler fokussiert. */
type GoToTeams = (focus?: 'beers') => void

export function BoardView({
  onOpenChallenge,
  onOpenFlunk,
  onGoToTeams,
}: {
  onOpenChallenge: () => void
  onOpenFlunk: () => void
  onGoToTeams: GoToTeams
}) {
  const { state } = useStore()
  const [active, setActive] = useState<FieldDef | null>(null)

  const tap = (f: FieldDef) => {
    if (f.key === 'challenge') return onOpenChallenge()
    if (f.key === 'flunk') return onOpenFlunk()
    setActive(f)
  }

  return (
    <section className="board">
      {/* Nur die Feld-Buttons – das Raster füllt den Bildschirm ohne Scrollen. */}
      <div className="board-grid">
        {ALL_GAME_FIELDS.map((f) => (
          <button
            key={f.key}
            className={f.key === 'flunk' ? 'field-tile flunk-tile' : 'field-tile'}
            style={tileStyle(gameFieldColor(f, state.fieldColors))}
            onClick={() => tap(f)}
          >
            <span className="field-icon">{f.icon}</span>
            <span className="field-label">{f.label}</span>
            <span className="field-sub">{f.sub}</span>
          </button>
        ))}
      </div>

      {active && (
        <FieldSheet field={active} onClose={() => setActive(null)} onGoToTeams={onGoToTeams} />
      )}
    </section>
  )
}

// ---------------------------------------------------------------------------

function FieldSheet({
  field,
  onClose,
  onGoToTeams,
}: {
  field: FieldDef
  onClose: () => void
  onGoToTeams: GoToTeams
}) {
  const { state } = useStore()
  // Minigames spielen alle (Sieger wird im Feld gewählt, #29) und der
  // Gehaltswechsel betrifft alle Teams gleichzeitig (#32) – keine Team-Wahl.
  const needsTeam =
    field.key !== 'kingstabelle' &&
    field.key !== 'minigames' &&
    field.key !== 'gehaltswechsel'
  // Das eigene (beigetretene) Team wird direkt genutzt – keine Auswahl nötig.
  // Nur Geräte ohne eigenes Team (z. B. Spielleitung) wählen manuell.
  const myTeam = state.teams.find((t) => t.id === state.currentTeamId) ?? null
  const [teamId, setTeamId] = useState<string>(state.teams[0]?.id ?? '')
  const team = myTeam ?? state.teams.find((t) => t.id === teamId) ?? null

  return (
    <Modal title={`${field.icon} ${field.label}`} onClose={onClose}>
      {needsTeam &&
        (state.teams.length === 0 ? (
          <p className="muted small">Noch keine Teams. Lege sie im Tab „Setup“ an.</p>
        ) : myTeam ? (
          <p className="sheet-team-hint">
            Für <strong style={{ color: myTeam.color }}>{myTeam.name}</strong>
          </p>
        ) : (
          <label className="field">
            <span>Team auf diesem Feld</span>
            <select value={teamId} onChange={(e) => setTeamId(e.target.value)}>
              {state.teams.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </label>
        ))}

      <FieldBody field={field} team={team} onClose={onClose} onGoToTeams={onGoToTeams} />
    </Modal>
  )
}

// ---------------------------------------------------------------------------

function FieldBody({
  field,
  team,
  onClose,
  onGoToTeams,
}: {
  field: FieldDef
  team: Team | null
  onClose: () => void
  onGoToTeams: GoToTeams
}) {
  const { state, adjustCash, payBeerTax, addActionCard, addBeer } = useStore()
  const [flash, setFlash] = useState<string | null>(null)
  const [drawn, setDrawn] = useState<Card | null>(null)

  // Einheitlicher Fertig-Button wie beim Kingstabelle-Feld (#43).
  const doneBtn = (
    <button className="btn ghost block sheet-done" onClick={onClose}>
      ✓ Fertig
    </button>
  )

  // Kingstabelle: Verlierer-Team wählen, −2 KK automatisch (#46).
  if (field.key === 'kingstabelle') {
    return (
      <>
        <KingstabelleBody onDone={setFlash} />
        {flash && <FlashPopover message={flash} onClose={() => setFlash(null)} />}
        {doneBtn}
      </>
    )
  }

  // Minigames: Sieger wird im Feld per Team-Kachel gewählt – kein Team nötig.
  if (field.key === 'minigames') {
    return (
      <>
        <MinigameBody onDone={setFlash} />
        {flash && <FlashPopover message={flash} onClose={() => setFlash(null)} />}
        {doneBtn}
      </>
    )
  }

  // Berufswechsel: betrifft immer ALLE Teams gleichzeitig (#32, #40).
  if (field.key === 'gehaltswechsel') {
    return <GehaltswechselBody onClose={onClose} />
  }

  if (!team) {
    return <p className="muted small">Bitte oben ein Team auswählen.</p>
  }

  const say = (m: string) => setFlash(m)
  const job = team.job
  const flashEl = flash ? (
    <FlashPopover message={flash} onClose={() => setFlash(null)} />
  ) : null

  // --- Zahltag -------------------------------------------------------------
  if (field.key === 'zahltag') {
    const salary = job?.salary ?? 0
    return (
      <>
        {salary > 0 ? (
          <button
            className="btn primary block"
            onClick={() => {
              adjustCash(team.id, salary, 'Zahltag')
              say(`+${salary} KK an ${team.name}`)
            }}
          >
            💰 Zahltag auszahlen +{salary} KK
          </button>
        ) : (
          <p className="muted small">
            {team.name} hat noch kein Gehalt. Erst Beruf &amp; Gehalt würfeln (Team-Karte).
          </p>
        )}
        {flashEl}
        {doneBtn}
      </>
    )
  }

  // --- Biersteuer ----------------------------------------------------------
  if (field.key === 'biersteuer') {
    const tax = job?.beerTax ?? 0
    return (
      <>
        {tax > 0 ? (
          <button
            className="btn primary block"
            onClick={() => {
              payBeerTax(team.id)
              say(`−${tax} KK Biersteuer bei ${team.name}`)
            }}
          >
            🍺 Biersteuer abziehen −{tax} KK
          </button>
        ) : (
          <p className="muted small">
            {team.name} hat keine Biersteuer gesetzt (kommt mit dem Gehalt).
          </p>
        )}
        {flashEl}
        {doneBtn}
      </>
    )
  }

  // --- Karten ziehen (Aktionskarten / Game Changer) ------------------------
  if (field.key === 'aktionskarten' || field.key === 'spielveraendernd') {
    const kind = field.key === 'spielveraendernd' ? 'special' : 'action'
    const deck = state.decks.find((d) => d.type === kind)
    const draw = () => {
      if (!deck || deck.cards.length === 0) return
      const held = new Set(team.actionCards.map((c) => c.title))
      const available = deck.cards.filter((c) => !held.has(c.title))
      const card = pickRandom(available)
      if (!card) {
        say(`Alle Karten aus „${deck.name}“ bereits im Team`)
        return
      }
      addActionCard(team.id, card.title, card.detail, kind)
      setDrawn(card)
    }
    return (
      <>
        <button className="btn primary block" onClick={draw}>
          🃏 Karte ziehen für {team.name}
        </button>
        {drawn && (
          <div className="drawn-card sheet-drawn">
            <strong className="drawn-title">{drawn.title}</strong>
            {drawn.detail && <p className="drawn-detail">{drawn.detail}</p>}
          </div>
        )}
        {flashEl}
        {doneBtn}
      </>
    )
  }

  // --- Ereignis ------------------------------------------------------------
  if (field.key === 'ereignis') {
    const deck = state.decks.find((d) => d.type === 'event')
    const draw = () => {
      if (!deck || deck.cards.length === 0) return
      setDrawn(pickRandom(deck.cards) ?? null)
    }
    const amount = drawn?.amount ?? null
    const hasBooking = amount != null && amount !== 0
    // Kronkorkenmonster: Würfel-Karte ohne festen Betrag – statt „Fertig"
    // gibt es „Geschafft" oder die Strafe aus dem Kartentext (#44).
    const monsterPenalty =
      drawn?.title === 'Kronkorkenmonster'
        ? Number(drawn.detail.match(/-\s*(\d+)\s*KK/i)?.[1] ?? 6)
        : null
    return (
      <>
        {!drawn ? (
          <>
            <button className="btn primary block" onClick={draw}>
              🎲 Ereignis ziehen
            </button>
            {doneBtn}
          </>
        ) : (
          <>
            <div className="drawn-card sheet-drawn">
              <div className="drawn-top">
                <strong className="drawn-title">{drawn.title}</strong>
                {hasBooking && (
                  <span className={amount > 0 ? 'dice-amount pos' : 'dice-amount neg'}>
                    {amount > 0 ? '+' : ''}
                    {formatMoney(amount)}
                  </span>
                )}
              </div>
              {drawn.detail && <p className="drawn-detail">{drawn.detail}</p>}
            </div>
            {/* Zwei große Buttons: links ohne Buchung fertig, rechts buchen. */}
            {monsterPenalty != null ? (
              <div className="event-actions">
                <button className="btn big plus" onClick={onClose}>
                  ✅ Geschafft
                </button>
                <button
                  className="btn big minus"
                  onClick={() => {
                    adjustCash(team.id, -monsterPenalty, `Ereignis: ${drawn.title}`)
                    onClose()
                  }}
                >
                  −{monsterPenalty} KK
                </button>
              </div>
            ) : (
              <div className="event-actions">
                <button className="btn big ghost" onClick={onClose}>
                  {hasBooking ? 'Ohne Buchung fertig' : 'Fertig'}
                </button>
                {hasBooking && (
                  <button
                    className={amount > 0 ? 'btn big plus' : 'btn big minus'}
                    onClick={() => {
                      adjustCash(team.id, amount, `Ereignis: ${drawn.title}`)
                      onClose()
                    }}
                  >
                    {amount > 0 ? 'KK gutschreiben' : 'KK abziehen'} ({amount > 0 ? '+' : ''}
                    {amount})
                  </button>
                )}
              </div>
            )}
          </>
        )}
        {flashEl}
      </>
    )
  }

  // --- Edward 20 Hands -----------------------------------------------------
  if (field.key === 'edward') {
    return (
      <>
        <p className="sheet-info">
          Ein Spieler von <strong>{team.name}</strong> bekommt eine Dose in die Hand
          getaped. Bis zum nächsten Flunk-Feld muss sie leer sein.
        </p>
        <button
          className="btn primary block"
          onClick={() => {
            // Direkt zählen, Fenster schließen und zur Teamseite wechseln –
            // dort wird der Bierzähler angescrollt und kurz hervorgehoben.
            addBeer(team.id, 'normal', 1)
            onClose()
            onGoToTeams('beers')
          }}
        >
          🍺 Getränk zählen (+1 Bier)
        </button>
        {doneBtn}
      </>
    )
  }

  return null
}

// --- Berufswechsel: erst „erstes Team?"-Frage, dann alle neu würfeln (#40) ---

function GehaltswechselBody({ onClose }: { onClose: () => void }) {
  const { state, rerollAllJobs } = useStore()
  const [step, setStep] = useState<'frage' | 'nein' | 'fertig'>('frage')
  const [results, setResults] = useState<BerufswechselResult[]>([])

  if (state.teams.length === 0) {
    return <p className="muted small">Noch keine Teams. Lege sie im Tab „Setup“ an.</p>
  }

  // Ja → Beruf & Gehalt aller Teams zurücksetzen und neu würfeln; der
  // Bildungsweg bleibt (Studium → Diplom-Beruf, sonst Ausbildungsberuf).
  const rollAll = () => {
    setResults(rerollAllJobs())
    setStep('fertig')
  }

  if (step === 'nein') {
    return (
      <>
        <p className="sheet-info">
          <strong>Nur das erste Team löst den Berufswechsel aus.</strong>
        </p>
        {/* Schließt das Fenster direkt – wie beim Kingstabelle-Feld (#42). */}
        <button className="btn primary block" onClick={onClose}>
          ✓ Fertig
        </button>
      </>
    )
  }

  if (step === 'fertig') {
    return (
      <>
        <p className="sheet-info">
          Alle Teams haben einen neuen Beruf und ein neues Gehalt:
        </p>
        <ul className="gw-list">
          {results.map((r) => {
            const team = state.teams.find((t) => t.id === r.teamId)
            return (
              <li
                key={r.teamId}
                className="gw-row"
                style={{ borderLeftColor: team?.color ?? 'var(--border)' }}
              >
                <div className="gw-head">
                  <span className="gw-name">
                    {r.studium ? '🎓' : '🔧'} {r.teamName}
                  </span>
                  {r.title ? (
                    <span className="gw-result small">
                      💼 {r.title} · 💶 {formatMoney(r.salary)} · BS {r.beerTax}
                    </span>
                  ) : (
                    <span className="muted small">Kein passender Beruf mehr frei.</span>
                  )}
                </div>
              </li>
            )
          })}
        </ul>
        <button className="btn primary block" onClick={onClose}>
          ✓ Fertig
        </button>
      </>
    )
  }

  return (
    <>
      <p className="sheet-info">
        Seid ihr das <strong>erste Team</strong>, das über das
        Berufswechsel-Feld gekommen ist?
      </p>
      <div className="event-actions">
        <button className="btn big ghost" onClick={() => setStep('nein')}>
          ❌ Nein
        </button>
        <button className="btn big primary" onClick={rollAll}>
          ✅ Ja – alle neu würfeln
        </button>
      </div>
      <p className="muted small sheet-current">
        Bei „Ja" werden Beruf &amp; Gehalt <strong>aller Teams</strong>{' '}
        zurückgesetzt und neu erwürfelt – Studium bekommt wieder einen
        Diplom-Beruf, Ausbildung einen Ausbildungsberuf.
      </p>
      <button className="btn ghost block sheet-done" onClick={onClose}>
        ✓ Fertig
      </button>
    </>
  )
}

/**
 * Team-Auswahl als bunte Buttons statt Dropdown – jedes Team als Kachel in
 * seiner Farbe, das gewählte bekommt Rahmen + Häkchen.
 */
function TeamPicker({
  label,
  value,
  onChange,
}: {
  label: string
  value: string
  onChange: (teamId: string) => void
}) {
  const { state } = useStore()
  return (
    <div className="field">
      <span>{label}</span>
      <div className="team-picker">
        {state.teams.map((t) => (
          <button
            key={t.id}
            type="button"
            className={t.id === value ? 'team-pick selected' : 'team-pick'}
            style={{ '--team': t.color } as CSSProperties}
            onClick={() => onChange(t.id)}
          >
            <span className="team-pick-dot" aria-hidden="true" />
            <span className="team-pick-name">{t.name}</span>
            {t.id === value && <span className="team-pick-check">✓</span>}
          </button>
        ))}
      </div>
    </div>
  )
}

/** KK-Strafe für das Verlierer-Team der Kingstabelle (#46). */
const KINGSTABELLE_PENALTY = 2

// --- Kingstabelle (am Brett gewürfelt – Verlierer zahlt automatisch, #46) ----

function KingstabelleBody({ onDone }: { onDone: (msg: string) => void }) {
  const { state, adjustCash } = useStore()
  // Vorauswahl: eigenes Team, sonst das erste.
  const [loserId, setLoserId] = useState<string>(
    state.currentTeamId ?? state.teams[0]?.id ?? '',
  )
  if (state.teams.length === 0) {
    return <p className="muted small">Noch keine Teams. Lege sie im Tab „Setup“ an.</p>
  }
  return (
    <>
      <p className="sheet-info">
        Die Kingstabelle wird <strong>am Spielbrett erwürfelt</strong>. Wähle
        hier das <strong>Verlierer-Team</strong> – ihm werden automatisch{' '}
        {KINGSTABELLE_PENALTY} KK abgezogen.
      </p>
      <ol className="rule-table">
        {KINGSTABELLE.map((row) => (
          <li key={row.n} value={row.n}>
            {row.text}
          </li>
        ))}
      </ol>
      <TeamPicker label="Verlierer-Team" value={loserId} onChange={setLoserId} />
      <button
        className="btn primary block"
        disabled={!loserId}
        onClick={() => {
          const loser = state.teams.find((t) => t.id === loserId)
          if (!loser) return
          adjustCash(loser.id, -KINGSTABELLE_PENALTY, 'Kingstabelle verloren')
          onDone(`👑 ${loser.name} verliert die Kingstabelle: −${KINGSTABELLE_PENALTY} KK`)
        }}
      >
        👑 −{KINGSTABELLE_PENALTY} KK beim Verlierer abziehen
      </button>
    </>
  )
}

// --- Minigames (alle spielen mit – Sieger per Team-Kachel wählen, #29) ------

function MinigameBody({ onDone }: { onDone: (msg: string) => void }) {
  const { state, bumpStat, addActionCard } = useStore()
  // Vorauswahl: eigenes Team, sonst das erste.
  const [winnerId, setWinnerId] = useState<string>(
    state.currentTeamId ?? state.teams[0]?.id ?? '',
  )
  if (state.teams.length === 0) {
    return <p className="muted small">Noch keine Teams. Lege sie im Tab „Setup“ an.</p>
  }
  return (
    <>
      <p className="sheet-info">
        Minigame wird <strong>am Spielbrett</strong> gespielt – alle Teams machen
        mit. Sucht euch eines aus der Tabelle aus (oder würfelt es). Wähle hier,
        wer gewonnen hat: Das Team bekommt eine zufällige Aktionskarte (und der
        Sieg zählt für die Endstatistik).
      </p>
      <ol className="rule-table">
        {MINIGAMES.map((row) => (
          <li key={row.n} value={row.n}>
            {row.text}
          </li>
        ))}
      </ol>
      <TeamPicker label="Gewinner-Team" value={winnerId} onChange={setWinnerId} />
      <button
        className="btn primary block"
        disabled={!winnerId}
        onClick={() => {
          const winner = state.teams.find((t) => t.id === winnerId)
          if (!winner) return
          bumpStat(winner.id, 'minigameWins', 1)
          // Belohnung: zufällige Aktionskarte für den Gewinner (#45).
          const deck = state.decks.find((d) => d.type === 'action')
          const held = new Set(winner.actionCards.map((c) => c.title))
          const card =
            pickRandom((deck?.cards ?? []).filter((c) => !held.has(c.title))) ??
            pickRandom(deck?.cards ?? [])
          if (card) addActionCard(winner.id, card.title, card.detail, 'action')
          onDone(
            `🏆 Minigame-Sieg für ${winner.name}${card ? ` – 🃏 „${card.title}" gezogen` : ''}`,
          )
        }}
      >
        🏆 Minigame gewonnen
      </button>
    </>
  )
}
