import { useState } from 'react'
import API_BASE from '../../api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { decodeJwtPayload } from '../../utils/jwt'

function PMLoginPage({ onLogin }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const res = await fetch(`${API_BASE}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })
      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Login failed')
        return
      }

      const payload = decodeJwtPayload(data.token)
      if (!payload || payload.role !== 'product_manager') {
        setError('Access denied. Product manager credentials required.')
        return
      }

      onLogin(data.token)
    } catch {
      setError('Could not connect to server')
    } finally {
      setLoading(false)
    }
  }

  const inputCls =
    'border-white/10 bg-white/5 text-[#f3eeff] placeholder:text-white/30 focus-visible:ring-purple-400/40 focus-visible:border-purple-400'

  return (
    <div className="flex min-h-svh items-center justify-center bg-[linear-gradient(170deg,#120b1c_0%,#1a0f2a_40%,#13101a_70%,#0e0d1e_100%)] p-6">
      <div className="w-full max-w-sm rounded-[20px] border border-white/15 bg-white/8 p-10 shadow-[0_4px_12px_rgba(0,0,0,0.2),inset_0_1px_0_rgba(255,255,255,0.14)] backdrop-blur-xl">
        <h1 className="mb-2 text-center text-3xl font-medium text-[#f3eeff]">Product Manager</h1>
        <p className="mb-7 text-center text-sm text-[rgba(200,178,255,0.82)]">
          Sign in with your product manager account
        </p>

        <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="pm-email" className="text-[#f3eeff]">
              Email
            </Label>
            <Input
              id="pm-email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="manager@example.com"
              className={inputCls}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="pm-password" className="text-[#f3eeff]">
              Password
            </Label>
            <Input
              id="pm-password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
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
            className="mt-1 w-full bg-purple-400 text-[#0e0d1e] hover:bg-purple-300 disabled:opacity-55"
          >
            {loading ? 'Signing in…' : 'Sign in'}
          </Button>
        </form>

        <button
          type="button"
          onClick={() => (window.location.href = '/')}
          className="mx-auto mt-5 block cursor-pointer border-0 bg-transparent p-0 text-sm text-purple-400 underline underline-offset-2 hover:opacity-75"
        >
          Back to store
        </button>
      </div>
    </div>
  )
}

export default PMLoginPage
