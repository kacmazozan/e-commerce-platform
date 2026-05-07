import { useState, useEffect, useCallback } from 'react'
import API_BASE from '../../api'
import { btnBase, fieldInputClass } from '../../styles/dashboardStyles'

const API = `${API_BASE}/api/product-manager/comments`

const STATUS_BADGE_CLASS = {
  pending: 'bg-amber-500/10 text-amber-400',
  approved: 'bg-emerald-500/10 text-emerald-400',
  rejected: 'bg-red-500/10 text-red-400',
}

const btnApprove =
  'font-[inherit] text-[12px] font-medium px-3 py-1 border border-emerald-500/30 rounded-[10px] bg-emerald-500/10 text-emerald-400 cursor-pointer transition-all duration-150 hover:bg-emerald-500/20 hover:border-emerald-500 disabled:opacity-45 disabled:cursor-not-allowed'
const btnReject =
  'font-[inherit] text-[12px] font-medium px-3 py-1 border border-red-500/20 rounded-[10px] bg-red-500/10 text-red-400 cursor-pointer transition-all duration-150 hover:bg-red-500/20 hover:border-red-500 disabled:opacity-45 disabled:cursor-not-allowed'

const tableWrap =
  'overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] shadow-[var(--shadow)] backdrop-blur-xl'
const tableClass = 'min-w-full divide-y divide-[var(--border)] text-left text-sm'
const thClass =
  'bg-emerald-400/12 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-[var(--text)]'
const tdClass = 'px-4 py-3 text-[var(--text-h)]'
const emptyClass = 'px-4 py-8 text-center text-[var(--text)]'

function PMComments({ token }) {
  const [comments, setComments] = useState([])
  const [pagination, setPagination] = useState({ page: 1, limit: 15, total: 0, totalPages: 0 })
  const [statusFilter, setStatusFilter] = useState('pending')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [actionPending, setActionPending] = useState(null)

  const fetchComments = useCallback(
    async (page = 1) => {
      setLoading(true)
      setError('')
      try {
        const params = new URLSearchParams({ page, limit: 15 })
        if (statusFilter) params.set('status', statusFilter)
        const res = await fetch(`${API}?${params}`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        if (!res.ok) throw new Error('Failed to fetch comments')
        const data = await res.json()
        setComments(data.comments || [])
        setPagination(data.pagination || { page: 1, limit: 15, total: 0, totalPages: 0 })
      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    },
    [token, statusFilter]
  )

  useEffect(() => {
    fetchComments(1)
  }, [fetchComments])

  async function handleModerate(id, action) {
    setActionPending(id)
    setError('')
    try {
      const res = await fetch(`${API}/${id}/${action}`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || `Failed to ${action} comment`)
      }
      // optimistic removal from pending queue; full refresh otherwise
      if (statusFilter === 'pending') {
        setComments((prev) => prev.filter((c) => c.id !== id))
      } else {
        fetchComments(pagination.page)
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setActionPending(null)
    }
  }

  function truncate(text, max = 80) {
    if (!text) return '—'
    return text.length > max ? text.slice(0, max) + '…' : text
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-end gap-3">
        <select
          className={fieldInputClass}
          style={{ width: 'auto' }}
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
          <option value="">All</option>
        </select>
      </div>

      {error && <p className="mb-4 text-sm text-red-400">{error}</p>}

      <div className={tableWrap}>
        <table className={tableClass}>
          <thead>
            <tr>
              <th className={thClass}>ID</th>
              <th className={thClass}>Product</th>
              <th className={thClass}>Customer</th>
              <th className={thClass}>Rating</th>
              <th className={thClass}>Comment</th>
              <th className={thClass}>Status</th>
              <th className={thClass}>Date</th>
              <th className={thClass}>Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border)]">
            {loading ? (
              <tr>
                <td colSpan="8" className={emptyClass}>
                  Loading…
                </td>
              </tr>
            ) : comments.length === 0 ? (
              <tr>
                <td colSpan="8" className={emptyClass}>
                  No comments found
                </td>
              </tr>
            ) : (
              comments.map((c) => (
                <tr key={c.id} className="transition-colors hover:bg-[var(--card-bg)]/60">
                  <td className={tdClass}>{c.id}</td>
                  <td className={tdClass}>{c.product_name || '—'}</td>
                  <td className={tdClass}>
                    {c.customer_email || c.user_email || '—'}
                    {c.anonymous && (
                      <span className="ml-1.5 rounded-full bg-slate-500/15 px-1.5 py-0.5 text-[10px] font-semibold text-slate-400">
                        anon
                      </span>
                    )}
                  </td>
                  <td className={tdClass}>{c.rating != null ? `${c.rating}/5` : '—'}</td>
                  <td className={`${tdClass} max-w-[200px]`}>
                    {truncate(c.content || c.comment || c.text)}
                  </td>
                  <td className={tdClass}>
                    <span
                      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_BADGE_CLASS[c.status] || 'bg-slate-500/10 text-slate-400'}`}
                    >
                      {c.status}
                    </span>
                  </td>
                  <td className={tdClass}>{new Date(c.created_at).toLocaleDateString()}</td>
                  <td className={`${tdClass} flex gap-2`}>
                    {c.status !== 'approved' && (
                      <button
                        type="button"
                        className={btnApprove}
                        disabled={actionPending === c.id}
                        onClick={() => handleModerate(c.id, 'approve')}
                      >
                        {actionPending === c.id ? '…' : 'Approve'}
                      </button>
                    )}
                    {c.status !== 'rejected' && (
                      <button
                        type="button"
                        className={btnReject}
                        disabled={actionPending === c.id}
                        onClick={() => handleModerate(c.id, 'reject')}
                      >
                        {actionPending === c.id ? '…' : 'Reject'}
                      </button>
                    )}
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
            onClick={() => fetchComments(pagination.page - 1)}
          >
            Previous
          </button>
          <span className="text-[var(--text)]">
            Page {pagination.page} of {pagination.totalPages} ({pagination.total} comments)
          </span>
          <button
            type="button"
            className={btnBase}
            disabled={pagination.page >= pagination.totalPages}
            onClick={() => fetchComments(pagination.page + 1)}
          >
            Next
          </button>
        </div>
      )}
    </div>
  )
}

export default PMComments
