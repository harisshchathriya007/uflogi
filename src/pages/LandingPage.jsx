import { useNavigate } from 'react-router-dom'

function TruckIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-10 w-10 text-white" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M3 7h11v8H3z" />
      <path d="M14 10h3.5L21 13v2h-7z" />
      <circle cx="7" cy="17" r="2" />
      <circle cx="17" cy="17" r="2" />
    </svg>
  )
}

export default function LandingPage() {
  const navigate = useNavigate()

  return (
    <main className="relative flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-700 via-blue-600 to-teal-500 px-6">
      <div className="mx-auto flex max-w-3xl flex-col items-center text-center">
        <div className="mb-8 flex h-[90px] w-[90px] items-center justify-center rounded-full bg-white/20 shadow-xl backdrop-blur-md">
          <TruckIcon />
        </div>

        <h1 className="text-5xl font-bold tracking-wide text-white">URBANFLOW</h1>
        <p className="mt-4 text-lg text-white/80">Optimizing Urban Freight for Smarter Cities</p>

        <button
          type="button"
          onClick={() => navigate('/role-select')}
          className="mt-10 rounded-xl border border-white/30 bg-white/20 px-8 py-3 text-base font-semibold text-white shadow-lg backdrop-blur-lg transition hover:bg-white/30"
        >
          Get Started
        </button>
      </div>

      <div className="pointer-events-none absolute bottom-7 left-1/2 -translate-x-1/2 text-center text-xs leading-5 text-white/60">
        <p>Powered by Smart City Technology</p>
        <p>Chennai Metropolitan Area</p>
      </div>
    </main>
  )
}

