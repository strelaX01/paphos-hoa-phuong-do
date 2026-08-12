import { authorizeAdminRequest } from "@/lib/adminApiAuth"
import { subscribeAdminRealtime } from "@/lib/adminRealtime"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const encoder = new TextEncoder()

export async function GET(request) {
  const auth = await authorizeAdminRequest(request, { roles: ["ADMIN", "DRIVER"] })
  if (auth.response) return auth.response

  const isDriver = auth.account.role === "DRIVER"
  let cleanup = () => {}
  let closed = false

  const stream = new ReadableStream({
    start(controller) {
      const send = (content) => {
        if (!closed) controller.enqueue(encoder.encode(content))
      }
      const close = () => {
        if (closed) return
        closed = true
        cleanup()
        controller.close()
      }

      send("retry: 3000\n\nevent: ready\ndata: {}\n\n")
      const unsubscribe = subscribeAdminRealtime((change) => {
        if (isDriver && change.table !== "Order") return
        const eventName = change.table === "Order" ? "order-changed" : "reservation-changed"
        send(`event: ${eventName}\ndata: ${JSON.stringify({
          eventType: change.eventType,
          recordId: change.recordId,
          createdAt: change.createdAt,
        })}\n\n`)
      })
      const heartbeatId = setInterval(() => send(": heartbeat\n\n"), 20_000)
      cleanup = () => {
        clearInterval(heartbeatId)
        unsubscribe()
      }
      request.signal.addEventListener("abort", close, { once: true })
    },
    cancel() {
      if (closed) return
      closed = true
      cleanup()
    },
  })

  return new Response(stream, {
    headers: {
      "Cache-Control": "no-cache, no-store, no-transform",
      "Content-Type": "text/event-stream; charset=utf-8",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  })
}
