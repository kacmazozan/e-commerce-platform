const request = require('supertest')

jest.mock('../db', () => ({
  query: jest.fn(),
  connect: jest.fn(),
}))

jest.mock('../services/invoice-workflow', () => ({
  queueInvoiceRequest: jest.fn(),
}))

const pool = require('../db')
const { queueInvoiceRequest } = require('../services/invoice-workflow')

process.env.JWT_SECRET = 'test-secret'

const app = require('../app')

const jwt = require('jsonwebtoken')
const userToken = jwt.sign(
  { userId: 7, email: 'user@example.com', role: 'customer' },
  'test-secret'
)

function makeClient(queryResponses = []) {
  let callCount = 0
  const client = {
    query: jest.fn().mockImplementation(() => {
      const response = queryResponses[callCount] ?? { rows: [] }
      callCount++
      return Promise.resolve(response)
    }),
    release: jest.fn(),
  }
  return client
}

describe('POST /api/checkout/reserve', () => {
  beforeEach(() => jest.clearAllMocks())

  it('returns 401 when no token provided', async () => {
    const res = await request(app).post('/api/checkout/reserve')

    expect(res.status).toBe(401)
  })

  it('returns 400 when cart is empty', async () => {
    pool.query.mockResolvedValueOnce({ rows: [] }) // cart is empty

    const res = await request(app)
      .post('/api/checkout/reserve')
      .set('Authorization', `Bearer ${userToken}`)

    expect(res.status).toBe(400)
    expect(res.body.error).toBe('Cart is empty')
  })

  it('returns 409 with unavailable items when stock is insufficient', async () => {
    pool.query.mockResolvedValueOnce({
      rows: [{ product_id: 1, quantity: 5, size: 'M' }],
    })

    const client = makeClient([
      { rows: [] }, // BEGIN
      { rows: [] }, // DELETE stale reservations
      { rows: [{ name: 'Widget', stock: 3 }] }, // SELECT product FOR UPDATE
      { rows: [{ reserved: '0' }] }, // SUM reserved by others
      { rows: [] }, // ROLLBACK
    ])
    pool.connect.mockResolvedValueOnce(client)

    const res = await request(app)
      .post('/api/checkout/reserve')
      .set('Authorization', `Bearer ${userToken}`)

    expect(res.status).toBe(409)
    expect(res.body.error).toBe('Some items are out of stock')
    expect(res.body.unavailable).toHaveLength(1)
    expect(res.body.unavailable[0].name).toBe('Widget')
    expect(res.body.unavailable[0].requested).toBe(5)
    expect(res.body.unavailable[0].available).toBe(3)
  })

  it('aggregates multiple sizes of the same product for stock check', async () => {
    pool.query.mockResolvedValueOnce({
      rows: [
        { product_id: 1, quantity: 5, size: 'S' },
        { product_id: 1, quantity: 5, size: 'M' },
      ],
    })

    const client = makeClient([
      { rows: [] }, // BEGIN
      { rows: [] }, // DELETE stale reservations
      { rows: [{ name: 'Widget', stock: 8 }] }, // SELECT product FOR UPDATE (only 8 available)
      { rows: [{ reserved: '0' }] }, // SUM reserved by others
      { rows: [] }, // ROLLBACK
    ])
    pool.connect.mockResolvedValueOnce(client)

    const res = await request(app)
      .post('/api/checkout/reserve')
      .set('Authorization', `Bearer ${userToken}`)

    expect(res.status).toBe(409)
    expect(res.body.error).toBe('Some items are out of stock')
    expect(res.body.unavailable[0].requested).toBe(10) // 5 + 5
    expect(res.body.unavailable[0].available).toBe(8)
  })

  it('returns 409 with available=0 when stock is fully reserved by others', async () => {
    pool.query.mockResolvedValueOnce({
      rows: [{ product_id: 1, quantity: 2, size: 'S' }],
    })

    const client = makeClient([
      { rows: [] }, // BEGIN
      { rows: [] }, // DELETE stale reservations
      { rows: [{ name: 'Widget', stock: 5 }] }, // SELECT product FOR UPDATE
      { rows: [{ reserved: '5' }] }, // SUM reserved by others (fully reserved)
      { rows: [] }, // ROLLBACK
    ])
    pool.connect.mockResolvedValueOnce(client)

    const res = await request(app)
      .post('/api/checkout/reserve')
      .set('Authorization', `Bearer ${userToken}`)

    expect(res.status).toBe(409)
    expect(res.body.unavailable[0].available).toBe(0)
  })

  it('returns 409 with available=0 when reserved by others exceeds stock', async () => {
    pool.query.mockResolvedValueOnce({
      rows: [{ product_id: 1, quantity: 1, size: 'L' }],
    })

    const client = makeClient([
      { rows: [] }, // BEGIN
      { rows: [] }, // DELETE stale reservations
      { rows: [{ name: 'Widget', stock: 5 }] }, // SELECT product FOR UPDATE
      { rows: [{ reserved: '7' }] }, // reserved > stock
      { rows: [] }, // ROLLBACK
    ])
    pool.connect.mockResolvedValueOnce(client)

    const res = await request(app)
      .post('/api/checkout/reserve')
      .set('Authorization', `Bearer ${userToken}`)

    expect(res.status).toBe(409)
    expect(res.body.unavailable[0].available).toBe(0)
  })

  it('returns { expires_at } on success and upserts reservations', async () => {
    pool.query.mockResolvedValueOnce({
      rows: [{ product_id: 1, quantity: 2, size: 'M' }],
    })

    const client = makeClient([
      { rows: [] }, // BEGIN
      { rows: [] }, // DELETE stale reservations
      { rows: [{ name: 'Widget', stock: 10 }] }, // SELECT product FOR UPDATE
      { rows: [{ reserved: '0' }] }, // SUM reserved by others
      { rows: [] }, // UPSERT reservation
      { rows: [] }, // COMMIT
    ])
    pool.connect.mockResolvedValueOnce(client)

    const res = await request(app)
      .post('/api/checkout/reserve')
      .set('Authorization', `Bearer ${userToken}`)

    expect(res.status).toBe(200)
    expect(res.body).toHaveProperty('expires_at')
    expect(new Date(res.body.expires_at).getTime()).toBeGreaterThan(Date.now())
  })

  it('returns 409 with product name "Unknown" when product not found during reserve', async () => {
    pool.query.mockResolvedValueOnce({
      rows: [{ product_id: 999, quantity: 1, size: '' }],
    })

    const client = makeClient([
      { rows: [] }, // BEGIN
      { rows: [] }, // DELETE stale reservations
      { rows: [] }, // SELECT product FOR UPDATE — not found
      { rows: [] }, // ROLLBACK
    ])
    pool.connect.mockResolvedValueOnce(client)

    const res = await request(app)
      .post('/api/checkout/reserve')
      .set('Authorization', `Bearer ${userToken}`)

    expect(res.status).toBe(409)
    expect(res.body.unavailable[0].name).toBe('Unknown')
    expect(res.body.unavailable[0].available).toBe(0)
  })

  it('returns 500 on database error', async () => {
    pool.query.mockRejectedValueOnce(new Error('db error'))

    const res = await request(app)
      .post('/api/checkout/reserve')
      .set('Authorization', `Bearer ${userToken}`)

    expect(res.status).toBe(500)
  })
})

describe('DELETE /api/checkout/reserve', () => {
  beforeEach(() => jest.clearAllMocks())

  it('returns 401 when no token provided', async () => {
    const res = await request(app).delete('/api/checkout/reserve')

    expect(res.status).toBe(401)
  })

  it('deletes reservations for user and returns message', async () => {
    pool.query.mockResolvedValueOnce({ rows: [] })

    const res = await request(app)
      .delete('/api/checkout/reserve')
      .set('Authorization', `Bearer ${userToken}`)

    expect(res.status).toBe(200)
    expect(res.body.message).toBe('Reservation released')
  })

  it('returns 500 on database error', async () => {
    pool.query.mockRejectedValueOnce(new Error('db error'))

    const res = await request(app)
      .delete('/api/checkout/reserve')
      .set('Authorization', `Bearer ${userToken}`)

    expect(res.status).toBe(500)
  })
})

describe('POST /api/checkout/confirm', () => {
  beforeEach(() => jest.clearAllMocks())

  it('returns 401 when no token provided', async () => {
    const res = await request(app).post('/api/checkout/confirm')

    expect(res.status).toBe(401)
  })

  it('returns 409 when reservation is expired or missing', async () => {
    pool.query.mockResolvedValueOnce({ rows: [] }) // no valid reservations

    const res = await request(app)
      .post('/api/checkout/confirm')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ address: '123 Main St' })

    expect(res.status).toBe(409)
    expect(res.body.error).toContain('Reservation expired')
  })

  it('returns { order_id } on success and clears cart and reservations', async () => {
    pool.query.mockResolvedValueOnce({
      // reservations joined with products (single source of truth)
      rows: [
        {
          product_id: 1,
          quantity: 2,
          size: 'M',
          name: 'Widget',
          price: '9.99',
          effective_price: '9.99',
        },
      ],
    })

    const client = makeClient([
      { rows: [] }, // BEGIN
      { rows: [{ id: 1 }] }, // SELECT products FOR UPDATE (lock)
      { rows: [{ id: 1 }], rowCount: 1 }, // UPDATE products stock (conditional)
      { rows: [{ id: 55 }] }, // INSERT order RETURNING id
      { rows: [] }, // INSERT order_items
      { rows: [] }, // DELETE cart_items
      { rows: [] }, // DELETE stock_reservations
      { rows: [] }, // COMMIT
    ])
    pool.connect.mockResolvedValueOnce(client)

    const res = await request(app)
      .post('/api/checkout/confirm')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ address: '123 Main St' })

    expect(res.status).toBe(200)
    expect(res.body).toHaveProperty('order_id')
    expect(res.body.order_id).toBe(55)
    expect(queueInvoiceRequest).toHaveBeenCalledWith({
      invoice_number: expect.stringMatching(/^INV-\d{4}-\d{6}$/),
      order_id: '55',
      customer_name: 'User',
      customer_email: 'user@example.com',
      customer_address: '123 Main St',
      items: [{ description: 'Widget', quantity: 2, unit_price: 9.99 }],
    })
  })

  it('accepts confirm without address', async () => {
    pool.query.mockResolvedValueOnce({
      rows: [
        {
          product_id: 1,
          quantity: 1,
          size: '',
          name: 'Widget',
          price: '5.00',
          effective_price: '5.00',
        },
      ],
    })

    const client = makeClient([
      { rows: [] }, // BEGIN
      { rows: [{ id: 1 }] }, // SELECT products FOR UPDATE
      { rows: [{ id: 1 }], rowCount: 1 }, // UPDATE products stock
      { rows: [{ id: 99 }] }, // INSERT order
      { rows: [] }, // INSERT order_items
      { rows: [] }, // DELETE cart_items
      { rows: [] }, // DELETE stock_reservations
      { rows: [] }, // COMMIT
    ])
    pool.connect.mockResolvedValueOnce(client)

    const res = await request(app)
      .post('/api/checkout/confirm')
      .set('Authorization', `Bearer ${userToken}`)
      .send({})

    expect(res.status).toBe(200)
    expect(res.body.order_id).toBe(99)
  })

  it('uses effective_price (discounted) for order total and order_items, not base price', async () => {
    // Product base price $20.00, 20% discount → effective_price $16.00
    pool.query.mockResolvedValueOnce({
      rows: [
        {
          product_id: 1,
          quantity: 2,
          size: 'S',
          name: 'Widget',
          price: '20.00',
          effective_price: '16.00',
        },
      ],
    })

    const client = makeClient([
      { rows: [] }, // BEGIN
      { rows: [{ id: 1 }] }, // SELECT products FOR UPDATE
      { rows: [{ id: 1 }], rowCount: 1 }, // UPDATE products stock
      { rows: [{ id: 77 }] }, // INSERT order RETURNING id
      { rows: [] }, // INSERT order_items
      { rows: [] }, // DELETE cart_items
      { rows: [] }, // DELETE stock_reservations
      { rows: [] }, // COMMIT
    ])
    pool.connect.mockResolvedValueOnce(client)

    const res = await request(app)
      .post('/api/checkout/confirm')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ address: '123 Main St' })

    expect(res.status).toBe(200)

    // Verify order_items INSERT used effective_price ('16.00'), not base price ('20.00')
    const orderItemsInsert = client.query.mock.calls.find(
      (call) => typeof call[0] === 'string' && call[0].includes('INSERT INTO order_items')
    )
    expect(orderItemsInsert).toBeDefined()
    expect(orderItemsInsert[1][3]).toBe('16.00') // price param = effective_price

    // Verify order total = 2 × 16.00 = 32.00
    const orderInsert = client.query.mock.calls.find(
      (call) => typeof call[0] === 'string' && call[0].includes('INSERT INTO orders')
    )
    expect(orderInsert).toBeDefined()
    expect(orderInsert[1][1]).toBe('32.00') // total param
  })

  it('returns 409 when product stock dropped below reserved quantity between reserve and confirm', async () => {
    pool.query.mockResolvedValueOnce({
      rows: [
        {
          product_id: 1,
          quantity: 2,
          size: 'M',
          name: 'Widget',
          price: '9.99',
          effective_price: '9.99',
        },
      ],
    })

    const client = makeClient([
      { rows: [] }, // BEGIN
      { rows: [{ id: 1 }] }, // SELECT products FOR UPDATE
      { rows: [], rowCount: 0 }, // UPDATE products stock — no row matched (stock < quantity)
      { rows: [] }, // ROLLBACK
    ])
    pool.connect.mockResolvedValueOnce(client)

    const res = await request(app)
      .post('/api/checkout/confirm')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ address: '123 Main St' })

    expect(res.status).toBe(409)
    expect(res.body.error).toContain('Insufficient stock')
    expect(res.body.productId).toBe(1)

    // Order must not have been created
    const orderInsert = client.query.mock.calls.find(
      (call) => typeof call[0] === 'string' && call[0].includes('INSERT INTO orders')
    )
    expect(orderInsert).toBeUndefined()
  })

  it('returns 500 on database error', async () => {
    pool.query.mockRejectedValueOnce(new Error('db error'))

    const res = await request(app)
      .post('/api/checkout/confirm')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ address: '123 Main St' })

    expect(res.status).toBe(500)
  })
})
