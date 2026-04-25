const request = require('supertest')

// Mock the database pool before importing the app
jest.mock('../db', () => ({
  query: jest.fn(),
  connect: jest.fn(),
}))

const pool = require('../db')

process.env.JWT_SECRET = 'test-secret'

const app = require('../app')

describe('POST /api/auth/register', () => {
  beforeEach(() => jest.clearAllMocks())

  it('returns 400 when email or password is missing', async () => {
    const res = await request(app).post('/api/auth/register').send({ email: 'test@example.com' })

    expect(res.status).toBe(400)
    expect(res.body.error).toBe('Email and password are required')
  })

  it('returns 409 when email is already in use', async () => {
    pool.query.mockResolvedValueOnce({ rows: [{ id: 1 }] })

    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: 'existing@example.com', password: 'password123' })

    expect(res.status).toBe(409)
    expect(res.body.error).toBe('Email already in use')
  })

  it('returns 201 with a token on successful registration', async () => {
    const mockClient = { query: jest.fn(), release: jest.fn() }
    pool.connect.mockResolvedValueOnce(mockClient)
    pool.query.mockResolvedValueOnce({ rows: [] }) // no existing user
    mockClient.query
      .mockResolvedValueOnce(undefined) // BEGIN
      .mockResolvedValueOnce({ rows: [{ id: 1, email: 'new@example.com', role: 'customer' }] }) // INSERT users
      .mockResolvedValueOnce(undefined) // INSERT customers
      .mockResolvedValueOnce(undefined) // COMMIT

    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: 'new@example.com', password: 'password123' })

    expect(res.status).toBe(201)
    expect(res.body).toHaveProperty('token')
    expect(mockClient.release).toHaveBeenCalled()
  })
})

describe('POST /api/auth/login', () => {
  beforeEach(() => jest.clearAllMocks())

  it('returns 400 when email or password is missing', async () => {
    const res = await request(app).post('/api/auth/login').send({ email: 'test@example.com' })

    expect(res.status).toBe(400)
    expect(res.body.error).toBe('Email and password are required')
  })

  it('returns 401 when user does not exist', async () => {
    pool.query.mockResolvedValueOnce({ rows: [] })

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'nobody@example.com', password: 'password123' })

    expect(res.status).toBe(401)
    expect(res.body.error).toBe('Invalid credentials')
  })

  it('returns 401 when password is incorrect', async () => {
    const bcrypt = require('bcrypt')
    const hash = await bcrypt.hash('correctpassword', 10)

    pool.query.mockResolvedValueOnce({
      rows: [{ id: 1, email: 'user@example.com', password_hash: hash, role: 'customer' }],
    })

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'user@example.com', password: 'wrongpassword' })

    expect(res.status).toBe(401)
    expect(res.body.error).toBe('Invalid credentials')
  })

  it('returns 200 with a token on successful login', async () => {
    const bcrypt = require('bcrypt')
    const hash = await bcrypt.hash('password123', 10)

    pool.query.mockResolvedValueOnce({
      rows: [{ id: 1, email: 'user@example.com', password_hash: hash, role: 'customer' }],
    })

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'user@example.com', password: 'password123' })

    expect(res.status).toBe(200)
    expect(res.body).toHaveProperty('token')
  })
})
