import { useEffect, useMemo, useState } from 'react'
import PageHeader from './PageHeader'
import { getBalances, getParties, getTransactions } from '../api'
import { kindLabel } from '../txn'

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const pad = (n) => String(n).padStart(2, '0')
const fmtDate = (ts) => {
  const d = new Date(ts)
  return `${pad(d.getDate())} ${MONTHS[d.getMonth()]}, ${String(d.getFullYear()).slice(2)}`
}
const fmtTime = (ts) => {
  const d = new Date(ts)
  return `${pad(d.getHours() % 12 || 12)}:${pad(d.getMinutes())} ${d.getHours() >= 12 ? 'PM' : 'AM'}`
}

// 'YYYY-MM-DD' (date input) -> epoch ms at the start / end of that local day.
const dayStart = (v) => (v ? new Date(`${v}T00:00:00`).getTime() : undefined)
const dayEnd = (v) => (v ? new Date(`${v}T23:59:59.999`).getTime() : undefined)

const group = (n) => Math.round(Math.abs(n)).toLocaleString('en-IN')
// No +/- sign: the colour (and Transaction In / Out) already says which way it moved.
const signed = (n, text) => text
// Positive = the party owes the shop (Naam), negative = the shop owes the party (Jama).
const owed = (n, text) => `${text}${n < 0 ? ' (Jama)' : n > 0 ? ' (Naam)' : ''}`
const grams = (n) => {
  const v = Math.round(Math.abs(n) * 1000) / 1000
  return `${v}g`
}

export default function Transactions({ party, onPartyChange, onBack, onTxn, onAddSale, onOpenBill, onOpenTxn, range, onRangeChange, onPrint }) {
  const [parties, setParties] = useState([])
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  // The date range lives in App so it survives opening a bill or a transaction.
  const { from, to } = range
  const setFrom = (v) => onRangeChange({ ...range, from: v })
  const setTo = (v) => onRangeChange({ ...range, to: v })
  const [rows, setRows] = useState([])
  const [loaded, setLoaded] = useState(false)
  const [balances, setBalances] = useState({ cash: 0, metal: 0 })

  useEffect(() => {
    getParties()
      .then(setParties)
      .catch(() => {})
  }, [])

  useEffect(() => {
    let live = true
    getTransactions({
      partyId: party?.id,
      q: party ? undefined : query.trim(),
      from: dayStart(from),
      to: dayEnd(to),
    })
      .then((r) => live && setRows(r))
      .catch(() => live && setRows([]))
      .finally(() => live && setLoaded(true))
    return () => {
      live = false
    }
  }, [party, query, from, to])

  // Current totals for the selected party, or for every party.
  useEffect(() => {
    getBalances(party?.id)
      .then(setBalances)
      .catch(() => {})
  }, [party, rows])

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase()
    return parties.filter((p) => !q || p.name.toLowerCase().includes(q)).slice(0, 8)
  }, [parties, query])

  // Sale entries open that bill (unless it was deleted); live Transaction In/Out
  // entries open for viewing, editing and deleting. Everything else is history.
  const openFor = (t) => {
    if (t.billNo) return t.billDeleted ? undefined : () => onOpenBill(t.billNo)
    if ((t.kind === 'txn_in' || t.kind === 'txn_out') && !t.voided) return () => onOpenTxn(t)
    return undefined
  }

  const pick = (p) => {
    onPartyChange(p)
    setQuery('')
    setOpen(false)
  }

  return (
    <div className="salelist">
      <PageHeader title="Transactions" onBack={onBack} />

      <div className="txn-totals">
        <div className="txn-total">
          <span>{party ? 'Current cash' : 'Total cash'}</span>
          <b>{owed(balances.cash, `Rs ${group(balances.cash)}`)}</b>
        </div>
        <div className="txn-total">
          <span>{party ? 'Current metal' : 'Total metal'}</span>
          <b>{owed(balances.metal, grams(balances.metal))}</b>
        </div>
      </div>

      <div className="txn-filters">
        <div className="txn-search">
          {party ? (
            <div className="txn-party-chip">
              <span>{party.name}</span>
              <button type="button" title="Clear party" onClick={() => onPartyChange(null)}>
                ×
              </button>
            </div>
          ) : (
            <input
              autoComplete="off"
              placeholder="Search party"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value)
                setOpen(true)
              }}
              onFocus={() => setOpen(true)}
            />
          )}
          {open && !party && query.trim() && (
            <div className="txn-dropdown">
              {matches.length === 0 && <div className="txn-dropdown-empty">No matching party</div>}
              {matches.map((p) => (
                <button type="button" key={p.id} onClick={() => pick(p)}>
                  {p.name}
                </button>
              ))}
            </div>
          )}
        </div>
        <label className="txn-date">
          <span>From</span>
          <input type="date" value={from} max={to || undefined} onChange={(e) => setFrom(e.target.value)} />
        </label>
        <label className="txn-date">
          <span>To</span>
          <input type="date" value={to} min={from || undefined} onChange={(e) => setTo(e.target.value)} />
        </label>
        <button
          type="button"
          className="txn-print"
          title="Print statement of the filtered transactions"
          onClick={onPrint}
          disabled={rows.length === 0}
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M6 9V3h12v6" />
            <rect x="3" y="9" width="18" height="9" rx="2" />
            <path d="M7 14h10v7H7z" />
          </svg>
        </button>
        {(from || to) && (
          <button
            type="button"
            className="txn-clear"
            onClick={() => {
              onRangeChange({ from: '', to: '' })
            }}
          >
            Clear dates
          </button>
        )}
      </div>

      <div className="salelist-body txn-list">
        {loaded && rows.length === 0 && <p className="salelist-empty">No transactions found.</p>}
        {rows.map((t) => (
          <div
            className={`sale-card txn-card ${openFor(t) ? 'txn-card-link' : ''}`}
            key={`${t.id}-${t.kind}`}
            onClick={openFor(t)}
          >
            <div className="txn-top">
              <div>
                <div className="txn-party">{t.partyName}</div>
                <div className="txn-kind">{kindLabel(t)}</div>
              </div>
              <div className="txn-when">
                <div>{fmtDate(t.ts)}</div>
                <div>{fmtTime(t.ts)}</div>
              </div>
            </div>
            <div className="txn-amounts">
              {t.cash != null && (
                <div className="txn-amount">
                  <span>Cash</span>
                  <b className={t.cash > 0 ? 'txn-up' : 'txn-down'}>{signed(t.cash, `Rs ${group(t.cash)}`)}</b>
                  <small>Balance Rs {Math.round(t.cashAfter).toLocaleString('en-IN')}</small>
                </div>
              )}
              {t.metal != null && (
                <div className="txn-amount">
                  <span>Metal</span>
                  <b className={t.metal > 0 ? 'txn-up' : 'txn-down'}>{signed(t.metal, grams(t.metal))}</b>
                  <small>Balance {Math.round(t.metalAfter * 1000) / 1000}g</small>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {party && (
        <div className="salelist-fabs">
          <button type="button" className="salelist-fab salelist-fab-secondary" onClick={() => onTxn('in', party)}>
            Transaction In
          </button>
          <button type="button" className="salelist-fab salelist-fab-secondary" onClick={() => onTxn('out', party)}>
            Transaction Out
          </button>
          <button type="button" className="salelist-fab" onClick={() => onAddSale(party)}>
            <span className="salelist-fab-plus">+</span> Add Sale
          </button>
        </div>
      )}
    </div>
  )
}
