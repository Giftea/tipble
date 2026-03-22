import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatHash(hash: string): string {
  return `${hash.slice(0, 6)}...${hash.slice(-4)}`
}

export function formatTime(iso: string): string {
  return new Date(iso).toTimeString().slice(0, 8)
}

export function formatEth(amount: string): string {
  return `${parseFloat(amount).toFixed(6)} ETH`
}

export function getExplorerUrl(hash: string, network: string): string {
  if (network === "polygon") return `https://polygonscan.com/tx/${hash}`
  if (network === "base-sepolia") return `https://sepolia.basescan.org/tx/${hash}`
  if (network === "sepolia") return `https://sepolia.etherscan.io/tx/${hash}`
  return `https://basescan.org/tx/${hash}`
}
