import { getAgentAccount } from "./setup.js"

export const USDT_CONTRACTS: Record<string, string> = {
  sepolia:        '0x7169D38820dfd117C3FA1f22a697dBA58d90BA06',
  'base-sepolia': '0x50c5725949A6F0c72E6C4a641F24049A917DB0Cb',
  polygon:        '0xc2132D05D31c914a87C6611C10748AEb04B58e8F',
}

export function ethToWei(eth: string): string {
  return (BigInt(Math.round(parseFloat(eth) * 1e9)) * 1000000000n).toString()
}

export function usdtToUnits(usdt: string): bigint {
  return BigInt(Math.round(parseFloat(usdt) * 1e6))
}

function encodeERC20Transfer(to: string, amount: bigint): string {
  const selector = 'a9059cbb' // transfer(address,uint256)
  const paddedTo = to.toLowerCase().replace('0x', '').padStart(64, '0')
  const paddedAmount = amount.toString(16).padStart(64, '0')
  return '0x' + selector + paddedTo + paddedAmount
}

export async function sendTip(
  toAddress: string,
  valueInWei: string
): Promise<{ hash: string }> {
  const account = await getAgentAccount()
  const tx = await account.sendTransaction({ to: toAddress, value: valueInWei })
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
  const data = encodeERC20Transfer(toAddress, usdtToUnits(amount))
  const tx = await account.sendTransaction({ to: contractAddress, value: 0n, data })
  console.log(`[wallet] USDT tip sent → ${toAddress} | ${amount} USDT | hash: ${tx.hash}`)
  return { hash: tx.hash }
}
