import { useState, type ReactNode } from 'react'
import { applyTheme, loadTheme, type Theme } from './theme'
import { TeamsView } from './components/TeamsView'
import { AdminView } from './components/AdminView'
import { BoardView } from './components/BoardView'
import { ChallengeView } from './components/ChallengeView'
import { FlunkView } from './components/FlunkView'
import { EndStats } from './components/EndStats'
import { ConnectionBar } from './components/ConnectionBar'
import { Announcements } from './components/Announcements'

type Tab = 'board' | 'teams' | 'admin'
type Overlay = null | 'challenge' | 'flunk' | 'stats'

export function App() {
  // Start auf der Setup-Seite – dort werden Teams angelegt und das
  // Online-Spiel erstellt/beigetreten.
  const [tab, setTab] = useState<Tab>('admin')
  const [overlay, setOverlay] = useState<Overlay>(null)
  const [theme, setTheme] = useState<Theme>(loadTheme)

  const changeTheme = (next: Theme) => {
    applyTheme(next)
    setTheme(next)
  }

  // Das Spielfeld soll komplett ohne Scrollen auf den Bildschirm passen.
  const boardActive = tab === 'board' && overlay === null

  return (
    <div className={boardActive ? 'app app-fit' : 'app'}>
      <header className="app-header">
        <div className="brand">
          <img src="./icon.svg" alt="" className="brand-icon" />
          <div>
            <h1>Flunkpanion</h1>
            <p className="tagline">Companion für Flunk des Lebens</p>
          </div>
        </div>
        {/* Spiel-Code & Live-Status nur auf der Setup-Seite. */}
        {tab === 'admin' && overlay === null && <ConnectionBar />}
      </header>

      <Announcements />

      <main className="app-main">
        {overlay === 'challenge' ? (
          <OverlayShell title="⚔️ Challenge" onBack={() => setOverlay(null)}>
            <ChallengeView />
          </OverlayShell>
        ) : overlay === 'flunk' ? (
          <OverlayShell title="🚩 Flunk-Feld" onBack={() => setOverlay(null)}>
            <FlunkView />
          </OverlayShell>
        ) : overlay === 'stats' ? (
          <OverlayShell title="🏁 Siegesauswertung" onBack={() => setOverlay(null)}>
            <EndStats />
          </OverlayShell>
        ) : (
          <>
            {tab === 'board' && (
              <BoardView
                onOpenChallenge={() => setOverlay('challenge')}
                onOpenFlunk={() => setOverlay('flunk')}
              />
            )}
            {tab === 'teams' && <TeamsView />}
            {tab === 'admin' && (
              <AdminView
                onEndGame={() => setOverlay('stats')}
                theme={theme}
                onThemeChange={changeTheme}
              />
            )}
          </>
        )}
      </main>

      {overlay === null && (
        <nav className="tabbar">
          <TabButton
            active={tab === 'board'}
            onClick={() => setTab('board')}
            icon="🎲"
            label="Spiel"
          />
          <TabButton
            active={tab === 'teams'}
            onClick={() => setTab('teams')}
            icon="👥"
            label="Teams"
          />
          <TabButton
            active={tab === 'admin'}
            onClick={() => setTab('admin')}
            icon="⚙️"
            label="Setup"
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
  title: string
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
