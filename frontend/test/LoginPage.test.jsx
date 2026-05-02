import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { vi } from 'vitest'
import LoginPage from '../src/pages/auth/LoginPage'
import { ThemeProvider } from '../src/context/ThemeContext'

function renderLogin(props = {}) {
  return render(
    <ThemeProvider>
      <LoginPage onLogin={vi.fn()} onForgotPassword={vi.fn()} onRegister={vi.fn()} {...props} />
    </ThemeProvider>
  )
}

describe('LoginPage', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('renders email and password fields', () => {
    renderLogin()

    expect(screen.getByLabelText(/email/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument()
  })

  it('renders the sign in button', () => {
    renderLogin()

    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument()
  })

  it('calls onRegister when "Create a new account" is clicked', async () => {
    const onRegister = vi.fn()
    renderLogin({ onRegister })

    await userEvent.click(screen.getByRole('button', { name: /create a new account/i }))

    expect(onRegister).toHaveBeenCalledOnce()
  })

  it('calls onForgotPassword when "Forgot password?" is clicked', async () => {
    const onForgotPassword = vi.fn()
    renderLogin({ onForgotPassword })

    await userEvent.click(screen.getByRole('button', { name: /forgot password/i }))

    expect(onForgotPassword).toHaveBeenCalledOnce()
  })

  it('shows an error message when login fails', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      json: async () => ({ error: 'Invalid credentials' }),
    })

    renderLogin()

    await userEvent.type(screen.getByLabelText(/email/i), 'test@example.com')
    await userEvent.type(screen.getByLabelText(/password/i), 'wrongpassword')
    await userEvent.click(screen.getByRole('button', { name: /sign in/i }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Invalid credentials')
  })

  it('calls onLogin with token on successful login', async () => {
    const onLogin = vi.fn()
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ token: 'fake-jwt-token' }),
    })

    renderLogin({ onLogin })

    await userEvent.type(screen.getByLabelText(/email/i), 'test@example.com')
    await userEvent.type(screen.getByLabelText(/password/i), 'password123')
    await userEvent.click(screen.getByRole('button', { name: /sign in/i }))

    expect(onLogin).toHaveBeenCalledWith('fake-jwt-token')
  })

  it('shows resend verification action when email is not verified', async () => {
    globalThis.fetch = vi
      .fn()
      .mockResolvedValueOnce({
        ok: false,
        json: async () => ({
          code: 'EMAIL_NOT_VERIFIED',
          error: 'Please verify your email before signing in.',
          email: 'test@example.com',
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          message: 'If that account needs verification, a new link has been sent.',
        }),
      })

    renderLogin()

    await userEvent.type(screen.getByLabelText(/email/i), 'test@example.com')
    await userEvent.type(screen.getByLabelText(/password/i), 'password123')
    await userEvent.click(screen.getByRole('button', { name: /sign in/i }))

    expect(await screen.findByRole('status')).toHaveTextContent(
      'Please verify your email before signing in.'
    )

    await userEvent.click(screen.getByRole('button', { name: /send verification email again/i }))

    expect(globalThis.fetch).toHaveBeenLastCalledWith(
      expect.stringContaining('/api/auth/resend-verification'),
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ email: 'test@example.com' }),
      })
    )
  })
})
