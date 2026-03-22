import { NextResponse } from "next/server"

const AGENT_API = process.env.NEXT_PUBLIC_AGENT_API ?? "http://localhost:3001"

export async function GET() {
  try {
    const res = await fetch(`${AGENT_API}/api/wallet/usdt-balance`, { cache: "no-store" })
    if (!res.ok) throw new Error(`Agent responded ${res.status}`)
    return NextResponse.json(await res.json())
  } catch {
    return NextResponse.json({ error: "Agent offline" }, { status: 503 })
  }
}
