const express = require('express')
const crypto = require('crypto')
const bcrypt = require('bcrypt')
const jwt = require('jsonwebtoken')
const pool = require('../db')
const authenticate = require('../middleware/auth')
const { sendMail } = require('../services/mailer')

const router = express.Router()

const PASSWORD_MIN_LENGTH = 8
const EMAIL_VERIFICATION_TTL_MS = 24 * 60 * 60 * 1000
const PASSWORD_RESET_TTL_MS = 60 * 60 * 1000

function normalizeEmail(email) {
  return String(email || '')
    .trim()
    .toLowerCase()
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

function createToken() {
  return crypto.randomBytes(32).toString('base64url')
}

function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex')
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (char) => {
    const chars = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;',
    }
    return chars[char]
  })
}

function createJwt(user) {
  return jwt.sign({ userId: user.id, email: user.email, role: user.role }, process.env.JWT_SECRET, {
    expiresIn: '7d',
  })
}

function appUrl(path, token) {
  const base = process.env.FRONTEND_URL || 'http://localhost:5173'
  const url = new URL(path, base)
  url.searchParams.set('token', token)
  return url.toString()
}

function renderVerificationEmail({ email, name, verificationUrl }) {
  const greeting = name ? `Hi ${name},` : 'Hi,'
  const safeGreeting = escapeHtml(greeting)
  const safeEmail = escapeHtml(email)
  const safeVerificationUrl = escapeHtml(verificationUrl)
  return {
    subject: 'Verify your Fier account',
    text: `${greeting}\n\nVerify your email address to finish creating your Fier account:\n${verificationUrl}\n\nThis link expires in 24 hours. If you did not create this account, you can ignore this email.`,
    html: `
      <div style="font-family:Arial,sans-serif;line-height:1.6;color:#111">
        <p>${safeGreeting}</p>
        <p>Verify your email address to finish creating your Fier account.</p>
        <p>
          <a href="${safeVerificationUrl}" style="display:inline-block;background:#a855f7;color:#fff;text-decoration:none;padding:10px 16px;border-radius:8px">
            Verify email
          </a>
        </p>
        <p>This link expires in 24 hours.</p>
        <p style="color:#666;font-size:13px">This message was sent to ${safeEmail}. If you did not create this account, you can ignore this email.</p>
      </div>
    `,
  }
}

function renderPasswordResetEmail({ email, resetUrl }) {
  const safeEmail = escapeHtml(email)
  const safeResetUrl = escapeHtml(resetUrl)
  return {
    subject: 'Reset your Fier password',
    text: `Use this link to reset your Fier password:\n${resetUrl}\n\nThis link expires in 1 hour. If you did not request a password reset, you can ignore this email.`,
    html: `
      <div style="font-family:Arial,sans-serif;line-height:1.6;color:#111">
        <p>Use the link below to reset your Fier password.</p>
        <p>
          <a href="${safeResetUrl}" style="display:inline-block;background:#a855f7;color:#fff;text-decoration:none;padding:10px 16px;border-radius:8px">
            Reset password
          </a>
        </p>
        <p>This link expires in 1 hour.</p>
        <p style="color:#666;font-size:13px">This message was sent to ${safeEmail}. If you did not request a password reset, you can ignore this email.</p>
      </div>
    `,
  }
}

function renderEmailChangeApprovalEmail({ oldEmail, newEmail, approvalUrl }) {
  const safeOldEmail = escapeHtml(oldEmail)
  const safeNewEmail = escapeHtml(newEmail)
  const safeApprovalUrl = escapeHtml(approvalUrl)
  return {
    subject: 'Approve your Fier email change',
    text: `We received a request to change your Fier account email from ${oldEmail} to ${newEmail}.\n\nIf this was you, approve the change here:\n${approvalUrl}\n\nThis link expires in 1 hour. If you did not request this, you can ignore this email and your account will stay as is.`,
    html: `
      <div style="font-family:Arial,sans-serif;line-height:1.6;color:#111">
        <p>We received a request to change your Fier account email from <strong>${safeOldEmail}</strong> to <strong>${safeNewEmail}</strong>.</p>
        <p>If this was you, approve the change:</p>
        <p>
          <a href="${safeApprovalUrl}" style="display:inline-block;background:#a855f7;color:#fff;text-decoration:none;padding:10px 16px;border-radius:8px">
            Approve email change
          </a>
        </p>
        <p>This link expires in 1 hour. If you did not request this, you can ignore this email — your account will stay as is.</p>
      </div>
    `,
  }
}

function renderEmailChangeVerifyEmail({ newEmail, verifyUrl }) {
  const safeNewEmail = escapeHtml(newEmail)
  const safeVerifyUrl = escapeHtml(verifyUrl)
  return {
    subject: 'Verify your new Fier email',
    text: `Confirm that ${newEmail} belongs to you to finish moving your Fier account:\n${verifyUrl}\n\nThis link expires in 1 hour. If you did not request this, you can ignore this email.`,
    html: `
      <div style="font-family:Arial,sans-serif;line-height:1.6;color:#111">
        <p>Confirm that <strong>${safeNewEmail}</strong> belongs to you to finish moving your Fier account.</p>
        <p>
          <a href="${safeVerifyUrl}" style="display:inline-block;background:#a855f7;color:#fff;text-decoration:none;padding:10px 16px;border-radius:8px">
            Verify new email
          </a>
        </p>
        <p>This link expires in 1 hour. If you did not request this, you can ignore this email.</p>
      </div>
    `,
  }
}

async function storeEmailVerificationToken(userId) {
  const token = createToken()
  const tokenHash = hashToken(token)
  const expiresAt = new Date(Date.now() + EMAIL_VERIFICATION_TTL_MS)

  await pool.query(
    `UPDATE auth.users
     SET email_verification_token_hash = $1, email_verification_expires_at = $2
     WHERE id = $3`,
    [tokenHash, expiresAt, userId]
  )

  return token
}

async function sendVerificationEmail({ userId, email, name }) {
  const token = await storeEmailVerificationToken(userId)
  const verificationUrl = appUrl('/verify-email', token)
  const message = renderVerificationEmail({ email, name, verificationUrl })
  await sendMail({ to: email, ...message })
}

async function sendPasswordResetEmail({ userId, email }) {
  const token = createToken()
  const tokenHash = hashToken(token)
  const expiresAt = new Date(Date.now() + PASSWORD_RESET_TTL_MS)

  await pool.query(
    `UPDATE auth.users
     SET password_reset_token_hash = $1, reset_token_expires_at = $2
     WHERE id = $3`,
    [tokenHash, expiresAt, userId]
  )

  const resetUrl = appUrl('/reset-password', token)
  const message = renderPasswordResetEmail({ email, resetUrl })
  await sendMail({ to: email, ...message })
}

router.post('/register', async (req, res) => {
  const email = normalizeEmail(req.body.email)
  const { password, name } = req.body

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' })
  }

  if (!isValidEmail(email)) {
    return res.status(400).json({ error: 'A valid email address is required' })
  }

  if (password.length < PASSWORD_MIN_LENGTH) {
    return res.status(400).json({ error: 'Password must be at least 8 characters' })
  }

  const existing = await pool.query('SELECT id FROM auth.users WHERE email = $1', [email])
  if (existing.rows.length > 0) {
    return res.status(409).json({ error: 'Email already in use' })
  }

  const password_hash = await bcrypt.hash(password, 10)
  const verificationToken = createToken()
  const verificationTokenHash = hashToken(verificationToken)
  const verificationExpiresAt = new Date(Date.now() + EMAIL_VERIFICATION_TTL_MS)

  const client = await pool.connect()
  let user
  let displayName
  try {
    await client.query('BEGIN')
    const result = await client.query(
      `INSERT INTO auth.users (
        email,
        password_hash,
        role,
        email_verification_token_hash,
        email_verification_expires_at
      )
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id, email, role`,
      [email, password_hash, 'customer', verificationTokenHash, verificationExpiresAt]
    )
    user = result.rows[0]

    displayName = (name && name.trim()) || email.split('@')[0]
    await client.query(
      'INSERT INTO auth.customers (customer_id, name, tax_id, home_address) VALUES ($1, $2, $3, $4)',
      [user.id, displayName, null, '']
    )
    await client.query('COMMIT')
  } catch (err) {
    await client.query('ROLLBACK')
    throw err
  } finally {
    client.release()
  }

  let emailSent = true
  try {
    const verificationUrl = appUrl('/verify-email', verificationToken)
    const message = renderVerificationEmail({
      email: user.email,
      name: displayName,
      verificationUrl,
    })
    await sendMail({ to: user.email, ...message })
  } catch (err) {
    emailSent = false
    console.error('Failed to send verification email:', err)
  }

  res.status(201).json({
    message: emailSent
      ? 'Account created. Please check your email to verify your account.'
      : 'Account created, but the verification email could not be sent. Request a new verification email before signing in.',
    email: user.email,
    emailSent,
  })
})

router.post('/login', async (req, res) => {
  const email = normalizeEmail(req.body.email)
  const { password } = req.body

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' })
  }

  const result = await pool.query(
    `SELECT id,
            email,
            password_hash,
            role,
            email_verified_at,
            email_verification_expires_at
     FROM auth.users
     WHERE email = $1`,
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

  if (user.role === 'customer' && !user.email_verified_at) {
    const hasActiveVerificationLink =
      user.email_verification_expires_at &&
      new Date(user.email_verification_expires_at).getTime() > Date.now()

    if (hasActiveVerificationLink) {
      return res.status(403).json({
        code: 'EMAIL_NOT_VERIFIED',
        error: 'Please verify your email before signing in. Use the verification link we sent.',
        email: user.email,
      })
    }

    try {
      await sendVerificationEmail({ userId: user.id, email: user.email })
    } catch (err) {
      console.error('Failed to send verification email during login:', err)
      return res.status(503).json({
        code: 'EMAIL_NOT_VERIFIED',
        error:
          'Please verify your email before signing in. We could not send a new verification email right now.',
        email: user.email,
      })
    }

    return res.status(403).json({
      code: 'EMAIL_NOT_VERIFIED',
      error: 'Please verify your email before signing in. We sent you a new verification link.',
      email: user.email,
    })
  }

  res.status(200).json({ token: createJwt(user) })
})

router.post('/verify-email', async (req, res) => {
  const { token } = req.body

  if (!token) {
    return res.status(400).json({ error: 'Verification token is required' })
  }

  const tokenHash = hashToken(token)
  const result = await pool.query(
    `UPDATE auth.users
     SET email_verified_at = NOW(),
         email_verification_token_hash = NULL,
         email_verification_expires_at = NULL
     WHERE email_verification_token_hash = $1
       AND email_verification_expires_at > NOW()
     RETURNING id, email, role`,
    [tokenHash]
  )

  if (result.rows.length === 0) {
    return res.status(400).json({ error: 'Invalid or expired verification token' })
  }

  res.json({ message: 'Email verified successfully. You can now sign in.' })
})

router.post('/resend-verification', async (req, res) => {
  const email = normalizeEmail(req.body.email)

  if (!email) {
    return res.status(400).json({ error: 'Email is required' })
  }

  if (!isValidEmail(email)) {
    return res.status(400).json({ error: 'A valid email address is required' })
  }

  const result = await pool.query(
    'SELECT id, email, role, email_verified_at FROM auth.users WHERE email = $1',
    [email]
  )
  const user = result.rows[0]

  if (user && user.role === 'customer' && !user.email_verified_at) {
    try {
      await sendVerificationEmail({ userId: user.id, email: user.email })
    } catch (err) {
      console.error('Failed to resend verification email:', err)
    }
  }

  res.json({ message: 'If that account needs verification, a new link has been sent.' })
})

// Get the signed-in user's profile
router.get('/me', authenticate, async (req, res) => {
  const result = await pool.query(
    `SELECT u.id, u.email, u.role, u.pending_email, c.name, c.home_address, c.tax_id
     FROM auth.users u
     LEFT JOIN auth.customers c ON c.customer_id = u.id
     WHERE u.id = $1`,
    [req.user.userId]
  )
  const profile = result.rows[0]

  if (!profile) {
    return res.status(404).json({ error: 'User not found' })
  }

  res.json(profile)
})

// Update the signed-in customer's profile (display name + tax id)
router.put('/me', authenticate, async (req, res) => {
  if (req.user.role !== 'customer') {
    return res.status(403).json({ error: 'Only customers can update their profile here' })
  }

  const name = typeof req.body.name === 'string' ? req.body.name.trim() : ''
  if (!name) {
    return res.status(400).json({ error: 'Name is required' })
  }
  if (name.length > 100) {
    return res.status(400).json({ error: 'Name must be 100 characters or fewer' })
  }

  let taxId
  if (Object.prototype.hasOwnProperty.call(req.body, 'tax_id')) {
    const raw = req.body.tax_id
    if (raw === null || raw === '') {
      taxId = null
    } else if (typeof raw === 'string') {
      const trimmed = raw.trim()
      if (trimmed.length > 50) {
        return res.status(400).json({ error: 'Tax ID must be 50 characters or fewer' })
      }
      taxId = trimmed === '' ? null : trimmed
    } else {
      return res.status(400).json({ error: 'Tax ID must be a string' })
    }
  } else {
    // Preserve existing value when caller omits the field.
    const current = await pool.query('SELECT tax_id FROM auth.customers WHERE customer_id = $1', [
      req.user.userId,
    ])
    taxId = current.rows[0]?.tax_id ?? null
  }

  const result = await pool.query(
    `UPDATE auth.customers SET name = $1, tax_id = $2
     WHERE customer_id = $3
     RETURNING customer_id, name, home_address, tax_id`,
    [name, taxId, req.user.userId]
  )

  if (result.rows.length === 0) {
    return res.status(404).json({ error: 'Customer profile not found' })
  }

  res.json({
    id: req.user.userId,
    email: req.user.email,
    role: req.user.role,
    name: result.rows[0].name,
    home_address: result.rows[0].home_address,
    tax_id: result.rows[0].tax_id,
  })
})

const EMAIL_CHANGE_TTL_MS = 60 * 60 * 1000

// Request an email change — sends approval link to old email and verification to new email.
router.post('/email-change/request', authenticate, async (req, res) => {
  if (req.user.role !== 'customer') {
    return res.status(403).json({ error: 'Only customers can change their email here' })
  }

  const newEmail = normalizeEmail(req.body.newEmail)
  const { currentPassword } = req.body

  if (!newEmail || !currentPassword) {
    return res.status(400).json({ error: 'New email and current password are required' })
  }
  if (!isValidEmail(newEmail)) {
    return res.status(400).json({ error: 'A valid email address is required' })
  }

  const userResult = await pool.query(
    'SELECT id, email, password_hash FROM auth.users WHERE id = $1',
    [req.user.userId]
  )
  const user = userResult.rows[0]
  if (!user) {
    return res.status(404).json({ error: 'User not found' })
  }
  if (newEmail === user.email) {
    return res.status(400).json({ error: 'New email matches your current email' })
  }

  const passwordMatch = await bcrypt.compare(currentPassword, user.password_hash)
  if (!passwordMatch) {
    return res.status(401).json({ error: 'Current password is incorrect' })
  }

  const taken = await pool.query('SELECT 1 FROM auth.users WHERE email = $1 AND id <> $2', [
    newEmail,
    user.id,
  ])
  if (taken.rows.length > 0) {
    return res.status(409).json({ error: 'That email is already in use' })
  }

  const oldToken = createToken()
  const newToken = createToken()
  const oldTokenHash = hashToken(oldToken)
  const newTokenHash = hashToken(newToken)
  const expiresAt = new Date(Date.now() + EMAIL_CHANGE_TTL_MS)

  await pool.query(
    `UPDATE auth.users
     SET pending_email = $1,
         email_change_old_token_hash = $2,
         email_change_new_token_hash = $3,
         email_change_old_confirmed_at = NULL,
         email_change_new_confirmed_at = NULL,
         email_change_expires_at = $4
     WHERE id = $5`,
    [newEmail, oldTokenHash, newTokenHash, expiresAt, user.id]
  )

  const approvalUrl = appUrl('/account/email-change?step=old', oldToken)
  const verifyUrl = appUrl('/account/email-change?step=new', newToken)

  try {
    await sendMail({
      to: user.email,
      ...renderEmailChangeApprovalEmail({ oldEmail: user.email, newEmail, approvalUrl }),
    })
    await sendMail({
      to: newEmail,
      ...renderEmailChangeVerifyEmail({ newEmail, verifyUrl }),
    })
  } catch (err) {
    console.error('Failed to send email-change verification messages:', err)
    return res.status(503).json({
      error: 'Could not send verification emails. Please try again in a few minutes.',
    })
  }

  res.json({
    message: 'Verification emails sent. Both links must be clicked within 1 hour.',
    pending_email: newEmail,
  })
})

// Confirm one half of an email change (step=old or step=new). When both are confirmed, swap.
router.post('/email-change/confirm', async (req, res) => {
  const { step, token } = req.body

  if (!token || (step !== 'old' && step !== 'new')) {
    return res.status(400).json({ error: 'Invalid request' })
  }

  const column = step === 'old' ? 'email_change_old_token_hash' : 'email_change_new_token_hash'
  const stampColumn =
    step === 'old' ? 'email_change_old_confirmed_at' : 'email_change_new_confirmed_at'

  const tokenHash = hashToken(token)
  const lookup = await pool.query(
    `SELECT id, pending_email,
            email_change_old_confirmed_at,
            email_change_new_confirmed_at
     FROM auth.users
     WHERE ${column} = $1
       AND email_change_expires_at > NOW()`,
    [tokenHash]
  )
  const row = lookup.rows[0]
  if (!row) {
    return res.status(400).json({ error: 'Invalid or expired token' })
  }

  await pool.query(`UPDATE auth.users SET ${stampColumn} = NOW() WHERE id = $1`, [row.id])

  const otherConfirmedAt =
    step === 'old' ? row.email_change_new_confirmed_at : row.email_change_old_confirmed_at

  if (!otherConfirmedAt) {
    return res.json({ confirmed: step, complete: false })
  }

  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    const stillFree = await client.query('SELECT 1 FROM auth.users WHERE email = $1 AND id <> $2', [
      row.pending_email,
      row.id,
    ])
    if (stillFree.rows.length > 0) {
      await client.query('ROLLBACK')
      return res.status(409).json({ error: 'That email was claimed by another account' })
    }

    await client.query(
      `UPDATE auth.users
       SET email = pending_email,
           email_verified_at = NOW(),
           pending_email = NULL,
           email_change_old_token_hash = NULL,
           email_change_new_token_hash = NULL,
           email_change_old_confirmed_at = NULL,
           email_change_new_confirmed_at = NULL,
           email_change_expires_at = NULL
       WHERE id = $1`,
      [row.id]
    )
    await client.query('COMMIT')
  } catch (err) {
    await client.query('ROLLBACK')
    throw err
  } finally {
    client.release()
  }

  // Note: existing JWTs still encode the old email until they expire (7 days).
  // The frontend logs the user out on `complete: true` so they re-login with the new email.
  res.json({ confirmed: step, complete: true })
})

// Cancel a pending email change for the signed-in user.
router.post('/email-change/cancel', authenticate, async (req, res) => {
  await pool.query(
    `UPDATE auth.users
     SET pending_email = NULL,
         email_change_old_token_hash = NULL,
         email_change_new_token_hash = NULL,
         email_change_old_confirmed_at = NULL,
         email_change_new_confirmed_at = NULL,
         email_change_expires_at = NULL
     WHERE id = $1`,
    [req.user.userId]
  )
  res.json({ message: 'Pending email change cancelled' })
})

// Change password (authenticated)
router.put('/change-password', authenticate, async (req, res) => {
  const { currentPassword, newPassword } = req.body

  if (!currentPassword || !newPassword) {
    return res.status(400).json({ error: 'Current password and new password are required' })
  }

  if (newPassword.length < PASSWORD_MIN_LENGTH) {
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
  await pool.query(
    `UPDATE auth.users
     SET password_hash = $1,
         password_reset_token_hash = NULL,
         reset_token_expires_at = NULL
     WHERE id = $2`,
    [newHash, req.user.userId]
  )

  res.json({ message: 'Password updated successfully' })
})

// Forgot password - generate reset token and email it
router.post('/forgot-password', async (req, res) => {
  const email = normalizeEmail(req.body.email)

  if (!email) {
    return res.status(400).json({ error: 'Email is required' })
  }

  if (!isValidEmail(email)) {
    return res.status(400).json({ error: 'A valid email address is required' })
  }

  const result = await pool.query('SELECT id, email FROM auth.users WHERE email = $1', [email])
  const user = result.rows[0]

  if (user) {
    try {
      await sendPasswordResetEmail({ userId: user.id, email: user.email })
    } catch (err) {
      console.error('Failed to send password reset email:', err)
    }
  }

  res.json({ message: 'If that email is registered, a reset link has been sent.' })
})

// Reset password - validate token and set new password
router.post('/reset-password', async (req, res) => {
  const { token, newPassword } = req.body

  if (!token || !newPassword) {
    return res.status(400).json({ error: 'Token and new password are required' })
  }

  if (newPassword.length < PASSWORD_MIN_LENGTH) {
    return res.status(400).json({ error: 'Password must be at least 8 characters' })
  }

  const tokenHash = hashToken(token)
  const result = await pool.query(
    `SELECT id
     FROM auth.users
     WHERE password_reset_token_hash = $1
       AND reset_token_expires_at > NOW()`,
    [tokenHash]
  )
  const user = result.rows[0]

  if (!user) {
    return res.status(400).json({ error: 'Invalid or expired reset token' })
  }

  const hash = await bcrypt.hash(newPassword, 10)
  await pool.query(
    `UPDATE auth.users
     SET password_hash = $1,
         password_reset_token_hash = NULL,
         reset_token_expires_at = NULL
     WHERE id = $2`,
    [hash, user.id]
  )

  res.json({ message: 'Password has been reset successfully' })
})

module.exports = router
