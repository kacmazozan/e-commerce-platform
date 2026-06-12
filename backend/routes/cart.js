const express = require('express')
const authenticate = require('../middleware/auth')
const pool = require('../db')

const router = express.Router()
router.use(authenticate)

async function fetchCart(userId) {
  const result = await pool.query(
    `SELECT ci.product_id AS id, p.name, p.price, p.category, ci.quantity, ci.size,
            GREATEST(0,
              CASE
                WHEN ci.size != ''
                THEN COALESCE(pss.stock, 0) - COALESCE(
                  (SELECT SUM(sr.quantity) FROM stock_reservations sr
                   WHERE sr.product_id = p.id AND sr.size = ci.size AND sr.expires_at > NOW()), 0)
                ELSE p.stock - COALESCE(
                  (SELECT SUM(sr.quantity) FROM stock_reservations sr
                   WHERE sr.product_id = p.id AND sr.expires_at > NOW()), 0)
              END
            ) AS available_stock,
            pd.discount_percent,
            CASE WHEN pd.discount_percent IS NOT NULL
                 THEN ROUND(p.price * (1 - pd.discount_percent / 100.0), 2)
                 ELSE NULL
            END AS discounted_price
     FROM cart_items ci
     JOIN products p ON p.id = ci.product_id
     LEFT JOIN product_size_stock pss ON pss.product_id = p.id AND pss.size = ci.size
     LEFT JOIN product_discounts pd ON pd.product_id = p.id
       AND pd.start_at <= NOW()
       AND (pd.end_at IS NULL OR pd.end_at > NOW())
     WHERE ci.user_id = $1
     ORDER BY ci.added_at ASC`,
    [userId]
  )
  return result.rows
}

// GET /api/cart
router.get('/', async (req, res) => {
  const items = await fetchCart(req.user.userId)
  res.json({ items })
})

// POST /api/cart — add item; increments quantity if already present for same size
router.post('/', async (req, res) => {
  const { productId, quantity = 1, size = '' } = req.body
  if (!productId) return res.status(400).json({ error: 'productId is required' })
  if (!Number.isInteger(quantity) || quantity < 1)
    return res.status(400).json({ error: 'quantity must be a positive integer' })

  const product = await pool.query('SELECT id FROM products WHERE id = $1 AND price IS NOT NULL', [
    productId,
  ])
  if (product.rows.length === 0) return res.status(404).json({ error: 'Product not found' })

  const sizeVal = (size || '').trim() || ''

  await pool.query(
    `INSERT INTO cart_items (user_id, product_id, quantity, size)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (user_id, product_id, size)
     DO UPDATE SET quantity = cart_items.quantity + EXCLUDED.quantity`,
    [req.user.userId, productId, quantity, sizeVal]
  )

  const items = await fetchCart(req.user.userId)
  res.json({ items })
})

// PUT /api/cart/:productId — set exact quantity; ?size= to identify the row
router.put('/:productId', async (req, res) => {
  const { quantity } = req.body
  if (!Number.isInteger(quantity) || quantity < 1)
    return res.status(400).json({ error: 'quantity must be a positive integer' })

  const sizeVal = ((req.query.size || '') + '').trim() || ''

  await pool.query(
    `UPDATE cart_items SET quantity = $1 WHERE user_id = $2 AND product_id = $3 AND size = $4`,
    [quantity, req.user.userId, req.params.productId, sizeVal]
  )

  const items = await fetchCart(req.user.userId)
  res.json({ items })
})

// DELETE /api/cart/:productId — remove one item; ?size= to identify the row
router.delete('/:productId', async (req, res) => {
  const sizeVal = ((req.query.size || '') + '').trim() || ''

  await pool.query(`DELETE FROM cart_items WHERE user_id = $1 AND product_id = $2 AND size = $3`, [
    req.user.userId,
    req.params.productId,
    sizeVal,
  ])

  const items = await fetchCart(req.user.userId)
  res.json({ items })
})

// DELETE /api/cart — clear entire cart
router.delete('/', async (req, res) => {
  await pool.query('DELETE FROM cart_items WHERE user_id = $1', [req.user.userId])
  res.json({ items: [] })
})

module.exports = router
