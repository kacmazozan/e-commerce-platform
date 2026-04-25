exports.up = (pgm) => {
  pgm.alterColumn('notifications', 'product_id', { notNull: true })
}

exports.down = (pgm) => {
  pgm.alterColumn('notifications', 'product_id', { notNull: false })
}
