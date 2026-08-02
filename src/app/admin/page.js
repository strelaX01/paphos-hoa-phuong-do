import Link from "next/link"
import {
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  CheckCircle2,
  Clock3,
  DollarSign,
  PackageCheck,
  UsersRound,
  XCircle,
} from "lucide-react"

import AdminShell from "@/app/admin/_components/AdminShell"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { getAdminDashboardData } from "@/lib/adminDashboardData"
import { formatOrderStatus } from "@/lib/orderStatus"

export const metadata = { title: "Admin Dashboard | Hoa Phuong Do" }
export const dynamic = "force-dynamic"

const statusVariant = {
  PENDING: "warning",
  PREPARING: "preparing",
  PENDING_PICKUP: "info",
  EN_ROUTE: "default",
  DELIVERED: "success",
  CANCELLED: "destructive",
}

export default async function AdminDashboardPage() {
  const data = await getAdminDashboardData()
  const today = new Intl.DateTimeFormat("en-CY", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Asia/Nicosia",
  }).format(new Date())
  const revenueTrend = calculateTrend(data.todayRevenue, data.yesterdayRevenue)
  const stats = [
    {
      label: "Revenue today",
      value: formatMoney(data.todayRevenue),
      detail: revenueTrend.label,
      tone: revenueTrend.tone,
      icon: DollarSign,
    },
    {
      label: "Orders today",
      value: data.ordersToday,
      detail: `${data.pendingToday} new ${data.pendingToday === 1 ? "order" : "orders"}`,
      tone: data.pendingToday ? "warning" : "neutral",
      icon: PackageCheck,
    },
    {
      label: "Reservations today",
      value: data.reservationsToday,
      detail: `${data.seatsToday} seats booked`,
      tone: "neutral",
      icon: UsersRound,
    },
    {
      label: "Average prep time",
      value: data.averagePrepMinutes === null ? "No data" : `${data.averagePrepMinutes}m`,
      detail: `${data.measuredPrepOrders} measured ${data.measuredPrepOrders === 1 ? "order" : "orders"}`,
      tone: "neutral",
      icon: Clock3,
    },
  ]
  const maxRevenue = Math.max(1, ...data.chart.map((entry) => entry.revenue))
  const maxSold = Math.max(1, ...data.popularItems.map((item) => item.sold))
  const operationalRows = [
    { label: "New", value: data.operationalStatus.newOrders, color: "bg-amber-500" },
    { label: "Preparing", value: data.operationalStatus.preparing, color: "bg-orange-500" },
    { label: "Ready", value: data.operationalStatus.ready, color: "bg-sky-600" },
    { label: "Delivering", value: data.operationalStatus.delivery, color: "bg-zinc-800" },
    { label: "Completed today", value: data.operationalStatus.deliveredToday, color: "bg-emerald-600" },
  ]
  const operationalTotal = Math.max(1, ...operationalRows.map((entry) => entry.value))

  return <AdminShell active="overview" eyebrow="Operations dashboard" title="Dashboard overview" description={today}>
    <div className="space-y-5">
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-label="Key metrics">
        {stats.map((stat) => <MetricCard key={stat.label} {...stat} />)}
      </section>

      <section className="grid gap-5 xl:grid-cols-[minmax(0,1.55fr)_minmax(18rem,0.8fr)]">
        <Card className="border-[#E4DAC9] bg-white">
          <CardHeader className="flex-row items-start justify-between gap-4">
            <div>
              <CardTitle className="font-display text-xl">Revenue and order volume</CardTitle>
              <CardDescription>Last 7 service days</CardDescription>
            </div>
            <Badge variant="outline" className="shrink-0 border-[#D4A017]/40 text-[#8B1E1E]">{formatMoney(data.weekRevenue)}</Badge>
          </CardHeader>
          <CardContent>
            {data.chart.some((entry) => entry.orders > 0) ? <div className="grid h-64 grid-cols-7 items-end gap-2 border-b border-l border-[#E4DAC9] px-2 pb-5 pt-3 sm:gap-3 sm:px-3">
              {data.chart.map((entry) => {
                const height = entry.revenue > 0 ? Math.max(4, Math.round((entry.revenue / maxRevenue) * 100)) : 0
                return <div key={entry.key} className="flex h-full min-w-0 flex-col justify-end gap-2">
                  <div className="flex min-h-0 flex-1 items-end">
                    <div className="w-full rounded-t-sm bg-[#8B1E1E]" style={{ height: `${height}%` }} title={`${entry.day}: ${formatMoney(entry.revenue)}`} />
                  </div>
                  <div className="text-center">
                    <p className="text-xs font-semibold">{entry.day}</p>
                    <p className="truncate text-[10px] text-[#756D62] sm:text-[11px]">{entry.orders}</p>
                  </div>
                </div>
              })}
            </div> : <EmptyData message="No orders recorded in the last 7 days." />}
          </CardContent>
        </Card>

        <Card className="border-[#E4DAC9] bg-white">
          <CardHeader>
            <CardTitle className="font-display text-xl">Order status</CardTitle>
            <CardDescription>Current operational queue</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            {operationalRows.map((entry) => <div key={entry.label} className="space-y-2">
              <div className="flex items-center justify-between gap-3 text-sm">
                <span className="font-medium">{entry.label}</span>
                <span className="font-semibold tabular-nums">{entry.value}</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-[#EFE7DA]">
                <div className={`h-full rounded-full ${entry.color}`} style={{ width: `${Math.round((entry.value / operationalTotal) * 100)}%` }} />
              </div>
            </div>)}
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-5 xl:grid-cols-[minmax(17rem,0.8fr)_minmax(0,1.35fr)]">
        <Card className="border-[#E4DAC9] bg-white">
          <CardHeader>
            <CardTitle className="font-display text-xl">Popular dishes</CardTitle>
            <CardDescription>Best sellers today</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {data.popularItems.length ? data.popularItems.map((item) => <div key={item.name} className="space-y-2">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">{item.name}</p>
                  <p className="text-xs text-[#756D62]">{item.sold} sold</p>
                </div>
                <p className="shrink-0 text-sm font-semibold text-[#8B1E1E]">{formatMoney(item.revenue)}</p>
              </div>
              <Progress value={Math.round((item.sold / maxSold) * 100)} className="bg-[#EFE7DA]" />
            </div>) : <EmptyData compact message="No dishes sold today." />}
          </CardContent>
        </Card>

        <Card className="min-w-0 border-[#E4DAC9] bg-white">
          <CardHeader className="flex-row items-center justify-between gap-3">
            <div>
              <CardTitle className="font-display text-xl">Recent orders</CardTitle>
              <CardDescription>Latest orders across all statuses</CardDescription>
            </div>
            <Button asChild variant="outline" size="sm"><Link href="/admin/orders">View all<ArrowRight className="size-4" /></Link></Button>
          </CardHeader>
          <CardContent>
            {data.recentOrders.length ? <div className="overflow-x-auto"><Table className="min-w-[680px]">
              <TableHeader><TableRow><TableHead>Order</TableHead><TableHead>Customer</TableHead><TableHead>Items</TableHead><TableHead className="text-right">Total</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
              <TableBody>{data.recentOrders.map((order) => <TableRow key={order.id}>
                <TableCell><Link href="/admin/orders" className="font-mono text-xs font-bold text-[#8B1E1E] hover:underline">{order.orderNumber}</Link><p className="mt-1 text-xs text-[#756D62]">{formatTime(order.createdAt)}</p></TableCell>
                <TableCell className="max-w-40 truncate font-medium">{order.customerName}</TableCell>
                <TableCell className="max-w-56 truncate text-[#756D62]">{order.items.map((item) => `${item.name} x${item.quantity}`).join(", ")}</TableCell>
                <TableCell className="text-right font-semibold">{formatMoney(order.total)}</TableCell>
                <TableCell><Badge variant={statusVariant[order.status]}>{formatOrderStatus(order.status)}</Badge></TableCell>
              </TableRow>)}</TableBody>
            </Table></div> : <EmptyData message="No orders have been placed yet." />}
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-5 lg:grid-cols-[minmax(0,1.35fr)_minmax(18rem,0.65fr)]">
        <Card className="border-[#E4DAC9] bg-white">
          <CardHeader className="flex-row items-center justify-between gap-3">
            <div><CardTitle className="font-display text-xl">Upcoming reservations</CardTitle><CardDescription>Pending and confirmed bookings</CardDescription></div>
            <Button asChild variant="outline" size="sm"><Link href="/admin/reservations">View all<ArrowRight className="size-4" /></Link></Button>
          </CardHeader>
          <CardContent>
            {data.upcomingReservations.length ? <div className="divide-y divide-[#E4DAC9]">{data.upcomingReservations.map((reservation) => <div key={reservation.id} className="flex flex-col gap-2 py-3 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0"><p className="truncate text-sm font-semibold">{reservation.customerName}</p><p className="text-xs text-[#756D62]">{formatReservationDate(reservation.date, data.todayKey)} at {reservation.time} | {reservation.partySize} guests</p></div>
              <Badge variant={reservation.status === "CONFIRMED" ? "success" : "warning"}>{formatStatus(reservation.status)}</Badge>
            </div>)}</div> : <EmptyData compact message="No upcoming reservations." />}
          </CardContent>
        </Card>

        <Card className="border-[#E4DAC9] bg-[#2B2B2B] text-white">
          <CardHeader><CardTitle className="font-display text-xl">Kitchen performance</CardTitle><CardDescription className="text-white/62">Measured from today&apos;s orders</CardDescription></CardHeader>
          <CardContent className="space-y-5">
            <div>
              <div className="flex items-center justify-between gap-3 text-sm"><span className="text-white/72">Within prep target</span><span className="font-semibold">{data.prepTargetRate === null ? "No data" : `${data.prepTargetRate}%`}</span></div>
              <Progress value={data.prepTargetRate || 0} className="mt-2 bg-white/12 [&_[data-slot=progress-indicator]]:bg-[#D4A017]" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-md bg-white/8 p-3"><CheckCircle2 className="size-4 text-emerald-400" /><p className="mt-2 text-xl font-bold tabular-nums">{data.deliveredToday}</p><p className="text-xs text-white/62">Delivered today</p></div>
              <div className="rounded-md bg-white/8 p-3"><XCircle className="size-4 text-red-300" /><p className="mt-2 text-xl font-bold tabular-nums">{data.cancelledToday}</p><p className="text-xs text-white/62">Cancelled today</p></div>
            </div>
          </CardContent>
        </Card>
      </section>
    </div>
  </AdminShell>
}

function MetricCard({ detail, icon: Icon, label, tone, value }) {
  const TrendIcon = tone === "positive" ? ArrowUpRight : tone === "negative" || tone === "warning" ? ArrowDownRight : null
  const toneClass = tone === "positive" ? "text-emerald-700" : tone === "negative" || tone === "warning" ? "text-amber-700" : "text-[#756D62]"
  return <Card className="border-[#E4DAC9] bg-white">
    <CardHeader className="flex-row items-start justify-between pb-2">
      <div className="min-w-0"><CardDescription>{label}</CardDescription><CardTitle className="mt-3 font-sans text-3xl font-semibold leading-none tabular-nums">{value}</CardTitle></div>
      <div className="flex size-10 shrink-0 items-center justify-center rounded-md bg-[#F6F1E8] text-[#8B1E1E]"><Icon className="size-5" /></div>
    </CardHeader>
    <CardContent><p className={`flex items-center gap-1 text-sm font-medium ${toneClass}`}>{TrendIcon ? <TrendIcon className="size-4" /> : null}{detail}</p></CardContent>
  </Card>
}

function EmptyData({ compact = false, message }) {
  return <div className={`flex items-center justify-center text-center text-sm text-[#756D62] ${compact ? "min-h-24" : "min-h-44"}`}>{message}</div>
}

function calculateTrend(today, yesterday) {
  if (!yesterday) return { label: today ? "No revenue yesterday" : "No revenue recorded today", tone: "neutral" }
  const percent = ((today - yesterday) / yesterday) * 100
  return { label: `${Math.abs(percent).toFixed(1)}% vs yesterday`, tone: percent >= 0 ? "positive" : "negative" }
}

function formatMoney(value) {
  return new Intl.NumberFormat("en-IE", { style: "currency", currency: "EUR" }).format(Number(value || 0))
}

function formatStatus(value) {
  return value.split("_").map((part) => part.charAt(0) + part.slice(1).toLowerCase()).join(" ")
}

function formatTime(value) {
  return new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Nicosia" }).format(new Date(value))
}

function formatReservationDate(value, todayKey) {
  const date = new Date(value)
  const parts = new Intl.DateTimeFormat("en-CA", { year: "numeric", month: "2-digit", day: "2-digit", timeZone: "Asia/Nicosia" }).formatToParts(date)
  const read = (type) => parts.find((part) => part.type === type)?.value
  const key = `${read("year")}-${read("month")}-${read("day")}`
  if (key === todayKey) return "Today"
  const tomorrow = new Date(`${todayKey}T12:00:00Z`)
  tomorrow.setUTCDate(tomorrow.getUTCDate() + 1)
  if (key === tomorrow.toISOString().slice(0, 10)) return "Tomorrow"
  return new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", timeZone: "Asia/Nicosia" }).format(date)
}
