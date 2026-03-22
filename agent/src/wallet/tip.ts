import { getAgentAccount } from "./setup.js"

export const USDT_CONTRACTS: Record<string, string> = {
  sepolia:        '0x7169D38820dfd117C3FA1f22a697dBA58d90BA06',
  'base-sepolia': '0x0a215D8ba66387DCA84B284D18c3B4ec3de6E54a',
  polygon:        '0xc2132D05D31c914a87C6611C10748AEb04B58e8F',
}

export function ethToWei(eth: string): string {
  return (BigInt(Math.round(parseFloat(eth) * 1e9)) * 1000000000n).toString()
}

export function usdtToUnits(usdt: string): bigint {
  return BigInt(Math.round(parseFloat(usdt) * 1e6))
}

export async function sendTip(
  toAddress: string,
  valueInWei: string
): Promise<{ hash: string }> {
  const account = await getAgentAccount()
  const tx = await account.sendTransaction({ to: toAddress, value: BigInt(valueInWei) })
  console.log(`[wallet] ETH tip sent → ${toAddress} | ${valueInWei} wei | hash: ${tx.hash}`)
  return { hash: tx.hash }
}

export async function sendUsdtTip(
  toAddress: string,
  amount: string,
  network: string
): Promise<{ hash: string }> {
  const contractAddress = USDT_CONTRACTS[network]
  if (!contractAddress) throw new Error(`No USDT contract for network: ${network}`)

  const account = await getAgentAccount()
  const result = await account.transfer({
    token: contractAddress,
    recipient: toAddress,
    amount: usdtToUnits(amount),
  })
  console.log(`[wallet] USDT tip sent → ${toAddress} | ${amount} USDT | hash: ${result.hash}`)
  return { hash: result.hash }
}
