export default function PageHeader({ title, onBack }) {
  return (
    <div className="salelist-header">
      <button type="button" className="topbar-icon-btn" title="Back" onClick={onBack}>←</button>
      <span className="salelist-title">{title}</span>
    </div>
  )
}
