import { NextResponse } from "next/server"
import type { FuelStation, FuelDataResponse } from "@/lib/types"

const RETAILER_ENDPOINTS: Record<string, string> = {
  Asda: "https://storelocator.asda.com/fuel_prices_data.json",
  BP: "https://www.bp.com/en_gb/united-kingdom/home/fuelprices/fuel_prices_data.json",
  Esso: "https://fuelprices.esso.co.uk/latestdata.json",
  Morrisons: "https://www.morrisons.com/fuel-prices/fuel.json",
  "Motor Fuel Group":
    "https://fuel.motorfuelgroup.com/fuel_prices_data.json",
  Rontec:
    "https://www.rontec-servicestations.co.uk/fuel-prices/data/fuel_prices_data.json",
  "Sainsbury's":
    "https://api.sainsburys.co.uk/v1/exports/latest/fuel_prices_data.json",
  SGN: "https://www.sgnretail.uk/files/data/SGN_daily_fuel_prices.json",
  Tesco: "https://www.tesco.com/fuel_prices/fuel_prices_data.json",
  JET: "https://jetlocal.co.uk/fuel_prices_data.json",
}

function normalizeStation(
  raw: Record<string, unknown>,
  fallbackBrand: string,
): FuelStation | null {
  try {
    const location = raw.location as
      | { latitude: number; longitude: number }
      | undefined
    const prices = raw.prices as Record<string, number | null> | undefined

    if (!location?.latitude || !location?.longitude) return null

    return {
      site_id: String(raw.site_id ?? ""),
      brand: String(raw.brand ?? fallbackBrand),
      address: String(raw.address ?? ""),
      postcode: String(raw.postcode ?? ""),
      location: {
        latitude: Number(location.latitude),
        longitude: Number(location.longitude),
      },
      prices: {
        E10: prices?.E10 != null ? Number(prices.E10) : null,
        E5: prices?.E5 != null ? Number(prices.E5) : null,
        B7: prices?.B7 != null ? Number(prices.B7) : null,
        SDV: prices?.SDV != null ? Number(prices.SDV) : null,
      },
    }
  } catch {
    return null
  }
}

async function fetchRetailer(
  brand: string,
  url: string,
): Promise<FuelStation[]> {
  try {
    const res = await fetch(url, {
      next: { revalidate: 900 }, // cache 15 minutes
      headers: {
        "User-Agent": "UK-Fuel-Price-App/1.0",
        Accept: "application/json",
      },
    })
    if (!res.ok) return []
    const data = await res.json()
    const stations: unknown[] = data.stations ?? []
    return stations
      .map((s) => normalizeStation(s as Record<string, unknown>, brand))
      .filter((s): s is FuelStation => s !== null)
  } catch {
    return []
  }
}

export async function GET() {
  const results = await Promise.allSettled(
    Object.entries(RETAILER_ENDPOINTS).map(([brand, url]) =>
      fetchRetailer(brand, url),
    ),
  )

  const allStations: FuelStation[] = results.flatMap((r) =>
    r.status === "fulfilled" ? r.value : [],
  )

  const response: FuelDataResponse = {
    last_updated: new Date().toISOString(),
    stations: allStations,
  }

  return NextResponse.json(response, {
    headers: {
      "Cache-Control": "public, s-maxage=900, stale-while-revalidate=1800",
    },
  })
}
