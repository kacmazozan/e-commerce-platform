const express = require('express')
const authenticate = require('../middleware/auth')
const pool = require('../db')

const router = express.Router()
router.use(authenticate)

const RESERVATION_MINUTES = 10

// POST /api/checkout/reserve
// Soft-locks stock for every item in the user's cart.
// Returns { expires_at } on success, or 409 with unavailable items.
router.post('/reserve', async (req, res) => {
  const userId = req.user.userId

  const cartResult = await pool.query(
    'SELECT product_id, quantity FROM cart_items WHERE user_id = $1',
    [userId]
  )

  if (cartResult.rows.length === 0) {
    return res.status(400).json({ error: 'Cart is empty' })
  }

  const expiresAt = new Date(Date.now() + RESERVATION_MINUTES * 60 * 1000)
  const unavailable = []

  const client = await pool.connect()
  try {
    await client.query('BEGIN')

    for (const item of cartResult.rows) {
      // Purge stale reservations for this product then lock the row
      await client.query(
        'DELETE FROM stock_reservations WHERE product_id = $1 AND expires_at < NOW()',
        [item.product_id]
      )

      const productResult = await client.query(
        'SELECT name, stock FROM products WHERE id = $1 FOR UPDATE',
        [item.product_id]
      )

      if (productResult.rows.length === 0) {
        unavailable.push({
          product_id: item.product_id,
          name: 'Unknown',
          requested: item.quantity,
          available: 0,
        })
        continue
      }

      const { name, stock } = productResult.rows[0]

      const reservedResult = await client.query(
        `SELECT COALESCE(SUM(quantity), 0) AS reserved
         FROM stock_reservations
         WHERE product_id = $1 AND user_id != $2`,
        [item.product_id, userId]
      )
      const reservedByOthers = parseInt(reservedResult.rows[0].reserved)
      const available = stock - reservedByOthers

      if (available < item.quantity) {
        unavailable.push({
          product_id: item.product_id,
          name,
          requested: item.quantity,
          available: Math.max(0, available),
        })
      }
    }

    if (unavailable.length > 0) {
      await client.query('ROLLBACK')
      return res.status(409).json({ error: 'Some items are out of stock', unavailable })
    }

    for (const item of cartResult.rows) {
      await client.query(
        `INSERT INTO stock_reservations (user_id, product_id, quantity, expires_at)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT ON CONSTRAINT stock_reservations_user_product_unique
         DO UPDATE SET quantity = $3, reserved_at = NOW(), expires_at = $4`,
        [userId, item.product_id, item.quantity, expiresAt]
      )
    }

    await client.query('COMMIT')
    res.json({ expires_at: expiresAt.toISOString() })
  } catch (err) {
    await client.query('ROLLBACK')
    throw err
  } finally {
    client.release()
  }
})

// DELETE /api/checkout/reserve — release all reservations for this user
router.delete('/reserve', async (req, res) => {
  await pool.query('DELETE FROM stock_reservations WHERE user_id = $1', [req.user.userId])
  res.json({ message: 'Reservation released' })
})

// POST /api/checkout/confirm
// Body: { address } — verifies reservation still valid, hard-decrements stock, creates order, clears cart.
router.post('/confirm', async (req, res) => {
  const userId = req.user.userId
  const address = (req.body.address || '').trim() || null

  // Use reservations joined with products as the single source of truth for both
  // stock decrement and order item creation — avoids cart/reservation divergence.
  const reservations = await pool.query(
    `SELECT sr.product_id, sr.quantity, p.name, p.price
     FROM stock_reservations sr
     JOIN products p ON p.id = sr.product_id
     WHERE sr.user_id = $1 AND sr.expires_at > NOW()`,
    [userId]
  )

  if (reservations.rows.length === 0) {
    return res.status(409).json({ error: 'Reservation expired. Please restart checkout.' })
  }

  const client = await pool.connect()
  try {
    await client.query('BEGIN')

    for (const r of reservations.rows) {
      await client.query(
        'UPDATE products SET stock = stock - $1, updated_at = NOW() WHERE id = $2',
        [r.quantity, r.product_id]
      )
    }

    const total = reservations.rows.reduce(
      (sum, item) => sum + parseFloat(item.price) * item.quantity,
      0
    )

    const orderResult = await client.query(
      `INSERT INTO orders (user_id, status, total, address) VALUES ($1, 'pending', $2, $3) RETURNING id`,
      [userId, total.toFixed(2), address]
    )
    const orderId = orderResult.rows[0].id

    for (const item of reservations.rows) {
      await client.query(
        'INSERT INTO order_items (order_id, product_id, quantity, price) VALUES ($1, $2, $3, $4)',
        [orderId, item.product_id, item.quantity, item.price]
      )
    }

    await client.query('DELETE FROM cart_items WHERE user_id = $1', [userId])
    await client.query('DELETE FROM stock_reservations WHERE user_id = $1', [userId])

    await client.query('COMMIT')
    res.json({ order_id: orderId })
  } catch (err) {
    await client.query('ROLLBACK')
    throw err
  } finally {
    client.release()
  }
})

module.exports = router
