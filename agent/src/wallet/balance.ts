import { getAgentAccount } from "./setup.js"
import { USDT_CONTRACTS } from "./tip.js"
import { getConfig } from "../config/loader.js"

export async function getBalance(): Promise<string> {
  const account = await getAgentAccount()
  const wei = await account.getBalance()
  const eth = Number(wei) / Number(10n ** 18n)
  return eth.toFixed(6)
}

export async function getUsdtBalance(): Promise<string> {
  const config = getConfig()
  const contractAddress = USDT_CONTRACTS[config.agent.network]
  if (!contractAddress) return '0.000000'

  const account = await getAgentAccount()
  const rawBalance = await account.getTokenBalance(contractAddress)
  return (Number(rawBalance) / 1e6).toFixed(6)
}

export async function logBalances(): Promise<void> {
  const [eth, usdt] = await Promise.all([getBalance(), getUsdtBalance()])
  console.log(`[wallet] ETH balance: ${eth} ETH`)
  console.log(`[wallet] USDT balance: ${usdt} USDT`)
}
