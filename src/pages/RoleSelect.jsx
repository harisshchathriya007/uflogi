import { useNavigate } from 'react-router-dom'
import RoleCard from '../components/RoleCard'
import PageBackButton from '../components/PageBackButton'

function WarehouseIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M3 10.5 12 4l9 6.5V20H3z" />
      <path d="M9 20v-5h6v5" />
      <path d="M7.5 11h9" />
    </svg>
  )
}

function TruckIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M3 7h11v8H3z" />
      <path d="M14 10h3.5L21 13v2h-7z" />
      <circle cx="7" cy="17" r="2" />
      <circle cx="17" cy="17" r="2" />
    </svg>
  )
}

export default function RoleSelect() {
  const navigate = useNavigate()

  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-700 via-blue-600 to-teal-500 px-6 py-10">
      <PageBackButton />
      <section className="w-full max-w-5xl text-center">
        <h1 className="mb-10 text-4xl font-bold text-white md:text-5xl">Select Your Role</h1>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <RoleCard
            icon={<WarehouseIcon />}
            title="Logistics Operator"
            description="Manage deliveries, optimize routes, and track fleet operations"
            onClick={() => navigate('/operator-dashboard')}
          />

          <RoleCard
            icon={<TruckIcon />}
            title="Vehicle Driver"
            description="Accept deliveries, navigate routes, and manage earnings"
            onClick={() => navigate('/driver-dashboard')}
          />
        </div>
      </section>
    </main>
  )
}
