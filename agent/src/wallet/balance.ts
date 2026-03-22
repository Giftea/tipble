import { getAgentAccount, getAgentAddress } from "./setup.js"
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
  const network = config.agent.network

  const rpcUrl =
    network === 'polygon'      ? process.env.POLYGON_RPC_URL :
    network === 'base-sepolia' ? process.env.BASE_SEPOLIA_RPC_URL :
    process.env.SEPOLIA_RPC_URL

  const contractAddress = USDT_CONTRACTS[network]
  if (!rpcUrl || !contractAddress) return '0.000000'

  const address = await getAgentAddress()
  const selector = '70a08231' // balanceOf(address)
  const paddedAddress = address.toLowerCase().replace('0x', '').padStart(64, '0')
  const data = '0x' + selector + paddedAddress

  const response = await fetch(rpcUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      method: 'eth_call',
      params: [{ to: contractAddress, data }, 'latest'],
      id: 1,
    }),
  })

  const json = await response.json() as { result: string }
  if (!json.result || json.result === '0x') return '0.000000'
  const rawBalance = BigInt(json.result)
  return (Number(rawBalance) / 1e6).toFixed(6)
}

export async function logBalances(): Promise<void> {
  const [eth, usdt] = await Promise.all([getBalance(), getUsdtBalance()])
  console.log(`[wallet] ETH balance: ${eth} ETH`)
  console.log(`[wallet] USDT balance: ${usdt} USDT`)
}
