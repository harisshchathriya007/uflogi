import { useEffect, useRef, useState } from 'react'
import * as XLSX from 'xlsx'
import GlassCard from '../components/GlassCard'
import PageBackButton from '../components/PageBackButton'
import {
  fetchOrders,
  importOrdersAdaptive,
  normalizeImportedOrder,
  parseCsvLikeText,
  removeRealtimeChannel,
  subscribeOrdersRealtime,
} from '../lib/dataService'

export default function Orders() {
  const fileRef = useRef(null)
  const [items, setItems] = useState([])
  const [previewRows, setPreviewRows] = useState([])
  const [message, setMessage] = useState('')

  useEffect(() => {
    const load = () => fetchOrders({}).then(setItems)
    load()
    const channel = subscribeOrdersRealtime(load)
    return () => removeRealtimeChannel(channel)
  }, [])

  const onImportClick = () => fileRef.current?.click()

  const onFileSelect = async (event) => {
    const file = event.target.files?.[0]
    if (!file) return

    let parsedRows = []
    if (/\.(xlsx|xls)$/i.test(file.name)) {
      const buffer = await file.arrayBuffer()
      const workbook = XLSX.read(buffer, { type: 'array' })
      const sheetName = workbook.SheetNames[0]
      parsedRows = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { defval: '' })
    } else {
      parsedRows = parseCsvLikeText(await file.text())
    }

    if (parsedRows.length === 0) {
      setMessage('Unable to parse file. Please provide a valid Excel or CSV file with headers.')
      return
    }

    const normalized = parsedRows.map((row, index) => normalizeImportedOrder(row, index))
    setPreviewRows(normalized)

    const result = await importOrdersAdaptive(normalized)
    if (!result.ok) {
      setMessage(`Supabase write failed: ${result.error?.message || 'schema mismatch or table missing'}`)
      return
    }

    setMessage(`Imported ${normalized.length} order(s) and synced to Supabase.`)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-blue-700 to-teal-500 p-6">
      <PageBackButton />
      <div className="max-w-7xl mx-auto space-y-4">
        <GlassCard className="p-8 min-h-[260px] flex flex-col items-center justify-center text-center">
          <h2 className="text-white text-2xl font-semibold">Orders Management</h2>
          <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv,.txt" className="hidden" onChange={onFileSelect} />
          <button className="mt-5 bg-white/20 hover:bg-white/30 text-white rounded-xl px-6 py-3 transition-all" onClick={onImportClick}>Import Excel</button>
          <p className="text-white/75 mt-2">Choose an Excel file from your device to import into Supabase Orders table.</p>
          {message ? <p className="text-white/85 mt-3">{message}</p> : null}
        </GlassCard>

        {previewRows.length > 0 ? (
          <GlassCard className="p-5 overflow-auto">
            <h3 className="text-white text-xl font-semibold">Imported Orders Preview</h3>
            <table className="w-full mt-3 text-white/90 text-sm">
              <thead><tr className="text-left text-white/70"><th>Order ID</th><th>Pickup Area</th><th>Drop Address</th><th>Status</th><th>Driver Email</th><th>Distance</th></tr></thead>
              <tbody>
                {previewRows.map((row, idx) => (
                  <tr key={`${row.order_id}-${idx}`} className="border-t border-white/15">
                    <td>{row.order_id}</td><td>{row.pickup_area}</td><td>{row.drop_address || '-'}</td><td>{row.status || '-'}</td><td>{row.driver_email || '-'}</td><td>{row.distance_km}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </GlassCard>
        ) : null}

        <GlassCard className="p-5 overflow-auto">
          <h3 className="text-white text-xl font-semibold">Live Orders</h3>
          <table className="w-full mt-4 text-white/90 text-sm">
            <thead><tr className="text-left text-white/70"><th>Order ID</th><th>Pickup</th><th>Drop</th><th>Status</th><th>Driver Email</th></tr></thead>
            <tbody>
              {items.map((row) => (
                <tr key={row.id || row.order_id} className="border-t border-white/15">
                  <td>{row.order_id || row.id}</td>
                  <td>{row.pickup_area || row.pickup_address || '-'}</td>
                  <td>{row.drop_address || row.delivery_area || '-'}</td>
                  <td>{row.status || '-'}</td>
                  <td>{row.driver_email || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </GlassCard>
      </div>
    </div>
  )
}
