import { useState, useEffect } from 'react'
import API_BASE from '../../api'

const API = `${API_BASE}/api/admin/settings/stats`
const STATUS_LABELS = {
  pending: 'Pending',
  processing: 'Processing',
  shipped: 'Shipped',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
}
const STATUS_COLORS = {
  pending: '#3b82f6',
  processing: '#f59e0b',
  shipped: '#8b5cf6',
  delivered: '#10b981',
  cancelled: '#ef4444',
}

function DashboardHome({ token, onNavigate }) {
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchStats() {
      try {
        const res = await fetch(API, { headers: { Authorization: `Bearer ${token}` } })
        if (!res.ok) throw new Error('Failed to fetch stats')
        setStats(await res.json())
      } catch {
        // silent — dashboard is non-critical
      } finally {
        setLoading(false)
      }
    }
    fetchStats()
  }, [token])

  if (loading) return <p className="text-[var(--text)]">Loading dashboard…</p>
  if (!stats) return <p className="text-[var(--text)]">Could not load dashboard data.</p>

  const maxStatusCount = Math.max(1, ...stats.ordersByStatus.map((s) => parseInt(s.count)))

  return (
    <div>
      {/* ─── KPI Cards ─────────────────────────────── */}
      <div className="mb-7 grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-4">
        <button
          type="button"
          className="flex cursor-pointer flex-col gap-1 rounded-[10px] border border-[var(--border)] bg-[var(--card-bg)] px-5 py-6 text-left font-[inherit] shadow-[var(--shadow)] transition-all duration-150 hover:border-purple-400 hover:bg-purple-400/12"
          onClick={() => onNavigate('users')}
        >
          <span className="text-[28px] font-semibold tracking-tight text-[var(--text-h)]">
            {stats.totalUsers}
          </span>
          <span className="text-[13px] tracking-wide text-[var(--text)] uppercase opacity-70">
            Total Users
          </span>
        </button>
        <button
          type="button"
          className="flex cursor-pointer flex-col gap-1 rounded-[10px] border border-[var(--border)] bg-[var(--card-bg)] px-5 py-6 text-left font-[inherit] shadow-[var(--shadow)] transition-all duration-150 hover:border-purple-400 hover:bg-purple-400/12"
          onClick={() => onNavigate('products')}
        >
          <span className="text-[28px] font-semibold tracking-tight text-[var(--text-h)]">
            {stats.totalProducts}
          </span>
          <span className="text-[13px] tracking-wide text-[var(--text)] uppercase opacity-70">
            Total Products
          </span>
        </button>
        <button
          type="button"
          className="flex cursor-pointer flex-col gap-1 rounded-[10px] border border-[var(--border)] bg-[var(--card-bg)] px-5 py-6 text-left font-[inherit] shadow-[var(--shadow)] transition-all duration-150 hover:border-purple-400 hover:bg-purple-400/12"
          onClick={() => onNavigate('orders')}
        >
          <span className="text-[28px] font-semibold tracking-tight text-[var(--text-h)]">
            {stats.totalOrders}
          </span>
          <span className="text-[13px] tracking-wide text-[var(--text)] uppercase opacity-70">
            Total Orders
          </span>
        </button>
        <div className="flex flex-col gap-1 rounded-[10px] border border-[var(--border)] bg-[var(--card-bg)] px-5 py-6 shadow-[var(--shadow)]">
          <span className="text-[28px] font-semibold tracking-tight text-[var(--text-h)]">
            ${stats.totalRevenue.toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </span>
          <span className="text-[13px] tracking-wide text-[var(--text)] uppercase opacity-70">
            Total Revenue
          </span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-5 max-[900px]:grid-cols-1">
        {/* ─── Orders by Status Chart ──────────────── */}
        <div className="rounded-[10px] border border-[var(--border)] bg-[var(--card-bg)] p-6 shadow-[var(--shadow)]">
          <h3 className="m-0 mb-4 text-base font-medium text-[var(--text-h)]">Orders by Status</h3>
          {stats.ordersByStatus.length === 0 ? (
            <p className="text-sm text-[var(--text)]">No orders yet</p>
          ) : (
            <div className="flex flex-col gap-3">
              {stats.ordersByStatus.map((s) => (
                <div key={s.status} className="flex items-center gap-2.5">
                  <span className="w-[85px] shrink-0 text-[13px] text-[var(--text)]">
                    {STATUS_LABELS[s.status] || s.status}
                  </span>
                  <div className="h-6 flex-1 overflow-hidden rounded bg-purple-400/12">
                    <div
                      className="h-full min-w-1 rounded transition-[width] duration-300 ease-in-out"
                      style={{
                        width: `${(parseInt(s.count) / maxStatusCount) * 100}%`,
                        backgroundColor: STATUS_COLORS[s.status] || '#c084fc',
                      }}
                    />
                  </div>
                  <span className="w-8 shrink-0 text-right text-sm font-medium text-[var(--text-h)]">
                    {s.count}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ─── Recent Orders ───────────────────────── */}
        <div className="rounded-[10px] border border-[var(--border)] bg-[var(--card-bg)] p-6 shadow-[var(--shadow)]">
          <h3 className="m-0 mb-4 text-base font-medium text-[var(--text-h)]">Recent Orders</h3>
          {stats.recentOrders.length === 0 ? (
            <p className="text-sm text-[var(--text)]">No orders yet</p>
          ) : (
            <div className="flex flex-col">
              {stats.recentOrders.map((o) => (
                <div
                  key={o.id}
                  className="flex items-center justify-between border-b border-[var(--border)] py-2.5 last:border-b-0"
                >
                  <div className="flex items-center gap-2.5">
                    <span className="text-[13px] font-semibold text-[var(--text-h)]">#{o.id}</span>
                    <span className="text-[13px] text-[var(--text)]">{o.user_email}</span>
                  </div>
                  <div className="flex items-center gap-3.5">
                    <span
                      className="text-[12px] font-medium"
                      style={{ color: STATUS_COLORS[o.status] }}
                    >
                      {STATUS_LABELS[o.status]}
                    </span>
                    <span className="text-sm font-medium text-[var(--text-h)]">
                      ${parseFloat(o.total).toFixed(2)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default DashboardHome
