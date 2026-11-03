import { useEffect, useState } from 'react'

// In-app replacement for window.confirm, which some browsers block or dismiss
// without showing. Mount <ConfirmHost /> once, then `await askConfirm({...})`.
let show = null

export function askConfirm({ title, message, confirmLabel = 'Delete' }) {
  if (!show) return Promise.resolve(window.confirm(`${title}\n\n${message}`))
  return new Promise((resolve) => show({ title, message, confirmLabel, resolve }))
}

export default function ConfirmHost() {
  const [req, setReq] = useState(null)

  useEffect(() => {
    show = setReq
    return () => {
      show = null
    }
  }, [])

  if (!req) return null
  const answer = (value) => {
    req.resolve(value)
    setReq(null)
  }

  return (
    <div className="confirm-backdrop" onClick={() => answer(false)}>
      <div className="confirm-card" role="alertdialog" onClick={(e) => e.stopPropagation()}>
        <div className="confirm-title">{req.title}</div>
        <div className="confirm-message">{req.message}</div>
        <div className="confirm-actions">
          <button type="button" className="btn-ghost" onClick={() => answer(false)}>
            Cancel
          </button>
          <button type="button" className="btn-danger" onClick={() => answer(true)} autoFocus>
            {req.confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
