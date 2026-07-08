import { useStore } from '../store'
import type { DiceEntry, DiceTable } from '../types'

export function SettingsView() {
  const { state, updateDiceTables, resetAll } = useStore()

  const updateTable = (id: string, fn: (t: DiceTable) => DiceTable) => {
    updateDiceTables(state.diceTables.map((t) => (t.id === id ? fn(t) : t)))
  }

  const updateEntry = (
    tableId: string,
    roll: number,
    patch: Partial<DiceEntry>,
  ) => {
    updateTable(tableId, (t) => ({
      ...t,
      entries: t.entries.map((e) => (e.roll === roll ? { ...e, ...patch } : e)),
    }))
  }

  return (
    <section>
      <p className="muted small settings-intro">
        Passt hier die Würfeltabellen an euer Spiel an. Änderungen werden
        automatisch gespeichert.
      </p>

      {state.diceTables.map((table) => (
        <div key={table.id} className="settings-table">
          <label className="field">
            <span>Tabellenname</span>
            <input
              type="text"
              value={table.name}
              onChange={(e) =>
                updateTable(table.id, (t) => ({ ...t, name: e.target.value }))
              }
            />
          </label>

          <div className="settings-entries">
            {table.entries.map((entry) => (
              <div key={entry.roll} className="settings-entry">
                <span className="settings-roll">{entry.roll}</span>
                <div className="settings-entry-fields">
                  <input
                    type="text"
                    value={entry.label}
                    placeholder="Bezeichnung"
                    onChange={(e) =>
                      updateEntry(table.id, entry.roll, { label: e.target.value })
                    }
                  />
                  <input
                    type="text"
                    value={entry.detail}
                    placeholder="Beschreibung (optional)"
                    onChange={(e) =>
                      updateEntry(table.id, entry.roll, { detail: e.target.value })
                    }
                  />
                  <input
                    type="number"
                    inputMode="numeric"
                    value={entry.amount ?? ''}
                    placeholder="Betrag (optional)"
                    onChange={(e) =>
                      updateEntry(table.id, entry.roll, {
                        amount: e.target.value === '' ? null : Number(e.target.value),
                      })
                    }
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}

      <div className="danger-zone">
        <button
          className="btn danger"
          onClick={() => {
            if (
              confirm(
                'Wirklich alles zurücksetzen? Alle Teams und Anpassungen gehen verloren.',
              )
            ) {
              resetAll()
            }
          }}
        >
          Alles zurücksetzen
        </button>
      </div>
    </section>
  )
}
