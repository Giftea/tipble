import fs from "fs"
import path from "path"
import { fileURLToPath } from "url"
import type { TipbleConfig } from "./types.js"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const CONFIG_PATH = path.join(__dirname, "tipble.config.json")

let cached: TipbleConfig | null = null

export function loadConfig(): TipbleConfig {
  const raw = fs.readFileSync(CONFIG_PATH, "utf-8")
  cached = JSON.parse(raw) as TipbleConfig
  return cached
}

export function saveConfig(config: TipbleConfig): void {
  cached = config
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2), "utf-8")
}

export function getConfig(): TipbleConfig {
  if (!cached) {
    return loadConfig()
  }
  return cached
}
