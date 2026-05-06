import { Link } from 'react-router-dom'
import CatalogImage from '../../components/catalog/CatalogImage'
import { getProductImageUrl } from '../../lib/catalogAssets'

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

export default function WishlistPage({ onBack, wishlistItems, onRemove }) {
  if (wishlistItems.length === 0) {
    return (
      <div className="flex min-h-svh w-full flex-col bg-[var(--bg)] pt-16">
        <main className="mx-auto box-border w-full max-w-[1280px] px-6 pt-12 pb-16">
          <h1 className="mb-10 text-[32px] font-bold tracking-[-0.5px] text-[var(--text-h)]">
            Wishlist
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
                <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z" />
              </svg>
            </div>
            <p className="m-0 text-[20px] font-semibold text-[var(--text-h)]">
              Your wishlist is empty
            </p>
            <p className="m-0 mb-4 text-sm text-[var(--text)]">
              Save items you love and come back to them anytime.
            </p>
            <button
              type="button"
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
      <main className="mx-auto box-border w-full max-w-[1280px] px-6 pt-12 pb-16">
        <h1 className="mb-10 text-[32px] font-bold tracking-[-0.5px] text-[var(--text-h)]">
          Wishlist
        </h1>

        <div className="grid [grid-template-columns:repeat(auto-fill,minmax(260px,1fr))] gap-5">
          {wishlistItems.map((item) => {
            const availableStock = parseInt(item.available_stock ?? 0)
            const lowStock = availableStock > 0 && availableStock <= 10
            return (
              <div
                key={item.id}
                className="flex flex-col overflow-hidden rounded-2xl border border-[var(--glass-border)] bg-[var(--card-bg)] shadow-[var(--shadow)] backdrop-blur-xl transition-[transform,box-shadow] duration-250 hover:-translate-y-1 hover:shadow-[0_8px_24px_rgba(0,0,0,0.15),0_0_0_1px_rgba(192,132,252,0.35)]"
              >
                <Link
                  to={`/product/${item.id}`}
                  aria-label={`View ${item.name}`}
                  className="flex aspect-[4/3] w-full items-center justify-center bg-purple-400/12 no-underline"
                >
                  <CatalogImage
                    src={getProductImageUrl(item)}
                    alt={item.name}
                    containerClassName="h-full w-full"
                    imageClassName="object-contain p-3"
                    placeholder={
                      <span
                        aria-hidden="true"
                        className="text-5xl font-bold text-purple-400 opacity-50"
                      >
                        {item.name[0]}
                      </span>
                    }
                    style={{ background: 'rgba(192,132,252,0.12)' }}
                  />
                </Link>
                <div className="flex flex-1 flex-col gap-1 px-4 pt-3.5 pb-2">
                  <Link
                    to={`/product/${item.id}`}
                    className="text-[15px] font-medium text-[var(--text-h)] no-underline hover:text-purple-400"
                  >
                    {item.name}
                  </Link>
                  {item.discounted_price != null ? (
                    <div className="flex flex-col gap-0.5">
                      <span className="text-sm text-red-400 line-through opacity-70">
                        ${parseFloat(item.price).toFixed(2)}
                      </span>
                      <span className="text-sm font-bold text-purple-400">
                        ${parseFloat(item.discounted_price).toFixed(2)}
                        <span className="ml-1.5 text-[11px] font-semibold text-green-400">
                          -{item.discount_percent}%
                        </span>
                      </span>
                    </div>
                  ) : (
                    <span className="text-sm text-[var(--text)]">
                      ${parseFloat(item.price).toFixed(2)}
                    </span>
                  )}
                  {lowStock && (
                    <span className="text-[11px] font-semibold text-red-400">
                      Only {availableStock} left
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 px-4 pt-3 pb-4">
                  <Link
                    to={`/product/${item.id}`}
                    className="flex-1 rounded-lg border-none bg-purple-400 py-2 text-center text-[13px] font-semibold text-white no-underline transition-opacity hover:opacity-88"
                  >
                    Go to item
                  </Link>
                  <button
                    type="button"
                    className="flex cursor-pointer items-center rounded-lg border border-[var(--border)] bg-transparent p-2.5 text-[var(--text)] transition-colors hover:border-[rgba(232,93,93,0.3)] hover:bg-[rgba(232,93,93,0.1)] hover:text-[#e85d5d]"
                    onClick={() => onRemove(item.id)}
                    aria-label="Remove from wishlist"
                  >
                    <TrashIcon />
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      </main>
    </div>
  )
}
