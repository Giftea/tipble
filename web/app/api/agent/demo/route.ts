import { NextResponse } from "next/server"

const AGENT_API = process.env.AGENT_API_URL ?? 'http://localhost:3001'

export async function POST() {
  try {
    const res = await fetch(`${AGENT_API}/api/agent/demo`, { method: "POST" })
    if (!res.ok) throw new Error(`Agent responded ${res.status}`)
    return NextResponse.json(await res.json())
  } catch {
    return NextResponse.json({ error: "Agent offline" }, { status: 503 })
  }
}
