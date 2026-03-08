import { useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import GlassCard from '../components/GlassCard'
import PageBackButton from '../components/PageBackButton'
import { ACTIVE_ORDER_KEY } from '../lib/session'
import { fetchOrderById, removeRealtimeChannel, subscribeOrdersRealtime } from '../lib/dataService'
import { loadGoogleMaps } from '../lib/maps'
import { getStoredUser } from '../lib/session'

function getNumber(value) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

function getCurrentPositionOrNull() {
  if (!navigator.geolocation) return Promise.resolve(null)
  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: Number(pos.coords.latitude), lng: Number(pos.coords.longitude) }),
      () => resolve(null),
      { enableHighAccuracy: false, timeout: 7000, maximumAge: 30000 },
    )
  })
}

export default function LiveNavigation() {
  const location = useLocation()
  const navigate = useNavigate()
  const mapRef = useRef(null)
  const [order, setOrder] = useState(null)
  const [distanceKm, setDistanceKm] = useState(0)
  const [etaMinutes, setEtaMinutes] = useState(0)
  const [traffic, setTraffic] = useState('Unknown')
  const [nextTurn, setNextTurn] = useState('Proceed on current route')
  const [nextRoad, setNextRoad] = useState('-')
  const [mapError, setMapError] = useState('')

  const orderId = useMemo(() => location.state?.orderId || localStorage.getItem(ACTIVE_ORDER_KEY), [location.state])
  const user = useMemo(() => getStoredUser(), [])

  useEffect(() => {
    if (!user?.email) navigate('/driver-login')
  }, [navigate, user?.email])

  useEffect(() => {
    const loadOrder = async () => {
      if (!orderId) return
      const found = await fetchOrderById(orderId)
      setOrder(found)
    }

    loadOrder()
    const channel = subscribeOrdersRealtime(loadOrder)
    return () => removeRealtimeChannel(channel)
  }, [orderId])

  useEffect(() => {
    const initMapAndRoute = async () => {
      if (!order || !mapRef.current) return

      const pickupLat = getNumber(order.pickup_lat ?? order.pickup_latitude)
      const pickupLng = getNumber(order.pickup_lng ?? order.pickup_longitude)
      const dropLat = getNumber(order.drop_lat ?? order.delivery_latitude)
      const dropLng = getNumber(order.drop_lng ?? order.delivery_longitude)
      if (dropLat === null || dropLng === null) return

      const geo = await getCurrentPositionOrNull()
      const sourceLat = geo?.lat ?? pickupLat ?? dropLat
      const sourceLng = geo?.lng ?? pickupLng ?? dropLng

      try {
        const googleObj = await loadGoogleMaps(import.meta.env.VITE_GOOGLE_MAPS_API_KEY)
        const map = new googleObj.maps.Map(mapRef.current, { center: { lat: sourceLat, lng: sourceLng }, zoom: 12 })
        new googleObj.maps.Marker({ position: { lat: sourceLat, lng: sourceLng }, map, title: 'Current Location' })
        new googleObj.maps.Marker({ position: { lat: dropLat, lng: dropLng }, map, title: 'Drop Location' })

        const response = await fetch(`https://router.project-osrm.org/route/v1/driving/${sourceLng},${sourceLat};${dropLng},${dropLat}?overview=full&geometries=geojson&steps=true`)
        const json = await response.json()
        const route = json?.routes?.[0]
        const leg = route?.legs?.[0]
        const firstStep = leg?.steps?.[0]

        const km = Number(((route?.distance || 0) / 1000).toFixed(2))
        const mins = Number(((route?.duration || 0) / 60).toFixed(0))
        const avgSpeed = mins > 0 ? (km / (mins / 60)) : 0

        setDistanceKm(km)
        setEtaMinutes(mins)
        if (avgSpeed < 20) setTraffic('Heavy')
        else if (avgSpeed < 35) setTraffic('Moderate')
        else setTraffic('Light')

        setNextTurn(firstStep?.maneuver?.instruction || 'Proceed on current route')
        setNextRoad(firstStep?.name || '-')

        const points = route?.geometry?.coordinates || []
        const path = points.map((point) => ({ lat: point[1], lng: point[0] }))
        if (path.length > 0) {
          new googleObj.maps.Polyline({ path, geodesic: true, map, strokeColor: '#60a5fa', strokeOpacity: 0.95, strokeWeight: 5 })
          map.fitBounds(path.reduce((bounds, p) => (bounds.extend(p), bounds), new googleObj.maps.LatLngBounds()))
        }
      } catch (error) {
        setMapError(String(error?.message || 'Map failed to load'))
      }
    }

    initMapAndRoute()
  }, [order])

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-blue-700 to-teal-500 p-6">
      <PageBackButton />
      <div className="max-w-6xl mx-auto space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <GlassCard className="p-4"><p className="text-white/70">Distance</p><p className="text-white text-xl font-semibold">{distanceKm} km</p></GlassCard>
          <GlassCard className="p-4"><p className="text-white/70">ETA</p><p className="text-white text-xl font-semibold">{etaMinutes} min</p></GlassCard>
          <GlassCard className="p-4"><p className="text-white/70">Traffic Status</p><p className="text-white text-xl font-semibold">{traffic}</p></GlassCard>
        </div>

        <GlassCard className="p-3">
          <div ref={mapRef} className="w-full h-[420px] rounded-xl overflow-hidden" />
          {mapError ? <p className="text-red-200 mt-2">{mapError}</p> : null}
        </GlassCard>

        <GlassCard className="p-5">
          <p className="text-white font-semibold">Next Turn</p>
          <p className="text-white/80 mt-2">{nextTurn}</p>
          <p className="text-white/80">{nextRoad}</p>
        </GlassCard>
      </div>
    </div>
  )
}
