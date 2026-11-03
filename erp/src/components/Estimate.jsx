import { useEffect, useState } from 'react'
import { getBill } from '../api'
import EstimateSheet, { fmtDate } from './EstimateSheet'
import PageHeader from './PageHeader'

export default function Estimate({ billNo, onBack }) {
  const [bill, setBill] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    getBill(billNo)
      .then(setBill)
      .catch((e) => setError(e.message))
  }, [billNo])

  // The browser's "Save as PDF" names the file after the page title.
  const save = () => {
    const prev = document.title
    document.title = `${bill.partyName}-${fmtDate(bill.billTs)}`
    window.print()
    document.title = prev
  }

  if (error) return <div className="est-state">{error}</div>
  if (!bill) return <div className="est-state">Loading…</div>

  return (
    <div className="est-page">
      <div className="est-toolbar">
        <PageHeader title={`Estimate · Sale #${bill.billNo}`} onBack={onBack} />
        <button type="button" className="btn-primary est-save" onClick={save}>
          SAVE
        </button>
      </div>

      <div className="est-sheet">
        <EstimateSheet bill={bill} />
      </div>
    </div>
  )
}
