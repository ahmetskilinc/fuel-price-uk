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
  let token: string
  try {
    token = jwt.sign(
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
  } catch (err) {
    // Most commonly thrown when MAPKIT_PRIVATE_KEY is malformed (bad PEM,
    // wrong curve, or mangled newline escaping). Log the underlying error
    // for debugging but don't echo it — it may quote key material.
    console.error("Failed to sign MapKit token:", err)
    return new Response("Failed to sign MapKit token", { status: 500 })
  }

  return new Response(token, {
    headers: {
      "content-type": "text/plain",
      "cache-control": "no-store",
    },
  })
}
