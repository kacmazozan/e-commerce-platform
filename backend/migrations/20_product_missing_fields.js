exports.up = (pgm) => {
  pgm.sql(`
    ALTER TABLE products
      ADD COLUMN IF NOT EXISTS model varchar(255),
      ADD COLUMN IF NOT EXISTS serial_number varchar(255),
      ADD COLUMN IF NOT EXISTS warranty_status varchar(255),
      ADD COLUMN IF NOT EXISTS distributor_info text;
  `)

  pgm.sql(`
    CREATE UNIQUE INDEX IF NOT EXISTS products_serial_number_unique
      ON products (serial_number)
      WHERE serial_number IS NOT NULL;
  `)
}

exports.down = (pgm) => {
  pgm.sql('DROP INDEX IF EXISTS products_serial_number_unique')
  pgm.sql(`
    ALTER TABLE products
      DROP COLUMN IF EXISTS model,
      DROP COLUMN IF EXISTS serial_number,
      DROP COLUMN IF EXISTS warranty_status,
      DROP COLUMN IF EXISTS distributor_info;
  `)
}
