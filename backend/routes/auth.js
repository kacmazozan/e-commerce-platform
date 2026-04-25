const express = require('express')
const crypto = require('crypto')
const bcrypt = require('bcrypt')
const jwt = require('jsonwebtoken')
const pool = require('../db')
const authenticate = require('../middleware/auth')

const router = express.Router()

router.post('/register', async (req, res) => {
  const { email, password, name } = req.body

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' })
  }

  const existing = await pool.query('SELECT id FROM auth.users WHERE email = $1', [email])
  if (existing.rows.length > 0) {
    return res.status(409).json({ error: 'Email already in use' })
  }

  const password_hash = await bcrypt.hash(password, 10)

  const client = await pool.connect()
  let user
  try {
    await client.query('BEGIN')
    const result = await client.query(
      'INSERT INTO auth.users (email, password_hash, role) VALUES ($1, $2, $3) RETURNING id, email, role',
      [email, password_hash, 'customer']
    )
    user = result.rows[0]

    const displayName = (name && name.trim()) || email.split('@')[0]
    await client.query(
      'INSERT INTO auth.customers (customer_id, name, tax_id, home_address) VALUES ($1, $2, $3, $4)',
      [user.id, displayName, email, '']
    )
    await client.query('COMMIT')
  } catch (err) {
    await client.query('ROLLBACK')
    throw err
  } finally {
    client.release()
  }

  const token = jwt.sign(
    { userId: user.id, email: user.email, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  )

  res.status(201).json({ token })
})

router.post('/login', async (req, res) => {
  const { email, password } = req.body

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' })
  }

  const result = await pool.query(
    'SELECT id, email, password_hash, role FROM auth.users WHERE email = $1',
    [email]
  )
  const user = result.rows[0]

  if (!user) {
    return res.status(401).json({ error: 'Invalid credentials' })
  }

  const match = await bcrypt.compare(password, user.password_hash)
  if (!match) {
    return res.status(401).json({ error: 'Invalid credentials' })
  }

  const token = jwt.sign(
    { userId: user.id, email: user.email, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  )

  res.status(200).json({ token })
})

// Change password (authenticated)
router.put('/change-password', authenticate, async (req, res) => {
  const { currentPassword, newPassword } = req.body

  if (!currentPassword || !newPassword) {
    return res.status(400).json({ error: 'Current password and new password are required' })
  }

  if (newPassword.length < 8) {
    return res.status(400).json({ error: 'New password must be at least 8 characters' })
  }

  const result = await pool.query('SELECT password_hash FROM auth.users WHERE id = $1', [
    req.user.userId,
  ])
  const user = result.rows[0]

  if (!user) {
    return res.status(404).json({ error: 'User not found' })
  }

  const match = await bcrypt.compare(currentPassword, user.password_hash)
  if (!match) {
    return res.status(401).json({ error: 'Current password is incorrect' })
  }

  const newHash = await bcrypt.hash(newPassword, 10)
  await pool.query('UPDATE auth.users SET password_hash = $1 WHERE id = $2', [
    newHash,
    req.user.userId,
  ])

  res.json({ message: 'Password updated successfully' })
})

// Forgot password — generate reset token
router.post('/forgot-password', async (req, res) => {
  const { email } = req.body

  if (!email) {
    return res.status(400).json({ error: 'Email is required' })
  }

  // Always return success to prevent email enumeration
  const result = await pool.query('SELECT id FROM auth.users WHERE email = $1', [email])
  const user = result.rows[0]

  if (user) {
    const token = crypto.randomBytes(32).toString('hex')
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000) // 1 hour

    await pool.query(
      'UPDATE auth.users SET reset_token = $1, reset_token_expires_at = $2 WHERE id = $3',
      [token, expiresAt, user.id]
    )

    // In production, send an email. For dev, log the link.
    console.log(`[DEV] Password reset link: http://localhost:5173/reset-password?token=${token}`)
  }

  res.json({ message: 'If that email is registered, a reset link has been sent.' })
})

// Reset password — validate token and set new password
router.post('/reset-password', async (req, res) => {
  const { token, newPassword } = req.body

  if (!token || !newPassword) {
    return res.status(400).json({ error: 'Token and new password are required' })
  }

  if (newPassword.length < 8) {
    return res.status(400).json({ error: 'Password must be at least 8 characters' })
  }

  const result = await pool.query(
    'SELECT id FROM auth.users WHERE reset_token = $1 AND reset_token_expires_at > NOW()',
    [token]
  )
  const user = result.rows[0]

  if (!user) {
    return res.status(400).json({ error: 'Invalid or expired reset token' })
  }

  const hash = await bcrypt.hash(newPassword, 10)
  await pool.query(
    'UPDATE auth.users SET password_hash = $1, reset_token = NULL, reset_token_expires_at = NULL WHERE id = $2',
    [hash, user.id]
  )

  res.json({ message: 'Password has been reset successfully' })
})

module.exports = router
