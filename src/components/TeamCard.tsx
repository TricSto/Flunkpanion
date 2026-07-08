import { useState } from 'react'
import type { Team } from '../types'
import { useStore } from '../store'
import { formatMoney, formatTime } from '../util'
import { Modal } from './Modal'

const QUICK_AMOUNTS = [100, 500, 1000, 5000]

export function TeamCard({ team }: { team: Team }) {
  const {
    adjustCash,
    undoTransaction,
    setJob,
    addActionCard,
    removeActionCard,
    addProperty,
    removeProperty,
    removeTeam,
    renameTeam,
  } = useStore()

  const [open, setOpen] = useState(true)
  const [modal, setModal] = useState<null | 'cash' | 'job' | 'card' | 'property'>(null)

  const propertyTotal = team.properties.reduce((sum, p) => sum + p.value, 0)
  const netWorth = team.cash + propertyTotal

  return (
    <article className="team-card" style={{ borderTopColor: team.color }}>
      <header className="team-card-head">
        <button
          className="team-name"
          onClick={() => setOpen((o) => !o)}
          style={{ color: team.color }}
        >
          <span className="chevron">{open ? '▾' : '▸'}</span>
          {team.name}
        </button>
        <div className="team-cash">
          <span className="cash-value">{formatMoney(team.cash)}</span>
          <span className="cash-label">Cash</span>
        </div>
      </header>

      {open && (
        <div className="team-body">
          {/* Job */}
          <div className="row">
            <div className="row-main">
              <span className="row-label">💼 Job</span>
              {team.job ? (
                <span className="row-value">
                  {team.job.title} · {formatMoney(team.job.salary)}
                </span>
              ) : (
                <span className="row-value muted">Kein Job</span>
              )}
            </div>
            <div className="row-actions">
              {team.job && (
                <button
                  className="btn small"
                  onClick={() =>
                    adjustCash(team.id, team.job!.salary, `Gehalt: ${team.job!.title}`)
                  }
                  title="Gehalt auszahlen"
                >
                  Gehalt +
                </button>
              )}
              <button className="btn small ghost" onClick={() => setModal('job')}>
                {team.job ? 'Ändern' : 'Setzen'}
              </button>
            </div>
          </div>

          {/* Cash-Buttons */}
          <div className="cash-controls">
            <button className="btn small" onClick={() => setModal('cash')}>
              💶 Betrag buchen
            </button>
            {QUICK_AMOUNTS.map((amt) => (
              <span key={amt} className="quick-pair">
                <button
                  className="btn small plus"
                  onClick={() => adjustCash(team.id, amt, 'Schnellbuchung')}
                >
                  +{amt}
                </button>
                <button
                  className="btn small minus"
                  onClick={() => adjustCash(team.id, -amt, 'Schnellbuchung')}
                >
                  −{amt}
                </button>
              </span>
            ))}
          </div>

          {/* Aktionskarten */}
          <div className="section">
            <div className="section-head">
              <h4>🃏 Aktionskarten ({team.actionCards.length})</h4>
              <button className="btn small ghost" onClick={() => setModal('card')}>
                + Karte
              </button>
            </div>
            {team.actionCards.length === 0 ? (
              <p className="muted small">Noch keine Karten gezogen.</p>
            ) : (
              <ul className="chip-list">
                {team.actionCards.map((c) => (
                  <li key={c.id} className="chip">
                    <span className="chip-text">
                      <strong>{c.title}</strong>
                      {c.note && <em> — {c.note}</em>}
                    </span>
                    <button
                      className="chip-x"
                      onClick={() => removeActionCard(team.id, c.id)}
                      aria-label="Karte entfernen"
                    >
                      ✕
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Besitz / Properties */}
          <div className="section">
            <div className="section-head">
              <h4>🏠 Besitz ({team.properties.length})</h4>
              <button className="btn small ghost" onClick={() => setModal('property')}>
                + Besitz
              </button>
            </div>
            {team.properties.length === 0 ? (
              <p className="muted small">Noch kein Besitz.</p>
            ) : (
              <ul className="chip-list">
                {team.properties.map((p) => (
                  <li key={p.id} className="chip">
                    <span className="chip-text">
                      <strong>{p.name}</strong> · {formatMoney(p.value)}
                      {p.note && <em> — {p.note}</em>}
                    </span>
                    <button
                      className="chip-x"
                      onClick={() => removeProperty(team.id, p.id)}
                      aria-label="Besitz entfernen"
                    >
                      ✕
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Verlauf */}
          <div className="section">
            <div className="section-head">
              <h4>🧾 Verlauf ({team.transactions.length})</h4>
            </div>
            {team.transactions.length === 0 ? (
              <p className="muted small">Noch keine Buchungen.</p>
            ) : (
              <ul className="tx-list">
                {team.transactions.slice(0, 8).map((tx) => (
                  <li key={tx.id} className="tx">
                    <span className="tx-time">{formatTime(tx.at)}</span>
                    <span className="tx-reason">{tx.reason}</span>
                    <span className={tx.delta >= 0 ? 'tx-delta pos' : 'tx-delta neg'}>
                      {tx.delta > 0 ? '+' : ''}
                      {formatMoney(tx.delta)}
                    </span>
                    <button
                      className="tx-undo"
                      title="Buchung rückgängig machen"
                      onClick={() => undoTransaction(team.id, tx.id)}
                    >
                      ↩
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Fußzeile: Vermögen + Verwaltung */}
          <div className="team-footer">
            <span className="networth">
              Vermögen (inkl. Besitz): <strong>{formatMoney(netWorth)}</strong>
            </span>
            <div className="team-footer-actions">
              <button
                className="btn tiny ghost"
                onClick={() => {
                  const next = prompt('Neuer Teamname', team.name)
                  if (next != null) renameTeam(team.id, next)
                }}
              >
                Umbenennen
              </button>
              <button
                className="btn tiny danger"
                onClick={() => {
                  if (confirm(`Team „${team.name}“ wirklich löschen?`)) removeTeam(team.id)
                }}
              >
                Löschen
              </button>
            </div>
          </div>
        </div>
      )}

      {modal === 'cash' && (
        <CashModal
          onClose={() => setModal(null)}
          onSubmit={(delta, reason) => {
            adjustCash(team.id, delta, reason)
            setModal(null)
          }}
        />
      )}
      {modal === 'job' && (
        <JobModal
          initial={team.job}
          onClose={() => setModal(null)}
          onSubmit={(job) => {
            setJob(team.id, job)
            setModal(null)
          }}
        />
      )}
      {modal === 'card' && (
        <CardModal
          onClose={() => setModal(null)}
          onSubmit={(title, note) => {
            addActionCard(team.id, title, note)
            setModal(null)
          }}
        />
      )}
      {modal === 'property' && (
        <PropertyModal
          onClose={() => setModal(null)}
          onSubmit={(name, value, note) => {
            addProperty(team.id, name, value, note)
            setModal(null)
          }}
        />
      )}
    </article>
  )
}

// ---- Modals ----------------------------------------------------------------

function CashModal({
  onClose,
  onSubmit,
}: {
  onClose: () => void
  onSubmit: (delta: number, reason: string) => void
}) {
  const [value, setValue] = useState('')
  const [reason, setReason] = useState('')
  const num = Number(value)
  return (
    <Modal title="Betrag buchen" onClose={onClose}>
      <label className="field">
        <span>Betrag (negativ = Ausgabe)</span>
        <input
          type="number"
          inputMode="numeric"
          autoFocus
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="z. B. 1500 oder -500"
        />
      </label>
      <label className="field">
        <span>Grund (optional)</span>
        <input
          type="text"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="z. B. Miete, Bonus…"
        />
      </label>
      <div className="modal-actions">
        <button className="btn ghost" onClick={onClose}>
          Abbrechen
        </button>
        <button
          className="btn primary"
          disabled={!value || Number.isNaN(num)}
          onClick={() => onSubmit(num, reason.trim() || 'Buchung')}
        >
          Buchen
        </button>
      </div>
    </Modal>
  )
}

function JobModal({
  initial,
  onClose,
  onSubmit,
}: {
  initial: Team['job']
  onClose: () => void
  onSubmit: (job: Team['job']) => void
}) {
  const [title, setTitle] = useState(initial?.title ?? '')
  const [salary, setSalary] = useState(initial ? String(initial.salary) : '')
  return (
    <Modal title="Job setzen" onClose={onClose}>
      <label className="field">
        <span>Berufsbezeichnung</span>
        <input
          type="text"
          autoFocus
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="z. B. Ingenieur:in"
        />
      </label>
      <label className="field">
        <span>Gehalt</span>
        <input
          type="number"
          inputMode="numeric"
          value={salary}
          onChange={(e) => setSalary(e.target.value)}
          placeholder="z. B. 4000"
        />
      </label>
      <div className="modal-actions">
        {initial && (
          <button className="btn danger ghost" onClick={() => onSubmit(null)}>
            Job entfernen
          </button>
        )}
        <button className="btn ghost" onClick={onClose}>
          Abbrechen
        </button>
        <button
          className="btn primary"
          disabled={!title.trim()}
          onClick={() => onSubmit({ title: title.trim(), salary: Number(salary) || 0 })}
        >
          Speichern
        </button>
      </div>
    </Modal>
  )
}

function CardModal({
  onClose,
  onSubmit,
}: {
  onClose: () => void
  onSubmit: (title: string, note: string) => void
}) {
  const [title, setTitle] = useState('')
  const [note, setNote] = useState('')
  return (
    <Modal title="Aktionskarte hinzufügen" onClose={onClose}>
      <label className="field">
        <span>Titel</span>
        <input
          type="text"
          autoFocus
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="z. B. Joker"
        />
      </label>
      <label className="field">
        <span>Notiz (optional)</span>
        <input
          type="text"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Kurze Beschreibung"
        />
      </label>
      <div className="modal-actions">
        <button className="btn ghost" onClick={onClose}>
          Abbrechen
        </button>
        <button
          className="btn primary"
          disabled={!title.trim()}
          onClick={() => onSubmit(title, note)}
        >
          Hinzufügen
        </button>
      </div>
    </Modal>
  )
}

function PropertyModal({
  onClose,
  onSubmit,
}: {
  onClose: () => void
  onSubmit: (name: string, value: number, note: string) => void
}) {
  const [name, setName] = useState('')
  const [value, setValue] = useState('')
  const [note, setNote] = useState('')
  return (
    <Modal title="Besitz hinzufügen" onClose={onClose}>
      <label className="field">
        <span>Bezeichnung</span>
        <input
          type="text"
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="z. B. Villa am See"
        />
      </label>
      <label className="field">
        <span>Wert</span>
        <input
          type="number"
          inputMode="numeric"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="z. B. 25000"
        />
      </label>
      <label className="field">
        <span>Notiz (optional)</span>
        <input
          type="text"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Kurze Beschreibung"
        />
      </label>
      <div className="modal-actions">
        <button className="btn ghost" onClick={onClose}>
          Abbrechen
        </button>
        <button
          className="btn primary"
          disabled={!name.trim()}
          onClick={() => onSubmit(name, Number(value) || 0, note)}
        >
          Hinzufügen
        </button>
      </div>
    </Modal>
  )
}
