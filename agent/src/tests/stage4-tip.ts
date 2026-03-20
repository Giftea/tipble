import dotenv from "dotenv"
dotenv.config()

import { getAgentAddress, getAgentAccount } from "../wallet/setup.js"
import { ethToWei, sendTip } from "../wallet/tip.js"
import { getBalance } from "../wallet/balance.js"

async function main(): Promise<void> {
  try {
    const balance = await getBalance()

    if (parseFloat(balance) === 0) {
      console.log("⚠️  Wallet empty. Fund with Sepolia ETH first.")
      process.exit(0)
    }

    const address = await getAgentAddress()
    const { hash } = await sendTip(address, ethToWei("0.000001"))

    console.log("TX hash:", hash)
    console.log(`https://sepolia.etherscan.io/tx/${hash}`)
    console.log("✅ STAGE 4 PASSED")
  } catch (err) {
    console.log("❌ STAGE 4 FAILED:", err)
  }
}

main()
