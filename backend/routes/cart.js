const express = require('express')
const authenticate = require('../middleware/auth')
const pool = require('../db')

const router = express.Router()
router.use(authenticate)

async function fetchCart(userId) {
  const result = await pool.query(
    `SELECT ci.product_id AS id, p.name, p.price, ci.quantity
     FROM cart_items ci
     JOIN products p ON p.id = ci.product_id
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

// POST /api/cart — add item; increments quantity if already present
router.post('/', async (req, res) => {
  const { productId, quantity = 1 } = req.body
  if (!productId) return res.status(400).json({ error: 'productId is required' })
  if (!Number.isInteger(quantity) || quantity < 1)
    return res.status(400).json({ error: 'quantity must be a positive integer' })

  const product = await pool.query('SELECT id FROM products WHERE id = $1', [productId])
  if (product.rows.length === 0) return res.status(404).json({ error: 'Product not found' })

  await pool.query(
    `INSERT INTO cart_items (user_id, product_id, quantity)
     VALUES ($1, $2, $3)
     ON CONFLICT (user_id, product_id)
     DO UPDATE SET quantity = cart_items.quantity + EXCLUDED.quantity`,
    [req.user.userId, productId, quantity]
  )

  const items = await fetchCart(req.user.userId)
  res.json({ items })
})

// PUT /api/cart/:productId — set exact quantity
router.put('/:productId', async (req, res) => {
  const { quantity } = req.body
  if (!Number.isInteger(quantity) || quantity < 1)
    return res.status(400).json({ error: 'quantity must be a positive integer' })

  await pool.query(`UPDATE cart_items SET quantity = $1 WHERE user_id = $2 AND product_id = $3`, [
    quantity,
    req.user.userId,
    req.params.productId,
  ])

  const items = await fetchCart(req.user.userId)
  res.json({ items })
})

// DELETE /api/cart/:productId — remove one item
router.delete('/:productId', async (req, res) => {
  await pool.query(`DELETE FROM cart_items WHERE user_id = $1 AND product_id = $2`, [
    req.user.userId,
    req.params.productId,
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
