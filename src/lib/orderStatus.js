export const ORDER_STATUSES = Object.freeze(["PENDING", "PREPARING", "PENDING_PICKUP", "EN_ROUTE", "DELIVERED", "CANCELLED"])
export const DRIVER_ORDER_STATUSES = Object.freeze(["PENDING_PICKUP", "EN_ROUTE", "DELIVERED"])

export const ADMIN_NEXT_STATUS = Object.freeze({
  PENDING: "PREPARING",
  PREPARING: "PENDING_PICKUP",
  PENDING_PICKUP: "EN_ROUTE",
  EN_ROUTE: "DELIVERED",
})

export const DRIVER_NEXT_STATUS = Object.freeze({
  PENDING_PICKUP: "EN_ROUTE",
  EN_ROUTE: "DELIVERED",
})

export const ORDER_STATUS_LABELS = Object.freeze({
  PENDING: "New",
  PREPARING: "Preparing",
  PENDING_PICKUP: "Ready",
  EN_ROUTE: "Delivering",
  DELIVERED: "Completed",
  CANCELLED: "Cancelled",
})

export const ORDER_ACTION_LABELS = Object.freeze({
  PREPARING: "Start preparing",
  PENDING_PICKUP: "Mark ready",
  EN_ROUTE: "Start delivery",
  DELIVERED: "Complete delivery",
})

export function formatOrderStatus(status) {
  return ORDER_STATUS_LABELS[status] || String(status || "")
}
