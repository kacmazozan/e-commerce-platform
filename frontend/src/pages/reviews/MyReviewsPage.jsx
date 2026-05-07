import { useState, useEffect } from 'react'
import API_BASE from '../../api'

const STATUS_LABEL = {
  approved: 'Approved',
  pending: 'Pending approval',
  rejected: 'Not approved',
}

const STATUS_STYLE = {
  approved: 'bg-emerald-500/12 text-emerald-400',
  pending: 'bg-amber-400/12 text-amber-400',
  rejected: 'bg-red-400/12 text-red-400',
}

function StarSelector({ value, onChange }) {
  const [hovered, setHovered] = useState(null)
  const display = hovered ?? value ?? 0
  return (
    <div className="flex gap-0.5" role="group" aria-label="Select rating">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          aria-label={`${n} star${n > 1 ? 's' : ''}`}
          className="cursor-pointer border-none bg-transparent p-0 text-[22px] leading-none transition-transform hover:scale-110"
          style={{ color: n <= display ? '#f59e0b' : 'var(--border)' }}
          onMouseEnter={() => setHovered(n)}
          onMouseLeave={() => setHovered(null)}
          onClick={() => onChange(n)}
        >
          ★
        </button>
      ))}
    </div>
  )
}

function StarDisplay({ value }) {
  return (
    <span className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <span
          key={n}
          className="text-[18px] leading-none"
          style={{ color: n <= value ? '#f59e0b' : 'var(--border)' }}
        >
          ★
        </span>
      ))}
    </span>
  )
}

function ReviewCard({ review, token, onUpdated }) {
  const [editing, setEditing] = useState(false)
  const [rating, setRating] = useState(review.rating)
  const [content, setContent] = useState(review.content || '')
  const [anonymous, setAnonymous] = useState(review.anonymous)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  async function handleSave(e) {
    e.preventDefault()
    if (!rating) return
    setError('')
    setSubmitting(true)
    try {
      const res = await fetch(`${API_BASE}/api/products/${review.product_id}/reviews`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ rating, content: content.trim() || undefined, anonymous }),
      })
      if (!res.ok) {
        const data = await res.json()
        setError(data.error || 'Failed to save')
        return
      }
      const data = await res.json()
      onUpdated(data.review)
      setEditing(false)
    } catch {
      setError('Network error')
    } finally {
      setSubmitting(false)
    }
  }

  function handleCancel() {
    setRating(review.rating)
    setContent(review.content || '')
    setAnonymous(review.anonymous)
    setError('')
    setEditing(false)
  }

  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] p-5">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <p className="m-0 text-[15px] font-semibold text-[var(--text-h)]">
            {review.product_name}
          </p>
          <p className="mt-0.5 text-[11px] text-[var(--text)] opacity-50">
            {new Date(review.created_at).toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'short',
              day: 'numeric',
            })}
          </p>
        </div>
        <span
          className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold ${STATUS_STYLE[review.status]}`}
        >
          {STATUS_LABEL[review.status]}
        </span>
      </div>

      {editing ? (
        <form onSubmit={handleSave} className="space-y-3">
          <StarSelector value={rating} onChange={setRating} />

          <div>
            <label className="mb-1 block text-[12px] text-[var(--text)] opacity-60">
              Comment{' '}
              {!rating && <span className="italic opacity-70">— select a rating first</span>}
            </label>
            <textarea
              rows={3}
              disabled={!rating || submitting}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Share your thoughts… (optional)"
              className="w-full resize-none rounded-xl border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-[13px] text-[var(--text-h)] transition-opacity outline-none placeholder:text-[var(--text)]/40 focus:border-purple-400 disabled:cursor-not-allowed disabled:opacity-30"
            />
          </div>

          <label className="flex cursor-pointer items-center gap-2 text-[12px] text-[var(--text)] opacity-70 select-none">
            <input
              type="checkbox"
              checked={anonymous}
              onChange={(e) => setAnonymous(e.target.checked)}
              className="h-3.5 w-3.5 accent-purple-400"
            />
            Post anonymously
          </label>

          {error && <p className="text-[12px] text-red-400">{error}</p>}

          <div className="flex gap-2">
            <button
              type="submit"
              disabled={!rating || submitting}
              className="rounded-xl bg-purple-500 px-4 py-1.5 text-[13px] font-semibold text-white transition-colors hover:bg-purple-400 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {submitting ? 'Saving…' : 'Save'}
            </button>
            <button
              type="button"
              onClick={handleCancel}
              className="rounded-xl border border-[var(--border)] px-4 py-1.5 text-[13px] text-[var(--text)] transition-colors hover:border-purple-400/50 hover:text-[var(--text-h)]"
            >
              Cancel
            </button>
          </div>
        </form>
      ) : (
        <>
          <div className="mb-2 flex items-center gap-2">
            <StarDisplay value={review.rating} />
            {review.anonymous && (
              <span className="text-[11px] text-[var(--text)] opacity-40">· anonymous</span>
            )}
          </div>
          {review.content ? (
            <p className="mb-3 text-[14px] leading-relaxed text-[var(--text-h)]">
              {review.content}
            </p>
          ) : (
            <p className="mb-3 text-[13px] text-[var(--text)] italic opacity-40">No comment</p>
          )}
          {review.status !== 'pending' && (
            <button
              type="button"
              onClick={() => setEditing(true)}
              className="rounded-lg border border-[var(--border)] px-3 py-1.5 text-[12px] font-semibold text-[var(--text)] transition-colors hover:border-purple-400/50 hover:text-purple-400"
            >
              {review.status === 'rejected' ? 'Revise & resubmit' : 'Edit review'}
            </button>
          )}
        </>
      )}
    </div>
  )
}

export default function MyReviewsPage({ token }) {
  const [reviews, setReviews] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    fetch(`${API_BASE}/api/products/reviews/mine`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((data) => setReviews(data.reviews || []))
      .catch(() => setError('Failed to load reviews.'))
      .finally(() => setLoading(false))
  }, [token])

  function handleUpdated(updatedReview) {
    setReviews((prev) =>
      prev.map((r) => (r.id === updatedReview.id ? { ...r, ...updatedReview } : r))
    )
  }

  return (
    <div className="flex min-h-svh w-full flex-col bg-[var(--bg)] pt-16">
      <main className="mx-auto box-border w-full max-w-[1280px] px-6 pt-12 pb-16">
        <h1 className="mb-10 text-[32px] font-bold tracking-[-0.5px] text-[var(--text-h)]">
          My Reviews
        </h1>

        {loading && <p className="text-sm text-[var(--text)] opacity-60">Loading…</p>}

        {error && <p className="rounded-xl bg-red-400/8 px-4 py-3 text-sm text-red-400">{error}</p>}

        {!loading && !error && reviews.length === 0 && (
          <p className="text-[14px] text-[var(--text)] opacity-50">
            You haven&apos;t reviewed any products yet. Reviews can be submitted from{' '}
            <strong>My Orders</strong> after a delivery.
          </p>
        )}

        {reviews.length > 0 && (
          <div className="grid gap-4 sm:grid-cols-2">
            {reviews.map((r) => (
              <ReviewCard key={r.id} review={r} token={token} onUpdated={handleUpdated} />
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
