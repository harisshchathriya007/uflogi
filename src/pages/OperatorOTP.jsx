import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import GlassCard from '../components/GlassCard'
import PageBackButton from '../components/PageBackButton'

export default function OperatorOTP() {
  const navigate = useNavigate()
  const [otp, setOtp] = useState('')

  const onVerify = () => {
    if (otp === '123456') navigate('/operator-dashboard')
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-blue-700 to-teal-500 p-6 flex items-center justify-center">
      <PageBackButton />
      <GlassCard className="w-full max-w-md p-6">
        <h2 className="text-2xl font-semibold text-white">OTP Verification</h2>
        <input
          className="inputGlass mt-4"
          placeholder="Enter 6-digit OTP"
          maxLength={6}
          value={otp}
          onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
        />
        <button className="mt-4 w-full rounded-xl bg-white/20 py-2 text-white transition-all hover:bg-white/30" onClick={onVerify}>Verify & Continue</button>
      </GlassCard>
    </div>
  )
}

