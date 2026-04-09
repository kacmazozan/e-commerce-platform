/**
 * Seed the products table with initial catalogue data.
 *
 * Usage:
 *   node backend/scripts/seed-products.js
 *   (from repo root, with DATABASE_URL set or a backend/.env present)
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env') })

const pool = require('../db')

const PRODUCTS = [
  // Women's Clothing
  { name: 'Floral Wrap Dress', price: 89.99, category: "Women's Clothing", stock: 40 },
  { name: 'Linen Blazer', price: 129.99, category: "Women's Clothing", stock: 30 },
  { name: 'Ribbed Knit Top', price: 44.99, category: "Women's Clothing", stock: 60 },
  { name: 'Wide-Leg Trousers', price: 74.99, category: "Women's Clothing", stock: 45 },
  { name: 'Silk Cami Blouse', price: 59.99, category: "Women's Clothing", stock: 50 },
  { name: 'Tailored Mini Skirt', price: 54.99, category: "Women's Clothing", stock: 55 },

  // Men's Clothing
  { name: 'Oxford Button-Down', price: 64.99, category: "Men's Clothing", stock: 50 },
  { name: 'Slim Chinos', price: 69.99, category: "Men's Clothing", stock: 45 },
  { name: 'Merino Crew Sweater', price: 89.99, category: "Men's Clothing", stock: 35 },
  { name: 'Relaxed Linen Shirt', price: 59.99, category: "Men's Clothing", stock: 55 },
  { name: 'Tapered Joggers', price: 54.99, category: "Men's Clothing", stock: 60 },
  { name: 'Classic Polo', price: 49.99, category: "Men's Clothing", stock: 70 },

  // Outerwear
  { name: 'Double-Breasted Coat', price: 219.99, category: 'Outerwear', stock: 20 },
  { name: 'Quilted Puffer Jacket', price: 159.99, category: 'Outerwear', stock: 30 },
  { name: 'Trench Coat', price: 189.99, category: 'Outerwear', stock: 25 },
  { name: 'Leather Biker Jacket', price: 249.99, category: 'Outerwear', stock: 15 },
  { name: 'Wool Duffle Coat', price: 199.99, category: 'Outerwear', stock: 20 },
  { name: 'Windbreaker', price: 119.99, category: 'Outerwear', stock: 40 },

  // Footwear
  { name: 'Leather Chelsea Boots', price: 149.99, category: 'Footwear', stock: 30 },
  { name: 'White Leather Sneakers', price: 99.99, category: 'Footwear', stock: 50 },
  { name: 'Block Heel Mules', price: 89.99, category: 'Footwear', stock: 35 },
  { name: 'Running Trainers', price: 119.99, category: 'Footwear', stock: 45 },
  { name: 'Strappy Sandals', price: 69.99, category: 'Footwear', stock: 40 },
  { name: 'Suede Loafers', price: 109.99, category: 'Footwear', stock: 30 },

  // Accessories
  { name: 'Leather Tote Bag', price: 129.99, category: 'Accessories', stock: 25 },
  { name: 'Silk Scarf', price: 49.99, category: 'Accessories', stock: 60 },
  { name: 'Structured Bucket Hat', price: 34.99, category: 'Accessories', stock: 50 },
  { name: 'Leather Belt', price: 44.99, category: 'Accessories', stock: 55 },
  { name: 'Gold Hoop Earrings', price: 29.99, category: 'Accessories', stock: 80 },
  { name: 'Sunglasses', price: 59.99, category: 'Accessories', stock: 45 },

  // Activewear
  { name: 'High-Waist Leggings', price: 64.99, category: 'Activewear', stock: 60 },
  { name: 'Sports Bra', price: 39.99, category: 'Activewear', stock: 70 },
  { name: 'Zip-Up Hoodie', price: 74.99, category: 'Activewear', stock: 50 },
  { name: 'Cycling Shorts', price: 44.99, category: 'Activewear', stock: 65 },
  { name: 'Mesh Running Vest', price: 34.99, category: 'Activewear', stock: 55 },
  { name: 'Sweat-Wicking Tee', price: 29.99, category: 'Activewear', stock: 80 },

  // Formal
  { name: 'Tailored Blazer', price: 199.99, category: 'Formal', stock: 20 },
  { name: 'Pleated Dress Trousers', price: 109.99, category: 'Formal', stock: 25 },
  { name: 'Satin Evening Gown', price: 289.99, category: 'Formal', stock: 10 },
  { name: 'Classic Tuxedo Shirt', price: 89.99, category: 'Formal', stock: 30 },
  { name: 'Pencil Skirt', price: 79.99, category: 'Formal', stock: 35 },
  { name: 'Tie & Pocket Square', price: 39.99, category: 'Formal', stock: 50 },

  // Kids & Baby
  { name: 'Denim Dungarees', price: 34.99, category: 'Kids & Baby', stock: 40 },
  { name: 'Striped Onesie Set', price: 24.99, category: 'Kids & Baby', stock: 60 },
  { name: 'Puffer Vest', price: 44.99, category: 'Kids & Baby', stock: 35 },
  { name: 'Jersey Dress', price: 29.99, category: 'Kids & Baby', stock: 50 },
  { name: 'Canvas Trainers', price: 34.99, category: 'Kids & Baby', stock: 45 },
  { name: 'Knitted Cardigan', price: 39.99, category: 'Kids & Baby', stock: 40 },

  // New Releases (shown on homepage)
  { name: 'Oversized Linen Shirt', price: 79.99, category: "Women's Clothing", stock: 45 },
  { name: 'Slim Fit Chinos', price: 69.99, category: "Men's Clothing", stock: 50 },
  { name: 'Leather Moto Jacket', price: 249.99, category: 'Outerwear', stock: 15 },
  { name: 'Platform Loafers', price: 119.99, category: 'Footwear', stock: 30 },
  { name: 'Structured Tote', price: 139.99, category: 'Accessories', stock: 25 },
  { name: 'Ribbed Midi Dress', price: 94.99, category: "Women's Clothing", stock: 40 },
  { name: 'Merino Polo', price: 89.99, category: "Men's Clothing", stock: 35 },
  { name: 'Cropped Blazer', price: 179.99, category: 'Formal', stock: 20 },
]

async function seed() {
  const existing = await pool.query('SELECT COUNT(*) FROM products')
  if (parseInt(existing.rows[0].count) > 0) {
    console.log(`Products table already has ${existing.rows[0].count} rows — skipping seed.`)
    console.log('To re-seed, truncate the table first:')
    console.log(
      '  docker compose exec db psql -U postgres -d ecommerce -c "TRUNCATE products RESTART IDENTITY CASCADE;"'
    )
    await pool.end()
    return
  }

  console.log(`Inserting ${PRODUCTS.length} products…`)

  for (const p of PRODUCTS) {
    await pool.query(
      `INSERT INTO products (name, price, category, stock) VALUES ($1, $2, $3, $4)`,
      [p.name, p.price, p.category, p.stock]
    )
  }

  console.log('Done.')
  await pool.end()
}

seed().catch((err) => {
  console.error(err)
  process.exit(1)
})
