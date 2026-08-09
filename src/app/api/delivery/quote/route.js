import { DeliveryRoutingError, quoteDeliveryRoute } from "@/lib/deliveryRouting"
import { checkExternalApiRateLimit } from "@/lib/authRateLimit"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
const MAX_BODY_BYTES = 2 * 1024

export async function POST(request) {
  const rate = await checkExternalApiRateLimit(request, { namespace: "delivery-quote", shortLimit: 30, dailyIpLimit: 100, dailyGlobalLimit: 1800 })
  if (!rate.allowed) return Response.json({ error: "Too many route checks. Please wait a moment." }, { status: 429, headers: rate.headers })
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
    const quote = await quoteDeliveryRoute(body)
    return Response.json({ data: quote }, { headers: { ...rate.headers, "Cache-Control": "no-store" } })
  } catch (error) {
    const isRoutingError = error instanceof DeliveryRoutingError
    const status = isRoutingError ? error.status : 500
    return Response.json({
      error: isRoutingError ? error.message : "The delivery map is temporarily unavailable.",
      code: isRoutingError ? error.code : "INTERNAL_ERROR",
    }, { status, headers: { ...rate.headers, "Cache-Control": "no-store" } })
  }
}
