exports.up = (pgm) => {
  pgm.dropColumn('products', 'image_url')
}

exports.down = (pgm) => {
  pgm.addColumn('products', {
    image_url: { type: 'varchar(500)', notNull: false },
  })
}
