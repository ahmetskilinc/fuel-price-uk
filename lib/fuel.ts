import type { FuelType } from "@/lib/types"

export function formatPrice(price: number | null): string {
  if (price == null) return "N/A"
  return `${price.toFixed(1)}p`
}

export function getPriceColor(
  price: number | null,
  fuelType: FuelType,
): string {
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
