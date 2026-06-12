const request = require('supertest')

jest.mock('../db', () => ({
  query: jest.fn(),
  connect: jest.fn(),
}))

const pool = require('../db')

process.env.JWT_SECRET = 'test-secret'

const app = require('../app')

const jwt = require('jsonwebtoken')
const smToken = jwt.sign({ userId: 1, email: 'sm@test.com', role: 'sales_manager' }, 'test-secret')
const customerToken = jwt.sign({ userId: 2, email: 'c@test.com', role: 'customer' }, 'test-secret')

const now = new Date().toISOString()
const within30Days = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString()
const outside30Days = new Date(Date.now() - 31 * 24 * 60 * 60 * 1000).toISOString()

function makeMockClient(responses) {
  const client = { query: jest.fn(), release: jest.fn() }
  responses.forEach((r) => client.query.mockResolvedValueOnce(r))
  return client
}

// ── GET /api/sales-manager/refunds ────────────────────────────────────────

describe('GET /api/sales-manager/refunds', () => {
  beforeEach(() => jest.clearAllMocks())

  it('returns 401 without token', async () => {
    const res = await request(app).get('/api/sales-manager/refunds')
    expect(res.status).toBe(401)
  })

  it('returns 403 for customer token', async () => {
    const res = await request(app)
      .get('/api/sales-manager/refunds')
      .set('Authorization', `Bearer ${customerToken}`)
    expect(res.status).toBe(403)
  })

  it('returns pending refunds list with pagination', async () => {
    pool.query.mockResolvedValueOnce({ rows: [{ count: '2' }] }).mockResolvedValueOnce({
      rows: [
        {
          id: 1,
          status: 'pending',
          refund_amount: '99.99',
          requested_at: now,
          updated_at: now,
          customer_name: 'Jane Doe',
          product_name: 'Boots',
          quantity: 1,
          order_id: 10,
          purchase_date: within30Days,
        },
      ],
    })

    const res = await request(app)
      .get('/api/sales-manager/refunds')
      .set('Authorization', `Bearer ${smToken}`)

    expect(res.status).toBe(200)
    expect(res.body.refunds).toHaveLength(1)
    expect(res.body.refunds[0].customer_name).toBe('Jane Doe')
    expect(res.body.pagination.total).toBe(2)
  })

  it('returns 400 for invalid status filter', async () => {
    const res = await request(app)
      .get('/api/sales-manager/refunds?status=unknown')
      .set('Authorization', `Bearer ${smToken}`)
    expect(res.status).toBe(400)
  })
})

// ── PATCH /api/sales-manager/refunds/:id/approve ──────────────────────────

describe('PATCH /api/sales-manager/refunds/:id/approve', () => {
  beforeEach(() => jest.clearAllMocks())

  it('returns 401 without token', async () => {
    const res = await request(app).patch('/api/sales-manager/refunds/1/approve')
    expect(res.status).toBe(401)
  })

  it('returns 403 for customer token', async () => {
    const res = await request(app)
      .patch('/api/sales-manager/refunds/1/approve')
      .set('Authorization', `Bearer ${customerToken}`)
    expect(res.status).toBe(403)
  })

  it('returns 404 when refund not found', async () => {
    const client = makeMockClient([{ rows: [] }])
    pool.connect.mockResolvedValueOnce(client)

    const res = await request(app)
      .patch('/api/sales-manager/refunds/999/approve')
      .set('Authorization', `Bearer ${smToken}`)

    expect(res.status).toBe(404)
    expect(client.release).toHaveBeenCalled()
  })

  it('returns 409 when refund is already approved', async () => {
    const client = makeMockClient([
      {
        rows: [
          {
            id: 1,
            status: 'approved',
            refund_amount: '99.99',
            user_id: 5,
            product_id: 3,
            product_name: 'Boots',
            quantity: 1,
            purchase_date: within30Days,
          },
        ],
      },
    ])
    pool.connect.mockResolvedValueOnce(client)

    const res = await request(app)
      .patch('/api/sales-manager/refunds/1/approve')
      .set('Authorization', `Bearer ${smToken}`)

    expect(res.status).toBe(409)
  })

  it('returns 422 when purchase date is outside 30-day window', async () => {
    const client = makeMockClient([
      {
        rows: [
          {
            id: 1,
            status: 'pending',
            refund_amount: '99.99',
            user_id: 5,
            product_id: 3,
            product_name: 'Boots',
            quantity: 1,
            purchase_date: outside30Days,
          },
        ],
      },
    ])
    pool.connect.mockResolvedValueOnce(client)

    const res = await request(app)
      .patch('/api/sales-manager/refunds/1/approve')
      .set('Authorization', `Bearer ${smToken}`)

    expect(res.status).toBe(422)
    expect(res.body.error).toMatch(/window expired/i)
  })

  it('approves refund and updates stock + credit in a transaction', async () => {
    const client = makeMockClient([
      {
        rows: [
          {
            id: 1,
            status: 'pending',
            refund_amount: '159.98',
            user_id: 5,
            product_id: 3,
            product_name: 'Running Shoes',
            quantity: 2,
            purchase_date: within30Days,
          },
        ],
      },
      { rows: [] }, // BEGIN
      { rows: [] }, // UPDATE refunds
      { rows: [] }, // UPDATE products stock
      { rows: [] }, // UPDATE credit_balance
      { rows: [] }, // COMMIT
    ])
    pool.connect.mockResolvedValueOnce(client)
    // notification INSERT (fire-and-forget via pool.query)
    pool.query.mockResolvedValueOnce({ rows: [] })

    const res = await request(app)
      .patch('/api/sales-manager/refunds/1/approve')
      .set('Authorization', `Bearer ${smToken}`)

    expect(res.status).toBe(200)
    expect(res.body.refund.status).toBe('approved')
    // Discount-price edge case: credit uses stored refund_amount, not current product price
    expect(res.body.refund.refund_amount).toBe('159.98')
    expect(client.release).toHaveBeenCalled()

    const queries = client.query.mock.calls.map((c) => c[0])
    expect(queries.some((q) => /BEGIN/i.test(q))).toBe(true)
    expect(queries.some((q) => /UPDATE products SET stock/i.test(q))).toBe(true)
    expect(queries.some((q) => /credit_balance/i.test(q))).toBe(true)
    expect(queries.some((q) => /COMMIT/i.test(q))).toBe(true)
  })
})

// ── PATCH /api/sales-manager/refunds/:id/reject ───────────────────────────

describe('PATCH /api/sales-manager/refunds/:id/reject', () => {
  beforeEach(() => jest.clearAllMocks())

  it('returns 401 without token', async () => {
    const res = await request(app).patch('/api/sales-manager/refunds/1/reject')
    expect(res.status).toBe(401)
  })

  it('returns 403 for customer token', async () => {
    const res = await request(app)
      .patch('/api/sales-manager/refunds/1/reject')
      .set('Authorization', `Bearer ${customerToken}`)
    expect(res.status).toBe(403)
  })

  it('returns 404 when refund not found', async () => {
    pool.query.mockResolvedValueOnce({ rows: [] })

    const res = await request(app)
      .patch('/api/sales-manager/refunds/999/reject')
      .set('Authorization', `Bearer ${smToken}`)

    expect(res.status).toBe(404)
  })

  it('returns 409 when refund is already rejected', async () => {
    pool.query.mockResolvedValueOnce({
      rows: [{ id: 1, status: 'rejected', user_id: 5, product_id: 3, product_name: 'Boots' }],
    })

    const res = await request(app)
      .patch('/api/sales-manager/refunds/1/reject')
      .set('Authorization', `Bearer ${smToken}`)

    expect(res.status).toBe(409)
  })

  it('rejects refund and sends notification without touching stock or credit', async () => {
    pool.query
      .mockResolvedValueOnce({
        rows: [{ id: 1, status: 'pending', user_id: 5, product_id: 3, product_name: 'Boots' }],
      })
      .mockResolvedValueOnce({ rows: [] }) // UPDATE refunds
      .mockResolvedValueOnce({ rows: [] }) // notification INSERT

    const res = await request(app)
      .patch('/api/sales-manager/refunds/1/reject')
      .set('Authorization', `Bearer ${smToken}`)

    expect(res.status).toBe(200)
    expect(res.body.refund.status).toBe('rejected')

    const queries = pool.query.mock.calls.map((c) => c[0])
    expect(queries.every((q) => !/stock|credit_balance/i.test(q))).toBe(true)
    expect(queries.some((q) => /refund_decision/i.test(q))).toBe(true)
  })
})
