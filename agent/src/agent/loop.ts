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

export const tipLog: TipEvent[] = loadTipLog()
export let sessionTotal = 0
export let isPaused = false

export function setIsPaused(v: boolean) { isPaused = v }
export function resetSession() {
  sessionTotal = 0
  tipLog.length = 0
}

async function tick(prevState: StreamState, curr: StreamState): Promise<void> {
  if (isPaused) {
    console.log("[agent] Paused")
    return
  }

  const config = getConfig()

  if (!config.agent.autoTippingEnabled) {
    console.log("[agent] Auto-tipping disabled — skipping")
    return
  }

  const sessionLimit = parseFloat(config.budget.sessionLimitUsdt)
  if (sessionTotal >= sessionLimit) {
    console.log(
      `[agent] ⚠️ Session limit ${sessionLimit} reached — pausing auto-tipping`
    )
    return
  }

  const decision = await reasonAboutTip(prevState, curr, config)

  if (decision.shouldTip) {
    const result = await executeTip(decision)
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

export async function runLoop(): Promise<void> {
  const { demoMode, heartbeatMs } = getConfig().agent
  let prevState: StreamState | null = null
  let isRunning = false

  if (demoMode) {
    const sequence = getMockSequence()
    let mockIndex = 0

    return new Promise<void>((resolve) => {
      const timer = setInterval(async () => {
        if (isRunning) return
        if (mockIndex >= sequence.length) {
          console.log("\n[agent] Demo complete")
          clearInterval(timer)
          resolve()
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
    })
  } else {
    return new Promise<void>(() => {
      setInterval(async () => {
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
    })
  }
}
