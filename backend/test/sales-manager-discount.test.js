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

function makeMockClient(responses) {
  const client = {
    query: jest.fn(),
    release: jest.fn(),
  }
  responses.forEach((r) => client.query.mockResolvedValueOnce(r))
  return client
}

describe('POST /api/sales-manager/products/discount', () => {
  beforeEach(() => jest.clearAllMocks())

  it('returns 401 without token', async () => {
    const res = await request(app)
      .post('/api/sales-manager/products/discount')
      .send({ productIds: [1], discountPercent: 20 })
    expect(res.status).toBe(401)
  })

  it('returns 403 for non-sales-manager', async () => {
    const res = await request(app)
      .post('/api/sales-manager/products/discount')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({ productIds: [1], discountPercent: 20 })
    expect(res.status).toBe(403)
  })

  it('returns 400 when productIds is missing', async () => {
    const res = await request(app)
      .post('/api/sales-manager/products/discount')
      .set('Authorization', `Bearer ${smToken}`)
      .send({ discountPercent: 20 })
    expect(res.status).toBe(400)
    expect(res.body.error).toMatch(/productIds/i)
  })

  it('returns 400 when productIds is empty', async () => {
    const res = await request(app)
      .post('/api/sales-manager/products/discount')
      .set('Authorization', `Bearer ${smToken}`)
      .send({ productIds: [], discountPercent: 20 })
    expect(res.status).toBe(400)
  })

  it('returns 400 when discountPercent is 0', async () => {
    const res = await request(app)
      .post('/api/sales-manager/products/discount')
      .set('Authorization', `Bearer ${smToken}`)
      .send({ productIds: [1], discountPercent: 0 })
    expect(res.status).toBe(400)
    expect(res.body.error).toMatch(/discountPercent/i)
  })

  it('returns 400 when discountPercent is over 100', async () => {
    const res = await request(app)
      .post('/api/sales-manager/products/discount')
      .set('Authorization', `Bearer ${smToken}`)
      .send({ productIds: [1], discountPercent: 101 })
    expect(res.status).toBe(400)
  })

  it('returns 404 when a product does not exist', async () => {
    const client = makeMockClient([
      {}, // BEGIN
      { rows: [] }, // SELECT products — empty means not all found
      {}, // ROLLBACK
    ])
    pool.connect.mockResolvedValue(client)

    const res = await request(app)
      .post('/api/sales-manager/products/discount')
      .set('Authorization', `Bearer ${smToken}`)
      .send({ productIds: [999], discountPercent: 20 })

    expect(res.status).toBe(404)
    expect(res.body.error).toMatch(/not found/i)
    expect(client.release).toHaveBeenCalled()
  })

  it('applies discount and inserts notifications for wishlist users', async () => {
    const client = makeMockClient([
      {}, // BEGIN
      { rows: [{ id: 1, name: 'Shirt', price: '100.00' }] }, // SELECT products
      {}, // INSERT product_discounts (upsert)
      {}, // DELETE existing unread notifications
      { rows: [{ user_id: 5, product_id: 1 }] }, // INSERT wishlist notifications RETURNING
      { rows: [] }, // INSERT cart notifications RETURNING — nobody had it in cart
      {}, // COMMIT
    ])
    pool.connect.mockResolvedValue(client)

    const res = await request(app)
      .post('/api/sales-manager/products/discount')
      .set('Authorization', `Bearer ${smToken}`)
      .send({ productIds: [1], discountPercent: 20 })

    expect(res.status).toBe(200)
    expect(res.body.updated).toBe(1)
    expect(res.body.notified).toBe(1)
    expect(client.release).toHaveBeenCalled()
  })

  it('reports 0 notified when no wishlist or cart users exist', async () => {
    const client = makeMockClient([
      {}, // BEGIN
      { rows: [{ id: 2, name: 'Jacket', price: '200.00' }] }, // SELECT products
      {}, // INSERT product_discounts
      {}, // DELETE existing unread notifications
      { rows: [] }, // INSERT wishlist notifications RETURNING — nobody wishlisted it
      { rows: [] }, // INSERT cart notifications RETURNING — nobody has it in cart
      {}, // COMMIT
    ])
    pool.connect.mockResolvedValue(client)

    const res = await request(app)
      .post('/api/sales-manager/products/discount')
      .set('Authorization', `Bearer ${smToken}`)
      .send({ productIds: [2], discountPercent: 10 })

    expect(res.status).toBe(200)
    expect(res.body.updated).toBe(1)
    expect(res.body.notified).toBe(0)
  })

  it('counts cart users alongside wishlist users, deduping when a user has both', async () => {
    const client = makeMockClient([
      {}, // BEGIN
      { rows: [{ id: 3, name: 'Hat', price: '50.00' }] }, // SELECT products
      {}, // INSERT product_discounts
      {}, // DELETE existing unread notifications
      { rows: [{ user_id: 5, product_id: 3 }] }, // wishlist notifications: user 5
      { rows: [{ user_id: 7, product_id: 3 }] }, // cart notifications: user 7 (user 5 dedupes via NOT EXISTS)
      {}, // COMMIT
    ])
    pool.connect.mockResolvedValue(client)

    const res = await request(app)
      .post('/api/sales-manager/products/discount')
      .set('Authorization', `Bearer ${smToken}`)
      .send({ productIds: [3], discountPercent: 15 })

    expect(res.status).toBe(200)
    expect(res.body.updated).toBe(1)
    expect(res.body.notified).toBe(2)
  })
})

describe('DELETE /api/sales-manager/products/:id/discount', () => {
  beforeEach(() => jest.clearAllMocks())

  it('returns 401 without token', async () => {
    const res = await request(app).delete('/api/sales-manager/products/1/discount')
    expect(res.status).toBe(401)
  })

  it('returns 403 for non-sales-manager', async () => {
    const res = await request(app)
      .delete('/api/sales-manager/products/1/discount')
      .set('Authorization', `Bearer ${customerToken}`)
    expect(res.status).toBe(403)
  })

  it('returns 400 for invalid product ID', async () => {
    const res = await request(app)
      .delete('/api/sales-manager/products/abc/discount')
      .set('Authorization', `Bearer ${smToken}`)
    expect(res.status).toBe(400)
  })

  it('returns 404 when product does not exist', async () => {
    pool.query.mockResolvedValueOnce({ rows: [] })

    const res = await request(app)
      .delete('/api/sales-manager/products/999/discount')
      .set('Authorization', `Bearer ${smToken}`)

    expect(res.status).toBe(404)
    expect(res.body.error).toMatch(/not found/i)
  })

  it('removes discount and returns 204', async () => {
    pool.query.mockResolvedValueOnce({ rows: [{ id: 1 }] }).mockResolvedValueOnce({ rows: [] })

    const res = await request(app)
      .delete('/api/sales-manager/products/1/discount')
      .set('Authorization', `Bearer ${smToken}`)

    expect(res.status).toBe(204)
  })
})
