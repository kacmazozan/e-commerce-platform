exports.up = (pgm) => {
  pgm.createTable('categories', {
    id: { type: 'serial', primaryKey: true },
    name: { type: 'varchar(100)', notNull: true, unique: true },
  })
}

exports.down = (pgm) => {
  pgm.dropTable('categories')
}
