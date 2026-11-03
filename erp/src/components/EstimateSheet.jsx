import { SHOP_NAME } from '../data'
import { itemTotals, katnaRow, paymentLines } from '../calc'

const pad = (n) => String(n).padStart(2, '0')
export const fmtDate = (ts) => {
  const d = new Date(ts)
  return `${pad(d.getDate())}-${pad(d.getMonth() + 1)}-${d.getFullYear()}`
}
const num = (n) => Math.round(Number(n) || 0).toLocaleString('en-IN')
// Weights are shown to 2 decimals only when they have a fractional part.
const wt = (n) => {
  const v = Math.round((Number(n) || 0) * 100) / 100
  return Number.isInteger(v) ? v.toLocaleString('en-IN') : String(v)
}
export const voucherNo = (billNo) => `S${String(billNo).padStart(7, '0')}`

// Positive = the party owes the shop ("Naam"), negative = the shop owes the party ("Jama").
const side = (n) => (n < 0 ? '(Jama)' : '(Naam)')

// Packing under the item name, e.g. "Box :3x25.55," — pieces x weight per row.
function packingText(item) {
  const rows = (item.packaging || []).filter((p) => Number(p.qnt) && Number(p.wtG))
  return rows.length ? `Box :${rows.map((p) => `${wt(p.qnt)}x${wt(p.wtG)},`).join(' ')}` : ''
}

function labourText(l) {
  if (!l) return ''
  if (l.mode === 'piece') return `${num(l.rate)}/pc`
  return `${num(l.ratePerKg)}/kg`
}

// The body of the printed estimate for one bill. showShop: with the shop name
// and payment footer (a single estimate); without, as one section of a statement.
export default function EstimateSheet({ bill, showShop = true }) {
  const rows = bill.items.map((item) => {
    const t = itemTotals(item)
    return {
      item,
      gross: Number(item.qty) || 0,
      less: t.packWt,
      net: Math.round(t.netWt),
      pct: Number(item.pct) || 0,
      pc: item.labour?.mode === 'piece' ? Number(item.labour.qty) || 0 : '',
      // Rounded per item so the totals below add up exactly.
      silver: Math.round(t.finalNetWt),
      amount: Math.round(t.labour),
    }
  })
  const sum = (key) => rows.reduce((s, r) => s + (Number(r[key]) || 0), 0)
  const totalSilver = sum('silver')
  const katna = katnaRow({ settlement: bill.settlement, weightTotal: totalSilver, labourTotal: sum('amount') })
  // Bhav katna cash is part of the bill, so it is added to the Amount total.
  const totalAmount = sum('amount') + (katna?.amount || 0)

  // Same rules the ledger uses: what this bill leaves owed in cash and metal.
  const s = bill.settlement
  const cashDue = s ? s.amount : totalAmount
  const metalDue = !s ? totalSilver : s.mode === 'metal' ? s.metalBalance : 0
  const finalCash = bill.prevDues.rs + cashDue - bill.received
  const finalMetal = bill.prevDues.metal + metalDue
  const payment = paymentLines({ settlement: s, received: bill.received, weightTotal: totalSilver, labourTotal: totalAmount })

  return (
    <>
    <div className="est-title">
      {showShop && <div className="est-om">{SHOP_NAME}</div>}
      <div className="est-heading">ROUGH ESTIMATE</div>
    </div>

    <div className="est-box est-head">
      <div className="est-head-left">
        <div>
          <b>A/C of :</b> {bill.partyName}
        </div>
        <div className="est-remark">
          <b>Remark :</b>
        </div>
      </div>
      <div className="est-head-right">
        <div>
          <b>Voucher No. :</b> {voucherNo(bill.billNo)}
        </div>
        <div>
          <b>Date :</b> {fmtDate(bill.billTs)}
        </div>
      </div>
    </div>

    <table className="est-table">
      <thead>
        <tr>
          <th className="est-desc">Description</th>
          <th>Gr. Wt.</th>
          <th>L. Wt.</th>
          <th>Net Wt.</th>
          <th>T+W</th>
          <th>Pc</th>
          <th>Labour</th>
          <th>Silver</th>
          <th>Amount</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r, i) => (
          <tr key={r.item.id}>
            <td className="est-desc">
              {i + 1}. {r.item.name}
              {packingText(r.item) && <div className="est-pack">{packingText(r.item)}</div>}
            </td>
            <td className="est-n">{wt(r.gross)}</td>
            <td className="est-n">{wt(r.less)}</td>
            <td className="est-n">{wt(r.net)}</td>
            <td className="est-n">{wt(r.pct)}</td>
            <td className="est-n">{r.pc}</td>
            <td className="est-n">{labourText(r.item.labour)}</td>
            <td className="est-n">{num(r.silver)}</td>
            <td className="est-n">{num(r.amount)}</td>
          </tr>
        ))}
        {katna && (
          <tr>
            <td className="est-desc" colSpan={7}>
              {katna.label}
            </td>
            <td />
            <td className="est-n">{katna.amount.toLocaleString('en-IN')}</td>
          </tr>
        )}
      </tbody>
      <tfoot>
        <tr>
          <td className="est-desc">Total</td>
          <td className="est-n">{wt(sum('gross'))}</td>
          <td className="est-n">{wt(sum('less'))}</td>
          <td className="est-n">{wt(sum('net'))}</td>
          <td />
          <td />
          <td />
          <td className="est-n">{num(totalSilver)}</td>
          <td className="est-n">{num(totalAmount)}</td>
        </tr>
      </tfoot>
    </table>

    {payment.length > 0 && (
      <div className="est-box est-payment">
        <div className="est-pay-title">Payment</div>
        {payment.map((l, i) => (
          <div className="est-pay-row" key={i}>
            <span>{l.label}</span>
            <b>{l.value}</b>
          </div>
        ))}
      </div>
    )}

    <div className="est-box est-balances">
      <div className="est-bal-row">
        <span>Prev Bal</span>
        <span className="est-bal">
          <b>{num(Math.abs(bill.prevDues.metal))} Gm</b>
          <small>{side(bill.prevDues.metal)}</small>
        </span>
        <span className="est-bal">
          <b>Rs. {num(Math.abs(bill.prevDues.rs))}</b>
          <small>{side(bill.prevDues.rs)}</small>
        </span>
      </div>
      <div className="est-bal-row">
        <span>Final Balance</span>
        <span className="est-bal">
          <b>{num(Math.abs(finalMetal))} Gm</b>
          <small>{side(finalMetal)}</small>
        </span>
        <span className="est-bal">
          <b>Rs. {num(Math.abs(finalCash))}</b>
          <small>{side(finalCash)}</small>
        </span>
      </div>
    </div>

    {showShop && <div className="est-footer">PLEASE MAKE THE PAYMENT WITHIN 15 Days</div>}
    </>
  )
}
