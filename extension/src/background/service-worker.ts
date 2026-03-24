import { getSettings, getSeedPhrase } from '../lib/storage'
import { fetchStatus, getAgentUrl } from '../lib/api'

async function streamEventHeaders(): Promise<Record<string, string>> {
  const seed = await getSeedPhrase()
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (seed) headers['x-seed-phrase'] = seed
  return headers
}


async function notifyTipFired(
  tabId: number | undefined,
  result: { tipped?: boolean; hash?: string; tipsCount?: number; totalTipped?: string; network?: string },
  tipInfo: { amount: string; asset: string; reason: string; eventType: string }
): Promise<void> {
  if (!result.tipped || !result.hash || !tabId) return

  const tip = {
    id: Date.now().toString(),
    timestamp: new Date().toISOString(),
    txHash: result.hash,
    amount: tipInfo.amount,
    asset: tipInfo.asset,
    reason: tipInfo.reason,
    eventType: tipInfo.eventType,
    confidence: 1.0
  }

  chrome.tabs.sendMessage(tabId, {
    type: 'TIP_FIRED',
    tip,
    status: {
      tipsCount: result.tipsCount ?? 0,
      totalTipped: result.totalTipped ?? '0',
      network: result.network ?? 'base'
    }
  })

  const settings = await getSettings()
  if (settings.showNotifications) {
    chrome.notifications.create({
      type: 'basic',
      iconUrl: 'icons/icon48.png',
      title: 'Tipble — Tip Sent!',
      message: `${tipInfo.amount} ${tipInfo.asset} → Creator | ${tipInfo.reason}`
    })
  }
}

async function handleLowBalance(settings: Awaited<ReturnType<typeof getSettings>>, code?: string): Promise<void> {
  const isGas = code === 'INSUFFICIENT_GAS'
  if (settings.showNotifications) {
    chrome.notifications.create({
      type: 'basic',
      iconUrl: 'icons/icon48.png',
      title: isGas ? 'Tipble — No Gas' : 'Tipble — Wallet Balance Low',
      message: isGas
        ? 'No ETH for gas fees. Auto-tipping paused. Add ETH to your wallet to resume.'
        : 'Not enough USDT to tip. Auto-tipping paused. Top up your wallet to resume.'
    })
  }
  // Pause agent so it stops firing events
  getAgentUrl().then(url => fetch(`${url}/api/agent/pause`, { method: 'POST' })).catch(() => {})
}

chrome.runtime.onInstalled.addListener(() => {
  chrome.alarms.create('pollAgent', {
    periodInMinutes: 0.17 // ~10 seconds
  })
})

chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name !== 'pollAgent') return

  const settings = await getSettings()
  if (!settings.autoTippingEnabled) return

  try {
    const status = await fetchStatus()

    chrome.action.setBadgeText({
      text: status.tipsCount > 0 ? status.tipsCount.toString() : ''
    })
    chrome.action.setBadgeBackgroundColor({ color: '#00C8FF' })

    chrome.storage.local.set({
      cachedStatus: status,
      lastPolled: Date.now()
    })
  } catch (err) {
    chrome.action.setBadgeText({ text: '!' })
    chrome.action.setBadgeBackgroundColor({ color: '#E24B4A' })
    chrome.storage.local.set({
      cachedStatus: null,
      agentOffline: true
    })
  }
})

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'GET_STATUS') {
    chrome.storage.local.get(['cachedStatus', 'lastPolled', 'currentCreatorWallet', 'currentPageUrl'], (data) => {
      sendResponse(data)
    })
    return true
  }

  if (message.type === 'CREATOR_WALLET_DETECTED') {
    const { addresses, creatorName, pageUrl } = message
    console.log('[BG] Creator detected:', addresses, creatorName)

    chrome.storage.local.set({
      currentCreatorWallet: {
        evm: addresses.evm,
        btc: addresses.btc,
        displayName: creatorName ?? 'Rumble Creator'
      },
      currentPageUrl: pageUrl
    })

    getSettings().then(async () => {
      try {
        const url = await getAgentUrl()
        const res = await fetch(`${url}/api/creator/set`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            address: addresses.evm,
            btcAddress: addresses.btc,
            pageUrl,
            displayName: creatorName ?? 'Rumble Creator'
          })
        })
        await res.json()
      } catch {
        // silently ignore agent update failures
      }
      sendResponse({ success: true })
    })
    return true
  }

  if (message.type === 'CLEAR_CREATOR_WALLET') {
    chrome.storage.local.remove(['currentCreatorWallet', 'currentPageUrl'])

    getSettings().then(async () => {
      try {
        const url = await getAgentUrl()
        await fetch(`${url}/api/creator/clear`, { method: 'POST' })
      } catch {
        // silently ignore agent clear failures
      }
      sendResponse({ success: true })
    })
    return true
  }

  if (message.type === 'DOM_STREAM_UPDATE') {
    ;(async () => {
      const settings = await getSettings()

      await chrome.storage.local.set({
        domStreamState: message.state,
        domEventType: message.eventType
      })

      if (message.eventType) {
        try {
          const stored = await chrome.storage.local.get('currentCreatorWallet')
          const creatorAddress = (stored.currentCreatorWallet as { evm?: string } | undefined)?.evm

          if (creatorAddress) {
            const agentUrl = await getAgentUrl()
            const res = await fetch(`${agentUrl}/api/stream/event`, {
              method: 'POST',
              headers: await streamEventHeaders(),
              body: JSON.stringify({
                eventType: message.eventType,
                watchingNow: message.state.watchingNow,
                prevWatching: message.prevWatching,
                creatorAddress,
                creatorName: message.state.creatorName,
                pageUrl: message.state.pageUrl
              })
            })
            const result = await res.json()
            if (result.code === 'INSUFFICIENT_BALANCE' || result.code === 'INSUFFICIENT_GAS') {
              await handleLowBalance(settings, result.code)
            } else {
              await notifyTipFired(sender.tab?.id, result, {
                amount: result.amount ?? '0',
                asset: result.asset ?? 'USDT',
                reason: result.reason ?? message.eventType,
                eventType: message.eventType
              })
            }
          }
        } catch {
          // Agent offline — ignore
        }
      }

      sendResponse({ success: true })
    })()
    return true
  }

  if (message.type === 'WATCH_TIME_REACHED') {
    ;(async () => {
      const settings = await getSettings()
      const stored = await chrome.storage.local.get('currentCreatorWallet')
      const wallet = stored.currentCreatorWallet as { evm?: string; displayName?: string } | undefined
      const creatorAddress = wallet?.evm
      const creatorName = wallet?.displayName

      if (creatorAddress) {
        try {
          const agentUrl = await getAgentUrl()
          const res = await fetch(`${agentUrl}/api/stream/event`, {
            method: 'POST',
            headers: await streamEventHeaders(),
            body: JSON.stringify({
              eventType: 'watch_time_reached',
              watchingNow: 0,
              prevWatching: 0,
              creatorAddress,
              creatorName: creatorName ?? 'Creator',
              watchSeconds: message.watchSeconds,
              pageUrl: message.pageUrl
            })
          })
          const result = await res.json()
          if (result.code === 'INSUFFICIENT_BALANCE') {
            await handleLowBalance(settings)
          } else {
            await notifyTipFired(sender.tab?.id, result, {
              amount: result.amount ?? '0',
              asset: result.asset ?? 'USDT',
              reason: result.reason ?? 'Watch time reached',
              eventType: 'watch_time_reached'
            })
          }
        } catch {
          // Agent offline — ignore
        }
      }
      sendResponse({ success: true })
    })()
    return true
  }

  if (message.type === 'SUBSCRIBER_ACTION_DETECTED') {
    ;(async () => {
      const settings = await getSettings()
      const stored = await chrome.storage.local.get('currentCreatorWallet')
      const wallet = stored.currentCreatorWallet as { evm?: string; displayName?: string } | undefined
      const creatorAddress = wallet?.evm
      const creatorName = wallet?.displayName

      if (creatorAddress) {
        try {
          const agentUrl = await getAgentUrl()
          const res = await fetch(`${agentUrl}/api/stream/event`, {
            method: 'POST',
            headers: await streamEventHeaders(),
            body: JSON.stringify({
              eventType: 'subscriber_action',
              watchingNow: 0,
              prevWatching: 0,
              creatorAddress,
              creatorName: creatorName ?? 'Creator',
              pageUrl: message.pageUrl
            })
          })
          const result = await res.json()
          if (result.code === 'INSUFFICIENT_BALANCE') {
            await handleLowBalance(settings)
          } else {
            await notifyTipFired(sender.tab?.id, result, {
              amount: result.amount ?? '0',
              asset: result.asset ?? 'USDT',
              reason: result.reason ?? 'Subscribed to creator',
              eventType: 'subscriber_action'
            })
          }
        } catch {
          // Agent offline — ignore
        }
      }
      sendResponse({ success: true })
    })()
    return true
  }

  if (message.type === 'PAUSE_AGENT') {
    getAgentUrl().then(url => {
      fetch(`${url}/api/agent/pause`, { method: 'POST' }).then(() =>
        sendResponse({ success: true })
      )
    })
    return true
  }

  if (message.type === 'RESUME_AGENT') {
    getAgentUrl().then(url => {
      fetch(`${url}/api/agent/resume`, { method: 'POST' }).then(() =>
        sendResponse({ success: true })
      )
    })
    return true
  }
})
