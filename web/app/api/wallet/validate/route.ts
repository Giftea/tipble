import { NextRequest, NextResponse } from "next/server"

const AGENT_API = process.env.NEXT_PUBLIC_AGENT_API ?? "http://localhost:3001"

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const res = await fetch(`${AGENT_API}/api/wallet/validate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    })
    if (!res.ok) throw new Error(`Agent responded ${res.status}`)
    return NextResponse.json(await res.json())
  } catch {
    return NextResponse.json({ valid: false, error: "Agent offline" }, { status: 503 })
  }
}
