// Pure calculation helpers for an item row.
//
// Flow: qty -> subtract packaging -> net wt. Then % is applied to net wt
// to get the final net wt actually billed. Weight-based labour is charged
// on the net wt (before % is applied), not the final net wt.

// Packing is rounded to a whole number per item before it is deducted, so the
// net weight never carries the packing's decimals.
export function packagingWeight(item) {
  const total = (item.packaging || []).reduce((sum, row) => sum + (Number(row.wtG) || 0) * (Number(row.qnt) || 0), 0)
  return Math.round(total)
}

export function netWeight(item) {
  const qty = Number(item.qty) || 0
  return Math.max(qty - packagingWeight(item), 0)
}

export function finalNetWeight(item) {
  const pct = Number(item.pct) || 0
  return netWeight(item) * (pct / 100)
}

export function labourCharge(item) {
  const labour = item.labour
  if (!labour) return 0
  if (labour.mode === 'piece') {
    return (Number(labour.rate) || 0) * (Number(labour.qty) || 0)
  }
  if (labour.mode === 'weight') {
    return ((Number(labour.ratePerKg) || 0) / 1000) * netWeight(item)
  }
  return 0
}

export function itemTotals(item) {
  return {
    netWt: netWeight(item),
    packWt: packagingWeight(item),
    finalNetWt: finalNetWeight(item),
    labour: labourCharge(item),
  }
}

export function grandTotals(items) {
  return items.reduce(
    (acc, item) => {
      const t = itemTotals(item)
      // Each item is rounded first so the total always equals the sum of the
      // item amounts shown on the bill.
      acc.rs += Math.round(t.labour)
      acc.wt += Math.round(t.finalNetWt)
      return acc
    },
    { rs: 0, wt: 0 }
  )
}

// Settlement: after the bill total, the buyer settles either in cash
// ("Pase" — a straight cash adjustment on the billed weight) or by handing
// over/taking back metal ("Metal" — netted against the billed weight).

export function paseAmount({ rate, weightTotal, labourTotal }) {
  const base = ((Number(rate) || 0) * (Number(weightTotal) || 0)) / 1000
  return { base, total: base + (Number(labourTotal) || 0) }
}

export function metalRowNetWeight(row) {
  return Math.round(((Number(row.wt) || 0) * (Number(row.tunch) || 0)) / 100)
}

// bhavKatna: whether (part of) the metal difference is priced at the rate and
// settled in cash. katnaWt is how many grams of the difference are priced; the
// rest stays as a metal balance. Left undefined it means the whole difference,
// which is how bills were saved before katnaWt existed. When bhavKatna is
// false nothing is priced, the difference stays as a metal balance (grams) and
// only labour is cash. Defaults to true, as before the option existed.
export function metalSettlement({ rate, rows, weightTotal, labourTotal, bhavKatna = true, katnaWt }) {
  const metalFine = (rows || []).reduce((sum, row) => sum + metalRowNetWeight(row), 0)
  const delta = metalFine - (Number(weightTotal) || 0)
  // The part of the difference that is priced: all of it, a typed amount
  // (never more than the difference itself), or none.
  const katnaDelta = !bhavKatna
    ? 0
    : katnaWt == null
      ? delta
      : Math.sign(delta) * Math.min(Math.abs(delta), Math.max(Number(katnaWt) || 0, 0))
  const netPayableWeight = Math.abs(katnaDelta)
  // Rate is quoted per kg, same convention as Pase — divide grams by 1000.
  const signedPayable = ((Number(rate) || 0) * katnaDelta) / 1000
  // metalValue is the metal-weight delta expressed as money owed BY the
  // customer (positive) or owed TO the customer (negative, i.e. extra metal).
  const metalValue = bhavKatna ? -signedPayable : 0
  const labour = Number(labourTotal) || 0
  // Total is signed cash: positive means the shop receives it, negative means
  // the shop gives it to the customer.
  const total = metalValue + labour
  // Metal still owed, in grams: positive = customer owes us, negative = we owe
  // the customer. Zero once the whole difference has been priced.
  const metalBalance = -(delta - katnaDelta) || 0
  return { metalFine, delta, katnaDelta, netPayableWeight, metalValue, labour, total, metalBalance }
}

export function fmtWt(n) {
  const v = Math.round(Number(n) || 0)
  return `${v}g`
}

export function fmtRs(n) {
  const v = Math.round(Number(n) || 0)
  return `Rs ${v}`
}

// Lines describing how the customer settled a bill (metal given, Pase, cash
// received), for the printed estimate. Each line is { label, value }.
export function paymentLines({ settlement, received, weightTotal, labourTotal }) {
  const group = (n) => Math.round(n).toLocaleString('en-IN')
  const rs = (n) => `Rs. ${group(Math.abs(n))}`
  const g = (n) => {
    const v = Math.round((Number(n) || 0) * 100) / 100
    return Number.isInteger(v) ? group(v) : String(v)
  }
  const lines = []

  if (settlement?.mode === 'pase') {
    const rate = Number(settlement.rate) || 0
    lines.push({
      label: `Pase @ Rs ${group(rate)}/kg x ${g(weightTotal)}g`,
      value: rs((rate * (Number(weightTotal) || 0)) / 1000),
    })
  } else if (settlement?.mode === 'metal') {
    const rows = (settlement.rows || []).filter((r) => Number(r.wt))
    for (const row of rows) {
      lines.push({
        label: `Metal given ${g(row.wt)}g x ${g(row.tunch)}%`,
        value: `${g(metalRowNetWeight(row))}g fine`,
      })
    }
    if (rows.length > 1) {
      const fine = rows.reduce((sum, r) => sum + metalRowNetWeight(r), 0)
      lines.push({ label: 'Total metal given', value: `${g(fine)}g fine` })
    }
  }

  if (Number(received) > 0) lines.push({ label: 'Cash received', value: rs(received) })
  return lines
}

// The bhav katna line of a Metal settlement, shown as a row of the estimate's
// table. amount is signed cash: positive is added to what the party owes,
// negative (metal given in excess) is deducted. Null when nothing was priced.
export function katnaRow({ settlement, weightTotal, labourTotal }) {
  if (settlement?.mode !== 'metal' || !settlement.bhavKatna) return null
  const m = metalSettlement({
    rate: settlement.rate,
    rows: settlement.rows,
    weightTotal,
    labourTotal,
    bhavKatna: true,
    katnaWt: settlement.katnaWt,
  })
  if (m.katnaDelta === 0) return null
  const v = Math.round(m.netPayableWeight * 100) / 100
  const rate = Math.round(Number(settlement.rate) || 0).toLocaleString('en-IN')
  return { label: `Bhav katna ${v}g @ Rs ${rate}/kg`, amount: Math.round(m.metalValue) }
}
