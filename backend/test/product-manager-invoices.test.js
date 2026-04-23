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

const ORDER_CREATED_AT = '2026-04-15T10:30:00.000Z'

function mockOrderRow(overrides = {}) {
  return {
    id: 42,
    status: 'pending',
    total: '120.00',
    address: '123 Main St',
    created_at: ORDER_CREATED_AT,
    user_id: 7,
    user_email: 'jane.doe@example.com',
    ...overrides,
  }
}

// ─── GET /api/product-manager/invoices ───────────────────────────────────────

describe('GET /api/product-manager/invoices', () => {
  beforeEach(() => jest.clearAllMocks())

  it('returns 401 with no token', async () => {
    const res = await request(app).get('/api/product-manager/invoices')
    expect(res.status).toBe(401)
  })

  it('returns 403 with customer token', async () => {
    const res = await request(app)
      .get('/api/product-manager/invoices')
      .set('Authorization', `Bearer ${customerToken}`)
    expect(res.status).toBe(403)
  })

  it('returns 403 with admin token', async () => {
    const res = await request(app)
      .get('/api/product-manager/invoices')
      .set('Authorization', `Bearer ${adminToken}`)
    expect(res.status).toBe(403)
  })

  it('returns paginated invoices for product manager', async () => {
    pool.query
      .mockResolvedValueOnce({ rows: [{ count: '1' }] })
      .mockResolvedValueOnce({ rows: [mockOrderRow()] })

    const res = await request(app)
      .get('/api/product-manager/invoices')
      .set('Authorization', `Bearer ${pmToken}`)

    expect(res.status).toBe(200)
    expect(res.body.invoices).toHaveLength(1)
    expect(res.body.invoices[0]).toMatchObject({
      order_id: 42,
      invoice_number: 'INV-2026-000042',
      customer_email: 'jane.doe@example.com',
      customer_name: 'Jane Doe',
      status: 'pending',
    })
    expect(res.body.pagination).toEqual({ page: 1, limit: 10, total: 1, totalPages: 1 })
  })

  it('applies the status filter in the WHERE clause', async () => {
    pool.query.mockResolvedValueOnce({ rows: [{ count: '0' }] }).mockResolvedValueOnce({ rows: [] })

    await request(app)
      .get('/api/product-manager/invoices?status=delivered')
      .set('Authorization', `Bearer ${pmToken}`)

    const countCall = pool.query.mock.calls[0]
    expect(countCall[0]).toMatch(/o\.status = \$1::order_status/)
    expect(countCall[1]).toEqual(['delivered'])
  })

  it('ignores invalid status values', async () => {
    pool.query.mockResolvedValueOnce({ rows: [{ count: '0' }] }).mockResolvedValueOnce({ rows: [] })

    await request(app)
      .get('/api/product-manager/invoices?status=bogus')
      .set('Authorization', `Bearer ${pmToken}`)

    const countCall = pool.query.mock.calls[0]
    expect(countCall[0]).not.toMatch(/WHERE/)
  })
})

// ─── GET /api/product-manager/invoices/:orderId ──────────────────────────────

describe('GET /api/product-manager/invoices/:orderId', () => {
  beforeEach(() => jest.clearAllMocks())

  it('returns 404 when the order does not exist', async () => {
    pool.query.mockResolvedValueOnce({ rows: [] })

    const res = await request(app)
      .get('/api/product-manager/invoices/999')
      .set('Authorization', `Bearer ${pmToken}`)

    expect(res.status).toBe(404)
  })

  it('returns 400 for invalid order ID', async () => {
    const res = await request(app)
      .get('/api/product-manager/invoices/abc')
      .set('Authorization', `Bearer ${pmToken}`)

    expect(res.status).toBe(400)
  })

  it('returns invoice detail with buildInvoiceData totals', async () => {
    pool.query.mockResolvedValueOnce({ rows: [mockOrderRow()] }).mockResolvedValueOnce({
      rows: [
        { id: 1, quantity: 2, price: '50.00', product_id: 11, product_name: 'Widget' },
        { id: 2, quantity: 1, price: '20.00', product_id: 12, product_name: 'Gadget' },
      ],
    })

    const res = await request(app)
      .get('/api/product-manager/invoices/42')
      .set('Authorization', `Bearer ${pmToken}`)

    expect(res.status).toBe(200)
    expect(res.body.invoice).toMatchObject({
      number: 'INV-2026-000042',
      order_id: '42',
      customer_email: 'jane.doe@example.com',
      subtotal: 120,
      tax_rate: 0.2,
      tax_amount: 24,
      total: 144,
    })
    expect(res.body.invoice.items).toHaveLength(2)
    expect(res.body.order).toMatchObject({ id: 42, status: 'pending' })
  })
})

// ─── GET /api/product-manager/invoices/:orderId/pdf ──────────────────────────

describe('GET /api/product-manager/invoices/:orderId/pdf', () => {
  beforeEach(() => jest.clearAllMocks())

  it('returns 401 with no token', async () => {
    const res = await request(app).get('/api/product-manager/invoices/42/pdf')
    expect(res.status).toBe(401)
  })

  it('returns 404 when the order does not exist', async () => {
    pool.query.mockResolvedValueOnce({ rows: [] })

    const res = await request(app)
      .get('/api/product-manager/invoices/999/pdf')
      .set('Authorization', `Bearer ${pmToken}`)

    expect(res.status).toBe(404)
  })

  it('streams a PDF with the right content-type and filename', async () => {
    pool.query.mockResolvedValueOnce({ rows: [mockOrderRow()] }).mockResolvedValueOnce({
      rows: [{ id: 1, quantity: 1, price: '50.00', product_id: 11, product_name: 'Widget' }],
    })

    const res = await request(app)
      .get('/api/product-manager/invoices/42/pdf')
      .set('Authorization', `Bearer ${pmToken}`)
      .buffer(true)
      .parse((r, cb) => {
        const chunks = []
        r.on('data', (c) => chunks.push(c))
        r.on('end', () => cb(null, Buffer.concat(chunks)))
      })

    expect(res.status).toBe(200)
    expect(res.headers['content-type']).toMatch(/application\/pdf/)
    expect(res.headers['content-disposition']).toMatch(
      /attachment; filename="Invoice_INV-2026-000042\.pdf"/
    )
    expect(res.body.slice(0, 4).toString('latin1')).toBe('%PDF')
  })
})
