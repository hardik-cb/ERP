import { useState } from 'react'

const DEFAULT_LABOUR = { mode: 'weight', rate: '', qty: '', ratePerKg: '' }

export default function LabourPopup({ side, initial, onSave, onClose }) {
  const [labour, setLabour] = useState({ ...DEFAULT_LABOUR, ...initial })

  const setMode = (mode) => setLabour((l) => ({ ...l, mode }))
  const update = (field, value) => setLabour((l) => ({ ...l, [field]: value }))

  return (
    <div className={`popup popup-${side}`}>
      <div className="popup-header">LABOUR CHARGE</div>

      <div className="popup-row">
        <input
          className="popup-input"
          type="number"
          placeholder="Rs"
          value={labour.rate}
          onChange={(e) => update('rate', e.target.value)}
          disabled={labour.mode !== 'piece'}
          autoComplete="off"
        />
        <input
          className="popup-input"
          type="number"
          placeholder="pc"
          value={labour.qty}
          onChange={(e) => update('qty', e.target.value)}
          disabled={labour.mode !== 'piece'}
          autoComplete="off"
        />
      </div>

      <input
        className="popup-input popup-input-wide"
        type="number"
        placeholder="Rs per Kg"
        value={labour.ratePerKg}
        onChange={(e) => update('ratePerKg', e.target.value)}
        disabled={labour.mode !== 'weight'}
        autoComplete="off"
      />

      <div className="popup-row">
        <button
          type="button"
          className={`toggle-btn ${labour.mode === 'piece' ? 'toggle-btn-active' : ''}`}
          onClick={() => setMode('piece')}
        >
          Piece
        </button>
        <button
          type="button"
          className={`toggle-btn ${labour.mode === 'weight' ? 'toggle-btn-active' : ''}`}
          onClick={() => setMode('weight')}
        >
          Weight
        </button>
      </div>

      <div className="popup-actions">
        <button type="button" className="btn-ghost" onClick={onClose}>Cancel</button>
        <button
          type="button"
          className="btn-primary"
          onClick={() => {
            onSave(labour)
            onClose()
          }}
        >
          SAVE
        </button>
      </div>
    </div>
  )
}
