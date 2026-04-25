exports.options = { transaction: false }

exports.up = (pgm) => {
  pgm.addColumn(
    { schema: 'public', name: 'product_reviews' },
    {
      anonymous: {
        type: 'boolean',
        notNull: true,
        default: false,
      },
    }
  )
}

exports.down = (pgm) => {
  pgm.dropColumn({ schema: 'public', name: 'product_reviews' }, 'anonymous')
}
