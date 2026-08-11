"use client"

import { Map, MapAccuracyCircle, MapControls, MapMarker, MapPointMetadata, MapRoute } from "@/components/ui/map"

const PAPHOS_CENTER = [32.42, 34.78]

export default function LocationMap({ accuracy, destination, destinationTone = "delivery", onChange, onMetadata, origin, route = [], showLocate = true }) {
  const center = destination
    ? [destination.longitude, destination.latitude]
    : origin
      ? [origin.longitude, origin.latitude]
      : PAPHOS_CENTER

  return (
    <Map center={center} zoom={destination || origin ? 14 : 11} onClick={onChange} className="h-[340px] min-h-0 sm:h-[390px]">
      <MapControls showLocate={showLocate} onLocate={onChange} />
      {origin ? <MapMarker latitude={origin.latitude} longitude={origin.longitude} tone="restaurant" /> : null}
      {destination && Number.isFinite(accuracy) ? <MapAccuracyCircle accuracy={accuracy} latitude={destination.latitude} longitude={destination.longitude} /> : null}
      {destination && onMetadata ? <MapPointMetadata latitude={destination.latitude} longitude={destination.longitude} onResolve={onMetadata} /> : null}
      {destination ? <MapMarker latitude={destination.latitude} longitude={destination.longitude} draggable onDragEnd={onChange} tone={destinationTone} /> : null}
      {route.length > 1 ? <MapRoute coordinates={route} /> : null}
    </Map>
  )
}
