import { useState, useEffect, useCallback } from 'react'
import API_BASE from '../../api'
import { btnBase, btnSearch, btnCreate, fieldInputClass } from '../../styles/dashboardStyles'

const ORDERS_API = `${API_BASE}/api/product-manager/orders`

const STATUS_BADGE_CLASS = {
  pending: 'bg-blue-500/10 text-blue-400',
  processing: 'bg-amber-500/10 text-amber-400',
  shipped: 'bg-sky-500/10 text-sky-400',
  delivered: 'bg-emerald-500/10 text-emerald-400',
  cancelled: 'bg-red-500/10 text-red-400',
}

const NEXT_STATUSES = {
  pending: ['cancelled'],
  processing: ['shipped', 'cancelled'],
  shipped: ['delivered', 'cancelled'],
  delivered: [],
  cancelled: [],
}

const tableWrap =
  'overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] shadow-[var(--shadow)] backdrop-blur-xl'
const tableClass = 'min-w-full divide-y divide-[var(--border)] text-left text-sm'
const thClass =
  'bg-emerald-400/12 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-[var(--text)]'
const tdClass = 'px-4 py-3 text-[var(--text-h)]'
const emptyClass = 'px-4 py-8 text-center text-[var(--text)]'

function PMDeliveries({ token }) {
  const [orders, setOrders] = useState([])
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 0 })
  const [search, setSearch] = useState('')
  const [appliedSearch, setAppliedSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [detail, setDetail] = useState(null)
  const [updating, setUpdating] = useState(null)

  const fetchOrders = useCallback(
    async (page = 1) => {
      setLoading(true)
      setError('')
      try {
        const params = new URLSearchParams({ page, limit: 10 })
        if (appliedSearch) params.set('search', appliedSearch)
        if (statusFilter) params.set('status', statusFilter)
        const res = await fetch(`${ORDERS_API}?${params}`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        if (!res.ok) throw new Error('Failed to fetch deliveries')
        const data = await res.json()
        setOrders(data.orders)
        setPagination(data.pagination)
      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    },
    [token, appliedSearch, statusFilter]
  )

  useEffect(() => {
    fetchOrders(1)
  }, [fetchOrders])

  function handleSearch(e) {
    e.preventDefault()
    setAppliedSearch(search)
  }

  async function viewDetail(orderId) {
    setError('')
    try {
      const res = await fetch(`${ORDERS_API}/${orderId}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Could not load delivery')
      setDetail(data)
    } catch (err) {
      setError(err.message)
    }
  }

  async function updateStatus(orderId, newStatus) {
    setUpdating(orderId)
    setError('')
    try {
      const res = await fetch(`${ORDERS_API}/${orderId}/status`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: newStatus }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to update status')
      // Optimistically update the row or refetch
      setOrders((prev) =>
        prev.map((o) =>
          o.id === orderId
            ? { ...o, status: data.order.status, updated_at: data.order.updated_at }
            : o
        )
      )
      // If we're filtering by a specific status, the updated order no longer matches — refetch
      if (statusFilter && data.order.status !== statusFilter) {
        fetchOrders(pagination.page)
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setUpdating(null)
    }
  }

  async function markDelivered(orderId) {
    await updateStatus(orderId, 'delivered')
  }

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <form className="flex min-w-0 flex-1 gap-2" onSubmit={handleSearch}>
          <input
            type="text"
            className={`${fieldInputClass} min-w-[140px] flex-1`}
            placeholder="Search by customer email or order ID…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <button type="button" type="submit" className={btnSearch}>
            Search
          </button>
        </form>
        <select
          className={fieldInputClass}
          style={{ width: 'auto' }}
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="">All statuses</option>
          <option value="pending">Pending</option>
          <option value="processing">Processing</option>
          <option value="shipped">Shipped</option>
          <option value="delivered">Delivered</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </div>

      {error && <p className="mb-4 text-sm text-red-400">{error}</p>}

      <div className={tableWrap}>
        <table className={tableClass}>
          <thead>
            <tr>
              <th className={thClass}>Delivery ID</th>
              <th className={thClass}>Customer</th>
              <th className={thClass}>Address</th>
              <th className={thClass}>Total</th>
              <th className={thClass}>Status</th>
              <th className={thClass}>Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border)]">
            {loading ? (
              <tr>
                <td colSpan="6" className={emptyClass}>
                  Loading…
                </td>
              </tr>
            ) : orders.length === 0 ? (
              <tr>
                <td colSpan="6" className={emptyClass}>
                  No deliveries found
                </td>
              </tr>
            ) : (
              orders.map((o) => {
                const nextStatuses = NEXT_STATUSES[o.status] ?? []
                const isUpdating = updating === o.id
                return (
                  <tr key={o.id} className="transition-colors hover:bg-[var(--card-bg)]/60">
                    <td className={tdClass}>#{o.id}</td>
                    <td className={tdClass}>{o.user_email || '—'}</td>
                    <td className={`${tdClass} max-w-[200px] truncate`} title={o.address || ''}>
                      {o.address || <span className="opacity-50">—</span>}
                    </td>
                    <td className={tdClass}>${parseFloat(o.total || 0).toFixed(2)}</td>
                    <td className={tdClass}>
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_BADGE_CLASS[o.status] || 'bg-slate-500/10 text-slate-400'}`}
                      >
                        {o.status}
                      </span>
                    </td>
                    <td className={tdClass}>
                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          className="rounded-lg border border-[var(--border)] px-2.5 py-1 text-xs text-[var(--text-h)] transition-colors hover:border-emerald-400 hover:text-emerald-400"
                          onClick={() => viewDetail(o.id)}
                        >
                          View
                        </button>
                        {nextStatuses.includes('delivered') && (
                          <button
                            type="button"
                            className={`${btnCreate} py-1 text-xs`}
                            disabled={isUpdating}
                            onClick={() => markDelivered(o.id)}
                          >
                            {isUpdating ? 'Saving…' : 'Mark Delivered'}
                          </button>
                        )}
                        {nextStatuses
                          .filter((s) => s !== 'delivered')
                          .map((s) => (
                            <button
                              type="button"
                              key={s}
                              className="rounded-lg border border-[var(--border)] px-2.5 py-1 text-xs text-[var(--text-h)] transition-colors hover:border-emerald-400 hover:text-emerald-400"
                              disabled={isUpdating}
                              onClick={() => updateStatus(o.id, s)}
                            >
                              {isUpdating
                                ? 'Saving…'
                                : `→ ${s.charAt(0).toUpperCase() + s.slice(1)}`}
                            </button>
                          ))}
                      </div>
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>

      {pagination.totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between text-sm">
          <button
            type="button"
            className={btnBase}
            disabled={pagination.page <= 1}
            onClick={() => fetchOrders(pagination.page - 1)}
          >
            Previous
          </button>
          <span className="text-[var(--text)]">
            Page {pagination.page} of {pagination.totalPages} ({pagination.total} deliveries)
          </span>
          <button
            type="button"
            className={btnBase}
            disabled={pagination.page >= pagination.totalPages}
            onClick={() => fetchOrders(pagination.page + 1)}
          >
            Next
          </button>
        </div>
      )}

      {detail && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
          onClick={() => setDetail(null)}
        >
          <div
            className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-[var(--glass-border)] bg-[var(--card-bg)] p-6 shadow-[var(--shadow)]"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="mb-4 text-lg font-semibold text-[var(--text-h)]">
              Delivery #{detail.order?.id}
            </h2>
            <div className="mb-4 grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1">
                <span className="text-xs font-medium tracking-wide text-[var(--text)] uppercase opacity-70">
                  Customer ID
                </span>
                <span className="text-sm text-[var(--text-h)]">{detail.order?.user_id ?? '—'}</span>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-xs font-medium tracking-wide text-[var(--text)] uppercase opacity-70">
                  Customer Email
                </span>
                <span className="text-sm text-[var(--text-h)]">
                  {detail.order?.user_email ?? '—'}
                </span>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-xs font-medium tracking-wide text-[var(--text)] uppercase opacity-70">
                  Status
                </span>
                <span
                  className={`inline-flex w-fit items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_BADGE_CLASS[detail.order?.status] || 'bg-slate-500/10 text-slate-400'}`}
                >
                  {detail.order?.status}
                </span>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-xs font-medium tracking-wide text-[var(--text)] uppercase opacity-70">
                  Total Price
                </span>
                <span className="text-sm text-[var(--text-h)]">
                  ${parseFloat(detail.order?.total ?? 0).toFixed(2)}
                </span>
              </div>
              {detail.order?.address && (
                <div className="col-span-2 flex flex-col gap-1">
                  <span className="text-xs font-medium tracking-wide text-[var(--text)] uppercase opacity-70">
                    Delivery Address
                  </span>
                  <span className="text-sm text-[var(--text-h)]">{detail.order.address}</span>
                </div>
              )}
            </div>

            {detail.items?.length > 0 && (
              <>
                <p className="mt-4 mb-2 font-medium text-[var(--text-h)]">
                  Items ({detail.items.length})
                </p>
                <div className={tableWrap}>
                  <table className={tableClass}>
                    <thead>
                      <tr>
                        <th className={thClass}>Product ID</th>
                        <th className={thClass}>Product</th>
                        <th className={thClass}>Qty</th>
                        <th className={thClass}>Price</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--border)]">
                      {detail.items.map((item) => (
                        <tr key={item.id}>
                          <td className={tdClass}>{item.product_id}</td>
                          <td className={tdClass}>{item.product_name}</td>
                          <td className={tdClass}>{item.quantity}</td>
                          <td className={tdClass}>${parseFloat(item.price ?? 0).toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}

            <div className="mt-5 flex justify-end">
              <button type="button" className={btnBase} onClick={() => setDetail(null)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default PMDeliveries
