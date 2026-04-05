"use client"

import { useState, useMemo } from "react"
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
import type { FuelStation, FuelType } from "@/lib/types"
import { FUEL_TYPE_LABELS } from "@/lib/types"

interface SearchPanelProps {
  stations: FuelStation[]
  loading: boolean
  selectedFuelType: FuelType
  onFuelTypeChange: (type: FuelType) => void
  onStationSelect: (station: FuelStation) => void
  sortBy: "price" | "name"
  onSortChange: (sort: "price" | "name") => void
  lastUpdated: string | null
}

export function SearchPanel({
  stations,
  loading,
  selectedFuelType,
  onFuelTypeChange,
  onStationSelect,
  sortBy,
  onSortChange,
  lastUpdated,
}: SearchPanelProps) {
  const [search, setSearch] = useState("")
  const [brandFilter, setBrandFilter] = useState<string>("all")

  const brands = useMemo(() => {
    const set = new Set(stations.map((s) => s.brand))
    return Array.from(set).sort()
  }, [stations])

  const filtered = useMemo(() => {
    let result = stations

    if (search) {
      const q = search.toLowerCase()
      result = result.filter(
        (s) =>
          s.address.toLowerCase().includes(q) ||
          s.postcode.toLowerCase().includes(q) ||
          s.brand.toLowerCase().includes(q),
      )
    }

    if (brandFilter !== "all") {
      result = result.filter((s) => s.brand === brandFilter)
    }

    // Only show stations with a price for the selected fuel type
    result = result.filter((s) => s.prices[selectedFuelType] != null)

    if (sortBy === "price") {
      result.sort((a, b) => {
        const priceA = a.prices[selectedFuelType] ?? Infinity
        const priceB = b.prices[selectedFuelType] ?? Infinity
        return priceA - priceB
      })
    } else {
      result.sort((a, b) => a.brand.localeCompare(b.brand))
    }

    return result
  }, [stations, search, brandFilter, selectedFuelType, sortBy])

  const avgPrice = useMemo(() => {
    const prices = filtered
      .map((s) => s.prices[selectedFuelType])
      .filter((p): p is number => p != null)
    if (prices.length === 0) return null
    return prices.reduce((sum, p) => sum + p, 0) / prices.length
  }, [filtered, selectedFuelType])

  const cheapest = filtered[0]?.prices[selectedFuelType]
  const mostExpensive =
    filtered.length > 0
      ? filtered[filtered.length - 1]?.prices[selectedFuelType]
      : null

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* Header */}
      <div className="space-y-3 p-4">
        <div>
          <h1 className="text-lg font-semibold">UK Fuel Prices</h1>
          <p className="text-xs text-muted-foreground">
            Live prices from major UK retailers
          </p>
          {lastUpdated && (
            <p className="text-xs text-muted-foreground">
              Updated {new Date(lastUpdated).toLocaleString("en-GB", {
                dateStyle: "medium",
                timeStyle: "short",
              })}
            </p>
          )}
        </div>

        <Input
          placeholder="Search by location, postcode, or brand..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
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
                ),
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

        <div className="flex items-center gap-2">
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
            <div className="py-8 text-center text-sm text-muted-foreground">
              No stations found matching your search.
            </div>
          ) : (
            filtered.slice(0, 100).map((station, i) => (
              <div
                key={station.site_id || `${station.brand}-${i}`}
                className="cursor-pointer"
                onClick={() => onStationSelect(station)}
              >
                <StationCard
                  station={station}
                  selectedFuelType={selectedFuelType}
                  rank={sortBy === "price" ? i + 1 : undefined}
                />
              </div>
            ))
          )}
          {filtered.length > 100 && (
            <p className="py-4 text-center text-xs text-muted-foreground">
              Showing 100 of {filtered.length} stations. Zoom in or search to
              narrow results.
            </p>
          )}
        </div>
      </ScrollArea>
    </div>
  )
}
