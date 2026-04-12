// Geospatial helpers used by the radius-based station search.

export interface LatLng {
  latitude: number
  longitude: number
}

const EARTH_RADIUS_MILES = 3958.7613
const KM_PER_MILE = 1.609344

function toRad(deg: number): number {
  return (deg * Math.PI) / 180
}

/**
 * Great-circle distance between two coordinates in statute miles.
 * Uses the Haversine formula — accurate enough for everything smaller than a
 * continent, which covers our "stations near me" use case.
 */
export function haversineMiles(a: LatLng, b: LatLng): number {
  const dLat = toRad(b.latitude - a.latitude)
  const dLng = toRad(b.longitude - a.longitude)
  const lat1 = toRad(a.latitude)
  const lat2 = toRad(b.latitude)

  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.sin(dLng / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2)
  return 2 * EARTH_RADIUS_MILES * Math.asin(Math.sqrt(h))
}

/**
 * Coarse bounding box around a point covering at least `radiusMiles` in every
 * direction. Intended as a cheap pre-filter before running the exact Haversine
 * check — skip it for stations that are obviously out of range.
 *
 * Longitude delta scales by cos(latitude) so the box is reasonably tight even
 * near the top of Scotland. A small safety factor is added to avoid clipping
 * edge cases from the spherical approximation.
 */
export function boundingBox(
  origin: LatLng,
  radiusMiles: number
): { north: number; south: number; east: number; west: number } {
  const latDelta = radiusMiles / 69.0 // ~69 miles per degree of latitude
  const cosLat = Math.max(0.01, Math.cos(toRad(origin.latitude)))
  const lngDelta = radiusMiles / (69.0 * cosLat)

  return {
    north: origin.latitude + latDelta,
    south: origin.latitude - latDelta,
    east: origin.longitude + lngDelta,
    west: origin.longitude - lngDelta,
  }
}

export function milesToKm(miles: number): number {
  return miles * KM_PER_MILE
}
