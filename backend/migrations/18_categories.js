exports.up = async (pgm) => {
  const {
    rows: [result],
  } = await pgm.db.query(`SELECT to_regclass('public.categories') AS table_name`)

  if (result.table_name) return

  pgm.createTable('categories', {
    id: { type: 'serial', primaryKey: true },
    name: { type: 'varchar(100)', notNull: true, unique: true },
  })
}

// This migration replaces the removed 12_categories file for databases that
// already have later 12_* migrations recorded, so rolling it back must be a no-op.
exports.down = () => {}
