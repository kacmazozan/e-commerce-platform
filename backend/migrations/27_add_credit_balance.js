exports.up = (pgm) => {
  pgm.addColumns(
    { schema: 'auth', name: 'customers' },
    { credit_balance: { type: 'numeric(10,2)', notNull: true, default: 0 } }
  )
}

exports.down = (pgm) => {
  pgm.dropColumn({ schema: 'auth', name: 'customers' }, 'credit_balance')
}
