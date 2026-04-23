const {
  buildInvoiceData,
  createInvoiceEmailBody,
  generateInvoicePdf,
} = require('./invoice')
const { sendMail } = require('./mailer')

async function processInvoiceRequest(request) {
  const invoice = buildInvoiceData(request)
  const pdfContent = await generateInvoicePdf(invoice)

  await sendMail({
    to: [invoice.customer_email],
    subject: `FIER - Invoice for your order ${invoice.number}`,
    html: createInvoiceEmailBody(invoice.customer_name),
    attachments: [
      {
        filename: `Invoice_${invoice.number}.pdf`,
        content: pdfContent,
        contentType: 'application/pdf',
      },
    ],
  })

  return invoice
}

function queueInvoiceRequest(request) {
  setImmediate(() => {
    processInvoiceRequest(request).catch((error) => {
      console.error(`Error processing invoice ${request.invoice_number}:`, error)
    })
  })
}

module.exports = {
  processInvoiceRequest,
  queueInvoiceRequest,
}
