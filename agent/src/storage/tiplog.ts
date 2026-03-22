import fs from "fs"
import path from "path"
import type { TipEvent } from "../agent/loop.js"

const TIP_LOG_DIR = new URL("../../data/tips/", import.meta.url).pathname

function tipLogPath(walletAddress: string): string {
  const filename = walletAddress ? `${walletAddress.toLowerCase()}.json` : "default.json"
  return path.join(TIP_LOG_DIR, filename)
}

function ensureDir(): void {
  if (!fs.existsSync(TIP_LOG_DIR)) fs.mkdirSync(TIP_LOG_DIR, { recursive: true })
}

export function loadTipLog(walletAddress: string): TipEvent[] {
  const filePath = tipLogPath(walletAddress)
  try {
    if (!fs.existsSync(filePath)) return []
    const raw = fs.readFileSync(filePath, "utf-8")
    return JSON.parse(raw) as TipEvent[]
  } catch (err) {
    console.warn("[storage] Could not load tip log:", err)
    return []
  }
}

export function saveTipLog(walletAddress: string, tips: TipEvent[]): void {
  const filePath = tipLogPath(walletAddress)
  try {
    ensureDir()
    fs.writeFileSync(filePath, JSON.stringify(tips, null, 2), "utf-8")
  } catch (err) {
    console.error("[storage] Could not save tip log:", err)
  }
}

export function appendTip(tip: TipEvent, walletAddress: string): void {
  const tips = loadTipLog(walletAddress)
  tips.push(tip)
  if (tips.length > 500) tips.splice(0, tips.length - 500)
  saveTipLog(walletAddress, tips)
}

export function clearAllTipLogs(): void {
  try {
    ensureDir()
    const files = fs.readdirSync(TIP_LOG_DIR).filter((f) => f.endsWith(".json"))
    for (const file of files) fs.unlinkSync(path.join(TIP_LOG_DIR, file))
  } catch (err) {
    console.error("[storage] Could not clear tip logs:", err)
  }
}

export function getTodayTotal(walletAddress?: string): number {
  const today = new Date().toDateString()
  if (walletAddress) {
    return loadTipLog(walletAddress)
      .filter((t) => new Date(t.timestamp).toDateString() === today)
      .reduce((sum, t) => sum + parseFloat(t.amount || "0"), 0)
  }
  // No address: sum across all wallet files
  try {
    ensureDir()
    const files = fs.readdirSync(TIP_LOG_DIR).filter((f) => f.endsWith(".json"))
    return files.reduce((total, file) => {
      try {
        const raw = fs.readFileSync(path.join(TIP_LOG_DIR, file), "utf-8")
        const tips = JSON.parse(raw) as TipEvent[]
        return total + tips
          .filter((t) => new Date(t.timestamp).toDateString() === today)
          .reduce((sum, t) => sum + parseFloat(t.amount || "0"), 0)
      } catch { return total }
    }, 0)
  } catch { return 0 }
}
