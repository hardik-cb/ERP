// Shared wording for ledger entries (Transactions list and the printed statement).

export function kindLabel(t) {
  const no = t.billNo ? ` #${t.billNo}` : ''
  switch (t.kind) {
    case 'bill':
      return `Sale${no}`
    case 'received':
      return `Received on sale${no}`
    case 'edit_bill':
      return `Sale${no} (edited)`
    case 'edit_received':
      return `Received on sale${no} (edited)`
    case 'edit_reversal':
      return `Sale${no} edit reversed`
    case 'delete_reversal':
      return `Sale${no} deleted`
    case 'opening':
      return 'Opening balance'
    case 'txn_in':
      return t.voided ? 'Transaction In (reversed)' : 'Transaction In'
    case 'txn_out':
      return t.voided ? 'Transaction Out (reversed)' : 'Transaction Out'
    case 'txn_edit_reversal':
      return 'Transaction edit reversed'
    case 'txn_delete_reversal':
      return 'Transaction deleted'
    default:
      return t.kind
  }
}

// ---- Printed statement ------------------------------------------------------

const pad2 = (n) => String(n).padStart(2, '0')
export const fmtDMY = (ts) => {
  const d = new Date(ts)
  return `${pad2(d.getDate())}-${pad2(d.getMonth() + 1)}-${d.getFullYear()}`
}
export const fmtClock = (ts) => {
  const d = new Date(ts)
  return `${pad2(d.getHours() % 12 || 12)}:${pad2(d.getMinutes())} ${d.getHours() >= 12 ? 'PM' : 'AM'}`
}
export const money = (n) => Math.round(Math.abs(Number(n) || 0)).toLocaleString('en-IN')
export const gramsText = (n) => `${Math.round(Math.abs(Number(n) || 0) * 1000) / 1000}g`
// Positive = the party owes the shop (Naam), negative = the shop owes the party (Jama).
export const sideText = (n) => (n < 0 ? 'Jama' : 'Naam')

// Rows come newest first (as listed); a statement reads oldest first. Totals
// split what raised the party's balance (Naam) from what lowered it (Jama).
export function summarize(rows) {
  const ordered = [...rows].reverse()
  const t = { naamCash: 0, jamaCash: 0, naamMetal: 0, jamaMetal: 0 }
  for (const r of ordered) {
    if (r.cash != null) r.cash > 0 ? (t.naamCash += r.cash) : (t.jamaCash -= r.cash)
    if (r.metal != null) r.metal > 0 ? (t.naamMetal += r.metal) : (t.jamaMetal -= r.metal)
  }
  return { rows: ordered, ...t }
}

// Header lines and the saved file name: <party or All parties>-<period>.
export function statementInfo({ partyName, from, to }) {
  const who = partyName || 'All parties'
  const period =
    from || to ? `${from ? fmtDMY(from) : 'Start'} to ${to ? fmtDMY(to) : fmtDMY(Date.now())}` : 'All dates'
  return { who, period, fileName: `${who}-${period.replace(/ to /, '-to-')}`.replace(/[\\/:*?"<>|]/g, '').trim() }
}
