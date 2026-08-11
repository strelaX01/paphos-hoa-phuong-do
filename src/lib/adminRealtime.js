const REALTIME_TOPIC = "realtime:admin-operations"
const HEARTBEAT_INTERVAL_MS = 25_000
const MAX_RECONNECT_DELAY_MS = 15_000

const globalState = globalThis

function createState() {
  return {
    socket: null,
    listeners: new Set(),
    heartbeatId: null,
    reconnectId: null,
    reconnectAttempts: 0,
    ref: 0,
    joinRef: null,
    warnedAboutConfig: false,
  }
}

const state = globalState.__adminRealtimeState || createState()
if (process.env.NODE_ENV !== "production") globalState.__adminRealtimeState = state

function realtimeConfig() {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()
  const supabaseUrl = process.env.SUPABASE_URL?.trim()
  if (!serviceRoleKey || !supabaseUrl) return null

  try {
    const url = new URL(supabaseUrl)
    if (url.protocol !== "https:" || !url.hostname.endsWith(".supabase.co")) return null
    return {
      serviceRoleKey,
      websocketUrl: `wss://${url.host}/realtime/v1/websocket?apikey=${encodeURIComponent(serviceRoleKey)}&vsn=1.0.0`,
    }
  } catch {
    return null
  }
}

function nextRef() {
  state.ref += 1
  return String(state.ref)
}

function clearSocketTimers() {
  if (state.heartbeatId) clearInterval(state.heartbeatId)
  if (state.reconnectId) clearTimeout(state.reconnectId)
  state.heartbeatId = null
  state.reconnectId = null
}

function send(socket, message) {
  if (socket.readyState === WebSocket.OPEN) socket.send(JSON.stringify(message))
}

function scheduleReconnect() {
  if (!state.listeners.size || state.reconnectId) return
  const delay = Math.min(MAX_RECONNECT_DELAY_MS, 1_000 * (2 ** state.reconnectAttempts))
  state.reconnectAttempts += 1
  state.reconnectId = setTimeout(() => {
    state.reconnectId = null
    connect()
  }, delay)
}

function notifyListeners(message) {
  const data = message?.payload?.data || message?.payload || {}
  const table = data.table
  if (!table || !["Order", "Reservation"].includes(table)) return

  const change = {
    table,
    eventType: String(data.type || data.eventType || "UPDATE").toUpperCase(),
  }
  for (const listener of state.listeners) listener(change)
}

function connect() {
  if (!state.listeners.size || state.socket) return
  const config = realtimeConfig()
  if (!config) {
    if (!state.warnedAboutConfig) {
      console.warn("Admin realtime is unavailable because Supabase server credentials are missing.")
      state.warnedAboutConfig = true
    }
    scheduleReconnect()
    return
  }

  const socket = new WebSocket(config.websocketUrl)
  state.socket = socket

  socket.addEventListener("open", () => {
    const joinRef = nextRef()
    state.joinRef = joinRef
    send(socket, {
      topic: REALTIME_TOPIC,
      event: "phx_join",
      payload: {
        config: {
          broadcast: { ack: false, self: false },
          presence: { enabled: false },
          postgres_changes: [
            { event: "*", schema: "public", table: "Order", select: ["id", "status", "updatedAt"] },
            { event: "*", schema: "public", table: "Reservation", select: ["id", "status", "createdAt"] },
          ],
          private: false,
        },
        access_token: config.serviceRoleKey,
      },
      ref: joinRef,
      join_ref: joinRef,
    })

    state.heartbeatId = setInterval(() => {
      send(socket, { topic: "phoenix", event: "heartbeat", payload: {}, ref: nextRef(), join_ref: null })
    }, HEARTBEAT_INTERVAL_MS)
  })

  socket.addEventListener("message", (event) => {
    try {
      const message = JSON.parse(String(event.data))
      if (message.event === "postgres_changes") notifyListeners(message)
      if (message.event === "phx_reply" && message.ref === state.joinRef) {
        if (message.payload?.status === "ok") state.reconnectAttempts = 0
        else socket.close()
      }
      if (["phx_close", "phx_error"].includes(message.event)) socket.close()
    } catch {
      // Ignore malformed provider messages and keep the connection alive.
    }
  })

  socket.addEventListener("close", () => {
    if (state.socket !== socket) return
    clearSocketTimers()
    state.socket = null
    state.joinRef = null
    scheduleReconnect()
  })

  socket.addEventListener("error", () => socket.close())
}

export function subscribeAdminRealtime(listener) {
  state.listeners.add(listener)
  connect()

  return () => {
    state.listeners.delete(listener)
    if (state.listeners.size) return
    clearSocketTimers()
    const socket = state.socket
    state.socket = null
    state.joinRef = null
    socket?.close()
  }
}
