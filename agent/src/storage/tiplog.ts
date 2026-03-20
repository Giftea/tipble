import fs from "fs"
import path from "path"
import type { TipEvent } from "../agent/loop.js"

const TIP_LOG_PATH = new URL("../../data/tiplog.json", import.meta.url).pathname

export function loadTipLog(): TipEvent[] {
  try {
    if (!fs.existsSync(TIP_LOG_PATH)) return []
    const raw = fs.readFileSync(TIP_LOG_PATH, "utf-8")
    return JSON.parse(raw) as TipEvent[]
  } catch (err) {
    console.warn("[storage] Could not load tiplog.json:", err)
    return []
  }
}

export function saveTipLog(tips: TipEvent[]): void {
  try {
    const dir = path.dirname(TIP_LOG_PATH)
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
    fs.writeFileSync(TIP_LOG_PATH, JSON.stringify(tips, null, 2), "utf-8")
  } catch (err) {
    console.error("[storage] Could not save tiplog.json:", err)
  }
}

export function appendTip(tip: TipEvent): void {
  const tips = loadTipLog()
  tips.push(tip)
  if (tips.length > 500) tips.splice(0, tips.length - 500)
  saveTipLog(tips)
}

export function getTodayTotal(): number {
  const today = new Date().toDateString()
  return loadTipLog()
    .filter((t) => new Date(t.timestamp).toDateString() === today)
    .reduce((sum, t) => sum + parseFloat(t.amount || "0"), 0)
}
