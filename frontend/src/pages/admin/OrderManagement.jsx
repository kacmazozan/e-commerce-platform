import { useState, useEffect, useCallback } from 'react'
import API_BASE from '../../api'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'

const API = `${API_BASE}/api/admin/orders`
const STATUSES = ['pending', 'processing', 'shipped', 'delivered', 'cancelled']
const STATUS_LABELS = {
  pending: 'Pending',
  processing: 'Processing',
  shipped: 'Shipped',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
}
const STATUS_BADGE_CLASS = {
  pending: 'bg-blue-500/10 text-blue-400 border-0',
  processing: 'bg-amber-500/10 text-amber-400 border-0',
  shipped: 'bg-purple-400/12 text-purple-400 border-0',
  delivered: 'bg-emerald-500/10 text-emerald-400 border-0',
  cancelled: 'bg-red-500/10 text-red-400 border-0',
}

const btnBase =
  'font-[inherit] text-[13px] font-medium px-4 py-2 border border-[var(--border)] rounded-[10px] bg-[var(--card-bg)] text-[var(--text-h)] cursor-pointer transition-all duration-150 whitespace-nowrap disabled:opacity-45 disabled:cursor-not-allowed hover:not-disabled:border-purple-400 hover:not-disabled:text-purple-400'
const btnSearch =
  'font-[inherit] text-[13px] font-medium px-4 py-2 border border-purple-400/30 rounded-[10px] bg-purple-400/12 text-purple-400 cursor-pointer transition-all duration-150 whitespace-nowrap'
const btnEdit =
  'font-[inherit] text-[12px] font-medium px-3 py-1 border border-[var(--border)] rounded-[10px] bg-[var(--card-bg)] text-[var(--text-h)] cursor-pointer transition-all duration-150 hover:border-purple-400 hover:text-purple-400'
const btnDelete =
  'font-[inherit] text-[12px] font-medium px-3 py-1 border border-red-500/20 rounded-[10px] bg-red-500/10 text-red-400 cursor-pointer transition-all duration-150 hover:bg-red-500/20 hover:border-red-500'
const btnDanger =
  'font-[inherit] text-[13px] font-medium px-4 py-2 rounded-[10px] bg-red-500 text-white border-none cursor-pointer transition-opacity duration-150 hover:opacity-90'

function OrderManagement({ token }) {
  // ... rest of state stays same ...
  const [orders, setOrders] = useState([])
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 0 })
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [detail, setDetail] = useState(null) // { order, items }
  const [deleteConfirm, setDeleteConfirm] = useState(null)

  const authHeaders = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }

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
    try {
      const res = await fetch(`${API}/${orderId}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) throw new Error('Failed to fetch order details')
      const data = await res.json()
      setDetail(data)
    } catch (err) {
      setError(err.message)
    }
  }

  async function updateStatus(orderId, status) {
    try {
      const res = await fetch(`${API}/${orderId}`, {
        method: 'PUT',
        headers: authHeaders,
        body: JSON.stringify({ status }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to update order')
      fetchOrders(pagination.page)
      if (detail && detail.order.id === orderId) {
        setDetail({ ...detail, order: { ...detail.order, status } })
      }
    } catch (err) {
      setError(err.message)
    }
  }

  async function handleDelete(orderId) {
    try {
      const res = await fetch(`${API}/${orderId}`, { method: 'DELETE', headers: authHeaders })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Failed to delete order')
        return
      }
      setDeleteConfirm(null)
      fetchOrders(pagination.page)
    } catch {
      setError('Could not connect to server')
    }
  }

  return (
    <div>
      {/* Toolbar */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <form className="flex min-w-0 flex-1 gap-2" onSubmit={handleSearch}>
          <Input
            type="text"
            className="min-w-[140px] flex-1 border-[var(--border)] bg-[var(--card-bg)] text-[var(--text-h)] placeholder:text-[var(--text)]/40"
            placeholder="Search by customer email…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <select
            className="cursor-pointer rounded-[10px] border border-[var(--border)] bg-[var(--card-bg)] px-3 py-2 font-[inherit] text-sm text-[var(--text-h)] transition-all duration-150 outline-none"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="">All statuses</option>
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {STATUS_LABELS[s]}
              </option>
            ))}
          </select>
          <button type="button" type="submit" className={btnSearch}>
            Search
          </button>
        </form>
      </div>

      {error && <p className="mb-4 text-sm text-red-400">{error}</p>}

      {/* Table */}
      <div className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] shadow-[var(--shadow)] backdrop-blur-xl">
        <Table>
          <TableHeader>
            <TableRow className="border-[var(--border)] hover:bg-transparent">
              <TableHead className="bg-purple-400/12 text-xs tracking-wide text-[var(--text)] uppercase">
                Order ID
              </TableHead>
              <TableHead className="bg-purple-400/12 text-xs tracking-wide text-[var(--text)] uppercase">
                Customer
              </TableHead>
              <TableHead className="bg-purple-400/12 text-xs tracking-wide text-[var(--text)] uppercase">
                Status
              </TableHead>
              <TableHead className="bg-purple-400/12 text-xs tracking-wide text-[var(--text)] uppercase">
                Total
              </TableHead>
              <TableHead className="bg-purple-400/12 text-xs tracking-wide text-[var(--text)] uppercase">
                Date
              </TableHead>
              <TableHead className="bg-purple-400/12 text-xs tracking-wide text-[var(--text)] uppercase">
                Actions
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow className="border-[var(--border)]">
                <TableCell colSpan={6} className="py-8 text-center text-[var(--text)]">
                  Loading…
                </TableCell>
              </TableRow>
            ) : orders.length === 0 ? (
              <TableRow className="border-[var(--border)]">
                <TableCell colSpan={6} className="py-8 text-center text-[var(--text)]">
                  No orders found
                </TableCell>
              </TableRow>
            ) : (
              orders.map((o) => (
                <TableRow
                  key={o.id}
                  className="border-[var(--border)] transition-colors hover:bg-purple-400/5"
                >
                  <TableCell className="font-mono text-xs text-[var(--text-h)]">#{o.id}</TableCell>
                  <TableCell className="text-[var(--text-h)]">{o.user_email}</TableCell>
                  <TableCell>
                    <Badge
                      className={
                        STATUS_BADGE_CLASS[o.status] || 'border-0 bg-white/10 text-[var(--text-h)]'
                      }
                    >
                      {STATUS_LABELS[o.status]}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-[var(--text-h)]">
                    ${parseFloat(o.total).toFixed(2)}
                  </TableCell>
                  <TableCell className="text-[var(--text-h)]">
                    {new Date(o.created_at).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1.5">
                      <button type="button" className={btnEdit} onClick={() => viewOrder(o.id)}>
                        View
                      </button>
                      <button
                        type="button"
                        type="button"
                        className={btnDelete}
                        onClick={() => setDeleteConfirm(o)}
                      >
                        Delete
                      </button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="mt-5 flex items-center justify-center gap-4">
          <button
            type="button"
            type="button"
            className={btnBase}
            disabled={pagination.page <= 1}
            onClick={() => fetchOrders(pagination.page - 1)}
          >
            Previous
          </button>
          <span className="text-[13px] text-[var(--text)]">
            Page {pagination.page} of {pagination.totalPages} ({pagination.total} orders)
          </span>
          <button
            type="button"
            type="button"
            className={btnBase}
            disabled={pagination.page >= pagination.totalPages}
            onClick={() => fetchOrders(pagination.page + 1)}
          >
            Next
          </button>
        </div>
      )}

      {/* Order Detail Modal */}
      <Dialog open={!!detail} onOpenChange={(open) => !open && setDetail(null)}>
        <DialogContent className="max-w-[560px] rounded-2xl border border-[var(--glass-border)] bg-[var(--card-bg)] shadow-[var(--shadow)] backdrop-blur-xl">
          <DialogHeader>
            <DialogTitle className="text-xl text-[var(--text-h)]">
              Order #{detail?.order.id}
            </DialogTitle>
          </DialogHeader>
          {detail && (
            <>
              <div className="mb-5 grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1">
                  <span className="text-[12px] font-semibold tracking-wide text-[var(--text)] uppercase">
                    Customer
                  </span>
                  <span className="text-[var(--text-h)]">{detail.order.user_email}</span>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-[12px] font-semibold tracking-wide text-[var(--text)] uppercase">
                    Status
                  </span>
                  <select
                    className="cursor-pointer rounded-md border border-[var(--border)] bg-[var(--bg)] px-3 py-2 font-[inherit] text-sm text-[var(--text-h)] transition-all duration-150 outline-none"
                    value={detail.order.status}
                    onChange={(e) => updateStatus(detail.order.id, e.target.value)}
                  >
                    {STATUSES.map((s) => (
                      <option key={s} value={s}>
                        {STATUS_LABELS[s]}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-[12px] font-semibold tracking-wide text-[var(--text)] uppercase">
                    Total
                  </span>
                  <span className="text-[var(--text-h)]">
                    ${parseFloat(detail.order.total).toFixed(2)}
                  </span>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-[12px] font-semibold tracking-wide text-[var(--text)] uppercase">
                    Date
                  </span>
                  <span className="text-[var(--text-h)]">
                    {new Date(detail.order.created_at).toLocaleString()}
                  </span>
                </div>
                {detail.order.address && (
                  <div className="col-span-2 flex flex-col gap-1">
                    <span className="text-[12px] font-semibold tracking-wide text-[var(--text)] uppercase">
                      Address
                    </span>
                    <span className="text-[var(--text-h)]">{detail.order.address}</span>
                  </div>
                )}
              </div>

              {detail.items.length > 0 && (
                <>
                  <h3 className="m-0 mb-3 text-[15px] font-medium text-[var(--text-h)]">Items</h3>
                  <div className="mb-5 overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--bg)]">
                    <Table>
                      <TableHeader>
                        <TableRow className="border-[var(--border)] hover:bg-transparent">
                          <TableHead className="bg-purple-400/12 text-xs tracking-wide text-[var(--text)] uppercase">
                            Product
                          </TableHead>
                          <TableHead className="bg-purple-400/12 text-xs tracking-wide text-[var(--text)] uppercase">
                            Qty
                          </TableHead>
                          <TableHead className="bg-purple-400/12 text-xs tracking-wide text-[var(--text)] uppercase">
                            Price
                          </TableHead>
                          <TableHead className="bg-purple-400/12 text-xs tracking-wide text-[var(--text)] uppercase">
                            Subtotal
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {detail.items.map((item) => (
                          <TableRow
                            key={item.id}
                            className="border-[var(--border)] transition-colors hover:bg-purple-400/5"
                          >
                            <TableCell className="text-[var(--text-h)]">
                              {item.product_name}
                            </TableCell>
                            <TableCell className="text-[var(--text-h)]">{item.quantity}</TableCell>
                            <TableCell className="text-[var(--text-h)]">
                              ${parseFloat(item.price).toFixed(2)}
                            </TableCell>
                            <TableCell className="text-[var(--text-h)]">
                              ${(item.quantity * parseFloat(item.price)).toFixed(2)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </>
              )}

              <div className="flex justify-end">
                <button type="button" className={btnBase} onClick={() => setDetail(null)}>
                  Close
                </button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog open={!!deleteConfirm} onOpenChange={(open) => !open && setDeleteConfirm(null)}>
        <DialogContent className="max-w-md rounded-2xl border border-[var(--glass-border)] bg-[var(--card-bg)] shadow-[var(--shadow)] backdrop-blur-xl">
          <DialogHeader>
            <DialogTitle className="text-xl text-[var(--text-h)]">Delete Order</DialogTitle>
          </DialogHeader>
          <p className="mb-5 leading-relaxed text-[var(--text)]">
            Are you sure you want to delete order{' '}
            <strong className="text-[var(--text-h)]">#{deleteConfirm?.id}</strong>? This will also
            remove all associated items.
          </p>
          <div className="flex justify-end gap-2">
            <button type="button" className={btnBase} onClick={() => setDeleteConfirm(null)}>
              Cancel
            </button>
            <button
              type="button"
              type="button"
              className={btnDanger}
              onClick={() => handleDelete(deleteConfirm.id)}
            >
              Delete
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default OrderManagement
