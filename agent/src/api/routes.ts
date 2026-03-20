import { Router } from "express"
import { tipLog } from "../agent/loop.js"
import { getConfig, saveConfig } from "../config/loader.js"
import { getBalance } from "../wallet/balance.js"
import { getAgentAddress, generateNewWallet } from "../wallet/setup.js"
import { executeTip } from "../agent/executor.js"

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
  res.json({ success: true })
})

router.post("/tip/manual", async (req, res) => {
  const config = getConfig()
  const decision = {
    shouldTip: true,
    amount: config.rules.newSubscriber.tipAmount,
    asset: config.rules.newSubscriber.asset,
    reason: (req.body.reason as string) ?? "Manual tip",
    eventType: "manual",
    confidence: 1.0,
  }
  const result = await executeTip(decision)
  res.json(
    result
      ? { success: true, hash: result.hash }
      : { success: false, error: "No creator wallet set" }
  )
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

export default router
