exports.up = (pgm) => {
  pgm.addColumn('notifications', {
    type: { type: 'varchar(30)', notNull: true, default: "'price_drop'" },
    message: { type: 'text' },
  })
  pgm.alterColumn('notifications', 'product_id', { notNull: false })
  pgm.alterColumn('notifications', 'original_price', { notNull: false })
  pgm.alterColumn('notifications', 'discounted_price', { notNull: false })
  pgm.alterColumn('notifications', 'discount_percent', { notNull: false })
}

exports.down = (pgm) => {
  pgm.alterColumn('notifications', 'discount_percent', { notNull: true })
  pgm.alterColumn('notifications', 'discounted_price', { notNull: true })
  pgm.alterColumn('notifications', 'original_price', { notNull: true })
  pgm.alterColumn('notifications', 'product_id', { notNull: true })
  pgm.dropColumn('notifications', 'message')
  pgm.dropColumn('notifications', 'type')
}
