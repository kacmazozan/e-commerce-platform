const express = require('express')
const bcrypt = require('bcrypt')
const authenticate = require('../middleware/auth')
const requireAdmin = require('../middleware/admin')
const pool = require('../db')
const { decryptField, encryptField } = require('../services/secure-fields')

const router = express.Router()

function serializeUser(user) {
  return {
    ...user,
    tax_id: decryptField(user.tax_id),
  }
}

// All admin routes require authentication + admin role
router.use(authenticate)
router.use(requireAdmin)

// GET /api/admin/me — verify admin session and return admin profile
router.get('/me', async (req, res) => {
  const result = await pool.query(
    'SELECT id, email, role, created_at FROM auth.users WHERE id = $1',
    [req.user.userId]
  )
  const user = result.rows[0]

  if (!user) {
    return res.status(404).json({ error: 'User not found' })
  }

  res.json({ user })
})

// ─── User Management ────────────────────────────────────────────────

// GET /api/admin/users — list users with pagination and search
router.get('/users', async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page) || 1)
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 10))
  const offset = (page - 1) * limit
  const search = (req.query.search || '').trim()
  const role = (req.query.role || '').trim()

  let where = []
  let params = []
  let idx = 1

  if (search) {
    where.push(`email ILIKE $${idx}`)
    params.push(`%${search}%`)
    idx++
  }

  const validRoles = ['customer', 'sales_manager', 'product_manager', 'admin']
  if (role && validRoles.includes(role)) {
    where.push(`role = $${idx}::auth.user_role`)
    params.push(role)
    idx++
  }

  const whereClause = where.length ? `WHERE ${where.join(' AND ')}` : ''

  const countResult = await pool.query(`SELECT COUNT(*) FROM auth.users ${whereClause}`, params)
  const total = parseInt(countResult.rows[0].count)

  const dataWhereClause = where.length ? `WHERE ${where.map((w) => `u.${w}`).join(' AND ')}` : ''
  const dataResult = await pool.query(
    `SELECT u.id, u.email, u.role, u.created_at, c.tax_id, c.name
       FROM auth.users u
       LEFT JOIN auth.customers c ON c.customer_id = u.id
       ${dataWhereClause}
       ORDER BY u.created_at DESC LIMIT $${idx} OFFSET $${idx + 1}`,
    [...params, limit, offset]
  )

  res.json({
    users: dataResult.rows.map(serializeUser),
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  })
})

// GET /api/admin/users/:id — get single user
router.get('/users/:id', async (req, res) => {
  const result = await pool.query(
    `SELECT u.id, u.email, u.role, u.created_at, c.tax_id, c.name
       FROM auth.users u
       LEFT JOIN auth.customers c ON c.customer_id = u.id
       WHERE u.id = $1`,
    [req.params.id]
  )

  if (result.rows.length === 0) {
    return res.status(404).json({ error: 'User not found' })
  }

  res.json({ user: serializeUser(result.rows[0]) })
})

// POST /api/admin/users — create a new user
router.post('/users', async (req, res) => {
  const { email, password, role } = req.body

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' })
  }

  if (password.length < 8) {
    return res.status(400).json({ error: 'Password must be at least 8 characters' })
  }

  const validRoles = ['customer', 'sales_manager', 'product_manager', 'admin']
  const userRole = validRoles.includes(role) ? role : 'customer'

  const existing = await pool.query('SELECT id FROM auth.users WHERE email = $1', [email])
  if (existing.rows.length > 0) {
    return res.status(409).json({ error: 'Email already in use' })
  }

  const hash = await bcrypt.hash(password, 10)
  const result = await pool.query(
    'INSERT INTO auth.users (email, password_hash, role) VALUES ($1, $2, $3::auth.user_role) RETURNING id, email, role, created_at',
    [email, hash, userRole]
  )

  res.status(201).json({ user: result.rows[0] })
})

// PUT /api/admin/users/:id — update user (email, role, optional password, tax_id)
router.put('/users/:id', async (req, res) => {
  const { email, role, password } = req.body
  const userId = req.params.id

  const existing = await pool.query('SELECT id, role FROM auth.users WHERE id = $1', [userId])
  if (existing.rows.length === 0) {
    return res.status(404).json({ error: 'User not found' })
  }

  // Prevent admin from demoting themselves
  if (parseInt(userId) === req.user.userId && role && role !== 'admin') {
    return res.status(400).json({ error: 'You cannot change your own role' })
  }

  // Validate tax_id up front so we can fail fast before any UPDATE.
  let taxIdProvided = false
  let taxIdValue = null
  if (Object.prototype.hasOwnProperty.call(req.body, 'tax_id')) {
    taxIdProvided = true
    const raw = req.body.tax_id
    if (raw === null || raw === '') {
      taxIdValue = null
    } else if (typeof raw === 'string') {
      const trimmed = raw.trim()
      if (trimmed.length > 50) {
        return res.status(400).json({ error: 'Tax ID must be 50 characters or fewer' })
      }
      taxIdValue = trimmed === '' ? null : trimmed
    } else {
      return res.status(400).json({ error: 'Tax ID must be a string' })
    }
  }

  const validRoles = ['customer', 'sales_manager', 'product_manager', 'admin']
  let sets = []
  let params = []
  let idx = 1

  if (email) {
    const dup = await pool.query('SELECT id FROM auth.users WHERE email = $1 AND id != $2', [
      email,
      userId,
    ])
    if (dup.rows.length > 0) {
      return res.status(409).json({ error: 'Email already in use' })
    }
    sets.push(`email = $${idx}`)
    params.push(email)
    idx++
  }

  if (role && validRoles.includes(role)) {
    sets.push(`role = $${idx}::auth.user_role`)
    params.push(role)
    idx++
  }

  if (password) {
    if (password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters' })
    }
    const hash = await bcrypt.hash(password, 10)
    sets.push(`password_hash = $${idx}`)
    params.push(hash)
    idx++
  }

  if (sets.length === 0 && !taxIdProvided) {
    return res.status(400).json({ error: 'No fields to update' })
  }

  const client = await pool.connect()
  try {
    await client.query('BEGIN')

    let userRow = existing.rows[0]
    if (sets.length > 0) {
      params.push(userId)
      const updResult = await client.query(
        `UPDATE auth.users SET ${sets.join(', ')} WHERE id = $${idx} RETURNING id, email, role, created_at`,
        params
      )
      userRow = updResult.rows[0]
    } else {
      const fetchResult = await client.query(
        'SELECT id, email, role, created_at FROM auth.users WHERE id = $1',
        [userId]
      )
      userRow = fetchResult.rows[0]
    }

    // tax_id only applies to customers — silently skip when the target user is
    // not a customer so admin UIs can post the same payload regardless of role.
    if (taxIdProvided && userRow.role === 'customer') {
      await client.query('UPDATE auth.customers SET tax_id = $1 WHERE customer_id = $2', [
        taxIdValue == null ? null : encryptField(taxIdValue),
        userId,
      ])
    }

    const finalResult = await client.query(
      `SELECT u.id, u.email, u.role, u.created_at, c.tax_id, c.name
         FROM auth.users u
         LEFT JOIN auth.customers c ON c.customer_id = u.id
         WHERE u.id = $1`,
      [userId]
    )

    await client.query('COMMIT')
    res.json({ user: serializeUser(finalResult.rows[0]) })
  } catch (err) {
    await client.query('ROLLBACK')
    throw err
  } finally {
    client.release()
  }
})

// DELETE /api/admin/users/:id — delete user
router.delete('/users/:id', async (req, res) => {
  const userId = req.params.id

  // Prevent admin from deleting themselves
  if (parseInt(userId) === req.user.userId) {
    return res.status(400).json({ error: 'You cannot delete your own account' })
  }

  const result = await pool.query('DELETE FROM auth.users WHERE id = $1 RETURNING id', [userId])
  if (result.rows.length === 0) {
    return res.status(404).json({ error: 'User not found' })
  }

  res.json({ message: 'User deleted successfully' })
})

module.exports = router
