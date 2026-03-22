import dotenv from "dotenv"
dotenv.config()

import { logBalances } from "../wallet/balance.js"
import { generateNewWallet } from "../wallet/setup.js"
import { getConfig } from "../config/loader.js"
import { startServer } from "../api/server.js"

async function main(): Promise<void> {
  console.log("🦞 TIPBLE v1.0.0")

  if (!process.env.SEED_PHRASE) {
    const { seedPhrase, address } = await generateNewWallet()
    console.log("⚠️  No wallet found.")
    console.log("Generated new wallet:")
    console.log("  Seed phrase:", seedPhrase)
    console.log("  Address:", address)
    console.log("Add SEED_PHRASE to .env and restart.")
    process.exit(0)
  }

  const config = getConfig()
  console.log("Network:", config.agent.network)
  console.log("Demo mode:", config.agent.demoMode)
  console.log("LLM enabled:", config.agent.llmEnabled)
  console.log("Creator:", config.creator.walletAddress || "NOT SET")

  await logBalances()
  startServer()
  console.log("[agent] Ready. Use POST /api/agent/start or /api/agent/demo to begin.")
}

main().catch(console.error)
