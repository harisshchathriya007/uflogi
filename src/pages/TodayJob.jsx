import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import GlassCard from '../components/GlassCard'
import PageBackButton from '../components/PageBackButton'
import { ACTIVE_ORDER_KEY, getStoredUser } from '../lib/session'
import { fetchOrders, removeRealtimeChannel, subscribeOrdersRealtime, updateOrder, upsertCompletedDelivery } from '../lib/dataService'

export default function TodayJob() {
  const navigate = useNavigate()
  const user = useMemo(() => getStoredUser(), [])
  const [active, setActive] = useState(null)
  const activeStatuses = ['assigned', 'in_progress', 'in-transit', 'in_transit', 'in transit', 'active', 'enroute']

  useEffect(() => {
    const load = async () => {
      const orders = await fetchOrders({})
      const email = String(user?.email || '').toLowerCase()
      const found = orders.find((o) => activeStatuses.includes(String(o.status || '').toLowerCase()) && String(o.driver_email || '').toLowerCase() === email)
      setActive(found || null)
    }
    load()
    const channel = subscribeOrdersRealtime(load)
    return () => removeRealtimeChannel(channel)
  }, [])

  const startTrip = async () => {
    if (!active) return
    const id = active.id || active.order_id
    const ok = await updateOrder(id, { status: 'in transit' })
    if (!ok) return
    localStorage.setItem(ACTIVE_ORDER_KEY, String(id))
    navigate('/navigate', { state: { orderId: id } })
  }

  const markDelivered = async () => {
    if (!active || !user?.email) return
    const id = active.id || active.order_id
    const patch = { status: 'completed', completed_at: new Date().toISOString(), driver_email: user.email, distance: active.distance || 0, earnings: active.earnings || 0 }
    const ok = await updateOrder(id, patch)
    if (!ok) return
    await upsertCompletedDelivery({ ...active, ...patch, id })
    localStorage.removeItem(ACTIVE_ORDER_KEY)
    navigate('/completed')
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-blue-700 to-teal-500 p-6">
      <PageBackButton />
      <div className="max-w-4xl mx-auto">
        <GlassCard className="p-6">
          <h2 className="text-white text-2xl font-semibold">Today's Job</h2>
          {!active ? <p className="text-white/80 mt-3">No active delivery.</p> : (
            <div className="mt-4 space-y-2 text-white">
              <p><span className="text-white/70">Order ID:</span> {active.order_id || active.id}</p>
              <p><span className="text-white/70">Pickup Location:</span> {active.pickup_area || active.pickup_address || '-'}</p>
              <p><span className="text-white/70">Drop Location:</span> {active.drop_address || active.delivery_area || '-'}</p>
              <p><span className="text-white/70">Distance:</span> {active.distance || active.distance_km || 0} km</p>
              <p><span className="text-white/70">Deadline:</span> {active.delivery_deadline || active.deadline || '-'}</p>
              <div className="pt-3 flex gap-2">
                <button className="bg-white/20 hover:bg-white/30 text-white rounded-xl px-4 py-2 transition-all" onClick={startTrip}>Start Trip</button>
                <button className="bg-white/20 hover:bg-white/30 text-white rounded-xl px-4 py-2 transition-all" onClick={markDelivered}>Mark Delivered</button>
              </div>
            </div>
          )}
        </GlassCard>
      </div>
    </div>
  )
}
