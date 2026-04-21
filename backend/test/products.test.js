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

  it('returns null discount_percent and discounted_price when no active discount', async () => {
    pool.query.mockResolvedValueOnce({
      rows: [
        {
          id: 1,
          name: 'Widget',
          description: 'A widget',
          price: '19.99',
          stock: 10,
          category: 'Electronics',
          created_at: new Date(),
          available_stock: '10',
          discount_percent: null,
          discounted_price: null,
        },
      ],
    })

    const res = await request(app).get('/api/products')

    expect(res.status).toBe(200)
    expect(res.body.products[0].discount_percent).toBeNull()
    expect(res.body.products[0].discounted_price).toBeNull()
  })

  it('returns discount_percent and discounted_price when active discount is present', async () => {
    pool.query.mockResolvedValueOnce({
      rows: [
        {
          id: 1,
          name: 'Widget',
          description: 'A widget',
          price: '20.00',
          stock: 10,
          category: 'Electronics',
          created_at: new Date(),
          available_stock: '10',
          discount_percent: 25,
          discounted_price: '15.00',
        },
      ],
    })

    const res = await request(app).get('/api/products')

    expect(res.status).toBe(200)
    expect(res.body.products[0].discount_percent).toBe(25)
    expect(res.body.products[0].discounted_price).toBe('15.00')
  })

  it('includes discount_percent and discounted_price columns in the SQL query', async () => {
    pool.query.mockResolvedValueOnce({ rows: [] })

    await request(app).get('/api/products')

    const [sql] = pool.query.mock.calls[0]
    expect(sql).toContain('discount_percent')
    expect(sql).toContain('discounted_price')
  })

  it('JOINs product_discounts table in the SQL query', async () => {
    pool.query.mockResolvedValueOnce({ rows: [] })

    await request(app).get('/api/products')

    const [sql] = pool.query.mock.calls[0]
    expect(sql).toContain('product_discounts')
  })

  it('does NOT include image_url in the SQL query', async () => {
    pool.query.mockResolvedValueOnce({ rows: [] })

    await request(app).get('/api/products')

    const [sql] = pool.query.mock.calls[0]
    expect(sql).not.toContain('image_url')
  })
})

// ─── GET /api/products/:id ────────────────────────────────────────────────────

describe('GET /api/products/:id', () => {
  beforeEach(() => jest.clearAllMocks())

  it('returns 400 for non-numeric id', async () => {
    const res = await request(app).get('/api/products/abc')
    expect(res.status).toBe(400)
    expect(res.body).toHaveProperty('error')
  })

  it('returns 400 for id of 0', async () => {
    const res = await request(app).get('/api/products/0')
    expect(res.status).toBe(400)
    expect(res.body).toHaveProperty('error')
  })

  it('returns 400 for negative id', async () => {
    const res = await request(app).get('/api/products/-1')
    expect(res.status).toBe(400)
    expect(res.body).toHaveProperty('error')
  })

  it('returns 404 when product not found', async () => {
    pool.query.mockResolvedValueOnce({ rows: [] })

    const res = await request(app).get('/api/products/999')
    expect(res.status).toBe(404)
    expect(res.body).toHaveProperty('error')
  })

  it('returns 200 with product and images when found', async () => {
    pool.query
      .mockResolvedValueOnce({
        rows: [
          {
            id: 1,
            name: 'Merino Sweater',
            description: 'Soft wool',
            price: '89.99',
            stock: 20,
            category: "Women's Clothing",
            created_at: new Date(),
            country_of_origin: 'Turkey',
            material: 'Merino Wool',
            model_height: '175cm',
            model_chest: '88cm',
            model_waist: '68cm',
            model_hips: '94cm',
            model_size: 'S',
            sizes: ['XS', 'S', 'M', 'L'],
            available_stock: '20',
            discount_percent: null,
            discounted_price: null,
          },
        ],
      })
      .mockResolvedValueOnce({
        rows: [
          { id: 10, url: 'https://example.com/img1.jpg', alt: 'Front', position: 0 },
          { id: 11, url: 'https://example.com/img2.jpg', alt: 'Back', position: 1 },
        ],
      })

    const res = await request(app).get('/api/products/1')

    expect(res.status).toBe(200)
    expect(res.body).toHaveProperty('product')
    expect(res.body).toHaveProperty('images')
    expect(res.body.product.name).toBe('Merino Sweater')
    expect(res.body.images).toHaveLength(2)
  })

  it('returns product with all detail fields', async () => {
    pool.query
      .mockResolvedValueOnce({
        rows: [
          {
            id: 1,
            name: 'Merino Sweater',
            price: '89.99',
            stock: 20,
            category: "Women's Clothing",
            created_at: new Date(),
            country_of_origin: 'Turkey',
            material: 'Merino Wool',
            model_height: '175cm',
            model_chest: '88cm',
            model_waist: '68cm',
            model_hips: '94cm',
            model_size: 'S',
            sizes: ['XS', 'S', 'M', 'L'],
            available_stock: '20',
            discount_percent: null,
            discounted_price: null,
          },
        ],
      })
      .mockResolvedValueOnce({ rows: [] })

    const res = await request(app).get('/api/products/1')

    expect(res.status).toBe(200)
    const p = res.body.product
    expect(p.country_of_origin).toBe('Turkey')
    expect(p.material).toBe('Merino Wool')
    expect(p.model_height).toBe('175cm')
    expect(p.model_chest).toBe('88cm')
    expect(p.model_waist).toBe('68cm')
    expect(p.model_hips).toBe('94cm')
    expect(p.model_size).toBe('S')
    expect(p.sizes).toEqual(['XS', 'S', 'M', 'L'])
  })

  it('does NOT include image_url in the product SELECT SQL', async () => {
    pool.query
      .mockResolvedValueOnce({
        rows: [
          {
            id: 1,
            name: 'Widget',
            price: '9.99',
            stock: 10,
            category: 'Misc',
            created_at: new Date(),
            country_of_origin: null,
            material: null,
            model_height: null,
            model_chest: null,
            model_waist: null,
            model_hips: null,
            model_size: null,
            sizes: null,
            available_stock: '10',
            discount_percent: null,
            discounted_price: null,
          },
        ],
      })
      .mockResolvedValueOnce({ rows: [] })

    await request(app).get('/api/products/1')

    const [firstSql] = pool.query.mock.calls[0]
    expect(firstSql).not.toContain('image_url')
  })
})

// ─── GET /api/products/:id/reviews ───────────────────────────────────────────

describe('GET /api/products/:id/reviews', () => {
  beforeEach(() => jest.clearAllMocks())

  it('returns 400 for invalid id', async () => {
    const res = await request(app).get('/api/products/abc/reviews')
    expect(res.status).toBe(400)
    expect(res.body).toHaveProperty('error')
  })

  it('returns 200 with empty reviews array when no approved reviews', async () => {
    pool.query.mockResolvedValueOnce({ rows: [] })

    const res = await request(app).get('/api/products/1/reviews')

    expect(res.status).toBe(200)
    expect(res.body).toEqual({ reviews: [] })
  })

  it('returns 200 with approved reviews', async () => {
    pool.query.mockResolvedValueOnce({
      rows: [
        {
          id: 5,
          rating: 4,
          content: 'Great product!',
          created_at: new Date().toISOString(),
        },
        {
          id: 6,
          rating: 5,
          content: 'Love it.',
          created_at: new Date().toISOString(),
        },
      ],
    })

    const res = await request(app).get('/api/products/1/reviews')

    expect(res.status).toBe(200)
    expect(res.body.reviews).toHaveLength(2)
    expect(res.body.reviews[0]).toMatchObject({ id: 5, rating: 4, content: 'Great product!' })
  })
})

// ─── POST /api/products/:id/reviews ──────────────────────────────────────────

const jwt = require('jsonwebtoken')
const customerToken = jwt.sign(
  { userId: 10, email: 'customer@test.com', role: 'customer' },
  'test-secret'
)
const adminToken = jwt.sign({ userId: 1, email: 'admin@test.com', role: 'admin' }, 'test-secret')
const pmToken = jwt.sign(
  { userId: 2, email: 'pm@test.com', role: 'product_manager' },
  'test-secret'
)

describe('POST /api/products/:id/reviews', () => {
  beforeEach(() => jest.clearAllMocks())

  it('returns 401 with no token', async () => {
    const res = await request(app).post('/api/products/1/reviews').send({ rating: 4 })
    expect(res.status).toBe(401)
  })

  it('returns 403 when role is admin', async () => {
    const res = await request(app)
      .post('/api/products/1/reviews')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ rating: 4 })
    expect(res.status).toBe(403)
  })

  it('returns 403 when role is product_manager', async () => {
    const res = await request(app)
      .post('/api/products/1/reviews')
      .set('Authorization', `Bearer ${pmToken}`)
      .send({ rating: 4 })
    expect(res.status).toBe(403)
  })

  it('returns 400 when rating is missing', async () => {
    const res = await request(app)
      .post('/api/products/1/reviews')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({ content: 'Nice' })
    expect(res.status).toBe(400)
    expect(res.body).toHaveProperty('error')
  })

  it('returns 400 when rating is 0', async () => {
    const res = await request(app)
      .post('/api/products/1/reviews')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({ rating: 0 })
    expect(res.status).toBe(400)
  })

  it('returns 400 when rating is 6', async () => {
    const res = await request(app)
      .post('/api/products/1/reviews')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({ rating: 6 })
    expect(res.status).toBe(400)
  })

  it('returns 400 when rating is non-integer string', async () => {
    const res = await request(app)
      .post('/api/products/1/reviews')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({ rating: 'bad' })
    expect(res.status).toBe(400)
  })

  it('returns 404 when product does not exist', async () => {
    pool.query.mockResolvedValueOnce({ rows: [] })

    const res = await request(app)
      .post('/api/products/999/reviews')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({ rating: 4 })

    expect(res.status).toBe(404)
  })

  it('returns 409 when user has already reviewed', async () => {
    pool.query
      .mockResolvedValueOnce({ rows: [{ id: 999 }] })
      .mockResolvedValueOnce({ rows: [{ id: 7 }] })

    const res = await request(app)
      .post('/api/products/999/reviews')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({ rating: 4 })

    expect(res.status).toBe(409)
  })

  it('returns 201 with review on success', async () => {
    pool.query
      .mockResolvedValueOnce({ rows: [{ id: 1 }] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({
        rows: [
          {
            id: 42,
            rating: 4,
            content: 'Great!',
            status: 'pending',
            created_at: new Date().toISOString(),
          },
        ],
      })

    const res = await request(app)
      .post('/api/products/1/reviews')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({ rating: 4, content: 'Great!' })

    expect(res.status).toBe(201)
    expect(res.body).toHaveProperty('review')
    expect(res.body.review.rating).toBe(4)
    expect(res.body.review.status).toBe('pending')
  })
})
