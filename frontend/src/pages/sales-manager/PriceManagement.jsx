import { useState, useEffect, useCallback } from 'react'
import API_BASE from '../../api'
import { btnBase, btnEdit, fieldInputClass } from '../../styles/dashboardStyles'

const API = `${API_BASE}/api/sales-manager/products`

const tableWrap =
  'overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] shadow-[var(--shadow)] backdrop-blur-xl'
const tableClass = 'min-w-full divide-y divide-[var(--border)] text-left text-sm'
const thClass =
  'bg-emerald-400/12 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-[var(--text)]'
const tdClass = 'px-4 py-3 text-[var(--text-h)]'
const emptyClass = 'px-4 py-8 text-center text-[var(--text)]'

export default function PriceManagement({ token }) {
  const [products, setProducts] = useState([])
  const [pagination, setPagination] = useState({ page: 1, limit: 15, total: 0, totalPages: 0 })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [editingId, setEditingId] = useState(null)
  const [editingPrice, setEditingPrice] = useState('')
  const [editError, setEditError] = useState('')
  const [saving, setSaving] = useState(false)
  const [categories, setCategories] = useState([])
  const [filterCategory, setFilterCategory] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [searchQuery, setSearchQuery] = useState('')

  const fetchProducts = useCallback(
    async (page = 1, category = '', search = '') => {
      setLoading(true)
      setError('')
      try {
        const params = new URLSearchParams({ page, limit: 15 })
        if (category) params.set('category', category)
        if (search) params.set('q', search)
        const res = await fetch(`${API}?${params}`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        if (!res.ok) throw new Error('Failed to fetch products')
        const data = await res.json()
        setProducts(data.products)
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
    fetch(`${API}/categories`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data) setCategories(data.categories)
      })
      .catch(() => {})
  }, [token])

  useEffect(() => {
    const timer = setTimeout(() => setSearchQuery(searchInput), 300)
    return () => clearTimeout(timer)
  }, [searchInput])

  useEffect(() => {
    fetchProducts(1, filterCategory, searchQuery)
  }, [fetchProducts, filterCategory, searchQuery])

  function handleCategoryChange(e) {
    setFilterCategory(e.target.value)
  }

  function startEdit(product) {
    setEditingId(product.id)
    setEditingPrice(product.price != null ? String(parseFloat(product.price).toFixed(2)) : '')
    setEditError('')
  }

  function cancelEdit() {
    setEditingId(null)
    setEditingPrice('')
    setEditError('')
  }

  async function savePrice(productId) {
    const parsed = parseFloat(editingPrice)
    if (isNaN(parsed) || parsed <= 0) {
      setEditError('Price must be a positive number')
      return
    }

    setSaving(true)
    setEditError('')
    try {
      const res = await fetch(`${API}/${productId}/price`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ price: parsed }),
      })
      const data = await res.json()
      if (!res.ok) {
        setEditError(data.error || 'Failed to update price')
        return
      }
      setProducts((prev) =>
        prev.map((p) => (p.id === productId ? { ...p, price: data.product.price } : p))
      )
      setEditingId(null)
      setEditingPrice('')
    } catch {
      setEditError('Could not connect to server')
    } finally {
      setSaving(false)
    }
  }

  const unpricedProducts = products.filter((p) => p.price == null)
  const unpricedCount = unpricedProducts.length
  const unpricedLabel = (() => {
    const names = unpricedProducts.slice(0, 3).map((p) => `"${p.name}"`)
    const extra = unpricedCount - names.length
    return extra > 0 ? `${names.join(', ')} and ${extra} more` : names.join(', ')
  })()

  return (
    <div className="flex flex-col gap-6">
      {error && <p className="text-sm text-red-400">{error}</p>}

      {unpricedCount > 0 && (
        <div className="flex items-center gap-3 rounded-xl border border-amber-400/30 bg-amber-400/10 px-5 py-3.5">
          <span className="text-lg">⚠️</span>
          <p className="text-sm font-medium text-amber-300">
            {unpricedLabel} {unpricedCount > 1 ? 'are awaiting a price' : 'is awaiting a price'} —
            set a price to make {unpricedCount > 1 ? 'them' : 'it'} visible to customers.
          </p>
        </div>
      )}

      <div className="flex flex-wrap items-end gap-4 rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] p-5 shadow-[var(--shadow)] backdrop-blur-xl">
        <div className="flex flex-col gap-1.5">
          <label className="text-[11px] font-semibold tracking-[1px] text-[var(--text)] uppercase">
            Category
          </label>
          <select
            className={`${fieldInputClass} !w-44`}
            value={filterCategory}
            onChange={handleCategoryChange}
          >
            <option value="">All categories</option>
            {categories.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-[11px] font-semibold tracking-[1px] text-[var(--text)] uppercase">
            Search
          </label>
          <input
            type="text"
            placeholder="Search products…"
            className={`${fieldInputClass} !w-48`}
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
          />
        </div>
      </div>

      <div className={tableWrap}>
        <table className={tableClass}>
          <thead>
            <tr>
              <th className={thClass}>Name</th>
              <th className={thClass}>Category</th>
              <th className={thClass}>Price</th>
              <th className={thClass}>Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border)]">
            {loading ? (
              <tr>
                <td colSpan={4} className={emptyClass}>
                  Loading…
                </td>
              </tr>
            ) : products.length === 0 ? (
              <tr>
                <td colSpan={4} className={emptyClass}>
                  No products found
                </td>
              </tr>
            ) : (
              products.map((p) => (
                <tr key={p.id} className="transition-colors hover:bg-emerald-400/5">
                  <td className={tdClass}>{p.name}</td>
                  <td className={tdClass}>{p.category || '—'}</td>
                  <td className={tdClass}>
                    {editingId === p.id ? (
                      <div className="flex flex-col gap-1">
                        <input
                          type="number"
                          step="0.01"
                          min="0.01"
                          className={`${fieldInputClass} w-32`}
                          value={editingPrice}
                          onChange={(e) => setEditingPrice(e.target.value)}
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') savePrice(p.id)
                            if (e.key === 'Escape') cancelEdit()
                          }}
                        />
                        {editError && <p className="text-xs text-red-400">{editError}</p>}
                      </div>
                    ) : p.price != null ? (
                      `$${parseFloat(p.price).toFixed(2)}`
                    ) : (
                      <span className="rounded-full bg-amber-400/15 px-2 py-0.5 text-xs font-semibold text-amber-300">
                        Needs pricing
                      </span>
                    )}
                  </td>
                  <td className={tdClass}>
                    {editingId === p.id ? (
                      <div className="flex gap-1.5">
                        <button
                          type="button"
                          className={btnEdit}
                          onClick={() => savePrice(p.id)}
                          disabled={saving}
                        >
                          {saving ? 'Saving…' : 'Save'}
                        </button>
                        <button
                          type="button"
                          className={btnBase}
                          onClick={cancelEdit}
                          disabled={saving}
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button type="button" className={btnEdit} onClick={() => startEdit(p)}>
                        {p.price != null ? 'Edit Price' : 'Set Price'}
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
        <div className="mt-5 flex items-center justify-center gap-4">
          <button
            type="button"
            className={btnBase}
            disabled={pagination.page <= 1}
            onClick={() => fetchProducts(pagination.page - 1, filterCategory, searchQuery)}
          >
            Previous
          </button>
          <span className="text-[13px] text-[var(--text)]">
            Page {pagination.page} of {pagination.totalPages} ({pagination.total} products)
          </span>
          <button
            type="button"
            className={btnBase}
            disabled={pagination.page >= pagination.totalPages}
            onClick={() => fetchProducts(pagination.page + 1, filterCategory, searchQuery)}
          >
            Next
          </button>
        </div>
      )}
    </div>
  )
}
