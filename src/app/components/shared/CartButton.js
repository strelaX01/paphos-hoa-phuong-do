'use client'

import Link from 'next/link'
import Image from 'next/image'
import { Minus, Plus, ShoppingBag, Trash2, X } from 'lucide-react'
import { useEffect, useState, useSyncExternalStore } from 'react'
import { createPortal } from 'react-dom'

import { useCart } from '@/hooks/useCart'
import { getCartItemKey } from '@/lib/stores/cartStore'

const emptySubscribe = () => () => {}
const formatMoney = (value) => new Intl.NumberFormat('en-IE', { style: 'currency', currency: 'EUR' }).format(Number(value || 0))

export default function CartButton({ isScrolled = false }) {
  const [isOpen, setIsOpen] = useState(false)
  const mounted = useSyncExternalStore(emptySubscribe, () => true, () => false)
  const cart = useCart()

  useEffect(() => {
    document.body.style.overflow = isOpen ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [isOpen])

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        data-cart-button
        className={`relative flex size-10 items-center justify-center transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D4A017]/70 ${
          isScrolled ? 'text-[#1A1410] hover:text-[#8B1E1E]' : 'text-white/75 hover:text-white'
        }`}
        aria-label={`Open cart with ${cart.itemCount} items`}
      >
        <ShoppingBag className="size-5" aria-hidden="true" />
        {cart.itemCount > 0 && (
          <span className="absolute -right-1 -top-1 flex size-5 items-center justify-center rounded-full bg-[#D4A017] text-[10px] font-bold text-[#1A1410]">
            {cart.itemCount}
          </span>
        )}
      </button>

      {mounted && createPortal(
        <>
          <div
            className={`fixed inset-0 z-[80] bg-black/60 backdrop-blur-sm transition-opacity duration-200 ${
              isOpen ? 'opacity-100' : 'pointer-events-none opacity-0'
            }`}
            aria-hidden="true"
            onClick={() => setIsOpen(false)}
          />

          <aside
            role="dialog"
            aria-modal="true"
            aria-label="Delivery cart"
            className={`fixed bottom-0 right-0 top-0 z-[90] flex w-full max-w-[420px] flex-col bg-[#1E1A18] text-white shadow-2xl transition-transform duration-300 ${
              isOpen ? 'translate-x-0' : 'translate-x-full'
            }`}
          >
            <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.25em] text-[#D4A017]">
                  Delivery
                </p>
                <h2 className="font-display text-2xl font-bold">Your Cart</h2>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="flex size-9 items-center justify-center text-white/50 transition-colors hover:text-white"
                aria-label="Close cart"
              >
                <X className="size-5" aria-hidden="true" />
              </button>
            </div>

            <div className="min-h-0 flex-1 px-5 py-5">
              <CartPanel cart={cart} onCheckout={() => setIsOpen(false)} />
            </div>
          </aside>
        </>,
        document.body
      )}
    </>
  )
}

export function CartPanel({ cart, compact = false, onCheckout }) {
  return (
    <div className="flex h-full min-h-0 flex-col">
      {cart.items.length === 0 ? (
        <p className="border border-white/10 bg-white/[0.03] px-4 py-5 text-[13px] leading-relaxed text-white/45">
          Add your favorite dishes to start a delivery order.
        </p>
      ) : (
        <div className="max-h-[min(412px,calc(100dvh-250px))] space-y-3 overflow-y-auto pr-1">
          {cart.items.map((item) => {
            const cartKey = item.cartKey || getCartItemKey(item)
            return (
            <div key={cartKey} className="border border-white/10 bg-white/[0.03] p-3">
              <div className="grid grid-cols-[64px_1fr_auto] gap-3">
                <div className="relative size-16 overflow-hidden bg-white/10">
                  {item.image && (
                    <Image
                      src={item.image}
                      alt={item.name}
                      fill
                      className="object-cover"
                      sizes="64px"
                    />
                  )}
                </div>
                <div className="min-w-0">
                  <p className="truncate font-display text-lg font-bold leading-tight">{item.name}</p>
                  {item.variantLabel ? <p className="mt-0.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#D4A017]">{item.variantLabel}</p> : null}
                  <p className="mt-0.5 text-[12px] text-white/45">{formatMoney(item.price)}</p>
                  <div className="mt-3 flex items-center gap-2">
                    <QtyButton onClick={() => cart.updateQty(cartKey, -1)} label={`Decrease ${item.name}`}>
                      <Minus className="size-3.5" aria-hidden="true" />
                    </QtyButton>
                    <span className="min-w-8 text-center text-[13px] font-semibold">{item.qty}</span>
                    <QtyButton onClick={() => cart.updateQty(cartKey, 1)} label={`Increase ${item.name}`}>
                      <Plus className="size-3.5" aria-hidden="true" />
                    </QtyButton>
                  </div>
                  <input
                    value={item.note || ''}
                    onChange={(event) => cart.updateNote(cartKey, event.target.value)}
                    maxLength={300}
                    placeholder="Kitchen note"
                    className="mt-3 h-9 w-full border border-white/15 bg-transparent px-2 text-xs text-white outline-none placeholder:text-white/30 focus:border-[#D4A017]"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => cart.removeItem(cartKey)}
                  className="text-white/35 transition-colors hover:text-[#D4A017]"
                  aria-label={`Remove ${item.name}`}
                >
                  <Trash2 className="size-4" aria-hidden="true" />
                </button>
              </div>
            </div>
            )
          })}
        </div>
      )}

      <div className="my-5 space-y-2 border-y border-white/10 py-4 text-[13px]">
        <div className="flex justify-between text-white/45">
          <span>Subtotal</span>
          <span>{formatMoney(cart.subtotal)}</span>
        </div>
        <div className="flex justify-between text-white/45">
          <span>Delivery</span>
          <span>{cart.deliveryFee === 0 ? 'Free' : formatMoney(cart.deliveryFee)}</span>
        </div>
        <div className={`flex justify-between items-center font-bold ${compact ? 'text-xl' : 'text-2xl'}`}>
          <span className="font-display">Total</span>
          <span className="font-sans tabular-nums" style={{ lineHeight: 1 }}>{formatMoney(cart.total)}</span>
        </div>
      </div>

      <Link
        href="/checkout"
        onClick={onCheckout}
        aria-disabled={cart.items.length === 0}
        className={`flex w-full items-center justify-center px-5 py-3.5 text-[12px] font-bold uppercase tracking-[0.16em] transition-colors ${
          cart.items.length === 0
            ? 'pointer-events-none bg-white/10 text-white/30'
            : 'bg-[#D4A017] text-[#1A1410] hover:bg-[#e8c228]'
        }`}
      >
        Checkout
      </Link>
    </div>
  )
}

function QtyButton({ onClick, label, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex size-8 items-center justify-center border border-white/15 text-white/70 hover:border-[#D4A017]/60 hover:text-[#D4A017]"
      aria-label={label}
    >
      {children}
    </button>
  )
}
