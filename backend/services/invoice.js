const PDFDocument = require('pdfkit')

const DEFAULT_TAX_RATE = 0
const INVOICE_NUMBER_PATTERN = /^[A-Za-z0-9._-]+$/
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function roundMoney(value) {
  return Math.round((Number(value) + Number.EPSILON) * 100) / 100
}

function formatMoney(value) {
  return `$${roundMoney(value).toFixed(2)}`
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

function titleCase(value) {
  return value
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(' ')
}

function inferCustomerName(email) {
  const [localPart = 'Customer'] = String(email || '').split('@')
  return titleCase(localPart.replace(/[._-]+/g, ' ').trim()) || 'Customer'
}

function createInvoiceValidationError(field, msg, type = 'value_error') {
  return {
    loc: ['body', field],
    msg,
    type,
  }
}

function validateInvoiceRequest(payload) {
  const body = payload && typeof payload === 'object' ? payload : {}
  const errors = []

  const invoiceNumber = String(body.invoice_number || '').trim()
  const orderId = String(body.order_id || '').trim()
  const customerName = String(body.customer_name || '').trim()
  const customerEmail = String(body.customer_email || '').trim()
  const customerAddress = String(body.customer_address || '').trim()
  const items = Array.isArray(body.items) ? body.items : null

  if (!invoiceNumber) {
    errors.push(createInvoiceValidationError('invoice_number', 'Field required'))
  } else if (!INVOICE_NUMBER_PATTERN.test(invoiceNumber)) {
    errors.push(
      createInvoiceValidationError(
        'invoice_number',
        'invoice_number may only contain letters, digits, dots, hyphens, and underscores'
      )
    )
  }

  if (!orderId) {
    errors.push(createInvoiceValidationError('order_id', 'Field required'))
  }

  if (!customerName) {
    errors.push(createInvoiceValidationError('customer_name', 'Field required'))
  }

  if (!customerEmail) {
    errors.push(createInvoiceValidationError('customer_email', 'Field required'))
  } else if (!EMAIL_PATTERN.test(customerEmail)) {
    errors.push(
      createInvoiceValidationError('customer_email', 'value is not a valid email address')
    )
  }

  if (!customerAddress) {
    errors.push(createInvoiceValidationError('customer_address', 'Field required'))
  }

  if (items === null) {
    errors.push(createInvoiceValidationError('items', 'Field required'))
  } else {
    items.forEach((item, index) => {
      const description = String(item?.description || '').trim()
      const quantity = Number(item?.quantity)
      const unitPrice = Number(item?.unit_price)

      if (!description) {
        errors.push({
          loc: ['body', 'items', index, 'description'],
          msg: 'Field required',
          type: 'value_error',
        })
      }

      if (!Number.isInteger(quantity) || quantity < 1) {
        errors.push({
          loc: ['body', 'items', index, 'quantity'],
          msg: 'quantity must be an integer greater than or equal to 1',
          type: 'value_error.number.not_ge',
        })
      }

      if (Number.isNaN(unitPrice) || unitPrice < 0) {
        errors.push({
          loc: ['body', 'items', index, 'unit_price'],
          msg: 'unit_price must be a number greater than or equal to 0',
          type: 'value_error.number.not_ge',
        })
      }
    })
  }

  if (errors.length > 0) {
    return { ok: false, errors }
  }

  return {
    ok: true,
    value: {
      invoice_number: invoiceNumber,
      order_id: orderId,
      customer_name: customerName,
      customer_email: customerEmail,
      customer_address: customerAddress,
      items: items.map((item) => ({
        description: String(item.description).trim(),
        quantity: Number(item.quantity),
        unit_price: roundMoney(item.unit_price),
      })),
    },
  }
}

function buildInvoiceData(request, options = {}) {
  const taxRate = options.taxRate ?? DEFAULT_TAX_RATE
  const date = options.date ?? new Date()

  const items = request.items.map((item) => {
    const unit_price = roundMoney(item.unit_price)

    return {
      description: item.description,
      quantity: item.quantity,
      unit_price,
      total: roundMoney(item.quantity * unit_price),
    }
  })
  const subtotal = roundMoney(items.reduce((sum, item) => sum + item.total, 0))
  const shipping_cost = roundMoney(request.shipping_cost ?? 0)
  const tax_amount = roundMoney(subtotal * taxRate)
  const total = roundMoney(subtotal + shipping_cost + tax_amount)

  return {
    number: request.invoice_number,
    order_id: request.order_id,
    customer_name: request.customer_name,
    customer_email: request.customer_email,
    customer_address: request.customer_address,
    items,
    date,
    date_str: date.toLocaleDateString('en-US', {
      month: 'long',
      day: '2-digit',
      year: 'numeric',
    }),
    subtotal,
    shipping_cost,
    tax_rate: taxRate,
    tax_amount,
    total,
  }
}

function createInvoiceEmailBody(customerName) {
  const safeName = escapeHtml(customerName)

  return `
    <h2>Hello ${safeName}!</h2>
    <p>Thank you for your order with FIER. Please find your invoice attached below.</p>
    <p>Warm regards,<br>The FIER Team</p>
  `.trim()
}

function generateInvoicePdf(invoice) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: 'A4',
      margins: {
        top: 50,
        right: 60,
        bottom: 50,
        left: 60,
      },
    })
    const chunks = []

    doc.on('data', (chunk) => chunks.push(chunk))
    doc.on('end', () => resolve(Buffer.concat(chunks)))
    doc.on('error', reject)

    const colors = {
      primary: '#9d7cff',
      text: '#1e1e2d',
      muted: '#777791',
      border: '#e2e2ed',
    }

    doc.rect(60, 48, 60, 6).fill(colors.primary)
    doc.fillColor(colors.text).fontSize(28).font('Helvetica-Bold').text('FIER', 60, 70)
    doc
      .fontSize(10)
      .fillColor(colors.muted)
      .font('Helvetica')
      .text('Premium Fashion for Every Individual', 60, 102)

    doc
      .fillColor(colors.primary)
      .fontSize(11)
      .font('Helvetica-Bold')
      .text('INVOICE', 390, 72, { align: 'right', width: 150 })
    doc
      .fillColor(colors.text)
      .fontSize(16)
      .text(`#${invoice.number}`, 390, 90, { align: 'right', width: 150 })
    doc
      .font('Helvetica')
      .fontSize(10)
      .fillColor(colors.muted)
      .text(`Order No: ${invoice.order_id}`, 390, 114, { align: 'right', width: 150 })
      .text(invoice.date_str, 390, 128, { align: 'right', width: 150 })

    doc.moveTo(60, 150).lineTo(535, 150).strokeColor(colors.border).lineWidth(2).stroke()

    doc
      .fillColor(colors.muted)
      .fontSize(9)
      .font('Helvetica-Bold')
      .text('BILLED TO', 60, 175)
      .text('ISSUED BY', 350, 175, { width: 185, align: 'right' })

    const customerSectionX = 60
    const customerSectionWidth = 220
    const customerNameY = 192
    const customerGap = 4

    doc.fillColor(colors.text).fontSize(11).font('Helvetica-Bold')
    const customerNameHeight = doc.heightOfString(invoice.customer_name, {
      width: customerSectionWidth,
    })
    doc.text(invoice.customer_name, customerSectionX, customerNameY, {
      width: customerSectionWidth,
    })

    doc.font('Helvetica').fontSize(10)
    const customerAddressY = customerNameY + customerNameHeight + customerGap
    const customerAddressHeight = doc.heightOfString(invoice.customer_address, {
      width: customerSectionWidth,
    })
    doc.text(invoice.customer_address, customerSectionX, customerAddressY, {
      width: customerSectionWidth,
    })

    const customerEmailY = customerAddressY + customerAddressHeight + customerGap
    const customerEmailHeight = doc.heightOfString(invoice.customer_email, {
      width: customerSectionWidth,
    })
    doc.text(invoice.customer_email, customerSectionX, customerEmailY, {
      width: customerSectionWidth,
    })
    const customerDetailsBottom = customerEmailY + customerEmailHeight

    const issuerSectionX = 350
    const issuerSectionWidth = 185
    const issuerNameY = 192

    doc.font('Helvetica-Bold').fontSize(11)
    const issuerNameHeight = doc.heightOfString('FIER Store', { width: issuerSectionWidth })
    doc.text('FIER Store', issuerSectionX, issuerNameY, {
      width: issuerSectionWidth,
      align: 'right',
    })

    doc.font('Helvetica').fontSize(10)
    const issuerEmailY = issuerNameY + issuerNameHeight + customerGap
    const issuerEmailHeight = doc.heightOfString('support@fier.com', { width: issuerSectionWidth })
    doc.text('support@fier.com', issuerSectionX, issuerEmailY, {
      width: issuerSectionWidth,
      align: 'right',
    })

    const issuerWebsiteY = issuerEmailY + issuerEmailHeight + customerGap
    const issuerWebsiteHeight = doc.heightOfString('www.fier.com', { width: issuerSectionWidth })
    doc.text('www.fier.com', issuerSectionX, issuerWebsiteY, {
      width: issuerSectionWidth,
      align: 'right',
    })
    const issuerDetailsBottom = issuerWebsiteY + issuerWebsiteHeight

    const detailsBottom = Math.max(customerDetailsBottom, issuerDetailsBottom)
    const tableTop = Math.max(285, detailsBottom + 35)
    const descriptionX = 60
    const qtyX = 305
    const priceX = 380
    const amountX = 465

    doc
      .moveTo(60, tableTop - 10)
      .lineTo(535, tableTop - 10)
      .strokeColor(colors.border)
      .lineWidth(1)
      .stroke()

    doc
      .font('Helvetica-Bold')
      .fontSize(9)
      .fillColor(colors.text)
      .text('DESCRIPTION', descriptionX, tableTop)
      .text('QTY', qtyX, tableTop, { width: 30, align: 'center' })
      .text('PRICE', priceX, tableTop, { width: 60, align: 'right' })
      .text('AMOUNT', amountX, tableTop, { width: 70, align: 'right' })

    let y = tableTop + 24
    doc.font('Helvetica').fontSize(10)

    if (invoice.items.length === 0) {
      doc
        .fillColor(colors.muted)
        .text('No billable items', descriptionX, y)
        .moveTo(60, y + 20)
        .lineTo(535, y + 20)
        .strokeColor(colors.border)
        .stroke()
      y += 34
    } else {
      invoice.items.forEach((item) => {
        doc
          .fillColor(colors.text)
          .text(item.description, descriptionX, y, { width: 200 })
          .text(String(item.quantity), qtyX, y, { width: 30, align: 'center' })
          .text(formatMoney(item.unit_price), priceX, y, { width: 60, align: 'right' })
          .text(formatMoney(item.total), amountX, y, { width: 70, align: 'right' })

        const rowBottom = doc.y + 10
        doc.moveTo(60, rowBottom).lineTo(535, rowBottom).strokeColor(colors.border).stroke()
        y = rowBottom + 12
      })
    }

    const totalsX = 355
    const totalsWidth = 180

    doc
      .font('Helvetica')
      .fillColor(colors.muted)
      .fontSize(10)
      .text('Subtotal', totalsX, y + 20, { width: 80 })
      .fillColor(colors.text)
      .text(formatMoney(invoice.subtotal), totalsX + 100, y + 20, {
        width: 80,
        align: 'right',
      })

    const shippingLabel = invoice.shipping_cost === 0 ? 'Shipping (Free)' : 'Shipping'
    doc
      .fillColor(colors.muted)
      .text(shippingLabel, totalsX, y + 40, { width: 80 })
      .fillColor(colors.text)
      .text(formatMoney(invoice.shipping_cost), totalsX + 100, y + 40, {
        width: 80,
        align: 'right',
      })

    doc
      .fillColor(colors.muted)
      .text(`Tax (${Math.round(invoice.tax_rate * 100)}%)`, totalsX, y + 60, { width: 80 })
      .fillColor(colors.text)
      .text(formatMoney(invoice.tax_amount), totalsX + 100, y + 60, {
        width: 80,
        align: 'right',
      })

    doc
      .moveTo(totalsX, y + 86)
      .lineTo(totalsX + totalsWidth, y + 86)
      .strokeColor(colors.primary)
      .lineWidth(2)
      .stroke()

    doc
      .font('Helvetica-Bold')
      .fontSize(15)
      .fillColor(colors.primary)
      .text('Total', totalsX, y + 96, { width: 80 })
      .text(formatMoney(invoice.total), totalsX + 100, y + 96, { width: 80, align: 'right' })

    doc.moveTo(60, 730).lineTo(535, 730).strokeColor(colors.border).lineWidth(1).stroke()
    doc
      .font('Helvetica')
      .fontSize(9)
      .fillColor(colors.muted)
      .text('Thank you for choosing FIER. We hope you enjoy your purchase!', 60, 744, {
        width: 475,
        align: 'center',
      })
      .text('This is a computer-generated invoice. No signature required.', 60, 758, {
        width: 475,
        align: 'center',
      })

    doc.end()
  })
}

module.exports = {
  buildInvoiceData,
  createInvoiceEmailBody,
  generateInvoicePdf,
  inferCustomerName,
  validateInvoiceRequest,
}
