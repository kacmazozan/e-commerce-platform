require('dotenv').config()
const bcrypt = require('bcrypt')
const pool = require('../db')

const EMAIL = process.env.SALES_MANAGER_EMAIL
const PASSWORD = process.env.SALES_MANAGER_PASSWORD
const NAME = process.env.SALES_MANAGER_NAME

if (!EMAIL || !PASSWORD || !NAME) {
  console.error(
    'Error: SALES_MANAGER_EMAIL, SALES_MANAGER_PASSWORD, and SALES_MANAGER_NAME environment variables must be set.'
  )
  process.exit(1)
}

async function seedSalesManager() {
  let client
  try {
    client = await pool.connect()
    const existing = await client.query('SELECT id, role FROM auth.users WHERE email = $1', [EMAIL])

    if (existing.rows.length > 0) {
      const user = existing.rows[0]
      if (user.role !== 'sales_manager') {
        console.error(
          `Error: "${EMAIL}" already exists with role "${user.role}", not "sales_manager". Aborting.`
        )
        return 1
      }
      const profile = await client.query(
        'SELECT sales_manager_id FROM auth.sales_managers WHERE sales_manager_id = $1',
        [user.id]
      )
      if (profile.rows.length > 0) {
        console.log(`Sales manager "${EMAIL}" already exists (id: ${user.id}). Skipping.`)
      } else {
        await client.query(
          'INSERT INTO auth.sales_managers (sales_manager_id, name) VALUES ($1, $2)',
          [user.id, NAME]
        )
        console.log(`Repaired missing profile row for sales manager "${EMAIL}" (id: ${user.id}).`)
      }
      return 0
    }

    await client.query('BEGIN')
    const hash = await bcrypt.hash(PASSWORD, 10)
    const result = await client.query(
      'INSERT INTO auth.users (email, password_hash, role) VALUES ($1, $2, $3) RETURNING id, email, role',
      [EMAIL, hash, 'sales_manager']
    )
    const userId = result.rows[0].id
    await client.query('INSERT INTO auth.sales_managers (sales_manager_id, name) VALUES ($1, $2)', [
      userId,
      NAME,
    ])
    await client.query('COMMIT')
    console.log('Sales manager created:', result.rows[0])
    return 0
  } catch (err) {
    if (client) await client.query('ROLLBACK').catch(() => {})
    console.error('Failed to seed sales manager:', err.message)
    return 1
  } finally {
    if (client) client.release()
  }
}

seedSalesManager().then((code) => process.exit(code))
