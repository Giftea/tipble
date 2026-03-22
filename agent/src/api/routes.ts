import { Router } from "express"
import { tipLog, agentLog, sessionTotal, isPaused, setIsPaused, resetSession, setCreatorAddress, clearCreatorAddress, agentState, startAgent, startDemo, stopAgent } from "../agent/loop.js"
import { getConfig, saveConfig } from "../config/loader.js"
import { getBalance, getUsdtBalance } from "../wallet/balance.js"
import { getAgentAddress, generateNewWallet } from "../wallet/setup.js"
import { executeTip } from "../agent/executor.js"
import { getTodayTotal, saveTipLog, appendTip } from "../storage/tiplog.js"
import { reasonAboutTip } from "../claude/reasoner.js"
import type { StreamState } from "../rumble/types.js"
import type { TipEvent } from "../agent/loop.js"

const router = Router()

router.get("/status", async (_req, res) => {
  const config = getConfig()
  res.json({
    running: true,
    network: config.agent.network,
    demoMode: config.agent.demoMode,
    creator: config.creator,
    balance: await getBalance(),
    agentAddress: await getAgentAddress(),
    tipsCount: tipLog.length,
    totalTipped: tipLog
      .reduce((sum, t) => sum + parseFloat(t.amount), 0)
      .toFixed(6),
    recentTips: tipLog.slice(-20).reverse(),
    todayTotal: getTodayTotal(),
    sessionTotal,
    agentState,
    agentLog: agentLog.slice(-50).reverse(),
    eventsCount: agentLog.filter(l => l.type === 'EVT').length,
    limitsEnforced: true,
  })
})

router.get("/tips", (_req, res) => {
  res.json([...tipLog].reverse())
})

router.get("/config", (_req, res) => {
  res.json(getConfig())
})

router.post("/config", (req, res) => {
  const current = getConfig()
  const merged = { ...current, ...req.body }
  saveConfig(merged)
  console.log("[api] Config saved — agent will pick up changes on next heartbeat")
  res.json({ success: true, message: "Changes will take effect on next heartbeat" })
})

router.post("/tip/manual", async (req, res) => {
  const { reason, creatorAddress, amount, asset } = req.body as {
    reason?: string
    creatorAddress?: string
    amount?: string
    asset?: string
  }
  const config = getConfig()

  const targetAddress = creatorAddress || config.creator.walletAddress
  if (!targetAddress) {
    res.status(400).json({
      success: false,
      error: "No creator address. Visit a Rumble video with Wallet enabled."
    })
    return
  }

  const tipAmount = amount || config.rules.newSubscriber.tipAmount
  const tipAsset = asset || config.rules.newSubscriber.asset

  const decision = {
    shouldTip: true,
    amount: tipAmount,
    asset: tipAsset,
    reason: reason ?? "Manual tip",
    eventType: "manual",
    confidence: 1.0,
  }
  const result = await executeTip(decision, targetAddress)

  if (!result) {
    res.json({ success: false, error: "Tip execution failed" })
    return
  }

  const tipEvent: TipEvent = {
    id: Date.now().toString() + Math.random(),
    timestamp: new Date().toISOString(),
    reason: decision.reason,
    amount: tipAmount,
    asset: tipAsset,
    txHash: result.hash,
    eventType: "manual",
    confidence: 1.0,
  }
  tipLog.push(tipEvent)
  appendTip(tipEvent)
  agentLog.push({
    id: tipEvent.id,
    timestamp: new Date().toTimeString().slice(0, 8),
    type: 'TX',
    message: `${tipAmount} ${tipAsset} → ${targetAddress.slice(0, 6)}... | Manual tip | ${result.hash.slice(0, 10)}...`
  })

  res.json({ success: true, hash: result.hash, sentTo: targetAddress, amount: tipAmount, asset: tipAsset })
})

router.post("/creator/set", (req, res) => {
  const { address, displayName, pageUrl } = req.body as {
    address: string
    displayName?: string
    pageUrl?: string
  }

  if (!address || !address.startsWith('0x') || address.length !== 42) {
    res.status(400).json({ success: false, error: "Invalid EVM address" })
    return
  }

  const config = getConfig()
  config.creator.walletAddress = address
  if (displayName) config.creator.displayName = displayName
  saveConfig(config)

  setCreatorAddress(address)

  console.log(`[api] Creator address updated to: ${address}${pageUrl ? ` (from ${pageUrl})` : ''}`)
  res.json({ success: true, address })
})

router.post("/creator/clear", (_req, res) => {
  clearCreatorAddress()
  console.log("[api] Creator address cleared")
  res.json({ success: true })
})

// ── Agent control ─────────────────────────────────────────────

router.post("/agent/pause", (_req, res) => {
  setIsPaused(true)
  console.log("[api] Agent paused")
  res.json({ success: true, paused: true })
})

router.post("/agent/resume", (_req, res) => {
  setIsPaused(false)
  console.log("[api] Agent resumed")
  res.json({ success: true, paused: false })
})

router.post("/agent/start", (_req, res) => {
  startAgent()
  res.json({ success: true, state: 'running' })
})

router.post("/agent/demo", (req, res) => {
  const single = (req.body as { single?: boolean })?.single === true
  startDemo(single)
  res.json({ success: true, state: single ? agentState : 'demo' })
})

router.post("/agent/stop", (_req, res) => {
  stopAgent()
  res.json({ success: true, state: 'idle' })
})

router.get("/agent/status", (_req, res) => {
  const config = getConfig()
  res.json({
    running: true,
    paused: isPaused,
    autoTippingEnabled: config.agent.autoTippingEnabled,
    sessionTotal,
    todayTotal: getTodayTotal(),
    dailyLimit: config.budget.dailyLimitUsdt,
    sessionLimit: config.budget.sessionLimitUsdt,
    tipsCount: tipLog.length,
    network: config.agent.network,
    demoMode: config.agent.demoMode,
  })
})

// ── Data ──────────────────────────────────────────────────────

router.post("/data/reset", (_req, res) => {
  saveTipLog([])
  resetSession()
  console.log("[api] Tip history cleared and session reset")
  res.json({ success: true, message: "Data cleared" })
})

router.post("/agent/log/clear", (_req, res) => {
  agentLog.splice(0, agentLog.length)
  console.log("[api] Agent log cleared")
  res.json({ success: true })
})

// ── Wallet ────────────────────────────────────────────────────

router.get("/wallet/usdt-balance", async (_req, res) => {
  res.json({ balance: await getUsdtBalance(), asset: 'USDT' })
})

router.post("/wallet/generate", async (_req, res) => {
  const result = await generateNewWallet()
  res.json(result)
})

router.post("/wallet/save", (req, res) => {
  const { seedPhrase } = req.body as { seedPhrase: string }
  console.log("[wallet] Seed phrase save requested. Add this to your .env file:")
  console.log(`SEED_PHRASE="${seedPhrase}"`)
  res.json({ success: true, message: "Add this seed phrase to your .env file" })
})

// ── Stream events from extension DOM monitor ──────────────────────────────────

router.post("/stream/event", async (req, res) => {
  const { eventType, watchingNow, prevWatching, creatorAddress, creatorName } = req.body as {
    eventType: string
    watchingNow: number
    prevWatching: number
    creatorAddress: string
    creatorName: string
    pageUrl: string
  }

  const config = getConfig()

  if (!config.agent.autoTippingEnabled) {
    res.json({ success: true, tipped: false, reason: "Auto-tipping disabled" })
    return
  }

  // Log the incoming event
  agentLog.push({
    id: Date.now().toString() + Math.random(),
    timestamp: new Date().toTimeString().slice(0, 8),
    type: 'EVT',
    message: `${eventType} — viewer: ${watchingNow} (prev: ${prevWatching}) from ${creatorName ?? creatorAddress}`
  })

  // Deterministic rules — skip Claude
  let decision: { shouldTip: boolean; amount: string; asset: string; reason: string; eventType: string; confidence: number }

  if (eventType === 'watch_time_reached') {
    const rule = config.rules.watchTime
    if (!rule.enabled) {
      res.json({ success: true, tipped: false, reason: "Watch time rule disabled" })
      return
    }
    console.log(`[agent] Watch time tip: ${rule.tipAmount} ${rule.asset} → ${creatorAddress}`)
    decision = { shouldTip: true, amount: rule.tipAmount, asset: rule.asset, reason: "Watch time reached", eventType, confidence: 1.0 }

  } else if (eventType === 'subscriber_action') {
    const rule = config.rules.newSubscriberDetected
    if (!rule.enabled) {
      res.json({ success: true, tipped: false, reason: "Subscriber action rule disabled" })
      return
    }
    console.log(`[agent] Subscriber action tip fired`)
    decision = { shouldTip: true, amount: rule.tipAmount, asset: rule.asset, reason: "Subscribed to creator", eventType, confidence: 1.0 }

  } else if (eventType === 'new_viewer') {
    const rule = config.rules.watchingNow
    if (!rule.enabled) {
      res.json({ success: true, tipped: false, reason: "Watching now rule disabled" })
      return
    }
    console.log(`[agent] New viewer tip: ${rule.tipAmount} ${rule.asset} → ${creatorAddress}`)
    decision = { shouldTip: true, amount: rule.tipAmount, asset: rule.asset, reason: "New viewer watching", eventType, confidence: 1.0 }

  } else {
    // LLM-based reasoning for viewer spikes etc.
    const curr: StreamState = {
      num_followers: 0,
      num_followers_total: 0,
      num_subscribers: 0,
      watching_now: watchingNow,
      is_live: true,
      latest_subscriber_username: null,
      latest_follower_username: null,
      timestamp: Date.now()
    }
    const prev: StreamState = { ...curr, watching_now: prevWatching }
    decision = await reasonAboutTip(prev, curr, config)
  }

  if (!decision.shouldTip) {
    res.json({ success: true, tipped: false, reason: decision.reason })
    return
  }

  const result = await executeTip(decision, creatorAddress)

  if (!result) {
    res.json({ success: false, error: "Tip execution failed" })
    return
  }

  const tipEvent: TipEvent = {
    id: Date.now().toString() + Math.random(),
    timestamp: new Date().toISOString(),
    reason: decision.reason,
    amount: decision.amount,
    asset: decision.asset,
    txHash: result.hash,
    eventType,
    confidence: decision.confidence
  }

  tipLog.push(tipEvent)
  appendTip(tipEvent)
  agentLog.push({
    id: tipEvent.id,
    timestamp: new Date().toTimeString().slice(0, 8),
    type: 'TX',
    message: `${decision.amount} ${decision.asset} → ${creatorName} | ${decision.reason} | ${result.hash.slice(0, 10)}...`
  })

  res.json({ success: true, tipped: true, hash: result.hash })
})

export default router
