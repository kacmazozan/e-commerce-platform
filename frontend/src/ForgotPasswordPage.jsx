import { useState } from 'react'
import './LoginPage.css'

function ForgotPasswordPage({ onBack }) {
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const res = await fetch('http://localhost:3000/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      const data = await res.json()

      if (!res.ok) {
        setError(data.message || 'Something went wrong')
      } else {
        setSubmitted(true)
      }
    } catch {
      setError('Could not connect to server')
    } finally {
      setLoading(false)
    }
  }

  if (submitted) {
    return (
      <div className="login-wrapper">
        <div className="login-card">
          <h1>Check your email</h1>
          <p style={{ marginBottom: '24px', color: 'var(--text)' }}>
            If an account exists for <strong>{email}</strong>, you'll receive a
            password reset link shortly.
          </p>
          <button className="login-btn" onClick={onBack}>Back to sign in</button>
        </div>
      </div>
    )
  }

  return (
    <div className="login-wrapper">
      <div className="login-card">
        <h1>Reset password</h1>
        <p style={{ marginBottom: '24px', color: 'var(--text)', textAlign: 'left' }}>
          Enter your email and we'll send you a link to reset your password.
        </p>
        <form onSubmit={handleSubmit} noValidate>
          <div className="field">
            <label htmlFor="forgot-email">Email</label>
            <input
              id="forgot-email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="you@example.com"
            />
          </div>
          {error && <p className="login-error" role="alert">{error}</p>}
          <button type="submit" className="login-btn" disabled={loading}>
            {loading ? 'Sending…' : 'Send reset link'}
          </button>
        </form>
        <div className="login-links">
          <button type="button" className="link-btn" onClick={onBack}>
            Back to sign in
          </button>
        </div>
      </div>
    </div>
  )
}

export default ForgotPasswordPage
