"use client"

import { useEffect, useRef, useCallback } from "react"
import L from "leaflet"
import "leaflet/dist/leaflet.css"
import type { FuelStation, FuelType } from "@/lib/types"
import { FUEL_TYPE_SHORT } from "@/lib/types"

function formatPrice(price: number | null): string {
  if (price == null) return "N/A"
  return `${price.toFixed(1)}p`
}

function getPriceColor(price: number | null, fuelType: FuelType): string {
  if (price == null) return "#94a3b8"
  if (fuelType === "B7" || fuelType === "SDV") {
    if (price < 135) return "#22c55e"
    if (price < 145) return "#eab308"
    if (price < 155) return "#f97316"
    return "#ef4444"
  }
  if (price < 130) return "#22c55e"
  if (price < 140) return "#eab308"
  if (price < 150) return "#f97316"
  return "#ef4444"
}

function createMarkerIcon(station: FuelStation, fuelType: FuelType): L.DivIcon {
  const price = station.prices[fuelType]
  const color = getPriceColor(price, fuelType)
  const label = price != null ? `${price.toFixed(1)}` : "—"

  return L.divIcon({
    className: "fuel-marker",
    html: `<div style="
      background: ${color};
      color: white;
      font-size: 11px;
      font-weight: 600;
      padding: 2px 6px;
      border-radius: 12px;
      white-space: nowrap;
      box-shadow: 0 2px 6px rgba(0,0,0,0.3);
      border: 2px solid white;
      text-align: center;
      min-width: 42px;
    ">${label}</div>`,
    iconSize: [50, 24],
    iconAnchor: [25, 12],
  })
}

function buildPopupContent(station: FuelStation): string {
  return `
    <div style="font-family: system-ui; min-width: 200px;">
      <div style="font-weight: 600; font-size: 14px; margin-bottom: 4px;">${station.brand}</div>
      <div style="font-size: 12px; color: #666; margin-bottom: 8px;">${station.address}</div>
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 4px; font-size: 12px;">
        <div><strong>${FUEL_TYPE_SHORT.E10}:</strong> ${formatPrice(station.prices.E10)}</div>
        <div><strong>${FUEL_TYPE_SHORT.B7}:</strong> ${formatPrice(station.prices.B7)}</div>
        <div><strong>${FUEL_TYPE_SHORT.E5}:</strong> ${formatPrice(station.prices.E5)}</div>
        <div><strong>${FUEL_TYPE_SHORT.SDV}:</strong> ${formatPrice(station.prices.SDV)}</div>
      </div>
    </div>
  `
}

function stationKey(station: FuelStation): string {
  return station.site_id || `${station.brand}-${station.location.latitude}-${station.location.longitude}`
}

interface FuelMapProps {
  stations: FuelStation[]
  selectedFuelType: FuelType
  onStationSelect: (station: FuelStation) => void
  center: [number, number]
  zoom: number
}

export function FuelMap({
  stations,
  selectedFuelType,
  onStationSelect,
  center,
  zoom,
}: FuelMapProps) {
  const mapRef = useRef<L.Map | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const markersRef = useRef<Map<string, L.Marker>>(new Map())
  const layerGroupRef = useRef<L.LayerGroup | null>(null)
  const stationsRef = useRef(stations)
  const fuelTypeRef = useRef(selectedFuelType)
  const onStationSelectRef = useRef(onStationSelect)

  stationsRef.current = stations
  fuelTypeRef.current = selectedFuelType
  onStationSelectRef.current = onStationSelect

  const syncMarkers = useCallback((preservePopups = false) => {
    const map = mapRef.current
    const layerGroup = layerGroupRef.current
    if (!map || !layerGroup) return

    const bounds = map.getBounds()
    const currentStations = stationsRef.current
    const currentFuelType = fuelTypeRef.current
    const markerMap = markersRef.current

    // Find which stations should be visible
    const visible = currentStations.filter((s) =>
      bounds.contains([s.location.latitude, s.location.longitude]),
    )
    const toRender = visible.slice(0, 500)
    const visibleKeys = new Set(toRender.map(stationKey))

    // Find the currently open popup's station key
    let openPopupKey: string | null = null
    if (preservePopups) {
      for (const [key, marker] of markerMap) {
        if (marker.isPopupOpen()) {
          openPopupKey = key
          break
        }
      }
    }

    // Remove markers no longer in view (but keep open popup marker)
    for (const [key, marker] of markerMap) {
      if (!visibleKeys.has(key) && key !== openPopupKey) {
        layerGroup.removeLayer(marker)
        markerMap.delete(key)
      }
    }

    // Add new markers for newly visible stations
    for (const station of toRender) {
      const key = stationKey(station)
      if (markerMap.has(key)) continue

      const marker = L.marker(
        [station.location.latitude, station.location.longitude],
        { icon: createMarkerIcon(station, currentFuelType) },
      )

      marker.bindPopup(buildPopupContent(station))
      marker.on("click", () => onStationSelectRef.current(station))
      layerGroup.addLayer(marker)
      markerMap.set(key, marker)
    }
  }, [])

  // Full rebuild — used when fuel type or stations array changes
  const rebuildAllMarkers = useCallback(() => {
    const layerGroup = layerGroupRef.current
    if (!layerGroup) return

    layerGroup.clearLayers()
    markersRef.current.clear()
    syncMarkers(false)
  }, [syncMarkers])

  // Initialize map
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return

    const map = L.map(containerRef.current, {
      center,
      zoom,
      zoomControl: false,
    })

    L.control.zoom({ position: "bottomright" }).addTo(map)

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 19,
    }).addTo(map)

    layerGroupRef.current = L.layerGroup().addTo(map)
    mapRef.current = map

    return () => {
      map.remove()
      mapRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Rebuild markers when stations or fuel type changes
  useEffect(() => {
    rebuildAllMarkers()
  }, [stations, selectedFuelType, rebuildAllMarkers])

  // Sync markers on map move — preserve open popups
  useEffect(() => {
    const map = mapRef.current
    if (!map) return

    const onMoveEnd = () => syncMarkers(true)

    map.on("moveend", onMoveEnd)
    return () => {
      map.off("moveend", onMoveEnd)
    }
  }, [syncMarkers])

  // Pan to center when it changes
  useEffect(() => {
    if (!mapRef.current) return
    mapRef.current.setView(center, zoom)
  }, [center, zoom])

  return <div ref={containerRef} className="h-full w-full" />
}
