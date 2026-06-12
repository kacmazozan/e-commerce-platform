const express = require('express')
const authenticate = require('../middleware/auth')
const pool = require('../db')
const { decryptField } = require('../services/secure-fields')

const router = express.Router()
router.use(authenticate)

// GET /api/orders — list current user's orders with their items and refund state
router.get('/', async (req, res) => {
  const userId = req.user.userId

  try {
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
      `SELECT oi.id, oi.order_id, oi.quantity, oi.price, oi.size,
              p.id AS product_id, p.name AS product_name, p.category AS product_category,
              r.id AS refund_id, r.status AS refund_status,
              r.refund_amount, r.requested_at
       FROM order_items oi
       JOIN products p ON p.id = oi.product_id
       LEFT JOIN refunds r ON r.order_item_id = oi.id
       WHERE oi.order_id = ANY($1)
       ORDER BY oi.id`,
      [orderIds]
    )

    const itemsByOrder = itemsResult.rows.reduce((acc, item) => {
      if (!acc[item.order_id]) acc[item.order_id] = []
      acc[item.order_id].push({
        id: item.id,
        order_id: item.order_id,
        quantity: item.quantity,
        price: item.price,
        size: item.size,
        product_id: item.product_id,
        product_name: item.product_name,
        product_category: item.product_category,
        refund: item.refund_id
          ? {
              id: item.refund_id,
              status: item.refund_status,
              refund_amount: item.refund_amount,
              requested_at: item.requested_at,
            }
          : null,
      })
      return acc
    }, {})

    const orders = ordersResult.rows.map((order) => ({
      ...order,
      address: decryptField(order.address),
      items: itemsByOrder[order.id] || [],
    }))

    res.json({ orders })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// GET /api/orders/:id — single order detail with items and refund state
router.get('/:id', async (req, res) => {
  const userId = req.user.userId
  const orderId = parseInt(req.params.id, 10)

  if (isNaN(orderId) || orderId <= 0) {
    return res.status(400).json({ error: 'Invalid order ID' })
  }

  try {
    const orderResult = await pool.query(
      `SELECT id, status, total, shipping_cost, address, created_at, payment_method_id
       FROM orders
       WHERE id = $1 AND user_id = $2`,
      [orderId, userId]
    )

    if (orderResult.rows.length === 0) {
      return res.status(404).json({ error: 'Order not found' })
    }

    const itemsResult = await pool.query(
      `SELECT oi.id, oi.order_id, oi.quantity, oi.price, oi.size,
              p.id AS product_id, p.name AS product_name, p.category AS product_category,
              r.id AS refund_id, r.status AS refund_status,
              r.refund_amount, r.requested_at
       FROM order_items oi
       JOIN products p ON p.id = oi.product_id
       LEFT JOIN refunds r ON r.order_item_id = oi.id
       WHERE oi.order_id = $1
       ORDER BY oi.id`,
      [orderId]
    )

    const items = itemsResult.rows.map((item) => ({
      id: item.id,
      order_id: item.order_id,
      quantity: item.quantity,
      price: item.price,
      size: item.size,
      product_id: item.product_id,
      product_name: item.product_name,
      product_category: item.product_category,
      refund: item.refund_id
        ? {
            id: item.refund_id,
            status: item.refund_status,
            refund_amount: item.refund_amount,
            requested_at: item.requested_at,
          }
        : null,
    }))

    const order = {
      ...orderResult.rows[0],
      address: decryptField(orderResult.rows[0].address),
      items,
    }

    res.json({ order })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

const CANCELLABLE_STATUSES = ['pending', 'processing']

// PATCH /api/orders/:id/cancel — cancel an order that hasn't shipped yet
router.patch('/:id/cancel', async (req, res) => {
  const userId = req.user.userId
  const orderId = parseInt(req.params.id, 10)

  if (isNaN(orderId) || orderId <= 0) {
    return res.status(400).json({ error: 'Invalid order ID' })
  }

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
    'SELECT product_id, quantity, size FROM order_items WHERE order_id = $1',
    [orderId]
  )

  const client = await pool.connect()
  try {
    await client.query('BEGIN')

    for (const item of itemsResult.rows) {
      if (item.size) {
        await client.query(
          'UPDATE product_size_stock SET stock = stock + $1 WHERE product_id = $2 AND size = $3',
          [item.quantity, item.product_id, item.size]
        )
      }
      // products.stock is the aggregate total and must be restored either way —
      // public routes derive availability from it.
      await client.query(
        'UPDATE products SET stock = stock + $1, updated_at = NOW() WHERE id = $2',
        [item.quantity, item.product_id]
      )
    }

    const updateResult = await client.query(
      `UPDATE orders SET status = 'cancelled'::order_status, updated_at = NOW()
       WHERE id = $1 AND user_id = $2 AND status = ANY($3)`,
      [orderId, userId, CANCELLABLE_STATUSES]
    )

    if (updateResult.rowCount === 0) {
      await client.query('ROLLBACK')
      return res.status(409).json({ error: 'Order cannot be cancelled once it is in transit.' })
    }

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
