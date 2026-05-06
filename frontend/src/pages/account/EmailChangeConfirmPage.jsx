import { useEffect, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { useTheme } from '../../context/ThemeContext'
import { SunIcon, MoonIcon } from '../../components/icons'
import API_BASE from '../../api'

const wrapperCls = 'flex min-h-svh items-center justify-center p-6 bg-[var(--bg)]'
const cardCls =
  'relative z-10 w-full max-w-sm rounded-[20px] border border-[var(--glass-border)] bg-[var(--card-bg)] p-10 shadow-[var(--shadow)] backdrop-blur-xl'

export default function EmailChangeConfirmPage({ onLogout }) {
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token')
  const step = searchParams.get('step')
  const navigate = useNavigate()

  const [status, setStatus] = useState(
    token && (step === 'old' || step === 'new') ? 'verifying' : 'invalid'
  )
  const [message, setMessage] = useState('')
  const [complete, setComplete] = useState(false)
  const hasCalled = useRef(false)
  const { theme, toggleTheme } = useTheme()

  useEffect(() => {
    if (status !== 'verifying' || hasCalled.current) return
    hasCalled.current = true

    async function confirm() {
      try {
        const res = await fetch(`${API_BASE}/api/auth/email-change/confirm`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ step, token }),
        })
        const data = await res.json().catch(() => ({}))

        if (!res.ok) {
          setStatus('error')
          setMessage(data.error || 'This link is invalid or has expired.')
          return
        }

        setStatus('success')
        setComplete(!!data.complete)
        if (data.complete) {
          setMessage('Email change complete. Please sign in with your new address.')
        } else if (step === 'old') {
          setMessage('Approval recorded. Now click the link in your new inbox to finish.')
        } else {
          setMessage('New email verified. Now click the link in your old inbox to finish.')
        }
      } catch {
        setStatus('error')
        setMessage('Could not connect to server')
      }
    }

    confirm()
  }, [status, step, token])

  function handleContinue() {
    if (complete) {
      if (onLogout) onLogout()
      navigate('/login', { replace: true })
    } else {
      navigate('/account-settings', { replace: true })
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

  const title =
    status === 'success'
      ? complete
        ? 'Email change complete'
        : 'One step left'
      : status === 'verifying'
        ? 'Confirming…'
        : 'Invalid link'

  const body =
    status === 'verifying'
      ? 'Please wait while we confirm your email change.'
      : message || 'This link is invalid or has expired.'

  const buttonLabel = complete ? 'Sign in' : 'Back to account settings'

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
          onClick={handleContinue}
          className="w-full bg-purple-400 text-white hover:bg-purple-300"
        >
          {buttonLabel}
        </Button>
      </div>
    </div>
  )
}
