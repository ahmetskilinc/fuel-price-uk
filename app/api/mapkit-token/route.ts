import jwt from "jsonwebtoken"
import type { NextRequest } from "next/server"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET(req: NextRequest) {
  const teamId = process.env.MAPKIT_TEAM_ID
  const keyId = process.env.MAPKIT_KEY_ID
  const privateKey = process.env.MAPKIT_PRIVATE_KEY?.replace(/\\n/g, "\n")

  if (!teamId || !keyId || !privateKey) {
    return new Response("MapKit credentials not configured", { status: 500 })
  }

  const now = Math.floor(Date.now() / 1000)
  const token = jwt.sign(
    {
      iss: teamId,
      iat: now,
      exp: now + 60 * 30,
      origin: req.nextUrl.origin,
    },
    privateKey,
    {
      algorithm: "ES256",
      header: { alg: "ES256", kid: keyId, typ: "JWT" },
    },
  )

  return new Response(token, {
    headers: {
      "content-type": "text/plain",
      "cache-control": "no-store",
    },
  })
}
