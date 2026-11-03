import { useEffect, useState } from 'react'
import PageHeader from './PageHeader'
import { listParties } from '../api'
import { gramsText, money, sideText } from '../txn'

// Search box on top, every party below, "Add Party" pill at the bottom.
export default function AlterParty({ onBack, onAdd, onOpen }) {
  const [parties, setParties] = useState([])
  const [loaded, setLoaded] = useState(false)
  const [query, setQuery] = useState('')

  useEffect(() => {
    listParties()
      .then(setParties)
      .catch(() => {})
      .finally(() => setLoaded(true))
  }, [])

  const q = query.trim().toLowerCase()
  const shown = q ? parties.filter((p) => p.name.toLowerCase().includes(q)) : parties

  return (
    <div className="salelist">
      <PageHeader title="Alter Party" onBack={onBack} />
      <div className="alter-search">
        <input autoComplete="off" placeholder="Search party" value={query} onChange={(e) => setQuery(e.target.value)} />
      </div>

      <div className="salelist-body">
        {loaded && shown.length === 0 && (
          <div className="salelist-empty">{parties.length === 0 ? 'No parties yet. Tap “Add Party”.' : 'No matching party.'}</div>
        )}
        {shown.map((p) => (
          <div className="sale-card alter-card" key={p.id} onClick={() => onOpen(p)}>
            <div className="alter-name">{p.name}</div>
            {p.description && <div className="alter-sub">{p.description}</div>}
            <div className="alter-meta">
              <span>
                Cash Rs {money(p.cash)} ({sideText(p.cash)})
              </span>
              <span>
                Metal {gramsText(p.metal)} ({sideText(p.metal)})
              </span>
            </div>
          </div>
        ))}
      </div>

      <div className="salelist-fabs">
        <button type="button" className="salelist-fab" onClick={onAdd}>
          <span className="salelist-fab-plus">+</span> Add Party
        </button>
      </div>
    </div>
  )
}
