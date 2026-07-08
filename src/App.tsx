import { useState } from 'react'
import { TeamsView } from './components/TeamsView'
import { DiceView } from './components/DiceView'
import { SettingsView } from './components/SettingsView'

type Tab = 'teams' | 'dice' | 'settings'

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
        {tab === 'settings' && <SettingsView />}
      </main>

      <nav className="tabbar">
        <button
          className={tab === 'teams' ? 'tab active' : 'tab'}
          onClick={() => setTab('teams')}
        >
          <span className="tab-icon">👥</span>
          <span>Teams</span>
        </button>
        <button
          className={tab === 'dice' ? 'tab active' : 'tab'}
          onClick={() => setTab('dice')}
        >
          <span className="tab-icon">🎲</span>
          <span>Würfeln</span>
        </button>
        <button
          className={tab === 'settings' ? 'tab active' : 'tab'}
          onClick={() => setTab('settings')}
        >
          <span className="tab-icon">⚙️</span>
          <span>Tabellen</span>
        </button>
      </nav>
    </div>
  )
}
