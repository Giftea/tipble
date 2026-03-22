import { sendTip, sendUsdtTip, ethToWei } from "../wallet/tip.js"
import { getConfig } from "../config/loader.js"
import { getTodayTotal } from "../storage/tiplog.js"
import type { TipDecision } from "../rumble/types.js"

export async function executeTip(decision: TipDecision, overrideAddress?: string): Promise<{ hash: string } | null> {
  if (!decision.shouldTip) return null

  const config = getConfig()
  const addressUsed = overrideAddress || config.creator.walletAddress

  if (!addressUsed) {
    console.log("[executor] ⚠️ No creator wallet configured")
    return null
  }

  console.log(`[executor] Tipping: ${addressUsed} (${overrideAddress ? 'from extension' : 'from config'})`)

  // Enforce daily limit
  const todayTotal = getTodayTotal()
  const dailyLimit = parseFloat(config.budget.dailyLimitUsdt)
  if (todayTotal >= dailyLimit) {
    console.log(
      `[executor] ⚠️ Daily limit ${dailyLimit} reached (spent: ${todayTotal.toFixed(6)}) — skipping tip`
    )
    return null
  }

  // Cap tip at max per event
  const maxPerEvent = parseFloat(config.budget.maxTipPerEvent)
  const tipAmount = parseFloat(decision.amount)
  if (tipAmount > maxPerEvent) {
    console.log(
      `[executor] ⚠️ Tip amount ${tipAmount} exceeds max per event ${maxPerEvent} — capping at ${maxPerEvent}`
    )
    decision.amount = maxPerEvent.toFixed(6)
  }

  let hash: string
  try {
    if (decision.asset === 'USDT') {
      ;({ hash } = await sendUsdtTip(addressUsed, decision.amount, config.agent.network))
    } else {
      ;({ hash } = await sendTip(addressUsed, ethToWei(decision.amount)))
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    if (msg.includes("already known") || msg.includes("nonce too low")) {
      console.log("[executor] ⚠️ Duplicate tx rejected by node — skipping")
      return null
    }
    throw err
  }

  console.log(
    `[TIPBLE] ✅ ${decision.amount} ${decision.asset} → ${addressUsed} | ${decision.reason} | tx: ${hash}`
  )

  return { hash }
}
