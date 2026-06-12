const request = require('supertest')

jest.mock('../db', () => ({
  query: jest.fn(),
  connect: jest.fn(),
}))

const pool = require('../db')

process.env.JWT_SECRET = 'test-secret'

const app = require('../app')

const jwt = require('jsonwebtoken')
const pmToken = jwt.sign(
  { userId: 1, email: 'pm@test.com', role: 'product_manager' },
  'test-secret'
)
const customerToken = jwt.sign({ userId: 2, email: 'c@test.com', role: 'customer' }, 'test-secret')
const adminToken = jwt.sign({ userId: 3, email: 'a@test.com', role: 'admin' }, 'test-secret')
const smToken = jwt.sign({ userId: 4, email: 'sm@test.com', role: 'sales_manager' }, 'test-secret')

// ─── GET /api/product-manager/categories ─────────────────────────────────────

describe('GET /api/product-manager/categories', () => {
  beforeEach(() => jest.clearAllMocks())

  it('returns 401 with no token', async () => {
    const res = await request(app).get('/api/product-manager/categories')
    expect(res.status).toBe(401)
  })

  it('returns 403 with customer token', async () => {
    const res = await request(app)
      .get('/api/product-manager/categories')
      .set('Authorization', `Bearer ${customerToken}`)
    expect(res.status).toBe(403)
  })

  it('returns category list with product counts for product manager', async () => {
    pool.query.mockResolvedValueOnce({
      rows: [
        { name: 'Electronics', product_count: 3 },
        { name: 'Footwear', product_count: 0 },
      ],
    })

    const res = await request(app)
      .get('/api/product-manager/categories')
      .set('Authorization', `Bearer ${pmToken}`)

    expect(res.status).toBe(200)
    expect(res.body).toHaveProperty('categories')
    expect(res.body.categories).toEqual([
      { name: 'Electronics', product_count: 3 },
      { name: 'Footwear', product_count: 0 },
    ])
  })
})

// ─── GET /api/product-manager/products ───────────────────────────────────────

describe('GET /api/product-manager/products', () => {
  beforeEach(() => jest.clearAllMocks())

  it('returns 401 with no token', async () => {
    const res = await request(app).get('/api/product-manager/products')
    expect(res.status).toBe(401)
  })

  it('returns 403 with customer token', async () => {
    const res = await request(app)
      .get('/api/product-manager/products')
      .set('Authorization', `Bearer ${customerToken}`)
    expect(res.status).toBe(403)
  })

  it('returns 403 with admin token', async () => {
    const res = await request(app)
      .get('/api/product-manager/products')
      .set('Authorization', `Bearer ${adminToken}`)
    expect(res.status).toBe(403)
  })

  it('returns 403 with sales_manager token', async () => {
    const res = await request(app)
      .get('/api/product-manager/products')
      .set('Authorization', `Bearer ${smToken}`)
    expect(res.status).toBe(403)
  })

  it('returns product list with pagination for product manager', async () => {
    pool.query.mockResolvedValueOnce({ rows: [{ count: '2' }] }).mockResolvedValueOnce({
      rows: [
        { id: 1, name: 'Widget', category: 'Electronics', price: '19.99', stock: 5 },
        { id: 2, name: 'Gadget', category: 'Electronics', price: '49.99', stock: 10 },
      ],
    })

    const res = await request(app)
      .get('/api/product-manager/products')
      .set('Authorization', `Bearer ${pmToken}`)

    expect(res.status).toBe(200)
    expect(res.body).toHaveProperty('products')
    expect(res.body.products).toHaveLength(2)
    expect(res.body).toHaveProperty('pagination')
    expect(res.body.pagination.total).toBe(2)
  })

  it('filters low-stock products when lowStock=true', async () => {
    pool.query.mockResolvedValueOnce({ rows: [{ count: '1' }] }).mockResolvedValueOnce({
      rows: [{ id: 3, name: 'LowItem', category: 'Misc', price: '5.00', stock: 2 }],
    })

    const res = await request(app)
      .get('/api/product-manager/products?lowStock=true')
      .set('Authorization', `Bearer ${pmToken}`)

    expect(res.status).toBe(200)
    expect(res.body.products).toHaveLength(1)
  })
})

// ─── POST /api/product-manager/products ──────────────────────────────────────

describe('POST /api/product-manager/products', () => {
  beforeEach(() => jest.clearAllMocks())

  it('returns 401 with no token', async () => {
    const res = await request(app)
      .post('/api/product-manager/products')
      .send({ name: 'Test', price: 10 })
    expect(res.status).toBe(401)
  })

  it('returns 403 with customer token', async () => {
    const res = await request(app)
      .post('/api/product-manager/products')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({ name: 'Test', price: 10 })
    expect(res.status).toBe(403)
  })

  it('returns 400 when name is missing', async () => {
    const res = await request(app)
      .post('/api/product-manager/products')
      .set('Authorization', `Bearer ${pmToken}`)
      .send({ price: 10 })
    expect(res.status).toBe(400)
    expect(res.body).toHaveProperty('error')
  })

  it('ignores price field — price is set by sales manager only', async () => {
    pool.query.mockResolvedValueOnce({
      rows: [{ id: 1, name: 'Test', price: null, stock: 0, category: null }],
    })
    const res = await request(app)
      .post('/api/product-manager/products')
      .set('Authorization', `Bearer ${pmToken}`)
      .send({ name: 'Test', price: -5 })
    expect(res.status).toBe(201)
    expect(res.body.product.price).toBeNull()
  })

  it('returns 400 when stock is negative', async () => {
    const res = await request(app)
      .post('/api/product-manager/products')
      .set('Authorization', `Bearer ${pmToken}`)
      .send({ name: 'Test', price: 10, stock: -1 })
    expect(res.status).toBe(400)
    expect(res.body.error).toMatch(/stock/i)
  })

  it('creates product successfully', async () => {
    pool.query.mockResolvedValueOnce({
      rows: [{ id: 1, name: 'Test', price: '10.00', stock: 5, category: null }],
    })

    const res = await request(app)
      .post('/api/product-manager/products')
      .set('Authorization', `Bearer ${pmToken}`)
      .send({ name: 'Test', price: 10, stock: 5 })

    expect(res.status).toBe(201)
    expect(res.body).toHaveProperty('product')
    expect(res.body.product.name).toBe('Test')
  })
})

// ─── PUT /api/product-manager/products/:id ───────────────────────────────────

describe('PUT /api/product-manager/products/:id', () => {
  beforeEach(() => jest.clearAllMocks())

  it('returns 401 with no token', async () => {
    const res = await request(app).put('/api/product-manager/products/1').send({ name: 'Updated' })
    expect(res.status).toBe(401)
  })

  it('returns 404 when product not found', async () => {
    pool.query.mockResolvedValueOnce({ rows: [] })

    const res = await request(app)
      .put('/api/product-manager/products/999')
      .set('Authorization', `Bearer ${pmToken}`)
      .send({ name: 'Updated' })

    expect(res.status).toBe(404)
  })

  it('returns 400 when stock is negative', async () => {
    pool.query.mockResolvedValueOnce({ rows: [{ id: 1 }] })

    const res = await request(app)
      .put('/api/product-manager/products/1')
      .set('Authorization', `Bearer ${pmToken}`)
      .send({ stock: -3 })

    expect(res.status).toBe(400)
    expect(res.body.error).toMatch(/stock/i)
  })

  it('updates product successfully', async () => {
    pool.query.mockResolvedValueOnce({ rows: [{ id: 1 }] }).mockResolvedValueOnce({
      rows: [{ id: 1, name: 'Updated', price: '15.00', stock: 8 }],
    })

    const res = await request(app)
      .put('/api/product-manager/products/1')
      .set('Authorization', `Bearer ${pmToken}`)
      .send({ name: 'Updated', price: 15, stock: 8 })

    expect(res.status).toBe(200)
    expect(res.body.product.name).toBe('Updated')
  })
})

// ─── DELETE /api/product-manager/products/:id ────────────────────────────────

describe('DELETE /api/product-manager/products/:id', () => {
  beforeEach(() => jest.clearAllMocks())

  it('returns 401 with no token', async () => {
    const res = await request(app).delete('/api/product-manager/products/1')
    expect(res.status).toBe(401)
  })

  it('returns 404 when product not found', async () => {
    pool.query.mockResolvedValueOnce({ rows: [] })

    const res = await request(app)
      .delete('/api/product-manager/products/999')
      .set('Authorization', `Bearer ${pmToken}`)

    expect(res.status).toBe(404)
  })

  it('deletes product successfully', async () => {
    pool.query.mockResolvedValueOnce({ rows: [{ id: 1 }] })

    const res = await request(app)
      .delete('/api/product-manager/products/1')
      .set('Authorization', `Bearer ${pmToken}`)

    expect(res.status).toBe(200)
    expect(res.body).toHaveProperty('message')
  })
})

// ─── GET /api/product-manager/orders ─────────────────────────────────────────

describe('GET /api/product-manager/orders', () => {
  beforeEach(() => jest.clearAllMocks())

  it('returns 401 with no token', async () => {
    const res = await request(app).get('/api/product-manager/orders')
    expect(res.status).toBe(401)
  })

  it('returns 403 with customer token', async () => {
    const res = await request(app)
      .get('/api/product-manager/orders')
      .set('Authorization', `Bearer ${customerToken}`)
    expect(res.status).toBe(403)
  })

  it('returns order list with pagination', async () => {
    pool.query.mockResolvedValueOnce({ rows: [{ count: '1' }] }).mockResolvedValueOnce({
      rows: [
        {
          id: 1,
          status: 'pending',
          total: '50.00',
          address: '123 St',
          created_at: new Date().toISOString(),
          user_id: 2,
          user_email: 'c@test.com',
        },
      ],
    })

    const res = await request(app)
      .get('/api/product-manager/orders')
      .set('Authorization', `Bearer ${pmToken}`)

    expect(res.status).toBe(200)
    expect(res.body).toHaveProperty('orders')
    expect(res.body.orders).toHaveLength(1)
    expect(res.body).toHaveProperty('pagination')
  })
})

// ─── GET /api/product-manager/orders/:id ─────────────────────────────────────

describe('GET /api/product-manager/orders/:id', () => {
  beforeEach(() => jest.clearAllMocks())

  it('returns 404 when order not found', async () => {
    pool.query.mockResolvedValueOnce({ rows: [] })

    const res = await request(app)
      .get('/api/product-manager/orders/9999')
      .set('Authorization', `Bearer ${pmToken}`)

    expect(res.status).toBe(404)
  })

  it('returns order detail with items', async () => {
    pool.query
      .mockResolvedValueOnce({
        rows: [
          {
            id: 1,
            status: 'pending',
            total: '50.00',
            address: '123 St',
            created_at: new Date().toISOString(),
            user_id: 2,
            user_email: 'c@test.com',
          },
        ],
      })
      .mockResolvedValueOnce({
        rows: [{ id: 1, quantity: 2, price: '25.00', product_id: 5, product_name: 'Widget' }],
      })

    const res = await request(app)
      .get('/api/product-manager/orders/1')
      .set('Authorization', `Bearer ${pmToken}`)

    expect(res.status).toBe(200)
    expect(res.body).toHaveProperty('order')
    expect(res.body).toHaveProperty('items')
    expect(res.body.items).toHaveLength(1)
  })
})

// ─── PATCH /api/product-manager/orders/:id/status ────────────────────────────

describe('PATCH /api/product-manager/orders/:id/status', () => {
  beforeEach(() => jest.clearAllMocks())

  it('returns 401 with no token', async () => {
    const res = await request(app)
      .patch('/api/product-manager/orders/1/status')
      .send({ status: 'shipped' })
    expect(res.status).toBe(401)
  })

  it('returns 403 with customer token', async () => {
    const res = await request(app)
      .patch('/api/product-manager/orders/1/status')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({ status: 'shipped' })
    expect(res.status).toBe(403)
  })

  it('returns 400 for invalid status', async () => {
    const res = await request(app)
      .patch('/api/product-manager/orders/1/status')
      .set('Authorization', `Bearer ${pmToken}`)
      .send({ status: 'pending' })
    expect(res.status).toBe(400)
    expect(res.body).toHaveProperty('error')
  })

  it('returns 400 when status is missing', async () => {
    const res = await request(app)
      .patch('/api/product-manager/orders/1/status')
      .set('Authorization', `Bearer ${pmToken}`)
      .send({})
    expect(res.status).toBe(400)
    expect(res.body).toHaveProperty('error')
  })

  it('returns 400 for non-numeric order ID', async () => {
    const res = await request(app)
      .patch('/api/product-manager/orders/abc/status')
      .set('Authorization', `Bearer ${pmToken}`)
      .send({ status: 'shipped' })
    expect(res.status).toBe(400)
    expect(res.body).toHaveProperty('error')
  })

  it('returns 404 when order not found', async () => {
    pool.query.mockResolvedValueOnce({ rows: [] })

    const res = await request(app)
      .patch('/api/product-manager/orders/9999/status')
      .set('Authorization', `Bearer ${pmToken}`)
      .send({ status: 'shipped' })

    expect(res.status).toBe(404)
  })

  it('updates order status successfully', async () => {
    pool.query.mockResolvedValueOnce({
      rows: [{ id: 1, status: 'shipped', updated_at: new Date().toISOString() }],
    })

    const res = await request(app)
      .patch('/api/product-manager/orders/1/status')
      .set('Authorization', `Bearer ${pmToken}`)
      .send({ status: 'shipped' })

    expect(res.status).toBe(200)
    expect(res.body.order.status).toBe('shipped')
  })

  it('marks order as delivered successfully', async () => {
    pool.query.mockResolvedValueOnce({
      rows: [{ id: 2, status: 'delivered', updated_at: new Date().toISOString() }],
    })

    const res = await request(app)
      .patch('/api/product-manager/orders/2/status')
      .set('Authorization', `Bearer ${pmToken}`)
      .send({ status: 'delivered' })

    expect(res.status).toBe(200)
    expect(res.body.order.status).toBe('delivered')
  })
})

// ─── GET /api/product-manager/comments ───────────────────────────────────────

describe('GET /api/product-manager/comments', () => {
  beforeEach(() => jest.clearAllMocks())

  it('returns 401 with no token', async () => {
    const res = await request(app).get('/api/product-manager/comments')
    expect(res.status).toBe(401)
  })

  it('returns 403 with customer token', async () => {
    const res = await request(app)
      .get('/api/product-manager/comments')
      .set('Authorization', `Bearer ${customerToken}`)
    expect(res.status).toBe(403)
  })

  it('returns 400 for invalid status value', async () => {
    const res = await request(app)
      .get('/api/product-manager/comments?status=invalid')
      .set('Authorization', `Bearer ${pmToken}`)

    expect(res.status).toBe(400)
    expect(res.body).toHaveProperty('error')
  })

  it('returns comment list with pagination', async () => {
    pool.query.mockResolvedValueOnce({ rows: [{ count: '1' }] }).mockResolvedValueOnce({
      rows: [
        {
          id: 1,
          rating: 4,
          content: 'Great!',
          status: 'pending',
          created_at: new Date().toISOString(),
          product_name: 'Widget',
          customer_email: 'c@test.com',
        },
      ],
    })

    const res = await request(app)
      .get('/api/product-manager/comments?status=pending')
      .set('Authorization', `Bearer ${pmToken}`)

    expect(res.status).toBe(200)
    expect(res.body).toHaveProperty('comments')
    expect(res.body.comments).toHaveLength(1)
    expect(res.body).toHaveProperty('pagination')
  })
})

// ─── PUT /api/product-manager/comments/:id/approve ───────────────────────────

describe('PUT /api/product-manager/comments/:id/approve', () => {
  beforeEach(() => jest.clearAllMocks())

  it('returns 401 with no token', async () => {
    const res = await request(app).put('/api/product-manager/comments/1/approve')
    expect(res.status).toBe(401)
  })

  it('returns 403 with customer token', async () => {
    const res = await request(app)
      .put('/api/product-manager/comments/1/approve')
      .set('Authorization', `Bearer ${customerToken}`)
    expect(res.status).toBe(403)
  })

  it('returns 404 when comment not found', async () => {
    pool.query.mockResolvedValueOnce({ rows: [] })

    const res = await request(app)
      .put('/api/product-manager/comments/999/approve')
      .set('Authorization', `Bearer ${pmToken}`)

    expect(res.status).toBe(404)
  })

  it('approves comment successfully', async () => {
    pool.query.mockResolvedValueOnce({ rows: [{ id: 1, status: 'approved' }] })

    const res = await request(app)
      .put('/api/product-manager/comments/1/approve')
      .set('Authorization', `Bearer ${pmToken}`)

    expect(res.status).toBe(200)
    expect(res.body.comment.status).toBe('approved')
  })
})

// ─── PUT /api/product-manager/comments/:id/reject ────────────────────────────

describe('PUT /api/product-manager/comments/:id/reject', () => {
  beforeEach(() => jest.clearAllMocks())

  it('returns 401 with no token', async () => {
    const res = await request(app).put('/api/product-manager/comments/1/reject')
    expect(res.status).toBe(401)
  })

  it('returns 404 when comment not found', async () => {
    pool.query.mockResolvedValueOnce({ rows: [] })

    const res = await request(app)
      .put('/api/product-manager/comments/999/reject')
      .set('Authorization', `Bearer ${pmToken}`)

    expect(res.status).toBe(404)
  })

  it('rejects comment successfully', async () => {
    pool.query.mockResolvedValueOnce({ rows: [{ id: 1, status: 'rejected' }] })

    const res = await request(app)
      .put('/api/product-manager/comments/1/reject')
      .set('Authorization', `Bearer ${pmToken}`)

    expect(res.status).toBe(200)
    expect(res.body.comment.status).toBe('rejected')
  })
})

// ─── GET /api/product-manager/products/:id/images ────────────────────────────

describe('GET /api/product-manager/products/:id/images', () => {
  beforeEach(() => jest.clearAllMocks())

  it('returns 401 with no token', async () => {
    const res = await request(app).get('/api/product-manager/products/1/images')
    expect(res.status).toBe(401)
  })

  it('returns 403 with customer token', async () => {
    const res = await request(app)
      .get('/api/product-manager/products/1/images')
      .set('Authorization', `Bearer ${customerToken}`)
    expect(res.status).toBe(403)
  })

  it('returns 400 for invalid product id', async () => {
    const res = await request(app)
      .get('/api/product-manager/products/abc/images')
      .set('Authorization', `Bearer ${pmToken}`)
    expect(res.status).toBe(400)
    expect(res.body).toHaveProperty('error')
  })

  it('returns 200 with images array for pm token', async () => {
    pool.query.mockResolvedValueOnce({
      rows: [
        { id: 10, url: 'https://example.com/img1.jpg', alt: 'Front' },
        { id: 11, url: 'https://example.com/img2.jpg', alt: 'Back' },
      ],
    })

    const res = await request(app)
      .get('/api/product-manager/products/1/images')
      .set('Authorization', `Bearer ${pmToken}`)

    expect(res.status).toBe(200)
    expect(res.body).toHaveProperty('images')
    expect(res.body.images).toHaveLength(2)
    expect(res.body.images[0].url).toBe('https://example.com/img1.jpg')
  })
})

// ─── POST /api/product-manager/products/:id/images ───────────────────────────

describe('POST /api/product-manager/products/:id/images', () => {
  beforeEach(() => jest.clearAllMocks())

  it('returns 401 with no token', async () => {
    const res = await request(app)
      .post('/api/product-manager/products/1/images')
      .send({ url: 'https://example.com/img.jpg' })
    expect(res.status).toBe(401)
  })

  it('returns 400 when url is missing', async () => {
    const res = await request(app)
      .post('/api/product-manager/products/1/images')
      .set('Authorization', `Bearer ${pmToken}`)
      .send({ alt: 'No url here' })
    expect(res.status).toBe(400)
    expect(res.body).toHaveProperty('error')
  })

  it('returns 400 for invalid product id', async () => {
    const res = await request(app)
      .post('/api/product-manager/products/abc/images')
      .set('Authorization', `Bearer ${pmToken}`)
      .send({ url: 'https://example.com/img.jpg' })
    expect(res.status).toBe(400)
    expect(res.body).toHaveProperty('error')
  })

  it('returns 201 with image on success', async () => {
    pool.query.mockResolvedValueOnce({
      rows: [
        {
          id: 20,
          product_id: 1,
          url: 'https://example.com/img.jpg',
          alt: 'Side view',
        },
      ],
    })

    const res = await request(app)
      .post('/api/product-manager/products/1/images')
      .set('Authorization', `Bearer ${pmToken}`)
      .send({ url: 'https://example.com/img.jpg', alt: 'Side view' })

    expect(res.status).toBe(201)
    expect(res.body).toHaveProperty('image')
    expect(res.body.image.url).toBe('https://example.com/img.jpg')
  })
})

// ─── DELETE /api/product-manager/products/:id/images/:imageId ────────────────

describe('DELETE /api/product-manager/products/:id/images/:imageId', () => {
  beforeEach(() => jest.clearAllMocks())

  it('returns 401 with no token', async () => {
    const res = await request(app).delete('/api/product-manager/products/1/images/10')
    expect(res.status).toBe(401)
  })

  it('returns 404 when image not found', async () => {
    pool.query.mockResolvedValueOnce({ rows: [] })

    const res = await request(app)
      .delete('/api/product-manager/products/1/images/999')
      .set('Authorization', `Bearer ${pmToken}`)

    expect(res.status).toBe(404)
    expect(res.body).toHaveProperty('error')
  })

  it('returns 200 with message on success', async () => {
    pool.query.mockResolvedValueOnce({ rows: [{ id: 10 }] })

    const res = await request(app)
      .delete('/api/product-manager/products/1/images/10')
      .set('Authorization', `Bearer ${pmToken}`)

    expect(res.status).toBe(200)
    expect(res.body).toHaveProperty('message')
  })
})

// ─── POST /api/product-manager/products — detail fields ──────────────────────

describe('POST /api/product-manager/products — detail fields', () => {
  beforeEach(() => jest.clearAllMocks())

  it('creates product with all detail fields and passes 14 parameters to pool.query', async () => {
    pool.query.mockResolvedValueOnce({
      rows: [
        {
          id: 1,
          name: 'Merino Sweater',
          price: '89.99',
          stock: 10,
          category: "Women's Clothing",
          country_of_origin: 'Turkey',
          material: 'Merino Wool',
          model_height: '175cm',
          model_chest: '88cm',
          model_waist: '68cm',
          model_hips: '94cm',
          model_size: 'S',
          sizes: ['XS', 'S', 'M', 'L'],
        },
      ],
    })

    const res = await request(app)
      .post('/api/product-manager/products')
      .set('Authorization', `Bearer ${pmToken}`)
      .send({
        name: 'Merino Sweater',
        price: 89.99,
        stock: 10,
        category: "Women's Clothing",
        country_of_origin: 'Turkey',
        material: 'Merino Wool',
        model_height: '175cm',
        model_chest: '88cm',
        model_waist: '68cm',
        model_hips: '94cm',
        model_size: 'S',
        sizes: ['XS', 'S', 'M', 'L'],
      })

    expect(res.status).toBe(201)
    expect(res.body).toHaveProperty('product')

    const [, params] = pool.query.mock.calls[0]
    expect(params).toHaveLength(14)
  })
})

// ─── PUT /api/product-manager/products/:id — detail fields ───────────────────

describe('PUT /api/product-manager/products/:id — detail fields', () => {
  beforeEach(() => jest.clearAllMocks())

  it('updates material and sizes on an existing product successfully', async () => {
    pool.query.mockResolvedValueOnce({ rows: [{ id: 1 }] }).mockResolvedValueOnce({
      rows: [
        {
          id: 1,
          name: 'Merino Sweater',
          price: '89.99',
          stock: 10,
          material: 'Cashmere',
          sizes: ['S', 'M', 'L', 'XL'],
        },
      ],
    })

    const res = await request(app)
      .put('/api/product-manager/products/1')
      .set('Authorization', `Bearer ${pmToken}`)
      .send({ material: 'Cashmere', sizes: ['S', 'M', 'L', 'XL'] })

    expect(res.status).toBe(200)
    expect(res.body.product.material).toBe('Cashmere')
    expect(res.body.product.sizes).toEqual(['S', 'M', 'L', 'XL'])
  })
})
