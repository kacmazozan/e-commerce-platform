// order_items.product_id was ON DELETE CASCADE, which would silently wipe order
// history when a product is deleted or the products table is truncated. Changed
// to ON DELETE RESTRICT so products with existing order history cannot be deleted.
// To retire a product, set it inactive in the products table rather than deleting it.

exports.up = (pgm) => {
  pgm.dropConstraint('order_items', 'order_items_product_id_fkey')
  pgm.addConstraint(
    'order_items',
    'order_items_product_id_fkey',
    'FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE RESTRICT'
  )
}

exports.down = (pgm) => {
  pgm.dropConstraint('order_items', 'order_items_product_id_fkey')
  pgm.addConstraint(
    'order_items',
    'order_items_product_id_fkey',
    'FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE'
  )
}
