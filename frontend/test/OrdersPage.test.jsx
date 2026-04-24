import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { vi } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import OrdersPage from '../src/pages/orders/OrdersPage'

const defaultProps = {
  onBack: vi.fn(),
  token: 'fake-token',
}

function renderPage(props = {}) {
  return render(
    <MemoryRouter>
      <OrdersPage {...defaultProps} {...props} />
    </MemoryRouter>
  )
}

const pendingOrder = {
  id: 1,
  status: 'pending',
  total: '49.99',
  address: '123 Main St',
  created_at: '2024-01-15T10:00:00Z',
  items: [
    { order_id: 1, quantity: 1, price: '49.99', size: null, product_id: 1, product_name: 'Widget' },
  ],
}

const shippedOrder = {
  id: 2,
  status: 'shipped',
  total: '79.99',
  address: '456 Oak Ave',
  created_at: '2024-01-20T10:00:00Z',
  items: [],
}

const deliveredOrder = {
  id: 3,
  status: 'delivered',
  total: '29.99',
  address: '789 Pine Rd',
  created_at: '2024-01-10T10:00:00Z',
  items: [
    { order_id: 3, quantity: 2, price: '14.99', size: 'M', product_id: 2, product_name: 'Gadget' },
  ],
}

const processingOrder = {
  id: 5,
  status: 'processing',
  total: '39.99',
  address: '654 Maple Dr',
  created_at: '2024-01-18T10:00:00Z',
  items: [
    { order_id: 5, quantity: 1, price: '39.99', size: 'L', product_id: 3, product_name: 'Jacket' },
  ],
}

const cancelledOrder = {
  id: 4,
  status: 'cancelled',
  total: '19.99',
  address: '321 Elm St',
  created_at: '2024-01-05T10:00:00Z',
  items: [],
}

describe('OrdersPage', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('shows loading state initially', () => {
    vi.stubGlobal('fetch', vi.fn().mockReturnValue(new Promise(() => {})))

    renderPage()

    expect(screen.getByText(/loading your orders/i)).toBeInTheDocument()
  })

  it('shows "No active orders." and "No past orders." when fetch returns empty orders array', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ orders: [] }),
      })
    )

    renderPage()

    expect(await screen.findByText(/no active orders/i)).toBeInTheDocument()
    expect(screen.getByText(/no past orders/i)).toBeInTheDocument()
  })

  it('renders a current order with status pending showing label "Order Placed" and the timeline', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ orders: [pendingOrder] }),
      })
    )

    renderPage()

    // "Order Placed" appears in both the status pill and the timeline step label
    const orderPlacedEls = await screen.findAllByText(/order placed/i)
    expect(orderPlacedEls.length).toBeGreaterThanOrEqual(1)
    // Timeline step labels
    expect(screen.getByText('Processing')).toBeInTheDocument()
    expect(screen.getByText('In Transit')).toBeInTheDocument()
    expect(screen.getByText('Delivered')).toBeInTheDocument()
  })

  it('renders a current order with status shipped showing pill "In Transit"', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ orders: [shippedOrder] }),
      })
    )

    renderPage()

    // The status pill in the order header
    expect(await screen.findAllByText('In Transit')).not.toHaveLength(0)
  })

  it('renders a past order with status delivered in the Past Orders section with label "Delivered"', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ orders: [deliveredOrder] }),
      })
    )

    renderPage()

    expect(await screen.findByText('Past Orders')).toBeInTheDocument()
    expect(screen.getByText('Delivered')).toBeInTheDocument()
    expect(screen.getByText(`Order #${deliveredOrder.id}`)).toBeInTheDocument()
  })

  it('renders a past order with status cancelled with label "Cancelled"', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ orders: [cancelledOrder] }),
      })
    )

    renderPage()

    expect(await screen.findByText('Cancelled')).toBeInTheDocument()
  })

  it('past order expands when clicked and collapses when clicked again', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ orders: [deliveredOrder] }),
      })
    )

    renderPage()

    const toggleButton = await screen.findByRole('button', { name: /order #3/i })

    // Initially collapsed — items not visible
    expect(screen.queryByText('Gadget')).not.toBeInTheDocument()

    // Expand
    await userEvent.click(toggleButton)
    expect(screen.getByText('Gadget')).toBeInTheDocument()

    // Collapse
    await userEvent.click(toggleButton)
    expect(screen.queryByText('Gadget')).not.toBeInTheDocument()
  })

  it('shows error message on network failure', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Network failure')))

    renderPage()

    expect(await screen.findByText(/network error/i)).toBeInTheDocument()
  })

  it('displays the order total for a current order', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ orders: [pendingOrder] }),
      })
    )

    renderPage()

    // $49.99 appears as item price and as order total
    const totalEls = await screen.findAllByText('$49.99')
    expect(totalEls.length).toBeGreaterThanOrEqual(1)
  })

  it('"Cancel Order" button is visible for a pending order', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ orders: [pendingOrder] }),
      })
    )

    renderPage()

    expect(await screen.findByRole('button', { name: /cancel order/i })).toBeInTheDocument()
  })

  it('"Cancel Order" button is visible for a processing order', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ orders: [processingOrder] }),
      })
    )

    renderPage()

    expect(await screen.findByRole('button', { name: /cancel order/i })).toBeInTheDocument()
  })

  it('"Cancel Order" button is NOT present for a shipped order', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ orders: [shippedOrder] }),
      })
    )

    renderPage()

    await screen.findAllByText('In Transit') // wait for render
    expect(screen.queryByRole('button', { name: /cancel order/i })).not.toBeInTheDocument()
  })

  it('clicking "Cancel Order" shows confirmation row with "Are you sure?", "Yes, cancel", and "Keep order"', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ orders: [pendingOrder] }),
      })
    )

    renderPage()

    await userEvent.click(await screen.findByRole('button', { name: /cancel order/i }))

    expect(screen.getByText(/are you sure/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /yes, cancel/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /keep order/i })).toBeInTheDocument()
  })

  it('clicking "Keep order" hides confirmation and shows "Cancel Order" button again', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ orders: [pendingOrder] }),
      })
    )

    renderPage()

    await userEvent.click(await screen.findByRole('button', { name: /cancel order/i }))
    expect(screen.getByRole('button', { name: /keep order/i })).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: /keep order/i }))

    expect(screen.queryByRole('button', { name: /keep order/i })).not.toBeInTheDocument()
    expect(screen.queryByText(/are you sure/i)).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: /cancel order/i })).toBeInTheDocument()
  })

  it('clicking "Yes, cancel" calls PATCH and on success the order moves out of Current Orders', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ orders: [pendingOrder] }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ message: 'Order cancelled successfully' }),
      })
    vi.stubGlobal('fetch', fetchMock)

    renderPage()

    await userEvent.click(await screen.findByRole('button', { name: /cancel order/i }))
    await userEvent.click(screen.getByRole('button', { name: /yes, cancel/i }))

    // After cancellation the order is no longer in Current Orders (Cancel Order button gone)
    expect(await screen.findByText(/no active orders/i)).toBeInTheDocument()

    // Verify PATCH was called with the right URL
    const patchCall = fetchMock.mock.calls.find(
      (call) =>
        typeof call[0] === 'string' && call[0].includes(`/api/orders/${pendingOrder.id}/cancel`)
    )
    expect(patchCall).toBeDefined()
    expect(patchCall[1].method).toBe('PATCH')
  })

  it('shows an error message when the cancel API returns an error', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ orders: [pendingOrder] }),
        })
        .mockResolvedValueOnce({
          ok: false,
          json: async () => ({ error: 'Order cannot be cancelled once it is in transit.' }),
        })
    )

    renderPage()

    await userEvent.click(await screen.findByRole('button', { name: /cancel order/i }))
    await userEvent.click(screen.getByRole('button', { name: /yes, cancel/i }))

    expect(
      await screen.findByText(/order cannot be cancelled once it is in transit/i)
    ).toBeInTheDocument()
  })
})
