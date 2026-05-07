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

export default function DiscountManagement({ token }) {
  const [products, setProducts] = useState([])
  const [pagination, setPagination] = useState({ page: 1, limit: 15, total: 0, totalPages: 0 })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [selectedIds, setSelectedIds] = useState(new Set())
  const [discountPercent, setDiscountPercent] = useState('')
  const [applying, setApplying] = useState(false)
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

  // Debounce search input — wait 300 ms after the user stops typing
  useEffect(() => {
    const timer = setTimeout(() => setSearchQuery(searchInput), 300)
    return () => clearTimeout(timer)
  }, [searchInput])

  // Fetch whenever the committed search query or category changes
  useEffect(() => {
    fetchProducts(1, filterCategory, searchQuery)
  }, [fetchProducts, filterCategory, searchQuery])

  function handleCategoryChange(e) {
    setFilterCategory(e.target.value)
  }

  function toggleSelect(id) {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function toggleAll() {
    const allOnPage = products.every((p) => selectedIds.has(p.id))
    if (allOnPage) {
      setSelectedIds((prev) => {
        const next = new Set(prev)
        products.forEach((p) => next.delete(p.id))
        return next
      })
    } else {
      setSelectedIds((prev) => {
        const next = new Set(prev)
        products.forEach((p) => next.add(p.id))
        return next
      })
    }
  }

  function previewPrice(price) {
    const pct = parseInt(discountPercent, 10)
    if (isNaN(pct) || pct < 1 || pct > 100) return null
    return (parseFloat(price) * (1 - pct / 100)).toFixed(2)
  }

  async function applyDiscount() {
    const pct = parseInt(discountPercent, 10)
    if (isNaN(pct) || pct < 1 || pct > 100) {
      setError('Discount must be between 1 and 100%')
      return
    }
    if (selectedIds.size === 0) {
      setError('Select at least one product')
      return
    }
    setApplying(true)
    setError('')
    setSuccess('')
    try {
      const res = await fetch(`${API_BASE}/api/sales-manager/products/discount`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ productIds: [...selectedIds], discountPercent: pct }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Failed to apply discount')
        return
      }
      setSuccess(
        `Discount applied to ${data.updated} product(s). ${data.notified} customer(s) notified.`
      )
      setDiscountPercent('')
      setSelectedIds(new Set())
      await fetchProducts(pagination.page, filterCategory, searchQuery)
    } catch {
      setError('Could not connect to server')
    } finally {
      setApplying(false)
    }
  }

  async function removeDiscount(productId) {
    setError('')
    setSuccess('')
    try {
      const res = await fetch(`${API_BASE}/api/sales-manager/products/${productId}/discount`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) {
        const data = await res.json()
        setError(data.error || 'Failed to remove discount')
        return
      }
      await fetchProducts(pagination.page, filterCategory, searchQuery)
    } catch {
      setError('Could not connect to server')
    }
  }

  const allSelected = products.length > 0 && products.every((p) => selectedIds.has(p.id))

  return (
    <div className="flex flex-col gap-6">
      {/* Controls */}
      <div className="flex flex-wrap items-end gap-4 rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] p-5 shadow-[var(--shadow)] backdrop-blur-xl">
        <div className="flex flex-col gap-1.5">
          <label className="text-[11px] font-semibold tracking-[1px] text-[var(--text)] uppercase">
            Discount %
          </label>
          <input
            type="number"
            min="1"
            max="100"
            step="1"
            placeholder="e.g. 20"
            className={`${fieldInputClass} !w-36`}
            value={discountPercent}
            onChange={(e) => setDiscountPercent(e.target.value)}
          />
        </div>

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

        <div className="flex flex-col gap-1">
          <span className="text-[11px] text-[var(--text)] opacity-50">
            {selectedIds.size === 0
              ? 'No products selected'
              : `${selectedIds.size} product(s) selected`}
          </span>
          <button
            type="button"
            className={btnEdit}
            onClick={applyDiscount}
            disabled={applying || selectedIds.size === 0}
          >
            {applying ? 'Applying…' : 'Apply Discount'}
          </button>
        </div>

        {success && <p className="text-sm text-green-400">{success}</p>}
        {error && <p className="text-sm text-red-400">{error}</p>}
      </div>

      {/* Table */}
      <div className={tableWrap}>
        <table className={tableClass}>
          <thead>
            <tr>
              <th className={`${thClass} w-10`}>
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={toggleAll}
                  className="accent-emerald-400"
                  aria-label="Select all on this page"
                />
              </th>
              <th className={thClass}>Name</th>
              <th className={thClass}>Category</th>
              <th className={thClass}>Price</th>
              <th className={thClass}>Discount</th>
              <th className={thClass}>Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border)]">
            {loading ? (
              <tr>
                <td colSpan={6} className={emptyClass}>
                  Loading…
                </td>
              </tr>
            ) : products.length === 0 ? (
              <tr>
                <td colSpan={6} className={emptyClass}>
                  No products found
                </td>
              </tr>
            ) : (
              products.map((p) => {
                const preview = previewPrice(p.price)
                const isSelected = selectedIds.has(p.id)
                return (
                  <tr
                    key={p.id}
                    className={`transition-colors hover:bg-emerald-400/5 ${isSelected ? 'bg-emerald-400/8' : ''}`}
                  >
                    <td className={tdClass}>
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleSelect(p.id)}
                        className="accent-emerald-400"
                        aria-label={`Select ${p.name}`}
                      />
                    </td>
                    <td className={`${tdClass} font-medium`}>{p.name}</td>
                    <td className={tdClass}>{p.category || '—'}</td>
                    <td className={tdClass}>
                      <div className="flex flex-col gap-0.5">
                        <span
                          className={
                            p.discount_percent != null
                              ? 'text-[var(--text)] line-through opacity-60'
                              : ''
                          }
                        >
                          ${parseFloat(p.price).toFixed(2)}
                        </span>
                        {p.discount_percent != null && (
                          <span className="text-[13px] font-semibold text-green-400">
                            ${parseFloat(p.discounted_price).toFixed(2)}
                          </span>
                        )}
                        {preview != null && !p.discount_percent && isSelected && (
                          <span className="text-[11px] text-emerald-400 opacity-70">
                            → ${preview}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className={tdClass}>
                      {p.discount_percent != null ? (
                        <span className="rounded-full bg-green-400/15 px-2 py-0.5 text-[11px] font-semibold text-green-400">
                          -{p.discount_percent}%
                        </span>
                      ) : (
                        <span className="text-[12px] text-[var(--text)] opacity-40">None</span>
                      )}
                    </td>
                    <td className={tdClass}>
                      {p.discount_percent != null && (
                        <button
                          type="button"
                          className={btnBase}
                          onClick={() => removeDiscount(p.id)}
                        >
                          Remove
                        </button>
                      )}
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>

      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-center gap-4">
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
