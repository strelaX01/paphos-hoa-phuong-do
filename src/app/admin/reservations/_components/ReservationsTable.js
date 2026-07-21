"use client"

import { useMemo, useState } from "react"
import { CheckCircle2, ClipboardList, MoreHorizontal, X } from "lucide-react"

import { getPrimaryReservationAction, reservationStatusVariant } from "@/app/admin/reservations/_data"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

const nextStatus = {
  Pending: "Confirmed",
  Confirmed: "Cancelled",
  Cancelled: "Pending",
}

const RESERVATION_STATUSES = ["Pending", "Confirmed", "Cancelled"]

export default function ReservationsTable({ reservations }) {
  const [statusById, setStatusById] = useState(() =>
    Object.fromEntries(reservations.map((reservation) => [reservation.id, reservation.status]))
  )
  const [selectedId, setSelectedId] = useState(null)
  const [menu, setMenu] = useState(null)

  const displayReservations = useMemo(
    () => reservations.map((reservation) => ({ ...reservation, status: statusById[reservation.id] || reservation.status })),
    [reservations, statusById]
  )
  const selectedReservation = displayReservations.find((reservation) => reservation.id === selectedId)
  const menuReservation = menu ? displayReservations.find((reservation) => reservation.id === menu.id) : null

  const updateStatus = (id, status) => {
    setStatusById((current) => ({ ...current, [id]: status }))
    setMenu(null)
  }

  const advanceStatus = (reservation) => {
    updateStatus(reservation.id, nextStatus[reservation.status] || reservation.status)
  }

  const openMenu = (reservation, trigger) => {
    const rect = trigger.getBoundingClientRect()
    const width = 220
    const height = 208
    const gap = 8
    const opensUp = rect.bottom + gap + height > window.innerHeight - 16
    const top = opensUp ? rect.top - gap - height : rect.bottom + gap

    setMenu({
      id: reservation.id,
      top: Math.max(16, Math.min(window.innerHeight - height - 16, top)),
      left: Math.max(16, Math.min(window.innerWidth - width - 16, rect.right - width)),
    })
  }

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Contact</TableHead>
            <TableHead>Date and time</TableHead>
            <TableHead>Guests</TableHead>
            <TableHead className="hidden lg:table-cell">Requests</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="w-[190px] text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {displayReservations.map((reservation) => {
            const isUnread = reservation.status === "Pending"

            return (
              <TableRow
                key={reservation.id}
                className={isUnread ? "border-l-4 border-l-[#8B1E1E] bg-[#FFF7E6] hover:bg-[#FFF2D2]" : undefined}
              >
                <TableCell className="font-semibold">
                  <div className="flex items-center gap-2">
                    {reservation.name}
                    {isUnread ? (
                      <span className="rounded-md bg-[#8B1E1E] px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-white">
                        Unread
                      </span>
                    ) : null}
                  </div>
                </TableCell>
                <TableCell>
                  <p className="text-[#756D62]">{reservation.email}</p>
                  <p className="text-xs text-[#9C9489]">{reservation.phone}</p>
                </TableCell>
                <TableCell>
                  <p className="font-medium">{reservation.date}</p>
                  <p className="text-sm font-semibold text-[#8B1E1E]">{reservation.time}</p>
                </TableCell>
                <TableCell className="font-semibold">{reservation.guests}</TableCell>
                <TableCell className="hidden max-w-[240px] truncate text-[#756D62] lg:table-cell">
                  {reservation.requests || <span className="text-[#9C9489]">None</span>}
                </TableCell>
                <TableCell><Badge variant={reservationStatusVariant[reservation.status]}>{reservation.status}</Badge></TableCell>
                <TableCell className="text-right align-top">
                  <ReservationActions
                    onDetails={() => setSelectedId(reservation.id)}
                    onOpenMenu={(trigger) => openMenu(reservation, trigger)}
                  />
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>

      {menu && menuReservation ? (
        <StatusPopover
          reservation={menuReservation}
          top={menu.top}
          left={menu.left}
          onClose={() => setMenu(null)}
          onAdvance={() => advanceStatus(menuReservation)}
          onSetStatus={(status) => updateStatus(menuReservation.id, status)}
        />
      ) : null}

      {selectedReservation ? (
        <ReservationDetailModal
          reservation={selectedReservation}
          onClose={() => setSelectedId(null)}
          onAdvance={() => advanceStatus(selectedReservation)}
          onSetStatus={(status) => updateStatus(selectedReservation.id, status)}
        />
      ) : null}
    </>
  )
}

function ReservationActions({ onDetails, onOpenMenu }) {
  return (
    <div className="flex justify-end gap-2">
      <Button type="button" variant="outline" size="sm" className="h-8" onClick={onDetails}>
        <ClipboardList className="size-4" />
        Details
      </Button>
      <button
        type="button"
        onClick={(event) => onOpenMenu(event.currentTarget)}
        className="flex h-8 items-center gap-1 rounded-md border border-[#E4DAC9] bg-white px-2.5 text-sm font-medium shadow-xs transition-colors hover:bg-[#F6F1E8]"
      >
        <MoreHorizontal className="size-4" />
        Actions
      </button>
    </div>
  )
}

function StatusPopover({ reservation, top, left, onClose, onAdvance, onSetStatus }) {
  return (
    <>
      <button type="button" aria-label="Close actions" className="fixed inset-0 z-40 cursor-default" onClick={onClose} />
      <div
        className="fixed z-50 max-h-[calc(100vh-32px)] w-[220px] overflow-y-auto rounded-lg border border-[#E4DAC9] bg-white p-1 text-sm shadow-xl"
        style={{ top, left }}
      >
        <button
          type="button"
          onClick={onAdvance}
          className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left font-medium hover:bg-[#F6F1E8]"
        >
          <CheckCircle2 className="size-4 text-[#8B1E1E]" />
          {getPrimaryReservationAction(reservation.status)}
        </button>
        <div className="my-1 border-t border-[#E4DAC9]" />
        {RESERVATION_STATUSES.map((status) => (
          <StatusButton
            key={status}
            label={status}
            status={status}
            current={reservation.status}
            onSetStatus={onSetStatus}
          />
        ))}
      </div>
    </>
  )
}

function StatusButton({ label, status, current, onSetStatus }) {
  const isCurrent = status === current

  return (
    <button
      type="button"
      onClick={() => onSetStatus(status)}
      className={`flex w-full items-center justify-between rounded-md px-3 py-2 text-left hover:bg-[#F6F1E8] ${
        isCurrent ? "bg-[#F6F1E8] text-[#8B1E1E]" : "text-[#756D62]"
      }`}
    >
      <span>{label}</span>
      {isCurrent ? <CheckCircle2 className="size-3.5 text-[#8B1E1E]" /> : null}
    </button>
  )
}

function ReservationDetailModal({ reservation, onClose, onAdvance, onSetStatus }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4">
      <div className="max-h-[88vh] w-full max-w-3xl overflow-y-auto rounded-lg bg-[#FDFBF7] shadow-2xl">
        <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-[#E4DAC9] bg-[#FDFBF7] p-5">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.16em] text-[#8B1E1E]">Reservation detail</p>
            <div className="mt-1 flex flex-wrap items-center gap-3">
              <h2 className="font-display text-2xl font-bold">{reservation.name}</h2>
              <Badge variant={reservationStatusVariant[reservation.status]}>{reservation.status}</Badge>
            </div>
            <p className="text-sm text-[#756D62]">{reservation.date} - {reservation.time} - {reservation.guests} guests</p>
          </div>
          <Button type="button" variant="ghost" size="icon" aria-label="Close details" onClick={onClose}>
            <X className="size-4" />
          </Button>
        </div>

        <div className="grid gap-5 p-5">
          <Card className="border-[#E4DAC9] bg-white">
            <CardHeader>
              <CardTitle className="font-display text-xl">Guest information</CardTitle>
              <CardDescription>Contact, party size, and requests</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <InfoRow label="Name" value={reservation.name} />
              <InfoRow label="Email" value={reservation.email} />
              <InfoRow label="Phone" value={reservation.phone} />
              <InfoRow label="Guests" value={reservation.guests} />
              <InfoRow label="Requests" value={reservation.requests || "None"} />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

function InfoRow({ label, value }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#756D62]">{label}</p>
      <p className="mt-1 font-medium">{value}</p>
    </div>
  )
}
