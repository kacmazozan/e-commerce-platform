require('dotenv').config({ path: require('path').join(__dirname, '../.env') })

const bcrypt = require('bcrypt')
const pool = require('../db')

const CUSTOMER_EMAIL = 'demo.customer@example.com'
const CUSTOMER_PASSWORD = 'demo123456'
const CUSTOMER_NAME = 'Emre Demo'
const CUSTOMER_TAX_ID = 'TC-12345678'
const CUSTOMER_ADDRESS = '456 Demo Avenue, Kadıköy, Istanbul 34710, Turkey'

// cost_price is seeded at 60% of retail, matching seed-products.js's convention.
const DEMO_PRODUCTS = [
  {
    name: 'Product A',
    description:
      'A full-grain leather belt with a brushed gunmetal buckle, hand-finished edges, and five adjustment holes. A wardrobe staple that pairs with both tailored trousers and denim. Currently sold out — restocking soon.',
    price: 49.99,
    cost_price: 29.99,
    category: 'Accessories',
    stock: 0,
    sizes: ['One Size'],
    material: 'Full-grain leather',
    country_of_origin: 'Italy',
    serial_number: 'ACC-BLT-1001',
    warranty_status: '30-day returns',
    distributor_info: 'Firenze Leatherworks S.r.l., Florence, Italy',
  },
  {
    name: 'Product B',
    description:
      'A lightweight silk twill scarf with a hand-rolled hem and a painterly print that adds colour to any outfit. Wear it at the neck, on a bag, or in the hair. Only one left in stock.',
    price: 59.99,
    cost_price: 35.99,
    category: 'Accessories',
    stock: 1,
    sizes: ['One Size'],
    material: '100% Mulberry silk',
    country_of_origin: 'France',
    serial_number: 'ACC-SCF-1002',
    warranty_status: '30-day returns',
    distributor_info: 'Maison Lyon Textiles SAS, Lyon, France',
  },
  {
    name: 'Product C',
    description:
      'Classic polarized sunglasses in a lightweight acetate frame with UV400 protection and anti-glare lenses. A timeless silhouette that suits most face shapes.',
    price: 39.99,
    cost_price: 23.99,
    category: 'Accessories',
    stock: 10,
    sizes: ['One Size'],
    material: 'Acetate frame, polarized lenses',
    country_of_origin: 'Italy',
    serial_number: 'ACC-SUN-1003',
    warranty_status: '30-day returns',
    distributor_info: 'Veneto Optics S.p.A., Padua, Italy',
  },
  {
    name: 'Product E',
    description:
      'A slim bifold wallet in vegetable-tanned leather with six card slots, two hidden pockets, and a full-length note compartment. Ages beautifully with daily use.',
    price: 79.99,
    cost_price: 47.99,
    category: 'Accessories',
    stock: 5,
    sizes: ['One Size'],
    material: 'Vegetable-tanned leather',
    country_of_origin: 'Spain',
    serial_number: 'ACC-WLT-1005',
    warranty_status: '30-day returns',
    distributor_info: 'Ubrique Cuero S.L., Cádiz, Spain',
  },
  {
    name: 'Product F',
    description:
      'A minimalist analog watch with a 40 mm stainless-steel case, scratch-resistant mineral glass, and a quartz movement. Water-resistant to 30 m and finished with a mesh strap.',
    price: 89.99,
    cost_price: 53.99,
    category: 'Accessories',
    stock: 5,
    sizes: ['One Size'],
    material: 'Stainless steel, mineral glass',
    country_of_origin: 'Japan',
    serial_number: 'ACC-WCH-1006',
    warranty_status: '2-year warranty',
    distributor_info: 'Seiwa Trading Co., Ltd., Tokyo, Japan',
  },
  {
    name: 'Product G',
    description:
      'A soft ribbed beanie knitted from 100% merino wool. Naturally breathable and warm without the itch, with a fold-over cuff for an adjustable fit.',
    price: 34.99,
    cost_price: 20.99,
    category: 'Accessories',
    stock: 5,
    sizes: ['One Size'],
    material: '100% Merino wool',
    country_of_origin: 'Turkey',
    serial_number: 'ACC-BNE-1007',
    warranty_status: '30-day returns',
    distributor_info: 'Bursa Knitwear Ltd. Şti., Bursa, Turkey',
  },
  {
    name: 'Product H',
    description:
      'A roomy tote in heavyweight organic cotton canvas with reinforced handles and an interior zip pocket. Built for groceries, books, or a day at the market.',
    price: 44.99,
    cost_price: 26.99,
    category: 'Accessories',
    stock: 5,
    sizes: ['One Size'],
    material: 'Organic cotton canvas',
    country_of_origin: 'Portugal',
    serial_number: 'ACC-TOT-1008',
    warranty_status: '30-day returns',
    distributor_info: 'Porto Canvas Lda., Porto, Portugal',
  },
]

// Orders keyed by product name with their backdated timestamps and statuses.
// Dates chosen so that:
//   Product E (2026-03-15): 88 days ago  → outside 30-day refund window
//   Product F (2026-06-01): 11 days ago  → inside 30-day refund window
//   Product G (2026-06-10): recent       → status 'processing', cancellable
//   Product H (2026-06-11): recent       → status 'shipped' (UI: "In Transit")
const ORDERS = [
  {
    productName: 'Product E',
    status: 'delivered',
    createdAt: '2026-03-15T10:00:00Z',
    updatedAt: '2026-03-20T14:00:00Z',
  },
  {
    productName: 'Product F',
    status: 'delivered',
    createdAt: '2026-06-01T10:00:00Z',
    updatedAt: '2026-06-05T14:00:00Z',
  },
  {
    productName: 'Product G',
    status: 'processing',
    createdAt: '2026-06-10T10:00:00Z',
    updatedAt: '2026-06-10T10:00:00Z',
  },
  {
    productName: 'Product H',
    status: 'shipped',
    createdAt: '2026-06-11T10:00:00Z',
    updatedAt: '2026-06-11T10:00:00Z',
  },
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
            country_of_origin, serial_number, warranty_status, distributor_info, cost_price)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
         ON CONFLICT (serial_number) WHERE serial_number IS NOT NULL
           DO UPDATE SET
             name = EXCLUDED.name,
             description = EXCLUDED.description,
             price = EXCLUDED.price,
             category = EXCLUDED.category,
             stock = EXCLUDED.stock,
             sizes = EXCLUDED.sizes,
             material = EXCLUDED.material,
             country_of_origin = EXCLUDED.country_of_origin,
             warranty_status = EXCLUDED.warranty_status,
             distributor_info = EXCLUDED.distributor_info,
             cost_price = EXCLUDED.cost_price
         RETURNING id, name`,
        [
          p.name,
          p.description,
          p.price,
          p.category,
          p.stock,
          p.sizes,
          p.material,
          p.country_of_origin,
          p.serial_number,
          p.warranty_status,
          p.distributor_info,
          p.cost_price,
        ]
      )
      const productId = rows[0].id
      productIds[p.name] = productId

      // Populate per-size stock so the size-aware cart/checkout path can find
      // availability (mirrors seed-products.js). Without this, sized products read
      // 0 stock at add-to-cart and checkout even though products.stock is set.
      if (p.sizes && p.sizes.length > 0) {
        const perSize = Math.floor(p.stock / p.sizes.length)
        const remainder = p.stock % p.sizes.length
        for (let i = 0; i < p.sizes.length; i++) {
          const sizeStock = perSize + (i < remainder ? 1 : 0)
          await client.query(
            `INSERT INTO product_size_stock (product_id, size, stock)
             VALUES ($1, $2, $3)
             ON CONFLICT (product_id, size) DO UPDATE SET stock = EXCLUDED.stock`,
            [productId, p.sizes[i], sizeStock]
          )
        }
      }

      console.log(`  ✓ ${rows[0].name} (id: ${productId}, stock: ${p.stock})`)
    }

    // ── Customer account ──────────────────────────────────────────────────────
    console.log('\nSeeding demo customer...')
    const existing = await client.query('SELECT id FROM auth.users WHERE email = $1', [
      CUSTOMER_EMAIL,
    ])

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

    // Shipping is charged exactly as checkout does: free above the threshold,
    // otherwise a flat 4.99 (see backend/routes/checkout.js).
    const { rows: thresholdRows } = await client.query(
      `SELECT value FROM system_settings WHERE key = 'free_shipping_threshold'`
    )
    const freeShippingThreshold = parseFloat(thresholdRows[0]?.value ?? '100')

    for (const o of ORDERS) {
      const product = DEMO_PRODUCTS.find((p) => p.name === o.productName)
      const productId = productIds[o.productName]
      const shippingCost = product.price >= freeShippingThreshold ? 0 : 4.99

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
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING id`,
        [userId, o.status, product.price, shippingCost, CUSTOMER_ADDRESS, o.createdAt, o.updatedAt]
      )
      const orderId = orderRows[0].id

      await client.query(
        `INSERT INTO order_items (order_id, product_id, quantity, price)
         VALUES ($1, $2, 1, $3)`,
        [orderId, productId, product.price]
      )
      console.log(
        `  ✓ Order #${orderId}: ${o.productName} → ${o.status} (created ${o.createdAt.slice(0, 10)})`
      )
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
