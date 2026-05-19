const express = require('express')
const pool = require('../db')
const authenticate = require('../middleware/auth')
const requireSalesManager = require('../middleware/sales-manager')

const router = express.Router()
router.use(authenticate)
router.use(requireSalesManager)

router.get('/', async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT
        (SELECT COUNT(*) FROM products WHERE price IS NOT NULL)::int                              AS published_products,
        (SELECT COUNT(*) FROM products WHERE price IS NULL)::int                                  AS unpriced_products,
        (SELECT COUNT(*) FROM product_discounts
          WHERE end_at IS NULL OR end_at > NOW())::int                                    AS active_discounts,
        (SELECT COUNT(*) FROM refunds WHERE status = 'pending')::int                              AS pending_refunds,
        (SELECT COALESCE(SUM(total + shipping_cost), 0)
           FROM orders
           WHERE status != 'cancelled'
             AND DATE_TRUNC('month', created_at) = DATE_TRUNC('month', NOW()))::numeric(12,2)     AS revenue_this_month,
        (SELECT COUNT(*) FROM orders
           WHERE status != 'cancelled'
             AND DATE_TRUNC('month', created_at) = DATE_TRUNC('month', NOW()))::int               AS orders_this_month
    `)
    res.json({ stats: rows[0] })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

module.exports = router
