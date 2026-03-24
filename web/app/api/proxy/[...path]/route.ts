import { NextRequest, NextResponse } from 'next/server'

const AGENT_URL = process.env.AGENT_API_URL
  || process.env.NEXT_PUBLIC_AGENT_API
  || 'http://localhost:3001'

export async function GET(
  req: NextRequest,
  { params }: { params: { path: string[] } }
) {
  const path = params.path.join('/')
  const url = `${AGENT_URL}/api/${path}`

  const headers: HeadersInit = {
    'Content-Type': 'application/json'
  }
  const seed = req.headers.get('x-seed-phrase')
  if (seed) headers['x-seed-phrase'] = seed

  const res = await fetch(url, { headers })
  const data = await res.json()
  return NextResponse.json(data)
}

export async function POST(
  req: NextRequest,
  { params }: { params: { path: string[] } }
) {
  const path = params.path.join('/')
  const url = `${AGENT_URL}/api/${path}`
  const body = await req.text()

  const headers: HeadersInit = {
    'Content-Type': 'application/json'
  }
  const seed = req.headers.get('x-seed-phrase')
  if (seed) headers['x-seed-phrase'] = seed

  const res = await fetch(url, {
    method: 'POST',
    headers,
    body
  })
  const data = await res.json()
  return NextResponse.json(data)
}
