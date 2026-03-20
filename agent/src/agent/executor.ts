import { sendTip, ethToWei } from "../wallet/tip.js"
import { getConfig } from "../config/loader.js"
import { getTodayTotal } from "../storage/tiplog.js"
import type { TipDecision } from "../rumble/types.js"

export async function executeTip(decision: TipDecision): Promise<{ hash: string } | null> {
  if (!decision.shouldTip) return null

  const config = getConfig()
  const creatorAddress = config.creator.walletAddress

  if (!creatorAddress) {
    console.log("[executor] ⚠️ No creator wallet configured")
    return null
  }

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

  const weiAmount = ethToWei(decision.amount)
  const { hash } = await sendTip(creatorAddress, weiAmount)

  console.log(
    `[TIPBLE] ✅ ${decision.amount} ${decision.asset} → ${creatorAddress} | ${decision.reason} | tx: ${hash}`
  )

  return { hash }
}
