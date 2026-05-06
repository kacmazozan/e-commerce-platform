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

const API = `${API_BASE}/api/admin`
const ROLES = ['customer', 'sales_manager', 'product_manager', 'admin']
const ROLE_LABELS = {
  customer: 'Customer',
  sales_manager: 'Sales Manager',
  product_manager: 'Product Manager',
  admin: 'Admin',
}

const ROLE_BADGE_CLASS = {
  customer: 'bg-blue-500/10 text-blue-400 border-0',
  sales_manager: 'bg-emerald-500/10 text-emerald-400 border-0',
  product_manager: 'bg-amber-500/10 text-amber-400 border-0',
  admin: 'bg-purple-400/12 text-purple-400 border-0',
}

/* Shared primitive class strings */
const btnBase =
  'font-[inherit] text-[13px] font-medium px-4 py-2 border border-[var(--border)] rounded-[10px] bg-[var(--card-bg)] text-[var(--text-h)] cursor-pointer transition-all duration-150 whitespace-nowrap disabled:opacity-45 disabled:cursor-not-allowed hover:not-disabled:border-purple-400 hover:not-disabled:text-purple-400'
const btnCreate =
  'font-[inherit] text-[13px] font-medium px-4 py-2 rounded-[10px] bg-purple-400 text-white border-none cursor-pointer transition-opacity duration-150 hover:opacity-90 disabled:opacity-45 disabled:cursor-not-allowed'
const btnSearch =
  'font-[inherit] text-[13px] font-medium px-4 py-2 border border-purple-400/30 rounded-[10px] bg-purple-400/12 text-purple-400 cursor-pointer transition-all duration-150 whitespace-nowrap'
const btnEdit =
  'font-[inherit] text-[12px] font-medium px-3 py-1 border border-[var(--border)] rounded-[10px] bg-[var(--card-bg)] text-[var(--text-h)] cursor-pointer transition-all duration-150 hover:border-purple-400 hover:text-purple-400'
const btnDelete =
  'font-[inherit] text-[12px] font-medium px-3 py-1 border border-red-500/20 rounded-[10px] bg-red-500/10 text-red-400 cursor-pointer transition-all duration-150 hover:bg-red-500/20 hover:border-red-500'
const btnDanger =
  'font-[inherit] text-[13px] font-medium px-4 py-2 rounded-[10px] bg-red-500 text-white border-none cursor-pointer transition-opacity duration-150 hover:opacity-90'
const fieldInputClass =
  'w-full font-[inherit] text-sm py-2.5 px-3 border border-[var(--border)] rounded-md bg-[var(--bg)] text-[var(--text-h)] outline-none transition-all duration-150 focus:border-purple-400 focus:shadow-[0_0_0_3px_rgba(192,132,252,0.12)]'

function UserManagement({ token }) {
  // ... rest of state stays same ...
  const [users, setUsers] = useState([])
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 0 })
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Modal state
  const [modal, setModal] = useState(null) // null | { mode: 'create' } | { mode: 'edit', user }
  const [deleteConfirm, setDeleteConfirm] = useState(null) // null | user

  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }

  const fetchUsers = useCallback(
    async (page = 1) => {
      setLoading(true)
      setError('')
      try {
        const params = new URLSearchParams({ page, limit: 10 })
        if (search) params.set('search', search)
        if (roleFilter) params.set('role', roleFilter)

        const res = await fetch(`${API}/users?${params}`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        if (!res.ok) throw new Error('Failed to fetch users')
        const data = await res.json()
        setUsers(data.users)
        setPagination(data.pagination)
      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    },
    [token, search, roleFilter]
  )

  useEffect(() => {
    fetchUsers(1)
  }, [fetchUsers])

  function handleSearch(e) {
    e.preventDefault()
    fetchUsers(1)
  }

  // ─── Create User ──────────────────────────────────
  async function handleCreate(formData) {
    const res = await fetch(`${API}/users`, {
      method: 'POST',
      headers,
      body: JSON.stringify(formData),
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || 'Failed to create user')
    setModal(null)
    fetchUsers(pagination.page)
  }

  // ─── Update User ──────────────────────────────────
  async function handleUpdate(userId, formData) {
    const res = await fetch(`${API}/users/${userId}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify(formData),
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || 'Failed to update user')
    setModal(null)
    fetchUsers(pagination.page)
  }

  // ─── Delete User ──────────────────────────────────
  async function handleDelete(userId) {
    try {
      const res = await fetch(`${API}/users/${userId}`, { method: 'DELETE', headers })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Failed to delete user')
        return
      }
      setDeleteConfirm(null)
      fetchUsers(pagination.page)
    } catch {
      setError('Could not connect to server')
    }
  }

  return (
    <div>
      {/* Toolbar */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <form className="flex min-w-0 flex-1 gap-2" onSubmit={handleSearch}>
          <Input
            type="text"
            className="min-w-[140px] flex-1 border-[var(--border)] bg-[var(--card-bg)] text-[var(--text-h)] placeholder:text-[var(--text)]/40"
            placeholder="Search by email…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <select
            className="cursor-pointer rounded-[10px] border border-[var(--border)] bg-[var(--card-bg)] px-3 py-2 font-[inherit] text-sm text-[var(--text-h)] transition-all duration-150 outline-none"
            value={roleFilter}
            onChange={(e) => {
              setRoleFilter(e.target.value)
            }}
          >
            <option value="">All roles</option>
            {ROLES.map((r) => (
              <option key={r} value={r}>
                {ROLE_LABELS[r]}
              </option>
            ))}
          </select>
          <button type="button" type="submit" className={btnSearch}>
            Search
          </button>
        </form>
        <button type="button" className={btnCreate} onClick={() => setModal({ mode: 'create' })}>
          + New User
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
                Email
              </TableHead>
              <TableHead className="bg-purple-400/12 text-xs tracking-wide text-[var(--text)] uppercase">
                Role
              </TableHead>
              <TableHead className="bg-purple-400/12 text-xs tracking-wide text-[var(--text)] uppercase">
                Tax ID
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
                <TableCell colSpan={6} className="py-8 text-center text-[var(--text)]">
                  Loading…
                </TableCell>
              </TableRow>
            ) : users.length === 0 ? (
              <TableRow className="border-[var(--border)]">
                <TableCell colSpan={6} className="py-8 text-center text-[var(--text)]">
                  No users found
                </TableCell>
              </TableRow>
            ) : (
              users.map((u) => (
                <TableRow
                  key={u.id}
                  className="border-[var(--border)] transition-colors hover:bg-purple-400/5"
                >
                  <TableCell className="font-mono text-xs text-[var(--text-h)]">{u.id}</TableCell>
                  <TableCell className="text-[var(--text-h)]">{u.email}</TableCell>
                  <TableCell>
                    <Badge
                      className={
                        ROLE_BADGE_CLASS[u.role] || 'border-0 bg-white/10 text-[var(--text-h)]'
                      }
                    >
                      {ROLE_LABELS[u.role]}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-[var(--text-h)]">
                    {u.role === 'customer' ? u.tax_id || '—' : '—'}
                  </TableCell>
                  <TableCell className="text-[var(--text-h)]">
                    {new Date(u.created_at).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1.5">
                      <button
                        type="button"
                        className={btnEdit}
                        onClick={() => setModal({ mode: 'edit', user: u })}
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        className={btnDelete}
                        onClick={() => setDeleteConfirm(u)}
                      >
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
            type="button"
            className={btnBase}
            disabled={pagination.page <= 1}
            onClick={() => fetchUsers(pagination.page - 1)}
          >
            Previous
          </button>
          <span className="text-[13px] text-[var(--text)]">
            Page {pagination.page} of {pagination.totalPages} ({pagination.total} users)
          </span>
          <button
            type="button"
            className={btnBase}
            disabled={pagination.page >= pagination.totalPages}
            onClick={() => fetchUsers(pagination.page + 1)}
          >
            Next
          </button>
        </div>
      )}

      {/* Create / Edit Modal */}
      {modal && (
        <UserModal
          mode={modal.mode}
          user={modal.user}
          onClose={() => setModal(null)}
          onCreate={handleCreate}
          onUpdate={handleUpdate}
        />
      )}

      {/* Delete Confirmation */}
      <Dialog open={!!deleteConfirm} onOpenChange={(open) => !open && setDeleteConfirm(null)}>
        <DialogContent className="max-w-md rounded-2xl border border-[var(--glass-border)] bg-[var(--card-bg)] shadow-[var(--shadow)] backdrop-blur-xl">
          <DialogHeader>
            <DialogTitle className="text-xl text-[var(--text-h)]">Delete User</DialogTitle>
          </DialogHeader>
          <p className="mb-5 leading-relaxed text-[var(--text)]">
            Are you sure you want to delete{' '}
            <strong className="text-[var(--text-h)]">{deleteConfirm?.email}</strong>? This action
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
        </DialogContent>
      </Dialog>
    </div>
  )
}

function UserModal({ mode, user, onClose, onCreate, onUpdate }) {
  const [email, setEmail] = useState(user?.email || '')
  const [role, setRole] = useState(user?.role || 'customer')
  const [password, setPassword] = useState('')
  const [taxId, setTaxId] = useState(user?.tax_id || '')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setSaving(true)

    try {
      if (mode === 'create') {
        await onCreate({ email, password, role })
      } else {
        const body = { email, role }
        if (password) body.password = password
        if (role === 'customer') body.tax_id = taxId.trim() || null
        await onUpdate(user.id, body)
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
            {mode === 'create' ? 'Create User' : 'Edit User'}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="mb-4 flex flex-col gap-1.5">
            <label className="text-[13px] font-medium text-[var(--text-h)]">Email</label>
            <input
              type="email"
              className={fieldInputClass}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="user@example.com"
            />
          </div>
          <div className="mb-4 flex flex-col gap-1.5">
            <label className="text-[13px] font-medium text-[var(--text-h)]">Role</label>
            <select
              className={fieldInputClass}
              value={role}
              onChange={(e) => setRole(e.target.value)}
            >
              {ROLES.map((r) => (
                <option key={r} value={r}>
                  {ROLE_LABELS[r]}
                </option>
              ))}
            </select>
          </div>
          <div className="mb-4 flex flex-col gap-1.5">
            <label className="text-[13px] font-medium text-[var(--text-h)]">
              {mode === 'create' ? 'Password' : 'New Password (leave blank to keep)'}
            </label>
            <input
              type="password"
              className={fieldInputClass}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              {...(mode === 'create' ? { required: true, minLength: 8 } : {})}
            />
          </div>
          {mode === 'edit' && role === 'customer' && (
            <div className="mb-4 flex flex-col gap-1.5">
              <label className="text-[13px] font-medium text-[var(--text-h)]">
                Tax ID <span className="font-normal text-[var(--text)]">(optional)</span>
              </label>
              <input
                type="text"
                className={fieldInputClass}
                value={taxId}
                onChange={(e) => setTaxId(e.target.value)}
                placeholder="e.g. 1234567890"
                maxLength={50}
              />
            </div>
          )}
          {error && <p className="mb-4 text-sm text-red-400">{error}</p>}
          <div className="mt-6 flex justify-end gap-2">
            <button type="button" className={btnBase} onClick={onClose}>
              Cancel
            </button>
            <button type="button" type="submit" className={btnCreate} disabled={saving}>
              {saving ? 'Saving…' : mode === 'create' ? 'Create' : 'Save Changes'}
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export default UserManagement
