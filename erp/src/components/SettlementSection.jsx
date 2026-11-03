export default function SettlementSection({
  settlement,
  received,
  onReceivedChange,
  onOpenPase,
  onOpenMetal,
  onReopenSettlement,
  onClearSettlement,
  readOnly,
  totalWeight,
}) {
  const due = settlement?.amount ?? 0
  const receivedNum = Number(received) || 0
  const balance = due - receivedNum
  // Metal still owed (grams, signed): the whole bill weight when nothing was
  // settled, or the unpriced difference of a Metal settlement.
  const metalBalance = settlement ? (settlement.metalBalance ?? 0) : (totalWeight ?? 0)

  return (
    <div className="settlement-section">
      {settlement ? (
        <div className="settlement-applied">
          <button type="button" className="settlement-applied-main" onClick={onReopenSettlement} disabled={readOnly}>
            <span className="settlement-applied-label">
              {settlement.mode === 'pase' ? 'PASE' : 'METAL'}
            </span>
            <span className="settlement-applied-amount">Rs {round(settlement.amount)}</span>
          </button>
          {!readOnly && (
            <button type="button" className="settlement-clear" onClick={onClearSettlement}>×</button>
          )}
        </div>
      ) : (
        <div className="settlement-buttons">
          <button type="button" className="btn-ghost" onClick={onOpenPase} disabled={readOnly}>Pase</button>
          <button type="button" className="btn-ghost" onClick={onOpenMetal} disabled={readOnly}>Metal</button>
        </div>
      )}

      <div className="field-row">
        <span className="field-label">Received</span>
        <input
          className="bhav-input"
          type="number"
          value={received}
          onChange={(e) => onReceivedChange(e.target.value)}
          autoComplete="off"
          disabled={readOnly}
        />
      </div>

      <div className="settlement-summary">
        <div className="settlement-summary-row">
          <span>Total</span>
          <span>{round(due)}</span>
        </div>
        <div className="settlement-summary-row">
          <span>Received</span>
          <span>{round(receivedNum)}</span>
        </div>
        <div className="settlement-summary-row settlement-balance">
          <span>Balance</span>
          <span>Rs {round(balance)}</span>
        </div>
        {metalBalance !== 0 && (
          <div className="settlement-summary-row settlement-balance">
            <span>{metalBalance < 0 ? 'Metal we owe' : 'Metal balance'}</span>
            <span>{round(metalBalance)}g</span>
          </div>
        )}
      </div>
    </div>
  )
}

function round(n) {
  return Math.round(Number(n) || 0)
}
