import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { vi } from 'vitest'
import CheckoutPage from '../src/pages/checkout/CheckoutPage'
import { ThemeProvider } from '../src/context/ThemeContext'

const mocks = vi.hoisted(() => ({
  liveCartItems: [{ id: 1, name: 'Merino Sweater', quantity: 1, price: '10.00' }],
  refetchCart: vi.fn(),
}))

vi.mock('../src/hooks/useLiveCart', () => ({
  default: () => ({
    items: mocks.liveCartItems,
    refetch: mocks.refetchCart,
  }),
}))

const { liveCartItems, refetchCart } = mocks

function renderCheckout(props = {}) {
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString()
  return render(
    <ThemeProvider>
      <MemoryRouter initialEntries={[{ pathname: '/checkout', state: { expiresAt } }]}>
        <Routes>
          <Route
            path="/checkout"
            element={
              <CheckoutPage
                cartItems={liveCartItems}
                token="customer-token"
                onOrderConfirmed={vi.fn()}
                onCartRefresh={vi.fn()}
                {...props}
              />
            }
          />
          <Route path="/cart" element={<div>Cart</div>} />
        </Routes>
      </MemoryRouter>
    </ThemeProvider>
  )
}

describe('CheckoutPage payment methods', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    refetchCart.mockReset()
  })

  it('uses a saved card when placing an order', async () => {
    refetchCart.mockResolvedValue(liveCartItems)
    const onOrderConfirmed = vi.fn()
    globalThis.fetch = vi.fn((url) => {
      if (String(url).includes('/api/payment-methods')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            paymentMethods: [
              {
                id: 5,
                brand: 'VISA',
                last4: '4242',
                cardholderName: 'Jane Smith',
                expiry: '12/40',
                isDefault: true,
                expired: false,
              },
            ],
          }),
        })
      }
      if (String(url).includes('/api/auth/me')) {
        return Promise.resolve({ ok: true, json: async () => ({ home_address: '' }) })
      }
      if (String(url).includes('/api/checkout/confirm')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            order_id: 99,
            invoice_number: 'INV-2026-000099',
            customer_email: 'user@example.com',
            total: 10,
            shipping_cost: 4.99,
            items: liveCartItems,
          }),
        })
      }
      return Promise.resolve({ ok: true, json: async () => ({}) })
    })

    renderCheckout({ onOrderConfirmed })

    expect(await screen.findByText(/visa ending in 4242/i)).toBeInTheDocument()

    const janeFields = screen.getAllByPlaceholderText(/jane smith/i)
    await userEvent.type(janeFields[0], 'Jane Smith')
    await userEvent.type(screen.getByPlaceholderText(/123 main street/i), '123 Main Street')
    await userEvent.type(screen.getByPlaceholderText(/berlin/i), 'Berlin')
    await userEvent.type(screen.getByPlaceholderText(/bavaria/i), 'Bavaria')
    await userEvent.type(screen.getByPlaceholderText(/10115/i), '10115')
    await userEvent.type(screen.getByPlaceholderText(/germany/i), 'Germany')
    await userEvent.click(screen.getByRole('button', { name: /place order/i }))

    await waitFor(() => expect(onOrderConfirmed).toHaveBeenCalled())
    const confirmCall = globalThis.fetch.mock.calls.find((call) =>
      String(call[0]).includes('/api/checkout/confirm')
    )
    expect(JSON.parse(confirmCall[1].body)).toMatchObject({ paymentMethodId: 5 })
  })

  it('can submit a new card and request saving it', async () => {
    refetchCart.mockResolvedValue(liveCartItems)
    const onOrderConfirmed = vi.fn()
    globalThis.fetch = vi.fn((url) => {
      if (String(url).includes('/api/payment-methods')) {
        return Promise.resolve({ ok: true, json: async () => ({ paymentMethods: [] }) })
      }
      if (String(url).includes('/api/auth/me')) {
        return Promise.resolve({ ok: true, json: async () => ({ home_address: '' }) })
      }
      if (String(url).includes('/api/checkout/confirm')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            order_id: 100,
            invoice_number: 'INV-2026-000100',
            customer_email: 'user@example.com',
            total: 10,
            shipping_cost: 4.99,
            items: liveCartItems,
          }),
        })
      }
      return Promise.resolve({ ok: true, json: async () => ({}) })
    })

    renderCheckout({ onOrderConfirmed })

    const newCardJaneFields = screen.getAllByPlaceholderText(/jane smith/i)
    await userEvent.type(newCardJaneFields[0], 'Jane Smith')
    await userEvent.type(screen.getByPlaceholderText(/123 main street/i), '123 Main Street')
    await userEvent.type(screen.getByPlaceholderText(/berlin/i), 'Berlin')
    await userEvent.type(screen.getByPlaceholderText(/bavaria/i), 'Bavaria')
    await userEvent.type(screen.getByPlaceholderText(/10115/i), '10115')
    await userEvent.type(screen.getByPlaceholderText(/germany/i), 'Germany')
    await userEvent.type(newCardJaneFields[1], 'Jane Smith')
    await userEvent.type(screen.getByPlaceholderText(/1234 5678 9012 3456/i), '4242424242424242')
    await userEvent.type(screen.getByPlaceholderText(/mm\/yy/i), '1240')
    await userEvent.type(screen.getByPlaceholderText('123'), '123')
    await userEvent.click(screen.getByRole('checkbox', { name: /save this card/i }))
    await userEvent.click(screen.getByRole('button', { name: /place order/i }))

    await waitFor(() => expect(onOrderConfirmed).toHaveBeenCalled())
    const confirmCall = globalThis.fetch.mock.calls.find((call) =>
      String(call[0]).includes('/api/checkout/confirm')
    )
    expect(JSON.parse(confirmCall[1].body)).toMatchObject({
      savePaymentMethod: true,
      paymentMethod: {
        cardNumber: '4242 4242 4242 4242',
        cvv: '123',
      },
    })
  })
})
