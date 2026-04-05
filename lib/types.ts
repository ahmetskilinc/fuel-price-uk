export interface FuelStation {
  site_id: string
  brand: string
  address: string
  postcode: string
  location: {
    latitude: number
    longitude: number
  }
  prices: {
    E10: number | null // Unleaded
    E5: number | null // Super unleaded
    B7: number | null // Diesel
    SDV: number | null // Premium diesel
  }
}

export interface FuelDataResponse {
  last_updated: string
  stations: FuelStation[]
}

export type FuelType = "E10" | "E5" | "B7" | "SDV"

export const FUEL_TYPE_LABELS: Record<FuelType, string> = {
  E10: "Unleaded (E10)",
  E5: "Super Unleaded (E5)",
  B7: "Diesel (B7)",
  SDV: "Premium Diesel",
}

export const FUEL_TYPE_SHORT: Record<FuelType, string> = {
  E10: "Unleaded",
  E5: "Super",
  B7: "Diesel",
  SDV: "Premium",
}
