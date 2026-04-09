import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { vi } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import CartPage from '../src/pages/cart/CartPage'

const cartItem = { id: 1, name: 'Widget', price: '19.99', quantity: 2 }

const defaultProps = {
  onBack: vi.fn(),
  cartItems: [cartItem],
  onRemove: vi.fn(),
  onUpdateQuantity: vi.fn(),
  isLoggedIn: true,
  token: 'fake-token',
}

function renderPage(props = {}) {
  return render(
    <MemoryRouter>
      <CartPage {...defaultProps} {...props} />
    </MemoryRouter>
  )
}

describe('CartPage', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('shows empty state when cartItems is empty', () => {
    renderPage({ cartItems: [] })

    expect(screen.getByText(/your cart is empty/i)).toBeInTheDocument()
  })

  it('shows Start Shopping button in empty state', () => {
    renderPage({ cartItems: [] })

    expect(screen.getByRole('button', { name: /start shopping/i })).toBeInTheDocument()
  })

  it('renders item name and price when cart has items', () => {
    renderPage()

    expect(screen.getByText('Widget')).toBeInTheDocument()
    expect(screen.getByText('$19.99')).toBeInTheDocument()
  })

  it('renders quantity controls for each item', () => {
    renderPage()

    expect(screen.getByRole('button', { name: /decrease quantity/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /increase quantity/i })).toBeInTheDocument()
  })

  it('calls onUpdateQuantity with decremented value when minus is clicked', async () => {
    const onUpdateQuantity = vi.fn()
    renderPage({ onUpdateQuantity })

    await userEvent.click(screen.getByRole('button', { name: /decrease quantity/i }))

    expect(onUpdateQuantity).toHaveBeenCalledWith(1, 1)
  })

  it('calls onUpdateQuantity with incremented value when plus is clicked', async () => {
    const onUpdateQuantity = vi.fn()
    renderPage({ onUpdateQuantity })

    await userEvent.click(screen.getByRole('button', { name: /increase quantity/i }))

    expect(onUpdateQuantity).toHaveBeenCalledWith(1, 3)
  })

  it('calls onRemove when remove button is clicked', async () => {
    const onRemove = vi.fn()
    renderPage({ onRemove })

    await userEvent.click(screen.getByRole('button', { name: /remove item/i }))

    expect(onRemove).toHaveBeenCalledWith(1)
  })

  it('shows "Login to Checkout" button when not logged in', () => {
    renderPage({ isLoggedIn: false })

    expect(screen.getByRole('button', { name: /login to checkout/i })).toBeInTheDocument()
  })

  it('shows "Proceed to Checkout" button when logged in', () => {
    renderPage()

    expect(screen.getByRole('button', { name: /proceed to checkout/i })).toBeInTheDocument()
  })

  it('shows "Reserving stock" while reserve request is in flight', async () => {
    vi.stubGlobal('fetch', vi.fn().mockReturnValue(new Promise(() => {})))

    renderPage()

    await userEvent.click(screen.getByRole('button', { name: /proceed to checkout/i }))

    expect(await screen.findByRole('button', { name: /reserving stock/i })).toBeInTheDocument()
  })

  it('disables checkout button while reserving', async () => {
    vi.stubGlobal('fetch', vi.fn().mockReturnValue(new Promise(() => {})))

    renderPage()

    await userEvent.click(screen.getByRole('button', { name: /proceed to checkout/i }))

    const button = await screen.findByRole('button', { name: /reserving stock/i })
    expect(button).toBeDisabled()
  })

  it('shows unavailable item error message on 409 response', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        json: async () => ({
          error: 'Some items are out of stock',
          unavailable: [{ name: 'Widget', available: 2, requested: 5, product_id: 1 }],
        }),
      })
    )

    renderPage()

    await userEvent.click(screen.getByRole('button', { name: /proceed to checkout/i }))

    expect(await screen.findByText(/widget: only 2 left/i)).toBeInTheDocument()
  })

  it('shows generic error message on failed reserve without unavailable list', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        json: async () => ({ error: 'Cart is empty' }),
      })
    )

    renderPage()

    await userEvent.click(screen.getByRole('button', { name: /proceed to checkout/i }))

    expect(await screen.findByText(/cart is empty/i)).toBeInTheDocument()
  })

  it('shows network error message when fetch throws', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Network error')))

    renderPage()

    await userEvent.click(screen.getByRole('button', { name: /proceed to checkout/i }))

    expect(await screen.findByText(/network error/i)).toBeInTheDocument()
  })

  it('shows order summary with correct total including shipping', () => {
    renderPage()

    // 2 items at $19.99 = $39.98, plus $4.99 shipping = $44.97
    expect(screen.getByText('$44.97')).toBeInTheDocument()
  })

  it('shows free shipping when total is $50 or more', () => {
    const expensiveItem = { id: 2, name: 'Expensive', price: '30.00', quantity: 2 }
    renderPage({ cartItems: [expensiveItem] })

    expect(screen.getByText('Free')).toBeInTheDocument()
  })

  it('calls onBack when Back button is clicked', async () => {
    const onBack = vi.fn()
    renderPage({ onBack })

    await userEvent.click(screen.getByRole('button', { name: /back/i }))

    expect(onBack).toHaveBeenCalledOnce()
  })
})
