import { useState } from 'react'
import { TeamsView } from './components/TeamsView'
import { DiceView } from './components/DiceView'
import { ChallengeView } from './components/ChallengeView'
import { AdminView } from './components/AdminView'
import { ConnectionBar } from './components/ConnectionBar'
import { Announcements } from './components/Announcements'

type Tab = 'teams' | 'dice' | 'challenge' | 'admin'

export function App() {
  const [tab, setTab] = useState<Tab>('teams')

  return (
    <div className="app">
      <header className="app-header">
        <div className="brand">
          <img src="./icon.svg" alt="" className="brand-icon" />
          <div>
            <h1>Flunkpanion</h1>
            <p className="tagline">Companion für Flunk des Lebens</p>
          </div>
        </div>
        <ConnectionBar />
      </header>

      <Announcements />

      <main className="app-main">
        {tab === 'teams' && <TeamsView />}
        {tab === 'dice' && <DiceView />}
        {tab === 'challenge' && <ChallengeView />}
        {tab === 'admin' && <AdminView />}
      </main>

      <nav className="tabbar">
        <button
          className={tab === 'teams' ? 'tab active' : 'tab'}
          onClick={() => setTab('teams')}
        >
          <span className="tab-icon">👥</span>
          <span>Mein Team</span>
        </button>
        <button
          className={tab === 'dice' ? 'tab active' : 'tab'}
          onClick={() => setTab('dice')}
        >
          <span className="tab-icon">🎲</span>
          <span>Würfeln</span>
        </button>
        <button
          className={tab === 'challenge' ? 'tab active' : 'tab'}
          onClick={() => setTab('challenge')}
        >
          <span className="tab-icon">⚔️</span>
          <span>Challenge</span>
        </button>
        <button
          className={tab === 'admin' ? 'tab active' : 'tab'}
          onClick={() => setTab('admin')}
        >
          <span className="tab-icon">⚙️</span>
          <span>Admin</span>
        </button>
      </nav>
    </div>
  )
}
