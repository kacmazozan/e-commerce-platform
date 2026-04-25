exports.up = (pgm) => {
  pgm.createTable('product_images', {
    id: { type: 'serial', primaryKey: true },
    product_id: {
      type: 'integer',
      notNull: true,
      references: '"products"(id)',
      onDelete: 'CASCADE',
    },
    url: { type: 'text', notNull: true },
    alt: { type: 'varchar(255)' },
    position: { type: 'integer', notNull: true, default: 0 },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('NOW()') },
  })

  pgm.createIndex('product_images', ['product_id', 'position'])
}

exports.down = (pgm) => {
  pgm.dropTable('product_images')
}
