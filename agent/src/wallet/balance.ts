import { getAgentAccount } from "./setup.js"

export async function getBalance(): Promise<string> {
  const account = await getAgentAccount()
  const wei = await account.getBalance()
  const eth = Number(wei) / Number(10n ** 18n)
  return eth.toFixed(6)
}

export async function logBalances(): Promise<void> {
  const balance = await getBalance()
  console.log(`[wallet] ETH balance: ${balance} ETH`)
}
