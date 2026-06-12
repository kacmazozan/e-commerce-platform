exports.up = (pgm) => {
  pgm.addColumn('products', {
    cost_price: { type: 'numeric(10,2)', notNull: false },
  })
}

exports.down = (pgm) => {
  pgm.dropColumn('products', 'cost_price')
}
