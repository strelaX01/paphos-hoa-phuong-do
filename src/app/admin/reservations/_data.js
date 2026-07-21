export const reservations = [
  { id: 1, name: "Sophie M.", email: "sophie@email.com", phone: "+357 96 100 200", guests: 4, date: "2026-06-30", time: "19:00", status: "Confirmed", requests: "Window table if possible" },
  { id: 2, name: "George A.", email: "george@email.com", phone: "+357 99 300 400", guests: 2, date: "2026-06-30", time: "20:30", status: "Confirmed", requests: "" },
  { id: 3, name: "Family Ioannou", email: "ioannou@email.com", phone: "+357 96 500 600", guests: 8, date: "2026-07-01", time: "13:00", status: "Pending", requests: "Birthday celebration, need cake" },
  { id: 4, name: "Maria C.", email: "maria@email.com", phone: "+357 99 700 800", guests: 3, date: "2026-07-01", time: "19:30", status: "Pending", requests: "Vegan menu options needed" },
  { id: 5, name: "Stavros P.", email: "stavros@email.com", phone: "+357 96 900 000", guests: 6, date: "2026-07-02", time: "20:00", status: "Cancelled", requests: "" },
]

export const reservationStatusVariant = {
  Confirmed: "confirmed",
  Pending: "warning",
  Cancelled: "destructive",
}

export function getPrimaryReservationAction(status) {
  if (status === "Pending") return "Confirm reservation"
  if (status === "Confirmed") return "Cancel reservation"
  return "Reopen request"
}
