const express = require('express')
const pool = require('../db')
const authenticate = require('../middleware/auth')

const router = express.Router()

// GET /api/products/search — search products by name or description, ?q= ?limit=
// Empty or missing q returns all products sorted alphabetically.
router.get('/search', async (req, res) => {
  const q = (req.query.q || '').trim()

  // Single-character queries match too broadly — reject them early
  if (q.length === 1) return res.json({ products: [] })

  // For keyword searches: default limit 50, capped at 100.
  // For "show all" (empty q): no default limit; explicit ?limit= is still respected.
  const explicitLimit =
    req.query.limit !== undefined
      ? Math.min(100, Math.max(1, parseInt(req.query.limit) || 1))
      : null
  const limit = explicitLimit ?? (q ? 50 : null)

  const whereClause = q ? 'WHERE (p.name ILIKE $1 OR p.description ILIKE $1)' : ''
  const params = q ? [`%${q}%`] : []
  if (limit !== null) params.push(limit)
  const limitClause = limit !== null ? `LIMIT $${params.length}` : ''

  const result = await pool.query(
    `SELECT p.id, p.name, p.description, p.price, p.stock, p.category, p.image_url, p.created_at,
            GREATEST(0, p.stock - COALESCE(SUM(sr.quantity), 0)) AS available_stock,
            pd.discount_percent,
            CASE WHEN pd.discount_percent IS NOT NULL
                 THEN ROUND(p.price * (1 - pd.discount_percent / 100.0), 2)
                 ELSE NULL
            END AS discounted_price
     FROM products p
     LEFT JOIN stock_reservations sr ON sr.product_id = p.id AND sr.expires_at > NOW()
     LEFT JOIN product_discounts pd ON pd.product_id = p.id
       AND pd.start_at <= NOW()
       AND (pd.end_at IS NULL OR pd.end_at > NOW())
     ${whereClause}
     GROUP BY p.id, pd.discount_percent
     ORDER BY p.name ASC
     ${limitClause}`,
    params
  )

  res.json({ products: result.rows })
})

// GET /api/products — list products, optional ?category= and ?limit=
router.get('/', async (req, res) => {
  const category = (req.query.category || '').trim()
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 50))

  let where = []
  let params = []
  let idx = 1

  if (category) {
    where.push(`p.category = $${idx}`)
    params.push(category)
    idx++
  }

  const whereClause = where.length ? `WHERE ${where.join(' AND ')}` : ''

  const result = await pool.query(
    `SELECT p.id, p.name, p.description, p.price, p.stock, p.category, p.image_url, p.created_at,
            GREATEST(0, p.stock - COALESCE(SUM(sr.quantity), 0)) AS available_stock,
            pd.discount_percent,
            CASE WHEN pd.discount_percent IS NOT NULL
                 THEN ROUND(p.price * (1 - pd.discount_percent / 100.0), 2)
                 ELSE NULL
            END AS discounted_price
     FROM products p
     LEFT JOIN stock_reservations sr ON sr.product_id = p.id AND sr.expires_at > NOW()
     LEFT JOIN product_discounts pd ON pd.product_id = p.id
       AND pd.start_at <= NOW()
       AND (pd.end_at IS NULL OR pd.end_at > NOW())
     ${whereClause}
     GROUP BY p.id, pd.discount_percent
     ORDER BY p.created_at DESC
     LIMIT $${idx}`,
    [...params, limit]
  )

  res.json({ products: result.rows })
})

// GET /api/products/:id/reviews — approved reviews for a product (public)
router.get('/:id/reviews', async (req, res) => {
  const productId = parseInt(req.params.id, 10)
  if (!Number.isInteger(productId) || productId <= 0) {
    return res.status(400).json({ error: 'Invalid product ID' })
  }

  const result = await pool.query(
    `SELECT r.id, r.rating, r.content, r.created_at
     FROM product_reviews r
     WHERE r.product_id = $1 AND r.status = 'approved'
     ORDER BY r.created_at DESC`,
    [productId]
  )

  res.json({ reviews: result.rows })
})

// POST /api/products/:id/reviews — submit a review (authenticated customers only)
router.post('/:id/reviews', authenticate, async (req, res) => {
  const productId = parseInt(req.params.id, 10)
  if (!Number.isInteger(productId) || productId <= 0) {
    return res.status(400).json({ error: 'Invalid product ID' })
  }

  if (req.user.role !== 'customer') {
    return res.status(403).json({ error: 'Only customers can submit reviews' })
  }

  const rating = parseInt(req.body.rating, 10)
  if (!rating || rating < 1 || rating > 5) {
    return res.status(400).json({ error: 'Rating must be an integer between 1 and 5' })
  }

  const productCheck = await pool.query('SELECT id FROM products WHERE id = $1', [productId])
  if (productCheck.rows.length === 0) {
    return res.status(404).json({ error: 'Product not found' })
  }

  const existingCheck = await pool.query(
    'SELECT id FROM product_reviews WHERE product_id = $1 AND user_id = $2',
    [productId, req.user.userId]
  )
  if (existingCheck.rows.length > 0) {
    return res.status(409).json({ error: 'You have already reviewed this product' })
  }

  const result = await pool.query(
    `INSERT INTO product_reviews (product_id, user_id, rating, content, status)
     VALUES ($1, $2, $3, $4, 'pending') RETURNING id, rating, content, status, created_at`,
    [productId, req.user.userId, rating, req.body.content || null]
  )

  res.status(201).json({ review: result.rows[0] })
})

// GET /api/products/:id — single product with discount info (public)
router.get('/:id', async (req, res) => {
  const productId = parseInt(req.params.id, 10)
  if (!Number.isInteger(productId) || productId <= 0) {
    return res.status(400).json({ error: 'Invalid product ID' })
  }

  const result = await pool.query(
    `SELECT p.id, p.name, p.description, p.price, p.stock, p.category, p.image_url, p.created_at,
            GREATEST(0, p.stock - COALESCE(SUM(sr.quantity), 0)) AS available_stock,
            pd.discount_percent,
            CASE WHEN pd.discount_percent IS NOT NULL
                 THEN ROUND(p.price * (1 - pd.discount_percent / 100.0), 2)
                 ELSE NULL
            END AS discounted_price
     FROM products p
     LEFT JOIN stock_reservations sr ON sr.product_id = p.id AND sr.expires_at > NOW()
     LEFT JOIN product_discounts pd ON pd.product_id = p.id
       AND pd.start_at <= NOW()
       AND (pd.end_at IS NULL OR pd.end_at > NOW())
     WHERE p.id = $1
     GROUP BY p.id, pd.discount_percent`,
    [productId]
  )

  if (result.rows.length === 0) return res.status(404).json({ error: 'Product not found' })
  res.json({ product: result.rows[0] })
})

module.exports = router
