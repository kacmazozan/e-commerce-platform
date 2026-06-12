require('dotenv').config()
const bcrypt = require('bcrypt')
const pool = require('../db')
const { encryptField } = require('../services/secure-fields')

const DEMO_EMAIL = 'democustomer@example.com'
const DEMO_ADDRESS = '123 Demo Street, Istanbul, TR'
const DEMO_PASSWORD = 'democustomer123456'
const DAYS_BACK = 180
// ~45% of days get an order — results in ~80 historical data points
const ORDER_PROBABILITY = 0.45

async function seedRevenueDemoData() {
  const client = await pool.connect()
  try {
    await client.query('BEGIN')

    // 1. Ensure demo customer exists
    const existing = await client.query('SELECT id FROM auth.users WHERE email = $1', [DEMO_EMAIL])
    let userId
    if (existing.rows.length > 0) {
      userId = existing.rows[0].id
    } else {
      const hash = await bcrypt.hash(DEMO_PASSWORD, 10)
      const userResult = await client.query(
        `INSERT INTO auth.users (email, password_hash, role, email_verified_at)
         VALUES ($1, $2, 'customer', NOW()) RETURNING id`,
        [DEMO_EMAIL, hash]
      )
      userId = userResult.rows[0].id
      // home_address is encrypted at rest, matching runtime writes
      await client.query(
        `INSERT INTO auth.customers (customer_id, name, home_address)
         VALUES ($1, $2, $3)`,
        [userId, 'Demo Customer', encryptField(DEMO_ADDRESS)]
      )
    }

    // 2. Skip if historical data already seeded
    const existingOrders = await client.query(
      `SELECT COUNT(*) FROM orders WHERE user_id = $1 AND created_at < NOW() - INTERVAL '7 days'`,
      [userId]
    )
    if (parseInt(existingOrders.rows[0].count) > 0) {
      console.log('Revenue demo data already seeded — skipping')
      await client.query('ROLLBACK')
      return
    }

    // 3. Load available products
    const products = await client.query(
      `SELECT id, price FROM products WHERE price IS NOT NULL ORDER BY id LIMIT 40`
    )
    if (products.rows.length === 0) {
      throw new Error('No products found — run seed-products.js first')
    }
    const productList = products.rows

    // 4. Generate historical orders
    const today = new Date()
    let orderCount = 0

    for (let daysAgo = DAYS_BACK; daysAgo >= 1; daysAgo--) {
      if (Math.random() > ORDER_PROBABILITY) continue

      const orderDate = new Date(today)
      orderDate.setDate(orderDate.getDate() - daysAgo)
      const orderDateStr = orderDate.toISOString()

      // Pick 1–3 random products
      const numItems = Math.floor(Math.random() * 3) + 1
      const shuffled = [...productList].sort(() => Math.random() - 0.5)
      const selectedItems = shuffled.slice(0, Math.min(numItems, productList.length)).map((p) => ({
        product_id: p.id,
        quantity: Math.floor(Math.random() * 2) + 1,
        price: parseFloat(p.price),
      }))

      const subtotal = selectedItems.reduce((sum, item) => sum + item.price * item.quantity, 0)
      const shippingCost = subtotal < 50 ? 4.99 : 0
      const status = daysAgo > 7 ? 'delivered' : 'processing'

      const orderResult = await client.query(
        `INSERT INTO orders (user_id, status, total, address, shipping_cost, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $6) RETURNING id`,
        [
          userId,
          status,
          subtotal.toFixed(2),
          // orders.address is encrypted at rest, matching checkout writes
          encryptField(DEMO_ADDRESS),
          shippingCost.toFixed(2),
          orderDateStr,
        ]
      )
      const orderId = orderResult.rows[0].id

      for (const item of selectedItems) {
        await client.query(
          `INSERT INTO order_items (order_id, product_id, quantity, price) VALUES ($1, $2, $3, $4)`,
          [orderId, item.product_id, item.quantity, item.price]
        )
      }

      orderCount++
    }

    await client.query('COMMIT')
    console.log(`Seeded ${orderCount} historical demo orders for revenue chart`)
  } catch (err) {
    await client.query('ROLLBACK')
    console.error('Error seeding revenue demo data:', err.message)
    process.exit(1)
  } finally {
    client.release()
    process.exit(0)
  }
}

seedRevenueDemoData()
