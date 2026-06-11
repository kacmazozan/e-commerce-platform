const crypto = require('crypto')

const ENVELOPE_PREFIX = 'enc:v1'
const KEY_SALT = 'fier-sensitive-data-v1'
const HMAC_SALT = 'fier-sensitive-hmac-v1'

let warnedAboutFallback = false

// scrypt derivation costs tens of milliseconds — cache per raw value so list
// endpoints that decrypt many rows don't re-derive the key on every field.
const keyCache = new Map()

function decodeKey(raw) {
  const trimmed = String(raw || '').trim()
  if (!trimmed) return null
  if (keyCache.has(trimmed)) return keyCache.get(trimmed)

  let key
  if (/^[a-f0-9]{64}$/i.test(trimmed)) {
    key = Buffer.from(trimmed, 'hex')
  } else {
    try {
      const decoded = Buffer.from(trimmed, 'base64')
      if (decoded.length === 32) key = decoded
    } catch {
      // Fall through to passphrase derivation.
    }
    if (!key) key = crypto.scryptSync(trimmed, KEY_SALT, 32)
  }

  keyCache.set(trimmed, key)
  return key
}

function getEncryptionKey() {
  const rawKey = process.env.DATA_ENCRYPTION_KEY || process.env.SENSITIVE_DATA_KEY
  if (rawKey) return decodeKey(rawKey)

  if (process.env.JWT_SECRET) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('DATA_ENCRYPTION_KEY is required in production')
    }
    if (!warnedAboutFallback) {
      warnedAboutFallback = true
      console.warn('DATA_ENCRYPTION_KEY is not set; deriving local encryption key from JWT_SECRET')
    }
    return decodeKey(process.env.JWT_SECRET)
  }

  throw new Error('DATA_ENCRYPTION_KEY is required to encrypt sensitive fields')
}

function encryptField(value) {
  if (value == null) return null

  const iv = crypto.randomBytes(12)
  const cipher = crypto.createCipheriv('aes-256-gcm', getEncryptionKey(), iv)
  const plaintext = Buffer.from(String(value), 'utf8')
  const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()])
  const tag = cipher.getAuthTag()

  return [
    ENVELOPE_PREFIX,
    iv.toString('base64url'),
    tag.toString('base64url'),
    ciphertext.toString('base64url'),
  ].join(':')
}

function isEncryptedField(value) {
  return typeof value === 'string' && value.startsWith(`${ENVELOPE_PREFIX}:`)
}

function decryptField(value) {
  if (value == null) return null
  if (!isEncryptedField(value)) return value

  const [, , ivBase64, tagBase64, ciphertextBase64] = value.split(':')
  if (!ivBase64 || !tagBase64 || !ciphertextBase64) {
    throw new Error('Invalid encrypted field envelope')
  }

  const decipher = crypto.createDecipheriv(
    'aes-256-gcm',
    getEncryptionKey(),
    Buffer.from(ivBase64, 'base64url')
  )
  decipher.setAuthTag(Buffer.from(tagBase64, 'base64url'))

  return Buffer.concat([
    decipher.update(Buffer.from(ciphertextBase64, 'base64url')),
    decipher.final(),
  ]).toString('utf8')
}

function getHmacKey() {
  return crypto.createHmac('sha256', getEncryptionKey()).update(HMAC_SALT).digest()
}

function fingerprintField(value) {
  return crypto.createHmac('sha256', getHmacKey()).update(String(value)).digest('hex')
}

module.exports = {
  decryptField,
  encryptField,
  fingerprintField,
  isEncryptedField,
}
