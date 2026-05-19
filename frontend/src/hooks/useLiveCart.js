import { useCallback, useEffect, useRef, useState } from 'react'
import API_BASE from '../api'

const DEFAULT_INTERVAL_MS = 15_000

// Keeps a cart view in sync with the server so price changes (sales-manager
// discounts, base price edits) surface to the user without a manual refresh.
//
// Behavior:
//   - Fetches /api/cart on mount.
//   - Polls every `intervalMs` while the tab is visible.
//   - Pauses polling when the tab is hidden, fetches once and resumes when
//     the tab becomes visible again.
//   - Calls `onUpdate(items)` after every successful fetch so a parent (e.g.
//     App.jsx that owns global cart state for the navbar count) stays in sync.
//   - Returns a `refetch()` you can call before checkout confirm to grab the
//     freshest snapshot synchronously.
export default function useLiveCart(
  token,
  { initial = [], intervalMs = DEFAULT_INTERVAL_MS, onUpdate } = {}
) {
  const [items, setItems] = useState(initial)
  // Keep a stable reference to the latest onUpdate so refetch's identity
  // doesn't churn when the parent passes a new callback each render.
  const onUpdateRef = useRef(onUpdate)
  useEffect(() => {
    onUpdateRef.current = onUpdate
  }, [onUpdate])

  const refetch = useCallback(async () => {
    if (!token) return null
    try {
      const res = await fetch(`${API_BASE}/api/cart`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) return null
      const data = await res.json()
      const fresh = data?.items || []
      setItems(fresh)
      onUpdateRef.current?.(fresh)
      return fresh
    } catch {
      return null
    }
  }, [token])

  useEffect(() => {
    if (!token) return
    let cancelled = false
    let intervalId = null

    const safeRefetch = () => {
      if (cancelled) return
      refetch()
    }

    const startPolling = () => {
      if (intervalId != null) return
      intervalId = setInterval(safeRefetch, intervalMs)
    }
    const stopPolling = () => {
      if (intervalId != null) {
        clearInterval(intervalId)
        intervalId = null
      }
    }

    const handleVisibility = () => {
      if (cancelled) return
      if (document.visibilityState === 'visible') {
        safeRefetch()
        startPolling()
      } else {
        stopPolling()
      }
    }

    safeRefetch()
    if (typeof document === 'undefined' || document.visibilityState === 'visible') {
      startPolling()
    }
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', handleVisibility)
    }

    return () => {
      cancelled = true
      stopPolling()
      if (typeof document !== 'undefined') {
        document.removeEventListener('visibilitychange', handleVisibility)
      }
    }
  }, [token, intervalMs, refetch])

  return { items, setItems, refetch }
}
