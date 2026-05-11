exports.up = (pgm) => {
  // tax_id was originally NOT NULL UNIQUE and back-filled with the user's email
  // at registration. Customers and admins can now manage tax_id explicitly, so
  // relax the column: allow NULL (unset) and drop the unique constraint.
  pgm.sql('ALTER TABLE auth.customers ALTER COLUMN tax_id DROP NOT NULL')
  pgm.sql('ALTER TABLE auth.customers DROP CONSTRAINT IF EXISTS customers_tax_id_key')

  // Wipe the email-shaped placeholder values so the UI surfaces them as unset
  // rather than displaying the user's email as a tax ID.
  pgm.sql("UPDATE auth.customers SET tax_id = NULL WHERE tax_id LIKE '%@%'")
}

exports.down = (pgm) => {
  // Restore the original constraints. Any rows still NULL get the email back as
  // a placeholder so the NOT NULL re-add succeeds.
  pgm.sql(`
    UPDATE auth.customers c
    SET tax_id = u.email
    FROM auth.users u
    WHERE c.customer_id = u.id AND c.tax_id IS NULL
  `)
  pgm.sql('ALTER TABLE auth.customers ALTER COLUMN tax_id SET NOT NULL')
  pgm.sql('ALTER TABLE auth.customers ADD CONSTRAINT customers_tax_id_key UNIQUE (tax_id)')
}
