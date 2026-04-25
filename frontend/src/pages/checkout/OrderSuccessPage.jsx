import { useLocation, useNavigate, Navigate } from 'react-router-dom'

function CheckIcon() {
  return (
    <svg
      width="32"
      height="32"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polyline points="20 6 9 17 4 12" />
    </svg>
  )
}

function MailIcon() {
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
      <rect x="2" y="4" width="20" height="16" rx="2" />
      <polyline points="2,4 12,13 22,4" />
    </svg>
  )
}

export default function OrderSuccessPage() {
  const { state } = useLocation()
  const navigate = useNavigate()

  if (!state?.orderId) return <Navigate to="/" replace />

  const { orderId, items = [], subtotal = 0, shippingCost = 0, address = '' } = state
  const invoiceNumber = `INV-${new Date().getFullYear()}-${String(orderId).padStart(6, '0')}`
  const grandTotal = subtotal + shippingCost

  const effectivePrice = (item) =>
    parseFloat(item.discounted_price != null ? item.discounted_price : item.price)

  return (
    <div className="flex min-h-svh w-full flex-col items-center bg-[var(--bg)] px-6 pt-16 pb-20">
      <div
        className="pointer-events-none fixed inset-0 z-0 overflow-hidden"
        aria-hidden="true"
        style={{
          background:
            'linear-gradient(170deg, var(--bg) 0%, var(--bg-gradient-to) 25%, var(--accent-bg) 50%, var(--bg-gradient-to) 75%, var(--bg) 100%)',
        }}
      />

      <div className="relative z-[1] mx-auto w-full max-w-[640px] pt-12">
        {/* Success badge */}
        <div className="mb-8 flex flex-col items-center gap-4 text-center">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-[#4caf82]/15 text-[#4caf82]">
            <CheckIcon />
          </div>
          <div>
            <h1 className="m-0 text-[30px] font-extrabold tracking-[-0.5px] text-[var(--text-h)]">
              Order Placed!
            </h1>
            <p className="m-0 mt-1.5 text-[15px] text-[var(--text)]">
              Your payment was successful and your order is confirmed.
            </p>
          </div>
          <div className="flex items-center gap-2 rounded-full border border-purple-400/25 bg-purple-400/8 px-4 py-1.5 text-[13px] font-semibold text-purple-400">
            Order #{orderId} · {invoiceNumber}
          </div>
        </div>

        {/* Email notice */}
        <div className="mb-6 flex items-center gap-3 rounded-xl border border-[#4caf82]/25 bg-[#4caf82]/8 px-4 py-3">
          <span className="shrink-0 text-[#4caf82]">
            <MailIcon />
          </span>
          <p className="m-0 text-[13px] text-[var(--text)]">
            A PDF invoice has been sent to your email address.
          </p>
        </div>

        {/* Invoice card */}
        <div className="rounded-2xl border border-[var(--glass-border)] bg-[var(--card-bg)] shadow-[var(--shadow)] backdrop-blur-xl">
          {/* Items */}
          <div className="p-6 pb-4">
            <h2 className="m-0 mb-4 text-[14px] font-bold tracking-[0.8px] text-[var(--text)] uppercase opacity-60">
              Order Summary
            </h2>
            <div className="flex flex-col gap-3">
              {items.map((item) => {
                const lineTotal = effectivePrice(item) * item.quantity
                return (
                  <div key={item.id ?? item.product_id} className="flex items-center gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-purple-400/12">
                      <span className="text-xs font-bold text-purple-400">{item.name[0]}</span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="m-0 overflow-hidden text-[13px] font-medium text-ellipsis whitespace-nowrap text-[var(--text-h)]">
                        {item.name}
                      </p>
                      <p className="m-0 text-[11px] text-[var(--text)] opacity-60">
                        {item.size ? `Size ${item.size} · ` : ''}× {item.quantity}
                        {item.discounted_price != null && (
                          <span className="ml-1 text-red-400">
                            (was ${parseFloat(item.price).toFixed(2)})
                          </span>
                        )}
                      </p>
                    </div>
                    <span className="shrink-0 text-[13px] font-semibold text-[var(--text-h)]">
                      ${lineTotal.toFixed(2)}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>

          <hr className="border-t border-[var(--border)]" />

          {/* Totals */}
          <div className="flex flex-col gap-2 px-6 py-4">
            <div className="flex justify-between text-sm text-[var(--text)]">
              <span>Subtotal</span>
              <span>${subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm text-[var(--text)]">
              <span>Shipping</span>
              <span className={shippingCost === 0 ? 'font-semibold text-[#4caf82]' : ''}>
                {shippingCost === 0 ? 'Free' : `$${shippingCost.toFixed(2)}`}
              </span>
            </div>
            <div className="flex justify-between text-[15px] font-bold text-[var(--text-h)]">
              <span>Total Paid</span>
              <span>${grandTotal.toFixed(2)}</span>
            </div>
          </div>

          {address && (
            <>
              <hr className="border-t border-[var(--border)]" />
              <div className="px-6 py-4">
                <p className="m-0 mb-1.5 text-[11px] font-bold tracking-[0.8px] text-[var(--text)] uppercase opacity-60">
                  Shipping To
                </p>
                <p className="m-0 text-[13px] leading-relaxed whitespace-pre-line text-[var(--text-h)]">
                  {address}
                </p>
              </div>
            </>
          )}
        </div>

        {/* Actions */}
        <div className="mt-6 flex flex-col gap-3">
          <button
            type="button"
            className="w-full cursor-pointer rounded-[10px] border-none bg-purple-400 py-3.5 text-[15px] font-semibold text-white transition-opacity hover:opacity-88"
            onClick={() => navigate('/orders')}
          >
            Track My Order
          </button>
          <button
            type="button"
            className="w-full cursor-pointer rounded-[10px] border border-[var(--border)] bg-transparent py-3 text-[14px] font-semibold text-[var(--text)] transition-colors hover:border-purple-400/40 hover:text-purple-400"
            onClick={() => navigate('/')}
          >
            Continue Shopping
          </button>
        </div>
      </div>
    </div>
  )
}
