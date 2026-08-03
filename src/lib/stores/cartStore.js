'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'

import { DELIVERY_CONFIG } from '@/lib/deliveryConfig'

export function parsePrice(price) {
  const numeric = String(price).match(/\d+(?:\.\d+)?/)
  return numeric ? Number(numeric[0]) : 0
}

export function getCartItemKey(item) {
  return `${item.id}:${item.variantId || 'base'}`
}

export function getCartSummary(items) {
  const subtotal = items.reduce((sum, item) => sum + parsePrice(item.price) * item.qty, 0)
  const itemCount = items.reduce((sum, item) => sum + item.qty, 0)

  return { subtotal, itemCount }
}

export const useCartStore = create(
  persist(
    (set) => ({
      items: [],
      deliveryPricing: { nearbyDeliveryFee: DELIVERY_CONFIG.nearbyFeeCents / 100, fartherDeliveryFee: DELIVERY_CONFIG.fartherFeeCents / 100, status: 'idle' },
      beginDeliveryPricingLoad: () => set((state) => ({ deliveryPricing: { ...state.deliveryPricing, status: 'loading' } })),
      failDeliveryPricingLoad: () => set((state) => ({ deliveryPricing: { ...state.deliveryPricing, status: 'error' } })),
      setDeliveryPricing: ({ nearbyDeliveryFee, fartherDeliveryFee }) => set({ deliveryPricing: { nearbyDeliveryFee: Number(nearbyDeliveryFee), fartherDeliveryFee: Number(fartherDeliveryFee), status: 'ready' } }),
      addItem: (dish) =>
        set((state) => {
          const cartKey = getCartItemKey(dish)
          const existing = state.items.find((item) => (item.cartKey || getCartItemKey(item)) === cartKey)
          if (existing) {
            return {
              items: state.items.map((item) =>
                (item.cartKey || getCartItemKey(item)) === cartKey
                  ? { ...item, ...dish, cartKey, qty: Math.min(item.qty + 1, DELIVERY_CONFIG.maxItemQuantity) }
                  : item
              ),
            }
          }
          return { items: [...state.items, { ...dish, cartKey, qty: 1, note: '' }] }
        }),
      removeItem: (cartKey) =>
        set((state) => ({
          items: state.items.filter((item) => (item.cartKey || getCartItemKey(item)) !== cartKey),
        })),
      updateQty: (cartKey, delta) =>
        set((state) => ({
          items: state.items
            .map((item) => (item.cartKey || getCartItemKey(item)) === cartKey ? { ...item, qty: Math.min(item.qty + delta, DELIVERY_CONFIG.maxItemQuantity) } : item)
            .filter((item) => item.qty > 0),
        })),
      updateNote: (cartKey, note) =>
        set((state) => ({
          items: state.items.map((item) => (item.cartKey || getCartItemKey(item)) === cartKey ? { ...item, note: String(note).slice(0, 300) } : item),
        })),
      syncCatalog: (catalog) =>
        set((state) => {
          const catalogById = new Map(catalog.map((item) => [item.id, item]))
          return {
            items: state.items.flatMap((item) => {
              const current = catalogById.get(item.id)
              if (!current) return []
              const activeVariants = current.variants || []
              if (activeVariants.length) {
                const variant = activeVariants.find((entry) => entry.id === item.variantId)
                if (!variant) return []
                const synced = { ...current, variantId: variant.id, variantLabel: variant.label, price: variant.price }
                return [{ ...synced, cartKey: getCartItemKey(synced), qty: Math.min(Math.max(item.qty, 1), DELIVERY_CONFIG.maxItemQuantity), note: item.note || '' }]
              }
              const synced = { ...current, variantId: null, variantLabel: null }
              return [{ ...synced, cartKey: getCartItemKey(synced), qty: Math.min(Math.max(item.qty, 1), DELIVERY_CONFIG.maxItemQuantity), note: item.note || '' }]
            }),
          }
        }),
      clearCart: () => set({ items: [] }),
    }),
    {
      name: 'hoa-phuong-do-cart',
      partialize: (state) => ({ items: state.items }),
      skipHydration: true,
      version: 2,
      migrate: (persistedState) => persistedState,
    }
  )
)
