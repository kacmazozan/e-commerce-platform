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
const adminToken = jwt.sign({ userId: 3, email: 'a@test.com', role: 'admin' }, 'test-secret')
const productManagerToken = jwt.sign(
  { userId: 4, email: 'pm@test.com', role: 'product_manager' },
  'test-secret'
)

describe('GET /api/sales-manager/products', () => {
  beforeEach(() => jest.clearAllMocks())

  it('returns 401 with no token', async () => {
    const res = await request(app).get('/api/sales-manager/products')
    expect(res.status).toBe(401)
  })

  it('returns 403 with customer token', async () => {
    const res = await request(app)
      .get('/api/sales-manager/products')
      .set('Authorization', `Bearer ${customerToken}`)
    expect(res.status).toBe(403)
  })

  it('returns 403 with admin token', async () => {
    const res = await request(app)
      .get('/api/sales-manager/products')
      .set('Authorization', `Bearer ${adminToken}`)
    expect(res.status).toBe(403)
  })

  it('returns 403 with product manager token', async () => {
    const res = await request(app)
      .get('/api/sales-manager/products')
      .set('Authorization', `Bearer ${productManagerToken}`)
    expect(res.status).toBe(403)
  })

  it('returns product list with pagination for sales manager', async () => {
    pool.query.mockResolvedValueOnce({ rows: [{ count: '2' }] }).mockResolvedValueOnce({
      rows: [
        { id: 1, name: 'Widget', category: 'Electronics', price: '19.99', stock: 5 },
        { id: 2, name: 'Gadget', category: 'Electronics', price: '49.99', stock: 10 },
      ],
    })

    const res = await request(app)
      .get('/api/sales-manager/products')
      .set('Authorization', `Bearer ${smToken}`)

    expect(res.status).toBe(200)
    expect(res.body).toHaveProperty('products')
    expect(res.body.products).toHaveLength(2)
    expect(res.body).toHaveProperty('pagination')
    expect(res.body.pagination.total).toBe(2)
  })
})

describe('PATCH /api/sales-manager/products/:id/price', () => {
  beforeEach(() => jest.clearAllMocks())

  it('returns 401 with no token', async () => {
    const res = await request(app)
      .patch('/api/sales-manager/products/1/price')
      .send({ price: 29.99 })
    expect(res.status).toBe(401)
  })

  it('returns 403 with customer token', async () => {
    const res = await request(app)
      .patch('/api/sales-manager/products/1/price')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({ price: 29.99 })
    expect(res.status).toBe(403)
  })

  it('returns 403 with product manager token', async () => {
    const res = await request(app)
      .patch('/api/sales-manager/products/1/price')
      .set('Authorization', `Bearer ${productManagerToken}`)
      .send({ price: 29.99 })
    expect(res.status).toBe(403)
  })

  it('returns 400 when price is zero', async () => {
    const res = await request(app)
      .patch('/api/sales-manager/products/1/price')
      .set('Authorization', `Bearer ${smToken}`)
      .send({ price: 0 })
    expect(res.status).toBe(400)
    expect(res.body.error).toMatch(/positive/i)
  })

  it('returns 400 when price is negative', async () => {
    const res = await request(app)
      .patch('/api/sales-manager/products/1/price')
      .set('Authorization', `Bearer ${smToken}`)
      .send({ price: -5 })
    expect(res.status).toBe(400)
    expect(res.body.error).toMatch(/positive/i)
  })

  it('returns 400 when price is missing', async () => {
    const res = await request(app)
      .patch('/api/sales-manager/products/1/price')
      .set('Authorization', `Bearer ${smToken}`)
      .send({})
    expect(res.status).toBe(400)
    expect(res.body.error).toMatch(/required/i)
  })

  it('returns 404 when product does not exist', async () => {
    pool.query.mockResolvedValueOnce({ rows: [] })

    const res = await request(app)
      .patch('/api/sales-manager/products/999/price')
      .set('Authorization', `Bearer ${smToken}`)
      .send({ price: 29.99 })
    expect(res.status).toBe(404)
    expect(res.body.error).toMatch(/not found/i)
  })

  it('updates price and returns the product on success', async () => {
    pool.query.mockResolvedValueOnce({ rows: [{ id: 1 }] }).mockResolvedValueOnce({
      rows: [
        {
          id: 1,
          name: 'Widget',
          category: 'Electronics',
          price: '29.99',
          stock: 5,
          updated_at: new Date(),
        },
      ],
    })

    const res = await request(app)
      .patch('/api/sales-manager/products/1/price')
      .set('Authorization', `Bearer ${smToken}`)
      .send({ price: 29.99 })

    expect(res.status).toBe(200)
    expect(res.body).toHaveProperty('product')
    expect(res.body.product.price).toBe('29.99')
  })
})
