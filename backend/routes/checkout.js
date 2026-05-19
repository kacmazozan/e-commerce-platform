const express = require('express')
const authenticate = require('../middleware/auth')
const pool = require('../db')
const { inferCustomerName } = require('../services/invoice')
const { queueInvoiceRequest } = require('../services/invoice-workflow')
const { encryptField } = require('../services/secure-fields')
const {
  ensureSavedPaymentMethod,
  normalizeCardPayload,
} = require('../services/payment-methods')

const router = express.Router()
router.use(authenticate)

const RESERVATION_MINUTES = 10

async function resolveStoredPaymentMethod(userId, paymentMethodId) {
  const id = Number(paymentMethodId)
  if (!Number.isInteger(id) || id <= 0) {
    return { error: 'Invalid saved card selected' }
  }

  const result = await pool.query(
    `SELECT id
     FROM customer_payment_methods
     WHERE id = $1 AND user_id = $2`,
    [id, userId]
  )

  const row = result.rows[0]
  if (!row) return { error: 'Saved card not found' }

  return { paymentMethodId: id }
}

async function resolveCheckoutPayment(req, userId) {
  const savedPaymentMethodId = req.body.paymentMethodId ?? req.body.payment_method_id
  if (savedPaymentMethodId) {
    return resolveStoredPaymentMethod(userId, savedPaymentMethodId)
  }

  const paymentPayload = req.body.paymentMethod ?? req.body.payment_method ?? req.body.payment
  const normalized = normalizeCardPayload(paymentPayload, { requireCvv: true })
  if (normalized.error) return { error: normalized.error }

  return {
    newCard: normalized.card,
    savePaymentMethod: Boolean(req.body.savePaymentMethod ?? req.body.save_payment_method),
  }
}

// POST /api/checkout/reserve
// Soft-locks stock for every item in the user's cart.
// Returns { expires_at } on success, or 409 with unavailable items.
router.post('/reserve', async (req, res) => {
  const userId = req.user.userId

  const cartResult = await pool.query(
    'SELECT product_id, quantity, size FROM cart_items WHERE user_id = $1',
    [userId]
  )

  if (cartResult.rows.length === 0) {
    return res.status(400).json({ error: 'Cart is empty' })
  }

  // 1. Group items by product_id to check total requested against stock
  const aggregated = cartResult.rows.reduce((acc, item) => {
    const pid = item.product_id
    if (!acc[pid]) {
      acc[pid] = { id: pid, totalQuantity: 0, items: [] }
    }
    acc[pid].totalQuantity += item.quantity
    acc[pid].items.push(item)
    return acc
  }, {})

  const expiresAt = new Date(Date.now() + RESERVATION_MINUTES * 60 * 1000)
  const unavailable = []

  const client = await pool.connect()
  try {
    await client.query('BEGIN')

    for (const pid in aggregated) {
      const product = aggregated[pid]
      // Purge stale reservations for this product then lock the row
      await client.query(
        'DELETE FROM stock_reservations WHERE product_id = $1 AND expires_at < NOW()',
        [product.id]
      )

      const productResult = await client.query(
        'SELECT name, stock FROM products WHERE id = $1 FOR UPDATE',
        [product.id]
      )

      if (productResult.rows.length === 0) {
        unavailable.push({
          product_id: product.id,
          name: 'Unknown',
          requested: product.totalQuantity,
          available: 0,
        })
        continue
      }

      const { name, stock } = productResult.rows[0]

      const reservedResult = await client.query(
        `SELECT COALESCE(SUM(quantity), 0) AS reserved
           FROM stock_reservations
           WHERE product_id = $1 AND user_id != $2`,
        [product.id, userId]
      )
      const reservedByOthers = parseInt(reservedResult.rows[0].reserved)
      const available = stock - reservedByOthers

      if (available < product.totalQuantity) {
        unavailable.push({
          product_id: product.id,
          name,
          requested: product.totalQuantity,
          available: Math.max(0, available),
        })
      }
    }

    if (unavailable.length > 0) {
      await client.query('ROLLBACK')
      return res.status(409).json({ error: 'Some items are out of stock', unavailable })
    }

    for (const pid in aggregated) {
      for (const item of aggregated[pid].items) {
        await client.query(
          `INSERT INTO stock_reservations (user_id, product_id, quantity, size, expires_at)
             VALUES ($1, $2, $3, $4, $5)
             ON CONFLICT ON CONSTRAINT stock_reservations_user_product_size_unique
             DO UPDATE SET quantity = $3, reserved_at = NOW(), expires_at = $5`,
          [userId, item.product_id, item.quantity, item.size ?? '', expiresAt]
        )
      }
    }

    await client.query('COMMIT')
    res.json({ expires_at: expiresAt.toISOString() })
  } catch (err) {
    await client.query('ROLLBACK')
    throw err
  } finally {
    client.release()
  }
})

// DELETE /api/checkout/reserve — release all reservations for this user
router.delete('/reserve', async (req, res) => {
  await pool.query('DELETE FROM stock_reservations WHERE user_id = $1', [req.user.userId])
  res.json({ message: 'Reservation released' })
})

// POST /api/checkout/confirm
// Body: { address } — verifies reservation still valid, hard-decrements stock, creates order, clears cart.
router.post('/confirm', async (req, res) => {
  const userId = req.user.userId
  const address = (req.body.address || '').trim() || null
  const payment = await resolveCheckoutPayment(req, userId)
  if (payment.error) {
    return res.status(400).json({ error: payment.error })
  }

  // Use reservations joined with products as the single source of truth for both
  // stock decrement and order item creation — avoids cart/reservation divergence.
  // effective_price applies any active discount; falls back to base price when none.
  const reservations = await pool.query(
    `SELECT sr.product_id, sr.quantity, sr.size, p.name, p.price,
            pd.discount_percent,
            COALESCE(
              ROUND(p.price * (1 - pd.discount_percent / 100.0), 2),
              p.price
            ) AS effective_price
     FROM stock_reservations sr
     JOIN products p ON p.id = sr.product_id
     LEFT JOIN product_discounts pd ON pd.product_id = p.id
       AND pd.start_at <= NOW()
       AND (pd.end_at IS NULL OR pd.end_at > NOW())
     WHERE sr.user_id = $1 AND sr.expires_at > NOW()`,
    [userId]
  )

  if (reservations.rows.length === 0) {
    return res.status(409).json({ error: 'Reservation expired. Please restart checkout.' })
  }

  const client = await pool.connect()
  try {
    await client.query('BEGIN')

    // Lock product rows in a deterministic order to avoid deadlocks between
    // concurrent confirms, then re-check stock atomically. If a product
    // manager dropped stock between reserve and confirm (e.g. set to 0),
    // the conditional UPDATE returns rowCount=0 and we abort.
    const orderedRows = [...reservations.rows].sort((a, b) => a.product_id - b.product_id)
    const productIds = orderedRows.map((r) => r.product_id)
    await client.query('SELECT id FROM products WHERE id = ANY($1) ORDER BY id FOR UPDATE', [
      productIds,
    ])

    for (const r of orderedRows) {
      const upd = await client.query(
        'UPDATE products SET stock = stock - $1, updated_at = NOW() WHERE id = $2 AND stock >= $1 RETURNING id',
        [r.quantity, r.product_id]
      )
      if (upd.rowCount === 0) {
        await client.query('ROLLBACK')
        return res.status(409).json({
          error: `Insufficient stock for ${r.name}. Please return to your cart and try again.`,
          productId: r.product_id,
          productName: r.name,
        })
      }
    }

    const total = reservations.rows.reduce(
      (sum, item) => sum + parseFloat(item.effective_price) * item.quantity,
      0
    )

    const thresholdResult = await pool.query(
      `SELECT value FROM system_settings WHERE key = 'free_shipping_threshold'`
    )
    const threshold = parseFloat(thresholdResult.rows[0]?.value ?? '100')
    const shippingCost = total >= threshold ? 0 : 4.99

    let paymentMethodId = payment.paymentMethodId ?? null
    if (!paymentMethodId && payment.savePaymentMethod) {
      const savedPaymentMethod = await ensureSavedPaymentMethod(client, userId, payment.newCard)
      paymentMethodId = savedPaymentMethod.id
    }

    const orderResult = await client.query(
      `INSERT INTO orders (user_id, status, total, address, shipping_cost, payment_method_id)
       VALUES ($1, 'processing', $2, $3, $4, $5)
       RETURNING id`,
      [
        userId,
        total.toFixed(2),
        address ? encryptField(address) : null,
        shippingCost.toFixed(2),
        paymentMethodId,
      ]
    )
    const orderId = orderResult.rows[0].id

    for (const item of reservations.rows) {
      await client.query(
        'INSERT INTO order_items (order_id, product_id, quantity, price, size) VALUES ($1, $2, $3, $4, $5)',
        [orderId, item.product_id, item.quantity, item.effective_price, item.size || '']
      )
    }

    await client.query('DELETE FROM cart_items WHERE user_id = $1', [userId])
    await client.query('DELETE FROM stock_reservations WHERE user_id = $1', [userId])

    await client.query('COMMIT')

    const invoiceNumber = `INV-${new Date().getFullYear()}-${String(orderId).padStart(6, '0')}`

    queueInvoiceRequest({
      invoice_number: invoiceNumber,
      order_id: String(orderId),
      customer_name: inferCustomerName(req.user.email),
      customer_email: req.user.email,
      customer_address: address || 'Address not provided',
      shipping_cost: shippingCost,
      items: reservations.rows.map((item) => ({
        description: item.name,
        quantity: item.quantity,
        unit_price: Number(item.effective_price),
      })),
    })

    // Echo the canonical order data so the success page renders the actual
    // charged prices (matches order_items.price written above) instead of a
    // stale cart snapshot the client built before any mid-checkout discount.
    res.json({
      order_id: orderId,
      invoice_number: invoiceNumber,
      customer_email: req.user.email,
      total: Number(total.toFixed(2)),
      shipping_cost: shippingCost,
      items: reservations.rows.map((item) => ({
        product_id: item.product_id,
        name: item.name,
        quantity: item.quantity,
        size: item.size || '',
        price: Number(item.price),
        discounted_price: item.discount_percent != null ? Number(item.effective_price) : null,
      })),
    })
  } catch (err) {
    await client.query('ROLLBACK')
    throw err
  } finally {
    client.release()
  }
})

module.exports = router
