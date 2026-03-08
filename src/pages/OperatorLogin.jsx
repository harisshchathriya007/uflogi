import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import GlassCard from '../components/GlassCard'
import PageBackButton from '../components/PageBackButton'
import { setStoredOperator } from '../lib/session'

export default function OperatorLogin() {
  const navigate = useNavigate()
  const [username, setUsername] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')

  const onSendOtp = () => {
    if (!username || !phone || !email) return
    setStoredOperator({ username, phone, email })
    navigate('/operator-otp')
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-blue-700 to-teal-500 p-6 flex items-center justify-center">
      <PageBackButton />
      <GlassCard className="w-full max-w-md p-6">
        <h2 className="text-2xl font-semibold text-white">Logistics Operator Login</h2>
        <div className="mt-5 space-y-3">
          <input className="inputGlass" placeholder="Username" value={username} onChange={(e) => setUsername(e.target.value)} />
          <input className="inputGlass" placeholder="Phone Number" value={phone} onChange={(e) => setPhone(e.target.value)} />
          <input className="inputGlass" placeholder="Email ID" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          <button className="w-full rounded-xl bg-white/20 py-2 text-white transition-all hover:bg-white/30" onClick={onSendOtp}>Send OTP</button>
        </div>
      </GlassCard>
    </div>
  )
}

