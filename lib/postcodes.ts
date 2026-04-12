// Lazy loader + parser for the bundled UK outcode dataset.
//
// The dataset at public/data/uk-outcodes.json maps outward codes (e.g. "SW1A")
// to [latitude, longitude] centroids. It's served as a static asset so it
// never lands in the JS bundle; we fetch it the first time a user actually
// interacts with the postcode search.

type OutcodeMap = Record<string, [number, number]>

let cache: OutcodeMap | null = null
let inflight: Promise<OutcodeMap> | null = null

export async function loadOutcodes(): Promise<OutcodeMap> {
  if (cache) return cache
  if (inflight) return inflight

  inflight = fetch("/data/uk-outcodes.json")
    .then(async (res) => {
      if (!res.ok) throw new Error(`Failed to load outcodes: HTTP ${res.status}`)
      const data = (await res.json()) as OutcodeMap
      cache = data
      return data
    })
    .finally(() => {
      inflight = null
    })

  return inflight
}

// UK outward codes match one of:
//   A9, A9A, A99, AA9, AA9A, AA99
// i.e. 1-2 letters, 1-2 digits, optional trailing letter.
const OUTCODE_RE = /^([A-Z]{1,2}\d{1,2}[A-Z]?)/

/**
 * Extract the outward code from a user-typed postcode string.
 * - Trims whitespace and uppercases.
 * - Accepts full postcodes ("SW1A 1AA") and bare outward codes ("SW1A", "m1").
 * - Returns null when no outward code prefix can be recognised.
 */
export function parseOutcode(input: string): string | null {
  const cleaned = input.trim().toUpperCase().replace(/\s+/g, "")
  if (!cleaned) return null
  const match = OUTCODE_RE.exec(cleaned)
  return match ? match[1] : null
}

export interface GeocodeResult {
  outcode: string
  latitude: number
  longitude: number
}

/**
 * Resolve a UK postcode (full or outward-only) to its outcode centroid.
 * Returns null when the input isn't a recognisable postcode, or when the
 * outcode isn't in the dataset (e.g. Channel Islands, Isle of Man).
 */
export async function geocodePostcode(
  input: string
): Promise<GeocodeResult | null> {
  const outcode = parseOutcode(input)
  if (!outcode) return null
  const map = await loadOutcodes()
  const hit = map[outcode]
  if (!hit) return null
  return { outcode, latitude: hit[0], longitude: hit[1] }
}
