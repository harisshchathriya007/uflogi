import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'

export default function DriverHeader({ name = 'Driver', subtitle = 'Active Delivery' }) {
  const navigate = useNavigate()

  const onLogout = async () => {
    await supabase.auth.signOut()
    localStorage.removeItem('urbanflow_user')
    localStorage.removeItem('urbanflow_active_order_id')
    navigate('/login-dashboard')
  }

  return (
    <div className="flex items-center justify-between gap-4">
      <button className="bg-white/20 hover:bg-white/30 text-white rounded-xl px-4 py-2 transition-all" onClick={() => navigate(-1)}>Back</button>
      <div>
        <h1 className="text-white text-2xl font-semibold">Vehicle Driver Dashboard</h1>
        <p className="text-white/80 text-sm mt-1">Driver: {name} | {subtitle}</p>
      </div>
      <button className="bg-white/20 hover:bg-white/30 text-white rounded-xl px-4 py-2 transition-all" onClick={onLogout}>Logout</button>
    </div>
  )
}
