export const STOREFRONT_NOTICE_DESTINATIONS = Object.freeze([
  { id: "book-table", label: "Book a table", href: "/book-table" },
  { id: "delivery", label: "Order delivery", href: "/delivery" },
  { id: "menu", label: "View menu", href: "/menu" },
  { id: "contact", label: "View opening hours & contact", href: "/contact" },
  { id: "gallery", label: "View gallery", href: "/gallery" },
])

export function getStorefrontNoticeDestination(id) {
  return STOREFRONT_NOTICE_DESTINATIONS.find((destination) => destination.id === id) || null
}

export function getStorefrontNoticeDestinationByHref(href) {
  return STOREFRONT_NOTICE_DESTINATIONS.find((destination) => destination.href === href) || null
}
