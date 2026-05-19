exports.up = (pgm) => {
  pgm.addColumn('orders', {
    shipping_cost: { type: 'numeric(10,2)', notNull: true, default: 0 },
  })
}

exports.down = (pgm) => {
  pgm.dropColumn('orders', 'shipping_cost')
}
