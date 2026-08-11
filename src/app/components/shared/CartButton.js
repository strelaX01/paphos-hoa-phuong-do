'use client'

import { useRef, useState, useSyncExternalStore } from 'react'
import { createPortal } from 'react-dom'
import Image from 'next/image'
import Link from 'next/link'
import { ArrowRight, Minus, Plus, ShoppingBag, Trash2, X } from 'lucide-react'

import { useCart } from '@/hooks/useCart'
import { DELIVERY_CONFIG } from '@/lib/deliveryConfig'
import { getCartItemKey } from '@/lib/stores/cartStore'
import { useModalDialog } from '@/hooks/useModalDialog'

const emptySubscribe = () => () => {}
const formatMoney = (value) => new Intl.NumberFormat('en-IE', { style: 'currency', currency: 'EUR' }).format(Number(value || 0))

export default function CartButton({ isScrolled = false }) {
  const [isOpen, setIsOpen] = useState(false)
  const dialogRef = useRef(null)
  const mounted = useSyncExternalStore(emptySubscribe, () => true, () => false)
  const cart = useCart()

  useModalDialog({
    open: isOpen,
    containerRef: dialogRef,
    onEscape: () => setIsOpen(false),
  })

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        data-cart-button
        className={`relative flex size-11 items-center justify-center transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#d4a017]/70 ${
          isScrolled ? 'text-[#1a1410] hover:text-[#8b1e1e]' : 'text-white/75 hover:text-white'
        }`}
        aria-label={`Open cart with ${cart.itemCount} ${cart.itemCount === 1 ? 'item' : 'items'}`}
      >
        <ShoppingBag className="size-5" strokeWidth={1.7} aria-hidden="true" />
        {cart.itemCount > 0 ? (
          <span className="absolute -right-1 -top-1 flex size-5 items-center justify-center rounded-full bg-[#d4a017] text-[10px] font-bold text-[#1a1410]">
            {cart.itemCount}
          </span>
        ) : null}
      </button>

      {mounted && createPortal(
        <>
          <div
            className={`fixed inset-0 z-[80] bg-[#160f0c]/62 backdrop-blur-[2px] transition-opacity duration-300 ${
              isOpen ? 'opacity-100' : 'pointer-events-none opacity-0'
            }`}
            aria-hidden="true"
            onClick={() => setIsOpen(false)}
          />

          <aside
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-label="Delivery cart"
            aria-hidden={!isOpen}
            inert={!isOpen}
            tabIndex={-1}
            className={`fixed bottom-0 right-0 top-0 z-[90] flex w-full max-w-[440px] flex-col bg-[#fbf8f2] text-[#2b241e] shadow-[-24px_0_60px_rgba(20,13,9,0.22)] outline-none transition-transform duration-[450ms] ${
              isOpen ? 'translate-x-0' : 'translate-x-full'
            }`}
          >
            <div className="flex h-[82px] shrink-0 items-center justify-between border-b border-[#e4dac9] px-5 sm:px-6">
              <div>
                <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-[#9d2023]">Your order</p>
                <div className="mt-1 flex items-baseline gap-2.5">
                  <h2 className="font-display text-[26px] font-semibold leading-none">Cart</h2>
                  <span className="text-[11px] text-[#81766b]">{cart.itemCount} {cart.itemCount === 1 ? 'item' : 'items'}</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="flex size-11 items-center justify-center border border-[#d9cdbb] text-[#2b241e] transition-colors hover:border-[#9d2023] hover:text-[#9d2023] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#d4a017]"
                aria-label="Close cart"
              >
                <X className="size-5" strokeWidth={1.6} aria-hidden="true" />
              </button>
            </div>

            <CartPanel cart={cart} onCheckout={() => setIsOpen(false)} />
          </aside>
        </>,
        document.body
      )}
    </>
  )
}

export function CartPanel({ cart, onCheckout }) {
  const hasItems = cart.items.length > 0

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="min-h-0 flex-1 overflow-y-auto px-5 sm:px-6">
        {!hasItems ? (
          <div className="flex h-full min-h-[280px] flex-col items-center justify-center text-center">
            <span className="grid size-14 place-items-center border border-[#ded2bf] bg-white text-[#9d2023]">
              <ShoppingBag className="size-6" strokeWidth={1.5} aria-hidden="true" />
            </span>
            <h3 className="mt-5 font-display text-2xl font-semibold">Your cart is empty</h3>
            <p className="mt-2 max-w-[250px] text-[13px] leading-relaxed text-[#81766b]">
              Add a dish from the delivery menu to begin your order.
            </p>
          </div>
        ) : (
          <div>
            {cart.items.map((item) => {
              const cartKey = item.cartKey || getCartItemKey(item)
              return (
                <article key={cartKey} className="border-b border-[#e4dac9] py-5">
                  <div className="grid grid-cols-[72px_minmax(0,1fr)_44px] gap-3.5">
                    <div className="relative size-[72px] overflow-hidden border border-[#e4dac9] bg-[#f1eadf]">
                      {item.image ? (
                        <Image src={item.image} alt={item.name} fill className="object-cover" sizes="72px" />
                      ) : (
                        <span className="grid h-full place-items-center text-[#a89c8c]">
                          <ShoppingBag className="size-5" strokeWidth={1.5} aria-hidden="true" />
                        </span>
                      )}
                    </div>

                    <div className="min-w-0">
                      <h3 className="line-clamp-2 text-[15px] font-semibold leading-snug text-[#2b241e]">{item.name}</h3>
                      {item.variantLabel ? (
                        <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.12em] text-[#9d2023]">{item.variantLabel}</p>
                      ) : null}
                      <p className="mt-1 text-[13px] font-semibold tabular-nums text-[#9d2023]">{formatMoney(item.price)}</p>
                    </div>

                    <button
                      type="button"
                      onClick={() => cart.removeItem(cartKey)}
                      className="flex size-11 items-center justify-center border border-[#e4dac9] text-[#9d2023] transition-colors hover:border-[#9d2023] hover:bg-[#9d2023] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#d4a017]"
                      aria-label={`Remove ${item.name}`}
                    >
                      <Trash2 className="size-4" strokeWidth={1.7} aria-hidden="true" />
                    </button>
                  </div>

                  <div className="mt-4 flex items-center justify-between gap-3">
                    <div className="grid h-11 w-[132px] shrink-0 grid-cols-[44px_1fr_44px] border border-[#d9cdbb] bg-white">
                      <QtyButton disabled={item.qty <= 1} onClick={() => cart.updateQty(cartKey, -1)} label={`Decrease ${item.name}`}>
                        <Minus className="size-3.5" aria-hidden="true" />
                      </QtyButton>
                      <span className="grid place-items-center border-x border-[#e4dac9] text-[13px] font-semibold tabular-nums">{item.qty}</span>
                      <QtyButton disabled={item.qty >= DELIVERY_CONFIG.maxItemQuantity} onClick={() => cart.updateQty(cartKey, 1)} label={`Increase ${item.name}`}>
                        <Plus className="size-3.5" aria-hidden="true" />
                      </QtyButton>
                    </div>
                    <span className="min-w-[72px] text-right text-[12px] font-medium leading-none tabular-nums text-[#81766b]">{formatMoney(Number(item.price) * Number(item.qty))}</span>
                  </div>

                  <input
                    value={item.note || ''}
                    onChange={(event) => cart.updateNote(cartKey, event.target.value)}
                    maxLength={300}
                    aria-label={`Kitchen note for ${item.name}`}
                    placeholder="Add a kitchen note (optional)"
                    className="mt-3 h-11 w-full border border-[#d9cdbb] bg-white px-3 text-base text-[#2b241e] outline-none placeholder:text-[#9a9085] focus:border-[#9d2023] sm:h-10 sm:text-sm"
                  />
                </article>
              )
            })}
          </div>
        )}
      </div>

      <div className="shrink-0 border-t border-[#e4dac9] bg-white px-5 py-5 sm:px-6">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#81766b]">Subtotal</p>
            <p className="mt-1 font-sans text-[24px] font-semibold leading-none tabular-nums text-[#2b241e]">{formatMoney(cart.subtotal)}</p>
          </div>
          <div className="pb-0.5 text-right">
            <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#81766b]">Delivery fee</p>
            <p className="mt-1 text-[12px] font-medium text-[#2b241e]">Calculated at checkout</p>
          </div>
        </div>
        <p className="mt-3 border-l-2 border-[#d4a017] pl-3 text-[11px] leading-relaxed text-[#81766b]">
          The fee is calculated from your confirmed delivery point.
        </p>

        <Link
          href="/checkout"
          onClick={onCheckout}
          aria-disabled={!hasItems}
          className={`mt-5 flex min-h-[52px] w-full items-center justify-center px-5 text-[11px] font-bold uppercase tracking-[0.12em] transition-colors ${
            hasItems
              ? 'bg-[#9d2023] text-white hover:bg-[#821a1d]'
              : 'pointer-events-none bg-[#e7dfd3] text-[#a89c8c]'
          }`}
        >
          Continue to checkout
          <ArrowRight className="ml-2.5 size-4" strokeWidth={1.8} aria-hidden="true" />
        </Link>
      </div>
    </div>
  )
}

function QtyButton({ onClick, label, children, disabled = false }) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="flex items-center justify-center text-[#5f574f] transition-colors hover:bg-[#f4ede2] hover:text-[#9d2023] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#d4a017] disabled:cursor-not-allowed disabled:bg-[#f4ede2]/45 disabled:text-[#b8afa4]"
      aria-label={label}
    >
      {children}
    </button>
  )
}
