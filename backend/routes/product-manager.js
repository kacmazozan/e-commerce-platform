const express = require('express')
const authenticate = require('../middleware/auth')
const requireProductManager = require('../middleware/product-manager')
const pool = require('../db')
const { decryptField } = require('../services/secure-fields')

const router = express.Router()

function serializeOrder(order) {
  return {
    ...order,
    address: decryptField(order.address),
  }
}

router.use(authenticate)
router.use(requireProductManager)

// ─── Products ────────────────────────────────────────────────────────────────

// GET /api/product-manager/categories
router.get('/categories', async (req, res) => {
  const result = await pool.query(`
    SELECT c.name, COUNT(p.id)::int AS product_count
    FROM categories c
    LEFT JOIN products p ON p.category = c.name
    GROUP BY c.name
    ORDER BY c.name
  `)
  res.json({ categories: result.rows })
})

// POST /api/product-manager/categories
router.post('/categories', async (req, res) => {
  const name = (req.body.name || '').trim()
  if (!name) return res.status(400).json({ error: 'Category name is required' })
  if (name.length > 100) {
    return res.status(400).json({ error: 'Category name must be 100 characters or fewer' })
  }
  try {
    const result = await pool.query('INSERT INTO categories (name) VALUES ($1) RETURNING *', [name])
    res.status(201).json({ category: result.rows[0] })
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'Category already exists' })
    throw err
  }
})

// DELETE /api/product-manager/categories/:name
router.delete('/categories/:name', async (req, res) => {
  const name = req.params.name
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    await client.query(
      'DELETE FROM order_items WHERE product_id IN (SELECT id FROM products WHERE category = $1)',
      [name]
    )
    await client.query('DELETE FROM products WHERE category = $1', [name])
    const result = await client.query('DELETE FROM categories WHERE name = $1 RETURNING id', [name])
    if (result.rows.length === 0) {
      await client.query('ROLLBACK')
      return res.status(404).json({ error: 'Category not found' })
    }
    await client.query('COMMIT')
    res.json({ message: 'Category and its products deleted successfully' })
  } catch (err) {
    await client.query('ROLLBACK')
    throw err
  } finally {
    client.release()
  }
})

// GET /api/product-manager/products
router.get('/products', async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page) || 1)
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20))
  const offset = (page - 1) * limit
  const search = (req.query.search || '').trim()
  const category = (req.query.category || '').trim()
  const sort = (req.query.sort || '').trim()

  const SORT_MAP = {
    alpha: 'name ASC',
    price_asc: 'price ASC',
    price_desc: 'price DESC',
    stock_asc: 'stock ASC',
    stock_desc: 'stock DESC',
  }
  const orderBy = SORT_MAP[sort] || 'created_at DESC'

  let where = []
  let params = []
  let idx = 1

  if (search) {
    where.push(`name ILIKE $${idx}`)
    params.push(`%${search}%`)
    idx++
  }
  if (category) {
    where.push(`category = $${idx}`)
    params.push(category)
    idx++
  }
  if (req.query.lowStock === 'true') {
    where.push(`stock < 10`)
  }

  const whereClause = where.length ? `WHERE ${where.join(' AND ')}` : ''

  const countResult = await pool.query(`SELECT COUNT(*) FROM products ${whereClause}`, params)
  const total = parseInt(countResult.rows[0].count)

  const dataResult = await pool.query(
    `SELECT p.*,
       CASE
         WHEN p.sizes IS NOT NULL AND array_length(p.sizes, 1) > 0
         THEN COALESCE((SELECT SUM(s.stock) FROM product_size_stock s WHERE s.product_id = p.id), 0)
         ELSE p.stock
       END AS total_stock,
       (SELECT json_agg(json_build_object('size', s.size, 'stock', s.stock) ORDER BY s.size)
        FROM product_size_stock s WHERE s.product_id = p.id) AS size_stocks
     FROM products p ${whereClause} ORDER BY ${orderBy} LIMIT $${idx} OFFSET $${idx + 1}`,
    [...params, limit, offset]
  )

  res.json({
    products: dataResult.rows,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  })
})

// GET /api/product-manager/products/:id
router.get('/products/:id', async (req, res) => {
  const result = await pool.query('SELECT * FROM products WHERE id = $1', [req.params.id])
  if (result.rows.length === 0) return res.status(404).json({ error: 'Product not found' })
  res.json({ product: result.rows[0] })
})

// GET /api/product-manager/products/:id/size-stock
router.get('/products/:id/size-stock', async (req, res) => {
  const productId = parseInt(req.params.id, 10)
  if (!Number.isInteger(productId) || productId <= 0)
    return res.status(400).json({ error: 'Invalid product ID' })
  const product = await pool.query('SELECT id FROM products WHERE id = $1', [productId])
  if (product.rows.length === 0) return res.status(404).json({ error: 'Product not found' })
  const result = await pool.query(
    `SELECT size, stock FROM product_size_stock WHERE product_id = $1 ORDER BY size`,
    [productId]
  )
  res.json({ size_stocks: result.rows })
})

// PUT /api/product-manager/products/:id/size-stock
// Body: { stocks: { XS: 10, S: 20, M: 15, L: 8, XL: 5 } }
router.put('/products/:id/size-stock', async (req, res) => {
  const productId = parseInt(req.params.id, 10)
  if (!Number.isInteger(productId) || productId <= 0)
    return res.status(400).json({ error: 'Invalid product ID' })

  const product = await pool.query('SELECT id, sizes FROM products WHERE id = $1', [productId])
  if (product.rows.length === 0) return res.status(404).json({ error: 'Product not found' })

  const { stocks } = req.body
  if (!stocks || typeof stocks !== 'object' || Array.isArray(stocks)) {
    return res.status(400).json({ error: 'stocks must be an object mapping size to quantity' })
  }

  const productSizes = product.rows[0].sizes || []
  for (const [size, qty] of Object.entries(stocks)) {
    if (!productSizes.includes(size)) {
      return res.status(400).json({ error: `Size ${size} is not defined for this product` })
    }
    const parsed = parseInt(qty, 10)
    if (!Number.isFinite(parsed) || parsed < 0) {
      return res.status(400).json({ error: `Invalid stock value for size ${size}` })
    }
  }

  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    for (const [size, qty] of Object.entries(stocks)) {
      await client.query(
        `INSERT INTO product_size_stock (product_id, size, stock)
         VALUES ($1, $2, $3)
         ON CONFLICT (product_id, size) DO UPDATE SET stock = EXCLUDED.stock`,
        [productId, size, parseInt(qty, 10)]
      )
    }
    // products.stock is the aggregate the storefront reads — keep it equal to the per-size sum
    await client.query(
      `UPDATE products SET stock = COALESCE(
         (SELECT SUM(stock) FROM product_size_stock WHERE product_id = $1), 0
       ), updated_at = NOW() WHERE id = $1`,
      [productId]
    )
    await client.query('COMMIT')
  } catch (err) {
    await client.query('ROLLBACK')
    throw err
  } finally {
    client.release()
  }

  const result = await pool.query(
    `SELECT size, stock FROM product_size_stock WHERE product_id = $1 ORDER BY size`,
    [productId]
  )
  res.json({ size_stocks: result.rows })
})

// POST /api/product-manager/products
router.post('/products', async (req, res) => {
  const {
    name,
    description,
    stock,
    category,
    country_of_origin,
    material,
    model_height,
    model_chest,
    model_waist,
    model_hips,
    model_size,
    sizes,
    cost_price,
  } = req.body
  const trimmedName = (name || '').trim()
  if (!trimmedName) return res.status(400).json({ error: 'Name is required' })
  const parsedStock = parseInt(stock, 10)
  if (
    stock !== undefined &&
    stock !== null &&
    stock !== '' &&
    (!Number.isFinite(parsedStock) || parsedStock < 0)
  ) {
    return res.status(400).json({ error: 'Stock must be a non-negative integer' })
  }

  let parsedCostPrice = null
  if (cost_price !== undefined && cost_price !== null && cost_price !== '') {
    parsedCostPrice = parseFloat(cost_price)
    if (isNaN(parsedCostPrice) || parsedCostPrice < 0) {
      return res.status(400).json({ error: 'cost_price must be a non-negative number' })
    }
  }

  const sizesArr = Array.isArray(sizes) ? sizes : null

  const result = await pool.query(
    `INSERT INTO products (name, description, price, stock, category,
       country_of_origin, material, model_height, model_chest, model_waist, model_hips, model_size, sizes, cost_price)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14) RETURNING *`,
    [
      trimmedName,
      description || null,
      null,
      Number.isFinite(parsedStock) ? parsedStock : 0,
      category || null,
      country_of_origin || null,
      material || null,
      model_height || null,
      model_chest || null,
      model_waist || null,
      model_hips || null,
      model_size || null,
      sizesArr,
      parsedCostPrice,
    ]
  )

  const newProduct = result.rows[0]
  if (sizesArr && sizesArr.length > 0) {
    await pool.query(
      `INSERT INTO product_size_stock (product_id, size, stock)
       SELECT $1, unnest($2::text[]), 0
       ON CONFLICT (product_id, size) DO NOTHING`,
      [newProduct.id, sizesArr]
    )
  }

  res.status(201).json({ product: newProduct })
})

// PUT /api/product-manager/products/:id
router.put('/products/:id', async (req, res) => {
  const {
    name,
    description,
    stock,
    category,
    country_of_origin,
    material,
    model_height,
    model_chest,
    model_waist,
    model_hips,
    model_size,
    sizes,
    cost_price,
  } = req.body
  const productId = req.params.id

  const existing = await pool.query('SELECT id FROM products WHERE id = $1', [productId])
  if (existing.rows.length === 0) return res.status(404).json({ error: 'Product not found' })

  let sets = []
  let params = []
  let idx = 1

  if (name !== undefined) {
    const trimmedName = (name || '').trim()
    if (!trimmedName) return res.status(400).json({ error: 'Name is required' })
    sets.push(`name = $${idx}`)
    params.push(trimmedName)
    idx++
  }
  if (description !== undefined) {
    sets.push(`description = $${idx}`)
    params.push(description)
    idx++
  }
  if (stock !== undefined) {
    const parsedStock = parseInt(stock, 10)
    if (!Number.isFinite(parsedStock) || parsedStock < 0) {
      return res.status(400).json({ error: 'Stock must be a non-negative integer' })
    }
    sets.push(`stock = $${idx}`)
    params.push(parsedStock)
    idx++
  }
  if (category !== undefined) {
    sets.push(`category = $${idx}`)
    params.push(category)
    idx++
  }
  if (country_of_origin !== undefined) {
    sets.push(`country_of_origin = $${idx}`)
    params.push(country_of_origin || null)
    idx++
  }
  if (material !== undefined) {
    sets.push(`material = $${idx}`)
    params.push(material || null)
    idx++
  }
  if (model_height !== undefined) {
    sets.push(`model_height = $${idx}`)
    params.push(model_height || null)
    idx++
  }
  if (model_chest !== undefined) {
    sets.push(`model_chest = $${idx}`)
    params.push(model_chest || null)
    idx++
  }
  if (model_waist !== undefined) {
    sets.push(`model_waist = $${idx}`)
    params.push(model_waist || null)
    idx++
  }
  if (model_hips !== undefined) {
    sets.push(`model_hips = $${idx}`)
    params.push(model_hips || null)
    idx++
  }
  if (model_size !== undefined) {
    sets.push(`model_size = $${idx}`)
    params.push(model_size || null)
    idx++
  }
  if (sizes !== undefined) {
    sets.push(`sizes = $${idx}`)
    params.push(Array.isArray(sizes) ? sizes : null)
    idx++
  }
  if (cost_price !== undefined) {
    if (cost_price === null || cost_price === '') {
      sets.push(`cost_price = $${idx}`)
      params.push(null)
      idx++
    } else {
      const parsedCostPrice = parseFloat(cost_price)
      if (isNaN(parsedCostPrice) || parsedCostPrice < 0) {
        return res.status(400).json({ error: 'cost_price must be a non-negative number' })
      }
      sets.push(`cost_price = $${idx}`)
      params.push(parsedCostPrice)
      idx++
    }
  }

  if (sets.length === 0) return res.status(400).json({ error: 'No fields to update' })

  sets.push(`updated_at = NOW()`)
  params.push(productId)

  const result = await pool.query(
    `UPDATE products SET ${sets.join(', ')} WHERE id = $${idx} RETURNING *`,
    params
  )

  // Sync product_size_stock: add rows for newly added sizes (stock=0), preserve
  // existing rows, and drop rows for sizes that were removed so they no longer
  // count toward the per-size total.
  if (sizes !== undefined) {
    const sizesArr = Array.isArray(sizes) && sizes.length > 0 ? sizes : null
    if (sizesArr) {
      await pool.query(
        `INSERT INTO product_size_stock (product_id, size, stock)
         SELECT $1, unnest($2::text[]), 0
         ON CONFLICT (product_id, size) DO NOTHING`,
        [productId, sizesArr]
      )
      await pool.query(
        `DELETE FROM product_size_stock WHERE product_id = $1 AND size != ALL($2::text[])`,
        [productId, sizesArr]
      )
      // Removed sizes may have carried stock — resync the aggregate the storefront reads
      await pool.query(
        `UPDATE products SET stock = COALESCE(
           (SELECT SUM(stock) FROM product_size_stock WHERE product_id = $1), 0
         ), updated_at = NOW() WHERE id = $1`,
        [productId]
      )
    } else {
      await pool.query(`DELETE FROM product_size_stock WHERE product_id = $1`, [productId])
    }
  }

  res.json({ product: result.rows[0] })
})

// DELETE /api/product-manager/products/:id
router.delete('/products/:id', async (req, res) => {
  const result = await pool.query('DELETE FROM products WHERE id = $1 RETURNING id', [
    req.params.id,
  ])
  if (result.rows.length === 0) return res.status(404).json({ error: 'Product not found' })
  res.json({ message: 'Product deleted successfully' })
})

// ─── Orders ──────────────────────────────────────────────────────────────────

// GET /api/product-manager/orders
router.get('/orders', async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page) || 1)
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 10))
  const offset = (page - 1) * limit
  const status = (req.query.status || '').trim()
  const search = (req.query.search || '').trim()

  const VALID_STATUSES = ['pending', 'processing', 'shipped', 'delivered', 'cancelled']
  let where = []
  let params = []
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
    `SELECT o.id, o.status, o.total, o.shipping_cost, o.address, o.created_at, o.updated_at,
            u.id AS user_id, u.email AS user_email
     FROM orders o
     JOIN auth.users u ON u.id = o.user_id
     ${whereClause}
     ORDER BY o.created_at DESC
     LIMIT $${idx} OFFSET $${idx + 1}`,
    [...params, limit, offset]
  )

  res.json({
    orders: dataResult.rows.map(serializeOrder),
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  })
})

// PATCH /api/product-manager/orders/:id/status
router.patch('/orders/:id/status', async (req, res) => {
  const orderId = Number(req.params.id)
  if (!Number.isInteger(orderId) || orderId <= 0) {
    return res.status(400).json({ error: 'Invalid order ID' })
  }
  const { status } = req.body
  const VALID_STATUSES = ['processing', 'shipped', 'delivered', 'cancelled']
  if (!status || !VALID_STATUSES.includes(status)) {
    return res
      .status(400)
      .json({ error: 'Invalid status. Must be one of: processing, shipped, delivered, cancelled' })
  }
  const result = await pool.query(
    `UPDATE orders SET status = $1::order_status, updated_at = NOW() WHERE id = $2 RETURNING id, status, updated_at`,
    [status, orderId]
  )
  if (result.rows.length === 0) return res.status(404).json({ error: 'Order not found' })
  res.json({ order: result.rows[0] })
})

// GET /api/product-manager/orders/:id
router.get('/orders/:id', async (req, res) => {
  const orderResult = await pool.query(
    `SELECT o.id, o.status, o.total, o.shipping_cost, o.address, o.created_at, o.updated_at,
            u.id AS user_id, u.email AS user_email
     FROM orders o
     JOIN auth.users u ON u.id = o.user_id
     WHERE o.id = $1`,
    [req.params.id]
  )
  if (orderResult.rows.length === 0) return res.status(404).json({ error: 'Order not found' })

  const itemsResult = await pool.query(
    `SELECT oi.id, oi.quantity, oi.price, p.id AS product_id, p.name AS product_name
     FROM order_items oi
     JOIN products p ON p.id = oi.product_id
     WHERE oi.order_id = $1
     ORDER BY oi.id`,
    [req.params.id]
  )

  res.json({ order: serializeOrder(orderResult.rows[0]), items: itemsResult.rows })
})

// ─── Comments / Reviews ──────────────────────────────────────────────────────

// GET /api/product-manager/comments
router.get('/comments', async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page) || 1)
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 15))
  const offset = (page - 1) * limit
  const status = (req.query.status || '').trim()
  const VALID_REVIEW_STATUSES = ['pending', 'approved', 'rejected']

  if (status && !VALID_REVIEW_STATUSES.includes(status)) {
    return res.status(400).json({ error: 'Invalid status value' })
  }

  // Only show reviews that have comment content — rating-only reviews are auto-approved
  let where = ['r.content IS NOT NULL']
  let params = []
  let idx = 1

  if (status) {
    where.push(`r.status = $${idx}::review_status`)
    params.push(status)
    idx++
  }

  const whereClause = `WHERE ${where.join(' AND ')}`

  const countResult = await pool.query(
    `SELECT COUNT(*) FROM product_reviews r ${whereClause}`,
    params
  )
  const total = parseInt(countResult.rows[0].count)

  const dataResult = await pool.query(
    `SELECT r.id, r.rating, r.content, r.status, r.created_at, r.anonymous,
            p.name AS product_name,
            u.email AS customer_email
     FROM product_reviews r
     JOIN products p ON p.id = r.product_id
     JOIN auth.users u ON u.id = r.user_id
     ${whereClause}
     ORDER BY r.created_at DESC
     LIMIT $${idx} OFFSET $${idx + 1}`,
    [...params, limit, offset]
  )

  res.json({
    comments: dataResult.rows,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  })
})

// PUT /api/product-manager/comments/:id/approve
router.put('/comments/:id/approve', async (req, res) => {
  const result = await pool.query(
    `UPDATE product_reviews SET status = 'approved' WHERE id = $1 RETURNING id, status`,
    [req.params.id]
  )
  if (result.rows.length === 0) return res.status(404).json({ error: 'Comment not found' })
  res.json({ comment: result.rows[0] })
})

// PUT /api/product-manager/comments/:id/reject
router.put('/comments/:id/reject', async (req, res) => {
  const result = await pool.query(
    `UPDATE product_reviews SET status = 'rejected' WHERE id = $1 RETURNING id, status`,
    [req.params.id]
  )
  if (result.rows.length === 0) return res.status(404).json({ error: 'Comment not found' })
  res.json({ comment: result.rows[0] })
})

// ─── Product Images ──────────────────────────────────────────────────────────

// GET /api/product-manager/products/:id/images
router.get('/products/:id/images', async (req, res) => {
  const productId = parseInt(req.params.id, 10)
  if (!Number.isInteger(productId) || productId <= 0)
    return res.status(400).json({ error: 'Invalid product ID' })
  const result = await pool.query(
    `SELECT id, url, alt FROM product_images WHERE product_id = $1 ORDER BY id ASC`,
    [productId]
  )
  res.json({ images: result.rows })
})

// POST /api/product-manager/products/:id/images
router.post('/products/:id/images', async (req, res) => {
  const productId = parseInt(req.params.id, 10)
  if (!Number.isInteger(productId) || productId <= 0)
    return res.status(400).json({ error: 'Invalid product ID' })
  const { url, alt } = req.body
  if (!url) return res.status(400).json({ error: 'url is required' })
  const result = await pool.query(
    `INSERT INTO product_images (product_id, url, alt) VALUES ($1, $2, $3) RETURNING *`,
    [productId, url, alt || null]
  )
  res.status(201).json({ image: result.rows[0] })
})

// DELETE /api/product-manager/products/:id/images/:imageId
router.delete('/products/:id/images/:imageId', async (req, res) => {
  const result = await pool.query(
    `DELETE FROM product_images WHERE id = $1 AND product_id = $2 RETURNING id`,
    [req.params.imageId, req.params.id]
  )
  if (result.rows.length === 0) return res.status(404).json({ error: 'Image not found' })
  res.json({ message: 'Image deleted' })
})

module.exports = router
