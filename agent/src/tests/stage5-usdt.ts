import dotenv from "dotenv"
dotenv.config()

import { getAgentAddress } from "../wallet/setup.js"
import { getBalance, getUsdtBalance } from "../wallet/balance.js"
import { sendUsdtTip } from "../wallet/tip.js"

async function main(): Promise<void> {
  try {
    const address = await getAgentAddress()
    console.log("Agent address:", address)

    const eth = await getBalance()
    console.log("ETH balance:", eth, "ETH")

    const usdt = await getUsdtBalance()
    console.log("USDT balance:", usdt, "USDT")

    if (parseFloat(usdt) < 0.01) {
      console.log("⚠️  Insufficient USDT balance. Fund wallet with Base Sepolia USDT first.")
      console.log("    USDT contract: 0x50c5725949A6F0c72E6C4a641F24049A917DB0Cb")
      process.exit(0)
    }

    const { hash } = await sendUsdtTip(address, "0.01", "base-sepolia")

    console.log("TX hash:", hash)
    console.log(`https://sepolia.basescan.org/tx/${hash}`)
    console.log("✅ STAGE 5 USDT PASSED")
  } catch (err) {
    console.log("❌ STAGE 5 FAILED:", err)
  }
}

main()
