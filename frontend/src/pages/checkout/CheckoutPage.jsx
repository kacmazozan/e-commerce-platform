import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import API_BASE from '../../api'

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

function ClockIcon({ size = 18 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  )
}

function ChipIcon() {
  return (
    <svg width="36" height="28" viewBox="0 0 36 28" fill="none">
      <rect
        x="1"
        y="1"
        width="34"
        height="26"
        rx="4"
        stroke="rgba(255,255,255,0.5)"
        strokeWidth="1.5"
        fill="rgba(255,255,255,0.12)"
      />
      <line x1="12" y1="1" x2="12" y2="27" stroke="rgba(255,255,255,0.3)" strokeWidth="1" />
      <line x1="24" y1="1" x2="24" y2="27" stroke="rgba(255,255,255,0.3)" strokeWidth="1" />
      <line x1="1" y1="9" x2="35" y2="9" stroke="rgba(255,255,255,0.3)" strokeWidth="1" />
      <line x1="1" y1="19" x2="35" y2="19" stroke="rgba(255,255,255,0.3)" strokeWidth="1" />
    </svg>
  )
}

function getCardType(number) {
  const n = number.replace(/\s/g, '')
  if (/^4/.test(n)) return 'VISA'
  if (/^5[1-5]/.test(n) || /^2[2-7]\d{2}/.test(n)) return 'MC'
  if (/^3[47]/.test(n)) return 'AMEX'
  return null
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
  const digits = raw.slice(0, 16)
  return digits.replace(/(.{4})/g, '$1 ').trim()
}

function formatExpiry(value) {
  const digits = value.replace(/\D/g, '').slice(0, 4)
  if (digits.length >= 3) return digits.slice(0, 2) + '/' + digits.slice(2)
  return digits
}

function validateExpiry(value) {
  const [mm, yy] = value.split('/')
  if (!mm || !yy || mm.length !== 2 || yy.length !== 2) return false
  const month = parseInt(mm)
  if (month < 1 || month > 12) return false
  const now = new Date()
  const expYear = 2000 + parseInt(yy)
  const expMonth = month
  return (
    expYear > now.getFullYear() || (expYear === now.getFullYear() && expMonth >= now.getMonth() + 1)
  )
}

const inputCls =
  'w-full rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3.5 py-2.5 text-sm text-[var(--text-h)] outline-none transition-[border-color] focus:border-purple-400/60 placeholder:text-[var(--text)]/35'
const inputErrCls =
  'w-full rounded-lg border border-red-400/50 bg-[var(--bg)] px-3.5 py-2.5 text-sm text-[var(--text-h)] outline-none transition-[border-color] focus:border-red-400/70 placeholder:text-[var(--text)]/35'
const labelCls = 'mb-1.5 block text-xs font-semibold tracking-[0.4px] text-[var(--text)]'

function Field({ label, required, children }) {
  return (
    <div>
      <label className={labelCls}>
        {label}
        {required && <span className="ml-0.5 text-red-400">*</span>}
      </label>
      {children}
    </div>
  )
}

export default function CheckoutPage({ cartItems, token, onOrderConfirmed }) {
  const navigate = useNavigate()
  const { state } = useLocation()
  const expiresAt = state?.expiresAt

  // ── Timer ──────────────────────────────────────────
  const [timeLeft, setTimeLeft] = useState(() =>
    expiresAt ? Math.max(0, Math.floor((new Date(expiresAt) - Date.now()) / 1000)) : 0
  )
  const [expired, setExpired] = useState(false)

  useEffect(() => {
    if (!expiresAt) {
      navigate('/cart', { replace: true })
      return
    }
    const interval = setInterval(() => {
      const remaining = Math.max(0, Math.floor((new Date(expiresAt) - Date.now()) / 1000))
      setTimeLeft(remaining)
      if (remaining === 0) {
        clearInterval(interval)
        setExpired(true)
        fetch(`${API_BASE}/api/checkout/reserve`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` },
        }).catch(() => {})
      }
    }, 1000)
    return () => clearInterval(interval)
  }, [expiresAt, token, navigate])

  // ── Shipping form ──────────────────────────────────
  const [shipping, setShipping] = useState({
    fullName: '',
    address1: '',
    address2: '',
    city: '',
    state: '',
    zip: '',
    country: '',
  })
  const [shippingErrors, setShippingErrors] = useState({})

  // ── Payment form ───────────────────────────────────
  const [payment, setPayment] = useState({ cardName: '', cardNumber: '', expiry: '', cvv: '' })
  const [paymentErrors, setPaymentErrors] = useState({})

  // ── Submit state ───────────────────────────────────
  const [confirming, setConfirming] = useState(false)
  const [submitError, setSubmitError] = useState(null)

  function clearShippingError(field) {
    setShippingErrors((p) => ({ ...p, [field]: undefined }))
  }
  function clearPaymentError(field) {
    setPaymentErrors((p) => ({ ...p, [field]: undefined }))
  }

  const total = cartItems.reduce((sum, item) => sum + parseFloat(item.price) * item.quantity, 0)
  const shippingCost = total >= 50 ? 0 : 4.99
  const cardType = getCardType(payment.cardNumber)
  const maskedCard = payment.cardNumber
    ? '•••• •••• •••• ' + payment.cardNumber.replace(/\s/g, '').slice(-4).padStart(4, '•')
    : '•••• •••• •••• ••••'
  const minutes = Math.floor(timeLeft / 60)
  const seconds = timeLeft % 60
  const timeStr = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
  const isUrgent = timeLeft > 0 && timeLeft <= 60

  function validateAll() {
    const se = {}
    if (!shipping.fullName.trim()) se.fullName = 'Required'
    if (!shipping.address1.trim()) se.address1 = 'Required'
    if (!shipping.city.trim()) se.city = 'Required'
    if (!shipping.state.trim()) se.state = 'Required'
    if (!shipping.zip.trim()) se.zip = 'Required'
    if (!shipping.country.trim()) se.country = 'Required'

    const pe = {}
    if (!payment.cardName.trim()) pe.cardName = 'Required'
    const rawCard = payment.cardNumber.replace(/\s/g, '')
    const expectedLen = cardType === 'AMEX' ? 15 : 16
    if (!rawCard) pe.cardNumber = 'Required'
    else if (rawCard.length !== expectedLen) pe.cardNumber = `Must be ${expectedLen} digits`
    if (!payment.expiry) pe.expiry = 'Required'
    else if (!validateExpiry(payment.expiry)) pe.expiry = 'Invalid or expired date'
    const cvvLen = cardType === 'AMEX' ? 4 : 3
    if (!payment.cvv) pe.cvv = 'Required'
    else if (payment.cvv.length !== cvvLen) pe.cvv = `Must be ${cvvLen} digits`

    setShippingErrors(se)
    setPaymentErrors(pe)
    return Object.keys(se).length === 0 && Object.keys(pe).length === 0
  }

  async function handleConfirm() {
    if (!validateAll()) return
    setConfirming(true)
    setSubmitError(null)

    const addressStr = [
      shipping.fullName,
      shipping.address1,
      shipping.address2,
      `${shipping.city}, ${shipping.state} ${shipping.zip}`,
      shipping.country,
    ]
      .filter(Boolean)
      .join('\n')

    try {
      const res = await fetch(`${API_BASE}/api/checkout/confirm`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ address: addressStr }),
      })
      const data = await res.json()
      if (!res.ok) {
        setSubmitError(data.error || 'Failed to place order.')
        setConfirming(false)
        return
      }
      onOrderConfirmed()
    } catch {
      setSubmitError('Network error. Please try again.')
      setConfirming(false)
    }
  }

  async function handleCancel() {
    await fetch(`${API_BASE}/api/checkout/reserve`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    }).catch(() => {})
    navigate(-1)
  }

  // ── Expired screen ─────────────────────────────────
  if (expired) {
    return (
      <div className="flex min-h-svh w-full flex-col items-center justify-center bg-[var(--bg)] px-6">
        <div className="flex w-full max-w-md flex-col items-center gap-5 rounded-2xl border border-[var(--glass-border)] bg-[var(--card-bg)] p-10 text-center shadow-[var(--shadow)] backdrop-blur-xl">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-red-400/12 text-red-400">
            <ClockIcon size={26} />
          </div>
          <h2 className="m-0 text-[22px] font-bold text-[var(--text-h)]">Reservation Expired</h2>
          <p className="m-0 text-sm leading-relaxed text-[var(--text)]">
            Your 10-minute window has passed and the stock has been released. Return to your cart to
            start again.
          </p>
          <button
            className="w-full cursor-pointer rounded-[10px] border-none bg-purple-400 px-7 py-3.5 text-[15px] font-semibold text-white transition-opacity hover:opacity-88"
            onClick={() => navigate('/cart')}
          >
            Back to Cart
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-svh w-full flex-col bg-[var(--bg)] pt-16">
      {/* Header */}
      <header className="fixed top-0 right-0 left-0 z-[1000] border-b border-[var(--border)] bg-[rgba(var(--background-rgb),0.75)] px-6 backdrop-blur-[20px]">
        <div className="mx-auto flex h-16 max-w-[1280px] items-center gap-4">
          <button
            className="flex cursor-pointer items-center gap-1.5 rounded-lg border-none bg-transparent px-2.5 py-1.5 text-sm text-[var(--text)] transition-colors hover:bg-purple-400/12 hover:text-purple-400"
            onClick={handleCancel}
          >
            <BackIcon /> Back to Cart
          </button>
          <span className="ml-auto text-[22px] font-bold tracking-[4px] text-[var(--text-h)]">
            FIER
          </span>
        </div>
      </header>

      <main className="mx-auto box-border w-full max-w-[1280px] px-6 pt-10 pb-20">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="m-0 text-[32px] font-bold tracking-[-0.5px] text-[var(--text-h)]">
            Checkout
          </h1>
          <div
            className={`flex items-center gap-2 rounded-full border px-4 py-1.5 text-[13px] font-semibold tabular-nums ${isUrgent ? 'border-red-400/30 bg-red-400/8 text-red-400' : 'border-purple-400/25 bg-purple-400/8 text-purple-400'}`}
          >
            <ClockIcon size={14} />
            Stock reserved for {timeStr}
            {isUrgent ? ' — hurry!' : ''}
          </div>
        </div>

        <div className="grid [grid-template-columns:1fr_360px] items-start gap-8 max-[900px]:[grid-template-columns:1fr]">
          {/* ── Left: forms ── */}
          <div className="flex flex-col gap-6">
            {/* Shipping Address */}
            <section className="rounded-2xl border border-[var(--glass-border)] bg-[var(--card-bg)] p-6 shadow-[var(--shadow)] backdrop-blur-xl">
              <h2 className="m-0 mb-5 text-[16px] font-bold text-[var(--text-h)]">
                <span className="mr-2 inline-flex h-6 w-6 items-center justify-center rounded-full bg-purple-400 text-[11px] font-bold text-white">
                  1
                </span>
                Shipping Address
              </h2>
              <div className="grid grid-cols-2 gap-4 max-[560px]:grid-cols-1">
                <div className="col-span-2 max-[560px]:col-span-1">
                  <Field label="Full Name" required>
                    <input
                      className={shippingErrors.fullName ? inputErrCls : inputCls}
                      placeholder="Jane Smith"
                      value={shipping.fullName}
                      onChange={(e) => {
                        setShipping((p) => ({ ...p, fullName: e.target.value }))
                        clearShippingError('fullName')
                      }}
                    />
                  </Field>
                </div>
                <div className="col-span-2 max-[560px]:col-span-1">
                  <Field label="Address Line 1" required>
                    <input
                      className={shippingErrors.address1 ? inputErrCls : inputCls}
                      placeholder="123 Main Street"
                      value={shipping.address1}
                      onChange={(e) => {
                        setShipping((p) => ({ ...p, address1: e.target.value }))
                        clearShippingError('address1')
                      }}
                    />
                  </Field>
                </div>
                <div className="col-span-2 max-[560px]:col-span-1">
                  <Field label="Address Line 2">
                    <input
                      className={inputCls}
                      placeholder="Apt, suite, floor…"
                      value={shipping.address2}
                      onChange={(e) => setShipping((p) => ({ ...p, address2: e.target.value }))}
                    />
                  </Field>
                </div>
                <Field label="City" required>
                  <input
                    className={shippingErrors.city ? inputErrCls : inputCls}
                    placeholder="Berlin"
                    value={shipping.city}
                    onChange={(e) => {
                      setShipping((p) => ({ ...p, city: e.target.value }))
                      clearShippingError('city')
                    }}
                  />
                </Field>
                <Field label="State / Province" required>
                  <input
                    className={shippingErrors.state ? inputErrCls : inputCls}
                    placeholder="Bavaria"
                    value={shipping.state}
                    onChange={(e) => {
                      setShipping((p) => ({ ...p, state: e.target.value }))
                      clearShippingError('state')
                    }}
                  />
                </Field>
                <Field label="ZIP / Postal Code" required>
                  <input
                    className={shippingErrors.zip ? inputErrCls : inputCls}
                    placeholder="10115"
                    value={shipping.zip}
                    onChange={(e) => {
                      setShipping((p) => ({ ...p, zip: e.target.value }))
                      clearShippingError('zip')
                    }}
                  />
                </Field>
                <Field label="Country" required>
                  <input
                    className={shippingErrors.country ? inputErrCls : inputCls}
                    placeholder="Germany"
                    value={shipping.country}
                    onChange={(e) => {
                      setShipping((p) => ({ ...p, country: e.target.value }))
                      clearShippingError('country')
                    }}
                  />
                </Field>
              </div>
            </section>

            {/* Payment Details */}
            <section className="rounded-2xl border border-[var(--glass-border)] bg-[var(--card-bg)] p-6 shadow-[var(--shadow)] backdrop-blur-xl">
              <h2 className="m-0 mb-5 text-[16px] font-bold text-[var(--text-h)]">
                <span className="mr-2 inline-flex h-6 w-6 items-center justify-center rounded-full bg-purple-400 text-[11px] font-bold text-white">
                  2
                </span>
                Payment Details
              </h2>

              {/* Card preview */}
              <div
                className="mb-6 h-[160px] w-full max-w-[300px] rounded-2xl p-5"
                style={{
                  background:
                    'linear-gradient(135deg, hsl(270,40%,18%) 0%, hsl(280,50%,28%) 50%, hsl(260,45%,22%) 100%)',
                  boxShadow: '0 8px 32px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.1)',
                }}
              >
                <div className="flex items-start justify-between">
                  <ChipIcon />
                  {cardType && (
                    <span
                      className="rounded px-2 py-0.5 text-[11px] font-bold tracking-widest text-white/80"
                      style={{ background: 'rgba(255,255,255,0.12)' }}
                    >
                      {cardType}
                    </span>
                  )}
                </div>
                <p className="mt-4 font-mono text-[15px] font-semibold tracking-[2px] text-white/90 select-none">
                  {maskedCard}
                </p>
                <div className="mt-3 flex items-end justify-between">
                  <div>
                    <p className="m-0 text-[9px] font-semibold tracking-[1.5px] text-white/45 uppercase">
                      Card Holder
                    </p>
                    <p className="m-0 text-[13px] font-semibold tracking-wide text-white/85 uppercase">
                      {payment.cardName || 'YOUR NAME'}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="m-0 text-[9px] font-semibold tracking-[1.5px] text-white/45 uppercase">
                      Expires
                    </p>
                    <p className="m-0 font-mono text-[13px] font-semibold text-white/85">
                      {payment.expiry || 'MM/YY'}
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 max-[560px]:grid-cols-1">
                <div className="col-span-2 max-[560px]:col-span-1">
                  <Field label="Cardholder Name" required>
                    <input
                      className={paymentErrors.cardName ? inputErrCls : inputCls}
                      placeholder="Jane Smith"
                      value={payment.cardName}
                      onChange={(e) => {
                        setPayment((p) => ({ ...p, cardName: e.target.value.toUpperCase() }))
                        clearPaymentError('cardName')
                      }}
                    />
                  </Field>
                </div>
                <div className="col-span-2 max-[560px]:col-span-1">
                  <Field label="Card Number" required>
                    <input
                      className={paymentErrors.cardNumber ? inputErrCls : inputCls}
                      placeholder="1234 5678 9012 3456"
                      value={payment.cardNumber}
                      inputMode="numeric"
                      onChange={(e) => {
                        setPayment((p) => ({ ...p, cardNumber: formatCardNumber(e.target.value) }))
                        clearPaymentError('cardNumber')
                      }}
                    />
                  </Field>
                </div>
                <Field label="Expiry Date" required>
                  <input
                    className={paymentErrors.expiry ? inputErrCls : inputCls}
                    placeholder="MM/YY"
                    value={payment.expiry}
                    inputMode="numeric"
                    maxLength={5}
                    onChange={(e) => {
                      setPayment((p) => ({ ...p, expiry: formatExpiry(e.target.value) }))
                      clearPaymentError('expiry')
                    }}
                  />
                </Field>
                <Field label={`CVV${cardType === 'AMEX' ? ' (4 digits)' : ''}`} required>
                  <input
                    className={paymentErrors.cvv ? inputErrCls : inputCls}
                    placeholder={cardType === 'AMEX' ? '1234' : '123'}
                    value={payment.cvv}
                    inputMode="numeric"
                    maxLength={cardType === 'AMEX' ? 4 : 3}
                    type="password"
                    onChange={(e) => {
                      setPayment((p) => ({
                        ...p,
                        cvv: e.target.value
                          .replace(/\D/g, '')
                          .slice(0, cardType === 'AMEX' ? 4 : 3),
                      }))
                      clearPaymentError('cvv')
                    }}
                  />
                </Field>
              </div>
            </section>
          </div>

          {/* ── Right: order summary ── */}
          <div className="sticky top-[84px] flex flex-col gap-4">
            <div className="rounded-2xl border border-[var(--glass-border)] bg-[var(--card-bg)] p-6 shadow-[var(--shadow)] backdrop-blur-xl">
              <h2 className="m-0 mb-4 text-[16px] font-bold text-[var(--text-h)]">Order Summary</h2>

              {/* Items */}
              <div className="mb-4 flex flex-col gap-3">
                {cartItems.map((item) => (
                  <div key={item.id} className="flex items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-purple-400/12">
                      <span className="text-sm font-bold text-purple-400">{item.name[0]}</span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="m-0 overflow-hidden text-[13px] font-medium text-ellipsis whitespace-nowrap text-[var(--text-h)]">
                        {item.name}
                      </p>
                      <p className="m-0 text-[11px] text-[var(--text)]">× {item.quantity}</p>
                    </div>
                    <span className="shrink-0 text-[13px] font-semibold text-[var(--text-h)]">
                      ${(parseFloat(item.price) * item.quantity).toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>

              <hr className="border-t border-[var(--border)]" />

              <div className="mt-3 flex flex-col gap-2">
                <div className="flex justify-between text-sm text-[var(--text)]">
                  <span>Subtotal</span>
                  <span>${total.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm text-[var(--text)]">
                  <span>Shipping</span>
                  <span className={shippingCost === 0 ? 'font-semibold text-[#4caf82]' : ''}>
                    {shippingCost === 0 ? 'Free' : '$4.99'}
                  </span>
                </div>
                <div className="flex justify-between text-[15px] font-bold text-[var(--text-h)]">
                  <span>Total</span>
                  <span>${(total + shippingCost).toFixed(2)}</span>
                </div>
              </div>

              {submitError && (
                <p className="mt-3 rounded-lg bg-red-400/8 px-3 py-2 text-center text-[12px] text-red-400">
                  {submitError}
                </p>
              )}

              <button
                className="mt-4 w-full cursor-pointer rounded-[10px] border-none bg-purple-400 py-3.5 text-[15px] font-semibold tracking-[0.3px] text-white transition-opacity hover:opacity-88 disabled:cursor-not-allowed disabled:opacity-50"
                onClick={handleConfirm}
                disabled={confirming}
              >
                {confirming
                  ? 'Placing Order…'
                  : `Place Order · $${(total + shippingCost).toFixed(2)}`}
              </button>
              <button
                className="mt-2 w-full cursor-pointer rounded-[10px] border border-[var(--border)] bg-transparent py-2.5 text-[13px] font-semibold text-[var(--text)] transition-colors hover:border-red-400/40 hover:text-red-400"
                onClick={handleCancel}
                disabled={confirming}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
