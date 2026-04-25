exports.up = (pgm) => {
  pgm.addColumn('cart_items', {
    size: { type: 'varchar(20)', notNull: true, default: '' },
  })
  pgm.dropConstraint('cart_items', 'cart_items_pkey')
  pgm.addConstraint('cart_items', 'cart_items_pkey', 'PRIMARY KEY (user_id, product_id, size)')

  pgm.addColumn('order_items', {
    size: { type: 'varchar(20)', notNull: true, default: '' },
  })
}

exports.down = (pgm) => {
  pgm.dropColumn('order_items', 'size')
  pgm.dropConstraint('cart_items', 'cart_items_pkey')
  pgm.addConstraint('cart_items', 'cart_items_pkey', 'PRIMARY KEY (user_id, product_id)')
  pgm.dropColumn('cart_items', 'size')
}
