import { useEffect, useState } from 'react'
import { getBalances, getStatement } from '../api'
import { SHOP_NAME } from '../data'
import { fmtClock, fmtDMY, gramsText, money, sideText, statementInfo } from '../txn'
import EstimateSheet from './EstimateSheet'
import PageHeader from './PageHeader'

const dayStart = (v) => (v ? new Date(`${v}T00:00:00`).getTime() : undefined)
const dayEnd = (v) => (v ? new Date(`${v}T23:59:59.999`).getTime() : undefined)

const cashText = (n) => `Rs ${money(n)} (${sideText(n)})`
const metalText = (n) => `${gramsText(n)} (${sideText(n)})`

const TITLES = { txn_in: 'TRANSACTION IN', txn_out: 'TRANSACTION OUT', opening: 'OPENING BALANCE' }
const LABELS = { txn_in: 'Transaction In', txn_out: 'Transaction Out', opening: 'Opening balance' }

// One Transaction In/Out (or opening balance) in the same style as an estimate:
// the party's balance before, the amount, and the balance after.
function TxnSheet({ item }) {
  return (
    <>
      <div className="est-title">
        <div className="est-heading">{TITLES[item.kind]}</div>
      </div>
      <div className="est-box est-head">
        <div className="est-head-left">
          <div>
            <b>A/C of :</b> {item.partyName}
          </div>
        </div>
        <div className="est-head-right">
          <div>
            <b>Date :</b> {fmtDMY(item.ts)} {fmtClock(item.ts)}
          </div>
        </div>
      </div>
      <table className="est-table stm-table">
        <thead>
          <tr>
            <th className="est-desc">Particulars</th>
            <th>Cash</th>
            <th>Metal</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td className="est-desc">Prev Bal</td>
            <td className="est-n">{cashText(item.cashBefore)}</td>
            <td className="est-n">{metalText(item.metalBefore)}</td>
          </tr>
          <tr>
            <td className="est-desc">
              <b>{LABELS[item.kind]}</b>
            </td>
            <td className="est-n">{item.cash != null ? cashText(item.cash) : '—'}</td>
            <td className="est-n">{item.metal != null ? metalText(item.metal) : '—'}</td>
          </tr>
        </tbody>
        <tfoot>
          <tr>
            <td className="est-desc">Final Balance</td>
            <td className="est-n">{cashText(item.cashAfter)}</td>
            <td className="est-n">{metalText(item.metalAfter)}</td>
          </tr>
        </tfoot>
      </table>
    </>
  )
}

// Detailed printable statement for the Transactions screen's current filter
// (party and date range): every sale as its full estimate, and every
// Transaction In/Out as a voucher, oldest first.
export default function Statement({ party, range, onBack }) {
  const [data, setData] = useState(null)
  const [error, setError] = useState('')
  const from = dayStart(range.from)
  const to = dayEnd(range.to)
  const info = statementInfo({ partyName: party?.name, from, to })

  useEffect(() => {
    Promise.all([getStatement({ partyId: party?.id, from, to }), getBalances(party?.id)])
      .then(([items, balances]) => setData({ items, balances }))
      .catch((e) => setError(e.message))
  }, [])

  // The browser's "Save as PDF" names the file after the page title.
  const save = () => {
    const prev = document.title
    document.title = info.fileName
    window.print()
    document.title = prev
  }

  if (error) return <div className="est-state">{error}</div>
  if (!data) return <div className="est-state">Loading…</div>

  const sales = data.items.filter((i) => i.kind === 'sale').length
  const txns = data.items.length - sales

  return (
    <div className="est-page">
      <div className="est-toolbar">
        <PageHeader title="Statement" onBack={onBack} />
        <button type="button" className="btn-primary est-save" onClick={save}>
          SAVE
        </button>
      </div>

      <div className="est-sheet">
        <div className="est-title">
          <div className="est-om">{SHOP_NAME}</div>
          <div className="est-heading">TRANSACTION STATEMENT</div>
        </div>

        <div className="est-box est-head">
          <div className="est-head-left">
            <div>
              <b>Party :</b> {info.who}
            </div>
            <div className="est-remark">
              <b>Period :</b> {info.period}
            </div>
          </div>
          <div className="est-head-right">
            <div>
              <b>Printed :</b> {fmtDMY(Date.now())}
            </div>
            <div>
              <b>Entries :</b> {sales} sales, {txns} transactions
            </div>
          </div>
        </div>

        {data.items.length === 0 && <p className="stm-empty">No transactions in this range.</p>}
        {data.items.map((item, i) => (
          <div className="stm-section" key={i}>
            {item.kind === 'sale' ? <EstimateSheet bill={item.bill} showShop={false} /> : <TxnSheet item={item} />}
          </div>
        ))}

        <div className="est-box stm-totals">
          <div>
            <span>{party ? 'Current balance' : 'Total balance of all parties'}</span>
            <b>
              {cashText(data.balances.cash)} · {metalText(data.balances.metal)}
            </b>
          </div>
        </div>
      </div>
    </div>
  )
}
