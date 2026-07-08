import { useState, type CSSProperties } from 'react'
import { useStore } from '../store'
import type { Card, Team } from '../types'
import { formatMoney, pickRandom, takenJobTitles } from '../util'
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
  { key: 'spielveraendernd', label: 'Spielverändernd', icon: '⚡', color: '#a855f7', sub: 'Karte ziehen' },
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
}: {
  onOpenChallenge: () => void
  onOpenFlunk: () => void
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

      {active && <FieldSheet field={active} onClose={() => setActive(null)} />}
    </section>
  )
}

// ---------------------------------------------------------------------------

function FieldSheet({ field, onClose }: { field: FieldDef; onClose: () => void }) {
  const { state } = useStore()
  const needsTeam = field.key !== 'kingstabelle'
  const [teamId, setTeamId] = useState<string>(
    state.currentTeamId ?? state.teams[0]?.id ?? '',
  )
  const team = state.teams.find((t) => t.id === teamId) ?? null

  return (
    <Modal title={`${field.icon} ${field.label}`} onClose={onClose}>
      {needsTeam &&
        (state.teams.length === 0 ? (
          <p className="muted small">Noch keine Teams. Lege sie im Tab „Setup“ an.</p>
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
  const { state, adjustCash, payBeerTax, addActionCard, setJobTitle, setSalary, addBeer, bumpStat } =
    useStore()
  const [flash, setFlash] = useState<string | null>(null)
  const [drawn, setDrawn] = useState<Card | null>(null)
  const [eventBooked, setEventBooked] = useState(false)

  // Kingstabelle: reines Info-Feld, kein Team nötig.
  if (field.key === 'kingstabelle') {
    return (
      <p className="sheet-info">
        Dieses Feld wird <strong>am Spielbrett erwürfelt</strong> – es läuft nicht
        über die App.
      </p>
    )
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

  // --- Karten ziehen (Aktionskarten / Spielverändernd) ---------------------
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
      setEventBooked(false)
    }
    const amount = drawn?.amount ?? null
    return (
      <>
        <button className="btn primary block" onClick={draw}>
          🎲 {drawn ? 'Neues Ereignis' : 'Ereignis ziehen'}
        </button>
        {drawn && (
          <div className="drawn-card sheet-drawn">
            <div className="drawn-top">
              <strong className="drawn-title">{drawn.title}</strong>
              {amount != null && amount !== 0 && (
                <span className={amount > 0 ? 'dice-amount pos' : 'dice-amount neg'}>
                  {amount > 0 ? '+' : ''}
                  {formatMoney(amount)}
                </span>
              )}
            </div>
            {drawn.detail && <p className="drawn-detail">{drawn.detail}</p>}
            <div className="sheet-actions">
              {amount != null && amount !== 0 && !eventBooked && (
                <button
                  className={amount > 0 ? 'btn small plus' : 'btn small minus'}
                  onClick={() => {
                    adjustCash(team.id, amount, `Ereignis: ${drawn.title}`)
                    setEventBooked(true)
                    say(`${amount > 0 ? '+' : ''}${amount} KK gebucht`)
                  }}
                >
                  {amount > 0 ? 'KK gutschreiben' : 'KK abziehen'} ({amount > 0 ? '+' : ''}
                  {amount})
                </button>
              )}
              <button className="btn small ghost" onClick={onClose}>
                {amount != null && amount !== 0 && !eventBooked ? 'Ohne Buchung fertig' : 'Fertig'}
              </button>
            </div>
          </div>
        )}
        {flashEl}
      </>
    )
  }

  // --- Gehaltspflichtwechsel ----------------------------------------------
  if (field.key === 'gehaltswechsel') {
    const berufe = state.decks.find((d) => d.type === 'job')
    const gehalt = state.decks.find((d) => d.type === 'salary')
    const rollBeruf = () => {
      const taken = takenJobTitles(state.teams, team.id)
      const available = (berufe?.cards ?? []).filter((c) => !taken.has(c.title))
      const card = pickRandom(available)
      if (!card) {
        say('Kein Beruf mehr frei – alle vergeben.')
        return
      }
      setJobTitle(team.id, card.title)
      say(`Neuer Beruf: ${card.title}`)
    }
    const rollGehalt = () => {
      const card = pickRandom(gehalt?.cards ?? [])
      if (!card) return
      setSalary(team.id, card.salary ?? 0, card.beerTax ?? 0)
      say(`Neues Gehalt: ${formatMoney(card.salary ?? 0)} · BS ${card.beerTax ?? 0}`)
    }
    return (
      <>
        <p className="sheet-info">
          Beruf <strong>und</strong> Gehalt müssen neu erwürfelt werden.
        </p>
        <div className="sheet-actions">
          <button className="btn" onClick={rollBeruf}>
            🎲 Neuer Beruf
          </button>
          <button className="btn" onClick={rollGehalt}>
            🎲 Neues Gehalt
          </button>
        </div>
        <p className="muted small sheet-current">
          Aktuell: {job?.title || 'kein Beruf'}
          {job && job.salary > 0 ? ` · ${formatMoney(job.salary)} · BS ${job.beerTax}` : ''}
        </p>
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
            addBeer(team.id, 'normal', 1)
            say('+1 Bier gezählt')
          }}
        >
          🍺 Getränk zählen (+1 Bier)
        </button>
        {flashEl}
      </>
    )
  }

  // --- Minigames (am Brett gespielt, hier nur den Sieg zählen) -------------
  if (field.key === 'minigames') {
    return (
      <>
        <p className="sheet-info">
          Minigame wird <strong>am Spielbrett</strong> gespielt. Trag hier nur den
          Sieg fürs Team ein (für die Endstatistik).
        </p>
        <button
          className="btn primary block"
          onClick={() => {
            bumpStat(team.id, 'minigameWins', 1)
            say(`🏆 Minigame-Sieg für ${team.name}`)
          }}
        >
          🏆 Minigame gewonnen
        </button>
        {flashEl}
      </>
    )
  }

  return null
}
