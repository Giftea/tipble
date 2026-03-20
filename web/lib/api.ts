import type { AgentStatus, TipbleConfig } from "@/types"

export const AGENT_API =
  process.env.NEXT_PUBLIC_AGENT_API ?? "http://localhost:3001"

export async function fetchStatus(): Promise<AgentStatus> {
  const res = await fetch(`${AGENT_API}/api/status`)
  if (!res.ok) throw new Error(`Failed to fetch status: ${res.statusText}`)
  return res.json()
}

export async function fetchConfig(): Promise<TipbleConfig> {
  const res = await fetch(`${AGENT_API}/api/config`)
  if (!res.ok) throw new Error(`Failed to fetch config: ${res.statusText}`)
  return res.json()
}

export async function updateConfig(config: Partial<TipbleConfig>): Promise<void> {
  const res = await fetch(`${AGENT_API}/api/config`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(config),
  })
  if (!res.ok) throw new Error(`Failed to update config: ${res.statusText}`)
}

export async function sendManualTip(
  reason: string
): Promise<{ success: boolean; hash?: string }> {
  const res = await fetch(`${AGENT_API}/api/tip/manual`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ reason }),
  })
  if (!res.ok) throw new Error(`Failed to send tip: ${res.statusText}`)
  return res.json()
}
