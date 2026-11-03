import { useEffect, useState } from 'react'
import { deleteBill, getBills } from '../api'
import { askConfirm } from './ConfirmHost'

// There is no due-date field on a bill yet, so it is shown as the sale date
// plus a fixed credit period.
const DUE_DAYS = 30

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

const pad = (n) => String(n).padStart(2, '0')

function fmtDate(ts) {
  const d = new Date(ts)
  return `${pad(d.getDate())} ${MONTHS[d.getMonth()]}, ${String(d.getFullYear()).slice(2)}`
}

function fmtTime(ts) {
  const d = new Date(ts)
  const h = d.getHours() % 12 || 12
  return `${pad(h)}:${pad(d.getMinutes())} ${d.getHours() >= 12 ? 'PM' : 'AM'}`
}

function statusOf(bill) {
  if (bill.balance <= 0 && bill.metalDue <= 0) return { label: 'PAID', cls: 'paid' }
  if (bill.received > 0) return { label: 'PARTIAL', cls: 'partial' }
  return { label: 'UNPAID', cls: 'unpaid' }
}

const rs = (n) => `₹ ${Math.round(n)}`
const withMetal = (text, g) =>
  g > 0 ? `${text} + ${Math.round(g)}g` : g < 0 ? `${text} − ${Math.round(-g)}g` : text

const Icon = ({ children }) => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    {children}
  </svg>
)

export default function SaleList({ onAdd, onOpen, onEdit, onAlterParty, onAlterItem, onPrint, onTransactions }) {
  const [bills, setBills] = useState([])
  const [loaded, setLoaded] = useState(false)
  const [searching, setSearching] = useState(false)
  const [query, setQuery] = useState('')

  const [menuFor, setMenuFor] = useState(null) // billNo whose ⋮ menu is open
  const [plusOpen, setPlusOpen] = useState(false) // the + circle's pop-out menu

  const load = () =>
    getBills()
      .then(setBills)
      .catch(() => {})
      .finally(() => setLoaded(true))

  useEffect(() => {
    load()
  }, [])

  const handleDelete = async (b) => {
    setMenuFor(null)
    const ok = await askConfirm({
      title: `Delete sale #${b.billNo}?`,
      message: `${b.partyName}\n\nWarning: its entries are reversed and the party balance is restored. This cannot be undone.`,
    })
    if (!ok) return
    try {
      await deleteBill(b.billNo)
      await load()
    } catch (e) {
      window.alert(`Could not delete: ${e.message}`)
    }
  }

  const q = query.trim().toLowerCase()
  const shown = q
    ? bills.filter((b) => b.partyName.toLowerCase().includes(q) || String(b.billNo).includes(q.replace('#', '')))
    : bills

  return (
    <div className="salelist">
      <div className="salelist-header">
        <button type="button" className="topbar-icon-btn" title="Back">←</button>
        {searching ? (
          <input
            className="salelist-search"
            autoFocus
            autoComplete="off"
            placeholder="Search party or sale no."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        ) : (
          <span className="salelist-title">Sale list</span>
        )}
        <button
          type="button"
          className="topbar-icon-btn"
          title="Search"
          onClick={() => {
            setSearching((s) => !s)
            setQuery('')
          }}
        >
          <Icon>
            <circle cx="11" cy="11" r="7" />
            <path d="M20 20l-3.5-3.5" />
          </Icon>
        </button>
      </div>

      <div className="salelist-body">
        {loaded && shown.length === 0 && (
          <div className="salelist-empty">{bills.length === 0 ? 'No sales yet. Tap “Add Sale” to create one.' : 'No matching sales.'}</div>
        )}

        {shown.map((b) => {
          const st = statusOf(b)
          return (
            <div className="sale-card" key={b.billNo} onClick={() => onOpen(b.billNo)}>
              <div className="sale-card-top">
                <div className="sale-card-left">
                  <div className="sale-card-name">
                    <span className="sale-card-party">{b.partyName}</span>
                    <span className={`sale-badge sale-badge-${st.cls}`}>{st.label}</span>
                  </div>
                  <div className="sale-card-amount">{withMetal(rs(b.amount), b.metalDue)}</div>
                </div>
                <div className="sale-card-right">
                  <div>Sale #{b.billNo}</div>
                  <div>
                    {fmtDate(b.billTs)} • {fmtTime(b.billTs)}
                  </div>
                </div>
              </div>

              <div className="sale-card-bottom">
                <div className="sale-card-meta">
                  <div>Balance: {withMetal(rs(b.balance), b.metalDue)}</div>
                  <div>Due Date: {fmtDate(b.billTs + DUE_DAYS * 86400000)}</div>
                </div>
                <div className="sale-card-actions" onClick={(e) => e.stopPropagation()}>
                  <button type="button" className="topbar-icon-btn" title="Print" onClick={() => onPrint(b.billNo)}>
                    <Icon>
                      <path d="M6 9V3h12v6" />
                      <rect x="3" y="9" width="18" height="9" rx="2" />
                      <path d="M7 14h10v7H7z" />
                    </Icon>
                  </button>
                  <button type="button" className="topbar-icon-btn" title="Share">
                    <Icon>
                      <path d="M4 20v-3a8 8 0 0 1 8-8h8" />
                      <path d="M16 4l4 5-4 5" />
                    </Icon>
                  </button>
                  <div className="sale-menu-wrap">
                    <button
                      type="button"
                      className="topbar-icon-btn"
                      title="More"
                      onClick={() => setMenuFor(menuFor === b.billNo ? null : b.billNo)}
                    >
                      ⋮
                    </button>
                    {menuFor === b.billNo && (
                      <>
                        <div className="sale-menu-backdrop" onClick={() => setMenuFor(null)} />
                        <div className="sale-menu">
                          <button type="button" onClick={() => onEdit(b.billNo)}>Edit</button>
                          <button type="button" className="sale-menu-danger" onClick={() => handleDelete(b)}>
                            Delete
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {plusOpen && <div className="fab-backdrop" onClick={() => setPlusOpen(false)} />}
      <div className="salelist-fabs">
        <button type="button" className="salelist-fab" onClick={onAdd}>
          <span className="salelist-fab-plus">+</span> Add Sale
        </button>
        <div className="fab-speed">
          {plusOpen && (
            <div className="fab-menu">
              <button type="button" className="salelist-fab salelist-fab-secondary" onClick={onAlterParty}>
                Alter Party
              </button>
              <button type="button" className="salelist-fab salelist-fab-secondary" onClick={onAlterItem}>
                Alter Items
              </button>
            </div>
          )}
          <button
            type="button"
            className={`fab-circle ${plusOpen ? 'fab-circle-open' : ''}`}
            title="Alter party / items"
            onClick={() => setPlusOpen((o) => !o)}
          >
            +
          </button>
        </div>
        <button type="button" className="salelist-fab salelist-fab-secondary" onClick={onTransactions}>
          Transaction
        </button>
      </div>
    </div>
  )
}
