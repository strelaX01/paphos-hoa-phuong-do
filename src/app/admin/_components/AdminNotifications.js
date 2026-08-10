"use client"

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react"

const NOTIFICATION_STATE_KEY = "admin-latest-notification-records"
const AdminNotificationsContext = createContext(null)

export function AdminNotificationsProvider({ children, role }) {
  const [pendingOrders, setPendingOrders] = useState(0)
  const [pendingReservations, setPendingReservations] = useState(0)
  const latestCreatedAtRef = useRef({ orders: null, reservations: null })
  const countRequestInFlightRef = useRef(false)
  const notificationAudioRef = useRef(null)
  const audioContextRef = useRef(null)
  const notificationBufferRef = useRef(null)
  const audioUnlockedRef = useRef(false)

  const playNotificationSound = useCallback(() => {
    const audioContext = audioContextRef.current
    const audioBuffer = notificationBufferRef.current

    if (audioContext && audioBuffer) {
      const playBuffer = () => {
        if (audioContext.state !== "running") return
        const source = audioContext.createBufferSource()
        const gain = audioContext.createGain()
        source.buffer = audioBuffer
        gain.gain.value = 0.85
        source.connect(gain)
        gain.connect(audioContext.destination)
        source.start(0)
        audioUnlockedRef.current = true
      }

      if (audioContext.state === "suspended") {
        audioContext.resume().then(playBuffer).catch(() => {})
      } else {
        playBuffer()
      }
      return
    }

    const audio = notificationAudioRef.current
    if (!audio) return
    audio.muted = false
    audio.currentTime = 0
    audio.play()
      .then(() => { audioUnlockedRef.current = true })
      .catch(() => {})
  }, [])

  useEffect(() => {
    let active = true
    const audio = new Audio("/audios/notification-sound.mp3")
    audio.preload = "auto"
    audio.volume = 0.85
    notificationAudioRef.current = audio

    const AudioContextClass = window.AudioContext || window.webkitAudioContext
    const audioContext = AudioContextClass ? new AudioContextClass() : null
    const audioAbortController = new AbortController()
    audioContextRef.current = audioContext

    if (audioContext) {
      fetch("/audios/notification-sound.mp3", { signal: audioAbortController.signal })
        .then((response) => {
          if (!response.ok) throw new Error("Could not load notification sound.")
          return response.arrayBuffer()
        })
        .then((arrayBuffer) => audioContext.decodeAudioData(arrayBuffer))
        .then((buffer) => {
          if (active) notificationBufferRef.current = buffer
        })
        .catch((error) => {
          if (error.name !== "AbortError") console.warn("Notification sound could not be prepared.", error)
        })
    }

    try {
      const stored = JSON.parse(window.sessionStorage.getItem(NOTIFICATION_STATE_KEY) || "null")
      if (stored?.orders || stored?.reservations) latestCreatedAtRef.current = { ...latestCreatedAtRef.current, ...stored }
    } catch {}

    const unlockAudio = () => {
      if (audioUnlockedRef.current) return
      if (audioContext) {
        audioContext.resume()
          .then(() => { audioUnlockedRef.current = audioContext.state === "running" })
          .catch(() => {})
      }
    }

    const handleLatestRecord = (type, latestCreatedAt, eventName) => {
      if (!latestCreatedAt) return false
      const previous = latestCreatedAtRef.current[type]
      const latestTime = Date.parse(latestCreatedAt)
      const previousTime = previous ? Date.parse(previous) : 0
      const isNew = Boolean(previous && latestTime > previousTime)

      if (!previous || latestTime > previousTime) latestCreatedAtRef.current[type] = latestCreatedAt
      if (isNew) window.dispatchEvent(new Event(eventName))
      return isNew
    }

    const loadCounts = () => {
      if (countRequestInFlightRef.current) return
      countRequestInFlightRef.current = true

      if (document.visibilityState === "hidden") {
        countRequestInFlightRef.current = false
        return
      }

      fetch("/api/admin/orders/summary", { cache: "no-store" })
        .then((response) => response.ok ? response.json() : Promise.reject())
        .then((payload) => {
        if (!active) return
        let hasNewRecord = false

        setPendingOrders(payload.data.pending)
        hasNewRecord = handleLatestRecord("orders", payload.data.latestCreatedAt, "new-order-received") || hasNewRecord
        if (role === "ADMIN") {
          setPendingReservations(payload.data.pendingReservations)
          hasNewRecord = handleLatestRecord("reservations", payload.data.latestReservationCreatedAt, "new-reservation-received") || hasNewRecord
        }

        try {
          window.sessionStorage.setItem(NOTIFICATION_STATE_KEY, JSON.stringify(latestCreatedAtRef.current))
        } catch {}
        if (hasNewRecord) playNotificationSound()
      }).catch(() => {}).finally(() => { countRequestInFlightRef.current = false })
    }

    loadCounts()
    const interval = window.setInterval(loadCounts, 10_000)
    window.addEventListener("pointerdown", unlockAudio)
    window.addEventListener("keydown", unlockAudio)
    window.addEventListener("focus", loadCounts)
    document.addEventListener("visibilitychange", loadCounts)
    window.addEventListener("order-count-changed", loadCounts)
    window.addEventListener("reservation-count-changed", loadCounts)

    return () => {
      active = false
      window.clearInterval(interval)
      audioAbortController.abort()
      notificationAudioRef.current = null
      notificationBufferRef.current = null
      audioContextRef.current = null
      audio.pause()
      audioContext?.close().catch(() => {})
      window.removeEventListener("pointerdown", unlockAudio)
      window.removeEventListener("keydown", unlockAudio)
      window.removeEventListener("focus", loadCounts)
      document.removeEventListener("visibilitychange", loadCounts)
      window.removeEventListener("order-count-changed", loadCounts)
      window.removeEventListener("reservation-count-changed", loadCounts)
    }
  }, [playNotificationSound, role])

  const value = useMemo(() => ({
    pendingOrders,
    pendingReservations,
    playNotificationSound,
  }), [pendingOrders, pendingReservations, playNotificationSound])

  return <AdminNotificationsContext.Provider value={value}>{children}</AdminNotificationsContext.Provider>
}

export function useAdminNotifications() {
  const context = useContext(AdminNotificationsContext)
  if (!context) throw new Error("useAdminNotifications must be used inside AdminNotificationsProvider")
  return context
}
