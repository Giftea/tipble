import type { ExtensionSettings } from '../types'

export const STORAGE_KEYS = {
  SEED_PHRASE: 'tipble_seed_phrase',
  WALLET_ADDRESS: 'tipble_wallet_address',
  SETTINGS: 'tipble_settings',
  TIP_LOG: 'tipble_tip_log'
}

export const DEFAULT_SETTINGS: ExtensionSettings = {
  agentApiUrl: 'http://localhost:3001',
  autoTippingEnabled: true,
  showBadge: true,
  showNotifications: true,
  llmEnabled: true,
  anthropicApiKey: '',
  network: 'sepolia',
  walletAddress: null
}

export async function getSettings(): Promise<ExtensionSettings> {
  return new Promise((resolve) => {
    chrome.storage.local.get(STORAGE_KEYS.SETTINGS, (result) => {
      const stored = result[STORAGE_KEYS.SETTINGS] ?? {}
      resolve({ ...DEFAULT_SETTINGS, ...stored })
    })
  })
}

export async function saveSettings(settings: Partial<ExtensionSettings>): Promise<void> {
  const current = await getSettings()
  const merged = { ...current, ...settings }
  return new Promise((resolve) => {
    chrome.storage.local.set({ [STORAGE_KEYS.SETTINGS]: merged }, resolve)
  })
}

export async function getSeedPhrase(): Promise<string | null> {
  return new Promise((resolve) => {
    chrome.storage.local.get(STORAGE_KEYS.SEED_PHRASE, (result) => {
      resolve(result[STORAGE_KEYS.SEED_PHRASE] ?? null)
    })
  })
}

export async function saveSeedPhrase(seed: string): Promise<void> {
  return new Promise((resolve) => {
    chrome.storage.local.set({ [STORAGE_KEYS.SEED_PHRASE]: seed }, resolve)
  })
}

export async function clearSeedPhrase(): Promise<void> {
  return new Promise((resolve) => {
    chrome.storage.local.remove(STORAGE_KEYS.SEED_PHRASE, resolve)
  })
}

export async function getWalletAddress(): Promise<string | null> {
  return new Promise((resolve) => {
    chrome.storage.local.get(STORAGE_KEYS.WALLET_ADDRESS, (result) => {
      resolve(result[STORAGE_KEYS.WALLET_ADDRESS] ?? null)
    })
  })
}

export async function saveWalletAddress(address: string): Promise<void> {
  return new Promise((resolve) => {
    chrome.storage.local.set({ [STORAGE_KEYS.WALLET_ADDRESS]: address }, resolve)
  })
}
