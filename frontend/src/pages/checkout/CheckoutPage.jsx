import { useState, useEffect } from 'react'
import { useNavigate, useLocation, Link } from 'react-router-dom'
import API_BASE from '../../api'
import useLiveCart from '../../hooks/useLiveCart'

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
  const digits = raw.slice(0, 19)
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
  return (
    expYear > now.getFullYear() || (expYear === now.getFullYear() && month >= now.getMonth() + 1)
  )
}

function parseSavedAddress(value) {
  const lines = String(value || '')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)

  if (lines.length === 0) return null
  if (lines.length >= 5) {
    const cityLine = lines[3].match(/^(.+?),\s*(.*?)\s+(\S+)$/)
    return {
      fullName: lines[0] || '',
      address1: lines[1] || '',
      address2: lines[2] || '',
      city: cityLine?.[1] || '',
      state: cityLine?.[2] || '',
      zip: cityLine?.[3] || '',
      country: lines[4] || '',
    }
  }

  const hasLine2 = lines.length >= 4
  const cityLine = (hasLine2 ? lines[2] : lines[1] || '').split(/\s+/)
  const zip = cityLine.length > 1 ? cityLine.pop() : ''

  return {
    fullName: '',
    address1: lines[0] || '',
    address2: hasLine2 ? lines[1] || '' : '',
    city: cityLine.join(' '),
    state: '',
    zip,
    country: hasLine2 ? lines[3] || '' : lines[2] || '',
  }
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

export default function CheckoutPage({
  cartItems: cartItemsProp,
  token,
  onOrderConfirmed,
  onCartRefresh,
}) {
  const navigate = useNavigate()
  const { state } = useLocation()
  const expiresAt = state?.expiresAt

  // ── Live cart sync (mount + 15s poll + visibility) ──
  // The backend determines the actual charged price at confirm time, so the
  // checkout summary needs fresh prices too — otherwise users see one number
  // here and a different one on the order success / orders page when a
  // discount lands mid-checkout. The hook keeps cartItems live and pushes
  // updates back to App's global cart state via onCartRefresh.
  const { items: cartItems, refetch: refetchCart } = useLiveCart(token, {
    initial: cartItemsProp,
    onUpdate: onCartRefresh,
  })
  const [priceChange, setPriceChange] = useState(null)

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
  const [paymentMethods, setPaymentMethods] = useState([])
  const [paymentMethodsLoading, setPaymentMethodsLoading] = useState(false)
  const [selectedPaymentMethodId, setSelectedPaymentMethodId] = useState('')
  const [useNewCard, setUseNewCard] = useState(true)
  const [savePaymentMethod, setSavePaymentMethod] = useState(false)

  // ── Submit state ───────────────────────────────────
  const [confirming, setConfirming] = useState(false)
  const [submitError, setSubmitError] = useState(null)

  useEffect(() => {
    if (!token) return

    const controller = new AbortController()

    async function loadCustomerCheckoutData() {
      setPaymentMethodsLoading(true)
      try {
        const [cardsRes, profileRes] = await Promise.all([
          fetch(`${API_BASE}/api/payment-methods`, {
            headers: { Authorization: `Bearer ${token}` },
            signal: controller.signal,
          }),
          fetch(`${API_BASE}/api/auth/me`, {
            headers: { Authorization: `Bearer ${token}` },
            signal: controller.signal,
          }),
        ])

        if (cardsRes.ok) {
          const data = await cardsRes.json()
          const cards = data.paymentMethods || []
          setPaymentMethods(cards)
          // Never auto-select an expired card — its radio is disabled in the UI
          const usable = cards.filter((card) => !card.expired)
          const defaultCard = usable.find((card) => card.isDefault) || usable[0]
          if (defaultCard) {
            setSelectedPaymentMethodId(String(defaultCard.id))
            setUseNewCard(false)
          }
        }

        if (profileRes.ok) {
          const data = await profileRes.json()
          const savedAddress = parseSavedAddress(data.home_address)
          if (savedAddress) {
            setShipping((prev) =>
              Object.values(prev).some(Boolean) ? prev : { ...prev, ...savedAddress }
            )
          }
        }
      } catch (err) {
        if (err.name !== 'AbortError') {
          // Reset the whole selection state — otherwise the saved-card picker
          // disappears while useNewCard stays false, hiding all payment inputs
          setPaymentMethods([])
          setSelectedPaymentMethodId('')
          setUseNewCard(true)
        }
      } finally {
        if (!controller.signal.aborted) setPaymentMethodsLoading(false)
      }
    }

    loadCustomerCheckoutData()
    return () => controller.abort()
  }, [token])

  function clearShippingError(field) {
    setShippingErrors((p) => ({ ...p, [field]: undefined }))
  }
  function clearPaymentError(field) {
    setPaymentErrors((p) => ({ ...p, [field]: undefined }))
  }

  const effectivePrice = (item) =>
    parseFloat(item.discounted_price != null ? item.discounted_price : item.price)
  const total = cartItems.reduce((sum, item) => sum + effectivePrice(item) * item.quantity, 0)
  const shippingCost = total >= 100 ? 0 : 4.99
  const selectedPaymentMethod = paymentMethods.find(
    (method) => String(method.id) === String(selectedPaymentMethodId)
  )
  const cardType = useNewCard
    ? getCardType(payment.cardNumber)
    : selectedPaymentMethod?.brand || null
  const maskedCard =
    useNewCard && payment.cardNumber
      ? '•••• •••• •••• ' + payment.cardNumber.replace(/\s/g, '').slice(-4).padStart(4, '•')
      : selectedPaymentMethod
        ? `•••• •••• •••• ${selectedPaymentMethod.last4}`
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
    if (useNewCard) {
      if (!payment.cardName.trim()) pe.cardName = 'Required'
      const rawCard = payment.cardNumber.replace(/\s/g, '')
      if (!rawCard) pe.cardNumber = 'Required'
      else if (rawCard.length < 4 || rawCard.length > 19) pe.cardNumber = 'Must be 4 to 19 digits'
      if (!payment.expiry) pe.expiry = 'Required'
      else if (!validateExpiry(payment.expiry)) pe.expiry = 'Invalid date'
      if (!payment.cvv) pe.cvv = 'Required'
      else if (payment.cvv.length < 3 || payment.cvv.length > 4) pe.cvv = 'Must be 3 or 4 digits'
    } else {
      const selected = paymentMethods.find(
        (method) => String(method.id) === String(selectedPaymentMethodId)
      )
      if (!selected) {
        pe.savedCard = 'Choose a saved card or enter a new one'
      } else if (selected.expired) {
        pe.savedCard = 'Selected card is expired. Choose another card or enter a new one'
      }
    }

    setShippingErrors(se)
    setPaymentErrors(pe)
    return Object.keys(se).length === 0 && Object.keys(pe).length === 0
  }

  function buildAddressString() {
    return [
      shipping.fullName,
      shipping.address1,
      shipping.address2,
      `${shipping.city}, ${shipping.state} ${shipping.zip}`,
      shipping.country,
    ]
      .filter(Boolean)
      .join('\n')
  }

  // Detect prices that moved between when the user opened checkout and now.
  // Keyed by product_id+size to match cart row identity.
  function diffCarts(oldItems, freshItems) {
    const keyOf = (it) => `${it.product_id ?? it.id}::${it.size || ''}`
    const oldByKey = new Map(oldItems.map((it) => [keyOf(it), it]))
    const changes = []
    for (const fresh of freshItems) {
      const prev = oldByKey.get(keyOf(fresh))
      if (!prev) continue
      const prevEff = effectivePrice(prev)
      const nextEff = effectivePrice(fresh)
      if (Math.abs(prevEff - nextEff) > 0.001) {
        changes.push({
          name: fresh.name,
          quantity: fresh.quantity,
          oldPrice: prevEff,
          newPrice: nextEff,
        })
      }
    }
    return changes
  }

  async function placeOrder(addressStr) {
    setConfirming(true)
    setSubmitError(null)
    try {
      const paymentBody = useNewCard
        ? {
            paymentMethod: {
              cardholderName: payment.cardName,
              cardNumber: payment.cardNumber,
              expiry: payment.expiry,
              cvv: payment.cvv,
            },
            savePaymentMethod,
          }
        : { paymentMethodId: Number(selectedPaymentMethodId) }

      const res = await fetch(`${API_BASE}/api/checkout/confirm`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ address: addressStr, ...paymentBody }),
      })
      const data = await res.json()
      if (!res.ok) {
        setSubmitError(data.error || 'Failed to place order.')
        setConfirming(false)
        return
      }
      // Use the canonical items + total the backend just wrote to the order,
      // not the local cart snapshot — the latter can be stale if a discount
      // landed during checkout.
      const canonicalItems = data.items || cartItems
      const canonicalSubtotal = typeof data.total === 'number' ? data.total : total
      onOrderConfirmed({
        orderId: data.order_id,
        invoiceNumber: data.invoice_number,
        customerEmail: data.customer_email,
        items: canonicalItems,
        subtotal: canonicalSubtotal,
        shippingCost:
          typeof data.shipping_cost === 'number'
            ? data.shipping_cost
            : canonicalSubtotal >= 100
              ? 0
              : 4.99,
        address: addressStr,
      })
    } catch {
      setSubmitError('Network error. Please try again.')
      setConfirming(false)
    }
  }

  async function handleConfirm() {
    if (!validateAll()) return
    const addressStr = buildAddressString()

    // Snapshot what the user is currently looking at, then ask the hook for a
    // fresh cart. Polling normally keeps cartItems live, so a delta here is a
    // last-second change between polls — surface it before we charge them.
    const snapshot = cartItems
    setConfirming(true)
    setSubmitError(null)
    const freshItems = await refetchCart()

    if (freshItems) {
      const changes = diffCarts(snapshot, freshItems)
      if (changes.length > 0) {
        const oldSubtotal = snapshot.reduce((sum, it) => sum + effectivePrice(it) * it.quantity, 0)
        const newSubtotal = freshItems.reduce(
          (sum, it) => sum + effectivePrice(it) * it.quantity,
          0
        )
        setConfirming(false)
        setPriceChange({ changes, oldSubtotal, newSubtotal, addressStr })
        return
      }
    }

    await placeOrder(addressStr)
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
            type="button"
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
            type="button"
            className="flex cursor-pointer items-center gap-1.5 rounded-lg border-none bg-transparent px-2.5 py-1.5 text-sm text-[var(--text)] transition-colors hover:bg-purple-400/12 hover:text-purple-400"
            onClick={handleCancel}
          >
            <BackIcon /> Back to Cart
          </button>
          <Link
            to="/"
            className="ml-auto cursor-pointer text-[22px] font-bold tracking-[4px] text-[var(--text-h)] no-underline"
          >
            FIER
          </Link>
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

              {paymentMethods.length > 0 && (
                <div className="mb-5 grid gap-2">
                  {paymentMethods.map((method) => (
                    <label
                      key={method.id}
                      className={`flex cursor-pointer items-center gap-3 rounded-lg border p-3 transition-colors ${
                        !useNewCard && String(selectedPaymentMethodId) === String(method.id)
                          ? 'border-purple-400/50 bg-purple-400/10'
                          : 'border-[var(--border)] bg-[var(--bg)] hover:border-purple-400/30'
                      } ${method.expired ? 'cursor-not-allowed opacity-55' : ''}`}
                    >
                      <input
                        type="radio"
                        name="payment-option"
                        checked={
                          !useNewCard && String(selectedPaymentMethodId) === String(method.id)
                        }
                        disabled={method.expired}
                        onChange={() => {
                          setUseNewCard(false)
                          setSelectedPaymentMethodId(String(method.id))
                          clearPaymentError('savedCard')
                        }}
                      />
                      <span className="min-w-0 flex-1">
                        <span className="block text-[13px] font-semibold text-[var(--text-h)]">
                          {method.brand} ending in {method.last4}
                        </span>
                        <span className="block text-[12px] text-[var(--text)]">
                          {method.cardholderName} · Expires {method.expiry}
                          {method.expired ? ' · Expired' : ''}
                        </span>
                      </span>
                    </label>
                  ))}

                  <label
                    className={`flex cursor-pointer items-center gap-3 rounded-lg border p-3 transition-colors ${
                      useNewCard
                        ? 'border-purple-400/50 bg-purple-400/10'
                        : 'border-[var(--border)] bg-[var(--bg)] hover:border-purple-400/30'
                    }`}
                  >
                    <input
                      type="radio"
                      name="payment-option"
                      checked={useNewCard}
                      onChange={() => {
                        setUseNewCard(true)
                        clearPaymentError('savedCard')
                      }}
                    />
                    <span className="text-[13px] font-semibold text-[var(--text-h)]">
                      Use a new card
                    </span>
                  </label>

                  {paymentErrors.savedCard && (
                    <p className="m-0 text-[12px] text-red-400">{paymentErrors.savedCard}</p>
                  )}
                </div>
              )}

              {paymentMethodsLoading && (
                <p className="m-0 mb-4 text-[12px] text-[var(--text)]">Loading saved cards…</p>
              )}

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
                      {useNewCard
                        ? payment.cardName || 'YOUR NAME'
                        : selectedPaymentMethod?.cardholderName || 'YOUR NAME'}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="m-0 text-[9px] font-semibold tracking-[1.5px] text-white/45 uppercase">
                      Expires
                    </p>
                    <p className="m-0 font-mono text-[13px] font-semibold text-white/85">
                      {useNewCard
                        ? payment.expiry || 'MM/YY'
                        : selectedPaymentMethod?.expiry || 'MM/YY'}
                    </p>
                  </div>
                </div>
              </div>

              {useNewCard && (
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
                          setPayment((p) => ({
                            ...p,
                            cardNumber: formatCardNumber(e.target.value),
                          }))
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
                  <label className="col-span-2 flex cursor-pointer items-center gap-2 text-[13px] text-[var(--text-h)] max-[560px]:col-span-1">
                    <input
                      type="checkbox"
                      checked={savePaymentMethod}
                      onChange={(e) => setSavePaymentMethod(e.target.checked)}
                    />
                    Save this card to my account
                  </label>
                </div>
              )}
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
                    <div className="shrink-0 text-right">
                      {item.discounted_price != null ? (
                        <>
                          <span className="block text-[11px] text-red-400 line-through opacity-70">
                            ${(parseFloat(item.price) * item.quantity).toFixed(2)}
                          </span>
                          <span className="block text-[13px] font-semibold text-[var(--text-h)]">
                            ${(effectivePrice(item) * item.quantity).toFixed(2)}
                          </span>
                        </>
                      ) : (
                        <span className="text-[13px] font-semibold text-[var(--text-h)]">
                          ${(effectivePrice(item) * item.quantity).toFixed(2)}
                        </span>
                      )}
                    </div>
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
                type="button"
                className="mt-4 w-full cursor-pointer rounded-[10px] border-none bg-purple-400 py-3.5 text-[15px] font-semibold tracking-[0.3px] text-white transition-opacity hover:opacity-88 disabled:cursor-not-allowed disabled:opacity-50"
                onClick={handleConfirm}
                disabled={confirming}
              >
                {confirming
                  ? 'Placing Order…'
                  : `Place Order · $${(total + shippingCost).toFixed(2)}`}
              </button>
              <button
                type="button"
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

      {priceChange && (
        <div
          className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/55 px-6"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-md rounded-2xl border border-[var(--glass-border)] bg-[var(--card-bg)] p-6 shadow-[var(--shadow)] backdrop-blur-xl">
            <h3 className="m-0 mb-2 text-[18px] font-bold text-[var(--text-h)]">
              Prices have changed
            </h3>
            <p className="m-0 mb-4 text-[13px] leading-relaxed text-[var(--text)]">
              The price of one or more items in your cart was updated while you were on this page.
              Please review the new total before placing your order.
            </p>
            <div className="mb-4 flex flex-col gap-2 rounded-lg border border-[var(--border)] bg-[var(--bg)] p-3">
              {priceChange.changes.map((c, i) => (
                <div
                  key={`${c.name}-${i}`}
                  className="flex items-center justify-between text-[12px] text-[var(--text-h)]"
                >
                  <span className="min-w-0 flex-1 truncate pr-3">
                    {c.name} × {c.quantity}
                  </span>
                  <span className="shrink-0 tabular-nums">
                    <span className="text-red-400 line-through opacity-70">
                      ${c.oldPrice.toFixed(2)}
                    </span>
                    <span className="mx-1.5 text-[var(--text)]">→</span>
                    <span className="font-semibold">${c.newPrice.toFixed(2)}</span>
                  </span>
                </div>
              ))}
            </div>
            <div className="mb-4 flex items-center justify-between text-[14px] font-semibold text-[var(--text-h)]">
              <span>New subtotal</span>
              <span>
                <span className="mr-2 text-[12px] text-red-400 line-through opacity-70">
                  ${priceChange.oldSubtotal.toFixed(2)}
                </span>
                ${priceChange.newSubtotal.toFixed(2)}
              </span>
            </div>
            <div className="flex flex-col gap-2">
              <button
                type="button"
                className="w-full cursor-pointer rounded-[10px] border-none bg-purple-400 py-3 text-[14px] font-semibold text-white transition-opacity hover:opacity-88 disabled:cursor-not-allowed disabled:opacity-50"
                onClick={async () => {
                  const addr = priceChange.addressStr
                  setPriceChange(null)
                  await placeOrder(addr)
                }}
                disabled={confirming}
              >
                Place Order with New Prices
              </button>
              <button
                type="button"
                className="w-full cursor-pointer rounded-[10px] border border-[var(--border)] bg-transparent py-2.5 text-[13px] font-semibold text-[var(--text)] transition-colors hover:border-red-400/40 hover:text-red-400"
                onClick={() => setPriceChange(null)}
                disabled={confirming}
              >
                Review Order
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
