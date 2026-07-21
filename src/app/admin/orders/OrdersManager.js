"use client"

import { useDeferredValue, useEffect, useMemo, useRef, useState } from "react"
import { ChevronLeft, ChevronRight, ClipboardList, LoaderCircle, Minus, PackageCheck, Pencil, Plus, Printer, RefreshCw, Search, Timer, Trash2, Truck, WalletCards, X } from "lucide-react"

import AdminShell from "@/app/admin/_components/AdminShell"
import { useAdminSession } from "@/app/admin/_components/AdminSession"
import AdminToast from "@/app/admin/_components/AdminToast"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { CONTACT } from "@/lib/constants/index.js"

const STATUSES = ["PENDING", "CONFIRMED", "PREPARING", "ASSIGNED", "PENDING_PICKUP", "PICKED_UP", "EN_ROUTE", "DELIVERED", "CANCELLED"]
const NEXT_STATUS = { PENDING: "CONFIRMED", CONFIRMED: "PREPARING", PREPARING: "PENDING_PICKUP", ASSIGNED: "PENDING_PICKUP", PENDING_PICKUP: "PICKED_UP", PICKED_UP: "EN_ROUTE", EN_ROUTE: "DELIVERED" }
const DRIVER_NEXT_STATUS = { PENDING_PICKUP: "PICKED_UP", PICKED_UP: "EN_ROUTE", EN_ROUTE: "DELIVERED" }
const statusVariant = { PENDING: "warning", CONFIRMED: "confirmed", PREPARING: "preparing", ASSIGNED: "info", PENDING_PICKUP: "info", PICKED_UP: "info", EN_ROUTE: "info", DELIVERED: "success", CANCELLED: "destructive" }
const statusRowAccent = { PENDING: "border-l-amber-400", CONFIRMED: "border-l-sky-500", PREPARING: "border-l-orange-500", ASSIGNED: "border-l-cyan-500", PENDING_PICKUP: "border-l-cyan-500", PICKED_UP: "border-l-blue-500", EN_ROUTE: "border-l-indigo-500", DELIVERED: "border-l-emerald-500", CANCELLED: "border-l-red-500" }
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
  const printInvoice = (order) => setInvoice({ order, autoPrint: true })

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
    const controller = new AbortController()
    const params = new URLSearchParams({ page: String(page), limit: "12" })
    if (deferredQuery) params.set("q", deferredQuery)
    if (status) params.set("status", status)
    fetch(`/api/admin/orders?${params}`, { signal: controller.signal })
      .then(readApi)
      .then((payload) => { setOrders(payload.data); setSummary(payload.summary); setPagination(payload.pagination) })
      .catch((error) => { if (error.name !== "AbortError") showToast(error.message || "Could not load orders.", "error") })
      .finally(() => { if (!controller.signal.aborted) setLoading(false) })
    return () => controller.abort()
  }, [deferredQuery, page, refreshKey, status])

  const updateOrder = async (order, changes, message) => {
    setBusyId(order.id)
    try {
      const payload = await fetch("/api/admin/orders", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: order.id, ...changes }) }).then(readApi)
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
    { label: "Ready for pickup", value: summary.ready, detail: "Waiting for a driver", icon: PackageCheck },
    { label: "On delivery", value: summary.delivery, detail: "Picked up or en route", icon: Truck },
  ] : [
    { label: "Pending", value: summary.pending, detail: "Need confirmation", icon: PackageCheck },
    { label: "In kitchen", value: summary.kitchen, detail: "Active preparation", icon: Timer },
    { label: "On delivery", value: summary.delivery, detail: "Picked up or en route", icon: Truck },
    { label: "Today value", value: formatMoney(summary.todayRevenue), detail: "Excludes cancelled orders", icon: WalletCards },
  ], [isDriver, summary])

  return <AdminShell active="orders" eyebrow={isDriver ? "Driver workspace" : "Order operations"} title="Orders" description={isDriver ? "Update pickup and delivery status." : "Confirm orders and coordinate fulfillment from the kitchen to delivery."} action={<Button variant="outline" onClick={() => { setLoading(true); setRefreshKey((key) => key + 1) }} disabled={loading}><RefreshCw className={`size-4 ${loading ? "animate-spin" : ""}`} />Refresh</Button>}>
    <AdminToast key={toast?.id} message={toast?.message} tone={toast?.tone} onDismiss={() => setToast(null)} />
    <div className="space-y-5">
      <section className={`grid gap-4 sm:grid-cols-2 ${isDriver ? "max-w-2xl" : "xl:grid-cols-4"}`} aria-label="Order metrics">{metrics.map((metric) => <MetricCard key={metric.label} {...metric} />)}</section>
      <section className="space-y-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between"><div><h2 className="font-display text-xl font-semibold">Live order queue</h2><p className="text-sm text-[#756D62]">{pagination.total} matching orders</p></div><div className="flex flex-col gap-2 sm:flex-row"><label className="relative"><span className="sr-only">Search orders</span><Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#756D62]" /><input value={query} onChange={(event) => { const next = event.target.value; if (next.trim() !== deferredQuery) setLoading(true); setQuery(next); setPage(1) }} placeholder="Order, customer, phone" className="h-9 w-full rounded-md border border-[#E4DAC9] bg-white pl-9 pr-3 text-sm outline-none sm:w-64" /></label><select value={status} onChange={(event) => { setLoading(true); setStatus(event.target.value); setPage(1) }} aria-label="Filter order status" className="h-9 rounded-md border border-[#E4DAC9] bg-white px-3 text-sm"><option value="">All statuses</option>{STATUSES.map((option) => <option key={option} value={option}>{formatStatus(option)}</option>)}</select></div></div>
        {loading ? <LoadingState /> : orders.length ? <OrdersList orders={orders} busyId={busyId} isDriver={isDriver} onDetails={setSelected} onPrint={printInvoice} onAdvance={(order) => updateOrder(order, { status: (isDriver ? DRIVER_NEXT_STATUS : NEXT_STATUS)[order.status] }, "Order status updated.")} onCancel={setConfirmCancel} /> : <EmptyState />}
        {pagination.totalPages > 1 ? <div className="flex items-center justify-between border-t border-[#E4DAC9] pt-4"><p className="text-sm text-[#756D62]">Page {pagination.page} of {pagination.totalPages}</p><div className="flex gap-2"><PageButton icon={ChevronLeft} label="Previous page" disabled={loading || page <= 1} onClick={() => { setLoading(true); setPage((value) => value - 1) }} /><PageButton icon={ChevronRight} label="Next page" disabled={loading || page >= pagination.totalPages} onClick={() => { setLoading(true); setPage((value) => value + 1) }} /></div></div> : null}
      </section>
    </div>
    {selected ? <OrderDetailModal order={selected} busy={busyId === selected.id} onClose={() => setSelected(null)} onPrint={() => printInvoice(selected)} onSaveEdit={(edit) => updateOrder(selected, { edit }, "Order updated.")} onSaveFee={(deliveryFee) => updateOrder(selected, { deliveryFee }, "Delivery fee updated.")} /> : null}
    {confirmCancel ? <CancelModal order={confirmCancel} busy={busyId === confirmCancel.id} onClose={() => setConfirmCancel(null)} onConfirm={() => updateOrder(confirmCancel, { status: "CANCELLED" }, "Order cancelled.")} /> : null}
    {invoice ? <InvoiceModal order={invoice.order} autoPrint={invoice.autoPrint} onClose={() => setInvoice(null)} /> : null}
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
    ? index % 2 ? "bg-amber-50/75" : "bg-amber-50/45"
    : order.status === "CANCELLED"
      ? index % 2 ? "bg-red-50/60" : "bg-red-50/35"
      : index % 2 ? "bg-[#FBF8F2]" : "bg-white"

  return <tr className={`${rowTone} align-middle transition-colors hover:bg-[#F3ECDD]`}>
    <td className={`whitespace-nowrap border-l-4 px-4 py-4 ${statusRowAccent[order.status] || "border-l-[#D8CEBD]"}`}>{isDriver ? <span className="inline-flex rounded-sm bg-white/75 px-2 py-1 font-mono text-xs font-bold text-[#8B1E1E] shadow-xs ring-1 ring-black/5">{order.orderNumber}</span> : <button type="button" onClick={onDetails} className="inline-flex rounded-sm bg-white/75 px-2 py-1 font-mono text-xs font-bold text-[#8B1E1E] shadow-xs ring-1 ring-black/5 hover:underline">{order.orderNumber}</button>}<p className="mt-1.5 text-xs text-[#756D62]">{formatDateTime(order.createdAt)}</p></td>
    <td className="px-4 py-4"><p className="max-w-44 truncate font-semibold">{order.customerName}</p><p className="mt-1 whitespace-nowrap text-xs text-[#756D62]">{order.customerPhone}</p></td>
    <td className="px-4 py-4"><p className="max-w-52 truncate font-medium">{order.deliveryZone || "-"}</p><p className="mt-1 max-w-52 truncate text-xs text-[#756D62]">{order.deliveryStreet}</p></td>
    <td className="px-4 py-4 text-center font-semibold">{itemCount}</td>
    {!isDriver ? <td className="whitespace-nowrap px-4 py-4 text-right font-bold">{formatMoney(order.total)}</td> : null}
    <td className="whitespace-nowrap px-4 py-4"><Badge variant={statusVariant[order.status]}>{formatStatus(order.status)}</Badge></td>
    <td className="px-4 py-4"><OrderActions order={order} busy={busy} isDriver={isDriver} onAdvance={onAdvance} onCancel={onCancel} onDetails={onDetails} onPrint={onPrint} compact /></td>
  </tr>
}

function OrderMobileRow({ busy, isDriver, onAdvance, onCancel, onDetails, onPrint, order }) {
  return <article className={`border p-4 ${order.status === "PENDING" ? "border-amber-300 bg-amber-50/55" : order.status === "CANCELLED" ? "border-red-200 bg-red-50/35" : "border-[#E4DAC9] bg-white"}`}>
    <div className="flex items-start justify-between gap-3">
      <div><p className="font-mono text-sm font-bold text-[#8B1E1E]">{order.orderNumber}</p><p className="mt-1 font-semibold">{order.customerName}</p><p className="text-xs text-[#756D62]">{order.customerPhone} | {formatDateTime(order.createdAt)}</p></div>
      <Badge variant={statusVariant[order.status]}>{formatStatus(order.status)}</Badge>
    </div>
    <div className={`mt-4 grid gap-3 border-y border-black/8 py-3 ${isDriver ? "grid-cols-2" : "grid-cols-3"}`}><Info label="Items" value={order.items.reduce((sum, item) => sum + item.quantity, 0)} /><Info label="Area" value={order.deliveryZone || "-"} />{!isDriver ? <Info label="Total" value={formatMoney(order.total)} /> : null}</div>
    <p className="mt-3 line-clamp-1 text-sm text-[#756D62]">{order.deliveryStreet}</p>
    {isDriver && order.deliveryNotes ? <p className="mt-2 text-sm"><span className="font-semibold">Note:</span> {order.deliveryNotes}</p> : null}
    <div className="mt-4"><OrderActions order={order} busy={busy} isDriver={isDriver} onAdvance={onAdvance} onCancel={onCancel} onDetails={onDetails} onPrint={onPrint} /></div>
  </article>
}

function OrderActions({ busy, compact = false, isDriver, onAdvance, onCancel, onDetails, onPrint, order }) {
  const nextStatus = (isDriver ? DRIVER_NEXT_STATUS : NEXT_STATUS)[order.status]
  const canAdvance = Boolean(nextStatus)
  const canCancel = !["DELIVERED", "CANCELLED", "PICKED_UP", "EN_ROUTE"].includes(order.status)

  return <div className="flex flex-wrap items-center justify-end gap-2">
    {!isDriver ? <Button variant="outline" size="icon-sm" onClick={onPrint} aria-label={`Print invoice ${order.orderNumber}`} title="Print invoice"><Printer className="size-4" /></Button> : null}
    {!isDriver ? <Button variant="outline" size={compact ? "icon-sm" : "sm"} onClick={onDetails} aria-label={`View details ${order.orderNumber}`} title="View details"><ClipboardList className="size-4" />{compact ? null : "Details"}</Button> : null}
    {!isDriver && canCancel ? <Button variant="destructive" size="sm" onClick={onCancel} disabled={busy}>Cancel</Button> : null}
    {canAdvance ? <Button size="sm" onClick={onAdvance} disabled={busy}>{busy ? <LoaderCircle className="size-4 animate-spin" /> : null}{formatStatus(nextStatus)}</Button> : null}
  </div>
}

function OrderDetailModal({ busy, onClose, onPrint, onSaveEdit, onSaveFee, order }) {
  const [deliveryFee, setDeliveryFee] = useState(Number(order.deliveryFee) === 3.5 ? "3.50" : "3.00")
  const [editing, setEditing] = useState(false)
  const locked = ["PICKED_UP", "EN_ROUTE", "DELIVERED", "CANCELLED"].includes(order.status)
  const canEdit = ["PENDING", "CONFIRMED", "PREPARING", "ASSIGNED", "PENDING_PICKUP"].includes(order.status)

  const submitFee = async (event) => {
    event.preventDefault()
    const updated = await onSaveFee(Number(deliveryFee))
    if (updated) setDeliveryFee(Number(updated.deliveryFee) === 3.5 ? "3.50" : "3.00")
  }

  return <Modal title={order.orderNumber} onClose={onClose} locked={busy}>
    <div className="space-y-5 p-5">
      <div className="flex flex-wrap justify-end gap-2">{canEdit && !editing ? <Button variant="outline" size="sm" onClick={() => setEditing(true)}><Pencil className="size-4" />Edit order</Button> : null}<Button variant="outline" size="sm" onClick={onPrint}><Printer className="size-4" />Print invoice</Button></div>
      {editing ? <OrderEditForm order={order} busy={busy} onCancel={() => setEditing(false)} onSave={async (edit) => { const updated = await onSaveEdit(edit); if (updated) setEditing(false) }} /> : <>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"><Info label="Customer" value={order.customerName} /><Info label="Phone" value={order.customerPhone} /><Info label="Address" value={`${order.deliveryStreet}, ${order.deliveryZone}`} /><Info label="Payment" value={`${formatStatus(order.paymentMethod)} / ${formatStatus(order.paymentStatus)}`} /></div>
        {order.deliveryNotes ? <div><p className="text-xs font-semibold uppercase text-[#756D62]">Delivery notes</p><p className="mt-1 whitespace-pre-wrap text-sm">{order.deliveryNotes}</p></div> : null}
        <div className="overflow-x-auto"><table className="w-full min-w-[560px] text-sm"><thead><tr className="border-b border-[#E4DAC9] text-left text-xs uppercase text-[#756D62]"><th className="py-2">Dish</th><th>Note</th><th>Qty</th><th>Unit</th><th className="text-right">Total</th></tr></thead><tbody>{order.items.map((item) => <tr key={item.id} className="border-b border-[#EFE7DA]"><td className="py-3 font-semibold">{item.name}</td><td className="text-[#756D62]">{item.note || "-"}</td><td>{item.quantity}</td><td>{formatMoney(item.unitPrice)}</td><td className="text-right font-semibold">{formatMoney(item.lineTotal)}</td></tr>)}</tbody></table></div>
      </>}
      <div className="grid items-start gap-4 md:grid-cols-[1fr_20rem]">
        <form onSubmit={submitFee} className="border border-[#E4DAC9] p-4">
          <label htmlFor={`delivery-fee-${order.id}`} className="text-sm font-semibold">Final delivery fee</label>
          <div className="mt-2 flex gap-2"><select id={`delivery-fee-${order.id}`} required value={deliveryFee} onChange={(event) => setDeliveryFee(event.target.value)} disabled={busy || locked} className="h-9 flex-1 rounded-md border border-[#E4DAC9] bg-white px-3 text-sm outline-none disabled:bg-[#F6F1E8]"><option value="3.00">€3.00</option><option value="3.50">€3.50</option></select><Button type="submit" size="sm" disabled={busy || locked}>{busy ? <LoaderCircle className="size-4 animate-spin" /> : null}Save fee</Button></div>
          <p className="mt-2 text-xs text-[#756D62]">{locked ? "The fee is locked because this order is complete." : "Saving recalculates the total and records the change in the timeline."}</p>
        </form>
        <div className="space-y-2 border border-[#E4DAC9] bg-[#FDFAF4] p-4 text-sm"><Price label="Subtotal" value={order.subtotal} />{Number(order.discountTotal) > 0 ? <Price label="Discount" value={-Number(order.discountTotal)} /> : null}<Price label="Delivery" value={order.deliveryFee} /><Price label="Total" value={order.total} strong /></div>
      </div>
      <div><h3 className="font-display text-lg font-semibold">Timeline</h3><div className="mt-3 space-y-3">{order.timeline.map((event) => <div key={event.id} className="border-l-2 border-[#D4A017] pl-3"><p className="text-sm font-semibold">{event.title}</p><p className="text-xs text-[#756D62]">{formatDateTime(event.createdAt)}{event.note ? ` | ${event.note}` : ""}</p></div>)}</div></div>
    </div>
  </Modal>
}

function OrderEditForm({ busy, onCancel, onSave, order }) {
  const fullEdit = ["PENDING", "CONFIRMED"].includes(order.status)
  const [form, setForm] = useState({ customerName: order.customerName, customerPhone: order.customerPhone, customerEmail: order.customerEmail || "", deliveryStreet: order.deliveryStreet, deliveryZone: order.deliveryZone || "", deliveryNotes: order.deliveryNotes || "", items: order.items.map((item) => ({ id: item.id, name: item.name, note: item.note || "", quantity: item.quantity, unitPrice: item.unitPrice })) })
  const updateField = (field, value) => setForm((current) => ({ ...current, [field]: value }))
  const updateItem = (id, changes) => setForm((current) => ({ ...current, items: current.items.map((item) => item.id === id ? { ...item, ...changes } : item) }))

  const submit = (event) => {
    event.preventDefault()
    onSave({
      deliveryStreet: form.deliveryStreet,
      deliveryZone: form.deliveryZone,
      deliveryNotes: form.deliveryNotes,
      ...(fullEdit ? { customerName: form.customerName, customerPhone: form.customerPhone, customerEmail: form.customerEmail, items: form.items.map(({ id, note, quantity }) => ({ id, note, quantity })) } : {}),
    })
  }

  return <form onSubmit={submit} className="space-y-5 border border-[#D8CEBD] bg-[#FAF7F0] p-4">
    <div><h3 className="font-display text-lg font-semibold">Edit order</h3><p className="text-xs text-[#756D62]">{fullEdit ? "Customer, delivery, and item changes are available before preparation starts." : "Only delivery details can be changed at this stage."}</p></div>
    {fullEdit ? <div className="grid gap-4 md:grid-cols-3"><OrderField label="Customer name"><input required minLength={2} maxLength={100} value={form.customerName} onChange={(event) => updateField("customerName", event.target.value)} className={orderFieldClass} /></OrderField><OrderField label="Phone"><input required type="tel" minLength={6} maxLength={30} value={form.customerPhone} onChange={(event) => updateField("customerPhone", event.target.value)} className={orderFieldClass} /></OrderField><OrderField label="Email"><input type="email" maxLength={254} value={form.customerEmail} onChange={(event) => updateField("customerEmail", event.target.value)} className={orderFieldClass} /></OrderField></div> : null}
    <div className="grid gap-4 md:grid-cols-2"><OrderField label="Delivery address"><input required minLength={5} maxLength={200} value={form.deliveryStreet} onChange={(event) => updateField("deliveryStreet", event.target.value)} className={orderFieldClass} /></OrderField><OrderField label="Area"><input required minLength={2} maxLength={100} value={form.deliveryZone} onChange={(event) => updateField("deliveryZone", event.target.value)} className={orderFieldClass} /></OrderField></div>
    <OrderField label="Delivery notes"><textarea rows={3} maxLength={1000} value={form.deliveryNotes} onChange={(event) => updateField("deliveryNotes", event.target.value)} className="w-full resize-y rounded-md border border-[#E4DAC9] bg-white px-3 py-2 text-sm outline-none focus:border-[#8B1E1E]" /></OrderField>
    {fullEdit ? <div><p className="text-sm font-semibold">Order items</p><div className="mt-2 divide-y divide-[#E4DAC9] border border-[#E4DAC9] bg-white">{form.items.map((item) => <div key={item.id} className="grid gap-3 p-3 sm:grid-cols-[minmax(10rem,1fr)_auto_2fr_auto] sm:items-center"><div><p className="font-semibold">{item.name}</p><p className="text-xs text-[#756D62]">{formatMoney(item.unitPrice)} each</p></div><div className="flex items-center gap-1"><Button type="button" variant="outline" size="icon-sm" onClick={() => updateItem(item.id, { quantity: Math.max(1, item.quantity - 1) })} disabled={busy || item.quantity <= 1} aria-label={`Decrease ${item.name}`}><Minus className="size-3.5" /></Button><span className="w-8 text-center text-sm font-semibold tabular-nums">{item.quantity}</span><Button type="button" variant="outline" size="icon-sm" onClick={() => updateItem(item.id, { quantity: Math.min(20, item.quantity + 1) })} disabled={busy || item.quantity >= 20} aria-label={`Increase ${item.name}`}><Plus className="size-3.5" /></Button></div><input value={item.note} maxLength={300} onChange={(event) => updateItem(item.id, { note: event.target.value })} placeholder="Item note" aria-label={`Note for ${item.name}`} className={orderFieldClass} /><Button type="button" variant="destructive" size="icon-sm" onClick={() => setForm((current) => ({ ...current, items: current.items.filter((entry) => entry.id !== item.id) }))} disabled={busy || form.items.length <= 1} aria-label={`Remove ${item.name}`}><Trash2 className="size-4" /></Button></div>)}</div></div> : null}
    <div className="flex justify-end gap-2"><Button type="button" variant="outline" onClick={onCancel} disabled={busy}>Discard</Button><Button type="submit" disabled={busy}>{busy ? <LoaderCircle className="size-4 animate-spin" /> : null}{busy ? "Saving..." : "Save changes"}</Button></div>
  </form>
}

function OrderField({ children, label }) { return <label className="block"><span className="mb-1.5 block text-xs font-semibold uppercase text-[#756D62]">{label}</span>{children}</label> }

function InvoiceModal({ autoPrint = false, onClose, order }) {
  const printStarted = useRef(false)

  useEffect(() => {
    if (!autoPrint || printStarted.current) return

    const handleAfterPrint = () => onClose()
    window.addEventListener("afterprint", handleAfterPrint, { once: true })
    const frame = window.requestAnimationFrame(() => {
      printStarted.current = true
      window.print()
    })

    return () => {
      window.cancelAnimationFrame(frame)
      window.removeEventListener("afterprint", handleAfterPrint)
    }
  }, [autoPrint, onClose])

  return <div className="invoice-overlay fixed inset-0 z-[70] overflow-y-auto bg-[#2B2B2B]/65 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label={`Invoice ${order.orderNumber}`}>
    <div className="invoice-sheet mx-auto min-h-full w-full max-w-3xl bg-white p-6 text-[#171717] shadow-2xl sm:p-10">
      <div className="invoice-no-print mb-8 flex items-center justify-end gap-2 border-b border-[#E4DAC9] pb-4">
        <Button variant="outline" onClick={onClose}>Close</Button>
        <Button onClick={() => window.print()}><Printer className="size-4" />Print / Save PDF</Button>
      </div>
      <div className="flex flex-col justify-between gap-6 border-b-2 border-black pb-6 sm:flex-row sm:items-start">
        <div><h2 className="text-2xl font-bold">Hoa Phuong Do</h2><p className="mt-1 max-w-md text-sm">{CONTACT.address}</p><p className="text-sm">{CONTACT.phone}</p></div>
        <div className="sm:text-right"><p className="text-3xl font-bold">INVOICE</p><p className="mt-2 font-mono font-semibold">{order.orderNumber}</p><p className="text-sm">{formatDateTime(order.createdAt)}</p></div>
      </div>
      <div className="grid gap-6 border-b border-black py-6 sm:grid-cols-2">
        <div><p className="text-xs font-bold uppercase">Customer</p><p className="mt-2 font-semibold">{order.customerName}</p><p className="text-sm">{order.customerPhone}</p>{order.customerEmail ? <p className="break-all text-sm">{order.customerEmail}</p> : null}</div>
        <div><p className="text-xs font-bold uppercase">Deliver to</p><p className="mt-2 text-sm">{order.deliveryStreet}</p>{order.deliveryZone ? <p className="text-sm">{order.deliveryZone}</p> : null}{order.deliveryNotes ? <p className="mt-2 whitespace-pre-wrap text-sm"><strong>Note:</strong> {order.deliveryNotes}</p> : null}</div>
      </div>
      <div className="grid grid-cols-2 gap-4 border-b border-black py-4 text-sm sm:grid-cols-3"><Info label="Status" value={formatStatus(order.status)} /><Info label="Payment" value={formatStatus(order.paymentMethod)} /><Info label="Payment status" value={formatStatus(order.paymentStatus)} /></div>
      <div className="overflow-x-auto py-6"><table className="w-full min-w-[520px] text-sm"><thead><tr className="border-b-2 border-black text-left text-xs uppercase"><th className="w-12 py-2 pr-3 text-center">No.</th><th className="py-2 pr-3">Item</th><th className="px-3 text-center">Qty</th><th className="px-3 text-right">Unit</th><th className="py-2 pl-3 text-right">Amount</th></tr></thead><tbody>{order.items.map((item, index) => <tr key={item.id} className="border-b border-black/20 align-top"><td className="w-12 py-3 pr-3 text-center tabular-nums">{index + 1}</td><td className="py-3 pr-3"><span className="font-semibold">{item.name}</span>{item.note ? <span className="mt-1 block text-xs">Note: {item.note}</span> : null}</td><td className="px-3 py-3 text-center">{item.quantity}</td><td className="px-3 py-3 text-right">{formatMoney(item.unitPrice)}</td><td className="py-3 pl-3 text-right font-semibold">{formatMoney(item.lineTotal)}</td></tr>)}</tbody></table></div>
      <div className="ml-auto w-full max-w-xs space-y-2 text-sm"><Price label="Subtotal" value={order.subtotal} />{Number(order.discountTotal) > 0 ? <Price label="Discount" value={-Number(order.discountTotal)} /> : null}<Price label="Delivery fee" value={order.deliveryFee} /><Price label="Total" value={order.total} strong /></div>
      <p className="mt-10 border-t border-black pt-4 text-center text-sm">Thank you for your order.</p>
    </div>
    <style jsx global>{`
      @media print {
        @page { margin: 12mm; }
        body * { visibility: hidden !important; }
        .invoice-overlay, .invoice-overlay * { visibility: visible !important; }
        .invoice-overlay { position: absolute !important; inset: 0 !important; overflow: visible !important; background: white !important; padding: 0 !important; }
        .invoice-sheet { min-height: 0 !important; max-width: none !important; padding: 0 !important; box-shadow: none !important; }
        .invoice-no-print { display: none !important; }
      }
    `}</style>
  </div>
}

function CancelModal({ busy, onClose, onConfirm, order }) { return <Modal title="Cancel order?" onClose={onClose} locked={busy} layer="z-[60]"><div className="space-y-5 p-5"><p className="text-sm text-[#756D62]">This keeps the order for audit but stops fulfillment. This action cannot be reversed from the admin queue.</p><p className="font-mono font-bold text-[#8B1E1E]">{order.orderNumber}</p><div className="flex justify-end gap-2"><Button variant="outline" onClick={onClose} disabled={busy}>Keep order</Button><Button variant="destructive" onClick={onConfirm} disabled={busy}>{busy ? <LoaderCircle className="size-4 animate-spin" /> : null}{busy ? "Cancelling..." : "Cancel order"}</Button></div></div></Modal> }
function Modal({ children, layer = "z-50", locked, onClose, title }) { return <div className={`fixed inset-0 ${layer} flex items-center justify-center bg-[#2B2B2B]/55 p-4 backdrop-blur-sm`} role="dialog" aria-modal="true" aria-label={title}><div className="max-h-[calc(100svh-2rem)] w-full max-w-4xl overflow-y-auto rounded-lg border border-[#E4DAC9] bg-white shadow-2xl"><div className="sticky top-0 z-10 flex items-center justify-between border-b border-[#E4DAC9] bg-white px-5 py-4"><h2 className="font-display text-xl font-semibold">{title}</h2><Button variant="ghost" size="icon" onClick={onClose} disabled={locked} aria-label={`Close ${title}`}><X className="size-4" /></Button></div>{children}</div></div> }
function MetricCard({ detail, icon: Icon, label, value }) { return <Card className="border-[#E4DAC9] bg-white"><CardHeader className="flex-row items-start justify-between pb-2"><div><CardDescription>{label}</CardDescription><CardTitle className="mt-2 font-sans text-3xl font-semibold leading-none tabular-nums">{value}</CardTitle></div><div className="flex size-10 items-center justify-center rounded-md bg-[#F6F1E8] text-[#8B1E1E]"><Icon className="size-5" /></div></CardHeader><CardContent><p className="text-sm text-[#756D62]">{detail}</p></CardContent></Card> }
function Info({ label, value }) { return <div><p className="text-xs font-semibold uppercase text-[#756D62]">{label}</p><p className="mt-1 break-words font-medium">{value}</p></div> }
function Price({ label, strong, value }) { return <div className={`flex justify-between ${strong ? "border-t border-[#E4DAC9] pt-2 font-bold" : "text-[#756D62]"}`}><span>{label}</span><span>{formatMoney(value)}</span></div> }
function PageButton({ disabled, icon: Icon, label, onClick }) { return <Button variant="outline" size="icon" onClick={onClick} disabled={disabled} aria-label={label}><Icon className="size-4" /></Button> }
function LoadingState() { return <div className="flex min-h-52 items-center justify-center border border-[#E4DAC9] bg-white"><LoaderCircle className="size-7 animate-spin text-[#8B1E1E]" /><span className="ml-2 text-sm text-[#756D62]">Loading orders...</span></div> }
function EmptyState() { return <div className="flex min-h-52 flex-col items-center justify-center border border-dashed border-[#E4DAC9] bg-[#FDFAF4] p-6 text-center"><PackageCheck className="size-8 text-[#8B1E1E]" /><p className="mt-3 font-semibold">No orders found.</p></div> }
function formatStatus(value) { return value.split("_").map((part) => part.charAt(0) + part.slice(1).toLowerCase()).join(" ") }
function formatMoney(value) { return new Intl.NumberFormat("en-IE", { style: "currency", currency: "EUR" }).format(Number(value || 0)) }
function formatDateTime(value) { return new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value)) }
