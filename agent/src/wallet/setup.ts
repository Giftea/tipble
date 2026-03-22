import dotenv from "dotenv"
import WDK from "@tetherto/wdk"
import WalletManagerEvm from "@tetherto/wdk-wallet-evm"
import { getConfig } from "../config/loader.js"

dotenv.config()

const SEED_PHRASE = process.env.SEED_PHRASE
const SEPOLIA_RPC_URL = process.env.SEPOLIA_RPC_URL
const BASE_SEPOLIA_RPC_URL = process.env.BASE_SEPOLIA_RPC_URL
const POLYGON_RPC_URL = process.env.POLYGON_RPC_URL

const network = getConfig().agent.network
const provider =
  network === 'polygon'      ? POLYGON_RPC_URL :
  network === 'base-sepolia' ? BASE_SEPOLIA_RPC_URL :
  SEPOLIA_RPC_URL

export const wdk = SEED_PHRASE
  ? new WDK(SEED_PHRASE).registerWallet("ethereum", WalletManagerEvm, { provider })
  : null

export async function getAgentAccount() {
  if (!wdk) throw new Error("No default wallet — set SEED_PHRASE in .env or use x-seed-phrase header")
  return wdk.getAccount("ethereum", 0)
}

export async function getAgentAddress(): Promise<string> {
  return (await getAgentAccount()).getAddress()
}

export async function createWalletFromSeed(
  seedPhrase: string
): Promise<{ account: any; address: string; balance: string }> {
  const config = getConfig()
  const net = config.agent.network
  const rpc =
    net === 'polygon'      ? POLYGON_RPC_URL :
    net === 'base-sepolia' ? BASE_SEPOLIA_RPC_URL :
    SEPOLIA_RPC_URL

  const tempWdk = new WDK(seedPhrase.trim())
    .registerWallet("ethereum", WalletManagerEvm, { provider: rpc })
  const account = await tempWdk.getAccount("ethereum", 0)
  const address = await account.getAddress()
  const balanceWei = await account.getBalance()
  const balance = (Number(balanceWei) / 1e18).toFixed(6)
  return { account, address, balance }
}

export async function generateNewWallet(): Promise<{ seedPhrase: string; address: string }> {
  const seedPhrase = WDK.getRandomSeedPhrase()
  const tempWdk = new WDK(seedPhrase)
    .registerWallet("ethereum", WalletManagerEvm, { provider })
  const address = await (await tempWdk.getAccount("ethereum", 0)).getAddress()
  return { seedPhrase, address }
}

