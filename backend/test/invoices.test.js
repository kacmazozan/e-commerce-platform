const request = require('supertest')

jest.mock('../services/invoice-workflow', () => ({
  queueInvoiceRequest: jest.fn(),
}))

const { queueInvoiceRequest } = require('../services/invoice-workflow')
const app = require('../app')

describe('GET /api/invoices/health', () => {
  beforeEach(() => jest.clearAllMocks())

  it('returns healthy status', async () => {
    const response = await request(app).get('/api/invoices/health')

    expect(response.status).toBe(200)
    expect(response.body).toEqual({ status: 'healthy' })
  })
})

describe('POST /api/invoices/generate', () => {
  beforeEach(() => jest.clearAllMocks())

  it('accepts valid data and starts invoice processing', async () => {
    const payload = {
      invoice_number: 'TEST-001',
      order_id: 'ORD-123',
      customer_name: 'Test User',
      customer_email: 'test@example.com',
      customer_address: '123 Test St, Test City',
      items: [{ description: 'Premium Service', quantity: 1, unit_price: 499.99 }],
    }

    const response = await request(app).post('/api/invoices/generate').send(payload)

    expect(response.status).toBe(200)
    expect(response.body.message).toBe('Invoice generation started')
    expect(response.body.invoice_number).toBe('TEST-001')
    expect(queueInvoiceRequest).toHaveBeenCalledTimes(1)
    expect(queueInvoiceRequest).toHaveBeenCalledWith(payload)
  })

  it('rejects invalid email addresses', async () => {
    const invalidPayload = {
      invoice_number: 'INV-ERR',
      order_id: 'ORD-ERR',
      customer_name: 'Bad Email',
      customer_email: 'not-a-valid-email',
      customer_address: 'Nowhere',
      items: [],
    }

    const response = await request(app).post('/api/invoices/generate').send(invalidPayload)

    expect(response.status).toBe(422)
    expect(response.body.detail).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          loc: ['body', 'customer_email'],
        }),
      ])
    )
    expect(queueInvoiceRequest).not.toHaveBeenCalled()
  })
})
