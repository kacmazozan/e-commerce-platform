const { decryptField, encryptField, isEncryptedField } = require('../services/secure-fields')

exports.up = async (pgm) => {
  const customers = await pgm.db.query(
    'SELECT customer_id, tax_id, home_address FROM auth.customers'
  )

  for (const customer of customers.rows) {
    const taxId =
      customer.tax_id == null || isEncryptedField(customer.tax_id)
        ? customer.tax_id
        : encryptField(customer.tax_id)
    const homeAddress = isEncryptedField(customer.home_address)
      ? customer.home_address
      : encryptField(customer.home_address || '')

    await pgm.db.query(
      'UPDATE auth.customers SET tax_id = $1, home_address = $2 WHERE customer_id = $3',
      [taxId, homeAddress, customer.customer_id]
    )
  }

  const orders = await pgm.db.query('SELECT id, address FROM orders WHERE address IS NOT NULL')
  for (const order of orders.rows) {
    if (!isEncryptedField(order.address)) {
      await pgm.db.query('UPDATE orders SET address = $1 WHERE id = $2', [
        encryptField(order.address),
        order.id,
      ])
    }
  }
}

exports.down = async (pgm) => {
  const customers = await pgm.db.query(
    'SELECT customer_id, tax_id, home_address FROM auth.customers'
  )

  for (const customer of customers.rows) {
    await pgm.db.query(
      'UPDATE auth.customers SET tax_id = $1, home_address = $2 WHERE customer_id = $3',
      [
        customer.tax_id == null ? null : decryptField(customer.tax_id),
        decryptField(customer.home_address),
        customer.customer_id,
      ]
    )
  }

  const orders = await pgm.db.query('SELECT id, address FROM orders WHERE address IS NOT NULL')
  for (const order of orders.rows) {
    await pgm.db.query('UPDATE orders SET address = $1 WHERE id = $2', [
      decryptField(order.address),
      order.id,
    ])
  }
}
