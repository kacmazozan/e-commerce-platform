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

const ORDER_CREATED_AT = '2026-04-15T10:30:00.000Z'

function mockOrderRow(overrides = {}) {
  return {
    id: 42,
    status: 'delivered',
    total: '100.00',
    address: '123 Main St',
    created_at: ORDER_CREATED_AT,
    user_id: 7,
    user_email: 'jane.doe@example.com',
    item_count: '2',
    ...overrides,
  }
}

// ─── GET /api/sales-manager/invoices ─────────────────────────────────────────

describe('GET /api/sales-manager/invoices', () => {
  beforeEach(() => jest.clearAllMocks())
  afterEach(() => jest.useRealTimers())

  it('returns 401 with no token', async () => {
    const res = await request(app).get('/api/sales-manager/invoices')
    expect(res.status).toBe(401)
  })

  it('returns 403 with customer token', async () => {
    const res = await request(app)
      .get('/api/sales-manager/invoices')
      .set('Authorization', `Bearer ${customerToken}`)
    expect(res.status).toBe(403)
  })

  it('returns 403 with admin token', async () => {
    const res = await request(app)
      .get('/api/sales-manager/invoices')
      .set('Authorization', `Bearer ${adminToken}`)
    expect(res.status).toBe(403)
  })

  it('returns paginated invoices with tax calculations for sales manager', async () => {
    pool.query
      .mockResolvedValueOnce({ rows: [{ count: '1' }] })
      .mockResolvedValueOnce({ rows: [mockOrderRow()] })

    const res = await request(app)
      .get('/api/sales-manager/invoices?startDate=2026-04-01&endDate=2026-04-30')
      .set('Authorization', `Bearer ${smToken}`)

    expect(res.status).toBe(200)
    expect(res.body.invoices).toHaveLength(1)
    expect(res.body.invoices[0]).toMatchObject({
      order_id: 42,
      invoice_number: 'INV-2026-000042',
      customer_name: 'Jane Doe',
      customer_email: 'jane.doe@example.com',
      item_count: 2,
      subtotal: 100,
      tax_rate: 0,
      tax_amount: 0,
      total: 100,
      status: 'delivered',
    })
    expect(res.body.pagination).toEqual({ page: 1, limit: 15, total: 1, totalPages: 1 })
  })

  it('returns 400 for invalid date format', async () => {
    const res = await request(app)
      .get('/api/sales-manager/invoices?startDate=not-a-date&endDate=2026-04-30')
      .set('Authorization', `Bearer ${smToken}`)
    expect(res.status).toBe(400)
    expect(res.body.error).toMatch(/YYYY-MM-DD/)
  })

  it('passes date range to WHERE clause', async () => {
    pool.query.mockResolvedValueOnce({ rows: [{ count: '0' }] }).mockResolvedValueOnce({ rows: [] })

    await request(app)
      .get('/api/sales-manager/invoices?startDate=2026-03-01&endDate=2026-03-31')
      .set('Authorization', `Bearer ${smToken}`)

    const countCall = pool.query.mock.calls[0]
    expect(countCall[0]).toMatch(/created_at >= \$1/)
    expect(countCall[0]).toMatch(/created_at < \$2/)
    expect(countCall[1][0]).toBe(new Date('2026-03-01').toISOString())
    // endDate is advanced by 1 day to include the full day
    expect(countCall[1][1]).toBe(new Date('2026-04-01').toISOString())
  })

  it('defaults to current month when no date params are given', async () => {
    const fakeNow = new Date('2026-04-15T12:00:00.000Z')
    jest.useFakeTimers({ now: fakeNow })

    pool.query.mockResolvedValueOnce({ rows: [{ count: '0' }] }).mockResolvedValueOnce({ rows: [] })

    await request(app).get('/api/sales-manager/invoices').set('Authorization', `Bearer ${smToken}`)

    const countCall = pool.query.mock.calls[0]
    expect(countCall[1][0]).toBe(new Date(Date.UTC(2026, 3, 1)).toISOString())
    // endDate default is today (2026-04-15), advanced by 1 day to include full day
    expect(countCall[1][1]).toBe(new Date(Date.UTC(2026, 3, 16)).toISOString())
  })
})

// ─── GET /api/sales-manager/invoices/:orderId ─────────────────────────────────

describe('GET /api/sales-manager/invoices/:orderId', () => {
  beforeEach(() => jest.clearAllMocks())

  it('returns 400 for non-numeric order ID', async () => {
    const res = await request(app)
      .get('/api/sales-manager/invoices/abc')
      .set('Authorization', `Bearer ${smToken}`)
    expect(res.status).toBe(400)
  })

  it('returns 404 when order does not exist', async () => {
    pool.query.mockResolvedValueOnce({ rows: [] })

    const res = await request(app)
      .get('/api/sales-manager/invoices/999')
      .set('Authorization', `Bearer ${smToken}`)
    expect(res.status).toBe(404)
  })

  it('returns full invoice detail with line items', async () => {
    pool.query.mockResolvedValueOnce({ rows: [mockOrderRow()] }).mockResolvedValueOnce({
      rows: [
        { id: 1, quantity: 2, price: '40.00', product_id: 11, product_name: 'Widget' },
        { id: 2, quantity: 1, price: '20.00', product_id: 12, product_name: 'Gadget' },
      ],
    })

    const res = await request(app)
      .get('/api/sales-manager/invoices/42')
      .set('Authorization', `Bearer ${smToken}`)

    expect(res.status).toBe(200)
    expect(res.body.invoice).toMatchObject({
      number: 'INV-2026-000042',
      customer_email: 'jane.doe@example.com',
      subtotal: 100,
      tax_rate: 0,
      tax_amount: 0,
      total: 100,
    })
    expect(res.body.invoice.items).toHaveLength(2)
    expect(res.body.order).toMatchObject({ id: 42, status: 'delivered' })
  })
})

// ─── GET /api/sales-manager/invoices/:orderId/pdf ─────────────────────────────

describe('GET /api/sales-manager/invoices/:orderId/pdf', () => {
  beforeEach(() => jest.clearAllMocks())

  it('returns 401 with no token', async () => {
    const res = await request(app).get('/api/sales-manager/invoices/42/pdf')
    expect(res.status).toBe(401)
  })

  it('returns 403 with wrong role', async () => {
    const res = await request(app)
      .get('/api/sales-manager/invoices/42/pdf')
      .set('Authorization', `Bearer ${customerToken}`)
    expect(res.status).toBe(403)
  })

  it('returns 404 when order does not exist', async () => {
    pool.query.mockResolvedValueOnce({ rows: [] })

    const res = await request(app)
      .get('/api/sales-manager/invoices/999/pdf')
      .set('Authorization', `Bearer ${smToken}`)
    expect(res.status).toBe(404)
  })

  it('streams PDF with correct content-type and filename', async () => {
    pool.query.mockResolvedValueOnce({ rows: [mockOrderRow()] }).mockResolvedValueOnce({
      rows: [{ id: 1, quantity: 1, price: '100.00', product_id: 11, product_name: 'Widget' }],
    })

    const res = await request(app)
      .get('/api/sales-manager/invoices/42/pdf')
      .set('Authorization', `Bearer ${smToken}`)
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

// ─── GET /api/sales-manager/invoices/export/pdf ───────────────────────────────

describe('GET /api/sales-manager/invoices/export/pdf', () => {
  beforeEach(() => jest.clearAllMocks())

  it('returns 401 with no token', async () => {
    const res = await request(app).get(
      '/api/sales-manager/invoices/export/pdf?startDate=2026-04-01&endDate=2026-04-30'
    )
    expect(res.status).toBe(401)
  })

  it('returns 403 with wrong role', async () => {
    const res = await request(app)
      .get('/api/sales-manager/invoices/export/pdf?startDate=2026-04-01&endDate=2026-04-30')
      .set('Authorization', `Bearer ${customerToken}`)
    expect(res.status).toBe(403)
  })

  it('returns 400 for invalid date format', async () => {
    const res = await request(app)
      .get('/api/sales-manager/invoices/export/pdf?startDate=bad&endDate=2026-04-30')
      .set('Authorization', `Bearer ${smToken}`)
    expect(res.status).toBe(400)
  })

  it('streams a summary PDF for the date range', async () => {
    // First query: orders list; second query: all items batched (order_id field required)
    pool.query
      .mockResolvedValueOnce({ rows: [mockOrderRow({ item_count: undefined })] })
      .mockResolvedValueOnce({
        rows: [{ order_id: 42, quantity: 1, price: '100.00', product_name: 'Widget' }],
      })

    const res = await request(app)
      .get('/api/sales-manager/invoices/export/pdf?startDate=2026-04-01&endDate=2026-04-30')
      .set('Authorization', `Bearer ${smToken}`)
      .buffer(true)
      .parse((r, cb) => {
        const chunks = []
        r.on('data', (c) => chunks.push(c))
        r.on('end', () => cb(null, Buffer.concat(chunks)))
      })

    expect(res.status).toBe(200)
    expect(res.headers['content-type']).toMatch(/application\/pdf/)
    expect(res.headers['content-disposition']).toMatch(/attachment; filename="Invoices_.*\.pdf"/)
    expect(res.body.slice(0, 4).toString('latin1')).toBe('%PDF')
  })
})
