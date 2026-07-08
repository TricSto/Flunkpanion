import { useState } from 'react'
import { TeamsView } from './components/TeamsView'
import { DiceView } from './components/DiceView'
import { AdminView } from './components/AdminView'

type Tab = 'teams' | 'dice' | 'admin'

export function App() {
  const [tab, setTab] = useState<Tab>('teams')

  return (
    <div className="app">
      <header className="app-header">
        <div className="brand">
          <img src="./icon.svg" alt="" className="brand-icon" />
          <div>
            <h1>Flunk des Lebens</h1>
            <p className="tagline">Spiel-Begleiter</p>
          </div>
        </div>
      </header>

      <main className="app-main">
        {tab === 'teams' && <TeamsView />}
        {tab === 'dice' && <DiceView />}
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
