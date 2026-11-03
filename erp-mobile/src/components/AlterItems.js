import { useEffect, useState } from 'react'
import AlterList from './AlterList'
import { getItems } from '../db'

const rateText = (i) => (i.rate == null ? 'No labour rate' : `Rs ${i.rate}${i.rateMode === 'piece' ? '/pc' : '/kg'}`)

export default function AlterItems({ onBack, onAdd, onOpen }) {
  const [items, setItems] = useState([])
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    getItems()
      .then(setItems)
      .finally(() => setLoaded(true))
  }, [])

  const rows = items.map((i) => ({ id: i.id, name: i.name, description: i.description, meta: [`${i.pct}%`, rateText(i)] }))

  return (
    <AlterList
      title="Alter Items"
      searchPlaceholder="Search item"
      rows={rows}
      loaded={loaded}
      addLabel="Add Items"
      emptyText="No items yet. Tap “Add Items”."
      onBack={onBack}
      onAdd={onAdd}
      onOpen={(r) => onOpen(items.find((i) => i.id === r.id))}
    />
  )
}
