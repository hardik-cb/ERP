import { useState, useRef, useEffect } from 'react'
import { createItem, getItems } from '../api'

export default function AddItemSearch({ onAdd }) {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [itemList, setItemList] = useState([])
  const wrapRef = useRef(null)

  useEffect(() => {
    getItems().then(setItemList).catch(() => {})
  }, [])

  useEffect(() => {
    const handler = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const matches = query
    ? itemList.filter((i) => i.name.toLowerCase().includes(query.toLowerCase()))
    : itemList

  const pick = (master) => {
    onAdd(master)
    setQuery('')
    setOpen(false)
  }

  const typed = query.trim()
  const canAdd = typed && !itemList.some((i) => i.name.toLowerCase() === typed.toLowerCase())

  const addNew = async () => {
    try {
      const item = await createItem(typed)
      setItemList((list) => (list.some((i) => i.id === item.id) ? list : [...list, item]))
      pick(item)
    } catch (e) {
      window.alert(`Could not add item: ${e.message}`)
    }
  }

  return (
    <div className="add-item-search" ref={wrapRef}>
      <input
        type="text"
        placeholder="+ Search item to add..."
        value={query}
        autoComplete="off"
        onFocus={() => setOpen(true)}
        onChange={(e) => {
          setQuery(e.target.value)
          setOpen(true)
        }}
      />
      {open && (
        <div className="dropdown">
          {canAdd && (
            <button type="button" className="dropdown-item dropdown-add" onClick={addNew}>
              + Add “{typed}”
            </button>
          )}
          {matches.length === 0 && !canAdd && (
            <div className="dropdown-empty">No items yet. Type a name to add one.</div>
          )}
          {matches.map((m) => (
            <button type="button" key={m.id} className="dropdown-item" onClick={() => pick(m)}>
              {m.name}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
