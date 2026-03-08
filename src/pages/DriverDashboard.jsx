import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import DriverHeader from '../components/DriverHeader'
import StatCard from '../components/StatCard'
import DeliveryCard from '../components/DeliveryCard'
import GlassCard from '../components/GlassCard'
import { ACTIVE_ORDER_KEY, getStoredUser } from '../lib/session'
import { computeRouteDistanceKm, fetchOrders, removeRealtimeChannel, subscribeOrdersRealtime, triggerDriverSos, updateOrder, upsertCompletedDelivery } from '../lib/dataService'

const navItems = [
  ['Today\'s Jobs', '/todays-job'],
  ['Navigate', '/navigate'],
  ['Proof of Delivery', '/proof-delivery'],
  ['Earnings', '/earnings'],
  ['Vehicle', '/vehicle-type'],
  ['Completed', '/completed'],
]

export default function DriverDashboard() {
  const navigate = useNavigate()
  const user = useMemo(() => getStoredUser(), [])
  const [dismissAqi, setDismissAqi] = useState(false)
  const [orders, setOrders] = useState([])
  const [active, setActive] = useState(null)
  const [statusText, setStatusText] = useState('')

  const activeStatuses = ['assigned', 'in_progress', 'in-transit', 'in_transit', 'in transit', 'active', 'enroute']

  const refresh = async () => {
    const list = await fetchOrders({})
    setOrders(list)
    const email = String(user?.email || '').toLowerCase()
    const current = list.find((o) => activeStatuses.includes(String(o.status || '').toLowerCase()) && String(o.driver_email || '').toLowerCase() === email) || null
    setActive(current)
  }

  useEffect(() => {
    if (!user?.email) {
      navigate('/driver-login')
      return
    }
    refresh()
    const channel = subscribeOrdersRealtime(refresh)
    return () => removeRealtimeChannel(channel)
  }, [navigate])

  const available = orders.filter((o) => ['available', 'pending'].includes(String(o.status || '').toLowerCase()))
  const email = String(user?.email || '').toLowerCase()
  const completedToday = orders.filter((o) => String(o.status || '').toLowerCase() === 'completed' && String(o.driver_email || '').toLowerCase() === email).length
  const assigned = orders.filter((o) => activeStatuses.includes(String(o.status || '').toLowerCase()) && String(o.driver_email || '').toLowerCase() === email)
  const distanceCovered = assigned.reduce((sum, item) => sum + Number(item.distance || 0), 0).toFixed(2)

  const handleAccept = async (order) => {
    if (active) return
    const key = order.id || order.order_id
    if (!key) return
    const km = await computeRouteDistanceKm(order)
    const ok = await updateOrder(key, { status: 'assigned', driver_email: user.email, distance: km })
    if (!ok) return
    localStorage.setItem(ACTIVE_ORDER_KEY, String(key))
    setStatusText(`Accepted delivery ${order.order_id || key}`)
    refresh()
  }

  const handleReject = async (order) => {
    const key = order.id || order.order_id
    if (!key) return
    const ok = await updateOrder(key, { status: 'rejected' })
    if (!ok) return
    setOrders((prev) => prev.filter((item) => String(item.id || item.order_id) !== String(key)))
    setStatusText(`Rejected delivery ${order.order_id || key}`)
  }

  const sendSos = async () => {
    const ok = await triggerDriverSos(user?.email)
    setStatusText(ok ? 'SOS sent to operator dashboard.' : 'SOS failed.')
  }

  const handleStartTrip = async () => {
    if (!active) return
    const activeKey = active.id || active.order_id
    const ok = await updateOrder(activeKey, { status: 'in transit' })
    if (!ok) {
      setStatusText('Start Trip failed: database update issue.')
      return
    }
    setActive((prev) => (prev ? { ...prev, status: 'in transit' } : prev))
    localStorage.setItem(ACTIVE_ORDER_KEY, String(activeKey))
    navigate('/navigate', { state: { orderId: activeKey } })
  }

  const handleMarkDelivered = async () => {
    if (!active || !user?.email) return
    const activeKey = active.id || active.order_id
    const patch = {
      status: 'completed',
      completed_at: new Date().toISOString(),
      driver_email: user.email,
      earnings: active.earnings || 0,
      distance: active.distance || 0,
    }
    const ok = await updateOrder(activeKey, patch)
    if (!ok) {
      setStatusText('Mark Delivered failed: database update issue.')
      return
    }
    await upsertCompletedDelivery({ ...active, ...patch, id: activeKey })
    localStorage.removeItem(ACTIVE_ORDER_KEY)
    setStatusText(`Delivered ${active.order_id || activeKey}.`)
    refresh()
  }

  const aqiCoords = active
    ? `${active.pickup_latitude ?? active.pickup_lat ?? '-'}, ${active.pickup_longitude ?? active.pickup_lng ?? '-'}`
    : 'unknown zone'

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-blue-700 to-teal-500 p-4 md:p-6">
      <div className="max-w-7xl mx-auto space-y-5">
        <DriverHeader name={user?.name || 'Driver'} subtitle={active ? 'Active Delivery' : 'Idle'} />

        {!dismissAqi ? (
          <div className="bg-orange-400/80 text-white rounded-2xl px-4 py-3 flex items-center justify-between">
            <p>AQI high near {aqiCoords}. Consider alternate route.</p>
            <button onClick={() => setDismissAqi(true)} className="bg-white/20 hover:bg-white/30 rounded-lg px-3 py-1">Dismiss</button>
          </div>
        ) : null}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <StatCard label="Assigned Jobs" value={assigned.length} />
          <StatCard label="Active Delivery" value={active ? (active.order_id || active.id) : 'None'} />
          <StatCard label="Completed Today" value={completedToday} />
          <StatCard label="Distance Covered" value={`${distanceCovered} km`} />
        </div>

        <div className="flex flex-wrap gap-2">
          {navItems.map(([label, to]) => (
            <button key={label} className="rounded-full bg-white/20 hover:bg-white/30 px-6 py-3 flex items-center gap-2 text-white transition-all" onClick={() => navigate(to)}>
              <span className="h-2 w-2 rounded-full bg-white/80" />
              {label}
            </button>
          ))}
        </div>

        <GlassCard className="p-5">
          <h3 className="text-white text-xl font-semibold">Operations Board</h3>
          <p className="text-white/75 mt-1">Available Deliveries</p>
          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
            {available.map((order) => (
              <DeliveryCard key={order.id || order.order_id} order={order} onAccept={handleAccept} onReject={handleReject} disabled={Boolean(active)} />
            ))}
          </div>
        </GlassCard>

        {active ? (
          <GlassCard className="p-5">
            <h3 className="text-white text-xl font-semibold">Delivery Information</h3>
            <p className="text-white/85 mt-2">Order ID: {active.order_id || active.id}</p>
            <p className="text-white/85">Pickup: {active.pickup_area || active.pickup_address || '-'}</p>
            <p className="text-white/85">Drop: {active.drop_address || active.delivery_area || '-'}</p>
            <p className="text-white/85">Status: {active.status || 'assigned'}</p>
            <div className="mt-3 flex gap-2">
              <button className="bg-white/20 hover:bg-white/30 text-white rounded-xl px-4 py-2 transition-all" onClick={handleStartTrip}>Start Trip</button>
              <button className="bg-white/20 hover:bg-white/30 text-white rounded-xl px-4 py-2 transition-all" onClick={handleMarkDelivered}>Mark Delivered</button>
            </div>
          </GlassCard>
        ) : null}

        {statusText ? <p className="text-white/85 text-sm">{statusText}</p> : null}
      </div>

      <button className="fixed bottom-6 right-6 h-14 w-14 rounded-full bg-red-600 hover:bg-red-700 text-white shadow-lg font-semibold" onClick={sendSos}>SOS</button>
    </div>
  )
}
