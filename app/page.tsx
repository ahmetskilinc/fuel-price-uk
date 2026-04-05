"use client"

import { useEffect, useState, useCallback } from "react"
import dynamic from "next/dynamic"
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { SearchPanel } from "@/components/search-panel"
import { HugeiconsIcon } from "@hugeicons/react"
import { Menu01Icon } from "@hugeicons/core-free-icons"
import type { FuelStation, FuelType, FuelDataResponse } from "@/lib/types"

const FuelMap = dynamic(
  () => import("@/components/fuel-map").then((mod) => ({ default: mod.FuelMap })),
  { ssr: false },
)

// Default center: roughly the middle of the UK
const UK_CENTER: [number, number] = [53.5, -2.5]
const DEFAULT_ZOOM = 7

export default function Page() {
  const [stations, setStations] = useState<FuelStation[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedFuelType, setSelectedFuelType] = useState<FuelType>("E10")
  const [sortBy, setSortBy] = useState<"price" | "name">("price")
  const [mapCenter, setMapCenter] = useState<[number, number]>(UK_CENTER)
  const [mapZoom, setMapZoom] = useState(DEFAULT_ZOOM)
  const [mobileOpen, setMobileOpen] = useState(false)

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetch("/api/fuel-prices")
        if (!res.ok) throw new Error("Failed to fetch")
        const data: FuelDataResponse = await res.json()
        setStations(data.stations)
      } catch (err) {
        console.error("Failed to load fuel prices:", err)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  // Called from sidebar list — pan the map to the station
  const handleSidebarSelect = useCallback((station: FuelStation) => {
    setMapCenter([station.location.latitude, station.location.longitude])
    setMapZoom(15)
    setMobileOpen(false)
  }, [])

  // Called from map marker click — popup opens automatically, no need to pan
  const handleMapSelect = useCallback(() => {}, [])

  return (
    <div className="flex h-svh w-full">
      {/* Desktop sidebar */}
      <aside className="hidden w-[400px] shrink-0 border-r md:flex md:flex-col">
        <SearchPanel
          stations={stations}
          loading={loading}
          selectedFuelType={selectedFuelType}
          onFuelTypeChange={setSelectedFuelType}
          onStationSelect={handleSidebarSelect}
          sortBy={sortBy}
          onSortChange={setSortBy}
        />
      </aside>

      {/* Map area */}
      <main className="relative flex-1">
        <FuelMap
          stations={stations}
          selectedFuelType={selectedFuelType}
          onStationSelect={handleMapSelect}
          center={mapCenter}
          zoom={mapZoom}
        />

        {/* Mobile sheet trigger */}
        <div className="absolute top-4 left-4 z-[1000] md:hidden">
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger
              render={
                <Button size="icon" className="shadow-lg" />
              }
            >
              <HugeiconsIcon icon={Menu01Icon} size={20} strokeWidth={2} />
              <span className="sr-only">Open menu</span>
            </SheetTrigger>
            <SheetContent side="left" className="w-[85vw] sm:max-w-[400px] p-0" showCloseButton={false}>
              <SheetTitle className="sr-only">Station search</SheetTitle>
              <SearchPanel
                stations={stations}
                loading={loading}
                selectedFuelType={selectedFuelType}
                onFuelTypeChange={setSelectedFuelType}
                onStationSelect={handleSidebarSelect}
                sortBy={sortBy}
                onSortChange={setSortBy}
              />
            </SheetContent>
          </Sheet>
        </div>

        {/* Loading overlay */}
        {loading && (
          <div className="absolute inset-0 z-[999] flex items-center justify-center bg-background/80">
            <div className="flex flex-col items-center gap-3">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
              <p className="text-sm text-muted-foreground">
                Loading fuel prices across the UK...
              </p>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
