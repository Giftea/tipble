import { NextRequest, NextResponse } from "next/server"

const AGENT_API = process.env.NEXT_PUBLIC_AGENT_API ?? "http://localhost:3001"

export async function GET(req: NextRequest) {
  try {
    const seed = req.headers.get("x-seed-phrase")
    const headers: Record<string, string> = {}
    if (seed) headers["x-seed-phrase"] = seed
    const res = await fetch(`${AGENT_API}/api/status`, { cache: "no-store", headers })
    if (!res.ok) throw new Error(`Agent responded ${res.status}`)
    return NextResponse.json(await res.json())
  } catch {
    return NextResponse.json({ error: "Agent offline" }, { status: 503 })
  }
}
