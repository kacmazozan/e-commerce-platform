const { decryptField, encryptField, fingerprintField } = require('./secure-fields')

function digitsOnly(value) {
  return String(value || '').replace(/\D/g, '')
}

function getCardBrand(cardNumber) {
  const digits = digitsOnly(cardNumber)
  if (/^4/.test(digits)) return 'VISA'
  if (/^5[1-5]/.test(digits) || /^2(2[2-9]|[3-6]\d|7[01]|720)/.test(digits)) return 'MC'
  if (/^3[47]/.test(digits)) return 'AMEX'
  return 'CARD'
}

function parseExpiry(input) {
  if (input && typeof input === 'object') {
    const month = Number(input.expiryMonth ?? input.expiry_month)
    let year = Number(input.expiryYear ?? input.expiry_year)
    if (year > 0 && year < 100) year += 2000
    return { month, year }
  }

  const value = String(input || '').trim()
  const match = value.match(/^(\d{1,2})\s*\/\s*(\d{2}|\d{4})$/)
  if (!match) return { month: NaN, year: NaN }

  const month = Number(match[1])
  let year = Number(match[2])
  if (year < 100) year += 2000
  return { month, year }
}

function isExpired(month, year) {
  const now = new Date()
  return year < now.getFullYear() || (year === now.getFullYear() && month < now.getMonth() + 1)
}

function validateExpiry(month, year) {
  return (
    Number.isInteger(month) && month >= 1 && month <= 12 && Number.isInteger(year) && year >= 2000
  )
}

function normalizeCardPayload(payload = {}, { requireCvv = false } = {}) {
  const cardholderName = String(payload.cardholderName ?? payload.cardName ?? '')
    .trim()
    .replace(/\s+/g, ' ')
  const cardNumber = digitsOnly(payload.cardNumber)
  const brand = getCardBrand(cardNumber)
  const { month, year } = parseExpiry(
    payload.expiry || {
      expiryMonth: payload.expiryMonth ?? payload.expiry_month,
      expiryYear: payload.expiryYear ?? payload.expiry_year,
    }
  )
  const cvv = digitsOnly(payload.cvv)

  if (!cardholderName) return { error: 'Cardholder name is required' }
  if (cardholderName.length > 100)
    return { error: 'Cardholder name must be 100 characters or fewer' }
  if (!cardNumber) return { error: 'Card number is required' }
  if (cardNumber.length < 4 || cardNumber.length > 19) {
    return { error: 'Card number must be 4 to 19 digits' }
  }
  if (!validateExpiry(month, year)) return { error: 'Expiry date is invalid' }
  if (requireCvv && (cvv.length < 3 || cvv.length > 4)) {
    return { error: 'CVV must be 3 or 4 digits' }
  }

  return {
    card: {
      brand,
      cardholderName,
      cardNumber,
      expiryMonth: month,
      expiryYear: year,
      fingerprint: fingerprintField(cardNumber),
      last4: cardNumber.slice(-4),
    },
  }
}

function publicPaymentMethod(row) {
  const expiryMonth = Number(decryptField(row.expiry_month_enc))
  const expiryYear = Number(decryptField(row.expiry_year_enc))

  return {
    id: row.id,
    brand: row.brand,
    last4: row.last4,
    cardholderName: decryptField(row.cardholder_name_enc),
    expiryMonth,
    expiryYear,
    expiry: `${String(expiryMonth).padStart(2, '0')}/${String(expiryYear).slice(-2)}`,
    isDefault: Boolean(row.is_default),
    expired: isExpired(expiryMonth, expiryYear),
    createdAt: row.created_at,
  }
}

async function insertPaymentMethod(client, userId, card, { makeDefault = false } = {}) {
  if (makeDefault) {
    await client.query(
      'UPDATE customer_payment_methods SET is_default = FALSE WHERE user_id = $1',
      [userId]
    )
  }

  const result = await client.query(
    `INSERT INTO customer_payment_methods (
       user_id,
       brand,
       last4,
       cardholder_name_enc,
       card_number_enc,
       expiry_month_enc,
       expiry_year_enc,
       fingerprint_hash,
       is_default
     )
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     RETURNING *`,
    [
      userId,
      card.brand,
      card.last4,
      encryptField(card.cardholderName),
      encryptField(card.cardNumber),
      encryptField(card.expiryMonth),
      encryptField(card.expiryYear),
      card.fingerprint,
      makeDefault,
    ]
  )

  return result.rows[0]
}

async function ensureSavedPaymentMethod(client, userId, card) {
  const existing = await client.query(
    `SELECT *
     FROM customer_payment_methods
     WHERE user_id = $1 AND fingerprint_hash = $2`,
    [userId, card.fingerprint]
  )

  if (existing.rows.length > 0) {
    return existing.rows[0]
  }

  const countResult = await client.query(
    'SELECT COUNT(*)::int AS count FROM customer_payment_methods WHERE user_id = $1',
    [userId]
  )
  const makeDefault = Number(countResult.rows[0]?.count ?? 0) === 0
  return insertPaymentMethod(client, userId, card, { makeDefault })
}

module.exports = {
  ensureSavedPaymentMethod,
  getCardBrand,
  insertPaymentMethod,
  isExpired,
  normalizeCardPayload,
  publicPaymentMethod,
}
