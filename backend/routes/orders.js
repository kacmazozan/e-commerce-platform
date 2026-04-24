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

module.exports = router
