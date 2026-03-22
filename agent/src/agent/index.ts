import dotenv from "dotenv"
dotenv.config()

process.on('unhandledRejection', (reason: any) => {
  const isTimeout = reason?.code === 'TIMEOUT' ||
    reason?.message?.includes('timeout')
  if (isTimeout) {
    console.log('[agent] RPC timeout — will retry on next tick')
    return
  }
  console.error('[agent] Unhandled rejection:', reason)
})

process.on('uncaughtException', (err: any) => {
  const isTimeout = err?.code === 'TIMEOUT' ||
    err?.message?.includes('timeout')
  if (isTimeout) {
    console.log('[agent] RPC timeout — continuing...')
    return
  }
  console.error('[agent] Uncaught exception:', err)
})

import { logBalances } from "../wallet/balance.js"
import { getAgentAddress } from "../wallet/setup.js"
import { getConfig } from "../config/loader.js"
import { startServer } from "../api/server.js"

async function main(): Promise<void> {
  console.log("🦞 TIPBLE v1.0.0")

  const config = getConfig()
  console.log("Network:", config.agent.network)
  console.log("Demo mode:", config.agent.demoMode)
  console.log("LLM enabled:", config.agent.llmEnabled)
  console.log("Creator:", config.creator.walletAddress || "NOT SET")

  if (process.env.SEED_PHRASE) {
    const address = await getAgentAddress()
    console.log("Default wallet:", address)
    console.log("Demo mode available")
    await logBalances()
  } else {
    console.log("⚠️  No default wallet configured")
    console.log("Users must connect their own wallet")
    console.log("Demo mode unavailable without SEED_PHRASE")
  }

  startServer()
  console.log("[agent] Ready. Use POST /api/agent/start or /api/agent/demo to begin.")
}

main().catch(console.error)
