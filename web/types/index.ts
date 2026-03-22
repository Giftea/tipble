export interface TipEvent {
  id: string
  timestamp: string
  reason: string
  amount: string
  asset: string
  txHash: string
  eventType: string
  confidence: number
  reasoning?: string
}

export interface AgentLogEntry {
  id: string
  timestamp: string
  type: 'SYS' | 'INF' | 'EVT' | 'LLM' | 'ACT' | 'TX'
  message: string
}

export interface AgentStatus {
  running: boolean
  network: "sepolia" | "polygon"
  demoMode: boolean
  agentState: 'idle' | 'running' | 'demo' | 'paused'
  creator: {
    walletAddress: string
    displayName: string
  }
  balance: string
  agentAddress: string
  tipsCount: number
  totalTipped: string
  recentTips: TipEvent[]
  agentLog: AgentLogEntry[]
  eventsCount: number
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
    newFollower: {
      enabled: boolean
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
    autoTippingEnabled: boolean
  }
}
