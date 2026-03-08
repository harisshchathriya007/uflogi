import { useNavigate } from 'react-router-dom'
import GlassCard from '../components/GlassCard'
import PageBackButton from '../components/PageBackButton'

export default function LoginDashboard() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-blue-700 to-teal-500 p-6 flex items-center justify-center">
      <PageBackButton />
      <GlassCard className="w-full max-w-3xl p-8">
        <h2 className="text-center text-3xl font-semibold text-white">Choose Login Role</h2>
        <div className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-2">
          <button
            type="button"
            className="rounded-2xl border border-white/20 bg-white/15 p-6 text-left text-white transition-all hover:bg-white/25"
            onClick={() => navigate('/operator-login')}
          >
            <p className="text-xl font-semibold">Logistics Operator</p>
            <p className="mt-2 text-sm text-white/80">Manage deliveries, routes, drivers, and live operations.</p>
          </button>
          <button
            type="button"
            className="rounded-2xl border border-white/20 bg-white/15 p-6 text-left text-white transition-all hover:bg-white/25"
            onClick={() => navigate('/driver-login')}
          >
            <p className="text-xl font-semibold">Vehicle Driver</p>
            <p className="mt-2 text-sm text-white/80">Accept jobs, navigate routes, and complete deliveries.</p>
          </button>
        </div>
      </GlassCard>
    </div>
  )
}
