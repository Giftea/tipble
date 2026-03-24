import { NextRequest, NextResponse } from "next/server"

const AGENT_API = process.env.AGENT_API_URL ?? 'http://localhost:3001'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const seed = req.headers.get("x-seed-phrase")
    const headers: Record<string, string> = { "Content-Type": "application/json" }
    if (seed) headers["x-seed-phrase"] = seed
    const res = await fetch(`${AGENT_API}/api/tip/manual`, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
    })
    if (!res.ok) throw new Error(`Agent responded ${res.status}`)
    return NextResponse.json(await res.json())
  } catch {
    return NextResponse.json({ error: "Agent offline" }, { status: 503 })
  }
}
