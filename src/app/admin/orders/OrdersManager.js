"use client"

import { useDeferredValue, useEffect, useMemo, useRef, useState } from "react"
import { createPortal, flushSync } from "react-dom"
import { ChevronDown, ChevronLeft, ChevronRight, ChevronUp, ClipboardList, LoaderCircle, MapPinned, Minus, PackageCheck, Pencil, Plus, Printer, RefreshCw, Search, Timer, Trash2, Truck, WalletCards, X } from "lucide-react"

import AdminShell from "@/app/admin/_components/AdminShell"
import { useAdminSession } from "@/app/admin/_components/AdminSession"
import AdminToast from "@/app/admin/_components/AdminToast"
import { MetricGridSkeleton, ResponsiveListSkeleton } from "@/app/components/shared/SkeletonBlocks"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { CONTACT } from "@/lib/constants/index.js"
import { dedupeClientRequest } from "@/lib/dedupeClientRequest"
import { DELIVERY_CONFIG } from "@/lib/deliveryConfig"
import { ADMIN_NEXT_STATUS, DRIVER_NEXT_STATUS, DRIVER_ORDER_STATUSES, formatOrderStatus, ORDER_ACTION_LABELS, ORDER_STATUSES } from "@/lib/orderStatus"
import { useModalDialog } from "@/hooks/useModalDialog"

const statusVariant = { PENDING: "warning", PREPARING: "preparing", PENDING_PICKUP: "info", EN_ROUTE: "default", DELIVERED: "success", CANCELLED: "destructive" }
const statusRowAccent = { PENDING: "border-l-amber-400", PREPARING: "border-l-orange-500", PENDING_PICKUP: "border-l-cyan-500", EN_ROUTE: "border-l-indigo-500", DELIVERED: "border-l-emerald-500", CANCELLED: "border-l-red-500" }
const orderFieldClass = "h-10 w-full rounded-md border border-[#E4DAC9] bg-white px-3 text-sm outline-none focus:border-[#8B1E1E] disabled:bg-[#F6F1E8]"

async function readApi(response) {
  const payload = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(payload.error || "Request failed.")
  return payload
}

export default function OrdersManager() {
  const account = useAdminSession()
  const isDriver = account.role === "DRIVER"
  const [orders, setOrders] = useState([])
  const [summary, setSummary] = useState({ pending: 0, kitchen: 0, delivery: 0, ready: 0, todayRevenue: 0 })
  const [pagination, setPagination] = useState({ page: 1, total: 0, totalPages: 1 })
  const [query, setQuery] = useState("")
  const deferredQuery = useDeferredValue(query.trim())
  const [status, setStatus] = useState("")
  const [page, setPage] = useState(1)
  const [refreshKey, setRefreshKey] = useState(0)
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState(null)
  const [selected, setSelected] = useState(null)
  const [confirmCancel, setConfirmCancel] = useState(null)
  const [invoice, setInvoice] = useState(null)
  const [toast, setToast] = useState(null)
  const toastId = useRef(0)

  const showToast = (message, tone = "success") => { toastId.current += 1; setToast({ id: toastId.current, message, tone }) }
  const printInvoice = (order) => {
    if (!order.deliveryFeeConfirmed) {
      setSelected(order)
      showToast("Set the final delivery fee before printing the invoice.", "error")
      return
    }
    // Keep print() in the original click event so mobile browsers retain user activation.
    flushSync(() => setInvoice({ order }))
    window.print()
  }

  useEffect(() => {
    const refreshNewOrders = () => {
      setLoading(true)
      setPage(1)
      setRefreshKey((key) => key + 1)
    }
    window.addEventListener("new-order-received", refreshNewOrders)
    return () => window.removeEventListener("new-order-received", refreshNewOrders)
  }, [])

  useEffect(() => {
    let active = true
    const params = new URLSearchParams({ page: String(page), limit: "12" })
    if (deferredQuery) params.set("q", deferredQuery)
    if (status) params.set("status", status)
    const url = `/api/admin/orders?${params}`
    dedupeClientRequest(url, () => {
      return fetch(url).then(readApi)
    })
      .then((payload) => { if (active) { setOrders(payload.data); setSummary(payload.summary); setPagination(payload.pagination) } })
      .catch((error) => { if (active) showToast(error.message || "Could not load orders.", "error") })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [deferredQuery, page, refreshKey, status])

  const updateOrder = async (order, changes, message) => {
    setBusyId(order.id)
    try {
      const payload = await fetch(`/api/admin/orders/${order.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(changes) }).then(readApi)
      setOrders((current) => current.map((entry) => entry.id === order.id ? payload.data : entry))
      setSelected((current) => current?.id === order.id ? payload.data : current)
      setConfirmCancel(null)
      setRefreshKey((key) => key + 1)
      window.dispatchEvent(new Event("order-count-changed"))
      showToast(message)
      return payload.data
    } catch (error) {
      showToast(error.message || "Could not update order.", "error")
      return null
    } finally {
      setBusyId(null)
    }
  }

  const metrics = useMemo(() => isDriver ? [
    { label: "Ready", value: summary.ready, detail: "Waiting for delivery", icon: PackageCheck },
    { label: "Delivering", value: summary.delivery, detail: "Currently on the way", icon: Truck },
  ] : [
    { label: "New", value: summary.pending, detail: "Waiting to be started", icon: PackageCheck },
    { label: "Kitchen queue", value: summary.kitchen, detail: `${summary.ready} ready for delivery`, icon: Timer },
    { label: "Delivering", value: summary.delivery, detail: "Currently on the way", icon: Truck },
    { label: "Today value", value: formatMoney(summary.todayRevenue), detail: "Excludes cancelled orders", icon: WalletCards },
  ], [isDriver, summary])

  const filterStatuses = isDriver ? DRIVER_ORDER_STATUSES : ORDER_STATUSES

  return <AdminShell active="orders" eyebrow={isDriver ? "Driver workspace" : "Order operations"} title="Orders" description={isDriver ? "Start and complete deliveries." : "Manage each order from receipt through completion."} action={<Button variant="outline" onClick={() => { setLoading(true); setRefreshKey((key) => key + 1) }} disabled={loading}><RefreshCw className={`size-4 ${loading ? "animate-spin" : ""}`} />Refresh</Button>}>
    <AdminToast key={toast?.id} message={toast?.message} tone={toast?.tone} onDismiss={() => setToast(null)} />
    <div className="space-y-5">
      {loading ? <MetricGridSkeleton count={isDriver ? 2 : 4} /> : <section className={`grid gap-4 sm:grid-cols-2 ${isDriver ? "max-w-2xl" : "xl:grid-cols-4"}`} aria-label="Order metrics">{metrics.map((metric) => <MetricCard key={metric.label} {...metric} />)}</section>}
      <section className="space-y-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between"><div><h2 className="font-display text-xl font-semibold">Live order queue</h2><p className="text-sm text-[#756D62]">{pagination.total} matching orders</p></div><div className="flex flex-col gap-2 sm:flex-row"><label className="relative"><span className="sr-only">Search orders</span><Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#756D62]" /><input value={query} onChange={(event) => { const next = event.target.value; if (next.trim() !== deferredQuery) setLoading(true); setQuery(next); setPage(1) }} placeholder="Order, customer, phone" className="h-9 w-full rounded-md border border-[#E4DAC9] bg-white pl-9 pr-3 text-sm outline-none sm:w-64" /></label><select value={status} onChange={(event) => { setLoading(true); setStatus(event.target.value); setPage(1) }} aria-label="Filter order status" className="h-9 rounded-md border border-[#E4DAC9] bg-white px-3 text-sm"><option value="">All statuses</option>{filterStatuses.map((option) => <option key={option} value={option}>{formatOrderStatus(option)}</option>)}</select></div></div>
        {loading ? <ResponsiveListSkeleton rows={6} columns={isDriver ? 6 : 7} /> : orders.length ? <OrdersList orders={orders} busyId={busyId} isDriver={isDriver} onDetails={setSelected} onPrint={printInvoice} onAdvance={(order) => updateOrder(order, { status: (isDriver ? DRIVER_NEXT_STATUS : ADMIN_NEXT_STATUS)[order.status] }, "Order status updated.")} onCancel={setConfirmCancel} /> : <EmptyState />}
        {pagination.totalPages > 1 ? <div className="flex items-center justify-between border-t border-[#E4DAC9] pt-4"><p className="text-sm text-[#756D62]">Page {pagination.page} of {pagination.totalPages}</p><div className="flex gap-2"><PageButton icon={ChevronLeft} label="Previous page" disabled={loading || page <= 1} onClick={() => { setLoading(true); setPage((value) => value - 1) }} /><PageButton icon={ChevronRight} label="Next page" disabled={loading || page >= pagination.totalPages} onClick={() => { setLoading(true); setPage((value) => value + 1) }} /></div></div> : null}
      </section>
    </div>
    {selected ? <OrderDetailModal order={selected} busy={busyId === selected.id} onClose={() => setSelected(null)} onPrint={() => printInvoice(selected)} onSaveEdit={(edit) => updateOrder(selected, { edit }, "Order updated.")} onSaveFee={(deliveryFee) => updateOrder(selected, { deliveryFee }, "Delivery fee updated.")} /> : null}
    {confirmCancel ? <CancelModal order={confirmCancel} busy={busyId === confirmCancel.id} onClose={() => setConfirmCancel(null)} onConfirm={() => updateOrder(confirmCancel, { status: "CANCELLED" }, "Order cancelled.")} /> : null}
    {invoice ? <InvoiceModal order={invoice.order} onClose={() => setInvoice(null)} /> : null}
  </AdminShell>
}

function OrdersList({ busyId, isDriver, onAdvance, onCancel, onDetails, onPrint, orders }) {
  return <>
    <div className="hidden overflow-x-auto border border-[#E4DAC9] bg-white lg:block">
      <table className="w-full min-w-[1040px] text-left text-sm">
        <thead className="border-b border-[#E4DAC9] bg-[#F6F1E8] text-[11px] font-semibold uppercase text-[#756D62]">
          <tr><th className="px-4 py-3">Order</th><th className="px-4 py-3">Customer</th><th className="px-4 py-3">Delivery</th><th className="px-4 py-3 text-center">Items</th>{!isDriver ? <th className="px-4 py-3 text-right">Total</th> : null}<th className="px-4 py-3">Status</th><th className="px-4 py-3 text-right">Actions</th></tr>
        </thead>
        <tbody className="divide-y divide-[#D8CEBD]">
          {orders.map((order, index) => <OrderRow key={order.id} order={order} index={index} busy={busyId === order.id} isDriver={isDriver} onDetails={() => onDetails(order)} onPrint={() => onPrint(order)} onAdvance={() => onAdvance(order)} onCancel={() => onCancel(order)} />)}
        </tbody>
      </table>
    </div>
    <div className="grid gap-3 lg:hidden">
      {orders.map((order) => <OrderMobileRow key={order.id} order={order} busy={busyId === order.id} isDriver={isDriver} onDetails={() => onDetails(order)} onPrint={() => onPrint(order)} onAdvance={() => onAdvance(order)} onCancel={() => onCancel(order)} />)}
    </div>
  </>
}

function OrderRow({ busy, index, isDriver, onAdvance, onCancel, onDetails, onPrint, order }) {
  const itemCount = order.items.reduce((sum, item) => sum + item.quantity, 0)
  const rowTone = order.status === "PENDING"
    ? "bg-[#FFF0C2] hover:bg-[#FFE4A3]"
    : order.status === "CANCELLED"
      ? `${index % 2 ? "bg-red-50/60" : "bg-red-50/35"} hover:bg-red-100/70`
      : `${index % 2 ? "bg-[#FBF8F2]" : "bg-white"} hover:bg-[#F3ECDD]`

  return <tr className={`${rowTone} align-middle transition-colors`}>
    <td className={`whitespace-nowrap border-l-4 px-4 py-4 ${statusRowAccent[order.status] || "border-l-[#D8CEBD]"}`}>{isDriver ? <span className="inline-flex rounded-sm bg-white/75 px-2 py-1 font-mono text-xs font-bold text-[#8B1E1E] shadow-xs ring-1 ring-black/5">{order.orderNumber}</span> : <button type="button" onClick={onDetails} className="inline-flex rounded-sm bg-white/75 px-2 py-1 font-mono text-xs font-bold text-[#8B1E1E] shadow-xs ring-1 ring-black/5 hover:underline">{order.orderNumber}</button>}<p className="mt-1.5 text-xs text-[#756D62]">{formatDateTime(order.createdAt)}</p></td>
    <td className="px-4 py-4"><p className="max-w-44 truncate font-semibold">{order.customerName}</p><p className="mt-1 whitespace-nowrap text-xs text-[#756D62]">{order.customerPhone}</p></td>
    <td className="px-4 py-4"><p className="max-w-52 truncate font-medium">{order.deliveryZone || "-"}</p><p className="mt-1 max-w-52 truncate text-xs text-[#756D62]">{order.deliveryStreet}</p></td>
    <td className="px-4 py-4 text-center font-semibold">{itemCount}</td>
    {!isDriver ? <td className="whitespace-nowrap px-4 py-4 text-right font-bold">{order.deliveryFeeConfirmed ? formatMoney(order.total) : <span className="text-xs font-semibold text-amber-700">Fee pending</span>}</td> : null}
    <td className="whitespace-nowrap px-4 py-4"><Badge variant={statusVariant[order.status]}>{formatOrderStatus(order.status)}</Badge></td>
    <td className="px-4 py-4"><OrderActions order={order} busy={busy} isDriver={isDriver} onAdvance={onAdvance} onCancel={onCancel} onDetails={onDetails} onPrint={onPrint} compact /></td>
  </tr>
}

function OrderMobileRow({ busy, isDriver, onAdvance, onCancel, onDetails, onPrint, order }) {
  return <article className={`border p-4 ${order.status === "PENDING" ? "border-[#D4A017] bg-[#FFF0C2] shadow-[inset_4px_0_0_#B7791F]" : order.status === "CANCELLED" ? "border-red-200 bg-red-50/35" : "border-[#E4DAC9] bg-white"}`}>
    <div className="flex items-start justify-between gap-3">
      <div><p className="font-mono text-sm font-bold text-[#8B1E1E]">{order.orderNumber}</p><p className="mt-1 font-semibold">{order.customerName}</p><p className="text-xs text-[#756D62]">{order.customerPhone} | {formatDateTime(order.createdAt)}</p></div>
      <Badge variant={statusVariant[order.status]}>{formatOrderStatus(order.status)}</Badge>
    </div>
    <div className={`mt-4 grid gap-3 border-y border-black/8 py-3 ${isDriver ? "grid-cols-2" : "grid-cols-3"}`}><Info label="Items" value={order.items.reduce((sum, item) => sum + item.quantity, 0)} /><Info label="Area" value={order.deliveryZone || "-"} />{!isDriver ? <Info label="Total" value={order.deliveryFeeConfirmed ? formatMoney(order.total) : "Fee pending"} /> : null}</div>
    <p className="mt-3 line-clamp-1 text-sm text-[#756D62]">{order.deliveryStreet}</p>
    {isDriver && order.deliveryNotes ? <p className="mt-2 text-sm"><span className="font-semibold">Note:</span> {order.deliveryNotes}</p> : null}
    <div className="mt-4"><OrderActions order={order} busy={busy} isDriver={isDriver} onAdvance={onAdvance} onCancel={onCancel} onDetails={onDetails} onPrint={onPrint} /></div>
  </article>
}

function OrderActions({ busy, compact = false, isDriver, onAdvance, onCancel, onDetails, onPrint, order }) {
  const nextStatus = (isDriver ? DRIVER_NEXT_STATUS : ADMIN_NEXT_STATUS)[order.status]
  const canAdvance = Boolean(nextStatus) && (isDriver || order.status !== "PENDING" || order.deliveryFeeConfirmed)
  const canCancel = ["PENDING", "PREPARING", "PENDING_PICKUP"].includes(order.status)

  return <div className="flex flex-wrap items-center justify-end gap-2">
    {order.deliveryLatitude !== null && order.deliveryLongitude !== null ? <a href={`https://www.google.com/maps/search/?api=1&query=${order.deliveryLatitude},${order.deliveryLongitude}`} target="_blank" rel="noreferrer" className="inline-flex h-9 items-center gap-2 rounded-md border border-[#D8CEBD] bg-white px-3 text-sm font-medium text-[#2B2B2B] hover:bg-[#F6F1E8]" aria-label={`Open delivery pin for ${order.orderNumber}`} title="Open delivery pin"><MapPinned className="size-4" />{compact ? null : "Map"}</a> : null}
    {!isDriver ? <Button variant="outline" size="icon-sm" onClick={onPrint} disabled={!order.deliveryFeeConfirmed} aria-label={`Print invoice ${order.orderNumber}`} title={order.deliveryFeeConfirmed ? "Print invoice" : "Set delivery fee before printing"}><Printer className="size-4" /></Button> : null}
    {!isDriver ? <Button variant="outline" size={compact ? "icon-sm" : "sm"} onClick={onDetails} aria-label={`View details ${order.orderNumber}`} title="View details"><ClipboardList className="size-4" />{compact ? null : "Details"}</Button> : null}
    {!isDriver && canCancel ? <Button variant="destructive" size="sm" onClick={onCancel} disabled={busy}>Cancel</Button> : null}
    {canAdvance ? <Button size="sm" onClick={onAdvance} disabled={busy}>{busy ? <LoaderCircle className="size-4 animate-spin" /> : null}{ORDER_ACTION_LABELS[nextStatus]}</Button> : null}
  </div>
}

function OrderDetailModal({ busy, onClose, onPrint, onSaveEdit, onSaveFee, order }) {
  const deliveryFeeOptions = [...new Set([Number(order.deliveryFeePolicyNearby ?? 3), Number(order.deliveryFeePolicyFarther ?? 3.5)])]
  const [deliveryFee, setDeliveryFee] = useState(order.deliveryFeeConfirmed ? Number(order.deliveryFee).toFixed(2) : "")
  const [editing, setEditing] = useState(false)
  const locked = ["EN_ROUTE", "DELIVERED", "CANCELLED"].includes(order.status)
  const canEdit = ["PENDING", "PREPARING", "PENDING_PICKUP"].includes(order.status)
  const selectedDeliveryFee = deliveryFee ? Number(deliveryFee) : null
  const previewTotal = selectedDeliveryFee === null ? null : Math.max(0, Number(order.subtotal) - Number(order.discountTotal)) + selectedDeliveryFee

  const submitFee = async (event) => {
    event.preventDefault()
    const updated = await onSaveFee(Number(deliveryFee))
    if (updated) setDeliveryFee(Number(updated.deliveryFee).toFixed(2))
  }

  return <Modal title={order.orderNumber} onClose={onClose} locked={busy}>
    <div className="space-y-5 p-5">
      <div className="flex flex-wrap justify-end gap-2">{canEdit && !editing ? <Button variant="outline" size="sm" onClick={() => setEditing(true)}><Pencil className="size-4" />Edit order</Button> : null}<Button variant="outline" size="sm" onClick={onPrint} disabled={!order.deliveryFeeConfirmed} title={order.deliveryFeeConfirmed ? "Print invoice" : "Set delivery fee before printing"}><Printer className="size-4" />Print invoice</Button></div>
      {editing ? <OrderEditForm order={order} busy={busy} onCancel={() => setEditing(false)} onSave={async (edit) => { const updated = await onSaveEdit(edit); if (updated) setEditing(false) }} /> : <>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"><Info label="Customer" value={order.customerName} /><Info label="Phone" value={order.customerPhone} /><Info label="Address" value={`${order.deliveryStreet}, ${order.deliveryZone}`} /><Info label="Payment" value={formatStatus(order.paymentMethod)} /></div>
        {order.deliveryLatitude !== null && order.deliveryLongitude !== null ? <div className="flex flex-wrap items-center justify-between gap-3 border border-[#E4DAC9] bg-[#FAF7F0] p-3"><div><p className="text-xs font-semibold uppercase text-[#756D62]">Confirmed delivery pin</p><p className="mt-1 text-sm">{order.distanceKm !== null ? `${order.distanceKm.toFixed(1)} km` : "Distance pending"}{order.etaMinutes ? ` | about ${order.etaMinutes} min drive` : ""}</p></div><a href={`https://www.google.com/maps/search/?api=1&query=${order.deliveryLatitude},${order.deliveryLongitude}`} target="_blank" rel="noreferrer" className="inline-flex h-9 items-center border border-[#8B1E1E] px-3 text-sm font-semibold text-[#8B1E1E] hover:bg-[#8B1E1E] hover:text-white">Open delivery pin</a></div> : null}
        {order.deliveryNotes ? <div><p className="text-xs font-semibold uppercase text-[#756D62]">Delivery notes</p><p className="mt-1 whitespace-pre-wrap text-sm">{order.deliveryNotes}</p></div> : null}
        <div className="overflow-x-auto"><table className="w-full min-w-[560px] text-sm"><thead><tr className="border-b border-[#E4DAC9] text-left text-xs uppercase text-[#756D62]"><th className="py-2">Dish</th><th>Note</th><th>Qty</th><th>Unit</th><th className="text-right">Total</th></tr></thead><tbody>{order.items.map((item) => <tr key={item.id} className="border-b border-[#EFE7DA]"><td className="py-3 font-semibold">{item.name}{item.variantLabel ? <span className="mt-0.5 block text-xs font-normal text-[#8B1E1E]">{item.variantLabel}</span> : null}</td><td className="text-[#756D62]">{item.note || "-"}</td><td>{item.quantity}</td><td>{formatMoney(item.unitPrice)}</td><td className="text-right font-semibold">{formatMoney(item.lineTotal)}</td></tr>)}</tbody></table></div>
      </>}
      {!editing ? <div className="grid items-start gap-4 md:grid-cols-[1fr_20rem]">
        {order.deliveryFeeConfirmed ? (
          <div className="border border-[#E4DAC9] bg-[#FAF7F0] p-4">
            <p className="text-sm font-semibold">Calculated delivery fee</p>
            <p className="mt-2 font-display text-2xl font-semibold tabular-nums text-[#2B2B2B]">{formatMoney(order.deliveryFee)}</p>
            <p className="mt-2 text-xs leading-relaxed text-[#756D62]">Verified automatically from the customer&apos;s confirmed pin and driving distance when the order was placed.</p>
          </div>
        ) : (
          <form onSubmit={submitFee} className="border border-amber-300 bg-amber-50/60 p-4">
            <label htmlFor={`delivery-fee-${order.id}`} className="text-sm font-semibold">Manual delivery fee required</label>
            <div className="mt-2 flex gap-2"><select id={`delivery-fee-${order.id}`} required value={deliveryFee} onChange={(event) => setDeliveryFee(event.target.value)} disabled={busy || locked} className="h-9 flex-1 rounded-md border border-[#E4DAC9] bg-white px-3 text-sm outline-none disabled:bg-[#F6F1E8]"><option value="" disabled>Select fee</option>{deliveryFeeOptions.map((fee) => <option key={fee} value={fee.toFixed(2)}>EUR {fee.toFixed(2)}</option>)}</select><Button type="submit" size="sm" disabled={busy || locked || !deliveryFee}>{busy ? <LoaderCircle className="size-4 animate-spin" /> : null}Confirm fee</Button></div>
            <p className="mt-2 text-xs text-[#756D62]">{locked ? "The fee is locked because delivery has started or the order is closed." : selectedDeliveryFee !== null ? "The total preview has updated. Confirm the fee to continue processing this fallback order." : "Automatic routing was unavailable when this order was placed."}</p>
          </form>
        )}
        <div className="space-y-2 border border-[#E4DAC9] bg-[#FDFAF4] p-4 text-sm"><Price label="Subtotal" value={order.subtotal} />{Number(order.discountTotal) > 0 ? <Price label="Discount" value={-Number(order.discountTotal)} /> : null}{selectedDeliveryFee !== null ? <><Price label="Delivery" value={selectedDeliveryFee} /><Price label={order.deliveryFeeConfirmed ? "Total" : "Total preview"} value={previewTotal} strong /></> : <PendingPrice />}</div>
      </div> : null}
      <div><h3 className="font-display text-lg font-semibold">Timeline</h3><div className="mt-3 space-y-3">{order.timeline.map((event) => <div key={event.id} className="border-l-2 border-[#D4A017] pl-3"><p className="text-sm font-semibold">{event.title}</p><p className="text-xs text-[#756D62]">{formatDateTime(event.createdAt)}{event.note ? ` | ${event.note}` : ""}</p></div>)}</div></div>
    </div>
  </Modal>
}

function OrderEditForm({ busy, onCancel, onSave, order }) {
  const fullEdit = order.status === "PENDING"
  const [form, setForm] = useState({ customerName: order.customerName, customerPhone: order.customerPhone, customerEmail: order.customerEmail || "", deliveryStreet: order.deliveryStreet, deliveryZone: order.deliveryZone || "", deliveryNotes: order.deliveryNotes || "", items: order.items.map((item) => ({ key: item.id, orderItemId: item.id, menuItemId: item.menuItemId, variantId: item.variantId, name: item.name, variantLabel: item.variantLabel, note: item.note || "", quantity: item.quantity, unitPrice: item.unitPrice, available: item.available, isNew: false })) })
  const [customerConfirmed, setCustomerConfirmed] = useState(false)
  const originalQuantities = useMemo(() => new Map(order.items.map((item) => [item.id, item.quantity])), [order.items])
  const itemsChanged = useMemo(() => {
    if (form.items.length !== order.items.length || form.items.some((item) => item.isNew)) return true
    return form.items.some((item) => originalQuantities.get(item.orderItemId) !== item.quantity)
  }, [form.items, order.items.length, originalQuantities])
  const subtotalPreview = form.items.reduce((sum, item) => sum + Number(item.unitPrice) * item.quantity, 0)
  const totalQuantity = form.items.reduce((sum, item) => sum + item.quantity, 0)
  const discountPreview = Number(order.discountTotal || 0)
  const deliveryFeePreview = Number(order.deliveryFee || 0)
  const totalPreview = Math.max(0, subtotalPreview - discountPreview) + deliveryFeePreview
  const updateField = (field, value) => setForm((current) => ({ ...current, [field]: value }))
  const updateItem = (key, changes) => setForm((current) => ({ ...current, items: current.items.map((item) => item.key === key ? { ...item, ...changes } : item) }))
  const removeItem = (key) => setForm((current) => ({ ...current, items: current.items.filter((entry) => entry.key !== key) }))
  const addItem = (menuItem, variant = null) => {
    const variantId = variant?.id || null
    setForm((current) => {
      const currentTotal = current.items.reduce((sum, item) => sum + item.quantity, 0)
      if (currentTotal >= DELIVERY_CONFIG.maxTotalQuantity) return current
      const existingIndex = current.items.findIndex((item) => item.menuItemId === menuItem.id && (item.variantId || null) === variantId)
      if (existingIndex >= 0) {
        const existing = current.items[existingIndex]
        if (existing.quantity >= DELIVERY_CONFIG.maxItemQuantity) return current
        return { ...current, items: current.items.map((item, index) => index === existingIndex ? { ...item, quantity: item.quantity + 1 } : item) }
      }
      return {
        ...current,
        items: [...current.items, {
          key: `new:${menuItem.id}:${variantId || "base"}`,
          orderItemId: null,
          menuItemId: menuItem.id,
          variantId,
          name: menuItem.name,
          variantLabel: variant?.label || null,
          note: "",
          quantity: 1,
          unitPrice: Number(variant?.price ?? menuItem.price),
          available: true,
          isNew: true,
        }],
      }
    })
  }

  const submit = (event) => {
    event.preventDefault()
    onSave({
      deliveryStreet: form.deliveryStreet,
      deliveryZone: form.deliveryZone,
      deliveryNotes: form.deliveryNotes,
      ...(fullEdit ? { customerName: form.customerName, customerPhone: form.customerPhone, customerEmail: form.customerEmail, customerConfirmedItemChanges: customerConfirmed, items: form.items.map((item) => item.isNew ? { menuItemId: item.menuItemId, variantId: item.variantId, note: item.note, quantity: item.quantity } : { orderItemId: item.orderItemId, note: item.note, quantity: item.quantity }) } : {}),
    })
  }

  return <form onSubmit={submit} className="space-y-5 border border-[#D8CEBD] bg-[#FAF7F0] p-4">
    <div><h3 className="font-display text-lg font-semibold">Edit order</h3><p className="text-xs text-[#756D62]">{fullEdit ? "Customer, delivery, and item changes are available before preparation starts." : "Only delivery details can be changed at this stage."}</p></div>
    {fullEdit ? <div className="grid gap-4 md:grid-cols-3"><OrderField label="Customer name"><input required minLength={2} maxLength={100} value={form.customerName} onChange={(event) => updateField("customerName", event.target.value)} className={orderFieldClass} /></OrderField><OrderField label="Phone"><input required type="tel" minLength={6} maxLength={30} value={form.customerPhone} onChange={(event) => updateField("customerPhone", event.target.value)} className={orderFieldClass} /></OrderField><OrderField label="Email"><input type="email" maxLength={254} value={form.customerEmail} onChange={(event) => updateField("customerEmail", event.target.value)} className={orderFieldClass} /></OrderField></div> : null}
    <div className="grid gap-4 md:grid-cols-2"><OrderField label="Delivery address"><input required minLength={5} maxLength={200} value={form.deliveryStreet} onChange={(event) => updateField("deliveryStreet", event.target.value)} className={orderFieldClass} /></OrderField><OrderField label="Area"><input required minLength={2} maxLength={100} value={form.deliveryZone} onChange={(event) => updateField("deliveryZone", event.target.value)} className={orderFieldClass} /></OrderField></div>
    <OrderField label="Delivery notes"><textarea rows={3} maxLength={1000} value={form.deliveryNotes} onChange={(event) => updateField("deliveryNotes", event.target.value)} className="w-full resize-y rounded-md border border-[#E4DAC9] bg-white px-3 py-2 text-sm outline-none focus:border-[#8B1E1E]" /></OrderField>
    {fullEdit ? <div className="space-y-3"><div className="flex flex-wrap items-end justify-between gap-3"><div><p className="text-sm font-semibold">Order items</p><p className="mt-0.5 text-xs text-[#756D62]">Existing lines keep their original price. Added dishes use the current menu price.</p></div><p className="text-sm font-semibold tabular-nums">{totalQuantity} items</p></div><div className="divide-y divide-[#E4DAC9] border border-[#E4DAC9] bg-white">{form.items.map((item) => <div key={item.key} className={`grid gap-3 p-3 sm:grid-cols-[minmax(10rem,1fr)_auto_2fr_auto] sm:items-center ${item.available === false ? "bg-red-50/70" : item.isNew ? "bg-emerald-50/50" : ""}`}><div><div className="flex flex-wrap items-center gap-2"><p className="font-semibold">{item.name}</p>{item.available === false ? <Badge variant="destructive">Unavailable</Badge> : item.isNew ? <Badge variant="success">Replacement</Badge> : null}</div>{item.variantLabel ? <p className="text-xs font-semibold text-[#8B1E1E]">{item.variantLabel}</p> : null}<div className="mt-1 flex flex-wrap gap-x-3 text-xs"><span className="text-[#756D62]">{formatMoney(item.unitPrice)} each</span><span className="font-semibold tabular-nums text-[#2B2B2B]">Line: {formatMoney(Number(item.unitPrice) * item.quantity)}</span></div></div><div className="flex items-center gap-1"><Button type="button" variant="outline" size="icon-sm" onClick={() => updateItem(item.key, { quantity: Math.max(1, item.quantity - 1) })} disabled={busy || item.quantity <= 1} aria-label={`Decrease ${item.name}`}><Minus className="size-3.5" /></Button><span className="w-8 text-center text-sm font-semibold tabular-nums">{item.quantity}</span><Button type="button" variant="outline" size="icon-sm" onClick={() => updateItem(item.key, { quantity: Math.min(DELIVERY_CONFIG.maxItemQuantity, item.quantity + 1) })} disabled={busy || item.quantity >= DELIVERY_CONFIG.maxItemQuantity || totalQuantity >= DELIVERY_CONFIG.maxTotalQuantity} aria-label={`Increase ${item.name}`}><Plus className="size-3.5" /></Button></div><input value={item.note} maxLength={300} onChange={(event) => updateItem(item.key, { note: event.target.value })} placeholder="Item note" aria-label={`Note for ${item.name}`} className={orderFieldClass} /><Button type="button" variant="destructive" size="icon-sm" onClick={() => removeItem(item.key)} disabled={busy || form.items.length <= 1} aria-label={`Remove ${item.name}`}><Trash2 className="size-4" /></Button></div>)}</div><MenuItemPicker disabled={busy || form.items.length >= DELIVERY_CONFIG.maxDistinctItems || totalQuantity >= DELIVERY_CONFIG.maxTotalQuantity} onAdd={addItem} /><div className="ml-auto w-full max-w-sm space-y-2 border border-[#D8CEBD] bg-white p-4 text-sm"><Price label="Updated subtotal" value={subtotalPreview} />{discountPreview > 0 ? <Price label="Discount" value={-discountPreview} /> : null}<Price label={order.deliveryFeeConfirmed ? "Delivery" : "Delivery (pending)"} value={deliveryFeePreview} /><Price label={order.deliveryFeeConfirmed ? "Updated total" : "Total before final delivery fee"} value={totalPreview} strong /></div>{itemsChanged ? <label className="flex cursor-pointer items-start gap-3 border border-amber-300 bg-amber-50 p-3"><input type="checkbox" checked={customerConfirmed} onChange={(event) => setCustomerConfirmed(event.target.checked)} className="mt-0.5 size-4 accent-[#8B1E1E]" /><span className="text-sm"><span className="block font-semibold">Customer approved these item changes</span><span className="mt-0.5 block text-xs leading-relaxed text-[#756D62]">Confirm only after speaking with the customer. The final receipt and total will use this updated list.</span></span></label> : null}</div> : null}
    <div className="flex justify-end gap-2"><Button type="button" variant="outline" onClick={onCancel} disabled={busy}>Discard</Button><Button type="submit" disabled={busy || (itemsChanged && !customerConfirmed)}>{busy ? <LoaderCircle className="size-4 animate-spin" /> : null}{busy ? "Saving..." : "Save changes"}</Button></div>
  </form>
}

function MenuItemPicker({ disabled, onAdd }) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState("")
  const deferredQuery = useDeferredValue(query.trim())
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    if (!open) return
    const controller = new AbortController()
    const params = new URLSearchParams({ orderable: "true", page: "1", pageSize: "20" })
    if (deferredQuery) params.set("q", deferredQuery)
    const timer = window.setTimeout(() => {
      setLoading(true)
      setError("")
      fetch(`/api/admin/menu/items?${params}`, { signal: controller.signal })
        .then(readApi)
        .then((payload) => setItems(payload.data || []))
        .catch((fetchError) => { if (fetchError.name !== "AbortError") setError(fetchError.message || "Could not load dishes.") })
        .finally(() => { if (!controller.signal.aborted) setLoading(false) })
    }, 0)
    return () => {
      window.clearTimeout(timer)
      controller.abort()
    }
  }, [deferredQuery, open])

  return <div className="border border-[#D8CEBD] bg-white">
    <button type="button" onClick={() => setOpen((value) => !value)} disabled={disabled} aria-expanded={open} className={`flex min-h-11 w-full items-center justify-between gap-3 px-4 py-3 text-left text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${open ? "bg-[#8B1E1E] text-white" : "text-[#8B1E1E] hover:bg-[#FAF7F0]"}`}><span className="flex items-center gap-2"><Plus className="size-4" />Add replacement dish</span><span className={`flex items-center gap-1.5 text-xs ${open ? "text-white" : "font-normal text-[#756D62]"}`}>{open ? "Close menu" : "Open menu"}{open ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}</span></button>
    {open ? <div className="border-t border-[#E4DAC9] p-3"><label className="relative block"><span className="sr-only">Search available dishes</span><Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#756D62]" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search dish or category" className="h-10 w-full rounded-md border border-[#E4DAC9] bg-white pl-9 pr-3 text-base outline-none focus:border-[#8B1E1E] sm:text-sm" /></label>{loading ? <div className="flex items-center justify-center gap-2 py-8 text-sm text-[#756D62]"><LoaderCircle className="size-4 animate-spin" />Loading dishes...</div> : error ? <p className="py-5 text-center text-sm text-red-700">{error}</p> : items.length ? <div className="mt-3 max-h-72 divide-y divide-[#EFE7DA] overflow-y-auto border border-[#EFE7DA]">{items.map((item) => <div key={item.id} className="flex flex-col gap-2 p-3 sm:flex-row sm:items-center sm:justify-between"><div className="min-w-0"><p className="font-semibold text-[#2B2B2B]">{item.name}</p><p className="text-xs text-[#756D62]">{item.categoryTitle || "Menu"}</p></div><div className="flex flex-wrap gap-2">{item.variants.length ? item.variants.map((variant) => <Button key={variant.id} type="button" variant="outline" size="sm" onClick={() => onAdd(item, variant)}>{variant.label} - {formatMoney(variant.price)}</Button>) : <Button type="button" variant="outline" size="sm" onClick={() => onAdd(item)}>Add - {formatMoney(item.price)}</Button>}</div></div>)}</div> : <p className="py-8 text-center text-sm text-[#756D62]">No available dishes match this search.</p>}</div> : null}
  </div>
}

function OrderField({ children, label }) { return <label className="block"><span className="mb-1.5 block text-xs font-semibold uppercase text-[#756D62]">{label}</span>{children}</label> }

function InvoiceModal({ onClose, order }) {
  const dialogRef = useRef(null)
  useModalDialog({ open: true, containerRef: dialogRef, onEscape: onClose })

  return createPortal(<div ref={dialogRef} tabIndex={-1} className="invoice-overlay fixed inset-0 z-[70] overflow-y-auto bg-[#2B2B2B]/70 p-3 backdrop-blur-sm sm:p-6" role="dialog" aria-modal="true" aria-label={`Invoice ${order.orderNumber}`}>
    <div className="invoice-shell mx-auto w-full max-w-sm">
      <div className="invoice-no-print mb-3 flex items-center justify-end gap-2 rounded-md bg-white p-2 shadow-lg">
        <Button variant="outline" size="sm" onClick={onClose}>Close</Button>
        <Button size="sm" onClick={() => window.print()}><Printer className="size-4" />Print receipt</Button>
      </div>
      <article className="invoice-sheet mx-auto w-[80mm] max-w-full bg-white px-[4mm] py-[5mm] font-mono text-[11px] leading-[1.35] text-black shadow-2xl">
        <header className="border-b border-dashed border-black pb-3 text-center">
          <h2 className="text-[17px] font-black uppercase">Hoa Phuong Do</h2>
          <p className="mt-1">{CONTACT.address}</p>
          <p>{CONTACT.phone}</p>
          <p className="mt-2 text-[13px] font-bold">DELIVERY RECEIPT</p>
          <p className="mt-1 break-all font-bold">{order.orderNumber}</p>
          <p>{formatDateTime(order.createdAt)}</p>
        </header>

        <section className="space-y-1 border-b border-dashed border-black py-3">
          <ReceiptLine label="Customer" value={order.customerName} />
          <ReceiptLine label="Phone" value={order.customerPhone} />
          <ReceiptLine label="Address" value={[order.deliveryStreet, order.deliveryZone].filter(Boolean).join(", ")} />
          {order.distanceKm !== null ? <ReceiptLine label="Route" value={`${order.distanceKm.toFixed(1)} km${order.etaMinutes ? ` / ~${order.etaMinutes} min` : ""}`} /> : null}
          {order.deliveryNotes ? <ReceiptLine label="Note" value={order.deliveryNotes} /> : null}
          <ReceiptLine label="Payment" value={formatStatus(order.paymentMethod)} />
        </section>

        <section className="py-3">
          <div className="grid grid-cols-[1.5rem_minmax(0,1fr)_2rem_4.4rem] gap-1 border-b border-black pb-1 font-bold uppercase"><span>No</span><span>Item</span><span className="text-center">Qty</span><span className="text-right">Amount</span></div>
          {order.items.map((item, index) => <div key={item.id} className="grid grid-cols-[1.5rem_minmax(0,1fr)_2rem_4.4rem] gap-1 border-b border-dotted border-black/50 py-2 align-top"><span>{index + 1}</span><div className="min-w-0 break-words"><span className="font-bold">{item.name}</span>{item.variantLabel ? <span className="block">{item.variantLabel}</span> : null}<span className="block text-[10px]">{formatMoney(item.unitPrice)} each</span>{item.note ? <span className="block text-[10px]">Note: {item.note}</span> : null}</div><span className="text-center">{item.quantity}</span><span className="text-right font-bold">{formatMoney(item.lineTotal)}</span></div>)}
        </section>

        <section className="space-y-1 border-y border-dashed border-black py-3">
          <ReceiptAmount label="Subtotal" value={order.subtotal} />
          {Number(order.discountTotal) > 0 ? <ReceiptAmount label="Discount" value={-Number(order.discountTotal)} /> : null}
          <ReceiptAmount label="Delivery" value={order.deliveryFee} />
          <ReceiptAmount label="TOTAL" value={order.total} strong />
        </section>

        {order.deliveryFeeConsentAt && order.deliveryFeeConsentText ? <section className="border-b border-dashed border-black py-3 text-[9px]"><p className="font-bold uppercase">Delivery fee agreement</p><p className="mt-1">{order.deliveryFeeConsentText}</p><p className="mt-1">Accepted: {formatDateTime(order.deliveryFeeConsentAt)}</p><p>Final fee: {formatMoney(order.deliveryFee)}</p></section> : null}
        <footer className="pt-4 text-center"><p className="font-bold">Thank you for your order.</p><p className="mt-1">Status: {formatOrderStatus(order.status)}</p></footer>
      </article>
    </div>
    <style jsx global>{`
      @media print {
        @page { size: 80mm auto; margin: 0; }
        html, body { width: 80mm !important; margin: 0 !important; padding: 0 !important; background: white !important; }
        body > *:not(.invoice-overlay) { display: none !important; }
        .invoice-overlay { position: absolute !important; inset: 0 auto auto 0 !important; width: 80mm !important; overflow: visible !important; background: white !important; padding: 0 !important; }
        .invoice-shell { width: 80mm !important; max-width: 80mm !important; }
        .invoice-sheet { width: 80mm !important; max-width: 80mm !important; min-height: 0 !important; padding: 4mm !important; box-shadow: none !important; print-color-adjust: exact; }
        .invoice-no-print { display: none !important; }
      }
    `}</style>
  </div>, document.body)
}

function ReceiptLine({ label, value }) { return <p className="break-words"><strong>{label}:</strong> {value}</p> }
function ReceiptAmount({ label, strong, value }) { return <div className={`flex items-baseline justify-between gap-3 ${strong ? "mt-2 border-t border-black pt-2 text-[15px] font-black" : ""}`}><span>{label}</span><span className="shrink-0 tabular-nums">{formatMoney(value)}</span></div> }

function CancelModal({ busy, onClose, onConfirm, order }) { return <Modal title="Cancel order?" onClose={onClose} locked={busy} layer="z-[60]"><div className="space-y-5 p-5"><p className="text-sm text-[#756D62]">This keeps the order for audit but stops fulfillment. This action cannot be reversed from the admin queue.</p><p className="font-mono font-bold text-[#8B1E1E]">{order.orderNumber}</p><div className="flex justify-end gap-2"><Button variant="outline" onClick={onClose} disabled={busy}>Keep order</Button><Button variant="destructive" onClick={onConfirm} disabled={busy}>{busy ? <LoaderCircle className="size-4 animate-spin" /> : null}{busy ? "Cancelling..." : "Cancel order"}</Button></div></div></Modal> }
function Modal({ children, layer = "z-50", locked, onClose, title }) {
  const dialogRef = useRef(null)
  useModalDialog({ open: true, containerRef: dialogRef, onEscape: locked ? undefined : onClose })

  return <div ref={dialogRef} tabIndex={-1} className={`fixed inset-0 ${layer} flex items-center justify-center bg-[#2B2B2B]/55 p-4 backdrop-blur-sm`} role="dialog" aria-modal="true" aria-label={title}><div className="max-h-[calc(100svh-2rem)] w-full max-w-4xl overflow-y-auto rounded-lg border border-[#E4DAC9] bg-white shadow-2xl"><div className="sticky top-0 z-10 flex items-center justify-between border-b border-[#E4DAC9] bg-white px-5 py-4"><h2 className="font-display text-xl font-semibold">{title}</h2><Button variant="ghost" size="icon" onClick={onClose} disabled={locked} aria-label={`Close ${title}`}><X className="size-4" /></Button></div>{children}</div></div>
}
function MetricCard({ detail, icon: Icon, label, value }) { return <Card className="border-[#E4DAC9] bg-white"><CardHeader className="flex-row items-start justify-between pb-2"><div><CardDescription>{label}</CardDescription><CardTitle className="mt-2 font-sans text-3xl font-semibold leading-none tabular-nums">{value}</CardTitle></div><div className="flex size-10 items-center justify-center rounded-md bg-[#F6F1E8] text-[#8B1E1E]"><Icon className="size-5" /></div></CardHeader><CardContent><p className="text-sm text-[#756D62]">{detail}</p></CardContent></Card> }
function Info({ label, value }) { return <div><p className="text-xs font-semibold uppercase text-[#756D62]">{label}</p><p className="mt-1 break-words font-medium">{value}</p></div> }
function Price({ label, strong, value }) { return <div className={`flex justify-between ${strong ? "border-t border-[#E4DAC9] pt-2 font-bold" : "text-[#756D62]"}`}><span>{label}</span><span>{formatMoney(value)}</span></div> }
function PendingPrice() { return <div className="flex justify-between border-t border-[#E4DAC9] pt-2 font-semibold text-amber-700"><span>Final total</span><span>Fee pending</span></div> }
function PageButton({ disabled, icon: Icon, label, onClick }) { return <Button variant="outline" size="icon" onClick={onClick} disabled={disabled} aria-label={label}><Icon className="size-4" /></Button> }
function EmptyState() { return <div className="flex min-h-52 flex-col items-center justify-center border border-dashed border-[#E4DAC9] bg-[#FDFAF4] p-6 text-center"><PackageCheck className="size-8 text-[#8B1E1E]" /><p className="mt-3 font-semibold">No orders found.</p></div> }
function formatStatus(value) { return value.split("_").map((part) => part.charAt(0) + part.slice(1).toLowerCase()).join(" ") }
function formatMoney(value) { return new Intl.NumberFormat("en-IE", { style: "currency", currency: "EUR" }).format(Number(value || 0)) }
function formatDateTime(value) { return new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value)) }
