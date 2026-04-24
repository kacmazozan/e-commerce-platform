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

const defaultProps = {
  onBack: vi.fn(),
  wishlistItems: [regularItem],
  onRemove: vi.fn(),
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

  it('"Go to item" link is rendered for each wishlist item', () => {
    renderPage()

    expect(screen.getByRole('link', { name: /go to item/i })).toBeInTheDocument()
  })

  it('"Go to item" link points to /product/1 for item with id 1', () => {
    renderPage()

    const link = screen.getByRole('link', { name: /go to item/i })
    expect(link).toHaveAttribute('href', '/product/1')
  })

  it('item name is a link pointing to /product/1', () => {
    renderPage()

    const nameLink = screen.getByRole('link', { name: 'Widget' })
    expect(nameLink).toBeInTheDocument()
    expect(nameLink).toHaveAttribute('href', '/product/1')
  })

  it('item image area is a link pointing to /product/1', () => {
    renderPage()

    // The image area link wraps the first letter of the item name as an accessible indicator.
    // Query all links and find the one pointing to /product/1 that is NOT the name or go-to-item link.
    const allLinks = screen.getAllByRole('link')
    const productLinks = allLinks.filter((l) => l.getAttribute('href') === '/product/1')
    // There should be 3 links to /product/1: image area, name, and "Go to item"
    expect(productLinks.length).toBe(3)
  })
})
