import { NextResponse } from "next/server"

const AGENT_API = process.env.NEXT_PUBLIC_AGENT_API ?? "http://localhost:3001"

export async function GET() {
  try {
    const res = await fetch(`${AGENT_API}/api/status`, { cache: "no-store" })
    if (!res.ok) throw new Error(`Agent responded ${res.status}`)
    const data = await res.json()
    return NextResponse.json(data)
  } catch {
    return NextResponse.json({ error: "Agent offline" }, { status: 503 })
  }
}
