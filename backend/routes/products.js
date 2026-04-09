const express = require('express')
const pool = require('../db')

const router = express.Router()

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
            GREATEST(0, p.stock - COALESCE(SUM(sr.quantity), 0)) AS available_stock
     FROM products p
     LEFT JOIN stock_reservations sr ON sr.product_id = p.id AND sr.expires_at > NOW()
     ${whereClause}
     GROUP BY p.id
     ORDER BY p.created_at DESC
     LIMIT $${idx}`,
    [...params, limit]
  )

  res.json({ products: result.rows })
})

module.exports = router
