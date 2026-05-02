import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useTheme } from '../../context/ThemeContext'
import { SunIcon, MoonIcon } from '../../components/icons'
import API_BASE from '../../api'

const wrapperCls = 'flex min-h-svh items-center justify-center p-6 bg-[var(--bg)]'
const cardCls =
  'relative z-10 w-full max-w-sm rounded-[20px] border border-[var(--glass-border)] bg-[var(--card-bg)] p-10 shadow-[var(--shadow)] backdrop-blur-xl'
const inputCls =
  'border-[var(--border)] bg-[var(--bg)] text-[var(--text-h)] placeholder:text-[var(--text)]/40 focus-visible:ring-purple-400/40 focus-visible:border-purple-400'

function ResetPasswordPage({ onBack }) {
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token')

  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const { theme, toggleTheme } = useTheme()

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }
    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters.')
      return
    }

    setLoading(true)
    try {
      const res = await fetch(`${API_BASE}/api/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, newPassword }),
      })
      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Something went wrong')
      } else {
        setSuccess(true)
      }
    } catch {
      setError('Could not connect to server')
    } finally {
      setLoading(false)
    }
  }

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
      type="button"
      onClick={toggleTheme}
      className="fixed top-6 right-6 z-[200] flex h-10 w-10 cursor-pointer items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--card-bg)] text-[var(--text-h)] shadow-[var(--shadow)] backdrop-blur-xl transition-all hover:border-purple-400/40 hover:bg-purple-400/12 hover:text-purple-400"
      aria-label={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
    >
      {theme === 'dark' ? <SunIcon /> : <MoonIcon />}
    </button>
  )

  if (!token) {
    return (
      <div className={wrapperCls}>
        {ambientBg}
        {themeToggle}
        <div className={cardCls}>
          <h1 className="mb-7 text-center text-3xl font-medium text-[var(--text-h)]">
            Invalid link
          </h1>
          <p className="mb-6 text-[var(--text)]">
            This password reset link is invalid or has expired. Please request a new one.
          </p>
          <Button
            type="button"
            onClick={onBack}
            className="w-full bg-purple-400 text-white hover:bg-purple-300"
          >
            Back to sign in
          </Button>
        </div>
      </div>
    )
  }

  if (success) {
    return (
      <div className={wrapperCls}>
        {ambientBg}
        {themeToggle}
        <div className={cardCls}>
          <h1 className="mb-7 text-center text-3xl font-medium text-[var(--text-h)]">
            Password reset
          </h1>
          <p className="mb-6 text-[var(--text)]">
            Your password has been reset successfully. You can now sign in with your new password.
          </p>
          <Button
            type="button"
            onClick={onBack}
            className="w-full bg-purple-400 text-white hover:bg-purple-300"
          >
            Sign in
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className={wrapperCls}>
      {ambientBg}
      {themeToggle}
      <div className={cardCls}>
        <h1 className="mb-7 text-center text-3xl font-medium text-[var(--text-h)]">
          Set new password
        </h1>
        <p className="mb-6 text-left text-[var(--text)]">Enter your new password below.</p>

        <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="reset-pw" className="text-[var(--text-h)]">
              New Password
            </Label>
            <Input
              id="reset-pw"
              type="password"
              autoComplete="new-password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              placeholder="••••••••"
              className={inputCls}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="reset-pw-confirm" className="text-[var(--text-h)]">
              Confirm Password
            </Label>
            <Input
              id="reset-pw-confirm"
              type="password"
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
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
            {loading ? 'Resetting…' : 'Reset password'}
          </Button>
        </form>

        <div className="mt-5 flex flex-col items-center gap-2">
          <button
            type="button"
            onClick={onBack}
            className="cursor-pointer border-0 bg-transparent p-0 text-sm text-purple-400 underline underline-offset-2 hover:opacity-75"
          >
            Back to sign in
          </button>
        </div>
      </div>
    </div>
  )
}

export default ResetPasswordPage
