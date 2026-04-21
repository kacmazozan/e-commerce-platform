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

  it('returns category list for product manager', async () => {
    pool.query.mockResolvedValueOnce({
      rows: [{ category: 'Electronics' }, { category: 'Footwear' }],
    })

    const res = await request(app)
      .get('/api/product-manager/categories')
      .set('Authorization', `Bearer ${pmToken}`)

    expect(res.status).toBe(200)
    expect(res.body).toHaveProperty('categories')
    expect(res.body.categories).toEqual(['Electronics', 'Footwear'])
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

  it('returns 400 when price is negative', async () => {
    const res = await request(app)
      .post('/api/product-manager/products')
      .set('Authorization', `Bearer ${pmToken}`)
      .send({ name: 'Test', price: -5 })
    expect(res.status).toBe(400)
    expect(res.body.error).toMatch(/price/i)
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
