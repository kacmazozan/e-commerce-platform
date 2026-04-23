const express = require('express')
const authenticate = require('../middleware/auth')
const requireProductManager = require('../middleware/product-manager')
const pool = require('../db')
const { buildInvoiceData, generateInvoicePdf, inferCustomerName } = require('../services/invoice')

const router = express.Router()

router.use(authenticate)
router.use(requireProductManager)

const VALID_STATUSES = ['pending', 'processing', 'shipped', 'delivered', 'cancelled']

function invoiceNumberFor(order) {
  const year = new Date(order.created_at).getFullYear()
  return `INV-${year}-${String(order.id).padStart(6, '0')}`
}

function buildInvoiceFromOrder(order, items) {
  return buildInvoiceData(
    {
      invoice_number: invoiceNumberFor(order),
      order_id: String(order.id),
      customer_name: inferCustomerName(order.user_email),
      customer_email: order.user_email,
      customer_address: order.address || 'Address not provided',
      items: items.map((item) => ({
        description: item.product_name,
        quantity: item.quantity,
        unit_price: Number(item.price),
      })),
    },
    { date: new Date(order.created_at) }
  )
}

// GET /api/product-manager/invoices
router.get('/', async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page) || 1)
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 10))
  const offset = (page - 1) * limit
  const status = (req.query.status || '').trim()
  const search = (req.query.search || '').trim()

  const where = []
  const params = []
  let idx = 1

  if (status && VALID_STATUSES.includes(status)) {
    where.push(`o.status = $${idx}::order_status`)
    params.push(status)
    idx++
  }
  if (search) {
    if (/^\d+$/.test(search)) {
      where.push(`(u.email ILIKE $${idx} OR o.id = $${idx + 1})`)
      params.push(`%${search}%`, parseInt(search, 10))
      idx += 2
    } else {
      where.push(`u.email ILIKE $${idx}`)
      params.push(`%${search}%`)
      idx++
    }
  }

  const whereClause = where.length ? `WHERE ${where.join(' AND ')}` : ''

  const countResult = await pool.query(
    `SELECT COUNT(*) FROM orders o JOIN auth.users u ON u.id = o.user_id ${whereClause}`,
    params
  )
  const total = parseInt(countResult.rows[0].count)

  const dataResult = await pool.query(
    `SELECT o.id, o.status, o.total, o.address, o.created_at,
            u.id AS user_id, u.email AS user_email
     FROM orders o
     JOIN auth.users u ON u.id = o.user_id
     ${whereClause}
     ORDER BY o.created_at DESC
     LIMIT $${idx} OFFSET $${idx + 1}`,
    [...params, limit, offset]
  )

  const invoices = dataResult.rows.map((order) => ({
    order_id: order.id,
    invoice_number: invoiceNumberFor(order),
    customer_name: inferCustomerName(order.user_email),
    customer_email: order.user_email,
    total: order.total,
    status: order.status,
    issued_at: order.created_at,
  }))

  res.json({
    invoices,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  })
})

async function loadOrderAndItems(orderId) {
  const orderResult = await pool.query(
    `SELECT o.id, o.status, o.total, o.address, o.created_at,
            u.id AS user_id, u.email AS user_email
     FROM orders o
     JOIN auth.users u ON u.id = o.user_id
     WHERE o.id = $1`,
    [orderId]
  )
  if (orderResult.rows.length === 0) return null

  const itemsResult = await pool.query(
    `SELECT oi.id, oi.quantity, oi.price, p.id AS product_id, p.name AS product_name
     FROM order_items oi
     JOIN products p ON p.id = oi.product_id
     WHERE oi.order_id = $1
     ORDER BY oi.id`,
    [orderId]
  )

  return { order: orderResult.rows[0], items: itemsResult.rows }
}

// GET /api/product-manager/invoices/:orderId
router.get('/:orderId', async (req, res) => {
  const orderId = Number(req.params.orderId)
  if (!Number.isInteger(orderId) || orderId <= 0) {
    return res.status(400).json({ error: 'Invalid order ID' })
  }

  const loaded = await loadOrderAndItems(orderId)
  if (!loaded) return res.status(404).json({ error: 'Invoice not found' })

  const invoice = buildInvoiceFromOrder(loaded.order, loaded.items)
  res.json({
    invoice,
    order: {
      id: loaded.order.id,
      status: loaded.order.status,
      address: loaded.order.address,
      user_id: loaded.order.user_id,
      user_email: loaded.order.user_email,
      created_at: loaded.order.created_at,
    },
  })
})

// GET /api/product-manager/invoices/:orderId/pdf
router.get('/:orderId/pdf', async (req, res) => {
  const orderId = Number(req.params.orderId)
  if (!Number.isInteger(orderId) || orderId <= 0) {
    return res.status(400).json({ error: 'Invalid order ID' })
  }

  const loaded = await loadOrderAndItems(orderId)
  if (!loaded) return res.status(404).json({ error: 'Invoice not found' })

  const invoice = buildInvoiceFromOrder(loaded.order, loaded.items)
  const pdf = await generateInvoicePdf(invoice)

  res.setHeader('Content-Type', 'application/pdf')
  res.setHeader('Content-Disposition', `attachment; filename="Invoice_${invoice.number}.pdf"`)
  res.send(pdf)
})

module.exports = router
