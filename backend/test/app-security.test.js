const request = require('supertest')

process.env.JWT_SECRET = 'test-secret'
process.env.FRONTEND_URL = 'http://allowed.example'
process.env.CORS_ORIGINS = 'http://allowed.example,http://also-allowed.example'
process.env.JSON_BODY_LIMIT = '1kb'
process.env.SENSITIVE_RATE_LIMIT_WINDOW_MS = '60000'
process.env.SENSITIVE_RATE_LIMIT_MAX = '2'

jest.mock('../services/invoice-workflow', () => ({
  queueInvoiceRequest: jest.fn(),
}))

const app = require('../app')

describe('app security middleware', () => {
  it('sets security headers and hides Express implementation details', async () => {
    const res = await request(app).get('/api/invoices/health')

    expect(res.status).toBe(200)
    expect(res.headers['x-powered-by']).toBeUndefined()
    expect(res.headers['x-content-type-options']).toBe('nosniff')
    expect(res.headers['x-frame-options']).toBe('DENY')
    expect(res.headers['referrer-policy']).toBe('no-referrer')
    expect(res.headers['content-security-policy']).toContain("default-src 'none'")
  })

  it('allows only configured browser origins through CORS', async () => {
    const allowed = await request(app)
      .get('/api/invoices/health')
      .set('Origin', 'http://allowed.example')
    const denied = await request(app)
      .get('/api/invoices/health')
      .set('Origin', 'http://evil.example')

    expect(allowed.headers['access-control-allow-origin']).toBe('http://allowed.example')
    expect(denied.headers['access-control-allow-origin']).toBeUndefined()
  })

  it('rejects bodies over the configured JSON limit', async () => {
    const res = await request(app)
      .post('/api/invoices/generate')
      .send({ invoice_number: 'x'.repeat(2048) })

    expect(res.status).toBe(413)
    expect(res.body.error).toBe('Request body too large')
  })

  it('rate limits sensitive authentication endpoints', async () => {
    const first = await request(app).post('/api/auth/login').send({})
    const second = await request(app).post('/api/auth/login').send({})
    const third = await request(app).post('/api/auth/login').send({})

    expect(first.status).toBe(400)
    expect(second.status).toBe(400)
    expect(third.status).toBe(429)
    expect(third.body.error).toMatch(/Too many attempts/)
    expect(third.headers['retry-after']).toBeDefined()
  })
})
