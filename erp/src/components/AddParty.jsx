import { useState } from 'react'
import PageHeader from './PageHeader'
import { addParty } from '../api'

const isNumber = (v) => v === '' || Number.isFinite(Number(v))

export default function AddParty({ onBack, onDone }) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [cash, setCash] = useState('')
  const [metal, setMetal] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const save = async () => {
    if (!name.trim()) return setError('Name is required.')
    if (!isNumber(cash)) return setError('Cash must be a number.')
    if (!isNumber(metal)) return setError('Metal must be a number.')
    setError('')
    setSaving(true)
    try {
      const party = await addParty({ name, description, cash, metal })
      window.alert(`Party "${party.name}" added.`)
      onDone()
    } catch (e) {
      setError(e.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="salelist">
      <PageHeader title="Add Party" onBack={onBack} />
      <div className="formpage">
        <label className="form-field">
          <span>Name</span>
          <input autoFocus autoComplete="off" value={name} onChange={(e) => setName(e.target.value)} />
        </label>
        <label className="form-field">
          <span>Description</span>
          <input autoComplete="off" value={description} onChange={(e) => setDescription(e.target.value)} />
        </label>
        <label className="form-field">
          <span>Cash (Rs)</span>
          <input autoComplete="off" type="number" value={cash} onChange={(e) => setCash(e.target.value)} />
        </label>
        <label className="form-field">
          <span>Metal (g)</span>
          <input autoComplete="off" type="number" value={metal} onChange={(e) => setMetal(e.target.value)} />
        </label>
        <p className="form-hint">Opening balances. Positive means the party owes you; negative means you owe them.</p>
        {error && <p className="form-error">{error}</p>}
        <button type="button" className="btn-primary btn-save" onClick={save} disabled={saving}>
          {saving ? 'SAVING…' : 'SAVE'}
        </button>
      </div>
    </div>
  )
}
