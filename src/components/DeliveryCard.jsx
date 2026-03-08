import GlassCard from './GlassCard'

export default function DeliveryCard({ order, onAccept, onReject, disabled }) {
  return (
    <GlassCard className="p-4 hover:-translate-y-0.5 transition-all">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-white font-semibold">Order #{order.order_id || order.id}</p>
          <p className="text-white/80 text-sm mt-1">Pickup: {order.pickup_latitude ?? order.pickup_lat ?? '-'}, {order.pickup_longitude ?? order.pickup_lng ?? '-'}</p>
          <p className="text-white/80 text-sm">Drop: {order.delivery_latitude ?? order.drop_lat ?? '-'}, {order.delivery_longitude ?? order.drop_lng ?? '-'}</p>
        </div>
        <span className="px-3 py-1 rounded-full text-xs bg-orange-400/80 text-white">{order.priority || 'Medium'}</span>
      </div>
      <div className="mt-4 flex gap-2">
        <button className="bg-white/20 hover:bg-white/30 text-white rounded-xl px-4 py-2 transition-all disabled:opacity-50" onClick={() => onAccept(order)} disabled={disabled}>Accept</button>
        <button className="bg-white/20 hover:bg-white/30 text-white rounded-xl px-4 py-2 transition-all" onClick={() => onReject(order)}>Reject</button>
      </div>
    </GlassCard>
  )
}
