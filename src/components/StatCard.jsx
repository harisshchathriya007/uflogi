import GlassCard from './GlassCard'

export default function StatCard({ label, value, hint }) {
  return (
    <GlassCard className="p-4 hover:bg-white/15 transition-all">
      <p className="text-white/75 text-sm">{label}</p>
      <p className="text-white text-2xl font-semibold mt-1">{value}</p>
      {hint ? <p className="text-white/60 text-xs mt-1">{hint}</p> : null}
    </GlassCard>
  )
}
