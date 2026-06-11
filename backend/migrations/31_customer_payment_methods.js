exports.up = (pgm) => {
  pgm.alterColumn({ schema: 'auth', name: 'customers' }, 'tax_id', {
    type: 'text',
  })

  pgm.createTable('customer_payment_methods', {
    id: { type: 'serial', primaryKey: true },
    user_id: {
      type: 'integer',
      notNull: true,
      references: '"auth"."users"(id)',
      onDelete: 'CASCADE',
    },
    brand: { type: 'varchar(32)', notNull: true },
    last4: { type: 'varchar(4)', notNull: true },
    cardholder_name_enc: { type: 'text', notNull: true },
    card_number_enc: { type: 'text', notNull: true },
    expiry_month_enc: { type: 'text', notNull: true },
    expiry_year_enc: { type: 'text', notNull: true },
    fingerprint_hash: { type: 'char(64)', notNull: true },
    is_default: { type: 'boolean', notNull: true, default: false },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('NOW()') },
    updated_at: { type: 'timestamptz', notNull: true, default: pgm.func('NOW()') },
  })

  pgm.createIndex('customer_payment_methods', ['user_id'])
  pgm.addConstraint(
    'customer_payment_methods',
    'customer_payment_methods_user_fingerprint_unique',
    {
      unique: ['user_id', 'fingerprint_hash'],
    }
  )

  pgm.addColumn('orders', {
    payment_method_id: {
      type: 'integer',
      references: '"customer_payment_methods"(id)',
      onDelete: 'SET NULL',
    },
  })
}

exports.down = (pgm) => {
  pgm.dropColumn('orders', 'payment_method_id')
  pgm.dropTable('customer_payment_methods')
  pgm.alterColumn({ schema: 'auth', name: 'customers' }, 'tax_id', {
    type: 'varchar(50)',
  })
}
