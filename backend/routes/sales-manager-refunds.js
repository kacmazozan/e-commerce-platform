const express = require('express')
const pool = require('../db')
const authenticate = require('../middleware/auth')
const requireSalesManager = require('../middleware/sales-manager')

const router = express.Router()
router.use(authenticate)
router.use(requireSalesManager)

router.get('/', async (req, res) => {
  const status = req.query.status || 'pending'
  const page = Math.max(1, parseInt(req.query.page, 10) || 1)
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20))
  const offset = (page - 1) * limit

  const validStatuses = ['pending', 'approved', 'rejected']
  if (!validStatuses.includes(status) && status !== 'all') {
    return res.status(400).json({ error: 'Invalid status filter' })
  }

  try {
    const whereClause = status === 'all' ? '' : `WHERE r.status = $1`
    const countParams = status === 'all' ? [] : [status]
    const countRes = await pool.query(`SELECT COUNT(*) FROM refunds r ${whereClause}`, countParams)
    const total = parseInt(countRes.rows[0].count, 10)

    const dataParams = status === 'all' ? [limit, offset] : [status, limit, offset]
    const limitPlaceholder = status === 'all' ? '$1' : '$2'
    const offsetPlaceholder = status === 'all' ? '$2' : '$3'

    const { rows } = await pool.query(
      `SELECT r.id, r.status, r.refund_amount, r.requested_at, r.updated_at,
              c.name AS customer_name,
              p.name AS product_name,
              oi.quantity,
              o.id AS order_id,
              o.created_at AS purchase_date
       FROM refunds r
       JOIN order_items oi ON oi.id = r.order_item_id
       JOIN orders o ON o.id = oi.order_id
       JOIN products p ON p.id = oi.product_id
       JOIN auth.customers c ON c.customer_id = r.user_id
       ${whereClause}
       ORDER BY r.requested_at DESC
       LIMIT ${limitPlaceholder} OFFSET ${offsetPlaceholder}`,
      dataParams
    )

    res.json({
      refunds: rows,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

router.patch('/:id/approve', async (req, res) => {
  const refundId = parseInt(req.params.id, 10)
  if (!refundId) return res.status(400).json({ error: 'Invalid refund id' })

  let client
  try {
    client = await pool.connect()

    const { rows } = await client.query(
      `SELECT r.id, r.status, r.refund_amount, r.user_id,
              oi.product_id, oi.quantity, oi.size,
              p.name AS product_name,
              o.created_at AS purchase_date
       FROM refunds r
       JOIN order_items oi ON oi.id = r.order_item_id
       JOIN orders o ON o.id = oi.order_id
       JOIN products p ON p.id = oi.product_id
       WHERE r.id = $1`,
      [refundId]
    )
    if (rows.length === 0) return res.status(404).json({ error: 'Refund not found' })

    const refund = rows[0]

    if (refund.status !== 'pending') {
      return res.status(409).json({ error: `Refund is already ${refund.status}` })
    }

    const ageMs = Date.now() - new Date(refund.purchase_date).getTime()
    if (ageMs > 30 * 24 * 60 * 60 * 1000) {
      return res.status(422).json({ error: 'Refund window expired (30 days from purchase)' })
    }

    await client.query('BEGIN')
    await client.query(`UPDATE refunds SET status = 'approved', updated_at = NOW() WHERE id = $1`, [
      refundId,
    ])
    if (refund.size) {
      // Sized products track per-size stock as well. Upsert so a missing
      // (product_id, size) row can't silently no-op, then resync the aggregate
      // to keep products.stock == SUM(product_size_stock.stock).
      await client.query(
        `INSERT INTO product_size_stock (product_id, size, stock)
         VALUES ($1, $2, $3)
         ON CONFLICT (product_id, size)
         DO UPDATE SET stock = product_size_stock.stock + EXCLUDED.stock`,
        [refund.product_id, refund.size, refund.quantity]
      )
      await client.query(
        `UPDATE products
         SET stock = (SELECT COALESCE(SUM(stock), 0) FROM product_size_stock WHERE product_id = $1)
         WHERE id = $1`,
        [refund.product_id]
      )
    } else {
      await client.query(`UPDATE products SET stock = stock + $1 WHERE id = $2`, [
        refund.quantity,
        refund.product_id,
      ])
    }
    await client.query(
      `UPDATE auth.customers SET credit_balance = credit_balance + $1 WHERE customer_id = $2`,
      [refund.refund_amount, refund.user_id]
    )
    await client.query('COMMIT')

    pool
      .query(
        `INSERT INTO notifications (user_id, product_id, product_name, type, message)
         VALUES ($1, $2, $3, 'refund_decision', $4)`,
        [
          refund.user_id,
          refund.product_id,
          refund.product_name,
          `Your refund of $${parseFloat(refund.refund_amount).toFixed(2)} for "${refund.product_name}" has been approved.`,
        ]
      )
      .catch((e) => console.error('refund notification insert failed:', e))

    res.json({ refund: { id: refundId, status: 'approved', refund_amount: refund.refund_amount } })
  } catch (err) {
    if (client) await client.query('ROLLBACK').catch(() => {})
    console.error(err)
    res.status(500).json({ error: 'Internal server error' })
  } finally {
    if (client) client.release()
  }
})

router.patch('/:id/reject', async (req, res) => {
  const refundId = parseInt(req.params.id, 10)
  if (!refundId) return res.status(400).json({ error: 'Invalid refund id' })

  try {
    const { rows } = await pool.query(
      `SELECT r.id, r.status, r.user_id, oi.product_id, p.name AS product_name
       FROM refunds r
       JOIN order_items oi ON oi.id = r.order_item_id
       JOIN products p ON p.id = oi.product_id
       WHERE r.id = $1`,
      [refundId]
    )
    if (rows.length === 0) return res.status(404).json({ error: 'Refund not found' })

    const refund = rows[0]

    if (refund.status !== 'pending') {
      return res.status(409).json({ error: `Refund is already ${refund.status}` })
    }

    await pool.query(`UPDATE refunds SET status = 'rejected', updated_at = NOW() WHERE id = $1`, [
      refundId,
    ])

    pool
      .query(
        `INSERT INTO notifications (user_id, product_id, product_name, type, message)
         VALUES ($1, $2, $3, 'refund_decision', $4)`,
        [
          refund.user_id,
          refund.product_id,
          refund.product_name,
          `Your refund request for "${refund.product_name}" has been rejected.`,
        ]
      )
      .catch((e) => console.error('refund notification insert failed:', e))

    res.json({ refund: { id: refundId, status: 'rejected' } })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

module.exports = router
