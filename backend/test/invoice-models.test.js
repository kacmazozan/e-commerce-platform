const { buildInvoiceData } = require('../services/invoice')

describe('invoice calculations', () => {
  it('calculates a single item total correctly', () => {
    const invoice = buildInvoiceData({
      invoice_number: 'INV-001',
      order_id: 'ORD-001',
      customer_name: 'Test Customer',
      customer_email: 'test@example.com',
      customer_address: '123 Test St',
      items: [{ description: 'Test Item', quantity: 2, unit_price: 50.0 }],
    })

    expect(invoice.items[0].total).toBe(100.0)
  })

  it('calculates subtotal, tax, and total correctly', () => {
    const invoice = buildInvoiceData({
      invoice_number: 'INV-001',
      order_id: 'ORD-001',
      customer_name: 'Test Customer',
      customer_email: 'test@example.com',
      customer_address: '123 Test St',
      items: [
        { description: 'Item 1', quantity: 1, unit_price: 100.0 },
        { description: 'Item 2', quantity: 2, unit_price: 50.0 },
      ],
    })

    expect(invoice.subtotal).toBe(200.0)
    expect(invoice.tax_amount).toBe(0.0)
    expect(invoice.total).toBe(200.0)
  })

  it('supports empty invoices', () => {
    const invoice = buildInvoiceData({
      invoice_number: 'INV-EMPTY',
      order_id: 'ORD-EMPTY',
      customer_name: 'None',
      customer_email: 'none@example.com',
      customer_address: 'None',
      items: [],
    })

    expect(invoice.subtotal).toBe(0.0)
    expect(invoice.tax_amount).toBe(0.0)
    expect(invoice.total).toBe(0.0)
  })
})
