exports.up = (pgm) => {
  pgm.dropIndex('product_images', ['product_id', 'position'])
  pgm.dropColumn('product_images', 'position')
  pgm.createIndex('product_images', ['product_id'])
}

exports.down = (pgm) => {
  pgm.dropIndex('product_images', ['product_id'])
  pgm.addColumn('product_images', {
    position: { type: 'integer', notNull: true, default: 0 },
  })
  pgm.createIndex('product_images', ['product_id', 'position'])
}
