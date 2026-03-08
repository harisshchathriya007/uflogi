import { useState } from 'react'
import { BrowserRouter, Navigate, Route, Routes, useNavigate } from 'react-router-dom'
import GlassCard from './components/GlassCard'
import DriverLogin from './pages/DriverLogin'
import DriverOTP from './pages/DriverOTP'
import DriverDashboard from './pages/DriverDashboard'
import TodayJob from './pages/TodayJob'
import LiveNavigation from './pages/LiveNavigation'
import ProofOfDelivery from './pages/ProofOfDelivery'
import DriverEarnings from './pages/DriverEarnings'
import VehicleInfo from './pages/VehicleInfo'
import CompletedDeliveries from './pages/CompletedDeliveries'
import OperatorDashboard from './pages/OperatorDashboard'
import LoadConsolidation from './pages/LoadConsolidation'
import Drivers from './pages/Drivers'
import Orders from './pages/Orders'
import { setStoredOperator } from './lib/session'

function LandingPage() {
  const navigate = useNavigate()
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-blue-700 to-teal-500 p-6 flex items-center justify-center">
      <GlassCard className="max-w-xl w-full p-8 text-center">
        <h1 className="text-white text-4xl font-semibold">UrbanFlow</h1>
        <p className="text-white/80 mt-2">Smart Urban Freight Management & Route Optimization</p>
        <button className="mt-6 bg-white/20 hover:bg-white/30 text-white rounded-xl px-5 py-2 transition-all" onClick={() => navigate('/login-dashboard')}>Get Started</button>
      </GlassCard>
    </div>
  )
}

function RoleSelection() {
  const navigate = useNavigate()
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-blue-700 to-teal-500 p-6 flex items-center justify-center">
      <div className="max-w-3xl w-full grid md:grid-cols-2 gap-4">
        <GlassCard className="p-6 text-center hover:bg-white/15 transition-all cursor-pointer" >
          <h2 className="text-white text-2xl font-semibold">Logistics Operator</h2>
          <button className="mt-4 bg-white/20 hover:bg-white/30 text-white rounded-xl px-4 py-2" onClick={() => navigate('/operator-login')}>Continue</button>
        </GlassCard>
        <GlassCard className="p-6 text-center hover:bg-white/15 transition-all cursor-pointer" >
          <h2 className="text-white text-2xl font-semibold">Vehicle Driver</h2>
          <button className="mt-4 bg-white/20 hover:bg-white/30 text-white rounded-xl px-4 py-2" onClick={() => navigate('/driver-login')}>Continue</button>
        </GlassCard>
      </div>
    </div>
  )
}

function OperatorLogin() {
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
      <GlassCard className="w-full max-w-md p-6">
        <h2 className="text-white text-2xl font-semibold">Logistics Operator Login</h2>
        <div className="mt-4 space-y-3">
          <input className="inputGlass" placeholder="Username" value={username} onChange={(e) => setUsername(e.target.value)} />
          <input className="inputGlass" placeholder="Phone Number" value={phone} onChange={(e) => setPhone(e.target.value)} />
          <input className="inputGlass" placeholder="Email ID" value={email} onChange={(e) => setEmail(e.target.value)} />
          <button className="w-full bg-white/20 hover:bg-white/30 text-white rounded-xl py-2" onClick={onSendOtp}>Send OTP</button>
        </div>
      </GlassCard>
    </div>
  )
}

function OperatorOtp() {
  const navigate = useNavigate()
  const [otp, setOtp] = useState('')

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-blue-700 to-teal-500 p-6 flex items-center justify-center">
      <GlassCard className="w-full max-w-md p-6">
        <h2 className="text-white text-2xl font-semibold">OTP Verification</h2>
        <input className="inputGlass mt-4" placeholder="Enter OTP" value={otp} onChange={(e) => setOtp(e.target.value)} />
        <button className="w-full mt-4 bg-white/20 hover:bg-white/30 text-white rounded-xl py-2" onClick={() => otp === '123456' && navigate('/operator-dashboard')}>Verify & Continue</button>
      </GlassCard>
    </div>
  )
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/login-dashboard" element={<RoleSelection />} />

      <Route path="/operator-login" element={<OperatorLogin />} />
      <Route path="/operator-otp" element={<OperatorOtp />} />
      <Route path="/operator-dashboard" element={<OperatorDashboard />} />
      <Route path="/ml-consolidation" element={<LoadConsolidation />} />
      <Route path="/drivers" element={<Drivers />} />
      <Route path="/orders" element={<Orders />} />

      <Route path="/driver-login" element={<DriverLogin />} />
      <Route path="/otp" element={<DriverOTP />} />
      <Route path="/driver-dashboard" element={<DriverDashboard />} />
      <Route path="/todays-job" element={<TodayJob />} />
      <Route path="/navigate" element={<LiveNavigation />} />
      <Route path="/proof-delivery" element={<ProofOfDelivery />} />
      <Route path="/earnings" element={<DriverEarnings />} />
      <Route path="/vehicle-type" element={<VehicleInfo />} />
      <Route path="/completed" element={<CompletedDeliveries />} />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  )
}
