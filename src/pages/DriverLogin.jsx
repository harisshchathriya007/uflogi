import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import GlassCard from '../components/GlassCard'
import { setStoredUser } from '../lib/session'

export default function DriverLogin() {
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [vehicleType, setVehicleType] = useState('Two wheelers')
  const [password, setPassword] = useState('')

  const onLogin = (e) => {
    e.preventDefault()
    if (!name || !email || !vehicleType || !password) return
    setStoredUser({ name, email, vehicleType })
    navigate('/otp')
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-blue-700 to-teal-500 p-6 flex items-center justify-center">
      <button className="fixed top-5 left-5 bg-white/20 hover:bg-white/30 text-white rounded-xl px-4 py-2 transition-all" onClick={() => navigate('/login-dashboard')}>Back</button>
      <GlassCard className="w-full max-w-md p-6">
        <h2 className="text-white text-2xl font-semibold">Driver Login</h2>
        <form className="mt-5 space-y-3" onSubmit={onLogin}>
          <input className="inputGlass" placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} />
          <input className="inputGlass" placeholder="Email ID" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          <select className="inputGlass" value={vehicleType} onChange={(e) => setVehicleType(e.target.value)}>
            <option>Two wheelers</option>
            <option>Mini Truck</option>
            <option>Heavy Truck</option>
          </select>
          <input className="inputGlass" placeholder="Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
          <button className="w-full bg-white/20 hover:bg-white/30 text-white rounded-xl py-2 transition-all">Login</button>
        </form>
      </GlassCard>
    </div>
  )
}
