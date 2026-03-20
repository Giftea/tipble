import fs from "fs"
import path from "path"
import { fileURLToPath } from "url"
import type { TipbleConfig } from "./types.js"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const CONFIG_PATH = path.join(__dirname, "tipble.config.json")

export function loadConfig(): TipbleConfig {
  const raw = fs.readFileSync(CONFIG_PATH, "utf-8")
  return JSON.parse(raw) as TipbleConfig
}

export function saveConfig(config: TipbleConfig): void {
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2), "utf-8")
  console.log("[config] Config updated — changes take effect on next heartbeat tick")
}

export function getConfig(): TipbleConfig {
  return loadConfig()
}
