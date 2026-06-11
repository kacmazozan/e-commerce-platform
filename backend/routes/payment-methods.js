const express = require('express')
const authenticate = require('../middleware/auth')
const pool = require('../db')
const {
  insertPaymentMethod,
  normalizeCardPayload,
  publicPaymentMethod,
} = require('../services/payment-methods')

const router = express.Router()
router.use(authenticate)

function requireCustomer(req, res) {
  if (req.user.role !== 'customer') {
    res.status(403).json({ error: 'Only customers can manage payment methods' })
    return false
  }
  return true
}

// GET /api/payment-methods
router.get('/', async (req, res) => {
  if (!requireCustomer(req, res)) return

  const result = await pool.query(
    `SELECT *
     FROM customer_payment_methods
     WHERE user_id = $1
     ORDER BY is_default DESC, created_at DESC`,
    [req.user.userId]
  )

  res.json({ paymentMethods: result.rows.map(publicPaymentMethod) })
})

// POST /api/payment-methods
router.post('/', async (req, res) => {
  if (!requireCustomer(req, res)) return

  const normalized = normalizeCardPayload(req.body, { requireCvv: false })
  if (normalized.error) {
    return res.status(400).json({ error: normalized.error })
  }

  let client
  try {
    client = await pool.connect()
    await client.query('BEGIN')

    const duplicate = await client.query(
      `SELECT id
       FROM customer_payment_methods
       WHERE user_id = $1 AND fingerprint_hash = $2`,
      [req.user.userId, normalized.card.fingerprint]
    )
    if (duplicate.rows.length > 0) {
      await client.query('ROLLBACK')
      return res.status(409).json({ error: 'This card is already saved' })
    }

    const countResult = await client.query(
      'SELECT COUNT(*)::int AS count FROM customer_payment_methods WHERE user_id = $1',
      [req.user.userId]
    )
    const makeDefault =
      Boolean(req.body.makeDefault) || Number(countResult.rows[0]?.count ?? 0) === 0
    const row = await insertPaymentMethod(client, req.user.userId, normalized.card, { makeDefault })

    await client.query('COMMIT')
    res.status(201).json({ paymentMethod: publicPaymentMethod(row) })
  } catch (err) {
    if (client) await client.query('ROLLBACK')
    throw err
  } finally {
    if (client) client.release()
  }
})

// PATCH /api/payment-methods/:id/default
router.patch('/:id/default', async (req, res) => {
  if (!requireCustomer(req, res)) return

  const paymentMethodId = Number(req.params.id)
  if (!Number.isInteger(paymentMethodId) || paymentMethodId <= 0) {
    return res.status(400).json({ error: 'Invalid payment method ID' })
  }

  let client
  try {
    client = await pool.connect()
    await client.query('BEGIN')
    const existing = await client.query(
      'SELECT id FROM customer_payment_methods WHERE id = $1 AND user_id = $2',
      [paymentMethodId, req.user.userId]
    )
    if (existing.rows.length === 0) {
      await client.query('ROLLBACK')
      return res.status(404).json({ error: 'Payment method not found' })
    }

    await client.query(
      'UPDATE customer_payment_methods SET is_default = FALSE WHERE user_id = $1',
      [req.user.userId]
    )
    const result = await client.query(
      `UPDATE customer_payment_methods
       SET is_default = TRUE, updated_at = NOW()
       WHERE id = $1 AND user_id = $2
       RETURNING *`,
      [paymentMethodId, req.user.userId]
    )

    await client.query('COMMIT')
    res.json({ paymentMethod: publicPaymentMethod(result.rows[0]) })
  } catch (err) {
    if (client) await client.query('ROLLBACK')
    throw err
  } finally {
    if (client) client.release()
  }
})

// DELETE /api/payment-methods/:id
router.delete('/:id', async (req, res) => {
  if (!requireCustomer(req, res)) return

  const paymentMethodId = Number(req.params.id)
  if (!Number.isInteger(paymentMethodId) || paymentMethodId <= 0) {
    return res.status(400).json({ error: 'Invalid payment method ID' })
  }

  let client
  try {
    client = await pool.connect()
    await client.query('BEGIN')
    const deleted = await client.query(
      `DELETE FROM customer_payment_methods
       WHERE id = $1 AND user_id = $2
       RETURNING is_default`,
      [paymentMethodId, req.user.userId]
    )
    if (deleted.rows.length === 0) {
      await client.query('ROLLBACK')
      return res.status(404).json({ error: 'Payment method not found' })
    }

    if (deleted.rows[0].is_default) {
      await client.query(
        `UPDATE customer_payment_methods
         SET is_default = TRUE, updated_at = NOW()
         WHERE id = (
           SELECT id
           FROM customer_payment_methods
           WHERE user_id = $1
           ORDER BY created_at DESC
           LIMIT 1
         )`,
        [req.user.userId]
      )
    }

    await client.query('COMMIT')
    res.json({ message: 'Payment method deleted' })
  } catch (err) {
    if (client) await client.query('ROLLBACK')
    throw err
  } finally {
    if (client) client.release()
  }
})

module.exports = router
