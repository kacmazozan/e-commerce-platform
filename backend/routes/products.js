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
    where.push(`category = $${idx}`)
    params.push(category)
    idx++
  }

  const whereClause = where.length ? `WHERE ${where.join(' AND ')}` : ''

  const result = await pool.query(
    `SELECT id, name, description, price, stock, category, image_url, created_at
     FROM products ${whereClause}
     ORDER BY created_at DESC
     LIMIT $${idx}`,
    [...params, limit]
  )

  res.json({ products: result.rows })
})

module.exports = router
