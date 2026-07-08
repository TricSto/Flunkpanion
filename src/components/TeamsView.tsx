import { useState } from 'react'
import { useStore } from '../store'
import { TeamCard } from './TeamCard'

export function TeamsView() {
  const { state, addTeam } = useStore()
  const [name, setName] = useState('')

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return
    addTeam(name)
    setName('')
  }

  return (
    <section>
      <form className="add-team" onSubmit={submit}>
        <input
          type="text"
          placeholder="Teamname eingeben…"
          value={name}
          onChange={(e) => setName(e.target.value)}
          aria-label="Teamname"
        />
        <button type="submit" className="btn primary">
          + Team
        </button>
      </form>

      {state.teams.length === 0 ? (
        <div className="empty">
          <p className="empty-emoji">🎲</p>
          <p>Noch keine Teams.</p>
          <p className="muted">Legt oben euer erstes Team an und los geht’s!</p>
        </div>
      ) : (
        <div className="team-list">
          {state.teams.map((team) => (
            <TeamCard key={team.id} team={team} />
          ))}
        </div>
      )}
    </section>
  )
}
