import { useState, useEffect, useCallback } from 'react'
import API_BASE from '../../api'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import {
  btnBase,
  btnCreate,
  btnSearch,
  btnEdit,
  btnDelete,
  btnDanger,
  fieldInputClass,
} from '../../styles/dashboardStyles'

const API = `${API_BASE}/api/admin/products`

function ProductManagement({ token }) {
  // ... rest of state stays same ...
  const [products, setProducts] = useState([])
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 0 })
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [modal, setModal] = useState(null)
  const [deleteConfirm, setDeleteConfirm] = useState(null)

  const authHeaders = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }

  const fetchProducts = useCallback(
    async (page = 1) => {
      setLoading(true)
      setError('')
      try {
        const params = new URLSearchParams({ page, limit: 10 })
        if (search) params.set('search', search)
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
    [token, search]
  )

  useEffect(() => {
    fetchProducts(1)
  }, [fetchProducts])

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

  function stockBadgeClass(stock) {
    const n = parseInt(stock)
    if (n === 0) return 'bg-purple-400/12 text-purple-400 border-0'
    if (n < 10) return 'bg-amber-500/10 text-amber-400 border-0'
    return 'bg-emerald-500/10 text-emerald-400 border-0'
  }

  return (
    <div>
      {/* Toolbar */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <form className="flex min-w-0 flex-1 gap-2" onSubmit={handleSearch}>
          <Input
            type="text"
            className="min-w-[140px] flex-1 border-[var(--border)] bg-[var(--card-bg)] text-[var(--text-h)] placeholder:text-[var(--text)]/40"
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

      {/* Table */}
      <div className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] shadow-[var(--shadow)] backdrop-blur-xl">
        <Table>
          <TableHeader>
            <TableRow className="border-[var(--border)] hover:bg-transparent">
              <TableHead className="bg-purple-400/12 text-xs tracking-wide text-[var(--text)] uppercase">
                ID
              </TableHead>
              <TableHead className="bg-purple-400/12 text-xs tracking-wide text-[var(--text)] uppercase">
                Name
              </TableHead>
              <TableHead className="bg-purple-400/12 text-xs tracking-wide text-[var(--text)] uppercase">
                Category
              </TableHead>
              <TableHead className="bg-purple-400/12 text-xs tracking-wide text-[var(--text)] uppercase">
                Price
              </TableHead>
              <TableHead className="bg-purple-400/12 text-xs tracking-wide text-[var(--text)] uppercase">
                Stock
              </TableHead>
              <TableHead className="bg-purple-400/12 text-xs tracking-wide text-[var(--text)] uppercase">
                Created
              </TableHead>
              <TableHead className="bg-purple-400/12 text-xs tracking-wide text-[var(--text)] uppercase">
                Actions
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow className="border-[var(--border)]">
                <TableCell colSpan={7} className="py-8 text-center text-[var(--text)]">
                  Loading…
                </TableCell>
              </TableRow>
            ) : products.length === 0 ? (
              <TableRow className="border-[var(--border)]">
                <TableCell colSpan={7} className="py-8 text-center text-[var(--text)]">
                  No products found
                </TableCell>
              </TableRow>
            ) : (
              products.map((p) => (
                <TableRow
                  key={p.id}
                  className="border-[var(--border)] transition-colors hover:bg-purple-400/5"
                >
                  <TableCell className="font-mono text-xs text-[var(--text-h)]">{p.id}</TableCell>
                  <TableCell className="text-[var(--text-h)]">{p.name}</TableCell>
                  <TableCell className="text-[var(--text-h)]">{p.category || '—'}</TableCell>
                  <TableCell className="text-[var(--text-h)]">
                    ${parseFloat(p.price).toFixed(2)}
                  </TableCell>
                  <TableCell>
                    <Badge className={stockBadgeClass(p.stock)}>{p.stock}</Badge>
                  </TableCell>
                  <TableCell className="text-[var(--text-h)]">
                    {new Date(p.created_at).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1.5">
                      <button
                        className={btnEdit}
                        onClick={() => setModal({ mode: 'edit', product: p })}
                      >
                        Edit
                      </button>
                      <button className={btnDelete} onClick={() => setDeleteConfirm(p)}>
                        Delete
                      </button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="mt-5 flex items-center justify-center gap-4">
          <button
            className={btnBase}
            disabled={pagination.page <= 1}
            onClick={() => fetchProducts(pagination.page - 1)}
          >
            Previous
          </button>
          <span className="text-[13px] text-[var(--text)]">
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

      {/* Create / Edit Modal */}
      {modal && (
        <ProductModal
          mode={modal.mode}
          product={modal.product}
          onClose={() => setModal(null)}
          onCreate={handleCreate}
          onUpdate={handleUpdate}
        />
      )}

      {/* Delete Confirmation */}
      <Dialog open={!!deleteConfirm} onOpenChange={(open) => !open && setDeleteConfirm(null)}>
        <DialogContent className="max-w-md rounded-2xl border border-[var(--glass-border)] bg-[var(--card-bg)] shadow-[var(--shadow)] backdrop-blur-xl">
          <DialogHeader>
            <DialogTitle className="text-xl text-[var(--text-h)]">Delete Product</DialogTitle>
          </DialogHeader>
          <p className="mb-5 leading-relaxed text-[var(--text)]">
            Are you sure you want to delete{' '}
            <strong className="text-[var(--text-h)]">{deleteConfirm?.name}</strong>? This action
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
        </DialogContent>
      </Dialog>
    </div>
  )
}

function ProductModal({ mode, product, onClose, onCreate, onUpdate }) {
  // ... rest of state stays same ...
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
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md rounded-2xl border border-[var(--glass-border)] bg-[var(--card-bg)] shadow-[var(--shadow)] backdrop-blur-xl">
        <DialogHeader>
          <DialogTitle className="text-xl text-[var(--text-h)]">
            {mode === 'create' ? 'Create Product' : 'Edit Product'}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="mb-4 flex flex-col gap-1.5">
            <label className="text-[13px] font-medium text-[var(--text-h)]">Name</label>
            <input
              type="text"
              className={fieldInputClass}
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              placeholder="Product name"
            />
          </div>
          <div className="mb-4 flex flex-col gap-1.5">
            <label className="text-[13px] font-medium text-[var(--text-h)]">Description</label>
            <input
              type="text"
              className={fieldInputClass}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief description"
            />
          </div>
          <div className="mb-4 flex gap-3">
            <div className="flex flex-1 flex-col gap-1.5">
              <label className="text-[13px] font-medium text-[var(--text-h)]">Price ($)</label>
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
            <div className="flex flex-1 flex-col gap-1.5">
              <label className="text-[13px] font-medium text-[var(--text-h)]">Stock</label>
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
          <div className="mb-4 flex flex-col gap-1.5">
            <label className="text-[13px] font-medium text-[var(--text-h)]">Category</label>
            <input
              type="text"
              className={fieldInputClass}
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="e.g. Footwear"
            />
          </div>
          <div className="mb-4 flex flex-col gap-1.5">
            <label className="text-[13px] font-medium text-[var(--text-h)]">Image URL</label>
            <input
              type="text"
              className={fieldInputClass}
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              placeholder="https://…"
            />
          </div>
          {error && <p className="mb-4 text-sm text-red-400">{error}</p>}
          <div className="mt-6 flex justify-end gap-2">
            <button type="button" className={btnBase} onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className={btnCreate} disabled={saving}>
              {saving ? 'Saving…' : mode === 'create' ? 'Create' : 'Save Changes'}
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export default ProductManagement
