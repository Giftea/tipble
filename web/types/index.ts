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
  network: "sepolia" | "polygon"
  demoMode: boolean
  creator: {
    walletAddress: string
    displayName: string
  }
  balance: string
  agentAddress: string
  tipsCount: number
  totalTipped: string
  recentTips: TipEvent[]
}

export interface TipbleConfig {
  creator: {
    walletAddress: string
    displayName: string
  }
  rules: {
    followerMilestones: {
      enabled: boolean
      milestones: number[]
      tipAmount: string
      asset: string
    }
    newSubscriber: {
      enabled: boolean
      tipAmount: string
      asset: string
    }
    viewerSpike: {
      enabled: boolean
      thresholdMultiplier: number
      minimumViewers: number
      tipAmount: string
      asset: string
    }
    watchingNow: {
      enabled: boolean
      threshold: number
      tipAmount: string
      asset: string
    }
  }
  budget: {
    maxTipPerEvent: string
    dailyLimitUsdt: string
    sessionLimitUsdt: string
  }
  agent: {
    heartbeatMs: number
    demoMode: boolean
    network: string
    llmEnabled: boolean
    llmConfidenceThreshold: number
    anthropicApiKey?: string
  }
}
