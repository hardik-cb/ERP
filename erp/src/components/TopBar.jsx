import { useState } from 'react'

function formatDateDMY(iso) {
  if (!iso) return ''
  const [y, m, d] = iso.split('-')
  return `${d}/${m}/${y}`
}

function formatTime12h(hhmm) {
  if (!hhmm) return ''
  const [hStr, mStr] = hhmm.split(':')
  let h = Number(hStr)
  const ampm = h >= 12 ? 'PM' : 'AM'
  h = h % 12 || 12
  return `${String(h).padStart(2, '0')}:${mStr} ${ampm}`
}

export default function TopBar({ readOnly, onBack, onPrint, invoiceNo, date, onDateChange, time, onTimeChange }) {
  const [editingDate, setEditingDate] = useState(false)
  const [editingTime, setEditingTime] = useState(false)

  return (
    <div className="topbar">
      <div className="topbar-header">
        <button type="button" className="topbar-icon-btn" title="Back" onClick={onBack}>←</button>
        <span className="topbar-title">Sale</span>
        <div className="topbar-header-actions">
          {onPrint && (
            <button type="button" className="topbar-icon-btn" title="Print" onClick={onPrint}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M6 9V3h12v6" />
                <rect x="3" y="9" width="18" height="9" rx="2" />
                <path d="M7 14h10v7H7z" />
              </svg>
            </button>
          )}
        </div>
      </div>

      <div className="topbar-info">
        <div className="topbar-field">
          <span className="topbar-field-label">Invoice No.</span>
          <span className="topbar-field-value">
            {invoiceNo} <span className="topbar-chevron">⌄</span>
          </span>
        </div>

        <div className="topbar-divider" />

        <div className="topbar-field">
          <span className="topbar-field-label">Date</span>
          {editingDate ? (
            <input
              type="date"
              className="topbar-native-input"
              value={date}
              autoFocus
              autoComplete="off"
              onChange={(e) => onDateChange(e.target.value)}
              onBlur={() => setEditingDate(false)}
            />
          ) : (
            <button type="button" className="topbar-field-value topbar-field-btn" onClick={() => setEditingDate(true)} disabled={readOnly}>
              {formatDateDMY(date)} <span className="topbar-chevron">⌄</span>
            </button>
          )}
        </div>

        <div className="topbar-divider" />

        <div className="topbar-field">
          <span className="topbar-field-label">Time</span>
          {editingTime ? (
            <input
              type="time"
              className="topbar-native-input"
              value={time}
              autoFocus
              autoComplete="off"
              onChange={(e) => onTimeChange(e.target.value)}
              onBlur={() => setEditingTime(false)}
            />
          ) : (
            <button type="button" className="topbar-field-value topbar-field-btn" onClick={() => setEditingTime(true)} disabled={readOnly}>
              {formatTime12h(time)} <span className="topbar-chevron">⌄</span>
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
