import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
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

function TrashIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6l-1 14H6L5 6" />
      <path d="M10 11v6M14 11v6" />
      <path d="M9 6V4h6v2" />
    </svg>
  )
}

export default function CartPage({
  onBack,
  cartItems,
  onRemove,
  onUpdateQuantity,
  isLoggedIn,
  token,
}) {
  const navigate = useNavigate()
  const total = cartItems.reduce((sum, item) => sum + parseFloat(item.price) * item.quantity, 0)
  const [reserving, setReserving] = useState(false)
  const [reserveError, setReserveError] = useState(null)

  async function handleCheckout() {
    if (!isLoggedIn) {
      navigate('/login')
      return
    }
    setReserving(true)
    setReserveError(null)
    try {
      const res = await fetch(`${API_BASE}/api/checkout/reserve`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      })
      let data
      try {
        data = await res.json()
      } catch {
        setReserveError('Reservation failed. Please try again.')
        return
      }
      if (!res.ok) {
        const msg = data.unavailable
          ? data.unavailable.map((u) => `${u.name}: only ${u.available} left`).join(', ')
          : (data.error ?? 'Reservation failed. Please try again.')
        setReserveError(msg)
        return
      }
      navigate('/checkout', { state: { expiresAt: data.expires_at } })
    } catch {
      setReserveError('Network error. Please try again.')
    } finally {
      setReserving(false)
    }
  }

  if (cartItems.length === 0) {
    return (
      <div className="flex min-h-svh w-full flex-col bg-[var(--bg)] pt-16">
        <header className="fixed top-0 right-0 left-0 z-[1000] border-b border-[var(--border)] bg-[rgba(var(--background-rgb),0.75)] px-6 backdrop-blur-[20px]">
          <div className="mx-auto flex h-16 max-w-[1280px] items-center gap-4">
            <button
              className="flex cursor-pointer items-center gap-1.5 rounded-lg border-none bg-transparent px-2.5 py-1.5 text-sm text-[var(--text)] transition-colors hover:bg-purple-400/12 hover:text-purple-400"
              onClick={onBack}
            >
              <BackIcon /> Back
            </button>
            <span className="ml-auto text-[22px] font-bold tracking-[4px] text-[var(--text-h)]">
              FIER
            </span>
          </div>
        </header>
        <main className="mx-auto box-border w-full max-w-[1280px] px-6 pt-12 pb-16">
          <h1 className="mb-10 text-[32px] font-bold tracking-[-0.5px] text-[var(--text-h)]">
            Shopping Cart
          </h1>
          <div className="flex flex-col items-center justify-center gap-3 px-6 py-20 text-center">
            <div className="mb-2 text-purple-400 opacity-50">
              <svg
                width="64"
                height="64"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z" />
                <line x1="3" y1="6" x2="21" y2="6" />
                <path d="M16 10a4 4 0 01-8 0" />
              </svg>
            </div>
            <p className="m-0 text-[20px] font-semibold text-[var(--text-h)]">Your cart is empty</p>
            <p className="m-0 mb-4 text-sm text-[var(--text)]">
              Browse our categories and add items you love.
            </p>
            <button
              className="cursor-pointer rounded-lg border-none bg-purple-400 px-7 py-3 text-sm font-semibold tracking-[0.5px] text-white transition-opacity hover:opacity-88"
              onClick={onBack}
            >
              Start Shopping
            </button>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="flex min-h-svh w-full flex-col bg-[var(--bg)] pt-16">
      <header className="fixed top-0 right-0 left-0 z-[1000] border-b border-[var(--border)] bg-[rgba(var(--background-rgb),0.75)] px-6 backdrop-blur-[20px]">
        <div className="mx-auto flex h-16 max-w-[1280px] items-center gap-4">
          <button
            className="flex cursor-pointer items-center gap-1.5 rounded-lg border-none bg-transparent px-2.5 py-1.5 text-sm text-[var(--text)] transition-colors hover:bg-purple-400/12 hover:text-purple-400"
            onClick={onBack}
          >
            <BackIcon /> Back
          </button>
          <span className="ml-auto text-[22px] font-bold tracking-[4px] text-[var(--text-h)]">
            FIER
          </span>
        </div>
      </header>

      <main className="mx-auto box-border w-full max-w-[1280px] px-6 pt-12 pb-16">
        <h1 className="mb-10 text-[32px] font-bold tracking-[-0.5px] text-[var(--text-h)]">
          Shopping Cart
        </h1>

        <div className="grid [grid-template-columns:1fr_340px] items-start gap-10 max-[860px]:[grid-template-columns:1fr]">
          <div className="flex flex-col gap-4">
            {cartItems.map((item) => (
              <div
                key={item.id}
                className="flex items-center gap-4 rounded-2xl border border-[var(--glass-border)] bg-[var(--card-bg)] p-4 shadow-[var(--shadow)] backdrop-blur-xl"
              >
                <div className="flex h-18 w-18 shrink-0 items-center justify-center rounded-lg bg-purple-400/12">
                  <span className="text-2xl font-bold text-purple-400">{item.name[0]}</span>
                </div>
                <div className="flex min-w-0 flex-1 flex-col gap-1">
                  <span className="overflow-hidden text-[15px] font-medium text-ellipsis whitespace-nowrap text-[var(--text-h)]">
                    {item.name}
                  </span>
                  <span className="text-sm text-[var(--text)]">
                    ${parseFloat(item.price).toFixed(2)}
                  </span>
                </div>
                <div className="flex shrink-0 items-center gap-4">
                  <div className="flex items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--bg)] px-2 py-1">
                    <button
                      className="flex cursor-pointer items-center justify-center border-none bg-transparent px-1 text-lg leading-none font-normal text-[var(--text-h)] transition-colors hover:text-purple-400"
                      onClick={() => onUpdateQuantity(item.id, item.quantity - 1)}
                      aria-label="Decrease quantity"
                    >
                      −
                    </button>
                    <span className="min-w-[20px] text-center text-sm font-semibold text-[var(--text-h)]">
                      {item.quantity}
                    </span>
                    <button
                      className="flex cursor-pointer items-center justify-center border-none bg-transparent px-1 text-lg leading-none font-normal text-[var(--text-h)] transition-colors hover:text-purple-400"
                      onClick={() => onUpdateQuantity(item.id, item.quantity + 1)}
                      aria-label="Increase quantity"
                    >
                      +
                    </button>
                  </div>
                  <span className="min-w-[64px] text-right text-[15px] font-semibold text-[var(--text-h)]">
                    ${(parseFloat(item.price) * item.quantity).toFixed(2)}
                  </span>
                  <button
                    className="flex cursor-pointer items-center rounded-md border-none bg-transparent p-1.5 text-[var(--text)] transition-colors hover:bg-[rgba(232,93,93,0.1)] hover:text-[#e85d5d]"
                    onClick={() => onRemove(item.id)}
                    aria-label="Remove item"
                  >
                    <TrashIcon />
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="sticky top-[84px] flex flex-col gap-3.5 rounded-2xl border border-[var(--glass-border)] bg-[var(--card-bg)] p-7 shadow-[var(--shadow)] backdrop-blur-xl">
            <h2 className="m-0 mb-1 text-[18px] font-bold text-[var(--text-h)]">Order Summary</h2>
            <div className="flex items-center justify-between text-sm text-[var(--text)]">
              <span>Subtotal ({cartItems.reduce((s, i) => s + i.quantity, 0)} items)</span>
              <span>${total.toFixed(2)}</span>
            </div>
            <div className="flex items-center justify-between text-sm text-[var(--text)]">
              <span>Shipping</span>
              <span className={total >= 50 ? 'font-semibold text-[#4caf82]' : ''}>
                {total >= 50 ? 'Free' : '$4.99'}
              </span>
            </div>
            <hr className="my-1 border-t border-[var(--border)]" />
            <div className="flex items-center justify-between text-[16px] font-bold text-[var(--text-h)]">
              <span>Total</span>
              <span>${(total + (total >= 50 ? 0 : 4.99)).toFixed(2)}</span>
            </div>
            {total < 50 && (
              <p className="-mt-1 text-center text-xs text-purple-400">
                Add ${(50 - total).toFixed(2)} more for free shipping
              </p>
            )}
            {reserveError && (
              <p className="m-0 rounded-lg bg-red-400/8 px-3 py-2 text-center text-xs text-red-400">
                {reserveError}
              </p>
            )}
            <button
              className="mt-1 cursor-pointer rounded-[10px] border-none bg-purple-400 px-7 py-3.5 text-[15px] font-semibold tracking-[0.5px] text-white transition-opacity hover:opacity-88 disabled:cursor-not-allowed disabled:opacity-50"
              onClick={handleCheckout}
              disabled={reserving}
            >
              {reserving
                ? 'Reserving stock…'
                : isLoggedIn
                  ? 'Proceed to Checkout'
                  : 'Login to Checkout'}
            </button>
            {!isLoggedIn && (
              <p className="-mt-1 text-center text-xs text-[var(--text)]">
                You need an account to complete your purchase.
              </p>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
