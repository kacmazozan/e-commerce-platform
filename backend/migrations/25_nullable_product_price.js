exports.up = (pgm) => {
  pgm.alterColumn('products', 'price', { notNull: false })
}

exports.down = (pgm) => {
  pgm.sql(`UPDATE products SET price = 0 WHERE price IS NULL`)
  pgm.alterColumn('products', 'price', { notNull: true })
}
