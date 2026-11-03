import { SHOP_NAME } from './data'
import { estimateSectionHtml, savePdfHtml, sharePdfHtml, wrapDocument } from './estimate'
import { fmtClock, fmtDMY, gramsText, money, sideText, statementInfo } from './txn'

const esc = (s) =>
  String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c])
const cashText = (n) => `Rs ${money(n)} (${sideText(n)})`
const metalText = (n) => `${gramsText(n)} (${sideText(n)})`

const TITLES = { txn_in: 'TRANSACTION IN', txn_out: 'TRANSACTION OUT', opening: 'OPENING BALANCE' }
const LABELS = { txn_in: 'Transaction In', txn_out: 'Transaction Out', opening: 'Opening balance' }

// One Transaction In/Out (or opening balance) in the same style as an estimate:
// the party's balance before, the amount, and the balance after.
function txnSectionHtml(t) {
  return `<div class="title"><div class="h">${TITLES[t.kind]}</div></div>
    <div class="box head">
      <div class="hl"><div><b>A/C of :</b> ${esc(t.partyName)}</div></div>
      <div class="hr"><div><b>Date :</b> ${fmtDMY(t.ts)} ${fmtClock(t.ts)}</div></div>
    </div>
    <table>
      <thead><tr><th class="d">Particulars</th><th>Cash</th><th>Metal</th></tr></thead>
      <tbody>
        <tr><td class="d">Prev Bal</td><td class="n">${esc(cashText(t.cashBefore))}</td><td class="n">${esc(metalText(t.metalBefore))}</td></tr>
        <tr><td class="d"><b>${LABELS[t.kind]}</b></td><td class="n">${t.cash != null ? esc(cashText(t.cash)) : '—'}</td><td class="n">${t.metal != null ? esc(metalText(t.metal)) : '—'}</td></tr>
      </tbody>
      <tfoot><tr><td class="d">Final Balance</td><td class="n">${esc(cashText(t.cashAfter))}</td><td class="n">${esc(metalText(t.metalAfter))}</td></tr></tfoot>
    </table>`
}

// Detailed statement: every sale as its full estimate and every Transaction
// In/Out as a voucher, oldest first. Same layout as the web statement.
// data: { items (from getStatement), balances: {cash, metal}, party, from, to }
export function buildStatementHtml({ items, balances, party, from, to }, { preview = false } = {}) {
  const info = statementInfo({ partyName: party?.name, from, to })
  const sales = items.filter((i) => i.kind === 'sale').length
  const sections = items
    .map(
      (i) =>
        `<div class="sec">${i.kind === 'sale' ? estimateSectionHtml(i.bill, { showShop: false }) : txnSectionHtml(i)}</div>`
    )
    .join('')

  const body = `<style>
    .sec { margin-top: 16px; padding-top: 14px; border-top: 2px dashed #999; page-break-inside: avoid; }
    .tot { margin-top: 16px; padding: 6px 10px; }
    .tr { display: flex; justify-content: space-between; gap: 12px; }
    tfoot td { font-weight: 700; }
  </style>
    <div class="title"><div class="om">${esc(SHOP_NAME)}</div><div class="h">TRANSACTION STATEMENT</div></div>
    <div class="box head">
      <div class="hl"><div><b>Party :</b> ${esc(info.who)}</div><div style="margin-top:3px"><b>Period :</b> ${esc(info.period)}</div></div>
      <div class="hr"><div><b>Printed :</b> ${fmtDMY(Date.now())}</div><div><b>Entries :</b> ${sales} sales, ${items.length - sales} transactions</div></div>
    </div>
    ${items.length ? sections : '<p style="text-align:center;margin:16px 0">No transactions in this range.</p>'}
    <div class="box tot"><div class="tr"><span>${party ? 'Current balance' : 'Total balance of all parties'}</span><b>${esc(cashText(balances.cash))} · ${esc(metalText(balances.metal))}</b></div></div>`

  return wrapDocument({ title: info.fileName, body, preview })
}

export const statementFileName = ({ party, from, to }) => statementInfo({ partyName: party?.name, from, to }).fileName

export const shareStatement = (data) =>
  sharePdfHtml({
    html: buildStatementHtml(data),
    fileName: statementFileName(data),
    dialogTitle: `Statement ${statementFileName(data)}`,
  })

export const saveStatement = (data) => savePdfHtml(buildStatementHtml(data))
