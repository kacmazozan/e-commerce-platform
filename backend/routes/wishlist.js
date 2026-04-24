const express = require('express')
const authenticate = require('../middleware/auth')
const pool = require('../db')

const router = express.Router()
router.use(authenticate)

async function fetchWishlist(userId) {
  const result = await pool.query(
    `SELECT wi.product_id AS id, p.name, p.price, p.category,
            GREATEST(0, p.stock - COALESCE(
              (SELECT SUM(sr.quantity) FROM stock_reservations sr
               WHERE sr.product_id = p.id AND sr.expires_at > NOW()), 0
            )) AS available_stock,
            pd.discount_percent,
            CASE WHEN pd.discount_percent IS NOT NULL
                 THEN ROUND(p.price * (1 - pd.discount_percent / 100.0), 2)
                 ELSE NULL
            END AS discounted_price
     FROM wishlist_items wi
     JOIN products p ON p.id = wi.product_id
     LEFT JOIN product_discounts pd ON pd.product_id = p.id
       AND pd.start_at <= NOW()
       AND (pd.end_at IS NULL OR pd.end_at > NOW())
     WHERE wi.user_id = $1
     ORDER BY wi.added_at ASC`,
    [userId]
  )
  return result.rows
}

// GET /api/wishlist
router.get('/', async (req, res) => {
  const items = await fetchWishlist(req.user.userId)
  res.json({ items })
})

// POST /api/wishlist — add item (idempotent)
router.post('/', async (req, res) => {
  const { productId } = req.body
  if (!productId) return res.status(400).json({ error: 'productId is required' })

  const product = await pool.query('SELECT id FROM products WHERE id = $1', [productId])
  if (product.rows.length === 0) return res.status(404).json({ error: 'Product not found' })

  await pool.query(
    `INSERT INTO wishlist_items (user_id, product_id)
     VALUES ($1, $2)
     ON CONFLICT (user_id, product_id) DO NOTHING`,
    [req.user.userId, productId]
  )

  const items = await fetchWishlist(req.user.userId)
  res.json({ items })
})

// DELETE /api/wishlist/:productId — remove one item
router.delete('/:productId', async (req, res) => {
  await pool.query('DELETE FROM wishlist_items WHERE user_id = $1 AND product_id = $2', [
    req.user.userId,
    req.params.productId,
  ])

  const items = await fetchWishlist(req.user.userId)
  res.json({ items })
})

module.exports = router
