const crypto = require('crypto')
const request = require('supertest')

// Mock the database pool before importing the app
jest.mock('../db', () => ({
  query: jest.fn(),
  connect: jest.fn(),
}))

jest.mock('../services/mailer', () => ({
  sendMail: jest.fn(),
}))

const pool = require('../db')
const { sendMail } = require('../services/mailer')

process.env.JWT_SECRET = 'test-secret'
process.env.FRONTEND_URL = 'http://localhost:5173'

const app = require('../app')

function sha256(value) {
  return crypto.createHash('sha256').update(value).digest('hex')
}

describe('POST /api/auth/register', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    sendMail.mockResolvedValue({ messageId: 'mail-1' })
  })

  it('returns 400 when email or password is missing', async () => {
    const res = await request(app).post('/api/auth/register').send({ email: 'test@example.com' })

    expect(res.status).toBe(400)
    expect(res.body.error).toBe('Email and password are required')
  })

  it('returns 400 when password is too short', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: 'test@example.com', password: 'short' })

    expect(res.status).toBe(400)
    expect(res.body.error).toBe('Password must be at least 8 characters')
  })

  it('returns 409 when email is already in use', async () => {
    pool.query.mockResolvedValueOnce({ rows: [{ id: 1 }] })

    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: 'existing@example.com', password: 'password123' })

    expect(res.status).toBe(409)
    expect(res.body.error).toBe('Email already in use')
  })

  it('returns 201 and sends verification email on successful registration', async () => {
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
      .send({ email: 'New@Example.com', password: 'password123', name: 'New User' })

    expect(res.status).toBe(201)
    expect(res.body).toEqual(
      expect.objectContaining({
        email: 'new@example.com',
        emailSent: true,
      })
    )
    expect(res.body).not.toHaveProperty('token')
    expect(sendMail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'new@example.com',
        subject: 'Verify your Fier account',
      })
    )
    expect(mockClient.release).toHaveBeenCalled()
  })
})

describe('POST /api/auth/login', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    sendMail.mockResolvedValue({ messageId: 'mail-1' })
  })

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
      rows: [
        {
          id: 1,
          email: 'user@example.com',
          password_hash: hash,
          role: 'customer',
          email_verified_at: new Date(),
        },
      ],
    })

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'user@example.com', password: 'wrongpassword' })

    expect(res.status).toBe(401)
    expect(res.body.error).toBe('Invalid credentials')
  })

  it('returns 403 and emails a new verification link for an unverified customer', async () => {
    const bcrypt = require('bcrypt')
    const hash = await bcrypt.hash('password123', 10)

    pool.query
      .mockResolvedValueOnce({
        rows: [
          {
            id: 1,
            email: 'user@example.com',
            password_hash: hash,
            role: 'customer',
            email_verified_at: null,
            email_verification_expires_at: new Date(Date.now() - 1000),
          },
        ],
      })
      .mockResolvedValueOnce({ rows: [] }) // store verification token

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'user@example.com', password: 'password123' })

    expect(res.status).toBe(403)
    expect(res.body.code).toBe('EMAIL_NOT_VERIFIED')
    expect(sendMail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'user@example.com',
        subject: 'Verify your Fier account',
      })
    )
  })

  it('does not replace an active verification link during login', async () => {
    const bcrypt = require('bcrypt')
    const hash = await bcrypt.hash('password123', 10)

    pool.query.mockResolvedValueOnce({
      rows: [
        {
          id: 1,
          email: 'user@example.com',
          password_hash: hash,
          role: 'customer',
          email_verified_at: null,
          email_verification_expires_at: new Date(Date.now() + 60 * 60 * 1000),
        },
      ],
    })

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'user@example.com', password: 'password123' })

    expect(res.status).toBe(403)
    expect(res.body.code).toBe('EMAIL_NOT_VERIFIED')
    expect(sendMail).not.toHaveBeenCalled()
    expect(pool.query).toHaveBeenCalledTimes(1)
  })

  it('returns 200 with a token on successful login', async () => {
    const bcrypt = require('bcrypt')
    const hash = await bcrypt.hash('password123', 10)

    pool.query.mockResolvedValueOnce({
      rows: [
        {
          id: 1,
          email: 'user@example.com',
          password_hash: hash,
          role: 'customer',
          email_verified_at: new Date(),
        },
      ],
    })

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'USER@example.com', password: 'password123' })

    expect(res.status).toBe(200)
    expect(res.body).toHaveProperty('token')
  })
})

describe('POST /api/auth/verify-email', () => {
  beforeEach(() => jest.clearAllMocks())

  it('returns 400 when token is missing', async () => {
    const res = await request(app).post('/api/auth/verify-email').send({})

    expect(res.status).toBe(400)
    expect(res.body.error).toBe('Verification token is required')
  })

  it('marks an account verified for a valid token', async () => {
    pool.query.mockResolvedValueOnce({
      rows: [{ id: 1, email: 'user@example.com', role: 'customer' }],
    })

    const res = await request(app).post('/api/auth/verify-email').send({ token: 'raw-token' })

    expect(res.status).toBe(200)
    expect(pool.query.mock.calls[0][1]).toEqual([sha256('raw-token')])
  })

  it('returns 400 for invalid or expired token', async () => {
    pool.query.mockResolvedValueOnce({ rows: [] })

    const res = await request(app).post('/api/auth/verify-email').send({ token: 'bad-token' })

    expect(res.status).toBe(400)
    expect(res.body.error).toBe('Invalid or expired verification token')
  })
})

describe('POST /api/auth/forgot-password', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    sendMail.mockResolvedValue({ messageId: 'mail-1' })
  })

  it('returns a generic response for unknown email', async () => {
    pool.query.mockResolvedValueOnce({ rows: [] })

    const res = await request(app)
      .post('/api/auth/forgot-password')
      .send({ email: 'nobody@example.com' })

    expect(res.status).toBe(200)
    expect(res.body.message).toBe('If that email is registered, a reset link has been sent.')
    expect(sendMail).not.toHaveBeenCalled()
  })

  it('stores a hashed password reset token and sends email', async () => {
    pool.query
      .mockResolvedValueOnce({ rows: [{ id: 1, email: 'user@example.com' }] })
      .mockResolvedValueOnce({ rows: [] })

    const res = await request(app)
      .post('/api/auth/forgot-password')
      .send({ email: 'user@example.com' })

    expect(res.status).toBe(200)
    expect(pool.query.mock.calls[1][0]).toContain('password_reset_token_hash')
    expect(pool.query.mock.calls[1][1][0]).toMatch(/^[a-f0-9]{64}$/)
    expect(sendMail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'user@example.com',
        subject: 'Reset your Fier password',
      })
    )
  })
})

describe('POST /api/auth/reset-password', () => {
  beforeEach(() => jest.clearAllMocks())

  it('returns 400 when token or password is missing', async () => {
    const res = await request(app).post('/api/auth/reset-password').send({ token: 'raw-token' })

    expect(res.status).toBe(400)
    expect(res.body.error).toBe('Token and new password are required')
  })

  it('returns 400 for invalid or expired reset token', async () => {
    pool.query.mockResolvedValueOnce({ rows: [] })

    const res = await request(app)
      .post('/api/auth/reset-password')
      .send({ token: 'raw-token', newPassword: 'password123' })

    expect(res.status).toBe(400)
    expect(res.body.error).toBe('Invalid or expired reset token')
    expect(pool.query.mock.calls[0][1]).toEqual([sha256('raw-token')])
  })

  it('updates password and clears reset token for a valid token', async () => {
    pool.query.mockResolvedValueOnce({ rows: [{ id: 1 }] }).mockResolvedValueOnce({ rows: [] })

    const res = await request(app)
      .post('/api/auth/reset-password')
      .send({ token: 'raw-token', newPassword: 'password123' })

    expect(res.status).toBe(200)
    expect(pool.query.mock.calls[1][0]).toContain('password_reset_token_hash = NULL')
  })
})
