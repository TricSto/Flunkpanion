import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'

/** Nach so vielen ms verschwindet der Popover auch ohne Tipp von selbst. */
const AUTO_CLOSE_MS = 4000

/**
 * Kleine schwebende Info-Meldung (z. B. „Aktie gekauft"). Liegt per Portal
 * über dem Inhalt und verschiebt daher nichts auf der Seite. Verschwindet
 * bei einem Tipp/Klick irgendwo (der Tipp geht dabei normal an die App
 * durch), über das ✕ oder nach ein paar Sekunden von selbst.
 */
export function FlashPopover({ message, onClose }: { message: string; onClose: () => void }) {
  // onClose wird von den Aufrufern meist inline übergeben – über die Ref
  // bleibt der Effekt trotzdem stabil und der Auto-Close-Timer startet
  // nicht bei jedem Re-Render neu.
  const closeRef = useRef(onClose)
  closeRef.current = onClose

  useEffect(() => {
    const dismiss = () => closeRef.current()
    // Capture-Phase: schließt bei jedem Tipp, ohne den Tipp zu schlucken.
    document.addEventListener('pointerdown', dismiss, true)
    const timer = window.setTimeout(dismiss, AUTO_CLOSE_MS)
    return () => {
      document.removeEventListener('pointerdown', dismiss, true)
      window.clearTimeout(timer)
    }
  }, [message])

  return createPortal(
    <div className="flash-popover" role="status">
      <span className="flash-popover-text">{message}</span>
      <button className="flash-popover-x" onClick={onClose} aria-label="Schließen">
        ✕
      </button>
    </div>,
    document.body,
  )
}
