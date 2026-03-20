import { getAgentAccount } from "./setup.js"

export function ethToWei(eth: string): string {
  return (BigInt(Math.round(parseFloat(eth) * 1e9)) * 1000000000n).toString()
}

export async function sendTip(
  toAddress: string,
  valueInWei: string
): Promise<{ hash: string }> {
  const account = await getAgentAccount()
  const tx = await account.sendTransaction({ to: toAddress, value: valueInWei })
  console.log(`[wallet] Tip sent → ${toAddress} | ${valueInWei} wei | hash: ${tx.hash}`)
  return { hash: tx.hash }
}
