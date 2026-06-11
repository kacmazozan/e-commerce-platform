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
  'bg-emerald-400/12 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-[var(--text)]'
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
  const [showMissingCost, setShowMissingCost] = useState(false)
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
          setCategories((data.categories || []).map((c) => c.name))
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

  async function handleCreate(formData, sizeStocks) {
    const res = await fetch(API, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify(formData),
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || 'Failed to create product')
    if (sizeStocks && Object.keys(sizeStocks).length > 0) {
      await fetch(`${API}/${data.product.id}/size-stock`, {
        method: 'PUT',
        headers: authHeaders,
        body: JSON.stringify({ stocks: sizeStocks }),
      })
    }
    setModal(null)
    fetchProducts(pagination.page)
  }

  async function handleUpdate(productId, formData, sizeStocks) {
    const res = await fetch(`${API}/${productId}`, {
      method: 'PUT',
      headers: authHeaders,
      body: JSON.stringify(formData),
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || 'Failed to update product')
    if (sizeStocks && Object.keys(sizeStocks).length > 0) {
      await fetch(`${API}/${productId}/size-stock`, {
        method: 'PUT',
        headers: authHeaders,
        body: JSON.stringify({ stocks: sizeStocks }),
      })
    }
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
            className="rounded-lg border border-[var(--border)] bg-[var(--card-bg)] px-3 py-2 text-sm text-[var(--text-h)] focus:ring-2 focus:ring-emerald-500/40 focus:outline-none"
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
          <button type="button" type="submit" className={btnSearch}>
            Search
          </button>
        </form>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setShowMissingCost((v) => !v)}
            className={`rounded-lg border px-3 py-2 text-sm transition-colors ${
              showMissingCost
                ? 'border-amber-500/50 bg-amber-500/15 text-amber-400'
                : 'border-[var(--border)] bg-[var(--card-bg)] text-[var(--text)]'
            }`}
          >
            {showMissingCost ? 'Showing: missing cost' : 'Filter: missing cost'}
          </button>
          <button type="button" className={btnCreate} onClick={() => setModal({ mode: 'create' })}>
            + New Product
          </button>
        </div>
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
              <th className={thClass}>Cost</th>
              <th className={thClass}>Stock</th>
              <th className={thClass}>Created</th>
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
            ) : products.length === 0 ? (
              <tr>
                <td colSpan="8" className={emptyClass}>
                  No products found
                </td>
              </tr>
            ) : (
              (showMissingCost ? products.filter((p) => p.cost_price == null) : products).map(
                (p) => (
                  <tr key={p.id} className="transition-colors hover:bg-[var(--card-bg)]/60">
                    <td className={tdClass}>{p.id}</td>
                    <td className={tdClass}>{p.name}</td>
                    <td className={tdClass}>{p.category || '—'}</td>
                    <td className={tdClass}>${parseFloat(p.price).toFixed(2)}</td>
                    <td className={tdClass}>
                      {p.cost_price != null ? (
                        <span>${parseFloat(p.cost_price).toFixed(2)}</span>
                      ) : (
                        <span className="rounded bg-amber-500/15 px-1.5 py-0.5 text-xs text-amber-400">
                          No cost
                        </span>
                      )}
                    </td>
                    <td className={tdClass}>
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${stockBadgeClass(p.total_stock ?? p.stock)}`}
                      >
                        {p.total_stock ?? p.stock}
                        {p.sizes && p.sizes.length > 0 && (
                          <span className="ml-1 opacity-60">total</span>
                        )}
                      </span>
                    </td>
                    <td className={tdClass}>{new Date(p.created_at).toLocaleDateString()}</td>
                    <td className={`${tdClass} flex gap-2`}>
                      <button
                        type="button"
                        className={btnEdit}
                        onClick={() => setModal({ mode: 'edit', product: p })}
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        className={btnDelete}
                        onClick={() => setDeleteConfirm(p)}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                )
              )
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
              <button type="button" className={btnBase} onClick={() => setDeleteConfirm(null)}>
                Cancel
              </button>
              <button
                type="button"
                className={btnDanger}
                onClick={() => handleDelete(deleteConfirm.id)}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function Field({ label, children, hint }) {
  return (
    <div className="mb-4">
      <label className="mb-1.5 block text-sm font-medium text-[var(--text-h)]">
        {label}
        {hint && <span className="ml-1.5 font-normal text-[var(--text)] opacity-60">{hint}</span>}
      </label>
      {children}
    </div>
  )
}

function ProductModal({ mode, product, categories, onClose, onCreate, onUpdate }) {
  const [name, setName] = useState(product?.name || '')
  const [description, setDescription] = useState(product?.description || '')
  const [stock, setStock] = useState(product?.stock ?? 0)
  const [category, setCategory] = useState(product?.category || '')
  const [draftSizeStocks, setDraftSizeStocks] = useState(() => {
    if (!product?.sizes?.length) return {}
    const initial = {}
    for (const sz of product.sizes) {
      const found = (product.size_stocks || []).find((s) => s.size === sz)
      initial[sz] = String(found ? found.stock : 0)
    }
    return initial
  })
  const [countryOfOrigin, setCountryOfOrigin] = useState(product?.country_of_origin || '')
  const [material, setMaterial] = useState(product?.material || '')
  const [modelHeight, setModelHeight] = useState(product?.model_height || '')
  const [modelChest, setModelChest] = useState(product?.model_chest || '')
  const [modelWaist, setModelWaist] = useState(product?.model_waist || '')
  const [modelHips, setModelHips] = useState(product?.model_hips || '')
  const [modelSize, setModelSize] = useState(product?.model_size || '')
  const [sizesInput, setSizesInput] = useState(
    Array.isArray(product?.sizes) ? product.sizes.join(', ') : ''
  )
  const [costPrice, setCostPrice] = useState(
    product?.cost_price != null ? String(product.cost_price) : ''
  )
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setSaving(true)
    try {
      const sizes = sizesInput
        .split(',')
        .map((s) => s.trim().toUpperCase())
        .filter(Boolean)

      let sizeStocksToSave = null
      const body = {
        name,
        description,
        category,
        country_of_origin: countryOfOrigin,
        material,
        cost_price: costPrice !== '' ? costPrice : null,
        model_height: modelHeight,
        model_chest: modelChest,
        model_waist: modelWaist,
        model_hips: modelHips,
        model_size: modelSize,
        sizes: sizes.length > 0 ? sizes : null,
      }

      if (sizes.length > 0) {
        sizeStocksToSave = {}
        for (const sz of sizes) {
          const parsed = parseInt(draftSizeStocks[sz] || '0', 10)
          sizeStocksToSave[sz] = Number.isNaN(parsed) ? 0 : parsed
        }
      } else {
        body.stock = parseInt(stock, 10) || 0
      }

      if (mode === 'create') {
        await onCreate(body, sizeStocksToSave)
      } else {
        await onUpdate(product.id, body, sizeStocksToSave)
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  const sectionLabel =
    'mb-3 mt-6 text-[11px] font-bold tracking-[3px] text-emerald-400 uppercase border-b border-[var(--border)] pb-2'

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-2xl border border-[var(--glass-border)] bg-[var(--card-bg)] p-6 shadow-[var(--shadow)]"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="mb-5 text-lg font-semibold text-[var(--text-h)]">
          {mode === 'create' ? 'Create Product' : 'Edit Product'}
        </h2>
        <form onSubmit={handleSubmit}>
          <p className={sectionLabel}>Basic Info</p>
          <Field label="Name">
            <input
              type="text"
              className={fieldInputClass}
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              placeholder="Product name"
            />
          </Field>
          <Field label="Description">
            <textarea
              className={`${fieldInputClass} resize-none`}
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief description"
            />
          </Field>
          {(() => {
            const parsedSizes = sizesInput
              .split(',')
              .map((s) => s.trim().toUpperCase())
              .filter(Boolean)
            return parsedSizes.length > 0 ? (
              <Field label="Stock per Size">
                <div className="flex flex-wrap gap-3">
                  {parsedSizes.map((sz) => (
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
                </div>
              </Field>
            ) : (
              <Field label="Stock">
                <input
                  type="number"
                  min="0"
                  className={fieldInputClass}
                  value={stock}
                  onChange={(e) => setStock(e.target.value)}
                  placeholder="0"
                />
              </Field>
            )
          })()}
          <Field label="Cost Price ($)" hint="(purchasing / wholesale cost)">
            <input
              type="number"
              min="0"
              step="0.01"
              className={fieldInputClass}
              value={costPrice}
              onChange={(e) => setCostPrice(e.target.value)}
              placeholder="e.g. 45.00"
            />
          </Field>
          <Field label="Category">
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
          </Field>
          <Field label="Available Sizes" hint="(comma-separated, e.g. XS, S, M, L, XL)">
            <input
              type="text"
              className={fieldInputClass}
              value={sizesInput}
              onChange={(e) => setSizesInput(e.target.value)}
              placeholder="XS, S, M, L, XL, XXL"
            />
          </Field>

          <p className={sectionLabel}>Product Details</p>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Material">
              <input
                type="text"
                className={fieldInputClass}
                value={material}
                onChange={(e) => setMaterial(e.target.value)}
                placeholder="e.g. 100% Cotton"
              />
            </Field>
            <Field label="Country of Origin">
              <input
                type="text"
                className={fieldInputClass}
                value={countryOfOrigin}
                onChange={(e) => setCountryOfOrigin(e.target.value)}
                placeholder="e.g. Turkey"
              />
            </Field>
          </div>

          <p className={sectionLabel}>Model Measurements</p>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Height">
              <input
                type="text"
                className={fieldInputClass}
                value={modelHeight}
                onChange={(e) => setModelHeight(e.target.value)}
                placeholder="e.g. 185 cm"
              />
            </Field>
            <Field label="Wears Size">
              <input
                type="text"
                className={fieldInputClass}
                value={modelSize}
                onChange={(e) => setModelSize(e.target.value)}
                placeholder="e.g. M"
              />
            </Field>
            <Field label="Chest">
              <input
                type="text"
                className={fieldInputClass}
                value={modelChest}
                onChange={(e) => setModelChest(e.target.value)}
                placeholder="e.g. 96 cm"
              />
            </Field>
            <Field label="Waist">
              <input
                type="text"
                className={fieldInputClass}
                value={modelWaist}
                onChange={(e) => setModelWaist(e.target.value)}
                placeholder="e.g. 78 cm"
              />
            </Field>
            <Field label="Hips">
              <input
                type="text"
                className={fieldInputClass}
                value={modelHips}
                onChange={(e) => setModelHips(e.target.value)}
                placeholder="e.g. 90 cm"
              />
            </Field>
          </div>

          {error && <p className="mb-3 text-sm text-red-400">{error}</p>}
          <div className="mt-5 flex justify-end gap-2">
            <button type="button" className={btnBase} onClick={onClose}>
              Cancel
            </button>
            <button type="button" type="submit" className={btnCreate} disabled={saving}>
              {saving ? 'Saving…' : mode === 'create' ? 'Create' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default PMProducts
