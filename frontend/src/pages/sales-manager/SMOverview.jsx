import { useState, useEffect } from 'react'
import API_BASE from '../../api'

const cardClass =
  'flex cursor-pointer flex-col gap-1 rounded-[10px] border border-[var(--border)] bg-[var(--card-bg)] px-5 py-6 text-left font-[inherit] shadow-[var(--shadow)] transition-all duration-150 hover:border-emerald-400 hover:bg-emerald-400/12'
const valueClass = 'text-[28px] font-semibold tracking-tight text-[var(--text-h)]'
const labelClass = 'text-[13px] uppercase tracking-wide text-[var(--text)] opacity-70'

export default function SMOverview({ token, onNavigate }) {
  const [stats, setStats] = useState(null)

  useEffect(() => {
    fetch(`${API_BASE}/api/sales-manager/stats`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data) setStats(data.stats)
      })
      .catch(() => {})
  }, [token])

  const s = stats ?? {}

  return (
    <div className="space-y-6 p-6">
      <h2 className="text-lg font-semibold text-[var(--text-h)]">Overview</h2>
      <div className="grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-4">
        <button type="button" className={cardClass} onClick={() => onNavigate('products')}>
          <span className={valueClass}>{stats ? s.published_products : '—'}</span>
          <span className={labelClass}>Published Products</span>
        </button>
        <button type="button" className={cardClass} onClick={() => onNavigate('discounts')}>
          <span className={valueClass}>{stats ? s.active_discounts : '—'}</span>
          <span className={labelClass}>Active Discounts</span>
        </button>
        <button type="button" className={cardClass} onClick={() => onNavigate('refunds')}>
          <span className={valueClass}>{stats ? s.pending_refunds : '—'}</span>
          <span className={labelClass}>Pending Refunds</span>
        </button>
        <button type="button" className={cardClass} onClick={() => onNavigate('invoices')}>
          <span className={valueClass}>
            {stats ? `$${parseFloat(s.revenue_this_month).toFixed(2)}` : '—'}
          </span>
          <span className={labelClass}>Revenue This Month</span>
        </button>
        <button type="button" className={cardClass} onClick={() => onNavigate('invoices')}>
          <span className={valueClass}>{stats ? s.orders_this_month : '—'}</span>
          <span className={labelClass}>Orders This Month</span>
        </button>
      </div>
    </div>
  )
}
