exports.up = (pgm) => {
  pgm.createTable('product_size_stock', {
    id: { type: 'serial', primaryKey: true },
    product_id: {
      type: 'integer',
      notNull: true,
      references: 'products(id)',
      onDelete: 'CASCADE',
    },
    size: { type: 'varchar(20)', notNull: true },
    stock: { type: 'integer', notNull: true, default: 0 },
  })

  pgm.addConstraint(
    'product_size_stock',
    'product_size_stock_product_id_size_key',
    'UNIQUE (product_id, size)'
  )

  pgm.addConstraint('product_size_stock', 'product_size_stock_stock_check', 'CHECK (stock >= 0)')

  // Distribute existing stock evenly across sizes for all products that have sizes defined.
  // The first (stock % size_count) sizes get one extra unit so the sum equals products.stock.
  pgm.sql(`
    INSERT INTO product_size_stock (product_id, size, stock)
    SELECT p.id,
           s.size,
           (p.stock / array_length(p.sizes, 1))
             + CASE WHEN s.ord <= (p.stock % array_length(p.sizes, 1)) THEN 1 ELSE 0 END
    FROM products p
    CROSS JOIN LATERAL unnest(p.sizes) WITH ORDINALITY AS s(size, ord)
    WHERE p.sizes IS NOT NULL AND array_length(p.sizes, 1) > 0
    ON CONFLICT DO NOTHING
  `)
}

exports.down = (pgm) => {
  pgm.dropTable('product_size_stock')
}
