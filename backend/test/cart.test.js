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

const cartRows = [{ id: 1, name: 'Widget', price: '9.99', quantity: 2 }]

describe('GET /api/cart', () => {
  beforeEach(() => jest.clearAllMocks())

  it('returns 401 when no token provided', async () => {
    const res = await request(app).get('/api/cart')

    expect(res.status).toBe(401)
  })

  it('returns items for authenticated user', async () => {
    pool.query.mockResolvedValueOnce({ rows: cartRows })

    const res = await request(app).get('/api/cart').set('Authorization', `Bearer ${userToken}`)

    expect(res.status).toBe(200)
    expect(res.body).toHaveProperty('items')
    expect(res.body.items).toHaveLength(1)
    expect(res.body.items[0].name).toBe('Widget')
  })

  it('returns empty items array when cart is empty', async () => {
    pool.query.mockResolvedValueOnce({ rows: [] })

    const res = await request(app).get('/api/cart').set('Authorization', `Bearer ${userToken}`)

    expect(res.status).toBe(200)
    expect(res.body.items).toEqual([])
  })

  it('returns 500 on database error', async () => {
    pool.query.mockRejectedValueOnce(new Error('db error'))

    const res = await request(app).get('/api/cart').set('Authorization', `Bearer ${userToken}`)

    expect(res.status).toBe(500)
  })
})

describe('POST /api/cart', () => {
  beforeEach(() => jest.clearAllMocks())

  it('returns 401 when no token provided', async () => {
    const res = await request(app).post('/api/cart').send({ productId: 1 })

    expect(res.status).toBe(401)
  })

  it('returns 400 when productId is missing', async () => {
    const res = await request(app)
      .post('/api/cart')
      .set('Authorization', `Bearer ${userToken}`)
      .send({})

    expect(res.status).toBe(400)
    expect(res.body.error).toBe('productId is required')
  })

  it('returns 400 when quantity is not a positive integer', async () => {
    const res = await request(app)
      .post('/api/cart')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ productId: 1, quantity: 0 })

    expect(res.status).toBe(400)
    expect(res.body.error).toBe('quantity must be a positive integer')
  })

  it('returns 404 when product does not exist', async () => {
    pool.query.mockResolvedValueOnce({ rows: [] })

    const res = await request(app)
      .post('/api/cart')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ productId: 999 })

    expect(res.status).toBe(404)
    expect(res.body.error).toBe('Product not found')
  })

  it('adds item and returns updated cart', async () => {
    pool.query
      .mockResolvedValueOnce({ rows: [{ id: 1 }] }) // product exists
      .mockResolvedValueOnce({ rows: [] }) // upsert
      .mockResolvedValueOnce({ rows: cartRows }) // fetchCart

    const res = await request(app)
      .post('/api/cart')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ productId: 1, quantity: 2 })

    expect(res.status).toBe(200)
    expect(res.body).toHaveProperty('items')
    expect(res.body.items).toHaveLength(1)
  })

  it('returns 500 on database error', async () => {
    pool.query.mockRejectedValueOnce(new Error('db error'))

    const res = await request(app)
      .post('/api/cart')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ productId: 1 })

    expect(res.status).toBe(500)
  })
})

describe('PUT /api/cart/:productId', () => {
  beforeEach(() => jest.clearAllMocks())

  it('returns 401 when no token provided', async () => {
    const res = await request(app).put('/api/cart/1').send({ quantity: 3 })

    expect(res.status).toBe(401)
  })

  it('returns 400 when quantity is invalid', async () => {
    const res = await request(app)
      .put('/api/cart/1')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ quantity: -1 })

    expect(res.status).toBe(400)
    expect(res.body.error).toBe('quantity must be a positive integer')
  })

  it('updates quantity and returns updated cart', async () => {
    pool.query
      .mockResolvedValueOnce({ rows: [] }) // UPDATE
      .mockResolvedValueOnce({ rows: cartRows }) // fetchCart

    const res = await request(app)
      .put('/api/cart/1')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ quantity: 3 })

    expect(res.status).toBe(200)
    expect(res.body).toHaveProperty('items')
  })

  it('returns 500 on database error', async () => {
    pool.query.mockRejectedValueOnce(new Error('db error'))

    const res = await request(app)
      .put('/api/cart/1')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ quantity: 2 })

    expect(res.status).toBe(500)
  })
})

describe('DELETE /api/cart/:productId', () => {
  beforeEach(() => jest.clearAllMocks())

  it('returns 401 when no token provided', async () => {
    const res = await request(app).delete('/api/cart/1')

    expect(res.status).toBe(401)
  })

  it('removes item and returns updated cart', async () => {
    pool.query
      .mockResolvedValueOnce({ rows: [] }) // DELETE
      .mockResolvedValueOnce({ rows: [] }) // fetchCart (now empty)

    const res = await request(app).delete('/api/cart/1').set('Authorization', `Bearer ${userToken}`)

    expect(res.status).toBe(200)
    expect(res.body.items).toEqual([])
  })

  it('returns 500 on database error', async () => {
    pool.query.mockRejectedValueOnce(new Error('db error'))

    const res = await request(app).delete('/api/cart/1').set('Authorization', `Bearer ${userToken}`)

    expect(res.status).toBe(500)
  })
})
