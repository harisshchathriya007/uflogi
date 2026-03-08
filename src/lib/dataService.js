import { supabase } from './supabaseClient'

function isMissingResourceError(error) {
  if (!error) return false
  if (error.status === 404) return true
  if (error.code === '42P01' || error.code === 'PGRST205') return true
  const text = String(error.message || '').toLowerCase()
  return text.includes('relation') || text.includes('does not exist') || text.includes('could not find the table')
}

async function queryFirstTable(tableNames, queryBuilder) {
  let firstNonMissingError = null
  let lastError = null
  for (const tableName of tableNames) {
    const { data, error } = await queryBuilder(supabase.from(tableName))
    if (!error) return { data, table: tableName, error: null }
    lastError = error
    if (!isMissingResourceError(error) && !firstNonMissingError) firstNonMissingError = error
  }
  return { data: null, table: null, error: firstNonMissingError || lastError }
}

async function mutateFirstTable(tableNames, mutateBuilder) {
  let firstNonMissingError = null
  let lastError = null
  for (const tableName of tableNames) {
    const { data, error } = await mutateBuilder(supabase.from(tableName))
    if (!error) return { data, table: tableName, error: null }
    lastError = error
    if (!isMissingResourceError(error) && !firstNonMissingError) firstNonMissingError = error
  }
  return { data: null, table: null, error: firstNonMissingError || lastError }
}

export async function fetchOrders(filters = {}) {
  const result = await queryFirstTable(['orders', 'Orders'], (table) => {
    let query = table.select('*')
    if (filters.id) query = query.eq('id', filters.id)
    if (filters.status) query = query.eq('status', filters.status)
    if (filters.driver_email) query = query.eq('driver_email', filters.driver_email)
    if (filters.completed_from) query = query.gte('completed_at', filters.completed_from.toISOString())
    return query
  })
  return result.error ? [] : (result.data || [])
}

export async function fetchOrderById(orderId) {
  const list = await fetchOrders({})
  const target = String(orderId)
  return list.find((item) => String(item.id) === target || String(item.order_id) === target) || null
}

export async function updateOrder(orderId, patch) {
  const byId = await mutateFirstTable(['orders', 'Orders'], (table) => table.update(patch).eq('id', orderId))
  if (!byId.error) return true

  const errorText = String(byId.error.message || '')
  const shouldRetryByOrderId = /column .*\.id does not exist/i.test(errorText)
    || /column .*id.* does not exist/i.test(errorText)
    || /invalid input syntax for type .*:.*\bid\b/i.test(errorText)
  if (!shouldRetryByOrderId) return false

  const byOrderId = await mutateFirstTable(['orders', 'Orders'], (table) => table.update(patch).eq('order_id', String(orderId)))
  return !byOrderId.error
}

export async function upsertCompletedDelivery(order) {
  const orderKey = order?.id ?? order?.order_id
  if (!orderKey) return
  await supabase.from('completed_deliveries').upsert({
    order_id: orderKey,
    driver_email: order.driver_email,
    completed_at: order.completed_at || new Date().toISOString(),
    commodity: order.commodity,
    earnings: order.earnings,
  }, { onConflict: 'order_id' })
}

export async function fetchDrivers() {
  const result = await queryFirstTable(['drivers', 'Driver'], (table) => table.select('*'))
  return result.error ? [] : (result.data || [])
}

export async function computeRouteDistanceKm(order) {
  const pickupLng = Number(order.pickup_lng ?? order.pickup_longitude)
  const pickupLat = Number(order.pickup_lat ?? order.pickup_latitude)
  const dropLng = Number(order.drop_lng ?? order.delivery_longitude)
  const dropLat = Number(order.drop_lat ?? order.delivery_latitude)
  if (![pickupLng, pickupLat, dropLng, dropLat].every(Number.isFinite)) return Number(order.distance || 0)

  try {
    const response = await fetch(`https://router.project-osrm.org/route/v1/driving/${pickupLng},${pickupLat};${dropLng},${dropLat}?overview=false`)
    const json = await response.json()
    const meters = json?.routes?.[0]?.distance || 0
    return Number((meters / 1000).toFixed(2))
  } catch {
    return Number(order.distance || 0)
  }
}

export async function triggerDriverSos(email) {
  if (!email) return false
  const payload = {
    sos_active: true,
    status: 'sos',
    last_location_updated_at: new Date().toISOString(),
  }
  const { error } = await supabase.from('drivers').update(payload).eq('email', email)
  return !error
}

export async function fetchCompletedForDriver(email) {
  const { data, error } = await supabase
    .from('completed_deliveries')
    .select('*')
    .eq('driver_email', email)
    .order('completed_at', { ascending: false })

  if (!error && data && data.length > 0) return data

  const completedOrders = await fetchOrders({ status: 'completed', driver_email: email })
  return completedOrders.map((order) => ({
    id: order.id,
    order_id: order.order_id || order.id,
    completed_at: order.completed_at,
    commodity: order.commodity,
    earnings: order.earnings,
  }))
}

export function subscribeCompletedRealtime(email, onChange) {
  const normalizedEmail = String(email || '').toLowerCase()
  return supabase
    .channel(`completed-realtime-${normalizedEmail}`)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'completed_deliveries' }, (payload) => {
      const row = payload.new || payload.old
      if (String(row?.driver_email || '').toLowerCase() === normalizedEmail) onChange()
    })
    .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'orders' }, (payload) => {
      const row = payload.new
      if (!row) return
      if (String(row.driver_email || '').toLowerCase() !== normalizedEmail) return
      if (String(row.status || '').toLowerCase() !== 'completed') return
      onChange()
    })
    .subscribe()
}

export function removeRealtimeChannel(channel) {
  if (channel) supabase.removeChannel(channel)
}

export function subscribeOrdersRealtime(onChange) {
  return supabase
    .channel('orders-realtime')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, onChange)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'Orders' }, onChange)
    .subscribe()
}

export function subscribeDriversRealtime(onChange) {
  return supabase
    .channel('drivers-realtime')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'drivers' }, onChange)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'Driver' }, onChange)
    .subscribe()
}

export function extractMissingColumnName(message) {
  if (!message) return null
  const text = String(message)
  const patterns = [
    /Could not find the ['"]?([A-Za-z_][A-Za-z0-9_]*)['"]? column/i,
    /column ['"]?([A-Za-z_][A-Za-z0-9_]*)['"]? does not exist/i,
    /record ['"]?new['"]? has no field ['"]?([A-Za-z_][A-Za-z0-9_]*)['"]?/i,
  ]
  for (const pattern of patterns) {
    const match = text.match(pattern)
    if (match?.[1]) return match[1]
  }
  return null
}

export async function registerDriverAdaptive(basePayload) {
  const tableCandidates = ['drivers', 'Driver']
  for (const tableName of tableCandidates) {
    let activeColumns = Object.keys(basePayload)
    for (let attempt = 0; attempt < 12; attempt += 1) {
      const payload = {}
      activeColumns.forEach((column) => {
        payload[column] = basePayload[column]
      })
      const { error } = await supabase.from(tableName).insert(payload)
      if (!error) return { ok: true, table: tableName }

      const missingColumn = extractMissingColumnName(error.message)
      if (!missingColumn || !activeColumns.includes(missingColumn)) {
        break
      }
      activeColumns = activeColumns.filter((column) => column !== missingColumn)
      if (activeColumns.length === 0) break
    }
  }
  return { ok: false }
}

export function parseCsvLikeText(text) {
  const rows = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
  if (rows.length < 2) return []
  const delimiter = rows[0].includes('\t') ? '\t' : ','
  const headers = rows[0].split(delimiter).map((header) => header.trim())
  return rows.slice(1).map((row) => {
    const values = row.split(delimiter)
    const item = {}
    headers.forEach((header, index) => {
      item[header] = (values[index] || '').trim()
    })
    return item
  })
}

export function normalizeImportedOrder(raw, index = 0) {
  const fallbackOrderId = raw.order_id || raw.orderId || raw.id || `ORD-${Date.now()}-${index + 1}`
  return {
    id: raw.id ? Number(raw.id) : undefined,
    order_id: String(fallbackOrderId),
    pickup_latitude: Number(raw.pickup_latitude ?? raw.pickup_lat ?? 0),
    pickup_longitude: Number(raw.pickup_longitude ?? raw.pickup_lng ?? 0),
    delivery_latitude: Number(raw.delivery_latitude ?? raw.drop_lat ?? 0),
    delivery_longitude: Number(raw.delivery_longitude ?? raw.drop_lng ?? 0),
    pickup_address: raw.pickup_address || raw.pickup_area || 'Unknown',
    drop_address: raw.drop_address || raw.delivery_area || '',
    pickup_area: raw.pickup_area || raw.pickup_address || 'Unknown',
    packages: Number(raw.packages ?? raw.quantity ?? 1),
    quantity: Number(raw.quantity ?? raw.packages ?? 1),
    weight: Number(raw.weight ?? 0),
    volume: Number(raw.volume ?? 0),
    distance_km: Number(raw.distance_km ?? raw.distance ?? 0),
    distance: Number(raw.distance ?? raw.distance_km ?? 0),
    load_type: raw.load_type || raw.commodity || 'General',
    commodity: raw.commodity || raw.load_type || 'General',
    priority: raw.priority || 'Medium',
    status: raw.status || 'available',
    driver_email: raw.driver_email || raw.driverEmail || raw.email || '',
    delivery_deadline: raw.delivery_deadline || raw.deadline || null,
    deadline: raw.deadline || raw.delivery_deadline || null,
  }
}

function toDbNumber(value, fallback = 0) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

function toDbNullableTimestamp(value) {
  if (!value) return null
  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString()
}

function toDbOrderPayload(row) {
  return {
    order_id: String(row.order_id || '').trim(),
    pickup_latitude: toDbNumber(row.pickup_latitude, 0),
    pickup_longitude: toDbNumber(row.pickup_longitude, 0),
    delivery_latitude: toDbNumber(row.delivery_latitude, 0),
    delivery_longitude: toDbNumber(row.delivery_longitude, 0),
    pickup_lat: toDbNumber(row.pickup_latitude, 0),
    pickup_lng: toDbNumber(row.pickup_longitude, 0),
    drop_lat: toDbNumber(row.delivery_latitude, 0),
    drop_lng: toDbNumber(row.delivery_longitude, 0),
    pickup_area: String(row.pickup_area || 'Unknown'),
    pickup_address: String(row.pickup_address || row.pickup_area || 'Unknown'),
    drop_address: String(row.drop_address || ''),
    packages: Math.max(0, Math.round(toDbNumber(row.packages, 1))),
    quantity: Math.max(0, Math.round(toDbNumber(row.quantity ?? row.packages, 1))),
    weight: toDbNumber(row.weight, 0),
    volume: toDbNumber(row.volume, 0),
    distance_km: toDbNumber(row.distance_km, 0),
    distance: toDbNumber(row.distance ?? row.distance_km, 0),
    load_type: String(row.load_type || 'General'),
    commodity: String(row.commodity || row.load_type || 'General'),
    priority: String(row.priority || 'Medium'),
    status: String(row.status || 'available'),
    driver_email: row.driver_email ? String(row.driver_email).trim() : null,
    delivery_deadline: toDbNullableTimestamp(row.delivery_deadline),
    deadline: toDbNullableTimestamp(row.deadline ?? row.delivery_deadline),
  }
}

export async function importOrdersAdaptive(normalizedRows) {
  const dbRows = normalizedRows.map((row) => toDbOrderPayload(row))
  const tableCandidates = ['orders', 'Orders']
  let lastError = null

  for (const tableName of tableCandidates) {
    let activeColumns = Object.keys(dbRows[0] || {})
    let writeError = null

    for (let attempt = 0; attempt < 30; attempt += 1) {
      const rowsForTable = dbRows.map((row) => {
        const next = {}
        activeColumns.forEach((column) => {
          if (Object.prototype.hasOwnProperty.call(row, column)) next[column] = row[column]
        })
        return next
      })

      const allHaveOrderId = rowsForTable.length > 0
        && activeColumns.includes('order_id')
        && rowsForTable.every((row) => Boolean(row.order_id))

      if (allHaveOrderId) {
        const upsertResp = await supabase.from(tableName).upsert(rowsForTable, { onConflict: 'order_id' })
        writeError = upsertResp.error
        const onConflictUnsupported = writeError
          && /on conflict|42P10|no unique|constraint|pgrst100|parse/i.test(String(writeError.message || ''))
        if (onConflictUnsupported) {
          const insertResp = await supabase.from(tableName).insert(rowsForTable)
          writeError = insertResp.error
        }
      } else {
        const insertResp = await supabase.from(tableName).insert(rowsForTable)
        writeError = insertResp.error
      }

      if (!writeError) return { ok: true, table: tableName }
      const missingColumn = extractMissingColumnName(writeError.message)
      if (!missingColumn || !activeColumns.includes(missingColumn)) break
      activeColumns = activeColumns.filter((column) => column !== missingColumn)
      if (activeColumns.length === 0) break
    }

    lastError = writeError
  }

  return { ok: false, error: lastError }
}
