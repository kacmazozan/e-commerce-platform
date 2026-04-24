exports.up = (pgm) => {
  pgm.addColumns('products', {
    model: {
      type: 'varchar(255)',
      notNull: false,
    },
    serial_number: {
      type: 'varchar(255)',
      notNull: false,
      unique: true,
    },
    warranty_status: {
      type: 'varchar(255)',
      notNull: false,
    },
    distributor_info: {
      type: 'text',
      notNull: false,
    },
  })
}

exports.down = (pgm) => {
  pgm.dropColumns('products', ['model', 'serial_number', 'warranty_status', 'distributor_info'])
}
