require('dotenv').config({ path: require('path').join(__dirname, '../.env') })

const bcrypt = require('bcrypt')
const pool = require('../db')

const CUSTOMER_EMAIL = 'demo.customer@example.com'
const CUSTOMER_PASSWORD = 'demo123456'
const CUSTOMER_NAME = 'Emre Demo'
const CUSTOMER_TAX_ID = 'TC-12345678'
const CUSTOMER_ADDRESS = '456 Demo Avenue, Kadıköy, Istanbul 34710, Turkey'

const DEMO_PRODUCTS = [
  {
    name: 'Product A',
    description:
      'A versatile accessory for everyday use. Currently out of stock — check back soon.',
    price: 49.99,
    category: 'Accessories',
    stock: 0,
    sizes: ['One Size'],
    material: 'Mixed Materials',
    country_of_origin: 'Turkey',
    serial_number: 'DEMO-A-001',
    warranty_status: '30-day returns',
    distributor_info: 'Demo Distributor, Istanbul, Turkey',
  },
  {
    name: 'Product B',
    description: 'A popular accessory — only one left in stock.',
    price: 59.99,
    category: 'Accessories',
    stock: 1,
    sizes: ['One Size'],
    material: 'Mixed Materials',
    country_of_origin: 'Turkey',
    serial_number: 'DEMO-B-001',
    warranty_status: '30-day returns',
    distributor_info: 'Demo Distributor, Istanbul, Turkey',
  },
  {
    name: 'Product C',
    description: 'A best-selling accessory with plenty of stock available.',
    price: 39.99,
    category: 'Accessories',
    stock: 10,
    sizes: ['One Size'],
    material: 'Mixed Materials',
    country_of_origin: 'Turkey',
    serial_number: 'DEMO-C-001',
    warranty_status: '30-day returns',
    distributor_info: 'Demo Distributor, Istanbul, Turkey',
  },
  {
    name: 'Product E',
    description: 'A premium accessory from our classic collection.',
    price: 79.99,
    category: 'Accessories',
    stock: 5,
    sizes: ['One Size'],
    material: 'Mixed Materials',
    country_of_origin: 'Turkey',
    serial_number: 'DEMO-E-001',
    warranty_status: '30-day returns',
    distributor_info: 'Demo Distributor, Istanbul, Turkey',
  },
  {
    name: 'Product F',
    description: 'A stylish accessory from our latest collection.',
    price: 89.99,
    category: 'Accessories',
    stock: 5,
    sizes: ['One Size'],
    material: 'Mixed Materials',
    country_of_origin: 'Turkey',
    serial_number: 'DEMO-F-001',
    warranty_status: '30-day returns',
    distributor_info: 'Demo Distributor, Istanbul, Turkey',
  },
  {
    name: 'Product G',
    description: 'A fresh arrival — just added to our inventory.',
    price: 34.99,
    category: 'Accessories',
    stock: 5,
    sizes: ['One Size'],
    material: 'Mixed Materials',
    country_of_origin: 'Turkey',
    serial_number: 'DEMO-G-001',
    warranty_status: '30-day returns',
    distributor_info: 'Demo Distributor, Istanbul, Turkey',
  },
  {
    name: 'Product H',
    description: 'A new seasonal accessory, recently added to the catalogue.',
    price: 44.99,
    category: 'Accessories',
    stock: 5,
    sizes: ['One Size'],
    material: 'Mixed Materials',
    country_of_origin: 'Turkey',
    serial_number: 'DEMO-H-001',
    warranty_status: '30-day returns',
    distributor_info: 'Demo Distributor, Istanbul, Turkey',
  },
]

// Orders keyed by product name with their backdated timestamps and statuses.
// Dates chosen so that:
//   Product E (2026-03-15): 88 days ago  → outside 30-day refund window
//   Product F (2026-06-01): 11 days ago  → inside 30-day refund window
//   Product G (2026-06-10): recent       → status 'processing', cancellable
//   Product H (2026-06-11): recent       → status 'shipped' (UI: "In Transit")
const ORDERS = [
  { productName: 'Product E', status: 'delivered', createdAt: '2026-03-15T10:00:00Z', updatedAt: '2026-03-20T14:00:00Z' },
  { productName: 'Product F', status: 'delivered', createdAt: '2026-06-01T10:00:00Z', updatedAt: '2026-06-05T14:00:00Z' },
  { productName: 'Product G', status: 'processing', createdAt: '2026-06-10T10:00:00Z', updatedAt: '2026-06-10T10:00:00Z' },
  { productName: 'Product H', status: 'shipped',    createdAt: '2026-06-11T10:00:00Z', updatedAt: '2026-06-11T10:00:00Z' },
]

async function seedDemo() {
  let client
  try {
    client = await pool.connect()
    await client.query('BEGIN')

    // ── Products ─────────────────────────────────────────────────────────────
    console.log('Seeding demo products...')
    const productIds = {}
    for (const p of DEMO_PRODUCTS) {
      const { rows } = await client.query(
        `INSERT INTO products
           (name, description, price, category, stock, sizes, material,
            country_of_origin, serial_number, warranty_status, distributor_info)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
         ON CONFLICT (serial_number) WHERE serial_number IS NOT NULL
           DO UPDATE SET stock = EXCLUDED.stock
         RETURNING id, name`,
        [
          p.name, p.description, p.price, p.category, p.stock,
          p.sizes, p.material, p.country_of_origin,
          p.serial_number, p.warranty_status, p.distributor_info,
        ]
      )
      productIds[p.name] = rows[0].id
      console.log(`  ✓ ${rows[0].name} (id: ${rows[0].id}, stock: ${p.stock})`)
    }

    // ── Customer account ──────────────────────────────────────────────────────
    console.log('\nSeeding demo customer...')
    const existing = await client.query(
      'SELECT id FROM auth.users WHERE email = $1',
      [CUSTOMER_EMAIL]
    )

    let userId
    if (existing.rows.length > 0) {
      userId = existing.rows[0].id
      console.log(`  ✓ Customer already exists (id: ${userId})`)
    } else {
      const hash = await bcrypt.hash(CUSTOMER_PASSWORD, 10)
      const { rows: userRows } = await client.query(
        `INSERT INTO auth.users (email, password_hash, role, email_verified_at)
         VALUES ($1, $2, 'customer', NOW())
         RETURNING id`,
        [CUSTOMER_EMAIL, hash]
      )
      userId = userRows[0].id

      await client.query(
        `INSERT INTO auth.customers (customer_id, name, tax_id, home_address)
         VALUES ($1, $2, $3, $4)`,
        [userId, CUSTOMER_NAME, CUSTOMER_TAX_ID, CUSTOMER_ADDRESS]
      )
      console.log(`  ✓ ${CUSTOMER_EMAIL} (id: ${userId})`)
    }

    // ── Orders ────────────────────────────────────────────────────────────────
    console.log('\nSeeding demo orders...')
    for (const o of ORDERS) {
      const product = DEMO_PRODUCTS.find((p) => p.name === o.productName)
      const productId = productIds[o.productName]

      const { rows: existingOrder } = await client.query(
        `SELECT oi.id FROM order_items oi
         JOIN orders ord ON ord.id = oi.order_id
         WHERE ord.user_id = $1 AND oi.product_id = $2`,
        [userId, productId]
      )
      if (existingOrder.length > 0) {
        console.log(`  ─ Order for ${o.productName} already exists, skipping`)
        continue
      }

      const { rows: orderRows } = await client.query(
        `INSERT INTO orders (user_id, status, total, shipping_cost, address, created_at, updated_at)
         VALUES ($1, $2, $3, 0, $4, $5, $6)
         RETURNING id`,
        [userId, o.status, product.price, CUSTOMER_ADDRESS, o.createdAt, o.updatedAt]
      )
      const orderId = orderRows[0].id

      await client.query(
        `INSERT INTO order_items (order_id, product_id, quantity, price)
         VALUES ($1, $2, 1, $3)`,
        [orderId, productId, product.price]
      )
      console.log(`  ✓ Order #${orderId}: ${o.productName} → ${o.status} (created ${o.createdAt.slice(0, 10)})`)
    }

    await client.query('COMMIT')
    console.log('\nDemo seed completed successfully.')
    console.log(`\nCustomer login: ${CUSTOMER_EMAIL} / ${CUSTOMER_PASSWORD}`)
    return 0
  } catch (err) {
    if (client) await client.query('ROLLBACK').catch(() => {})
    console.error('\nDemo seed failed:', err.message)
    return 1
  } finally {
    if (client) client.release()
    await pool.end()
  }
}

seedDemo().then((code) => process.exit(code))
