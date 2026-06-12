const express = require('express')
const authenticate = require('../middleware/auth')
const requireSalesManager = require('../middleware/sales-manager')
const pool = require('../db')
const {
  buildInvoiceData,
  generateInvoicePdf,
  inferCustomerName,
  registerInvoiceFonts,
} = require('../services/invoice')
const PDFDocument = require('pdfkit')
const { decryptField } = require('../services/secure-fields')

const router = express.Router()

router.use(authenticate)
router.use(requireSalesManager)

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/

function invoiceNumberFor(order) {
  const year = new Date(order.created_at).getFullYear()
  return `INV-${year}-${String(order.id).padStart(6, '0')}`
}

function buildInvoiceFromOrder(order, items) {
  const address = decryptField(order.address)
  return buildInvoiceData(
    {
      invoice_number: invoiceNumberFor(order),
      order_id: String(order.id),
      customer_name: order.customer_name || inferCustomerName(order.user_email),
      customer_email: order.user_email,
      customer_address: address || 'Address not provided',
      shipping_cost: Number(order.shipping_cost ?? 0),
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

  // Validate YYYY-MM-DD format and that the values form real dates
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

// GET /api/sales-manager/invoices/export/pdf — must be before /:orderId
router.get('/export/pdf', async (req, res) => {
  const range = parseDateRange(req.query)
  if (range.error) return res.status(400).json({ error: range.error })
  const { start, end } = range

  const ordersResult = await pool.query(
    `SELECT o.id, o.status, o.total, o.shipping_cost, o.address, o.created_at,
            u.email AS user_email, c.name AS customer_name
     FROM orders o
     JOIN auth.users u ON u.id = o.user_id
     LEFT JOIN auth.customers c ON c.customer_id = o.user_id
     WHERE o.created_at >= $1 AND o.created_at < $2
     ORDER BY o.created_at DESC`,
    [start, end]
  )

  const orders = ordersResult.rows

  // Fetch all items for the selected orders in a single query, then group in memory
  const invoices = []
  if (orders.length > 0) {
    const orderIds = orders.map((o) => o.id)
    const itemsResult = await pool.query(
      `SELECT oi.order_id, oi.quantity, oi.price, p.name AS product_name
       FROM order_items oi
       JOIN products p ON p.id = oi.product_id
       WHERE oi.order_id = ANY($1)
       ORDER BY oi.order_id, oi.id`,
      [orderIds]
    )

    const itemsByOrder = itemsResult.rows.reduce((acc, row) => {
      if (!acc[row.order_id]) acc[row.order_id] = []
      acc[row.order_id].push(row)
      return acc
    }, {})

    for (const order of orders) {
      invoices.push(buildInvoiceFromOrder(order, itemsByOrder[order.id] ?? []))
    }
  }

  const startLabel = req.query.startDate || defaultDateRange().startDate
  const endLabel = req.query.endDate || defaultDateRange().endDate

  const pdf = await new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50, size: 'A4' })
    const chunks = []
    doc.on('data', (chunk) => chunks.push(chunk))
    doc.on('end', () => resolve(Buffer.concat(chunks)))
    doc.on('error', reject)

    // Embedded Unicode font — built-in Helvetica can't render Turkish characters
    const fonts = registerInvoiceFonts(doc)

    // Cover page
    doc.fontSize(22).font(fonts.bold).text('FIER', { align: 'center' })
    doc.moveDown(0.5)
    doc.fontSize(16).font(fonts.regular).text('Invoice Export', { align: 'center' })
    doc.moveDown(0.3)
    doc.fontSize(12).text(`Period: ${startLabel} to ${endLabel}`, { align: 'center' })
    doc.moveDown(0.3)
    doc.fontSize(10).text(`Generated: ${new Date().toISOString()}`, { align: 'center' })
    doc.moveDown(0.5)
    doc.fontSize(10).text(`Total invoices: ${invoices.length}`, { align: 'center' })

    for (const invoice of invoices) {
      doc.addPage()
      doc.fontSize(14).font(fonts.bold).text(`Invoice ${invoice.number}`)
      doc.fontSize(10).font(fonts.regular)
      doc.text(`Order ID: ${invoice.order_id}`)
      doc.text(`Date: ${invoice.date_str}`)
      doc.text(`Customer: ${invoice.customer_name} <${invoice.customer_email}>`)
      doc.moveDown(0.5)

      doc.font(fonts.bold).text('Items:')
      doc.font(fonts.regular)
      for (const item of invoice.items) {
        doc.text(
          `  ${item.description}  ×${item.quantity}  @ $${item.unit_price.toFixed(2)}  =  $${item.total.toFixed(2)}`
        )
      }
      doc.moveDown(0.5)
      doc.font(fonts.bold).text(`Total: $${invoice.total.toFixed(2)}`)
      doc
        .moveTo(50, doc.y + 10)
        .lineTo(545, doc.y + 10)
        .stroke()
    }

    doc.end()
  })

  res.setHeader('Content-Type', 'application/pdf')
  res.setHeader(
    'Content-Disposition',
    `attachment; filename="Invoices_${startLabel}_to_${endLabel}.pdf"`
  )
  res.send(pdf)
})

// GET /api/sales-manager/invoices
router.get('/', async (req, res) => {
  const range = parseDateRange(req.query)
  if (range.error) return res.status(400).json({ error: range.error })
  const { start, end } = range

  const page = Math.max(1, parseInt(req.query.page) || 1)
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 15))
  const offset = (page - 1) * limit

  const countResult = await pool.query(
    `SELECT COUNT(*) FROM orders o
     JOIN auth.users u ON u.id = o.user_id
     WHERE o.created_at >= $1 AND o.created_at < $2`,
    [start, end]
  )
  const total = parseInt(countResult.rows[0].count, 10)

  const dataResult = await pool.query(
    `SELECT o.id, o.status, o.total, o.shipping_cost, o.address, o.created_at,
            u.email AS user_email, c.name AS customer_name,
            COUNT(oi.id) AS item_count
     FROM orders o
     JOIN auth.users u ON u.id = o.user_id
     LEFT JOIN auth.customers c ON c.customer_id = o.user_id
     LEFT JOIN order_items oi ON oi.order_id = o.id
     WHERE o.created_at >= $1 AND o.created_at < $2
     GROUP BY o.id, u.email, c.name
     ORDER BY o.created_at DESC
     LIMIT $3 OFFSET $4`,
    [start, end, limit, offset]
  )

  const invoices = dataResult.rows.map((order) => {
    const subtotal = Math.round((Number(order.total) + Number.EPSILON) * 100) / 100
    const shipping_cost =
      Math.round((Number(order.shipping_cost ?? 0) + Number.EPSILON) * 100) / 100
    const invoice_total = Math.round((subtotal + shipping_cost + Number.EPSILON) * 100) / 100
    return {
      order_id: order.id,
      invoice_number: invoiceNumberFor(order),
      customer_name: order.customer_name || inferCustomerName(order.user_email),
      customer_email: order.user_email,
      order_date: order.created_at,
      item_count: parseInt(order.item_count, 10),
      subtotal,
      shipping_cost,
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
    `SELECT o.id, o.status, o.total, o.shipping_cost, o.address, o.created_at,
            u.id AS user_id, u.email AS user_email, c.name AS customer_name
     FROM orders o
     JOIN auth.users u ON u.id = o.user_id
     LEFT JOIN auth.customers c ON c.customer_id = o.user_id
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
      address: decryptField(loaded.order.address),
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
