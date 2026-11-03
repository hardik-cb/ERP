import { useState } from 'react'
import { paseAmount } from '../calc'
import { LIVE_METAL_RATE } from '../data'

export default function PasePopup({ side, totals, initial, onSave, onClose }) {
  const [rate, setRate] = useState(initial?.rate ?? LIVE_METAL_RATE)

  const { base, total } = paseAmount({ rate, weightTotal: totals.wt, labourTotal: totals.rs })

  return (
    <div className={`popup popup-${side}`}>
      <div className="popup-header">PASE</div>

      <div className="popup-row">
        <span className="chip">Rs {round(totals.rs)}</span>
        <span className="chip">{round(totals.wt)}g</span>
      </div>

      <div className="popup-row">
        <span className="chip" title="Live rate (placeholder — not from API yet)">LIVE {LIVE_METAL_RATE}</span>
        <input
          className="popup-input"
          type="number"
          value={rate}
          onChange={(e) => setRate(e.target.value)}
          autoComplete="off"
        />
      </div>

      <div className="popup-note">
        Rs {rate} x {round4(totals.wt / 1000)} = Rs {round(base)}
      </div>

      <div className="settlement-line">
        <span>Labour</span>
        <span>Rs{round(totals.rs)}</span>
      </div>

      <div className="settlement-total">
        <span>Total</span>
        <span>{round(total)}</span>
      </div>

      <div className="popup-actions">
        <button type="button" className="btn-ghost" onClick={onClose}>Cancel</button>
        <button
          type="button"
          className="btn-primary"
          onClick={() => {
            onSave({ mode: 'pase', rate: Number(rate), amount: total })
            onClose()
          }}
        >
          SAVE
        </button>
      </div>
    </div>
  )
}

function round(n) {
  return Math.round(Number(n) || 0)
}

function round4(n) {
  return Math.round((Number(n) || 0) * 10000) / 10000
}
