import { useEffect, useState } from 'react'
import PageHeader from './PageHeader'
import { askConfirm } from './ConfirmHost'
import { deleteParty, getParty, updateParty } from '../api'
import { gramsText, money, sideText } from '../txn'

const isNumber = (v) => v === '' || Number.isFinite(Number(v))

// A party opened from Alter Party: read-only with Edit and Delete; Edit changes
// the name, description and the opening cash and metal.
export default function PartyDetail({ partyId, onBack, onDone }) {
  const [mode, setMode] = useState('view') // view | edit
  const [loading, setLoading] = useState(true)
  const [info, setInfo] = useState(null)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [cash, setCash] = useState('')
  const [metal, setMetal] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const readOnly = mode === 'view'

  const load = async () => {
    const p = await getParty(partyId)
    setInfo(p)
    setName(p.name)
    setDescription(p.description)
    setCash(p.openingCash ? String(p.openingCash) : '')
    setMetal(p.openingMetal ? String(p.openingMetal) : '')
  }

  useEffect(() => {
    load()
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  const save = async () => {
    if (!name.trim()) return setError('Name is required.')
    if (!isNumber(cash) || !isNumber(metal)) return setError('Cash and metal must be numbers.')
    setError('')
    setSaving(true)
    try {
      await updateParty(partyId, { name, description, openingCash: cash, openingMetal: metal })
      await load()
      setMode('view')
    } catch (e) {
      setError(e.message)
    } finally {
      setSaving(false)
    }
  }

  const remove = async () => {
    if (info.bills || info.txns) {
      const parts = [info.bills && `${info.bills} sale${info.bills > 1 ? 's' : ''}`, info.txns && `${info.txns} transaction${info.txns > 1 ? 's' : ''}`].filter(Boolean)
      return setError(`This party still has ${parts.join(' and ')}. Delete ${parts.length > 1 ? 'those' : 'it'} first.`)
    }
    const ok = await askConfirm({
      title: `Delete ${info.name}?`,
      message: 'Warning: the party and its opening balance are removed from the lists. This cannot be undone.',
    })
    if (!ok) return
    setSaving(true)
    try {
      await deleteParty(partyId)
      onDone()
    } catch (e) {
      setError(e.message)
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="salelist">
        <PageHeader title="Party" onBack={onBack} />
        <p className="salelist-empty">{error || 'Loading…'}</p>
      </div>
    )
  }

  return (
    <div className="salelist">
      <PageHeader title={readOnly ? info.name : `Edit ${info.name}`} onBack={onBack} />
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
          <span>Opening cash (Rs)</span>
          <input autoComplete="off" type="number" value={cash} readOnly={readOnly} onChange={(e) => setCash(e.target.value)} />
        </label>
        <label className="form-field">
          <span>Opening metal (g)</span>
          <input autoComplete="off" type="number" value={metal} readOnly={readOnly} onChange={(e) => setMetal(e.target.value)} />
        </label>
        <p className="form-hint">
          {readOnly
            ? `Current balance: Rs ${money(info.cash)} (${sideText(info.cash)}) · ${gramsText(info.metal)} (${sideText(info.metal)})`
            : 'Changing the opening balance changes the current balance by the same amount.'}
        </p>
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
            <button
              type="button"
              className="btn-ghost btn-save"
              disabled={saving}
              onClick={async () => {
                setError('')
                await load()
                setMode('view')
              }}
            >
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
