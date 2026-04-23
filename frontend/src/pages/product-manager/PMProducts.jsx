import { useState, useEffect, useCallback } from 'react'
import API_BASE from '../../api'
import {
  btnBase,
  btnCreate,
  btnSearch,
  btnEdit,
  btnDelete,
  btnDanger,
  fieldInputClass,
} from '../../styles/dashboardStyles'

const API = `${API_BASE}/api/product-manager/products`
const CATS_API = `${API_BASE}/api/product-manager/categories`

/* ── shared table class strings ── */
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

function PMProducts({ token }) {
  const [products, setProducts] = useState([])
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 0 })
  const [search, setSearch] = useState('')
  const [sort, setSort] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [modal, setModal] = useState(null)
  const [deleteConfirm, setDeleteConfirm] = useState(null)
  const [categories, setCategories] = useState([])

  const authHeaders = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }

  const fetchProducts = useCallback(
    async (page = 1) => {
      setLoading(true)
      setError('')
      try {
        const params = new URLSearchParams({ page, limit: 10 })
        if (search) params.set('search', search)
        if (sort) params.set('sort', sort)
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
    [token, search, sort]
  )

  useEffect(() => {
    fetchProducts(1)
  }, [fetchProducts])

  useEffect(() => {
    async function fetchCategories() {
      try {
        const res = await fetch(CATS_API, { headers: { Authorization: `Bearer ${token}` } })
        if (res.ok) {
          const data = await res.json()
          setCategories(data.categories || [])
        }
      } catch {
        // categories stay empty — field falls back gracefully
      }
    }
    fetchCategories()
  }, [token])

  function handleSearch(e) {
    e.preventDefault()
    fetchProducts(1)
  }

  async function handleCreate(formData) {
    const res = await fetch(API, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify(formData),
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || 'Failed to create product')
    setModal(null)
    fetchProducts(pagination.page)
  }

  async function handleUpdate(productId, formData) {
    const res = await fetch(`${API}/${productId}`, {
      method: 'PUT',
      headers: authHeaders,
      body: JSON.stringify(formData),
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || 'Failed to update product')
    setModal(null)
    fetchProducts(pagination.page)
  }

  async function handleDelete(productId) {
    try {
      const res = await fetch(`${API}/${productId}`, { method: 'DELETE', headers: authHeaders })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Failed to delete product')
        return
      }
      setDeleteConfirm(null)
      fetchProducts(pagination.page)
    } catch {
      setError('Could not connect to server')
    }
  }

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <form className="flex items-center gap-2" onSubmit={handleSearch}>
          <select
            className="rounded-lg border border-[var(--border)] bg-[var(--card-bg)] px-3 py-2 text-sm text-[var(--text-h)] focus:ring-2 focus:ring-purple-500/40 focus:outline-none"
            value={sort}
            onChange={(e) => {
              setSort(e.target.value)
            }}
          >
            <option value="">Sort: Default</option>
            <option value="alpha">Alphabetical (A–Z)</option>
            <option value="price_asc">Price: Low to High</option>
            <option value="price_desc">Price: High to Low</option>
            <option value="stock_asc">Stock: Low to High</option>
            <option value="stock_desc">Stock: High to Low</option>
          </select>
          <input
            type="text"
            className={`${fieldInputClass} w-44`}
            placeholder="Search by name…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <button type="submit" className={btnSearch}>
            Search
          </button>
        </form>
        <button className={btnCreate} onClick={() => setModal({ mode: 'create' })}>
          + New Product
        </button>
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
              <th className={thClass}>Created</th>
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
            ) : products.length === 0 ? (
              <tr>
                <td colSpan="7" className={emptyClass}>
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
                    <span
                      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${stockBadgeClass(p.stock)}`}
                    >
                      {p.stock}
                    </span>
                  </td>
                  <td className={tdClass}>{new Date(p.created_at).toLocaleDateString()}</td>
                  <td className={`${tdClass} flex gap-2`}>
                    <button
                      className={btnEdit}
                      onClick={() => setModal({ mode: 'edit', product: p })}
                    >
                      Edit
                    </button>
                    <button className={btnDelete} onClick={() => setDeleteConfirm(p)}>
                      Delete
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
            className={btnBase}
            disabled={pagination.page >= pagination.totalPages}
            onClick={() => fetchProducts(pagination.page + 1)}
          >
            Next
          </button>
        </div>
      )}

      {modal && (
        <ProductModal
          mode={modal.mode}
          product={modal.product}
          categories={categories}
          onClose={() => setModal(null)}
          onCreate={handleCreate}
          onUpdate={handleUpdate}
        />
      )}

      {deleteConfirm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
          onClick={() => setDeleteConfirm(null)}
        >
          <div
            className="w-full max-w-md rounded-2xl border border-[var(--glass-border)] bg-[var(--card-bg)] p-6 shadow-[var(--shadow)]"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="mb-3 text-lg font-semibold text-[var(--text-h)]">Delete Product</h2>
            <p className="mb-5 text-sm text-[var(--text)]">
              Are you sure you want to delete <strong>{deleteConfirm.name}</strong>? This action
              cannot be undone.
            </p>
            <div className="flex justify-end gap-2">
              <button className={btnBase} onClick={() => setDeleteConfirm(null)}>
                Cancel
              </button>
              <button className={btnDanger} onClick={() => handleDelete(deleteConfirm.id)}>
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function ProductModal({ mode, product, categories, onClose, onCreate, onUpdate }) {
  const [name, setName] = useState(product?.name || '')
  const [description, setDescription] = useState(product?.description || '')
  const [price, setPrice] = useState(product?.price || '')
  const [stock, setStock] = useState(product?.stock ?? 0)
  const [category, setCategory] = useState(product?.category || '')
  const [imageUrl, setImageUrl] = useState(product?.image_url || '')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setSaving(true)
    try {
      const parsedStock = parseInt(stock, 10)
      const body = {
        name,
        description,
        price: parseFloat(price),
        stock: Number.isNaN(parsedStock) ? 0 : parsedStock,
        category,
        image_url: imageUrl,
      }
      if (mode === 'create') {
        await onCreate(body)
      } else {
        await onUpdate(product.id, body)
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-[var(--glass-border)] bg-[var(--card-bg)] p-6 shadow-[var(--shadow)]"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="mb-5 text-lg font-semibold text-[var(--text-h)]">
          {mode === 'create' ? 'Create Product' : 'Edit Product'}
        </h2>
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="mb-1.5 block text-sm font-medium text-[var(--text-h)]">Name</label>
            <input
              type="text"
              className={fieldInputClass}
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              placeholder="Product name"
            />
          </div>
          <div className="mb-4">
            <label className="mb-1.5 block text-sm font-medium text-[var(--text-h)]">
              Description
            </label>
            <input
              type="text"
              className={fieldInputClass}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief description"
            />
          </div>
          <div className="mb-4 grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-[var(--text-h)]">
                Price ($)
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                className={fieldInputClass}
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                required
                placeholder="0.00"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-[var(--text-h)]">Stock</label>
              <input
                type="number"
                min="0"
                className={fieldInputClass}
                value={stock}
                onChange={(e) => setStock(e.target.value)}
                placeholder="0"
              />
            </div>
          </div>
          <div className="mb-4">
            <label className="mb-1.5 block text-sm font-medium text-[var(--text-h)]">
              Category
            </label>
            {categories.length > 0 ? (
              <select
                className={fieldInputClass}
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              >
                <option value="">— Select category —</option>
                {categories.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            ) : (
              <input
                type="text"
                className={fieldInputClass}
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                placeholder="e.g. Footwear"
              />
            )}
          </div>
          <div className="mb-4">
            <label className="mb-1.5 block text-sm font-medium text-[var(--text-h)]">
              Image URL
            </label>
            <input
              type="text"
              className={fieldInputClass}
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              placeholder="https://…"
            />
          </div>
          {error && <p className="mb-3 text-sm text-red-400">{error}</p>}
          <div className="mt-5 flex justify-end gap-2">
            <button type="button" className={btnBase} onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className={btnCreate} disabled={saving}>
              {saving ? 'Saving…' : mode === 'create' ? 'Create' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default PMProducts
