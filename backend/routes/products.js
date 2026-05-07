const express = require('express')
const pool = require('../db')
const authenticate = require('../middleware/auth')

const router = express.Router()

const VALID_SORTS = ['newest', 'price_asc', 'price_desc', 'popularity']

const PUBLIC_PRODUCT_COLUMNS = `
  p.id, p.name, p.description, p.price, p.stock, p.category, p.created_at,
  p.model, p.serial_number, p.warranty_status, p.distributor_info`

function getSortClause(sort) {
  const key = VALID_SORTS.includes(sort) ? sort : 'newest'
  const stockPin = `CASE WHEN GREATEST(0, p.stock - COALESCE(sr.reserved, 0)) = 0 THEN 1 ELSE 0 END ASC`
  switch (key) {
    case 'price_asc':
      return `ORDER BY ${stockPin}, p.price ASC`
    case 'price_desc':
      return `ORDER BY ${stockPin}, p.price DESC`
    case 'popularity':
      return `ORDER BY ${stockPin}, COALESCE(oi.units_sold, 0) DESC`
    default:
      return `ORDER BY ${stockPin}, p.created_at DESC`
  }
}

// GET /api/products/categories — public category list with product counts
router.get('/categories', async (_req, res) => {
  const result = await pool.query(
    `SELECT name, SUM(product_count)::int AS product_count
     FROM (
       SELECT c.name, COUNT(p.id)::int AS product_count
       FROM categories c
       LEFT JOIN products p ON p.category = c.name
       GROUP BY c.name

       UNION ALL

       SELECT p.category AS name, COUNT(p.id)::int AS product_count
       FROM products p
       WHERE p.category IS NOT NULL
         AND NOT EXISTS (SELECT 1 FROM categories c WHERE c.name = p.category)
       GROUP BY p.category
     ) category_counts
     WHERE name IS NOT NULL
     GROUP BY name
     ORDER BY name`
  )

  res.json({ categories: result.rows })
})

// GET /api/products/search — search products by name or description, ?q= ?limit= ?sort=
// Empty or missing q returns all products. Default sort is newest.
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
    `WITH sr_agg AS (
       SELECT product_id, SUM(quantity) AS reserved
       FROM stock_reservations WHERE expires_at > NOW()
       GROUP BY product_id
     ),
     oi_agg AS (
       SELECT product_id, SUM(quantity) AS units_sold
       FROM order_items
       GROUP BY product_id
     )
     SELECT ${PUBLIC_PRODUCT_COLUMNS},
            GREATEST(0, p.stock - COALESCE(sr.reserved, 0)) AS available_stock,
            COALESCE(oi.units_sold, 0) AS units_sold,
            pd.discount_percent,
            CASE WHEN pd.discount_percent IS NOT NULL
                 THEN ROUND(p.price * (1 - pd.discount_percent / 100.0), 2)
                 ELSE NULL
            END AS discounted_price
     FROM products p
     LEFT JOIN sr_agg sr ON sr.product_id = p.id
     LEFT JOIN product_discounts pd ON pd.product_id = p.id
       AND pd.start_at <= NOW()
       AND (pd.end_at IS NULL OR pd.end_at > NOW())
     LEFT JOIN oi_agg oi ON oi.product_id = p.id
     ${whereClause}
     GROUP BY p.id, pd.discount_percent, sr.reserved, oi.units_sold
     ${getSortClause(req.query.sort)}
     ${limitClause}`,
    params
  )

  res.json({ products: result.rows })
})

// GET /api/products — list products, optional ?category= ?limit= ?sort= ?on_sale=
router.get('/', async (req, res) => {
  const category = (req.query.category || '').trim()
  const onSale = req.query.on_sale === 'true'
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 50))

  let where = []
  let params = []
  let idx = 1

  if (category) {
    where.push(`p.category = $${idx}`)
    params.push(category)
    idx++
  }

  if (onSale) {
    where.push(`pd.discount_percent IS NOT NULL`)
  }

  const whereClause = where.length ? `WHERE ${where.join(' AND ')}` : ''

  const result = await pool.query(
    `WITH sr_agg AS (
       SELECT product_id, SUM(quantity) AS reserved
       FROM stock_reservations WHERE expires_at > NOW()
       GROUP BY product_id
     ),
     oi_agg AS (
       SELECT product_id, SUM(quantity) AS units_sold
       FROM order_items
       GROUP BY product_id
     )
     SELECT ${PUBLIC_PRODUCT_COLUMNS},
            GREATEST(0, p.stock - COALESCE(sr.reserved, 0)) AS available_stock,
            COALESCE(oi.units_sold, 0) AS units_sold,
            pd.discount_percent,
            CASE WHEN pd.discount_percent IS NOT NULL
                 THEN ROUND(p.price * (1 - pd.discount_percent / 100.0), 2)
                 ELSE NULL
            END AS discounted_price
     FROM products p
     LEFT JOIN sr_agg sr ON sr.product_id = p.id
     LEFT JOIN product_discounts pd ON pd.product_id = p.id
       AND pd.start_at <= NOW()
       AND (pd.end_at IS NULL OR pd.end_at > NOW())
     LEFT JOIN oi_agg oi ON oi.product_id = p.id
     ${whereClause}
     GROUP BY p.id, pd.discount_percent, sr.reserved, oi.units_sold
     ${getSortClause(req.query.sort)}
     LIMIT $${idx}`,
    [...params, limit]
  )

  res.json({ products: result.rows })
})

// GET /api/products/reviews/mine — all reviews submitted by the authenticated customer
router.get('/reviews/mine', authenticate, async (req, res) => {
  if (req.user.role !== 'customer') {
    return res.status(403).json({ error: 'Only customers can access their reviews' })
  }

  const result = await pool.query(
    `SELECT r.id, r.product_id, p.name AS product_name, r.rating, r.content,
            r.status, r.anonymous, r.created_at
     FROM product_reviews r
     JOIN products p ON p.id = r.product_id
     WHERE r.user_id = $1
     ORDER BY r.created_at DESC`,
    [req.user.userId]
  )

  res.json({ reviews: result.rows })
})

// GET /api/products/:id/reviews — ratings aggregate + approved comment cards (public)
router.get('/:id/reviews', async (req, res) => {
  const productId = parseInt(req.params.id, 10)
  if (!Number.isInteger(productId) || productId <= 0) {
    return res.status(400).json({ error: 'Invalid product ID' })
  }

  const [aggResult, cardsResult] = await Promise.all([
    pool.query(
      `SELECT COUNT(*)::int AS total_ratings, ROUND(AVG(rating)::numeric, 1) AS avg_rating
       FROM product_reviews WHERE product_id = $1`,
      [productId]
    ),
    pool.query(
      `SELECT r.id, r.rating, r.content, r.created_at, r.anonymous, c.name AS customer_name
       FROM product_reviews r
       LEFT JOIN auth.customers c ON c.customer_id = r.user_id
       WHERE r.product_id = $1 AND r.status = 'approved' AND r.content IS NOT NULL
       ORDER BY r.created_at DESC`,
      [productId]
    ),
  ])

  const { total_ratings, avg_rating } = aggResult.rows[0]
  const reviews = cardsResult.rows.map((r) => ({
    id: r.id,
    rating: r.rating,
    content: r.content,
    created_at: r.created_at,
    author_name: r.anonymous ? 'Anonymous' : r.customer_name || 'User',
  }))

  res.json({
    avgRating: avg_rating,
    totalRatings: total_ratings,
    reviews,
  })
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

  const content = req.body.content?.trim() || null
  const anonymous = req.body.anonymous === true
  // Rating is immediately visible; comments need PM approval
  const status = content ? 'pending' : 'approved'

  const result = await pool.query(
    `INSERT INTO product_reviews (product_id, user_id, rating, content, status, anonymous)
     VALUES ($1, $2, $3, $4, $5::review_status, $6) RETURNING id, rating, content, status, created_at`,
    [productId, req.user.userId, rating, content, status, anonymous]
  )

  res.status(201).json({ review: result.rows[0] })
})

// PATCH /api/products/:id/reviews — update the caller's existing review
router.patch('/:id/reviews', authenticate, async (req, res) => {
  const productId = parseInt(req.params.id, 10)
  if (!Number.isInteger(productId) || productId <= 0) {
    return res.status(400).json({ error: 'Invalid product ID' })
  }

  if (req.user.role !== 'customer') {
    return res.status(403).json({ error: 'Only customers can update reviews' })
  }

  const existing = await pool.query(
    'SELECT id FROM product_reviews WHERE product_id = $1 AND user_id = $2',
    [productId, req.user.userId]
  )
  if (existing.rows.length === 0) {
    return res.status(404).json({ error: 'No review found to update' })
  }

  const rating = parseInt(req.body.rating, 10)
  if (!rating || rating < 1 || rating > 5) {
    return res.status(400).json({ error: 'Rating must be an integer between 1 and 5' })
  }

  const content = req.body.content?.trim() || null
  const anonymous = req.body.anonymous === true
  // Adding/changing a comment sends it back to pending for PM approval
  const newStatus = content ? 'pending' : 'approved'

  const result = await pool.query(
    `UPDATE product_reviews
     SET rating = $1, content = $2, status = $3::review_status, anonymous = $4
     WHERE id = $5
     RETURNING id, product_id, rating, content, status, anonymous, created_at`,
    [rating, content, newStatus, anonymous, existing.rows[0].id]
  )

  res.json({ review: result.rows[0] })
})

// GET /api/products/:id — single product with discount info (public)
router.get('/:id', async (req, res) => {
  const productId = parseInt(req.params.id, 10)
  if (!Number.isInteger(productId) || productId <= 0) {
    return res.status(400).json({ error: 'Invalid product ID' })
  }

  const result = await pool.query(
    `SELECT ${PUBLIC_PRODUCT_COLUMNS},
            p.country_of_origin, p.material, p.model_height, p.model_chest, p.model_waist,
            p.model_hips, p.model_size, p.sizes,
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

  const imagesResult = await pool.query(
    `SELECT id, url, alt FROM product_images WHERE product_id = $1 ORDER BY id ASC`,
    [productId]
  )

  res.json({ product: result.rows[0], images: imagesResult.rows })
})

module.exports = router
