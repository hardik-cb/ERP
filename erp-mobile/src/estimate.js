import { File, Paths } from 'expo-file-system'
import * as Print from 'expo-print'
import * as Sharing from 'expo-sharing'
import { SHOP_NAME } from './data'
import { itemTotals, katnaRow, paymentLines } from './calc'
import { getBill } from './db'


const pad = (n) => String(n).padStart(2, '0')
const fmtDate = (ts) => {
  const d = new Date(ts)
  return `${pad(d.getDate())}-${pad(d.getMonth() + 1)}-${d.getFullYear()}`
}
const num = (n) => Math.round(Number(n) || 0).toLocaleString('en-IN')
const wt = (n) => {
  const v = Math.round((Number(n) || 0) * 100) / 100
  return Number.isInteger(v) ? v.toLocaleString('en-IN') : String(v)
}
const voucherNo = (billNo) => `S${String(billNo).padStart(7, '0')}`
// Positive = the party owes the shop ("Naam"), negative = the shop owes the party ("Jama").
const side = (n) => (n < 0 ? '(Jama)' : '(Naam)')
// File name: <party name>-<bill date>, with characters Android disallows removed.
export const estimateFileName = (bill) =>
  `${bill.partyName}-${fmtDate(bill.billTs)}`.replace(/[\\/:*?"<>|]/g, '').trim()

const esc = (s) =>
  String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c])

// Packing under the item name, e.g. "Box :3x25.55," — pieces x weight per row.
function packingText(item) {
  const rows = (item.packaging || []).filter((p) => Number(p.qnt) && Number(p.wtG))
  return rows.length ? `Box :${rows.map((p) => `${wt(p.qnt)}x${wt(p.wtG)},`).join(' ')}` : ''
}

function labourText(l) {
  if (!l) return ''
  return l.mode === 'piece' ? `${num(l.rate)}/pc` : `${num(l.ratePerKg)}/kg`
}

// The body of the printed estimate for one bill. showShop: with the shop name
// and payment footer (a single estimate); without, as one section of a statement.
// Same layout and rules as the web EstimateSheet.
export function estimateSectionHtml(bill, { showShop = true } = {}) {
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

  const s = bill.settlement
  const cashDue = s ? s.amount : totalAmount
  const metalDue = !s ? totalSilver : s.mode === 'metal' ? s.metalBalance : 0
  const finalCash = bill.prevDues.rs + cashDue - bill.received
  const finalMetal = bill.prevDues.metal + metalDue
  const payment = paymentLines({ settlement: s, received: bill.received, weightTotal: totalSilver, labourTotal: totalAmount })
  const paymentHtml = payment.length
    ? `<div class="box pay"><div class="pt">Payment</div>${payment
      .map((l) => `<div class="pr"><span>${esc(l.label)}</span><b>${esc(l.value)}</b></div>`)
      .join('')}</div>`
    : ''

  const body = rows
    .map(
      (r, i) => `<tr>
        <td class="d">${i + 1}. ${esc(r.item.name)}${packingText(r.item) ? `<div class="pk">${esc(packingText(r.item))}</div>` : ''
        }</td>
        <td class="n">${wt(r.gross)}</td><td class="n">${wt(r.less)}</td><td class="n">${wt(r.net)}</td>
        <td class="n">${wt(r.pct)}</td><td class="n">${r.pc}</td><td class="n">${esc(labourText(r.item.labour))}</td>
        <td class="n">${num(r.silver)}</td><td class="n">${num(r.amount)}</td></tr>`
    )
    .join('')
  const katnaHtml = katna
    ? `<tr><td class="d" colspan="7">${esc(katna.label)}</td><td></td><td class="n">${katna.amount.toLocaleString('en-IN')}</td></tr>`
    : ''

  const bal = (label, metal, cash) => `<div class="br"><span class="bl">${label}</span>
    <span class="bv"><b>${num(Math.abs(metal))} Gm</b><small>${side(metal)}</small></span>
    <span class="bv"><b>Rs. ${num(Math.abs(cash))}</b><small>${side(cash)}</small></span></div>`

  return `    <div class="title">${showShop ? `<div class="om">${esc(SHOP_NAME)}</div>` : ''}<div class="h">ROUGH ESTIMATE</div></div>
    <div class="box head">
      <div class="hl"><div><b>A/C of :</b> ${esc(bill.partyName)}</div><div style="margin-top:3px"><b>Remark :</b></div></div>
      <div class="hr"><div><b>Voucher No. :</b> ${voucherNo(bill.billNo)}</div><div><b>Date :</b> ${fmtDate(bill.billTs)}</div></div>
    </div>
    <table>
      <thead><tr><th class="d">Description</th><th>Gr. Wt.</th><th>L. Wt.</th><th>Net Wt.</th>
        <th>T+W</th><th>Pc</th><th>Labour</th><th>Silver</th><th>Amount</th></tr></thead>
      <tbody>${body}${katnaHtml}</tbody>
      <tfoot><tr><td class="d">Total</td><td class="n">${wt(sum('gross'))}</td><td class="n">${wt(sum('less'))}</td>
        <td class="n">${wt(sum('net'))}</td><td></td><td></td><td></td>
        <td class="n">${num(totalSilver)}</td><td class="n">${num(totalAmount)}</td></tr></tfoot>
    </table>
    ${paymentHtml}
    <div class="box bals">${bal('Prev Bal', bill.prevDues.metal, bill.prevDues.rs)}${bal('Final Balance', finalMetal, finalCash)}</div>
    ${showShop ? '<div class="foot">PLEASE MAKE THE PAYMENT WITHIN 15 Days</div>' : ''}`
}

// preview: HTML for the in-app WebView (fits the screen width); otherwise the
// fixed A4 layout used for the PDF.
export const documentCss = (preview) => `
    @page { size: A4 portrait; margin: 8mm; }
    body { font-family: Arial, Helvetica, sans-serif; font-size: ${preview ? 13 : 11}px; color: #111; margin: 0; ${preview ? 'padding: 10px; background: #fff;' : ''} }
    .title { text-align: center; margin-bottom: 10px; }
    .om { display: inline-block; font-size: 20px; font-weight: 700; border-bottom: 2px solid #111; padding: 0 24px 2px; }
    .h { margin-top: 6px; font-family: Georgia, serif; font-weight: 700; font-size: 17px; text-decoration: underline; }
    .box { border: 2px solid #111; }
    .head { display: flex; }
    .hl { flex: 1; padding: 6px 10px; border-right: 2px solid #111; }
    .hr { width: 38%; padding: 6px 10px; }
    .hr div + div { margin-top: 4px; }
    table { width: 100%; border-collapse: collapse; border: 2px solid #111; border-top: 0; }
    th, td { padding: 4px 4px; border-left: 1px solid #111; }
    th:first-child, td:first-child { border-left: 0; }
    tbody td { border: 1px solid #c8c8c8; }
    tbody td:first-child { border-left: 0; }
    tbody td:last-child { border-right: 0; }
    thead th { text-align: center; font-size: 10.5px; font-family: Georgia, serif; border-bottom: 2px solid #111; }
    tbody td { vertical-align: top; }
    tfoot td { border-top: 2px solid #111; border-bottom: 2px solid #111; font-weight: 700; }
    .d { text-align: left; width: 26%; } .n { text-align: right; }
    .bals { margin-top: 8px; }
    .pay { margin-top: 8px; padding: 5px 10px; }
    .pt { font-family: Georgia, serif; font-weight: 700; margin-bottom: 3px; }
    .pr { display: flex; justify-content: space-between; gap: 12px; padding: 2px 0; border-top: 1px solid #c8c8c8; }
    .br { display: flex; align-items: center; padding: 8px 12px; }
    .br + .br { border-top: 2px solid #111; }
    .bl { flex: 1; }
    .bv { display: flex; flex-direction: column; align-items: flex-end; min-width: 100px; margin-left: 12px; }
    small { font-size: 11px; }
    .pk { font-size: 12px; color: #333; margin-top: 2px; }
    .foot { margin-top: 16px; font-family: Georgia, serif; font-size: 14px; font-weight: 700; }
  `

export const wrapDocument = ({ title, body, preview }) => `<!doctype html><html><head><meta charset="utf-8">${
  preview ? '<meta name="viewport" content="width=device-width, initial-scale=1">' : ''
}<title>${esc(title)}</title><style>${documentCss(preview)}</style></head><body>${body}</body></html>`

export const buildEstimateHtml = (bill, { preview = false } = {}) =>
  wrapDocument({ title: estimateFileName(bill), body: estimateSectionHtml(bill), preview })

// Renders HTML to an A4 PDF named <fileName>.pdf and opens the system share
// sheet (WhatsApp etc.).
export async function sharePdfHtml({ html, fileName, dialogTitle }) {
  const printed = await Print.printToFileAsync({ html, width: 595, height: 842 })
  // printToFileAsync picks a random file name; rename it so the shared file is readable.
  const file = new File(Paths.cache, `${fileName}.pdf`)
  if (file.exists) file.delete()
  await new File(printed.uri).move(file)
  if (!(await Sharing.isAvailableAsync())) throw new Error('Sharing is not available on this device')
  await Sharing.shareAsync(file.uri, { mimeType: 'application/pdf', UTI: 'com.adobe.pdf', dialogTitle })
}

// Opens the system print dialog, whose "Save as PDF" stores the file on the device.
// The dialog takes its file name from the page title.
export const savePdfHtml = (html) => Print.printAsync({ html })

export const sharePdf = (bill) =>
  sharePdfHtml({
    html: buildEstimateHtml(bill),
    fileName: estimateFileName(bill),
    dialogTitle: `Estimate ${voucherNo(bill.billNo)}`,
  })

export const savePdf = (bill) => savePdfHtml(buildEstimateHtml(bill))

export async function shareEstimate(billNo) {
  return sharePdf(await getBill(billNo))
}
