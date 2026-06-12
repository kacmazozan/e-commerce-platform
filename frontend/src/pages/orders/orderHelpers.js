export const TIMELINE_STEPS = [
  { key: 'placed', label: 'Order Placed' },
  { key: 'processing', label: 'Processing' },
  { key: 'shipped', label: 'In Transit' },
  { key: 'delivered', label: 'Delivered' },
]

export const STATUS_INDEX = { placed: 0, processing: 1, shipped: 2, delivered: 3 }

export function mapStatus(dbStatus) {
  if (dbStatus === 'pending') return 'placed'
  return dbStatus
}

export function isActive(order) {
  return order.status !== 'delivered' && order.status !== 'cancelled'
}

export function isCancellable(order) {
  return order.status === 'pending' || order.status === 'processing'
}

export function formatDate(isoStr) {
  return new Date(isoStr).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

export function nameHue(name) {
  let h = 0
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) % 360
  return h
}

export function statusPillClass(status) {
  const base = 'inline-block text-[11px] font-bold tracking-[0.5px] px-2.5 py-1 rounded-full'
  switch (status) {
    case 'placed':
    case 'pending':
      return `${base} bg-slate-500/15 text-[var(--text-h)]`
    case 'processing':
      return `${base} bg-amber-500/15 text-amber-600`
    case 'shipped':
      return `${base} bg-blue-500/15 text-blue-500`
    case 'delivered':
      return `${base} bg-green-500/15 text-green-600`
    case 'cancelled':
      return `${base} bg-red-400/15 text-red-400`
    default:
      return base
  }
}

export function statusLabel(dbStatus) {
  switch (dbStatus) {
    case 'pending':
      return 'Order Placed'
    case 'processing':
      return 'Processing'
    case 'shipped':
      return 'In Transit'
    case 'delivered':
      return 'Delivered'
    case 'cancelled':
      return 'Cancelled'
    default:
      return dbStatus
  }
}
