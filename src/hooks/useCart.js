// hooks/useCart.js
'use client'

import { useEffect } from 'react'

import { getCartSummary, useCartStore } from '@/lib/stores/cartStore'

let deliveryPricingRequest = null

/**
 * useCart - shared cart state hook backed by Zustand.
 */
export function useCart() {
  useEffect(() => {
    if (!useCartStore.persist.hasHydrated()) {
      useCartStore.persist.rehydrate()
    }
  }, [])

  const items = useCartStore((state) => state.items)
  const addItem = useCartStore((state) => state.addItem)
  const removeItem = useCartStore((state) => state.removeItem)
  const updateQty = useCartStore((state) => state.updateQty)
  const updateNote = useCartStore((state) => state.updateNote)
  const clearCart = useCartStore((state) => state.clearCart)
  const syncCatalog = useCartStore((state) => state.syncCatalog)
  const deliveryPricing = useCartStore((state) => state.deliveryPricing)
  const beginDeliveryPricingLoad = useCartStore((state) => state.beginDeliveryPricingLoad)
  const failDeliveryPricingLoad = useCartStore((state) => state.failDeliveryPricingLoad)
  const setDeliveryPricing = useCartStore((state) => state.setDeliveryPricing)
  const summary = getCartSummary(items, deliveryPricing.nearbyDeliveryFee)

  useEffect(() => {
    if (deliveryPricing.status !== 'idle') return
    beginDeliveryPricingLoad()
    deliveryPricingRequest ||= fetch('/api/delivery/config', { cache: 'no-store' })
      .then(async (response) => {
        const payload = await response.json().catch(() => ({}))
        if (!response.ok) throw new Error(payload.error || 'Could not load delivery pricing.')
        return payload.data
      })
    deliveryPricingRequest.then(setDeliveryPricing).catch(failDeliveryPricingLoad)
  }, [beginDeliveryPricingLoad, deliveryPricing.status, failDeliveryPricingLoad, setDeliveryPricing])

  return {
    items,
    ...summary,
    addItem,
    removeItem,
    updateQty,
    updateNote,
    clearCart,
    syncCatalog,
    setDeliveryPricing,
    nearbyDeliveryFee: deliveryPricing.nearbyDeliveryFee,
    fartherDeliveryFee: deliveryPricing.fartherDeliveryFee,
    deliveryPricingStatus: deliveryPricing.status,
  }
}
