import { prisma } from "@/lib/prisma"

const HEIGIT_API_URL = "https://api.heigit.org"
const CYPRUS_BOUNDS = Object.freeze({ minLatitude: 34.4, maxLatitude: 35.8, minLongitude: 32, maxLongitude: 34.8 })
const MAX_AUTOFILL_HOUSE_DISTANCE_KM = 0.025

export class DeliveryRoutingError extends Error {
  constructor(message, code, status = 503) {
    super(message)
    this.name = "DeliveryRoutingError"
    this.code = code
    this.status = status
  }
}

export function isCoordinateInCyprus(latitude, longitude) {
  return Number.isFinite(latitude) && Number.isFinite(longitude)
    && latitude >= CYPRUS_BOUNDS.minLatitude && latitude <= CYPRUS_BOUNDS.maxLatitude
    && longitude >= CYPRUS_BOUNDS.minLongitude && longitude <= CYPRUS_BOUNDS.maxLongitude
}

function apiKey() {
  const key = process.env.OPENROUTESERVICE_API_KEY?.trim()
  if (!key) throw new DeliveryRoutingError("Delivery routing is temporarily unavailable. The restaurant can confirm the fee by phone.", "ROUTING_UNAVAILABLE")
  return key
}

async function readJson(response, fallbackMessage) {
  const payload = await response.json().catch(() => null)
  if (!response.ok) {
    const providerMessage = payload?.error?.message || payload?.error || payload?.message
    throw new DeliveryRoutingError(providerMessage || fallbackMessage, response.status === 429 ? "ROUTING_RATE_LIMITED" : "ROUTING_UNAVAILABLE")
  }
  return payload
}

async function callProvider(url, options, fallbackMessage) {
  const { timeoutMs = 8_000, ...fetchOptions } = options || {}
  try {
    return await fetch(url, { ...fetchOptions, cache: "no-store", signal: AbortSignal.timeout(timeoutMs) })
  } catch {
    throw new DeliveryRoutingError(fallbackMessage, "ROUTING_UNAVAILABLE")
  }
}

export async function searchDeliveryAddresses(query) {
  const text = String(query || "").trim().slice(0, 180)
  if (text.length < 3) throw new DeliveryRoutingError("Enter at least 3 characters to search for an address.", "INVALID_ADDRESS", 422)
  const params = new URLSearchParams({
    text,
    size: "6",
    "boundary.country": "CYP",
    "focus.point.lat": "34.79",
    "focus.point.lon": "32.41",
  })
  const response = await callProvider(`${HEIGIT_API_URL}/pelias/v1/autocomplete?${params}`, {
    headers: { Authorization: apiKey() },
  }, "Address search is temporarily unavailable.")
  const payload = await readJson(response, "Address search is temporarily unavailable.")
  return (payload.features || []).flatMap((feature) => {
    const [longitude, latitude] = feature?.geometry?.coordinates || []
    if (!isCoordinateInCyprus(Number(latitude), Number(longitude))) return []
    const properties = feature.properties || {}
    const streetName = String(properties.street || properties.name || "").trim()
    const houseNumber = String(properties.housenumber || "").trim()
    const street = [houseNumber, streetName].filter(Boolean).join(" ")
      || String(properties.label || text).split(",")[0].trim()
    return [{
      id: properties.gid || `${longitude}:${latitude}`,
      label: String(properties.label || properties.name || text).slice(0, 300),
      street: street.slice(0, 200),
      area: String(properties.locality || properties.localadmin || properties.county || "Paphos").slice(0, 100),
      hasHouseNumber: Boolean(houseNumber),
      postalCode: String(properties.postalcode || "").slice(0, 20),
      latitude: Number(latitude),
      longitude: Number(longitude),
    }]
  })
}

export async function reverseDeliveryAddress(point) {
  const latitude = Number(point?.latitude)
  const longitude = Number(point?.longitude)
  if (!isCoordinateInCyprus(latitude, longitude)) {
    throw new DeliveryRoutingError("Choose a delivery point inside Cyprus.", "INVALID_LOCATION", 422)
  }

  const params = new URLSearchParams({
    "point.lat": String(latitude),
    "point.lon": String(longitude),
    size: "5",
    layers: "address,street",
  })
  const response = await callProvider(`${HEIGIT_API_URL}/pelias/v1/reverse?${params}`, {
    headers: { Authorization: apiKey() },
  }, "The address at this point could not be identified.")
  const payload = await readJson(response, "The address at this point could not be identified.")
  const features = Array.isArray(payload.features) ? payload.features : []
  const nearbyAddress = features.find((candidate) => {
    const properties = candidate?.properties || {}
    const distanceKm = Number(properties.distance)
    return properties.layer === "address"
      && String(properties.street || "").trim()
      && String(properties.housenumber || "").trim()
      && Number.isFinite(distanceKm)
      && distanceKm <= MAX_AUTOFILL_HOUSE_DISTANCE_KM
  })
  const feature = nearbyAddress
    || features.find((candidate) => candidate?.properties?.layer === "street")
    || features.find((candidate) => String(candidate?.properties?.street || "").trim())
  if (!feature) return null

  const properties = feature.properties || {}
  const streetName = String(properties.street || properties.name || "").trim()
  const houseNumber = String(properties.housenumber || "").trim()
  const street = [houseNumber, streetName].filter(Boolean).join(" ")
    || String(properties.label || "").split(",")[0].trim()
  const area = String(
    properties.neighbourhood
    || properties.borough
    || properties.locality
    || properties.localadmin
    || ""
  ).trim()

  if (!street && !area) return null
  return {
    street: street.slice(0, 200),
    area: area.slice(0, 100),
    label: String(properties.label || [street, area].filter(Boolean).join(", ")).slice(0, 300),
    hasHouseNumber: Boolean(houseNumber),
    postalCode: String(properties.postalcode || "").slice(0, 20),
    latitude,
    longitude,
  }
}

export async function getDeliveryRoutingSettings() {
  const settings = await prisma.storefrontSettings.findUnique({
    where: { id: "default" },
    select: {
      restaurantLatitude: true,
      restaurantLongitude: true,
      nearbyDeliveryMaxKm: true,
      maximumDeliveryKm: true,
      nearbyDeliveryFee: true,
      fartherDeliveryFee: true,
    },
  })
  const origin = settings?.restaurantLatitude !== null && settings?.restaurantLongitude !== null
    ? { latitude: Number(settings.restaurantLatitude), longitude: Number(settings.restaurantLongitude) }
    : null
  if (!origin || !isCoordinateInCyprus(origin.latitude, origin.longitude)) {
    throw new DeliveryRoutingError("The restaurant delivery location has not been configured yet.", "ROUTING_NOT_CONFIGURED", 409)
  }
  return {
    origin,
    nearbyMaxKm: Number(settings.nearbyDeliveryMaxKm),
    maximumKm: Number(settings.maximumDeliveryKm),
    nearbyFeeCents: Math.round(Number(settings.nearbyDeliveryFee) * 100),
    fartherFeeCents: Math.round(Number(settings.fartherDeliveryFee) * 100),
  }
}

function reduceCoordinates(coordinates, maximum = 240) {
  if (coordinates.length <= maximum) return coordinates
  const step = Math.ceil(coordinates.length / maximum)
  const sampled = coordinates.filter((_, index) => index % step === 0)
  const last = coordinates.at(-1)
  if (sampled.at(-1) !== last) sampled.push(last)
  return sampled
}

function getDestinationStreet(feature) {
  const steps = (feature?.properties?.segments || []).flatMap((segment) => segment?.steps || [])
  return [...steps].reverse().map((step) => String(step?.name || "").trim()).find((name) => name && name !== "-") || ""
}

export async function quoteDeliveryRoute(destination, suppliedSettings) {
  const latitude = Number(destination?.latitude)
  const longitude = Number(destination?.longitude)
  if (!isCoordinateInCyprus(latitude, longitude)) {
    throw new DeliveryRoutingError("Choose a delivery point inside Cyprus.", "INVALID_LOCATION", 422)
  }
  const settings = suppliedSettings || await getDeliveryRoutingSettings()
  const response = await callProvider(`${HEIGIT_API_URL}/openrouteservice/v2/directions/driving-car/geojson`, {
    method: "POST",
    headers: { Authorization: apiKey(), "Content-Type": "application/json" },
    body: JSON.stringify({ coordinates: [[settings.origin.longitude, settings.origin.latitude], [longitude, latitude]], instructions: true }),
    timeoutMs: 10_000,
  }, "The delivery route could not be calculated.")
  const payload = await readJson(response, "The delivery route could not be calculated.")
  const feature = payload.features?.[0]
  const distanceKm = Number(feature?.properties?.summary?.distance) / 1000
  const durationSeconds = Number(feature?.properties?.summary?.duration)
  if (!Number.isFinite(distanceKm) || !Number.isFinite(durationSeconds)) {
    throw new DeliveryRoutingError("The delivery route could not be calculated.", "ROUTING_UNAVAILABLE")
  }
  if (distanceKm > settings.maximumKm) {
    throw new DeliveryRoutingError(`This address is ${distanceKm.toFixed(1)} km away, outside our ${settings.maximumKm.toFixed(1)} km delivery area.`, "OUTSIDE_DELIVERY_AREA", 422)
  }
  const feeCents = distanceKm <= settings.nearbyMaxKm ? settings.nearbyFeeCents : settings.fartherFeeCents
  return {
    latitude,
    longitude,
    distanceKm: Number(distanceKm.toFixed(2)),
    etaMinutes: Math.max(1, Math.round(durationSeconds / 60)),
    feeCents,
    fee: feeCents / 100,
    tier: distanceKm <= settings.nearbyMaxKm ? "nearby" : "farther",
    maximumKm: settings.maximumKm,
    nearbyMaxKm: settings.nearbyMaxKm,
    destinationStreet: getDestinationStreet(feature).slice(0, 200),
    origin: settings.origin,
    route: reduceCoordinates(feature.geometry?.coordinates || []),
  }
}
