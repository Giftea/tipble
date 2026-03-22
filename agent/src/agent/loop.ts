import { getStreamState } from "../rumble/client.js"
import { getMockSequence } from "../rumble/mock.js"
import { reasonAboutTip } from "../claude/reasoner.js"
import { executeTip } from "./executor.js"
import { getConfig } from "../config/loader.js"
import { loadTipLog, appendTip } from "../storage/tiplog.js"
import type { StreamState } from "../rumble/types.js"

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

export interface AgentLogEntry {
  id: string
  timestamp: string
  type: 'SYS' | 'INF' | 'EVT' | 'LLM' | 'ACT' | 'TX'
  message: string
}

export const tipLog: TipEvent[] = loadTipLog()
export const agentLog: AgentLogEntry[] = []
export let sessionTotal = 0
export let isPaused = false
export let overrideCreatorAddress: string | null = null
export let agentState: 'idle' | 'running' | 'demo' | 'paused' = 'idle'

function log(type: AgentLogEntry['type'], message: string): void {
  const entry: AgentLogEntry = {
    id: Date.now().toString() + Math.random(),
    timestamp: new Date().toTimeString().slice(0, 8),
    type,
    message,
  }
  agentLog.push(entry)
  if (agentLog.length > 200) agentLog.shift()
  console.log(`[${type}] ${message}`)
}

export function setIsPaused(v: boolean) {
  isPaused = v
  if (v) agentState = 'paused'
}

export function resetSession() {
  sessionTotal = 0
  tipLog.length = 0
}

export function setCreatorAddress(address: string): void {
  overrideCreatorAddress = address
  log('SYS', `Creator address overridden: ${address}`)
}

// ─── Tick ─────────────────────────────────────────────────────────────────────

async function tick(prevState: StreamState, curr: StreamState): Promise<void> {
  if (isPaused) {
    log('SYS', 'Agent paused — skipping tick')
    return
  }

  const config = getConfig()

  if (!config.agent.autoTippingEnabled) {
    log('INF', 'Auto-tipping disabled — skipping')
    return
  }

  const sessionLimit = parseFloat(config.budget.sessionLimitUsdt)
  if (sessionTotal >= sessionLimit) {
    log('SYS', `Session limit ${sessionLimit} reached — pausing auto-tipping`)
    return
  }

  log('INF', `Polling stream state... followers: ${curr.num_followers}, subscribers: ${curr.num_subscribers}, watching: ${curr.watching_now}`)

  // In demo mode skip real LLM and real tx — use rule-based mock decision
  const isDemo = agentState === 'demo'

  let decision: Awaited<ReturnType<typeof reasonAboutTip>>

  if (isDemo) {
    const newSub = curr.latest_subscriber_username !== prevState.latest_subscriber_username && curr.latest_subscriber_username !== null
    const milestoneHit = curr.num_followers >= 1000 && prevState.num_followers < 1000
    const viewerSpike = curr.watching_now >= prevState.watching_now * 1.5 && curr.watching_now > 200

    if (milestoneHit) {
      decision = { shouldTip: true, amount: '0.001', asset: 'ETH', reason: '1000 followers milestone!', eventType: 'follower_milestone', confidence: 0.95 }
    } else if (newSub) {
      decision = { shouldTip: true, amount: '0.0005', asset: 'ETH', reason: `New subscriber: ${curr.latest_subscriber_username}`, eventType: 'new_subscriber', confidence: 0.90 }
    } else if (viewerSpike) {
      decision = { shouldTip: true, amount: '0.0003', asset: 'ETH', reason: `Viewer spike to ${curr.watching_now}`, eventType: 'viewer_spike', confidence: 0.80 }
    } else {
      decision = { shouldTip: false, amount: '0', asset: 'ETH', reason: 'No significant event', eventType: 'none', confidence: 0.10 }
    }
    log('LLM', `Mock decision: ${decision.shouldTip ? 'TIP' : 'SKIP'} | confidence: ${decision.confidence} | reason: ${decision.reason}`)
  } else {
    log('LLM', 'Evaluating event with Claude AI...')
    decision = await reasonAboutTip(prevState, curr, config)
    log('LLM', `Claude decision: ${decision.shouldTip ? 'TIP' : 'SKIP'} | confidence: ${decision.confidence} | reason: ${decision.reason}`)
  }

  if (decision.shouldTip) {
    log('EVT', `${decision.eventType} — ${JSON.stringify({ followers: curr.num_followers, subscribers: curr.num_subscribers, watching: curr.watching_now })}`)
    log('ACT', `→ Tip ${decision.amount} ${decision.asset} | ${decision.reason} | confidence: ${decision.confidence}`)

    let result: { hash: string } | null = null
    if (isDemo) {
      result = { hash: '0x' + Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join('') }
      log('TX', `TX confirmed (demo): ${result.hash}`)
    } else {
      result = await executeTip(decision, overrideCreatorAddress ?? undefined)
      if (result) log('TX', `TX confirmed: ${result.hash}`)
    }

    if (result) {
      sessionTotal += parseFloat(decision.amount)

      const tipEvent: TipEvent = {
        id: Date.now().toString(),
        timestamp: new Date().toISOString(),
        reason: decision.reason,
        amount: decision.amount,
        asset: decision.asset,
        txHash: result.hash,
        eventType: decision.eventType,
        confidence: decision.confidence,
      }
      tipLog.push(tipEvent)
      if (tipLog.length > 50) tipLog.shift()
      appendTip(tipEvent)
    }
  } else {
    process.stdout.write(".")
  }
}

// ─── Agent control ────────────────────────────────────────────────────────────

let activeTimer: ReturnType<typeof setInterval> | null = null

export function startAgent(): void {
  if (agentState === 'running' || agentState === 'demo') {
    log('SYS', 'Agent already running')
    return
  }

  agentState = 'running'
  isPaused = false
  log('SYS', 'Agent started')

  const { heartbeatMs } = getConfig().agent
  let prevState: StreamState | null = null
  let isRunning = false

  activeTimer = setInterval(async () => {
    if (isRunning) return
    isRunning = true
    try {
      const curr = await getStreamState()
      if (prevState === null) {
        prevState = curr
        return
      }
      await tick(prevState, curr)
      prevState = curr
    } catch (err) {
      console.error("[agent] Error fetching stream state:", err)
    } finally {
      isRunning = false
    }
  }, heartbeatMs)
}

export function startDemo(single = false): void {
  const sequence = getMockSequence()

  // Single-event mode: run only the 1000-follower milestone tick (states 2→3)
  if (single) {
    log('SYS', 'Test event: triggering 1000-follower milestone...')
    void tick(sequence[2], sequence[3])
    return
  }

  if (agentState === 'running' || agentState === 'demo') {
    log('SYS', 'Agent already running')
    return
  }

  agentState = 'demo'
  isPaused = false
  log('SYS', 'Demo sequence starting...')

  const { heartbeatMs } = getConfig().agent
  let mockIndex = 0
  let prevState: StreamState | null = null
  let isRunning = false

  activeTimer = setInterval(async () => {
    if (isRunning) return

    if (mockIndex >= sequence.length) {
      clearInterval(activeTimer!)
      activeTimer = null
      agentState = 'idle'
      log('SYS', 'Demo sequence complete.')
      return
    }

    const curr = sequence[mockIndex++]

    if (prevState === null) {
      prevState = curr
      return
    }

    isRunning = true
    try {
      await tick(prevState, curr)
    } finally {
      prevState = curr
      isRunning = false
    }
  }, heartbeatMs)
}

export function stopAgent(): void {
  if (activeTimer !== null) {
    clearInterval(activeTimer)
    activeTimer = null
  }
  agentState = 'idle'
  sessionTotal = 0
  log('SYS', 'Agent stopped')
}

// ─── Legacy entry point (no-op — agent starts idle) ───────────────────────────

export async function runLoop(): Promise<void> {
  agentState = 'idle'
  log('SYS', 'Tipble agent ready. Waiting for start.')
}
