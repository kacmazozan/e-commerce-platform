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
})
