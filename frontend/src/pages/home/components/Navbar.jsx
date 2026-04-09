import { useState, useRef, useEffect } from 'react'
import {
  CartIcon,
  WishlistIcon,
  SearchIcon,
  UserIcon,
  OrdersIcon,
  SettingsIcon,
  HelpIcon,
  LogoutIcon,
  SunIcon,
  MoonIcon,
} from '../../../components/icons'
import { useTheme } from '../../../context/ThemeContext'

export default function Navbar({
  isLoggedIn,
  userEmail,
  onNavigate,
  onRequireAuth,
  onLogout,
  cartCount,
  wishlistCount,
  searchQuery,
  setSearchQuery,
}) {
  const [avatarOpen, setAvatarOpen] = useState(false)
  const avatarRef = useRef(null)
  const { theme, toggleTheme } = useTheme()

  useEffect(() => {
    function handleClickOutside(e) {
      if (avatarRef.current && !avatarRef.current.contains(e.target)) {
        setAvatarOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <header className="light:bg-white/95 light:shadow-[0_2px_15px_rgba(0,0,0,0.08)] fixed top-0 right-0 left-0 z-[1000] border-b border-[var(--border)] bg-[rgba(var(--background-rgb,16,13,30),0.75)] px-6 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-[1280px] items-center gap-6">
        {/* Brand */}
        <div className="shrink-0 text-[22px] font-bold tracking-[4px] text-[var(--text-h)]">
          FIER
        </div>

        {/* Search bar */}
        <div className="flex h-10 max-w-[480px] flex-1 items-center gap-2 rounded-[10px] border border-[var(--border)] bg-[var(--card-bg)] px-[14px] backdrop-blur-xl transition-[border-color,background] duration-200 focus-within:border-purple-400/50 focus-within:bg-[var(--card-bg)]">
          <span className="flex items-center text-[var(--text)]">
            <SearchIcon />
          </span>
          <input
            type="text"
            placeholder="Search for clothes, brands…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1 border-none bg-transparent text-sm text-[var(--text-h)] outline-none placeholder:text-[var(--text)]/40"
          />
        </div>

        {/* Actions */}
        <nav className="ml-auto flex items-center gap-2">
          {/* Theme Toggle Button (where SALE was) */}
          <button
            onClick={toggleTheme}
            className="flex h-10 w-10 items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--card-bg)] text-[var(--text-h)] transition-colors hover:border-purple-400/40 hover:bg-purple-400/12 hover:text-purple-400"
            aria-label={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          >
            {theme === 'dark' ? <SunIcon /> : <MoonIcon />}
          </button>

          {/* Wishlist */}
          <button
            className="relative flex h-10 w-10 items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--card-bg)] text-[var(--text-h)] transition-colors hover:border-purple-400/40 hover:bg-purple-400/12 hover:text-purple-400"
            aria-label="Wishlist"
            onClick={() => (isLoggedIn ? onNavigate('wishlist') : onRequireAuth())}
          >
            <WishlistIcon />
            {wishlistCount > 0 && (
              <span className="absolute top-[-6px] right-[-6px] flex h-4 min-w-4 items-center justify-center rounded-full bg-purple-400 px-1 text-[10px] font-bold text-white shadow-sm">
                {wishlistCount}
              </span>
            )}
          </button>

          {/* Cart */}
          <button
            className="relative flex h-10 w-10 items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--card-bg)] text-[var(--text-h)] transition-colors hover:border-purple-400/40 hover:bg-purple-400/12 hover:text-purple-400"
            aria-label="Shopping cart"
            onClick={() => onNavigate('cart')}
          >
            <CartIcon />
            {cartCount > 0 && (
              <span className="absolute top-[-6px] right-[-6px] flex h-4 min-w-4 items-center justify-center rounded-full bg-purple-400 px-1 text-[10px] font-bold text-white shadow-sm">
                {cartCount}
              </span>
            )}
          </button>

          {/* Avatar menu */}
          <div className="relative" ref={avatarRef}>
            <button
              className="flex h-10 w-10 items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--card-bg)] text-[var(--text-h)] transition-all hover:border-purple-400/40 hover:bg-purple-400/12 hover:text-purple-400 aria-expanded:border-purple-400 aria-expanded:bg-purple-400/12 aria-expanded:text-purple-400"
              onClick={() => setAvatarOpen((o) => !o)}
              aria-label="Account menu"
              aria-expanded={avatarOpen}
            >
              {isLoggedIn && userEmail ? (
                <span className="text-[13px] font-bold uppercase">{userEmail[0]}</span>
              ) : (
                <UserIcon />
              )}
            </button>

            {avatarOpen && (
              <div className="animate-in fade-in slide-in-from-top-1.5 light:bg-white/92 light:shadow-[0_10px_30px_rgba(0,0,0,0.15)] absolute top-[calc(100%+16px)] right-0 z-[200] w-[220px] rounded-2xl border border-[var(--border)] bg-[rgba(var(--background-rgb),0.92)] p-2 shadow-[var(--shadow)] backdrop-blur-xl">
                {isLoggedIn ? (
                  <>
                    <div className="flex items-center gap-2.5 px-2 pt-2 pb-2.5">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-purple-400/12 text-purple-400">
                        <UserIcon />
                      </div>
                      <div>
                        <p className="m-0 text-[13px] font-semibold text-[var(--text-h)]">
                          My Account
                        </p>
                        <p className="m-0 text-[11px] text-[var(--text)]">{userEmail}</p>
                      </div>
                    </div>

                    <div className="my-1 h-px bg-[var(--border)]" />

                    {[
                      {
                        icon: <OrdersIcon />,
                        label: 'My Orders',
                        action: () => {
                          setAvatarOpen(false)
                          onNavigate('orders')
                        },
                      },
                    ].map(({ icon, label, action }) => (
                      <button
                        key={label}
                        className="flex w-full items-center gap-2.5 rounded-lg border-none bg-transparent px-2.5 py-[9px] text-left text-[13px] text-[var(--text)] transition-[background,color] duration-100 hover:bg-purple-400/12 hover:text-[var(--text-h)]"
                        onClick={action}
                      >
                        {icon} {label}
                      </button>
                    ))}

                    <div className="my-1 h-px bg-[var(--border)]" />

                    {[
                      {
                        icon: <SettingsIcon />,
                        label: 'Account Settings',
                        action: () => {
                          setAvatarOpen(false)
                          onNavigate('account-settings')
                        },
                      },
                      {
                        icon: <HelpIcon />,
                        label: 'Help & Support',
                        action: () => {
                          setAvatarOpen(false)
                          onNavigate('help')
                        },
                      },
                    ].map(({ icon, label, action }) => (
                      <button
                        key={label}
                        className="flex w-full items-center gap-2.5 rounded-lg border-none bg-transparent px-2.5 py-[9px] text-left text-[13px] text-[var(--text)] transition-[background,color] duration-100 hover:bg-purple-400/12 hover:text-[var(--text-h)]"
                        onClick={action}
                      >
                        {icon} {label}
                      </button>
                    ))}

                    <div className="my-1 h-px bg-[var(--border)]" />

                    <button
                      className="flex w-full items-center gap-2.5 rounded-lg border-none bg-transparent px-2.5 py-[9px] text-left text-[13px] text-[var(--text)] transition-[background,color] duration-100 hover:bg-purple-400/12 hover:text-[var(--text-h)]"
                      onClick={toggleTheme}
                    >
                      {theme === 'dark' ? (
                        <>
                          <SunIcon /> Light Mode
                        </>
                      ) : (
                        <>
                          <MoonIcon /> Dark Mode
                        </>
                      )}
                    </button>

                    <div className="my-1 h-px bg-[var(--border)]" />

                    <button
                      className="flex w-full items-center gap-2.5 rounded-lg border-none bg-transparent px-2.5 py-[9px] text-left text-[13px] text-red-400 transition-[background] duration-100 hover:bg-red-500/8"
                      onClick={onLogout}
                    >
                      <LogoutIcon /> Sign Out
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      className="flex w-full items-center gap-2.5 rounded-lg border-none bg-transparent px-2.5 py-[9px] text-left text-[13px] text-[var(--text)] transition-[background,color] duration-100 hover:bg-purple-400/12 hover:text-[var(--text-h)]"
                      onClick={() => {
                        setAvatarOpen(false)
                        onRequireAuth()
                      }}
                    >
                      <UserIcon /> Sign In
                    </button>
                    <div className="my-1 h-px bg-[var(--border)]" />
                    <button
                      className="flex w-full items-center gap-2.5 rounded-lg border-none bg-transparent px-2.5 py-[9px] text-left text-[13px] text-[var(--text)] transition-[background,color] duration-100 hover:bg-purple-400/12 hover:text-[var(--text-h)]"
                      onClick={toggleTheme}
                    >
                      {theme === 'dark' ? (
                        <>
                          <SunIcon /> Light Mode
                        </>
                      ) : (
                        <>
                          <MoonIcon /> Dark Mode
                        </>
                      )}
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        </nav>
      </div>
    </header>
  )
}
