import { useState } from 'react'
import { createId } from '../id'

export default function PackagingPopup({ side, initial, onSave, onClose }) {
  const [rows, setRows] = useState(() =>
    initial && initial.length ? initial : []
  )

  const addRow = () => {
    setRows((r) => [...r, { id: createId('pkgrow'), wtG: '', qnt: '' }])
  }

  const updateRow = (id, field, value) => {
    setRows((r) => r.map((row) => (row.id === id ? { ...row, [field]: value } : row)))
  }

  const removeRow = (id) => setRows((r) => r.filter((row) => row.id !== id))

  const totalWt = rows.reduce((sum, row) => sum + (Number(row.wtG) || 0) * (Number(row.qnt) || 0), 0)

  return (
    <div className={`popup popup-${side}`}>
      <div className="popup-header">ADD PACKAGING</div>

      <div className="pkg-table">
        <div className="pkg-table-head">
          <span>wt(g)</span>
          <span>qnt</span>
          <span>Net wt</span>
          <span />
        </div>

        {rows.map((row) => (
          <div className="pkg-row" key={row.id}>
            <input
              type="number"
              value={row.wtG}
              onChange={(e) => updateRow(row.id, 'wtG', e.target.value)}
              autoComplete="off"
            />
            <input
              type="number"
              value={row.qnt}
              onChange={(e) => updateRow(row.id, 'qnt', e.target.value)}
              autoComplete="off"
            />
            <span>{((Number(row.wtG) || 0) * (Number(row.qnt) || 0))}g</span>
            <button type="button" className="pkg-remove" onClick={() => removeRow(row.id)}>×</button>
          </div>
        ))}
      </div>

      <button type="button" className="pkg-plus" onClick={() => addRow()}>+</button>

      <div className="popup-note">Total packaging: {totalWt}g</div>

      <div className="popup-actions">
        <button type="button" className="btn-ghost" onClick={onClose}>Cancel</button>
        <button
          type="button"
          className="btn-primary"
          onClick={() => {
            onSave(rows)
            onClose()
          }}
        >
          SAVE
        </button>
      </div>
    </div>
  )
}
