exports.options = { transaction: false }

exports.up = async (pgm) => {
  // ─── Cart items ────────────────────────────────────
  pgm.createTable(
    { schema: 'public', name: 'cart_items' },
    {
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
      quantity: { type: 'integer', notNull: true, default: 1 },
      added_at: { type: 'timestamptz', notNull: true, default: pgm.func('NOW()') },
    },
    {
      constraints: {
        primaryKey: ['user_id', 'product_id'],
      },
    }
  )

  pgm.addConstraint(
    { schema: 'public', name: 'cart_items' },
    'cart_items_quantity_positive',
    'CHECK (quantity > 0)'
  )
}

exports.down = (pgm) => {
  pgm.dropTable({ schema: 'public', name: 'cart_items' })
}
