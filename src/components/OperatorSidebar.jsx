import { NavLink } from 'react-router-dom'

const items = [
  { to: '/operator-dashboard', label: 'Dashboard Home' },
  { to: '/ml-consolidation', label: 'ML-Based Load Consolidation' },
  { to: '/drivers', label: 'Drivers' },
  { to: '/orders', label: 'Orders' },
]

export default function OperatorSidebar({ open, onClose }) {
  return (
    <aside className={`fixed top-0 left-0 h-full w-72 bg-white/10 backdrop-blur-xl border-r border-white/20 p-6 z-40 transition-transform ${open ? 'translate-x-0' : '-translate-x-full'}`}>
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-white font-semibold text-lg">Operator Menu</h3>
        <button className="text-white/80" onClick={onClose}>Close</button>
      </div>
      <nav className="space-y-3">
        {items.map((item) => (
          <NavLink key={item.to} to={item.to} className="block bg-white/20 hover:bg-white/30 text-white rounded-xl px-4 py-3 transition-all" onClick={onClose}>
            {item.label}
          </NavLink>
        ))}
      </nav>
    </aside>
  )
}
