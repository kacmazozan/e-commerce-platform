exports.up = (pgm) => {
  pgm.createTable('notifications', {
    id: { type: 'serial', primaryKey: true },
    user_id: {
      type: 'integer',
      notNull: true,
      references: '"auth"."users"(id)',
      onDelete: 'CASCADE',
    },
    product_id: {
      type: 'integer',
      references: '"products"(id)',
      onDelete: 'CASCADE',
    },
    product_name: { type: 'text', notNull: true },
    original_price: { type: 'numeric(10,2)', notNull: true },
    discounted_price: { type: 'numeric(10,2)', notNull: true },
    discount_percent: { type: 'integer', notNull: true },
    is_read: { type: 'boolean', notNull: true, default: false },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('NOW()') },
  })

  pgm.createIndex('notifications', 'user_id')
}

exports.down = (pgm) => {
  pgm.dropTable('notifications')
}
