import { fmtClock, fmtDMY, gramsText, money } from '../txn'

const amounts = (cash, metal) => `Rs ${money(cash)} · ${gramsText(metal)}`

// What one log entry says. Sale entries carry `received`; transactions don't.
function describe(e) {
  const sale = e.received != null
  const now = sale
    ? `Rs ${money(e.cash)} billed · Rs ${money(e.received)} received · ${gramsText(e.metal)} metal`
    : amounts(e.cash, e.metal)
  if (e.kind === 'created') return now
  const was = sale ? `Previous entry reversed (${amounts(e.previous.cash, e.previous.metal)})` : `Changed from ${amounts(e.previous.cash, e.previous.metal)}`
  return `${was} → now ${now}`
}

// Edit trail shown at the bottom of an opened sale or transaction. It is part of
// the on-screen view only and is never printed.
export default function EditLog({ entries }) {
  if (!entries || entries.length === 0) return null
  return (
    <div className="edit-log">
      <div className="edit-log-title">Edit log</div>
      {entries.map((e, i) => (
        <div className="edit-log-row" key={i}>
          <div className="edit-log-head">
            <b>{e.kind === 'created' ? 'Created' : 'Edited'}</b>
            <span>
              {fmtDMY(e.ts)} {fmtClock(e.ts)}
            </span>
          </div>
          <div className="edit-log-text">{describe(e)}</div>
        </div>
      ))}
      {entries.length === 1 && <div className="edit-log-empty">Not edited since it was created.</div>}
    </div>
  )
}
