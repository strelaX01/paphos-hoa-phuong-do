// hooks/useCart.js
'use client'

import { useEffect } from 'react'

import { getCartSummary, useCartStore } from '@/lib/stores/cartStore'

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
  const summary = getCartSummary(items)

  return {
    items,
    ...summary,
    addItem,
    removeItem,
    updateQty,
    updateNote,
    clearCart,
    syncCatalog,
  }
}
