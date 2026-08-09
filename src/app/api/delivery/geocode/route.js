import { DeliveryRoutingError, searchDeliveryAddresses } from "@/lib/deliveryRouting"
import { checkExternalApiRateLimit } from "@/lib/authRateLimit"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
const MAX_BODY_BYTES = 2 * 1024

export async function POST(request) {
  const rate = await checkExternalApiRateLimit(request, { namespace: "delivery-geocode", shortLimit: 30, dailyIpLimit: 200, dailyGlobalLimit: 900 })
  if (!rate.allowed) return Response.json({ error: "Too many address searches. Please wait a moment." }, { status: 429, headers: rate.headers })
  let body
  try {
    if (Number(request.headers.get("content-length") || 0) > MAX_BODY_BYTES) throw new Error("large")
    const raw = await request.text()
    if (new TextEncoder().encode(raw).byteLength > MAX_BODY_BYTES) throw new Error("large")
    body = JSON.parse(raw)
  } catch (error) {
    return Response.json({ error: error.message === "large" ? "Request body is too large." : "Invalid JSON body." }, { status: error.message === "large" ? 413 : 400, headers: rate.headers })
  }
  try {
    const results = await searchDeliveryAddresses(body?.text)
    return Response.json({ data: results }, { headers: { ...rate.headers, "Cache-Control": "no-store" } })
  } catch (error) {
    const status = error instanceof DeliveryRoutingError ? error.status : 503
    return Response.json({ error: error.message || "Address search is temporarily unavailable.", code: error.code || "ROUTING_UNAVAILABLE" }, { status, headers: { ...rate.headers, "Cache-Control": "no-store" } })
  }
}
