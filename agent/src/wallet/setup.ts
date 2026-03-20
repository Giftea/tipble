import dotenv from "dotenv"
import WDK from "@tetherto/wdk"
import WalletManagerEvm from "@tetherto/wdk-wallet-evm"
import { getConfig } from "../config/loader.js"

dotenv.config()

const SEED_PHRASE = process.env.SEED_PHRASE
const SEPOLIA_RPC_URL = process.env.SEPOLIA_RPC_URL
const POLYGON_RPC_URL = process.env.POLYGON_RPC_URL

if (!SEED_PHRASE) {
  throw new Error("SEED_PHRASE is not set in environment variables")
}

const network = getConfig().agent.network
const provider = network === "sepolia" ? SEPOLIA_RPC_URL : POLYGON_RPC_URL

export const wdk = new WDK(SEED_PHRASE)
  .registerWallet("ethereum", WalletManagerEvm, { provider })

export async function getAgentAccount() {
  return wdk.getAccount("ethereum", 0)
}

export async function getAgentAddress(): Promise<string> {
  return (await getAgentAccount()).getAddress()
}

export async function generateNewWallet(): Promise<{ seedPhrase: string; address: string }> {
  const seedPhrase = WDK.getRandomSeedPhrase()
  const tempWdk = new WDK(seedPhrase)
    .registerWallet("ethereum", WalletManagerEvm, { provider })
  const address = await (await tempWdk.getAccount("ethereum", 0)).getAddress()
  return { seedPhrase, address }
}

getAgentAddress().then(addr => console.log("[wallet] Agent address:", addr))
