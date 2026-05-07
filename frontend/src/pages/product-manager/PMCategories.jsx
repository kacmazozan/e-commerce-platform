import { useState, useEffect, useCallback } from 'react'
import API_BASE from '../../api'
import { btnBase, btnCreate, btnDanger, fieldInputClass } from '../../styles/dashboardStyles'

const API = `${API_BASE}/api/product-manager/categories`

const tableWrap =
  'overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] shadow-[var(--shadow)] backdrop-blur-xl'
const tableClass = 'min-w-full divide-y divide-[var(--border)] text-left text-sm'
const thClass =
  'bg-emerald-400/12 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-[var(--text)]'
const tdClass = 'px-4 py-3 text-[var(--text-h)]'
const emptyClass = 'px-4 py-8 text-center text-[var(--text)]'

function PMCategories({ token }) {
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showAddModal, setShowAddModal] = useState(false)
  const [newName, setNewName] = useState('')
  const [adding, setAdding] = useState(false)
  const [addError, setAddError] = useState('')
  const [sort, setSort] = useState('alpha')
  const [deleteConfirm, setDeleteConfirm] = useState(null)
  const [deleting, setDeleting] = useState(false)

  const authHeaders = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }

  const fetchCategories = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const res = await fetch(API, { headers: { Authorization: `Bearer ${token}` } })
      if (!res.ok) throw new Error('Failed to fetch categories')
      const data = await res.json()
      setCategories(data.categories || [])
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [token])

  useEffect(() => {
    fetchCategories()
  }, [fetchCategories])

  async function handleAdd(e) {
    e.preventDefault()
    const name = newName.trim()
    if (!name) return
    setAdding(true)
    setAddError('')
    try {
      const res = await fetch(API, {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({ name }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to add category')
      setNewName('')
      setShowAddModal(false)
      fetchCategories()
    } catch (err) {
      setAddError(err.message)
    } finally {
      setAdding(false)
    }
  }

  function openAddModal() {
    setNewName('')
    setAddError('')
    setShowAddModal(true)
  }

  async function handleDelete() {
    if (!deleteConfirm) return
    setDeleting(true)
    try {
      const res = await fetch(`${API}/${encodeURIComponent(deleteConfirm.name)}`, {
        method: 'DELETE',
        headers: authHeaders,
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to delete category')
      setDeleteConfirm(null)
      fetchCategories()
    } catch (err) {
      setError(err.message)
      setDeleteConfirm(null)
    } finally {
      setDeleting(false)
    }
  }

  const sortedCategories = [...categories].sort((a, b) => {
    if (sort === 'asc') return a.product_count - b.product_count
    if (sort === 'desc') return b.product_count - a.product_count
    return a.name.localeCompare(b.name)
  })

  return (
    <div>
      {error && <p className="mb-4 text-sm text-red-400">{error}</p>}

      <div className="mb-6 flex items-center justify-between gap-3">
        <select
          className="rounded-lg border border-[var(--border)] bg-[var(--card-bg)] px-3 py-2 text-sm text-[var(--text-h)] focus:ring-2 focus:ring-emerald-500/40 focus:outline-none"
          value={sort}
          onChange={(e) => setSort(e.target.value)}
        >
          <option value="alpha">Alphabetical</option>
          <option value="asc">Low to High</option>
          <option value="desc">High to Low</option>
        </select>
        <button className={btnCreate} onClick={openAddModal}>
          + Add Category
        </button>
      </div>

      <div className={tableWrap}>
        <table className={tableClass}>
          <thead>
            <tr>
              <th className={thClass}>#</th>
              <th className={thClass}>Name</th>
              <th className={thClass}>Products</th>
              <th className={thClass}>Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border)]">
            {loading ? (
              <tr>
                <td colSpan="4" className={emptyClass}>
                  Loading…
                </td>
              </tr>
            ) : categories.length === 0 ? (
              <tr>
                <td colSpan="4" className={emptyClass}>
                  No categories found
                </td>
              </tr>
            ) : (
              sortedCategories.map((cat, i) => (
                <tr key={cat.name} className="transition-colors hover:bg-[var(--card-bg)]/60">
                  <td className={tdClass}>{i + 1}</td>
                  <td className={tdClass}>{cat.name}</td>
                  <td className={tdClass}>
                    <span
                      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        cat.product_count === 0
                          ? 'bg-[var(--border)]/40 text-[var(--text)]'
                          : 'bg-emerald-500/10 text-emerald-400'
                      }`}
                    >
                      {cat.product_count}
                    </span>
                  </td>
                  <td className={tdClass}>
                    <button
                      className={cat.product_count > 0 ? btnBase : btnDanger}
                      onClick={() => setDeleteConfirm(cat)}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {showAddModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
          onClick={() => !adding && setShowAddModal(false)}
        >
          <div
            className="w-full max-w-md rounded-2xl border border-[var(--glass-border)] bg-[var(--card-bg)] p-6 shadow-[var(--shadow)]"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="mb-5 text-lg font-semibold text-[var(--text-h)]">Add Category</h2>
            <form onSubmit={handleAdd}>
              <div className="mb-5">
                <label className="mb-1.5 block text-sm font-medium text-[var(--text-h)]">
                  Category name
                </label>
                <input
                  type="text"
                  className={fieldInputClass}
                  placeholder="Category name"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  disabled={adding}
                  autoFocus
                />
                {addError && <p className="mt-1.5 text-xs text-red-400">{addError}</p>}
              </div>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  className={btnBase}
                  onClick={() => setShowAddModal(false)}
                  disabled={adding}
                >
                  Cancel
                </button>
                <button type="submit" className={btnCreate} disabled={adding || !newName.trim()}>
                  {adding ? 'Adding…' : 'Add Category'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {deleteConfirm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
          onClick={() => !deleting && setDeleteConfirm(null)}
        >
          <div
            className="w-full max-w-md rounded-2xl border border-[var(--glass-border)] bg-[var(--card-bg)] p-6 shadow-[var(--shadow)]"
            onClick={(e) => e.stopPropagation()}
          >
            {deleteConfirm.product_count > 0 ? (
              <>
                <h2 className="mb-3 text-lg font-semibold text-[var(--text-h)]">
                  Cannot Delete Category
                </h2>
                <p className="mb-5 text-sm text-[var(--text)]">
                  <span className="font-medium text-amber-400">Notice:</span> The category{' '}
                  <strong>{deleteConfirm.name}</strong> contains{' '}
                  <strong>
                    {deleteConfirm.product_count} product
                    {deleteConfirm.product_count !== 1 ? 's' : ''}
                  </strong>
                  . Remove or reassign all products before deleting this category.
                </p>
                <div className="flex justify-end">
                  <button className={btnBase} onClick={() => setDeleteConfirm(null)}>
                    Close
                  </button>
                </div>
              </>
            ) : (
              <>
                <h2 className="mb-3 text-lg font-semibold text-[var(--text-h)]">Delete Category</h2>
                <p className="mb-5 text-sm text-[var(--text)]">
                  <span className="font-medium text-amber-400">Warning:</span> You are about to
                  delete the category <strong>{deleteConfirm.name}</strong>. It has no products.
                  This action cannot be undone.
                </p>
                <div className="flex justify-end gap-2">
                  <button
                    className={btnBase}
                    onClick={() => setDeleteConfirm(null)}
                    disabled={deleting}
                  >
                    Cancel
                  </button>
                  <button className={btnDanger} onClick={handleDelete} disabled={deleting}>
                    {deleting ? 'Deleting…' : 'Delete'}
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

export default PMCategories
