import { useEffect, useMemo, useState } from 'react'
import GlassCard from '../components/GlassCard'
import PageBackButton from '../components/PageBackButton'
import { getStoredUser } from '../lib/session'
import { fetchDrivers, removeRealtimeChannel, subscribeDriversRealtime } from '../lib/dataService'

export default function VehicleInfo() {
  const user = useMemo(() => getStoredUser(), [])
  const [driver, setDriver] = useState(null)

  useEffect(() => {
    const load = async () => {
      if (!user?.email) return
      const drivers = await fetchDrivers()
      const current = drivers.find((item) => String(item.email || '').toLowerCase() === String(user.email || '').toLowerCase()) || null
      setDriver(current)
    }
    load()
    const channel = subscribeDriversRealtime(load)
    return () => removeRealtimeChannel(channel)
  }, [])

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-blue-700 to-teal-500 p-6">
      <PageBackButton />
      <div className="max-w-4xl mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <GlassCard className="p-4 text-white"><p className="text-white/70">Vehicle Type</p><p className="font-semibold mt-1">{user?.vehicleType || 'N/A'}</p></GlassCard>
        <GlassCard className="p-4 text-white"><p className="text-white/70">Vehicle ID</p><p className="font-semibold mt-1">{driver?.vehicle_id || user?.vehicleId || 'N/A'}</p></GlassCard>
        <GlassCard className="p-4 text-white"><p className="text-white/70">Status</p><p className="font-semibold mt-1">{driver?.status || 'Idle'}</p></GlassCard>
        <GlassCard className="p-4 text-white"><p className="text-white/70">Battery %</p><p className="font-semibold mt-1">{driver?.battery_percent ?? 'N/A'}</p></GlassCard>
      </div>
    </div>
  )
}
