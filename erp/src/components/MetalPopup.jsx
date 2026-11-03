import { useState } from 'react'
import { metalSettlement, metalRowNetWeight } from '../calc'
import { LIVE_METAL_RATE } from '../data'
import { createId } from '../id'

export default function MetalPopup({ side, totals, initial, onSave, onClose }) {
  const [rate, setRate] = useState(initial?.rate ?? LIVE_METAL_RATE)
  const [rows, setRows] = useState(() => (initial?.rows?.length ? initial.rows : []))
  // Off by default: any metal shortfall or excess stays as a metal balance.
  const [bhavKatna, setBhavKatna] = useState(initial?.bhavKatna ?? false)
  // Grams of the metal difference to price at the rate. Bills saved before
  // this existed priced the whole difference, so that is what they reopen with.
  const [katnaWt, setKatnaWt] = useState(() => {
    if (initial?.katnaWt != null) return String(initial.katnaWt)
    if (!initial?.bhavKatna) return ''
    const full = metalSettlement({ rate: initial.rate, rows: initial.rows, weightTotal: totals.wt, bhavKatna: false })
    return String(Math.abs(full.delta))
  })

  const addRow = () => setRows((r) => [...r, { id: createId('metalrow'), wt: '', tunch: '' }])
  const updateRow = (id, field, value) =>
    setRows((r) => r.map((row) => (row.id === id ? { ...row, [field]: value } : row)))
  const removeRow = (id) => setRows((r) => r.filter((row) => row.id !== id))

  const result = metalSettlement({ rate, rows, weightTotal: totals.wt, labourTotal: totals.rs, bhavKatna, katnaWt })

  return (
    <div className={`popup popup-${side}`}>
      <div className="popup-header">METAL</div>

      <div className="popup-row">
        <span className="chip">Rs {round(totals.rs)}</span>
        <span className="chip">{round(totals.wt)}g</span>
      </div>

      {bhavKatna && (
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
      )}

      <div className="pkg-table">
        <div className="pkg-table-head">
          <span>Wt</span>
          <span>Tunch</span>
          <span>Nt wt</span>
          <span />
        </div>

        {rows.map((row) => (
          <div className="pkg-row" key={row.id}>
            <input
              type="number"
              value={row.wt}
              onChange={(e) => updateRow(row.id, 'wt', e.target.value)}
              autoComplete="off"
            />
            <input
              type="number"
              value={row.tunch}
              onChange={(e) => updateRow(row.id, 'tunch', e.target.value)}
              autoComplete="off"
            />
            <span>{round(metalRowNetWeight(row))}g</span>
            <button type="button" className="pkg-remove" onClick={() => removeRow(row.id)}>×</button>
          </div>
        ))}
      </div>

      <button type="button" className="pkg-plus" onClick={addRow}>+</button>

      <div className="settlement-line">
        <span>Metal fine</span>
        <span>{round(result.metalFine)}</span>
      </div>
      <div className="settlement-line">
        <span>Payable fine</span>
        <span>-{round(totals.wt)}</span>
      </div>

      <button
        type="button"
        className={`toggle-btn ${bhavKatna ? 'toggle-btn-active' : ''}`}
        onClick={() => setBhavKatna((v) => !v)}
        title="Price the metal difference at the rate and settle it in cash"
      >
        Bhav katna
      </button>

      {bhavKatna && (
        <>
          <div className="popup-row">
            <span className="chip">Katna wt (g)</span>
            <input
              className="popup-input"
              type="number"
              value={katnaWt}
              placeholder={`up to ${round(Math.abs(result.delta))}`}
              onChange={(e) => setKatnaWt(e.target.value)}
              autoComplete="off"
            />
          </div>
          <div className="popup-note">
            Rs {rate} x {round4(result.netPayableWeight / 1000)} = Rs {round(result.metalValue)}
          </div>
        </>
      )}
      {result.metalBalance !== 0 && (
        <div className="settlement-line">
          <span>{result.metalBalance < 0 ? 'Metal we owe' : 'Metal balance'}</span>
          <span>
            {result.metalBalance > 0 ? '+' : ''}
            {round(result.metalBalance)}g
          </span>
        </div>
      )}

      <div className="settlement-line">
        <span>Labour</span>
        <span>+{round(result.labour)}</span>
      </div>

      <div className="settlement-total">
        <span>Total</span>
        <span>{round(result.total)}</span>
      </div>

      <div className="popup-actions">
        <button type="button" className="btn-ghost" onClick={onClose}>Cancel</button>
        <button
          type="button"
          className="btn-primary"
          onClick={() => {
            onSave({
              mode: 'metal',
              rate: Number(rate),
              rows,
              bhavKatna,
              katnaWt: bhavKatna ? Number(katnaWt) || 0 : undefined,
              amount: result.total,
              metalBalance: result.metalBalance,
            })
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
