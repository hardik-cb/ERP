import { useState } from 'react'
import PageHeader from './PageHeader'
import { addItem } from '../api'

const isNumber = (v) => v === '' || Number.isFinite(Number(v))

export default function AddItem({ onBack, onDone }) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [pct, setPct] = useState('')
  const [rate, setRate] = useState('')
  const [rateMode, setRateMode] = useState('weight')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const save = async () => {
    if (!name.trim()) return setError('Name is required.')
    if (!isNumber(pct)) return setError('Percentage must be a number.')
    if (!isNumber(rate)) return setError('Rate must be a number.')
    setError('')
    setSaving(true)
    try {
      const item = await addItem({ name, description, pct, rate, rateMode })
      window.alert(`Item "${item.name}" added.`)
      onDone()
    } catch (e) {
      setError(e.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="salelist">
      <PageHeader title="Add Items" onBack={onBack} />
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
          <span>Percentage (%)</span>
          <input
            autoComplete="off"
            type="number"
            placeholder="100"
            value={pct}
            onChange={(e) => setPct(e.target.value)}
          />
        </label>
        <label className="form-field">
          <span>Labour rate (Rs)</span>
          <input autoComplete="off" type="number" value={rate} onChange={(e) => setRate(e.target.value)} />
        </label>
        <div className="form-toggle">
          <button
            type="button"
            className={`toggle-btn ${rateMode === 'weight' ? 'toggle-btn-active' : ''}`}
            onClick={() => setRateMode('weight')}
          >
            Per kg
          </button>
          <button
            type="button"
            className={`toggle-btn ${rateMode === 'piece' ? 'toggle-btn-active' : ''}`}
            onClick={() => setRateMode('piece')}
          >
            Per piece
          </button>
        </div>
        <p className="form-hint">The percentage and rate fill in automatically when this item is added to a sale.</p>
        {error && <p className="form-error">{error}</p>}
        <button type="button" className="btn-primary btn-save" onClick={save} disabled={saving}>
          {saving ? 'SAVING…' : 'SAVE'}
        </button>
      </div>
    </div>
  )
}
