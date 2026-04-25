exports.up = (pgm) => {
  pgm.dropConstraint('stock_reservations', 'stock_reservations_user_product_unique')
  pgm.addColumn('stock_reservations', {
    size: { type: 'varchar(20)', notNull: true, default: '' },
  })
  pgm.addConstraint(
    'stock_reservations',
    'stock_reservations_user_product_size_unique',
    'UNIQUE (user_id, product_id, size)'
  )
}

exports.down = (pgm) => {
  pgm.dropConstraint('stock_reservations', 'stock_reservations_user_product_size_unique')
  pgm.dropColumn('stock_reservations', 'size')
  pgm.addConstraint(
    'stock_reservations',
    'stock_reservations_user_product_unique',
    'UNIQUE (user_id, product_id)'
  )
}
