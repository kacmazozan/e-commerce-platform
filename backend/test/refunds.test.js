const request = require('supertest')

jest.mock('../db', () => ({
  query: jest.fn(),
  connect: jest.fn(),
}))

const pool = require('../db')

process.env.JWT_SECRET = 'test-secret'

const app = require('../app')

const jwt = require('jsonwebtoken')
const userToken = jwt.sign(
  { userId: 42, email: 'user@example.com', role: 'customer' },
  'test-secret'
)

const now = new Date().toISOString()
const within30Days = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString()
const outside30Days = new Date(Date.now() - 31 * 24 * 60 * 60 * 1000).toISOString()

// ── GET /api/orders ────────────────────────────────────────────────────────

describe('GET /api/orders', () => {
  beforeEach(() => jest.clearAllMocks())

  it('returns 401 when no token provided', async () => {
    const res = await request(app).get('/api/orders')
    expect(res.status).toBe(401)
  })

  it('returns empty orders array when customer has no orders', async () => {
    pool.query.mockResolvedValueOnce({ rows: [] })

    const res = await request(app).get('/api/orders').set('Authorization', `Bearer ${userToken}`)

    expect(res.status).toBe(200)
    expect(res.body.orders).toEqual([])
  })

  it('returns grouped orders with null refund when no refund exists', async () => {
    pool.query
      .mockResolvedValueOnce({
        rows: [
          {
            id: 1,
            status: 'delivered',
            total: '149.99',
            address: '123 Main St',
            created_at: within30Days,
          },
        ],
      })
      .mockResolvedValueOnce({
        rows: [
          {
            id: 42,
            order_id: 1,
            quantity: 1,
            price: '149.99',
            size: 'EU 42',
            product_id: 5,
            product_name: 'Boots',
            refund_id: null,
            refund_status: null,
            refund_amount: null,
            requested_at: null,
          },
        ],
      })

    const res = await request(app).get('/api/orders').set('Authorization', `Bearer ${userToken}`)

    expect(res.status).toBe(200)
    expect(res.body.orders).toHaveLength(1)
    expect(res.body.orders[0].items).toHaveLength(1)
    expect(res.body.orders[0].items[0].refund).toBeNull()
  })

  it('returns refund sub-object when refund exists on item', async () => {
    pool.query
      .mockResolvedValueOnce({
        rows: [
          {
            id: 1,
            status: 'delivered',
            total: '149.99',
            address: '123 Main St',
            created_at: within30Days,
          },
        ],
      })
      .mockResolvedValueOnce({
        rows: [
          {
            id: 42,
            order_id: 1,
            quantity: 1,
            price: '149.99',
            size: 'EU 42',
            product_id: 5,
            product_name: 'Boots',
            refund_id: 10,
            refund_status: 'pending',
            refund_amount: '149.99',
            requested_at: now,
          },
        ],
      })

    const res = await request(app).get('/api/orders').set('Authorization', `Bearer ${userToken}`)

    expect(res.status).toBe(200)
    expect(res.body.orders[0].items[0].refund).toMatchObject({
      id: 10,
      status: 'pending',
      refund_amount: '149.99',
    })
  })

  it('groups multiple items under the same order', async () => {
    pool.query
      .mockResolvedValueOnce({
        rows: [
          { id: 1, status: 'delivered', total: '249.98', address: null, created_at: within30Days },
        ],
      })
      .mockResolvedValueOnce({
        rows: [
          {
            id: 42,
            order_id: 1,
            quantity: 1,
            price: '149.99',
            size: '',
            product_id: 5,
            product_name: 'Boots',
            refund_id: null,
            refund_status: null,
            refund_amount: null,
            requested_at: null,
          },
          {
            id: 43,
            order_id: 1,
            quantity: 1,
            price: '99.99',
            size: 'M',
            product_id: 6,
            product_name: 'Shirt',
            refund_id: null,
            refund_status: null,
            refund_amount: null,
            requested_at: null,
          },
        ],
      })

    const res = await request(app).get('/api/orders').set('Authorization', `Bearer ${userToken}`)

    expect(res.body.orders).toHaveLength(1)
    expect(res.body.orders[0].items).toHaveLength(2)
  })
})

// ── POST /api/refunds ──────────────────────────────────────────────────────

describe('POST /api/refunds', () => {
  beforeEach(() => jest.clearAllMocks())

  it('returns 401 when no token provided', async () => {
    const res = await request(app).post('/api/refunds').send({ order_item_id: 42 })
    expect(res.status).toBe(401)
  })

  it('returns 400 when order_item_id is missing', async () => {
    const res = await request(app)
      .post('/api/refunds')
      .set('Authorization', `Bearer ${userToken}`)
      .send({})
    expect(res.status).toBe(400)
  })

  it('returns 404 when order item not found or belongs to another user', async () => {
    pool.query.mockResolvedValueOnce({ rows: [] })

    const res = await request(app)
      .post('/api/refunds')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ order_item_id: 999 })

    expect(res.status).toBe(404)
  })

  it('returns 400 when order is not delivered', async () => {
    pool.query.mockResolvedValueOnce({
      rows: [
        { id: 42, quantity: 1, price: '99.99', created_at: within30Days, status: 'processing' },
      ],
    })

    const res = await request(app)
      .post('/api/refunds')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ order_item_id: 42 })

    expect(res.status).toBe(400)
    expect(res.body.error).toMatch(/delivered/i)
  })

  it('returns 400 when order is outside the 30-day window', async () => {
    pool.query.mockResolvedValueOnce({
      rows: [
        { id: 42, quantity: 1, price: '99.99', created_at: outside30Days, status: 'delivered' },
      ],
    })

    const res = await request(app)
      .post('/api/refunds')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ order_item_id: 42 })

    expect(res.status).toBe(400)
    expect(res.body.error).toMatch(/window expired/i)
  })

  it('returns 409 when a refund request already exists for the item', async () => {
    pool.query
      .mockResolvedValueOnce({
        rows: [
          { id: 42, quantity: 1, price: '99.99', created_at: within30Days, status: 'delivered' },
        ],
      })
      .mockResolvedValueOnce({ rows: [{ id: 10 }] })

    const res = await request(app)
      .post('/api/refunds')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ order_item_id: 42 })

    expect(res.status).toBe(409)
  })

  it('creates refund and sets refund_amount to price × quantity', async () => {
    pool.query
      .mockResolvedValueOnce({
        rows: [
          { id: 42, quantity: 2, price: '75.00', created_at: within30Days, status: 'delivered' },
        ],
      })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({
        rows: [
          { id: 10, status: 'pending', refund_amount: '150.00', reason: null, requested_at: now },
        ],
      })

    const res = await request(app)
      .post('/api/refunds')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ order_item_id: 42 })

    expect(res.status).toBe(201)
    expect(res.body.refund.refund_amount).toBe('150.00')
    expect(res.body.refund.status).toBe('pending')
    expect(res.body.refund.order_item_id).toBe(42)
  })
})

// ── GET /api/refunds ───────────────────────────────────────────────────────

describe('GET /api/refunds', () => {
  beforeEach(() => jest.clearAllMocks())

  it('returns 401 when no token provided', async () => {
    const res = await request(app).get('/api/refunds')
    expect(res.status).toBe(401)
  })

  it('returns customer refund list', async () => {
    pool.query.mockResolvedValueOnce({
      rows: [
        {
          id: 10,
          order_item_id: 42,
          order_id: 1,
          product_name: 'Boots',
          status: 'pending',
          refund_amount: '149.99',
          reason: null,
          requested_at: now,
          updated_at: now,
        },
      ],
    })

    const res = await request(app).get('/api/refunds').set('Authorization', `Bearer ${userToken}`)

    expect(res.status).toBe(200)
    expect(res.body.refunds).toHaveLength(1)
    expect(res.body.refunds[0].status).toBe('pending')
  })
})

// ── DELETE /api/refunds/:id ────────────────────────────────────────────────

describe('DELETE /api/refunds/:id', () => {
  beforeEach(() => jest.clearAllMocks())

  it('returns 401 when no token provided', async () => {
    const res = await request(app).delete('/api/refunds/10')
    expect(res.status).toBe(401)
  })

  it('returns 404 when refund not found or belongs to another user', async () => {
    pool.query.mockResolvedValueOnce({ rows: [] })

    const res = await request(app)
      .delete('/api/refunds/99')
      .set('Authorization', `Bearer ${userToken}`)

    expect(res.status).toBe(404)
  })

  it('returns 409 when refund status is approved', async () => {
    pool.query.mockResolvedValueOnce({ rows: [{ id: 10, status: 'approved' }] })

    const res = await request(app)
      .delete('/api/refunds/10')
      .set('Authorization', `Bearer ${userToken}`)

    expect(res.status).toBe(409)
    expect(res.body.error).toMatch(/approved/i)
  })

  it('returns 409 when refund status is rejected', async () => {
    pool.query.mockResolvedValueOnce({ rows: [{ id: 10, status: 'rejected' }] })

    const res = await request(app)
      .delete('/api/refunds/10')
      .set('Authorization', `Bearer ${userToken}`)

    expect(res.status).toBe(409)
  })

  it('deletes pending refund and returns 204', async () => {
    pool.query
      .mockResolvedValueOnce({ rows: [{ id: 10, status: 'pending' }] })
      .mockResolvedValueOnce({ rows: [{ id: 10 }] })

    const res = await request(app)
      .delete('/api/refunds/10')
      .set('Authorization', `Bearer ${userToken}`)

    expect(res.status).toBe(204)
  })
})
