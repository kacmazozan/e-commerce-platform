require('dotenv').config()
const bcrypt = require('bcrypt')
const pool = require('../db')

const EMAIL = process.env.MANAGER_EMAIL
const PASSWORD = process.env.MANAGER_PASSWORD
const NAME = process.env.MANAGER_NAME

if (!EMAIL || !PASSWORD || !NAME) {
  console.error(
    'Error: MANAGER_EMAIL, MANAGER_PASSWORD, and MANAGER_NAME environment variables must be set.'
  )
  process.exit(1)
}

async function seedSalesManager() {
  const client = await pool.connect()
  try {
    const existing = await client.query('SELECT id, role FROM auth.users WHERE email = $1', [EMAIL])

    if (existing.rows.length > 0) {
      const user = existing.rows[0]
      if (user.role !== 'sales_manager') {
        console.error(
          `Error: "${EMAIL}" already exists with role "${user.role}", not "sales_manager". Aborting.`
        )
        process.exit(1)
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
      process.exit(0)
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
    process.exit(0)
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {})
    console.error('Failed to seed sales manager:', err.message)
    process.exit(1)
  } finally {
    client.release()
  }
}

seedSalesManager()
