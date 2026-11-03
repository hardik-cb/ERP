import { useState, useRef, useEffect } from 'react'
import { createParty, getParties } from '../api'

export default function PartySearch({ value, onSelect, onEdit, readOnly }) {
  const [query, setQuery] = useState(value || '')
  const [open, setOpen] = useState(false)
  const [parties, setParties] = useState([])
  const wrapRef = useRef(null)

  useEffect(() => {
    getParties().then(setParties).catch(() => {})
  }, [])

  useEffect(() => setQuery(value || ''), [value])

  useEffect(() => {
    const handler = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const matches = query
    ? parties.filter((p) => p.name.toLowerCase().includes(query.toLowerCase()))
    : parties

  const pick = (party) => {
    onSelect(party)
    setQuery(party.name)
    setOpen(false)
  }

  const typed = query.trim()
  const canAdd = typed && !parties.some((p) => p.name.toLowerCase() === typed.toLowerCase())

  const addNew = async () => {
    try {
      const party = await createParty(typed)
      setParties((list) => (list.some((p) => p.id === party.id) ? list : [...list, party]))
      pick(party)
    } catch (e) {
      window.alert(`Could not add party: ${e.message}`)
    }
  }

  return (
    <div className="party-search" ref={wrapRef}>
      <div className="party-search-input">
        <input
          type="text"
          placeholder="Party name"
          value={query}
          autoComplete="off"
          disabled={readOnly}
          onFocus={() => setOpen(true)}
          onChange={(e) => {
            setQuery(e.target.value)
            setOpen(true)
            if (e.target.value !== value) onEdit?.()
          }}
        />
        <span className="search-icon">🔍</span>
      </div>
      {open && (
        <div className="dropdown">
          {canAdd && (
            <button type="button" className="dropdown-item dropdown-add" onClick={addNew}>
              + Add “{typed}”
            </button>
          )}
          {matches.length === 0 && !canAdd && (
            <div className="dropdown-empty">No parties yet. Type a name to add one.</div>
          )}
          {matches.map((p) => (
            <button type="button" key={p.id} className="dropdown-item" onClick={() => pick(p)}>
              {p.name}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
