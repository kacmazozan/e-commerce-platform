const cors = require('cors')
const express = require('express')

const DEFAULT_FRONTEND_ORIGIN = 'http://localhost:5173'
const DEFAULT_JSON_BODY_LIMIT = '100kb'
const DEFAULT_RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000
const DEFAULT_SENSITIVE_RATE_LIMIT_MAX = 20

const SENSITIVE_RATE_LIMIT_PATHS = [
  '/api/auth/register',
  '/api/auth/login',
  '/api/auth/resend-verification',
  '/api/auth/forgot-password',
  '/api/auth/reset-password',
  '/api/auth/email-change/request',
]

function parsePositiveInteger(value, fallback) {
  const parsed = Number(value)
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback
}

function parseList(value) {
  return String(value || '')
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean)
}

function normalizeOrigin(value) {
  const trimmed = String(value || '').trim()
  if (trimmed === '*') return '*'

  try {
    return new URL(trimmed).origin
  } catch {
    return trimmed.replace(/\/+$/, '')
  }
}

function getAllowedOrigins(env = process.env) {
  const configuredOrigins = parseList(env.CORS_ORIGINS)
  const fallbackOrigin = env.FRONTEND_URL || DEFAULT_FRONTEND_ORIGIN
  const origins = configuredOrigins.length > 0 ? configuredOrigins : [fallbackOrigin]

  return [...new Set(origins.map(normalizeOrigin))]
}

function createCorsMiddleware(env = process.env) {
  const allowedOrigins = getAllowedOrigins(env)

  return cors({
    origin(origin, callback) {
      if (!origin) return callback(null, true)

      const requestOrigin = normalizeOrigin(origin)
      const allowed = allowedOrigins.includes('*') || allowedOrigins.includes(requestOrigin)
      return callback(null, allowed)
    },
    optionsSuccessStatus: 204,
  })
}

function securityHeaders(_req, res, next) {
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'none'; frame-ancestors 'none'; base-uri 'none'"
  )
  res.setHeader('Cross-Origin-Resource-Policy', 'same-site')
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()')
  res.setHeader('Referrer-Policy', 'no-referrer')
  res.setHeader('X-Content-Type-Options', 'nosniff')
  res.setHeader('X-Frame-Options', 'DENY')
  next()
}

function handleJsonErrors(err, _req, res, next) {
  if (err?.type === 'entity.too.large') {
    return res.status(413).json({ error: 'Request body too large' })
  }

  if (err instanceof SyntaxError && err?.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'Malformed JSON request body' })
  }

  return next(err)
}

function createRateLimiter({ windowMs, maxAttempts } = {}) {
  const limitWindowMs = parsePositiveInteger(windowMs, DEFAULT_RATE_LIMIT_WINDOW_MS)
  const attemptsLimit = parsePositiveInteger(maxAttempts, DEFAULT_SENSITIVE_RATE_LIMIT_MAX)
  const attempts = new Map()

  return (req, res, next) => {
    const now = Date.now()
    const key = req.ip || req.socket?.remoteAddress || 'unknown'
    const current = attempts.get(key)
    const bucket =
      current && current.resetAt > now ? current : { count: 0, resetAt: now + limitWindowMs }

    bucket.count += 1
    attempts.set(key, bucket)

    const retryAfterSeconds = Math.max(1, Math.ceil((bucket.resetAt - now) / 1000))
    res.setHeader('RateLimit-Limit', String(attemptsLimit))
    res.setHeader('RateLimit-Remaining', String(Math.max(0, attemptsLimit - bucket.count)))
    res.setHeader('RateLimit-Reset', String(retryAfterSeconds))

    if (bucket.count > attemptsLimit) {
      res.setHeader('Retry-After', String(retryAfterSeconds))
      return res.status(429).json({ error: 'Too many attempts. Please try again later.' })
    }

    if (attempts.size > 10000) {
      for (const [attemptKey, attemptBucket] of attempts.entries()) {
        if (attemptBucket.resetAt <= now) attempts.delete(attemptKey)
      }
    }

    return next()
  }
}

function configureSecurity(app, env = process.env) {
  app.disable('x-powered-by')

  if (env.TRUST_PROXY === 'true') {
    app.set('trust proxy', 1)
  }

  app.use(securityHeaders)
  app.use(createCorsMiddleware(env))
  app.use(express.json({ limit: env.JSON_BODY_LIMIT || DEFAULT_JSON_BODY_LIMIT }))
  app.use(handleJsonErrors)
  app.use(
    SENSITIVE_RATE_LIMIT_PATHS,
    createRateLimiter({
      windowMs: env.SENSITIVE_RATE_LIMIT_WINDOW_MS,
      maxAttempts: env.SENSITIVE_RATE_LIMIT_MAX,
    })
  )
}

module.exports = {
  configureSecurity,
  createRateLimiter,
  getAllowedOrigins,
}
