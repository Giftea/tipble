import type { AgentStatus } from '../types'
import { getSettings, getSeedPhrase } from './storage'

const FALLBACK_URL = 'https://tipble-production.up.railway.app'

export async function getAgentUrl(): Promise<string> {
  const settings = await getSettings()
  const primary = settings.agentApiUrl

  // If the user has already set a non-localhost URL, use it directly
  if (!primary.includes('localhost') && !primary.includes('127.0.0.1')) {
    return primary
  }

  // Probe localhost with a 1.5 s timeout; fall back to Railway if unreachable
  try {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 1500)
    await fetch(`${primary}/api/status`, { signal: controller.signal })
    clearTimeout(timer)
    return primary
  } catch {
    return FALLBACK_URL
  }
}

export async function fetchStatus(): Promise<AgentStatus> {
  const url = await getAgentUrl()
  const seed = await getSeedPhrase()
  const headers: HeadersInit = seed ? { 'x-seed-phrase': seed } : {}
  const res = await fetch(`${url}/api/status`, { headers })
  return res.json()
}

export async function sendManualTip(
  reason: string,
  amount?: string,
  asset?: string
): Promise<{ success: boolean; hash?: string; sentTo?: string; amount?: string; asset?: string; error?: string; code?: string }> {
  const url = await getAgentUrl()
  const seed = await getSeedPhrase()
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(seed ? { 'x-seed-phrase': seed } : {})
  }

  const stored = await chrome.storage.local.get('currentCreatorWallet')
  const creatorAddress = stored.currentCreatorWallet?.evm ?? null

  const body: Record<string, string> = { reason }
  if (creatorAddress) body.creatorAddress = creatorAddress
  if (amount) body.amount = amount
  if (asset) body.asset = asset

  const res = await fetch(`${url}/api/tip/manual`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body)
  })

  try {
    return await res.json()
  } catch {
    return { success: false, error: 'Agent returned an unexpected error' }
  }
}

export async function fetchUsdtBalance(): Promise<{ balance: string; asset: string }> {
  const url = await getAgentUrl()
  const seed = await getSeedPhrase()
  const headers: HeadersInit = seed ? { 'x-seed-phrase': seed } : {}
  const res = await fetch(`${url}/api/wallet/usdt-balance`, { headers })
  return res.json()
}

export async function generateWallet(): Promise<{ seedPhrase: string; address: string }> {
  const url = await getAgentUrl()
  const res = await fetch(`${url}/api/wallet/generate`, { method: 'POST' })
  return res.json()
}

export async function validateWallet(seedPhrase: string): Promise<{
  valid: boolean
  address?: string
  balance?: string
  error?: string
}> {
  const url = await getAgentUrl()
  const res = await fetch(`${url}/api/wallet/validate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ seedPhrase })
  })
  return res.json()
}
