import { NextRequest, NextResponse } from "next/server"

const AGENT_API = process.env.NEXT_PUBLIC_AGENT_API ?? "http://localhost:3001"

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const res = await fetch(`${AGENT_API}/api/tip/manual`, {
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
