export interface TipEvent {
  id: string
  timestamp: string
  reason: string
  amount: string
  asset: string
  txHash: string
  eventType: string
  confidence: number
}

export interface AgentStatus {
  running: boolean
  network: string
  demoMode: boolean
  creator: { walletAddress: string; displayName: string }
  balance: string
  agentAddress: string
  tipsCount: number
  totalTipped: string
  recentTips: TipEvent[]
}

export interface WalletState {
  seedPhrase: string | null
  address: string | null
  balance: string | null
  connected: boolean
}

export interface ExtensionSettings {
  agentApiUrl: string
  autoTippingEnabled: boolean
  showBadge: boolean
  showNotifications: boolean
  llmEnabled: boolean
  anthropicApiKey: string
  network: string
  walletAddress: string | null
}
