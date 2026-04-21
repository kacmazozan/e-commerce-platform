import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { vi } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import WishlistPage from '../src/pages/wishlist/WishlistPage'

const regularItem = { id: 1, name: 'Widget', price: '19.99', available_stock: '5' }
const discountedItem = {
  id: 2,
  name: 'Sale Item',
  price: '20.00',
  discounted_price: '16.00',
  discount_percent: 20,
  available_stock: '3',
}
const outOfStockItem = { id: 3, name: 'Gone', price: '10.00', available_stock: '0' }

const defaultProps = {
  onBack: vi.fn(),
  wishlistItems: [regularItem],
  onRemove: vi.fn(),
  onAddToCart: vi.fn(),
  onRemoveFromCart: vi.fn(),
  cartItems: [],
}

function renderPage(props = {}) {
  return render(
    <MemoryRouter>
      <WishlistPage {...defaultProps} {...props} />
    </MemoryRouter>
  )
}

describe('WishlistPage', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('renders "Your wishlist is empty" when wishlistItems is empty', () => {
    renderPage({ wishlistItems: [] })

    expect(screen.getByText(/your wishlist is empty/i)).toBeInTheDocument()
  })

  it('renders "Start Shopping" button in empty state', () => {
    renderPage({ wishlistItems: [] })

    expect(screen.getByRole('button', { name: /start shopping/i })).toBeInTheDocument()
  })

  it('calls onBack when "Start Shopping" button is clicked in empty state', async () => {
    const onBack = vi.fn()
    renderPage({ wishlistItems: [], onBack })

    await userEvent.click(screen.getByRole('button', { name: /start shopping/i }))

    expect(onBack).toHaveBeenCalledOnce()
  })

  it('renders item name and price', () => {
    renderPage()

    expect(screen.getByText('Widget')).toBeInTheDocument()
    expect(screen.getByText('$19.99')).toBeInTheDocument()
  })

  it('renders discounted item with strikethrough original price and discounted price', () => {
    renderPage({ wishlistItems: [discountedItem] })

    expect(screen.getByText('$20.00')).toBeInTheDocument()
    expect(screen.getByText('$16.00')).toBeInTheDocument()
  })

  it('renders "Add to Cart" button for in-stock item not in cart', () => {
    renderPage()

    expect(screen.getByRole('button', { name: /add to cart/i })).toBeInTheDocument()
  })

  it('calls onAddToCart with item when "Add to Cart" is clicked', async () => {
    const onAddToCart = vi.fn()
    renderPage({ onAddToCart })

    await userEvent.click(screen.getByRole('button', { name: /add to cart/i }))

    expect(onAddToCart).toHaveBeenCalledWith(regularItem)
  })

  it('renders "Remove from Cart" button when item is already in cart', () => {
    renderPage({ cartItems: [{ id: 1 }] })

    expect(screen.getByRole('button', { name: /remove from cart/i })).toBeInTheDocument()
  })

  it('calls onRemoveFromCart with item id when "Remove from Cart" is clicked', async () => {
    const onRemoveFromCart = vi.fn()
    renderPage({ cartItems: [{ id: 1 }], onRemoveFromCart })

    await userEvent.click(screen.getByRole('button', { name: /remove from cart/i }))

    expect(onRemoveFromCart).toHaveBeenCalledWith(1)
  })

  it('renders disabled "Out of Stock" button for out-of-stock item', () => {
    renderPage({ wishlistItems: [outOfStockItem] })

    const btn = screen.getByRole('button', { name: /out of stock/i })
    expect(btn).toBeInTheDocument()
    expect(btn).toBeDisabled()
  })

  it('renders trash button for each item', () => {
    renderPage()

    expect(screen.getByRole('button', { name: /remove from wishlist/i })).toBeInTheDocument()
  })

  it('calls onRemove with item id when trash button is clicked', async () => {
    const onRemove = vi.fn()
    renderPage({ onRemove })

    await userEvent.click(screen.getByRole('button', { name: /remove from wishlist/i }))

    expect(onRemove).toHaveBeenCalledWith(1)
  })

  it('calls onBack when Back button is clicked', async () => {
    const onBack = vi.fn()
    renderPage({ onBack })

    await userEvent.click(screen.getByRole('button', { name: /back/i }))

    expect(onBack).toHaveBeenCalledOnce()
  })
})
