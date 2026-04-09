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
  try {
    const existing = await pool.query('SELECT id FROM auth.users WHERE email = $1', [EMAIL])
    if (existing.rows.length > 0) {
      console.log(
        `Sales manager "${EMAIL}" already exists (id: ${existing.rows[0].id}). Skipping.`
      )
      process.exit(0)
    }

    const hash = await bcrypt.hash(PASSWORD, 10)
    const result = await pool.query(
      'INSERT INTO auth.users (email, password_hash, role) VALUES ($1, $2, $3) RETURNING id, email, role',
      [EMAIL, hash, 'sales_manager']
    )

    const userId = result.rows[0].id
    await pool.query('INSERT INTO auth.sales_managers (sales_manager_id, name) VALUES ($1, $2)', [
      userId,
      NAME,
    ])

    console.log('Sales manager created:', result.rows[0])
    process.exit(0)
  } catch (err) {
    console.error('Failed to seed sales manager:', err.message)
    process.exit(1)
  }
}

seedSalesManager()
