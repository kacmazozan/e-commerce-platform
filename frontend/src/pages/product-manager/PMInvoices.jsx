import { useState, useEffect, useCallback } from 'react'
import API_BASE from '../../api'
import { btnBase, btnSearch, btnCreate, fieldInputClass } from '../../styles/dashboardStyles'

const INVOICES_API = `${API_BASE}/api/product-manager/invoices`

const STATUS_BADGE_CLASS = {
  pending: 'bg-blue-500/10 text-blue-400',
  processing: 'bg-amber-500/10 text-amber-400',
  shipped: 'bg-purple-400/12 text-purple-400',
  delivered: 'bg-emerald-500/10 text-emerald-400',
  cancelled: 'bg-red-500/10 text-red-400',
}

const tableWrap =
  'overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] shadow-[var(--shadow)] backdrop-blur-xl'
const tableClass = 'min-w-full divide-y divide-[var(--border)] text-left text-sm'
const thClass =
  'bg-purple-400/12 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-[var(--text)]'
const tdClass = 'px-4 py-3 text-[var(--text-h)]'
const emptyClass = 'px-4 py-8 text-center text-[var(--text)]'

function formatDate(value) {
  if (!value) return '—'
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' })
}

function formatMoney(value) {
  return `$${parseFloat(value || 0).toFixed(2)}`
}

function PMInvoices({ token }) {
  const [invoices, setInvoices] = useState([])
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 0 })
  const [search, setSearch] = useState('')
  const [appliedSearch, setAppliedSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [detail, setDetail] = useState(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [downloading, setDownloading] = useState(null)

  const fetchInvoices = useCallback(
    async (page = 1) => {
      setLoading(true)
      setError('')
      try {
        const params = new URLSearchParams({ page, limit: 10 })
        if (appliedSearch) params.set('search', appliedSearch)
        if (statusFilter) params.set('status', statusFilter)
        const res = await fetch(`${INVOICES_API}?${params}`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        if (!res.ok) throw new Error('Failed to fetch invoices')
        const data = await res.json()
        setInvoices(data.invoices)
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
    fetchInvoices(1)
  }, [fetchInvoices])

  function handleSearch(e) {
    e.preventDefault()
    setAppliedSearch(search)
  }

  async function viewDetail(orderId) {
    setError('')
    setDetailLoading(true)
    try {
      const res = await fetch(`${INVOICES_API}/${orderId}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Could not load invoice')
      setDetail(data)
    } catch (err) {
      setError(err.message)
    } finally {
      setDetailLoading(false)
    }
  }

  async function downloadPdf(orderId, invoiceNumber) {
    setDownloading(orderId)
    setError('')
    try {
      const res = await fetch(`${INVOICES_API}/${orderId}/pdf`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) throw new Error('Failed to download invoice PDF')
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `Invoice_${invoiceNumber}.pdf`
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
    } catch (err) {
      setError(err.message)
    } finally {
      setDownloading(null)
    }
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
          <button type="submit" className={btnSearch}>
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
              <th className={thClass}>Invoice #</th>
              <th className={thClass}>Order</th>
              <th className={thClass}>Customer</th>
              <th className={thClass}>Total</th>
              <th className={thClass}>Status</th>
              <th className={thClass}>Issued</th>
              <th className={thClass}>Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border)]">
            {loading ? (
              <tr>
                <td colSpan="7" className={emptyClass}>
                  Loading…
                </td>
              </tr>
            ) : invoices.length === 0 ? (
              <tr>
                <td colSpan="7" className={emptyClass}>
                  No invoices found
                </td>
              </tr>
            ) : (
              invoices.map((inv) => {
                const isDownloading = downloading === inv.order_id
                return (
                  <tr key={inv.order_id} className="transition-colors hover:bg-[var(--card-bg)]/60">
                    <td className={`${tdClass} font-mono text-xs`}>{inv.invoice_number}</td>
                    <td className={tdClass}>#{inv.order_id}</td>
                    <td className={tdClass}>{inv.customer_email || '—'}</td>
                    <td className={tdClass}>{formatMoney(inv.total)}</td>
                    <td className={tdClass}>
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_BADGE_CLASS[inv.status] || 'bg-slate-500/10 text-slate-400'}`}
                      >
                        {inv.status}
                      </span>
                    </td>
                    <td className={tdClass}>{formatDate(inv.issued_at)}</td>
                    <td className={tdClass}>
                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          className="rounded-lg border border-[var(--border)] px-2.5 py-1 text-xs text-[var(--text-h)] transition-colors hover:border-purple-400 hover:text-purple-400"
                          onClick={() => viewDetail(inv.order_id)}
                        >
                          View
                        </button>
                        <button
                          type="button"
                          className={`${btnCreate} py-1 text-xs`}
                          disabled={isDownloading}
                          onClick={() => downloadPdf(inv.order_id, inv.invoice_number)}
                        >
                          {isDownloading ? 'Preparing…' : 'Download PDF'}
                        </button>
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
            onClick={() => fetchInvoices(pagination.page - 1)}
          >
            Previous
          </button>
          <span className="text-[var(--text)]">
            Page {pagination.page} of {pagination.totalPages} ({pagination.total} invoices)
          </span>
          <button
            type="button"
            className={btnBase}
            disabled={pagination.page >= pagination.totalPages}
            onClick={() => fetchInvoices(pagination.page + 1)}
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
            <div className="mb-4 flex items-start justify-between">
              <div>
                <h2 className="text-lg font-semibold text-[var(--text-h)]">
                  Invoice {detail.invoice?.number}
                </h2>
                <p className="text-xs text-[var(--text)] opacity-70">
                  Order #{detail.order?.id} · Issued {formatDate(detail.order?.created_at)}
                </p>
              </div>
              <span
                className={`inline-flex w-fit items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_BADGE_CLASS[detail.order?.status] || 'bg-slate-500/10 text-slate-400'}`}
              >
                {detail.order?.status}
              </span>
            </div>
            <div className="mb-4 grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1">
                <span className="text-xs font-medium tracking-wide text-[var(--text)] uppercase opacity-70">
                  Customer
                </span>
                <span className="text-sm text-[var(--text-h)]">
                  {detail.invoice?.customer_name}
                </span>
                <span className="text-xs text-[var(--text)]">{detail.invoice?.customer_email}</span>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-xs font-medium tracking-wide text-[var(--text)] uppercase opacity-70">
                  Billing Address
                </span>
                <span className="text-sm text-[var(--text-h)]">
                  {detail.invoice?.customer_address}
                </span>
              </div>
            </div>

            {detail.invoice?.items?.length > 0 && (
              <>
                <p className="mt-4 mb-2 font-medium text-[var(--text-h)]">
                  Items ({detail.invoice.items.length})
                </p>
                <div className={tableWrap}>
                  <table className={tableClass}>
                    <thead>
                      <tr>
                        <th className={thClass}>Description</th>
                        <th className={thClass}>Qty</th>
                        <th className={thClass}>Unit</th>
                        <th className={thClass}>Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--border)]">
                      {detail.invoice.items.map((item, i) => (
                        <tr key={i}>
                          <td className={tdClass}>{item.description}</td>
                          <td className={tdClass}>{item.quantity}</td>
                          <td className={tdClass}>{formatMoney(item.unit_price)}</td>
                          <td className={tdClass}>{formatMoney(item.total)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}

            <div className="mt-4 ml-auto flex w-full max-w-xs flex-col gap-1 text-sm">
              <div className="flex justify-between text-[var(--text)]">
                <span>Subtotal</span>
                <span>{formatMoney(detail.invoice?.subtotal)}</span>
              </div>
              <div className="flex justify-between text-[var(--text)]">
                <span>Tax ({Math.round((detail.invoice?.tax_rate ?? 0) * 100)}%)</span>
                <span>{formatMoney(detail.invoice?.tax_amount)}</span>
              </div>
              <div className="flex justify-between border-t border-[var(--border)] pt-1 font-semibold text-[var(--text-h)]">
                <span>Total</span>
                <span>{formatMoney(detail.invoice?.total)}</span>
              </div>
            </div>

            <div className="mt-5 flex justify-end gap-2">
              <button type="button" className={btnBase} onClick={() => setDetail(null)}>
                Close
              </button>
              <button
                type="button"
                className={btnCreate}
                disabled={downloading === detail.order?.id}
                onClick={() => downloadPdf(detail.order?.id, detail.invoice?.number)}
              >
                {downloading === detail.order?.id ? 'Preparing…' : 'Download PDF'}
              </button>
            </div>
          </div>
        </div>
      )}

      {detailLoading && !detail && (
        <p className="mt-3 text-xs text-[var(--text)] opacity-70">Loading invoice…</p>
      )}
    </div>
  )
}

export default PMInvoices
