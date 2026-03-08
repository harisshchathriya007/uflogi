import { useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import GlassCard from '../components/GlassCard'
import PageBackButton from '../components/PageBackButton'
import { ACTIVE_ORDER_KEY } from '../lib/session'
import { fetchOrderById, upsertCompletedDelivery, updateOrder } from '../lib/dataService'
import { supabase } from '../lib/supabaseClient'

export default function ProofOfDelivery() {
  const location = useLocation()
  const navigate = useNavigate()
  const fileRef = useRef(null)
  const [otp, setOtp] = useState('')
  const [notes, setNotes] = useState('')
  const [file, setFile] = useState(null)
  const [preview, setPreview] = useState('')
  const [order, setOrder] = useState(null)
  const [status, setStatus] = useState('')

  useEffect(() => {
    const load = async () => {
      const id = location.state?.orderId || localStorage.getItem(ACTIVE_ORDER_KEY)
      if (!id) return
      setOrder(await fetchOrderById(id))
    }
    load()
  }, [location.state])

  const onPickPhoto = () => fileRef.current?.click()

  const onFileChange = (event) => {
    const uploaded = event.target.files?.[0]
    if (!uploaded) return
    setFile(uploaded)
    setPreview(URL.createObjectURL(uploaded))
  }

  const submit = async () => {
    if (!order) return
    setStatus('Submitting...')

    const key = order.id || order.order_id
    let photoUrl = null
    if (file) {
      const path = `proofs/${Date.now()}_${file.name}`
      const { error: uploadError } = await supabase.storage.from('delivery-proofs').upload(path, file, { cacheControl: '3600', upsert: true })
      if (uploadError) {
        setStatus(`Photo upload failed: ${uploadError.message}`)
        return
      }
      const { data } = supabase.storage.from('delivery-proofs').getPublicUrl(path)
      photoUrl = data?.publicUrl || null
    }

    const patch = {
      status: 'completed',
      completed_at: new Date().toISOString(),
      proof_otp: otp,
      proof_notes: notes,
      proof_photo_url: photoUrl,
    }
    const ok = await updateOrder(key, patch)
    if (!ok) {
      setStatus('Database update failed')
      return
    }

    await upsertCompletedDelivery({ ...order, ...patch, id: key })
    localStorage.removeItem(ACTIVE_ORDER_KEY)
    setStatus('Submitted successfully')
    navigate('/completed')
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-blue-700 to-teal-500 p-6">
      <PageBackButton />
      <div className="max-w-3xl mx-auto">
        <GlassCard className="p-6 space-y-5">
          <h2 className="text-white text-2xl font-semibold">Proof of Delivery</h2>
          <div>
            <p className="text-white font-semibold">OTP Verification</p>
            <input className="inputGlass mt-2" placeholder="Input OTP from customer" value={otp} onChange={(e) => setOtp(e.target.value)} />
          </div>
          <div>
            <p className="text-white font-semibold">Delivery Photo Upload</p>
            <input ref={fileRef} type="file" className="hidden" accept="image/*" onChange={onFileChange} />
            <button className="mt-2 bg-white/20 hover:bg-white/30 text-white rounded-xl px-4 py-2 transition-all" onClick={onPickPhoto}>Add Photo</button>
            {preview ? <img src={preview} alt="preview" className="mt-3 rounded-xl max-h-52" /> : null}
          </div>
          <div>
            <p className="text-white font-semibold">Notes</p>
            <textarea className="inputGlass mt-2 min-h-[120px]" placeholder="Enter notes" value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
          <button className="bg-white/20 hover:bg-white/30 text-white rounded-xl px-5 py-2 transition-all" onClick={submit}>Submit Proof of Delivery</button>
          {status ? <p className="text-white/80">{status}</p> : null}
        </GlassCard>
      </div>
    </div>
  )
}
