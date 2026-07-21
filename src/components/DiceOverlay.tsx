import { useEffect, useRef, useState } from 'react'
import { rollDie } from '../util'

/** Die wählbaren Würfel (Seitenzahlen). */
const DICE = [6, 8, 10, 12]

/** Dauer der Würfel-Animation und Tick-Abstand in ms. */
const ROLL_MS = 900
const TICK_MS = 75

/**
 * Vollbild-Würfel (🎲-Button oben rechts im Kopfbereich): erst D6/D8/D10/D12
 * wählen (Kacheln wie bei der Ausbildung/Studium-Auswahl), dann läuft eine
 * kurze Würfel-Animation. Das Ergebnis bleibt stehen, bis irgendwo getippt
 * wird – erst dann schließt sich der Würfel.
 */
export function DiceOverlay({ onClose }: { onClose: () => void }) {
  const [sides, setSides] = useState<number | null>(null)
  const [value, setValue] = useState<number | null>(null)
  const [rolling, setRolling] = useState(false)
  const timers = useRef<number[]>([])

  // Laufende Timer beim Schließen aufräumen.
  useEffect(
    () => () => {
      timers.current.forEach((t) => window.clearInterval(t))
      timers.current.forEach((t) => window.clearTimeout(t))
    },
    [],
  )

  const roll = (n: number) => {
    setSides(n)
    setRolling(true)
    setValue(rollDie(n))
    const interval = window.setInterval(() => setValue(rollDie(n)), TICK_MS)
    const stop = window.setTimeout(() => {
      window.clearInterval(interval)
      setValue(rollDie(n))
      setRolling(false)
    }, ROLL_MS)
    timers.current.push(interval, stop)
  }

  // Ergebnis-Phase: ein Tipp irgendwo schließt den Würfel.
  const tapAnywhere = () => {
    if (sides != null && !rolling) onClose()
  }

  return (
    <div className="dice-overlay" role="dialog" aria-modal="true" onClick={tapAnywhere}>
      {sides === null ? (
        <>
          <div className="dice-head">
            <h3>🎲 Würfel</h3>
            <button className="icon-btn" onClick={onClose} aria-label="Schließen">
              ✕
            </button>
          </div>
          <div className="dice-grid">
            {DICE.map((n) => (
              <button key={n} className="dice-pick" onClick={() => roll(n)}>
                <span className="dice-pick-icon">🎲</span>
                <span className="dice-pick-title">D{n}</span>
                <span className="dice-pick-sub">1–{n}</span>
              </button>
            ))}
          </div>
        </>
      ) : (
        <div className="dice-result">
          <span className="dice-result-die muted">D{sides}</span>
          <span className={rolling ? 'dice-result-value rolling' : 'dice-result-value'}>
            {value}
          </span>
          <span className="dice-result-hint muted small">
            {rolling ? 'Würfelt…' : 'Zum Schließen irgendwo tippen'}
          </span>
        </div>
      )}
    </div>
  )
}
