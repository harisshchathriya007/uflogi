import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import GlassCard from '../components/GlassCard'
import StatCard from '../components/StatCard'
import PageBackButton from '../components/PageBackButton'
import { fetchCompletedForDriver, removeRealtimeChannel, subscribeCompletedRealtime } from '../lib/dataService'
import { getStoredUser } from '../lib/session'

export default function DriverEarnings() {
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

  const today = new Date().toDateString()
  const todaySum = items.filter((i) => new Date(i.completed_at || Date.now()).toDateString() === today).reduce((s, i) => s + Number(i.earnings || 0), 0)
  const weekSum = items.reduce((s, i) => s + Number(i.earnings || 0), 0)
  const avg = items.length ? weekSum / items.length : 0

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-blue-700 to-teal-500 p-6">
      <PageBackButton />
      <div className="max-w-5xl mx-auto space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <StatCard label="Today's Earnings" value={`$${todaySum.toFixed(2)}`} />
          <StatCard label="Weekly Earnings" value={`$${weekSum.toFixed(2)}`} />
          <StatCard label="Average per Delivery" value={`$${avg.toFixed(2)}`} />
        </div>

        <GlassCard className="p-5">
          <h3 className="text-white text-xl font-semibold">Transaction History</h3>
          <div className="mt-3 space-y-2">
            {items.map((item) => (
              <div key={item.order_id || item.id} className="bg-white/10 rounded-xl p-3 text-white flex flex-wrap justify-between gap-2">
                <span>Order ID: {item.order_id || item.id}</span>
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
