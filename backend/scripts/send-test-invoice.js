require('dotenv').config()

const { processInvoiceRequest } = require('../services/invoice-workflow')

async function main() {
  process.env.SMTP_HOST = process.env.SMTP_HOST || 'localhost'

  const invoiceRequest = {
    invoice_number: 'INV-2026-001',
    order_id: 'ORD-984-ABC',
    customer_name: 'John Doe',
    customer_email: 'john@example.com',
    customer_address: '123 Fashion Ave, London, UK',
    items: [
      { description: 'Oversized Black Hoodie', quantity: 1, unit_price: 85.0 },
      { description: 'Straight Fit Jeans', quantity: 2, unit_price: 60.0 },
      { description: 'Silver Chain Necklace', quantity: 1, unit_price: 25.0 },
    ],
  }

  await processInvoiceRequest(invoiceRequest)
  console.log('Done! Check your local mail at http://localhost:8025')
}

main().catch((error) => {
  console.error('Failed to send email:', error)
  process.exit(1)
})
