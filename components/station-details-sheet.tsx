"use client"

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { HugeiconsIcon } from "@hugeicons/react"
import { Link04Icon } from "@hugeicons/core-free-icons"
import type { FuelStation, FuelType } from "@/lib/types"
import { FUEL_TYPE_LABELS } from "@/lib/types"
import { formatPrice, getPriceColor } from "@/lib/fuel"

interface StationDetailsSheetProps {
  station: FuelStation | null
  lastUpdated: string | null
  onClose: () => void
}

const FUEL_ORDER: FuelType[] = ["E10", "E5", "B7", "SDV"]

function formatRelative(iso: string | null): string | null {
  if (!iso) return null
  const then = new Date(iso).getTime()
  if (Number.isNaN(then)) return null
  const diffMs = Date.now() - then
  const diffMin = Math.round(diffMs / 60000)
  if (diffMin < 1) return "just now"
  if (diffMin < 60) return `${diffMin} min ago`
  const diffHr = Math.round(diffMin / 60)
  if (diffHr < 24) return `${diffHr} hr ago`
  const diffDay = Math.round(diffHr / 24)
  return `${diffDay} day${diffDay === 1 ? "" : "s"} ago`
}

export function StationDetailsSheet({
  station,
  lastUpdated,
  onClose,
}: StationDetailsSheetProps) {
  const relative = formatRelative(lastUpdated)
  const directionsHref = station
    ? `https://maps.google.com/?q=${encodeURIComponent(
        station.postcode || station.address,
      )}`
    : "#"

  return (
    <Sheet open={!!station} onOpenChange={(open) => !open && onClose()}>
      <SheetContent
        side="right"
        className="w-full gap-0 p-0 sm:max-w-[420px]"
      >
        {station && (
          <>
            <SheetHeader className="gap-1 p-5 pr-10">
              <SheetTitle className="text-lg">{station.brand}</SheetTitle>
              <SheetDescription className="text-sm">
                {station.address}
                {station.postcode ? `, ${station.postcode}` : ""}
              </SheetDescription>
            </SheetHeader>

            <Separator />

            <div className="flex flex-col gap-3 p-5">
              <h3 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                Fuel prices
              </h3>
              <ul className="flex flex-col gap-2">
                {FUEL_ORDER.map((type) => {
                  const price = station.prices[type]
                  return (
                    <li
                      key={type}
                      className="flex items-center justify-between gap-3 rounded-lg border border-border/60 bg-card px-3 py-2"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span
                          aria-hidden
                          className="h-2.5 w-2.5 shrink-0 rounded-full"
                          style={{ background: getPriceColor(price, type) }}
                        />
                        <span className="truncate text-sm font-medium text-foreground">
                          {FUEL_TYPE_LABELS[type]}
                        </span>
                      </div>
                      <span className="shrink-0 font-mono text-sm font-semibold tabular-nums">
                        {formatPrice(price)}
                      </span>
                    </li>
                  )
                })}
              </ul>
            </div>

            <Separator />

            <div className="flex flex-col gap-2 p-5">
              <Button
                variant="default"
                size="lg"
                render={
                  <a
                    href={directionsHref}
                    target="_blank"
                    rel="noopener noreferrer"
                  />
                }
              >
                <HugeiconsIcon
                  icon={Link04Icon}
                  size={16}
                  strokeWidth={2}
                />
                Get directions
              </Button>
            </div>

            {relative && (
              <div className="mt-auto border-t p-4">
                <p className="text-xs text-muted-foreground">
                  Prices last updated {relative}
                </p>
              </div>
            )}
          </>
        )}
      </SheetContent>
    </Sheet>
  )
}
