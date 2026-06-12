exports.up = (pgm) => {
  pgm.alterColumn('notifications', 'type', { default: 'price_drop' })
  pgm.sql("UPDATE notifications SET type = 'price_drop' WHERE type = '''price_drop'''")
}

exports.down = (pgm) => {
  pgm.alterColumn('notifications', 'type', { default: "'price_drop'" })
}
