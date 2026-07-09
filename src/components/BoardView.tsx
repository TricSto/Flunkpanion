import { useState, type CSSProperties } from 'react'
import { useStore } from '../store'
import type { Card, Team } from '../types'
import { formatMoney, isDiplomJob, pickRandom, takenJobTitles } from '../util'
import { Modal } from './Modal'

type FieldKey =
  | 'zahltag'
  | 'biersteuer'
  | 'aktionskarten'
  | 'spielveraendernd'
  | 'ereignis'
  | 'challenge'
  | 'gehaltswechsel'
  | 'edward'
  | 'kingstabelle'
  | 'minigames'
  | 'flunk'

interface FieldDef {
  key: FieldKey
  label: string
  icon: string
  color: string
  sub: string
}

// 5×2-Raster (10 Felder). Flunk bekommt darunter eine eigene große Reihe.
const GRID_FIELDS: FieldDef[] = [
  { key: 'zahltag', label: 'Zahltag', icon: '💰', color: '#22c55e', sub: 'Gehalt aufs Konto' },
  { key: 'biersteuer', label: 'Biersteuer', icon: '🍺', color: '#f59e0b', sub: 'Steuer abziehen' },
  { key: 'aktionskarten', label: 'Aktionskarten', icon: '🃏', color: '#6366f1', sub: 'Karte ziehen' },
  { key: 'spielveraendernd', label: 'Game Changer', icon: '⚡', color: '#a855f7', sub: 'Karte ziehen' },
  { key: 'ereignis', label: 'Ereignis', icon: '🎲', color: '#06b6d4', sub: 'Vorlesen & buchen' },
  { key: 'challenge', label: 'Challenge', icon: '🎯', color: '#ec4899', sub: 'Gegner fordern' },
  { key: 'gehaltswechsel', label: 'Gehaltswechsel', icon: '🔄', color: '#eab308', sub: 'Beruf & Gehalt neu' },
  { key: 'edward', label: 'Edward 20 Hands', icon: '🖐️', color: '#14b8a6', sub: 'Dose antapen' },
  { key: 'kingstabelle', label: 'Kingstabelle', icon: '👑', color: '#f97316', sub: 'Am Brett würfeln' },
  { key: 'minigames', label: 'Minigames', icon: '🎮', color: '#8b5cf6', sub: 'Am Brett würfeln' },
]

const FLUNK_FIELD: FieldDef = {
  key: 'flunk',
  label: 'Flunk-Feld',
  icon: '🚩',
  color: '#ef4444',
  sub: 'Warten · Match · gewinnen',
}

function tileStyle(color: string): CSSProperties {
  return { '--tile': color } as CSSProperties
}

export function BoardView({
  onOpenChallenge,
  onOpenFlunk,
  onGoToTeams,
}: {
  onOpenChallenge: () => void
  onOpenFlunk: () => void
  onGoToTeams: () => void
}) {
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
        {[...GRID_FIELDS, FLUNK_FIELD].map((f) => (
          <button
            key={f.key}
            className={f.key === 'flunk' ? 'field-tile flunk-tile' : 'field-tile'}
            style={tileStyle(f.color)}
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
  onGoToTeams: () => void
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
  onGoToTeams: () => void
}) {
  const { state, adjustCash, payBeerTax, addActionCard, addBeer } = useStore()
  const [flash, setFlash] = useState<string | null>(null)
  const [drawn, setDrawn] = useState<Card | null>(null)

  // Kingstabelle: reines Info-Feld, kein Team nötig.
  if (field.key === 'kingstabelle') {
    return (
      <>
        <p className="sheet-info">
          Dieses Feld wird <strong>am Spielbrett erwürfelt</strong> – es läuft nicht
          über die App.
        </p>
        <button className="btn primary block" onClick={onClose}>
          ✓ Fertig
        </button>
      </>
    )
  }

  // Minigames: Sieger wird im Feld per Dropdown gewählt – kein Team nötig.
  if (field.key === 'minigames') {
    return (
      <>
        <MinigameBody onDone={setFlash} />
        {flash && <div className="flash sheet-flash">{flash}</div>}
      </>
    )
  }

  // Gehaltswechsel: betrifft immer ALLE Teams gleichzeitig (#32).
  if (field.key === 'gehaltswechsel') {
    return <GehaltswechselBody />
  }

  if (!team) {
    return <p className="muted small">Bitte oben ein Team auswählen.</p>
  }

  const say = (m: string) => setFlash(m)
  const job = team.job
  const flashEl = flash ? <div className="flash sheet-flash">{flash}</div> : null

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
    return (
      <>
        {!drawn ? (
          <button className="btn primary block" onClick={draw}>
            🎲 Ereignis ziehen
          </button>
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
            // Direkt zählen, Fenster schließen und zur Teamseite wechseln.
            addBeer(team.id, 'normal', 1)
            onClose()
            onGoToTeams()
          }}
        >
          🍺 Getränk zählen (+1 Bier)
        </button>
      </>
    )
  }

  return null
}

// --- Gehaltswechsel: Beruf & Gehalt für ALLE Teams neu würfeln (#32) ---------

function GehaltswechselBody() {
  const { state, chooseJob, setSalary } = useStore()
  const berufe = state.decks.find((d) => d.type === 'job')
  const gehalt = state.decks.find((d) => d.type === 'salary')
  // Bildungsweg pro Team – vorbelegt mit der bisherigen Wahl des Teams.
  const [pfade, setPfade] = useState<Record<string, 'ausbildung' | 'studium'>>({})
  const [results, setResults] = useState<Record<string, string>>({})

  if (state.teams.length === 0) {
    return <p className="muted small">Noch keine Teams. Lege sie im Tab „Setup“ an.</p>
  }

  const pfadOf = (t: Team): 'ausbildung' | 'studium' =>
    pfade[t.id] ?? (t.education === 'studium' ? 'studium' : 'ausbildung')

  const roll = (t: Team) => {
    const pfad = pfadOf(t)
    // Beruf passend zum Bildungsweg: Studium → Diplom, Ausbildung → normal.
    const taken = takenJobTitles(state.teams, t.id)
    const pool = (berufe?.cards ?? []).filter(
      (c) => !taken.has(c.title) && isDiplomJob(c.title) === (pfad === 'studium'),
    )
    const berufCard = pickRandom(pool)
    if (!berufCard) {
      setResults((r) => ({ ...r, [t.id]: 'Kein passender Beruf mehr frei.' }))
      return
    }
    const gehaltCard = pickRandom(gehalt?.cards ?? [])
    chooseJob(t.id, pfad, berufCard.title)
    if (gehaltCard) setSalary(t.id, gehaltCard.salary ?? 0, gehaltCard.beerTax ?? 0)
    setResults((r) => ({
      ...r,
      [t.id]: `💼 ${berufCard.title} · 💶 ${formatMoney(gehaltCard?.salary ?? 0)} · BS ${
        gehaltCard?.beerTax ?? 0
      }`,
    }))
  }

  return (
    <>
      <p className="sheet-info">
        Beruf <strong>und</strong> Gehalt werden für <strong>alle Teams</strong>{' '}
        neu erwürfelt. Jedes Team gibt vorher an, ob es Studium oder Ausbildung
        gemacht hat.
      </p>
      <ul className="gw-list">
        {state.teams.map((t) => (
          <li key={t.id} className="gw-row" style={{ borderLeftColor: t.color }}>
            <div className="gw-head">
              <span className="gw-name">{t.name}</span>
              <span className="muted small">
                {t.job?.title || 'kein Beruf'}
                {t.job && t.job.salary > 0
                  ? ` · ${formatMoney(t.job.salary)} · BS ${t.job.beerTax}`
                  : ''}
              </span>
            </div>
            <div className="gw-actions">
              <div className="gw-toggle">
                <button
                  className={pfadOf(t) === 'ausbildung' ? 'btn tiny active' : 'btn tiny ghost'}
                  onClick={() => setPfade((p) => ({ ...p, [t.id]: 'ausbildung' }))}
                >
                  🔧 Ausbildung
                </button>
                <button
                  className={pfadOf(t) === 'studium' ? 'btn tiny active' : 'btn tiny ghost'}
                  onClick={() => setPfade((p) => ({ ...p, [t.id]: 'studium' }))}
                >
                  🎓 Studium
                </button>
              </div>
              <button className="btn small primary" onClick={() => roll(t)}>
                🎲 {results[t.id] ? 'nochmal' : 'würfeln'}
              </button>
            </div>
            {results[t.id] && <p className="gw-result small">{results[t.id]}</p>}
          </li>
        ))}
      </ul>
    </>
  )
}

// --- Minigames (alle spielen mit – Sieger per Dropdown wählen, #29) ---------

function MinigameBody({ onDone }: { onDone: (msg: string) => void }) {
  const { state, bumpStat } = useStore()
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
        mit. Wähle hier, wer gewonnen hat (zählt für die Endstatistik).
      </p>
      <label className="field">
        <span>Gewinner-Team</span>
        <select value={winnerId} onChange={(e) => setWinnerId(e.target.value)}>
          {state.teams.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
      </label>
      <button
        className="btn primary block"
        disabled={!winnerId}
        onClick={() => {
          const winner = state.teams.find((t) => t.id === winnerId)
          if (!winner) return
          bumpStat(winner.id, 'minigameWins', 1)
          onDone(`🏆 Minigame-Sieg für ${winner.name}`)
        }}
      >
        🏆 Minigame gewonnen
      </button>
    </>
  )
}
