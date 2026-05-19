const express = require('express')
const authenticate = require('../middleware/auth')
const requireSalesManager = require('../middleware/sales-manager')
const pool = require('../db')

const router = express.Router()

router.use(authenticate)
router.use(requireSalesManager)

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/

function defaultDateRange() {
  const now = new Date()
  const year = now.getUTCFullYear()
  const month = now.getUTCMonth()
  const startDate = new Date(Date.UTC(year, month, 1)).toISOString().slice(0, 10)
  const endDate = now.toISOString().slice(0, 10)
  return { startDate, endDate }
}

function parseDateRange(query) {
  const defaults = defaultDateRange()
  const startDate = query.startDate || defaults.startDate
  const endDate = query.endDate || defaults.endDate

  if (!DATE_RE.test(startDate) || !DATE_RE.test(endDate)) {
    return { error: 'startDate and endDate must be in YYYY-MM-DD format' }
  }

  const [sy, sm, sd] = startDate.split('-').map(Number)
  const [ey, em, ed] = endDate.split('-').map(Number)

  const start = new Date(Date.UTC(sy, sm - 1, sd))
  const end = new Date(Date.UTC(ey, em - 1, ed + 1))

  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    return { error: 'startDate or endDate is not a valid date' }
  }
  if (start >= end) {
    return { error: 'startDate must be before endDate' }
  }

  return { start: start.toISOString(), end: end.toISOString() }
}

// GET /api/sales-manager/revenue?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD
router.get('/', async (req, res) => {
  const range = parseDateRange(req.query)
  if (range.error) return res.status(400).json({ error: range.error })
  const { start, end } = range

  // Revenue is summed directly from orders to avoid fan-out from the items JOIN.
  // Cost is summed from order_items × products in a separate CTE.
  const summaryResult = await pool.query(
    `WITH rev AS (
       SELECT COALESCE(SUM(total + shipping_cost), 0) AS total_revenue
       FROM orders
       WHERE created_at >= $1 AND created_at < $2 AND status != 'cancelled'
     ),
     costs AS (
       SELECT
         COALESCE(SUM(oi.quantity * COALESCE(p.cost_price, 0)), 0) AS total_cost,
         COUNT(DISTINCT CASE WHEN p.cost_price IS NULL THEN p.id END) AS missing_cost_products
       FROM orders o
       JOIN order_items oi ON oi.order_id = o.id
       JOIN products p ON p.id = oi.product_id
       WHERE o.created_at >= $1 AND o.created_at < $2 AND o.status != 'cancelled'
     )
     SELECT
       r.total_revenue,
       c.total_cost,
       (r.total_revenue - c.total_cost) AS net_profit_loss,
       c.missing_cost_products
     FROM rev r, costs c`,
    [start, end]
  )

  const dailyResult = await pool.query(
    `WITH daily_rev AS (
       SELECT DATE(created_at) AS date, SUM(total + shipping_cost) AS revenue
       FROM orders
       WHERE created_at >= $1 AND created_at < $2 AND status != 'cancelled'
       GROUP BY DATE(created_at)
     ),
     daily_cost AS (
       SELECT DATE(o.created_at) AS date,
              SUM(oi.quantity * COALESCE(p.cost_price, 0)) AS cost
       FROM orders o
       JOIN order_items oi ON oi.order_id = o.id
       JOIN products p ON p.id = oi.product_id
       WHERE o.created_at >= $1 AND o.created_at < $2 AND o.status != 'cancelled'
       GROUP BY DATE(o.created_at)
     )
     SELECT
       r.date::text,
       r.revenue,
       COALESCE(c.cost, 0) AS cost,
       (r.revenue - COALESCE(c.cost, 0)) AS profit_loss
     FROM daily_rev r
     LEFT JOIN daily_cost c ON c.date = r.date
     ORDER BY r.date`,
    [start, end]
  )

  res.json({
    summary: summaryResult.rows[0],
    daily: dailyResult.rows,
  })
})

module.exports = router
