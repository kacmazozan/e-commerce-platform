import { useEffect, useState } from 'react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import API_BASE from '../../api'
import { getInitial } from '../../utils/avatar'

function Section({ title, description, children }) {
  return (
    <div className="mb-10">
      <div className="mb-3.5">
        <h2 className="m-0 mb-1 text-[17px] font-bold text-[var(--text-h)]">{title}</h2>
        {description && <p className="m-0 text-[13px] text-[var(--text)]">{description}</p>}
      </div>
      <div className="rounded-2xl border border-[var(--glass-border)] bg-[var(--card-bg)] p-6 shadow-[var(--shadow)] backdrop-blur-xl">
        {children}
      </div>
    </div>
  )
}

function Toggle({ checked, onChange, label }) {
  return (
    <label className="flex cursor-pointer items-center justify-between border-b border-[var(--border)] py-3 first:pt-0 last:border-b-0 last:pb-0">
      <span className="text-sm text-[var(--text-h)]">{label}</span>
      <button
        role="switch"
        aria-checked={checked}
        className={`relative h-6 w-11 shrink-0 cursor-pointer rounded-full border-none transition-colors ${checked ? 'bg-purple-400' : 'bg-[var(--border)]'}`}
        onClick={() => onChange(!checked)}
        type="button"
      >
        <span
          className={`absolute top-[3px] left-[3px] h-[18px] w-[18px] rounded-full bg-white shadow-[0_1px_4px_rgba(0,0,0,0.2)] transition-transform ${checked ? 'translate-x-5' : ''}`}
        />
      </button>
    </label>
  )
}

function formatCardNumber(value) {
  const raw = value.replace(/\D/g, '')
  const isAmex = /^3[47]/.test(raw)
  if (isAmex) {
    const digits = raw.slice(0, 15)
    return digits.replace(/^(\d{0,4})(\d{0,6})(\d{0,5})$/, (_, a, b, c) =>
      [a, b, c].filter(Boolean).join(' ')
    )
  }
  return raw
    .slice(0, 16)
    .replace(/(.{4})/g, '$1 ')
    .trim()
}

function formatExpiry(value) {
  const digits = value.replace(/\D/g, '').slice(0, 4)
  if (digits.length >= 3) return `${digits.slice(0, 2)}/${digits.slice(2)}`
  return digits
}

function buildAddressString({ line1, line2, city, postcode, country }) {
  return [
    line1.trim(),
    line2.trim(),
    [city.trim(), postcode.trim()].filter(Boolean).join(' '),
    country.trim(),
  ]
    .filter(Boolean)
    .join('\n')
}

function applyAddressString(address, setters) {
  const lines = String(address || '')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
  setters.setLine1(lines[0] || '')
  if (lines.length >= 3) {
    const hasLine2 = lines.length >= 4
    const cityLine = (hasLine2 ? lines[2] : lines[1]).split(/\s+/)
    setters.setLine2(hasLine2 ? lines[1] : '')
    setters.setPostcode(cityLine.pop() || '')
    setters.setCity(cityLine.join(' '))
    setters.setCountry(hasLine2 ? lines[3] || '' : lines[2] || '')
  } else {
    setters.setLine2(lines[1] || '')
    setters.setCity('')
    setters.setPostcode('')
    setters.setCountry('')
  }
}

export default function AccountSettingsPage({ token, onProfileUpdate }) {
  // Profile
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [taxId, setTaxId] = useState('')
  const [pendingEmail, setPendingEmail] = useState(null)
  const [profileLoading, setProfileLoading] = useState(true)
  const [profileError, setProfileError] = useState('')
  const [profileSaving, setProfileSaving] = useState(false)
  const [profileSaved, setProfileSaved] = useState(false)

  // Email change
  const [newEmail, setNewEmail] = useState('')
  const [emailChangePassword, setEmailChangePassword] = useState('')
  const [emailChangeError, setEmailChangeError] = useState('')
  const [emailChangeSubmitting, setEmailChangeSubmitting] = useState(false)
  const [emailChangeSent, setEmailChangeSent] = useState(false)
  const [cancelSubmitting, setCancelSubmitting] = useState(false)

  // Password
  const [currentPw, setCurrentPw] = useState('')
  const [newPw, setNewPw] = useState('')
  const [confirmPw, setConfirmPw] = useState('')
  const [pwError, setPwError] = useState('')
  const [pwSaved, setPwSaved] = useState(false)
  const [pwLoading, setPwLoading] = useState(false)

  // Notifications
  const [notifOrderUpdates, setNotifOrderUpdates] = useState(true)
  const [notifPromotions, setNotifPromotions] = useState(false)
  const [notifNewArrivals, setNotifNewArrivals] = useState(true)
  const [notifSMS, setNotifSMS] = useState(false)

  // Address
  const [line1, setLine1] = useState('')
  const [line2, setLine2] = useState('')
  const [city, setCity] = useState('')
  const [postcode, setPostcode] = useState('')
  const [country, setCountry] = useState('')
  const [addressSaved, setAddressSaved] = useState(false)
  const [addressError, setAddressError] = useState('')
  const [addressSaving, setAddressSaving] = useState(false)

  // Payment methods
  const [paymentMethods, setPaymentMethods] = useState([])
  const [cardsLoading, setCardsLoading] = useState(true)
  const [cardsSaving, setCardsSaving] = useState(false)
  const [cardsError, setCardsError] = useState('')
  const [cardSaved, setCardSaved] = useState(false)
  const [cardForm, setCardForm] = useState({
    cardholderName: '',
    cardNumber: '',
    expiry: '',
    makeDefault: false,
  })

  async function loadProfile(signal) {
    setProfileLoading(true)
    setProfileError('')
    try {
      const res = await fetch(`${API_BASE}/api/auth/me`, {
        headers: { Authorization: `Bearer ${token}` },
        signal,
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || 'Failed to load profile')
      setName(data.name || '')
      setEmail(data.email || '')
      setTaxId(data.tax_id || '')
      setPendingEmail(data.pending_email || null)
      if (data.home_address) {
        applyAddressString(data.home_address, {
          setLine1,
          setLine2,
          setCity,
          setPostcode,
          setCountry,
        })
      }
    } catch (err) {
      if (err.name === 'AbortError') return
      setProfileError(err.message || 'Could not connect to server')
    } finally {
      setProfileLoading(false)
    }
  }

  async function loadPaymentMethods(signal) {
    setCardsLoading(true)
    setCardsError('')
    try {
      const res = await fetch(`${API_BASE}/api/payment-methods`, {
        headers: { Authorization: `Bearer ${token}` },
        signal,
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || 'Failed to load saved cards')
      setPaymentMethods(data.paymentMethods || [])
    } catch (err) {
      if (err.name === 'AbortError') return
      setCardsError(err.message || 'Could not connect to server')
    } finally {
      setCardsLoading(false)
    }
  }

  useEffect(() => {
    if (!token) {
      setProfileLoading(false)
      setCardsLoading(false)
      return
    }
    const controller = new AbortController()
    loadProfile(controller.signal)
    loadPaymentMethods(controller.signal)
    return () => controller.abort()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token])

  async function handleProfileSave(e) {
    e.preventDefault()
    setProfileError('')
    const trimmed = name.trim()
    if (!trimmed) {
      setProfileError('Name is required.')
      return
    }

    const trimmedTaxId = taxId.trim()
    if (trimmedTaxId.length > 50) {
      setProfileError('Tax ID must be 50 characters or fewer.')
      return
    }

    setProfileSaving(true)
    try {
      const res = await fetch(`${API_BASE}/api/auth/me`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ name: trimmed, tax_id: trimmedTaxId || null }),
      })
      const data = await res.json().catch(() => ({}))

      if (!res.ok) {
        setProfileError(data.error || 'Failed to update profile')
      } else {
        const savedName = data.name || trimmed
        setName(savedName)
        setTaxId(data.tax_id || '')
        if (onProfileUpdate) onProfileUpdate({ name: savedName })
        setProfileSaved(true)
        setTimeout(() => setProfileSaved(false), 2500)
      }
    } catch {
      setProfileError('Could not connect to server')
    } finally {
      setProfileSaving(false)
    }
  }

  async function handlePasswordSave(e) {
    e.preventDefault()
    setPwError('')
    if (newPw !== confirmPw) {
      setPwError('New passwords do not match.')
      return
    }
    if (newPw.length < 8) {
      setPwError('Password must be at least 8 characters.')
      return
    }

    setPwLoading(true)
    try {
      const res = await fetch(`${API_BASE}/api/auth/change-password`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ currentPassword: currentPw, newPassword: newPw }),
      })
      const data = await res.json()

      if (!res.ok) {
        setPwError(data.error || 'Failed to update password')
      } else {
        setPwSaved(true)
        setCurrentPw('')
        setNewPw('')
        setConfirmPw('')
        setTimeout(() => setPwSaved(false), 2500)
      }
    } catch {
      setPwError('Could not connect to server')
    } finally {
      setPwLoading(false)
    }
  }

  async function handleEmailChangeRequest(e) {
    e.preventDefault()
    setEmailChangeError('')
    setEmailChangeSent(false)

    const trimmed = newEmail.trim().toLowerCase()
    if (!trimmed || !emailChangePassword) {
      setEmailChangeError('New email and current password are required.')
      return
    }
    if (trimmed === email) {
      setEmailChangeError('New email matches your current email.')
      return
    }

    setEmailChangeSubmitting(true)
    try {
      const res = await fetch(`${API_BASE}/api/auth/email-change/request`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ newEmail: trimmed, currentPassword: emailChangePassword }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setEmailChangeError(data.error || 'Failed to request email change')
      } else {
        setPendingEmail(data.pending_email || trimmed)
        setNewEmail('')
        setEmailChangePassword('')
        setEmailChangeSent(true)
      }
    } catch {
      setEmailChangeError('Could not connect to server')
    } finally {
      setEmailChangeSubmitting(false)
    }
  }

  async function handleEmailChangeCancel() {
    setEmailChangeError('')
    setCancelSubmitting(true)
    try {
      const res = await fetch(`${API_BASE}/api/auth/email-change/cancel`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setEmailChangeError(data.error || 'Failed to cancel pending change')
      } else {
        setPendingEmail(null)
        setEmailChangeSent(false)
      }
    } catch {
      setEmailChangeError('Could not connect to server')
    } finally {
      setCancelSubmitting(false)
    }
  }

  async function handleAddressSave(e) {
    e.preventDefault()
    setAddressError('')
    setAddressSaving(true)
    const homeAddress = buildAddressString({ line1, line2, city, postcode, country })

    try {
      const res = await fetch(`${API_BASE}/api/auth/me/address`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ home_address: homeAddress }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setAddressError(data.error || 'Failed to save address')
      } else {
        setAddressSaved(true)
        setTimeout(() => setAddressSaved(false), 2500)
      }
    } catch {
      setAddressError('Could not connect to server')
    } finally {
      setAddressSaving(false)
    }
  }

  async function handleCardAdd(e) {
    e.preventDefault()
    setCardsError('')
    setCardSaved(false)

    if (!cardForm.cardholderName.trim() || !cardForm.cardNumber.trim() || !cardForm.expiry.trim()) {
      setCardsError('Cardholder name, card number, and expiry are required.')
      return
    }

    setCardsSaving(true)
    try {
      const res = await fetch(`${API_BASE}/api/payment-methods`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(cardForm),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setCardsError(data.error || 'Failed to save card')
      } else {
        setPaymentMethods((prev) => {
          const next = prev.map((card) =>
            data.paymentMethod.isDefault ? { ...card, isDefault: false } : card
          )
          return [data.paymentMethod, ...next]
        })
        setCardForm({ cardholderName: '', cardNumber: '', expiry: '', makeDefault: false })
        setCardSaved(true)
        setTimeout(() => setCardSaved(false), 2500)
      }
    } catch {
      setCardsError('Could not connect to server')
    } finally {
      setCardsSaving(false)
    }
  }

  async function handleMakeDefault(cardId) {
    setCardsError('')
    try {
      const res = await fetch(`${API_BASE}/api/payment-methods/${cardId}/default`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setCardsError(data.error || 'Failed to update default card')
      } else {
        setPaymentMethods((prev) =>
          prev.map((card) => ({ ...card, isDefault: card.id === data.paymentMethod.id }))
        )
      }
    } catch {
      setCardsError('Could not connect to server')
    }
  }

  async function handleDeleteCard(cardId) {
    setCardsError('')
    try {
      const res = await fetch(`${API_BASE}/api/payment-methods/${cardId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setCardsError(data.error || 'Failed to delete card')
      } else {
        setPaymentMethods((prev) => prev.filter((card) => card.id !== cardId))
        loadPaymentMethods()
      }
    } catch {
      setCardsError('Could not connect to server')
    }
  }

  return (
    <div className="flex min-h-svh w-full flex-col bg-[var(--bg)] pt-16">
      <main className="mx-auto box-border w-full max-w-[760px] px-6 pt-12 pb-20">
        <h1 className="mb-10 text-[32px] font-extrabold tracking-[-0.5px] text-[var(--text-h)]">
          Account Settings
        </h1>

        {/* Profile */}
        <Section title="Profile" description="Update your display name and tax ID.">
          <form onSubmit={handleProfileSave}>
            <div className="mb-5 flex items-center gap-4 border-b border-[var(--border)] pb-5">
              <div className="flex h-[52px] w-[52px] shrink-0 items-center justify-center rounded-full bg-purple-400/12 text-[22px] font-bold text-purple-400">
                {getInitial(name, email)}
              </div>
              <div className="min-w-0">
                <p className="m-0 mb-0.5 text-[15px] font-semibold text-[var(--text-h)]">
                  {profileLoading ? 'Loading…' : name || 'Your Name'}
                </p>
                <p className="m-0 truncate text-[13px] text-[var(--text)]" title={email}>
                  {profileLoading ? '' : email}
                </p>
              </div>
            </div>
            <div className="mb-4 flex flex-col gap-1.5">
              <Label htmlFor="acc-name" className="text-[13px] text-[var(--text-h)]">
                Full Name
              </Label>
              <Input
                id="acc-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your name"
                disabled={profileLoading}
                className="border-[var(--border)] bg-[var(--bg)] text-[var(--text-h)] placeholder:text-[var(--text)]/40 focus-visible:border-purple-400 focus-visible:ring-purple-400/40"
              />
            </div>
            <div className="mb-4 flex flex-col gap-1.5">
              <Label htmlFor="acc-tax-id" className="text-[13px] text-[var(--text-h)]">
                Tax ID <span className="font-normal text-[var(--text)]">(optional)</span>
              </Label>
              <Input
                id="acc-tax-id"
                type="text"
                value={taxId}
                onChange={(e) => setTaxId(e.target.value)}
                placeholder="e.g. 1234567890"
                maxLength={50}
                disabled={profileLoading}
                className="border-[var(--border)] bg-[var(--bg)] text-[var(--text-h)] placeholder:text-[var(--text)]/40 focus-visible:border-purple-400 focus-visible:ring-purple-400/40"
              />
            </div>
            {profileError && <p className="-mt-2 mb-3 text-[13px] text-red-500">{profileError}</p>}
            <div className="mt-2 flex items-center justify-end gap-3.5">
              {profileSaved && (
                <span className="text-[13px] font-medium text-green-500">Changes saved!</span>
              )}
              <button
                type="submit"
                disabled={profileLoading || profileSaving}
                className="cursor-pointer rounded-lg border-none bg-purple-400 px-5 py-2.5 text-[13px] font-semibold text-white transition-opacity hover:opacity-88 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {profileSaving ? 'Saving…' : 'Save Profile'}
              </button>
            </div>
          </form>
        </Section>

        {/* Email change */}
        <Section
          title="Email Address"
          description="Changing your email requires confirmation from both your current and new address."
        >
          <div className="mb-4 flex flex-col gap-1.5">
            <Label className="text-[13px] text-[var(--text-h)]">Current Email</Label>
            <p
              className="m-0 truncate rounded-md border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-[13px] text-[var(--text-h)] opacity-80"
              title={email}
            >
              {profileLoading ? 'Loading…' : email}
            </p>
          </div>

          {pendingEmail && (
            <div className="mb-5 rounded-lg border border-yellow-500/40 bg-yellow-500/10 p-4">
              <p className="m-0 mb-1 text-[13px] font-semibold text-yellow-500">
                Pending change to {pendingEmail}
              </p>
              <p className="m-0 mb-3 text-[12px] text-[var(--text)]">
                Both verification links must be clicked within 1 hour. Check both inboxes.
              </p>
              <button
                type="button"
                onClick={handleEmailChangeCancel}
                disabled={cancelSubmitting}
                className="cursor-pointer rounded-md border border-yellow-500/60 bg-transparent px-3 py-1.5 text-[12px] font-semibold text-yellow-500 transition-colors hover:bg-yellow-500/15 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {cancelSubmitting ? 'Cancelling…' : 'Cancel pending change'}
              </button>
            </div>
          )}

          <form onSubmit={handleEmailChangeRequest}>
            <div className="grid grid-cols-2 gap-4 max-[600px]:grid-cols-1">
              <div className="mb-4 flex flex-col gap-1.5">
                <Label htmlFor="acc-new-email" className="text-[13px] text-[var(--text-h)]">
                  New Email
                </Label>
                <Input
                  id="acc-new-email"
                  type="email"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="you@example.com"
                  disabled={profileLoading}
                  className="border-[var(--border)] bg-[var(--bg)] text-[var(--text-h)] placeholder:text-[var(--text)]/40 focus-visible:border-purple-400 focus-visible:ring-purple-400/40"
                />
              </div>
              <div className="mb-4 flex flex-col gap-1.5">
                <Label htmlFor="acc-email-pw" className="text-[13px] text-[var(--text-h)]">
                  Current Password
                </Label>
                <Input
                  id="acc-email-pw"
                  type="password"
                  value={emailChangePassword}
                  onChange={(e) => setEmailChangePassword(e.target.value)}
                  placeholder="••••••••"
                  disabled={profileLoading}
                  className="border-[var(--border)] bg-[var(--bg)] text-[var(--text-h)] placeholder:text-[var(--text)]/40 focus-visible:border-purple-400 focus-visible:ring-purple-400/40"
                />
              </div>
            </div>
            {emailChangeError && (
              <p className="-mt-2 mb-3 text-[13px] text-red-500">{emailChangeError}</p>
            )}
            <div className="mt-2 flex items-center justify-end gap-3.5">
              {emailChangeSent && (
                <span className="text-[13px] font-medium text-green-500">
                  Verification emails sent — check both inboxes.
                </span>
              )}
              <button
                type="submit"
                disabled={profileLoading || emailChangeSubmitting}
                className="cursor-pointer rounded-lg border-none bg-purple-400 px-5 py-2.5 text-[13px] font-semibold text-white transition-opacity hover:opacity-88 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {emailChangeSubmitting ? 'Sending…' : 'Request Email Change'}
              </button>
            </div>
          </form>
        </Section>

        {/* Password */}
        <Section title="Password" description="Choose a strong password you don't use elsewhere.">
          <form onSubmit={handlePasswordSave}>
            <div className="mb-4 flex flex-col gap-1.5">
              <Label htmlFor="pw-current" className="text-[13px] text-[var(--text-h)]">
                Current Password
              </Label>
              <Input
                id="pw-current"
                type="password"
                value={currentPw}
                onChange={(e) => setCurrentPw(e.target.value)}
                placeholder="••••••••"
                className="border-[var(--border)] bg-[var(--bg)] text-[var(--text-h)] placeholder:text-[var(--text)]/40 focus-visible:border-purple-400 focus-visible:ring-purple-400/40"
              />
            </div>
            <div className="grid grid-cols-2 gap-4 max-[600px]:grid-cols-1">
              <div className="mb-4 flex flex-col gap-1.5">
                <Label htmlFor="pw-new" className="text-[13px] text-[var(--text-h)]">
                  New Password
                </Label>
                <Input
                  id="pw-new"
                  type="password"
                  value={newPw}
                  onChange={(e) => setNewPw(e.target.value)}
                  placeholder="••••••••"
                  className="border-[var(--border)] bg-[var(--bg)] text-[var(--text-h)] placeholder:text-[var(--text)]/40 focus-visible:border-purple-400 focus-visible:ring-purple-400/40"
                />
              </div>
              <div className="mb-4 flex flex-col gap-1.5">
                <Label htmlFor="pw-confirm" className="text-[13px] text-[var(--text-h)]">
                  Confirm New Password
                </Label>
                <Input
                  id="pw-confirm"
                  type="password"
                  value={confirmPw}
                  onChange={(e) => setConfirmPw(e.target.value)}
                  placeholder="••••••••"
                  className="border-[var(--border)] bg-[var(--bg)] text-[var(--text-h)] placeholder:text-[var(--text)]/40 focus-visible:border-purple-400 focus-visible:ring-purple-400/40"
                />
              </div>
            </div>
            {pwError && <p className="-mt-2 mb-3 text-[13px] text-red-500">{pwError}</p>}
            <div className="mt-2 flex items-center justify-end gap-3.5">
              {pwSaved && (
                <span className="text-[13px] font-medium text-green-500">Password updated!</span>
              )}
              <button
                type="submit"
                className="cursor-pointer rounded-lg border-none bg-purple-400 px-5 py-2.5 text-[13px] font-semibold text-white transition-opacity hover:opacity-88 disabled:opacity-60"
                disabled={pwLoading}
              >
                {pwLoading ? 'Updating…' : 'Update Password'}
              </button>
            </div>
          </form>
        </Section>

        {/* Payment Cards */}
        <Section title="Payment Cards" description="Manage cards you can use during checkout.">
          <div className="mb-5 grid gap-2">
            {cardsLoading && <p className="m-0 text-[13px] text-[var(--text)]">Loading cards…</p>}
            {!cardsLoading && paymentMethods.length === 0 && (
              <p className="m-0 rounded-lg border border-[var(--border)] bg-[var(--bg)] p-3 text-[13px] text-[var(--text)]">
                No saved cards yet.
              </p>
            )}
            {paymentMethods.map((card) => (
              <div
                key={card.id}
                className="flex items-center justify-between gap-4 rounded-lg border border-[var(--border)] bg-[var(--bg)] p-3 max-[600px]:flex-col max-[600px]:items-start"
              >
                <div className="min-w-0">
                  <p className="m-0 text-[14px] font-semibold text-[var(--text-h)]">
                    {card.brand} ending in {card.last4}
                    {card.isDefault && (
                      <span className="ml-2 rounded-full bg-purple-400/12 px-2 py-0.5 text-[11px] text-purple-400">
                        Default
                      </span>
                    )}
                  </p>
                  <p className="m-0 mt-0.5 text-[12px] text-[var(--text)]">
                    {card.cardholderName} · Expires {card.expiry}
                    {card.expired ? ' · Expired' : ''}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  {!card.isDefault && (
                    <button
                      type="button"
                      onClick={() => handleMakeDefault(card.id)}
                      className="cursor-pointer rounded-md border border-[var(--border)] bg-transparent px-3 py-1.5 text-[12px] font-semibold text-[var(--text)] transition-colors hover:border-purple-400/40 hover:text-purple-400"
                    >
                      Make Default
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => handleDeleteCard(card.id)}
                    className="cursor-pointer rounded-md border border-red-500/50 bg-transparent px-3 py-1.5 text-[12px] font-semibold text-red-500 transition-colors hover:bg-red-500 hover:text-white"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>

          <form onSubmit={handleCardAdd}>
            <div className="grid grid-cols-2 gap-4 max-[600px]:grid-cols-1">
              <div className="col-span-2 flex flex-col gap-1.5 max-[600px]:col-span-1">
                <Label htmlFor="cardholder-name" className="text-[13px] text-[var(--text-h)]">
                  Cardholder Name
                </Label>
                <Input
                  id="cardholder-name"
                  value={cardForm.cardholderName}
                  onChange={(e) =>
                    setCardForm((prev) => ({ ...prev, cardholderName: e.target.value }))
                  }
                  placeholder="Jane Smith"
                  className="border-[var(--border)] bg-[var(--bg)] text-[var(--text-h)] placeholder:text-[var(--text)]/40 focus-visible:border-purple-400 focus-visible:ring-purple-400/40"
                />
              </div>
              <div className="col-span-2 flex flex-col gap-1.5 max-[600px]:col-span-1">
                <Label htmlFor="card-number" className="text-[13px] text-[var(--text-h)]">
                  Card Number
                </Label>
                <Input
                  id="card-number"
                  value={cardForm.cardNumber}
                  inputMode="numeric"
                  onChange={(e) =>
                    setCardForm((prev) => ({
                      ...prev,
                      cardNumber: formatCardNumber(e.target.value),
                    }))
                  }
                  placeholder="4242 4242 4242 4242"
                  className="border-[var(--border)] bg-[var(--bg)] text-[var(--text-h)] placeholder:text-[var(--text)]/40 focus-visible:border-purple-400 focus-visible:ring-purple-400/40"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="card-expiry" className="text-[13px] text-[var(--text-h)]">
                  Expiry
                </Label>
                <Input
                  id="card-expiry"
                  value={cardForm.expiry}
                  inputMode="numeric"
                  maxLength={5}
                  onChange={(e) =>
                    setCardForm((prev) => ({ ...prev, expiry: formatExpiry(e.target.value) }))
                  }
                  placeholder="MM/YY"
                  className="border-[var(--border)] bg-[var(--bg)] text-[var(--text-h)] placeholder:text-[var(--text)]/40 focus-visible:border-purple-400 focus-visible:ring-purple-400/40"
                />
              </div>
              <label className="mt-6 flex cursor-pointer items-center gap-2 text-[13px] text-[var(--text-h)] max-[600px]:mt-0">
                <input
                  type="checkbox"
                  checked={cardForm.makeDefault}
                  onChange={(e) =>
                    setCardForm((prev) => ({ ...prev, makeDefault: e.target.checked }))
                  }
                />
                Make default
              </label>
            </div>
            {cardsError && <p className="mt-3 mb-0 text-[13px] text-red-500">{cardsError}</p>}
            <div className="mt-4 flex items-center justify-end gap-3.5">
              {cardSaved && (
                <span className="text-[13px] font-medium text-green-500">Card saved!</span>
              )}
              <button
                type="submit"
                disabled={cardsSaving}
                className="cursor-pointer rounded-lg border-none bg-purple-400 px-5 py-2.5 text-[13px] font-semibold text-white transition-opacity hover:opacity-88 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {cardsSaving ? 'Saving…' : 'Save Card'}
              </button>
            </div>
          </form>
        </Section>

        {/* Notifications */}
        <Section title="Notifications" description="Choose what you'd like to hear about.">
          <Toggle
            label="Order updates & shipping"
            checked={notifOrderUpdates}
            onChange={setNotifOrderUpdates}
          />
          <Toggle
            label="Promotions & discounts"
            checked={notifPromotions}
            onChange={setNotifPromotions}
          />
          <Toggle
            label="New arrivals & collections"
            checked={notifNewArrivals}
            onChange={setNotifNewArrivals}
          />
          <Toggle label="SMS notifications" checked={notifSMS} onChange={setNotifSMS} />
        </Section>

        {/* Shipping Address */}
        <Section title="Shipping Address" description="Your default delivery address.">
          <form onSubmit={handleAddressSave}>
            <div className="mb-4 flex flex-col gap-1.5">
              <Label htmlFor="addr-line1" className="text-[13px] text-[var(--text-h)]">
                Address Line 1
              </Label>
              <Input
                id="addr-line1"
                type="text"
                value={line1}
                onChange={(e) => setLine1(e.target.value)}
                placeholder="123 Example Street"
                className="border-[var(--border)] bg-[var(--bg)] text-[var(--text-h)] placeholder:text-[var(--text)]/40 focus-visible:border-purple-400 focus-visible:ring-purple-400/40"
              />
            </div>
            <div className="mb-4 flex flex-col gap-1.5">
              <Label htmlFor="addr-line2" className="text-[13px] text-[var(--text-h)]">
                Address Line 2 <span className="font-normal text-[var(--text)]">(optional)</span>
              </Label>
              <Input
                id="addr-line2"
                type="text"
                value={line2}
                onChange={(e) => setLine2(e.target.value)}
                placeholder="Apartment, suite, etc."
                className="border-[var(--border)] bg-[var(--bg)] text-[var(--text-h)] placeholder:text-[var(--text)]/40 focus-visible:border-purple-400 focus-visible:ring-purple-400/40"
              />
            </div>
            <div className="grid grid-cols-2 gap-4 max-[600px]:grid-cols-1">
              <div className="mb-4 flex flex-col gap-1.5">
                <Label htmlFor="addr-city" className="text-[13px] text-[var(--text-h)]">
                  City
                </Label>
                <Input
                  id="addr-city"
                  type="text"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="London"
                  className="border-[var(--border)] bg-[var(--bg)] text-[var(--text-h)] placeholder:text-[var(--text)]/40 focus-visible:border-purple-400 focus-visible:ring-purple-400/40"
                />
              </div>
              <div className="mb-4 flex flex-col gap-1.5">
                <Label htmlFor="addr-postcode" className="text-[13px] text-[var(--text-h)]">
                  Postcode
                </Label>
                <Input
                  id="addr-postcode"
                  type="text"
                  value={postcode}
                  onChange={(e) => setPostcode(e.target.value)}
                  placeholder="SW1A 1AA"
                  className="border-[var(--border)] bg-[var(--bg)] text-[var(--text-h)] placeholder:text-[var(--text)]/40 focus-visible:border-purple-400 focus-visible:ring-purple-400/40"
                />
              </div>
            </div>
            <div className="mb-4 flex flex-col gap-1.5">
              <Label htmlFor="addr-country" className="text-[13px] text-[var(--text-h)]">
                Country
              </Label>
              <Input
                id="addr-country"
                type="text"
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                placeholder="United Kingdom"
                className="border-[var(--border)] bg-[var(--bg)] text-[var(--text-h)] placeholder:text-[var(--text)]/40 focus-visible:border-purple-400 focus-visible:ring-purple-400/40"
              />
            </div>
            {addressError && <p className="-mt-2 mb-3 text-[13px] text-red-500">{addressError}</p>}
            <div className="mt-2 flex items-center justify-end gap-3.5">
              {addressSaved && (
                <span className="text-[13px] font-medium text-green-500">Address saved!</span>
              )}
              <button
                type="submit"
                disabled={addressSaving}
                className="cursor-pointer rounded-lg border-none bg-purple-400 px-5 py-2.5 text-[13px] font-semibold text-white transition-opacity hover:opacity-88 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {addressSaving ? 'Saving…' : 'Save Address'}
              </button>
            </div>
          </form>
        </Section>

        {/* Danger zone */}
        <Section title="Danger Zone">
          <div className="flex items-center justify-between gap-6 max-[600px]:flex-col max-[600px]:items-start">
            <div>
              <p className="m-0 mb-1 text-sm font-semibold text-red-500">Delete Account</p>
              <p className="m-0 text-[13px] text-[var(--text)]">
                Permanently remove your account and all associated data. This cannot be undone.
              </p>
            </div>
            <button
              type="button"
              className="shrink-0 cursor-pointer rounded-lg border border-red-500 bg-transparent px-4.5 py-2.5 text-[13px] font-semibold text-red-500 transition-colors hover:bg-red-500 hover:text-white"
            >
              Delete Account
            </button>
          </div>
        </Section>
      </main>
    </div>
  )
}
