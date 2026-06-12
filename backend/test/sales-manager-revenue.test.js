const request = require('supertest')
const jwt = require('jsonwebtoken')

jest.mock('../db', () => ({ query: jest.fn() }))
const pool = require('../db')

process.env.JWT_SECRET = 'test-secret'
const app = require('../app')

const smToken = jwt.sign({ userId: 1, email: 'sm@test.com', role: 'sales_manager' }, 'test-secret')
const customerToken = jwt.sign({ userId: 2, email: 'c@test.com', role: 'customer' }, 'test-secret')

const SUMMARY_ROW = {
  total_revenue: '500.00',
  total_cost: '300.00',
  net_profit_loss: '200.00',
  missing_cost_products: '0',
}

const DAILY_ROWS = [
  { date: '2026-04-10', revenue: '250.00', cost: '150.00', profit_loss: '100.00' },
  { date: '2026-04-11', revenue: '250.00', cost: '150.00', profit_loss: '100.00' },
]

beforeEach(() => {
  jest.clearAllMocks()
})

describe('GET /api/sales-manager/revenue', () => {
  it('returns 401 without a token', async () => {
    const res = await request(app).get('/api/sales-manager/revenue')
    expect(res.status).toBe(401)
  })

  it('returns 403 for a customer token', async () => {
    const res = await request(app)
      .get('/api/sales-manager/revenue')
      .set('Authorization', `Bearer ${customerToken}`)
    expect(res.status).toBe(403)
  })

  it('returns 400 for an invalid date format', async () => {
    const res = await request(app)
      .get('/api/sales-manager/revenue?startDate=bad&endDate=2026-04-30')
      .set('Authorization', `Bearer ${smToken}`)
    expect(res.status).toBe(400)
    expect(res.body.error).toMatch(/YYYY-MM-DD/)
  })

  it('returns 400 when startDate is after endDate', async () => {
    const res = await request(app)
      .get('/api/sales-manager/revenue?startDate=2026-04-30&endDate=2026-04-01')
      .set('Authorization', `Bearer ${smToken}`)
    expect(res.status).toBe(400)
    expect(res.body.error).toMatch(/before/)
  })

  it('returns 200 with summary and daily for a valid date range', async () => {
    pool.query
      .mockResolvedValueOnce({ rows: [SUMMARY_ROW] })
      .mockResolvedValueOnce({ rows: DAILY_ROWS })

    const res = await request(app)
      .get('/api/sales-manager/revenue?startDate=2026-04-01&endDate=2026-04-30')
      .set('Authorization', `Bearer ${smToken}`)

    expect(res.status).toBe(200)
    expect(res.body).toHaveProperty('summary')
    expect(res.body).toHaveProperty('daily')
    expect(res.body.summary.total_revenue).toBe('500.00')
    expect(res.body.daily).toHaveLength(2)
  })

  it('defaults to the current month when no dates are provided', async () => {
    pool.query.mockResolvedValueOnce({ rows: [SUMMARY_ROW] }).mockResolvedValueOnce({ rows: [] })

    const res = await request(app)
      .get('/api/sales-manager/revenue')
      .set('Authorization', `Bearer ${smToken}`)

    expect(res.status).toBe(200)
    // Both queries should have been called with ISO date strings
    expect(pool.query).toHaveBeenCalledTimes(2)
    const [, [start]] = pool.query.mock.calls[0]
    expect(start).toMatch(/^\d{4}-\d{2}-01T/)
  })

  it('net_profit_loss equals total_revenue minus total_cost', async () => {
    const row = {
      total_revenue: '1000.00',
      total_cost: '600.00',
      net_profit_loss: '400.00',
      missing_cost_products: '0',
    }
    pool.query.mockResolvedValueOnce({ rows: [row] }).mockResolvedValueOnce({ rows: [] })

    const res = await request(app)
      .get('/api/sales-manager/revenue?startDate=2026-04-01&endDate=2026-04-30')
      .set('Authorization', `Bearer ${smToken}`)

    expect(res.status).toBe(200)
    const { total_revenue, total_cost, net_profit_loss } = res.body.summary
    expect(parseFloat(net_profit_loss)).toBeCloseTo(
      parseFloat(total_revenue) - parseFloat(total_cost),
      2
    )
  })

  it('reports missing_cost_products count when some products lack cost data', async () => {
    const row = { ...SUMMARY_ROW, missing_cost_products: '3' }
    pool.query.mockResolvedValueOnce({ rows: [row] }).mockResolvedValueOnce({ rows: DAILY_ROWS })

    const res = await request(app)
      .get('/api/sales-manager/revenue?startDate=2026-04-01&endDate=2026-04-30')
      .set('Authorization', `Bearer ${smToken}`)

    expect(res.status).toBe(200)
    expect(res.body.summary.missing_cost_products).toBe('3')
  })

  it('returns empty daily array when there are no orders', async () => {
    const emptyRow = {
      total_revenue: '0',
      total_cost: '0',
      net_profit_loss: '0',
      missing_cost_products: '0',
    }
    pool.query.mockResolvedValueOnce({ rows: [emptyRow] }).mockResolvedValueOnce({ rows: [] })

    const res = await request(app)
      .get('/api/sales-manager/revenue?startDate=2026-04-01&endDate=2026-04-30')
      .set('Authorization', `Bearer ${smToken}`)

    expect(res.status).toBe(200)
    expect(res.body.daily).toHaveLength(0)
    expect(parseFloat(res.body.summary.total_revenue)).toBe(0)
  })
})
