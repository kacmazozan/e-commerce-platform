import { useState, useEffect, useCallback } from 'react'
import API_BASE from '../../api'
import { btnBase, btnSearch, btnEdit, fieldInputClass } from '../../styles/dashboardStyles'

const API = `${API_BASE}/api/product-manager/orders`

const STATUS_BADGE_CLASS = {
  pending: 'bg-blue-500/10 text-blue-400',
  processing: 'bg-amber-500/10 text-amber-400',
  shipped: 'bg-sky-500/10 text-sky-400',
  delivered: 'bg-emerald-500/10 text-emerald-400',
  cancelled: 'bg-red-500/10 text-red-400',
}

const tableWrap =
  'overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] shadow-[var(--shadow)] backdrop-blur-xl'
const tableClass = 'min-w-full divide-y divide-[var(--border)] text-left text-sm'
const thClass =
  'bg-emerald-400/12 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-[var(--text)]'
const tdClass = 'px-4 py-3 text-[var(--text-h)]'
const emptyClass = 'px-4 py-8 text-center text-[var(--text)]'

function PMOrders({ token }) {
  const [orders, setOrders] = useState([])
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 0 })
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [detail, setDetail] = useState(null)

  const fetchOrders = useCallback(
    async (page = 1) => {
      setLoading(true)
      setError('')
      try {
        const params = new URLSearchParams({ page, limit: 10 })
        if (search) params.set('search', search)
        if (statusFilter) params.set('status', statusFilter)
        const res = await fetch(`${API}?${params}`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        if (!res.ok) throw new Error('Failed to fetch orders')
        const data = await res.json()
        setOrders(data.orders)
        setPagination(data.pagination)
      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    },
    [token, search, statusFilter]
  )

  useEffect(() => {
    fetchOrders(1)
  }, [fetchOrders])

  function handleSearch(e) {
    e.preventDefault()
    fetchOrders(1)
  }

  async function viewOrder(orderId) {
    setError('')
    try {
      const res = await fetch(`${API}/${orderId}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Could not load order')
      setDetail(data)
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <form className="flex min-w-0 flex-1 gap-2" onSubmit={handleSearch}>
          <input
            type="text"
            className={`${fieldInputClass} min-w-[140px] flex-1`}
            placeholder="Search by customer email…"
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
              <th className={thClass}>Order ID</th>
              <th className={thClass}>Customer</th>
              <th className={thClass}>Status</th>
              <th className={thClass}>Total</th>
              <th className={thClass}>Date</th>
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
                  No orders found
                </td>
              </tr>
            ) : (
              orders.map((o) => (
                <tr key={o.id} className="transition-colors hover:bg-[var(--card-bg)]/60">
                  <td className={tdClass}>#{o.id}</td>
                  <td className={tdClass}>{o.user_email || o.customer_email || '—'}</td>
                  <td className={tdClass}>
                    <span
                      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_BADGE_CLASS[o.status] || 'bg-slate-500/10 text-slate-400'}`}
                    >
                      {o.status}
                    </span>
                  </td>
                  <td className={tdClass}>
                    $
                    {(
                      parseFloat(o.total || o.total_price || 0) + parseFloat(o.shipping_cost || 0)
                    ).toFixed(2)}
                  </td>
                  <td className={tdClass}>{new Date(o.created_at).toLocaleDateString()}</td>
                  <td className={tdClass}>
                    <button type="button" className={btnEdit} onClick={() => viewOrder(o.id)}>
                      View
                    </button>
                  </td>
                </tr>
              ))
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
            Page {pagination.page} of {pagination.totalPages} ({pagination.total} orders)
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
              Order #{detail.order?.id ?? detail.id}
            </h2>
            <div className="mb-4 grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1">
                <span className="text-xs font-medium tracking-wide text-[var(--text)] uppercase opacity-70">
                  Customer
                </span>
                <span className="text-sm text-[var(--text-h)]">
                  {detail.order?.user_email ??
                    detail.user_email ??
                    detail.order?.customer_email ??
                    detail.customer_email ??
                    '—'}
                </span>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-xs font-medium tracking-wide text-[var(--text)] uppercase opacity-70">
                  Status
                </span>
                <span
                  className={`inline-flex w-fit items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_BADGE_CLASS[detail.order?.status ?? detail.status] || 'bg-slate-500/10 text-slate-400'}`}
                >
                  {detail.order?.status ?? detail.status}
                </span>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-xs font-medium tracking-wide text-[var(--text)] uppercase opacity-70">
                  Total
                </span>
                <span className="text-sm text-[var(--text-h)]">
                  $
                  {(
                    parseFloat(detail.order?.total ?? detail.total ?? detail.total_price ?? 0) +
                    parseFloat(detail.order?.shipping_cost ?? detail.shipping_cost ?? 0)
                  ).toFixed(2)}
                </span>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-xs font-medium tracking-wide text-[var(--text)] uppercase opacity-70">
                  Date
                </span>
                <span className="text-sm text-[var(--text-h)]">
                  {new Date(detail.order?.created_at ?? detail.created_at).toLocaleString()}
                </span>
              </div>
              {(detail.order?.address ??
                detail.address ??
                detail.order?.shipping_address ??
                detail.shipping_address) && (
                <div className="col-span-2 flex flex-col gap-1">
                  <span className="text-xs font-medium tracking-wide text-[var(--text)] uppercase opacity-70">
                    Shipping Address
                  </span>
                  <span className="text-sm text-[var(--text-h)]">
                    {detail.order?.address ??
                      detail.address ??
                      detail.order?.shipping_address ??
                      detail.shipping_address}
                  </span>
                </div>
              )}
            </div>
            {(detail.items ?? detail.order?.items)?.length > 0 && (
              <>
                <p className="mt-4 mb-2 font-medium text-[var(--text-h)]">Items</p>
                <div className={tableWrap}>
                  <table className={tableClass}>
                    <thead>
                      <tr>
                        <th className={thClass}>Product</th>
                        <th className={thClass}>Qty</th>
                        <th className={thClass}>Price</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--border)]">
                      {(detail.items ?? detail.order?.items ?? []).map((item, i) => (
                        <tr key={i}>
                          <td className={tdClass}>{item.product_name ?? item.name}</td>
                          <td className={tdClass}>{item.quantity}</td>
                          <td className={tdClass}>
                            ${parseFloat(item.price ?? item.unit_price ?? 0).toFixed(2)}
                          </td>
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

export default PMOrders
