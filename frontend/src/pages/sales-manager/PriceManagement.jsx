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
import { btnBase, btnEdit, fieldInputClass } from '../../styles/dashboardStyles'

const API = `${API_BASE}/api/sales-manager/products`

export default function PriceManagement({ token }) {
  const [products, setProducts] = useState([])
  const [pagination, setPagination] = useState({ page: 1, limit: 15, total: 0, totalPages: 0 })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [editingId, setEditingId] = useState(null)
  const [editingPrice, setEditingPrice] = useState('')
  const [editError, setEditError] = useState('')
  const [saving, setSaving] = useState(false)

  const fetchProducts = useCallback(
    async (page = 1) => {
      setLoading(true)
      setError('')
      try {
        const params = new URLSearchParams({ page, limit: 15 })
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
    fetchProducts(1)
  }, [fetchProducts])

  function startEdit(product) {
    setEditingId(product.id)
    setEditingPrice(String(parseFloat(product.price).toFixed(2)))
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

  return (
    <div>
      {error && <p className="mb-4 text-sm text-red-400">{error}</p>}

      <div className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] shadow-[var(--shadow)] backdrop-blur-xl">
        <Table>
          <TableHeader>
            <TableRow className="border-[var(--border)] hover:bg-transparent">
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
                Actions
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow className="border-[var(--border)]">
                <TableCell colSpan={4} className="py-8 text-center text-[var(--text)]">
                  Loading…
                </TableCell>
              </TableRow>
            ) : products.length === 0 ? (
              <TableRow className="border-[var(--border)]">
                <TableCell colSpan={4} className="py-8 text-center text-[var(--text)]">
                  No products found
                </TableCell>
              </TableRow>
            ) : (
              products.map((p) => (
                <TableRow
                  key={p.id}
                  className="border-[var(--border)] transition-colors hover:bg-purple-400/5"
                >
                  <TableCell className="text-[var(--text-h)]">{p.name}</TableCell>
                  <TableCell className="text-[var(--text-h)]">{p.category || '—'}</TableCell>
                  <TableCell className="text-[var(--text-h)]">
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
                    ) : (
                      `$${parseFloat(p.price).toFixed(2)}`
                    )}
                  </TableCell>
                  <TableCell>
                    {editingId === p.id ? (
                      <div className="flex gap-1.5">
                        <button
                          className={btnEdit}
                          onClick={() => savePrice(p.id)}
                          disabled={saving}
                        >
                          {saving ? 'Saving…' : 'Save'}
                        </button>
                        <button className={btnBase} onClick={cancelEdit} disabled={saving}>
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button className={btnEdit} onClick={() => startEdit(p)}>
                        Edit Price
                      </button>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

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
    </div>
  )
}
