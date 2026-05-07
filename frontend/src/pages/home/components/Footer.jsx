import { useNavigate } from 'react-router-dom'

const SHOP_CATEGORIES = [
  {
    label: "Women's Clothing",
    title: "Women's Clothing",
    subtitle: 'New arrivals every week',
    hue: 280,
  },
  { label: "Men's Clothing", title: "Men's Clothing", subtitle: 'Timeless essentials', hue: 210 },
  { label: 'Outerwear', title: 'Outerwear', subtitle: 'Coats, jackets & more', hue: 200 },
  { label: 'Footwear', title: 'Footwear', subtitle: 'Step into style', hue: 160 },
  { label: 'Accessories', title: 'Accessories', subtitle: 'Finish the look', hue: 40 },
  {
    label: 'Sale',
    title: 'Sale',
    subtitle: 'Exclusive discounts on selected items',
    hue: 0,
    on_sale: true,
  },
]

export default function Footer() {
  const navigate = useNavigate()
  const linkCls =
    'cursor-pointer text-[13px] text-[var(--text)] transition-colors hover:text-purple-400'

  return (
    <footer className="relative z-[1] mt-auto bg-[rgba(var(--background-rgb),0.9)] backdrop-blur-xl">
      <div className="mx-auto flex max-w-[1280px] gap-16 px-6 pt-14 pb-10 max-lg:flex-col max-lg:gap-10">
        {/* Brand + newsletter */}
        <div className="flex flex-col gap-3 max-lg:flex-none lg:w-[260px]">
          <span className="text-[22px] font-bold tracking-[4px] text-[var(--text-h)]">FIER</span>
          <p className="m-0 text-[13px] leading-relaxed text-[var(--text)]">
            Curated fashion for every occasion.
          </p>
          <form
            className="mt-1 flex overflow-hidden rounded-lg border border-[var(--border)]"
            onSubmit={(e) => e.preventDefault()}
          >
            <input
              type="email"
              placeholder="Your email address"
              aria-label="Email for newsletter"
              className="min-w-0 flex-1 border-none bg-transparent px-3 py-[9px] text-[13px] text-[var(--text-h)] outline-none placeholder:text-[var(--text)]"
            />
            <button
              type="submit"
              className="cursor-pointer border-none bg-purple-400 px-[14px] py-[9px] text-xs font-bold tracking-[0.5px] whitespace-nowrap text-white transition-opacity hover:opacity-88"
            >
              Subscribe
            </button>
          </form>
        </div>

        {/* Links */}
        <div className="grid flex-1 grid-cols-2 gap-8 max-[420px]:grid-cols-1">
          {[
            {
              heading: 'Shop',
              links: SHOP_CATEGORIES.map(({ label, ...category }) => ({
                label,
                onClick: () => navigate('/category', { state: { category } }),
              })),
            },
            {
              heading: 'Customer Service',
              links: [
                { label: 'Contact Us', onClick: () => navigate('/help') },
                { label: 'Track My Order', onClick: () => navigate('/orders') },
                { label: 'Returns & Exchanges', onClick: () => navigate('/help') },
                { label: 'Shipping Info', onClick: () => navigate('/help') },
                { label: 'Size Guide', onClick: () => navigate('/help') },
                { label: 'FAQ', onClick: () => navigate('/help') },
              ],
            },
          ].map(({ heading, links }) => (
            <div key={heading}>
              <h4 className="mt-0 mb-4 text-xs font-bold tracking-[2px] text-[var(--text-h)] uppercase">
                {heading}
              </h4>
              <ul className="m-0 flex list-none flex-col gap-2.5 p-0">
                {links.map(({ label, onClick }) => (
                  <li key={label} className={linkCls} onClick={onClick}>
                    {label}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom bar */}
      <div className="border-t border-[var(--border)]">
        <div className="mx-auto flex max-w-[1280px] items-center justify-between gap-4 px-6 py-[18px] max-sm:flex-col max-sm:items-start max-sm:gap-3">
          <p className="m-0 text-xs text-[var(--text)]">
            © {new Date().getFullYear()} FIER. All rights reserved. &nbsp;·&nbsp;
            <span className="cursor-pointer transition-colors hover:text-purple-400">
              Privacy Policy
            </span>
            &nbsp;·&nbsp;
            <span className="cursor-pointer transition-colors hover:text-purple-400">
              Terms of Service
            </span>
            &nbsp;·&nbsp;
            <span className="cursor-pointer transition-colors hover:text-purple-400">
              Cookie Settings
            </span>
          </p>
          <div className="flex items-center gap-3">
            {[
              { label: 'Instagram', d: null, type: 'instagram' },
              { label: 'TikTok', d: null, type: 'tiktok' },
              { label: 'Facebook', d: null, type: 'facebook' },
            ].map(({ label }) => (
              <a
                key={label}
                href="#"
                aria-label={label}
                className="flex items-center text-[var(--text)] transition-colors hover:text-purple-400"
              >
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  {label === 'Instagram' && (
                    <>
                      <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
                      <circle cx="12" cy="12" r="4" />
                      <circle cx="17.5" cy="6.5" r="0.5" fill="currentColor" />
                    </>
                  )}
                  {label === 'TikTok' && <path d="M9 12a4 4 0 1 0 4 4V4a5 5 0 0 0 5 5" />}
                  {label === 'Facebook' && (
                    <path d="M18 2h-3a5 5 0 00-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 011-1h3z" />
                  )}
                </svg>
              </a>
            ))}
          </div>
        </div>
      </div>
    </footer>
  )
}
