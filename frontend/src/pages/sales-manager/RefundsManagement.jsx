import { useState, useEffect, useCallback } from 'react'
import API_BASE from '../../api'
import { btnEdit, btnDelete, fieldInputClass } from '../../styles/dashboardStyles'

const API = `${API_BASE}/api/sales-manager/refunds`

const tableWrap =
  'overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] shadow-[var(--shadow)] backdrop-blur-xl'
const tableClass = 'min-w-full divide-y divide-[var(--border)] text-left text-sm'
const thClass =
  'bg-emerald-400/12 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-[var(--text)]'
const tdClass = 'px-4 py-3 text-[var(--text-h)]'
const emptyClass = 'px-4 py-8 text-center text-[var(--text)]'

const STATUS_LABELS = { pending: 'Pending', approved: 'Approved', rejected: 'Rejected' }
const STATUS_STYLES = {
  pending: 'bg-amber-400/15 text-amber-400 border border-amber-400/30',
  approved: 'bg-emerald-400/15 text-emerald-400 border border-emerald-400/30',
  rejected: 'bg-red-400/15 text-red-400 border border-red-400/30',
}

export default function RefundsManagement({ token }) {
  const [refunds, setRefunds] = useState([])
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 0 })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [statusFilter, setStatusFilter] = useState('pending')
  const [acting, setActing] = useState(null)

  const fetchRefunds = useCallback(
    async (page = 1, status = 'pending') => {
      setLoading(true)
      setError('')
      try {
        const params = new URLSearchParams({ page, limit: 20, status })
        const res = await fetch(`${API}?${params}`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        if (!res.ok) throw new Error('Failed to fetch refund requests')
        const data = await res.json()
        setRefunds(data.refunds)
        setPagination(data.pagination)
      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    },
    [token]
  )

  useEffect(() => {
    fetchRefunds(1, statusFilter)
  }, [fetchRefunds, statusFilter])

  async function handleAction(id, action) {
    setActing(id)
    setError('')
    setSuccess('')
    try {
      const res = await fetch(`${API}/${id}/${action}`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || `Failed to ${action} refund`)
      setSuccess(
        action === 'approve'
          ? `Refund #${id} approved — stock restored and credit issued.`
          : `Refund #${id} rejected.`
      )
      fetchRefunds(pagination.page, statusFilter)
    } catch (err) {
      setError(err.message)
    } finally {
      setActing(null)
    }
  }

  function formatDate(iso) {
    return new Date(iso).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-[var(--text-h)]">Refund Requests</h2>
        <div className="flex items-center gap-3">
          <select
            className={fieldInputClass + ' w-40'}
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
            <option value="all">All</option>
          </select>
        </div>
      </div>

      {error && (
        <p className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-2.5 text-sm text-red-400">
          {error}
        </p>
      )}
      {success && (
        <p className="rounded-xl border border-emerald-400/30 bg-emerald-400/10 px-4 py-2.5 text-sm text-emerald-400">
          {success}
        </p>
      )}

      <div className={tableWrap}>
        <div className="overflow-x-auto">
          <table className={tableClass}>
            <thead>
              <tr>
                <th className={thClass}>Customer</th>
                <th className={thClass}>Product</th>
                <th className={thClass}>Order Date</th>
                <th className={thClass}>Qty</th>
                <th className={thClass}>Amount</th>
                <th className={thClass}>Requested</th>
                <th className={thClass}>Status</th>
                <th className={thClass}>Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {loading ? (
                <tr>
                  <td colSpan={8} className={emptyClass}>
                    Loading…
                  </td>
                </tr>
              ) : refunds.length === 0 ? (
                <tr>
                  <td colSpan={8} className={emptyClass}>
                    No refund requests found.
                  </td>
                </tr>
              ) : (
                refunds.map((r) => (
                  <tr key={r.id} className="transition-colors hover:bg-emerald-400/5">
                    <td className={tdClass}>{r.customer_name}</td>
                    <td className={tdClass}>{r.product_name}</td>
                    <td className={tdClass}>{formatDate(r.purchase_date)}</td>
                    <td className={tdClass}>{r.quantity}</td>
                    <td className={tdClass}>${parseFloat(r.refund_amount).toFixed(2)}</td>
                    <td className={tdClass}>{formatDate(r.requested_at)}</td>
                    <td className={tdClass}>
                      <span
                        className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_STYLES[r.status]}`}
                      >
                        {STATUS_LABELS[r.status]}
                      </span>
                    </td>
                    <td className={tdClass}>
                      {r.status === 'pending' ? (
                        <div className="flex gap-2">
                          <button
                            className={btnEdit}
                            disabled={acting === r.id}
                            onClick={() => handleAction(r.id, 'approve')}
                          >
                            Approve
                          </button>
                          <button
                            className={btnDelete}
                            disabled={acting === r.id}
                            onClick={() => handleAction(r.id, 'reject')}
                          >
                            Reject
                          </button>
                        </div>
                      ) : (
                        <span className="text-xs text-[var(--text)]">—</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-[var(--text)]">
          <span>
            {pagination.total} request{pagination.total !== 1 ? 's' : ''}
          </span>
          <div className="flex gap-2">
            <button
              className={btnEdit}
              disabled={pagination.page <= 1}
              onClick={() => fetchRefunds(pagination.page - 1, statusFilter)}
            >
              Previous
            </button>
            <span className="px-2 py-1">
              {pagination.page} / {pagination.totalPages}
            </span>
            <button
              className={btnEdit}
              disabled={pagination.page >= pagination.totalPages}
              onClick={() => fetchRefunds(pagination.page + 1, statusFilter)}
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
