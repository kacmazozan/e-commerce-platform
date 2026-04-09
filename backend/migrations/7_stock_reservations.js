// Soft-lock inventory during checkout. A reservation holds stock for a user
// for a fixed window (e.g. 10 minutes). On payment confirmation the stock is
// hard-decremented and the reservation is removed. On expiry or cancellation
// the reservation is simply deleted, releasing the stock back to the pool.

exports.up = (pgm) => {
  pgm.createTable('stock_reservations', {
    id: { type: 'serial', primaryKey: true },
    user_id: {
      type: 'integer',
      notNull: true,
      references: '"auth"."users"(id)',
      onDelete: 'CASCADE',
    },
    product_id: {
      type: 'integer',
      notNull: true,
      references: '"products"(id)',
      onDelete: 'CASCADE',
    },
    quantity: { type: 'integer', notNull: true },
    reserved_at: { type: 'timestamptz', notNull: true, default: pgm.func('NOW()') },
    expires_at: { type: 'timestamptz', notNull: true },
  })

  pgm.addConstraint(
    'stock_reservations',
    'stock_reservations_quantity_positive',
    'CHECK (quantity > 0)'
  )
  pgm.addConstraint(
    'stock_reservations',
    'stock_reservations_user_product_unique',
    'UNIQUE (user_id, product_id)'
  )
}

exports.down = (pgm) => {
  pgm.dropTable('stock_reservations')
}
