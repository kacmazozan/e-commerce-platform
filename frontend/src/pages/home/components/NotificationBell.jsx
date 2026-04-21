import { useState, useEffect, useRef } from 'react'
import API_BASE from '../../../api'

export default function NotificationBell({ token }) {
  const [open, setOpen] = useState(false)
  const [notifications, setNotifications] = useState([])
  const [unreadCount, setUnreadCount] = useState(0)
  const ref = useRef(null)

  // Load notifications when a token is available.
  useEffect(() => {
    if (!token) return
    fetch(`${API_BASE}/api/notifications`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!data) return
        setNotifications(data.notifications)
        setUnreadCount(data.unreadCount)
      })
      .catch(() => {})
  }, [token])

  useEffect(() => {
    function handleClickOutside(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  async function refetchNotifications() {
    try {
      const res = await fetch(`${API_BASE}/api/notifications`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) return
      const data = await res.json()
      setNotifications(data.notifications)
      setUnreadCount(data.unreadCount)
    } catch {
      // Silently fail — notifications are non-critical
    }
  }

  async function markRead(id) {
    try {
      const res = await fetch(`${API_BASE}/api/notifications/${id}/read`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) return
      setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)))
      setUnreadCount((prev) => Math.max(0, prev - 1))
    } catch {
      // Silently fail
    }
  }

  async function markAllRead() {
    try {
      const res = await fetch(`${API_BASE}/api/notifications/read-all`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) return
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })))
      setUnreadCount(0)
    } catch {
      // Silently fail
    }
  }

  async function clearAll() {
    try {
      const res = await fetch(`${API_BASE}/api/notifications`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) return
      setNotifications([])
      setUnreadCount(0)
    } catch {
      // Silently fail
    }
  }

  function handleToggle() {
    const next = !open
    setOpen(next)
    if (next) refetchNotifications()
  }

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        className="relative flex h-10 w-10 items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--card-bg)] text-[var(--text-h)] transition-colors hover:border-purple-400/40 hover:bg-purple-400/12 hover:text-purple-400"
        aria-label="Notifications"
        aria-expanded={open}
        aria-haspopup="menu"
        onClick={handleToggle}
      >
        <BellIcon />
        {unreadCount > 0 && (
          <span className="absolute top-[-6px] right-[-6px] flex h-4 min-w-4 items-center justify-center rounded-full bg-red-400 px-1 text-[10px] font-bold text-white shadow-sm">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div
          role="menu"
          className="animate-in fade-in slide-in-from-top-1.5 light:bg-white/92 light:shadow-[0_10px_30px_rgba(0,0,0,0.15)] absolute top-[calc(100%+16px)] right-0 z-[200] w-[320px] overflow-hidden rounded-2xl border border-[var(--border)] bg-[rgba(var(--background-rgb),0.92)] shadow-[var(--shadow)] backdrop-blur-xl"
        >
          <div className="flex items-center justify-between border-b border-[var(--border)] px-4 py-3">
            <span className="text-[13px] font-semibold text-[var(--text-h)]">Notifications</span>
            <div className="flex items-center gap-3">
              {unreadCount > 0 && (
                <button
                  type="button"
                  role="menuitem"
                  className="text-[11px] text-purple-400 hover:underline"
                  onClick={markAllRead}
                >
                  Mark all as read
                </button>
              )}
              {notifications.length > 0 && (
                <button
                  type="button"
                  role="menuitem"
                  className="text-[11px] text-[var(--text)] opacity-50 hover:underline hover:opacity-100"
                  onClick={clearAll}
                >
                  Clear all
                </button>
              )}
            </div>
          </div>

          {notifications.length === 0 ? (
            <p className="px-4 py-6 text-center text-[13px] text-[var(--text)] opacity-50">
              No notifications yet
            </p>
          ) : (
            <div className="max-h-[360px] overflow-y-auto">
              {notifications.map((n) => (
                <button
                  key={n.id}
                  role="menuitem"
                  className={`flex w-full flex-col gap-0.5 border-b border-[var(--border)] px-4 py-3 text-left transition-colors last:border-b-0 hover:bg-purple-400/5 ${!n.is_read ? 'bg-purple-400/5' : ''}`}
                  onClick={() => !n.is_read && markRead(n.id)}
                >
                  <div className="flex items-center gap-2">
                    {!n.is_read && (
                      <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-purple-400" />
                    )}
                    <span className="text-[12px] font-semibold text-[var(--text-h)]">
                      {n.product_name}
                    </span>
                  </div>
                  <span className="text-[11px] text-[var(--text)]">
                    Price dropped from{' '}
                    <span className="line-through opacity-60">
                      ${parseFloat(n.original_price).toFixed(2)}
                    </span>{' '}
                    to{' '}
                    <span className="font-semibold text-green-400">
                      ${parseFloat(n.discounted_price).toFixed(2)}
                    </span>{' '}
                    <span className="text-green-400">(-{n.discount_percent}%)</span>
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function BellIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      width="18"
      height="18"
    >
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
  )
}
