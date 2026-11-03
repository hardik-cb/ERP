import { useEffect, useState } from 'react'
import PageHeader from './PageHeader'
import { askConfirm } from './ConfirmHost'
import EditLog from './EditLog'
import { addTransaction, deleteTransaction, getTransaction, getTransactionLog, updateTransaction } from '../api'

const isNumber = (v) => v === '' || (Number.isFinite(Number(v)) && Number(v) >= 0)

// direction 'in': the party pays or hands over, so their balance is deducted.
// direction 'out': the shop pays or hands over, so it is added to their balance.
// With txnId it opens that saved transaction read-only, with Edit and Delete.
export default function TransactionForm({ direction, party, txnId, onBack, onDone }) {
  const [mode, setMode] = useState(txnId ? 'view' : 'new') // new | view | edit
  const [loading, setLoading] = useState(Boolean(txnId))
  const [cash, setCash] = useState('')
  const [metal, setMetal] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const isIn = direction === 'in'
  const readOnly = mode === 'view'
  const [editLog, setEditLog] = useState([])

  const load = async () => {
    const t = await getTransaction(txnId)
    setCash(t.cash ? String(t.cash) : '')
    setMetal(t.metal ? String(t.metal) : '')
  }

  useEffect(() => {
    if (!txnId) return
    load()
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  // Edit trail under an opened transaction; refreshed whenever the view is shown again.
  useEffect(() => {
    if (txnId && mode === 'view') getTransactionLog(txnId).then(setEditLog).catch(() => {})
  }, [txnId, mode])

  const save = async () => {
    if (!isNumber(cash) || !isNumber(metal)) return setError('Enter positive numbers only.')
    if (!Number(cash) && !Number(metal)) return setError('Enter a cash or metal amount.')
    setError('')
    setSaving(true)
    try {
      if (mode === 'edit') {
        await updateTransaction(txnId, { cash, metal })
        window.alert('Transaction updated.')
      } else {
        await addTransaction({ partyId: party.id, direction, cash, metal })
        window.alert(`${isIn ? 'Transaction In' : 'Transaction Out'} saved.`)
      }
      onDone()
    } catch (e) {
      setError(e.message)
    } finally {
      setSaving(false)
    }
  }

  const remove = async () => {
    const what = [Number(cash) && `Rs ${cash}`, Number(metal) && `${metal}g`].filter(Boolean).join(' and ')
    const effect = isIn ? 'added back to what they owe' : 'deducted from what they owe'
    const ok = await askConfirm({
      title: `Delete ${isIn ? 'Transaction In' : 'Transaction Out'}?`,
      message: `${what} for ${party.name}\n\nWarning: ${what} will be ${effect}. This cannot be undone.`,
    })
    if (!ok) return
    setSaving(true)
    try {
      await deleteTransaction(txnId)
      onDone()
    } catch (e) {
      setError(e.message)
      setSaving(false)
    }
  }

  const cancelEdit = async () => {
    setError('')
    await load()
    setMode('view')
  }

  if (loading) return <div className="salelist"><PageHeader title="Transaction" onBack={onBack} /><p className="salelist-empty">Loading…</p></div>

  return (
    <div className="salelist">
      <PageHeader title={isIn ? 'Transaction In' : 'Transaction Out'} onBack={onBack} />
      <div className="formpage">
        <label className="form-field">
          <span>Party name</span>
          <input value={party.name} readOnly />
        </label>
        <label className="form-field">
          <span>Cash (Rs)</span>
          <input
            autoFocus={mode === 'new'}
            autoComplete="off"
            type="number"
            min="0"
            value={cash}
            readOnly={readOnly}
            onChange={(e) => setCash(e.target.value)}
          />
        </label>
        <label className="form-field">
          <span>Metal (g)</span>
          <input autoComplete="off" type="number" min="0" value={metal} readOnly={readOnly} onChange={(e) => setMetal(e.target.value)} />
        </label>
        {!readOnly && (
          <p className="form-hint">
            {isIn
              ? 'Received from the party: the amounts are deducted from what they owe.'
              : 'Given to the party: the amounts are added to what they owe.'}
          </p>
        )}
        {error && <p className="form-error">{error}</p>}

        {mode === 'view' ? (
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
            {mode === 'edit' && (
              <button type="button" className="btn-ghost btn-save" onClick={cancelEdit} disabled={saving}>
                CANCEL
              </button>
            )}
            <button type="button" className="btn-primary btn-save" onClick={save} disabled={saving}>
              {saving ? 'SAVING…' : mode === 'edit' ? 'SAVE CHANGES' : 'SAVE'}
            </button>
          </div>
        )}

        {mode === 'view' && <EditLog entries={editLog} />}
      </div>
    </div>
  )
}
