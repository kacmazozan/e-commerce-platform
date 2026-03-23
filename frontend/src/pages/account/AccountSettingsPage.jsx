import { useState } from 'react'
import './AccountSettingsPage.css'

function BackIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="19" y1="12" x2="5" y2="12" />
      <polyline points="12 19 5 12 12 5" />
    </svg>
  )
}

function Section({ title, description, children }) {
  return (
    <div className="settings-section">
      <div className="settings-section-header">
        <h2 className="settings-section-title">{title}</h2>
        {description && <p className="settings-section-desc">{description}</p>}
      </div>
      <div className="settings-card">{children}</div>
    </div>
  )
}

function Toggle({ checked, onChange, label }) {
  return (
    <label className="toggle-row">
      <span className="toggle-label">{label}</span>
      <button
        role="switch"
        aria-checked={checked}
        className={`toggle-btn${checked ? ' toggle-btn--on' : ''}`}
        onClick={() => onChange(!checked)}
        type="button"
      >
        <span className="toggle-thumb" />
      </button>
    </label>
  )
}

export default function AccountSettingsPage({ onBack }) {
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

  function handlePasswordSave(e) {
    e.preventDefault()
    setPwError('')
    if (newPw !== confirmPw) { setPwError('New passwords do not match.'); return }
    if (newPw.length < 8)    { setPwError('Password must be at least 8 characters.'); return }
    setPwSaved(true)
    setCurrentPw(''); setNewPw(''); setConfirmPw('')
    setTimeout(() => setPwSaved(false), 2500)
  }

  function handleAddressSave(e) {
    e.preventDefault()
    setAddressSaved(true)
    setTimeout(() => setAddressSaved(false), 2500)
  }

  return (
    <div className="account-page">
      <header className="account-header">
        <div className="account-header-inner">
          <button className="back-btn" onClick={onBack}>
            <BackIcon /> Back
          </button>
          <span className="brand">MODÉ</span>
        </div>
      </header>

      <main className="account-main">
        <h1 className="account-title">Account Settings</h1>

        {/* Profile */}
        <Section title="Profile" description="Update your display name and email address.">
          <form onSubmit={handleProfileSave}>
            <div className="avatar-display">
              <div className="avatar-large">{name ? name[0].toUpperCase() : '?'}</div>
              <div>
                <p className="avatar-name">{name || 'Your Name'}</p>
                <p className="avatar-email">{email}</p>
              </div>
            </div>
            <div className="fields-row">
              <div className="field">
                <label htmlFor="acc-name">Full Name</label>
                <input id="acc-name" type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Jane Smith" />
              </div>
              <div className="field">
                <label htmlFor="acc-email">Email Address</label>
                <input id="acc-email" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" />
              </div>
            </div>
            <div className="form-footer">
              {profileSaved && <span className="save-confirm">Changes saved!</span>}
              <button type="submit" className="save-btn">Save Profile</button>
            </div>
          </form>
        </Section>

        {/* Password */}
        <Section title="Password" description="Choose a strong password you don't use elsewhere.">
          <form onSubmit={handlePasswordSave}>
            <div className="field">
              <label htmlFor="pw-current">Current Password</label>
              <input id="pw-current" type="password" value={currentPw} onChange={e => setCurrentPw(e.target.value)} placeholder="••••••••" />
            </div>
            <div className="fields-row">
              <div className="field">
                <label htmlFor="pw-new">New Password</label>
                <input id="pw-new" type="password" value={newPw} onChange={e => setNewPw(e.target.value)} placeholder="••••••••" />
              </div>
              <div className="field">
                <label htmlFor="pw-confirm">Confirm New Password</label>
                <input id="pw-confirm" type="password" value={confirmPw} onChange={e => setConfirmPw(e.target.value)} placeholder="••••••••" />
              </div>
            </div>
            {pwError && <p className="field-error">{pwError}</p>}
            <div className="form-footer">
              {pwSaved && <span className="save-confirm">Password updated!</span>}
              <button type="submit" className="save-btn">Update Password</button>
            </div>
          </form>
        </Section>

        {/* Notifications */}
        <Section title="Notifications" description="Choose what you'd like to hear about.">
          <Toggle label="Order updates & shipping" checked={notifOrderUpdates} onChange={setNotifOrderUpdates} />
          <Toggle label="Promotions & discounts"   checked={notifPromotions}    onChange={setNotifPromotions} />
          <Toggle label="New arrivals & collections" checked={notifNewArrivals} onChange={setNotifNewArrivals} />
          <Toggle label="SMS notifications"         checked={notifSMS}          onChange={setNotifSMS} />
        </Section>

        {/* Shipping Address */}
        <Section title="Shipping Address" description="Your default delivery address.">
          <form onSubmit={handleAddressSave}>
            <div className="field">
              <label htmlFor="addr-line1">Address Line 1</label>
              <input id="addr-line1" type="text" value={line1} onChange={e => setLine1(e.target.value)} placeholder="123 Example Street" />
            </div>
            <div className="field">
              <label htmlFor="addr-line2">Address Line 2 <span className="optional">(optional)</span></label>
              <input id="addr-line2" type="text" value={line2} onChange={e => setLine2(e.target.value)} placeholder="Apartment, suite, etc." />
            </div>
            <div className="fields-row">
              <div className="field">
                <label htmlFor="addr-city">City</label>
                <input id="addr-city" type="text" value={city} onChange={e => setCity(e.target.value)} placeholder="London" />
              </div>
              <div className="field">
                <label htmlFor="addr-postcode">Postcode</label>
                <input id="addr-postcode" type="text" value={postcode} onChange={e => setPostcode(e.target.value)} placeholder="SW1A 1AA" />
              </div>
            </div>
            <div className="field">
              <label htmlFor="addr-country">Country</label>
              <input id="addr-country" type="text" value={country} onChange={e => setCountry(e.target.value)} placeholder="United Kingdom" />
            </div>
            <div className="form-footer">
              {addressSaved && <span className="save-confirm">Address saved!</span>}
              <button type="submit" className="save-btn">Save Address</button>
            </div>
          </form>
        </Section>

        {/* Danger zone */}
        <Section title="Danger Zone">
          <div className="danger-row">
            <div>
              <p className="danger-label">Delete Account</p>
              <p className="danger-desc">Permanently remove your account and all associated data. This cannot be undone.</p>
            </div>
            <button type="button" className="danger-btn">Delete Account</button>
          </div>
        </Section>
      </main>
    </div>
  )
}
