const express = require('express')
const authenticate = require('../middleware/auth')
const pool = require('../db')

const router = express.Router()
router.use(authenticate)

// GET /api/orders — list current user's orders with their items
router.get('/', async (req, res) => {
  const userId = req.user.userId

  const ordersResult = await pool.query(
    `SELECT id, status, total, address, created_at
     FROM orders
     WHERE user_id = $1
     ORDER BY created_at DESC`,
    [userId]
  )

  if (ordersResult.rows.length === 0) {
    return res.json({ orders: [] })
  }

  const orderIds = ordersResult.rows.map((o) => o.id)

  const itemsResult = await pool.query(
    `SELECT oi.order_id, oi.quantity, oi.price, oi.size,
            p.id AS product_id, p.name AS product_name
     FROM order_items oi
     JOIN products p ON p.id = oi.product_id
     WHERE oi.order_id = ANY($1)
     ORDER BY oi.id`,
    [orderIds]
  )

  const itemsByOrder = itemsResult.rows.reduce((acc, item) => {
    if (!acc[item.order_id]) acc[item.order_id] = []
    acc[item.order_id].push(item)
    return acc
  }, {})

  const orders = ordersResult.rows.map((order) => ({
    ...order,
    items: itemsByOrder[order.id] || [],
  }))

  res.json({ orders })
})

const CANCELLABLE_STATUSES = ['pending', 'processing']

// PATCH /api/orders/:id/cancel — cancel an order that hasn't shipped yet
router.patch('/:id/cancel', async (req, res) => {
  const userId = req.user.userId
  const orderId = parseInt(req.params.id)

  const orderResult = await pool.query(
    'SELECT id, status FROM orders WHERE id = $1 AND user_id = $2',
    [orderId, userId]
  )

  if (orderResult.rows.length === 0) {
    return res.status(404).json({ error: 'Order not found' })
  }

  const { status } = orderResult.rows[0]

  if (!CANCELLABLE_STATUSES.includes(status)) {
    return res.status(409).json({ error: 'Order cannot be cancelled once it is in transit.' })
  }

  const itemsResult = await pool.query(
    'SELECT product_id, quantity FROM order_items WHERE order_id = $1',
    [orderId]
  )

  const client = await pool.connect()
  try {
    await client.query('BEGIN')

    for (const item of itemsResult.rows) {
      await client.query(
        'UPDATE products SET stock = stock + $1, updated_at = NOW() WHERE id = $2',
        [item.quantity, item.product_id]
      )
    }

    await client.query(
      "UPDATE orders SET status = 'cancelled'::order_status, updated_at = NOW() WHERE id = $1",
      [orderId]
    )

    await client.query('COMMIT')
    res.json({ message: 'Order cancelled successfully' })
  } catch (err) {
    await client.query('ROLLBACK')
    throw err
  } finally {
    client.release()
  }
})

module.exports = router
