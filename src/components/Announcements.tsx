import { useEffect, useMemo, useState } from 'react'
import { useStore } from '../store'

const SEEN_KEY = 'flunk-des-lebens/seen-announcements/v1'

function loadSeen(): Set<string> {
  try {
    const raw = localStorage.getItem(SEEN_KEY)
    return new Set(raw ? (JSON.parse(raw) as string[]) : [])
  } catch {
    return new Set()
  }
}

/**
 * Zeigt die neueste, noch nicht gesehene Live-Nachricht als Banner.
 * „Gesehen"-Status ist gerätelokal – Wegklicken auf einem Handy verbirgt die
 * Nachricht nicht auf den anderen.
 */
export function Announcements() {
  const { state } = useStore()
  const [seen, setSeen] = useState<Set<string>>(loadSeen)

  const next = useMemo(
    () => state.announcements.find((a) => !seen.has(a.id)) ?? null,
    [state.announcements, seen],
  )

  useEffect(() => {
    try {
      localStorage.setItem(SEEN_KEY, JSON.stringify([...seen]))
    } catch {
      // ignorieren
    }
  }, [seen])

  if (!next) return null

  const forMe = next.teamId != null && next.teamId === state.currentTeamId
  const dismiss = () => setSeen((s) => new Set(s).add(next.id))

  return (
    <div className={forMe ? 'announcement win' : 'announcement'} role="status">
      <div className="announcement-body">
        <strong className="announcement-title">{next.title}</strong>
        <span className="announcement-msg">{next.message}</span>
      </div>
      <button className="announcement-x" onClick={dismiss} aria-label="Schließen">
        ✕
      </button>
    </div>
  )
}
