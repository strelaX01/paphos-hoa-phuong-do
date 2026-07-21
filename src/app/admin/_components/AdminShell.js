"use client"

import Image from "next/image"
import Link from "next/link"
import {
  BarChart3,
  CalendarClock,
  ClipboardList,
  Home,
  Image as ImageIcon,
  Settings,
  ShoppingBag,
  Tags,
  Truck,
  Utensils,
  Video,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { useAdminNotifications } from "@/app/admin/_components/AdminNotifications"
import AdminLogoutButton from "@/app/admin/_components/AdminLogoutButton"
import { useAdminSession } from "@/app/admin/_components/AdminSession"
import ChangePasswordDialog from "@/app/admin/_components/ChangePasswordDialog"

const navItems = [
  { href: "/admin", label: "Overview", icon: BarChart3, key: "overview" },
  { href: "/admin/orders", label: "Orders", icon: ShoppingBag, key: "orders" },
  { href: "/admin/reservations", label: "Reservations", icon: CalendarClock, key: "reservations" },
  {
    href: "/admin/menu",
    label: "Menu",
    icon: Utensils,
    key: "menu",
    children: [
      { href: "/admin/menu#items", label: "Items", icon: ClipboardList, key: "items" },
      { href: "/admin/menu#categories", label: "Categories", icon: Tags, key: "categories" },
      { href: "/admin/menu#tags", label: "Tags", icon: Tags, key: "tags" },
    ],
  },
  { href: "/admin/videos", label: "Video Specials", icon: Video, key: "videos" },
  { href: "/admin/gallery", label: "Gallery", icon: ImageIcon, key: "gallery" },
  { href: "/admin/drivers", label: "Drivers", icon: Truck, key: "drivers" },
  { href: "/admin/settings", label: "Settings", icon: Settings, key: "settings" },
]

export default function AdminShell({
  active = "overview",
  eyebrow = "Admin workspace",
  title,
  description,
  action,
  menuSection = "items",
  onMenuSectionChange,
  children,
}) {
  const account = useAdminSession()
  const isDriver = account.role === "DRIVER"
  const { pendingOrders, pendingReservations } = useAdminNotifications()

  const allowedNavItems = isDriver ? navItems.filter((item) => item.key === "orders") : navItems
  const displayedNavItems = allowedNavItems.map((item) => {
    if (item.key === "orders") return { ...item, count: pendingOrders }
    if (item.key === "reservations") return { ...item, count: pendingReservations }
    return item
  })
  const activeNavItem = displayedNavItems.find((item) => item.key === active) || displayedNavItems[0]
  const ActiveNavIcon = activeNavItem.icon
  const menuNavItem = displayedNavItems.find((item) => item.key === "menu")
  const activeMenuItem = menuNavItem?.children?.find((child) => child.key === menuSection) || menuNavItem?.children?.[0]
  const ActiveMenuIcon = activeMenuItem?.icon

  return (
    <div className="min-h-screen bg-[#F6F1E8] text-[#2B2B2B] lg:flex">
      <aside className="hidden min-h-screen w-64 shrink-0 border-r border-black/10 bg-[#202020] text-white lg:fixed lg:inset-y-0 lg:flex lg:flex-col">
        <div className="border-b border-white/10 p-5">
          <Link
            href={isDriver ? "/admin/orders" : "/admin"}
            className="flex items-center gap-3 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D4A017]/70"
          >
            <div className="relative flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-white">
              <Image
                src="/images/hoa-phuong-do-logo.png"
                alt="Hoa Phuong Do"
                fill
                className="object-contain p-1.5"
                sizes="48px"
                priority
              />
            </div>
            <div className="min-w-0">
              <p className="truncate font-display text-lg font-bold leading-none">Hoa Phuong Do</p>
              <p className="mt-1 text-xs uppercase tracking-[0.18em] text-[#D4A017]">{isDriver ? "Driver" : "Admin"}</p>
            </div>
          </Link>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto p-3">
          {displayedNavItems.map((item) => {
            const Icon = item.icon
            const isActive = item.key === active

            return (
              <div key={item.href}>
                <Link
                  href={item.href}
                  className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                    isActive
                      ? "bg-white text-[#202020]"
                      : "text-white/68 hover:bg-white/10 hover:text-white"
                  }`}
                >
                  <Icon className="size-4" />
                  <span className="min-w-0 flex-1">{item.label}</span>
                  {item.count ? (
                    <span className="flex min-w-5 items-center justify-center rounded-full bg-[#8B1E1E] px-1.5 py-0.5 text-[11px] font-bold text-white">
                      {item.count}
                    </span>
                  ) : null}
                </Link>
                {isActive && item.children ? (
                  <div className="mt-1 space-y-1 pl-8">
                    {item.children.map((child) => {
                      const ChildIcon = child.icon
                      const childActive = child.key === menuSection

                      return (
                        <Link
                          key={child.href}
                          href={child.href}
                          scroll={false}
                          onClick={() => onMenuSectionChange?.(child.key)}
                          className={`flex items-center gap-2 rounded-md px-3 py-2 text-xs font-medium transition-colors ${
                            childActive
                              ? "bg-white/12 text-white"
                              : "text-white/50 hover:bg-white/10 hover:text-white"
                          }`}
                        >
                          <ChildIcon className="size-3.5" />
                          <span>{child.label}</span>
                        </Link>
                      )
                    })}
                  </div>
                ) : null}
              </div>
            )
          })}
        </nav>

        <div className="border-t border-white/10 p-3">
          {!isDriver ? <Button asChild variant="ghost" className="w-full justify-start text-white/70 hover:bg-white/10 hover:text-white">
            <Link href="/"><Home className="size-4" />Restaurant site</Link>
          </Button> : null}
          <ChangePasswordDialog className="mt-1 w-full justify-start text-white/70 hover:bg-white/10 hover:text-white" />
          <AdminLogoutButton className="mt-1 w-full justify-start text-white/70 hover:bg-white/10 hover:text-white" />
        </div>
      </aside>

      <div className="min-w-0 flex-1 lg:ml-64">
        <header className="sticky top-0 z-30 border-b border-[#E4DAC9] bg-[#FDFBF7]/95 px-4 py-3 backdrop-blur md:px-6">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
            <div className="flex min-w-0 items-start gap-3">
              <Link
                href={isDriver ? "/admin/orders" : "/admin"}
                className="relative flex size-11 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-[#E4DAC9] bg-white shadow-xs lg:hidden"
                aria-label="Admin overview"
              >
                <Image
                  src="/images/hoa-phuong-do-logo.png"
                  alt="Hoa Phuong Do"
                  fill
                  className="object-contain p-1.5"
                  sizes="44px"
                  priority
                />
              </Link>
              <div className="min-w-0">
                <p className="text-xs font-medium uppercase tracking-[0.16em] text-[#8B1E1E]">{eyebrow}</p>
                <h1 className="mt-1 truncate font-display text-2xl font-bold">{title}</h1>
                {description ? <p className="max-w-3xl text-sm text-[#756D62]">{description}</p> : null}
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2 xl:justify-end">
              <ChangePasswordDialog compact className="border border-[#E4DAC9] bg-white hover:bg-[#F6F1E8] lg:hidden" />
              <AdminLogoutButton compact className="border border-[#E4DAC9] bg-white hover:bg-[#F6F1E8] lg:hidden" />
              {action}
            </div>
          </div>

          <details className="group mt-3 lg:hidden">
            <summary className="flex cursor-pointer list-none items-center justify-between rounded-lg border border-[#E4DAC9] bg-white px-3 py-2 text-sm font-semibold text-[#2B2B2B] shadow-xs">
              <span className="flex min-w-0 items-center gap-2">
                <ActiveNavIcon className="size-4 text-[#8B1E1E]" />
                <span className="truncate">{activeNavItem.label}</span>
                {activeNavItem.count ? (
                  <span className="flex min-w-5 items-center justify-center rounded-full bg-[#8B1E1E] px-1.5 py-0.5 text-[11px] font-bold text-white">
                    {activeNavItem.count}
                  </span>
                ) : null}
              </span>
              <span className="text-xs font-medium text-[#756D62] group-open:hidden">Open</span>
              <span className="hidden text-xs font-medium text-[#756D62] group-open:inline">Close</span>
            </summary>
            <nav className="mt-2 grid gap-2 rounded-lg border border-[#E4DAC9] bg-white p-2 shadow-lg" aria-label="Admin sections">
              {displayedNavItems.map((item) => {
                const Icon = item.icon
                const isActive = item.key === active

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium ${
                      isActive
                        ? "bg-[#8B1E1E] text-white"
                        : "text-[#756D62] hover:bg-[#F6F1E8] hover:text-[#2B2B2B]"
                    }`}
                  >
                    <Icon className="size-4" />
                    <span className="min-w-0 flex-1">{item.label}</span>
                    {item.count ? (
                      <span className={`flex min-w-5 items-center justify-center rounded-full px-1.5 py-0.5 text-[11px] font-bold ${
                        isActive ? "bg-white text-[#8B1E1E]" : "bg-[#8B1E1E] text-white"
                      }`}>
                        {item.count}
                      </span>
                    ) : null}
                  </Link>
                )
              })}
            </nav>
          </details>

          {active === "menu" ? (
            <details className="group mt-2 lg:hidden">
              <summary className="flex cursor-pointer list-none items-center justify-between rounded-lg border border-[#E4DAC9] bg-[#FAF7F0] px-3 py-2 text-sm font-semibold text-[#2B2B2B]">
                <span className="flex min-w-0 items-center gap-2">
                  {ActiveMenuIcon ? <ActiveMenuIcon className="size-4 text-[#8B1E1E]" /> : null}
                  <span className="truncate">{activeMenuItem?.label || "Menu section"}</span>
                </span>
                <span className="text-xs font-medium text-[#756D62] group-open:hidden">Open</span>
                <span className="hidden text-xs font-medium text-[#756D62] group-open:inline">Close</span>
              </summary>
              <nav className="mt-2 grid grid-cols-2 gap-2 rounded-lg border border-[#E4DAC9] bg-white p-2" aria-label="Menu sections">
                {menuNavItem?.children.map((child) => {
                  const ChildIcon = child.icon
                  const childActive = child.key === menuSection

                  return (
                    <Link
                      key={child.href}
                      href={child.href}
                      scroll={false}
                      onClick={() => onMenuSectionChange?.(child.key)}
                      className={`flex items-center gap-2 rounded-md px-3 py-2 text-xs font-medium ${
                        childActive
                          ? "bg-[#8B1E1E] text-white"
                          : "text-[#756D62] hover:bg-[#F6F1E8] hover:text-[#2B2B2B]"
                      }`}
                    >
                      <ChildIcon className="size-3.5" />
                      {child.label}
                    </Link>
                  )
                })}
              </nav>
            </details>
          ) : null}
        </header>

        <main className="p-4 md:p-6">{children}</main>
      </div>
    </div>
  )
}
