import { Fragment, useState, useEffect, useCallback } from 'react'
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
  'bg-emerald-400/12 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-[var(--text)]'
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
  // For sizeless products
  const [draftStock, setDraftStock] = useState('')
  // For sized products: { [size]: stockString }
  const [draftSizeStocks, setDraftSizeStocks] = useState({})
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
    setError('')
    if (product.sizes && product.sizes.length > 0) {
      const initial = {}
      const sizeStocks = product.size_stocks || []
      for (const sz of product.sizes) {
        const found = sizeStocks.find((s) => s.size === sz)
        initial[sz] = String(found ? found.stock : 0)
      }
      setDraftSizeStocks(initial)
      setDraftStock('')
    } else {
      setDraftStock(String(product.total_stock ?? product.stock ?? 0))
      setDraftSizeStocks({})
    }
  }

  function cancelEdit() {
    setEditingId(null)
    setDraftStock('')
    setDraftSizeStocks({})
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
      setProducts((prev) =>
        prev.map((p) =>
          p.id === productId ? { ...p, stock: parsedStock, total_stock: parsedStock } : p
        )
      )
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  async function saveSizeStocks(productId) {
    setSaving(true)
    setError('')
    try {
      const stocks = {}
      for (const [size, val] of Object.entries(draftSizeStocks)) {
        const parsed = parseInt(val, 10)
        if (Number.isNaN(parsed) || parsed < 0) {
          setError(`Invalid stock value for size ${size}`)
          return
        }
        stocks[size] = parsed
      }
      const res = await fetch(`${API}/${productId}/size-stock`, {
        method: 'PUT',
        headers: authHeaders,
        body: JSON.stringify({ stocks }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to update stock')

      const newTotal = Object.values(stocks).reduce((s, v) => s + v, 0)
      setEditingId(null)
      setDraftSizeStocks({})
      setProducts((prev) =>
        prev.map((p) =>
          p.id === productId
            ? {
                ...p,
                total_stock: newTotal,
                size_stocks: data.size_stocks,
              }
            : p
        )
      )
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  const isSized = (p) => p.sizes && p.sizes.length > 0

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
          <button type="submit" className={btnSearch}>
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
                <Fragment key={p.id}>
                  <tr key={p.id} className="transition-colors hover:bg-[var(--card-bg)]/60">
                    <td className={tdClass}>{p.id}</td>
                    <td className={tdClass}>{p.name}</td>
                    <td className={tdClass}>{p.category || '—'}</td>
                    <td className={tdClass}>
                      {p.price != null ? `$${parseFloat(p.price).toFixed(2)}` : '—'}
                    </td>
                    <td className={tdClass}>
                      {editingId === p.id && !isSized(p) ? (
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            min="0"
                            className="w-20 rounded-md border border-[var(--border)] bg-[var(--bg)] px-2 py-1 text-sm text-[var(--text-h)] outline-none focus:border-emerald-400"
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
                          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${stockBadgeClass(p.total_stock ?? p.stock)}`}
                        >
                          {p.total_stock ?? p.stock}
                          {isSized(p) && <span className="ml-1 opacity-60">total</span>}
                        </span>
                      )}
                    </td>
                    <td className={tdClass}>
                      {editingId !== p.id && (
                        <button type="button" className={btnEdit} onClick={() => startEdit(p)}>
                          Edit Stock
                        </button>
                      )}
                      {editingId === p.id && isSized(p) && (
                        <button
                          type="button"
                          className={`${btnBase} px-2.5 py-1 text-xs`}
                          onClick={cancelEdit}
                        >
                          Cancel
                        </button>
                      )}
                    </td>
                  </tr>

                  {/* Per-size edit row */}
                  {editingId === p.id && isSized(p) && (
                    <tr key={`${p.id}-sizes`} className="bg-[var(--card-bg)]/40">
                      <td colSpan="6" className="px-4 py-3">
                        <div className="flex flex-wrap items-center gap-3">
                          {p.sizes.map((sz) => (
                            <div key={sz} className="flex items-center gap-1.5">
                              <span className="w-10 text-center text-xs font-semibold text-[var(--text)]">
                                {sz}
                              </span>
                              <input
                                type="number"
                                min="0"
                                className="w-16 rounded-md border border-[var(--border)] bg-[var(--bg)] px-2 py-1 text-sm text-[var(--text-h)] outline-none focus:border-emerald-400"
                                value={draftSizeStocks[sz] ?? '0'}
                                onChange={(e) =>
                                  setDraftSizeStocks((prev) => ({ ...prev, [sz]: e.target.value }))
                                }
                              />
                            </div>
                          ))}
                          <button
                            type="button"
                            className={`${btnCreate} px-3 py-1 text-xs`}
                            disabled={saving}
                            onClick={() => saveSizeStocks(p.id)}
                          >
                            {saving ? '…' : 'Save All'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
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
