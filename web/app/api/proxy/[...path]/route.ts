import { NextRequest, NextResponse } from 'next/server'

const AGENT_URL = process.env.AGENT_API_URL
  || 'http://localhost:3001'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params
  const url = `${AGENT_URL}/api/${path.join('/')}`

  const headers: HeadersInit = {
    'Content-Type': 'application/json'
  }
  const seed = req.headers.get('x-seed-phrase')
  if (seed) headers['x-seed-phrase'] = seed

  try {
    const res = await fetch(url, { headers })
    const data = await res.json()
    return NextResponse.json(data)
  } catch(e) {
    return NextResponse.json(
      { error: 'Agent unreachable' },
      { status: 503 }
    )
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params
  const url = `${AGENT_URL}/api/${path.join('/')}`
  const body = await req.text()

  const headers: HeadersInit = {
    'Content-Type': 'application/json'
  }
  const seed = req.headers.get('x-seed-phrase')
  if (seed) headers['x-seed-phrase'] = seed

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers,
      body
    })
    const data = await res.json()
    return NextResponse.json(data)
  } catch(e) {
    return NextResponse.json(
      { error: 'Agent unreachable' },
      { status: 503 }
    )
  }
}
