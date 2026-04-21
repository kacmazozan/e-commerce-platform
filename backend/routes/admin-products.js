const express = require('express')
const authenticate = require('../middleware/auth')
const requireAdmin = require('../middleware/admin')
const pool = require('../db')

const router = express.Router()

router.use(authenticate)
router.use(requireAdmin)

// GET /api/admin/products — list with pagination, search, category filter
router.get('/', async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page) || 1)
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 10))
  const offset = (page - 1) * limit
  const search = (req.query.search || '').trim()
  const category = (req.query.category || '').trim()

  let where = []
  let params = []
  let idx = 1

  if (search) {
    where.push(`name ILIKE $${idx}`)
    params.push(`%${search}%`)
    idx++
  }

  if (category) {
    where.push(`category = $${idx}`)
    params.push(category)
    idx++
  }

  const whereClause = where.length ? `WHERE ${where.join(' AND ')}` : ''

  const countResult = await pool.query(`SELECT COUNT(*) FROM products ${whereClause}`, params)
  const total = parseInt(countResult.rows[0].count)

  const dataResult = await pool.query(
    `SELECT * FROM products ${whereClause} ORDER BY created_at DESC LIMIT $${idx} OFFSET $${idx + 1}`,
    [...params, limit, offset]
  )

  res.json({
    products: dataResult.rows,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  })
})

// GET /api/admin/products/meta/categories — unique categories for filters
// Must be defined BEFORE /:id to avoid matching "meta" as an id
router.get('/meta/categories', async (req, res) => {
  const result = await pool.query(
    'SELECT DISTINCT category FROM products WHERE category IS NOT NULL ORDER BY category'
  )
  res.json({ categories: result.rows.map((r) => r.category) })
})

// GET /api/admin/products/:id
router.get('/:id', async (req, res) => {
  const result = await pool.query('SELECT * FROM products WHERE id = $1', [req.params.id])
  if (result.rows.length === 0) return res.status(404).json({ error: 'Product not found' })
  res.json({ product: result.rows[0] })
})

// POST /api/admin/products
router.post('/', async (req, res) => {
  const { name, description, price, stock, category } = req.body

  if (!name || price == null) {
    return res.status(400).json({ error: 'Name and price are required' })
  }

  if (parseFloat(price) < 0) {
    return res.status(400).json({ error: 'Price must be non-negative' })
  }

  const result = await pool.query(
    `INSERT INTO products (name, description, price, stock, category)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [
      name,
      description || null,
      price,
      Number.isFinite(parseInt(stock)) ? parseInt(stock) : 0,
      category || null,
    ]
  )

  res.status(201).json({ product: result.rows[0] })
})

// PUT /api/admin/products/:id
router.put('/:id', async (req, res) => {
  const { name, description, price, stock, category } = req.body
  const productId = req.params.id

  const existing = await pool.query('SELECT id FROM products WHERE id = $1', [productId])
  if (existing.rows.length === 0) return res.status(404).json({ error: 'Product not found' })

  let sets = []
  let params = []
  let idx = 1

  if (name !== undefined) {
    sets.push(`name = $${idx}`)
    params.push(name)
    idx++
  }
  if (description !== undefined) {
    sets.push(`description = $${idx}`)
    params.push(description)
    idx++
  }
  if (price !== undefined) {
    if (parseFloat(price) < 0) return res.status(400).json({ error: 'Price must be non-negative' })
    sets.push(`price = $${idx}`)
    params.push(price)
    idx++
  }
  if (stock !== undefined) {
    sets.push(`stock = $${idx}`)
    params.push(Number.isFinite(parseInt(stock)) ? parseInt(stock) : 0)
    idx++
  }
  if (category !== undefined) {
    sets.push(`category = $${idx}`)
    params.push(category)
    idx++
  }
  if (sets.length === 0) return res.status(400).json({ error: 'No fields to update' })

  sets.push(`updated_at = NOW()`)
  params.push(productId)

  const result = await pool.query(
    `UPDATE products SET ${sets.join(', ')} WHERE id = $${idx} RETURNING *`,
    params
  )

  res.json({ product: result.rows[0] })
})

// DELETE /api/admin/products/:id
router.delete('/:id', async (req, res) => {
  const result = await pool.query('DELETE FROM products WHERE id = $1 RETURNING id', [
    req.params.id,
  ])
  if (result.rows.length === 0) return res.status(404).json({ error: 'Product not found' })
  res.json({ message: 'Product deleted successfully' })
})

module.exports = router
