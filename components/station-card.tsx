"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import type { FuelStation, FuelType } from "@/lib/types"
import { FUEL_TYPE_SHORT } from "@/lib/types"

function getPriceBadgeVariant(
  price: number | null,
  fuelType: FuelType,
): "default" | "secondary" | "destructive" | "outline" {
  if (price == null) return "outline"
  const threshold = fuelType === "B7" || fuelType === "SDV" ? 145 : 140
  if (price < threshold) return "default"
  if (price < threshold + 10) return "secondary"
  return "destructive"
}

interface StationCardProps {
  station: FuelStation
  selectedFuelType: FuelType
  rank?: number
}

export function StationCard({
  station,
  selectedFuelType,
  rank,
}: StationCardProps) {
  const selectedPrice = station.prices[selectedFuelType]

  return (
    <Card className="transition-colors hover:bg-accent/50">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <CardTitle className="flex items-center gap-2 text-sm">
              {rank != null && (
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                  {rank}
                </span>
              )}
              {station.brand}
            </CardTitle>
            <p className="mt-1 text-xs text-muted-foreground">
              {station.address}
            </p>
            {station.postcode && (
              <p className="text-xs font-medium text-muted-foreground">
                {station.postcode}
              </p>
            )}
          </div>
          {selectedPrice != null && (
            <Badge
              variant={getPriceBadgeVariant(selectedPrice, selectedFuelType)}
              className="shrink-0 text-sm font-bold"
            >
              {selectedPrice.toFixed(1)}p
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <Separator className="my-2" />
        <div className="grid grid-cols-2 gap-x-4 gap-y-1">
          {(["E10", "E5", "B7", "SDV"] as FuelType[]).map((type) => {
            const price = station.prices[type]
            return (
              <div
                key={type}
                className={`flex items-center justify-between text-xs ${
                  type === selectedFuelType
                    ? "font-semibold text-foreground"
                    : "text-muted-foreground"
                }`}
              >
                <span>{FUEL_TYPE_SHORT[type]}</span>
                <span>{price != null ? `${price.toFixed(1)}p` : "—"}</span>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
