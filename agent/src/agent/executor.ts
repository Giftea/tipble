import { sendTip, ethToWei } from "../wallet/tip.js"
import type { TipDecision } from "../rumble/types.js"
import { getConfig } from "../config/loader.js"

export async function executeTip(decision: TipDecision): Promise<{ hash: string } | null> {
  if (!decision.shouldTip) return null

  const creatorAddress = getConfig().creator.walletAddress

  if (!creatorAddress) {
    console.log("[executor] ⚠️ No creator wallet configured")
    return null
  }

  const weiAmount = ethToWei(decision.amount)
  const { hash } = await sendTip(creatorAddress, weiAmount)

  console.log(
    `[TIPBLE] ✅ ${decision.amount} ${decision.asset} → ${creatorAddress} | ${decision.reason} | tx: ${hash}`
  )

  return { hash }
}
