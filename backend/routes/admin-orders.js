const express = require('express')
const authenticate = require('../middleware/auth')
const requireAdmin = require('../middleware/admin')
const pool = require('../db')

const router = express.Router()

router.use(authenticate)
router.use(requireAdmin)

const VALID_STATUSES = ['pending', 'processing', 'shipped', 'delivered', 'cancelled']

// GET /api/admin/orders — list with pagination, status filter, search by user email
router.get('/', async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page) || 1)
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 10))
  const offset = (page - 1) * limit
  const status = (req.query.status || '').trim()
  const search = (req.query.search || '').trim()

  let where = []
  let params = []
  let idx = 1

  if (status && VALID_STATUSES.includes(status)) {
    where.push(`o.status = $${idx}::order_status`)
    params.push(status)
    idx++
  }

  if (search) {
    where.push(`u.email ILIKE $${idx}`)
    params.push(`%${search}%`)
    idx++
  }

  const whereClause = where.length ? `WHERE ${where.join(' AND ')}` : ''

  const countResult = await pool.query(
    `SELECT COUNT(*) FROM orders o JOIN auth.users u ON u.id = o.user_id ${whereClause}`,
    params
  )
  const total = parseInt(countResult.rows[0].count)

  const dataResult = await pool.query(
    `SELECT o.id, o.status, o.total, o.shipping_cost, o.address, o.created_at, o.updated_at,
            u.id AS user_id, u.email AS user_email
     FROM orders o
     JOIN auth.users u ON u.id = o.user_id
     ${whereClause}
     ORDER BY o.created_at DESC
     LIMIT $${idx} OFFSET $${idx + 1}`,
    [...params, limit, offset]
  )

  res.json({
    orders: dataResult.rows,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  })
})

// GET /api/admin/orders/:id — single order with items
router.get('/:id', async (req, res) => {
  const orderResult = await pool.query(
    `SELECT o.id, o.status, o.total, o.shipping_cost, o.address, o.created_at, o.updated_at,
            u.id AS user_id, u.email AS user_email
     FROM orders o
     JOIN auth.users u ON u.id = o.user_id
     WHERE o.id = $1`,
    [req.params.id]
  )

  if (orderResult.rows.length === 0) return res.status(404).json({ error: 'Order not found' })

  const itemsResult = await pool.query(
    `SELECT oi.id, oi.quantity, oi.price, p.id AS product_id, p.name AS product_name
     FROM order_items oi
     JOIN products p ON p.id = oi.product_id
     WHERE oi.order_id = $1
     ORDER BY oi.id`,
    [req.params.id]
  )

  res.json({ order: orderResult.rows[0], items: itemsResult.rows })
})

// PUT /api/admin/orders/:id — update order status
router.put('/:id', async (req, res) => {
  const { status } = req.body

  if (!status || !VALID_STATUSES.includes(status)) {
    return res.status(400).json({ error: `Status must be one of: ${VALID_STATUSES.join(', ')}` })
  }

  const result = await pool.query(
    `UPDATE orders SET status = $1::order_status, updated_at = NOW() WHERE id = $2
     RETURNING id, status, total, address, created_at, updated_at`,
    [status, req.params.id]
  )

  if (result.rows.length === 0) return res.status(404).json({ error: 'Order not found' })

  res.json({ order: result.rows[0] })
})

// DELETE /api/admin/orders/:id — delete order (and cascades items)
router.delete('/:id', async (req, res) => {
  const result = await pool.query('DELETE FROM orders WHERE id = $1 RETURNING id', [req.params.id])
  if (result.rows.length === 0) return res.status(404).json({ error: 'Order not found' })
  res.json({ message: 'Order deleted successfully' })
})

module.exports = router
