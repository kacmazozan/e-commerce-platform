const express = require('express')
const authenticate = require('../middleware/auth')
const requireSalesManager = require('../middleware/sales-manager')
const pool = require('../db')

const router = express.Router()

router.use(authenticate)
router.use(requireSalesManager)

// GET /api/sales-manager/products — paginated product list
router.get('/', async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page) || 1)
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 15))
  const offset = (page - 1) * limit

  const countResult = await pool.query('SELECT COUNT(*) FROM products')
  const total = parseInt(countResult.rows[0].count)

  const dataResult = await pool.query(
    'SELECT id, name, category, price, stock FROM products ORDER BY name ASC LIMIT $1 OFFSET $2',
    [limit, offset]
  )

  res.json({
    products: dataResult.rows,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  })
})

// PATCH /api/sales-manager/products/:id/price — update price only
router.patch('/:id/price', async (req, res) => {
  const productId = parseInt(req.params.id, 10)
  if (isNaN(productId) || productId <= 0) {
    return res.status(400).json({ error: 'Invalid product ID' })
  }

  const { price } = req.body

  if (price == null) {
    return res.status(400).json({ error: 'Price is required' })
  }

  if (isNaN(parseFloat(price)) || parseFloat(price) <= 0) {
    return res.status(400).json({ error: 'Price must be a positive number' })
  }

  const existing = await pool.query('SELECT id FROM products WHERE id = $1', [productId])
  if (existing.rows.length === 0) {
    return res.status(404).json({ error: 'Product not found' })
  }

  const result = await pool.query(
    'UPDATE products SET price = $1, updated_at = NOW() WHERE id = $2 RETURNING *',
    [price, productId]
  )

  res.json({ product: result.rows[0] })
})

module.exports = router
