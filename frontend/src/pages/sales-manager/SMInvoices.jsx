import { useState, useCallback, useEffect } from 'react'
import API_BASE from '../../api'
import { btnBase, btnCreate, btnEdit, fieldInputClass } from '../../styles/dashboardStyles'

function todayStr() {
  return new Date().toISOString().slice(0, 10)
}

function firstOfMonthStr() {
  const now = new Date()
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString().slice(0, 10)
}

function statusBadge(status) {
  const colours = {
    pending: 'bg-yellow-500/15 text-yellow-400',
    processing: 'bg-blue-500/15 text-blue-400',
    shipped: 'bg-purple-500/15 text-purple-400',
    delivered: 'bg-green-500/15 text-green-400',
    cancelled: 'bg-red-500/15 text-red-400',
  }
  return (
    <span
      className={`inline-block rounded-full px-2 py-0.5 text-[11px] font-medium capitalize ${colours[status] ?? 'bg-gray-500/15 text-gray-400'}`}
    >
      {status}
    </span>
  )
}

async function triggerPdfDownload(url, filename, token) {
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } })
  if (!res.ok) throw new Error('Download failed')
  const blob = await res.blob()
  const objectUrl = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = objectUrl
  a.download = filename
  a.click()
  // Revoke after a short delay so the browser has time to start reading the blob
  setTimeout(() => URL.revokeObjectURL(objectUrl), 1000)
}

export default function SMInvoices({ token }) {
  const [invoices, setInvoices] = useState([])
  const [pagination, setPagination] = useState({ page: 1, limit: 15, total: 0, totalPages: 1 })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const [startDate, setStartDate] = useState(firstOfMonthStr)
  const [endDate, setEndDate] = useState(todayStr)
  const [appliedStart, setAppliedStart] = useState(firstOfMonthStr)
  const [appliedEnd, setAppliedEnd] = useState(todayStr)

  const [detail, setDetail] = useState(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [downloading, setDownloading] = useState(null)
  const [exporting, setExporting] = useState(false)

  const fetchInvoices = useCallback(
    async (page = 1) => {
      setLoading(true)
      setError(null)
      try {
        const params = new URLSearchParams({
          startDate: appliedStart,
          endDate: appliedEnd,
          page,
          limit: 15,
        })
        const res = await fetch(`${API_BASE}/api/sales-manager/invoices?${params}`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        if (!res.ok) throw new Error('Failed to load invoices')
        const data = await res.json()
        setInvoices(data.invoices)
        setPagination(data.pagination)
      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    },
    [token, appliedStart, appliedEnd]
  )

  useEffect(() => {
    fetchInvoices(1)
  }, [fetchInvoices])

  function handleFilter(e) {
    e.preventDefault()
    setAppliedStart(startDate)
    setAppliedEnd(endDate)
  }

  async function viewDetail(orderId) {
    setDetailLoading(true)
    setDetail(null)
    try {
      const res = await fetch(`${API_BASE}/api/sales-manager/invoices/${orderId}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) throw new Error('Failed to load invoice')
      const data = await res.json()
      setDetail(data)
    } catch (err) {
      setError(err.message)
    } finally {
      setDetailLoading(false)
    }
  }

  async function downloadPdf(orderId, invoiceNumber) {
    setDownloading(orderId)
    try {
      await triggerPdfDownload(
        `${API_BASE}/api/sales-manager/invoices/${orderId}/pdf`,
        `Invoice_${invoiceNumber}.pdf`,
        token
      )
    } catch {
      setError('PDF download failed')
    } finally {
      setDownloading(null)
    }
  }

  async function exportAll() {
    setExporting(true)
    try {
      const params = new URLSearchParams({ startDate: appliedStart, endDate: appliedEnd })
      await triggerPdfDownload(
        `${API_BASE}/api/sales-manager/invoices/export/pdf?${params}`,
        `Invoices_${appliedStart}_to_${appliedEnd}.pdf`,
        token
      )
    } catch {
      setError('Export failed')
    } finally {
      setExporting(false)
    }
  }

  return (
    <div className="flex flex-col gap-5">
      {/* Date range controls */}
      <form
        onSubmit={handleFilter}
        className="flex flex-wrap items-end gap-3 rounded-xl border border-[var(--border)] bg-[var(--card-bg)] p-4"
      >
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-[var(--text)]">Start date</label>
          <input
            type="date"
            value={startDate}
            max={endDate}
            onChange={(e) => setStartDate(e.target.value)}
            className={fieldInputClass + ' w-40'}
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-[var(--text)]">End date</label>
          <input
            type="date"
            value={endDate}
            min={startDate}
            onChange={(e) => setEndDate(e.target.value)}
            className={fieldInputClass + ' w-40'}
          />
        </div>
        <button type="submit" className={btnCreate}>
          Filter
        </button>
        <button
          type="button"
          onClick={exportAll}
          disabled={exporting || invoices.length === 0}
          className={btnBase}
        >
          {exporting ? 'Exporting…' : 'Export All PDF'}
        </button>
        <span className="ml-auto self-center text-xs text-[var(--text)]">
          {pagination.total} invoice{pagination.total !== 1 ? 's' : ''} found
        </span>
      </form>

      {error && <p className="px-1 text-sm text-red-400">{error}</p>}

      {/* Invoice table */}
      <div className="overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--card-bg)]">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-[var(--border)] text-xs font-semibold tracking-wide text-[var(--text)] uppercase">
              <th className="px-4 py-3 text-left">Invoice #</th>
              <th className="px-4 py-3 text-left">Customer</th>
              <th className="px-4 py-3 text-left">Order date</th>
              <th className="px-4 py-3 text-right">Items</th>
              <th className="px-4 py-3 text-right">Total</th>
              <th className="px-4 py-3 text-center">Status</th>
              <th className="px-4 py-3 text-center">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-[var(--text)]">
                  Loading…
                </td>
              </tr>
            )}
            {!loading && invoices.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-[var(--text)]">
                  No invoices found for this date range.
                </td>
              </tr>
            )}
            {!loading &&
              invoices.map((inv) => (
                <tr
                  key={inv.order_id}
                  className="border-b border-[var(--border)] transition-colors last:border-0 hover:bg-[var(--bg)]"
                >
                  <td className="px-4 py-3 font-mono text-xs text-[var(--text-h)]">
                    {inv.invoice_number}
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-medium text-[var(--text-h)]">{inv.customer_name}</div>
                    <div className="text-xs text-[var(--text)]">{inv.customer_email}</div>
                  </td>
                  <td className="px-4 py-3 text-[var(--text)]">
                    {new Date(inv.order_date).toLocaleDateString('en-US', { timeZone: 'UTC' })}
                  </td>
                  <td className="px-4 py-3 text-right text-[var(--text)]">{inv.item_count}</td>
                  <td className="px-4 py-3 text-right font-medium text-[var(--text-h)]">
                    ${inv.total.toFixed(2)}
                  </td>
                  <td className="px-4 py-3 text-center">{statusBadge(inv.status)}</td>
                  <td className="px-4 py-3">
                    <div className="flex justify-center gap-2">
                      <button className={btnEdit} onClick={() => viewDetail(inv.order_id)}>
                        View
                      </button>
                      <button
                        className={btnEdit}
                        disabled={downloading === inv.order_id}
                        onClick={() => downloadPdf(inv.order_id, inv.invoice_number)}
                      >
                        {downloading === inv.order_id ? '…' : 'PDF'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-center gap-3">
          <button
            className={btnBase}
            disabled={pagination.page <= 1 || loading}
            onClick={() => fetchInvoices(pagination.page - 1)}
          >
            Previous
          </button>
          <span className="text-sm text-[var(--text)]">
            Page {pagination.page} of {pagination.totalPages}
          </span>
          <button
            className={btnBase}
            disabled={pagination.page >= pagination.totalPages || loading}
            onClick={() => fetchInvoices(pagination.page + 1)}
          >
            Next
          </button>
        </div>
      )}

      {/* Detail modal */}
      {(detailLoading || detail) && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
          onClick={() => {
            if (!detailLoading) setDetail(null)
          }}
        >
          <div
            className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl border border-[var(--border)] bg-[var(--card-bg)] p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            {detailLoading && (
              <p className="py-8 text-center text-[var(--text)]">Loading invoice…</p>
            )}
            {detail && (
              <>
                <div className="mb-4 flex items-start justify-between">
                  <div>
                    <h2 className="text-lg font-bold text-[var(--text-h)]">
                      {detail.invoice.number}
                    </h2>
                    <p className="text-xs text-[var(--text)]">Order #{detail.order.id}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {statusBadge(detail.order.status)}
                    <span className="text-xs text-[var(--text)]">
                      {new Date(detail.order.created_at).toLocaleDateString('en-US', {
                        timeZone: 'UTC',
                      })}
                    </span>
                  </div>
                </div>

                <div className="mb-4 text-sm text-[var(--text)]">
                  <p className="font-semibold text-[var(--text-h)]">
                    {detail.invoice.customer_name}
                  </p>
                  <p>{detail.invoice.customer_email}</p>
                  {detail.invoice.customer_address && <p>{detail.invoice.customer_address}</p>}
                </div>

                <table className="mb-4 w-full border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-[var(--border)] text-xs font-semibold text-[var(--text)] uppercase">
                      <th className="py-2 text-left">Item</th>
                      <th className="py-2 text-right">Qty</th>
                      <th className="py-2 text-right">Unit price</th>
                      <th className="py-2 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {detail.invoice.items.map((item, i) => (
                      <tr key={i} className="border-b border-[var(--border)] last:border-0">
                        <td className="py-2 text-[var(--text-h)]">{item.description}</td>
                        <td className="py-2 text-right text-[var(--text)]">{item.quantity}</td>
                        <td className="py-2 text-right text-[var(--text)]">
                          ${item.unit_price.toFixed(2)}
                        </td>
                        <td className="py-2 text-right font-medium text-[var(--text-h)]">
                          ${item.total.toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                <div className="space-y-1 border-t border-[var(--border)] pt-3 text-right text-sm">
                  <p className="text-[var(--text)]">
                    Subtotal:{' '}
                    <span className="font-medium text-[var(--text-h)]">
                      ${detail.invoice.subtotal.toFixed(2)}
                    </span>
                  </p>
                  <p className="text-[var(--text)]">
                    Tax (20%):{' '}
                    <span className="font-medium text-[var(--text-h)]">
                      ${detail.invoice.tax_amount.toFixed(2)}
                    </span>
                  </p>
                  <p className="text-base font-bold text-[var(--text-h)]">
                    Total: ${detail.invoice.total.toFixed(2)}
                  </p>
                </div>

                <div className="mt-5 flex justify-end gap-3">
                  <button className={btnBase} onClick={() => setDetail(null)}>
                    Close
                  </button>
                  <button
                    className={btnCreate}
                    disabled={downloading === detail.order.id}
                    onClick={() => downloadPdf(detail.order.id, detail.invoice.number)}
                  >
                    {downloading === detail.order.id ? 'Downloading…' : 'Download PDF'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
