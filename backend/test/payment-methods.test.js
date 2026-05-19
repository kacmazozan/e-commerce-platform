const request = require('supertest')
const jwt = require('jsonwebtoken')

jest.mock('../db', () => ({
  query: jest.fn(),
  connect: jest.fn(),
}))

const pool = require('../db')

process.env.JWT_SECRET = 'test-secret'
process.env.DATA_ENCRYPTION_KEY = Buffer.alloc(32, 7).toString('base64')

const { encryptField } = require('../services/secure-fields')
const app = require('../app')

const userToken = jwt.sign(
  { userId: 7, email: 'user@example.com', role: 'customer' },
  'test-secret'
)
const managerToken = jwt.sign(
  { userId: 8, email: 'manager@example.com', role: 'product_manager' },
  'test-secret'
)

function makePaymentMethodRow(overrides = {}) {
  return {
    id: 10,
    user_id: 7,
    brand: 'VISA',
    last4: '4242',
    cardholder_name_enc: encryptField('Jane Smith'),
    card_number_enc: encryptField('4242424242424242'),
    expiry_month_enc: encryptField('12'),
    expiry_year_enc: encryptField('2040'),
    fingerprint_hash: 'f'.repeat(64),
    is_default: true,
    created_at: '2026-05-19T10:00:00.000Z',
    updated_at: '2026-05-19T10:00:00.000Z',
    ...overrides,
  }
}

function makeClient(queryResponses = []) {
  let callCount = 0
  const client = {
    query: jest.fn().mockImplementation(() => {
      const response = queryResponses[callCount] ?? { rows: [] }
      callCount++
      return Promise.resolve(response)
    }),
    release: jest.fn(),
  }
  return client
}

describe('/api/payment-methods', () => {
  beforeEach(() => jest.clearAllMocks())

  it('requires a customer session', async () => {
    const noToken = await request(app).get('/api/payment-methods')
    expect(noToken.status).toBe(401)

    const wrongRole = await request(app)
      .get('/api/payment-methods')
      .set('Authorization', `Bearer ${managerToken}`)

    expect(wrongRole.status).toBe(403)
  })

  it('lists saved cards with decrypted display metadata only', async () => {
    pool.query.mockResolvedValueOnce({ rows: [makePaymentMethodRow()] })

    const res = await request(app)
      .get('/api/payment-methods')
      .set('Authorization', `Bearer ${userToken}`)

    expect(res.status).toBe(200)
    expect(res.body.paymentMethods).toEqual([
      expect.objectContaining({
        id: 10,
        brand: 'VISA',
        last4: '4242',
        cardholderName: 'Jane Smith',
        expiry: '12/40',
        isDefault: true,
      }),
    ])
    expect(res.body.paymentMethods[0]).not.toHaveProperty('cardNumber')
  })

  it('rejects invalid card numbers before writing', async () => {
    const res = await request(app)
      .post('/api/payment-methods')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        cardholderName: 'Jane Smith',
        cardNumber: '4242 4242 4242 4241',
        expiry: '12/40',
      })

    expect(res.status).toBe(400)
    expect(res.body.error).toBe('Card number is invalid')
    expect(pool.connect).not.toHaveBeenCalled()
  })

  it('stores card data encrypted and returns a masked saved card', async () => {
    const client = makeClient([
      { rows: [] }, // BEGIN
      { rows: [] }, // duplicate check
      { rows: [{ count: 0 }] }, // count existing
      { rows: [] }, // clear defaults
      { rows: [makePaymentMethodRow()] }, // INSERT returning
      { rows: [] }, // COMMIT
    ])
    pool.connect.mockResolvedValueOnce(client)

    const res = await request(app)
      .post('/api/payment-methods')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        cardholderName: 'Jane Smith',
        cardNumber: '4242 4242 4242 4242',
        expiry: '12/40',
      })

    expect(res.status).toBe(201)
    expect(res.body.paymentMethod).toMatchObject({
      brand: 'VISA',
      last4: '4242',
      cardholderName: 'Jane Smith',
      expiry: '12/40',
      isDefault: true,
    })

    const insertCall = client.query.mock.calls.find(
      (call) =>
        typeof call[0] === 'string' && call[0].includes('INSERT INTO customer_payment_methods')
    )
    expect(insertCall).toBeDefined()
    expect(insertCall[1][3]).toMatch(/^enc:v1:/)
    expect(insertCall[1][4]).toMatch(/^enc:v1:/)
    expect(insertCall[1][4]).not.toContain('4242424242424242')
  })

  it('returns 409 for an already saved card', async () => {
    const client = makeClient([
      { rows: [] }, // BEGIN
      { rows: [{ id: 10 }] }, // duplicate check
      { rows: [] }, // ROLLBACK
    ])
    pool.connect.mockResolvedValueOnce(client)

    const res = await request(app)
      .post('/api/payment-methods')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        cardholderName: 'Jane Smith',
        cardNumber: '4242 4242 4242 4242',
        expiry: '12/40',
      })

    expect(res.status).toBe(409)
    expect(res.body.error).toBe('This card is already saved')
  })

  it('can make a saved card the default', async () => {
    const client = makeClient([
      { rows: [] }, // BEGIN
      { rows: [{ id: 10 }] }, // ownership check
      { rows: [] }, // clear defaults
      { rows: [makePaymentMethodRow({ is_default: true })] }, // set default
      { rows: [] }, // COMMIT
    ])
    pool.connect.mockResolvedValueOnce(client)

    const res = await request(app)
      .patch('/api/payment-methods/10/default')
      .set('Authorization', `Bearer ${userToken}`)

    expect(res.status).toBe(200)
    expect(res.body.paymentMethod.isDefault).toBe(true)
  })

  it('deletes a saved card owned by the user', async () => {
    const client = makeClient([
      { rows: [] }, // BEGIN
      { rows: [{ is_default: false }] }, // DELETE returning
      { rows: [] }, // COMMIT
    ])
    pool.connect.mockResolvedValueOnce(client)

    const res = await request(app)
      .delete('/api/payment-methods/10')
      .set('Authorization', `Bearer ${userToken}`)

    expect(res.status).toBe(200)
    expect(res.body.message).toBe('Payment method deleted')
  })
})
