import { useEffect, useState } from 'react'
import PageHeader from './PageHeader'
import { getItems } from '../api'

export const rateText = (item) =>
  item.rate == null ? 'No labour rate' : `Rs ${item.rate}${item.rateMode === 'piece' ? '/pc' : '/kg'}`

// Search box on top, every item below, "Add Items" pill at the bottom.
export default function AlterItems({ onBack, onAdd, onOpen }) {
  const [items, setItems] = useState([])
  const [loaded, setLoaded] = useState(false)
  const [query, setQuery] = useState('')

  useEffect(() => {
    getItems()
      .then(setItems)
      .catch(() => {})
      .finally(() => setLoaded(true))
  }, [])

  const q = query.trim().toLowerCase()
  const shown = q ? items.filter((i) => i.name.toLowerCase().includes(q)) : items

  return (
    <div className="salelist">
      <PageHeader title="Alter Items" onBack={onBack} />
      <div className="alter-search">
        <input autoComplete="off" placeholder="Search item" value={query} onChange={(e) => setQuery(e.target.value)} />
      </div>

      <div className="salelist-body">
        {loaded && shown.length === 0 && (
          <div className="salelist-empty">{items.length === 0 ? 'No items yet. Tap “Add Items”.' : 'No matching item.'}</div>
        )}
        {shown.map((i) => (
          <div className="sale-card alter-card" key={i.id} onClick={() => onOpen(i)}>
            <div className="alter-name">{i.name}</div>
            {i.description && <div className="alter-sub">{i.description}</div>}
            <div className="alter-meta">
              <span>{i.pct}%</span>
              <span>{rateText(i)}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="salelist-fabs">
        <button type="button" className="salelist-fab" onClick={onAdd}>
          <span className="salelist-fab-plus">+</span> Add Items
        </button>
      </div>
    </div>
  )
}
