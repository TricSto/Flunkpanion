import { useState, type CSSProperties } from 'react'
import { useStore, type BerufswechselResult } from '../store'
import type { Card, Team } from '../types'
import {
  ALL_GAME_FIELDS,
  gameFieldColor,
  type GameFieldDef as FieldDef,
} from '../data/gameFields'
import { effectiveSalary, formatMoney, heldCardTitles, pickRandom } from '../util'
import { Modal } from './Modal'
import { FlashPopover } from './FlashPopover'
import { FieldIcon } from './FieldIcon'

function tileStyle(color: string): CSSProperties {
  return { '--tile': color } as CSSProperties
}

export function BoardView({
  onOpenChallenge,
  onOpenFlunk,
}: {
  onOpenChallenge: () => void
  onOpenFlunk: () => void
}) {
  const { state, isHost } = useStore()
  const [active, setActive] = useState<FieldDef | null>(null)

  // Berufswechsel ist nach dem ersten Auslösen für alle außer dem Spielleiter
  // gesperrt – die Kachel wird dann deaktiviert.
  const bwLocked = state.berufswechselLocked && !isHost

  const tap = (f: FieldDef) => {
    if (f.key === 'challenge') return onOpenChallenge()
    if (f.key === 'flunk') return onOpenFlunk()
    setActive(f)
  }

  return (
    <section className="board">
      {/* Nur die Feld-Buttons – das Raster füllt den Bildschirm ohne Scrollen. */}
      <div className="board-grid">
        {ALL_GAME_FIELDS.map((f) => {
          const locked = f.key === 'gehaltswechsel' && bwLocked
          return (
            <button
              key={f.key}
              className={f.key === 'flunk' ? 'field-tile flunk-tile' : 'field-tile'}
              style={tileStyle(gameFieldColor(f, state.fieldColors))}
              disabled={locked}
              onClick={() => tap(f)}
            >
              <span className="field-icon">
                <FieldIcon kind={f.icon} size="1.4em" />
              </span>
              <span className="field-label">{f.label}</span>
              <span className="field-sub">{locked ? '🔒 gesperrt' : f.sub}</span>
            </button>
          )
        })}
      </div>

      {active && <FieldSheet field={active} onClose={() => setActive(null)} />}
    </section>
  )
}

// ---------------------------------------------------------------------------

function FieldSheet({ field, onClose }: { field: FieldDef; onClose: () => void }) {
  const { state } = useStore()
  // Minigames spielen alle (Sieger wird im Feld gewählt, #29) und der
  // Berufswechsel betrifft alle Teams gleichzeitig (#32) – keine Team-Wahl.
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
    <Modal
      title={
        <>
          <FieldIcon kind={field.icon} /> {field.label}
        </>
      }
      onClose={onClose}
    >
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

      <FieldBody field={field} team={team} onClose={onClose} />
    </Modal>
  )
}

// ---------------------------------------------------------------------------

function FieldBody({
  field,
  team,
  onClose,
}: {
  field: FieldDef
  team: Team | null
  onClose: () => void
}) {
  const { state, adjustCash, payBeerTax, addActionCard, addSalaryBonus } = useStore()
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
    // Inkl. dauerhaftem Bonus aus „Gehaltserhöhung".
    const salary = effectiveSalary(team)
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
            <FieldIcon kind="zahltag" /> Zahltag auszahlen +{salary} KK
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
            <FieldIcon kind="biersteuer" /> Biersteuer abziehen −{tax} KK
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
      // Bereits vergebene Karten (egal bei welchem Team) sind nicht ziehbar.
      const held = heldCardTitles(state.teams)
      const available = deck.cards.filter((c) => !held.has(c.title))
      const card = pickRandom(available)
      if (!card) {
        say(`Alle Karten aus „${deck.name}“ sind schon vergeben`)
        return
      }
      addActionCard(team.id, card.title, card.detail, kind)
      setDrawn(card)
    }
    return (
      <>
        <button className="btn primary block" onClick={draw}>
          <FieldIcon kind={kind === 'special' ? 'gamechanger' : 'aktion'} /> Karte ziehen für{' '}
          {team.name}
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
    // Gehaltserhöhung: keine einmalige Buchung, sondern dauerhafter Bonus
    // aufs Gehalt – bleibt auch beim Neuwürfeln erhalten. Betrag aus dem
    // Kartentext (Fallback +1).
    const salaryRaise =
      drawn?.title === 'Gehaltserhöhung'
        ? Number(drawn.detail.match(/\+\s*(\d+)\s*KK/i)?.[1] ?? 1)
        : null
    return (
      <>
        {!drawn ? (
          <>
            <button className="btn primary block" onClick={draw}>
              <FieldIcon kind="ereignis" /> Ereignis ziehen
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
            ) : salaryRaise != null ? (
              <div className="event-actions">
                <button className="btn big ghost" onClick={onClose}>
                  Ohne Erhöhung fertig
                </button>
                <button
                  className="btn big plus"
                  onClick={() => {
                    addSalaryBonus(team.id, salaryRaise)
                    onClose()
                  }}
                >
                  💶 Gehalt dauerhaft +{salaryRaise} KK
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
        {doneBtn}
      </>
    )
  }

  return null
}

// --- Berufswechsel: erstes Team bestätigt, dann würfeln ALLE Teams neu -------
// Kein Brett-Feld-Wähler mehr: Das erste Team, das über das Feld kommt,
// bestätigt „bist du 1.?" – mit diesem einen Klick werden Beruf & Gehalt ALLER
// Teams neu gewürfelt. Danach ist das Feld für alle Geräte außer dem
// Spielleiter gesperrt (nur der Host kann es wieder freigeben oder erneut
// auslösen). Aus Versehen reingeklickt? Einfach „Abbrechen" bzw. ✕.

function GehaltswechselBody({ onClose }: { onClose: () => void }) {
  const { state, isHost, triggerBerufswechselAll, setBerufswechselLocked } = useStore()
  const [step, setStep] = useState<'bestaetigen' | 'fertig'>('bestaetigen')
  const [results, setResults] = useState<BerufswechselResult[]>([])
  const locked = state.berufswechselLocked

  if (state.teams.length === 0) {
    return <p className="muted small">Noch keine Teams. Lege sie im Tab „Setup“ an.</p>
  }

  // Ein Klick auf „Ja" würfelt Beruf & Gehalt aller Teams neu und sperrt das Feld.
  const rollAll = () => {
    const res = triggerBerufswechselAll()
    if (!res) return
    setResults(res)
    setStep('fertig')
  }

  if (step === 'fertig') {
    return (
      <>
        <p className="sheet-info">Alle Teams haben einen neuen Beruf und ein neues Gehalt:</p>
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
                      💼 {r.title} · 💶 {formatMoney(r.salary)}
                      {(team?.salaryBonus ?? 0) > 0 && (
                        <span className="salary-bonus">+{team!.salaryBonus}</span>
                      )}{' '}
                      · BS {r.beerTax}
                    </span>
                  ) : (
                    <span className="muted small">Kein passender Beruf mehr frei.</span>
                  )}
                </div>
              </li>
            )
          })}
        </ul>
        <p className="muted small">
          Das Feld ist jetzt für alle außer dem Spielleiter gesperrt.
        </p>
        {isHost && (
          <button className="btn ghost block" onClick={() => setBerufswechselLocked(false)}>
            🔓 Feld für die nächste Runde wieder freigeben
          </button>
        )}
        <button className="btn primary block sheet-done" onClick={onClose}>
          ✓ Fertig
        </button>
      </>
    )
  }

  // Schritt „bestaetigen": Nur das erste Team löst aus.
  return (
    <>
      <p className="sheet-info">
        <strong>Bist du das 1. Team, das über dieses Feld kommt?</strong> Dann
        werden mit einem Klick für <strong>alle Teams</strong> Beruf &amp; Gehalt
        neu gewürfelt (Studium → Diplom-Beruf, Ausbildung → Ausbildungsberuf).
      </p>
      {locked && isHost && (
        <p className="muted small">
          Wurde schon ausgelöst – als Spielleiter kannst du trotzdem erneut würfeln.
        </p>
      )}
      <div className="event-actions">
        <button className="btn big ghost" onClick={onClose}>
          ❌ Abbrechen
        </button>
        <button className="btn big primary" onClick={rollAll}>
          ✅ Ja, für alle würfeln
        </button>
      </div>
      <p className="muted small sheet-current">
        Nach dem Auslösen ist das Feld für alle Geräte außer dem Spielleiter
        gesperrt.
      </p>
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
        {state.tables.kingstabelle.map((text, i) => (
          <li key={i} value={i + 1}>
            {text}
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
        <FieldIcon kind="crown" /> −{KINGSTABELLE_PENALTY} KK beim Verlierer abziehen
      </button>
    </>
  )
}

// --- Minigames (alle spielen mit – Sieger per Team-Kachel wählen, #29) ------

function MinigameBody({ onDone }: { onDone: (msg: string) => void }) {
  const { state, winMinigame } = useStore()
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
        {state.tables.minigames.map((text, i) => (
          <li key={i} value={i + 1}>
            {text}
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
          // Läuft komplett über den Store: Sieg zählen, freie Aktionskarte
          // ziehen und alle Geräte per Live-Nachricht informieren.
          const card = winMinigame(winner.id)
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
