class MockPDFDocument {
  static instances = []

  constructor() {
    this.handlers = {}
    this.y = 0
    this.currentFontSize = 12
    this.textCalls = []
    MockPDFDocument.instances.push(this)
  }

  on(event, handler) {
    this.handlers[event] = handler
    return this
  }

  emit(event, payload) {
    if (this.handlers[event]) this.handlers[event](payload)
  }

  rect() {
    return this
  }

  fill() {
    return this
  }

  fillColor() {
    return this
  }

  fontSize(size) {
    this.currentFontSize = size
    return this
  }

  font() {
    return this
  }

  heightOfString(value, options = {}) {
    const text = String(value ?? '')
    const width = options.width || 220
    const charsPerLine = Math.max(1, Math.floor(width / 6))
    const lines = Math.max(1, Math.ceil(text.length / charsPerLine))
    const lineHeight = Math.max(10, this.currentFontSize + 2)
    return lines * lineHeight
  }

  text(value, x, y, options = {}) {
    const lineHeight = this.heightOfString(value, options)
    const textY = typeof y === 'number' ? y : this.y
    this.textCalls.push({ value: String(value), x, y: textY, options })
    this.y = textY + lineHeight
    return this
  }

  moveTo() {
    return this
  }

  lineTo() {
    return this
  }

  strokeColor() {
    return this
  }

  lineWidth() {
    return this
  }

  stroke() {
    return this
  }

  end() {
    this.emit('data', Buffer.from('pdf'))
    this.emit('end')
  }
}

jest.mock('pdfkit', () => MockPDFDocument)

const { generateInvoicePdf } = require('../services/invoice')

describe('invoice pdf layout', () => {
  beforeEach(() => {
    MockPDFDocument.instances = []
  })

  it('places customer email below wrapped customer address and pushes table down', async () => {
    await generateInvoicePdf({
      number: 'INV-2026-000001',
      order_id: '1',
      customer_name: 'Emreute',
      customer_email: 'emreute@gmail.com',
      customer_address:
        'Emre Üte Orta Dogu Ankara, Cankaya 06530 Germany Emre Üte Orta Dogu Ankara, Cankaya 06530 Germany',
      items: [
        { description: 'Oversized Linen Shirt', quantity: 1, unit_price: 79.99, total: 79.99 },
      ],
      date_str: 'May 06, 2026',
      subtotal: 79.99,
      tax_rate: 0,
      tax_amount: 0,
      total: 79.99,
    })

    const doc = MockPDFDocument.instances[0]
    const emailCall = doc.textCalls.find((call) => call.value === 'emreute@gmail.com')
    const tableHeaderCall = doc.textCalls.find((call) => call.value === 'DESCRIPTION')

    expect(emailCall).toBeDefined()
    expect(emailCall.y).toBeGreaterThan(238)
    expect(tableHeaderCall).toBeDefined()
    expect(tableHeaderCall.y).toBeGreaterThan(285)
  })
})
