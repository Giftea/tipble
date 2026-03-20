import { sendTip, ethToWei } from "../wallet/tip.js"
import { getConfig } from "../config/loader.js"
import { getTodayTotal } from "../storage/tiplog.js"
import type { TipDecision } from "../rumble/types.js"

export async function executeTip(decision: TipDecision, overrideCreatorAddress?: string): Promise<{ hash: string } | null> {
  if (!decision.shouldTip) return null

  const config = getConfig()
  const creatorAddress = overrideCreatorAddress || config.creator.walletAddress

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

  let hash: string
  try {
    ;({ hash } = await sendTip(creatorAddress, weiAmount))
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    if (msg.includes("already known") || msg.includes("nonce too low")) {
      console.log("[executor] ⚠️ Duplicate tx rejected by node — skipping")
      return null
    }
    throw err
  }

  console.log(
    `[TIPBLE] ✅ ${decision.amount} ${decision.asset} → ${creatorAddress} | ${decision.reason} | tx: ${hash}`
  )

  return { hash }
}
