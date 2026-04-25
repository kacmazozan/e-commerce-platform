import { useState, useEffect, useCallback } from 'react'
import API_BASE from '../../api'
import {
  btnBase,
  btnCreate,
  btnSearch,
  btnEdit,
  fieldInputClass,
} from '../../styles/dashboardStyles'

const API = `${API_BASE}/api/product-manager/products`

const tableWrap =
  'overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] shadow-[var(--shadow)] backdrop-blur-xl'
const tableClass = 'min-w-full divide-y divide-[var(--border)] text-left text-sm'
const thClass =
  'bg-purple-400/12 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-[var(--text)]'
const tdClass = 'px-4 py-3 text-[var(--text-h)]'
const emptyClass = 'px-4 py-8 text-center text-[var(--text)]'

function stockBadgeClass(stock) {
  const n = parseInt(stock)
  if (n === 0) return 'bg-red-500/10 text-red-400 border-0'
  if (n < 10) return 'bg-amber-500/10 text-amber-400 border-0'
  return 'bg-emerald-500/10 text-emerald-400 border-0'
}

function PMInventory({ token }) {
  const [products, setProducts] = useState([])
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 0 })
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [editingId, setEditingId] = useState(null)
  const [draftStock, setDraftStock] = useState('')
  const [saving, setSaving] = useState(false)

  const authHeaders = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }

  const fetchProducts = useCallback(
    async (page = 1) => {
      setLoading(true)
      setError('')
      try {
        const params = new URLSearchParams({ page, limit: 20 })
        if (search) params.set('search', search)
        const res = await fetch(`${API}?${params}`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        if (!res.ok) throw new Error('Failed to fetch inventory')
        const data = await res.json()
        setProducts(data.products)
        setPagination(data.pagination)
      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    },
    [token, search]
  )

  useEffect(() => {
    fetchProducts(1)
  }, [fetchProducts])

  function handleSearch(e) {
    e.preventDefault()
    fetchProducts(1)
  }

  function startEdit(product) {
    setEditingId(product.id)
    setDraftStock(String(product.stock))
  }

  function cancelEdit() {
    setEditingId(null)
    setDraftStock('')
  }

  async function saveStock(productId) {
    setSaving(true)
    setError('')
    try {
      const parsedStock = parseInt(draftStock, 10)
      if (Number.isNaN(parsedStock) || parsedStock < 0) {
        setError('Stock must be a non-negative integer')
        return
      }
      const res = await fetch(`${API}/${productId}`, {
        method: 'PUT',
        headers: authHeaders,
        body: JSON.stringify({ stock: parsedStock }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to update stock')
      setEditingId(null)
      setDraftStock('')
      // update local state without full refetch for snappy UX
      setProducts((prev) =>
        prev.map((p) => (p.id === productId ? { ...p, stock: parsedStock } : p))
      )
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <form className="flex min-w-0 flex-1 gap-2" onSubmit={handleSearch}>
          <input
            type="text"
            className={`${fieldInputClass} min-w-[140px] flex-1`}
            placeholder="Search by name…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <button type="button" type="submit" className={btnSearch}>
            Search
          </button>
        </form>
      </div>

      {error && <p className="mb-4 text-sm text-red-400">{error}</p>}

      <div className={tableWrap}>
        <table className={tableClass}>
          <thead>
            <tr>
              <th className={thClass}>ID</th>
              <th className={thClass}>Name</th>
              <th className={thClass}>Category</th>
              <th className={thClass}>Price</th>
              <th className={thClass}>Stock</th>
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
            ) : products.length === 0 ? (
              <tr>
                <td colSpan="6" className={emptyClass}>
                  No products found
                </td>
              </tr>
            ) : (
              products.map((p) => (
                <tr key={p.id} className="transition-colors hover:bg-[var(--card-bg)]/60">
                  <td className={tdClass}>{p.id}</td>
                  <td className={tdClass}>{p.name}</td>
                  <td className={tdClass}>{p.category || '—'}</td>
                  <td className={tdClass}>${parseFloat(p.price).toFixed(2)}</td>
                  <td className={tdClass}>
                    {editingId === p.id ? (
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          min="0"
                          className="w-20 rounded-md border border-[var(--border)] bg-[var(--bg)] px-2 py-1 text-sm text-[var(--text-h)] outline-none focus:border-purple-400"
                          value={draftStock}
                          onChange={(e) => setDraftStock(e.target.value)}
                          autoFocus
                        />
                        <button
                          type="button"
                          className={`${btnCreate} px-2.5 py-1 text-xs`}
                          disabled={saving}
                          onClick={() => saveStock(p.id)}
                        >
                          {saving ? '…' : 'Save'}
                        </button>
                        <button
                          type="button"
                          className={`${btnBase} px-2.5 py-1 text-xs`}
                          onClick={cancelEdit}
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${stockBadgeClass(p.stock)}`}
                      >
                        {p.stock}
                      </span>
                    )}
                  </td>
                  <td className={tdClass}>
                    {editingId !== p.id && (
                      <button type="button" className={btnEdit} onClick={() => startEdit(p)}>
                        Edit Stock
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
            onClick={() => fetchProducts(pagination.page - 1)}
          >
            Previous
          </button>
          <span className="text-[var(--text)]">
            Page {pagination.page} of {pagination.totalPages} ({pagination.total} products)
          </span>
          <button
            type="button"
            className={btnBase}
            disabled={pagination.page >= pagination.totalPages}
            onClick={() => fetchProducts(pagination.page + 1)}
          >
            Next
          </button>
        </div>
      )}
    </div>
  )
}

export default PMInventory
