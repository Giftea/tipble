import type { AgentStatus } from '../types'
import { getSettings, getSeedPhrase } from './storage'

export async function getAgentUrl(): Promise<string> {
  const settings = await getSettings()
  return settings.agentApiUrl
}

export async function fetchStatus(): Promise<AgentStatus> {
  const url = await getAgentUrl()
  const seed = await getSeedPhrase()
  const headers: HeadersInit = seed ? { 'x-seed-phrase': seed } : {}
  const res = await fetch(`${url}/api/status`, { headers })
  return res.json()
}

export async function sendManualTip(
  reason: string
): Promise<{ success: boolean; hash?: string }> {
  const url = await getAgentUrl()
  const seed = await getSeedPhrase()
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(seed ? { 'x-seed-phrase': seed } : {})
  }
  const res = await fetch(`${url}/api/tip/manual`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ reason })
  })
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
