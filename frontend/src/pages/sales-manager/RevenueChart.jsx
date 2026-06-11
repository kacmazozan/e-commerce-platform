import { useState, useEffect, useCallback } from 'react'
import {
  ComposedChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import API_BASE from '../../api'
import { btnSearch, fieldInputClass } from '../../styles/dashboardStyles'

function todayStr() {
  return new Date().toISOString().slice(0, 10)
}

function firstOfMonthStr() {
  const now = new Date()
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString().slice(0, 10)
}

function fmt(value) {
  const n = parseFloat(value || 0)
  return (n < 0 ? '-$' : '$') + Math.abs(n).toFixed(2)
}

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  const rev = payload.find((p) => p.dataKey === 'revenue')?.value ?? 0
  const cost = payload.find((p) => p.dataKey === 'cost')?.value ?? 0
  const profit = rev - cost
  return (
    <div
      style={{
        backgroundColor: 'rgba(16,13,30,0.97)',
        border: '1px solid rgba(255,255,255,0.12)',
        borderRadius: '10px',
        fontSize: '13px',
        boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
        padding: '10px 14px',
        outline: 'none',
      }}
    >
      <p style={{ color: '#9d8ec9', fontWeight: 600, marginBottom: '6px' }}>
        {label ? label.slice(5) : ''}
      </p>
      <p style={{ color: '#34d399', margin: '2px 0' }}>Revenue: {fmt(rev)}</p>
      <p style={{ color: '#fbbf24', margin: '2px 0' }}>Cost: {fmt(cost)}</p>
      <p style={{ color: profit >= 0 ? '#60a5fa' : '#f87171', margin: '2px 0' }}>
        Profit: {fmt(profit)}
      </p>
    </div>
  )
}

export default function RevenueChart({ token }) {
  const [chartData, setChartData] = useState([])
  const [summary, setSummary] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const [startDate, setStartDate] = useState(firstOfMonthStr)
  const [endDate, setEndDate] = useState(todayStr)
  const [appliedStart, setAppliedStart] = useState(firstOfMonthStr)
  const [appliedEnd, setAppliedEnd] = useState(todayStr)

  const fetchRevenue = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams({ startDate: appliedStart, endDate: appliedEnd })
      const res = await fetch(`${API_BASE}/api/sales-manager/revenue?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error || 'Failed to load revenue data')
      }
      const data = await res.json()
      setChartData(
        data.daily.map((d) => ({
          ...d,
          revenue: parseFloat(d.revenue),
          cost: parseFloat(d.cost),
          profit_loss: parseFloat(d.profit_loss),
        }))
      )
      setSummary(data.summary)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [token, appliedStart, appliedEnd])

  useEffect(() => {
    fetchRevenue()
  }, [fetchRevenue])

  function handleFilter(e) {
    e.preventDefault()
    setAppliedStart(startDate)
    setAppliedEnd(endDate)
  }

  const profitPositive = summary && parseFloat(summary.net_profit_loss) >= 0

  const xAngle = chartData.length > 30 ? -35 : 0
  const xAnchor = chartData.length > 30 ? 'end' : 'middle'
  const xHeight = chartData.length > 30 ? 55 : 30
  const xFormatter = (d) => {
    if (chartData.length > 60) {
      const [y, m] = d.split('-')
      return new Date(y, m - 1, 1).toLocaleDateString('en-US', { month: 'short', year: '2-digit' })
    }
    return d.slice(5)
  }

  return (
    <div className="space-y-6 p-6">
      <h2 className="text-xl font-semibold text-[var(--text-h)]">Revenue &amp; Profit</h2>

      <form onSubmit={handleFilter} className="flex flex-wrap items-end gap-3">
        <div className="flex flex-col gap-1">
          <label className="text-xs text-[var(--text)] opacity-70">From</label>
          <input
            type="date"
            value={startDate}
            max={endDate}
            onChange={(e) => setStartDate(e.target.value)}
            className={fieldInputClass}
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs text-[var(--text)] opacity-70">To</label>
          <input
            type="date"
            value={endDate}
            min={startDate}
            max={todayStr()}
            onChange={(e) => setEndDate(e.target.value)}
            className={fieldInputClass}
          />
        </div>
        <button
          type="submit"
          className={`${btnSearch} w-full sm:w-auto`}
          style={{ paddingTop: '0.625rem', paddingBottom: '0.625rem' }}
          disabled={loading}
        >
          {loading ? 'Loading…' : 'Generate Report'}
        </button>
      </form>

      {error && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/15 p-3 text-sm text-red-400">
          {error}
        </div>
      )}

      {summary && parseInt(summary.missing_cost_products) > 0 && (
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/15 p-3 text-sm text-amber-400">
          Warning: {summary.missing_cost_products} product(s) have no cost price set — treated as
          $0, which may overstate profit calculations.
        </div>
      )}

      {summary && (
        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-xl border border-[var(--border)] bg-[var(--card-bg)] p-3 shadow-[var(--shadow)] sm:p-5">
            <p className="mb-1 text-xs tracking-wide text-[var(--text)] uppercase opacity-60">
              Total Revenue
            </p>
            <p className="text-base font-bold text-emerald-400 sm:text-2xl">
              {fmt(summary.total_revenue)}
            </p>
          </div>
          <div className="rounded-xl border border-[var(--border)] bg-[var(--card-bg)] p-3 shadow-[var(--shadow)] sm:p-5">
            <p className="mb-1 text-xs tracking-wide text-[var(--text)] uppercase opacity-60">
              Total Cost
            </p>
            <p className="text-base font-bold text-amber-400 sm:text-2xl">
              {fmt(summary.total_cost)}
            </p>
          </div>
          <div className="rounded-xl border border-[var(--border)] bg-[var(--card-bg)] p-3 shadow-[var(--shadow)] sm:p-5">
            <p className="mb-1 text-xs tracking-wide text-[var(--text)] uppercase opacity-60">
              Net Profit
            </p>
            <p
              className={`text-base font-bold sm:text-2xl ${profitPositive ? 'text-blue-400' : 'text-red-400'}`}
            >
              {fmt(summary.net_profit_loss)}
            </p>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex h-[340px] items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--card-bg)]">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-emerald-400 border-t-transparent" />
        </div>
      ) : chartData.length === 0 ? (
        <div className="rounded-xl border border-[var(--border)] bg-[var(--card-bg)] p-10 text-center text-sm text-[var(--text)] opacity-50">
          No orders found for this period.
        </div>
      ) : (
        <div className="rounded-xl border border-[var(--border)] bg-[var(--card-bg)] p-5 shadow-[var(--shadow)]">
          <ResponsiveContainer width="100%" height={340}>
            <ComposedChart data={chartData} margin={{ top: 5, right: 20, left: 20, bottom: 5 }}>
              <defs>
                <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#34d399" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#34d399" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="costGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#fbbf24" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#fbbf24" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.07)" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 11, fill: 'var(--text)' }}
                tickFormatter={xFormatter}
                interval={Math.max(0, Math.ceil(chartData.length / 7) - 1)}
                angle={xAngle}
                textAnchor={xAnchor}
                height={xHeight}
              />
              <YAxis tick={{ fontSize: 11, fill: 'var(--text)' }} tickFormatter={(v) => `$${v}`} />
              <Tooltip
                cursor={{ stroke: 'rgba(255,255,255,0.12)', strokeWidth: 1 }}
                content={<CustomTooltip />}
              />
              <Legend />
              <Area
                type="monotone"
                dataKey="revenue"
                stroke="#34d399"
                strokeWidth={2}
                fill="url(#revenueGrad)"
                dot={false}
                activeDot={{ r: 5, fill: '#34d399', strokeWidth: 0 }}
                name="Revenue"
                legendType="line"
              />
              <Area
                type="monotone"
                dataKey="cost"
                stroke="#fbbf24"
                strokeWidth={2}
                fill="url(#costGrad)"
                dot={false}
                activeDot={{ r: 5, fill: '#fbbf24', strokeWidth: 0 }}
                name="Cost"
                legendType="line"
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  )
}
