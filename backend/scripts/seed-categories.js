require('dotenv').config({ path: require('path').join(__dirname, '../.env') })

const pool = require('../db')

const CATEGORIES = [
  "Women's Clothing",
  "Men's Clothing",
  'Outerwear',
  'Footwear',
  'Accessories',
  'Activewear',
  'Formal',
  "Kids & Baby",
]

async function seed() {
  for (const name of CATEGORIES) {
    await pool.query('INSERT INTO categories (name) VALUES ($1) ON CONFLICT (name) DO NOTHING', [
      name,
    ])
  }
  console.log(`Seeded ${CATEGORIES.length} categories.`)
  await pool.end()
}

seed().catch((err) => {
  console.error('Category seed failed:', err)
  process.exit(1)
})
