#!/usr/bin/env node
// One-shot script to build public/data/uk-outcodes.json.
//
// Source: https://github.com/Gibbs/uk-postcodes (CC/public mirror of ONS data).
// That CSV has ~2857 UK outcodes with columns:
//   postcode,eastings,northings,latitude,longitude,town,region,uk_region,country,country_string
// We only need the outcode + lat + lng and round to 5 decimal places (~1m precision).
//
// Output shape: { "SW1A": [51.50140, -0.14190], ... }
//
// Run once and commit the result:
//   node scripts/fetch-outcodes.mjs

import { writeFile, mkdir } from "node:fs/promises"
import { dirname, resolve } from "node:path"
import { fileURLToPath } from "node:url"

const SOURCE_URL =
  "https://raw.githubusercontent.com/Gibbs/uk-postcodes/master/postcodes.csv"

const __dirname = dirname(fileURLToPath(import.meta.url))
const outFile = resolve(__dirname, "..", "public", "data", "uk-outcodes.json")

async function main() {
  console.log(`Fetching ${SOURCE_URL}`)
  const res = await fetch(SOURCE_URL)
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const csv = await res.text()

  const lines = csv.split(/\r?\n/)
  const header = lines.shift()?.split(",") ?? []
  const iCode = header.indexOf("postcode")
  const iLat = header.indexOf("latitude")
  const iLng = header.indexOf("longitude")
  if (iCode < 0 || iLat < 0 || iLng < 0) {
    throw new Error(`unexpected CSV header: ${header.join(",")}`)
  }

  const map = {}
  for (const line of lines) {
    if (!line) continue
    const cols = line.split(",")
    const code = cols[iCode]?.trim().toUpperCase()
    const lat = Number(cols[iLat])
    const lng = Number(cols[iLng])
    if (!code || !Number.isFinite(lat) || !Number.isFinite(lng)) continue
    map[code] = [
      Math.round(lat * 1e5) / 1e5,
      Math.round(lng * 1e5) / 1e5,
    ]
  }

  await mkdir(dirname(outFile), { recursive: true })
  const body = JSON.stringify(map)
  await writeFile(outFile, body)

  const count = Object.keys(map).length
  const sizeKb = (body.length / 1024).toFixed(1)
  console.log(`Wrote ${count} outcodes to ${outFile} (${sizeKb} KB)`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
