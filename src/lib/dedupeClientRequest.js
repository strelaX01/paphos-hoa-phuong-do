'use client'

const IN_FLIGHT_REQUESTS = Symbol.for('hoa-phuong-do.in-flight-client-requests')

export function dedupeClientRequest(key, requestFactory) {
  const requests = globalThis[IN_FLIGHT_REQUESTS] || new Map()
  const existing = requests.get(key)
  if (existing) return existing

  const request = Promise.resolve().then(requestFactory)
  requests.set(key, request)
  globalThis[IN_FLIGHT_REQUESTS] = requests

  const clear = () => {
    if (requests.get(key) === request) requests.delete(key)
  }
  request.then(clear, clear)
  return request
}
