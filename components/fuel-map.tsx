"use client"

import { useCallback, useEffect, useRef } from "react"
import { useTheme } from "next-themes"
import type { FuelStation, FuelType, MapBounds } from "@/lib/types"
import { getPriceColor } from "@/lib/fuel"

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

// Module-level ref so the singleton authorizationCallback closure can reach
// the currently-mounted FuelMap's onAuthError prop. Written by the component
// on every render; cleared on unmount.
const authErrorHandlerRef: { current: ((err: Error) => void) | null } = {
  current: null,
}

let mapkitInitialized = false
function initMapkit() {
  if (mapkitInitialized) return
  mapkitInitialized = true
  window.mapkit.init({
    authorizationCallback: (done: (token: string) => void) => {
      fetch("/api/mapkit-token")
        .then((r) => {
          if (!r.ok) {
            // fetch() resolves even on 4xx/5xx — surface it as an error so
            // we don't hand the error body to MapKit as if it were a JWT.
            throw new Error(
              `MapKit token request failed: HTTP ${r.status} ${r.statusText}`,
            )
          }
          return r.text()
        })
        .then((token) => done(token))
        .catch((err) => {
          console.error("Failed to fetch MapKit token:", err)
          const error = err instanceof Error ? err : new Error(String(err))
          authErrorHandlerRef.current?.(error)
          // Always call done so MapKit doesn't hang waiting for a token.
          // Passing an empty string makes MapKit's internal auth fail fast
          // and allows the component's onAuthError handler to drive the UI.
          done("")
        })
    },
    language: "en-GB",
  })
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
  /**
   * Called when the MapKit JS authorization callback fails — e.g. the token
   * endpoint returns a non-2xx response or the network request fails. Lets
   * the parent render an error/retry state instead of leaving a blank map.
   */
  onAuthError?: (err: Error) => void
  center: [number, number]
  zoom: number
}

export function FuelMap({
  stations,
  selectedFuelType,
  onStationSelect,
  onBoundsChange,
  onAuthError,
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

  // Keep the module-level auth-error handler in sync with the current prop so
  // MapKit's singleton authorizationCallback can surface failures to whatever
  // FuelMap is currently mounted. Cleared on unmount.
  useEffect(() => {
    authErrorHandlerRef.current = onAuthError ?? null
    return () => {
      if (authErrorHandlerRef.current === (onAuthError ?? null)) {
        authErrorHandlerRef.current = null
      }
    }
  }, [onAuthError])

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
          calloutEnabled: false,
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
