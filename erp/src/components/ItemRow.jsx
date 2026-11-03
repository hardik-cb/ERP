import { itemTotals } from '../calc'

export default function ItemRow({ item, index, onChange, onOpenLabour, onOpenPackaging, onRemove, readOnly }) {
  const totals = itemTotals(item)

  const update = (field, value) => onChange({ ...item, [field]: value })

  return (
    <div className="item-row">
      <div className="item-row-main">
        <span className="item-name-cell">
          {index + 1}. {item.name}
        </span>

        <input
          className="item-cell"
          type="number"
          value={item.qty}
          onChange={(e) => update('qty', e.target.value)}
          title="Quantity (g)"
          autoComplete="off"
          disabled={readOnly}
        />
        <span className="item-cell item-cell-readonly" title="Net weight (qty − packaging)">
          {round(totals.netWt)}g
        </span>
        <input
          className="item-cell item-cell-narrow"
          type="number"
          value={item.pct}
          onChange={(e) => update('pct', e.target.value)}
          title="Percentage"
          autoComplete="off"
          disabled={readOnly}
        />
        {readOnly ? (
          <span />
        ) : (
          <button type="button" className="item-remove" onClick={onRemove} title="Remove item">×</button>
        )}
      </div>

      <div className="item-row-sub">
        <div className="item-actions-left">
          <button type="button" className="pack-btn" onClick={onOpenPackaging} title="Add packaging" disabled={readOnly}>
            {totals.packWt > 0 ? `${round(totals.packWt)}g` : '📦'}
          </button>
          <button type="button" className="add-labour-btn" onClick={onOpenLabour} disabled={readOnly}>
            {item.labour
              ? item.labour.mode === 'piece'
                ? `Rs${item.labour.rate || 0} x ${item.labour.qty || 0}pc`
                : `Rs${item.labour.ratePerKg || 0}/kg`
              : 'ADD LABOUR'}
          </button>
        </div>
        <div className="net-group">
          {item.labour && (
            <span className="labour-amount" title="Labour amount">Rs{round(totals.labour)}</span>
          )}
          <span className="net-wt-final" title="Final net weight">{round(totals.finalNetWt)}g</span>
        </div>
      </div>
    </div>
  )
}

function round(n) {
  return Math.round(Number(n) || 0)
}
