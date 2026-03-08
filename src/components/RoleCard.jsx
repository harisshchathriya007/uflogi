export default function RoleCard({ icon, title, description, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full max-w-sm rounded-2xl border border-white/20 bg-white/10 p-8 text-left shadow-2xl backdrop-blur-lg transition duration-300 hover:scale-[1.02] hover:bg-white/20"
    >
      <div className="mb-4 inline-flex h-14 w-14 items-center justify-center rounded-xl bg-white/15 text-white">
        {icon}
      </div>
      <h3 className="text-2xl font-semibold text-white">{title}</h3>
      <p className="mt-3 text-sm leading-relaxed text-white/80">{description}</p>
    </button>
  )
}

