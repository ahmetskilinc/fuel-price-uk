"use client"

import { useState, useMemo, useEffect, useRef } from "react"
import Link from "next/link"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"
import { StationCard } from "@/components/station-card"
import type {
  FuelStation,
  FuelType,
  MapBounds,
  SearchOrigin,
  SortBy,
} from "@/lib/types"
import { FUEL_TYPE_LABELS } from "@/lib/types"
import { haversineMiles, boundingBox } from "@/lib/geo"
import { geocodePostcode, parseOutcode } from "@/lib/postcodes"

interface SearchPanelProps {
  stations: FuelStation[]
  loading: boolean
  selectedFuelType: FuelType
  onFuelTypeChange: (type: FuelType) => void
  onStationSelect: (station: FuelStation) => void
  sortBy: SortBy
  onSortChange: (sort: SortBy) => void
  mapBounds: MapBounds | null
  lastUpdated: string | null
  searchOrigin: SearchOrigin | null
  onSearchOriginChange: (origin: SearchOrigin | null) => void
  radiusMiles: number
  onRadiusChange: (miles: number) => void
}

const RADIUS_PRESETS = [1, 3, 5, 10, 25]

interface RankedStation {
  station: FuelStation
  distance?: number
}

export function SearchPanel({
  stations,
  loading,
  selectedFuelType,
  onFuelTypeChange,
  onStationSelect,
  sortBy,
  onSortChange,
  mapBounds,
  lastUpdated,
  searchOrigin,
  onSearchOriginChange,
  radiusMiles,
  onRadiusChange,
}: SearchPanelProps) {
  const [textSearch, setTextSearch] = useState("")
  const [brandFilter, setBrandFilter] = useState<string>("all")

  const [postcodeInput, setPostcodeInput] = useState("")
  const [geocoding, setGeocoding] = useState(false)
  const [geoError, setGeoError] = useState<string | null>(null)

  // Keep the postcode field in sync with the external origin label (e.g. when
  // cleared from elsewhere, or set to "Your location" from geolocation).
  const lastLabelRef = useRef<string | null>(null)
  useEffect(() => {
    if (!searchOrigin) {
      if (lastLabelRef.current !== null) setPostcodeInput("")
      lastLabelRef.current = null
      return
    }
    if (searchOrigin.label !== lastLabelRef.current) {
      setPostcodeInput(searchOrigin.label)
      lastLabelRef.current = searchOrigin.label
    }
  }, [searchOrigin])

  const brands = useMemo(() => {
    const set = new Set(stations.map((s) => s.brand))
    return Array.from(set).sort()
  }, [stations])

  async function resolvePostcode() {
    const trimmed = postcodeInput.trim()
    if (!trimmed) {
      onSearchOriginChange(null)
      setGeoError(null)
      return
    }
    // If the user blurs the same label we already resolved, do nothing.
    if (searchOrigin && searchOrigin.label === trimmed) return

    if (!parseOutcode(trimmed)) {
      setGeoError("Enter a UK postcode, e.g. SW1A 1AA")
      return
    }

    setGeocoding(true)
    setGeoError(null)
    try {
      const result = await geocodePostcode(trimmed)
      if (!result) {
        setGeoError("Postcode area not found")
        return
      }
      onSearchOriginChange({
        latitude: result.latitude,
        longitude: result.longitude,
        label: result.outcode,
      })
      // First-time search → switch sort to distance for a sensible default.
      if (sortBy !== "distance") onSortChange("distance")
    } catch (err) {
      console.error(err)
      setGeoError("Couldn't look up that postcode")
    } finally {
      setGeocoding(false)
    }
  }

  function handleLocateMe() {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setGeoError("Geolocation isn't available in this browser")
      return
    }
    setGeocoding(true)
    setGeoError(null)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        onSearchOriginChange({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          label: "Your location",
        })
        if (sortBy !== "distance") onSortChange("distance")
        setGeocoding(false)
      },
      (err) => {
        setGeocoding(false)
        if (err.code === err.PERMISSION_DENIED) {
          setGeoError("Location permission denied — try a postcode instead")
        } else {
          setGeoError("Couldn't get your location")
        }
      },
      { enableHighAccuracy: false, timeout: 10_000, maximumAge: 5 * 60_000 }
    )
  }

  function handleClearOrigin() {
    onSearchOriginChange(null)
    setPostcodeInput("")
    setGeoError(null)
    if (sortBy === "distance") onSortChange("price")
  }

  const filtered = useMemo<RankedStation[]>(() => {
    let ranked: RankedStation[]

    // Radius search takes priority over the map-bounds filter.  If the user
    // explicitly searched a postcode, panning the map shouldn't make their
    // results disappear.
    if (searchOrigin) {
      const bbox = boundingBox(searchOrigin, radiusMiles)
      ranked = stations
        .filter((s) => {
          const { latitude, longitude } = s.location
          return (
            latitude >= bbox.south &&
            latitude <= bbox.north &&
            longitude >= bbox.west &&
            longitude <= bbox.east
          )
        })
        .map((s) => ({
          station: s,
          distance: haversineMiles(searchOrigin, s.location),
        }))
        .filter((x) => x.distance! <= radiusMiles)
    } else if (mapBounds) {
      ranked = stations
        .filter((s) => {
          const { latitude, longitude } = s.location
          return (
            latitude >= mapBounds.south &&
            latitude <= mapBounds.north &&
            longitude >= mapBounds.west &&
            longitude <= mapBounds.east
          )
        })
        .map((s) => ({ station: s }))
    } else {
      ranked = stations.map((s) => ({ station: s }))
    }

    if (textSearch) {
      const q = textSearch.toLowerCase()
      ranked = ranked.filter(
        ({ station: s }) =>
          s.address.toLowerCase().includes(q) ||
          s.postcode.toLowerCase().includes(q) ||
          s.brand.toLowerCase().includes(q)
      )
    }

    if (brandFilter !== "all") {
      ranked = ranked.filter(({ station: s }) => s.brand === brandFilter)
    }

    // Only show stations with a price for the selected fuel type
    ranked = ranked.filter(
      ({ station: s }) => s.prices[selectedFuelType] != null
    )

    if (sortBy === "price") {
      ranked.sort((a, b) => {
        const priceA = a.station.prices[selectedFuelType] ?? Infinity
        const priceB = b.station.prices[selectedFuelType] ?? Infinity
        return priceA - priceB
      })
    } else if (sortBy === "distance") {
      ranked.sort((a, b) => {
        const da = a.distance ?? Infinity
        const db = b.distance ?? Infinity
        return da - db
      })
    } else {
      ranked.sort((a, b) => a.station.brand.localeCompare(b.station.brand))
    }

    return ranked
  }, [
    stations,
    textSearch,
    brandFilter,
    selectedFuelType,
    sortBy,
    mapBounds,
    searchOrigin,
    radiusMiles,
  ])

  const avgPrice = useMemo(() => {
    const prices = filtered
      .map(({ station: s }) => s.prices[selectedFuelType])
      .filter((p): p is number => p != null)
    if (prices.length === 0) return null
    return prices.reduce((sum, p) => sum + p, 0) / prices.length
  }, [filtered, selectedFuelType])

  const priceList = useMemo(
    () =>
      filtered
        .map(({ station: s }) => s.prices[selectedFuelType])
        .filter((p): p is number => p != null),
    [filtered, selectedFuelType]
  )
  const cheapest = priceList.length > 0 ? Math.min(...priceList) : null
  const mostExpensive = priceList.length > 0 ? Math.max(...priceList) : null

  // Offer a larger radius when a search came up empty.
  const nextRadiusPreset = useMemo(() => {
    const next = RADIUS_PRESETS.find((r) => r > radiusMiles)
    return next ?? null
  }, [radiusMiles])

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* Header */}
      <div className="space-y-3 p-4">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h1 className="text-lg font-semibold">UK Fuel Prices</h1>
            <p className="text-xs text-muted-foreground">
              Live prices from major UK retailers
            </p>
            {lastUpdated && (
              <p className="text-xs text-muted-foreground">
                Updated{" "}
                {new Date(lastUpdated).toLocaleString("en-GB", {
                  dateStyle: "medium",
                  timeStyle: "short",
                })}
              </p>
            )}
          </div>
          <Link
            href="/about"
            className="shrink-0 text-xs text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
          >
            About
          </Link>
        </div>

        {/* Radius search */}
        <div className="space-y-2">
          <div className="flex gap-2">
            <Input
              placeholder="Postcode e.g. SW1A 1AA"
              value={postcodeInput}
              onChange={(e) => {
                setPostcodeInput(e.target.value)
                if (geoError) setGeoError(null)
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault()
                  void resolvePostcode()
                }
              }}
              onBlur={() => void resolvePostcode()}
              disabled={geocoding}
              aria-invalid={geoError ? true : undefined}
              className="flex-1"
            />
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={handleLocateMe}
              disabled={geocoding}
              className="h-8 shrink-0 text-xs"
              title="Use my current location"
            >
              Locate me
            </Button>
            {searchOrigin && (
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={handleClearOrigin}
                className="h-8 shrink-0 text-xs"
              >
                Clear
              </Button>
            )}
          </div>

          {geoError && (
            <p className="text-xs text-destructive">{geoError}</p>
          )}

          <div className="space-y-1">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Radius</span>
              <span className="font-medium text-foreground">
                {radiusMiles} mi
              </span>
            </div>
            <input
              type="range"
              min={1}
              max={25}
              step={1}
              value={radiusMiles}
              onChange={(e) => onRadiusChange(Number(e.target.value))}
              className="h-2 w-full cursor-pointer appearance-none rounded-full bg-input accent-primary"
              aria-label="Search radius in miles"
            />
            <div className="flex flex-wrap gap-1">
              {RADIUS_PRESETS.map((preset) => (
                <Button
                  key={preset}
                  type="button"
                  size="sm"
                  variant={radiusMiles === preset ? "default" : "outline"}
                  onClick={() => onRadiusChange(preset)}
                  className="h-6 px-2 text-[10px]"
                >
                  {preset} mi
                </Button>
              ))}
            </div>
          </div>
        </div>

        <Input
          placeholder="Filter by name, address, or brand..."
          value={textSearch}
          onChange={(e) => setTextSearch(e.target.value)}
        />

        <div className="flex gap-2">
          <Select
            value={selectedFuelType}
            onValueChange={(v) => onFuelTypeChange(v as FuelType)}
          >
            <SelectTrigger className="flex-1">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(Object.entries(FUEL_TYPE_LABELS) as [FuelType, string][]).map(
                ([key, label]) => (
                  <SelectItem key={key} value={key}>
                    {label}
                  </SelectItem>
                )
              )}
            </SelectContent>
          </Select>

          <Select
            value={brandFilter}
            onValueChange={(v) => setBrandFilter(v ?? "all")}
          >
            <SelectTrigger className="flex-1">
              <SelectValue placeholder="All brands" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All brands</SelectItem>
              {brands.map((brand) => (
                <SelectItem key={brand} value={brand}>
                  {brand}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            size="sm"
            variant={sortBy === "price" ? "default" : "outline"}
            onClick={() => onSortChange("price")}
            className="h-7 text-xs"
          >
            Sort by price
          </Button>
          <Button
            size="sm"
            variant={sortBy === "name" ? "default" : "outline"}
            onClick={() => onSortChange("name")}
            className="h-7 text-xs"
          >
            Sort by name
          </Button>
          {searchOrigin && (
            <Button
              size="sm"
              variant={sortBy === "distance" ? "default" : "outline"}
              onClick={() => onSortChange("distance")}
              className="h-7 text-xs"
            >
              Sort by distance
            </Button>
          )}
        </div>
      </div>

      <Separator />

      {/* Stats bar */}
      {!loading && (
        <div className="flex items-center gap-2 px-4 py-2">
          <Badge variant="secondary" className="text-xs">
            {filtered.length} stations
          </Badge>
          {avgPrice != null && (
            <Badge variant="outline" className="text-xs">
              Avg: {avgPrice.toFixed(1)}p
            </Badge>
          )}
          {cheapest != null && (
            <Badge variant="default" className="text-xs">
              Low: {cheapest.toFixed(1)}p
            </Badge>
          )}
          {mostExpensive != null && (
            <Badge variant="destructive" className="text-xs">
              High: {mostExpensive.toFixed(1)}p
            </Badge>
          )}
        </div>
      )}

      <Separator />

      {/* Station list */}
      <ScrollArea className="min-h-0 flex-1">
        <div className="space-y-2 p-4">
          {loading ? (
            Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-[120px] w-full rounded-lg" />
            ))
          ) : filtered.length === 0 ? (
            <div className="space-y-3 py-8 text-center text-sm text-muted-foreground">
              {searchOrigin ? (
                <>
                  <p>
                    No stations within {radiusMiles} mi of{" "}
                    <span className="font-medium">{searchOrigin.label}</span>.
                  </p>
                  {nextRadiusPreset != null && (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => onRadiusChange(nextRadiusPreset)}
                    >
                      Try {nextRadiusPreset} mi
                    </Button>
                  )}
                </>
              ) : (
                <p>No stations found matching your search.</p>
              )}
            </div>
          ) : (
            filtered.slice(0, 100).map(({ station, distance }, i) => (
              <div
                key={station.site_id || `${station.brand}-${i}`}
                className="cursor-pointer"
                onClick={() => onStationSelect(station)}
              >
                <StationCard
                  station={station}
                  selectedFuelType={selectedFuelType}
                  rank={sortBy === "price" ? i + 1 : undefined}
                  distance={distance}
                />
              </div>
            ))
          )}
          {filtered.length > 100 && (
            <p className="py-4 text-center text-xs text-muted-foreground">
              Showing 100 of {filtered.length} stations.{" "}
              {searchOrigin
                ? "Narrow the radius to see fewer."
                : "Zoom in or search to narrow results."}
            </p>
          )}
        </div>
      </ScrollArea>
    </div>
  )
}
