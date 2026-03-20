import dotenv from "dotenv"
dotenv.config()

import WDK from "@tetherto/wdk"
import WalletManagerEvm from "@tetherto/wdk-wallet-evm"

async function main(): Promise<void> {
  try {
    const seedPhrase = process.env.SEED_PHRASE
    const provider = process.env.SEPOLIA_RPC_URL

    if (!seedPhrase) throw new Error("SEED_PHRASE not set in .env")

    const wdk = new WDK(seedPhrase).registerWallet("ethereum", WalletManagerEvm, { provider })
    const account = await wdk.getAccount("ethereum", 0)
    const address = await account.getAddress()
    const balanceWei = await account.getBalance()
    const balanceEth = (Number(balanceWei) / Number(10n ** 18n)).toFixed(6)

    console.log("Address:", address)
    console.log("Balance:", balanceEth, "ETH")
    console.log("✅ STAGE 1 PASSED")
  } catch (err) {
    console.log("❌ STAGE 1 FAILED:", err)
  }
}

main()
