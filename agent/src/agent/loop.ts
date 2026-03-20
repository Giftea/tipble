import { getStreamState } from "../rumble/client.js"
import { getMockSequence } from "../rumble/mock.js"
import { reasonAboutTip } from "../claude/reasoner.js"
import { executeTip } from "./executor.js"
import { getConfig } from "../config/loader.js"
import type { StreamState } from "../rumble/types.js"
import type { TipbleConfig } from "../config/types.js"

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

export const tipLog: TipEvent[] = []

async function tick(
  prevState: StreamState,
  curr: StreamState,
  config: TipbleConfig
): Promise<void> {
  const decision = await reasonAboutTip(prevState, curr, config)

  if (decision.shouldTip) {
    const result = await executeTip(decision)
    if (result) {
      tipLog.push({
        id: Date.now().toString(),
        timestamp: new Date().toISOString(),
        reason: decision.reason,
        amount: decision.amount,
        asset: decision.asset,
        txHash: result.hash,
        eventType: decision.eventType,
        confidence: decision.confidence,
      })
      if (tipLog.length > 50) tipLog.shift()
    }
  } else {
    process.stdout.write(".")
  }
}

export async function runLoop(): Promise<void> {
  const config = getConfig()
  const { demoMode, heartbeatMs } = config.agent
  let prevState: StreamState | null = null

  if (demoMode) {
    const sequence = getMockSequence()
    let mockIndex = 0

    return new Promise<void>((resolve) => {
      const timer = setInterval(async () => {
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

        await tick(prevState, curr, config)
        prevState = curr
      }, heartbeatMs)
    })
  } else {
    return new Promise<void>(() => {
      setInterval(async () => {
        try {
          const curr = await getStreamState()

          if (prevState === null) {
            prevState = curr
            return
          }

          await tick(prevState, curr, config)
          prevState = curr
        } catch (err) {
          console.error("[agent] Error fetching stream state:", err)
        }
      }, heartbeatMs)
    })
  }
}
