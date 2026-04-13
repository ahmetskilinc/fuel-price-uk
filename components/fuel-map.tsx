"use client"

import { useCallback, useEffect, useRef } from "react"
import { useTheme } from "next-themes"
import type { FuelStation, FuelType, MapBounds } from "@/lib/types"
import { FUEL_TYPE_SHORT } from "@/lib/types"

// Minimal ambient typing for the slice of MapKit JS we touch.
// The full surface is large; we only annotate what we call.
/* eslint-disable @typescript-eslint/no-explicit-any */
declare global {
  interface Window {
    mapkit: any
  }
}

const MAPKIT_SRC = "https://cdn.apple-mapkit.com/mk/5.x.x/mapkit.js"

let mapkitLoadPromise: Promise<void> | null = null
function loadMapkit(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve()
  if (window.mapkit) return Promise.resolve()
  if (mapkitLoadPromise) return mapkitLoadPromise
  mapkitLoadPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(
      `script[src="${MAPKIT_SRC}"]`,
    )
    if (existing) {
      existing.addEventListener("load", () => resolve())
      existing.addEventListener("error", () =>
        reject(new Error("Failed to load MapKit JS")),
      )
      return
    }
    const s = document.createElement("script")
    s.src = MAPKIT_SRC
    s.crossOrigin = "anonymous"
    s.async = true
    s.onload = () => resolve()
    s.onerror = () => reject(new Error("Failed to load MapKit JS"))
    document.head.appendChild(s)
  })
  return mapkitLoadPromise
}

let mapkitInitialized = false
function initMapkit() {
  if (mapkitInitialized) return
  mapkitInitialized = true
  window.mapkit.init({
    authorizationCallback: (done: (token: string) => void) => {
      fetch("/api/mapkit-token")
        .then((r) => r.text())
        .then(done)
        .catch((err) => {
          console.error("Failed to fetch MapKit token:", err)
        })
    },
    language: "en-GB",
  })
}

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

function stationKey(station: FuelStation): string {
  return (
    station.site_id ||
    `${station.brand}-${station.location.latitude}-${station.location.longitude}`
  )
}

function createMarkerElement(
  station: FuelStation,
  fuelType: FuelType,
): HTMLElement {
  const price = station.prices[fuelType]
  const color = getPriceColor(price, fuelType)
  const label = price != null ? `${price.toFixed(1)}` : "—"

  const el = document.createElement("div")
  el.style.cssText = `
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
    font-family: system-ui, -apple-system, sans-serif;
    transform: translate(-50%, -50%);
  `
  el.textContent = label
  return el
}

function createCalloutElement(station: FuelStation): HTMLElement {
  const el = document.createElement("div")
  el.style.cssText = `
    font-family: system-ui, -apple-system, sans-serif;
    min-width: 220px;
    padding: 12px 14px;
    background: var(--popover, #fff);
    color: var(--popover-foreground, #111);
    border-radius: 12px;
    box-shadow: 0 6px 24px rgba(0,0,0,0.18);
  `

  const title = document.createElement("div")
  title.style.cssText = "font-weight: 600; font-size: 14px; margin-bottom: 4px;"
  title.textContent = station.brand

  const addr = document.createElement("div")
  addr.style.cssText =
    "font-size: 12px; color: #666; margin-bottom: 8px;"
  addr.textContent = station.address

  const grid = document.createElement("div")
  grid.style.cssText =
    "display: grid; grid-template-columns: 1fr 1fr; gap: 4px; font-size: 12px;"

  const row = (name: string, price: number | null) => {
    const div = document.createElement("div")
    const strong = document.createElement("strong")
    strong.textContent = `${name}: `
    div.appendChild(strong)
    div.append(formatPrice(price))
    return div
  }

  grid.appendChild(row(FUEL_TYPE_SHORT.E10, station.prices.E10))
  grid.appendChild(row(FUEL_TYPE_SHORT.B7, station.prices.B7))
  grid.appendChild(row(FUEL_TYPE_SHORT.E5, station.prices.E5))
  grid.appendChild(row(FUEL_TYPE_SHORT.SDV, station.prices.SDV))

  el.appendChild(title)
  el.appendChild(addr)
  el.appendChild(grid)
  return el
}

// Convert a tile-style zoom level to a latitude/longitude delta for MapKit's
// CoordinateRegion. At zoom 0 the whole world (~180°) is visible; each step
// halves the span.
function zoomToSpan(zoom: number): number {
  return 180 / Math.pow(2, zoom)
}

interface FuelMapProps {
  stations: FuelStation[]
  selectedFuelType: FuelType
  onStationSelect: (station: FuelStation) => void
  onBoundsChange?: (bounds: MapBounds) => void
  center: [number, number]
  zoom: number
}

export function FuelMap({
  stations,
  selectedFuelType,
  onStationSelect,
  onBoundsChange,
  center,
  zoom,
}: FuelMapProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<any>(null)
  // Each entry holds the annotation plus the exact "select" handler reference
  // we passed to addEventListener, so we can removeEventListener cleanly when
  // the annotation leaves the viewport or the map is rebuilt/destroyed.
  const annotationsRef = useRef<
    Map<string, { annotation: any; selectHandler: () => void }>
  >(new Map())
  const stationsRef = useRef(stations)
  const fuelTypeRef = useRef(selectedFuelType)
  const onStationSelectRef = useRef(onStationSelect)
  const onBoundsChangeRef = useRef(onBoundsChange)
  const readyRef = useRef(false)

  stationsRef.current = stations
  fuelTypeRef.current = selectedFuelType
  onStationSelectRef.current = onStationSelect
  onBoundsChangeRef.current = onBoundsChange

  const { resolvedTheme } = useTheme()

  // Sync annotations with viewport — add visible stations, remove out-of-view
  // ones. Capped at 500 to keep MapKit responsive.
  const syncAnnotations = useCallback(() => {
    const map = mapRef.current
    if (!map || !readyRef.current || !window.mapkit) return
    const mapkit = window.mapkit

    const r = map.region.toBoundingRegion()
    const currentStations = stationsRef.current
    const existing = annotationsRef.current

    const visible = currentStations.filter((s) => {
      const lat = s.location.latitude
      const lng = s.location.longitude
      return (
        lat <= r.northLatitude &&
        lat >= r.southLatitude &&
        lng <= r.eastLongitude &&
        lng >= r.westLongitude
      )
    })
    const toRender = visible.slice(0, 500)
    const visibleKeys = new Set(toRender.map(stationKey))

    // Remove annotations that are no longer in view
    const toRemove: any[] = []
    for (const [key, entry] of existing) {
      if (!visibleKeys.has(key)) {
        try {
          entry.annotation.removeEventListener(
            "select",
            entry.selectHandler,
          )
        } catch {
          // ignore teardown errors
        }
        toRemove.push(entry.annotation)
        existing.delete(key)
      }
    }
    if (toRemove.length > 0) map.removeAnnotations(toRemove)

    // Add annotations for newly visible stations
    const toAdd: any[] = []
    for (const station of toRender) {
      const key = stationKey(station)
      if (existing.has(key)) continue
      const coord = new mapkit.Coordinate(
        station.location.latitude,
        station.location.longitude,
      )
      const annotation = new mapkit.Annotation(
        coord,
        () => createMarkerElement(station, fuelTypeRef.current),
        {
          data: { station },
          calloutEnabled: true,
          callout: {
            calloutElementForAnnotation: () => createCalloutElement(station),
          },
        },
      )
      const selectHandler = () => {
        onStationSelectRef.current(station)
      }
      annotation.addEventListener("select", selectHandler)
      existing.set(key, { annotation, selectHandler })
      toAdd.push(annotation)
    }
    if (toAdd.length > 0) map.addAnnotations(toAdd)
  }, [])

  // Rebuild all annotations — used when stations array or fuel type changes
  // (marker colors/labels depend on both).
  const rebuildAnnotations = useCallback(() => {
    const map = mapRef.current
    if (!map || !readyRef.current) return
    const existing = annotationsRef.current
    if (existing.size > 0) {
      const annotations: any[] = []
      for (const entry of existing.values()) {
        try {
          entry.annotation.removeEventListener(
            "select",
            entry.selectHandler,
          )
        } catch {
          // ignore teardown errors
        }
        annotations.push(entry.annotation)
      }
      map.removeAnnotations(annotations)
      existing.clear()
    }
    syncAnnotations()
  }, [syncAnnotations])

  // Initialize map
  useEffect(() => {
    let cancelled = false
    // Hoisted so the cleanup function can explicitly unregister the listener
    // before destroying the map, rather than relying on destroy() to sweep it.
    let mapInstance: any = null
    let regionChangeEndHandler: (() => void) | null = null
    const annotations = annotationsRef.current

    loadMapkit()
      .then(() => {
        if (cancelled || !containerRef.current) return
        initMapkit()

        const mapkit = window.mapkit
        const map = new mapkit.Map(containerRef.current, {
          showsUserLocationControl: true,
          showsCompass: mapkit.FeatureVisibility.Adaptive,
          showsZoomControl: true,
          showsMapTypeControl: true,
          showsScale: mapkit.FeatureVisibility.Adaptive,
          isRotationEnabled: false,
        })

        const coord = new mapkit.Coordinate(center[0], center[1])
        const span = new mapkit.CoordinateSpan(
          zoomToSpan(zoom),
          zoomToSpan(zoom),
        )
        map.region = new mapkit.CoordinateRegion(coord, span)

        const onRegionChangeEnd = () => {
          const r = map.region.toBoundingRegion()
          onBoundsChangeRef.current?.({
            north: r.northLatitude,
            south: r.southLatitude,
            east: r.eastLongitude,
            west: r.westLongitude,
          })
          syncAnnotations()
        }
        map.addEventListener("region-change-end", onRegionChangeEnd)
        mapInstance = map
        regionChangeEndHandler = onRegionChangeEnd

        mapRef.current = map
        readyRef.current = true
        // Fire once on init so the sidebar gets initial bounds and the map
        // gets its first batch of annotations.
        onRegionChangeEnd()
      })
      .catch((err) => {
        console.error(err)
      })

    return () => {
      cancelled = true
      if (mapInstance) {
        if (regionChangeEndHandler) {
          try {
            mapInstance.removeEventListener(
              "region-change-end",
              regionChangeEndHandler,
            )
          } catch {
            // ignore teardown errors
          }
          regionChangeEndHandler = null
        }
        // Unsubscribe every annotation's "select" handler before nuking the
        // map — destroy() sweeps them internally, but doing it explicitly
        // guarantees closures release their captured stations even if
        // destroy() throws mid-teardown.
        for (const entry of annotations.values()) {
          try {
            entry.annotation.removeEventListener(
              "select",
              entry.selectHandler,
            )
          } catch {
            // ignore teardown errors
          }
        }
        try {
          mapInstance.destroy()
        } catch {
          // ignore teardown errors
        }
        mapInstance = null
        mapRef.current = null
        readyRef.current = false
        annotations.clear()
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Apply color scheme (light/dark) from next-themes
  useEffect(() => {
    const map = mapRef.current
    if (!map || !window.mapkit) return
    map.colorScheme =
      resolvedTheme === "dark"
        ? window.mapkit.Map.ColorSchemes.Dark
        : window.mapkit.Map.ColorSchemes.Light
  }, [resolvedTheme])

  // Rebuild annotations when stations or fuel type changes (marker colors and
  // labels depend on both).
  useEffect(() => {
    rebuildAnnotations()
  }, [stations, selectedFuelType, rebuildAnnotations])

  // Pan to center/zoom when they change from outside (sidebar selection)
  useEffect(() => {
    const map = mapRef.current
    if (!map || !readyRef.current || !window.mapkit) return
    const mapkit = window.mapkit
    const coord = new mapkit.Coordinate(center[0], center[1])
    const span = new mapkit.CoordinateSpan(zoomToSpan(zoom), zoomToSpan(zoom))
    map.setRegionAnimated(new mapkit.CoordinateRegion(coord, span))
  }, [center, zoom])

  return <div ref={containerRef} className="h-full w-full" />
}
