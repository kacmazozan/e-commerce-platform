import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

function BackIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <line x1="19" y1="12" x2="5" y2="12" />
      <polyline points="12 19 5 12 12 5" />
    </svg>
  )
}

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

export default function AccountSettingsPage({ onBack, token }) {
  // ... rest of state stays same ...
  // Profile
  const [name, setName] = useState('Jane Smith')
  const [email, setEmail] = useState('user@example.com')
  const [profileSaved, setProfileSaved] = useState(false)

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

  function handleProfileSave(e) {
    e.preventDefault()
    setProfileSaved(true)
    setTimeout(() => setProfileSaved(false), 2500)
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
      const res = await fetch('http://localhost:3000/api/auth/change-password', {
        method: 'POST',
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

  function handleAddressSave(e) {
    e.preventDefault()
    setAddressSaved(true)
    setTimeout(() => setAddressSaved(false), 2500)
  }

  return (
    <div className="flex min-h-svh w-full flex-col bg-[var(--bg)] pt-16">
      <header className="fixed top-0 right-0 left-0 z-[1000] border-b border-[var(--border)] bg-[rgba(var(--background-rgb),0.75)] px-6 backdrop-blur-[20px]">
        <div className="mx-auto flex h-16 max-w-[1280px] items-center gap-4">
          <button
            type="button"
            className="flex cursor-pointer items-center gap-1.5 rounded-lg border-none bg-transparent px-2.5 py-1.5 text-sm text-[var(--text)] transition-colors hover:bg-purple-400/12 hover:text-purple-400"
            onClick={onBack}
          >
            <BackIcon /> Back
          </button>
          <Link
            to="/"
            className="ml-auto cursor-pointer text-[22px] font-bold tracking-[4px] text-[var(--text-h)] no-underline"
          >
            FIER
          </Link>
        </div>
      </header>

      <main className="mx-auto box-border w-full max-w-[760px] px-6 pt-12 pb-20">
        <h1 className="mb-10 text-[32px] font-extrabold tracking-[-0.5px] text-[var(--text-h)]">
          Account Settings
        </h1>

        {/* Profile */}
        <Section title="Profile" description="Update your display name and email address.">
          <form onSubmit={handleProfileSave}>
            <div className="mb-5 flex items-center gap-4 border-b border-[var(--border)] pb-5">
              <div className="flex h-[52px] w-[52px] shrink-0 items-center justify-center rounded-full bg-purple-400/12 text-[22px] font-bold text-purple-400">
                {name ? name[0].toUpperCase() : '?'}
              </div>
              <div>
                <p className="m-0 mb-0.5 text-[15px] font-semibold text-[var(--text-h)]">
                  {name || 'Your Name'}
                </p>
                <p className="m-0 text-[13px] text-[var(--text)]">{email}</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4 max-[600px]:grid-cols-1">
              <div className="mb-4 flex flex-col gap-1.5">
                <Label htmlFor="acc-name" className="text-[13px] text-[var(--text-h)]">
                  Full Name
                </Label>
                <Input
                  id="acc-name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Jane Smith"
                  className="border-[var(--border)] bg-[var(--bg)] text-[var(--text-h)] placeholder:text-[var(--text)]/40 focus-visible:border-purple-400 focus-visible:ring-purple-400/40"
                />
              </div>
              <div className="mb-4 flex flex-col gap-1.5">
                <Label htmlFor="acc-email" className="text-[13px] text-[var(--text-h)]">
                  Email Address
                </Label>
                <Input
                  id="acc-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="border-[var(--border)] bg-[var(--bg)] text-[var(--text-h)] placeholder:text-[var(--text)]/40 focus-visible:border-purple-400 focus-visible:ring-purple-400/40"
                />
              </div>
            </div>
            <div className="mt-2 flex items-center justify-end gap-3.5">
              {profileSaved && (
                <span className="text-[13px] font-medium text-green-500">Changes saved!</span>
              )}
              <button
                type="submit"
                className="cursor-pointer rounded-lg border-none bg-purple-400 px-5 py-2.5 text-[13px] font-semibold text-white transition-opacity hover:opacity-88"
              >
                Save Profile
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
            <div className="mt-2 flex items-center justify-end gap-3.5">
              {addressSaved && (
                <span className="text-[13px] font-medium text-green-500">Address saved!</span>
              )}
              <button
                type="submit"
                className="cursor-pointer rounded-lg border-none bg-purple-400 px-5 py-2.5 text-[13px] font-semibold text-white transition-opacity hover:opacity-88"
              >
                Save Address
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
