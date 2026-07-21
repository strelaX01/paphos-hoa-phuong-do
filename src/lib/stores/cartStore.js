'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'

import { DELIVERY_CONFIG } from '@/lib/deliveryConfig'

export function parsePrice(price) {
  const numeric = String(price).match(/\d+(?:\.\d+)?/)
  return numeric ? Number(numeric[0]) : 0
}

export function getCartSummary(items) {
  const subtotal = items.reduce((sum, item) => sum + parsePrice(item.price) * item.qty, 0)
  const itemCount = items.reduce((sum, item) => sum + item.qty, 0)
  const deliveryFee = subtotal === 0 ? 0 : DELIVERY_CONFIG.nearbyFeeCents / 100
  const total = subtotal + deliveryFee

  return { subtotal, itemCount, deliveryFee, total }
}

export const useCartStore = create(
  persist(
    (set) => ({
      items: [],
      addItem: (dish) =>
        set((state) => {
          const existing = state.items.find((item) => item.id === dish.id)
          if (existing) {
            return {
              items: state.items.map((item) =>
                item.id === dish.id ? { ...item, qty: Math.min(item.qty + 1, DELIVERY_CONFIG.maxItemQuantity) } : item
              ),
            }
          }
          return { items: [...state.items, { ...dish, qty: 1, note: '' }] }
        }),
      removeItem: (id) =>
        set((state) => ({
          items: state.items.filter((item) => item.id !== id),
        })),
      updateQty: (id, delta) =>
        set((state) => ({
          items: state.items
            .map((item) => item.id === id ? { ...item, qty: Math.min(item.qty + delta, DELIVERY_CONFIG.maxItemQuantity) } : item)
            .filter((item) => item.qty > 0),
        })),
      updateNote: (id, note) =>
        set((state) => ({
          items: state.items.map((item) => item.id === id ? { ...item, note: String(note).slice(0, 300) } : item),
        })),
      syncCatalog: (catalog) =>
        set((state) => {
          const catalogById = new Map(catalog.map((item) => [item.id, item]))
          return {
            items: state.items.flatMap((item) => {
              const current = catalogById.get(item.id)
              return current ? [{ ...current, qty: Math.min(Math.max(item.qty, 1), DELIVERY_CONFIG.maxItemQuantity), note: item.note || '' }] : []
            }),
          }
        }),
      clearCart: () => set({ items: [] }),
    }),
    {
      name: 'hoa-phuong-do-cart',
      partialize: (state) => ({ items: state.items }),
      skipHydration: true,
      version: 1,
    }
  )
)
