import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import GlassCard from '../components/GlassCard'
import PageBackButton from '../components/PageBackButton'
import { fetchDrivers, registerDriverAdaptive, removeRealtimeChannel, subscribeDriversRealtime } from '../lib/dataService'
import { getStoredOperator } from '../lib/session'

export default function Drivers() {
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [vehicleType, setVehicleType] = useState('')
  const [contactNo, setContactNo] = useState('')
  const [message, setMessage] = useState('')
  const [items, setItems] = useState([])

  useEffect(() => {
    const operator = getStoredOperator()
    if (!operator?.email) {
      navigate('/operator-login')
      return undefined
    }
    const load = () => fetchDrivers().then(setItems)
    load()
    const channel = subscribeDriversRealtime(load)
    return () => removeRealtimeChannel(channel)
  }, [navigate])

  const register = async () => {
    if (!name || !email || !vehicleType || !contactNo) {
      setMessage('All required fields must be filled.')
      return
    }

    const basePayload = {
      name,
      driver_name: name,
      email,
      password,
      vehicle_type: vehicleType,
      contact_no: contactNo,
      phone: contactNo,
      status: 'Active',
      current_lat: 13.0827,
      current_long: 80.2707,
      last_location_updated_at: new Date().toISOString(),
    }

    const result = await registerDriverAdaptive(basePayload)
    if (!result.ok) {
      setMessage('Driver registration failed: schema mismatch or table missing.')
      return
    }

    setMessage('Driver registered successfully.')
    setName('')
    setEmail('')
    setPassword('')
    setVehicleType('')
    setContactNo('')
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-blue-700 to-teal-500 p-6">
      <PageBackButton />
      <div className="max-w-5xl mx-auto space-y-4">
        <GlassCard className="p-6">
          <h2 className="text-white text-2xl font-semibold">Drivers</h2>
          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
            <input className="inputGlass" placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} />
            <input className="inputGlass" placeholder="Email ID" value={email} onChange={(e) => setEmail(e.target.value)} />
            <input className="inputGlass" placeholder="Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
            <input className="inputGlass" placeholder="Type of vehicle" value={vehicleType} onChange={(e) => setVehicleType(e.target.value)} />
            <input className="inputGlass md:col-span-2" placeholder="Contact no" value={contactNo} onChange={(e) => setContactNo(e.target.value)} />
          </div>
          <button className="mt-4 bg-white/20 hover:bg-white/30 text-white rounded-xl px-4 py-2 transition-all" onClick={register}>Register</button>
          {message ? <p className="text-white/80 mt-2">{message}</p> : null}
        </GlassCard>

        <GlassCard className="p-5">
          <h3 className="text-white text-xl font-semibold">Registered Drivers</h3>
          <div className="mt-3 space-y-2">
            {items.map((item) => (
              <div key={item.id || item.email} className="bg-white/10 rounded-xl p-3 text-white text-sm">
                {(item.driver_name || item.name || 'Driver')} | {item.email || '-'} | {item.vehicle_type || '-'} | {item.contact_no || item.phone || '-'} | {item.status || '-'}
              </div>
            ))}
            {items.length === 0 ? <p className="text-white/70">No driver records found.</p> : null}
          </div>
        </GlassCard>
      </div>
    </div>
  )
}
