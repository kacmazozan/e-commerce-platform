require('dotenv').config()
const bcrypt = require('bcrypt')
const pool = require('../db')

const EMAIL = process.env.PRODUCT_MANAGER_EMAIL
const PASSWORD = process.env.PRODUCT_MANAGER_PASSWORD
const NAME = process.env.PRODUCT_MANAGER_NAME

if (!EMAIL || !PASSWORD || !NAME) {
  console.error(
    'Error: PRODUCT_MANAGER_EMAIL, PRODUCT_MANAGER_PASSWORD, and PRODUCT_MANAGER_NAME environment variables must be set.'
  )
  process.exit(1)
}

async function seedProductManager() {
  let client
  try {
    client = await pool.connect()
    const existing = await client.query('SELECT id, role FROM auth.users WHERE email = $1', [EMAIL])

    if (existing.rows.length > 0) {
      const user = existing.rows[0]
      if (user.role !== 'product_manager') {
        console.error(
          `Error: "${EMAIL}" already exists with role "${user.role}", not "product_manager". Aborting.`
        )
        return 1
      }
      const profile = await client.query(
        'SELECT product_manager_id FROM auth.product_managers WHERE product_manager_id = $1',
        [user.id]
      )
      if (profile.rows.length > 0) {
        console.log(`Product manager "${EMAIL}" already exists (id: ${user.id}). Skipping.`)
      } else {
        await client.query(
          'INSERT INTO auth.product_managers (product_manager_id, name) VALUES ($1, $2)',
          [user.id, NAME]
        )
        console.log(`Repaired missing profile row for product manager "${EMAIL}" (id: ${user.id}).`)
      }
      return 0
    }

    await client.query('BEGIN')
    const hash = await bcrypt.hash(PASSWORD, 10)
    const result = await client.query(
      `INSERT INTO auth.users (email, password_hash, role, email_verified_at)
       VALUES ($1, $2, $3, NOW())
       RETURNING id, email, role`,
      [EMAIL, hash, 'product_manager']
    )
    const userId = result.rows[0].id
    await client.query(
      'INSERT INTO auth.product_managers (product_manager_id, name) VALUES ($1, $2)',
      [userId, NAME]
    )
    await client.query('COMMIT')
    console.log('Product manager created:', result.rows[0])
    return 0
  } catch (err) {
    if (client) await client.query('ROLLBACK').catch(() => {})
    console.error('Failed to seed product manager:', err.message)
    return 1
  } finally {
    if (client) client.release()
  }
}

seedProductManager().then((code) => process.exit(code))
