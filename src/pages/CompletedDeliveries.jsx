import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import GlassCard from '../components/GlassCard'
import PageBackButton from '../components/PageBackButton'
import { fetchCompletedForDriver, removeRealtimeChannel, subscribeCompletedRealtime } from '../lib/dataService'
import { getStoredUser } from '../lib/session'

function getDayKey(date) {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  return d.toISOString()
}

export default function CompletedDeliveries() {
  const navigate = useNavigate()
  const user = useMemo(() => getStoredUser(), [])
  const [items, setItems] = useState([])

  useEffect(() => {
    if (!user?.email) {
      navigate('/driver-login')
      return undefined
    }
    const load = async () => setItems(await fetchCompletedForDriver(user.email))
    load()
    const channel = subscribeCompletedRealtime(user.email, load)
    return () => removeRealtimeChannel(channel)
  }, [navigate, user?.email])

  const chartData = useMemo(() => {
    const days = []
    for (let i = 6; i >= 0; i -= 1) {
      const d = new Date()
      d.setDate(d.getDate() - i)
      d.setHours(0, 0, 0, 0)
      days.push({ key: getDayKey(d), label: d.toLocaleDateString(undefined, { weekday: 'short' }), deliveries: 0, earnings: 0 })
    }
    const index = new Map(days.map((d, idx) => [d.key, idx]))
    items.forEach((item) => {
      const key = getDayKey(item.completed_at || Date.now())
      const idx = index.get(key)
      if (idx === undefined) return
      days[idx].deliveries += 1
      days[idx].earnings += Number(item.earnings || 0)
    })
    return days
  }, [items])

  const totalDeliveries = chartData.reduce((sum, d) => sum + d.deliveries, 0)
  const totalEarnings = chartData.reduce((sum, d) => sum + d.earnings, 0)

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-blue-700 to-teal-500 p-6">
      <PageBackButton />
      <div className="max-w-5xl mx-auto space-y-4">
        <GlassCard className="p-5">
          <h2 className="text-white text-2xl font-semibold">Completed Deliveries</h2>
          <p className="text-white/80 mt-1">Weekly Overview</p>
          <div className="mt-4 rounded-2xl border border-white/20 bg-white/10 p-4">
            <div className="mb-4 flex flex-wrap gap-3">
              <div className="rounded-xl bg-white/15 px-3 py-2 text-white">Deliveries: <span className="font-semibold">{totalDeliveries}</span></div>
              <div className="rounded-xl bg-white/15 px-3 py-2 text-white">Earnings: <span className="font-semibold">${totalEarnings.toFixed(2)}</span></div>
            </div>
            <svg viewBox="0 0 760 260" className="w-full rounded-xl bg-slate-950/20">
              <defs>
                <linearGradient id="deliveriesFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#60a5fa" stopOpacity="0.45" />
                  <stop offset="100%" stopColor="#60a5fa" stopOpacity="0.05" />
                </linearGradient>
              </defs>
              {[0, 1, 2, 3, 4].map((i) => {
                const y = 30 + i * 45
                return <line key={y} x1="45" y1={y} x2="730" y2={y} stroke="rgba(255,255,255,0.16)" strokeDasharray="4 6" />
              })}

              {(() => {
                const max = Math.max(...chartData.map((d) => d.deliveries), 1)
                const points = chartData.map((d, i) => {
                  const x = 60 + i * 110
                  const y = 210 - (d.deliveries / max) * 170
                  return { ...d, x, y }
                })
                const line = points.map((p) => `${p.x},${p.y}`).join(' ')
                const area = `${line} 720,210 60,210`
                return (
                  <>
                    <polygon points={area} fill="url(#deliveriesFill)" />
                    <polyline points={line} fill="none" stroke="#93c5fd" strokeWidth="4" strokeLinejoin="round" strokeLinecap="round" />
                    {points.map((p) => (
                      <g key={p.key}>
                        <circle cx={p.x} cy={p.y} r="5" fill="#dbeafe" />
                        <text x={p.x} y={p.y - 10} textAnchor="middle" fill="rgba(255,255,255,0.9)" fontSize="12">{p.deliveries}</text>
                        <text x={p.x} y="238" textAnchor="middle" fill="rgba(255,255,255,0.75)" fontSize="12">{p.label}</text>
                      </g>
                    ))}
                  </>
                )
              })()}
            </svg>
          </div>
        </GlassCard>

        <GlassCard className="p-5">
          <h3 className="text-white text-xl font-semibold">Delivery History</h3>
          <div className="mt-3 space-y-2">
            {items.map((item) => (
              <div key={item.order_id || item.id} className="bg-white/10 rounded-xl p-3 text-white flex flex-wrap gap-3 justify-between">
                <span>Order ID: {item.order_id || item.id}</span>
                <span>Category: {item.commodity || '-'}</span>
                <span>Date: {item.completed_at || '-'}</span>
                <span>Amount: ${Number(item.earnings || 0).toFixed(2)}</span>
              </div>
            ))}
          </div>
        </GlassCard>
      </div>
    </div>
  )
}
