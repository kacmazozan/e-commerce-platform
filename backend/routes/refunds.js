const express = require('express')
const pool = require('../db')
const authenticate = require('../middleware/auth')

const router = express.Router()
router.use(authenticate)

router.post('/', async (req, res) => {
  const { order_item_id, reason } = req.body
  if (!order_item_id) {
    return res.status(400).json({ error: 'order_item_id is required' })
  }

  try {
    const { rows } = await pool.query(
      `SELECT oi.id, oi.quantity, oi.price, o.created_at, o.status
       FROM order_items oi
       JOIN orders o ON o.id = oi.order_id
       WHERE oi.id = $1 AND o.user_id = $2`,
      [order_item_id, req.user.userId]
    )
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Order item not found' })
    }

    const item = rows[0]

    if (item.status !== 'delivered') {
      return res.status(400).json({ error: 'Order must be delivered to request a refund' })
    }

    const ageMs = Date.now() - new Date(item.created_at).getTime()
    if (ageMs > 30 * 24 * 60 * 60 * 1000) {
      return res.status(400).json({ error: 'Refund window expired (30 days)' })
    }

    const insert = await pool.query(
      `INSERT INTO refunds (order_item_id, user_id, status, refund_amount, reason)
       SELECT $1, $2, 'pending', (price * quantity)::numeric(10,2), $3
       FROM order_items WHERE id = $1
       ON CONFLICT (order_item_id) DO NOTHING
       RETURNING id, status, refund_amount, reason, requested_at`,
      [order_item_id, req.user.userId, reason || null]
    )

    if (insert.rows.length === 0) {
      return res.status(409).json({ error: 'Refund already requested for this item' })
    }

    res.status(201).json({ refund: { order_item_id, ...insert.rows[0] } })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

router.get('/', async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT r.id, r.order_item_id, o.id AS order_id, p.name AS product_name,
              r.status, r.refund_amount, r.reason, r.requested_at, r.updated_at
       FROM refunds r
       JOIN order_items oi ON oi.id = r.order_item_id
       JOIN orders o ON o.id = oi.order_id
       JOIN products p ON p.id = oi.product_id
       WHERE r.user_id = $1
       ORDER BY r.requested_at DESC`,
      [req.user.userId]
    )
    res.json({ refunds: rows })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

router.delete('/:id', async (req, res) => {
  const refundId = parseInt(req.params.id, 10)
  if (!refundId) {
    return res.status(400).json({ error: 'Invalid refund id' })
  }

  try {
    const { rows } = await pool.query(
      'SELECT id, status FROM refunds WHERE id = $1 AND user_id = $2',
      [refundId, req.user.userId]
    )
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Refund request not found' })
    }

    if (rows[0].status !== 'pending') {
      return res.status(409).json({ error: `Cannot cancel a ${rows[0].status} refund request` })
    }

    await pool.query('DELETE FROM refunds WHERE id = $1 AND user_id = $2', [
      refundId,
      req.user.userId,
    ])
    res.status(204).send()
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

module.exports = router
