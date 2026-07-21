'use client'

import { useState } from 'react'
import Link from 'next/link'

const DEMO_DELIVERIES = [
  {
    id: '#ORD-003',
    customer: 'Elena V.',
    address: '15 Kyriakou Matsi Ave, Nicosia',
    phone: '+357 96 123 456',
    items: 'Bún Bò Huế ×2',
    total: '€27.00',
    status: 'Picked Up',
    distance: '1.2 km',
    eta: '~8 min',
  },
  {
    id: '#ORD-004',
    customer: 'Nikos T.',
    address: '8 Griva Digeni Ave, Strovolos',
    phone: '+357 99 876 543',
    items: 'Gỏi Cuốn ×3, Trà Đào ×2',
    total: '€37.70',
    status: 'Pending Pickup',
    distance: '0.6 km',
    eta: '~15 min',
  },
]

const statusColors = {
  'Picked Up': 'bg-blue-100 text-blue-700',
  'Pending Pickup': 'bg-yellow-100 text-yellow-700',
  Delivered: 'bg-green-100 text-green-700',
}

export default function DriverDashboardPage() {
  const [deliveries, setDeliveries] = useState(DEMO_DELIVERIES)
  const [activeOrder, setActiveOrder] = useState(null)

  const updateStatus = (id, newStatus) => {
    setDeliveries((prev) =>
      prev.map((d) => (d.id === id ? { ...d, status: newStatus } : d))
    )
    if (activeOrder?.id === id) {
      setActiveOrder((prev) => ({ ...prev, status: newStatus }))
    }
  }

  const deliveredCount = deliveries.filter((d) => d.status === 'Delivered').length
  const pendingCount = deliveries.filter((d) => d.status !== 'Delivered').length

  return (
    <div className="min-h-screen bg-[#F2EAD8]">
      {/* Header */}
      <header className="bg-[#2B2B2B] px-4 sm:px-6 py-4">
        <div className="h-0.5 bg-gradient-to-r from-[#8B1E1E] via-[#D4A017] to-[#8B1E1E] -mt-4 mb-4" />
        <div className="flex items-center justify-between">
          <div>
            <p className="font-display font-bold text-white text-lg">Driver Dashboard</p>
            <p className="text-[#D4A017] text-xs">Hoa Phượng Đỏ · Delivery App</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="text-sm font-semibold text-white">Minh D.</p>
              <p className="text-xs text-white/50">Driver #02</p>
            </div>
            <div className="w-9 h-9 rounded-full bg-[#D4A017] flex items-center justify-center text-[#2B2B2B] text-sm font-bold">
              M
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* Status bar */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'To Deliver', value: pendingCount, color: 'text-[#8B1E1E]' },
            { label: 'Delivered Today', value: deliveredCount, color: 'text-green-600' },
            { label: 'Total Earnings', value: `€${(deliveries.length * 3.5).toFixed(2)}`, color: 'text-[#D4A017]' },
          ].map((stat) => (
            <div key={stat.label} className="bg-white rounded-2xl p-4 text-center border border-[#E8DFC8]">
              <p className={`font-display font-bold text-2xl ${stat.color}`}>{stat.value}</p>
              <p className="text-xs text-[#9C9489] mt-0.5">{stat.label}</p>
            </div>
          ))}
        </div>

        {/* Delivery queue */}
        <section>
          <h2 className="font-display font-bold text-[#2B2B2B] text-lg mb-4">Active Deliveries</h2>

          {deliveries.length === 0 ? (
            <div className="bg-white rounded-2xl border border-[#E8DFC8] p-10 text-center">
              <p className="text-3xl mb-2">✅</p>
              <p className="font-semibold text-[#2B2B2B]">All deliveries complete!</p>
              <p className="text-sm text-[#9C9489] mt-1">Waiting for new orders…</p>
            </div>
          ) : (
            <div className="space-y-4">
              {deliveries.map((delivery) => (
                <div
                  key={delivery.id}
                  className="bg-white rounded-2xl border border-[#E8DFC8] shadow-sm overflow-hidden"
                >
                  {/* Order header */}
                  <div className="px-5 py-4 border-b border-[#F0E8D8] flex items-center justify-between">
                    <div>
                      <span className="font-semibold text-[#2B2B2B] text-sm">{delivery.id}</span>
                      <span className="text-[#9C9489] text-sm"> · {delivery.customer}</span>
                    </div>
                    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${statusColors[delivery.status]}`}>
                      {delivery.status}
                    </span>
                  </div>

                  {/* Details */}
                  <div className="px-5 py-4 space-y-3">
                    <div className="flex items-start gap-3">
                      <span className="text-[#8B1E1E] mt-0.5">📍</span>
                      <div>
                        <p className="text-sm font-medium text-[#2B2B2B]">{delivery.address}</p>
                        <div className="flex items-center gap-3 mt-0.5">
                          <span className="text-xs text-[#9C9489]">📏 {delivery.distance}</span>
                          <span className="text-xs text-[#9C9489]">⏱ ETA {delivery.eta}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="text-[#D4A017]">🛍</span>
                      <p className="text-sm text-[#6B6560]">{delivery.items}</p>
                      <span className="ml-auto font-bold text-[#8B1E1E]">{delivery.total}</span>
                    </div>

                    {/* Action buttons */}
                    <div className="flex gap-3 pt-2">
                      <a
                        href={`tel:${delivery.phone}`}
                        className="flex-1 flex items-center justify-center gap-1.5 py-2.5 border border-[#E8DFC8] rounded-xl text-sm text-[#6B6560] hover:bg-[#F8F3EA] transition-all"
                      >
                        📞 Call
                      </a>
                      <a
                        href={`https://maps.google.com?q=${encodeURIComponent(delivery.address)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1 flex items-center justify-center gap-1.5 py-2.5 border border-[#E8DFC8] rounded-xl text-sm text-[#6B6560] hover:bg-[#F8F3EA] transition-all"
                      >
                        🗺 Navigate
                      </a>
                      {delivery.status === 'Pending Pickup' && (
                        <button
                          onClick={() => updateStatus(delivery.id, 'Picked Up')}
                          className="flex-1 py-2.5 bg-[#D4A017] text-[#2B2B2B] font-semibold rounded-xl text-sm hover:bg-[#e0b030] transition-all"
                        >
                          Picked Up ✓
                        </button>
                      )}
                      {delivery.status === 'Picked Up' && (
                        <button
                          onClick={() => updateStatus(delivery.id, 'Delivered')}
                          className="flex-1 py-2.5 bg-green-600 text-white font-semibold rounded-xl text-sm hover:bg-green-700 transition-all"
                        >
                          Delivered ✅
                        </button>
                      )}
                      {delivery.status === 'Delivered' && (
                        <div className="flex-1 py-2.5 bg-green-100 text-green-700 font-semibold rounded-xl text-sm text-center">
                          Complete ✅
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Footer link */}
        <div className="text-center pt-4">
          <Link href="/" className="text-sm text-[#9C9489] hover:text-[#8B1E1E] transition-colors">
            ← Back to Restaurant Website
          </Link>
        </div>
      </main>
    </div>
  )
}
