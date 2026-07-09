import { useState } from 'react'
import { useStore } from '../store'
import { Modal } from './Modal'

/**
 * Verbindungsleiste: Online-Spiel erstellen/beitreten/verlassen und den
 * aktuellen Live-Status anzeigen. Ohne konfigurierten Server läuft die App
 * im lokalen Modus – dann nur ein dezenter Hinweis.
 */
export function ConnectionBar() {
  const { session, connectionStatus, isRemoteConfigured, createGame, joinGame, leaveGame } =
    useStore()
  const [modal, setModal] = useState<null | 'join'>(null)
  const [busy, setBusy] = useState(false)
  const [copied, setCopied] = useState(false)

  if (!isRemoteConfigured) {
    return (
      <div className="conn-bar local">
        <span className="conn-dot local" />
        <span className="conn-text">Lokaler Modus – kein Server verbunden</span>
      </div>
    )
  }

  const statusLabel =
    connectionStatus === 'live'
      ? 'Live'
      : connectionStatus === 'connecting'
        ? 'Verbinde…'
        : connectionStatus === 'error'
          ? 'Verbindungsfehler'
          : 'Offline'

  const create = async () => {
    setBusy(true)
    const code = await createGame()
    setBusy(false)
    if (!code) alert('Spiel konnte nicht erstellt werden. Bitte erneut versuchen.')
  }

  const copyCode = async () => {
    if (!session) return
    try {
      await navigator.clipboard.writeText(session.code)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1500)
    } catch {
      // Zwischenablage nicht verfügbar – ignorieren.
    }
  }

  return (
    <div className={session ? 'conn-bar online' : 'conn-bar'}>
      {session ? (
        <>
          <span className={`conn-dot ${connectionStatus}`} />
          <button className="conn-code" onClick={copyCode} title="Code kopieren">
            {copied ? 'Kopiert!' : session.code}
          </button>
          <span className="conn-text">{statusLabel}</span>
          <button className="btn tiny ghost" onClick={leaveGame}>
            Verlassen
          </button>
        </>
      ) : (
        <>
          <span className="conn-dot local" />
          <span className="conn-text">Nur auf diesem Gerät</span>
          <button className="btn tiny" onClick={create} disabled={busy}>
            Spiel erstellen
          </button>
          <button className="btn tiny ghost" onClick={() => setModal('join')}>
            Beitreten
          </button>
        </>
      )}

      {modal === 'join' && (
        <JoinModal
          onClose={() => setModal(null)}
          onJoin={async (code) => {
            const res = await joinGame(code)
            if (res.ok) setModal(null)
            return res
          }}
        />
      )}
    </div>
  )
}

function JoinModal({
  onClose,
  onJoin,
}: {
  onClose: () => void
  onJoin: (code: string) => Promise<{ ok: boolean; error?: string }>
}) {
  const [code, setCode] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const submit = async () => {
    if (busy || !code.trim()) return
    setBusy(true)
    setError(null)
    const res = await onJoin(code)
    setBusy(false)
    if (!res.ok) setError(res.error ?? 'Beitritt fehlgeschlagen.')
  }

  return (
    <Modal title="Spiel beitreten" onClose={onClose}>
      <form
        onSubmit={(e) => {
          e.preventDefault()
          void submit()
        }}
      >
        <label className="field">
          <span>Spiel-Code</span>
          <input
            type="text"
            value={code}
            autoFocus
            maxLength={6}
            autoComplete="off"
            autoCapitalize="characters"
            enterKeyHint="go"
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="z. B. 7Q2X"
            className="code-input"
          />
        </label>
        {error && <p className="form-error">{error}</p>}
        <button
          type="submit"
          className="btn success big block join-submit"
          disabled={busy || !code.trim()}
        >
          {busy ? 'Verbinde…' : 'Beitreten'}
        </button>
        <button type="button" className="btn ghost block" onClick={onClose}>
          Abbrechen
        </button>
      </form>
    </Modal>
  )
}
