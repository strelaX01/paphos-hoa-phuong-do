"use client"

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react"

const NOTIFICATION_STATE_KEY = "admin-latest-notification-records"
const NOTIFICATION_SOUND_HISTORY_KEY = "admin-notification-sound-history"
const NOTIFICATION_SOUND_ENABLED_KEY = "admin-notification-sound-enabled"
const NOTIFICATION_SOUND = "/audios/notification-sound.mp3"
const NOTIFICATION_SOUND_HISTORY_TTL = 10 * 60 * 1_000
const AdminNotificationsContext = createContext(null)

export function AdminNotificationsProvider({ children, role }) {
  const [pendingOrders, setPendingOrders] = useState(0)
  const [pendingReservations, setPendingReservations] = useState(0)
  const [soundReady, setSoundReady] = useState(false)
  const [soundBlocked, setSoundBlocked] = useState(false)
  const [soundEnabled, setSoundEnabled] = useState(true)
  const latestCreatedAtRef = useRef({ orders: null, reservations: null })
  const announcedRecordKeysRef = useRef(new Set())
  const countRequestInFlightRef = useRef(false)
  const countRefreshPendingRef = useRef(false)
  const queuedSoundRef = useRef(false)
  const queuedNotificationKeyRef = useRef(null)
  const lastSoundPlayedAtRef = useRef(0)
  const notificationAudioRef = useRef(null)
  const audioContextRef = useRef(null)
  const notificationBufferRef = useRef(null)
  const soundReadyRef = useRef(false)
  const soundEnabledRef = useRef(true)
  const unlockAttemptedRef = useRef(false)

  const playRawNotificationSound = useCallback(async ({ queueOnFailure = true } = {}) => {
    if (!soundEnabledRef.current) return true
    const requestedAt = Date.now()
    if (requestedAt - lastSoundPlayedAtRef.current < 1_000) return true

    // Reserve the playback slot before awaiting audio APIs. Realtime and the
    // summary refresh can report the same record at nearly the same moment.
    lastSoundPlayedAtRef.current = requestedAt
    const audioContext = audioContextRef.current
    const audioBuffer = notificationBufferRef.current

    if (audioContext && audioBuffer) {
      try {
        if (audioContext.state !== "running") await audioContext.resume()
        if (audioContext.state === "running") {
          const source = audioContext.createBufferSource()
          const gain = audioContext.createGain()
          source.buffer = audioBuffer
          gain.gain.value = 0.9
          source.connect(gain)
          gain.connect(audioContext.destination)
          source.start(0)
          queuedSoundRef.current = false
          soundReadyRef.current = true
          setSoundReady(true)
          setSoundBlocked(false)
          return true
        }
      } catch {}
    }

    const audio = notificationAudioRef.current
    if (audio) {
      try {
        audio.muted = false
        audio.currentTime = 0
        await audio.play()
        queuedSoundRef.current = false
        soundReadyRef.current = true
        setSoundReady(true)
        setSoundBlocked(false)
        return true
      } catch {}
    }

    if (queueOnFailure) queuedSoundRef.current = true
    lastSoundPlayedAtRef.current = 0
    soundReadyRef.current = false
    setSoundReady(false)
    setSoundBlocked(true)
    return false
  }, [])

  const playNotificationSound = useCallback(async ({ queueOnFailure = true, notificationKey = null } = {}) => {
    if (!notificationKey) return playRawNotificationSound({ queueOnFailure })

    const playOnceAcrossTabs = async () => {
      const now = Date.now()
      let history = {}

      try {
        history = JSON.parse(window.localStorage.getItem(NOTIFICATION_SOUND_HISTORY_KEY) || "{}")
        history = Object.fromEntries(
          Object.entries(history).filter(([, playedAt]) => now - Number(playedAt) < NOTIFICATION_SOUND_HISTORY_TTL),
        )
      } catch {
        history = {}
      }

      const ownsQueuedNotification = queuedNotificationKeyRef.current === notificationKey
      if (history[notificationKey] && !ownsQueuedNotification) return true

      if (!history[notificationKey]) {
        history[notificationKey] = now
        try {
          window.localStorage.setItem(NOTIFICATION_SOUND_HISTORY_KEY, JSON.stringify(history))
        } catch {}
      }

      const played = await playRawNotificationSound({ queueOnFailure })
      if (!played) {
        queuedNotificationKeyRef.current = notificationKey
      } else if (queuedNotificationKeyRef.current === notificationKey) {
        queuedNotificationKeyRef.current = null
      }
      return played
    }

    if (navigator.locks?.request) {
      return navigator.locks.request(`admin-notification:${notificationKey}`, playOnceAcrossTabs)
    }
    return playOnceAcrossTabs()
  }, [playRawNotificationSound])

  const enableNotificationSound = useCallback(async ({ playTest = true } = {}) => {
    if (!soundEnabledRef.current) return false
    const audioContext = audioContextRef.current
    let unlocked = false
    try {
      if (audioContext?.state !== "running") await audioContext?.resume()
      if (audioContext?.state === "running") {
        const oscillator = audioContext.createOscillator()
        const gain = audioContext.createGain()
        gain.gain.value = 0
        oscillator.connect(gain)
        gain.connect(audioContext.destination)
        oscillator.start()
        oscillator.stop(audioContext.currentTime + 0.01)
        unlocked = true
      }
    } catch {}

    if (!unlocked && notificationAudioRef.current) {
      const audio = notificationAudioRef.current
      try {
        audio.muted = true
        await audio.play()
        audio.pause()
        audio.currentTime = 0
        audio.muted = false
        unlocked = true
      } catch {
        audio.muted = false
      }
    }

    soundReadyRef.current = unlocked
    setSoundReady(unlocked)
    setSoundBlocked(!unlocked)
    if (playTest || queuedSoundRef.current) {
      return playNotificationSound({
        queueOnFailure: true,
        notificationKey: queuedNotificationKeyRef.current,
      })
    }
    return unlocked
  }, [playNotificationSound])

  const setNotificationSoundEnabled = useCallback(async (enabled) => {
    soundEnabledRef.current = enabled
    setSoundEnabled(enabled)
    try { window.localStorage.setItem(NOTIFICATION_SOUND_ENABLED_KEY, String(enabled)) } catch {}

    if (!enabled) {
      queuedSoundRef.current = false
      queuedNotificationKeyRef.current = null
      unlockAttemptedRef.current = false
      soundReadyRef.current = false
      setSoundReady(false)
      setSoundBlocked(false)
      notificationAudioRef.current?.pause()
      await audioContextRef.current?.suspend().catch(() => {})
      return true
    }

    unlockAttemptedRef.current = true
    return enableNotificationSound({ playTest: true })
  }, [enableNotificationSound])

  useEffect(() => {
    let active = true
    let storedSoundEnabled = true
    try { storedSoundEnabled = window.localStorage.getItem(NOTIFICATION_SOUND_ENABLED_KEY) !== "false" } catch {}
    soundEnabledRef.current = storedSoundEnabled
    queueMicrotask(() => { if (active) setSoundEnabled(storedSoundEnabled) })
    const audio = new Audio(NOTIFICATION_SOUND)
    audio.preload = "auto"
    audio.volume = 0.9
    notificationAudioRef.current = audio

    const AudioContextClass = window.AudioContext || window.webkitAudioContext
    const audioContext = AudioContextClass ? new AudioContextClass() : null
    const audioAbortController = new AbortController()
    audioContextRef.current = audioContext

    if (audioContext) {
      fetch(NOTIFICATION_SOUND, { signal: audioAbortController.signal, cache: "force-cache" })
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

    const storeLatestRecords = () => {
      try {
        window.sessionStorage.setItem(NOTIFICATION_STATE_KEY, JSON.stringify(latestCreatedAtRef.current))
      } catch {}
    }

    const unlockAudio = () => {
      if (!soundEnabledRef.current || soundReadyRef.current || unlockAttemptedRef.current) return
      unlockAttemptedRef.current = true
      enableNotificationSound({ playTest: false }).catch(() => setSoundBlocked(true))
    }

    const markRecordAnnounced = (type, recordId, createdAt) => {
      const keys = [
        recordId ? `${type}:id:${recordId}` : null,
        createdAt ? `${type}:created:${createdAt}` : null,
      ].filter(Boolean)
      const announcedRecords = announcedRecordKeysRef.current
      const alreadyAnnounced = keys.some((key) => announcedRecords.has(key))

      keys.forEach((key) => announcedRecords.add(key))
      while (announcedRecords.size > 200) {
        announcedRecords.delete(announcedRecords.values().next().value)
      }

      if (alreadyAnnounced) return null
      return recordId ? `${type}:id:${recordId}` : `${type}:created:${createdAt}`
    }

    const handleLatestRecord = (type, recordId, latestCreatedAt, eventName) => {
      if (!latestCreatedAt) return false
      const previous = latestCreatedAtRef.current[type]
      const latestTime = Date.parse(latestCreatedAt)
      const previousTime = previous ? Date.parse(previous) : 0
      const isNew = Boolean(previous && latestTime > previousTime)

      if (!previous || latestTime > previousTime) latestCreatedAtRef.current[type] = latestCreatedAt
      const notificationKey = markRecordAnnounced(type, recordId, latestCreatedAt)
      if (isNew && notificationKey) window.dispatchEvent(new Event(eventName))
      return isNew ? notificationKey : null
    }

    const loadCounts = () => {
      if (document.visibilityState === "hidden") return
      if (countRequestInFlightRef.current) {
        countRefreshPendingRef.current = true
        return
      }
      countRequestInFlightRef.current = true

      fetch("/api/admin/orders/summary", { cache: "no-store" })
        .then((response) => response.ok ? response.json() : Promise.reject())
        .then((payload) => {
          if (!active) return
          let notificationKey = null

          setPendingOrders(payload.data.pending)
          notificationKey = handleLatestRecord("orders", payload.data.latestId, payload.data.latestCreatedAt, "new-order-received") || notificationKey
          if (role === "ADMIN") {
            setPendingReservations(payload.data.pendingReservations)
            notificationKey = handleLatestRecord("reservations", payload.data.latestReservationId, payload.data.latestReservationCreatedAt, "new-reservation-received") || notificationKey
          }

          storeLatestRecords()
          if (notificationKey) playNotificationSound({ notificationKey })
        })
        .catch(() => {})
        .finally(() => {
          countRequestInFlightRef.current = false
          if (active && countRefreshPendingRef.current) {
            countRefreshPendingRef.current = false
            loadCounts()
          }
        })
    }

    const processRealtimeInsert = (type, eventName, event) => {
      let payload = {}
      try { payload = JSON.parse(event.data || "{}") } catch {}
      if (payload.eventType !== "INSERT") return
      const notificationKey = markRecordAnnounced(type, payload.recordId, payload.createdAt)
      if (!notificationKey) return
      if (payload.createdAt) latestCreatedAtRef.current[type] = payload.createdAt
      storeLatestRecords()
      window.dispatchEvent(new Event(eventName))
      playNotificationSound({ notificationKey })
    }

    loadCounts()
    const events = new EventSource("/api/admin/events")
    const handleOrderChange = (event) => {
      window.dispatchEvent(new Event("order-data-changed"))
      processRealtimeInsert("orders", "new-order-received", event)
      loadCounts()
    }
    const handleReservationChange = (event) => {
      if (role !== "ADMIN") return
      window.dispatchEvent(new Event("reservation-data-changed"))
      processRealtimeInsert("reservations", "new-reservation-received", event)
      loadCounts()
    }
    const handleVisibilityChange = () => {
      if (document.visibilityState !== "visible") return
      loadCounts()
      if (queuedSoundRef.current) {
        playNotificationSound({ notificationKey: queuedNotificationKeyRef.current })
      }
    }

    events.addEventListener("order-changed", handleOrderChange)
    events.addEventListener("reservation-changed", handleReservationChange)
    const interval = window.setInterval(loadCounts, 10_000)
    window.addEventListener("pointerdown", unlockAudio, { capture: true })
    window.addEventListener("keydown", unlockAudio, { capture: true })
    window.addEventListener("focus", loadCounts)
    document.addEventListener("visibilitychange", handleVisibilityChange)
    window.addEventListener("order-count-changed", loadCounts)
    window.addEventListener("reservation-count-changed", loadCounts)

    return () => {
      active = false
      events.close()
      window.clearInterval(interval)
      audioAbortController.abort()
      countRefreshPendingRef.current = false
      notificationAudioRef.current = null
      notificationBufferRef.current = null
      audioContextRef.current = null
      audio.pause()
      audioContext?.close().catch(() => {})
      window.removeEventListener("pointerdown", unlockAudio, { capture: true })
      window.removeEventListener("keydown", unlockAudio, { capture: true })
      window.removeEventListener("focus", loadCounts)
      document.removeEventListener("visibilitychange", handleVisibilityChange)
      window.removeEventListener("order-count-changed", loadCounts)
      window.removeEventListener("reservation-count-changed", loadCounts)
    }
  }, [enableNotificationSound, playNotificationSound, role])

  const value = useMemo(() => ({
    pendingOrders,
    pendingReservations,
    soundReady,
    soundBlocked,
    soundEnabled,
    enableNotificationSound,
    setNotificationSoundEnabled,
    playNotificationSound,
  }), [enableNotificationSound, pendingOrders, pendingReservations, playNotificationSound, setNotificationSoundEnabled, soundBlocked, soundEnabled, soundReady])

  return <AdminNotificationsContext.Provider value={value}>{children}</AdminNotificationsContext.Provider>
}

export function useAdminNotifications() {
  const context = useContext(AdminNotificationsContext)
  if (!context) throw new Error("useAdminNotifications must be used inside AdminNotificationsProvider")
  return context
}
