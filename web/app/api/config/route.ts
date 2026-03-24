import { NextRequest, NextResponse } from "next/server"

const AGENT_API = process.env.AGENT_API_URL ?? 'http://localhost:3001'

export async function GET() {
  try {
    const res = await fetch(`${AGENT_API}/api/config`, { cache: "no-store" })
    if (!res.ok) throw new Error(`Agent responded ${res.status}`)
    const data = await res.json()
    return NextResponse.json(data)
  } catch {
    return NextResponse.json({ error: "Agent offline" }, { status: 503 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const res = await fetch(`${AGENT_API}/api/config`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    })
    if (!res.ok) throw new Error(`Agent responded ${res.status}`)
    const data = await res.json()
    return NextResponse.json(data)
  } catch {
    return NextResponse.json({ error: "Agent offline" }, { status: 503 })
  }
}
