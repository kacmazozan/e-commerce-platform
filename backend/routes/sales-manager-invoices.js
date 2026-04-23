const express = require('express')
const authenticate = require('../middleware/auth')
const requireSalesManager = require('../middleware/sales-manager')
const pool = require('../db')
const { buildInvoiceData, generateInvoicePdf, inferCustomerName } = require('../services/invoice')
const PDFDocument = require('pdfkit')

const router = express.Router()

router.use(authenticate)
router.use(requireSalesManager)

const TAX_RATE = 0.2

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

  // Parse as UTC to avoid local-timezone shifting on YYYY-MM-DD strings
  const [sy, sm, sd] = startDate.split('-').map(Number)
  const [ey, em, ed] = endDate.split('-').map(Number)

  const start = new Date(Date.UTC(sy, sm - 1, sd))
  // advance end by 1 day so that the full endDate day is included
  const end = new Date(Date.UTC(ey, em - 1, ed + 1))

  return { start: start.toISOString(), end: end.toISOString() }
}

// GET /api/sales-manager/invoices/export/pdf — must be before /:orderId
router.get('/export/pdf', async (req, res) => {
  const { start, end } = parseDateRange(req.query)

  const ordersResult = await pool.query(
    `SELECT o.id, o.status, o.total, o.address, o.created_at,
            u.email AS user_email
     FROM orders o
     JOIN auth.users u ON u.id = o.user_id
     WHERE o.created_at >= $1 AND o.created_at < $2
     ORDER BY o.created_at DESC`,
    [start, end]
  )

  const orders = ordersResult.rows

  // Build invoices with items for each order
  const invoices = await Promise.all(
    orders.map(async (order) => {
      const itemsResult = await pool.query(
        `SELECT oi.id, oi.quantity, oi.price, p.name AS product_name
         FROM order_items oi
         JOIN products p ON p.id = oi.product_id
         WHERE oi.order_id = $1
         ORDER BY oi.id`,
        [order.id]
      )
      return buildInvoiceFromOrder(order, itemsResult.rows)
    })
  )

  const startLabel = req.query.startDate || defaultDateRange().startDate
  const endLabel = req.query.endDate || defaultDateRange().endDate

  const doc = new PDFDocument({ margin: 50, size: 'A4' })
  const chunks = []
  doc.on('data', (chunk) => chunks.push(chunk))

  const pdfReady = new Promise((resolve) => doc.on('end', () => resolve(Buffer.concat(chunks))))

  // Cover page
  doc.fontSize(22).font('Helvetica-Bold').text('FIER', { align: 'center' })
  doc.moveDown(0.5)
  doc.fontSize(16).font('Helvetica').text('Invoice Export', { align: 'center' })
  doc.moveDown(0.3)
  doc.fontSize(12).text(`Period: ${startLabel} to ${endLabel}`, { align: 'center' })
  doc.moveDown(0.3)
  doc.fontSize(10).text(`Generated: ${new Date().toISOString()}`, { align: 'center' })
  doc.moveDown(0.5)
  doc.fontSize(10).text(`Total invoices: ${invoices.length}`, { align: 'center' })

  for (const invoice of invoices) {
    doc.addPage()
    doc.fontSize(14).font('Helvetica-Bold').text(`Invoice ${invoice.number}`)
    doc.fontSize(10).font('Helvetica')
    doc.text(`Order ID: ${invoice.order_id}`)
    doc.text(`Date: ${invoice.date_str}`)
    doc.text(`Customer: ${invoice.customer_name} <${invoice.customer_email}>`)
    doc.moveDown(0.5)

    doc.font('Helvetica-Bold').text('Items:')
    doc.font('Helvetica')
    for (const item of invoice.items) {
      doc.text(
        `  ${item.description}  ×${item.quantity}  @ $${item.unit_price.toFixed(2)}  =  $${item.total.toFixed(2)}`
      )
    }
    doc.moveDown(0.5)
    doc.text(`Subtotal: $${invoice.subtotal.toFixed(2)}`)
    doc.text(`Tax (20%): $${invoice.tax_amount.toFixed(2)}`)
    doc.font('Helvetica-Bold').text(`Total: $${invoice.total.toFixed(2)}`)
    doc
      .moveTo(50, doc.y + 10)
      .lineTo(545, doc.y + 10)
      .stroke()
  }

  doc.end()
  const pdf = await pdfReady

  res.setHeader('Content-Type', 'application/pdf')
  res.setHeader(
    'Content-Disposition',
    `attachment; filename="Invoices_${startLabel}_to_${endLabel}.pdf"`
  )
  res.send(pdf)
})

// GET /api/sales-manager/invoices
router.get('/', async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page) || 1)
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 15))
  const offset = (page - 1) * limit
  const { start, end } = parseDateRange(req.query)

  const countResult = await pool.query(
    `SELECT COUNT(*) FROM orders o
     JOIN auth.users u ON u.id = o.user_id
     WHERE o.created_at >= $1 AND o.created_at < $2`,
    [start, end]
  )
  const total = parseInt(countResult.rows[0].count, 10)

  const dataResult = await pool.query(
    `SELECT o.id, o.status, o.total, o.address, o.created_at,
            u.email AS user_email,
            COUNT(oi.id) AS item_count
     FROM orders o
     JOIN auth.users u ON u.id = o.user_id
     LEFT JOIN order_items oi ON oi.order_id = o.id
     WHERE o.created_at >= $1 AND o.created_at < $2
     GROUP BY o.id, u.email
     ORDER BY o.created_at DESC
     LIMIT $3 OFFSET $4`,
    [start, end, limit, offset]
  )

  const invoices = dataResult.rows.map((order) => {
    const subtotal = Math.round((Number(order.total) + Number.EPSILON) * 100) / 100
    const tax_amount = Math.round((subtotal * TAX_RATE + Number.EPSILON) * 100) / 100
    const invoice_total = Math.round((subtotal + tax_amount + Number.EPSILON) * 100) / 100
    return {
      order_id: order.id,
      invoice_number: invoiceNumberFor(order),
      customer_name: inferCustomerName(order.user_email),
      customer_email: order.user_email,
      order_date: order.created_at,
      item_count: parseInt(order.item_count, 10),
      subtotal,
      tax_rate: TAX_RATE,
      tax_amount,
      total: invoice_total,
      status: order.status,
    }
  })

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

// GET /api/sales-manager/invoices/:orderId
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

// GET /api/sales-manager/invoices/:orderId/pdf
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
