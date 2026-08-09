"use client"

import * as maplibregl from "maplibre-gl"
import "maplibre-gl/dist/maplibre-gl.css"
import { createContext, useContext, useEffect, useId, useRef, useState } from "react"

import { cn } from "@/lib/utils"

const MapContext = createContext(null)
const OPEN_FREE_MAP_STYLE = "https://tiles.openfreemap.org/styles/liberty"
const MAPLIBRE_WORKER_URL = "/vendor/maplibre-gl-worker.mjs"
const ROAD_NAME_LAYERS = ["highway-name-path", "highway-name-minor", "highway-name-major"]

maplibregl.setWorkerUrl(MAPLIBRE_WORKER_URL)

function distanceToSegment(point, start, end) {
  const dx = end.x - start.x
  const dy = end.y - start.y
  if (dx === 0 && dy === 0) return Math.hypot(point.x - start.x, point.y - start.y)
  const ratio = Math.max(0, Math.min(1, ((point.x - start.x) * dx + (point.y - start.y) * dy) / (dx * dx + dy * dy)))
  return Math.hypot(point.x - (start.x + ratio * dx), point.y - (start.y + ratio * dy))
}

function renderedStreetAtPoint(map, point) {
  const availableLayers = ROAD_NAME_LAYERS.filter((layerId) => map.getLayer(layerId))
  const renderedFeatures = availableLayers.length
    ? map.queryRenderedFeatures(
        [[point.x - 28, point.y - 28], [point.x + 28, point.y + 28]],
        { layers: availableLayers },
      )
    : []
  const sourceFeatures = map.getSource("openmaptiles")
    ? map.querySourceFeatures("openmaptiles", { sourceLayer: "transportation_name" })
    : []
  const features = [...sourceFeatures, ...renderedFeatures]
  const candidates = features.flatMap((feature) => {
    const properties = feature.properties || {}
    const name = String(properties["name:latin"] || properties.name_en || properties.name || "").trim()
    if (!name) return []
    const lines = feature.geometry?.type === "LineString"
      ? [feature.geometry.coordinates]
      : feature.geometry?.type === "MultiLineString"
        ? feature.geometry.coordinates
        : []
    let distance = Number.POSITIVE_INFINITY
    const points = feature.geometry?.type === "Point"
      ? [feature.geometry.coordinates]
      : feature.geometry?.type === "MultiPoint"
        ? feature.geometry.coordinates
        : []
    for (const coordinate of points) {
      const projected = map.project(coordinate)
      distance = Math.min(distance, Math.hypot(point.x - projected.x, point.y - projected.y))
    }
    for (const line of lines) {
      for (let index = 1; index < line.length; index += 1) {
        distance = Math.min(distance, distanceToSegment(point, map.project(line[index - 1]), map.project(line[index])))
      }
    }
    return [{ distance, name }]
  })
  candidates.sort((left, right) => left.distance - right.distance)
  return candidates[0]?.distance <= 28 ? candidates[0].name.slice(0, 200) : ""
}

function distanceInKm(left, right) {
  const radians = (value) => value * Math.PI / 180
  const latitudeDelta = radians(right.lat - left.lat)
  const longitudeDelta = radians(right.lng - left.lng)
  const startLatitude = radians(left.lat)
  const endLatitude = radians(right.lat)
  const haversine = Math.sin(latitudeDelta / 2) ** 2
    + Math.cos(startLatitude) * Math.cos(endLatitude) * Math.sin(longitudeDelta / 2) ** 2
  return 6371 * 2 * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine))
}

function renderedAreaAtPoint(map, point) {
  if (!map.getSource("openmaptiles")) return ""
  const location = map.unproject(point)
  const candidates = map.querySourceFeatures("openmaptiles", { sourceLayer: "place" }).flatMap((feature) => {
    if (feature.geometry?.type !== "Point") return []
    const properties = feature.properties || {}
    const placeClass = String(properties.class || "").toLowerCase()
    if (!["neighbourhood", "suburb", "quarter", "village", "hamlet", "town", "city"].includes(placeClass)) return []
    const name = String(properties["name:latin"] || properties.name_en || properties.name || "").trim()
    if (!name || /district$/i.test(name)) return []
    const [longitude, latitude] = feature.geometry.coordinates || []
    if (!Number.isFinite(Number(latitude)) || !Number.isFinite(Number(longitude))) return []
    return [{ distance: distanceInKm(location, { lat: Number(latitude), lng: Number(longitude) }), name }]
  })
  candidates.sort((left, right) => left.distance - right.distance)
  return candidates[0]?.distance <= 6 ? candidates[0].name.slice(0, 100) : ""
}

export function Map({ center = [32.42, 34.78], children, className, onClick, zoom = 12 }) {
  const containerRef = useRef(null)
  const mapRef = useRef(null)
  const [mapInstance, setMapInstance] = useState(null)
  const clickRef = useRef(onClick)
  const initialViewRef = useRef({ center, zoom })
  const centerLongitude = center?.[0]
  const centerLatitude = center?.[1]

  useEffect(() => { clickRef.current = onClick }, [onClick])

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return
    const map = new maplibregl.Map({
      container: containerRef.current,
      style: OPEN_FREE_MAP_STYLE,
      center: initialViewRef.current.center,
      zoom: initialViewRef.current.zoom,
      attributionControl: false,
    })
    map.addControl(new maplibregl.AttributionControl({ compact: true }), "bottom-left")
    map.on("click", (event) => clickRef.current?.({
      longitude: event.lngLat.lng,
      latitude: event.lngLat.lat,
      mapArea: renderedAreaAtPoint(map, event.point),
      mapStreet: renderedStreetAtPoint(map, event.point),
    }))
    mapRef.current = map
    setMapInstance(map)
    return () => {
      setMapInstance(null)
      map.remove()
      mapRef.current = null
    }
  }, [])

  useEffect(() => {
    if (!mapRef.current || !Number.isFinite(centerLongitude) || !Number.isFinite(centerLatitude)) return
    mapRef.current.easeTo({ center: [centerLongitude, centerLatitude], duration: 450 })
  }, [centerLatitude, centerLongitude])

  return (
    <MapContext.Provider value={mapInstance}>
      <div ref={containerRef} className={cn("relative h-full min-h-72 w-full overflow-hidden bg-[#E8DFC8]", className)}>
        {children}
      </div>
    </MapContext.Provider>
  )
}

export function MapControls({ showLocate = false, onLocate }) {
  const map = useContext(MapContext)
  const controlRef = useRef(null)

  useEffect(() => {
    if (!map) return
    const navigation = new maplibregl.NavigationControl({ showCompass: false })
    map.addControl(navigation, "top-right")
    controlRef.current = navigation
    return () => { if (map.hasControl(navigation)) map.removeControl(navigation) }
  }, [map])

  useEffect(() => {
    if (!map || !showLocate || !navigator.geolocation) return
    const geolocate = new maplibregl.GeolocateControl({ positionOptions: { enableHighAccuracy: true }, trackUserLocation: false })
    geolocate.on("geolocate", (event) => onLocate?.({ longitude: event.coords.longitude, latitude: event.coords.latitude }))
    map.addControl(geolocate, "top-right")
    return () => { if (map.hasControl(geolocate)) map.removeControl(geolocate) }
  }, [map, onLocate, showLocate])

  return null
}

export function MapMarker({ latitude, longitude, draggable = false, onDragEnd, tone = "delivery" }) {
  const map = useContext(MapContext)
  const markerRef = useRef(null)
  const dragRef = useRef(onDragEnd)
  const initialPointRef = useRef({ latitude, longitude })

  useEffect(() => { dragRef.current = onDragEnd }, [onDragEnd])

  useEffect(() => {
    const initialPoint = initialPointRef.current
    if (!map || !Number.isFinite(initialPoint.latitude) || !Number.isFinite(initialPoint.longitude)) return
    const element = document.createElement("div")
    element.className = `hpd-map-marker hpd-map-marker--${tone}`
    element.setAttribute("aria-label", tone === "restaurant" ? "Restaurant location" : "Delivery location")
    const marker = new maplibregl.Marker({ element, draggable }).setLngLat([initialPoint.longitude, initialPoint.latitude]).addTo(map)
    marker.on("dragend", () => {
      const point = marker.getLngLat()
      dragRef.current?.({
        longitude: point.lng,
        latitude: point.lat,
        mapArea: renderedAreaAtPoint(map, map.project(point)),
        mapStreet: renderedStreetAtPoint(map, map.project(point)),
      })
    })
    markerRef.current = marker
    return () => marker.remove()
  }, [draggable, map, tone])

  useEffect(() => {
    markerRef.current?.setLngLat([longitude, latitude])
  }, [latitude, longitude])

  return null
}

export function MapRoute({ coordinates = [] }) {
  const map = useContext(MapContext)
  const reactId = useId()
  const sourceId = useRef(`route-${reactId.replaceAll(":", "")}`)

  useEffect(() => {
    if (!map || coordinates.length < 2) return
    const id = sourceId.current
    const data = { type: "Feature", properties: {}, geometry: { type: "LineString", coordinates } }
    const addRoute = () => {
      if (map.getSource(id)) return
      map.addSource(id, { type: "geojson", data })
      map.addLayer({ id, type: "line", source: id, layout: { "line-cap": "round", "line-join": "round" }, paint: { "line-color": "#9B1C1C", "line-width": 5, "line-opacity": 0.86 } })
      const bounds = coordinates.reduce((box, point) => box.extend(point), new maplibregl.LngLatBounds(coordinates[0], coordinates[0]))
      map.fitBounds(bounds, { padding: 56, maxZoom: 15, duration: 550 })
    }
    if (map.isStyleLoaded()) addRoute()
    else map.once("load", addRoute)
    return () => {
      if (map.getLayer(id)) map.removeLayer(id)
      if (map.getSource(id)) map.removeSource(id)
    }
  }, [coordinates, map])

  return null
}
