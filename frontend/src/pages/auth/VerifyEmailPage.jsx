import { useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { useTheme } from '../../context/ThemeContext'
import { SunIcon, MoonIcon } from '../../components/icons'
import API_BASE from '../../api'

const wrapperCls = 'flex min-h-svh items-center justify-center p-6 bg-[var(--bg)]'
const cardCls =
  'relative z-10 w-full max-w-sm rounded-[20px] border border-[var(--glass-border)] bg-[var(--card-bg)] p-10 shadow-[var(--shadow)] backdrop-blur-xl'

function VerifyEmailPage({ onBack }) {
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token')
  const [status, setStatus] = useState(token ? 'verifying' : 'invalid')
  const [message, setMessage] = useState('')
  const hasVerified = useRef(false)
  const { theme, toggleTheme } = useTheme()

  useEffect(() => {
    if (!token || hasVerified.current) return
    hasVerified.current = true

    async function verifyEmail() {
      try {
        const res = await fetch(`${API_BASE}/api/auth/verify-email`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token }),
        })
        const data = await res.json()

        if (!res.ok) {
          setStatus('error')
          setMessage(data.error || 'This verification link is invalid or has expired.')
        } else {
          setStatus('success')
          setMessage(data.message || 'Email verified successfully. You can now sign in.')
        }
      } catch {
        setStatus('error')
        setMessage('Could not connect to server')
      }
    }

    verifyEmail()
  }, [token])

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

  const title =
    status === 'success'
      ? 'Email verified'
      : status === 'verifying'
        ? 'Verifying email'
        : 'Invalid link'
  const body =
    status === 'verifying'
      ? 'Please wait while we verify your email address.'
      : message || 'This verification link is invalid or has expired.'

  return (
    <div className={wrapperCls}>
      {ambientBg}
      {themeToggle}
      <div className={cardCls}>
        <h1 className="mb-7 text-center text-3xl font-medium text-[var(--text-h)]">{title}</h1>
        <p className="mb-6 text-[var(--text)]" role={status === 'error' ? 'alert' : 'status'}>
          {body}
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

export default VerifyEmailPage
