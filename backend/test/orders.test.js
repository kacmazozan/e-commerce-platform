const request = require('supertest')

jest.mock('../db', () => ({
  query: jest.fn(),
  connect: jest.fn(),
}))

const pool = require('../db')

process.env.JWT_SECRET = 'test-secret'

const app = require('../app')

const jwt = require('jsonwebtoken')
const userToken = jwt.sign(
  { userId: 1, email: 'test@example.com', role: 'customer' },
  'test-secret'
)

describe('GET /api/orders', () => {
  beforeEach(() => jest.clearAllMocks())

  it('returns 401 when no token provided', async () => {
    const res = await request(app).get('/api/orders')

    expect(res.status).toBe(401)
  })

  it('returns empty orders array when user has no orders', async () => {
    pool.query.mockResolvedValueOnce({ rows: [] })

    const res = await request(app).get('/api/orders').set('Authorization', `Bearer ${userToken}`)

    expect(res.status).toBe(200)
    expect(res.body).toEqual({ orders: [] })
  })

  it('returns orders with items merged in', async () => {
    pool.query
      .mockResolvedValueOnce({
        rows: [
          {
            id: 10,
            status: 'pending',
            total: '59.99',
            address: '123 Main St',
            created_at: new Date('2024-01-01'),
          },
          {
            id: 11,
            status: 'delivered',
            total: '29.99',
            address: '456 Oak Ave',
            created_at: new Date('2024-01-02'),
          },
        ],
      })
      .mockResolvedValueOnce({
        rows: [
          {
            order_id: 10,
            quantity: 2,
            price: '19.99',
            size: 'M',
            product_id: 1,
            product_name: 'Widget',
          },
          {
            order_id: 11,
            quantity: 1,
            price: '29.99',
            size: null,
            product_id: 2,
            product_name: 'Gadget',
          },
        ],
      })

    const res = await request(app).get('/api/orders').set('Authorization', `Bearer ${userToken}`)

    expect(res.status).toBe(200)
    expect(res.body.orders).toHaveLength(2)

    const order10 = res.body.orders.find((o) => o.id === 10)
    expect(order10.status).toBe('pending')
    expect(order10.items).toHaveLength(1)
    expect(order10.items[0].product_name).toBe('Widget')
    expect(order10.items[0].quantity).toBe(2)

    const order11 = res.body.orders.find((o) => o.id === 11)
    expect(order11.status).toBe('delivered')
    expect(order11.items).toHaveLength(1)
    expect(order11.items[0].product_name).toBe('Gadget')
  })

  it('groups items correctly by order_id', async () => {
    pool.query
      .mockResolvedValueOnce({
        rows: [
          {
            id: 20,
            status: 'processing',
            total: '100.00',
            address: '789 Pine Rd',
            created_at: new Date('2024-02-01'),
          },
        ],
      })
      .mockResolvedValueOnce({
        rows: [
          {
            order_id: 20,
            quantity: 1,
            price: '50.00',
            size: 'L',
            product_id: 3,
            product_name: 'Shirt',
          },
          {
            order_id: 20,
            quantity: 2,
            price: '25.00',
            size: 'S',
            product_id: 4,
            product_name: 'Hat',
          },
        ],
      })

    const res = await request(app).get('/api/orders').set('Authorization', `Bearer ${userToken}`)

    expect(res.status).toBe(200)
    expect(res.body.orders).toHaveLength(1)

    const order = res.body.orders[0]
    expect(order.id).toBe(20)
    expect(order.items).toHaveLength(2)
    expect(order.items[0].product_name).toBe('Shirt')
    expect(order.items[1].product_name).toBe('Hat')
  })

  it('returns 500 on database error', async () => {
    pool.query.mockRejectedValueOnce(new Error('db error'))

    const res = await request(app).get('/api/orders').set('Authorization', `Bearer ${userToken}`)

    expect(res.status).toBe(500)
  })
})

describe('GET /api/orders/:id', () => {
  beforeEach(() => jest.clearAllMocks())

  it('returns 401 when no token provided', async () => {
    const res = await request(app).get('/api/orders/10')

    expect(res.status).toBe(401)
  })

  it('returns 400 for an invalid order ID', async () => {
    const res = await request(app)
      .get('/api/orders/abc')
      .set('Authorization', `Bearer ${userToken}`)

    expect(res.status).toBe(400)
    expect(res.body.error).toBe('Invalid order ID')
  })

  it('returns 404 when order does not exist or belongs to another user', async () => {
    pool.query.mockResolvedValueOnce({ rows: [] })

    const res = await request(app)
      .get('/api/orders/999')
      .set('Authorization', `Bearer ${userToken}`)

    expect(res.status).toBe(404)
    expect(res.body.error).toBe('Order not found')
  })

  it('returns order detail with items and decrypted address', async () => {
    pool.query
      .mockResolvedValueOnce({
        rows: [
          {
            id: 10,
            status: 'processing',
            total: '59.99',
            shipping_cost: '4.99',
            address: '123 Main St',
            created_at: new Date('2024-01-01'),
            payment_method_id: null,
          },
        ],
      })
      .mockResolvedValueOnce({
        rows: [
          {
            id: 1,
            order_id: 10,
            quantity: 2,
            price: '19.99',
            size: 'M',
            product_id: 1,
            product_name: 'Widget',
            refund_id: null,
            refund_status: null,
            refund_amount: null,
            requested_at: null,
          },
        ],
      })

    const res = await request(app).get('/api/orders/10').set('Authorization', `Bearer ${userToken}`)

    expect(res.status).toBe(200)
    expect(res.body.order.id).toBe(10)
    expect(res.body.order.address).toBe('123 Main St')
    expect(res.body.order.shipping_cost).toBe('4.99')
    expect(res.body.order.items).toHaveLength(1)
    expect(res.body.order.items[0].product_name).toBe('Widget')
  })

  it('returns 500 on database error', async () => {
    pool.query.mockRejectedValueOnce(new Error('db error'))

    const res = await request(app).get('/api/orders/10').set('Authorization', `Bearer ${userToken}`)

    expect(res.status).toBe(500)
  })
})

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

describe('PATCH /api/orders/:id/cancel', () => {
  beforeEach(() => jest.clearAllMocks())

  it('returns 401 when no token provided', async () => {
    const res = await request(app).patch('/api/orders/1/cancel')

    expect(res.status).toBe(401)
  })

  it('returns 404 when order does not exist or belongs to another user', async () => {
    pool.query.mockResolvedValueOnce({ rows: [] }) // order not found

    const res = await request(app)
      .patch('/api/orders/999/cancel')
      .set('Authorization', `Bearer ${userToken}`)

    expect(res.status).toBe(404)
    expect(res.body.error).toBe('Order not found')
  })

  it('returns 409 when order status is shipped', async () => {
    pool.query.mockResolvedValueOnce({ rows: [{ id: 1, status: 'shipped' }] })

    const res = await request(app)
      .patch('/api/orders/1/cancel')
      .set('Authorization', `Bearer ${userToken}`)

    expect(res.status).toBe(409)
    expect(res.body.error).toBe('Order cannot be cancelled once it is in transit.')
  })

  it('returns 409 when order status is delivered', async () => {
    pool.query.mockResolvedValueOnce({ rows: [{ id: 1, status: 'delivered' }] })

    const res = await request(app)
      .patch('/api/orders/1/cancel')
      .set('Authorization', `Bearer ${userToken}`)

    expect(res.status).toBe(409)
    expect(res.body.error).toBe('Order cannot be cancelled once it is in transit.')
  })

  it('returns 409 when order status is already cancelled', async () => {
    pool.query.mockResolvedValueOnce({ rows: [{ id: 1, status: 'cancelled' }] })

    const res = await request(app)
      .patch('/api/orders/1/cancel')
      .set('Authorization', `Bearer ${userToken}`)

    expect(res.status).toBe(409)
    expect(res.body.error).toBe('Order cannot be cancelled once it is in transit.')
  })

  it('successfully cancels a pending order: restores stock and returns success message', async () => {
    pool.query
      .mockResolvedValueOnce({ rows: [{ id: 10, status: 'pending' }] }) // order lookup
      .mockResolvedValueOnce({
        rows: [
          { product_id: 1, quantity: 2 },
          { product_id: 2, quantity: 1 },
        ],
      }) // order items

    const client = makeClient([
      { rows: [] }, // BEGIN
      { rows: [] }, // UPDATE products stock (item 1)
      { rows: [] }, // UPDATE products stock (item 2)
      { rows: [] }, // UPDATE orders SET status = 'cancelled'
      { rows: [] }, // COMMIT
    ])
    pool.connect.mockResolvedValueOnce(client)

    const res = await request(app)
      .patch('/api/orders/10/cancel')
      .set('Authorization', `Bearer ${userToken}`)

    expect(res.status).toBe(200)
    expect(res.body.message).toBe('Order cancelled successfully')
  })

  it('successfully cancels a processing order', async () => {
    pool.query
      .mockResolvedValueOnce({ rows: [{ id: 20, status: 'processing' }] }) // order lookup
      .mockResolvedValueOnce({ rows: [{ product_id: 3, quantity: 5 }] }) // order items

    const client = makeClient([
      { rows: [] }, // BEGIN
      { rows: [] }, // UPDATE products stock
      { rows: [] }, // UPDATE orders SET status = 'cancelled'
      { rows: [] }, // COMMIT
    ])
    pool.connect.mockResolvedValueOnce(client)

    const res = await request(app)
      .patch('/api/orders/20/cancel')
      .set('Authorization', `Bearer ${userToken}`)

    expect(res.status).toBe(200)
    expect(res.body.message).toBe('Order cancelled successfully')
  })
})
