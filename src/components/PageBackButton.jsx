import { useNavigate } from 'react-router-dom'

export default function PageBackButton() {
  const navigate = useNavigate()

  return (
    <button
      type="button"
      className="fixed top-5 left-5 z-30 rounded-xl bg-white/20 px-4 py-2 text-white transition-all hover:bg-white/30"
      onClick={() => navigate(-1)}
    >
      Back
    </button>
  )
}

