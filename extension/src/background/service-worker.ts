import { getSettings } from '../lib/storage'
import { fetchStatus } from '../lib/api'

let lastTipId = ''

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

    if (status.recentTips.length > 0) {
      const latestTip = status.recentTips[0]

      if (latestTip.id !== lastTipId && lastTipId !== '') {
        const [tab] = await chrome.tabs.query({
          active: true,
          currentWindow: true
        })

        if (tab?.id && tab.url?.includes('rumble.com')) {
          chrome.tabs.sendMessage(tab.id, {
            type: 'TIP_FIRED',
            tip: latestTip,
            status: {
              tipsCount: status.tipsCount,
              totalTipped: status.totalTipped,
              network: status.network
            }
          })
        }

        if (settings.showNotifications) {
          chrome.notifications.create({
            type: 'basic',
            iconUrl: 'icons/icon48.png',
            title: 'Tipble — Tip Sent!',
            message: `${latestTip.amount} ${latestTip.asset} → ${status.creator.displayName} | ${latestTip.reason}`
          })
        }
      }

      lastTipId = latestTip.id
    }

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

    getSettings().then(async (settings) => {
      try {
        const res = await fetch(`${settings.agentApiUrl}/api/creator/set`, {
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

    getSettings().then(async (settings) => {
      try {
        await fetch(`${settings.agentApiUrl}/api/creator/clear`, { method: 'POST' })
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
            const res = await fetch(`${settings.agentApiUrl}/api/stream/event`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
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
            await notifyTipFired(sender.tab?.id, result, {
              amount: result.amount ?? '0',
              asset: result.asset ?? 'USDT',
              reason: result.reason ?? message.eventType,
              eventType: message.eventType
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

  if (message.type === 'WATCH_TIME_REACHED') {
    ;(async () => {
      const settings = await getSettings()
      const stored = await chrome.storage.local.get('currentCreatorWallet')
      const wallet = stored.currentCreatorWallet as { evm?: string; displayName?: string } | undefined
      const creatorAddress = wallet?.evm
      const creatorName = wallet?.displayName

      if (creatorAddress) {
        try {
          const res = await fetch(`${settings.agentApiUrl}/api/stream/event`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
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
          await notifyTipFired(sender.tab?.id, result, {
            amount: result.amount ?? '0',
            asset: result.asset ?? 'USDT',
            reason: result.reason ?? 'Watch time reached',
            eventType: 'watch_time_reached'
          })
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
          const res = await fetch(`${settings.agentApiUrl}/api/stream/event`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
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
          await notifyTipFired(sender.tab?.id, result, {
            amount: result.amount ?? '0',
            asset: result.asset ?? 'USDT',
            reason: result.reason ?? 'Subscribed to creator',
            eventType: 'subscriber_action'
          })
        } catch {
          // Agent offline — ignore
        }
      }
      sendResponse({ success: true })
    })()
    return true
  }

  if (message.type === 'PAUSE_AGENT') {
    getSettings().then((s) => {
      fetch(`${s.agentApiUrl}/api/agent/pause`, { method: 'POST' }).then(() =>
        sendResponse({ success: true })
      )
    })
    return true
  }

  if (message.type === 'RESUME_AGENT') {
    getSettings().then((s) => {
      fetch(`${s.agentApiUrl}/api/agent/resume`, { method: 'POST' }).then(() =>
        sendResponse({ success: true })
      )
    })
    return true
  }
})
