import { useState } from 'react'
import { useStore } from '../store'
import type { DiceEntry, DiceTable } from '../types'
import { formatMoney, rollDie } from '../util'

export function DiceView() {
  const { state } = useStore()
  const [teamId, setTeamId] = useState<string>('')

  const selectedTeam = state.teams.find((t) => t.id === teamId) ?? null

  return (
    <section>
      <div className="dice-team-picker">
        <label>
          Ergebnisse anwenden auf:
          <select value={teamId} onChange={(e) => setTeamId(e.target.value)}>
            <option value="">— kein Team —</option>
            {state.teams.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </label>
        {state.teams.length === 0 && (
          <p className="muted small">
            Lege zuerst unter „Teams“ ein Team an, um Ergebnisse direkt gutzuschreiben.
          </p>
        )}
      </div>

      <div className="dice-tables">
        {state.diceTables.map((table) => (
          <DiceTableCard
            key={table.id}
            table={table}
            teamId={selectedTeam?.id ?? null}
          />
        ))}
      </div>
    </section>
  )
}

function DiceTableCard({
  table,
  teamId,
}: {
  table: DiceTable
  teamId: string | null
}) {
  const { adjustCash, setJob, addActionCard } = useStore()
  const [result, setResult] = useState<number | null>(null)
  const [rolling, setRolling] = useState(false)

  const landed: DiceEntry | undefined =
    result != null ? table.entries.find((e) => e.roll === result) : undefined

  const roll = () => {
    setRolling(true)
    // Kurze "Rüttel"-Animation, dann Endergebnis.
    let ticks = 0
    const interval = setInterval(() => {
      setResult(rollDie(table.entries.length))
      ticks++
      if (ticks >= 8) {
        clearInterval(interval)
        setResult(rollDie(table.entries.length))
        setRolling(false)
      }
    }, 60)
  }

  return (
    <div className="dice-card">
      <div className="dice-card-head">
        <h3>{table.name}</h3>
        <button className="btn primary dice-roll-btn" onClick={roll} disabled={rolling}>
          <span className={rolling ? 'die spinning' : 'die'}>🎲</span>
          {result == null ? 'Würfeln' : 'Nochmal'}
        </button>
      </div>

      <ol className="dice-entries">
        {table.entries.map((e) => (
          <li
            key={e.roll}
            className={e.roll === result ? 'dice-entry hit' : 'dice-entry'}
          >
            <span className="dice-roll-num">{e.roll}</span>
            <span className="dice-entry-main">
              <strong>{e.label}</strong>
              {e.detail && <em>{e.detail}</em>}
            </span>
            {e.amount != null && e.amount !== 0 && (
              <span className={e.amount > 0 ? 'dice-amount pos' : 'dice-amount neg'}>
                {e.amount > 0 ? '+' : ''}
                {formatMoney(e.amount)}
              </span>
            )}
          </li>
        ))}
      </ol>

      {landed && !rolling && (
        <div className="dice-outcome">
          <p>
            Gewürfelt: <strong>{landed.label}</strong>
            {landed.amount != null && landed.amount !== 0 && (
              <> ({landed.amount > 0 ? '+' : ''}{formatMoney(landed.amount)})</>
            )}
          </p>
          {teamId && (
            <div className="dice-apply">
              {landed.amount != null && landed.amount !== 0 && (
                <button
                  className="btn small"
                  onClick={() =>
                    adjustCash(teamId, landed.amount!, `Würfel: ${landed.label}`)
                  }
                >
                  Betrag gutschreiben
                </button>
              )}
              {landed.amount != null && landed.amount > 0 && (
                <button
                  className="btn small ghost"
                  onClick={() =>
                    setJob(teamId, { title: landed.label, salary: landed.amount! })
                  }
                >
                  Als Job setzen
                </button>
              )}
              <button
                className="btn small ghost"
                onClick={() => addActionCard(teamId, landed.label, landed.detail)}
              >
                Als Aktionskarte
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
