import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useTheme } from '../../context/ThemeContext'
import { SunIcon, MoonIcon } from '../../components/icons'
import API_BASE from '../../api'

function RegisterPage({ onBack, onSignup }) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { theme, toggleTheme } = useTheme()

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')

    if (password !== confirm) {
      setError('Passwords do not match')
      return
    }

    setLoading(true)
    try {
      const res = await fetch(`${API_BASE}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password }),
      })
      const data = await res.json()

      if (!res.ok) {
        setError(data.message || 'Registration failed')
      } else {
        onSignup(data.token)
      }
    } catch {
      setError('Could not connect to server')
    } finally {
      setLoading(false)
    }
  }

  const wrapperCls = 'flex min-h-svh items-center justify-center p-6 bg-[var(--bg)]'
  const cardCls =
    'relative z-10 w-full max-w-sm rounded-[20px] border border-[var(--glass-border)] bg-[var(--card-bg)] p-10 shadow-[var(--shadow)] backdrop-blur-xl'
  const inputCls =
    'border-[var(--border)] bg-[var(--bg)] text-[var(--text-h)] placeholder:text-[var(--text)]/40 focus-visible:ring-purple-400/40 focus-visible:border-purple-400'

  const ambientBg = (
    <div
      className="pointer-events-none fixed inset-0 z-0 overflow-hidden"
      style={{
        background:
          'linear-gradient(170deg, var(--bg) 0%, var(--bg-gradient-to) 25%, var(--accent-bg) 50%, var(--bg-gradient-to) 75%, var(--bg) 100%)',
      }}
      aria-hidden="true"
    />
  )

  const themeToggle = (
    <button
      onClick={toggleTheme}
      className="fixed top-6 right-6 z-[200] flex h-10 w-10 cursor-pointer items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--card-bg)] text-[var(--text-h)] shadow-[var(--shadow)] backdrop-blur-xl transition-all hover:border-purple-400/40 hover:bg-purple-400/12 hover:text-purple-400"
      aria-label={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
    >
      {theme === 'dark' ? <SunIcon /> : <MoonIcon />}
    </button>
  )

  return (
    <div className={wrapperCls}>
      {ambientBg}
      {themeToggle}
      <div className={cardCls}>
        <h1 className="mb-7 text-center text-3xl font-medium text-[var(--text-h)]">
          Create account
        </h1>

        <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="reg-name" className="text-[var(--text-h)]">
              Name
            </Label>
            <Input
              id="reg-name"
              type="text"
              autoComplete="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              placeholder="Jane Smith"
              className={inputCls}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="reg-email" className="text-[var(--text-h)]">
              Email
            </Label>
            <Input
              id="reg-email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="you@example.com"
              className={inputCls}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="reg-password" className="text-[var(--text-h)]">
              Password
            </Label>
            <Input
              id="reg-password"
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="••••••••"
              className={inputCls}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="reg-confirm" className="text-[var(--text-h)]">
              Confirm password
            </Label>
            <Input
              id="reg-confirm"
              type="password"
              autoComplete="new-password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              required
              placeholder="••••••••"
              className={inputCls}
            />
          </div>

          {error && (
            <p className="text-sm text-red-400" role="alert">
              {error}
            </p>
          )}

          <Button
            type="submit"
            disabled={loading}
            className="mt-1 w-full bg-purple-400 text-white hover:bg-purple-300 disabled:opacity-55"
          >
            {loading ? 'Creating account…' : 'Create account'}
          </Button>
        </form>

        <div className="mt-5 flex flex-col items-center gap-2">
          <button
            type="button"
            onClick={onBack}
            className="cursor-pointer border-0 bg-transparent p-0 text-sm text-purple-400 underline underline-offset-2 hover:opacity-75"
          >
            Already have an account? Sign in
          </button>
        </div>
      </div>
    </div>
  )
}

export default RegisterPage
