import { DeliveryRoutingError, reverseDeliveryAddress } from "@/lib/deliveryRouting"
import { checkExternalApiRateLimit } from "@/lib/authRateLimit"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
const MAX_BODY_BYTES = 2 * 1024

export async function POST(request) {
  const rate = await checkExternalApiRateLimit(request, {
    namespace: "delivery-reverse-geocode",
    shortLimit: 40,
    dailyIpLimit: 300,
    dailyGlobalLimit: 1500,
  })
  if (!rate.allowed) {
    return Response.json({ error: "Too many map checks. Please wait a moment." }, { status: 429, headers: rate.headers })
  }

  let body
  try {
    if (Number(request.headers.get("content-length") || 0) > MAX_BODY_BYTES) throw new Error("large")
    const raw = await request.text()
    if (new TextEncoder().encode(raw).byteLength > MAX_BODY_BYTES) throw new Error("large")
    body = JSON.parse(raw)
  } catch (error) {
    return Response.json({
      error: error.message === "large" ? "Request body is too large." : "Invalid JSON body.",
    }, { status: error.message === "large" ? 413 : 400, headers: rate.headers })
  }

  try {
    const address = await reverseDeliveryAddress(body)
    return Response.json({ data: address }, { headers: { ...rate.headers, "Cache-Control": "no-store" } })
  } catch (error) {
    const isRoutingError = error instanceof DeliveryRoutingError
    return Response.json({
      error: isRoutingError ? error.message : "The address at this point could not be identified.",
      code: isRoutingError ? error.code : "INTERNAL_ERROR",
    }, {
      status: isRoutingError ? error.status : 500,
      headers: { ...rate.headers, "Cache-Control": "no-store" },
    })
  }
}
