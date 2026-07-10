import { useRef, useState, type ReactNode, type TouchEvent } from 'react'
import { applyTheme, loadTheme, type Theme } from './theme'
import { TeamsView } from './components/TeamsView'
import { AdminView } from './components/AdminView'
import { BoardView } from './components/BoardView'
import { ChallengeView } from './components/ChallengeView'
import { FlunkView } from './components/FlunkView'
import { EndStats } from './components/EndStats'
import { ConnectionBar } from './components/ConnectionBar'
import { Announcements } from './components/Announcements'
import { FeedbackView } from './components/FeedbackView'
import { SpielbrettView } from './components/SpielbrettView'
import { KartenView } from './components/KartenView'
import { FieldIcon } from './components/FieldIcon'

// 'feedback' und 'spielbrett' sind temporäre Seiten (können später wieder raus).
type Tab = 'board' | 'teams' | 'admin' | 'feedback' | 'spielbrett' | 'karten'
type Overlay = null | 'challenge' | 'flunk' | 'stats'

/** Reihenfolge der Seiten – bestimmt, wohin ein Wisch nach links/rechts führt. */
const TAB_ORDER: Tab[] = ['board', 'teams', 'admin', 'feedback', 'spielbrett', 'karten']

/** Mindest-Wischstrecke in px; quer muss klar dominieren, damit
    normales Scrollen nicht aus Versehen die Seite wechselt. */
const SWIPE_MIN_X = 56

export function App() {
  // Start auf der Setup-Seite – dort werden Teams angelegt und das
  // Online-Spiel erstellt/beigetreten.
  const [tab, setTab] = useState<Tab>('admin')
  const [overlay, setOverlay] = useState<Overlay>(null)
  // Nach „Getränk zählen" (Edward 20 Hands) soll die Teamseite direkt den
  // Bierzähler zeigen – sonst geht die Weiterleitung visuell unter.
  const [teamsFocus, setTeamsFocus] = useState<'beers' | null>(null)
  const [theme, setTheme] = useState<Theme>(loadTheme)
  // Richtung des letzten Seitenwechsels für die Slide-Animation.
  const [slideFrom, setSlideFrom] = useState<'left' | 'right' | null>(null)
  const touchStart = useRef<{ x: number; y: number } | null>(null)

  const changeTheme = (next: Theme) => {
    applyTheme(next)
    setTheme(next)
  }

  const switchTab = (next: Tab) => {
    if (next === tab) return
    setSlideFrom(TAB_ORDER.indexOf(next) > TAB_ORDER.indexOf(tab) ? 'right' : 'left')
    setTab(next)
  }

  const onTouchStart = (e: TouchEvent) => {
    const t = e.touches[0]
    touchStart.current = { x: t.clientX, y: t.clientY }
  }

  const onTouchEnd = (e: TouchEvent) => {
    const start = touchStart.current
    touchStart.current = null
    if (!start || overlay !== null) return
    const t = e.changedTouches[0]
    const dx = t.clientX - start.x
    const dy = t.clientY - start.y
    if (Math.abs(dx) < SWIPE_MIN_X || Math.abs(dx) < Math.abs(dy) * 1.5) return
    const next = TAB_ORDER[TAB_ORDER.indexOf(tab) + (dx < 0 ? 1 : -1)]
    if (next) switchTab(next)
  }

  // Das Spielfeld soll komplett ohne Scrollen auf den Bildschirm passen.
  const boardActive = tab === 'board' && overlay === null

  return (
    <div className={boardActive ? 'app app-fit' : 'app'}>
      <header className="app-header">
        <div className="brand">
          {/* FdL-Logo vom Spielbrett (siehe docs/altes-spielbrett.pdf). */}
          <img src="./logo-fdl.png" alt="" className="brand-icon" />
          <div>
            <h1>Flunkpanion</h1>
            <p className="tagline">Companion für Flunk des Lebens</p>
          </div>
        </div>
        {/* Spiel-Code & Live-Status nur auf der Setup-Seite. */}
        {tab === 'admin' && overlay === null && <ConnectionBar />}
      </header>

      <Announcements />

      <main className="app-main" onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
        {overlay === 'challenge' ? (
          <OverlayShell
            title={
              <>
                <FieldIcon kind="challenge" /> Challenge
              </>
            }
            onBack={() => setOverlay(null)}
          >
            <ChallengeView onClose={() => setOverlay(null)} />
          </OverlayShell>
        ) : overlay === 'flunk' ? (
          <OverlayShell
            title={
              <>
                <FieldIcon kind="flunk" /> Flunk-Feld
              </>
            }
            onBack={() => setOverlay(null)}
          >
            <FlunkView />
          </OverlayShell>
        ) : overlay === 'stats' ? (
          <OverlayShell title="🏁 Siegesauswertung" onBack={() => setOverlay(null)}>
            <EndStats />
          </OverlayShell>
        ) : (
          <div
            key={tab}
            className={slideFrom ? `page page-from-${slideFrom}` : 'page'}
          >
            {tab === 'board' && (
              <BoardView
                onOpenChallenge={() => setOverlay('challenge')}
                onOpenFlunk={() => setOverlay('flunk')}
                onGoToTeams={(focus) => {
                  setTeamsFocus(focus ?? null)
                  switchTab('teams')
                }}
              />
            )}
            {tab === 'teams' && (
              <TeamsView
                focusBeers={teamsFocus === 'beers'}
                onFocusDone={() => setTeamsFocus(null)}
              />
            )}
            {tab === 'admin' && (
              <AdminView
                onEndGame={() => setOverlay('stats')}
                onGoToTeams={() => switchTab('teams')}
                theme={theme}
                onThemeChange={changeTheme}
              />
            )}
            {tab === 'feedback' && <FeedbackView />}
            {tab === 'spielbrett' && <SpielbrettView />}
            {tab === 'karten' && <KartenView />}
          </div>
        )}
      </main>

      {overlay === null && (
        <nav className="tabbar">
          <TabButton
            active={tab === 'board'}
            onClick={() => switchTab('board')}
            icon="🎲"
            label="Spiel"
          />
          <TabButton
            active={tab === 'teams'}
            onClick={() => switchTab('teams')}
            icon="👥"
            label="Teams"
          />
          <TabButton
            active={tab === 'admin'}
            onClick={() => switchTab('admin')}
            icon="⚙️"
            label="Setup"
          />
          <TabButton
            active={tab === 'feedback'}
            onClick={() => switchTab('feedback')}
            icon="💬"
            label="Feedback"
          />
          <TabButton
            active={tab === 'spielbrett'}
            onClick={() => switchTab('spielbrett')}
            icon="🗺️"
            label="Spielbrett"
          />
          <TabButton
            active={tab === 'karten'}
            onClick={() => switchTab('karten')}
            icon="🃏"
            label="Karten"
          />
        </nav>
      )}
    </div>
  )
}

function TabButton({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean
  onClick: () => void
  icon: string
  label: string
}) {
  return (
    <button className={active ? 'tab active' : 'tab'} onClick={onClick}>
      <span className="tab-icon">{icon}</span>
      <span>{label}</span>
    </button>
  )
}

function OverlayShell({
  title,
  onBack,
  children,
}: {
  title: ReactNode
  onBack: () => void
  children: ReactNode
}) {
  return (
    <div className="overlay-screen">
      <div className="overlay-head">
        <button className="btn ghost small" onClick={onBack}>
          ‹ Zurück
        </button>
        <h2>{title}</h2>
        <span className="overlay-spacer" />
      </div>
      {children}
    </div>
  )
}
