const express = require('express')
const { validateInvoiceRequest } = require('../services/invoice')
const { queueInvoiceRequest } = require('../services/invoice-workflow')

const router = express.Router()

router.get('/health', (req, res) => {
  res.json({ status: 'healthy' })
})

router.post('/generate', (req, res) => {
  const validation = validateInvoiceRequest(req.body)

  if (!validation.ok) {
    return res.status(422).json({ detail: validation.errors })
  }

  queueInvoiceRequest(validation.value)

  return res.json({
    message: 'Invoice generation started',
    invoice_number: validation.value.invoice_number,
  })
})

module.exports = router
