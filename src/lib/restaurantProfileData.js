import { prisma } from "@/lib/prisma"
import { cache } from "react"

const fallbackProfile = {
  name: "Hoa Phuong Do",
  email: "",
  phone: "",
  address: "",
  mapUrl: "",
}

const fallbackOpeningHours = []

export const getRestaurantProfileData = cache(async function getRestaurantProfileData() {
  try {
    const [profile, openingHours] = await prisma.$transaction([
      prisma.restaurantProfile.findUnique({ where: { id: "default" } }),
      prisma.openingHour.findMany({ orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }] }),
    ])
    return {
      profile: profile ? {
        name: profile.name,
        email: profile.email || "",
        phone: profile.phone || "",
        address: profile.address || "",
        mapUrl: profile.mapUrl || "",
      } : fallbackProfile,
      openingHours: openingHours.length ? openingHours : fallbackOpeningHours,
    }
  } catch (error) {
    console.error("Failed to load restaurant profile", error)
    return { profile: fallbackProfile, openingHours: fallbackOpeningHours }
  }
})

export function phoneHref(phone) {
  const firstNumber = String(phone || "").split("/")[0].trim()
  const normalized = firstNumber.replace(/[^\d+]/g, "").replace(/(?!^)\+/g, "")
  return normalized ? `tel:${normalized}` : "#"
}

export function splitPhoneNumbers(phone) {
  return String(phone || '')
    .split('/')
    .map((value) => value.trim())
    .filter(Boolean)
}

const dayIndexes = {
  sunday: 0,
  sun: 0,
  monday: 1,
  mon: 1,
  tuesday: 2,
  tue: 2,
  tues: 2,
  wednesday: 3,
  wed: 3,
  thursday: 4,
  thu: 4,
  thur: 4,
  thurs: 4,
  friday: 5,
  fri: 5,
  saturday: 6,
  sat: 6,
}

function dayIndex(value) {
  return dayIndexes[String(value || "").trim().toLowerCase().replace(/\./g, "")]
}

function scheduleMatchScore(label, today) {
  const normalized = String(label || "")
    .toLowerCase()
    .replace(/[–—]/g, "-")
    .replace(/\bto\b/g, "-")
    .replace(/\./g, "")
    .trim()

  if (["daily", "every day", "all week"].includes(normalized)) return 1
  if (normalized === "weekdays") return today >= 1 && today <= 5 ? 1 : 0
  if (normalized === "weekends") return today === 0 || today === 6 ? 1 : 0

  const parts = normalized.split(/\s*(?:,|\/|&|\band\b)\s*/).filter(Boolean)
  let bestScore = 0

  for (const part of parts) {
    const range = part.split(/\s*-\s*/)
    if (range.length === 2) {
      const start = dayIndex(range[0])
      const end = dayIndex(range[1])
      if (start === undefined || end === undefined) continue
      const matches = start <= end
        ? today >= start && today <= end
        : today >= start || today <= end
      if (matches) bestScore = Math.max(bestScore, 1)
      continue
    }

    if (dayIndex(part) === today) bestScore = Math.max(bestScore, parts.length === 1 ? 3 : 2)
  }

  return bestScore
}

export function getTodayOpeningStatus(openingHours, date = new Date()) {
  const weekday = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Nicosia",
    weekday: "long",
  }).format(date)
  const today = dayIndex(weekday)

  const match = (openingHours || []).reduce((best, entry) => {
    const score = scheduleMatchScore(entry.day, today)
    return score > best.score ? { entry, score } : best
  }, { entry: null, score: 0 }).entry

  if (!match) return { isClosed: false, text: "See opening hours" }
  if (match.isClosed || String(match.hours).trim().toLowerCase() === "closed") {
    return { isClosed: true, text: "Closed today" }
  }

  return { isClosed: false, text: `Open today ${match.hours}` }
}
