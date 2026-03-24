import type { AgentStatus, TipbleConfig } from "@/types"

const API_BASE = '/api/proxy'

export const SEED_KEY = "tipble_seed_phrase"
export const DEMO_KEY = "tipble_demo_mode"

export function getSeedPhrase(): string | null {
  return typeof window !== "undefined" ? localStorage.getItem(SEED_KEY) : null
}

export function getAuthHeaders(): HeadersInit {
  const seed = getSeedPhrase()
  return {
    "Content-Type": "application/json",
    ...(seed ? { "x-seed-phrase": seed } : {}),
  }
}

export async function fetchStatus(): Promise<AgentStatus> {
  const res = await fetch(`${API_BASE}/status`, { headers: getAuthHeaders() })
  if (!res.ok) throw new Error(`Failed to fetch status: ${res.statusText}`)
  return res.json()
}

export async function fetchConfig(): Promise<TipbleConfig> {
  const res = await fetch(`${API_BASE}/config`)
  if (!res.ok) throw new Error(`Failed to fetch config: ${res.statusText}`)
  return res.json()
}

export async function updateConfig(config: Partial<TipbleConfig>): Promise<void> {
  const res = await fetch(`${API_BASE}/config`, {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify(config),
  })
  if (!res.ok) throw new Error(`Failed to update config: ${res.statusText}`)
}

export async function sendManualTip(
  reason: string
): Promise<{ success: boolean; hash?: string }> {
  const res = await fetch(`${API_BASE}/tip/manual`, {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify({ reason }),
  })
  if (!res.ok) throw new Error(`Failed to send tip: ${res.statusText}`)
  return res.json()
}
