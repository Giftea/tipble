export type AssetType = "USDT" | "XAUT" | "BTC" | "ETH"
export type NetworkType = "sepolia" | "polygon"

export interface CreatorConfig {
  walletAddress: string
  displayName: string
}

export interface FollowerMilestoneRule {
  enabled: boolean
  milestones: number[]
  tipAmount: string
  asset: AssetType
}

export interface NewSubscriberRule {
  enabled: boolean
  tipAmount: string
  asset: AssetType
}

export interface ViewerSpikeRule {
  enabled: boolean
  thresholdMultiplier: number
  minimumViewers: number
  tipAmount: string
  asset: AssetType
}

export interface WatchingNowRule {
  enabled: boolean
  threshold: number
  tipAmount: string
  asset: AssetType
}

export interface NewFollowerRule {
  enabled: boolean
  tipAmount: string
  asset: AssetType
}

export interface RulesConfig {
  followerMilestones: FollowerMilestoneRule
  newSubscriber: NewSubscriberRule
  viewerSpike: ViewerSpikeRule
  watchingNow: WatchingNowRule
  newFollower: NewFollowerRule
}

export interface BudgetConfig {
  maxTipPerEvent: string
  dailyLimitUsdt: string
  sessionLimitUsdt: string
}

export interface AgentConfig {
  heartbeatMs: number
  demoMode: boolean
  network: NetworkType
  llmEnabled: boolean
  llmConfidenceThreshold: number
  autoTippingEnabled: boolean
}

export interface TipbleConfig {
  creator: CreatorConfig
  rules: RulesConfig
  budget: BudgetConfig
  agent: AgentConfig
}
