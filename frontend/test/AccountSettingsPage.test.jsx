import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { vi } from 'vitest'
import AccountSettingsPage from '../src/pages/account/AccountSettingsPage'
import { ThemeProvider } from '../src/context/ThemeContext'

function renderAccountSettings(props = {}) {
  return render(
    <ThemeProvider>
      <AccountSettingsPage token="customer-token" onProfileUpdate={vi.fn()} {...props} />
    </ThemeProvider>
  )
}

describe('AccountSettingsPage payment cards and address', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('saves a new payment card from account settings', async () => {
    globalThis.fetch = vi.fn((url, options = {}) => {
      if (String(url).includes('/api/auth/me')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            email: 'user@example.com',
            name: 'User',
            tax_id: '',
            home_address: '',
          }),
        })
      }
      if (String(url).includes('/api/payment-methods') && options.method === 'POST') {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            paymentMethod: {
              id: 3,
              brand: 'VISA',
              last4: '4242',
              cardholderName: 'Jane Smith',
              expiry: '12/40',
              isDefault: true,
              expired: false,
            },
          }),
        })
      }
      if (String(url).includes('/api/payment-methods')) {
        return Promise.resolve({ ok: true, json: async () => ({ paymentMethods: [] }) })
      }
      return Promise.resolve({ ok: true, json: async () => ({}) })
    })

    renderAccountSettings()

    expect(await screen.findByText(/no saved cards yet/i)).toBeInTheDocument()
    await userEvent.type(screen.getByLabelText(/cardholder name/i), 'Jane Smith')
    await userEvent.type(screen.getByLabelText(/card number/i), '4242424242424242')
    await userEvent.type(screen.getByLabelText(/expiry/i), '1240')
    await userEvent.click(screen.getByRole('button', { name: /save card/i }))

    expect(await screen.findByText(/visa ending in 4242/i)).toBeInTheDocument()
    const postCall = globalThis.fetch.mock.calls.find(
      (call) => String(call[0]).includes('/api/payment-methods') && call[1]?.method === 'POST'
    )
    expect(JSON.parse(postCall[1].body)).toMatchObject({
      cardholderName: 'Jane Smith',
      cardNumber: '4242 4242 4242 4242',
      expiry: '12/40',
    })
  })

  it('persists the default shipping address', async () => {
    globalThis.fetch = vi.fn((url) => {
      if (String(url).includes('/api/auth/me/address')) {
        return Promise.resolve({ ok: true, json: async () => ({ home_address: '123 Main' }) })
      }
      if (String(url).includes('/api/auth/me')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            email: 'user@example.com',
            name: 'User',
            tax_id: '',
            home_address: '',
          }),
        })
      }
      if (String(url).includes('/api/payment-methods')) {
        return Promise.resolve({ ok: true, json: async () => ({ paymentMethods: [] }) })
      }
      return Promise.resolve({ ok: true, json: async () => ({}) })
    })

    renderAccountSettings()
    await screen.findByText(/no saved cards yet/i)

    await userEvent.type(screen.getByLabelText(/address line 1/i), '123 Main Street')
    await userEvent.type(screen.getByLabelText(/city/i), 'Berlin')
    await userEvent.type(screen.getByLabelText(/postcode/i), '10115')
    await userEvent.type(screen.getByLabelText(/country/i), 'Germany')
    await userEvent.click(screen.getByRole('button', { name: /save address/i }))

    await waitFor(() => expect(screen.getByText(/address saved/i)).toBeInTheDocument())
    const addressCall = globalThis.fetch.mock.calls.find((call) =>
      String(call[0]).includes('/api/auth/me/address')
    )
    expect(JSON.parse(addressCall[1].body)).toEqual({
      home_address: '123 Main Street\nBerlin 10115\nGermany',
    })
  })
})
