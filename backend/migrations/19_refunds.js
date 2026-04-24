exports.up = (pgm) => {
  pgm.createType('refund_status', ['pending', 'approved', 'rejected'])

  pgm.createTable('refunds', {
    id: { type: 'serial', primaryKey: true },
    order_item_id: {
      type: 'int',
      notNull: true,
      references: '"order_items"(id)',
      onDelete: 'RESTRICT',
    },
    user_id: {
      type: 'int',
      notNull: true,
      references: '"auth"."users"(id)',
      onDelete: 'CASCADE',
    },
    status: { type: 'refund_status', notNull: true, default: 'pending' },
    refund_amount: { type: 'numeric(10,2)', notNull: true },
    reason: { type: 'text' },
    requested_at: { type: 'timestamptz', notNull: true, default: pgm.func('NOW()') },
    updated_at: { type: 'timestamptz', notNull: true, default: pgm.func('NOW()') },
  })

  pgm.addConstraint('refunds', 'refunds_unique_order_item', 'UNIQUE(order_item_id)')
  pgm.createIndex('refunds', ['user_id'])
}

exports.down = (pgm) => {
  pgm.dropTable('refunds')
  pgm.dropType('refund_status')
}
