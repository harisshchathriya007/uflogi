import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import OperatorSidebar from '../components/OperatorSidebar'
import StatCard from '../components/StatCard'
import GlassCard from '../components/GlassCard'
import { fetchDrivers, fetchOrders, removeRealtimeChannel, subscribeDriversRealtime, subscribeOrdersRealtime } from '../lib/dataService'
import { getStoredOperator } from '../lib/session'
import { loadGoogleMaps } from '../lib/maps'
import { supabase } from '../lib/supabaseClient'

export default function OperatorDashboard() {
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const [orders, setOrders] = useState([])
  const [drivers, setDrivers] = useState([])
  const [liveSosMessage, setLiveSosMessage] = useState('')
  const mapRef = useRef(null)

  useEffect(() => {
    const user = getStoredOperator()
    if (!user?.email) {
      navigate('/operator-login')
      return
    }
    const load = async () => {
      const [ordersData, driversData] = await Promise.all([fetchOrders({}), fetchDrivers()])
      setOrders(ordersData)
      setDrivers(driversData)
    }
    load()
    const ordersChannel = subscribeOrdersRealtime(load)
    const driversChannel = subscribeDriversRealtime(load)
    return () => {
      removeRealtimeChannel(ordersChannel)
      removeRealtimeChannel(driversChannel)
    }
  }, [navigate])

  const available = orders.filter((o) => ['available', 'pending'].includes(String(o.status || '').toLowerCase())).length
  const active = orders.filter((o) => ['assigned', 'in_progress', 'in-transit', 'in_transit', 'in transit'].includes(String(o.status || '').toLowerCase())).length
  const sosAlerts = drivers.filter((item) => Boolean(item.sos_active) || String(item.status || '').toLowerCase() === 'sos')
  const activeDriverPoints = useMemo(() => {
    const activeOrdersByEmail = new Map(
      orders
        .filter((order) => ['assigned', 'in_progress', 'active', 'enroute', 'in-transit', 'in_transit', 'in transit'].includes(String(order.status || '').toLowerCase()))
        .filter((order) => Boolean(order.driver_email))
        .map((order) => [String(order.driver_email).toLowerCase(), order]),
    )
    return drivers
      .map((driver) => {
        const latCandidates = [driver.current_lat, driver.current_latitude, driver.lat, driver.latitude]
        const lngCandidates = [driver.current_long, driver.current_lng, driver.current_longitude, driver.lng, driver.longitude]
        const parse = (v) => {
          const n = Number(v)
          return Number.isFinite(n) ? n : null
        }
        let lat = latCandidates.map(parse).find((item) => item !== null)
        let lng = lngCandidates.map(parse).find((item) => item !== null)
        if (lat === null || lng === null) {
          const email = String(driver.email || '').toLowerCase()
          const order = activeOrdersByEmail.get(email)
          if (order) {
            lat = parse(order.pickup_lat ?? order.pickup_latitude ?? order.drop_lat ?? order.delivery_latitude)
            lng = parse(order.pickup_lng ?? order.pickup_longitude ?? order.drop_lng ?? order.delivery_longitude)
          }
        }
        if (lat === null || lng === null) return null
        return { lat, lng, title: driver.driver_name || driver.name || driver.email || 'Driver' }
      })
      .filter(Boolean)
  }, [drivers, orders])

  useEffect(() => {
    const latest = sosAlerts[0]
    if (!latest) return
    const who = latest.driver_name || latest.name || latest.email || 'Unknown driver'
    const lat = latest.current_lat ?? latest.current_latitude ?? 'N/A'
    const lng = latest.current_long ?? latest.current_lng ?? latest.current_longitude ?? 'N/A'
    setLiveSosMessage(`Emergency SOS: ${who} at ${lat}, ${lng}`)
  }, [sosAlerts])

  useEffect(() => {
    const renderMap = async () => {
      if (!mapRef.current) return
      try {
        const googleObj = await loadGoogleMaps(import.meta.env.VITE_GOOGLE_MAPS_API_KEY)
        const center = activeDriverPoints[0] || { lat: 13.0827, lng: 80.2707 }
        const map = new googleObj.maps.Map(mapRef.current, { center, zoom: 11 })
        activeDriverPoints.forEach((point) => {
          new googleObj.maps.Marker({ position: { lat: point.lat, lng: point.lng }, map, title: point.title })
        })
      } catch {
        // keep UI usable even if maps fails
      }
    }
    renderMap()
  }, [activeDriverPoints])

  const onLogout = async () => {
    await supabase.auth.signOut()
    localStorage.removeItem('urbanflow_operator_user')
    navigate('/login-dashboard')
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-blue-700 to-teal-500 p-6">
      <div className="fixed top-4 right-4 z-30 flex items-center gap-2">
        <button className="bg-white/20 hover:bg-white/30 text-white rounded-xl px-4 py-2 transition-all" onClick={() => navigate(-1)}>Back</button>
        <button className="bg-white/20 hover:bg-white/30 text-white rounded-xl px-4 py-2 transition-all" onClick={onLogout}>Logout</button>
      </div>
      <button className="fixed top-4 left-4 z-50 bg-white/20 hover:bg-white/30 text-white rounded-xl px-4 py-2" onClick={() => setOpen(true)}>|||</button>
      <OperatorSidebar open={open} onClose={() => setOpen(false)} />

      <div className="max-w-7xl mx-auto pt-10 space-y-4">
        <h1 className="text-white text-3xl font-semibold">Logistics Operator Dashboard</h1>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <StatCard label="Total Deliveries" value={orders.length} />
          <StatCard label="Available Orders" value={available} />
          <StatCard label="Active Deliveries" value={active} />
          <StatCard label="Active Drivers" value={drivers.length} />
        </div>

        <GlassCard className="p-5">
          <h3 className="text-white text-xl font-semibold">Live Operations</h3>
          <p className="text-white/75 mt-1">Use the top-left menu to access ML consolidation, drivers, and orders modules.</p>
          {liveSosMessage ? <p className="text-red-200 mt-3">{liveSosMessage}</p> : null}
          <p className="text-white/80 mt-2">Active SOS Alerts: {sosAlerts.length}</p>
        </GlassCard>

        <GlassCard className="p-5">
          <h3 className="text-white text-xl font-semibold">Live Driver Locations (Active / in-transit)</h3>
          <div ref={mapRef} className="w-full h-[360px] rounded-xl mt-3" />
          {activeDriverPoints.length === 0 ? <p className="text-white/75 mt-2">No active/in-transit drivers with location coordinates yet.</p> : null}
        </GlassCard>

        <GlassCard className="p-5">
          <h3 className="text-white text-xl font-semibold">Registered Drivers</h3>
          <div className="mt-3 space-y-2">
            {drivers.map((item) => (
              <div key={item.id || item.email} className="bg-white/10 rounded-xl p-3 text-white text-sm">
                {(item.driver_name || item.name || 'Driver')}
                {' | '}
                {item.email || '-'}
                {' | '}
                {item.vehicle_type || '-'}
                {' | '}
                {item.contact_no || item.phone || '-'}
                {' | '}
                {item.status || '-'}
              </div>
            ))}
            {drivers.length === 0 ? <p className="text-white/70">No driver records found.</p> : null}
          </div>
        </GlassCard>
      </div>
    </div>
  )
}
