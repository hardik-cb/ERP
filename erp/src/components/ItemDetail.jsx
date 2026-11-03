import { useState } from 'react'
import PageHeader from './PageHeader'
import { askConfirm } from './ConfirmHost'
import { deleteItem, updateItem } from '../api'

const isNumber = (v) => v === '' || Number.isFinite(Number(v))

// An item opened from Alter Items: read-only with Edit and Delete.
export default function ItemDetail({ item, onBack, onDone }) {
  const [mode, setMode] = useState('view') // view | edit
  const [name, setName] = useState(item.name)
  const [description, setDescription] = useState(item.description)
  const [pct, setPct] = useState(String(item.pct))
  const [rate, setRate] = useState(item.rate == null ? '' : String(item.rate))
  const [rateMode, setRateMode] = useState(item.rateMode)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const readOnly = mode === 'view'

  const save = async () => {
    if (!name.trim()) return setError('Name is required.')
    if (!isNumber(pct)) return setError('Percentage must be a number.')
    if (!isNumber(rate)) return setError('Rate must be a number.')
    setError('')
    setSaving(true)
    try {
      await updateItem(item.id, { name, description, pct, rate, rateMode })
      onDone()
    } catch (e) {
      setError(e.message)
      setSaving(false)
    }
  }

  const remove = async () => {
    const ok = await askConfirm({
      title: `Delete ${item.name}?`,
      message: 'Warning: the item is removed from the item list. Sales already made keep their item lines. This cannot be undone.',
    })
    if (!ok) return
    setSaving(true)
    try {
      await deleteItem(item.id)
      onDone()
    } catch (e) {
      setError(e.message)
      setSaving(false)
    }
  }

  return (
    <div className="salelist">
      <PageHeader title={readOnly ? item.name : `Edit ${item.name}`} onBack={onBack} />
      <div className="formpage">
        <label className="form-field">
          <span>Name</span>
          <input autoComplete="off" value={name} readOnly={readOnly} onChange={(e) => setName(e.target.value)} />
        </label>
        <label className="form-field">
          <span>Description</span>
          <input autoComplete="off" value={description} readOnly={readOnly} onChange={(e) => setDescription(e.target.value)} />
        </label>
        <label className="form-field">
          <span>Percentage (%)</span>
          <input autoComplete="off" type="number" placeholder="100" value={pct} readOnly={readOnly} onChange={(e) => setPct(e.target.value)} />
        </label>
        <label className="form-field">
          <span>Labour rate (Rs)</span>
          <input autoComplete="off" type="number" value={rate} readOnly={readOnly} onChange={(e) => setRate(e.target.value)} />
        </label>
        <div className="form-toggle">
          <button
            type="button"
            className={`toggle-btn ${rateMode === 'weight' ? 'toggle-btn-active' : ''}`}
            disabled={readOnly}
            onClick={() => setRateMode('weight')}
          >
            Per kg
          </button>
          <button
            type="button"
            className={`toggle-btn ${rateMode === 'piece' ? 'toggle-btn-active' : ''}`}
            disabled={readOnly}
            onClick={() => setRateMode('piece')}
          >
            Per piece
          </button>
        </div>
        {error && <p className="form-error">{error}</p>}

        {readOnly ? (
          <div className="form-actions">
            <button type="button" className="btn-primary btn-save" onClick={() => setMode('edit')}>
              EDIT
            </button>
            <button type="button" className="btn-danger btn-save" onClick={remove} disabled={saving}>
              DELETE
            </button>
          </div>
        ) : (
          <div className="form-actions">
            <button type="button" className="btn-ghost btn-save" disabled={saving} onClick={onBack}>
              CANCEL
            </button>
            <button type="button" className="btn-primary btn-save" onClick={save} disabled={saving}>
              {saving ? 'SAVING…' : 'SAVE CHANGES'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
