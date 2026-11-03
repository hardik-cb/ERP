import { useEffect, useState } from 'react'
import AlterList from './AlterList'
import { listParties } from '../db'
import { gramsText, money, sideText } from '../txn'

export default function AlterParty({ onBack, onAdd, onOpen }) {
  const [rows, setRows] = useState([])
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    listParties()
      .then((ps) =>
        setRows(
          ps.map((p) => ({
            id: p.id,
            name: p.name,
            description: p.description,
            meta: [`Cash Rs ${money(p.cash)} (${sideText(p.cash)})`, `Metal ${gramsText(p.metal)} (${sideText(p.metal)})`],
          }))
        )
      )
      .finally(() => setLoaded(true))
  }, [])

  return (
    <AlterList
      title="Alter Party"
      searchPlaceholder="Search party"
      rows={rows}
      loaded={loaded}
      addLabel="Add Party"
      emptyText="No parties yet. Tap “Add Party”."
      onBack={onBack}
      onAdd={onAdd}
      onOpen={(r) => onOpen(r)}
    />
  )
}
