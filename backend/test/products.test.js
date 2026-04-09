const request = require('supertest')

jest.mock('../db', () => ({
  query: jest.fn(),
  connect: jest.fn(),
}))

const pool = require('../db')

process.env.JWT_SECRET = 'test-secret'

const app = require('../app')

describe('GET /api/products', () => {
  beforeEach(() => jest.clearAllMocks())

  it('returns products array', async () => {
    pool.query.mockResolvedValueOnce({
      rows: [
        {
          id: 1,
          name: 'Widget',
          description: 'A widget',
          price: '19.99',
          stock: 10,
          category: 'Electronics',
          image_url: null,
          created_at: new Date(),
          available_stock: '10',
        },
      ],
    })

    const res = await request(app).get('/api/products')

    expect(res.status).toBe(200)
    expect(res.body).toHaveProperty('products')
    expect(res.body.products).toHaveLength(1)
    expect(res.body.products[0].name).toBe('Widget')
  })

  it('returns empty products array when no products exist', async () => {
    pool.query.mockResolvedValueOnce({ rows: [] })

    const res = await request(app).get('/api/products')

    expect(res.status).toBe(200)
    expect(res.body.products).toEqual([])
  })

  it('filters by category when ?category= is provided', async () => {
    pool.query.mockResolvedValueOnce({ rows: [] })

    const res = await request(app).get('/api/products?category=Electronics')

    expect(res.status).toBe(200)
    const [sql, params] = pool.query.mock.calls[0]
    expect(sql).toContain('p.category = $1')
    expect(params).toContain('Electronics')
  })

  it('applies default limit of 50 when no limit param given', async () => {
    pool.query.mockResolvedValueOnce({ rows: [] })

    await request(app).get('/api/products')

    const [, params] = pool.query.mock.calls[0]
    expect(params[params.length - 1]).toBe(50)
  })

  it('applies custom limit when ?limit= is provided', async () => {
    pool.query.mockResolvedValueOnce({ rows: [] })

    await request(app).get('/api/products?limit=10')

    const [, params] = pool.query.mock.calls[0]
    expect(params[params.length - 1]).toBe(10)
  })

  it('caps limit at 100 when limit exceeds maximum', async () => {
    pool.query.mockResolvedValueOnce({ rows: [] })

    await request(app).get('/api/products?limit=500')

    const [, params] = pool.query.mock.calls[0]
    expect(params[params.length - 1]).toBe(100)
  })

  it('reflects available_stock reduced by reservations', async () => {
    pool.query.mockResolvedValueOnce({
      rows: [
        {
          id: 1,
          name: 'Widget',
          description: '',
          price: '9.99',
          stock: 5,
          category: 'Misc',
          image_url: null,
          created_at: new Date(),
          available_stock: '2',
        },
      ],
    })

    const res = await request(app).get('/api/products')

    expect(res.status).toBe(200)
    expect(res.body.products[0].available_stock).toBe('2')
  })

  it('returns available_stock of 0 when fully reserved', async () => {
    pool.query.mockResolvedValueOnce({
      rows: [
        {
          id: 1,
          name: 'Widget',
          description: '',
          price: '9.99',
          stock: 5,
          category: 'Misc',
          image_url: null,
          created_at: new Date(),
          available_stock: '0',
        },
      ],
    })

    const res = await request(app).get('/api/products')

    expect(res.status).toBe(200)
    expect(res.body.products[0].available_stock).toBe('0')
  })

  it('returns available_stock of 0 not negative when over-reserved', async () => {
    pool.query.mockResolvedValueOnce({
      rows: [
        {
          id: 1,
          name: 'Widget',
          description: '',
          price: '9.99',
          stock: 5,
          category: 'Misc',
          image_url: null,
          created_at: new Date(),
          available_stock: '0',
        },
      ],
    })

    const res = await request(app).get('/api/products')

    expect(res.status).toBe(200)
    expect(parseInt(res.body.products[0].available_stock)).toBeGreaterThanOrEqual(0)
  })

  it('uses GREATEST(0, ...) in the SQL query to prevent negative available_stock', async () => {
    pool.query.mockResolvedValueOnce({ rows: [] })

    await request(app).get('/api/products')

    const [sql] = pool.query.mock.calls[0]
    expect(sql).toContain('GREATEST')
  })

  it('returns 500 on database error', async () => {
    pool.query.mockRejectedValueOnce(new Error('db error'))

    const res = await request(app).get('/api/products')

    expect(res.status).toBe(500)
  })
})
