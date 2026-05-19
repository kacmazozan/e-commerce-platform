jest.mock('../db', () => ({ query: jest.fn() }))

const pool = require('../db')
process.env.JWT_SECRET = 'test-secret'
const app = require('../app')
const request = require('supertest')

describe('GET /api/products/search', () => {
  beforeEach(() => jest.clearAllMocks())

  const mockProduct = (overrides = {}) => ({
    id: 1,
    name: 'Laptop Pro',
    description: 'A powerful laptop for professionals.',
    price: '1299.99',
    stock: 10,
    category: 'Computers',
    created_at: new Date().toISOString(),
    available_stock: 10,
    discount_percent: null,
    discounted_price: null,
    ...overrides,
  })

  it('returns products matching the name (partial, case-insensitive)', async () => {
    pool.query.mockResolvedValueOnce({ rows: [mockProduct()] })

    const res = await request(app).get('/api/products/search?q=lap')

    expect(res.status).toBe(200)
    expect(res.body).toHaveProperty('products')
    expect(res.body.products).toHaveLength(1)
    expect(res.body.products[0].name).toBe('Laptop Pro')

    const [sql, params] = pool.query.mock.calls[0]
    expect(sql).toMatch(/ILIKE/i)
    expect(params[0]).toBe('%lap%')
  })

  it('returns products matching the description', async () => {
    pool.query.mockResolvedValueOnce({ rows: [mockProduct()] })

    const res = await request(app).get('/api/products/search?q=powerful')

    expect(res.status).toBe(200)
    expect(res.body.products).toHaveLength(1)

    const [, params] = pool.query.mock.calls[0]
    expect(params[0]).toBe('%powerful%')
  })

  it('returns all products when q is empty', async () => {
    pool.query.mockResolvedValueOnce({ rows: [mockProduct()] })

    const res = await request(app).get('/api/products/search?q=')

    expect(res.status).toBe(200)
    expect(res.body.products).toHaveLength(1)
    expect(pool.query).toHaveBeenCalled()

    // No ILIKE clause and no LIMIT when q is empty and no explicit limit given
    const [sql] = pool.query.mock.calls[0]
    expect(sql).not.toMatch(/ILIKE/)
    expect(sql).not.toMatch(/LIMIT/)
  })

  it('respects explicit limit when q is empty', async () => {
    pool.query.mockResolvedValueOnce({ rows: [] })

    await request(app).get('/api/products/search?q=&limit=10')

    const [sql, params] = pool.query.mock.calls[0]
    expect(sql).toMatch(/LIMIT/)
    expect(params[params.length - 1]).toBe(10)
  })

  it('returns all products when q is whitespace', async () => {
    pool.query.mockResolvedValueOnce({ rows: [mockProduct()] })

    const res = await request(app).get('/api/products/search?q=   ')

    expect(res.status).toBe(200)
    expect(res.body.products).toHaveLength(1)
    expect(pool.query).toHaveBeenCalled()
  })

  it('returns empty array without hitting DB for single-character query', async () => {
    const res = await request(app).get('/api/products/search?q=a')

    expect(res.status).toBe(200)
    expect(res.body).toEqual({ products: [] })
    expect(pool.query).not.toHaveBeenCalled()
  })

  it('returns empty array when no products match', async () => {
    pool.query.mockResolvedValueOnce({ rows: [] })

    const res = await request(app).get('/api/products/search?q=zzznomatch')

    expect(res.status).toBe(200)
    expect(res.body.products).toHaveLength(0)
  })

  it('includes out-of-stock products in results', async () => {
    pool.query.mockResolvedValueOnce({
      rows: [mockProduct({ stock: 0, available_stock: 0 })],
    })

    const res = await request(app).get('/api/products/search?q=laptop')

    expect(res.status).toBe(200)
    expect(res.body.products[0].available_stock).toBe(0)
  })

  it('returns discount fields when a discount is active', async () => {
    pool.query.mockResolvedValueOnce({
      rows: [mockProduct({ discount_percent: 20, discounted_price: '1039.99' })],
    })

    const res = await request(app).get('/api/products/search?q=laptop')

    expect(res.status).toBe(200)
    expect(res.body.products[0].discount_percent).toBe(20)
    expect(res.body.products[0].discounted_price).toBe('1039.99')
  })

  it('includes public product property columns in the SQL query', async () => {
    pool.query.mockResolvedValueOnce({ rows: [] })

    await request(app).get('/api/products/search?q=laptop')

    const [sql] = pool.query.mock.calls[0]
    expect(sql).toContain('p.model')
    expect(sql).toContain('p.serial_number')
    expect(sql).toContain('p.warranty_status')
    expect(sql).toContain('p.distributor_info')
  })

  it('respects the limit query parameter', async () => {
    pool.query.mockResolvedValueOnce({ rows: [] })

    await request(app).get('/api/products/search?q=laptop&limit=5')

    const [, params] = pool.query.mock.calls[0]
    expect(params[1]).toBe(5)
  })

  it('caps limit at 100', async () => {
    pool.query.mockResolvedValueOnce({ rows: [] })

    await request(app).get('/api/products/search?q=laptop&limit=500')

    const [, params] = pool.query.mock.calls[0]
    expect(params[1]).toBe(100)
  })
})

// ─── GET /api/products/search — sort parameter ───────────────────────────────

describe('GET /api/products/search — sort parameter', () => {
  beforeEach(() => jest.clearAllMocks())

  it('defaults to newest when no sort param is given', async () => {
    pool.query.mockResolvedValueOnce({ rows: [] })

    await request(app).get('/api/products/search?q=laptop')

    const [sql] = pool.query.mock.calls[0]
    expect(sql).toContain('p.created_at DESC')
  })

  it('sorts by newest when ?sort=newest', async () => {
    pool.query.mockResolvedValueOnce({ rows: [] })

    await request(app).get('/api/products/search?q=laptop&sort=newest')

    const [sql] = pool.query.mock.calls[0]
    expect(sql).toContain('p.created_at DESC')
  })

  it('sorts by price ascending when ?sort=price_asc', async () => {
    pool.query.mockResolvedValueOnce({ rows: [] })

    await request(app).get('/api/products/search?q=laptop&sort=price_asc')

    const [sql] = pool.query.mock.calls[0]
    expect(sql).toContain('p.price ASC')
  })

  it('sorts by price descending when ?sort=price_desc', async () => {
    pool.query.mockResolvedValueOnce({ rows: [] })

    await request(app).get('/api/products/search?q=laptop&sort=price_desc')

    const [sql] = pool.query.mock.calls[0]
    expect(sql).toContain('p.price DESC')
  })

  it('sorts by popularity when ?sort=popularity', async () => {
    pool.query.mockResolvedValueOnce({ rows: [] })

    await request(app).get('/api/products/search?q=laptop&sort=popularity')

    const [sql] = pool.query.mock.calls[0]
    expect(sql).toContain('COALESCE(oi.units_sold, 0)')
    expect(sql).toContain('oi_agg')
  })

  it('falls back to newest when ?sort value is invalid', async () => {
    pool.query.mockResolvedValueOnce({ rows: [] })

    await request(app).get('/api/products/search?q=laptop&sort=bogus')

    const [sql] = pool.query.mock.calls[0]
    expect(sql).toContain('p.created_at DESC')
  })

  it('applies price_asc sort even when q is empty', async () => {
    pool.query.mockResolvedValueOnce({ rows: [] })

    await request(app).get('/api/products/search?sort=price_asc')

    const [sql] = pool.query.mock.calls[0]
    expect(sql).not.toMatch(/ILIKE/)
    expect(sql).toContain('p.price ASC')
  })

  it('includes stock-pin sentinel in SQL for price_asc sort', async () => {
    pool.query.mockResolvedValueOnce({ rows: [] })

    await request(app).get('/api/products/search?q=laptop&sort=price_asc')

    const [sql] = pool.query.mock.calls[0]
    expect(sql).toContain('CASE WHEN GREATEST')
  })

  it('includes oi_agg CTE in SQL for all sort values', async () => {
    pool.query.mockResolvedValueOnce({ rows: [] })

    await request(app).get('/api/products/search?q=laptop&sort=newest')

    const [sql] = pool.query.mock.calls[0]
    expect(sql).toContain('oi_agg')
  })
})
