import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { vi } from 'vitest'
import PMInvoices from '../src/pages/product-manager/PMInvoices'

const TOKEN = 'test-token'

const sampleInvoice = {
  order_id: 42,
  invoice_number: 'INV-2026-000042',
  customer_name: 'Jane Doe',
  customer_email: 'jane.doe@example.com',
  total: '144.00',
  status: 'pending',
  issued_at: '2026-04-15T10:30:00.000Z',
}

function listResponse(invoices = [sampleInvoice]) {
  return {
    ok: true,
    json: () =>
      Promise.resolve({
        invoices,
        pagination: { page: 1, limit: 10, total: invoices.length, totalPages: 1 },
      }),
  }
}

function detailResponse() {
  return {
    ok: true,
    json: () =>
      Promise.resolve({
        invoice: {
          number: 'INV-2026-000042',
          order_id: '42',
          customer_name: 'Jane Doe',
          customer_email: 'jane.doe@example.com',
          customer_address: '123 Main St',
          items: [
            { description: 'Widget', quantity: 2, unit_price: 50, total: 100 },
            { description: 'Gadget', quantity: 1, unit_price: 20, total: 20 },
          ],
          subtotal: 120,
          tax_rate: 0.2,
          tax_amount: 24,
          total: 144,
        },
        order: {
          id: 42,
          status: 'pending',
          address: '123 Main St',
          user_id: 7,
          user_email: 'jane.doe@example.com',
          created_at: '2026-04-15T10:30:00.000Z',
        },
      }),
  }
}

describe('PMInvoices', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('renders invoices table and loading state', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(listResponse()))
    render(<PMInvoices token={TOKEN} />)

    expect(screen.getByText('Loading…')).toBeInTheDocument()
    expect(await screen.findByText('INV-2026-000042')).toBeInTheDocument()
    expect(screen.getByText('jane.doe@example.com')).toBeInTheDocument()
    expect(screen.getByText('$144.00')).toBeInTheDocument()
    expect(screen.getByText('pending')).toBeInTheDocument()
  })

  it('shows empty state when no invoices are returned', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(listResponse([])))
    render(<PMInvoices token={TOKEN} />)

    expect(await screen.findByText('No invoices found')).toBeInTheDocument()
  })

  it('applies the search term to the next fetch', async () => {
    const fetchMock = vi.fn().mockResolvedValue(listResponse())
    vi.stubGlobal('fetch', fetchMock)
    render(<PMInvoices token={TOKEN} />)

    await screen.findByText('INV-2026-000042')

    await userEvent.type(
      screen.getByPlaceholderText(/search by customer email or order id/i),
      'jane'
    )
    await userEvent.click(screen.getByRole('button', { name: /search/i }))

    await waitFor(() => {
      const searchCall = fetchMock.mock.calls.find((call) => call[0].includes('search=jane'))
      expect(searchCall).toBeDefined()
    })
  })

  it('opens the detail modal on View and shows invoice totals', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(listResponse())
      .mockResolvedValueOnce(detailResponse())
    vi.stubGlobal('fetch', fetchMock)

    render(<PMInvoices token={TOKEN} />)
    await screen.findByText('INV-2026-000042')

    await userEvent.click(screen.getByRole('button', { name: /view/i }))

    expect(await screen.findByText(/invoice INV-2026-000042/i)).toBeInTheDocument()
    expect(screen.getByText('Widget')).toBeInTheDocument()
    expect(screen.getByText('Gadget')).toBeInTheDocument()
    expect(screen.getByText('Subtotal')).toBeInTheDocument()
    expect(screen.getByText('$120.00')).toBeInTheDocument()
    expect(screen.queryByText(/tax/i)).not.toBeInTheDocument()
  })

  it('requests the PDF endpoint when Download PDF is clicked', async () => {
    const pdfBlob = new Blob(['%PDF-fake'], { type: 'application/pdf' })
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(listResponse())
      .mockResolvedValueOnce({ ok: true, blob: () => Promise.resolve(pdfBlob) })
    vi.stubGlobal('fetch', fetchMock)
    vi.stubGlobal('URL', { createObjectURL: vi.fn(() => 'blob:fake'), revokeObjectURL: vi.fn() })

    render(<PMInvoices token={TOKEN} />)
    await screen.findByText('INV-2026-000042')

    await userEvent.click(screen.getByRole('button', { name: /download pdf/i }))

    await waitFor(() => {
      const pdfCall = fetchMock.mock.calls.find((call) => call[0].includes('/42/pdf'))
      expect(pdfCall).toBeDefined()
    })
  })

  it('shows an error message when the list fetch fails', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 500 }))
    render(<PMInvoices token={TOKEN} />)

    expect(await screen.findByText(/failed to fetch invoices/i)).toBeInTheDocument()
  })
})
